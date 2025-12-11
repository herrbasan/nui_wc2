/**
 * NUI Menu - Addon Component
 * Menu bar with dropdown menus and nested submenus
 * 
 * Data Structure (same as link-list):
 * {
 *     items: [
 *         { label: 'File', items: [...] },
 *         { label: 'Open', action: 'open-file', shortcut: 'Ctrl+O' },
 *         { type: 'separator' },
 *         { label: 'Settings', disabled: true }
 *     ]
 * }
 * 
 * Usage:
 * const menu = document.createElement('nui-menu');
 * menu.loadData(menuData);
 * document.body.appendChild(menu);
 */

// Menu state machine
const MenuState = {
	CLOSED: 'closed',
	MENU_ACTIVE: 'menu-active',
	SUBMENU_PENDING: 'pending'
};

// Shared state (module scope)
let currentState = MenuState.CLOSED;
let activeMenuId = null;
let activeDropdown = null;
let submenuTimer = null;
let activeMenuElement = null;
const dropdownCache = new WeakMap(); // Element -> Map(menuId -> dropdown)

// Constants
const SUBMENU_DELAY = 300; // ms delay before opening submenu
const SUBMENU_ICON = '▸'; // Right arrow for submenus

class NuiMenu extends HTMLElement {
	connectedCallback() {
		setupMenu(this);
	}

	disconnectedCallback() {
		cleanupMenu(this);
	}

	loadData(data) {
		loadMenuData(this, data);
	}
}

function setupMenu(element) {
	element.classList.add('nui-menu');

	// Check if declarative HTML exists
	const existingNav = element.querySelector('nav');
	let nav;
	
	if (existingNav) {
		// Use existing nav and parse HTML structure
		nav = existingNav;
		nav.className = 'nui-menu-bar';
		// Store reference BEFORE parsing
		element._menuBar = nav;
		element._data = null;
		parseDeclarativeMenu(element, nav);
	} else {
		// Create nav wrapper for programmatic usage
		nav = document.createElement('nav');
		nav.className = 'nui-menu-bar';
		element.appendChild(nav);
		// Store reference for later
		element._menuBar = nav;
		element._data = null;
	}

	nav.setAttribute('role', 'menubar');

	// Event delegation for menu bar clicks
	nav.addEventListener('click', (e) => {
		const menuItem = e.target.closest('[data-menu-id]');
		if (menuItem) {
			handleMenuBarClick(element, menuItem.dataset.menuId);
		}
	});

	// Hover handling for menu switching
	nav.addEventListener('mouseover', (e) => {
		const menuItem = e.target.closest('[data-menu-id]');
		if (menuItem && currentState === MenuState.MENU_ACTIVE) {
			handleMenuBarHover(element, menuItem.dataset.menuId);
		}
	});

	// Global dismiss handler (setup once per menu)
	element._dismissHandler = (e) => {
		if (currentState !== MenuState.CLOSED && !e.target.closest('nui-menu') && !e.target.closest('.nui-menu-dropdown')) {
			closeAllMenus();
		}
	};

	element._keyHandler = (e) => {
		handleMenuKeyboard(e, element);
	};

	document.addEventListener('click', element._dismissHandler);
	element.addEventListener('keydown', element._keyHandler);
}

function parseDeclarativeMenu(element, nav) {
	// Parse HTML structure and convert to data structure
	const data = { items: [] };
	
	// Group buttons with their following ULs
	const children = Array.from(nav.children);
	let i = 0;
	
	while (i < children.length) {
		const item = children[i];
		
		if (item.tagName === 'BUTTON') {
			const menuItem = {
				label: item.textContent.trim()
			};
			
			// Check for disabled state
			if (item.hasAttribute('disabled')) {
				menuItem.disabled = true;
			}
			
			// Check if next sibling is a UL
			if (i + 1 < children.length && children[i + 1].tagName === 'UL') {
				menuItem.items = parseMenuItems(children[i + 1]);
				children[i + 1].style.display = 'none'; // Hide original UL
				i++; // Skip the UL in next iteration
			}
			
			data.items.push(menuItem);
		}
		
		i++;
	}
	
	// Clear the nav and rebuild with proper structure
	nav.innerHTML = '';
	
	// Now load the parsed data which will rebuild properly
	if (data.items.length > 0) {
		loadMenuData(element, data);
	}
}

