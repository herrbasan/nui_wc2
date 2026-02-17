// nui-list.js - Virtualized list component with search, sort, and selection
// Migrated from reference/nui/nui_list.js (superList)
//
// Performance Notes:
// - Uses virtual scrolling: only renders visible items (~10-20) regardless of total count
// - Fixed mode (1000+ items): uses percentage-based scroll positioning
// - Theoretical max items: ~300,000 at 60px item height (limited by browser max element height)
//   - Firefox limit: ~17.9 million pixels → ~298K items at 60px
//   - Chrome limit: ~33.5 million pixels → ~559K items at 60px
// - Practical limits: memory for data objects, search/sort iteration speed

import { nui } from '../../nui.js';

// ################################# COMPONENT FACTORY

function createList(element, options) {
	const list = element;
	
	// Environment detection
	list.env = nui.util.detectEnv();
	
	// Core state
	list.data = options.data || [];
	list.clone = [];
	list.filtered = [];
	list.currentSearch = '';
	list.currentSort = null;
	list.currentOrder = 'up';
	list.last_sort = null;
	list.last_direction = null;
	list.lastSelect = null;
	list.registeredEvents = [];
	list.itemHeight = 60;
	list.maxVis = 0;
	list.offSet = 0;
	list.scrollPos = 0;
	list.lastScrollPos = -1;
	list.scrollProz = 0;
	list.lastScrollProz = -1;
	list.stop = false;
	list.mode = 'normal';
	list.scrollMute = false;
	
	// Options
	list.options = options;
	list.renderFn = options.render;
	list.eventCallback = options.events || (() => {});
	list.verbose = options.verbose || false;
	
	// Build UI structure
	buildStructure();
	
	// Initialize features
	if (options.search || options.sort) {
		initHeader();
	}
	
	if (options.footer) {
		initFooter();
	}
	
	// Log mode (auto-scroll to bottom)
	if (options.logmode) {
		log('List is in Log Mode');
		registerEvent(list.container, 'wheel', logWheelMute, { passive: true });
	}
	
	// Public API
	list.update = update;
	list.getSelection = getSelection;
	list.getSelectedListIndex = getSelectedListIndex;
	list.setSelection = setSelection;
	list.updateData = updateData;
	list.appendData = appendData;
	list.cleanUp = cleanUp;
	list.reset = reset;
	list.updateItem = updateItem;
	list.updateItems = updateItems;
	list.scrollToIndex = scrollToIndex;
	
	// Setup event listeners
	list.viewport.addEventListener('scroll', () => {
		list.scrollPos = list.viewport.scrollTop;
		const scrollRange = list.container.offsetHeight - list.viewport.offsetHeight;
		list.scrollProz = scrollRange > 0 ? list.scrollPos / scrollRange : 0;
	});
	
	if (list.fixedList) {
		list.fixedList.addEventListener('wheel', (e) => {
			e.preventDefault();
			list.viewport.scrollTop += e.deltaY;
			list.scrollPos = list.viewport.scrollTop;
		}, { passive: false });
	}
	
	registerEvent(window, 'resize', () => resize());
	registerEvent(list.container, 'click', containerClick);
	if (list.fixedList) {
		registerEvent(list.fixedList, 'click', containerClick);
	}
	
	function containerClick(e) {
		const item = e.target.closest('.nui-list-item');
		if (item && item.oidx !== undefined) {
			itemSelect(item, e);
		}
	}
	
	// Height checking interval
	list.checkHeight_interval = setInterval(checkHeight, 300);
	
	// Intersection observer for visibility
	list.observer = new IntersectionObserver((entries) => {
		if (entries[0].isIntersecting) {
			log('List is Visible');
			list.eventCallback({ target: list, type: 'visibility', value: true });
			list.stop = false;
			loop();
			resize(0);
		} else {
			log('List is Hidden');
			list.eventCallback({ target: list, type: 'visibility', value: false });
			list.stop = true;
		}
	}, { threshold: [0] });
	
	list.observer.observe(element);
	
	// Initialize data
	updateData();
	reset();
	
	// Defer initial render to ensure CSS is applied and viewport has dimensions
	requestAnimationFrame(() => {
		update(true);
		loop();

		// Fallback: if viewport has no height, retry after a short delay
		if (list.viewport.offsetHeight === 0) {
			setTimeout(() => {
				update(true);
			}, 100);
		}
	});
	
	return list;
	
	// ################################# STRUCTURE BUILDING
	
	function buildStructure() {
		list.innerHTML = `
			<div class="nui-list-header" style="display:none"></div>
			<div class="nui-list-body">
				<div class="nui-list-fixed" style="display:none"></div>
				<div class="nui-list-viewport">
					<div class="nui-list-container"></div>
				</div>
			</div>
			<div class="nui-list-footer" style="display:none"></div>
		`;
		
		list.header = list.querySelector('.nui-list-header');
		list.body = list.querySelector('.nui-list-body');
		list.viewport = list.querySelector('.nui-list-viewport');
		list.container = list.querySelector('.nui-list-container');
		list.fixedList = list.querySelector('.nui-list-fixed');
		list.footer = list.querySelector('.nui-list-footer');
	}
	
	// ################################# HEADER
	
	function initHeader() {
		list.header.style.display = '';
		
		let headerHTML = '<div class="nui-list-sort">';
		
		if (options.sort) {
			const sortDefault = options.sort_default || 0;
			list.currentSort = options.sort[sortDefault];
			list.currentOrder = options.sort_direction_default || 'up';
			const sortOptionsHtml = options.sort.map((s, i) =>
				`<option value="${i}"${i === sortDefault ? ' selected' : ''}>${s.label}</option>`
			).join('');
			
			headerHTML += `
				<label>Sort by:</label>
				<nui-select>
					<select aria-label="Sort by">
						${sortOptionsHtml}
					</select>
				</nui-select>
				<button class="nui-list-sort-direction ${list.currentOrder}" aria-label="Toggle sort direction">
					<nui-icon name="arrow"></nui-icon>
				</button>
			`;
		}
		
		headerHTML += '</div>';
		
		if (options.search) {
			headerHTML += `
				<nui-input type="search" placeholder="Search" clearable>
					<input type="search" placeholder="Search">
				</nui-input>
			`;
		}
		
		list.header.innerHTML = headerHTML;
		
		// Initialize sort select
		if (options.sort) {
			const select = list.header.querySelector('nui-select');
			const nativeSelect = select.querySelector('select');
			const handleSortChange = (value) => {
				const idx = parseInt(value, 10);
				if (Number.isNaN(idx)) return;
				list.currentSort = options.sort[idx];
				list.eventCallback({
					target: list,
					type: 'sort',
					index: idx,
					direction: list.currentOrder
				});
				filter();
			};
			
			select.addEventListener('nui-change', (e) => {
				const value = e.detail?.values?.[0];
				if (value !== undefined) handleSortChange(value);
			});
			
			if (nativeSelect) {
				nativeSelect.addEventListener('change', (e) => {
					handleSortChange(e.target.value);
				});
			}
			
			const sortDirBtn = list.header.querySelector('.nui-list-sort-direction');
			sortDirBtn.addEventListener('click', () => {
				list.currentOrder = list.currentOrder === 'up' ? 'down' : 'up';
				sortDirBtn.className = `nui-list-sort-direction ${list.currentOrder}`;
				
				const sortIndex = options.sort.indexOf(list.currentSort);
				list.eventCallback({
					target: list,
					type: 'sort',
					index: sortIndex,
					direction: list.currentOrder
				});
				filter();
			});
		}
		
		// Initialize search input
		if (options.search) {
			const searchInput = list.header.querySelector('nui-input[type="search"]');
			searchInput.addEventListener('nui-input', (e) => {
				clearTimeout(list.filter_timeout);
				list.currentSearch = e.detail?.value || '';
				list.eventCallback({ target: list, type: 'search_input', value: list.currentSearch });
				list.filter_timeout = setTimeout(filter, 100);
			});
		}
	}
	
	// ################################# FOOTER
	
	function initFooter() {
		list.footer.style.display = '';
		
		let footerHTML = `
			<div class="nui-list-footer-left"></div>
			<div class="nui-list-footer-center">
				<div class="nui-list-footer-info"></div>
			</div>
			<div class="nui-list-footer-right"></div>
		`;
		
		list.footer.innerHTML = footerHTML;
		
		const leftContainer = list.footer.querySelector('.nui-list-footer-left');
		const rightContainer = list.footer.querySelector('.nui-list-footer-right');
		list.footerInfo = list.footer.querySelector('.nui-list-footer-info');
		
		// Left buttons
		if (options.footer.buttons_left) {
			options.footer.buttons_left.forEach(btn => {
				const button = document.createElement('nui-button');
				if (btn.type) button.setAttribute('type', btn.type);
				button.innerHTML = `<button type="button">${btn.label}</button>`;
				button.addEventListener('click', btn.fnc);
				leftContainer.appendChild(button);
			});
		}
		
		// Right buttons
		if (options.footer.buttons_right) {
			options.footer.buttons_right.forEach(btn => {
				const button = document.createElement('nui-button');
				if (btn.type) button.setAttribute('type', btn.type);
				button.innerHTML = `<button type="button">${btn.label}</button>`;
				button.addEventListener('click', btn.fnc);
				rightContainer.appendChild(button);
			});
		}
	}
	
	// ################################# DATA MANAGEMENT
	
	function updateData(data, skip_filter = false) {
		if (data) {
			options.data = data;
			list.data = data;
		}
		
		list.clone = [];
		for (let i = 0; i < options.data.length; i++) {
			list.clone.push({
				oidx: i,
				el: null,
				data: options.data[i],
				selected: false
			});
		}
		
		reset();
		if (!skip_filter) {
			filter();
		} else {
			list.filtered = list.clone;
		}
		setContainerHeight();
		update(true);
	}
	
	function appendData() {
		if (list.clone.length < options.data.length) {
			for (let i = list.clone.length; i < options.data.length; i++) {
				list.clone.push({
					oidx: i,
					el: null,
					data: options.data[i],
					selected: false
				});
			}
			filter();
			setContainerHeight();
			update(true);
		}
	}
	
	function updateItem(idx, data, force = true) {
		if (data) {
			list.clone[idx].data = data;
		}
		list.clone[idx].el = null;
		list.clone[idx].selected = false;
		if (force) {
			update(true);
		}
	}
	
	function updateItems(ar, force = true) {
		for (let i = 0; i < ar.length; i++) {
			if (ar[i].idx !== undefined) {
				updateItem(ar[i].idx, ar[i].data, false);
			} else {
				updateItem(ar[i], null, false);
			}
		}
		if (force) {
			update(true);
		}
	}
	
	// ################################# FILTER & SORT
	
	function filter() {
		const bench = performance.now();
		
		if (options.search && list.currentSearch !== '') {
			const props = options.search.map(s => 'data.' + s.prop);
			list.filtered = nui.util.filter({
				data: list.clone,
				search: list.currentSearch,
				prop: props,
				ignore_case: true
			});
			clearChildren(list.container);
		} else {
			list.filtered = list.clone;
		}
		
		setContainerHeight();
		sort();
		list.lastSelect = null;
		reset();
		
		list.eventCallback({ target: list, type: 'list', value: 'filtered' });
		log(`Filter operation took ${Math.round(performance.now() - bench)} ms`);
		log(`Filtered Items: ${list.filtered.length}`);
	}
	
	function sort() {
		if (!options.sort || !list.currentSort) return;
		
		if (!list.last_direction) {
			list.last_direction = options.sort_direction_default || 'up';
		}
		
		const directionChanged = list.last_direction !== list.currentOrder;
		const columnChanged = list.last_sort !== list.currentSort;
		
		if (columnChanged || directionChanged) {
			if (directionChanged && !columnChanged) {
				// Just reverse
				list.filtered.reverse();
			} else {
				// Full sort
				nui.util.sortByKey(list.filtered, 'data.' + list.currentSort.prop, list.currentSort.numeric);
				if (list.currentOrder === 'down') {
					list.filtered.reverse();
				}
			}
			
			list.last_sort = list.currentSort;
			list.last_direction = list.currentOrder;
		}
	}
	
	function setContainerHeight() {
		const height = list.filtered.length * list.itemHeight;
		list.container.style.height = height + 'px';
	}

	// ################################# UTILITIES
	
	// Fast container clearing - removeChild loop is faster than innerHTML = ''
	function clearChildren(container) {
		while (container.firstChild) {
			container.removeChild(container.firstChild);
		}
	}

	// ################################# RENDERING
	
	function update(force = false) {
		const data = list.filtered;
		if (data.length === 0) {
			return;
		}

		// Determine mode (normal vs fixed for large lists)
		if (data.length < 1000 || list.env.isTouch) {
			list.mode = 'normal';
			list.fixedList.style.display = 'none';
			list.setAttribute('data-mode', 'normal');

			list.scrollPos = Math.round(list.viewport.scrollTop);

			// Log mode auto-scroll
			if (options.logmode && !list.scrollMute) {
				if (list.viewport.scrollTop + list.viewport.offsetHeight > list.container.offsetHeight - (list.itemHeight + 1)) {
					list.viewport.scrollTop = list.container.offsetHeight;
					list.scrollPos = list.viewport.scrollTop;
				}
			}

			if (list.scrollPos !== list.lastScrollPos || force) {
				list.maxVis = Math.ceil(list.viewport.offsetHeight / list.itemHeight) + 10;
				list.offSet = Math.floor(list.scrollPos / list.itemHeight) - 5;
				if (list.offSet < 0) list.offSet = 0;
				if (list.offSet > 0) list.offSet--;
				
				const startIdx = list.offSet;
				const endIdx = Math.min(list.maxVis + list.offSet, data.length);
				
				// Clear containers using fast removeChild loop
				clearChildren(list.container);
				clearChildren(list.fixedList);
				
				// Render visible items
				for (let i = startIdx; i < endIdx; i++) {
					if (!data[i].el) {
						data[i].el = renderItem(data[i]);
					}
					if (!data[i].el.parentNode) {
						appendItem(data[i].el);
					}

					// Update selection state
					if (data[i].selected) {
						data[i].el.classList.add('selected');
					} else {
						data[i].el.classList.remove('selected');
					}
					
					data[i].el.fidx = i;
					data[i].el.style.top = i * list.itemHeight + 'px';
				}
				
				list.lastScrollPos = list.scrollPos;
				list.lastScrollProz = -1;
			}
		} else {
			// Fixed mode for large lists
			list.mode = 'fixed';
			list.fixedList.style.display = 'block';
			list.setAttribute('data-mode', 'fixed');
			
			const scrollRange = list.container.offsetHeight - list.viewport.offsetHeight;
			list.scrollProz = scrollRange > 0 ? list.scrollPos / scrollRange : 0;
			
			if (list.scrollProz !== list.lastScrollProz || force) {
				list.maxVis = Math.ceil(list.viewport.offsetHeight / list.itemHeight) || 10;
				list.offSet = Math.round(list.scrollProz * list.filtered.length);
				if (list.offSet < 0) list.offSet = 0;
				if (list.offSet > list.filtered.length - list.maxVis) {
					list.offSet = list.filtered.length - list.maxVis;
				}
				
				const startIdx = list.offSet;
				const endIdx = Math.min(list.maxVis + list.offSet, list.filtered.length);
				
				// Debug fixed mode - log dimensions
				if (!list._fixedModeLogged) {
					console.warn('[nui-list] Fixed mode dimensions:',
						'viewportH=', list.viewport.offsetHeight,
						'containerH=', list.container.offsetHeight,
						'scrollRange=', scrollRange,
						'bodyH=', list.body?.offsetHeight,
						'listH=', list.offsetHeight,
						'startIdx=', startIdx,
						'endIdx=', endIdx
					);
					list._fixedModeLogged = true;
				}
				
				// Skip render if viewport has no height (not yet laid out)
				if (list.viewport.offsetHeight ===0) {
					return;
				}
				
				// Clear containers using fast removeChild loop
				clearChildren(list.container);
				clearChildren(list.fixedList);
				
				// Render visible items
				let pos_idx = 0;
				for (let i = startIdx; i < endIdx; i++) {
					if (!list.filtered[i].el) {
						list.filtered[i].el = renderItem(list.filtered[i]);
					}
					if (!list.filtered[i].el.parentNode) {
						appendItem(list.filtered[i].el);
					}

					// Update selection state
					if (list.filtered[i].selected) {
						list.filtered[i].el.classList.add('selected');
					} else {
						list.filtered[i].el.classList.remove('selected');
					}
					
					list.filtered[i].el.fidx = i;
					list.filtered[i].el.style.top = pos_idx * list.itemHeight + 'px';
					pos_idx++;
				}
				
				list.lastScrollProz = list.scrollProz;
				list.lastScrollPos = -1;
			}
		}
	}
	
	function renderItem(dataObj) {
		// renderFn is cached during initialization - no lookup needed
		const renderFn = list.renderFn;
		
		// Safety check - render function must exist
		if (typeof renderFn !== 'function') {
			console.error('[nui-list] render function is missing');
			const fallback = document.createElement('div');
			fallback.oidx = dataObj.oidx;
			fallback.style.position = 'absolute';
			fallback.classList.add('nui-list-item');
			fallback.textContent = `Item ${dataObj.oidx}`;
			return fallback;
		}
		
		const el = renderFn(dataObj.data);

		// Detach from DocumentFragment if created via fromHTML()
		// This ensures el.parentNode check works correctly in update()
		if (el?.parentNode?.nodeType === 11) {
			el.remove();
		}

		// Safety check - render function must return a DOM element
		if (!el) {
			console.error('[nui-list] render function returned null/undefined for', dataObj.data);
			const fallback = document.createElement('div');
			fallback.oidx = dataObj.oidx;
			fallback.style.position = 'absolute';
			fallback.classList.add('nui-list-item');
			fallback.textContent = `Item ${dataObj.oidx}`;
			return fallback;
		}
		
		el.oidx = dataObj.oidx;
		el.style.position = 'absolute';
		el.classList.add('nui-list-item');
		return el;
	}

	function appendItem(item) {
		if (list.mode === 'fixed') {
			list.fixedList.appendChild(item);
		} else {
			list.container.appendChild(item);
		}
		if (item.update) {
			if (item.update_delay) {
				item.timeout = setTimeout(() => checkIfVisible(item), item.update_delay);
			} else {
				checkIfVisible(item);
			}
		}
	}
	
	function checkIfVisible(el) {
		if (el.parentNode && el.update) {
			el.update();
		}
	}
	
	function reset() {
		log('Reset List');
		list.eventCallback({ target: list, type: 'list', value: 'reset' });
		
		if (options.logmode) {
			list.viewport.scrollTop = list.container.offsetHeight;
			list.scrollPos = list.viewport.scrollTop;
		} else {
			list.viewport.scrollTop = 0;
			list.scrollPos = 0;
		}
		
		list.lastScrollPos = -1;
		list.lastScrollProz = -1;
		clearSelection();
		
		if (list.footerInfo) {
			list.footerInfo.textContent = list.filtered?.length || 0;
		}
		
		resize(0);
	}
	
	// ################################# SELECTION
	
	function itemSelect(el, e) {
		const idx = el.fidx;
		const last = list.lastSelect !== null ? list.lastSelect : 0;
		
		if (e.altKey) {
			console.log(list.filtered[idx].data);
		} else if (e.shiftKey && !options.single) {
			const range = [idx, last].sort((a, b) => a - b);
			clearSelection();
			for (let i = range[0]; i <= range[1]; i++) {
				list.filtered[i].selected = true;
			}
			list.lastSelect = last;
		} else if (e.ctrlKey && !options.single) {
			list.filtered[idx].selected = !list.filtered[idx].selected;
			if (list.filtered[idx].selected) {
				list.lastSelect = idx;
			}
		} else {
			clearSelection();
			list.filtered[idx].selected = true;
			list.lastSelect = idx;
		}
		
		const selection = getSelection(true);
		if (list.footerInfo) {
			if (selection.length === 0) {
				list.footerInfo.textContent = list.clone.length;
			} else {
				list.footerInfo.textContent = `${selection.length} of ${list.filtered.length}`;
			}
		}
		
		list.eventCallback({
			target: list,
			currentTarget: el,
			type: 'selection',
			value: selection.length,
			items: selection
		});
		
		update(true);
	}
	
	function clearSelection() {
		for (let i = 0; i < list.clone.length; i++) {
			list.clone[i].selected = false;
		}
	}
	
	function getSelection(full = false) {
		const out = [];
		for (let i = 0; i < list.filtered.length; i++) {
			if (list.filtered[i].selected) {
				out.push(full ? list.filtered[i] : list.filtered[i].oidx);
			}
		}
		return out;
	}
	
	function getSelectedListIndex() {
		const out = [];
		for (let i = 0; i < list.filtered.length; i++) {
			if (list.filtered[i].selected) {
				out.push(i);
			}
		}
		return out;
	}
	
	function setSelection(idx) {
		clearSelection();
		if (!idx || idx > list.filtered.length - 1) idx = 0;
		if (!Array.isArray(idx)) idx = [idx];
		
		for (let i = 0; i < idx.length; i++) {
			list.filtered[idx[i]].selected = true;
		}
		scrollToIndex(idx[0]);
	}
	
	function scrollToIndex(index) {
		if (index < 0 || index >= list.filtered.length) return;
		
		if (list.mode === 'fixed') {
			const totalItems = list.filtered.length;
			const paddingItems = 2;
			const adjustedIndex = Math.max(0, index - paddingItems);
			const viewportRatio = adjustedIndex / Math.max(1, totalItems);
			const maxScrollTop = list.container.offsetHeight - list.viewport.offsetHeight;
			const targetPosition = Math.max(0, Math.min(maxScrollTop, viewportRatio * maxScrollTop));
			
			list.viewport.scrollTop = targetPosition;
			list.scrollPos = targetPosition;
			list.lastScrollPos = -1;
		} else {
			const itemPosition = index * list.itemHeight;
			const paddingItems = 2;
			const targetPosition = Math.max(0, itemPosition - (paddingItems * list.itemHeight));
			
			list.viewport.scrollTop = targetPosition;
			list.scrollPos = targetPosition;
			list.lastScrollPos = -1;
		}
		
		update(true);
	}
	
	// ################################# UTILITIES
	
	function checkHeight() {
		const container = list.mode === 'fixed' ? list.fixedList : list.container;
		if (container.firstChild) {
			const computed = window.getComputedStyle(container.firstChild);
			const height = container.firstChild.offsetHeight 
				+ parseInt(computed.marginTop) 
				+ parseInt(computed.marginBottom);
			
			if (height !== list.itemHeight) {
				log(`Item Height Changed: ${height}`);
				list.eventCallback({ target: list, type: 'height_change', value: height });
				list.itemHeight = height;
				setContainerHeight();
				update(true);
			}
		}
	}
	
	function resize(delay = 30) {
		clearTimeout(list.checkHeight_timeout);
		list.checkHeight_timeout = setTimeout(checkHeight, delay);
	}
	
	function registerEvent(target, event, fnc, options) {
		log(`Register Event: ${event} for`, target);
		list.registeredEvents.push({ target, event, fnc });
		target.addEventListener(event, fnc, options);
	}
	
	function logWheelMute() {
		if (!list.scrollMute) {
			clearTimeout(list.scrollMuteTimeout);
			list.scrollMute = true;
			list.scrollMuteTimeout = setTimeout(() => { list.scrollMute = false; }, 100);
		}
	}
	
	function log(...args) {
		if (list.verbose) {
			console.log('%c NUI-LIST ', 'background:#41658a; color:#fff;', ...args);
		}
	}
	
	function cleanUp() {
		log('CleanUp');
		list.eventCallback({ type: 'list_cleanUp', value: 'cleanup' });
		
		for (let i = 0; i < list.registeredEvents.length; i++) {
			const { target, event, fnc } = list.registeredEvents[i];
			target.removeEventListener(event, fnc);
			log(`Removed Event: ${event}`);
		}
		
		clearInterval(list.checkHeight_interval);
		list.container.innerHTML = '';
		list.container = null;
		list.filtered = [];
		list.clone = [];
		list.options = {};
		list.observer.disconnect();
	}
	
	function loop() {
		if (list.stop) return;
		update();
		requestAnimationFrame(loop);
	}
}

