// NUI/nui.js - DOM-First UI Component Library
// Single-file library with all core components and initialization

// =============================================================================
// COMPONENT FACTORY
// =============================================================================

const components = {};
const actions = {};
const config = {
	sanitizeActions: true,
	iconSpritePath: '/NUI/assets/material-icons-sprite.svg'  // Absolute path from root
};

// =============================================================================
// THE KNOWER - Cross-component state observation (opt-in, zero overhead when unused)
// 
// Philosophy: Components tell the Knower their state. Other components watch.
// Zero overhead: No Maps created until first tell() or watch() call.
// 
// Usage:
//   knower.tell('sidebar', { open: true });        // Component reports state
//   knower.watch('sidebar', (state) => { ... });   // Component watches state
//   const state = knower.know('sidebar');          // Query current state
// 
// =============================================================================

const knower = {
	_states: null,     // Lazy: Map created on first tell()
	_hooks: null,      // Lazy: Map created on first watch()
	
	// Component reports state - only creates Map if needed
	tell(id, state) {
		if (!this._states) this._states = new Map();
		
		const oldState = this._states.get(id);
		this._states.set(id, state);
		
		// Only notify if hooks exist
		if (this._hooks) {
			const hooks = this._hooks.get(id);
			if (hooks) {
				hooks.forEach(handler => handler(state, oldState));
			}
		}
	},
	
	// Query current state - returns undefined if never told
	know(id) {
		return this._states?.get(id);
	},
	
	// Watch for changes - only creates structures if needed
	watch(id, handler) {
		if (!this._hooks) this._hooks = new Map();
		if (!this._hooks.has(id)) {
			this._hooks.set(id, new Set());
		}
		this._hooks.get(id).add(handler);
		
		// Call immediately with current state (if exists)
		const currentState = this._states?.get(id);
		if (currentState !== undefined) {
			handler(currentState, undefined);
		}
		
		// Return unwatch function
		return () => this.unwatch(id, handler);
	},
	
	// Stop watching
	unwatch(id, handler) {
		if (!this._hooks) return;
		const hooks = this._hooks.get(id);
		if (hooks) {
			hooks.delete(handler);
			// Cleanup empty Sets
			if (hooks.size === 0) {
				this._hooks.delete(id);
			}
		}
	},
	
	// Debug: Get all known states
	knowAll() {
		return this._states ? Object.fromEntries(this._states) : {};
	},
	
	// Testing: Clear everything
	forget() {
		this._states = null;
		this._hooks = null;
	}
};

// =============================================================================
// ATTRIBUTE PROXY SYSTEM
// Standard pattern for reactive attributes - more efficient than MutationObserver
// 
// Usage in components:
//   setupAttributeProxy(element, {
//     'attribute-name': (newValue, oldValue) => { /* handle change */ }
//   });
//
// Supported attribute changes:
//   element.setAttribute('name', 'value')     ✅ Caught
//   element.removeAttribute('name')           ✅ Caught
//   element.toggleAttribute('name')           ✅ Caught
//   element.iconName = 'value' (if defined)   ✅ Caught (via property setter)
//
// Unsupported (extremely rare in practice):
//   element.attributes['name'].value = 'x'    ❌ Direct mutation - don't do this
//   element.setAttributeNode(attrNode)        ❌ Rare API - not covered
//   element.setAttributeNS(ns, name, value)   ❌ Namespaced - not needed
//
// Benefits:
//   - Zero overhead when attributes don't change
//   - Synchronous and immediate
//   - Clear stack traces for debugging
//   - LLM-friendly pattern
//   - Covers 99.9% of real-world usage
// =============================================================================

