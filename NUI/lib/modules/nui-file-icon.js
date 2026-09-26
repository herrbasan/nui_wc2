// nui-file-icon.js - File-type icon addon.
//
// A document glyph with the file's extension overlaid, so a file reads as a file
// first and as a type second — the same silhouette for every type, differing by
// label and colour.
//
//     <nui-file-icon name="report.pdf"></nui-file-icon>   // extension from a filename or path
//     <nui-file-icon type="zip" size="large"></nui-file-icon>
//     <nui-file-icon name="scan.pdf" label="Scanned report"></nui-file-icon>
//
// Colour is a CATEGORY, not a per-extension table: a new extension means naming
// its category here, and the stylesheet needs no edit. An unknown or absent
// extension is not an error — it renders the neutral "file" state, because file
// types are open-ended and the icon is decoration.

import { nui } from '../../nui.js';

const EXT_CATEGORY = {
	// documents
	md: 'doc', markdown: 'doc', txt: 'doc', rtf: 'doc', pdf: 'doc', doc: 'doc', docx: 'doc', odt: 'doc', pages: 'doc',
	// source code
	js: 'code', mjs: 'code', cjs: 'code', ts: 'code', tsx: 'code', jsx: 'code', py: 'code', rs: 'code',
	go: 'code', c: 'code', h: 'code', cpp: 'code', hpp: 'code', cs: 'code', java: 'code', rb: 'code',
	php: 'code', sh: 'code', ps1: 'code', bat: 'code', lua: 'code', swift: 'code', kt: 'code', r: 'code',
	// data
	json: 'data', yaml: 'data', yml: 'data', xml: 'data', csv: 'data', tsv: 'data', sql: 'data', db: 'data', toml: 'data',
	// markup and style
	html: 'markup', htm: 'markup', css: 'markup', scss: 'markup', sass: 'markup', less: 'markup', svg: 'markup', vue: 'markup',
	// images
	png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', webp: 'image', avif: 'image', bmp: 'image', ico: 'image', tif: 'image', tiff: 'image',
	// audio
	mp3: 'audio', wav: 'audio', ogg: 'audio', flac: 'audio', m4a: 'audio', aac: 'audio', opus: 'audio',
	// video
	mp4: 'video', webm: 'video', mkv: 'video', mov: 'video', avi: 'video',
	// archives
	zip: 'archive', tar: 'archive', gz: 'archive', '7z': 'archive', rar: 'archive', bz2: 'archive', xz: 'archive',
	// spreadsheets and slides
	xls: 'sheet', xlsx: 'sheet', ods: 'sheet', numbers: 'sheet',
	ppt: 'slide', pptx: 'slide', odp: 'slide', key: 'slide',
};

// Extensions whose label would not fit the glyph whole.
const EXT_LABEL = { markdown: 'MD', jpeg: 'JPG', tiff: 'TIF', yaml: 'YML', mjs: 'JS', cjs: 'JS', ps1: 'PS', docx: 'DOC', pptx: 'PPT', xlsx: 'XLS', webm: 'WEB' };

const EXT_ATTR_PATTERN = /^[a-z0-9+]+$/;

// An explicit `type`/`extension` is the extension itself and may be written with
// or without the dot. Anything outside [a-z0-9+] after that is a typo, not a
// type, so it is rejected rather than silently rendered as a label.
function normalizeExt(value) {
	const ext = String(value).trim().toLowerCase().replace(/^\./, '');
	if (!ext) return '';
	if (!EXT_ATTR_PATTERN.test(ext)) {
		throw new TypeError(`[NUI] <nui-file-icon> type="${value}" is not a file extension. Use letters, digits and "+" only — e.g. "pdf" or ".tar.gz" is not supported (pass "gz").`);
	}
	return ext;
}

// Derive from a filename or path. A dotfile (.gitignore) has no extension, and a
// path's directory dots must not count, hence the last path segment first.
function extFromName(name) {
	const base = String(name).split(/[\\/]/).pop() || '';
	const dot = base.lastIndexOf('.');
	return dot > 0 ? normalizeExt(base.slice(dot + 1)) : '';
}

function render(element) {
	const explicit = element.getAttribute('type') ?? element.getAttribute('extension');
	const ext = explicit != null ? normalizeExt(explicit) : extFromName(element.getAttribute('name') || '');
	const category = EXT_CATEGORY[ext] || 'file';

	element.classList.add('nui-file-icon', `nui-file-icon--${category}`);
	element.dataset.ext = ext;

	// `label` marks a standalone icon that carries meaning on its own (it becomes
	// a labelled img). Without one the glyph is decorative, which is what it is
	// beside a filename — so no aria-label is invented.
	const label = element.getAttribute('label');
	if (label) {
		element.setAttribute('role', 'img');
		element.setAttribute('aria-label', label);
	}

	element.textContent = '';
	const glyph = nui.util.dom.create('span', { class: 'nui-file-icon-glyph', target: element });
	glyph.setAttribute('aria-hidden', 'true');
	nui.util.dom.create('span', {
		class: 'nui-file-icon-ext',
		text: ext ? (EXT_LABEL[ext] || ext).slice(0, 4).toUpperCase() : 'FILE',
		target: glyph
	});
}

// Addons define their own element — registerComponent() is internal to nui.js,
// and the addon may not be loaded at all.
customElements.define('nui-file-icon', class extends HTMLElement {
	connectedCallback() {
		render(this);
	}
});

export default nui;