// ################################# CUSTOM ELEMENT

class NuiList extends HTMLElement {
	connectedCallback() {
		// Check for declarative template
		const template = this.querySelector('template[data-item]');
		if (template) {
			this._templateHTML = template.innerHTML.trim();
			template.remove();
		}
	}
	
	loadData(dataOrOptions) {
		// Support both patterns:
		// 1. Just array (uses template)
		// 2. Full options object with render function
		
		let options;
		
		if (Array.isArray(dataOrOptions)) {
			// Declarative pattern
			if (!this._templateHTML) {
				console.error('nui-list: Array data provided but no template found');
				return;
			}
			
			options = {
				data: dataOrOptions,
				render: (item) => this._renderFromTemplate(item)
			};
		} else {
			// Programmatic pattern
			options = dataOrOptions;
			
			// If no render function but has template, use template
			if (!options.render && this._templateHTML) {
				options.render = (item) => this._renderFromTemplate(item);
			}
		}
		
		// Create the list instance
		createList(this, options);
	}
	
	_renderFromTemplate(item) {
		let html = this._templateHTML;
		
		// Simple placeholder replacement {{key}}
		Object.keys(item).forEach(key => {
			html = html.replace(new RegExp(`{{${key}}}`, 'g'), item[key]);
		});
		
		return nui.util.dom.fromHTML(html);
	}
	
	disconnectedCallback() {
		if (this.cleanUp) {
			this.cleanUp();
		}
	}
}

customElements.define('nui-list', NuiList);

// Export for nui.components
nui.components = nui.components || {};
nui.components.list = { create: createList };

export default nui.components.list;

