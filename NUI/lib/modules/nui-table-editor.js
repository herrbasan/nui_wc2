import { nui } from '../../nui.js';

/**
 * nui-table-editor
 *
 * Progressive enhancement for a native <table>. The table IS the model: no shadow
 * copy of the data, no wrapper element, so a host (rich-text, block editor) can
 * enhance a table in place and still serialize its own HTML cleanly.
 *
 * Two entry points, one implementation:
 *   setupTableEditor(table, options) -> { destroy, refresh, exportMarkdown }
 *     In-place enhancement. Used by hosts that own their own markup.
 *   <nui-table-editor><table>…</table></nui-table-editor>
 *     Thin wrapper for standalone / document-editor contexts. Creates a default
 *     table if none is slotted.
 *
 * At-rest law: zero permanent framing. The table looks like an ordinary table and
 * stays that way until the pointer or keyboard enters it. All panel-style controls
 * live in ONE overlay zone anchored above the table's top edge, growing upward,
 * capped at ~4rem, never displacing the table or the document. Positional affordances
 * (row/column grips, edge `+` buttons) sit at their own rows, columns and edges.
 *
 * Undo is host-owned: the component never keeps history, it emits `nui-change`
 * (detail.type: content | structure | align | header | reorder) and hosts snapshot.
 */

// ── Markup helpers ────────────────────────────────────────────────────────────

const ICON_ADD = 'add';
const ICON_DRAG = 'drag_indicator';

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

function hasHeader(table) {
	return !!table.tHead?.rows[0];
}

