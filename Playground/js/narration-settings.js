// Playground chrome, not a component: the demo's narration settings pane.
//
// The library carries a working default — every `preset=narration` block is spoken by
// the browser's own voice, chosen by nui.util.pickSpeechVoice(). This pane does not
// replace that machinery; it drives the SAME seam an application would use for its own
// TTS service (nui.util.setMarkdownSpeech), so what the Playground demonstrates is the
// integration path, not a private demo feature.
//
// Selection, preview and the applied settings are three different things on purpose:
// auditioning a voice must not change what the document plays until "Use voice".

import { nui } from '../../NUI/nui.js';

const STORE_VOICE = 'nui-narration-voice';
const STORE_RATE = 'nui-narration-rate';
const RATE_DEFAULT = 1;
const SAMPLE = 'This is how narration sounds on every slide of this document.';

const root = document.querySelector('[data-narration-settings]');
const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;

const voiceKey = (voice) => voice.voiceURI || voice.name;
const shortLabel = (voice) => voice.name.replace(/\s+-\s+.*$/, '') + ' · ' + voice.lang;

if (!root) {
	// Nothing to wire (a page that does not include the pane).
} else if (!synth || typeof SpeechSynthesisUtterance !== 'function') {
	root.querySelector('[data-tts-status]').textContent =
		'This browser has no speech synthesis — narration stays silent.';
	root.querySelectorAll('button').forEach((button) => { button.disabled = true; });
} else {
	init();
}

