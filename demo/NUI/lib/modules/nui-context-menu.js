/**
 * NUI Context Menu - Programmatic Context Menu Component
 * 
 * A lightweight, accessible context menu popup that can be triggered
 * via right-click or programmatically. Shares visual styling with nui-menu.
 * 
 * Usage:
 * const menu = nui.contextMenu([
 *     { label: 'Edit', items: [...] },
 *     { label: 'Copy', action: 'copy' },
 *     { type: 'separator' },
 *     { label: 'Delete', action: 'delete', disabled: true }
 * ], {
 *     onAction: (action, item) => console.log(action)
 * });
 * 
 * menu.show(x, y);
 * menu.showAt(element); // Aligns to element
 * menu.hide();
 * menu.destroy();
 * 
 * nui.contextMenu.closeAll();
 */

const ctx = {
	currentMenu: null,
	focusedIndex: -1,
	submenuStack: []
};

const SUBMENU_DELAY = 200;
let submenuTimer = null;

function contextMenu(items, options = {}) {
	if (ctx.currentMenu) {
		ctx.currentMenu.hide();
	}

	const menu = {
		items: items || [],
		options,
		element: null,
		dropdown: null,
		isOpen: false,
		triggerElement: null
	};

	menu.show = showAt;
	menu.showAt = showAt;
	menu.hide = hide;
	menu.destroy = destroy;

	function createDropdown() {
		const dropdown = document.createElement('div');
		dropdown.className = 'nui-menu-dropdown';
		dropdown.setAttribute('role', 'menu');
		dropdown.style.position = 'fixed';
		dropdown.style.zIndex = '9999';

		const list = document.createElement('ul');
		list.setAttribute('role', 'none');
		renderItems(list, menu.items, menu);
		dropdown.appendChild(list);

		return dropdown;
	}

	function renderItems(container, items, parentMenu) {
		items.forEach((item, index) => {
			if (item.type === 'separator') {
				const sep = document.createElement('li');
				sep.className = 'nui-menu-separator';
				sep.setAttribute('role', 'separator');
				container.appendChild(sep);
				return;
			}

			const li = document.createElement('li');
			li.setAttribute('role', 'none');
			li.dataset.index = index;

			const button = document.createElement('button');
			button.type = 'button';
			button.className = 'nui-menu-dropdown-item';
			button.setAttribute('role', 'menuitem');
			button.tabIndex = -1;
			button._itemData = item;
			button._parentMenu = parentMenu;

			const label = document.createElement('span');
			label.className = 'nui-menu-label';
			label.textContent = item.label;
			button.appendChild(label);

			if (item.disabled) {
				button.disabled = true;
				button.setAttribute('aria-disabled', 'true');
			}

			if (item.items && item.items.length > 0) {
				const arrow = document.createElement('span');
				arrow.className = 'nui-menu-arrow';
				arrow.textContent = '▸';
				button.appendChild(arrow);
				button.setAttribute('aria-haspopup', 'menu');
				button.setAttribute('aria-expanded', 'false');

				button.addEventListener('mouseenter', () => {
					clearTimeout(submenuTimer);
					submenuTimer = setTimeout(() => openSubmenu(button, item.items, parentMenu), SUBMENU_DELAY);
				});

				button.addEventListener('mouseleave', () => {
					clearTimeout(submenuTimer);
				});
			} else if (item.action) {
				button.addEventListener('click', () => {
					if (!item.disabled) {
						parentMenu.hide();
						if (parentMenu.options.onAction) {
							parentMenu.options.onAction(item.action, item);
						}
					}
				});
			}

			li.appendChild(button);
			container.appendChild(li);
		});
	}

	function openSubmenu(triggerButton, items, parentMenu) {
		const closestSubmenu = triggerButton.closest('.nui-menu-submenu');
		if (closestSubmenu && ctx.submenuStack.includes(closestSubmenu)) {
			const index = ctx.submenuStack.indexOf(closestSubmenu);
			closeSubmenusDeeperThan(index + 1);
		} else {
			closeAllSubmenus();
		}

		const dropdown = document.createElement('div');
		dropdown.className = 'nui-menu-dropdown nui-menu-submenu open';
		dropdown.setAttribute('role', 'menu');
		dropdown.style.position = 'fixed';

		const list = document.createElement('ul');
		list.setAttribute('role', 'none');
		renderItems(list, items, parentMenu);
		dropdown.appendChild(list);

		const triggerRect = triggerButton.getBoundingClientRect();
		const viewportWidth = window.innerWidth;
		const viewportHeight = window.innerHeight;

		let left = triggerRect.right + 4;
		let top = triggerRect.top;

		const submenuWidth = 200;
		const submenuHeight = 200;

		if (left + submenuWidth > viewportWidth - 20) {
			left = triggerRect.left - submenuWidth - 4;
		}

		if (top + submenuHeight > viewportHeight - 20) {
			top = viewportHeight - submenuHeight - 20;
		}

		dropdown.style.left = left + 'px';
		dropdown.style.top = top + 'px';

		document.body.appendChild(dropdown);
		ctx.submenuStack.push(dropdown);
		triggerButton.setAttribute('aria-expanded', 'true');
		triggerButton._activeSubmenu = dropdown;

		const menuItem = triggerButton._itemData;
		if (parentMenu.options.onSubmenuOpen && menuItem) {
			parentMenu.options.onSubmenuOpen(menuItem.label);
		}
	}

	function closeSubmenu(submenu) {
		if (!submenu) return;

		ctx.submenuStack = ctx.submenuStack.filter(s => s !== submenu);

		const triggers = document.querySelectorAll('[aria-expanded="true"][_activeSubmenu]');
		triggers.forEach(trigger => {
			if (trigger._activeSubmenu === submenu) {
				trigger.setAttribute('aria-expanded', 'false');
				trigger._activeSubmenu = null;
			}
		});

		const nestedSubmenus = submenu.querySelectorAll('.nui-menu-submenu');
		nestedSubmenus.forEach(nested => {
			if (nested.parentNode) {
				nested.parentNode.removeChild(nested);
			}
		});

		if (submenu.parentNode) {
			submenu.parentNode.removeChild(submenu);
		}
	}

	function closeAllSubmenus() {
		const submenusToClose = [...ctx.submenuStack];
		submenusToClose.forEach(submenu => closeSubmenu(submenu));
		ctx.submenuStack = [];
	}

	function closeSubmenusDeeperThan(level) {
		const submenusToClose = ctx.submenuStack.splice(level);
		submenusToClose.forEach(submenu => {
			const triggers = document.querySelectorAll('[aria-expanded="true"][_activeSubmenu]');
			triggers.forEach(trigger => {
				if (trigger._activeSubmenu === submenu) {
					trigger.setAttribute('aria-expanded', 'false');
					trigger._activeSubmenu = null;
				}
			});
			if (submenu.parentNode) {
				submenu.parentNode.removeChild(submenu);
			}
		});
	}

	function showAt(x, y, triggerEl) {
		if (menu.isOpen) {
			hide();
		}

		let left, top;

		if (typeof x === 'object' && x.nodeType === Node.ELEMENT_NODE) {
			triggerEl = x;
			const rect = x.getBoundingClientRect();
			left = rect.left;
			top = rect.bottom + 4;
		} else {
			left = x;
			top = y;
		}

		menu.triggerElement = triggerEl;
		menu.dropdown = createDropdown();
		menu.element = menu.dropdown;

		const viewportWidth = window.innerWidth;
		const viewportHeight = window.innerHeight;
		const menuWidth = 220;
		const menuHeight = 300;

		if (left + menuWidth > viewportWidth - 20) {
			left = viewportWidth - menuWidth - 20;
		}

		if (top + menuHeight > viewportHeight - 20) {
			top = viewportHeight - menuHeight - 20;
		}

		menu.dropdown.style.left = left + 'px';
		menu.dropdown.style.top = top + 'px';
		menu.dropdown.classList.add('open');

		document.body.appendChild(menu.dropdown);
		menu.isOpen = true;
		ctx.currentMenu = menu;
		ctx.focusedIndex = -1;

		setupEventListeners();
		setupScrollListeners();
		focusFirstItem();
	}

	function focusFirstItem() {
		const items = menu.dropdown.querySelectorAll('.nui-menu-dropdown-item:not(:disabled)');
		if (items.length > 0) {
			ctx.focusedIndex = 0;
			items[0].focus();
		}
	}

	function setupEventListeners() {
		menu._boundKeyHandler = handleKeydown;
		menu._boundClickOutside = handleClickOutside;
		menu._boundContextMenu = handleContextMenu;

		document.addEventListener('keydown', menu._boundKeyHandler);
		document.addEventListener('click', menu._boundClickOutside);
		document.addEventListener('contextmenu', menu._boundContextMenu);
	}

	function removeEventListeners() {
		if (menu._boundKeyHandler) {
			document.removeEventListener('keydown', menu._boundKeyHandler);
		}
		if (menu._boundClickOutside) {
			document.removeEventListener('click', menu._boundClickOutside);
		}
		if (menu._boundContextMenu) {
			document.removeEventListener('contextmenu', menu._boundContextMenu);
		}
		removeScrollListeners();
	}

	function setupScrollListeners() {
		if (!menu.triggerElement) return;

		menu._scrollParents = [];
		let el = menu.triggerElement;

		while (el && el !== document.body) {
			if (el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth) {
				const handler = () => hide();
				el.addEventListener('scroll', handler, { passive: true });
				menu._scrollParents.push({ el, handler });
			}
			el = el.parentElement;
		}

		const windowHandler = () => {
			if (menu.triggerElement && !menu.triggerElement.isConnected) {
				hide();
			}
		};
		window.addEventListener('resize', windowHandler, { passive: true });
		menu._windowHandler = windowHandler;
	}

	function removeScrollListeners() {
		if (menu._scrollParents) {
			menu._scrollParents.forEach(({ el, handler }) => {
				el.removeEventListener('scroll', handler);
			});
			menu._scrollParents = [];
		}
		if (menu._windowHandler) {
			window.removeEventListener('resize', menu._windowHandler);
			menu._windowHandler = null;
		}
	}

	function handleKeydown(e) {
		if (!menu.isOpen) return;

		const items = getMenuItems();
		const currentIndex = items.indexOf(document.activeElement);

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				if (currentIndex < items.length - 1) {
					const nextIndex = currentIndex < 0 ? 0 : currentIndex + 1;
					closeSubmenuIfOpenOnItem(items[currentIndex]);
					items[nextIndex].focus();
					ctx.focusedIndex = nextIndex;
				} else if (currentIndex === -1 && items.length > 0) {
					items[0].focus();
					ctx.focusedIndex = 0;
				}
				break;

			case 'ArrowUp':
				e.preventDefault();
				if (currentIndex > 0) {
					closeSubmenuIfOpenOnItem(items[currentIndex]);
					items[currentIndex - 1].focus();
					ctx.focusedIndex = currentIndex - 1;
				}
				break;

			case 'ArrowRight':
				e.preventDefault();
				const focused = document.activeElement;
				if (focused?.hasAttribute('aria-haspopup')) {
					const itemData = focused._itemData;
					if (itemData?.items) {
						openSubmenu(focused, itemData.items, menu);
						setTimeout(() => {
							const firstSubmenuItem = menu.dropdown.querySelector('.nui-menu-dropdown-item:not(:disabled)');
							firstSubmenuItem?.focus();
						}, 10);
					}
				}
				break;

			case 'ArrowLeft':
				e.preventDefault();
				if (ctx.submenuStack.length > 0) {
					const submenuToClose = ctx.submenuStack[ctx.submenuStack.length - 1];
					const trigger = document.querySelector('[aria-expanded="true"][_activeSubmenu]');
					closeSubmenu(submenuToClose);
					trigger?.focus();
				} else {
					hide();
				}
				break;

			case 'Enter':
				e.preventDefault();
				const activeItem = document.activeElement;
				if (activeItem && !activeItem.disabled) {
					const itemData = activeItem._itemData;
					if (itemData?.items) {
						openSubmenu(activeItem, itemData.items, menu);
					} else if (itemData?.action) {
						menu.hide();
						if (menu.options.onAction) {
							menu.options.onAction(itemData.action, itemData);
						}
					}
				}
				break;

			case 'Escape':
				e.preventDefault();
				hide();
				break;
		}
	}

	function handleClickOutside(e) {
		if (!menu.isOpen) return;

		const isInsideMenu = menu.dropdown?.contains(e.target);
		if (isInsideMenu) return;

		const isInsideAnySubmenu = ctx.submenuStack.some(submenu => submenu.contains(e.target));
		if (isInsideAnySubmenu) return;

		hide();
	}

	function handleContextMenu(e) {
		if (menu.dropdown?.contains(e.target)) {
			e.preventDefault();
		}
	}

	function getMenuItems() {
		if (!menu.dropdown) return [];
		if (ctx.submenuStack.length > 0) {
			const currentSubmenu = ctx.submenuStack[ctx.submenuStack.length - 1];
			return Array.from(currentSubmenu.querySelectorAll('.nui-menu-dropdown-item:not(:disabled)'));
		}
		return Array.from(menu.dropdown.querySelectorAll('.nui-menu-dropdown-item:not(:disabled)'));
	}

	function getCurrentContext() {
		if (ctx.submenuStack.length > 0) {
			return ctx.submenuStack[ctx.submenuStack.length - 1];
		}
		return menu.dropdown;
	}

	function closeSubmenuIfOpenOnItem(item) {
		if (!item) return;
		const itemData = item._itemData;
		if (itemData && !itemData.items && ctx.submenuStack.length > 0) {
			closeAllSubmenus();
		}
	}

	function hide() {
		if (!menu.isOpen) return;

		closeAllSubmenus();

		removeEventListeners();

		if (menu.dropdown && menu.dropdown.parentNode) {
			menu.dropdown.parentNode.removeChild(menu.dropdown);
		}

		menu.dropdown = null;
		menu.isOpen = false;
		ctx.currentMenu = null;
		ctx.focusedIndex = -1;
	}

	function destroy() {
		hide();
		menu.items = [];
		menu.options = {};
	}

	return menu;
}

contextMenu.closeAll = function () {
	if (ctx.currentMenu) {
		ctx.currentMenu.hide();
	}
};

export { contextMenu };