function parseMenuItems(ul) {
	const items = [];
	
	Array.from(ul.children).forEach((li) => {
		if (li.classList.contains('separator') || li.tagName === 'HR') {
			items.push({ type: 'separator' });
			return;
		}
		
		const button = li.querySelector('button');
		if (!button) return;
		
		const item = {
			label: button.textContent.trim()
		};
		
		// Check for action attribute
		if (button.hasAttribute('data-action')) {
			item.action = button.getAttribute('data-action');
		}
		
		// Check for shortcut
		const shortcut = button.getAttribute('data-shortcut');
		if (shortcut) {
			item.shortcut = shortcut;
		}
		
		// Check for disabled
		if (button.hasAttribute('disabled')) {
			item.disabled = true;
		}
		
		// Check for nested submenu
		const submenu = li.querySelector('ul');
		if (submenu) {
			item.items = parseMenuItems(submenu);
		}
		
		items.push(item);
	});
	
	return items;
}

function cleanupMenu(element) {
	if (element._dismissHandler) {
		document.removeEventListener('click', element._dismissHandler);
	}
	if (element._keyHandler) {
		element.removeEventListener('keydown', element._keyHandler);
	}

	// Clean up dropdowns
	const elementDropdowns = dropdownCache.get(element);
	if (elementDropdowns) {
		elementDropdowns.forEach((dropdown) => {
			if (dropdown && dropdown.parentNode) {
				dropdown.parentNode.removeChild(dropdown);
			}
		});
		dropdownCache.delete(element);
	}
}

function loadMenuData(element, data) {
	element._data = data;
	const menuBar = element._menuBar;
	menuBar.innerHTML = '';

	if (!data || !data.items) return;

	// Render top-level menu items
	data.items.forEach((item, index) => {
		const menuId = `menu_${index}`;
		const button = document.createElement('button');
		button.type = 'button';
		button.className = 'nui-menu-item';
		button.textContent = item.label;
		button.setAttribute('data-menu-id', menuId);
		button.setAttribute('role', 'menuitem');
		button.setAttribute('aria-haspopup', 'true');
		button.setAttribute('aria-expanded', 'false');
		button.tabIndex = index === 0 ? 0 : -1;

		if (item.disabled) {
			button.disabled = true;
		}

		menuBar.appendChild(button);

		// Pre-create dropdown if item has children
		if (item.items && item.items.length > 0) {
			getOrCreateDropdown(element, menuId, item.items);
		}
	});
}

function getOrCreateDropdown(element, menuId, items) {
	// Get or create the element's dropdown map
	if (!dropdownCache.has(element)) {
		dropdownCache.set(element, new Map());
	}
	
	const elementDropdowns = dropdownCache.get(element);
	
	if (!elementDropdowns.has(menuId)) {
		const dropdown = document.createElement('div');
		dropdown.className = 'nui-menu-dropdown';
		dropdown.setAttribute('role', 'menu');
		dropdown.setAttribute('data-menu-id', menuId);

		// Render dropdown content
		const ul = document.createElement('ul');
		ul.setAttribute('role', 'none');
		items.forEach((item) => {
			ul.appendChild(renderMenuItem(item, element, menuId));
		});
		dropdown.appendChild(ul);

		// Append to menu element instead of body for relative positioning
		element.appendChild(dropdown);
		elementDropdowns.set(menuId, dropdown);
	}

	return elementDropdowns.get(menuId);
}

function renderMenuItem(item, element, parentMenuId) {
	const li = document.createElement('li');
	li.setAttribute('role', 'none');

	if (item.type === 'separator') {
		li.className = 'nui-menu-separator';
		li.setAttribute('role', 'separator');
		return li;
	}

	const button = document.createElement('button');
	button.type = 'button';
	button.className = 'nui-menu-dropdown-item';
	button.setAttribute('role', 'menuitem');
	button.tabIndex = -1;

	if (item.disabled) {
		button.disabled = true;
		button.setAttribute('aria-disabled', 'true');
	}

	// Label and shortcut
	const labelSpan = document.createElement('span');
	labelSpan.className = 'nui-menu-label';
	labelSpan.textContent = item.label;
	button.appendChild(labelSpan);

	if (item.shortcut) {
		const shortcutSpan = document.createElement('span');
		shortcutSpan.className = 'nui-menu-shortcut';
		shortcutSpan.textContent = item.shortcut;
		button.appendChild(shortcutSpan);
	}

	// Submenu indicator
	if (item.items && item.items.length > 0) {
		button.setAttribute('aria-haspopup', 'true');
		button.setAttribute('aria-expanded', 'false');
		const arrow = document.createElement('span');
		arrow.className = 'nui-menu-arrow';
		arrow.textContent = SUBMENU_ICON;
		button.appendChild(arrow);

		// Submenu hover with delay
		button.addEventListener('mouseenter', () => {
			clearTimeout(submenuTimer);
			submenuTimer = setTimeout(() => {
				openSubmenu(button, item.items, element);
			}, SUBMENU_DELAY);
		});

		button.addEventListener('mouseleave', () => {
			clearTimeout(submenuTimer);
		});
	} else if (item.action) {
		// Leaf item with action
		button.addEventListener('click', () => {
			handleMenuAction(element, item);
			closeAllMenus();
		});
	}

	li.appendChild(button);
	return li;
}

