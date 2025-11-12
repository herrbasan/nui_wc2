// NUI/nui.js - DOM-First UI Component Library

// =============================================================================
// COMPONENT FACTORY
// =============================================================================

const components = {};
const actions = {};
const config = {
	sanitizeActions: true,
	iconSpritePath: '/NUI/assets/material-icons-sprite.svg'
};

// =============================================================================
// THE KNOWER
// =============================================================================

const knower = {
	_states: null,
	_hooks: null,
	
	tell(id, state) {
		if (!this._states) this._states = new Map();
		
		const oldState = this._states.get(id);
		this._states.set(id, state);
		
		if (this._hooks) {
			const hooks = this._hooks.get(id);
			if (hooks) {
				hooks.forEach(handler => handler(state, oldState));
			}
		}
	},
	
	know(id) {
		return this._states?.get(id);
	},
	
	watch(id, handler) {
		if (!this._hooks) this._hooks = new Map();
		if (!this._hooks.has(id)) {
			this._hooks.set(id, new Set());
		}
		this._hooks.get(id).add(handler);
		
		const currentState = this._states?.get(id);
		if (currentState !== undefined) {
			handler(currentState, undefined);
		}
		
		return () => this.unwatch(id, handler);
	},
	
	unwatch(id, handler) {
		if (!this._hooks) return;
		const hooks = this._hooks.get(id);
		if (hooks) {
			hooks.delete(handler);
			if (hooks.size === 0) {
				this._hooks.delete(id);
			}
		}
	},
	
	knowAll() {
		return this._states ? Object.fromEntries(this._states) : {};
	},
	
	forget() {
		this._states = null;
		this._hooks = null;
	}
};

// =============================================================================
// ATTRIBUTE PROXY SYSTEM
// =============================================================================
//   setupAttributeProxy(element, {
//     'attribute-name': (newValue, oldValue) => { /* handle change */ }
//   });
//
// Supported attribute changes:
//   element.setAttribute('name', 'value')     ✅ Caught

function setupAttributeProxy(element, handlers = {}) {
	const original = {
		setAttribute: element.setAttribute.bind(element),
		removeAttribute: element.removeAttribute.bind(element),
		toggleAttribute: element.toggleAttribute.bind(element)
	};
	
	element.setAttribute = function(name, value) {
		const oldValue = this.getAttribute(name);
		original.setAttribute(name, value);
		
		if (handlers[name]) {
			handlers[name](value, oldValue);
		}
	};
	
	element.removeAttribute = function(name) {
		const oldValue = this.getAttribute(name);
		original.removeAttribute(name);
		
		if (handlers[name]) {
			handlers[name](null, oldValue);
		}
	};
	
	element.toggleAttribute = function(name, force) {
		const oldValue = this.hasAttribute(name);
		const result = original.toggleAttribute(name, force);
		const newValue = this.hasAttribute(name);
		
		if (handlers[name] && oldValue !== newValue) {
			handlers[name](newValue ? '' : null, oldValue ? '' : null);
		}
		
		return result;
	};
	
	element._originalAttributeMethods = original;
	
	return original;
}

function defineAttributeProperty(element, propName, attrName = propName) {
	Object.defineProperty(element, propName, {
		get() {
			return this.getAttribute(attrName);
		},
		set(value) {
			if (value === null || value === undefined) {
				this.removeAttribute(attrName);
			} else {
				this.setAttribute(attrName, value);
			}
		},
		enumerable: true,
		configurable: true
	});
}

function createComponent(tagName, setupFn, cleanupFn) {
	return class extends HTMLElement {
		connectedCallback() {
			processEventAttributes(this);
			setupFn?.(this);
		}
		disconnectedCallback() {
			if (this._originalAttributeMethods) {
				this.setAttribute = this._originalAttributeMethods.setAttribute;
				this.removeAttribute = this._originalAttributeMethods.removeAttribute;
				this.toggleAttribute = this._originalAttributeMethods.toggleAttribute;
				delete this._originalAttributeMethods;
			}
			cleanupFn?.(this);
		}
	};
}

