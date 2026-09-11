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
// Events: `nui-slide-change` { index, count, section }, `nui-slides-error` { message }.

import { nui } from '../../nui.js';

const NEXT = new Set(['ArrowDown', 'ArrowRight', 'PageDown', ' ', 'Spacebar']);
const PREV = new Set(['ArrowUp', 'ArrowLeft', 'PageUp']);
// Keys must still reach text fields and buttons inside a slide, so navigation stands
// down for anything interactive. Space is the awkward one: it activates what has focus.
const INTERACTIVE = 'a[href], button, input, select, textarea, [contenteditable=""], [contenteditable="true"]';
const MOUNT_TIMEOUT_MS = 5000;
const DEFAULT_BASE = [1280, 720];

class NuiSlides extends HTMLElement {
	static observedAttributes = ['base', 'toolbar', 'controls'];

	attributeChangedCallback(name) {
		if (name === 'base' && this._mounted) this._fit();
		if ((name === 'toolbar' || name === 'controls') && this._mounted) {
			if (this.hasAttribute('toolbar') || this.hasAttribute('controls')) this._buildToolbar();
			else if (this._toolbar) { this._toolbar.remove(); this._toolbar = null; }
		}
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
		this._show(0, { focus: false });
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
		this.dispatchEvent(new CustomEvent('nui-slide-change', {
			detail: { index: target, count: this._sections.length, section }
		}));
		return target;
	}

	_buildToolbar() {
		if (this._toolbar || (!this.hasAttribute('toolbar') && !this.hasAttribute('controls'))) return;
		const nav = document.createElement('nav');
		nav.className = 'nui-slides-toolbar';
		nav.setAttribute('aria-label', 'Slide presentation controls');

		const prevBtn = document.createElement('button');
		prevBtn.type = 'button';
		prevBtn.className = 'nui-slides-btn nui-slides-btn-prev';
		prevBtn.setAttribute('aria-label', 'Previous slide');
		prevBtn.title = 'Previous slide (Left Arrow)';
		prevBtn.innerHTML = '<nui-icon name="chevron_right" style="transform: rotate(180deg)"></nui-icon>';
		prevBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			this.prev();
		});

		const counter = document.createElement('span');
		counter.className = 'nui-slides-toolbar-counter';
		counter.setAttribute('aria-live', 'polite');
		counter.textContent = (this._current >= 0 ? this._current + 1 : 1) + ' / ' + (this._sections ? this._sections.length : 1);

		const nextBtn = document.createElement('button');
		nextBtn.type = 'button';
		nextBtn.className = 'nui-slides-btn nui-slides-btn-next';
		nextBtn.setAttribute('aria-label', 'Next slide');
		nextBtn.title = 'Next slide (Right Arrow or Space)';
		nextBtn.innerHTML = '<nui-icon name="chevron_right"></nui-icon>';
		nextBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			this.next();
		});

		const fsBtn = document.createElement('button');
		fsBtn.type = 'button';
		fsBtn.className = 'nui-slides-btn nui-slides-btn-fullscreen';
		fsBtn.setAttribute('aria-label', 'Toggle fullscreen presentation');
		fsBtn.title = 'Toggle fullscreen (F)';
		fsBtn.innerHTML = '<nui-icon name="fullscreen"></nui-icon>';
		fsBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			this.toggleFullscreen();
		});

		nav.append(prevBtn, counter, nextBtn, fsBtn);
		this.append(nav);
		if (typeof customElements !== 'undefined' && customElements.upgrade) {
			customElements.upgrade(nav);
		}
		this._toolbar = nav;
		this._tbPrev = prevBtn;
		this._tbNext = nextBtn;
		this._tbFs = fsBtn;
		this._tbCounter = counter;
		this._updateToolbar();
	}

	_updateToolbar() {
		if (!this._toolbar || !this._sections) return;
		const total = this._sections.length;
		const cur = this._current;
		if (this._tbCounter) this._tbCounter.textContent = (cur + 1) + ' / ' + total;
		if (this._tbPrev) this._tbPrev.disabled = cur <= 0;
		if (this._tbNext) this._tbNext.disabled = cur >= total - 1;
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
		toggleFullscreen: (el) => (el || document.querySelector('nui-slides')).toggleFullscreen()
	};
}

export { NuiSlides };
