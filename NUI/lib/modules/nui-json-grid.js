// nui-json-grid — a JSON/YAML document as blocks.
//
// ── The block model ──────────────────────────────────────────────────────
// Every value is a BLOCK. A block is either a leaf (a scalar) or a branch (an
// object, or a non-empty array), and a branch holds blocks. That is the whole
// model, and it is the same one the MD-Blocks editor uses, so the two editors
// think alike.
//
// ── Depth is a VIEW concern, never a data concern ────────────────────────
// This is the answer to deeply nested documents, and it is two verbs over one
// idea — a branch can be hidden, or promoted:
//
//   COLLAPSE  hide a branch's children; its head keeps a summary, so nothing
//             is lost, only deferred. Beyond `collapseDepth` a branch is
//             collapsed BY DEFAULT, so a forty-level document opens shallow and
//             readable instead of as a mile of nested boxes.
//   DRILL     promote a branch's children to the top level, with a breadcrumb
//             above. Getting fifteen levels down is then one click per level
//             and no scrolling, and the breadcrumb is how you come back.
//
// A document of any depth is therefore no harder to edit than a shallow one: the
// view only ever shows the levels you chose to show.
//
// ── Chrome is discreet, and it is a MESSAGE not a colour ────────────────
// nui-table-editor settled the rules and they are the same here: chrome appears
// on hover or selection rather than always (reading a document is a more common
// job than moving one); the accent is NOT a state colour; ring widths use
// --border-thickness, never a fixed px, because the browser quantises
// border-width to whole device pixels. Controls reserve their space and fade in,
// so revealing one never reflows the table.
//
// ── The grid is a VIEW ───────────────────────────────────────────────────
// It never mutates a structure. Every change goes through applyEdit(), the
// single writer, which owns the text. There is no setAt or insertAt call
// against live state in this file — only inside the `mutate` callbacks handed
// to commit(), which is where they belong.
//
// EVERY value cell carries its own JSON Pointer in data-path, at any depth, so
// the DOM is its own address book and a click resolves without walking back up.
//
// Type colours reuse the existing .hl-* syntax classes rather than introducing a
// palette: the grid and the code view read as the same document in the same
// vocabulary, and the theme gains no new surface.

import {
	openDocument, applyEdit, createHistory, coerceScalar, convertTo,
	typeOf, toPointer, parsePointer, setAt, insertAt, removeAt,
	inferNewKey, inferNewValueType, defaultValueFor,
} from './nui-json-model.js';

const el = (tag, className, text) => {
	const node = document.createElement(tag);
	if (className) node.className = className;
	if (text !== undefined) node.textContent = text;
	return node;
};

/** A branch is a container with something in it. An empty one is a leaf. */
function isBranch(value) {
	if (value === null || typeof value !== 'object') return false;
	return Array.isArray(value) ? value.length > 0 : Object.keys(value).length > 0;
}

/** What a collapsed branch says instead of showing its contents. */
function summaryOf(value) {
	const n = Array.isArray(value) ? value.length : Object.keys(value).length;
	const noun = Array.isArray(value) ? (n === 1 ? 'item' : 'items') : (n === 1 ? 'field' : 'fields');
	return `${n} ${noun}`;
}

/** The sample each type shows in the palette, rendered in its own colour. */
const TYPE_SAMPLES = {
	string: '"text"', number: '42', boolean: 'true', null: 'null', object: '{ … }', array: '[ … ]',
};
const TYPE_CLASS = {
	string: 'hl-string', number: 'hl-number', boolean: 'hl-literal',
	null: 'hl-literal', object: 'jg-empty', array: 'jg-empty',
};

let controlSeq = 0;

// ── Rendering ───────────────────────────────────────────────────────────

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

function control(label, className, title) {
	const button = el('button', `jg-ctl ${className}`.trim(), label);
	button.type = 'button';
	button.title = title;
	button.setAttribute('aria-label', title);
	return button;
}

/**
 * A branch's head: disclosure, summary, and the discreet controls.
 * @param {boolean} collapsed
 */
