// nui-json-grid — the grid view for a JSON/YAML document.
//
// The whole component is ONE recursive rule: the shape of a value decides how it
// renders. Four cases, keyed off Array.isArray and typeof, and nothing else.
//
//   scalar               → inline, coloured by type
//   array of scalars     → sub-table, index + value, no header
//   object               → sub-table, key + value, no header
//   array of objects     → sub-table WITH a header row
//
// Only the last case gets a header, because only there is the union of keys the
// actual information — an object's keys are already its left column, and an
// array of scalars has no keys at all.
//
// A value cell renders its own value, recursively, to any depth. There is no
// stringify-and-trap step and no "open" affordance: nesting is visible at a
// glance, and nothing in the document is out of reach from where you are.
//
// EVERY value cell carries its own JSON Pointer in data-path, however deeply it
// is nested. The DOM is therefore its own address book, and a click resolves to a
// path without the view having to re-derive one by walking back up the tree.
//
// The grid is a VIEW. It never mutates a structure — every edit goes through
// applyEdit(), the single writer, which owns the text. There is no setAt or
// insertAt call against live state anywhere in this file.
//
// Type colours reuse the existing .hl-* syntax classes rather than introducing a
// palette: the grid and the code view then read as the same document in the same
// vocabulary, and the theme gains no new surface.

import { openDocument, applyEdit, createHistory, coerceScalar, typeOf, toPointer, parsePointer, setAt } from './nui-json-model.js';

const el = (tag, className, text) => {
	const node = document.createElement(tag);
	if (className) node.className = className;
	if (text !== undefined) node.textContent = text;
	return node;
};

/** A value cell. The path goes on the CELL, so any leaf inside it is addressable. */
function valueCell(value, path, extraClass = '') {
	const cell = el('td', `jg-value ${extraClass}`.trim());
	cell.dataset.path = toPointer(path);
	cell.append(renderValue(value, path));
	return cell;
}

function renderScalar(value) {
	if (typeof value === 'string') {
		// The quotes are visible and they are the point: "2.4.0" must read as a
		// string and 4096 as a number at a glance. This is the whole argument for
		// a grid over a code view.
		return el('span', 'jg-scalar jg-string hl-string', JSON.stringify(value));
	}
	if (typeof value === 'number') return el('span', 'jg-scalar jg-number hl-number', String(value));
	if (typeof value === 'boolean') return el('span', 'jg-scalar jg-boolean hl-literal', String(value));
	// A null is a VISIBLE null. Rendering it as an empty cell would make it
	// indistinguishable from a key that is simply missing.
	return el('span', 'jg-scalar jg-null hl-literal', 'null');
}

/**
 * The shape rule. Returns a DOM node rendering one value, to any depth.
 * @param {*} value
 * @param {string[]} path where this value lives
 */
export function renderValue(value, path) {
	if (value === null || typeof value !== 'object') return renderScalar(value);
	if (Array.isArray(value)) return renderArray(value, path);
	return renderObject(value, path);
}

function renderArray(value, path) {
	if (value.length === 0) return el('span', 'jg-scalar jg-empty', '[]');

	// <thead> must precede <tbody>. Appending the header afterwards is invalid
	// markup, and the browser silently reorders it — which showed up as a header
	// row announced AFTER its own records in the accessibility tree.
	const withHeader = value.every(entry => typeOf(entry) === 'object');
	const table = el('table', 'jg-sub');
	const body = el('tbody');

	// The union of keys, in the order they first appear. Never sorted, and never
	// a union across the WHOLE document — only here, where the header is the
	// information rather than a repeat of the left column. Declared out here
	// because both the header and the rows need it.
	const columns = withHeader ? [] : null;
	if (columns) {
		for (const entry of value) {
			for (const key of Object.keys(entry)) if (!columns.includes(key)) columns.push(key);
		}
		const head = el('thead');
		const hr = el('tr');
		for (const key of columns) hr.append(el('th', 'jg-sub-key hl-prop', key));
		head.append(hr);
		table.append(head);
	}
	table.append(body);

	if (withHeader) {
		value.forEach((entry, rowIndex) => {
			const tr = el('tr');
			for (const key of columns) {
				// A key this record does not have renders as an EMPTY cell —
				// genuinely absent, which is different from a null.
				tr.append(Object.prototype.hasOwnProperty.call(entry, key)
					? valueCell(entry[key], [...path, String(rowIndex), key], 'jg-sub-value')
					: el('td', 'jg-value jg-sub-value jg-absent'));
			}
			body.append(tr);
		});
		return table;
	}

	// An array of anything else: index + value, no header. Each entry recurses,
	// so a list or map inside a list still shows its structure.
	value.forEach((entry, index) => {
		const tr = el('tr');
		tr.append(el('td', 'jg-sub-index', String(index)));
		tr.append(valueCell(entry, [...path, String(index)], 'jg-sub-value'));
		body.append(tr);
	});
	return table;
}

