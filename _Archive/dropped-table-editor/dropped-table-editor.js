/**
 * NUI Table Editor Addon
 * Progressive enhancement for native tables providing in-cell editing,
 * row/column grips with reordering and context menus, edge add buttons,
 * header toggle, column alignment, and full keyboard navigation.
 * 
 * Follows NUI component pattern: thin custom element wrapper + pure setup function.
 */

/**
 * Creates a default 3x3 table with a header row
 * @returns {HTMLTableElement}
 */
function createDefaultTable() {
	const table = document.createElement('table');
	table.className = 'nui-table';
	
	const thead = document.createElement('thead');
	const headerRow = document.createElement('tr');
	for (let c = 0; c < 3; c++) {
		const th = document.createElement('th');
		th.textContent = `Header ${c + 1}`;
		headerRow.appendChild(th);
	}
	thead.appendChild(headerRow);
	table.appendChild(thead);

	const tbody = document.createElement('tbody');
	for (let r = 0; r < 2; r++) {
		const row = document.createElement('tr');
		for (let c = 0; c < 3; c++) {
			const td = document.createElement('td');
			td.textContent = `Cell ${r + 1}-${c + 1}`;
			row.appendChild(td);
		}
		tbody.appendChild(row);
	}
	table.appendChild(tbody);

	return table;
}

/**
 * Calculates bounding rect of an element relative to a container
 * @param {Element} elem 
 * @param {Element} container 
 * @returns {{top: number, left: number, width: number, height: number, bottom: number, right: number}}
 */
function getRelativeRect(elem, container) {
	const elemRect = elem.getBoundingClientRect();
	const containerRect = container.getBoundingClientRect();
	const scrollLeft = container === document.body ? window.pageXOffset : container.scrollLeft;
	const scrollTop = container === document.body ? window.pageYOffset : container.scrollTop;

	return {
		top: elemRect.top - containerRect.top + scrollTop,
		left: elemRect.left - containerRect.left + scrollLeft,
		width: elemRect.width,
		height: elemRect.height,
		bottom: elemRect.bottom - containerRect.top + scrollTop,
		right: elemRect.right - containerRect.left + scrollLeft
	};
}

/**
 * Enhances a native <table> in place.
 * Returns a controller object with destroy() and refresh().
 * 
 * @param {HTMLTableElement} table 
 * @param {Object} [options] 
 * @param {boolean} [options.inline] - If true, assumes contenteditable ancestor exists and skips cell contenteditable management.
 * @param {HTMLElement} [options.overlayContainer] - Element to host overlay chrome (defaults to host or parent outside contenteditable).
 * @returns {{ destroy: () => void, refresh: () => void }}
 */