function branchHead(value, path, ctx, collapsed) {
	const head = el('div', 'jg-head');
	const pointer = toPointer(path);

	const caret = control(collapsed ? '▸' : '▾', 'jg-caret', `${collapsed ? 'Expand' : 'Collapse'} ${summaryOf(value)}`);
	caret.setAttribute('aria-expanded', String(!collapsed));
	caret.dataset.caret = pointer;
	head.append(caret);

	head.append(el('span', 'jg-summary', summaryOf(value)));

	// A branch's type is a CONTROL, not a label. A value added by one click
	// inherits its neighbour's type, and if that inherited type is the wrong one
	// there must be a way to change it — otherwise "add, then retype" has no
	// second half, and the inherited type is a lock rather than a default.
	const kind = Array.isArray(value) ? 'array' : 'object';
	const kindButton = control(kind, 'jg-type-chip jg-branch-kind', `Change type (currently ${kind})`);
	kindButton.dataset.type = pointer;
	head.append(kindButton);

	const add = control('+', 'jg-ctl-add', 'Add one more here — it takes the previous one\'s type');
	add.dataset.add = pointer;
	head.append(add);

	const menu = control('⋯', 'jg-ctl-menu', `Options for ${summaryOf(value)}`);
	menu.dataset.menu = pointer;
	head.append(menu);

	return head;
}

/** A leaf's controls: the type chip is how a type is CHANGED, not shown always. */
function leafHead(value, path) {
	const head = el('div', 'jg-head jg-head-leaf');
	const chip = control(typeOf(value), 'jg-type-chip', `Change type (currently ${typeOf(value)})`);
	chip.dataset.type = toPointer(path);
	head.append(chip);

	const menu = control('⋯', 'jg-ctl-menu', 'Options for this value');
	menu.dataset.menu = toPointer(path);
	head.append(menu);
	return head;
}

/** A leaf block: the value, and the quiet controls that act on it. */
function leafBlock(value, path) {
	const wrap = el('div', 'jg-leaf');
	wrap.append(renderScalar(value), leafHead(value, path));
	return wrap;
}

function isCollapsed(pointer, depth, ctx) {
	const explicit = ctx.collapsed.get(pointer);
	if (explicit !== undefined) return explicit;
	// Beyond the default depth a branch is closed until asked for.
	return depth >= ctx.collapseDepth;
}

/**
 * The shape rule. Returns a DOM node rendering one value, to any depth.
 *
 * `level` is the NESTING depth, threaded explicitly through the recursion. It
 * cannot come from the context, because the context's depth is the drill depth —
 * a different number entirely. Collapsing by the wrong one silently renders a
 * deep document at full height, which is the thing this exists to prevent.
 *
 * @param {*} value
 * @param {string[]} path
 * @param {{collapsed: Map<string,boolean>, collapseDepth: number}} ctx
 * @param {number} level
 */
export function renderValue(value, path, ctx, level = 0) {
	if (value === null || typeof value !== 'object') return leafBlock(value, path);
	if (Array.isArray(value)) return renderArray(value, path, ctx, level);
	return renderObject(value, path, ctx, level);
}

function valueCell(value, path, ctx, level, extraClass = '') {
	const cell = el('td', `jg-value ${extraClass}`.trim());
	cell.dataset.path = toPointer(path);
	cell.append(renderValue(value, path, ctx, level));
	return cell;
}

