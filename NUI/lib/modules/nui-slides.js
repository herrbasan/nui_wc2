// nui-slides.js — presentation profile for MD-Blocks documents rendered by
// nui-markdown. A document is one or more MAINS (chrome scopes); this module turns
// every SECTION into a surface — one slide per viewport — and repeats each main's
// chrome onto its own slides, because in a deck the surface *is* the slide.
//
// The source says nothing about repetition: chrome is authored once on the main.
// Repeating it per surface is a renderer concern, so it lives here and never in the
// file. The same split covers derived chrome — slide numbers are computed here and
// cannot drift from the document they describe.
//
// Usage (addon — import the JS and link the CSS):
//   <nui-slides height="fill" base="1280x720" zoom="1">
//     <nui-markdown src="deck.md"></nui-markdown>
//   </nui-slides>
//
// `base` is the logical canvas a slide is composed in (default 1280x720, i.e. 16:9;
// `base="1024x768"` gives 4:3). The canvas is scaled as one piece to fit the deck, so
// a slide keeps its proportions at any window size — and `zoom` multiplies that
// fitted scale (1 = exactly fit, 1.5 = half again as large, cropped by the deck).
// Both take effect live, and fullscreen re-fits on its own.
//
// Keyboard: Arrow/Page Up-Down, Space, Home/End, f for fullscreen.
// Programmatic: nui.components.slides.show(i) / next() / prev().
// Narration (spec §5.2): blocks with `preset=narration` are delivery text — hidden on
// the slide, readable as data via `narration(i)` and `nui-slide-change.detail.narration`.
// The `notes` attribute shows the current slide's narration below the canvas.
// Events: `nui-slide-change` { index, count, section, narration }, `nui-slides-error` { message }.

import { nui } from '../../nui.js';

const NEXT = new Set(['ArrowDown', 'ArrowRight', 'PageDown', ' ', 'Spacebar']);
const PREV = new Set(['ArrowUp', 'ArrowLeft', 'PageUp']);
// Keys must still reach text fields and buttons inside a slide, so navigation stands
// down for anything interactive. Space is the awkward one: it activates what has focus.
const INTERACTIVE = 'a[href], button, input, select, textarea, [contenteditable=""], [contenteditable="true"]';
const MOUNT_TIMEOUT_MS = 5000;
const DEFAULT_BASE = [1280, 720];

class NuiSlides extends HTMLElement {
	static observedAttributes = ['base', 'toolbar', 'controls', 'notes', 'autoplay', 'narrate', 'dwell', 'narration-delay', 'mode'];

	attributeChangedCallback(name) {
		if (name === 'base' && this._mounted) this._fit();
		if ((name === 'toolbar' || name === 'controls') && this._mounted) {
			if (this.hasAttribute('toolbar') || this.hasAttribute('controls')) this._buildToolbar();
			else if (this._toolbar) { this._toolbar.remove(); this._toolbar = null; }
		}
		if (name === 'notes' && this._mounted) {
			if (this.hasAttribute('notes')) this._buildNotes();
			else if (this._notes) {
				this._stopNarration();
				this._notes.remove();
				this._notes = null;
				this._notesText = null;
				this._notesPlay = null;
			}
		}
		if (name === 'autoplay' && this._mounted) {
			const want = this.hasAttribute('autoplay');
			if (want !== this._autoPlaying) {
				if (want) this._startAuto();
				else this._stopAuto();
			}
			return;
		}
		if ((name === 'narrate' || name === 'dwell' || name === 'narration-delay') && this._mounted) {
			this._updateToolbar();
			// A change to the run's parameters applies from here on, not from the next
			// slide: restarting the current slide's flow is what makes the dialog feel
			// like a setting rather than a suggestion.
			if (this._autoPlaying) this._restartFlow();
		}
		if (name === 'mode' && this._mounted) this._updateToolbar();
	}

	// Behaviour, not presentation. `autoplay` is both the initial state and the
	// running state (the toolbar reflects it); `dwell` is the slide's own duration when
	// there is nothing to say; `narrationDelay` is the pause AFTER a narration ends,
	// before advancing. There is deliberately no "timed" mode: a slide that narrates
	// always finishes its sentence first, which is what makes a narrated deck a deck
	// rather than a slideshow with a voice-over being cut off.
	get options() {
		const seconds = (name, fallback, min) => {
			// `Number(null)` is 0, which is a legal value for the narration gap — an
			// absent attribute must be the fallback, not zero.
			if (!this.hasAttribute(name)) return fallback;
			const raw = Number(this.getAttribute(name));
			return Number.isFinite(raw) && raw >= min && raw <= 60 ? raw : fallback;
		};
		return {
			autoplay: !!this._autoPlaying,
			narrate: this.hasAttribute('narrate'),
			dwell: seconds('dwell', 5, 0.5),
			narrationDelay: seconds('narration-delay', 1, 0),
			// `auto` follows the page's colour scheme; `light`/`dark` force one for the
			// deck only. A deck drawn on light artwork must not invert with the host.
			mode: ['light', 'dark'].includes(String(this.getAttribute('mode') || '').toLowerCase())
				? String(this.getAttribute('mode')).toLowerCase()
				: 'auto'
		};
	}