function setupTableEditor(table, options = {}) {
	if (!table || table.nodeName !== 'TABLE') {
		throw new Error('setupTableEditor requires a <table> element');
	}

	// Avoid double-initialization on the same table
	if (table._nuiTableEditorController) {
		return table._nuiTableEditorController;
	}

	// Determine inline mode: true if explicitly set or if table has a contenteditable ancestor
	const isInline = Boolean(options.inline || table.closest('[contenteditable="true"]'));

	// Initial state setup: in standalone mode, enable contenteditable on cells
	function initCells() {
		if (isInline) return;
		Array.from(table.querySelectorAll('th, td')).forEach(cell => {
			if (!cell.hasAttribute('contenteditable')) {
				cell.setAttribute('contenteditable', 'true');
			}
		});
	}
	initCells();

	table.setAttribute('data-dropped-table-editor', '');

	// Determine overlay container (MUST be outside contenteditable to prevent serializing chrome into saved HTML)
	let overlayContainer = options.overlayContainer;
	if (!overlayContainer) {
		const hostEditor = table.closest('dropped-table-editor');
		const richTextContainer = table.closest('.nui-rich-text-container');
		if (hostEditor) {
			overlayContainer = hostEditor;
		} else if (richTextContainer) {
			overlayContainer = richTextContainer;
		} else {
			const ceAncestor = table.closest('[contenteditable="true"]');
			overlayContainer = ceAncestor ? (ceAncestor.parentElement || document.body) : (table.parentElement || document.body);
		}
	}

	// Ensure container has positioning context
	const containerComputedStyle = window.getComputedStyle(overlayContainer);
	if (containerComputedStyle.position === 'static' && overlayContainer !== document.body) {
		overlayContainer.style.position = 'relative';
	}

	// Build Chrome UI
	const chrome = document.createElement('div');
	chrome.className = 'dropped-table-editor-chrome';
	chrome.setAttribute('aria-hidden', 'true');

	// Multi-grip groups
	const colGripsGroup = document.createElement('div');
	colGripsGroup.className = 'dropped-table-editor-col-grips';
	chrome.appendChild(colGripsGroup);

	const rowGripsGroup = document.createElement('div');
	rowGripsGroup.className = 'dropped-table-editor-row-grips';
	chrome.appendChild(rowGripsGroup);

	// Edge Add Row Strip
	const addRowStrip = document.createElement('div');
	addRowStrip.className = 'dropped-table-editor-add-row-strip';
	addRowStrip.innerHTML = `
		<button type="button" class="dropped-table-editor-add-row-btn" title="Add row">
			<nui-icon name="add"></nui-icon>
			<span>Row</span>
		</button>
	`;
	chrome.appendChild(addRowStrip);

	// Edge Add Column Strip
	const addColStrip = document.createElement('div');
	addColStrip.className = 'dropped-table-editor-add-col-strip';
	addColStrip.innerHTML = `
		<button type="button" class="dropped-table-editor-add-col-btn" title="Add column">
			<nui-icon name="add"></nui-icon>
		</button>
	`;
	chrome.appendChild(addColStrip);

	// Floating Toolbar
	const toolbar = document.createElement('div');
	toolbar.className = 'dropped-table-editor-toolbar';
	toolbar.setAttribute('role', 'toolbar');
	toolbar.setAttribute('aria-label', 'Table actions');
	toolbar.innerHTML = `
		<button type="button" data-action="toggle-header" title="Toggle header row">
			<nui-icon name="table_rows"></nui-icon>
		</button>
		<div class="dropped-table-editor-separator"></div>
		<button type="button" data-action="align-left" title="Align left">
			<nui-icon name="format_image_left"></nui-icon>
		</button>
		<button type="button" data-action="align-center" title="Align center">
			<nui-icon name="format_image_front"></nui-icon>
		</button>
		<button type="button" data-action="align-right" title="Align right">
			<nui-icon name="format_image_right"></nui-icon>
		</button>
		<div class="dropped-table-editor-separator"></div>
		<button type="button" data-action="delete-table" title="Delete table">
			<nui-icon name="delete"></nui-icon>
		</button>
	`;
	chrome.appendChild(toolbar);

	// Context Menu Popover
	const menu = document.createElement('div');
	menu.className = 'dropped-table-editor-menu';
	menu.setAttribute('role', 'menu');
	chrome.appendChild(menu);

	// Drop Indicator Lines
	const dropLineRow = document.createElement('div');
	dropLineRow.className = 'dropped-table-editor-drop-line-row';
	dropLineRow.style.display = 'none';
	chrome.appendChild(dropLineRow);

	const dropLineCol = document.createElement('div');
	dropLineCol.className = 'dropped-table-editor-drop-line-col';
	dropLineCol.style.display = 'none';
	chrome.appendChild(dropLineCol);

	overlayContainer.appendChild(chrome);

	// Internal State
	let activeCell = null;
	let menuTarget = null; // { type: 'row' | 'col', index: number }
	let anchorCell = null;
	const selectedCells = new Set();
	let contentDebounceTimer = null;
	let hoverGraceTimer = null;
	let isDragging = false;
	let isDestroyed = false;

	// Prevent focus loss when clicking toolbar/menu buttons or grips
	chrome.addEventListener('mousedown', (e) => {
		const btn = e.target.closest('button, .dropped-table-editor-menu-item, .dropped-table-editor-row-grip, .dropped-table-editor-col-grip');
		if (btn) {
			e.preventDefault();
		}
	});

	// --- Dispatch Events ---
	function emitChange(type) {
		if (isDestroyed) return;
		table.dispatchEvent(new CustomEvent('nui-change', {
			bubbles: true,
			composed: true,
			detail: {
				type, // 'content' | 'structure' | 'align' | 'header'
				table
			}
		}));
	}

	function triggerContentChange() {
		if (contentDebounceTimer) clearTimeout(contentDebounceTimer);
		contentDebounceTimer = setTimeout(() => {
			emitChange('content');
		}, 300);
	}

	// --- Positioning & Reconciling Multi-Grips ---

	function refreshGripsAndStrips() {
		if (isDestroyed || !table.isConnected) return;
		const tableRect = getRelativeRect(table, overlayContainer);

		// 1. Position Add Strips
		addRowStrip.style.top = `${tableRect.bottom}px`;
		addRowStrip.style.left = `${tableRect.left}px`;
		addRowStrip.style.width = `${tableRect.width}px`;

		addColStrip.style.left = `${tableRect.right}px`;
		addColStrip.style.top = `${tableRect.top}px`;
		addColStrip.style.height = `${tableRect.height}px`;

		// 2. Reconcile Column Grips
		const firstRow = table.rows[0];
		const colCount = firstRow ? firstRow.cells.length : 0;
		const existingColGrips = Array.from(colGripsGroup.children);

		// Remove excess col grips
		while (existingColGrips.length > colCount) {
			existingColGrips.pop().remove();
		}
		// Add needed col grips
		while (existingColGrips.length < colCount) {
			const grip = document.createElement('div');
			grip.className = 'dropped-table-editor-col-grip';
			grip.title = 'Drag to move column, click for menu';
			grip.innerHTML = '<div class="grip-pill"><nui-icon class="grip-icon" name="drag_indicator"></nui-icon></div>';
			colGripsGroup.appendChild(grip);
			existingColGrips.push(grip);
		}

		// Position each column grip
		for (let c = 0; c < colCount; c++) {
			const cell = firstRow.cells[c];
			const grip = existingColGrips[c];
			if (cell && grip) {
				const cellRect = getRelativeRect(cell, overlayContainer);
				grip.style.top = `${tableRect.top}px`;
				grip.style.left = `${cellRect.left + (cellRect.width / 2)}px`;
				grip.dataset.colIndex = String(c);
			}
		}

		// 3. Reconcile Row Grips
		const rowCount = table.rows.length;
		const existingRowGrips = Array.from(rowGripsGroup.children);

		// Remove excess row grips
		while (existingRowGrips.length > rowCount) {
			existingRowGrips.pop().remove();
		}
		// Add needed row grips
		while (existingRowGrips.length < rowCount) {
			const grip = document.createElement('div');
			grip.className = 'dropped-table-editor-row-grip';
			grip.title = 'Drag to move row, click for menu';
			grip.innerHTML = '<div class="grip-pill"><nui-icon class="grip-icon" name="drag_indicator"></nui-icon></div>';
			rowGripsGroup.appendChild(grip);
			existingRowGrips.push(grip);
		}

		// Position each row grip
		for (let r = 0; r < rowCount; r++) {
			const row = table.rows[r];
			const grip = existingRowGrips[r];
			if (row && grip) {
				const rowRect = getRelativeRect(row, overlayContainer);
				grip.style.left = `${tableRect.left}px`;
				grip.style.top = `${rowRect.top + (rowRect.height / 2)}px`;
				grip.dataset.rowIndex = String(r);
			}
		}

		// 4. Update Toolbar if active
		if (activeCell && activeCell.isConnected) {
			updateToolbar();
		}
	}

	function updateToolbar() {
		if (!activeCell || !activeCell.isConnected) {
			toolbar.classList.remove('is-visible');
			return;
		}

		const cellRect = getRelativeRect(activeCell, overlayContainer);
		let top = cellRect.top - 8;
		let transform = 'translate(-50%, -100%)';
		if (cellRect.top - 44 < 0) {
			top = cellRect.bottom + 8;
			transform = 'translate(-50%, 0)';
		}

		toolbar.style.top = `${top}px`;
		toolbar.style.left = `${cellRect.left + (cellRect.width / 2)}px`;
		toolbar.style.transform = transform;
		toolbar.classList.add('is-visible');

		// Update button states
		const toggleHeaderBtn = toolbar.querySelector('[data-action="toggle-header"]');
		if (toggleHeaderBtn) {
			const hasThead = table.tHead && table.tHead.rows.length > 0;
			toggleHeaderBtn.classList.toggle('is-active', Boolean(hasThead));
		}

		// Alignment state of current column
		const currentAlign = activeCell.getAttribute('data-align') || 'left';
		toolbar.querySelector('[data-action="align-left"]')?.classList.toggle('is-active', currentAlign === 'left');
		toolbar.querySelector('[data-action="align-center"]')?.classList.toggle('is-active', currentAlign === 'center');
		toolbar.querySelector('[data-action="align-right"]')?.classList.toggle('is-active', currentAlign === 'right');
	}

	function hideMenu() {
		menu.classList.remove('is-visible');
		menuTarget = null;
	}

	function showControls() {
		if (hoverGraceTimer) {
			clearTimeout(hoverGraceTimer);
			hoverGraceTimer = null;
		}
		refreshGripsAndStrips();
		addRowStrip.classList.add('is-visible');
		addColStrip.classList.add('is-visible');
		colGripsGroup.querySelectorAll('.dropped-table-editor-col-grip').forEach(g => g.classList.add('is-visible'));
		rowGripsGroup.querySelectorAll('.dropped-table-editor-row-grip').forEach(g => g.classList.add('is-visible'));
	}

	function scheduleHideControls() {
		if (menu.classList.contains('is-visible') || isDragging) return;
		if (hoverGraceTimer) clearTimeout(hoverGraceTimer);
		hoverGraceTimer = setTimeout(() => {
			addRowStrip.classList.remove('is-visible');
			addColStrip.classList.remove('is-visible');
			colGripsGroup.querySelectorAll('.dropped-table-editor-col-grip').forEach(g => {
				g.classList.remove('is-visible');
				g.classList.remove('is-active');
			});
			rowGripsGroup.querySelectorAll('.dropped-table-editor-row-grip').forEach(g => {
				g.classList.remove('is-visible');
				g.classList.remove('is-active');
			});
			hoverGraceTimer = null;
		}, 200);
	}

	function isPointerNearTable(e) {
		if (!table.isConnected) return false;
		if (chrome.contains(e.target) || table.contains(e.target)) return true;
		const rect = table.getBoundingClientRect();
		const margin = 64; // 64px generous envelope around the table
		return (
			e.clientX >= rect.left - margin &&
			e.clientX <= rect.right + margin &&
			e.clientY >= rect.top - margin &&
			e.clientY <= rect.bottom + margin
		);
	}

	function onPointerMoveEnvelope(e) {
		if (isDestroyed) return;
		if (isPointerNearTable(e)) {
			showControls();

			// Highlight active column grip
			const firstRow = table.rows[0];
			if (firstRow) {
				Array.from(colGripsGroup.children).forEach((grip, idx) => {
					const cell = firstRow.cells[idx];
					if (cell) {
						const cr = cell.getBoundingClientRect();
						const isActive = e.clientX >= cr.left && e.clientX <= cr.right;
						grip.classList.toggle('is-active', isActive);
					}
				});
			}

			// Highlight active row grip
			Array.from(rowGripsGroup.children).forEach((grip, idx) => {
				const row = table.rows[idx];
				if (row) {
					const rr = row.getBoundingClientRect();
					const isActive = e.clientY >= rr.top && e.clientY <= rr.bottom;
					grip.classList.toggle('is-active', isActive);
				}
			});
		} else {
			scheduleHideControls();
		}
	}

	window.addEventListener('pointermove', onPointerMoveEnvelope);

	// --- Table Mutations ---

	function toggleHeaderRow() {
		const thead = table.tHead;
		if (thead && thead.rows.length > 0) {
			// Toggle OFF: Move thead row to top of tbody, convert th to td
			const headerRow = thead.rows[0];
			let tbody = table.tBodies[0];
			if (!tbody) {
				tbody = document.createElement('tbody');
				table.appendChild(tbody);
			}

			const newRow = document.createElement('tr');
			Array.from(headerRow.children).forEach(cell => {
				const td = document.createElement('td');
				td.innerHTML = cell.innerHTML;
				if (cell.hasAttribute('data-align')) {
					td.setAttribute('data-align', cell.getAttribute('data-align'));
				}
				newRow.appendChild(td);
			});

			tbody.insertBefore(newRow, tbody.firstChild);
			thead.remove();
		} else {
			// Toggle ON: Move first tbody row to thead, convert td to th
			const firstRow = table.rows[0];
			if (!firstRow) return;

			const newThead = document.createElement('thead');
			const headerRow = document.createElement('tr');

			Array.from(firstRow.children).forEach(cell => {
				const th = document.createElement('th');
				th.innerHTML = cell.innerHTML;
				if (cell.hasAttribute('data-align')) {
					th.setAttribute('data-align', cell.getAttribute('data-align'));
				}
				headerRow.appendChild(th);
			});

			newThead.appendChild(headerRow);
			table.insertBefore(newThead, table.firstChild);
			firstRow.remove();
		}

		initCells();
		emitChange('header');
		refresh();
	}

	function setColumnAlignment(colIndex, align) {
		if (colIndex < 0) return;
		Array.from(table.rows).forEach(row => {
			if (row.cells[colIndex]) {
				row.cells[colIndex].setAttribute('data-align', align);
			}
		});
		emitChange('align');
		updateToolbar();
	}

	function insertRow(atIndex) {
		let tbody = table.tBodies[0];
		if (!tbody) {
			tbody = document.createElement('tbody');
			table.appendChild(tbody);
		}

		// Count columns from existing rows
		const colCount = Math.max(...Array.from(table.rows).map(r => r.cells.length), 1);
		const newRow = document.createElement('tr');

		for (let c = 0; c < colCount; c++) {
			const td = document.createElement('td');
			td.innerHTML = '<br>';
			// Inherit column alignment if present
			const sampleCell = table.rows[0]?.cells[c];
			if (sampleCell && sampleCell.hasAttribute('data-align')) {
				td.setAttribute('data-align', sampleCell.getAttribute('data-align'));
			}
			newRow.appendChild(td);
		}

		if (atIndex !== undefined && atIndex >= 0 && atIndex < table.rows.length) {
			const refRow = table.rows[atIndex];
			refRow.parentNode.insertBefore(newRow, refRow);
		} else {
			tbody.appendChild(newRow);
		}

		initCells();
		emitChange('structure');
		refresh();
		return newRow;
	}

	function deleteRow(rowIndex) {
		if (rowIndex < 0 || rowIndex >= table.rows.length) return;
		const row = table.rows[rowIndex];
		const parent = row.parentNode;
		row.remove();

		// Clean up empty thead/tbody or delete table if empty
		if (parent && parent.children.length === 0 && parent.nodeName !== 'TABLE') {
			parent.remove();
		}
		if (table.rows.length === 0) {
			deleteTable();
			return;
		}

		emitChange('structure');
		refresh();
	}

	function insertColumn(atColIndex) {
		Array.from(table.rows).forEach(row => {
			const isHeader = row.parentNode && row.parentNode.nodeName === 'THEAD';
			const cell = document.createElement(isHeader ? 'th' : 'td');
			cell.innerHTML = '<br>';

			if (atColIndex !== undefined && atColIndex >= 0 && atColIndex < row.cells.length) {
				row.insertBefore(cell, row.cells[atColIndex]);
			} else {
				row.appendChild(cell);
			}
		});

		initCells();
		emitChange('structure');
		refresh();
	}

	function deleteColumn(colIndex) {
		if (colIndex < 0) return;
		Array.from(table.rows).forEach(row => {
			if (row.cells.length > colIndex) {
				row.cells[colIndex].remove();
			}
		});

		// If all columns removed, delete table
		if (table.rows.length > 0 && table.rows[0].cells.length === 0) {
			deleteTable();
			return;
		}

		emitChange('structure');
		refresh();
	}

	function deleteTable() {
		table.remove();
		emitChange('structure');
		destroy();
	}

	// --- Menu Construction ---

	function showRowMenu(rowIndex, anchorElem) {
		menu.innerHTML = `
			<button type="button" class="dropped-table-editor-menu-item" data-action="insert-row-above">
				<nui-icon name="add_row_above"></nui-icon>
				<span>Insert row above</span>
			</button>
			<button type="button" class="dropped-table-editor-menu-item" data-action="insert-row-below">
				<nui-icon name="add_row_below"></nui-icon>
				<span>Insert row below</span>
			</button>
			<div class="dropped-table-editor-separator"></div>
			<button type="button" class="dropped-table-editor-menu-item is-danger" data-action="delete-row">
				<nui-icon name="playlist_remove"></nui-icon>
				<span>Delete row</span>
			</button>
		`;
		menuTarget = { type: 'row', index: rowIndex };

		const anchorRect = getRelativeRect(anchorElem, overlayContainer);
		menu.style.top = `${anchorRect.bottom + 4}px`;
		menu.style.left = `${anchorRect.left}px`;
		menu.classList.add('is-visible');
	}

	function showColMenu(colIndex, anchorElem) {
		menu.innerHTML = `
			<button type="button" class="dropped-table-editor-menu-item" data-action="insert-col-left">
				<nui-icon name="add_column_left"></nui-icon>
				<span>Insert column left</span>
			</button>
			<button type="button" class="dropped-table-editor-menu-item" data-action="insert-col-right">
				<nui-icon name="add_column_right"></nui-icon>
				<span>Insert column right</span>
			</button>
			<div class="dropped-table-editor-separator"></div>
			<button type="button" class="dropped-table-editor-menu-item is-danger" data-action="delete-col">
				<nui-icon name="variable_remove"></nui-icon>
				<span>Delete column</span>
			</button>
		`;
		menuTarget = { type: 'col', index: colIndex };

		const anchorRect = getRelativeRect(anchorElem, overlayContainer);
		menu.style.top = `${anchorRect.bottom + 4}px`;
		menu.style.left = `${anchorRect.left}px`;
		menu.classList.add('is-visible');
	}

	// Handle menu action clicks
	menu.addEventListener('click', (e) => {
		const item = e.target.closest('.dropped-table-editor-menu-item');
		if (!item || !menuTarget) return;
		const action = item.getAttribute('data-action');

		if (menuTarget.type === 'row') {
			const r = menuTarget.index;
			if (action === 'insert-row-above') insertRow(r);
			else if (action === 'insert-row-below') insertRow(r + 1);
			else if (action === 'delete-row') deleteRow(r);
		} else if (menuTarget.type === 'col') {
			const c = menuTarget.index;
			if (action === 'insert-col-left') insertColumn(c);
			else if (action === 'insert-col-right') insertColumn(c + 1);
			else if (action === 'delete-col') deleteColumn(c);
		}

		hideMenu();
	});

	// Handle toolbar clicks
	toolbar.addEventListener('click', (e) => {
		const btn = e.target.closest('button[data-action]');
		if (!btn || !activeCell) return;
		const action = btn.getAttribute('data-action');
		const colIndex = activeCell.cellIndex;

		if (action === 'toggle-header') {
			toggleHeaderRow();
		} else if (action === 'align-left') {
			setColumnAlignment(colIndex, 'left');
		} else if (action === 'align-center') {
			setColumnAlignment(colIndex, 'center');
		} else if (action === 'align-right') {
			setColumnAlignment(colIndex, 'right');
		} else if (action === 'delete-table') {
			deleteTable();
		}
	});

	// Handle row grips clicks & drag
	rowGripsGroup.addEventListener('click', (e) => {
		const grip = e.target.closest('.dropped-table-editor-row-grip');
		if (grip && grip.dataset.rowIndex) {
			const r = parseInt(grip.dataset.rowIndex, 10);
			clearSelection();
			const row = table.rows[r];
			if (row) {
				Array.from(row.cells).forEach(cell => {
					cell.setAttribute('data-selected', 'true');
					selectedCells.add(cell);
				});
				activeCell = row.cells[0];
			}
			showRowMenu(r, grip);
		}
	});

	rowGripsGroup.addEventListener('pointerdown', (e) => {
		const grip = e.target.closest('.dropped-table-editor-row-grip');
		if (!grip || e.button !== 0 || !grip.dataset.rowIndex) return;
		e.preventDefault();
		hideMenu();

		const sourceIndex = parseInt(grip.dataset.rowIndex, 10);
		const sourceRow = table.rows[sourceIndex];
		if (!sourceRow) return;

		isDragging = true;
		let targetIndex = sourceIndex;
		dropLineRow.style.display = 'block';

		function onPointerMove(moveEvent) {
			let bestRow = null;
			let bestDist = Infinity;
			let insertAfter = false;

			Array.from(table.rows).forEach(row => {
				const rect = row.getBoundingClientRect();
				const midY = rect.top + (rect.height / 2);
				const dist = Math.abs(moveEvent.clientY - midY);
				if (dist < bestDist) {
					bestDist = dist;
					bestRow = row;
					insertAfter = moveEvent.clientY > midY;
				}
			});

			if (bestRow) {
				const bestRect = getRelativeRect(bestRow, overlayContainer);
				const tableRect = getRelativeRect(table, overlayContainer);
				const lineY = insertAfter ? bestRect.bottom : bestRect.top;

				dropLineRow.style.top = `${lineY}px`;
				dropLineRow.style.left = `${tableRect.left}px`;
				dropLineRow.style.width = `${tableRect.width}px`;

				targetIndex = bestRow.rowIndex + (insertAfter ? 1 : 0);
			}
		}

		function onPointerUp() {
			window.removeEventListener('pointermove', onPointerMove);
			window.removeEventListener('pointerup', onPointerUp);
			dropLineRow.style.display = 'none';
			isDragging = false;

			if (targetIndex !== sourceIndex && targetIndex !== sourceIndex + 1) {
				const targetRefRow = table.rows[targetIndex] || null;
				sourceRow.parentNode.insertBefore(sourceRow, targetRefRow);
				emitChange('structure');
				refresh();
			}
		}

		window.addEventListener('pointermove', onPointerMove);
		window.addEventListener('pointerup', onPointerUp);
	});

	// Handle col grips clicks & drag
	colGripsGroup.addEventListener('click', (e) => {
		const grip = e.target.closest('.dropped-table-editor-col-grip');
		if (grip && grip.dataset.colIndex) {
			const c = parseInt(grip.dataset.colIndex, 10);
			clearSelection();
			Array.from(table.rows).forEach(row => {
				const cell = row.cells[c];
				if (cell) {
					cell.setAttribute('data-selected', 'true');
					selectedCells.add(cell);
				}
			});
			activeCell = table.rows[0]?.cells[c] || null;
			showColMenu(c, grip);
		}
	});

	colGripsGroup.addEventListener('pointerdown', (e) => {
		const grip = e.target.closest('.dropped-table-editor-col-grip');
		if (!grip || e.button !== 0 || !grip.dataset.colIndex) return;
		e.preventDefault();
		hideMenu();

		const sourceColIndex = parseInt(grip.dataset.colIndex, 10);
		isDragging = true;
		let targetColIndex = sourceColIndex;
		dropLineCol.style.display = 'block';

		function onPointerMove(moveEvent) {
			const firstRow = table.rows[0];
			if (!firstRow) return;

			let bestCol = -1;
			let bestDist = Infinity;
			let insertAfter = false;

			Array.from(firstRow.cells).forEach((cell, idx) => {
				const rect = cell.getBoundingClientRect();
				const midX = rect.left + (rect.width / 2);
				const dist = Math.abs(moveEvent.clientX - midX);
				if (dist < bestDist) {
					bestDist = dist;
					bestCol = idx;
					insertAfter = moveEvent.clientX > midX;
				}
			});

			if (bestCol >= 0) {
				const targetCell = firstRow.cells[bestCol];
				const cellRect = getRelativeRect(targetCell, overlayContainer);
				const tableRect = getRelativeRect(table, overlayContainer);
				const lineX = insertAfter ? cellRect.right : cellRect.left;

				dropLineCol.style.left = `${lineX}px`;
				dropLineCol.style.top = `${tableRect.top}px`;
				dropLineCol.style.height = `${tableRect.height}px`;

				targetColIndex = bestCol + (insertAfter ? 1 : 0);
			}
		}

		function onPointerUp() {
			window.removeEventListener('pointermove', onPointerMove);
			window.removeEventListener('pointerup', onPointerUp);
			dropLineCol.style.display = 'none';
			isDragging = false;

			if (targetColIndex !== sourceColIndex && targetColIndex !== sourceColIndex + 1) {
				Array.from(table.rows).forEach(row => {
					const cellToMove = row.cells[sourceColIndex];
					if (!cellToMove) return;
					const refCell = row.cells[targetColIndex] || null;
					row.insertBefore(cellToMove, refCell);
				});
				emitChange('structure');
				refresh();
			}
		}

		window.addEventListener('pointermove', onPointerMove);
		window.addEventListener('pointerup', onPointerUp);
	});

	// Edge add buttons click
	addRowStrip.addEventListener('click', () => {
		insertRow();
	});

	addColStrip.addEventListener('click', () => {
		insertColumn();
	});

	// --- Selection Handling ---

	function clearSelection() {
		selectedCells.forEach(cell => {
			cell.removeAttribute('data-selected');
		});
		selectedCells.clear();
	}

	function selectCellRange(cellA, cellB) {
		clearSelection();
		if (!cellA || !cellB) return;

		const r1 = Math.min(cellA.parentElement.rowIndex, cellB.parentElement.rowIndex);
		const r2 = Math.max(cellA.parentElement.rowIndex, cellB.parentElement.rowIndex);
		const c1 = Math.min(cellA.cellIndex, cellB.cellIndex);
		const c2 = Math.max(cellA.cellIndex, cellB.cellIndex);

		for (let r = r1; r <= r2; r++) {
			const row = table.rows[r];
			if (!row) continue;
			for (let c = c1; c <= c2; c++) {
				const cell = row.cells[c];
				if (cell) {
					cell.setAttribute('data-selected', 'true');
					selectedCells.add(cell);
				}
			}
		}
	}

	// Cell Mousedown & Click
	table.addEventListener('mousedown', (e) => {
		const cell = e.target.closest('td, th');
		if (!cell || !table.contains(cell)) return;

		hideMenu();

		if (e.shiftKey && anchorCell) {
			e.preventDefault();
			selectCellRange(anchorCell, cell);
		} else {
			clearSelection();
			anchorCell = cell;
		}
	});

	table.addEventListener('focusin', (e) => {
		const cell = e.target.closest('td, th');
		if (!cell || !table.contains(cell)) return;

		activeCell = cell;
		updateToolbar();
	});

	table.addEventListener('focusout', (e) => {
		const cell = e.target.closest('td, th');
		if (!cell || !table.contains(cell)) return;

		setTimeout(() => {
			if (!table.contains(document.activeElement) && !chrome.contains(document.activeElement)) {
				toolbar.classList.remove('is-visible');
				activeCell = null;
			}
		}, 120);
	});

	// Input typing listener
	table.addEventListener('input', () => {
		triggerContentChange();
		refreshGripsAndStrips();
	});

	// --- Keyboard Navigation ---

	table.addEventListener('keydown', (e) => {
		const cell = e.target.closest('td, th');
		if (!cell || !table.contains(cell)) return;

		// Tab / Shift+Tab: move between cells
		if (e.key === 'Tab') {
			e.preventDefault();
			const allCells = Array.from(table.querySelectorAll('th, td'));
			const currentIndex = allCells.indexOf(cell);

			if (e.shiftKey) {
				if (currentIndex > 0) {
					allCells[currentIndex - 1].focus();
				}
			} else {
				if (currentIndex === allCells.length - 1) {
					// Tab on the last cell appends a row
					const newRow = insertRow();
					if (newRow && newRow.cells[0]) {
						newRow.cells[0].focus();
					}
				} else if (currentIndex >= 0 && currentIndex < allCells.length - 1) {
					allCells[currentIndex + 1].focus();
				}
			}
			return;
		}

		// Enter: move to same column, row below (appends row if at bottom)
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			const currentRowIndex = cell.parentElement.rowIndex;
			const colIndex = cell.cellIndex;

			if (currentRowIndex === table.rows.length - 1) {
				const newRow = insertRow();
				const targetCell = newRow?.cells[colIndex] || newRow?.cells[0];
				if (targetCell) targetCell.focus();
			} else {
				const nextRow = table.rows[currentRowIndex + 1];
				const targetCell = nextRow?.cells[colIndex] || nextRow?.cells[nextRow?.cells.length - 1];
				if (targetCell) targetCell.focus();
			}
			return;
		}

		// Arrow Keys at cell boundary
		if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
			const sel = window.getSelection();
			if (sel && sel.rangeCount > 0) {
				const range = sel.getRangeAt(0);
				const textLength = cell.textContent.length;
				const isAtStart = range.startOffset === 0 && range.collapsed;
				const isAtEnd = range.startOffset === textLength && range.collapsed;

				const currentRowIndex = cell.parentElement.rowIndex;
				const colIndex = cell.cellIndex;

				if (e.key === 'ArrowLeft' && isAtStart) {
					const allCells = Array.from(table.querySelectorAll('th, td'));
					const idx = allCells.indexOf(cell);
					if (idx > 0) {
						e.preventDefault();
						allCells[idx - 1].focus();
					}
				} else if (e.key === 'ArrowRight' && isAtEnd) {
					const allCells = Array.from(table.querySelectorAll('th, td'));
					const idx = allCells.indexOf(cell);
					if (idx >= 0 && idx < allCells.length - 1) {
						e.preventDefault();
						allCells[idx + 1].focus();
					}
				} else if (e.key === 'ArrowUp' && isAtStart) {
					if (currentRowIndex > 0) {
						e.preventDefault();
						const prevRow = table.rows[currentRowIndex - 1];
						prevRow?.cells[colIndex]?.focus();
					}
				} else if (e.key === 'ArrowDown' && isAtEnd) {
					if (currentRowIndex < table.rows.length - 1) {
						e.preventDefault();
						const nextRow = table.rows[currentRowIndex + 1];
						nextRow?.cells[colIndex]?.focus();
					}
				}
			}
		}

		// Escape: blur cell, select table as unit
		if (e.key === 'Escape') {
			e.preventDefault();
			if (!isInline) {
				cell.removeAttribute('contenteditable');
			}
			cell.blur();
			hideAllChrome();
			clearSelection();
			return;
		}

		// Delete / Backspace with range selection: clear selected cells contents
		if ((e.key === 'Delete' || e.key === 'Backspace') && selectedCells.size > 0) {
			e.preventDefault();
			selectedCells.forEach(selectedCell => {
				selectedCell.innerHTML = '<br>';
			});
			clearSelection();
			emitChange('content');
		}
	});

	// --- TSV Paste Handling ---

	table.addEventListener('paste', (e) => {
		const cell = e.target.closest('td, th');
		if (!cell || !table.contains(cell)) return;

		const clipboardText = e.clipboardData?.getData('text/plain');
		if (!clipboardText) return;

		// Check if clipboard has multiple cells (tab or newline)
		if (clipboardText.includes('\t') || clipboardText.includes('\n')) {
			e.preventDefault();

			const lines = clipboardText.split(/\r?\n/);
			if (lines.length > 1 && lines[lines.length - 1] === '') {
				lines.pop();
			}
			const tsv = lines.map(line => line.split('\t'));

			const startRowIndex = cell.parentElement.rowIndex;
			const startColIndex = cell.cellIndex;

			const requiredRows = startRowIndex + tsv.length;
			const maxNewCols = Math.max(...tsv.map(r => r.length));
			const requiredCols = startColIndex + maxNewCols;

			// Grow columns if needed
			const currentCols = Math.max(...Array.from(table.rows).map(r => r.cells.length));
			if (requiredCols > currentCols) {
				const colsToAdd = requiredCols - currentCols;
				for (let i = 0; i < colsToAdd; i++) {
					insertColumn();
				}
			}

			// Grow rows if needed
			while (table.rows.length < requiredRows) {
				insertRow();
			}

			// Populate pasted data
			for (let r = 0; r < tsv.length; r++) {
				const targetRow = table.rows[startRowIndex + r];
				if (!targetRow) continue;
				for (let c = 0; c < tsv[r].length; c++) {
					const targetCell = targetRow.cells[startColIndex + c];
					if (targetCell) {
						targetCell.textContent = tsv[r][c];
					}
				}
			}

			emitChange('content');
			refresh();
		}
	});

	// Document click listener to dismiss menu on outside click
	function onDocumentClick(e) {
		if (!menu.contains(e.target) && !rowGripsGroup.contains(e.target) && !colGripsGroup.contains(e.target)) {
			hideMenu();
		}
	}
	document.addEventListener('click', onDocumentClick);

	// Resize & Refresh
	function refresh() {
		if (isDestroyed || !table.isConnected) return;
		refreshGripsAndStrips();
	}

	window.addEventListener('resize', refresh);

	// Controller object
	function destroy() {
		if (isDestroyed) return;
		isDestroyed = true;

		if (contentDebounceTimer) clearTimeout(contentDebounceTimer);
		if (hoverGraceTimer) clearTimeout(hoverGraceTimer);

		window.removeEventListener('pointermove', onPointerMoveEnvelope);
		document.removeEventListener('click', onDocumentClick);
		window.removeEventListener('resize', refresh);

		// Clean up any remaining contenteditable
		Array.from(table.querySelectorAll('th, td')).forEach(c => {
			c.removeAttribute('contenteditable');
			c.removeAttribute('data-selected');
		});

		table.removeAttribute('data-dropped-table-editor');
		delete table._nuiTableEditorController;

		chrome.remove();
	}

	const controller = {
		destroy,
		refresh,
		table
	};

	table._nuiTableEditorController = controller;

	// Initial render of grips
	refreshGripsAndStrips();

	return controller;
}

/**
 * Custom Element wrapper for dropped-table-editor.
 * Enhances inner <table> or creates a default 3x3 table.
 */
class NuiTableEditor extends HTMLElement {
	connectedCallback() {
		let table = this.querySelector('table');
		if (!table) {
			table = createDefaultTable();
			this.appendChild(table);
		}

		this._controller = setupTableEditor(table, {
			overlayContainer: this,
			inline: false
		});
	}

	disconnectedCallback() {
		if (this._controller) {
			this._controller.destroy();
			this._controller = null;
		}
	}

	get table() {
		return this.querySelector('table');
	}

	refresh() {
		this._controller?.refresh();
	}
}

if (typeof customElements !== 'undefined' && !customElements.get('dropped-table-editor')) {
	customElements.define('dropped-table-editor', NuiTableEditor);
}

export { NuiTableEditor, setupTableEditor, createDefaultTable };