function renderArray(value, path, ctx, level) {
	if (value.length === 0) return emptyBlock('[]', path);

	const cell = el('div', 'jg-branch');
	const pointer = toPointer(path);
	const collapsed = isCollapsed(pointer, level, ctx);
	cell.append(branchHead(value, path, ctx, collapsed));
	cell.dataset.branch = pointer;
	if (collapsed) return cell;

	// <thead> must precede <tbody>; appending a header afterwards is invalid and
	// the browser silently reorders it, which shows up as a header announced
	// AFTER its own records in the accessibility tree.
	const withHeader = value.every(entry => typeOf(entry) === 'object');
	const table = el('table', 'jg-sub');
	const body = el('tbody');
	table.append(body);

	// The union of keys, in the order they first appear. Never sorted, and never
	// a union across the WHOLE document — only here, where the header is the
	// information rather than a repeat of the left column.
	const columns = withHeader ? [] : null;
	if (columns) {
		for (const entry of value) {
			for (const key of Object.keys(entry)) if (!columns.includes(key)) columns.push(key);
		}
		const head = el('thead');
		const hr = el('tr');
		for (const key of columns) hr.append(el('th', 'jg-sub-key hl-prop', key));
		head.append(hr);
		table.prepend(head);
	}

	if (columns) {
		value.forEach((entry, rowIndex) => {
			const tr = el('tr');
			for (const key of columns) {
				// A key this record does not have renders EMPTY — genuinely absent,
				// which is a different thing from a null.
				tr.append(Object.prototype.hasOwnProperty.call(entry, key)
					? valueCell(entry[key], [...path, String(rowIndex), key], ctx, level + 1, 'jg-sub-value')
					: el('td', 'jg-value jg-sub-value jg-absent'));
			}
			body.append(tr);
		});
	} else {
		// An array of anything else: index + value, no header. Each entry recurses,
		// so a list or map inside a list still shows its structure.
		value.forEach((entry, index) => {
			const tr = el('tr');
			tr.append(el('td', 'jg-sub-index', String(index)));
			tr.append(valueCell(entry, [...path, String(index)], ctx, level + 1, 'jg-sub-value'));
			body.append(tr);
		});
	}

	cell.append(table);

	// A trailing add for the same reason the root has one: adding twenty
	// properties should not mean scrolling back to a branch head twenty times.
	const addRow = el('tr', 'jg-add-row');
	const addCell = el('td', 'jg-sub-value');
	addCell.colSpan = value.every(e2 => typeOf(e2) === 'object') ? Math.max(1, columns.length) : 2;
	const addButton = control('+ Add one more', 'jg-ctl-add jg-ctl-add-row', 'Add one more at the end — it takes the previous one\'s type');
	addButton.dataset.add = pointer;
	addCell.append(addButton);
	addRow.append(addCell);
	body.append(addRow);

	return cell;
}

function renderObject(value, path, ctx, level) {
	const keys = Object.keys(value);
	if (keys.length === 0) return emptyBlock('{}', path);

	const cell = el('div', 'jg-branch');
	const pointer = toPointer(path);
	const collapsed = isCollapsed(pointer, level, ctx);
	cell.append(branchHead(value, path, ctx, collapsed));
	cell.dataset.branch = pointer;
	if (collapsed) return cell;

	// An object: key + value, no header — the keys ARE the left column.
	const table = el('table', 'jg-sub');
	const body = el('tbody');
	for (const key of keys) {
		const tr = el('tr');
		tr.append(el('td', 'jg-sub-key hl-prop', key));
		tr.append(valueCell(value[key], [...path, key], ctx, level + 1, 'jg-sub-value'));
		body.append(tr);
	}

	const addRow = el('tr', 'jg-add-row');
	const addCell = el('td', 'jg-sub-value');
	addCell.colSpan = 2;
	const addButton = control('+ Add one more', 'jg-ctl-add jg-ctl-add-row', 'Add one more at the end — it takes the previous one\'s type');
	addButton.dataset.add = pointer;
	addCell.append(addButton);
	addRow.append(addCell);
	body.append(addRow);

	table.append(body);
	cell.append(table);
	return cell;
}

/**
 * An empty container is still editable — you have to be able to fill it.
 *
 * This is also where a freshly ADDED property lands when it inherits an object
 * type, so it carries the same type control as any other value: add by one
 * click, and if the inherited type is wrong, change it by one click.
 */
function emptyBlock(text, path) {
	const pointer = toPointer(path);
	const kind = text === '[]' ? 'array' : 'object';
	const wrap = el('div', 'jg-branch jg-branch-empty');
	wrap.dataset.branch = pointer;

	const badge = el('button', 'jg-scalar jg-empty jg-addable', text);
	badge.setAttribute('aria-label', `Add a value to this ${kind}`);
	wrap.append(badge);

	const kindButton = control(kind, 'jg-type-chip jg-branch-kind', `Change type (currently ${kind})`);
	kindButton.dataset.type = pointer;
	wrap.append(kindButton);

	const add = control('+', 'jg-ctl-add', 'Add one more here — it takes the previous one\'s type');
	add.dataset.add = pointer;
	wrap.append(add);

	return wrap;
}

/**
 * The root table: one row per entry, with the index, the key, and the value.
 * `ctx.focus` is the drill path — when set, the table shows that branch alone.
 */
