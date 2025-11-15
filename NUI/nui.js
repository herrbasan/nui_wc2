// NUI/nui.js - DOM-First UI Component Library

// ################################# CORE SYSTEMS

const components = {};
const config = {
	sanitizeActions: true,
	iconSpritePath: '/NUI/assets/material-icons-sprite.svg'
};

// ################################# THE DOER

const doer = {
	_actions: {},
	
	register(name, fn) {
		this._actions[name] = fn;
	},
	
	do(name, target, element, event, param) {
		if (this._actions[name]) {
			return this._actions[name](target, element, event, param);
		} else {
			const customEvent = new CustomEvent(`nui-${name}`, {
				bubbles: true,
				cancelable: true,
				detail: {
					element: element,
					target: target,
					param: param,
					originalEvent: event
				}
			});
			element.dispatchEvent(customEvent);
			
			knower.tell(`action:${name}`, {
				param: param,
				element: element,
				target: target,
				timestamp: Date.now()
			});
		}
	},
	
	listActions() {
		return Object.keys(this._actions);
	}
};

// ################################# THE KNOWER

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
	
	listKnown() {
		const all = this.knowAll();
		return {
			states: all,
			watchers: this._hooks ? Array.from(this._hooks.keys()).map(id => ({
				id,
				count: this._hooks.get(id).size
			})) : []
		};
	},
	
	forget() {
		this._states = null;
		this._hooks = null;
	}
};

// ################################# ATTRIBUTE PROXY SYSTEM

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

// ################################# COMPONENT FACTORY

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

// ################################# EVENT ACTIONS

function sanitizeInput(input) {
	if (!input) return '';
	if (!config.sanitizeActions) return input;
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
			
			if (!eventType || !actionSpec) return;
			
			element.addEventListener(eventType, (e) => {
				executeAction(actionSpec, element, e);
			});
		}
	});
}

function executeAction(actionSpec, element, event) {
	const [actionPart, selector] = actionSpec.split('@');
	const [actionName, param] = actionPart.split(':');
	
	const safeActionName = sanitizeInput(actionName);
	const safeParam = sanitizeInput(param);
	const safeSelector = sanitizeInput(selector);
	
	if (config.sanitizeActions && safeSelector && !/^[a-zA-Z0-9\s\-_.#\[\]=,>+~:()]+$/.test(safeSelector)) {
		console.warn(`Invalid selector: "${selector}"`);
		return;
	}
	
	const target = safeSelector ? document.querySelector(safeSelector) : element;
	
	doer.do(safeActionName, target, element, event, safeParam);
}

// ################################# BUILT-IN ACTIONS

doer.register('toggle-theme', (target, source, event, param) => {
	const root = document.documentElement;
	const currentScheme = root.style.colorScheme || 
		getComputedStyle(root).colorScheme || 'light dark';
	
	let newTheme;
	
	if (currentScheme.includes('dark') && !currentScheme.includes('light')) {
		root.style.colorScheme = 'light';
		localStorage.setItem('nui-theme', 'light');
		newTheme = 'light';
	} else if (currentScheme.includes('light') && !currentScheme.includes('dark')) {
		root.style.colorScheme = 'dark';
		localStorage.setItem('nui-theme', 'dark');
		newTheme = 'dark';
	} else {
		const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		root.style.colorScheme = prefersDark ? 'light' : 'dark';
		localStorage.setItem('nui-theme', prefersDark ? 'light' : 'dark');
		newTheme = prefersDark ? 'light' : 'dark';
	}
	
	knower.tell('theme', newTheme);
});

doer.register('toggle-class', (target, source, event, className) => {
	if (target && className) {
		target.classList.toggle(className);
	}
});

doer.register('add-class', (target, source, event, className) => {
	if (target && className) {
		target.classList.add(className);
	}
});

doer.register('remove-class', (target, source, event, className) => {
	if (target && className) {
		target.classList.remove(className);
	}
});

doer.register('toggle-attr', (target, source, event, attrName) => {
	if (target && attrName) {
		if (target.hasAttribute(attrName)) {
			target.removeAttribute(attrName);
		} else {
			target.setAttribute(attrName, '');
		}
	}
});

doer.register('set-attr', (target, source, event, attrSpec) => {
	if (target && attrSpec) {
		const [name, value] = attrSpec.split('=');
		target.setAttribute(name, value || '');
	}
});

doer.register('remove-attr', (target, source, event, attrName) => {
	if (target && attrName) {
		target.removeAttribute(attrName);
	}
});

// ################################# ACCESSIBILITY

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

function upgradeAccessibility(element) {
	a11y.upgrade(element);
}

// ################################# COMPONENT REGISTRATION

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
	
	if (element.textContent.trim()) {
		element.textContent = '';
	}
	
	let svg = element.querySelector('svg');
	if (!svg) {
		svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		svg.setAttribute('width', '24');
		svg.setAttribute('height', '24');
		svg.setAttribute('viewBox', '0 0 24 24');
		svg.setAttribute('fill', 'currentColor');
		svg.setAttribute('aria-hidden', 'true');
		svg.setAttribute('focusable', 'false');
		element.appendChild(svg);
	}
	
	let use = svg.querySelector('use');
	if (!use) {
		use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
		svg.appendChild(use);
	}
	
	const updateIcon = (iconName) => {
		if (iconName) {
			use.setAttribute('href', `${config.iconSpritePath}#${iconName}`);
		} else {
			use.setAttribute('href', '');
		}
	};
	
	updateIcon(name);
	
	setupAttributeProxy(element, {
		'name': (newValue, oldValue) => {
			updateIcon(newValue);
		}
	});
	
	defineAttributeProperty(element, 'iconName', 'name');
});

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
			knower.tell('side-nav', { state: 'forced', forced: true, viewportWidth, breakpoint });
		} else {
			element.classList.remove('sidenav-forced');
			if (!element.classList.contains('sidenav-open')) {
				element.classList.add('sidenav-closed');
				knower.tell('side-nav', { state: 'closed', forced: false, viewportWidth, breakpoint });
			} else {
				knower.tell('side-nav', { state: 'open', forced: false, viewportWidth, breakpoint });
			}
		}
	}
	
	function toggleSideNav(element) {
		if (element.classList.contains('sidenav-forced')) return;
		
		const isOpen = element.classList.contains('sidenav-open');
		
		if (isOpen) {
			element.classList.remove('sidenav-open');
			element.classList.add('sidenav-closed');
			knower.tell('side-nav', { state: 'closed', forced: false });
		} else {
			element.classList.remove('sidenav-closed');
			element.classList.add('sidenav-open');
			knower.tell('side-nav', { state: 'open', forced: false });
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
	
	let resizeTimeout;
	const resizeObserver = new ResizeObserver(() => {
		clearTimeout(resizeTimeout);
		resizeTimeout = setTimeout(() => {
			updateLayoutClasses(element);
		}, 150);
	});
	resizeObserver.observe(element);
	
	return () => {
		clearTimeout(resizeTimeout);
		resizeObserver.disconnect();
	};
});