function init() {
	const selectEl = root.querySelector('nui-select');
	const rateEl = root.querySelector('input[type="range"]');
	const rateOut = root.querySelector('[data-tts-rate]');
	const statusEl = root.querySelector('[data-tts-status]');
	const noteEl = root.querySelector('[data-tts-note]');
	const previewBtn = root.querySelector('[data-tts-preview]');
	const applyBtn = root.querySelector('[data-tts-apply]');
	const resetBtn = root.querySelector('[data-tts-reset]');

	// `applied` is what the document currently uses; the controls hold the candidate.
	// Empty key = the built-in default.
	let applied = { key: localStorage.getItem(STORE_VOICE) || '', rate: readRate() };

	const voices = () => synth.getVoices();
	const findVoice = (key) => voices().find((voice) => voiceKey(voice) === key) || null;
	const defaultVoice = () => nui.util.pickSpeechVoice();
	const selectedKey = () => selectEl.getValue() || '';
	const selectedRate = () => Number(rateEl.value);
	const currentVoice = () => findVoice(selectedKey()) || defaultVoice();

	function readRate() {
		const value = Number(localStorage.getItem(STORE_RATE));
		return Number.isFinite(value) && value >= 0.5 && value <= 1.5 ? value : RATE_DEFAULT;
	}

	function paintRate() {
		rateOut.textContent = selectedRate().toFixed(2) + '×';
	}

	function paintStatus() {
		const voice = findVoice(applied.key) || defaultVoice();
		const name = voice ? shortLabel(voice) : 'no voice reported';
		// In default mode the select SHOWS the default voice, so compare against it —
		// otherwise the pane reports "not applied" the moment it paints.
		const def = defaultVoice();
		const expectedKey = applied.key || (def ? voiceKey(def) : '');
		const pending = selectedKey() !== expectedKey || selectedRate() !== applied.rate;
		const current = applied.key
			? 'Custom voice: ' + name + ' at ' + applied.rate.toFixed(2) + '×'
			: 'Built-in default: ' + name;
		statusEl.textContent = pending ? current + ' — selection not applied yet.' : current;
	}

	// Voices arrive asynchronously (Chrome reports [] until `voiceschanged`), so the
	// list is painted on both paths and the selection is preserved by key, not index.
	// `localService` splits the list into the two families that actually exist: the OS
	// voices (SAPI on Windows, system voices on macOS) and the browser's own CLOUD
	// voices (Chrome's "Google …", Edge's "… Online (Natural)"). An embedded Chromium
	// — VS Code's browser, WebView2 — exposes the system set only, so a list of nothing
	// but "Microsoft <name>" is the host, not a bug.
	function paintVoices() {
		const list = voices();
		if (!list.length) {
			statusEl.textContent = 'Waiting for the browser to report its voices…';
			return;
		}
		const def = defaultVoice();
		const wanted = selectedKey();
		selectEl.setItems(list.map((voice) => ({
			value: voiceKey(voice),
			label: shortLabel(voice)
				+ (voice.localService ? '' : ' · cloud')
				+ (def && voiceKey(def) === voiceKey(voice) ? ' (default)' : '')
		})));
		selectEl.setValue(
			(wanted && findVoice(wanted)) ? wanted
				: (applied.key && findVoice(applied.key)) ? applied.key
					: def ? voiceKey(def) : voiceKey(list[0])
		);
		const cloud = list.filter((voice) => !voice.localService).length;
		noteEl.hidden = cloud > 0;
		noteEl.textContent = cloud ? ''
			: 'This host reports on-device voices only. A full browser adds its own cloud voices — '
				+ 'Edge the “Natural” voices, Chrome the “Google” ones when online.';
		paintStatus();
	}

	// The same contract as nui.util.browserSpeech — a stop handle plus `done` — with the
	// chosen voice and rate instead of the ranked default. One utterance at a time.
	function speak(text, voice, rate) {
		synth.cancel();
		const utterance = new SpeechSynthesisUtterance(text);
		if (voice) {
			utterance.voice = voice;
			utterance.lang = voice.lang;
		}
		utterance.rate = rate;
		let settle;
		const done = new Promise((resolve) => { settle = resolve; });
		const finish = () => settle();
		utterance.onend = finish;
		utterance.onerror = finish;
		synth.speak(utterance);
		return { stop: () => { finish(); synth.cancel(); }, done };
	}

	function installApplied() {
		if (!applied.key) {
			nui.util.resetMarkdownSpeech();
			return;
		}
		// Resolve by key at SPEAK time: the voice list can be replaced by the platform
		// (a headset plugged in), and a captured SpeechSynthesisVoice object goes stale.
		nui.util.setMarkdownSpeech((text) =>
			speak(text, findVoice(applied.key) || defaultVoice(), applied.rate));
	}

	rateEl.value = String(applied.rate);
	paintRate();

	customElements.whenDefined('nui-select').then(paintVoices);
	synth.addEventListener('voiceschanged', paintVoices);

	selectEl.addEventListener('nui-change', paintStatus);
	rateEl.addEventListener('input', () => { paintRate(); paintStatus(); });

	previewBtn.addEventListener('click', () => {
		// Audition only: the applied setting is untouched.
		speak(SAMPLE, currentVoice(), selectedRate());
	});

	applyBtn.addEventListener('click', () => {
		applied = { key: selectedKey(), rate: selectedRate() };
		localStorage.setItem(STORE_VOICE, applied.key);
		localStorage.setItem(STORE_RATE, String(applied.rate));
		installApplied();
		paintVoices();
	});

	resetBtn.addEventListener('click', () => {
		applied = { key: '', rate: RATE_DEFAULT };
		localStorage.removeItem(STORE_VOICE);
		localStorage.removeItem(STORE_RATE);
		rateEl.value = String(RATE_DEFAULT);
		paintRate();
		installApplied();
		// Reset means the pane now SHOWS the default, not merely uses it: a stale
		// selection left in the control would read as "not applied" forever.
		const def = defaultVoice();
		if (def) selectEl.setValue(voiceKey(def));
		paintVoices();
	});

	// A stored choice is re-installed immediately, so the setting survives a reload the
	// same way it survives navigation (the pane is chrome, the pages are cached).
	if (applied.key) installApplied();
	paintStatus();
}