export function renderRoot(structure, ctx, focus = []) {
	const shown = focus.length ? readAt(structure, focus) : structure;
	const basePath = focus;

	const table = el('table', 'jg-root');
	const head = el('thead');
	const hr = el('tr');
	hr.append(el('th', 'jg-index', '#'), el('th', 'jg-key', 'key'), el('th', 'jg-value-head', 'value'));
	head.append(hr);
	table.append(head);

	const body = el('tbody');
	// Document order, always. The editor must not reorder a human's file.
	const entries = Array.isArray(shown)
		? shown.map((v, i) => [String(i), v])
		: Object.entries(shown);

	entries.forEach(([key, value], index) => {
		const path = [...basePath, key];
		const tr = el('tr');
		tr.dataset.row = toPointer(path);
		tr.append(el('td', 'jg-index', String(index + 1)));
		tr.append(el('td', 'jg-key hl-prop', key));

		const cell = el('td', 'jg-value');
		cell.dataset.path = toPointer(path);
		// A drilled focus is the top level, so its children start at 0 — depth is
		// counted from what you are looking at, not from the document root.
		cell.append(renderValue(value, path, ctx, 0));
		tr.append(cell);
		body.append(tr);
	});

	table.append(body);

	// The root is the one container with no head, so it would otherwise have no
	// way to add at all. The add lives at the END of the list, because that is
	// where a new item belongs and where the eye already is.
	const addRow = el('tr', 'jg-add-row');
	const addCell = el('td');
	addCell.colSpan = 3;
	const addButton = control('+ Add one more', 'jg-ctl-add jg-ctl-add-row', 'Add one more at the end — it takes the previous one\'s type');
	addButton.dataset.add = toPointer(basePath);
	addCell.append(addButton);
	addRow.append(addCell);
	body.append(addRow);

	return table;
}

/** The breadcrumb shown when a branch has been drilled into. */
function renderBreadcrumb(structure, focus) {
	const bar = el('nav', 'jg-crumbs');
	bar.setAttribute('aria-label', 'Location');

	const rootBtn = control('document', 'jg-crumb', 'Back to the whole document');
	rootBtn.dataset.crumb = '';
	bar.append(rootBtn);

	focus.forEach((token, depth) => {
		bar.append(el('span', 'jg-crumb-sep', '/'));
		const at = focus.slice(0, depth + 1);
		const value = readAt(structure, at);
		const btn = control(token, 'jg-crumb', `Back to ${toPointer(at)}`);
		btn.dataset.crumb = toPointer(at);
		bar.append(btn);
		if (isBranch(value)) bar.append(el('span', 'jg-crumb-kind', Array.isArray(value) ? 'array' : 'object'));
	});
	return bar;
}

function readAt(root, path) {
	let node = root;
	for (const token of path) {
		if (node === null || typeof node !== 'object') return undefined;
		node = node[Array.isArray(node) ? Number(token) : token];
	}
	return node;
}

// ── The controller ──────────────────────────────────────────────────────

/**
 * Enhance a host element as a grid. The host is a CONTAINER, not a wrapper the
 * component owns — the same two-entry-point shape as nui-table-editor, so a host
 * that already controls an element can hand it over.
 *
 * @param {HTMLElement} host
 * @param {{text?: string, format?: string, collapseDepth?: number}} [options]
 */
