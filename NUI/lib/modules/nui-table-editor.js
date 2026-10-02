import { nui } from '../../nui.js';

/**
 * nui-table-editor — progressive enhancement for a native <table>. The table IS
 * the model: no shadow copy of the data, no wrapper element, so a host can
 * enhance a table in place and still serialize its own HTML cleanly.
 *
 * setupTableEditor(table, options) -> { destroy, refresh, exportMarkdown }
 * <nui-table-editor><table>…</table></nui-table-editor>
 *
 * Undo is host-owned: the component emits `nui-change` (detail.type: content |
 * structure | align | header | reorder) and hosts snapshot. Design rationale and
 * the traps behind each invariant: docs/table-editor-decisions.md
 */

// ── Markup helpers ────────────────────────────────────────────────────────────

const ICON_ADD = 'add';
const ICON_DRAG = 'drag_indicator';
const ICON_CLOSE = 'close';
const ICON_COPY = 'content_copy';

function el(tag, className, attrs) {
	const node = document.createElement(tag);
	if (className) node.className = className;
	if (attrs) for (const [k, v] of Object.entries(attrs)) {
		// textContent is a DOM property, not an attribute: setAttribute('textContent')
		// writes a dead attribute and the element stays empty.
		if (k === 'textContent') node.textContent = v;
		else node.setAttribute(k, v);
	}
	return node;
}

function icon(name) {
	const i = el('nui-icon');
	i.setAttribute('name', name);
	return i;
}

// ── Table geometry ────────────────────────────────────────────────────────────

/** Row elements of the body, header row excluded. */
function bodyRows(table) {
	return Array.from(table.tBodies[0]?.rows || []);
}

/** The header row element, whether it lives in <thead> or as row 0 of the body. */
function headerRowEl(table) {
	return table.tHead?.rows[0] || table.tBodies[0]?.rows[0] || null;
}

/** Header row (when present) then the body rows — the shape most operations walk. */
function rowsOf(table) {
	return [table.tHead?.rows[0], ...bodyRows(table)].filter(Boolean);
}

function hasHeader(table) {
	return !!table.tHead?.rows[0];
}

function colCount(table) {
	return rowsOf(table).reduce((max, tr) => Math.max(max, tr.cells.length), 0);
}

function cellAt(table, r, c) {
	const tr = r === -1 ? headerRowEl(table) : bodyRows(table)[r];
	return tr ? tr.cells[c] || null : null;
}

function cellText(cell) {
	if (!cell) return '';
	// Cell content is single-line by contract: block newlines to a space so the
	// DOM and the GFM export never disagree.
	return (cell.textContent || '').replace(/\s*\n+\s*/g, ' ').trim();
}

function clearCell(cell) {
	// A <br> is the only reliably-editable empty state in a contenteditable cell;
	// an empty textContent leaves the cell with no caret anchor in some browsers.
	cell.textContent = '';
	const br = el('br');
	cell.appendChild(br);
}

function setCellText(cell, text) {
	cell.textContent = '';
	if (text) cell.appendChild(document.createTextNode(text));
	else cell.appendChild(el('br'));
}

function makeCell(tag, text) {
	const cell = el(tag, null, { 'data-align': 'left' });
	setCellText(cell, text ?? '');
	return cell;
}

/** Structural clone of a row, minus selection/active residue. */
function cloneRow(template, cells) {
	const tr = el('tr');
	const source = template ? template.cells : [];
	for (let c = 0; c < cells; c++) {
		const src = source[c];
		const td = el('td', null, { 'data-align': src?.getAttribute('data-align') || 'left' });
		setCellText(td, '');
		tr.appendChild(td);
	}
	return tr;
}

// ── GFM pipe-table serialization ──────────────────────────────────────────────

const ALIGN_DELIM = { left: ':---', center: ':---:', right: '---:', none: '---' };

function escapeCell(text) {
	return text.replace(/\|/g, '\\|');
}

/**
 * Serialize to a GitHub Flavored Markdown pipe table.
 *
 * GFM has exactly one header row; a table without <thead> is emitted with an empty
 * header so the output stays valid and round-trips. Alignment is per column and
 * lives in the delimiter row.
 */
function exportMarkdown(table) {
	const cols = colCount(table);
	if (cols === 0) return '';
	const head = hasHeader(table) ? Array.from(table.tHead.rows[0].cells) : [];
	const pad = (arr) => Array.from({ length: cols }, (_, i) => (arr[i] ? cellText(arr[i]) : ''));
	const headCells = pad(head);
	const lines = [
		`| ${headCells.map(escapeCell).join(' | ')} |`,
		`| ${headCells.map((_, c) => ALIGN_DELIM[cellAt(table, -1, c)?.getAttribute('data-align') || 'left'] || ALIGN_DELIM.left).join(' | ')} |`
	];
	for (const tr of bodyRows(table)) {
		lines.push(`| ${pad(tr.cells).map(escapeCell).join(' | ')} |`);
	}
	return lines.join('\n');
}

// ── The editor ────────────────────────────────────────────────────────────────