function colCount(table) {
	const rows = [headerRowEl(table), ...bodyRows(table)].filter(Boolean);
	return rows.reduce((max, tr) => Math.max(max, tr.cells.length), 0);
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

	// The overlay must anchor to the table without a wrapper, so it needs a
	// positioned ancestor. Prefer the editor element (so a nui-table scroll
	// container can still clip its own scrolling without clipping the chrome),
	// else the table's parent. If that parent is not a positioning context we make
	// it one and remember the exact original value for destroy().
	// The overlay must anchor to the table without a wrapper, so it needs a
	// positioned ancestor. Prefer the editor element (so a nui-table scroll
	// container can still clip its own scrolling without clipping the chrome),
	// else the table's parent. If that parent is not a positioning context we make
	// it one and remember the exact original value for destroy().
	const parent = options.chromeHost || table.parentElement;
	// The stylesheet's in-place selectors key off this marker, so an enhanced table
	// is styled the same whether it is slotted in <nui-table-editor> or enhanced
	// inside someone else's document.
	table.setAttribute('data-nui-table-editor', '');
	// The overlay is NOT aria-hidden. It carries the real toolbar (role="toolbar",
	// arrow-key navigable) and the edge +/- buttons, all of which must be reachable
	// by keyboard and screen reader. Marking it aria-hidden while it holds focusable
	// controls is a contradiction the browser resolves by blocking the hiding --
	// so the controls stayed unreachable anyway, with a console warning. The zone
	// hides itself via opacity/visibility when idle, which removes it from the
	// accessibility tree on its own.
	const overlay = el('div', 'nte-overlay');
	const zone = el('div', 'nte-zone', { role: 'toolbar', 'aria-label': 'Table controls' });
	overlay.appendChild(zone);
	const colGrips = el('div', 'nte-col-grips');
	const rowGrips = el('div', 'nte-row-grips');
	const addRow = el('button', 'nte-edge-add nte-edge-add-row', { type: 'button', 'aria-label': 'Add row', title: 'Add row' });
	addRow.appendChild(icon(ICON_ADD));
	const addCol = el('button', 'nte-edge-add nte-edge-add-col', { type: 'button', 'aria-label': 'Add column', title: 'Add column' });
	addCol.appendChild(icon(ICON_ADD));
	const dropRowLine = el('div', 'nte-drop-line nte-drop-line-row');
	const dropColLine = el('div', 'nte-drop-line nte-drop-line-col');
	overlay.append(colGrips, rowGrips, addRow, addCol, dropRowLine, dropColLine);
	parent.appendChild(overlay);

	const hadPosition = parent.style.position;
	const positionWasSet = hadPosition === '' && getComputedStyle(parent).position === 'static';
	if (positionWasSet) parent.style.position = 'relative';

	// ── Selection ──────────────────────────────────────────────────────────────
	//
	// ONE range is the whole model: { minRow, maxRow, minCol, maxCol }, where row -1
	// is the header row. A single cell, a full row, a full column and a rectangle are
	// all just ranges with equal bounds, so click, shift-click, drag-across and grip
	// all land in the same place and there is no way for them to disagree.

	let range = null;
	let activeCell = null;
	// The anchor/extent of a pointer drag across cells, and whether the drag has
	// actually crossed a cell boundary yet.
	let gesture = null;
	// Set when a range gesture ends, consumed by the next click. See endGesture().
	let suppressNextClick = false;
	// focusin is a FocusEvent and carries NO shiftKey, yet it fires before click
	// when a cell is clicked. Reading e.shiftKey there would always be undefined,
	// silently resetting the anchor and collapsing every range to one cell. Shift is
	// therefore tracked from the real keyboard events.
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
		// The overlay is on top of the table, so elementFromPoint usually returns
		// overlay chrome, never a cell. Hit-testing is done against the table's own
		// geometry instead, which is immune to whatever is layered above it.
		for (const tr of [table.tHead?.rows[0], ...bodyRows(table)].filter(Boolean)) {
			if (y < tr.getBoundingClientRect().top || y > tr.getBoundingClientRect().bottom) continue;
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
			updateZone();
			return;
		}

		for (let row = r.minRow; row <= r.maxRow; row++) {
			for (let col = r.minCol; col <= r.maxCol; col++) {
				cellAt(table, row, col)?.setAttribute('data-selected', '');
			}
		}

		// A grip is shown for each contiguous BAND of fully covered rows, and
		// likewise for columns. A band is one grip spanning all of it, not one
		// grip per row: the selection is a single thing, and one handle says so
		// with a smaller claim than N handles. It also cannot lie -- a grip that
		// spans two rows moves those two rows, never just one.
		// Grips are BUILT from the current selection rather than toggled. They used
		// to be one per row with a class switched on and off, and position() --
		// which runs at the end of every gesture -- wiped that class, so the grips
		// blinked out on mouseup. Deriving them from `range` cannot drift from it.
		//
		// They are built HERE rather than only in position() because a selection
		// can change without any gesture: a shift+click, a grip press, a keyboard
		// walk. Rebuilding from the range wherever the range changes is what keeps
		// "grip exists" and "band is selected" the same statement.
		buildGrips();

		activeCell = cellAt(table, r.minRow, r.minCol) || null;
		activeCell?.setAttribute('data-active', '');
		updateZone();
	}

	function clearSelection() {
		applyRange(null);
	}

	/**
	 * Pull a range back inside the table. After a structural change a stored
	 * range can point past the last row/column, and applying it as-is would mark
	 * nothing while the zone still claimed a selection -- the panel stays open
	 * over a highlight that is not there. The far end is clamped first so a
	 * dragged/shifted range collapses toward the origin rather than inverting.
	 */
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
	//
	// The result is a list of contiguous [from, to] bands, and a grip spans each
	// one. Selection is a rectangle, so in practice a band is just the range
	// clipped to the body rows; the list shape is kept because "every selected
	// row gets its own handle" is the thing being replaced, and returning bands
	// makes the alternative expressible without restructuring.

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

	function selectRow(index) {
		const last = colCount(table) - 1;
		if (last < 0) return;
		applyRange({ minRow: index, maxRow: index, minCol: 0, maxCol: last });
	}

	function selectColumn(index) {
		applyRange({
			minRow: hasHeader(table) ? -1 : 0,
			maxRow: bodyRows(table).length - 1,
			minCol: index, maxCol: index
		});
	}

	/**
	 * Build one grip per selected row/column band, each spanning its whole band.
	 *
	 * Called whenever the selection changes AND on every measure. Deriving the
	 * grips from `range` rather than keeping a grip per row and toggling a class
	 * is what makes them reliable: the class was being wiped by the rebuild at
	 * the end of every gesture, so the grips blinked out on mouseup.
	 */
	function buildGrips() {
		if (destroyed) return;
		const rect = table.getBoundingClientRect();

		rowGrips.textContent = '';
		const rows = bodyRows(table);
		for (const band of selectedRowBands()) {
			const top = rows[band.from]?.getBoundingClientRect();
			const bottom = rows[band.to]?.getBoundingClientRect();
			if (!top || !bottom) continue;
			const single = band.from === band.to;
			const grip = el('button', 'nte-row-grip', {
				type: 'button',
				'data-row-from': String(band.from),
				'data-row-to': String(band.to),
				'aria-label': single ? `Row ${band.from + 1}` : `Rows ${band.from + 1} to ${band.to + 1}`,
				title: 'Drag to move, click to select'
			});
			grip.appendChild(icon(ICON_DRAG));
			grip.style.top = `${top.top - rect.top}px`;
			grip.style.height = `${bottom.bottom - top.top}px`;
			rowGrips.appendChild(grip);
		}

		colGrips.textContent = '';
		const cells = headerRowEl(table)?.cells;
		if (cells) {
			for (const band of selectedColBands()) {
				const left = cells[band.from]?.getBoundingClientRect();
				const right = cells[band.to]?.getBoundingClientRect();
				if (!left || !right) continue;
				const single = band.from === band.to;
				const grip = el('button', 'nte-col-grip', {
					type: 'button',
					'data-col-from': String(band.from),
					'data-col-to': String(band.to),
					'aria-label': single ? `Column ${band.from + 1}` : `Columns ${band.from + 1} to ${band.to + 1}`,
					title: 'Drag to move, click to select'
				});
				grip.appendChild(icon(ICON_DRAG));
				grip.style.left = `${left.left - rect.left}px`;
				grip.style.width = `${right.right - left.left}px`;
				colGrips.appendChild(grip);
			}
		}
	}

	// ── Top zone: the single safe area for panel-style controls ────────────────

	function updateZone() {
		// The zone is rebuilt from scratch on every state change, which destroys
		// whichever button had focus and drops focus to <body> -- so a keyboard
		// user pressing one zone control loses their place entirely and Escape
		// stops reaching anything. The control is identified by what it DOES, not
		// by its element, so the same button can be found again in the new tree.
		const focused = document.activeElement;
		const refocus = zone.contains(focused) ? zoneKeyOf(focused) : null;
		zone.textContent = '';
		if (!range) {
			zone.classList.remove('is-active');
			return;
		}

		// Alignment is per column. A range spanning several columns is not itself a
		// column, so the control reads the first and applies to all of them — which
		// is what selecting a block of cells and pressing "align" means.
		const cols = range.maxCol - range.minCol + 1;
		const rows = range.maxRow - range.minRow + 1;
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

		// A quiet caption of WHAT is selected, and only when it is more than one
		// cell. "Cell R2 · C3" is noise; "3 × 2" is information.
		if (rows * cols > 1) {
			zone.appendChild(el('span', 'nte-zone-sep'));
			zone.appendChild(el('span', 'nte-zone-info', { textContent: `${rows} × ${cols}` }));
		}

		zone.classList.add('is-active');
		overlay.classList.add('is-visible');

		// Put focus back on the control that had it, so pressing one zone button
		// does not silently move the user out of the toolbar.
		if (refocus) zone.querySelector(refocus)?.focus();
	}

	/** A stable selector for a zone control, keyed by what the control does. */
	function zoneKeyOf(node) {
		if (node.dataset?.alignValue) return `[data-align-value="${node.dataset.alignValue}"]`;
		if (node.hasAttribute?.('data-action-header')) return '[data-action-header]';
		return null;
	}

	function hideZone() {
		// A live selection keeps its panel: the controls apply to what is selected.
		if (range) return;
		zone.classList.remove('is-active');
		overlay.classList.remove('is-visible');
	}

	// ── Structure operations ───────────────────────────────────────────────────

	function bodyOf() {
		if (!table.tBodies[0]) table.appendChild(el('tbody'));
		return table.tBodies[0];
	}

	function insertRow(after, cells = colCount(table)) {
		const tbody = bodyOf();
		const template = tbody.rows[after] || tbody.rows[0];
		const tr = cloneRow(template, cells);
		const ref = tbody.rows[after];
		if (after >= 0 && ref) tbody.insertBefore(tr, ref.nextSibling);
		else tbody.appendChild(tr);
		return tr;
	}

	function insertColumn(at) {
		for (const tr of [table.tHead?.rows[0], ...bodyRows(table)].filter(Boolean)) {
			const td = makeCell('td', '');
			if (at >= 0 && tr.cells[at]) tr.insertBefore(td, tr.cells[at]);
			else tr.appendChild(td);
		}
		// A new column's alignment follows the one to its left, so a right-aligned
		// number column grows to the right as right-aligned.
		const neighbour = at > 0 ? cellAt(table, -1, at - 1) : null;
		const align = neighbour?.getAttribute('data-align') || 'left';
		for (const tr of [table.tHead?.rows[0], ...bodyRows(table)].filter(Boolean)) {
			tr.cells[at]?.setAttribute('data-align', align);
		}
	}

	function deleteRow(tr) {
		const rows = bodyRows(table);
		// A table must keep at least one body row: an empty tbody has no height to
		// hover, so the editor would become unreachable.
		if (rows.length <= 1) {
			tr.querySelectorAll('th,td').forEach(clearCell);
			emit('structure', { action: 'clear-row' });
			return;
		}
		tr.remove();
		emit('structure', { action: 'delete-row' });
	}

	function deleteColumn(index) {
		const cols = colCount(table);
		if (cols <= 1) {
			for (const tr of bodyRows(table)) clearCell(tr.cells[index] || tr.cells[0]);
			emit('structure', { action: 'clear-column' });
			return;
		}
		for (const tr of [table.tHead?.rows[0], ...bodyRows(table)].filter(Boolean)) {
			tr.cells[index]?.remove();
		}
		emit('structure', { action: 'delete-column' });
	}

	/**
	 * Move the first row in and out of <thead>, converting its cells th<->td.
	 *
	 * Returns the row-index shift the move caused, so the caller can re-anchor a
	 * selection onto the same CELLS: promoting a header promotes body row 0 (a
	 * shift of -1, since the header is row -1), demoting drops it back into the
	 * body (+1). Returning the shift rather than recomputing it at the call site
	 * keeps the number next to the DOM change that causes it.
	 */
	function toggleHeader() {
		const head = table.tHead;
		if (head) {
			// Turning the header OFF has to DEMOTE the cells, not just move the row.
			// The theme styles `th` by tag, not by section: a <th> left sitting in
			// <tbody> keeps the header's shading and weight, so relocating it alone
			// is a silent no-op -- the DOM changes, the export changes, the screen
			// does not. Off has to mean "an ordinary body row" and look like one.
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
		// Alignment is a property of a COLUMN, so it is written down every row of
		// each selected column — the header included, or the export and the render
		// would disagree about the same column.
		for (let col = range.minCol; col <= range.maxCol; col++) {
			for (const tr of [table.tHead?.rows[0], ...bodyRows(table)].filter(Boolean)) {
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
		let r = Math.max(0, r0);
		let c = c0 + dc;
		const cols = colCount(table);
		if (c >= cols) {
			c = 0;
			r += 1;
		} else if (c < 0) {
			c = cols - 1;
			r = Math.max(0, r - 1);
		}
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
		// Arrow keys move between cells only when the caret is not editing text;
		// otherwise they must stay available to the user's own cursor movement.
		if (e.key.startsWith('Arrow') && !window.getSelection()?.toString()) {
			const sel = window.getSelection();
			const atEdge = sel && sel.rangeCount && (() => {
				const r = sel.getRangeAt(0).cloneRange();
				r.selectNodeContents(cell);
				if (e.key === 'ArrowRight') r.setStart(r.endContainer, r.endOffset);
				if (e.key === 'ArrowLeft') r.collapse(false), r.setStart(r.startContainer, r.startOffset);
				return r.toString().length === 0;
			})();
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
		// Only a genuine spreadsheet/TSV payload is handled. A single-line paste
		// stays a normal paste so inline formatting and URLs survive.
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
	// There is deliberately no hover state for the grips. An earlier version
	// revealed the row and column grip under the pointer, on the reasoning that
	// one affordance is quieter than a grid of them -- but a grip appearing
	// wherever the pointer merely passed is a signal about the POINTER, not
	// about the selection, and on a table with many rows it still produced a
	// running edge of handles as the pointer moved.
	//
	// A grip now appears only when that whole row or column is actually
	// selected, which is the state it acts on. The grip is drawn from the same
	// Because the grip is tied to the selection, it is derived from the same range
	// as everything else (see applyRange), so it can never claim a row the
	// selection does not contain -- and every fully covered row gets one, not
	// just the first.
	//
	// The grips are still hit-testable while the overlay is hovered, so drag to
	// reorder and click to select still work without a visible handle. What was
	// removed is the appearance, not the capability.

	let drag = null;

	/**
	 * Drop targets are BOUNDARIES, not items.
	 *
	 * The earlier version returned "the index of the row/column whose midpoint the
	 * pointer is in" and drew the line at that item's FAR edge, but inserted the
	 * element BEFORE that item. The line and the result therefore disagreed by one
	 * whole slot: every drop landed one position short of where the line promised,
	 * and dragging toward the start simply clamped to index 0 and did nothing.
	 *
	 * One boundary value now drives both. `n` means "n items lie above/left of the
	 * pointer", so the line goes at the top of item[n] (or the table's far edge when
	 * n === length), and the element is inserted at `n` in the array that exists
	 * after it has been lifted out.
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
		// rows that moved only the first would be a lie about what it does. The
		// drag carries the whole range, and endDrag moves every element in it.
		const items = kind === 'row'
			? rows.slice(from, to + 1)
			: Array.from(cells || []).slice(from, to + 1);
		if (!items.length || !items[0]) return;

		// Select FIRST, on press. Waiting for the click loses the selection twice
		// over: the drag's own pointerup clears it, and a press that becomes a drag
		// never delivers a click at all. Selecting on press means the band lights
		// up under the pointer the instant it is grabbed -- which is also what
		// tells the user they have hold of the whole band and not just a handle.
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
		// Capture on the overlay, which is the element the move/up listeners live
		// on. Capturing on the table would retarget events to an element that never
		// sees them, and the drag would die the moment the pointer left the cell.
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
			// The ELEMENT references are taken before the move, and the new
			// selection is measured from them after it. A range is positional --
			// {minRow, maxRow} are indices -- so leaving it alone after a reorder
			// would silently re-point it at whatever now sits in those slots. The
			// highlight would jump to a row the user never touched, reading as
			// "this row changed" when in truth "this row moved, and here it is now".
			const band = rows.slice(from, from + size);
			// The reference must come from the list WITHOUT the band. Taking it
			// from the live list makes the target the dragged row itself whenever
			// it moves toward the start, and insertBefore(el, el) is a silent
			// no-op -- the row then refuses to move upward at all.
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
			// A moved band is still contiguous, so these are always in range; the
			// check is here because a range pointing past the end would mark
			// nothing while the zone still claimed a selection.
			if (first >= 0 && last - first + 1 === size) {
				applyRange({ minRow: first, maxRow: last, minCol: 0, maxCol: colCount(table) - 1 });
			}
			refresh();
			return;
		}

		const trs = [table.tHead?.rows[0], ...bodyRows(table)].filter(Boolean);
		// BOTH ends of the band, per row, captured before the move. Probing only
		// the first cell makes lo === hi for any band wider than one column, so
		// the contiguity check below fails and the selection is silently left on
		// the slots the band vacated -- which now hold different columns. The
		// moved columns are elsewhere and the highlight does not travel with them.
		const bandCells = trs.map(tr => Array.from(tr.cells).slice(from, from + size));
		for (const tr of trs) {
			// The reference must be taken from the array WITHOUT the dragged
			// cell. Splicing a copy of tr.cells leaves the live DOM untouched, so
			// tr.cells[to] would still be the original element and the column
			// would land one slot short of the line — every drag to the right.
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
		// which has no indexOf, so it is materialised into an array first -- the
		// lookup below is on elements that have just been re-parented, and asking
		// the collection itself threw and lost the re-anchored selection.
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
	// The rule that makes this feel right: the gesture does NOT start on press, it
	// starts when the pointer crosses into a DIFFERENT cell. A drag that stays
	// inside one cell is the user selecting text, and it must stay text selection —
	// otherwise you can no longer highlight a word in a cell, which is the single
	// most ordinary thing anyone does in a table.

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
		// the table's box, so travelling onto one fires pointerleave on the table and
		// any enter/leave logic would switch the chrome off exactly as the user
		// reaches for it. The class still governs the edge buttons and the grips'
		// pointer-events; the grips' VISIBILITY comes from the selection, not here.
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
		// A press that never crossed a cell boundary is an ordinary click; the click
		// handler turns it into a single-cell selection. Once a cell boundary WAS
		// crossed, the browser fires the follow-up click on the nearest common
		// ancestor of the two cells — the table — which the click handler would read
		// as "clicked outside a cell" and clear the very range just drawn. Latch it.
		suppressNextClick = true;
		position();
	}
	on(document, 'pointerup', endGesture, true);
	on(document, 'pointercancel', endGesture, true);

	on(overlay, 'pointerup', endDrag);
	on(overlay, 'pointercancel', endDrag);

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
		if (e.target.closest('.nte-edge-add-row')) { insertRow(bodyRows(table).length - 1); emit('structure', { action: 'add-row' }); refresh(); return; }
		if (e.target.closest('.nte-edge-add-col')) { insertColumn(colCount(table)); emit('structure', { action: 'add-column' }); refresh(); return; }
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

		// Edge buttons centre on the table's midpoint edges. Their half-size is
		// measured, not assumed — the CSS owns the size, the JS only places it, so
		// restyling the button never silently misplaces it.
		const addSize = addRow.getBoundingClientRect().width / 2;
		addRow.style.left = `${rect.width / 2 - addSize}px`;
		addRow.style.top = `${rect.height}px`;
		addCol.style.left = `${rect.width}px`;
		addCol.style.top = `${rect.height / 2 - addSize}px`;
	}

	/**
	 * Re-anchor the selection to still-valid cells and rebuild the chrome.
	 *
	 * A structural change must NOT dismiss the selection. The top zone is the
	 * control surface for the action just performed, so clearing the range here
	 * closes the panel under the pointer and turns one operation into two --
	 * press a button, then find and rebuild the selection to press the next.
	 *
	 * `rowShift` re-anchors by row INDEX across a change that renumbers rows:
	 * promoting a header shifts the body up by one (-1), demoting shifts it back
	 * down (+1), so the same CELLS stay selected. Everything else (append, column
	 * move) leaves the numbering alone and shifts by 0.
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
	// connects (the router shows it later), so every coordinate would be 0,0 and stay
	// there. Observing the table also covers font loading and column resizes, none of
	// which fire a window resize.
	const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(() => position()) : null;
	resizeObserver?.observe(table);
	// Hover tracking lives on the overlay, not the table: the overlay is a sibling
	// that sits ON TOP, so once the pointer is over the table the events target the
	// overlay. Bound to the table, the grips would never light up — a transparent
	// element still swallows the pointer.

	/**
	 * The grips deliberately sit OUTSIDE the table's box (a row grip is translated
	 * -100% to the left, a column grip -100% upward). So the moment the pointer
	 * travels onto its own chrome, the table fires `pointerleave` — and any hover
	 * logic driven by enter/leave would switch the chrome off at the exact moment
	 * the user reaches for it. Enter/leave cannot express "pointer is anywhere in
	 * this table's neighbourhood", so the neighbourhood is tested geometrically.
	 */
	const HOVER_MARGIN = 24;
	function overTableOrChrome(x, y) {
		const r = table.getBoundingClientRect();
		if (x >= r.left - HOVER_MARGIN && x <= r.right + HOVER_MARGIN &&
			y >= r.top - HOVER_MARGIN && y <= r.bottom + HOVER_MARGIN) return true;
		const z = zone.getBoundingClientRect();
		return x >= z.left && x <= z.right && y >= z.top && y <= z.bottom;
	}

	on(document, 'pointerdown', (e) => {
		if (drag) return;
		if (overTableOrChrome(e.clientX, e.clientY)) return;
		clearSelection();
		overlay.classList.remove('is-hovered');
		hideZone();
	}, true);
	on(zone, 'pointerenter', () => zone.classList.add('is-pinned'));
	on(zone, 'pointerleave', () => zone.classList.remove('is-pinned'));

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