export function setupJsonGrid(host, options = {}) {
	if (!host) throw new Error('setupJsonGrid needs a host element');
	if (host._jsonGrid) return host._jsonGrid;

	// The host may be a plain <div> or the custom element, so the stylesheet
	// keys off this class rather than off the tag name.
	host.classList.add('jg-host');

	const state = {
		doc: null,
		history: null,
		formatId: options.format || 'yaml',
		editing: null,
		focus: [],
		// Tri-state per pointer: absent means "follow the depth default", which is
		// what lets a deep document open shallow without losing the user's choices.
		collapsed: new Map(),
		collapseDepth: options.collapseDepth ?? 3,
		panel: null,
	};

	function ctx() {
		return { collapsed: state.collapsed, collapseDepth: state.collapseDepth };
	}

	function render() {
		state.editing = null;
		closePanel();
		const children = [];
		if (state.focus.length) children.push(renderBreadcrumb(state.doc.structure, state.focus));
		children.push(renderRoot(state.doc.structure, ctx(), state.focus));
		host.replaceChildren(...children);
	}

	function announce(label, text, structure) {
		host.dispatchEvent(new CustomEvent('nui-change', {
			bubbles: true,
			detail: { text, structure, format: state.formatId, label },
		}));
	}

	/**
	 * Open a document. A document the reader only half-understood is refused here
	 * rather than rendered. Loading announces, like every other change — a host
	 * that mirrors the text would otherwise go stale when the format changed.
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
		state.focus = [];
		state.collapsed.clear();
		render();
		delete host.dataset.error;
		host.dataset.state = 'ok';
		announce('load', text, state.doc.structure);
		return { ok: true };
	}

	/**
	 * The ONLY write path. A refused edit leaves the text and the view untouched
	 * and says why — a structural edit that cannot be represented must not
	 * half-apply, and must not look like it worked.
	 */
	function commit(label, mutate) {
		try {
			const next = applyEdit({ text: state.doc.text, formatId: state.formatId, mutate, label });
			state.doc = { text: next.text, structure: next.structure, format: next.format };
			state.history.push(next.text, label);
			// The pointer may have moved (a delete shifts array indices), so drop
			// any collapse decision about something that no longer exists rather
			// than leaving a stale entry to answer for a path that means nothing.
			pruneCollapsed();
			render();
			announce(label, next.text, next.structure);
			return { ok: true };
		} catch (e) {
			host.dataset.error = e.message;
			host.dispatchEvent(new CustomEvent('nui-error', { bubbles: true, detail: { message: e.message, label } }));
			return { ok: false, reason: e.message };
		}
	}

	function pruneCollapsed() {
		for (const pointer of [...state.collapsed.keys()]) {
			if (!hasPointer(state.doc.structure, parsePointer(pointer))) state.collapsed.delete(pointer);
		}
	}

	function hasPointer(root, path) {
		let node = root;
		for (const token of path) {
			if (node === null || typeof node !== 'object') return false;
			if (!Object.prototype.hasOwnProperty.call(node, Array.isArray(node) ? Number(token) : token)) return false;
			node = node[Array.isArray(node) ? Number(token) : token];
		}
		return true;
	}

	// ── Transient panels ───────────────────────────────────────────────
	// nui-popover wires `popovertarget` on the trigger at connect time, so a
	// single long-lived panel CANNOT follow a moving trigger. Each panel is
	// therefore created for one invocation and removed on close — which keeps
	// everything the component gives for free: light dismiss, Escape, focus
	// return, anchor positioning, and auto-dismiss when the trigger scrolls out.

	function closePanel() {
		if (!state.panel) return;
		state.panel.remove();
		state.panel = null;
	}

	function openPanel(trigger, label, build, event) {
		closePanel();
		const panel = el('nui-popover');
		panel.setAttribute('aria-label', label);
		trigger.id = `jg-trigger-${++controlSeq}`;
		panel.setAttribute('for', trigger.id);
		build(panel);
		trigger.after(panel);
		panel.addEventListener('nui-popover-close', () => {
			if (state.panel === panel) state.panel = null;
			panel.remove();
		}, { once: true });
		state.panel = panel;

		// Inserting the panel gives the trigger `popovertarget`, and the browser's
		// popover ACTIVATION behaviour then runs for this very click and toggles
		// the popover. So a click that opened the panel must not also call
		// show(), or the two fight and it opens and vanishes in the same frame.
		// stopPropagation cannot prevent that — activation is not propagation.
		// Only a programmatic open needs show().
		if (!event) panel.show();
		return panel;
	}

	function typePalette(onPick, current) {
		const grid = el('div', 'jg-types');
		grid.setAttribute('role', 'radiogroup');
		grid.setAttribute('aria-label', 'Type');
		for (const type of ['string', 'number', 'boolean', 'null', 'object', 'array']) {
			const option = el('button', 'jg-type');
			option.type = 'button';
			option.setAttribute('role', 'radio');
			option.setAttribute('aria-checked', String(type === current));
			if (type === current) option.dataset.current = '';
			option.append(el('span', 'jg-type-name', type));
			const sample = el('span', `jg-type-sample ${TYPE_CLASS[type]}`, TYPE_SAMPLES[type]);
			option.append(sample);
			option.addEventListener('click', () => onPick(type));
			grid.append(option);
		}
		return grid;
	}

	/**
	 * ADD is ONE CLICK and inherits the previous sibling's type. A dialog per add
	 * is a dialog per row, and adding twenty properties is the case that matters.
	 * Change the type afterwards, from the chip, when you have seen where the
	 * series is going.
	 */
	function addSibling(pointer) {
		const path = parsePointer(pointer);
		const container = readAt(state.doc.structure, path);
		if (container === null || typeof container !== 'object') return { ok: false, reason: 'That is a value, not something to add to' };

		if (Array.isArray(container)) {
			const type = inferNewValueType(container);
			return commit(`add ${type}`, (draft) => insertAt(draft, [...path, String(container.length)], defaultValueFor(type)));
		}
		const name = inferNewKey(Object.keys(container));
		const type = inferNewValueType(container);
		const result = commit(`add ${name}`, (draft) => insertAt(draft, [...path, name], defaultValueFor(type)));
		if (result.ok) focusPath([...path, name]);
		return result;
	}

	/** Put the caret in a value we just created, so typing replaces it at once. */
	function focusPath(path) {
		const pointer = toPointer(path);
		const cell = host.querySelector(`td[data-path="${CSS.escape(pointer)}"]`);
		const leaf = cell?.querySelector('.jg-scalar');
		if (leaf) beginEdit(cell);
	}

	/**
	 * CHANGE TYPE, and only change type. The blocks editor made the palette the
	 * only place a type is chosen; here creation is a one-click inherit and this
	 * panel is where a type is corrected afterwards — the same single decision,
	 * asked once rather than twice.
	 *
	 * A conversion that would DISCARD is refused with the reason and the panel
	 * stays open. An EMPTY container is not refused: it holds nothing, and the
	 * add-then-retype flow depends on being able to change an inherited type.
	 */
	function openTypePanel(trigger, { path }, event) {
		const target = parsePointer(path);
		const current = typeOf(readAt(state.doc.structure, target));
		const before = readAt(state.doc.structure, target);

		openPanel(trigger, 'Change type', (panel) => {
			panel.append(el('p', 'jg-hint', `${current} → …`));
			panel.append(typePalette((type) => {
				if (type === current) { closePanel(); return; }
				const verdict = convertForEdit(before, type);
				if (!verdict.ok) { say(verdict.reason, true); return; }
				const result = commit(`type ${current} → ${type}`, (draft) => setAt(draft, target, verdict.value));
				if (result.ok) closePanel();
			}, current));
		}, event);
	}

	function parentAt(root, path) {
		let node = root;
		for (let i = 0; i < path.length - 1; i++) {
			node = node[Array.isArray(node) ? Number(path[i]) : path[i]];
		}
		return path.length ? node : root;
	}

	// convertTo lives in the model; the only thing added here is the creation
	// case (null → a fresh empty container), which is not a conversion.
	function convertForEdit(value, target) {
		if (value === null) {
			return { ok: true, value: target === 'object' ? {} : target === 'array' ? [] : target === 'string' ? '' : target === 'number' ? 0 : target === 'boolean' ? false : null };
		}
		return convertTo(value, target);
	}

	function openMenuPanel(trigger, pointer, event) {
		const path = parsePointer(pointer);
		const value = readAt(state.doc.structure, path);
		openPanel(trigger, 'Value options', (panel) => {
			const list = el('div', 'jg-menu');
			const item = (label, run, danger = false) => {
				const button = el('button', `jg-menu-item${danger ? ' jg-menu-danger' : ''}`, label);
				button.type = 'button';
				button.addEventListener('click', () => { run(); closePanel(); });
				list.append(button);
				return button;
			};
			if (isBranch(value)) item('Open on its own', () => drillTo(pointer));
			if (typeOf(value) !== 'array') item('Duplicate', () => {
				const parent = parentAt(state.doc.structure, path);
				const at = Array.isArray(parent) ? Number(path[path.length - 1]) + 1 : path[path.length - 1];
				commit('duplicate', (draft) => insertAt(draft, [...path.slice(0, -1), String(at)], value));
			});
			item('Copy path', async () => {
				try { await navigator.clipboard.writeText(pointer); say(`Copied ${pointer}`); }
				catch { say('The browser would not give the clipboard. The path is ' + pointer, true); }
			});
			item('Delete', () => commit('delete', (draft) => removeAt(draft, path)), true);
			panel.append(list);
		}, event);
	}

	function drillTo(pointer) {
		state.focus = parsePointer(pointer);
		// Collapse decisions are keyed by ABSOLUTE pointer, so they stay true
		// after a drill. Clearing them here would throw away exactly the
		// knowledge that made drilling cheap.
		render();
	}

	// ── Cell editing ──────────────────────────────────────────────────

	/**
	 * Edit a LEAF. A container is not a value — it has no text to edit.
	 *
	 * The editor is a CONTENTEDITABLE SPAN, not an <input>, and that is the whole
	 * trick. An input renders its text with its own internal metrics, so swapping
	 * one in moved the text ~1.8px even with the box centred perfectly — a
	 * residual that `line-height: normal` did not move either. A contenteditable
	 * span is the same element the value already was, with the same font and the
	 * same line box, so the text cannot move at all: there is nothing to align.
	 *
	 * It also removes two fights outright rather than by workaround. The theme
	 * imposes global control floors (inputs get a 40px min-height, buttons 32px),
	 * which made the edited row 8px taller; and an input's intrinsic width is
	 * the column's min-content width, which made the table reflow. A
	 * contenteditable span has neither. nui-table-editor makes its cells
	 * contenteditable for the same reasons.
	 */
	function beginEdit(cell) {
		const path = parsePointer(cell.dataset.path || '');
		if (state.editing?.dataset.path === cell.dataset.path) return;
		const current = readAt(state.doc.structure, path);
		if (current === null || typeof current === 'object') return;
		closePanel();

		// An editor open elsewhere is COMMITTED, not abandoned. The deferred blur
		// commit would otherwise stand down — `state.editing` has already moved
		// on — and silently discard the edit in progress.
		//
		// This commits, which re-renders and replaces every node in the grid. So
		// the cell is re-resolved from the live DOM afterwards rather than carried
		// through: the one handed in is detached by then, and building an editor
		// inside a detached cell produces something that is never shown.
		if (state.editing?._jgFinish) state.editing._jgFinish(true);
		state.editing = null;
		const target = host.querySelector(`td[data-path="${CSS.escape(toPointer(path))}"]`);
		if (!target) return;
		cell = target;

		const editor = el('span', 'jg-scalar jg-editor');
		editor.textContent = typeof current === 'string' ? current : String(current);
		editor.setAttribute('contenteditable', 'plaintext-only');
		editor.setAttribute('spellcheck', 'false');
		editor.setAttribute('role', 'textbox');
		editor.setAttribute('aria-label', 'Value');
		// Not a tab stop: Tab is the gesture that commits, and an editable field
		// in the tab order would make every cell two stops.
		editor.tabIndex = -1;
		state.editing = cell;
		cell.dataset.editing = 'true';

		// Swap ONLY the value, never the cell's children. Replacing the children
		// also destroyed this value's own type chip and options menu, so editing a
		// value made it impossible to change its type — the two concerns are
		// different, and neither should destroy the other.
		const display = cell.querySelector('.jg-scalar');
		if (display) display.replaceWith(editor);
		else cell.replaceChildren(editor);
		editor.focus();

		const range = document.createRange();
		range.selectNodeContents(editor);
		const selection = getSelection();
		selection.removeAllRanges();
		selection.addRange(range);

		let done = false;
		const finish = (save) => {
			if (done) return;
			done = true;
			cell._jgFinish = null;
			state.editing = null;
			if (!save) { render(); return; }
			// The format's own reader decides what the text means; the badge
			// displays the result rather than constraining it.
			const coerced = coerceScalar(editor.textContent.replace(/\s*\n+\s*/g, ' '), state.formatId);
			if (!coerced.ok) { host.dataset.error = coerced.reason; render(); say(coerced.reason, true); return; }
			commit(`set ${cell.dataset.path}`, (draft) => setAt(draft, path, coerced.value));
		};
		// Clicking straight from one cell to another blurs this editor, and the
		// deferred blur commit below would stand down because `state.editing` has
		// already moved on — silently DISCARDING the edit in progress. The next
		// editor commits the previous one before it opens.
		cell._jgFinish = finish;
		editor.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') { e.preventDefault(); finish(true); }
			if (e.key === 'Escape') { e.preventDefault(); finish(false); }
		});
		// A scalar is one line of one cell, so a pasted multi-line value is folded
		// rather than allowed to reflow the row.
		editor.addEventListener('paste', (e) => {
			e.preventDefault();
			const text = (e.clipboardData?.getData('text/plain') || '').replace(/\s*\n+\s*/g, ' ');
			document.execCommand('insertText', false, text);
		});
		editor.addEventListener('blur', () => {
			// Commit on the NEXT task, not on blur. A control clicked in the same
			// gesture — the type chip, the options menu — also blurs this editor,
			// and committing immediately would rebuild the grid and remove the very
			// control the user is about to click. The deferred check finds the cell
			// no longer being edited (the control's own action re-rendered it) and
			// stands down instead of committing a stale cell.
			setTimeout(() => { if (state.editing === cell) finish(true); }, 0);
		});
	}

	function step(redo) {
		const back = redo ? state.history.redo() : state.history.undo();
		if (back === null) return false;
		state.doc = openDocument(back, state.formatId);
		pruneCollapsed();
		render();
		announce(redo ? 'redo' : 'undo', back, state.doc.structure);
		return true;
	}

	function say(message, isError = false) {
		host.dispatchEvent(new CustomEvent(isError ? 'nui-say-error' : 'nui-say', { bubbles: true, detail: { message } }));
	}

	// ── Events ────────────────────────────────────────────────────────

	host.addEventListener('click', (e) => {
		const caret = e.target.closest('[data-caret]');
		if (caret) {
			const pointer = caret.dataset.caret;
			const path = parsePointer(pointer);
			// Depth is absolute minus the drill offset, so the default still means
			// the same thing after drilling into a deep branch.
			const now = isCollapsed(pointer, path.length - state.focus.length, ctx());
			state.collapsed.set(pointer, !now);
			render();
			return;
		}
		const crumb = e.target.closest('[data-crumb]');
		if (crumb) { drillTo(crumb.dataset.crumb); return; }

		const typeChip = e.target.closest('[data-type]');
		if (typeChip) { openTypePanel(typeChip, { path: typeChip.dataset.type }, e); return; }

		const add = e.target.closest('[data-add]');
		if (add) { addSibling(add.dataset.add); return; }

		// The empty-container badge is itself the add target: `{}` is a button.
		const addable = e.target.closest('.jg-addable');
		if (addable) {
			const cell = addable.closest('[data-branch]');
			if (cell) addSibling(cell.dataset.branch);
			return;
		}

		const menu = e.target.closest('[data-menu]');
		if (menu) { openMenuPanel(menu, menu.dataset.menu, e); return; }

		// The whole value cell is the target, not just the text in it. A short
		// value is a few characters in a cell three hundred wide, and requiring a
		// pixel-perfect hit on the characters is a target nobody can hit. The
		// cell's own controls and add affordances are matched above and return
		// first, so they keep their own clicks.
		const leafCell = e.target.closest('td[data-path]:has(> .jg-leaf)');
		if (leafCell) { beginEdit(leafCell); return; }
	});

	host.addEventListener('keydown', (e) => {
		// Ctrl+Z while a cell is being typed into belongs to the text field, not to
		// the document. Undoing the document out from under an open editor is the
		// kind of surprise that loses work.
		if (e.target instanceof HTMLInputElement) return;
		if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
			e.preventDefault();
			step(e.shiftKey);
		}
	});

	if (options.text !== undefined) load(options.text, state.formatId);

	host._jsonGrid = {
		load,
		commit,
		say,
		addSibling,
		get text() { return state.doc?.text; },
		get structure() { return state.doc?.structure; },
		get format() { return state.formatId; },
		get focus() { return [...state.focus]; },
		canUndo: () => !!state.history?.canUndo(),
		canRedo: () => !!state.history?.canRedo(),
		destroy() {
			closePanel();
			host.replaceChildren();
			host.classList.remove('jg-host');
			host._jsonGrid = null;
		},
	};
	return host._jsonGrid;
}

class NuiJsonGrid extends HTMLElement {
	connectedCallback() {
		if (this.hasAttribute('data-initialized')) return;
		this.setAttribute('data-initialized', 'true');
		const seed = this.getAttribute('text') ?? this.textContent;
		this._grid = setupJsonGrid(this, {
			text: seed,
			format: this.getAttribute('format') || 'yaml',
			collapseDepth: Number(this.getAttribute('collapse-depth')) || undefined,
		});
	}
	disconnectedCallback() { this._grid?.destroy(); this._grid = null; }
	get text() { return this._grid?.text; }
	get structure() { return this._grid?.structure; }
	load(text, format) { this._grid?.load(text, format); }
}

if (!customElements.get('nui-json-grid')) customElements.define('nui-json-grid', NuiJsonGrid);

export { NuiJsonGrid };
export default setupJsonGrid;
