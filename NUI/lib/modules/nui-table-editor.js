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
	const overlay = el('div', 'nte-overlay', { 'aria-hidden': 'true' });
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

	/** A range that touches every column of the table is a whole-ROW selection. */
	function isWholeRow(r) {
		return r.minCol === 0 && r.maxCol === colCount(table) - 1;
	}

	function isWholeColumn(r) {
		const first = hasHeader(table) ? -1 : 0;
		return r.minRow === first && r.maxRow === bodyRows(table).length - 1;
	}

	function applyRange(r) {
		range = r;
		table.querySelectorAll('[data-selected]').forEach(c => c.removeAttribute('data-selected'));
		activeCell?.removeAttribute('data-active');
		rowGrips.querySelectorAll('.nte-row-grip').forEach(g => g.classList.remove('is-selected'));
		colGrips.querySelectorAll('.nte-col-grip').forEach(g => g.classList.remove('is-selected'));

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
		if (isWholeRow(r)) {
			rowGrips.querySelector(`[data-row="${r.minRow}"]`)?.classList.add('is-selected');
		}
		if (isWholeColumn(r)) {
			colGrips.querySelector(`[data-col="${r.minCol}"]`)?.classList.add('is-selected');
		}
		activeCell = cellAt(table, r.minRow, r.minCol) || null;
		activeCell?.setAttribute('data-active', '');
		updateZone();
	}

	function clearSelection() {
		applyRange(null);
	}

	function selectCell(cell, extend) {
		const here = coordsOf(cell);
		if (extend && range) applyRange(normalise([range.minRow, range.minCol], here));
		else applyRange({ minRow: here[0], maxRow: here[0], minCol: here[1], maxCol: here[1] });
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

	// ── Top zone: the single safe area for panel-style controls ────────────────

	function updateZone() {
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

	function toggleHeader() {
		const head = table.tHead;
		if (head) {
			// Move the header row back into the body; it stays a row, just unstyled.
			const first = head.rows[0];
			bodyOf().insertBefore(first, bodyOf().rows[0]);
			head.remove();
		} else {
			const first = bodyOf().rows[0];
			if (!first) return;
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
		}
		emit('header', { action: 'toggle-header' });
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

	// ── Pointer: hover reveals the row and column under the pointer only ────────

	let drag = null;
	let hotRow = -1;
	let hotCol = -1;

	/** Index of the body row whose midpoint band contains clientY, or -1. */
	function rowAt(clientY) {
		const rows = bodyRows(table);
		for (let i = 0; i < rows.length; i++) {
			const r = rows[i].getBoundingClientRect();
			if (clientY >= r.top && clientY <= r.bottom) return i;
		}
		return -1;
	}

	/** Index of the column whose horizontal band contains clientX, or -1. */
	function colAt(clientX) {
		const head = headerRowEl(table);
		if (!head) return -1;
		const cells = Array.from(head.cells);
		for (let i = 0; i < cells.length; i++) {
			const r = cells[i].getBoundingClientRect();
			if (clientX >= r.left && clientX <= r.right) return i;
		}
		return -1;
	}

	function setHot(row, col) {
		if (row === hotRow && col === hotCol) return;
		hotRow = row;
		hotCol = col;
		rowGrips.querySelectorAll('.nte-row-grip').forEach(g => {
			g.classList.toggle('is-hot', Number(g.dataset.row) === row);
		});
		colGrips.querySelectorAll('.nte-col-grip').forEach(g => {
			g.classList.toggle('is-hot', Number(g.dataset.col) === col);
		});
	}

	function clearHot() {
		setHot(-1, -1);
	}

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

	function onGripPointerDown(e, kind, index) {
		if (e.button !== 0) return;
		const source = kind === 'row' ? bodyRows(table)[index] : headerRowEl(table)?.cells[index];
		if (!source) return;
		// Select FIRST, on press. Waiting for the click loses the selection twice
		// over: the drag's own pointerup clears it, and a press that becomes a drag
		// never delivers a click at all. Selecting on press means the row lights up
		// under the pointer the instant it is grabbed — which is also what tells the
		// user they have hold of the whole row and not just a handle.
		if (kind === 'row') selectRow(index);
		else selectColumn(index);
		drag = { kind, index, moved: false, startX: e.clientX, startY: e.clientY };
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
		onGripPointerDown(e, grip.classList.contains('nte-row-grip') ? 'row' : 'col',
			Number(grip.dataset.row ?? grip.dataset.col));
	});

	function endDrag() {
		if (!drag) return;
		const { kind, index, boundary, moved } = drag;
		overlay.classList.remove('is-dragging');
		dropRowLine.classList.remove('is-visible');
		dropColLine.classList.remove('is-visible');
		drag = null;
		// A press that never moved is a selection, not a reorder: the row/column was
		// already selected on pointerdown and must survive its own release.
		if (!moved || boundary === undefined) { position(); return; }

		// `boundary` counts items on the far side of the pointer in the CURRENT
		// array; the insertion index is that same boundary in the array that exists
		// once the dragged item has been lifted out. They differ by one exactly when
		// the item is moving toward the end.
		const to = boundary > index ? boundary - 1 : boundary;
		if (to === index) { position(); return; }

		if (kind === 'row') {
			const tr = bodyRows(table)[index];
			if (!tr) { position(); return; }
			// The reference must come from the list WITHOUT the dragged row. Taking
			// it from the live list makes bodyRows()[to + 1] the dragged row itself
			// whenever it moves toward the start, and insertBefore(el, el) is a
			// silent no-op — the row then refuses to move upward at all.
			const remaining = bodyRows(table).filter((_, i) => i !== index);
			const ref = remaining[to] || null;
			if (ref) bodyOf().insertBefore(tr, ref);
			else bodyOf().appendChild(tr);
		} else {
			const trs = [table.tHead?.rows[0], ...bodyRows(table)].filter(Boolean);
			for (const tr of trs) {
				// The reference must be taken from the array WITHOUT the dragged
				// cell. Splicing a copy of tr.cells leaves the live DOM untouched, so
				// tr.cells[to] would still be the original element and the column
				// would land one slot short of the line — every drag to the right.
				const cells = Array.from(tr.cells);
				const [cell] = cells.splice(index, 1);
				const ref = cells[to] || null;
				if (ref) tr.insertBefore(cell, ref);
				else tr.appendChild(cell);
			}
		}
		emit('reorder', { kind, from: index, to });
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
		// reaches for it.
		const inside = overTableOrChrome(e.clientX, e.clientY);
		const was = overlay.classList.contains('is-hovered');
		overlay.classList.toggle('is-hovered', inside);
		if (!inside && was) {
			clearHot();
			hideZone();
		}

		if (e.target?.closest?.('.nte-row-grip, .nte-col-grip')) {
			const g = e.target.closest('[data-row], [data-col]');
			setHot(g.dataset.row !== undefined ? Number(g.dataset.row) : hotRow,
				g.dataset.col !== undefined ? Number(g.dataset.col) : hotCol);
		} else if (overTableOrChrome(e.clientX, e.clientY)) {
			setHot(rowAt(e.clientY), colAt(e.clientX));
		}
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
		if (e.target.closest('[data-action-header]')) { toggleHeader(); refresh(); return; }
		if (e.target.closest('.nte-edge-add-row')) { insertRow(bodyRows(table).length - 1); emit('structure', { action: 'add-row' }); refresh(); return; }
		if (e.target.closest('.nte-edge-add-col')) { insertColumn(colCount(table)); emit('structure', { action: 'add-column' }); refresh(); return; }
	});
	on(overlay, 'contextmenu', (e) => {
		const grip = e.target.closest('[data-row], [data-col]');
		if (!grip) return;
		e.preventDefault();
		if (grip.dataset.row !== undefined) selectRow(Number(grip.dataset.row));
		else selectColumn(Number(grip.dataset.col));
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

		// Row grips sit one per body row, flush to the table's left edge.
		rowGrips.textContent = '';
		bodyRows(table).forEach((tr, i) => {
			const r = tr.getBoundingClientRect();
			const grip = el('button', 'nte-row-grip', {
				type: 'button',
				'data-row': String(i),
				'aria-label': `Row ${i + 1}`,
				title: 'Drag to move, click to select'
			});
			grip.appendChild(icon(ICON_DRAG));
			grip.style.top = `${r.top - rect.top}px`;
			grip.style.height = `${r.height}px`;
			rowGrips.appendChild(grip);
		});

		// Column grips sit above the table, one per column, aligned to its cell.
		colGrips.textContent = '';
		const head = headerRowEl(table);
		if (head) {
			Array.from(head.cells).forEach((cell, i) => {
				const r = cell.getBoundingClientRect();
				const grip = el('button', 'nte-col-grip', {
					type: 'button',
					'data-col': String(i),
					'aria-label': `Column ${i + 1}`,
					title: 'Drag to move, click to select'
				});
				grip.appendChild(icon(ICON_DRAG));
				grip.style.left = `${r.left - rect.left}px`;
				grip.style.width = `${r.width}px`;
				colGrips.appendChild(grip);
			});
		}

		// Edge buttons centre on the table's midpoint edges. Their half-size is
		// measured, not assumed — the CSS owns the size, the JS only places it, so
		// restyling the button never silently misplaces it.
		const addSize = addRow.getBoundingClientRect().width / 2;
		addRow.style.left = `${rect.width / 2 - addSize}px`;
		addRow.style.top = `${rect.height}px`;
		addCol.style.left = `${rect.width}px`;
		addCol.style.top = `${rect.height / 2 - addSize}px`;
	}

	function refresh() {
		clearSelection();
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
		clearHot();
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