	configure(options = {}) {
		if ('narrate' in options) this.toggleAttribute('narrate', !!options.narrate);
		if ('mode' in options) {
			const mode = String(options.mode || '').toLowerCase();
			if (mode === 'light' || mode === 'dark') this.setAttribute('mode', mode);
			else this.removeAttribute('mode');
		}
		if ('dwell' in options) {
			const dwell = Number(options.dwell);
			this.setAttribute('dwell', String(Number.isFinite(dwell) ? Math.min(60, Math.max(0.5, dwell)) : 5));
		}
		if ('narrationDelay' in options) {
			const delay = Number(options.narrationDelay);
			this.setAttribute('narration-delay', String(Number.isFinite(delay) ? Math.min(60, Math.max(0, delay)) : 1));
		}
		if ('autoplay' in options) this.toggleAttribute('autoplay', !!options.autoplay);
		this.dispatchEvent(new CustomEvent('nui-slides-options', { detail: { options: this.options } }));
		return this.options;
	}

	// The canvas: a logical size the slide is composed in. `base="1280x720"` or a bare
	// width (`base="1600"`, which implies 16:9). Garbage is an authoring error, and an
	// error is cheaper to see than a deck that silently renders at the wrong size.
	_canvas() {
		const raw = (this.getAttribute('base') || '').trim();
		if (!raw) return DEFAULT_BASE;
		const parts = raw.toLowerCase().split('x').map((n) => Number(n.trim()));
		const [w, h] = parts.length === 1 ? [parts[0], parts[0] * 9 / 16] : parts;
		if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
			throw new Error('[nui-slides] base="' + raw + '" is not a size — use "1280x720" or a width.');
		}
		return [w, h];
	}

	// Compose at canvas size, show at whatever fits. The viewport box is the
	// measure, and every slide scales with it — this is what makes fullscreen
	// work without anything else changing: the box grows, the fit follows.
	_fit() {
		const target = this._viewport || this;
		const [w, h] = this._canvas();
		const params = getComputedStyle(target);
		const padX = parseFloat(params.paddingLeft) + parseFloat(params.paddingRight);
		const padY = parseFloat(params.paddingTop) + parseFloat(params.paddingBottom);
		const width = target.clientWidth - padX;
		const height = target.clientHeight - padY;
		if (!width || !height) return;   // not laid out (hidden or detached) — nothing to fit
		const scale = Math.min(width / w, height / h);
		this.style.setProperty('--nui-slides-w', w + 'px');
		this.style.setProperty('--nui-slides-h', h + 'px');
		this.style.setProperty('--nui-slides-aspect', (w / h).toFixed(4));
		this.style.setProperty('--nui-slides-scale', String(scale));
	}

	connectedCallback() {
		if (this._mounted) {
			// Re-attached: the deck is already built, so only the measurements restart.
			this._viewport = this.querySelector(':scope > .nui-slides-viewport') || this;
			this._resize = new ResizeObserver(() => this._fit());
			this._resize.observe(this._viewport);
			this._fit();
			if (this.hasAttribute('autoplay') && !this._autoPlaying) this._startAuto();
			return;
		}
		if (this._started) return;
		this._started = true;

		const md = this.querySelector('nui-markdown');
		if (!md) {
			throw new Error('[nui-slides] needs a <nui-markdown> child to present.');
		}
		this._md = md;
		// Strip frontmatter from visual rendering — slide decks use metadata for titles and A11y,
		// but the frontmatter disclosure must not appear on slide surfaces.
		md.setAttribute('frontmatter', 'strip');
		md.frontmatterMode = 'strip';

		// In normal page flow, the slide surface is contained in a dedicated viewport box
		// so external toolbars or controls sit cleanly outside the slide canvas.
		let viewport = this.querySelector(':scope > .nui-slides-viewport');
		if (!viewport) {
			viewport = document.createElement('div');
			viewport.className = 'nui-slides-viewport';
			viewport.append(md);
			this.prepend(viewport);
		}
		this._viewport = viewport;

		// The content may be rendered already (inline markdown) or still in flight (a
		// `src` fetch). Watch for it rather than polling, and give up loudly: a deck
		// that silently shows nothing is worse than an error.
		this._watch = new MutationObserver(() => this._tryMount());
		this._watch.observe(md, { childList: true, subtree: true });
		this._timer = setTimeout(() => this._fail(
			'no presentable content after ' + MOUNT_TIMEOUT_MS +
			'ms — did the markdown load, and does it have any?'), MOUNT_TIMEOUT_MS);

		this._tryMount();
	}

	// Rendered markdown exposes `.nui-blocks-main` (one per chrome scope). Content with
	// no MD-Blocks structure is still presentable — a plain Markdown document is one
	// slide — so it gets one synthetic section rather than an error.
	_tryMount() {
		if (this._mounted || !this.isConnected) return;

		const mains = Array.from(this.querySelectorAll('.nui-blocks-main'));
		const rendered = Array.from(this._md.children).filter((el) => el.tagName !== 'SCRIPT');
		if (!mains.length && !rendered.length) return;   // not rendered yet

		// Strip any frontmatter that might have rendered before nui-slides mounted
		for (const el of this.querySelectorAll('.nui-md-frontmatter, .nui-md-frontmatter-details')) {
			el.remove();
		}

		const sections = mains.length ? this._collect(mains) : this._synthesise();
		if (!sections.length) {
			return this._fail('the document has no sections — nothing to present.');
		}
		this._stopWatching();

		sections.forEach((section, i) => {
			section.setAttribute('role', 'group');
			section.setAttribute('aria-roledescription', 'slide');
			section.setAttribute('aria-label', (i + 1) + ' of ' + sections.length);
			section.tabIndex = -1;
			// Derived chrome, computed from the document: position and count are the
			// renderer's to know, and each slide carries its own so nothing has to be
			// kept in step while scrolling. Never authored, never in the source.
			const counter = document.createElement('div');
			counter.className = 'nui-slides-counter';
			counter.setAttribute('aria-hidden', 'true');
			counter.textContent = (i + 1) + ' / ' + sections.length;
			section.append(counter);
		});

		const title = this._md.metadata && this._md.metadata.title;
		this.setAttribute('role', 'region');
		this.setAttribute('aria-roledescription', 'slide deck');
		if (title) this.setAttribute('aria-label', String(title));

		this._sections = sections;
		this._current = -1;
		this._overflowWarned = new Set();
		this.tabIndex = 0;
		this._onKey = (e) => this._key(e);
		this.addEventListener('keydown', this._onKey);

		this._touchStartX = 0;
		this._touchStartY = 0;
		this._onTouchStart = (e) => {
			if (!this._mounted) return;
			if (e.target instanceof Element && e.target.closest(INTERACTIVE)) return;
			const touch = e.touches[0];
			if (!touch) return;
			this._touchStartX = touch.clientX;
			this._touchStartY = touch.clientY;
		};
		this._onTouchEnd = (e) => {
			if (!this._mounted) return;
			const touch = e.changedTouches[0];
			if (!touch) return;
			const deltaX = touch.clientX - this._touchStartX;
			const deltaY = touch.clientY - this._touchStartY;
			if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
				if (deltaX < 0) this.next();
				else this.prev();
			}
		};
		this.addEventListener('touchstart', this._onTouchStart, { passive: true });
		this.addEventListener('touchend', this._onTouchEnd, { passive: true });

		// The deck resizes when the window does, when it enters fullscreen, and when a
		// layout around it changes — all the same event as far as the fit is concerned.
		this._resize = new ResizeObserver(() => this._fit());
		this._resize.observe(this._viewport || this);

		this._onMouseMove = (e) => {
			if (!this._toolbar) return;
			const isFs = document.fullscreenElement === this;
			if (!isFs) {
				this._toolbar.classList.remove('is-visible');
				return;
			}
			const nearBottom = e.clientY >= window.innerHeight - 120;
			if (nearBottom) {
				this._toolbar.classList.add('is-visible');
				clearTimeout(this._fsTimer);
				this._fsTimer = setTimeout(() => {
					if (document.fullscreenElement === this && this._toolbar && !this._toolbar.matches(':hover')) {
						this._toolbar.classList.remove('is-visible');
					}
				}, 2500);
			} else if (!this._toolbar.matches(':hover')) {
				this._toolbar.classList.remove('is-visible');
			}
		};
		this._onMouseLeave = () => {
			if (document.fullscreenElement === this && this._toolbar) {
				this._toolbar.classList.remove('is-visible');
			}
		};
		this._onFullscreenChange = () => {
			if (this._toolbar) {
				this._toolbar.classList.remove('is-visible');
				this._updateToolbar();
			}
			this._fit();
		};
		this.addEventListener('mousemove', this._onMouseMove);
		this.addEventListener('mouseleave', this._onMouseLeave);
		document.addEventListener('fullscreenchange', this._onFullscreenChange);

		this._mounted = true;
		this._fit();
		this._buildToolbar();
		this._buildNotes();
		this._show(0, { focus: false });
		if (this.hasAttribute('autoplay')) this._startAuto();
		this.setAttribute('ready', '');
	}

	// Chrome is a template on the main: clone it onto that main's own sections, then
	// hide the template. Ids are dropped from the clones — two surfaces must never
	// share an id. Sections across all mains form ONE sequence: a main is a chrome
	// scope, not a separate deck, so switching chrome mid-way does not split the deck.
	_collect(mains) {
		const sections = [];
		for (const main of mains) {
			// A preset authored on a main is meant for the slides it produces, so it is
			// copied onto them: a main is a scope, not a surface, and has no box of its
			// own to style.
			const inherited = Array.from(main.classList).filter((c) => c !== 'nui-blocks-main');

			for (const name of ['header', 'footer']) {
				const source = main.querySelector(':scope > .nui-blocks-chrome-' + name);
				if (!source) continue;
				for (const section of main.querySelectorAll(':scope > .nui-blocks-section')) {
					const clone = source.cloneNode(true);
					for (const el of clone.querySelectorAll('[id]')) el.removeAttribute('id');
					if (name === 'header') section.prepend(clone);
					else section.append(clone);
				}
				source.hidden = true;
			}

			for (const section of main.querySelectorAll(':scope > .nui-blocks-section')) {
				if (inherited.length) section.classList.add(...inherited);
				sections.push(section);
			}
		}
		return sections;
	}

	// Unstructured Markdown: everything rendered becomes one slide.
	_synthesise() {
		const section = document.createElement('section');
		section.className = 'nui-blocks-section';
		while (this._md.firstChild) section.append(this._md.firstChild);
		this._md.append(section);
		return [section];
	}

	_fail(message) {
		this._stopWatching();
		const text = '[nui-slides] ' + message;
		console.error(text);
		this.dispatchEvent(new CustomEvent('nui-slides-error', { detail: { message: text } }));
	}

	_stopWatching() {
		if (this._watch) { this._watch.disconnect(); this._watch = null; }
		if (this._timer) { clearTimeout(this._timer); this._timer = null; }
	}

	// One slide is on screen at a time and the rest are `inert`, so Tab and assistive
	// tech never reach a slide the viewer cannot see. There is no scrolling: the deck
	// replaces the surface instead of moving between them, which is what makes a slide
	// a slide. Content that does not fit is reported rather than silently clipped.
	_show(i, options) {
		options = options || {};
		if (!this._sections.length) {
			throw new Error('[nui-slides] show() called before the deck mounted.');
		}
		const target = Math.max(0, Math.min(this._sections.length - 1, i));
		const changed = target !== this._current;
		// A new slide ends the previous one's delivery: narration must not keep talking
		// over the slide the viewer has moved to.
		if (changed) this._stopNarration();
		const section = this._sections[target];
		this._sections.forEach((s, n) => {
			if (n === target) {
				s.setAttribute('data-current', '');
				s.removeAttribute('inert');
			} else {
				s.removeAttribute('data-current');
				s.setAttribute('inert', '');
			}
		});
		this._current = target;
		if (options.focus !== false) section.focus({ preventScroll: true });
		this._reportOverflow(section);
		this._updateToolbar();
		// Narration is the delivery channel for THIS surface (spec §5.2): it is never
		// drawn on the slide, but it is what a delivery profile reads when the slide
		// becomes current, so it travels with the event rather than being scraped.
		const narration = this.narration(target);
		this._updateNotes(narration);
		this.dispatchEvent(new CustomEvent('nui-slide-change', {
			detail: { index: target, count: this._sections.length, section, narration }
		}));
		// A slide that just became current is what autoplay acts on — including one
		// reached BY autoplay, which is why the flow is per slide and never a loop.
		if (changed && this._autoPlaying) this._restartFlow();
		return target;
	}

	// Three groups, two rules: navigation | delivery (autoplay, narration) | view
	// (fullscreen, settings). A rule between each icon would say nothing about which
	// controls belong together; the grouping is the information.
	_buildToolbar() {
		if (this._toolbar || (!this.hasAttribute('toolbar') && !this.hasAttribute('controls'))) return;
		const nav = document.createElement('nav');
		nav.className = 'nui-slides-toolbar';
		nav.setAttribute('aria-label', 'Slide presentation controls');

		const makeBtn = (className, label, title, icon) => {
			const btn = document.createElement('button');
			btn.type = 'button';
			btn.className = 'nui-slides-btn ' + className;
			btn.setAttribute('aria-label', label);
			btn.title = title;
			btn.innerHTML = '<nui-icon name="' + icon + '"></nui-icon>';
			nav.appendChild(btn);
			return btn;
		};
		const makeSep = () => {
			const sep = document.createElement('span');
			sep.className = 'nui-slides-toolbar-sep';
			sep.setAttribute('aria-hidden', 'true');
			nav.appendChild(sep);
		};

		const prevBtn = makeBtn('nui-slides-btn-prev', 'Previous slide', 'Previous slide (Left Arrow)', 'chevron_right');
		prevBtn.querySelector('nui-icon').style.transform = 'rotate(180deg)';
		prevBtn.addEventListener('click', (e) => { e.stopPropagation(); this.prev(); });

		const counter = document.createElement('span');
		counter.className = 'nui-slides-toolbar-counter';
		counter.setAttribute('aria-live', 'polite');
		counter.textContent = (this._current >= 0 ? this._current + 1 : 1) + ' / ' + (this._sections ? this._sections.length : 1);
		nav.appendChild(counter);

		const nextBtn = makeBtn('nui-slides-btn-next', 'Next slide', 'Next slide (Right Arrow or Space)', 'chevron_right');
		nextBtn.addEventListener('click', (e) => { e.stopPropagation(); this.next(); });

		makeSep();

		const autoBtn = makeBtn('nui-slides-btn-autoplay', 'Start autoplay', 'Start autoplay', 'play');
		autoBtn.setAttribute('aria-pressed', 'false');
		autoBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			this.configure({ autoplay: !this._autoPlaying });
		});

		const narrBtn = makeBtn('nui-slides-btn-narration', 'Play narration', 'Play narration', 'record_voice_over');
		narrBtn.setAttribute('aria-pressed', 'false');
		narrBtn.addEventListener('click', (e) => { e.stopPropagation(); this._toggleNarration(); });

		makeSep();

		const fsBtn = makeBtn('nui-slides-btn-fullscreen', 'Toggle fullscreen presentation', 'Toggle fullscreen (F)', 'fullscreen');
		fsBtn.addEventListener('click', (e) => { e.stopPropagation(); this.toggleFullscreen(); });

		const cfgBtn = makeBtn('nui-slides-btn-settings', 'Slide settings', 'Slide settings', 'settings');
		cfgBtn.addEventListener('click', (e) => { e.stopPropagation(); this._openSettings(); });

		this.append(nav);
		// The toolbar sits directly under the slide; the notes strip keeps its place
		// below it even when it was built first (a `toolbar` attribute added later).
		if (this._notes) this.append(this._notes);
		if (typeof customElements !== 'undefined' && customElements.upgrade) {
			customElements.upgrade(nav);
		}
		this._toolbar = nav;
		this._tbPrev = prevBtn;
		this._tbNext = nextBtn;
		this._tbFs = fsBtn;
		this._tbAuto = autoBtn;
		this._tbNarr = narrBtn;
		this._tbCounter = counter;
		this._updateToolbar();
		this._setNarrationPlaying(!!this._narrationStop);
	}

	// Speaker notes: the slide's narration, below the canvas rather than on it. A
	// presenter reads it; the audience never sees it — which is what makes this a
	// surface renderer and not a reading one (spec §5.2). Opt-in with the `notes`
	// attribute: an authoring aid is not a default, and the canonical render stays hidden.
	_buildNotes() {
		if (this._notes || !this.hasAttribute('notes')) return;
		const box = document.createElement('div');
		box.className = 'nui-slides-notes';
		box.hidden = true;

		const head = document.createElement('div');
		head.className = 'nui-slides-notes-head';

		const label = document.createElement('span');
		label.className = 'nui-slides-notes-label';
		label.textContent = 'Narration';

		// The strip is a delivery control, not only a preview. It speaks through
		// nui-markdown's hook (nui.util.speakMarkdown), so an app's TTS endpoint is what
		// answers — a private player here would bypass exactly the integration the
		// format's delivery channel exists for.
		const play = document.createElement('button');
		play.type = 'button';
		play.className = 'nui-slides-notes-play';
		play.setAttribute('aria-label', 'Play narration');
		play.setAttribute('aria-pressed', 'false');
		play.innerHTML = '<nui-icon name="play"></nui-icon>';
		play.addEventListener('click', () => this._toggleNarration());

		head.append(label, play);

		const text = document.createElement('p');
		text.className = 'nui-slides-notes-text';

		box.append(head, text);
		// Below the toolbar, always: the controls belong to the slide surface, the
		// narration is what the presenter reads underneath them. Appending (rather than
		// inserting after the viewport) lets _buildToolbar re-order a later toolbar in
		// front of an existing strip.
		this.append(box);
		this._notes = box;
		this._notesText = text;
		this._notesPlay = play;
		this._updateNotes();
	}

	_updateNotes(narration) {
		if (!this._notes) return;
		const lines = narration || this.narration(this._current);
		this._notes.hidden = lines.length === 0;
		if (this._notesText) this._notesText.textContent = lines.join('\n\n');
		// No hook, no control: a button that cannot speak is worse than none.
		if (this._notesPlay) this._notesPlay.hidden = !lines.length || !nui.util.hasMarkdownSpeech();
	}

	// One playing state, two controls: the notes strip's button and the toolbar's
	// narration button are the same action, so they must never disagree. The speaking
	// state is a STOP square, not a pause: the toolbar's play/pause belongs to
	// autoplay, and two identical pause glyphs side by side read as one control.
	_setNarrationPlaying(playing) {
		const paint = (btn, idleIcon, labelIdle, labelPlaying) => {
			if (!btn) return;
			btn.dataset.playing = String(playing);
			btn.setAttribute('aria-pressed', String(playing));
			btn.setAttribute('aria-label', playing ? labelPlaying : labelIdle);
			btn.title = playing ? labelPlaying : labelIdle;
			btn.innerHTML = '<nui-icon name="' + (playing ? 'stop' : idleIcon) + '"></nui-icon>';
		};
		paint(this._notesPlay, 'play', 'Play narration', 'Stop narration');
		paint(this._tbNarr, 'record_voice_over', 'Play narration', 'Stop narration');
		this._updateToolbar();
	}

	_stopNarration() {
		const stop = this._narrationStop;
		this._narrationStop = null;
		// Invalidate any pending completion before stopping: the stop itself may settle
		// the utterance, and that settlement must not be treated as a fresh run.
		this._narrationRun = (this._narrationRun || 0) + 1;
		if (stop) {
			try { stop(); } catch (err) { console.warn('[nui-slides] narration stop() failed:', err && err.message); }
		}
		this._setNarrationPlaying(false);
	}

	// Start a script and return a promise that settles when it ENDS or is stopped —
	// null when the hook gave no completion signal, in which case a caller that wants
	// to wait cannot and must fall back to the dwell.
	_startNarrationLines(lines) {
		this._stopNarration();
		const text = (lines || []).join('\n\n').trim();
		if (!text) return null;
		const result = nui.util.speakMarkdown(text);
		if (!result) return null;
		this._narrationStop = typeof result.stop === 'function' ? result.stop
			: typeof result === 'function' ? result : () => {};
		this._narrationRun = (this._narrationRun || 0) + 1;
		const mine = this._narrationRun;
		this._setNarrationPlaying(true);
		if (!result.done || typeof result.done.then !== 'function') return null;
		const settle = () => { if (mine === this._narrationRun) this._stopNarration(); };
		return result.done.then(settle, settle);
	}

	// One script per press, in source order: a slide's several narration blocks are
	// delivery steps, and they are handed over as one text so any hook — browser voice
	// or an app's endpoint — reads them in sequence without a chaining protocol.
	_toggleNarration() {
		if (this._narrationStop) { this._stopNarration(); return; }
		this._startNarrationLines(this.narration(this._current));
	}

	// ── Autoplay ──
	// Per-slide flow, never a loop: each slide gets one pass of (narrate → dwell →
	// advance). Every navigation starts a new flow and invalidates the old one by
	// token, so a manual next/prev during autoplay simply re-bases it, and no stale
	// timer can advance a slide the viewer already left.
	_restartFlow() {
		if (!this._autoPlaying) return;
		clearTimeout(this._autoTimer);
		this._autoTimer = null;
		this._flow = (this._flow || 0) + 1;
		this._runSlideFlow(this._flow);
	}

	_runSlideFlow(token) {
		if (!this._autoPlaying || token !== this._flow) return;
		const opts = this.options;
		const lines = this.narration(this._current);
		const speak = opts.narrate && lines.length > 0 && nui.util.hasMarkdownSpeech();
		// Two different pauses: after speech the slide has been READ, so a short gap is
		// enough; a slide with nothing to say needs its own on-screen duration.
		const holdMs = (speak ? opts.narrationDelay : opts.dwell) * 1000;

		const advanceAfterDwell = () => {
			if (!this._autoPlaying || token !== this._flow) return;
			this._autoTimer = setTimeout(() => {
				this._autoTimer = null;
				if (!this._autoPlaying || token !== this._flow) return;
				if (this._current >= this._sections.length - 1) { this.configure({ autoplay: false }); return; }
				this._show(this._current + 1);   // _show re-bases the flow for the new slide
			}, holdMs);
		};

		if (speak) {
			const done = this._startNarrationLines(lines);
			if (done) { done.then(advanceAfterDwell); return; }
		}
		advanceAfterDwell();
	}

	_startAuto() {
		if (!this._sections || !this._sections.length) return;
		this._autoPlaying = true;
		this.setAttribute('autoplay', '');
		if (this._current >= this._sections.length - 1) this._show(0);
		else this._restartFlow();
		this._updateToolbar();
		this.dispatchEvent(new CustomEvent('nui-slides-autoplay', { detail: { playing: true } }));
	}

	_stopAuto() {
		if (!this._autoPlaying) {
			// Still reflect the attribute, so a configure({autoplay:false}) on an idle
			// deck leaves the element truthful.
			this.removeAttribute('autoplay');
			this._updateToolbar();
			return;
		}
		this._autoPlaying = false;
		this.removeAttribute('autoplay');
		clearTimeout(this._autoTimer);
		this._autoTimer = null;
		this._flow = (this._flow || 0) + 1;
		this._stopNarration();
		this._updateToolbar();
		this.dispatchEvent(new CustomEvent('nui-slides-autoplay', { detail: { playing: false } }));
	}

	// Settings are behaviour, and the dialog edits exactly the options configure()
	// accepts — there is no second, private set of knobs.
	async _openSettings() {
		const api = nui.components && nui.components.dialog;
		if (!api || typeof api.page !== 'function') {
			console.warn('[nui-slides] settings need the nui-dialog component.');
			return;
		}
		const opts = this.options;
		const html = `
			<div class="nui-slides-settings">
				<nui-checkbox>
					<input type="checkbox" id="nui-slides-opt-narrate" data-slide-narrate ${opts.narrate ? 'checked' : ''}>
					<label for="nui-slides-opt-narrate">Narrate each slide automatically</label>
				</nui-checkbox>
				<label class="nui-slides-settings-label" for="nui-slides-opt-mode">Colour mode</label>
				<nui-select id="nui-slides-opt-mode" size="small"><select></select></nui-select>

				<label class="nui-slides-settings-label" for="nui-slides-opt-gap">
					<span>Pause after the narration</span>
					<span class="nui-slides-settings-value" data-slide-gap>${opts.narrationDelay.toFixed(1)}s</span>
				</label>
				<nui-slider>
					<input id="nui-slides-opt-gap" type="range" min="0" max="10" step="0.5" value="${opts.narrationDelay}">
				</nui-slider>
				<label class="nui-slides-settings-label" for="nui-slides-opt-dwell">
					<span>Slide duration (no narration)</span>
					<span class="nui-slides-settings-value" data-slide-dwell>${opts.dwell.toFixed(1)}s</span>
				</label>
				<nui-slider>
					<input id="nui-slides-opt-dwell" type="range" min="0.5" max="15" step="0.5" value="${opts.dwell}">
				</nui-slider>
				<p class="nui-slides-settings-hint">Autoplay starts and pauses with the toolbar's play button, so these settings describe how it runs, not whether it runs.</p>
			</div>`;
		const { dialog, main, result } = await api.page('Slide settings', html, {
			placement: 'center',
			buttons: [
				{ label: 'Cancel', value: 'cancel', type: 'outline' },
				{ label: 'Apply', value: 'apply', type: 'primary' }
			]
		});
		const scope = main || dialog;
		const modeSelect = scope.querySelector('#nui-slides-opt-mode');
		if (modeSelect && modeSelect.setItems) {
			modeSelect.setItems([
				{ value: 'auto', label: 'Auto (follow the page)' },
				{ value: 'light', label: 'Light' },
				{ value: 'dark', label: 'Dark' }
			]);
			modeSelect.setValue(opts.mode);
		}
		const range = scope.querySelector('#nui-slides-opt-dwell');
		const out = scope.querySelector('[data-slide-dwell]');
		const gapRange = scope.querySelector('#nui-slides-opt-gap');
		const gapOut = scope.querySelector('[data-slide-gap]');
		const bind = (input, label) => {
			if (!input || !label) return;
			const paint = () => { label.textContent = Number(input.value).toFixed(1) + 's'; };
			input.addEventListener('input', paint);
			paint();
		};
		bind(range, out);
		bind(gapRange, gapOut);

		const answer = await result;
		if (answer !== 'apply') return;
		const narrate = scope.querySelector('[data-slide-narrate]');
		this.configure({
			narrate: !!(narrate && narrate.checked),
			mode: modeSelect && modeSelect.getValue ? modeSelect.getValue() : opts.mode,
			dwell: range ? Number(range.value) : opts.dwell,
			narrationDelay: gapRange ? Number(gapRange.value) : opts.narrationDelay
		});
	}

	_updateToolbar() {
		if (!this._toolbar || !this._sections) return;
		const total = this._sections.length;
		const cur = this._current;
		if (this._tbCounter) this._tbCounter.textContent = (cur + 1) + ' / ' + total;
		if (this._tbPrev) this._tbPrev.disabled = cur <= 0;
		if (this._tbNext) this._tbNext.disabled = cur >= total - 1;
		if (this._tbAuto) {
			const playing = !!this._autoPlaying;
			this._tbAuto.setAttribute('aria-pressed', String(playing));
			this._tbAuto.setAttribute('aria-label', playing ? 'Pause autoplay' : 'Start autoplay');
			this._tbAuto.title = playing ? 'Pause autoplay' : 'Start autoplay';
			this._tbAuto.innerHTML = '<nui-icon name="' + (playing ? 'pause' : 'play') + '"></nui-icon>';
		}
		if (this._tbNarr) {
			// Disabled rather than hidden: the toolbar's shape must not change with the
			// slide, and a slide without a script is a fact about the slide.
			const available = this.narration(cur).length > 0 && nui.util.hasMarkdownSpeech();
			this._tbNarr.disabled = !available;
			this._tbNarr.title = available
				? (this._narrationStop ? 'Stop narration' : 'Play narration')
				: 'No narration on this slide';
		}
		if (this._tbFs) {
			const isFs = document.fullscreenElement === this;
			const icon = this._tbFs.querySelector('nui-icon');
			if (icon) icon.setAttribute('name', isFs ? 'close' : 'fullscreen');
			this._tbFs.title = isFs ? 'Exit fullscreen (F or Esc)' : 'Toggle fullscreen (F)';
		}
	}

	// A slide that overflows cannot be scrolled — that is the point — so the renderer
	// says so instead of cropping someone's content in silence. `data-overflow` is the
	// hook for a surface treatment; the console line is the diagnosis.
	_reportOverflow(section) {
		if (section.scrollHeight <= section.clientHeight + 1) return;
		section.setAttribute('data-overflow', '');
		if (this._overflowWarned.has(section)) return;
		this._overflowWarned.add(section);
		console.warn('[nui-slides] slide ' + (this._sections.indexOf(section) + 1) + ' of ' +
			this._sections.length + ' is ' + (section.scrollHeight - section.clientHeight) +
			'px taller than the slide — the content is being clipped.');
	}

	get count() { return this._sections ? this._sections.length : 0; }
	get current() { return this._current; }

	// Narration blocks are delivery text (spec §5.2): spoken, not shown. They stay in
	// the DOM — the CSS hides them from the surface — and this is how a delivery
	// profile reads them, in source order, verbatim. The extractor is nui-markdown's,
	// not a copy: the button it injects is skipped, the label is CSS `content` (never
	// text), and soft line breaks stay word separators.
	narration(i = this._current) {
		const section = (this._sections || [])[i];
		if (!section) return [];
		return Array.from(section.querySelectorAll('.nui-preset-narration'))
			.map((el) => nui.util.narrationText(el))
			.filter(Boolean);
	}

	show(i) { return this._show(i); }
	next() { return this._show(this._current + 1); }
	prev() { return this._show(this._current - 1); }

	toggleFullscreen() {
		if (!document.fullscreenEnabled) return;
		if (document.fullscreenElement === this) return document.exitFullscreen();
		return this.requestFullscreen();
	}

	_key(e) {
		if (!this._mounted || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
		if (e.target instanceof Element && e.target.closest(INTERACTIVE)) return;

		if (e.key === 'f' || e.key === 'F') {
			e.preventDefault();
			this.toggleFullscreen();
			return;
		}

		const next = NEXT.has(e.key), prev = PREV.has(e.key);
		const first = e.key === 'Home', last = e.key === 'End';
		if (!next && !prev && !first && !last) return;
		e.preventDefault();
		this._show(first ? 0 : last ? this._sections.length - 1 : this._current + (next ? 1 : -1));
	}

	disconnectedCallback() {
		this._stopNarration();
		// Timers do not survive the document they were started in; the `autoplay`
		// attribute does, so a re-attach resumes rather than silently idles.
		clearTimeout(this._autoTimer);
		this._autoTimer = null;
		this._flow = (this._flow || 0) + 1;
		this._autoPlaying = false;
		this._stopWatching();
		if (this._resize) { this._resize.disconnect(); this._resize = null; }
		if (this._onKey) { this.removeEventListener('keydown', this._onKey); this._onKey = null; }
		if (this._onTouchStart) { this.removeEventListener('touchstart', this._onTouchStart); this._onTouchStart = null; }
		if (this._onTouchEnd) { this.removeEventListener('touchend', this._onTouchEnd); this._onTouchEnd = null; }
		if (this._onMouseMove) { this.removeEventListener('mousemove', this._onMouseMove); this._onMouseMove = null; }
		if (this._onMouseLeave) { this.removeEventListener('mouseleave', this._onMouseLeave); this._onMouseLeave = null; }
		if (this._onFullscreenChange) { document.removeEventListener('fullscreenchange', this._onFullscreenChange); this._onFullscreenChange = null; }
		if (this._fsTimer) { clearTimeout(this._fsTimer); this._fsTimer = null; }
		if (this._toolbar) { this._toolbar.remove(); this._toolbar = null; }
		if (this._notes) { this._notes.remove(); this._notes = null; this._notesText = null; }
		// The rendered deck is left in place: a re-attach reuses it rather than cloning
		// chrome and numbering the slides a second time.
	}
}

customElements.define('nui-slides', NuiSlides);

if (typeof nui !== 'undefined' && nui) {
	nui.components = nui.components || {};
	nui.components.slides = {
		show: (i, el) => (el || document.querySelector('nui-slides')).show(i),
		next: (el) => (el || document.querySelector('nui-slides')).next(),
		prev: (el) => (el || document.querySelector('nui-slides')).prev(),
		toggleFullscreen: (el) => (el || document.querySelector('nui-slides')).toggleFullscreen(),
		configure: (options, el) => (el || document.querySelector('nui-slides')).configure(options)
	};
}

export { NuiSlides };
