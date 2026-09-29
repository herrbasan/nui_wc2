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
	const dropRowLine = el('div', 'nte-drop-line nte-drop-line-row');
	const dropColLine = el('div', 'nte-drop-line nte-drop-line-col');
	overlay.append(colGrips, rowGrips, dropRowLine, dropColLine);
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
	/**
	 * Build one grip per selected row/column band, each spanning it, plus the
	 * matching DELETE control on the opposite side.
	 *
	 * Drag and delete sit at opposite ends of the same band: a column band's grip
	 * is above the table and its delete is below, a row band's grip is left of the
	 * table and its delete is right of it. They are the two things you can do to
	 * a band, they are not equivalent in consequence — one rearranges, one
	 * destroys — and putting them on opposite ends means neither is adjacent to
	 * the other, so a stray click cannot reach the destructive one while aiming
	 * for the drag. It also keeps the band visually bracketed by its two
	 * affordances, which reads as "this whole band is the thing these act on".
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

		colGrips.textContent = '';
		const cells = headerRowEl(table)?.cells;
		if (cells) {
			for (const band of selectedColBands()) {
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

		// Insert, relative to the SELECTION rather than to the end of the table.
		// This is the whole reason these controls are here and not on the table's
		// edges: an edge affordance can only mean "at the end". Plain inserts
		// AFTER the selected band, Ctrl+click BEFORE it — one gesture, one
		// modifier, rather than a second control for the same pair of operations.
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

		// Paste, offered only when a band has actually been copied. A clipboard
		// button that is always present but usually inert is a control that has to
		// be read before it can be used; one that appears the moment Ctrl+C works
		// is the component reporting its own state. The copy lives in the
		// component, so the button does not need the system clipboard permission
		// to know whether it has anything to paste.
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

		// No caption of what is selected. There was one here -- a quiet "3 x 2" --
		// and it was a mistake twice over. It was information the user did not need,
		// because the selection is already drawn in the table; and because the zone
		// is centred, a caption that only appears for multi-cell selections RESIZED
		// the pill, which re-centred it and moved every control sideways. Measured:
		// selecting a range grew the zone 53px and shifted Align centre 26px. The
		// control the pointer was already travelling toward moved under it, so the
		// toolbar fought the gesture that had just revealed it.
		//
		// The zone is now a fixed width. That is the general rule: a control surface
		// must not reflow in response to the state it reports on, or reaching for a
		// button becomes a moving target.

		zone.classList.add('is-active');
		overlay.classList.add('is-visible');

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
		overlay.classList.remove('is-visible');
	}

	// ── Structure operations ───────────────────────────────────────────────────

	function bodyOf() {
		if (!table.tBodies[0]) table.appendChild(el('tbody'));
		return table.tBodies[0];
	}

	/**
	 * A newly created cell must be editable, and it is the CREATION that has to
	 * say so.
	 *
	 * Editability used to be applied by a sweep inside `refresh()` — a loop over
	 * every cell that runs when the component re-measures. That made editability a
	 * side effect of measuring, so any path that created a cell without also
	 * re-measuring left it dead. Tab-appending a row is exactly such a path: the
	 * row was created, selected and focused, but never refreshed, so its cells had
	 * no `contenteditable` at all.
	 *
	 * The symptom read as a styling bug rather than a functional one: `focusCell`
	 * still put a caret in the cell, so an empty bordered box with a blinking
	 * cursor in it looked exactly like a text input — and typing into it did
	 * nothing, because it was not editable. The look and the breakage came from
	 * the same missing line.
	 */
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
		// The header row gets a `th`, not a `td`. It used to get a `td` like every
		// other row, which is invisible until you read the accessibility tree: the
		// header row then parses as a mix of `rowheader` and plain `cell` instead
		// of a run of `columnheader`s, and the theme styles `th` by tag, so the new
		// column's heading rendered unbolded and unshaded next to its neighbours.
		// A cell's tag is a property of the SECTION it sits in, not of the column
		// it belongs to.
		for (const tr of [table.tHead?.rows[0], ...bodyRows(table)].filter(Boolean)) {
			const cell = makeCell(tr.parentElement === table.tHead ? 'th' : 'td', '');
			if (at >= 0 && tr.cells[at]) tr.insertBefore(cell, tr.cells[at]);
			else tr.appendChild(cell);
		}
		// A new column's alignment follows the one to its left, so a right-aligned
		// number column grows to the right as right-aligned.
		const neighbour = at > 0 ? cellAt(table, -1, at - 1) : null;
		const align = neighbour?.getAttribute('data-align') || 'left';
		for (const tr of [table.tHead?.rows[0], ...bodyRows(table)].filter(Boolean)) {
			tr.cells[at]?.setAttribute('data-align', align);
		}
		// Every row got a new cell at `at`, including rows that existed before
		// this call, so editability is applied across the whole column rather than
		// to the newly created one alone.
		for (const tr of [table.tHead?.rows[0], ...bodyRows(table)].filter(Boolean)) {
			if (tr.cells[at]) makeEditable([tr.cells[at]]);
		}
	}

	/**
	 * Insert a row AT an index, rather than after one.
	 *
	 * `insertRow(after)` cannot express "before the first row": it takes an
	 * index to insert AFTER, and at -1 it finds no reference row and appends to
	 * the end instead. Insert-before-the-selection is half the toolbar's
	 * contract, so the operation is stated in the form the callers need rather
	 * than forced through the other one.
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
	 * Insert a row or column adjacent to the selection.
	 *
	 * Plain click inserts AFTER the selected band, Ctrl+click BEFORE it — the
	 * same gesture, one modifier apart, rather than two separate controls. The
	 * insertion point is the selection, which is the whole reason this control
	 * lives in the toolbar and not on the table's edge: an edge affordance can
	 * only ever mean "at the end", so it cannot express "after the row I am
	 * looking at".
	 *
	 * The new row/column is then SELECTED, not just inserted. The insertion point
	 * is worth confirming, and a freshly selected band is also where the user is
	 * about to type — the alternative is a new empty row that appears with no
	 * indication of which one it is.
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
	 * The copied band, or null.
	 *
	 * This is the component's own clipboard, deliberately separate from the
	 * system one. A band is a STRUCTURE — a run of cells with an axis, an
	 * alignment per column, a header — and a system clipboard only carries a flat
	 * string. Round-tripping the band through text would lose the axis and the
	 * alignment, and a "paste" that re-guessed them would paste something other
	 * than what was copied.
	 *
	 * The system clipboard is still written, as TSV, because that is what makes
	 * the copy useful OUTSIDE the editor: a column copied here pastes into a
	 * spreadsheet intact. The two are not redundant — one is for this table, one
	 * is for everything else.
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
		if (band.kind === 'row') {
			for (let r = band.from; r <= band.to; r++) {
				const row = [];
				for (let c = 0; c < colCount(table); c++) row.push(cellText(cellAt(table, r, c)));
				out.push(row);
			}
		} else {
			for (let c = band.from; c <= band.to; c++) {
				const col = [];
				// The header is row -1 and is part of a column: copying a column and
				// dropping its heading would leave a column with no label, which is
				// not a copy of anything the user could see.
				if (hasHeader(table)) col.push(cellText(cellAt(table, -1, c)));
				for (let r = 0; r < bodyRows(table).length; r++) col.push(cellText(cellAt(table, r, c)));
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
		const align = [];
		for (let c = 0; c < colCount(table); c++) {
			align.push(cellAt(table, hasHeader(table) ? -1 : 0, c)?.getAttribute('data-align') || 'left');
		}
		copied = { kind: band.kind, cells, align, from: band.from, to: band.to };
		// TSV for the system clipboard: a spreadsheet reads it as a grid, and the
		// component's own paste handler reads it as one too.
		const tsv = cells.map(row => row.join('\t')).join('\n');
		navigator.clipboard?.writeText?.(tsv)?.catch?.(() => {
			// Clipboard permission is not ours to assume. The band copy above has
			// already succeeded and is what the paste button uses, so a refused
			// system write costs the user the interop copy and nothing else. It is
			// worth a line: a silent failure here would look like Ctrl+C did nothing.
		});
		emit('content', { action: 'copy-band', kind: band.kind, rows: cells.length });
		updateZone();
		return true;
	}

	/**
	 * Insert a copy of the copied band adjacent to the current selection.
	 *
	 * `before` mirrors the insert buttons: plain pastes after the selection, Ctrl
	 * pastes before it. The copied band keeps its own size, so copying a three-row
	 * band pastes three rows — the band is the unit, not the single row under the
	 * pointer.
	 */
	function pasteBand(before) {
		if (!copied || !range) return;
		const n = copied.cells.length;
		if (copied.kind === 'row') {
			const at = before ? Math.max(0, range.minRow) : range.maxRow + 1;
			// `insertRowAt` inserts AT `at`, so the new row's index IS `at` -- there
			// is nothing to look up. The lookup that used to be here
			// (`bodyRows(table).indexOf(insertRowAt(at))`) returned -1, because
			// `tbody.rows` is a LIVE collection and re-reading it inside
			// `indexOf` resolved against a different snapshot than the one the
			// element was inserted into. The fill loop then indexed `bodyRows[-1]`,
			// got undefined, and the paste silently produced an EMPTY row that
			// looked exactly like a successful insert.
			//
			// This is the third time this file has been bitten by a live
			// HTMLCollection (see the reorder re-anchor), and the lesson is now
			// concrete: never ask a live collection where something is. Derive the
			// position from the operation that put it there, or hold the element.
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
			// Every column is inserted first, then filled. Filling as we go would
			// read the shifted grid and write each value one column further right
			// than it belongs -- and since `copied.cells[i]` is indexed by the
			// SOURCE column, the mismatch is silent: the paste appears to work and
			// lands one column off with the wrong heading.
			for (let i = 0; i < n; i++) insertColumn(at + i);
			for (let i = 0; i < n; i++) {
				// A column copy includes the header, so its cells run one longer
				// than the body rows. `cellAt` addresses row -1 for the header, so
				// the offset is applied by index rather than by slicing.
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
	 * Delete a BAND of rows, not one row. The handle spans the whole selection,
	 * so a handle covering three rows that removed only the first would be a lie
	 * about what it does — exactly as for the drag grip.
	 *
	 * A table must keep at least one body row: an empty tbody has no height to
	 * hover, so the editor would become unreachable. Removing the whole selection
	 * therefore CLEARS it rather than taking it away.
	 *
	 * The span is removed from the END backwards. Removing front-to-back would
	 * shift every later index and delete the wrong rows — the classic symptom.
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
		if (count >= cols) {
			for (const tr of [table.tHead?.rows[0], ...bodyRows(table)].filter(Boolean)) {
				for (let i = 0; i < tr.cells.length; i++) clearCell(tr.cells[i]);
			}
			emit('structure', { action: 'clear-columns', count });
			return;
		}
		for (const tr of [table.tHead?.rows[0], ...bodyRows(table)].filter(Boolean)) {
			for (let i = to; i >= from; i--) tr.cells[i]?.remove();
		}
		emit('structure', { action: 'delete-columns', count });
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
		// Row -1 is the header, so the body starts at 0 and the header must not be
		// reachable by walking DOWN into it. r0 is used as-is and clamped at the
		// top, not normalised to 0: doing that would make Enter from the header
		// select the first body row instead of staying put.
		let r = r0;
		let c = c0 + dc;
		const cols = colCount(table);
		// dr is the row axis and has to be applied. It used to be accepted and
		// dropped, so Enter and the up/down arrows moved nothing at all while
		// left/right worked -- the signature of a parameter that is never read.
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
		// Ctrl+C copies the BAND, but only when a whole row or column is selected
		// AND no text is selected. A user highlighting a word inside a cell to copy
		// it is doing ordinary text copy, and silently substituting a column copy
		// for that would be the more surprising failure of the two. The band copy
		// still writes to the system clipboard, so nothing is lost either way —
		// but a selection that is not a band leaves the key alone entirely.
		if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
			if (window.getSelection()?.toString()) return;
			if (copyBand()) e.preventDefault();
			return;
		}
		// Arrow keys move between cells only when the caret is not editing text;
		// otherwise they must stay available to the user's own cursor movement.
		if (e.key.startsWith('Arrow') && !window.getSelection()?.toString()) {
			const sel = window.getSelection();
			// "At the edge" is decided per axis. Collapsing a clone range to the
			// START of the cell contents makes it zero-length only when the caret
			// already sits at the very start, which is the test for the horizontal
			// axis. For the vertical axis that test is meaningless: a cell whose
			// caret sits mid-text still measures non-zero, so Up/Down never fired
			// and a vertical walk was impossible. Vertical movement is blocked only
			// while text is actually selected, which the guard above already
			// established, so it is always allowed.
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
			// SLOP: how far past the anchor cell's edge a drag may travel before it
			// is read as a cell-range sweep rather than a text selection.
			//
			// The two gestures genuinely conflict at the boundary: selecting text to
			// the end of a cell and sweeping a range over cells are the same
			// movement. Picking the cell range at the exact edge meant that
			// overshooting a word by two pixels destroyed the text selection and
			// selected cells instead -- which is not what anyone is trying to do
			// when they drag across one word.
			//
			// The hand naturally travels past the glyphs it just covered, so the
			// anchor cell is treated as larger than it renders, and a drag ending
			// inside that margin is still a text selection.
			//
			// The margin is a FRACTION OF THE CELL, not a pixel count. A fixed
			// number means two different things in a wide cell and a narrow one --
			// 30px is a sixth of one and half of the other -- so the same gesture
			// would be forgiving in some columns and broken in others, and it
			// would not follow the user's font size at all.
			//
			// A fraction of the cell also gets BOTH axes right from one number,
			// because cells are much wider than they are tall. On a 208x40 cell
			// this is 29px of slack sideways -- the figure the user chose by feel --
			// and only 6px vertically, which is the asymmetry actually wanted: a
			// drag along a line of text overshoots sideways, while a small
			// vertical tolerance stops an ordinary flick from becoming a range.
			//
			// Measured travel to the handoff is measured from wherever the drag
			// started, not from the cell's edge: a press at the cell centre has
			// 20px of cell below it, so it travels 20 + 6 = 26px down before the
			// range takes over.
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
	 *
	 * The edge bands are tested by their own geometry, not folded into the margin,
	 * because they extend FURTHER than it: each is 2.25rem (36px) against a 24px
	 * margin, so the outer 12px of the row band lies outside the neighbourhood.
	 * With a margin-only test, the band would switch the chrome off at the exact
	 * moment the pointer reached its far edge — the same failure enter/leave was
	 * rejected for, reintroduced through a number.
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