function openSubmenu(triggerButton, items, element) {
	// Close any existing submenu
	closeActiveSubmenu();

	const submenu = document.createElement('div');
	submenu.className = 'nui-menu-dropdown nui-menu-submenu';
	submenu.setAttribute('role', 'menu');

	const ul = document.createElement('ul');
	ul.setAttribute('role', 'none');
	items.forEach((item) => {
		ul.appendChild(renderMenuItem(item, element, null));
	});
	submenu.appendChild(ul);

	// Position relative to menu container
	const triggerRect = triggerButton.getBoundingClientRect();
	const menuRect = element.getBoundingClientRect();
	
	submenu.style.left = (triggerRect.right - menuRect.left) + 'px';
	submenu.style.top = (triggerRect.top - menuRect.top) + 'px';

	// Append to menu element for proper scrolling
	element.appendChild(submenu);
	submenu.classList.add('open');

	triggerButton.setAttribute('aria-expanded', 'true');
	triggerButton._activeSubmenu = submenu;

	// Check for overflow and reposition if needed
	setTimeout(() => {
		const submenuRect = submenu.getBoundingClientRect();
		if (submenuRect.right > window.innerWidth) {
			// Open to left instead
			submenu.style.left = (triggerRect.left - menuRect.left - submenuRect.width) + 'px';
		}
		if (submenuRect.bottom > window.innerHeight) {
			submenu.style.top = (window.innerHeight - menuRect.top - submenuRect.height) + 'px';
		}
	}, 0);
}

function closeActiveSubmenu() {
	document.querySelectorAll('.nui-menu-submenu').forEach((submenu) => {
		submenu.classList.remove('open');
		if (submenu.parentNode) {
			submenu.parentNode.removeChild(submenu);
		}
	});

	// Reset aria-expanded on triggers
	document.querySelectorAll('[aria-expanded="true"]').forEach((trigger) => {
		if (trigger._activeSubmenu) {
			trigger.setAttribute('aria-expanded', 'false');
			trigger._activeSubmenu = null;
		}
	});
}

function handleMenuBarClick(element, menuId) {
	const menuButton = element.querySelector(`[data-menu-id="${menuId}"]`);

	if (currentState === MenuState.CLOSED) {
		// Open menu and enter active state
		openMenu(element, menuId);
		currentState = MenuState.MENU_ACTIVE;
	} else if (activeMenuId === menuId) {
		// Toggle close
		closeAllMenus();
	} else {
		// Switch to different menu
		closeAllMenus();
		openMenu(element, menuId);
		currentState = MenuState.MENU_ACTIVE;
	}
}

function handleMenuBarHover(element, menuId) {
	if (currentState === MenuState.MENU_ACTIVE && activeMenuId !== menuId) {
		closeAllMenus();
		openMenu(element, menuId);
		currentState = MenuState.MENU_ACTIVE;
	}
}

function openMenu(element, menuId) {
	const elementDropdowns = dropdownCache.get(element);
	if (!elementDropdowns) return;
	
	const dropdown = elementDropdowns.get(menuId);
	if (!dropdown) return;

	const trigger = element.querySelector(`[data-menu-id="${menuId}"]`);
	if (!trigger) return;
	
	const triggerRect = trigger.getBoundingClientRect();
	const menuRect = element.getBoundingClientRect();

	// Position relative to menu container
	dropdown.style.left = (triggerRect.left - menuRect.left) + 'px';
	dropdown.style.top = (triggerRect.bottom - menuRect.top) + 'px';
	dropdown.classList.add('open');

	trigger.setAttribute('aria-expanded', 'true');
	trigger.classList.add('active');

	activeMenuId = menuId;
	activeDropdown = dropdown;
	activeMenuElement = element;
}