function registerComponent(tagName, setupFn, cleanupFn = null) {
	components[tagName] = {
		class: createComponent(tagName, setupFn, cleanupFn),
		setup: setupFn,
		cleanup: cleanupFn
	};
}

function registerLayoutComponent(tagName) {
	components[tagName] = {
		class: createComponent(tagName),
		setup: () => {},
		cleanup: () => {}
	};
}

// =============================================================================
// ATTRIBUTE SYSTEM - EVENT ACTIONS
// =============================================================================

function sanitizeInput(input) {
	if (!input) return '';
	if (!config.sanitizeActions) return input;
	// Remove potentially dangerous characters and patterns
	return input
		.replace(/[<>'"]/g, '')
		.replace(/javascript:/gi, '')
		.replace(/on\w+=/gi, '')
		.trim();
}

function processEventAttributes(element) {
	Array.from(element.attributes).forEach(attr => {
		if (attr.name.startsWith('nui-event-')) {
			const eventType = sanitizeInput(attr.name.replace('nui-event-', ''));
			const actionSpec = sanitizeInput(attr.value);
			
			// Skip if sanitization removed everything
			if (!eventType || !actionSpec) return;
			
			element.addEventListener(eventType, (e) => {
				executeAction(actionSpec, element, e);
			});
		}
	});
}

function executeAction(actionSpec, element, event) {
	// Parse: "action" or "action:param" or "action:param@selector"
	const [actionPart, selector] = actionSpec.split('@');
	const [actionName, param] = actionPart.split(':');
	
	// Sanitize components
	const safeActionName = sanitizeInput(actionName);
	const safeParam = sanitizeInput(param);
	const safeSelector = sanitizeInput(selector);
	
	// Validate selector is safe (basic CSS selector only)
	if (config.sanitizeActions && safeSelector && !/^[a-zA-Z0-9\s\-_.#\[\]=,>+~:()]+$/.test(safeSelector)) {
		console.warn(`Invalid selector: "${selector}"`);
		return;
	}
	
	const target = safeSelector ? document.querySelector(safeSelector) : element;
	
	if (actions[safeActionName]) {
		actions[safeActionName](target, element, event, safeParam);
	} else {
		console.warn(`Action "${safeActionName}" not registered`);
	}
}

// =============================================================================
// BUILT-IN ACTIONS
// =============================================================================

actions['toggle-theme'] = (target, source, event, param) => {
	const root = document.documentElement;
	const currentScheme = root.style.colorScheme || 
		getComputedStyle(root).colorScheme || 'light dark';
	
	// Toggle between light and dark (forcing explicit preference)
	if (currentScheme.includes('dark') && !currentScheme.includes('light')) {
		// Currently forced dark → switch to light
		root.style.colorScheme = 'light';
		localStorage.setItem('nui-theme', 'light');
	} else if (currentScheme.includes('light') && !currentScheme.includes('dark')) {
		// Currently forced light → switch to dark
		root.style.colorScheme = 'dark';
		localStorage.setItem('nui-theme', 'dark');
	} else {
		// Auto mode → force dark (most common toggle behavior)
		const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		root.style.colorScheme = prefersDark ? 'light' : 'dark';
		localStorage.setItem('nui-theme', prefersDark ? 'light' : 'dark');
	}
};

actions['toggle-class'] = (target, source, event, className) => {
	if (target && className) {
		target.classList.toggle(className);
	}
};

actions['add-class'] = (target, source, event, className) => {
	if (target && className) {
		target.classList.add(className);
	}
};

actions['remove-class'] = (target, source, event, className) => {
	if (target && className) {
		target.classList.remove(className);
	}
};

actions['toggle-attr'] = (target, source, event, attrName) => {
	if (target && attrName) {
		if (target.hasAttribute(attrName)) {
			target.removeAttribute(attrName);
		} else {
			target.setAttribute(attrName, '');
		}
	}
};

actions['set-attr'] = (target, source, event, attrSpec) => {
	if (target && attrSpec) {
		const [name, value] = attrSpec.split('=');
		target.setAttribute(name, value || '');
	}
};

actions['remove-attr'] = (target, source, event, attrName) => {
	if (target && attrName) {
		target.removeAttribute(attrName);
	}
};


// =============================================================================
// ACCESSIBILITY UTILITIES
// =============================================================================

const a11y = {
	hasLabel(element) {
		return element.hasAttribute('aria-label') || 
		       element.hasAttribute('aria-labelledby') ||
		       element.hasAttribute('title');
	},
	
	hasFocusableChild(element) {
		return element.querySelector('button, a[href], input, select, textarea, [tabindex]');
	},
	
	getTextLabel(element) {
		const span = element.querySelector('span');
		return span ? span.textContent.trim() : element.textContent.trim();
	},
	
	makeInteractive(element, label = null) {
		const nativeButton = element.querySelector('button');
		const nativeLink = element.querySelector('a[href]');
		const hasFocusable = this.hasFocusableChild(element);
		
		const target = nativeButton || nativeLink || element;
		
		if (!nativeButton && !nativeLink && !element.hasAttribute('role')) {
			element.setAttribute('role', 'button');
		}
		
		if (!hasFocusable && !element.hasAttribute('tabindex')) {
			element.setAttribute('tabindex', '0');
		}
		
		if (label && !this.hasLabel(target)) {
			target.setAttribute('aria-label', label);
		}
		
		return target;
	},
	
	generateIconLabel(iconName, element) {
		const label = iconName
			.split(/[_-]/)
			.map(word => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
		
		const parentNav = element.closest('nui-top-nav, nui-side-nav, nav, header');
		return parentNav ? `${label} navigation` : label;
	},
	
	ensureButtonLabel(button) {
		if (this.hasLabel(button)) return;
		
		const visibleText = Array.from(button.childNodes)
			.filter(node => node.nodeType === Node.TEXT_NODE)
			.map(node => node.textContent.trim())
			.join(' ');
		
		if (visibleText) return;
		
		const icon = button.querySelector('nui-icon');
		if (icon) {
			const iconName = icon.getAttribute('name');
			if (iconName) {
				const label = this.generateIconLabel(iconName, button);
				button.setAttribute('aria-label', label);
				console.warn(
					`Icon-only button missing aria-label. Auto-generated: "${label}". ` +
					`Consider adding explicit aria-label.`,
					button
				);
			}
		}
	},
	
	ensureLandmarkLabel(landmark, fallbackLabel = 'Navigation') {
		if (this.hasLabel(landmark)) return;
		
		const heading = landmark.querySelector('h1, h2, h3, h4, h5, h6');
		if (heading) {
			const id = heading.id || `nav-${Math.random().toString(36).substr(2, 9)}`;
			if (!heading.id) heading.id = id;
			landmark.setAttribute('aria-labelledby', id);
		} else {
			landmark.setAttribute('aria-label', fallbackLabel);
			console.warn(`Landmark missing aria-label. Adding: "${fallbackLabel}"`, landmark);
		}
	},
	
	upgrade(element) {
		// Ensure all buttons have labels
		element.querySelectorAll('button').forEach(btn => this.ensureButtonLabel(btn));
		
		// Ensure clickable non-semantic elements have role
		element.querySelectorAll('[onclick], [nui-event-click]').forEach(el => {
			if (el.tagName !== 'BUTTON' && el.tagName !== 'A' && !this.hasFocusableChild(el)) {
				if (!el.hasAttribute('role')) {
					el.setAttribute('role', 'button');
					el.setAttribute('tabindex', '0');
					console.warn('Non-semantic clickable element. Adding role="button".', el);
				}
			}
		});
		
		// Ensure landmarks have labels
		element.querySelectorAll('nav, [role="navigation"]').forEach(nav => {
			this.ensureLandmarkLabel(nav);
		});
	}
};

// Legacy wrapper for backward compatibility
function upgradeAccessibility(element) {
	a11y.upgrade(element);
}

// =============================================================================
// COMPONENT REGISTRATION
// =============================================================================

// Core components
registerComponent('nui-button', (element) => {
	const button = element.querySelector('button');
	if (!button) return;
	
	upgradeAccessibility(element);
	
	button.addEventListener('click', (e) => {
		element.dispatchEvent(new CustomEvent('nui-click', {
			bubbles: true,
			detail: { source: element }
		}));
	});
});

registerComponent('nui-icon', (element) => {
	const name = element.getAttribute('name');
	if (!name) {
		console.warn('nui-icon: Missing "name" attribute');
		return;
	}
	
	element.setAttribute('aria-hidden', 'true');
	
	// Remove placeholder text content (for plain HTML fallback)
	if (element.textContent.trim()) {
		element.textContent = '';
	}
	
	// Create SVG element if it doesn't exist
	let svg = element.querySelector('svg');
	if (!svg) {
		svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		svg.setAttribute('width', '24');
		svg.setAttribute('height', '24');
		svg.setAttribute('viewBox', '0 0 24 24');
		svg.setAttribute('fill', 'currentColor');
		// Accessibility: Mark SVG as decorative
		svg.setAttribute('aria-hidden', 'true');
		svg.setAttribute('focusable', 'false');
		element.appendChild(svg);
	}
	
	// Create or update use element
	let use = svg.querySelector('use');
	if (!use) {
		use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
		svg.appendChild(use);
	}
	
	// Function to update icon
	const updateIcon = (iconName) => {
		if (iconName) {
			use.setAttribute('href', `${config.iconSpritePath}#${iconName}`);
		} else {
			use.setAttribute('href', '');
		}
	};
	
	// Set initial icon
	updateIcon(name);
	
	// Setup attribute proxy - standard pattern for all components
	setupAttributeProxy(element, {
		'name': (newValue, oldValue) => {
			updateIcon(newValue);
		}
	});
	
	// Optional: Create property accessor for convenience
	defineAttributeProperty(element, 'iconName', 'name');
});

// App layout components
registerComponent('nui-app', (element) => {
	function getBreakpoint(element) {
		const sideNav = element.querySelector('nui-side-nav');
		if (!sideNav) return null;
		
		const forceBreakpoint = element.getAttribute('nui-vars-sidebar_force-breakpoint');
		if (!forceBreakpoint) return 768;
		
		const match = forceBreakpoint.match(/^(\d+(?:\.\d+)?)(px|rem|em)?$/);
		if (!match) return 768;
		
		const value = parseFloat(match[1]);
		const unit = match[2] || 'px';
		
		if (unit === 'rem' || unit === 'em') {
			return value * 16;
		}
		return value;
	}
	
	function updateResponsiveState(element) {
		const sideNav = element.querySelector('nui-side-nav');
		if (!sideNav) return;
		
		const breakpoint = getBreakpoint(element);
		const viewportWidth = window.innerWidth;
		const isForced = viewportWidth >= breakpoint;
		
		if (isForced) {
			element.classList.remove('sidenav-open', 'sidenav-closed');
			element.classList.add('sidenav-forced');
		} else {
			element.classList.remove('sidenav-forced');
			if (!element.classList.contains('sidenav-open')) {
				element.classList.add('sidenav-closed');
			}
		}
	}
	
	function toggleSideNav(element) {
		if (element.classList.contains('sidenav-forced')) return;
		
		if (element.classList.contains('sidenav-open')) {
			element.classList.remove('sidenav-open');
			element.classList.add('sidenav-closed');
		} else {
			element.classList.remove('sidenav-closed');
			element.classList.add('sidenav-open');
		}
	}
	
	function updateLayoutClasses(element) {
		const topNav = element.querySelector('nui-top-nav');
		const sideNav = element.querySelector('nui-side-nav');
		const footer = element.querySelector('nui-app-footer');
		
		element.classList.toggle('has-top-nav', !!topNav);
		element.classList.toggle('has-side-nav', !!sideNav);
		element.classList.toggle('has-footer', !!footer);
		
		updateResponsiveState(element);
	}
	
	element.setAttribute('data-layout', 'app');
	updateLayoutClasses(element);
	
	element.toggleSideNav = () => toggleSideNav(element);
	
	const resizeObserver = new ResizeObserver(() => {
		updateLayoutClasses(element);
	});
	resizeObserver.observe(element);
	
	return () => {
		resizeObserver.disconnect();
	};
});

registerComponent('nui-top-nav', (element) => {
	// Accessibility: Ensure proper landmark structure
	const header = element.querySelector('header');
	if (header) {
		// Header should have banner role or be inside a banner
		if (!header.hasAttribute('role') && !header.closest('[role="banner"]')) {
			// Check if it's the main site header
			const isMainHeader = !header.closest('article, section, aside, main');
			if (isMainHeader) {
				header.setAttribute('role', 'banner');
			}
		}
		
		// Upgrade accessibility for all buttons
		upgradeAccessibility(header);
	}
});

registerComponent('nui-side-nav', (element) => {
	// Accessibility: Ensure navigation landmark
	const nav = element.querySelector('nav, nui-link-list');
	if (nav) {
		if (nav.tagName !== 'NAV' && !nav.hasAttribute('role')) {
			nav.setAttribute('role', 'navigation');
		}
		
		// Ensure label if missing
		if (!nav.hasAttribute('aria-label') && !nav.hasAttribute('aria-labelledby')) {
			console.warn(
				`nui-side-nav: Navigation missing aria-label. Adding generic label.`,
				nav
			);
			nav.setAttribute('aria-label', 'Sidebar navigation');
		}
		
		upgradeAccessibility(nav);
	}
});

registerComponent('nui-link-list', (element) => {
	const mode = element.getAttribute('mode') || 'list';
	const accordion = element.hasAttribute('accordion');
	
	// Accessibility: Set navigation landmark role
	if (!element.hasAttribute('role')) {
		element.setAttribute('role', 'navigation');
	}
	
	// Accessibility: Ensure label - check parent context
	if (!element.hasAttribute('aria-label') && !element.hasAttribute('aria-labelledby')) {
		// Try to infer from parent or heading
		const parentLabel = element.closest('[aria-label]')?.getAttribute('aria-label');
		const heading = element.querySelector('h1, h2, h3, h4, h5, h6');
		
		if (heading) {
			const id = heading.id || `nav-${Math.random().toString(36).substr(2, 9)}`;
			if (!heading.id) heading.id = id;
			element.setAttribute('aria-labelledby', id);
		} else if (parentLabel) {
			element.setAttribute('aria-label', parentLabel);
		} else {
			// Check context - sidebar, top nav, etc.
			const isSidebar = element.closest('nui-side-nav, aside, [role="complementary"]');
			const label = isSidebar ? 'Sidebar navigation' : 'Navigation menu';
			element.setAttribute('aria-label', label);
		}
	}
	
	// Build index of items for findItem and setActive functionality
	const itemIndex = new Map();
	const items = element.querySelectorAll('.nui-sidebar-item');
	
	items.forEach((item, idx) => {
		const itemData = {
			element: item,
			index: idx,
			isSub: item.classList.contains('sub-item'),
			isGroup: item.classList.contains('group')
		};
		
		// Index by position (for backward compatibility with original)
		itemIndex.set(`sidebar_${idx}`, itemData);
		
		// Index by ID if present
		if (item.id) {
			itemIndex.set(item.id, itemData);
		}
		
		// Index sub-items
		if (itemData.isSub) {
			const parent = item.closest('.nui-sidebar-item.group');
			if (parent) {
				const parentIdx = Array.from(element.querySelectorAll('.nui-sidebar-item')).indexOf(parent);
				const subItems = parent.querySelectorAll('.sub-item');
				const subIdx = Array.from(subItems).indexOf(item);
				itemIndex.set(`sidebar_${parentIdx}_${subIdx}`, itemData);
			}
		}
	});
	
	function setupTreeMode() {
		const groups = element.querySelectorAll('.nui-sidebar-item.group');
		
		element.classList.add('nui-enhanced');
		
		groups.forEach(group => {
			const itemEl = group.querySelector('.item');
			const subEl = group.querySelector('.sub');
			
			if (!itemEl || !subEl) return;
			
			const groupLabel = a11y.getTextLabel(itemEl) || 'Menu section';
			
			// Make item interactive and get the focusable target
			const target = a11y.makeInteractive(itemEl, `${groupLabel} menu`);
			
			// Set initial expanded state
			const isOpen = group.classList.contains('open');
			target.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
			
			// Sub container is a list
			subEl.setAttribute('role', 'list');
			subEl.setAttribute('aria-label', `${groupLabel} items`);
			subEl.style.height = isOpen ? subEl.scrollHeight + 'px' : '0px';
			
			itemEl.style.cursor = 'pointer';
			
			const toggleGroup = (e) => {
				// Don't toggle if clicking special button
				if (e.target.closest('.special')) {
					return;
				}
				
				e.stopPropagation();
				const isCurrentlyOpen = group.classList.contains('open');
				
				// Accordion mode - close other groups
				if (accordion && !isCurrentlyOpen) {
					groups.forEach(otherGroup => {
						if (otherGroup !== group) {
							const otherSub = otherGroup.querySelector('.sub');
							const otherItem = otherGroup.querySelector('.item');
							if (otherSub && otherItem) {
								otherGroup.classList.remove('open');
								otherSub.style.height = '0px';
								// Update ARIA state
								otherItem.setAttribute('aria-expanded', 'false');
							}
						}
					});
				}
				
				// Toggle this group
				if (isCurrentlyOpen) {
					group.classList.remove('open');
					subEl.style.height = '0px';
					itemEl.setAttribute('aria-expanded', 'false');
				} else {
					group.classList.add('open');
					// Recalculate height in case content changed
					subEl.style.height = subEl.scrollHeight + 'px';
					itemEl.setAttribute('aria-expanded', 'true');
				}
			};
			
			itemEl.addEventListener('click', toggleGroup);
			
			// Keyboard support: Enter and Space to toggle
			itemEl.addEventListener('keydown', (e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					toggleGroup(e);
				}
			});
			
			// Store cleanup
			if (!group._cleanup) {
				group._cleanup = () => {
					itemEl.removeEventListener('click', toggleGroup);
				};
			}
		});
		
		// Setup sub-item accessibility and interactions
		const subItems = element.querySelectorAll('.sub-item');
		subItems.forEach(subItem => {
			subItem.setAttribute('role', 'listitem');
			
			const label = a11y.getTextLabel(subItem);
			if (label && !a11y.hasFocusableChild(subItem)) {
				subItem.setAttribute('tabindex', '0');
				subItem.setAttribute('aria-label', label);
			}
			
			// Auto-expand parent group on focus
			subItem.addEventListener('focus', () => {
				const parent = subItem.closest('.nui-sidebar-item.group');
				if (parent && !parent.classList.contains('open')) {
					const subEl = parent.querySelector('.sub');
					const parentItem = parent.querySelector('.item');
					
					if (subEl && parentItem) {
						parent.classList.add('open');
						subEl.style.height = subEl.scrollHeight + 'px';
						parentItem.setAttribute('aria-expanded', 'true');
						
						// Accordion mode - close other groups
						if (accordion) {
							groups.forEach(otherGroup => {
								if (otherGroup !== parent) {
									const otherSub = otherGroup.querySelector('.sub');
									const otherItem = otherGroup.querySelector('.item');
									if (otherSub && otherItem) {
										otherGroup.classList.remove('open');
										otherSub.style.height = '0px';
										otherItem.setAttribute('aria-expanded', 'false');
									}
								}
							});
						}
					}
				}
			});
			
			subItem.addEventListener('click', (e) => {
				e.stopPropagation();
				handleNavClick(subItem, e);
			});
			
			// Keyboard support
			subItem.addEventListener('keydown', (e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					handleNavClick(subItem, e);
				}
			});
		});
		
		// Setup regular (non-group) items
		const regularItems = element.querySelectorAll('.nui-sidebar-item:not(.group)');
		regularItems.forEach(item => {
			const itemEl = item.querySelector('.item');
			if (itemEl) {
				const label = a11y.getTextLabel(itemEl);
				a11y.makeInteractive(itemEl, label);
				
				itemEl.addEventListener('click', (e) => {
					e.stopPropagation();
					handleNavClick(item, e);
				});
				
				// Keyboard support
				itemEl.addEventListener('keydown', (e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						handleNavClick(item, e);
					}
				});
			}
		});
	}
	
	function handleNavClick(item, event) {
		// Clear all active states
		clearActive();
		
		// Set this item as active
		item.classList.add('active');
		
		// Accessibility: Update aria-current for active navigation
		const clickableEl = item.querySelector('.item') || item;
		clickableEl.setAttribute('aria-current', 'page');
		
		// If it's a sub-item, ensure parent is open
		if (item.classList.contains('sub-item')) {
			const parent = item.closest('.nui-sidebar-item.group');
			if (parent) {
				const subEl = parent.querySelector('.sub');
				const parentItem = parent.querySelector('.item');
				if (subEl && parentItem) {
					parent.classList.add('open');
					subEl.style.height = subEl.scrollHeight + 'px';
					parentItem.setAttribute('aria-expanded', 'true');
				}
			}
		}
		
		// Dispatch custom event for application logic
		element.dispatchEvent(new CustomEvent('nui-nav-click', {
			bubbles: true,
			detail: { 
				item: item,
				event: event,
				id: item.id,
				href: item.querySelector('a')?.getAttribute('href')
			}
		}));
		
		// Toggle sidebar on mobile (delegate to nui-app)
		const app = element.closest('nui-app');
		if (app && app.toggleSideNav) {
			// Only toggle if not in forced mode
			if (!app.classList.contains('sidenav-forced')) {
				app.toggleSideNav();
			}
		}
	}
	
	function clearActive() {
		element.querySelectorAll('.nui-sidebar-item, .sub-item').forEach(item => {
			item.classList.remove('active');
			// Accessibility: Remove aria-current from all items
			const clickableEl = item.querySelector('.item') || item;
			clickableEl.removeAttribute('aria-current');
		});
	}
	
	function clearSubs() {
		element.querySelectorAll('.nui-sidebar-item.group').forEach(group => {
			const subEl = group.querySelector('.sub');
			const itemEl = group.querySelector('.item');
			if (subEl && itemEl) {
				group.classList.remove('open');
				subEl.style.height = '0px';
				// Accessibility: Update ARIA expanded state
				itemEl.setAttribute('aria-expanded', 'false');
			}
		});
	}
	
	// Public API methods (attach to element)
	element.findItem = (topId, subId) => {
		if (subId) {
			// Find by composed ID
			const key = `${topId}_${subId}`;
			const data = itemIndex.get(key) || itemIndex.get(`sidebar_${key}`);
			return data?.element;
		} else {
			// Find by single ID
			const data = itemIndex.get(topId) || itemIndex.get(`sidebar_${topId}`);
			return data?.element;
		}
	};
	
	element.setActive = (topId, subId) => {
		clearActive();
		clearSubs();
		
		const item = element.findItem(topId, subId);
		if (!item) return;
		
		item.classList.add('active');
		
		// If it's a sub-item, open parent
		if (item.classList.contains('sub-item')) {
			const parent = item.closest('.nui-sidebar-item.group');
			if (parent) {
				const subEl = parent.querySelector('.sub');
				if (subEl) {
					parent.classList.add('open');
					subEl.style.height = subEl.scrollHeight + 'px';
				}
			}
		}
	};
	
	element.clearActive = clearActive;
	element.clearSubs = clearSubs;
	
	// Initialize based on mode
	if (mode === 'tree') {
		setupTreeMode();
	}
	
	// Cleanup
	return () => {
		items.forEach(item => {
			if (item._cleanup) {
				item._cleanup();
			}
		});
	};
});

registerComponent('nui-content', (element) => {
	// Future: Handle scrolling, content loading, etc.
});

registerComponent('nui-content', (element) => {
	// Accessibility: Ensure main landmark
	const main = element.querySelector('main');
	if (main) {
		// Main should have main role or be the main element
		if (!main.hasAttribute('role')) {
			main.setAttribute('role', 'main');
		}
		
		// Check for skip link target
		if (!main.hasAttribute('id')) {
			main.setAttribute('id', 'main-content');
		}
		
		upgradeAccessibility(main);
	} else {
		// If no main element, check if this should be main
		const isMainContent = !element.closest('article, section, aside');
		if (isMainContent) {
			console.warn(
				`nui-content: Consider wrapping content in <main> element for accessibility.`,
				element
			);
		}
	}
});

registerComponent('nui-app-footer', (element) => {
	// Accessibility: Ensure contentinfo landmark
	const footer = element.querySelector('footer');
	if (footer) {
		// Footer should have contentinfo role if it's the main site footer
		const isMainFooter = !footer.closest('article, section, aside, main');
		if (isMainFooter && !footer.hasAttribute('role')) {
			footer.setAttribute('role', 'contentinfo');
		}
	}
});

// Stub components
registerLayoutComponent('nui-icon-button');

// =============================================================================
// PUBLIC API
// =============================================================================

export const nui = {
	config,
	knower,  // Export the Knower for cross-component state (opt-in)
	
	init(options) {
		// Merge user options with defaults (only if options provided)
		if (options) {
			Object.assign(config, options);
		}
		
		// Initialize theme from localStorage or system preference
		const savedTheme = localStorage.getItem('nui-theme');
		if (savedTheme) {
			document.documentElement.style.colorScheme = savedTheme;
		}
		// If no saved preference, CSS will use system preference via :root { color-scheme: light dark; }
		
		// Calculate base font size as integer for JS calculations
		const baseValue = getComputedStyle(document.documentElement)
			.getPropertyValue('--nui-rem-base')
			.trim();
		config.baseFontSize = parseFloat(baseValue) || 14;
		
		// Register all components
		Object.entries(components).forEach(([tagName, { class: ComponentClass }]) => {
			if (!customElements.get(tagName)) {
				customElements.define(tagName, ComponentClass);
			}
		});
	},
	
	registerAction(name, handler) {
		actions[name] = handler;
	},
	
	configure(options) {
		Object.assign(config, options);
	}
};

// =============================================================================
// AUTO-INITIALIZATION FOR DIRECT SCRIPT LOADING
// =============================================================================

if (typeof window !== 'undefined' && !window.nuiInitialized) {
	// Check for skip-init URL parameter
	const urlParams = new URLSearchParams(window.location.search);
	const skipInit = urlParams.has('skip-init');
	
	if (!skipInit) {
		nui.init();
		window.nuiInitialized = true;
	} else {
		console.log('[NUI] Auto-initialization skipped (skip-init parameter present)');
		window.nuiInitialized = false;
	}
}
