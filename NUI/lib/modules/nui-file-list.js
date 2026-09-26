// nui-file-list.js - File list addon.
//
// A list of files with type icons, names, optional status, and per-row actions
// (download / remove). Built to serve both ends of the same need — the files
// just added to an upload dropzone, and a document library — which is why the
// action set is configurable and the status is optional.
//
//     <nui-file-list></nui-file-list>
//
//     fileList.loadData(
//         [{ name: 'report.pdf', size: 184320, url: '/files/report.pdf' },
//          { name: 'photo.png', size: 92160, status: 'uploading' }],
//         { actions: ['download', 'remove'], sortable: true }
//     );
//
// `nui-sortable` is a CORE component, not an addon, so sortable lists add no
// second import. Reordering is reported, not performed on your data: the host
// owns the array, so the component reorders its own copy and dispatches
// `nui-file-reorder` with the result.

import { nui } from '../../nui.js';

const ACTION_META = {
	download: { icon: 'download', label: 'Download' },
	remove:   { icon: 'delete',   label: 'Remove' },
	preview:  { icon: 'visibility', label: 'Preview' },
	open:     { icon: 'open_in_full', label: 'Open' },
};

const STATUS_VARIANT = {
	done: 'success', complete: 'success', uploaded: 'success',
	uploading: 'info', pending: 'info', queued: 'info',
	failed: 'danger', error: 'danger',
	warning: 'warning', paused: 'warning',
};

const DEFAULT_OPTIONS = {
	actions: ['download', 'remove'],
	sortable: false,
	emptyText: 'No files',
	onAction: null,
};

function humanSize(bytes) {
	if (!Number.isFinite(bytes) || bytes < 0) return '';
	const units = ['B', 'KB', 'MB', 'GB', 'TB'];
	let value = bytes;
	let unit = 0;
	while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit++; }
	const rounded = value >= 10 || unit === 0 ? Math.round(value) : Math.round(value * 10) / 10;
	return `${rounded} ${units[unit]}`;
}

function describe(file) {
	const size = typeof file.size === 'number' ? humanSize(file.size) : (file.size || '');
	return [file.detail, size].filter(Boolean).join(' · ');
}

// Custom action keys are allowed — the icon falls back to a generic one and the
// host handles them — but an unknown key with no handler would be a dead button,
// so the label is at least derived rather than left blank.
function actionMeta(action) {
	return ACTION_META[action] || { icon: 'extension', label: action.replace(/[-_]/g, ' ').replace(/^./, c => c.toUpperCase()) };
}

function buildRow(element, file, options) {
	const dom = nui.util.dom;
	// A sortable row IS the nui-sortable-item: core supplies its chrome (padding,
	// border, radius, flex), so the plain variant below declares its own and this
	// one must not stack a second box inside it.
	const row = options.sortable
		? dom.create('nui-sortable-item', { class: 'nui-file-row', data: { id: file.id ?? file.name } })
		: dom.create('div', { class: 'nui-file-row nui-file-row--plain' });
	row.dataset.index = String(element._files.indexOf(file));

	if (options.sortable) {
		// `.drag-handle` is the core contract: a sortable item containing one only
		// starts a drag from the handle, which keeps the row's buttons clickable
		// and its text selectable.
		dom.create('nui-icon', { class: 'drag-handle', attrs: { name: 'drag_indicator' }, target: row });
	}

	dom.create('nui-file-icon', { attrs: { name: file.name || file.type || '' }, target: row });

	const meta = dom.create('div', { class: 'nui-file-meta', target: row });
	dom.create('span', { class: 'nui-file-name', text: file.name || '(unnamed)', target: meta });
	const detail = describe(file);
	if (detail) dom.create('span', { class: 'nui-file-detail', text: detail, target: meta });

	if (file.status) {
		dom.create('nui-badge', {
			class: 'nui-file-status',
			attrs: { variant: STATUS_VARIANT[String(file.status).toLowerCase()] || null },
			text: file.status,
			target: row
		});
	}

	const actions = dom.create('div', { class: 'nui-file-actions', target: row });
	for (const action of options.actions) {
		// A download with nothing to download is not rendered: a control that
		// cannot act is worse than an absent one.
		if (action === 'download' && !file.url) continue;

		const info = actionMeta(action);
		const wrap = dom.create('nui-button', { attrs: { variant: 'icon' }, target: actions });
		const button = dom.create('button', {
			attrs: { type: 'button', 'aria-label': `${info.label} ${file.name || ''}`.trim() },
			target: wrap
		});
		dom.create('nui-icon', { attrs: { name: info.icon }, target: button });
		button.addEventListener('click', e => {
			e.stopPropagation();
			runAction(element, action, file);
		});
	}

	return row;
}