function renderObject(value, path) {
	const keys = Object.keys(value);
	if (keys.length === 0) return el('span', 'jg-scalar jg-empty', '{}');

	// An object: key + value, no header — the keys ARE the left column.
	const table = el('table', 'jg-sub');
	const body = el('tbody');
	for (const key of keys) {
		const tr = el('tr');
		tr.append(el('td', 'jg-sub-key hl-prop', key));
		tr.append(valueCell(value[key], [...path, key], 'jg-sub-value'));
		body.append(tr);
	}
	table.append(body);
	return table;
}

/** The root table: one row per entry, with the index, the key, and the value. */
export function renderRoot(structure) {
	const table = el('table', 'jg-root');
	const head = el('thead');
	const hr = el('tr');
	hr.append(el('th', 'jg-index', '#'), el('th', 'jg-key', 'key'), el('th', 'jg-value-head', 'value'));
	head.append(hr);
	table.append(head);

	const body = el('tbody');
	// Document order, always. The editor must not reorder a human's file.
	const entries = Array.isArray(structure)
		? structure.map((v, i) => [String(i), v])
		: Object.entries(structure);

	entries.forEach(([key, value], index) => {
		const tr = el('tr');
		tr.append(el('td', 'jg-index', String(index + 1)));
		tr.append(el('td', 'jg-key hl-prop', key));
		tr.append(valueCell(value, [key]));
		body.append(tr);
	});
	table.append(body);
	return table;
}

/**
 * Enhance a host element as a grid. The host is a CONTAINER, not a wrapper the
 * component owns — the same two-entry-point shape as nui-table-editor, so a host
 * that already controls an element can hand it over.
 *
 * @param {HTMLElement} host
 * @param {{text?: string, format?: string}} [options]
 */