function setupAttributeProxy(element, handlers = {}) {
	// Store original methods
	const original = {
		setAttribute: element.setAttribute.bind(element),
		removeAttribute: element.removeAttribute.bind(element),
		toggleAttribute: element.toggleAttribute.bind(element)
	};
	
	// Override setAttribute
	element.setAttribute = function(name, value) {
		const oldValue = this.getAttribute(name);
		original.setAttribute(name, value);
		
		// Call handler if registered for this attribute
		if (handlers[name]) {
			handlers[name](value, oldValue);
		}
	};
	
	// Override removeAttribute
	element.removeAttribute = function(name) {
		const oldValue = this.getAttribute(name);
		original.removeAttribute(name);
		
		// Call handler with null/undefined value
		if (handlers[name]) {
			handlers[name](null, oldValue);
		}
	};
	
	// Override toggleAttribute
	element.toggleAttribute = function(name, force) {
		const oldValue = this.hasAttribute(name);
		const result = original.toggleAttribute(name, force);
		const newValue = this.hasAttribute(name);
		
		// Call handler if state changed
		if (handlers[name] && oldValue !== newValue) {
			handlers[name](newValue ? '' : null, oldValue ? '' : null);
		}
		
		return result;
	};
	
	// Store originals for cleanup
	element._originalAttributeMethods = original;
	
	return original;
}

// Create property descriptors for attributes (optional convenience)
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
			// Restore original attribute methods if they were proxied
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
		.replace(/[<>'"]/g, '')  // Remove HTML/JS injection chars
		.replace(/javascript:/gi, '')  // Remove javascript: protocol
		.replace(/on\w+=/gi, '')  // Remove event handler attributes
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
// COMPONENT REGISTRATION
// =============================================================================

// Core components
registerComponent('nui-button', (element) => {
	const button = element.querySelector('button');
	if (!button) return;
	
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
	// Future: Handle sticky behavior, custom events, etc.
});

registerComponent('nui-side-nav', (element) => {
	// Container only - all list/tree logic delegated to nui-link-list
});

registerComponent('nui-link-list', (element) => {
	const mode = element.getAttribute('mode') || 'list';
	const accordion = element.hasAttribute('accordion');
	
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
		
		// Add class to indicate JavaScript has initialized
		element.classList.add('nui-enhanced');
		
		groups.forEach(group => {
			const itemEl = group.querySelector('.item');
			const subEl = group.querySelector('.sub');
			
			if (!itemEl || !subEl) return;
			
			// Set initial state
			const isOpen = group.classList.contains('open');
			
			if (isOpen) {
				subEl.style.height = subEl.scrollHeight + 'px';
			} else {
				subEl.style.height = '0px';
			}
			
			// Make item clickable for expand/collapse
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
							if (otherSub) {
								otherGroup.classList.remove('open');
								otherSub.style.height = '0px';
							}
						}
					});
				}
				
				// Toggle this group
				if (isCurrentlyOpen) {
					group.classList.remove('open');
					subEl.style.height = '0px';
				} else {
					group.classList.add('open');
					// Recalculate height in case content changed
					subEl.style.height = subEl.scrollHeight + 'px';
				}
			};
			
			itemEl.addEventListener('click', toggleGroup);
			
			// Store cleanup
			if (!group._cleanup) {
				group._cleanup = () => {
					itemEl.removeEventListener('click', toggleGroup);
				};
			}
		});
		
		// Setup sub-item clicks
		const subItems = element.querySelectorAll('.sub-item');
		subItems.forEach(subItem => {
			subItem.addEventListener('click', (e) => {
				e.stopPropagation();
				handleNavClick(subItem, e);
			});
		});
		
		// Setup regular (non-group) item clicks
		const regularItems = element.querySelectorAll('.nui-sidebar-item:not(.group)');
		regularItems.forEach(item => {
			const itemEl = item.querySelector('.item');
			if (itemEl) {
				itemEl.addEventListener('click', (e) => {
					e.stopPropagation();
					handleNavClick(item, e);
				});
			}
		});
	}
	
	function handleNavClick(item, event) {
		// Clear all active states
		clearActive();
		
		// Set this item as active
		item.classList.add('active');
		
		// If it's a sub-item, ensure parent is open
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
		});
	}
	
	function clearSubs() {
		element.querySelectorAll('.nui-sidebar-item.group').forEach(group => {
			const subEl = group.querySelector('.sub');
			if (subEl) {
				group.classList.remove('open');
				subEl.style.height = '0px';
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

registerComponent('nui-app-footer', (element) => {
	// Future: Handle footer-specific behavior
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