registerComponent('nui-top-nav', (element) => {
	const header = element.querySelector('header');
	if (header) {
		if (!header.hasAttribute('role') && !header.closest('[role="banner"]')) {
			const isMainHeader = !header.closest('article, section, aside, main');
			if (isMainHeader) {
				header.setAttribute('role', 'banner');
			}
		}
		
		upgradeAccessibility(header);
	}
});

registerComponent('nui-side-nav', (element) => {
	const linkList = element.querySelector('nui-link-list');
	if (linkList && !linkList.hasAttribute('mode')) {
		linkList.setAttribute('mode', 'fold');
	}
	
	if (linkList) {
		element.setActive = (action) => linkList.setActive?.(action);
		element.clearActive = () => linkList.clearActive?.();
		element.clearSubs = () => linkList.clearSubs?.();
	}
});

registerComponent('nui-link-list', (element) => {
	const listContainer = element.querySelector('ul');
	if (!listContainer) return;
	
	const mode = element.getAttribute('mode') || 'tree';
});

registerComponent('nui-content', (element) => {
	const main = element.querySelector('main');
	if (main) {
		if (!main.hasAttribute('role')) {
			main.setAttribute('role', 'main');
		}
		
		if (!main.hasAttribute('id')) {
			main.setAttribute('id', 'main-content');
		}
		
		upgradeAccessibility(main);
	} else {
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
	const footer = element.querySelector('footer');
	if (footer) {
		const isMainFooter = !footer.closest('article, section, aside, main');
		if (isMainFooter && !footer.hasAttribute('role')) {
			footer.setAttribute('role', 'contentinfo');
		}
	}
});

registerLayoutComponent('nui-icon-button');

// ################################# PUBLIC API

export const nui = {
	config,
	knower,
	
	init(options) {
		if (options) {
			Object.assign(config, options);
		}
		
		const savedTheme = localStorage.getItem('nui-theme');
		if (savedTheme) {
			document.documentElement.style.colorScheme = savedTheme;
		}
		
		const baseValue = getComputedStyle(document.documentElement)
			.getPropertyValue('--nui-rem-base')
			.trim();
		config.baseFontSize = parseFloat(baseValue) || 14;
		
		Object.entries(components).forEach(([tagName, { class: ComponentClass }]) => {
			if (!customElements.get(tagName)) {
				customElements.define(tagName, ComponentClass);
			}
		});
	},
	
	registerAction(name, handler) {
		doer.register(name, handler);
	},
	
	configure(options) {
		Object.assign(config, options);
	},
	
	knower: knower,
	doer: doer
};

// ################################# AUTO-INITIALIZATION

if (typeof window !== 'undefined' && !window.nuiInitialized) {
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