export function setupJsonGrid(host, options = {}) {
	if (!host) throw new Error('setupJsonGrid needs a host element');
	if (host._jsonGrid) return host._jsonGrid;

	// The host may be a plain <div> or the custom element, so the stylesheet
	// keys off this class rather than off the tag name.
	host.classList.add('jg-host');

	const state = { doc: null, history: null, formatId: options.format || 'yaml', editing: null };

	function render() {
		state.editing = null;
		host.replaceChildren(renderRoot(state.doc.structure));
	}

	function announce(label, text, structure) {
		host.dispatchEvent(new CustomEvent('nui-change', {
			bubbles: true,
			detail: { text, structure, format: state.formatId, label },
		}));
	}

	/**
	 * Open a document. A document the reader only half-understood is refused here
	 * rather than rendered, and the refusal is a MESSAGE — the grid does not
	 * colour itself over it.
	 *
	 * Loading announces, like every other change. A host that mirrors the text
	 * would otherwise go stale the moment the format changed under it.
	 */
	function load(text, formatId = state.formatId) {
		let doc;
		try {
			doc = openDocument(text, formatId);
		} catch (e) {
			host.dataset.error = e.message;
			host.dispatchEvent(new CustomEvent('nui-error', { bubbles: true, detail: { message: e.message, label: 'load' } }));
			return { ok: false, reason: e.message };
		}
		state.doc = doc;
		state.history = createHistory(text);
		state.formatId = formatId;
		render();
		delete host.dataset.error;
		host.dataset.state = 'ok';
		announce('load', text, state.doc.structure);
		return { ok: true };
	}

	/**
	 * The only write path. A refused edit leaves the text and the view untouched
	 * and says why — a structural edit that cannot be represented must not
	 * half-apply, and must not look like it worked.
	 */
	function commit(label, mutate) {
		try {
			const next = applyEdit({ text: state.doc.text, formatId: state.formatId, mutate, label });
			state.doc = { text: next.text, structure: next.structure, format: next.format };
			state.history.push(next.text, label);
			render();
			announce(label, next.text, next.structure);
			return { ok: true };
		} catch (e) {
			host.dataset.error = e.message;
			host.dispatchEvent(new CustomEvent('nui-error', { bubbles: true, detail: { message: e.message, label } }));
			return { ok: false, reason: e.message };
		}
	}

	/** Edit a LEAF. A container is not a value — it has no text to edit. */
	function beginEdit(cell) {
		if (state.editing === cell) return;
		const path = parsePointer(cell.dataset.path || '');
		const current = readAt(state.doc.structure, path);
		if (current === null || typeof current === 'object') return;

		const input = el('input', 'jg-input');
		input.type = 'text';
		input.value = typeof current === 'string' ? current : String(current);
		input.setAttribute('aria-label', 'Value');
		state.editing = cell;
		cell.dataset.editing = 'true';
		cell.replaceChildren(input);
		input.focus();
		input.select();

		let done = false;
		const finish = (save) => {
			if (done) return;
			done = true;
			state.editing = null;
			if (!save) { render(); return; }
			// The format's own reader decides what the text means; the badge
			// displays the result rather than constraining it.
			const coerced = coerceScalar(input.value, state.formatId);
			if (!coerced.ok) {
				host.dataset.error = coerced.reason;
				render();
				return;
			}
			commit(`set ${cell.dataset.path}`, (draft) => setAt(draft, path, coerced.value));
		};
		input.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') { e.preventDefault(); finish(true); }
			if (e.key === 'Escape') { e.preventDefault(); finish(false); }
		});
		input.addEventListener('blur', () => finish(true));
	}

	function step(redo) {
		const back = redo ? state.history.redo() : state.history.undo();
		if (back === null) return;
		state.doc = openDocument(back, state.formatId);
		render();
		announce(redo ? 'redo' : 'undo', back, state.doc.structure);
	}

	host.addEventListener('click', (e) => {
		// A click on a NESTED leaf addresses that leaf, because every value cell
		// carries its own pointer.
		const leaf = e.target.closest('.jg-scalar');
		if (!leaf || leaf.classList.contains('jg-empty')) return;
		const cell = leaf.closest('td[data-path]');
		if (cell) beginEdit(cell);
	});

	host.addEventListener('keydown', (e) => {
		if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
			e.preventDefault();
			step(e.shiftKey);
		}
	});

	if (options.text !== undefined) load(options.text, state.formatId);

	host._jsonGrid = {
		load,
		commit,
		get text() { return state.doc?.text; },
		get structure() { return state.doc?.structure; },
		get format() { return state.formatId; },
		canUndo: () => !!state.history?.canUndo(),
		canRedo: () => !!state.history?.canRedo(),
		destroy() { host.replaceChildren(); host.classList.remove('jg-host'); host._jsonGrid = null; },
	};
	return host._jsonGrid;
}

function readAt(root, path) {
	let node = root;
	for (const token of path) {
		if (node === null || typeof node !== 'object') return undefined;
		node = node[Array.isArray(node) ? Number(token) : token];
	}
	return node;
}

class NuiJsonGrid extends HTMLElement {
	connectedCallback() {
		if (this.hasAttribute('data-initialized')) return;
		this.setAttribute('data-initialized', 'true');
		// The element IS the host: setupJsonGrid owns its children entirely.
		const seed = this.getAttribute('text') ?? this.textContent;
		this._grid = setupJsonGrid(this, { text: seed, format: this.getAttribute('format') || 'yaml' });
	}
	disconnectedCallback() { this._grid?.destroy(); this._grid = null; }
	get text() { return this._grid?.text; }
	get structure() { return this._grid?.structure; }
	load(text, format) { this._grid?.load(text, format); }
}

if (!customElements.get('nui-json-grid')) customElements.define('nui-json-grid', NuiJsonGrid);

export { NuiJsonGrid };
export default setupJsonGrid;