function render(element) {
	const options = element._options;
	element.textContent = '';

	if (!element._files.length) {
		nui.util.dom.create('p', { class: 'nui-file-empty', text: options.emptyText, target: element });
		return;
	}

	const rows = nui.util.dom.create(options.sortable ? 'nui-sortable' : 'div', {
		class: 'nui-file-rows',
		target: element
	});
	for (const file of element._files) {
		rows.append(buildRow(element, file, options));
	}
	if (!options.sortable) return;

	// nui-sortable reports the new DOM order; the component's array is only
	// reordered once the host has had the chance to cancel (it may be the owner
	// of the order — a server-side sequence, a fixed priority).
	rows.addEventListener('nui-sortable-change', e => {
		const ids = e.detail.order;
		const reordered = ids.map(id => element._files.find(f => String(f.id ?? f.name) === String(id))).filter(Boolean);
		const accepted = element.dispatchEvent(new CustomEvent('nui-file-reorder', {
			bubbles: true,
			cancelable: true,
			detail: { files: reordered, order: ids }
		}));
		if (!accepted) {
			render(element); // host refused the change: put the rows back
			return;
		}
		element._files = reordered;
		rows.querySelectorAll('.nui-file-row').forEach((row, i) => row.dataset.index = String(i));
	});
}

function runAction(element, action, file) {
	const index = element._files.indexOf(file);
	const detail = { action, file, index };

	// Two events, one contract: `nui-file-action` for a single catch-all handler,
	// `nui-file-<action>` for per-action handlers. Either can cancel the default.
	const generic = element.dispatchEvent(new CustomEvent('nui-file-action', { bubbles: true, cancelable: true, detail }));
	const specific = element.dispatchEvent(new CustomEvent(`nui-file-${action}`, { bubbles: true, cancelable: true, detail }));
	element._options.onAction?.(action, file, index);

	if (!generic || !specific) return;

	if (action === 'remove') {
		element.removeFile(file);
		return;
	}
	if (action === 'download' && file.url) {
		const link = nui.util.dom.create('a', { attrs: { href: file.url, download: file.name || '' }, target: document.body });
		link.click();
		link.remove();
	}
}

customElements.define('nui-file-list', class extends HTMLElement {
	// Instance defaults, not connectedCallback setup: loadData/getFiles/removeFile
	// are public and must be callable before the element is in the document.
	_files = [];
	_options = { ...DEFAULT_OPTIONS };
	_rendered = false;

	connectedCallback() {
		// A DOM move re-connects the element; re-render from the retained data
		// rather than showing a list that lost its rows.
		if (this._rendered) render(this);
	}

	loadData(files, options = {}) {
		if (!Array.isArray(files)) {
			throw new TypeError('[NUI] <nui-file-list> loadData(files, options) — `files` must be an array.');
		}
		this._files = files.slice();
		this._options = { ...DEFAULT_OPTIONS, ...options };
		this._rendered = true;
		render(this);
		return this;
	}

	getFiles() {
		return this._files.slice();
	}

	addFiles(files) {
		if (!Array.isArray(files)) {
			throw new TypeError('[NUI] <nui-file-list> addFiles(files) — `files` must be an array.');
		}
		this._files = this._files.concat(files);
		render(this);
		return this;
	}

	removeFile(fileOrIndex) {
		const index = typeof fileOrIndex === 'number' ? fileOrIndex : this._files.indexOf(fileOrIndex);
		if (index < 0 || index >= this._files.length) return false;
		const [removed] = this._files.splice(index, 1);
		render(this);
		this.dispatchEvent(new CustomEvent('nui-file-removed', { bubbles: true, detail: { file: removed, index } }));
		return true;
	}

	clear() {
		this._files = [];
		if (this._rendered) render(this);
		return this;
	}
});

export default nui;