function setupTableEditor(table, options = {}) {
	if (!table) throw new Error('nui-table-editor: setupTableEditor requires a <table> element.');
	if (table._nuiTableEditor) return table._nuiTableEditor;

	const host = table.closest('[contenteditable="true"]');
	// Inside a contenteditable ancestor the host owns editability: we add UI only
	// and never touch contenteditable, never hijack keys the host needs.
	const hostOwned = !!host;
	const editable = options.editable !== false && !hostOwned;

	const parent = options.chromeHost || table.parentElement;
	// The stylesheet's in-place selectors key off this marker, so an enhanced table
	// is styled the same whether it is slotted in <nui-table-editor> or enhanced
	// inside someone else's document.
	table.setAttribute('data-nui-table-editor', '');
	// NOT aria-hidden: this carries the real toolbar and the edge buttons, which
	// must stay keyboard-reachable. The zone hides itself via opacity/visibility.
	const overlay = el('div', 'nte-overlay');
	const zone = el('div', 'nte-zone', { role: 'toolbar', 'aria-label': 'Table controls' });
	overlay.appendChild(zone);
	const colGrips = el('div', 'nte-col-grips');
	const rowGrips = el('div', 'nte-row-grips');
	const dropRowLine = el('div', 'nte-drop-line nte-drop-line-row');
	const dropColLine = el('div', 'nte-drop-line nte-drop-line-col');
	overlay.append(colGrips, rowGrips, dropRowLine, dropColLine);
	parent.appendChild(overlay);

	const hadPosition = parent.style.position;
	const positionWasSet = hadPosition === '' && getComputedStyle(parent).position === 'static';
	if (positionWasSet) parent.style.position = 'relative';

	// ── Selection ──────────────────────────────────────────────────────────────
	//
	// ONE range is the whole model: { minRow, maxRow, minCol, maxCol }, where row
	// -1 is the header row. A single cell, a full row, a full column and a
	// rectangle are all just ranges with equal bounds, so click, shift-click,
	// drag-across and grip all land in the same place.

	let range = null;
	let activeCell = null;
	// The anchor/extent of a pointer drag across cells, and whether the drag has
	// actually crossed a cell boundary yet.
	let gesture = null;
	// Set when a range gesture ends, consumed by the next click. See endGesture().
	let suppressNextClick = false;
	// focusin is a FocusEvent and carries NO shiftKey, yet it fires before click
	// when a cell is clicked. Shift is tracked from the real keyboard events.
	let shiftHeld = false;
	let contentTimer = null;
	let destroyed = false;
	const listeners = [];

	function on(target, type, handler, opts) {
		target.addEventListener(type, handler, opts);
		listeners.push([target, type, handler, opts]);
	}

	function emit(type, detail = {}) {
		if (destroyed) return;
		table.dispatchEvent(new CustomEvent('nui-change', {
			bubbles: true,
			composed: true,
			detail: { type, ...detail }
		}));
	}

	// ── Content changes: debounced, because typing is continuous ───────────────
	function emitContent() {
		clearTimeout(contentTimer);
		contentTimer = setTimeout(() => emit('content', { cell: activeCell }), 300);
	}

	function coordsOf(cell) {
		if (hasHeader(table) && cell.closest('thead')) return [-1, cell.cellIndex];
		const tr = cell.closest('tr');
		return [bodyRows(table).indexOf(tr), cell.cellIndex];
	}

	function cellFromPoint(x, y) {
		// The overlay sits on top of the table, so elementFromPoint returns chrome
		// and never a cell. Hit-test the table's own geometry instead.
		for (const tr of rowsOf(table)) {
			const rowRect = tr.getBoundingClientRect();
			if (y < rowRect.top || y > rowRect.bottom) continue;
			for (const cell of tr.cells) {
				const r = cell.getBoundingClientRect();
				if (x >= r.left && x <= r.right) return cell;
			}
			return null;
		}
		return null;
	}

	function normalise(a, b) {
		return {
			minRow: Math.min(a[0], b[0]), maxRow: Math.max(a[0], b[0]),
			minCol: Math.min(a[1], b[1]), maxCol: Math.max(a[1], b[1])
		};
	}

	function applyRange(r) {
		range = r;
		table.querySelectorAll('[data-selected]').forEach(c => c.removeAttribute('data-selected'));
		activeCell?.removeAttribute('data-active');

		if (!r) {
			activeCell = null;
			// Grips and delete controls are BUILT from the range, so clearing must
			// rebuild them or they stay on screen over an unselected table.
			buildGrips();
			updateZone();
			return;
		}

		// One rows array for the whole rectangle; cellAt() would rebuild it per cell.
		const rows = rowsOf(table);
		const rowBase = hasHeader(table) ? 1 : 0;
		for (let row = r.minRow; row <= r.maxRow; row++) {
			const tr = rows[row + rowBase];
			if (!tr) continue;
			for (let col = r.minCol; col <= r.maxCol; col++) {
				tr.cells[col]?.setAttribute('data-selected', '');
			}
		}

		// A grip is shown for each contiguous BAND of fully covered rows, likewise
		// for columns: one grip spanning the band, so it cannot claim more than the
		// selection holds. BUILT from the range rather than toggled, because
		// position() rebuilds on every measure and would wipe a toggled class.
		buildGrips();

		activeCell = cellAt(table, r.minRow, r.minCol) || null;
		activeCell?.setAttribute('data-active', '');
		updateZone();
	}

	function clearSelection() {
		applyRange(null);
	}

	/** Clamp a range inside the table; a structural change can leave it past the end. */
	function clampRange(r) {
		const lastRow = bodyRows(table).length - 1;
		const lastCol = colCount(table) - 1;
		const firstRow = hasHeader(table) ? -1 : 0;
		const minRow = Math.min(Math.max(r.minRow, firstRow), lastRow);
		const maxRow = Math.min(Math.max(r.maxRow, minRow), lastRow);
		const minCol = Math.min(Math.max(r.minCol, 0), lastCol);
		const maxCol = Math.min(Math.max(r.maxCol, minCol), lastCol);
		return { minRow, maxRow, minCol, maxCol };
	}

	function selectCell(cell, extend) {
		const here = coordsOf(cell);
		if (extend && range) applyRange(normalise([range.minRow, range.minCol], here));
		else applyRange({ minRow: here[0], maxRow: here[0], minCol: here[1], maxCol: here[1] });
	}

	// ── Grip bands: the rows/columns a grip may span ───────────────────────────
	//
	// A grip exists only where the selection covers a row or column ENTIRELY. A
	// partly selected row is not a row, and a handle on it would claim more than
	// the selection holds -- the same rule that withholds grips when the whole
	// table is selected, applied continuously rather than as a special case.

	function selectedRowBands() {
		if (!range) return [];
		const lastCol = colCount(table) - 1;
		if (range.minCol !== 0 || range.maxCol !== lastCol) return [];
		// A whole-table selection has nothing left to move, so it gets no grips.
		if (range.minRow === (hasHeader(table) ? -1 : 0) &&
			range.maxRow === bodyRows(table).length - 1) return [];
		const from = Math.max(range.minRow, 0);
		if (from > range.maxRow) return [];
		return [{ from, to: range.maxRow }];
	}

	function selectedColBands() {
		if (!range) return [];
		const first = hasHeader(table) ? -1 : 0;
		if (range.minRow !== first || range.maxRow !== bodyRows(table).length - 1) return [];
		if (range.minCol === 0 && range.maxCol === colCount(table) - 1) return [];
		return [{ from: range.minCol, to: range.maxCol }];
	}

	/**
	 * Build one grip per selected row/column band, each spanning it, plus the
	 * matching DELETE control on the opposite end. Drag and delete sit at opposite
	 * ends so neither is a click from the other. Runs on every selection change AND
	 * on every measure, so listeners must be delegated rather than bound per grip.
	 */
	function buildGrips() {
		if (destroyed) return;
		const rowBands = selectedRowBands();
		const colBands = selectedColBands();
		if (rowGrips.firstChild) rowGrips.textContent = '';
		if (colGrips.firstChild) colGrips.textContent = '';

		// Nothing to draw: skip the layout read that would otherwise run on every scroll.
		if (!rowBands.length && !colBands.length) return;

		const rect = table.getBoundingClientRect();

		const rows = bodyRows(table);
		for (const band of rowBands) {
			const top = rows[band.from]?.getBoundingClientRect();
			const bottom = rows[band.to]?.getBoundingClientRect();
			if (!top || !bottom) continue;
			const single = band.from === band.to;
			const label = single ? `Row ${band.from + 1}` : `Rows ${band.from + 1} to ${band.to + 1}`;
			const grip = el('button', 'nte-row-grip', {
				type: 'button',
				'data-row-from': String(band.from),
				'data-row-to': String(band.to),
				'aria-label': label,
				title: 'Drag to move, click to select'
			});
			grip.appendChild(icon(ICON_DRAG));
			grip.style.top = `${top.top - rect.top}px`;
			grip.style.height = `${bottom.bottom - top.top}px`;
			rowGrips.appendChild(grip);

			const del = el('button', 'nte-row-del', {
				type: 'button',
				'data-row-del': String(band.from),
				'data-row-del-to': String(band.to),
				'aria-label': `Delete ${label.toLowerCase()}`,
				title: 'Delete'
			});
			del.appendChild(icon(ICON_CLOSE));
			del.style.top = `${top.top - rect.top}px`;
			del.style.height = `${bottom.bottom - top.top}px`;
			rowGrips.appendChild(del);
		}

		const cells = headerRowEl(table)?.cells;
		if (cells) {
			for (const band of colBands) {
				const left = cells[band.from]?.getBoundingClientRect();
				const right = cells[band.to]?.getBoundingClientRect();
				if (!left || !right) continue;
				const single = band.from === band.to;
				const label = single ? `Column ${band.from + 1}` : `Columns ${band.from + 1} to ${band.to + 1}`;
				const grip = el('button', 'nte-col-grip', {
					type: 'button',
					'data-col-from': String(band.from),
					'data-col-to': String(band.to),
					'aria-label': label,
					title: 'Drag to move, click to select'
				});
				grip.appendChild(icon(ICON_DRAG));
				grip.style.left = `${left.left - rect.left}px`;
				grip.style.width = `${right.right - left.left}px`;
				colGrips.appendChild(grip);

				const del = el('button', 'nte-col-del', {
					type: 'button',
					'data-col-del': String(band.from),
					'data-col-del-to': String(band.to),
					'aria-label': `Delete ${label.toLowerCase()}`,
					title: 'Delete'
				});
				del.appendChild(icon(ICON_CLOSE));
				// Only the HORIZONTAL extent is set here. The vertical position is
				// CSS (`top: 100%`) — the delete hangs off the bottom of the table
				// for the whole band, not at the band's own top edge. Writing `top`
				// inline, as the drag grip does, overrode that and parked the delete
				// control inside the table.
				del.style.left = `${left.left - rect.left}px`;
				del.style.width = `${right.right - left.left}px`;
				colGrips.appendChild(del);
			}
		}
	}

	// ── Top zone: the single safe area for panel-style controls ────────────────

	function updateZone() {
		// The zone is rebuilt from scratch on every state change, so focus is
		// restored by what the control DOES, not by element identity.
		const focused = document.activeElement;
		const refocus = zone.contains(focused) ? zoneKeyOf(focused) : null;
		zone.textContent = '';
		if (!range) {
			zone.classList.remove('is-active');
			return;
		}

		// A range spanning several columns is not itself a column, so the
		// control reads the first and applies to all of them.
		const align = cellAt(table, range.minRow, range.minCol)?.getAttribute('data-align') || 'left';

		const seg = el('div', 'nte-seg', { role: 'group', 'aria-label': 'Column alignment' });
		for (const [value, iconName, text] of [
			['left', 'format_align_left', 'Align left'],
			['center', 'format_align_center', 'Align centre'],
			['right', 'format_align_right', 'Align right']
		]) {
			const btn = el('button', 'nte-seg-btn', {
				type: 'button',
				'aria-label': text,
				title: text,
				'aria-pressed': String(align === value),
				'data-align-value': value
			});
			btn.appendChild(icon(iconName));
			seg.appendChild(btn);
		}
		zone.appendChild(seg);

		zone.appendChild(el('span', 'nte-zone-sep'));

		const headerBtn = el('button', 'nte-zone-btn', {
			type: 'button',
			'aria-pressed': String(hasHeader(table)),
			title: 'Toggle header row',
			'aria-label': 'Toggle header row',
			'data-action-header': ''
		});
		headerBtn.appendChild(icon('view_column'));
		headerBtn.appendChild(el('span', 'nte-zone-label', { textContent: 'Header row' }));
		zone.appendChild(headerBtn);

		// Insert relative to the SELECTION, which is the whole reason these controls
		// live here and not on the table's edges: an edge affordance can only mean
		// "at the end". Plain inserts AFTER the band, Ctrl+click BEFORE it.
		zone.appendChild(el('span', 'nte-zone-sep'));
		for (const [axis, text, iconName] of [
			['row', 'Row', ICON_ADD],
			['col', 'Column', ICON_ADD]
		]) {
			const btn = el('button', 'nte-zone-btn nte-zone-add', {
				type: 'button',
				'data-action-add': axis,
				'aria-label': `Insert a ${text.toLowerCase()} after the selection — hold Ctrl to insert before`,
				title: `Insert ${text.toLowerCase()} after selection · Ctrl-click to insert before`
			});
			btn.appendChild(icon(iconName));
			btn.appendChild(el('span', 'nte-zone-label', { textContent: text }));
			zone.appendChild(btn);
		}

		// Paste appears only once a band has been copied: a control that is always
		// present but usually inert has to be read before it can be used.
		if (copied) {
			zone.appendChild(el('span', 'nte-zone-sep'));
			const label = copied.kind === 'row' ? 'row' : 'column';
			const plural = copied.cells.length > 1 ? `${copied.cells.length} ${label}s` : label;
			const pasteBtn = el('button', 'nte-zone-btn nte-zone-add', {
				type: 'button',
				'data-action-paste': copied.kind,
				'aria-label': `Paste a copy of the copied ${label} after the selection — hold Ctrl to paste before`,
				title: `Paste copied ${plural} after selection · Ctrl-click to paste before`
			});
			pasteBtn.appendChild(icon(ICON_COPY));
			pasteBtn.appendChild(el('span', 'nte-zone-label', { textContent: 'Paste' }));
			zone.appendChild(pasteBtn);
		}

		// No caption of what is selected, and the zone is a fixed width: a control
		// surface must not reflow in response to the state it reports on, or
		// reaching for a button becomes a moving target.

		zone.classList.add('is-active');

		// Put focus back on the control that had it, so pressing one zone button
		// does not silently move the user out of the toolbar.
		if (refocus) zone.querySelector(refocus)?.focus();
	}

	/** A stable selector for a zone control, keyed by what the control does. */
	function zoneKeyOf(node) {
		if (node.dataset?.alignValue) return `[data-align-value="${node.dataset.alignValue}"]`;
		if (node.dataset?.actionAdd) return `[data-action-add="${node.dataset.actionAdd}"]`;
		if (node.dataset?.actionPaste) return '[data-action-paste]';
		if (node.hasAttribute?.('data-action-header')) return '[data-action-header]';
		return null;
	}

	function hideZone() {
		// A live selection keeps its panel: the controls apply to what is selected.
		if (range) return;
		zone.classList.remove('is-active');
	}

	// ── Structure operations ───────────────────────────────────────────────────

	function bodyOf() {
		if (!table.tBodies[0]) table.appendChild(el('tbody'));
		return table.tBodies[0];
	}

	/** Editability is set where cells are CREATED, not swept in refresh(). */
	function makeEditable(cells) {
		if (!editable) return;
		for (const c of cells) c.setAttribute('contenteditable', 'true');
	}

	function insertRow(after, cells = colCount(table)) {
		const tbody = bodyOf();
		const template = tbody.rows[after] || tbody.rows[0];
		const tr = cloneRow(template, cells);
		const ref = tbody.rows[after];
		if (after >= 0 && ref) tbody.insertBefore(tr, ref.nextSibling);
		else tbody.appendChild(tr);
		makeEditable(tr.cells);
		return tr;
	}

	function insertColumn(at) {
		const rows = rowsOf(table);
		// The header row gets a `th`, not a `td`. A cell's tag is a property of the
		// SECTION it sits in: the theme styles `th` by tag, so a `td` there renders
		// unbolded and unshaded next to its neighbours.
		for (const tr of rows) {
			const cell = makeCell(tr.parentElement === table.tHead ? 'th' : 'td', '');
			if (at >= 0 && tr.cells[at]) tr.insertBefore(cell, tr.cells[at]);
			else tr.appendChild(cell);
		}
		// A new column's alignment follows the one to its left, so a right-aligned
		// number column grows to the right as right-aligned.
		const neighbour = at > 0 ? rows[0]?.cells[at - 1] : null;
		const align = neighbour?.getAttribute('data-align') || 'left';
		// Every row got a new cell at `at`, including rows that existed before
		// this call, so alignment and editability are applied across the whole
		// column rather than to the newly created one alone.
		for (const tr of rows) {
			const cell = tr.cells[at];
			if (!cell) continue;
			cell.setAttribute('data-align', align);
			makeEditable([cell]);
		}
	}

	/**
	 * Insert a row AT an index. `insertRow(after)` cannot express "before the
	 * first row": at -1 it finds no reference row and appends to the end instead.
	 */
	function insertRowAt(index, cells = colCount(table)) {
		const tbody = bodyOf();
		const ref = tbody.rows[index] || null;
		const tr = cloneRow(ref || tbody.rows[0], cells);
		if (ref) tbody.insertBefore(tr, ref);
		else tbody.appendChild(tr);
		makeEditable(tr.cells);
		return tr;
	}

	/**
	 * Insert a row or column adjacent to the selection, then SELECT it: the
	 * insertion point is worth confirming, and a fresh band is where the user is
	 * about to type.
	 */
	function insertAtSelection(kind, before) {
		if (!range) return;
		if (kind === 'row') {
			// The header is row -1 and there is nothing above it to insert before,
			// so a before-insert on a selection touching the header lands at body
			// row 0 rather than trying to create a row above thead.
			const tr = insertRowAt(before ? Math.max(0, range.minRow) : range.maxRow + 1);
			const index = bodyRows(table).indexOf(tr);
			applyRange({ minRow: index, maxRow: index, minCol: 0, maxCol: colCount(table) - 1 });
			emit('structure', { action: before ? 'insert-row-before' : 'insert-row-after', at: index });
		} else {
			const at = before ? Math.max(0, range.minCol) : range.maxCol + 1;
			insertColumn(at);
			applyRange({
				minRow: hasHeader(table) ? -1 : 0,
				maxRow: bodyRows(table).length - 1,
				minCol: at, maxCol: at
			});
			emit('structure', { action: before ? 'insert-column-before' : 'insert-column-after', at });
		}
		refresh();
	}

	// ── Clipboard: copy a band, paste a copy of it ─────────────────────────────

	/**
	 * The copied band, or null — the component's OWN clipboard.
	 *
	 * A band is a STRUCTURE (a run of cells with an axis, an alignment per column,
	 * a header); the system clipboard only carries a flat string, and a paste that
	 * re-guessed the lost axis would paste something other than what was copied.
	 * The system clipboard is still written, as TSV, for use OUTSIDE the editor.
	 */
	let copied = null;

	/** The row/column band the current selection covers, or null. */
	function selectedBand() {
		const rowBands = selectedRowBands();
		if (rowBands.length) return { kind: 'row', from: rowBands[0].from, to: rowBands[0].to };
		const colBands = selectedColBands();
		if (colBands.length) return { kind: 'col', from: colBands[0].from, to: colBands[0].to };
		return null;
	}

	function bandCells(band) {
		const out = [];
		const cols = colCount(table);
		const rows = rowsOf(table);
		const header = hasHeader(table);
		const rowBase = header ? 1 : 0;
		if (band.kind === 'row') {
			for (let r = band.from; r <= band.to; r++) {
				const tr = rows[r + rowBase];
				const row = [];
				for (let c = 0; c < cols; c++) row.push(cellText(tr?.cells[c]));
				out.push(row);
			}
		} else {
			for (let c = band.from; c <= band.to; c++) {
				const col = [];
				// The header is row -1 and is part of a column: copying a column and
				// dropping its heading would leave a column with no label.
				if (header) col.push(cellText(rows[0]?.cells[c]));
				for (let r = rowBase; r < rows.length; r++) col.push(cellText(rows[r]?.cells[c]));
				out.push(col);
			}
		}
		return out;
	}

	function copyBand() {
		const band = selectedBand();
		if (!band) return false;
		const cells = bandCells(band);
		// Alignment travels with the copy. A right-aligned number column pasted
		// back as left-aligned is a copy with its meaning stripped off.
		const alignRow = rowsOf(table)[0];
		const align = [];
		for (let c = 0; c < colCount(table); c++) {
			align.push(alignRow?.cells[c]?.getAttribute('data-align') || 'left');
		}
		copied = { kind: band.kind, cells, align, from: band.from, to: band.to };
		// TSV for the system clipboard: a spreadsheet reads it as a grid, and the
		// component's own paste handler reads it as one too.
		const tsv = cells.map(row => row.join('\t')).join('\n');
		navigator.clipboard?.writeText?.(tsv)?.catch?.(() => {
			// Permission is not ours to assume. The band copy already succeeded, so
			// a refused system write costs the interop copy and nothing else.
		});
		emit('content', { action: 'copy-band', kind: band.kind, rows: cells.length });
		updateZone();
		return true;
	}

	/**
	 * Insert a copy of the copied band adjacent to the current selection. The
	 * copied band keeps its own size, so copying three rows pastes three rows.
	 */
	function pasteBand(before) {
		if (!copied || !range) return;
		const n = copied.cells.length;
		if (copied.kind === 'row') {
			const at = before ? Math.max(0, range.minRow) : range.maxRow + 1;
			// `insertRowAt` inserts AT `at`, so the new row's index IS `at`. Never
			// ask a live HTMLCollection where something is: the lookup that used
			// to be here returned -1, and the paste produced an EMPTY row that
			// looked exactly like a successful insert.
			insertRowAt(at);
			for (let i = 0; i < n; i++) {
				const target = bodyRows(table)[at + i];
				if (!target) break;
				copied.cells[i].forEach((text, c) => {
					if (target.cells[c]) {
						setCellText(target.cells[c], text);
						target.cells[c].setAttribute('data-align', copied.align[c] || 'left');
					}
				});
			}
			applyRange({ minRow: at, maxRow: at + n - 1, minCol: 0, maxCol: colCount(table) - 1 });
			emit('structure', { action: 'paste-rows', at, count: n });
		} else {
			const at = before ? Math.max(0, range.minCol) : range.maxCol + 1;
			// Every column is inserted first, then filled. Filling as we go
			// would read the shifted grid and write each value one column
			// further right than it belongs.
			for (let i = 0; i < n; i++) insertColumn(at + i);
			for (let i = 0; i < n; i++) {
				// A column copy includes the header, so its cells run one
				// longer than the body rows. `cellAt` addresses row -1 for the header.
				copied.cells[i].forEach((text, k) => {
					const r = hasHeader(table) ? k - 1 : k;
					if (r < -1) return;
					const cell = cellAt(table, r, at + i);
					if (!cell) return;
					setCellText(cell, text);
					cell.setAttribute('data-align', copied.align[copied.from + i] || 'left');
				});
			}
			const first = hasHeader(table) ? -1 : 0;
			applyRange({ minRow: first, maxRow: bodyRows(table).length - 1, minCol: at, maxCol: at + n - 1 });
			emit('structure', { action: 'paste-columns', at, count: n });
		}
		refresh();
	}

	/**
	 * Delete a BAND, not one row: the handle spans the whole selection. A table
	 * must keep one body row — an empty tbody has no height to hover — so
	 * removing the whole selection CLEARS it. Removed end-backwards, or every
	 * later index shifts and the wrong rows go.
	 */
	function deleteRows(from, to) {
		const rows = bodyRows(table);
		const span = rows.slice(from, to + 1);
		if (span.length === 0) return;
		if (rows.length - span.length < 1) {
			span.forEach((tr) => tr.querySelectorAll('th,td').forEach(clearCell));
			emit('structure', { action: 'clear-rows', count: span.length });
			return;
		}
		for (let i = span.length - 1; i >= 0; i--) span[i].remove();
		emit('structure', { action: 'delete-rows', count: span.length });
	}

	/** The same, for a band of columns. */
	function deleteColumns(from, to) {
		const cols = colCount(table);
		const count = to - from + 1;
		const rows = rowsOf(table);
		if (count >= cols) {
			for (const tr of rows) {
				for (let i = 0; i < tr.cells.length; i++) clearCell(tr.cells[i]);
			}
			emit('structure', { action: 'clear-columns', count });
			return;
		}
		for (const tr of rows) {
			for (let i = to; i >= from; i--) tr.cells[i]?.remove();
		}
		emit('structure', { action: 'delete-columns', count });
	}

	/**
	 * Move the first row in and out of <thead>, converting its cells th<->td.
	 * Returns the row-index shift, so the caller can re-anchor a selection onto
	 * the same CELLS: promoting shifts the body up (-1), demoting drops it back
	 * down (+1).
	 */
	function toggleHeader() {
		const head = table.tHead;
		if (head) {
			// Turning the header OFF has to DEMOTE the cells, not just move the row.
			// The theme styles `th` by tag, so a <th> left in <tbody> keeps the
			// header's shading: the DOM changes, the export changes, the screen
			// does not.
			const first = head.rows[0];
			for (const th of Array.from(first.cells)) {
				const td = el('td', null, { 'data-align': th.getAttribute('data-align') || 'left' });
				setCellText(td, cellText(th));
				th.replaceWith(td);
			}
			bodyOf().insertBefore(first, bodyOf().rows[0]);
			head.remove();
			emit('header', { action: 'toggle-header' });
			return 1;
		} else {
			const first = bodyOf().rows[0];
			if (!first) return 0;
			const cells = Array.from(first.cells);
			const tr = el('tr');
			const head = el('thead');
			for (const cell of cells) {
				const th = el('th', null, { 'data-align': cell.getAttribute('data-align') || 'left' });
				setCellText(th, cellText(cell));
				tr.appendChild(th);
			}
			head.appendChild(tr);
			table.insertBefore(head, bodyOf());
			first.remove();
			emit('header', { action: 'toggle-header' });
			// Body row 0 became the header (row -1): everything below it moved up.
			return -1;
		}
	}

	function setAlign(value) {
		if (!range) return;
		let changed = false;
		// Alignment is a property of a COLUMN, so it is written down every row
		// of each selected column -- the header included, or the export and
		// the render would disagree about the same column.
		const rows = rowsOf(table);
		for (let col = range.minCol; col <= range.maxCol; col++) {
			for (const tr of rows) {
				const cell = tr.cells[col];
				if (cell && cell.getAttribute('data-align') !== value) {
					cell.setAttribute('data-align', value);
					changed = true;
				}
			}
		}
		if (changed) {
			updateZone();
			emit('align', { value, from: range.minCol, to: range.maxCol });
		}
	}

	// ── Keyboard walk ──────────────────────────────────────────────────────────

	function moveFocus(from, dr, dc, appendRow) {
		const [r0, c0] = coordsOf(from);
		// r0 is used as-is and clamped at the top, not normalised to 0:
		// walking DOWN into the header must not select the first body row.
		let r = r0;
		let c = c0 + dc;
		const cols = colCount(table);
		if (dr) r += dr;
		if (c >= cols) {
			c = 0;
			r += 1;
		} else if (c < 0) {
			c = cols - 1;
			r -= 1;
		}
		// Walking up off the first body row lands on the header when there is one,
		// and is otherwise a no-op rather than an error.
		if (r < 0) r = hasHeader(table) ? -1 : 0;
		if (r >= bodyRows(table).length) {
			if (!appendRow) return false;
			const tr = insertRow(bodyRows(table).length - 1);
			r = bodyRows(table).indexOf(tr);
			emit('structure', { action: 'append-row' });
		}
		const next = cellAt(table, r, c);
		if (!next) return false;
		selectCell(next, false);
		focusCell(next);
		return true;
	}

	function focusCell(cell) {
		cell.focus();
		const range = document.createRange();
		range.selectNodeContents(cell);
		range.collapse(false);
		const sel = window.getSelection();
		sel.removeAllRanges();
		sel.addRange(range);
	}

	function onKeyDown(e) {
		const cell = e.target.closest('th,td');
		if (!cell || !table.contains(cell)) return;

		if (e.key === 'Tab') {
			e.preventDefault();
			moveFocus(cell, 0, e.shiftKey ? -1 : 1, !e.shiftKey);
			return;
		}
		if (e.key === 'Enter') {
			e.preventDefault();
			moveFocus(cell, 1, 0, false);
			return;
		}
		if (e.key === 'Escape') {
			clearSelection();
			hideZone();
			return;
		}
		// Ctrl+C copies the BAND, but only when a whole row or column is
		// selected AND no text is selected: highlighting a word to copy it is
		// ordinary text copy, and overriding it is the more surprising failure.
		if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
			if (window.getSelection()?.toString()) return;
			if (copyBand()) e.preventDefault();
			return;
		}
		// Arrow keys move between cells only when the caret is not editing text;
		// otherwise they must stay available to the user's own cursor movement.
		if (e.key.startsWith('Arrow') && !window.getSelection()?.toString()) {
			const sel = window.getSelection();
			// "At the edge" is decided PER AXIS. Collapsing a clone range to the
			// START of the cell contents tests the horizontal axis only; for the
			// vertical axis that test is meaningless, because a caret sitting
			// mid-text still measures non-zero.
			const horizontal = e.key === 'ArrowRight' || e.key === 'ArrowLeft';
			const atEdge = !horizontal || (sel && sel.rangeCount && (() => {
				const r = sel.getRangeAt(0).cloneRange();
				r.selectNodeContents(cell);
				if (e.key === 'ArrowRight') r.setStart(r.endContainer, r.endOffset);
				if (e.key === 'ArrowLeft') r.collapse(false), r.setStart(r.startContainer, r.startOffset);
				return r.toString().length === 0;
			})());
			if (atEdge) {
				const dr = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
				const dc = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
				if (moveFocus(cell, dr, dc, dr > 0)) e.preventDefault();
			}
		}
	}

	function onPaste(e) {
		const cell = e.target.closest('th,td');
		if (!cell || !table.contains(cell)) return;
		const text = e.clipboardData?.getData('text/plain');
		// Only a genuine spreadsheet/TSV payload is handled. A single-line
		// paste stays a normal paste so inline formatting and URLs survive.
		if (!text || (!text.includes('\t') && !text.includes('\n'))) return;
		e.preventDefault();
		const grid = text.replace(/\r/g, '').replace(/\n$/, '').split('\n').map(line => line.split('\t'));
		const [r0, c0] = coordsOf(cell);
		const cols = colCount(table);
		const body = bodyOf();

		grid.forEach((rowValues, dr) => {
			let targetRow = r0 + dr;
			if (targetRow >= body.rows.length) {
				insertRow(body.rows.length - 1, cols);
			}
			const tr = body.rows[Math.min(targetRow, body.rows.length - 1)];
			rowValues.forEach((value, dc) => {
				const c = c0 + dc;
				if (c >= cols) insertColumn(c);
				setCellText(tr.cells[c] || tr.cells[tr.cells.length - 1], value.trim());
			});
		});
		refresh();
		selectCell(cellAt(table, Math.min(r0, body.rows.length - 1), c0), false);
		emit('structure', { action: 'paste-tsv', rows: grid.length, cols: grid[0]?.length || 0 });
	}

	// ── Pointer ─────────────────────────────────────────────────────────────────
	//
	// There is deliberately no hover state for the grips. A grip that appears
	// wherever the pointer merely passed is a signal about the POINTER, not about
	// the selection. A grip appears only when that whole row or column is
	// selected -- derived from the same range as everything else, so it can never
	// claim a row the selection does not contain.

	let drag = null;

	/**
	 * Drop targets are BOUNDARIES, not items: `n` means "n items lie above/left of
	 * the pointer". One value drives both the line and the insertion, so they
	 * cannot disagree by a slot.
	 */
	function rowBoundaryAt(clientY) {
		const rows = bodyRows(table);
		let n = 0;
		for (const tr of rows) {
			const r = tr.getBoundingClientRect();
			if (clientY > r.top + r.height / 2) n++;
			else break;
		}
		return n;
	}

	function colBoundaryAt(clientX) {
		const head = headerRowEl(table);
		const cells = head?.cells || [];
		let n = 0;
		for (const cell of cells) {
			const r = cell.getBoundingClientRect();
			if (clientX > r.left + r.width / 2) n++;
			else break;
		}
		return n;
	}

	/** Where a row boundary sits on screen: the top edge of row[n]. */
	function rowBoundaryY(n) {
		const rows = bodyRows(table);
		const origin = table.getBoundingClientRect();
		if (n <= 0) return rows[0] ? rows[0].getBoundingClientRect().top - origin.top : 0;
		if (n >= rows.length) {
			const last = rows[rows.length - 1];
			return last ? last.getBoundingClientRect().bottom - origin.top : origin.height;
		}
		return rows[n].getBoundingClientRect().top - origin.top;
	}

	/** Where a column boundary sits on screen: the left edge of cell[n]. */
	function colBoundaryX(n) {
		const head = headerRowEl(table);
		const cells = head?.cells || [];
		const origin = table.getBoundingClientRect();
		if (n <= 0) return cells[0] ? cells[0].getBoundingClientRect().left - origin.left : 0;
		if (n >= cells.length) {
			const last = cells[cells.length - 1];
			return last ? last.getBoundingClientRect().right - origin.left : origin.width;
		}
		return cells[n].getBoundingClientRect().left - origin.left;
	}

	function onGripPointerDown(e, kind, from, to) {
		if (e.button !== 0) return;
		const rows = bodyRows(table);
		const cells = headerRowEl(table)?.cells;
		// A grip spans a BAND, so it acts on the band: a handle covering three
		// rows that moved only the first would be a lie about what it does.
		const items = kind === 'row'
			? rows.slice(from, to + 1)
			: Array.from(cells || []).slice(from, to + 1);
		if (!items.length || !items[0]) return;

		// Select FIRST, on press. A press that becomes a drag never delivers
		// a click at all, so waiting for one loses the selection entirely.
		if (kind === 'row') {
			applyRange({ minRow: from, maxRow: to, minCol: 0, maxCol: colCount(table) - 1 });
		} else {
			applyRange({
				minRow: hasHeader(table) ? -1 : 0,
				maxRow: rows.length - 1,
				minCol: from, maxCol: to
			});
		}
		drag = { kind, from, to, moved: false, startX: e.clientX, startY: e.clientY };
		// Capture on the overlay so the pointer stream survives leaving the cell.
		// This is an optimisation, NOT the teardown path: the drag ends from a
		// document listener, because buildGrips() replaces the very grip this
		// press arrived on and a release dispatched at it has no path to the
		// overlay.
		overlay.setPointerCapture?.(e.pointerId);
		overlay.classList.add('is-dragging');
		// Native image/text drag would hijack the pointer stream mid-gesture.
		e.preventDefault();
	}

	on(overlay, 'pointerdown', (e) => {
		// Delegated: position() rebuilds every grip on each measure, so a listener
		// bound per element would be discarded (and leak) on every resize.
		const grip = e.target.closest('.nte-row-grip, .nte-col-grip');
		if (!grip) return;
		const isRow = grip.classList.contains('nte-row-grip');
		const from = isRow ? grip.dataset.rowFrom : grip.dataset.colFrom;
		const to = isRow ? grip.dataset.rowTo : grip.dataset.colTo;
		onGripPointerDown(e, isRow ? 'row' : 'col', Number(from), Number(to));
	});

	function endDrag() {
		if (!drag) return;
		const { kind, from, to, boundary, moved } = drag;
		overlay.classList.remove('is-dragging');
		dropRowLine.classList.remove('is-visible');
		dropColLine.classList.remove('is-visible');
		drag = null;
		// A press that never moved is a selection, not a reorder: the band was
		// already selected on pointerdown and must survive its own release.
		if (!moved || boundary === undefined) { position(); return; }

		const size = to - from + 1;

		// `boundary` counts items on the far side of the pointer in the CURRENT
		// array. The band occupies `size` slots, so the insertion point in the
		// array without it is the boundary minus whatever part of the band is
		// already above the pointer. Dropping a band is the same arithmetic as
		// dropping one item, with the band's own width accounted for instead of
		// ignored -- ignoring it is what lands a multi-row drag short.
		const toIndex = boundary > to ? boundary - size : boundary;
		if (toIndex === from) { position(); return; }

		if (kind === 'row') {
			const rows = bodyRows(table);
			// ELEMENT references taken before the move, selection measured from
			// them after. A range is positional, so leaving it alone would
			// re-point it at whatever now sits in those slots.
			const band = rows.slice(from, from + size);
			// The reference must come from the list WITHOUT the band: from the
			// live list the target is the dragged row itself when it moves toward
			// the start, and insertBefore(el, el) is a silent no-op.
			const remaining = rows.filter((_, i) => i < from || i >= from + size);
			const ref = remaining[toIndex] || null;
			for (const tr of band) {
				if (ref) bodyOf().insertBefore(tr, ref);
				else bodyOf().appendChild(tr);
			}
			emit('reorder', { kind, from, to, size });

			const after = bodyRows(table);
			const first = after.indexOf(band[0]);
			const last = after.indexOf(band[band.length - 1]);
			// A moved band is still contiguous, so these are always in range;
			// the check guards against a range past the end, which would mark
			// nothing while the zone still claimed a selection.
			if (first >= 0 && last - first + 1 === size) {
				applyRange({ minRow: first, maxRow: last, minCol: 0, maxCol: colCount(table) - 1 });
			}
			refresh();
			return;
		}

		const trs = rowsOf(table);
		// BOTH ends of the band, per row, captured before the move. Probing
		// only the first cell makes lo === hi for any band wider than one
		// column, and the selection is silently left on the vacated slots.
		const bandCells = trs.map(tr => Array.from(tr.cells).slice(from, from + size));
		for (const tr of trs) {
			// The reference must come from the array WITHOUT the dragged cells.
			// Splicing a copy of tr.cells leaves the live DOM untouched, so
			// tr.cells[to] would still be the original element.
			const cells = Array.from(tr.cells);
			const band = cells.slice(from, from + size);
			const rest = cells.filter((_, i) => i < from || i >= from + size);
			const ref = rest[toIndex] || null;
			for (const cell of band) {
				if (ref) tr.insertBefore(cell, ref);
				else tr.appendChild(cell);
			}
		}
		emit('reorder', { kind, from, to, size });

		// Read each end cell's new index. `tr.cells` is a live HTMLCollection,
		// which has no indexOf, so it is materialised into an array first.
		const cellsNow = trs.map(tr => Array.from(tr.cells));
		const firstPositions = bandCells.map((band, i) =>
			band.length ? cellsNow[i].indexOf(band[0]) : -1);
		const lastPositions = bandCells.map((band, i) =>
			band.length ? cellsNow[i].indexOf(band[band.length - 1]) : -1);
		const lo = Math.min(...firstPositions);
		const hi = Math.max(...lastPositions);
		if (firstPositions.every(p => p >= 0) && lastPositions.every(p => p >= 0) &&
			hi - lo + 1 === size) {
			applyRange({
				minRow: hasHeader(table) ? -1 : 0,
				maxRow: bodyRows(table).length - 1,
				minCol: lo, maxCol: hi
			});
		}
		refresh();
	}

	// ── Gesture selection: press a cell, drag across cells, release ────────────
	//
	// The gesture does NOT start on press, it starts when the pointer crosses
	// into a DIFFERENT cell. A drag that stays inside one cell is text
	// selection, and must stay text selection.

	on(table, 'pointerdown', (e) => {
		if (e.button !== 0) return;
		const cell = e.target.closest('th,td');
		if (!cell || !table.contains(cell)) return;
		gesture = { anchor: coordsOf(cell), extent: null, active: false, pointerId: e.pointerId };
	});

	// The gesture listens on the DOCUMENT, not the table and not the overlay. Over
	// a cell the overlay is pointer-events:none, so events target the cell and
	// bubble to the table; over chrome they target the overlay. One capture-phase
	// document listener sees both, and cellFromPoint is pure geometry, so it does
	// not care what is layered on top. Binding to either host misses half the drag.
	on(document, 'pointermove', (e) => {
		if (drag) {
			if (!drag.moved && Math.abs(e.clientX - drag.startX) + Math.abs(e.clientY - drag.startY) < 4) return;
			drag.moved = true;
			const rect = table.getBoundingClientRect();
			if (drag.kind === 'row') {
				const n = rowBoundaryAt(e.clientY);
				dropRowLine.style.top = `${rowBoundaryY(n)}px`;
				dropRowLine.style.left = '0px';
				dropRowLine.style.width = `${rect.width}px`;
				dropRowLine.classList.add('is-visible');
				drag.boundary = n;
			} else {
				const n = colBoundaryAt(e.clientX);
				dropColLine.style.left = `${colBoundaryX(n)}px`;
				dropColLine.style.top = '0px';
				dropColLine.style.height = `${rect.height}px`;
				dropColLine.classList.add('is-visible');
				drag.boundary = n;
			}
			return;
		}

		if (gesture) {
			// SLOP: how far past the anchor cell's edge a drag may travel before it
			// is read as a cell-range sweep rather than a text selection. The hand
			// travels past the glyphs it just covered, so the anchor cell is treated
			// as larger than it renders.
			//
			// A FRACTION OF THE CELL, not a pixel count: a fixed number means
			// something different in a wide cell than a narrow one, and does not
			// follow the user's font size. One number also gets both axes right --
			// cells are far wider than tall, which is the asymmetry wanted.
			const SLOP = 0.14;
			const anchorCell = cellAt(table, gesture.anchor[0], gesture.anchor[1]);
			if (!gesture.active && anchorCell) {
				const a = anchorCell.getBoundingClientRect();
				const slackX = a.width * SLOP;
				const slackY = a.height * SLOP;
				if (e.clientX <= a.right + slackX && e.clientX >= a.left - slackX &&
					e.clientY <= a.bottom + slackY && e.clientY >= a.top - slackY) return;
			}

			const cell = cellFromPoint(e.clientX, e.clientY);
			if (!cell) return;
			const here = coordsOf(cell);
			// Same cell as the anchor: still text selection, not a range.
			if (!gesture.active && here[0] === gesture.anchor[0] && here[1] === gesture.anchor[1]) return;
			if (!gesture.active) {
				gesture.active = true;
				// Suppress native text selection for the duration: a browser Range
				// cannot span cells, and leaving one behind lets the next keystroke
				// act on a stale in-cell selection.
				table.style.userSelect = 'none';
				window.getSelection()?.removeAllRanges();
			}
			gesture.extent = here;
			applyRange(normalise(gesture.anchor, here));
			return;
		}

		// Hover is a geometric question, not an enter/leave one: the grips sit OUTSIDE
		// the table's box, so travelling onto one fires pointerleave and enter/leave
		// would switch the chrome off as the user reaches for it.
		const inside = overTableOrChrome(e.clientX, e.clientY);
		const was = overlay.classList.contains('is-hovered');
		overlay.classList.toggle('is-hovered', inside);
		if (!inside && was) hideZone();
	}, true);

	function endGesture() {
		if (!gesture) return;
		const wasActive = gesture.active;
		gesture = null;
		table.style.userSelect = '';
		if (!wasActive) return;
		// Once a cell boundary WAS crossed, the browser fires the follow-up click on
		// the nearest common ancestor -- the table -- which the click handler would
		// read as "clicked outside a cell" and clear the range just drawn.
		suppressNextClick = true;
		position();
	}

	// The drag ends from the DOCUMENT, in the capture phase. It must not be bound to
	// the overlay: buildGrips() replaces the very grip the press arrived on, so a
	// release dispatched there has no path to that listener. It only ever worked
	// because setPointerCapture retargeted the stream, and where that is missing
	// `drag` never clears -- which kills outside-press dismissal permanently.
	function endPointer() {
		endDrag();
		endGesture();
	}
	on(document, 'pointerup', endPointer, true);
	on(document, 'pointercancel', endPointer, true);

	// ── Wiring ─────────────────────────────────────────────────────────────────

	if (editable) {
		table.querySelectorAll('th,td').forEach(cell => cell.setAttribute('contenteditable', 'true'));
	}
	on(table, 'keydown', onKeyDown);
	on(table, 'paste', onPaste);
	// Escape is also honoured from the chrome. Pressing a zone button leaves focus
	// on that button, which is outside the table, so the table's keydown never sees
	// the key -- and with the selection now surviving those clicks, Escape from the
	// chrome is the only way back out. Same dismissal, whichever has focus.
	on(overlay, 'keydown', (e) => {
		if (e.key !== 'Escape') return;
		clearSelection();
		hideZone();
	});
	// The browser fires dragstart on contenteditable cells mid-gesture, which
	// suppresses the pointermove stream the range depends on.
	on(table, 'dragstart', (e) => { if (gesture?.active) e.preventDefault(); });
	on(window, 'keydown', (e) => { if (e.key === 'Shift') shiftHeld = true; }, true);
	on(window, 'keyup', (e) => { if (e.key === 'Shift') shiftHeld = false; }, true);
	// A window that loses focus mid-Shift would otherwise keep extending forever.
	on(window, 'blur', () => { shiftHeld = false; });

	on(table, 'focusin', (e) => {
		const cell = e.target.closest('th,td');
		if (!cell || !table.contains(cell)) return;
		// During a range gesture the anchor must survive focus moving into the
		// range; focusin fires per cell and would otherwise collapse it.
		if (gesture?.active) return;
		selectCell(cell, shiftHeld);
	});
	on(table, 'input', (e) => {
		if (e.target.closest('th,td')) emitContent();
	});
	on(table, 'click', (e) => {
		if (suppressNextClick) { suppressNextClick = false; return; }
		const cell = e.target.closest('th,td');
		if (cell && table.contains(cell)) {
			selectCell(cell, shiftHeld);
			return;
		}
		if (!e.target.closest('.nte-zone')) clearSelection();
	});

	on(overlay, 'click', (e) => {
		const alignBtnEl = e.target.closest('[data-align-value]');
		if (alignBtnEl) { setAlign(alignBtnEl.dataset.alignValue); return; }
		if (e.target.closest('[data-action-header]')) { refresh(toggleHeader()); return; }
		const addBtn = e.target.closest('[data-action-add]');
		if (addBtn) { insertAtSelection(addBtn.dataset.actionAdd, e.ctrlKey); return; }
		const pasteBtn = e.target.closest('[data-action-paste]');
		if (pasteBtn) { pasteBand(e.ctrlKey); return; }
		// Delete acts on the WHOLE band, not on one row or column of it: a handle
		// covering three rows that removed only the first would be a lie about
		// what it does, exactly as for the drag grip.
		const delRow = e.target.closest('[data-row-del]');
		if (delRow) {
			deleteRows(Number(delRow.dataset.rowDel), Number(delRow.dataset.rowDelTo));
			refresh();
			return;
		}
		const delCol = e.target.closest('[data-col-del]');
		if (delCol) {
			deleteColumns(Number(delCol.dataset.colDel), Number(delCol.dataset.colDelTo));
			refresh();
			return;
		}
	});
	on(overlay, 'contextmenu', (e) => {
		const grip = e.target.closest('[data-row-from], [data-col-from]');
		if (!grip) return;
		e.preventDefault();
		const rows = bodyRows(table);
		if (grip.dataset.rowFrom !== undefined) {
			const from = Number(grip.dataset.rowFrom);
			applyRange({ minRow: from, maxRow: Number(grip.dataset.rowTo), minCol: 0, maxCol: colCount(table) - 1 });
		} else {
			const from = Number(grip.dataset.colFrom);
			applyRange({
				minRow: hasHeader(table) ? -1 : 0,
				maxRow: rows.length - 1,
				minCol: from, maxCol: Number(grip.dataset.colTo)
			});
		}
		updateZone();
	});

	// ── Layout: keep chrome aligned to the table, only while in use ────────────

	function position() {
		if (destroyed) return;
		const rect = table.getBoundingClientRect();
		const originX = parent.getBoundingClientRect().left;
		const originY = parent.getBoundingClientRect().top;
		overlay.style.left = `${rect.left - originX}px`;
		overlay.style.top = `${rect.top - originY}px`;
		overlay.style.width = `${rect.width}px`;
		overlay.style.height = `${rect.height}px`;

		// Grips are rebuilt from the selection, not toggled -- see buildGrips(). It
		// runs on every measure, so a resize keeps a spanning grip sized correctly.
		buildGrips();
	}

	/**
	 * Re-anchor the selection to still-valid cells and rebuild the chrome. A
	 * structural change must NOT dismiss it: the zone is the control surface for
	 * the action just performed, so clearing the range closes the panel under the
	 * pointer.
	 *
	 * `rowShift` re-anchors by row INDEX across a change that renumbers rows.
	 */
	function refresh(rowShift = 0) {
		if (range) {
			applyRange(clampRange({
				minRow: range.minRow + rowShift, maxRow: range.maxRow + rowShift,
				minCol: range.minCol, maxCol: range.maxCol
			}));
		}
		if (editable) table.querySelectorAll('th,td').forEach(c => c.setAttribute('contenteditable', 'true'));
		position();
	}

	on(window, 'resize', position);
	on(window, 'scroll', position, true);
	// A one-shot measure is not enough: the page is hidden when the component first
	// connects, so every coordinate would be 0,0 and stay there.
	const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(() => position()) : null;
	resizeObserver?.observe(table);
	// Hover tracking lives on the overlay, not the table: the overlay sits ON TOP,
	// so once the pointer is over the table the events target the overlay. Bound to
	// the table, a transparent element still swallows the pointer.

	/**
	 * Is the pointer in the table's NEIGHBOURHOOD? Generous on purpose: this only
	 * keeps the hover visual alive while the pointer travels toward the chrome.
	 */
	const HOVER_MARGIN = 24;
	function overTableOrChrome(x, y) {
		const r = table.getBoundingClientRect();
		if (x >= r.left - HOVER_MARGIN && x <= r.right + HOVER_MARGIN &&
			y >= r.top - HOVER_MARGIN && y <= r.bottom + HOVER_MARGIN) return true;
		const z = zone.getBoundingClientRect();
		return x >= z.left && x <= z.right && y >= z.top && y <= z.bottom;
	}

	function inRect(x, y, r) {
		return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
	}

	/**
	 * Did the press land on this table or its own chrome? STRICT, and deliberately
	 * not the test above: there is no collar here, because a collar is exactly the
	 * margin a user clicks to dismiss. The 1px tolerance is for the seam only, so a
	 * press on a grip's own border does not read as a press off the table.
	 */
	function overOwnChrome(x, y) {
		if (inRect(x, y, table.getBoundingClientRect())) return true;
		if (inRect(x, y, zone.getBoundingClientRect())) return true;
		// Walk the two grip containers' children rather than parse a selector on
		// every document press.
		for (const container of [rowGrips, colGrips]) {
			for (const handle of container.children) {
				if (inRect(x, y, handle.getBoundingClientRect())) return true;
			}
		}
		return false;
	}

	on(document, 'pointerdown', (e) => {
		if (drag) return;
		if (overOwnChrome(e.clientX, e.clientY)) return;
		clearSelection();
		overlay.classList.remove('is-hovered');
		hideZone();
	}, true);

	position();

	const api = {
		table,
		overlay,
		refresh,
		position,
		exportMarkdown: () => exportMarkdown(table),
		get isHeader() { return hasHeader(table); },
		destroy() {
			if (destroyed) return;
			destroyed = true;
			clearTimeout(contentTimer);
			resizeObserver?.disconnect();
			for (const [t, type, handler, opts] of listeners) t.removeEventListener(type, handler, opts);
			listeners.length = 0;
			overlay.remove();
			// Restore the host's positioning only if we were the ones who set it.
			if (positionWasSet) parent.style.position = hadPosition;
			table.removeAttribute('data-nui-table-editor');
			delete table._nuiTableEditor;
		}
	};
	table._nuiTableEditor = api;
	return api;
}