function closeAllMenus() {
	clearTimeout(submenuTimer);
	closeActiveSubmenu();

	if (activeDropdown) {
		activeDropdown.classList.remove('open');
		activeDropdown = null;
	}

	// Reset all menu buttons
	document.querySelectorAll('.nui-menu-item.active').forEach((btn) => {
		btn.classList.remove('active');
		btn.setAttribute('aria-expanded', 'false');
	});

	activeMenuId = null;
	currentState = MenuState.CLOSED;
}

function handleMenuAction(element, item) {
	// Dispatch custom event with action data
	element.dispatchEvent(new CustomEvent('nui-menu-action', {
		bubbles: true,
		detail: {
			action: item.action,
			item: item
		}
	}));
}

function handleMenuKeyboard(e, element) {
	const activeElement = document.activeElement;
	const isMenuBarItem = activeElement.classList.contains('nui-menu-item');
	const isDropdownItem = activeElement.classList.contains('nui-menu-dropdown-item');

	// Only handle if focus is on a menu bar item or dropdown item
	if (!isMenuBarItem && !isDropdownItem) return;

	if (e.key === 'ArrowLeft') {
		e.preventDefault();
		moveMenuBarFocus(element, -1);
	} else if (e.key === 'ArrowRight') {
		e.preventDefault();
		moveMenuBarFocus(element, 1);
	} else if (e.key === 'ArrowDown') {
		e.preventDefault();
		if (isMenuBarItem) {
			if (currentState === MenuState.CLOSED) {
				openMenu(element, activeElement.dataset.menuId);
				currentState = MenuState.MENU_ACTIVE;
			}
			focusDropdownItem(activeDropdown, 'first');
		} else if (isDropdownItem) {
			moveDropdownFocus(activeElement, 1);
		}
	} else if (e.key === 'ArrowUp') {
		e.preventDefault();
		if (isMenuBarItem) {
			if (currentState === MenuState.CLOSED) {
				openMenu(element, activeElement.dataset.menuId);
				currentState = MenuState.MENU_ACTIVE;
			}
			focusDropdownItem(activeDropdown, 'last');
		} else if (isDropdownItem) {
			moveDropdownFocus(activeElement, -1);
		}
	}
}

function moveMenuBarFocus(element, direction) {
	const items = Array.from(element.querySelectorAll('.nui-menu-bar > .nui-menu-item:not([disabled])'));
	let currentIndex;

	if (document.activeElement.classList.contains('nui-menu-item')) {
		currentIndex = items.indexOf(document.activeElement);
	} else {
		// In dropdown, find active menu id
		if (activeMenuId) {
			const currentBtn = element.querySelector(`[data-menu-id="${activeMenuId}"]`);
			currentIndex = items.indexOf(currentBtn);
		} else {
			return;
		}
	}
	
	if (currentIndex === -1) return;

	let nextIndex = currentIndex + direction;
	if (nextIndex < 0) nextIndex = items.length - 1;
	if (nextIndex >= items.length) nextIndex = 0;

	const nextItem = items[nextIndex];

	// Roving tabindex
	items.forEach(item => item.tabIndex = -1);
	nextItem.tabIndex = 0;
	nextItem.focus();

	// Handle open state switching
	if (currentState === MenuState.MENU_ACTIVE) {
		closeAllMenus();
		openMenu(element, nextItem.dataset.menuId);
		currentState = MenuState.MENU_ACTIVE;
	}
}

function moveDropdownFocus(currentItem, direction) {
	const dropdown = currentItem.closest('.nui-menu-dropdown');
	const items = Array.from(dropdown.querySelectorAll('.nui-menu-dropdown-item:not([disabled])'));
	const currentIndex = items.indexOf(currentItem);
	
	if (currentIndex === -1) return;
	
	let nextIndex = currentIndex + direction;
	if (nextIndex < 0) nextIndex = items.length - 1;
	if (nextIndex >= items.length) nextIndex = 0;
	
	items[nextIndex].focus();
}

function focusDropdownItem(dropdown, position) {
	if (!dropdown) return;
	setTimeout(() => {
		const items = Array.from(dropdown.querySelectorAll('.nui-menu-dropdown-item:not([disabled])'));
		if (items.length === 0) return;
		
		if (position === 'first') {
			items[0].focus();
		} else if (position === 'last') {
			items[items.length - 1].focus();
		}
	}, 0);
}

// Register component
if (typeof customElements !== 'undefined') {
	customElements.define('nui-menu', NuiMenu);
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
	module.exports = { NuiMenu };
}