// ── Custom element wrapper ────────────────────────────────────────────────────

class NuiTableEditor extends HTMLElement {
	connectedCallback() {
		if (this.hasAttribute('data-initialized')) return;
		this.setAttribute('data-initialized', 'true');
		let table = this.querySelector('table');
		if (!table) {
			// A bare table is wrapped in <nui-table> so the editor inherits the shared
			// table surface and the responsive fallback instead of forking its own.
			const wrap = document.createElement('nui-table');
			table = document.createElement('table');
			table.innerHTML = '<thead><tr><th>Column 1</th></tr></thead><tbody><tr><td></td></tr></tbody>';
			wrap.appendChild(table);
			this.appendChild(wrap);
		} else if (!this.querySelector('nui-table')) {
			// Slotted markup is wrapped unless the consumer already provided a
			// nui-table of their own — a table must not be double-wrapped.
			const wrap = document.createElement('nui-table');
			table.replaceWith(wrap);
			wrap.appendChild(table);
		}
		this._editor = setupTableEditor(table, {
			editable: this.getAttribute('editable') !== 'false',
			// Chrome anchors to this element, so nui-table may keep its scroll clip.
			chromeHost: this
		});
	}

	disconnectedCallback() {
		this._editor?.destroy();
		this._editor = null;
		this.removeAttribute('data-initialized');
	}

	get table() { return this.querySelector('table'); }
	exportMarkdown() { return this._editor.exportMarkdown(); }
	refresh() { this._editor.refresh(); }
}

if (!customElements.get('nui-table-editor')) {
	customElements.define('nui-table-editor', NuiTableEditor);
}

export { NuiTableEditor, setupTableEditor, exportMarkdown };
export default setupTableEditor;

// Register alongside the library's other programmatic facades so hosts can reach
// the enhancer without importing the module path directly.
nui.components = nui.components || {};
nui.components.tableEditor = setupTableEditor;
