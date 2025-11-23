// NUI/nui.js - DOM-First UI Component Library
//
// IMPORTANT: Include this script in <head> with type="module" to avoid layout shifts
// Example: <script type="module" src="path/to/nui.js"></script>
//
// The library auto-loads its default theme CSS if no theme is present.
// Loading in <body> may cause visible layout shifts as styles load after content.

// ################################# CORE SYSTEMS

const components = {};
const config = {
	sanitizeActions: true,
	iconSpritePath: '/NUI/assets/material-icons-sprite.svg'
};

// ################################# THE DOER

const doer = {
	_actions: {},
	_ownerCleanups: new Map(),

	register(name, fn, ownerId = null) {
		this._actions[name] = fn;

		if (ownerId) {
			// Warn if registering for disconnected component (common mistake)
			const element = document.querySelector(`[nui-id="${ownerId}"]`);
			if (!element || !element.isConnected) {
				console.warn(`[DOER] Registering action "${name}" for disconnected component "${ownerId}". This may cause memory leaks. Register actions only for connected components.`);
			}

			if (!this._ownerCleanups.has(ownerId)) {
				this._ownerCleanups.set(ownerId, new Set());
			}
			this._ownerCleanups.get(ownerId).add(() => {
				if (this._actions[name] === fn) {
					delete this._actions[name];
				}
			});
		}
	}, do(name, target, element, event, param) {
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

			// Lazy execution: only update state if someone is watching
			const actionId = `action:${name}`;
			if (knower.hasWatchers(actionId)) {
				knower.tell(actionId, param || name, element);
			}
		}
	},

	clean(ownerId) {
		if (this._ownerCleanups.has(ownerId)) {
			this._ownerCleanups.get(ownerId).forEach(fn => fn());
			this._ownerCleanups.delete(ownerId);
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
	_ownerCleanups: null,

	tell(id, state, source = null) {
		if (!this._states) this._states = new Map();

		const oldState = this._states.get(id);

		if (oldState === state) return;

		this._states.set(id, state);

		if (this._hooks) {
			const hooks = this._hooks.get(id);
			if (hooks) {
				// Iterate over a copy to allow watchers to modify the Set
				Array.from(hooks).forEach(handler => {
					try {
						handler(state, oldState, source);
					} catch (error) {
						console.error('[KNOWER] Watcher error:', error);
					}
				});
			}
		}
	}, know(id) {
		return this._states?.get(id);
	},

	hasWatchers(id) {
		return this._hooks?.has(id) && this._hooks.get(id).size > 0;
	},

	watch(id, handler, ownerId = null) {
		if (!this._hooks) this._hooks = new Map();
		if (!this._hooks.has(id)) {
			this._hooks.set(id, new Set());
		}
		this._hooks.get(id).add(handler);

		const currentState = this._states?.get(id);
		if (currentState !== undefined) {
			try {
				handler(currentState, undefined, null);
			} catch (error) {
				console.error('[KNOWER] Watcher error during initial notification:', error);
			}
		}

		const unwatch = () => this.unwatch(id, handler);

		if (ownerId) {
			// Warn if registering for disconnected component (common mistake)
			const element = document.querySelector(`[nui-id="${ownerId}"]`);
			if (!element || !element.isConnected) {
				console.warn(`[KNOWER] Registering watcher for disconnected component "${ownerId}". This may cause memory leaks. Register watchers only for connected components.`);
			}

			if (!this._ownerCleanups) this._ownerCleanups = new Map();
			if (!this._ownerCleanups.has(ownerId)) {
				this._ownerCleanups.set(ownerId, new Set());
			}
			this._ownerCleanups.get(ownerId).add(unwatch);
		}

		return unwatch;
	}, unwatch(id, handler) {
		if (!this._hooks) return;
		const hooks = this._hooks.get(id);
		if (hooks) {
			hooks.delete(handler);
			if (hooks.size === 0) {
				this._hooks.delete(id);
			}
		}
	},

	clean(ownerId) {
		if (this._ownerCleanups && this._ownerCleanups.has(ownerId)) {
			this._ownerCleanups.get(ownerId).forEach(fn => fn());
			this._ownerCleanups.delete(ownerId);
		}
	},

	forget(id) {
		if (id) {
			this._states?.delete(id);
			this._hooks?.delete(id);
		} else {
			this._states = null;
			this._hooks = null;
			this._ownerCleanups = null;
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
	}
};

// ################################# ATTRIBUTE PROXY SYSTEM

function setupAttributeProxy(element, handlers = {}) {
	const original = {
		setAttribute: element.setAttribute.bind(element),
		removeAttribute: element.removeAttribute.bind(element),
		toggleAttribute: element.toggleAttribute.bind(element)
	};

	element.setAttribute = function (name, value) {
		const oldValue = this.getAttribute(name);
		original.setAttribute(name, value);

		if (handlers[name]) {
			handlers[name](value, oldValue);
		}
	};

	element.removeAttribute = function (name) {
		const oldValue = this.getAttribute(name);
		original.removeAttribute(name);

		if (handlers[name]) {
			handlers[name](null, oldValue);
		}
	};

	element.toggleAttribute = function (name, force) {
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

// ################################# DOM UTILITIES

function ensureInstanceId(element, prefix = 'nui') {
	let instanceId = element.getAttribute('nui-id');
	if (!instanceId) {
		instanceId = `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
		element.setAttribute('nui-id', instanceId);
	}
	return instanceId;
}

const dom = {
	create(tag, attributes = {}, children = []) {
		const element = document.createElement(tag);
		Object.entries(attributes).forEach(([key, value]) => {
			if (value !== null && value !== undefined) {
				element.setAttribute(key, value);
			}
		});
		children.forEach(child => {
			if (typeof child === 'string') {
				element.appendChild(document.createTextNode(child));
			} else if (child) {
				element.appendChild(child);
			}
		});
		return element;
	},

	svg(tag, attributes = {}) {
		const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
		Object.entries(attributes).forEach(([key, value]) => {
			if (value !== null && value !== undefined) {
				element.setAttribute(key, value);
			}
		});
		return element;
	},

	icon(name) {
		const icon = document.createElement('nui-icon');
		icon.setAttribute('name', name);
		return icon;
	},

	span(text) {
		const span = document.createElement('span');
		if (text) span.textContent = text;
		return span;
	}
};

// ################################# COMPONENT FACTORY

function createComponent(tagName, setupFn, cleanupFn) {
	return class extends HTMLElement {
		connectedCallback() {
			processEventAttributes(this);
			const setupCleanup = setupFn?.(this);
			if (typeof setupCleanup === 'function') {
				this._setupCleanup = setupCleanup;
			}
		}
		disconnectedCallback() {
			// ID-based cleanup using nui-id attribute
			const instanceId = this.getAttribute('nui-id');
			if (instanceId) {
				knower.clean(instanceId);
				doer.clean(instanceId);
			}

			if (this._originalAttributeMethods) {
				this.setAttribute = this._originalAttributeMethods.setAttribute;
				this.removeAttribute = this._originalAttributeMethods.removeAttribute;
				this.toggleAttribute = this._originalAttributeMethods.toggleAttribute;
				delete this._originalAttributeMethods;
			}

			// Call setup's cleanup function if it returned one
			if (this._setupCleanup) {
				this._setupCleanup();
				delete this._setupCleanup;
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
		setup: () => { },
		cleanup: () => { }
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

doer.register('toggle-sidebar', (target, source, event, param) => {
	const app = document.querySelector('nui-app');
	if (app && app.toggleSideNav) {
		app.toggleSideNav();
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

	const buttonNodes = Array.from(button.childNodes);
	const nonEmptyNodes = buttonNodes.filter(node => {
		if (node.nodeType === Node.TEXT_NODE) {
			return node.textContent.trim() !== '';
		}
		return true;
	});

	const hasOnlyIcon = nonEmptyNodes.length === 1 &&
		nonEmptyNodes[0].nodeType === Node.ELEMENT_NODE &&
		nonEmptyNodes[0].tagName === 'NUI-ICON';

	if (hasOnlyIcon) {
		element.classList.add('icon-only');
	}

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
		svg = dom.svg('svg', {
			width: '24',
			height: '24',
			viewBox: '0 0 24 24',
			fill: 'currentColor',
			'aria-hidden': 'true',
			focusable: 'false'
		});
		element.appendChild(svg);
	}

	let use = svg.querySelector('use');
	if (!use) {
		use = dom.svg('use');
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

registerComponent('nui-loading', (element) => {
	const mode = element.getAttribute('mode') || 'overlay';
	
	if (mode === 'bar') {
		element.innerHTML = `
			<div class="loading-bar">
				<div class="loading-bar-progress"></div>
			</div>
		`;
	} else if (mode === 'overlay') {
		if (!element.querySelector('.loading-overlay')) {
			element.innerHTML = `
				<div class="loading-overlay">
					<div class="loading-spinner"></div>
					<div class="loading-text">Loading...</div>
				</div>
			`;
		}
	}
	
	setupAttributeProxy(element, {
		'active': (newValue, oldValue) => {
			if (newValue !== null) {
				element.classList.add('active');
			} else {
				element.classList.remove('active');
			}
		}
	});
	
	if (element.hasAttribute('active')) {
		element.classList.add('active');
	}
});

registerComponent('nui-app', (element) => {
	const instanceId = ensureInstanceId(element, 'app');
	const stateKey = `${instanceId}:side-nav`;
	let lastState = null;

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

		let newState;

		if (isForced) {
			element.classList.remove('sidenav-open', 'sidenav-closed');
			element.classList.add('sidenav-forced');
			newState = 'forced';
		} else {
			element.classList.remove('sidenav-forced');
			if (!element.classList.contains('sidenav-open')) {
				element.classList.add('sidenav-closed');
				newState = 'closed';
			} else {
				newState = 'open';
			}
		}

		knower.tell(stateKey, newState, element);
		lastState = newState;
	}

	function toggleSideNav(element) {
		if (element.classList.contains('sidenav-forced')) return;

		const isOpen = element.classList.contains('sidenav-open');

		if (isOpen) {
			element.classList.remove('sidenav-open');
			element.classList.add('sidenav-closed');
			knower.tell(stateKey, 'closed', element);
			lastState = 'closed';
		} else {
			element.classList.remove('sidenav-closed');
			element.classList.add('sidenav-open');
			knower.tell(stateKey, 'open', element);
			lastState = 'open';
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

	element.addEventListener('click', (e) => {
		if (element.classList.contains('sidenav-open') && 
			!element.classList.contains('sidenav-forced')) {
			const sideNav = element.querySelector('nui-side-nav');
			const topNav = element.querySelector('nui-top-nav');
			
			if (sideNav && !sideNav.contains(e.target) && !topNav?.contains(e.target)) {
				toggleSideNav(element);
			}
		}
	});

	const resizeObserver = new ResizeObserver(() => {
		updateLayoutClasses(element);
	});
	resizeObserver.observe(element);

	return () => {
		resizeObserver.disconnect();
		knower.forget(stateKey);
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
		element.setActive = (selector) => linkList.setActive?.(selector);
		element.getActive = () => linkList.getActive?.();
		element.getActiveData = () => linkList.getActiveData?.();
		element.clearActive = () => linkList.clearActive?.();
		element.clearSubs = () => linkList.clearSubs?.();
	}
});

registerComponent('nui-link-list', (element) => {
	const instanceId = ensureInstanceId(element, 'link-list');
	const stateKey = `${instanceId}:active`;
	const mode = element.getAttribute('mode') || 'tree';
	let activeItem = null;

	// ##### DATA LOADING & HTML GENERATION

	element.loadData = (data) => {
		element.innerHTML = data.map(item => buildItemHTML(item)).join('');
		upgradeHtml();
		if (mode === 'fold') {
			element.querySelectorAll('.group-header').forEach(h => {
				h.setAttribute('tabindex', '0');
				h.setAttribute('role', 'button');
				setGroupState(h, false);
			});
		}
	};

	function buildItemHTML(item, nested = false) {
		if (item.separator) return '<li class="separator"><hr></li>';
		if (item.items) {
			const children = item.items.map(i => buildItemHTML(i, true)).join('');
			return `<ul>${buildGroupHeaderHTML(item)}${children}</ul>`;
		}
		const link = `<li><a href="${item.href || '#'}"${item.event ? ` nui-event-click="${item.event}"` : ''}>` +
			`${item.icon ? `<nui-icon name="${item.icon}"></nui-icon>` : ''}<span>${item.label}</span></a></li>`;
		return nested ? link : `<ul>${link}</ul>`;
	}

	function buildGroupHeaderHTML(item) {
		const action = item.action ? `<button type="button" class="action" nui-event-click="${item.action}"><nui-icon name="settings"></nui-icon></button>` : '';
		return `<li class="group-header"><span>${item.icon ? `<nui-icon name="${item.icon}"></nui-icon>` : ''}<span>${item.label}</span></span>${action}</li>`;
	}

	// ##### STATE MANAGEMENT

	function updateActive(newItem) {
		if (activeItem) {
			activeItem.classList.remove('active');
			activeItem.parentElement?.classList.remove('active');
			activeItem.parentElement?.removeAttribute('aria-selected');
		}
		activeItem = newItem;
		if (activeItem) {
			activeItem.classList.add('active');
			activeItem.parentElement?.classList.add('active');
			activeItem.parentElement?.setAttribute('aria-selected', 'true');
		}
	}

	function getPathHeaders(el) {
		const headers = new Set();
		let container = el.parentElement?.closest('.group-items');
		while (container) {
			headers.add(container.previousElementSibling);
			container = container.parentElement.closest('.group-items');
		}
		return headers;
	}

	function updateAccordionState(keepOpen) {
		element.querySelectorAll('.group-header').forEach(header => {
			setGroupState(header, keepOpen.has(header));
		});
	}

	function setGroupState(header, expand) {
		header.setAttribute('aria-expanded', expand);
		const container = header.nextElementSibling;
		if (!container?.classList.contains('group-items')) return;

		if (expand && container.style.height === 'auto') return;
		if (!expand && container.style.height === '0px') return;

		container.style.height = container.scrollHeight + 'px';
		if (!expand) container.offsetHeight; // Force reflow
		container.style.height = expand ? container.scrollHeight + 'px' : '0px';

		const onEnd = (e) => {
			if (e.target === container && e.propertyName === 'height') {
				container.style.height = expand ? 'auto' : '0px';
				container.removeEventListener('transitionend', onEnd);
			}
		};
		container.addEventListener('transitionend', onEnd);
	}

	// ##### PUBLIC API

	element.setActive = (selector) => {
		const item = typeof selector === 'string' ? element.querySelector(selector) : selector;
		if (!item) return false;

		const app = element.closest('nui-app');
		const shouldOpen = app && !app.classList.contains('sidenav-forced') && 
			!app.classList.contains('sidenav-open');
		
		if (shouldOpen) {
			// Use setTimeout to avoid the click event that triggered this from closing it again
			setTimeout(() => {
				app.toggleSideNav?.();
			}, 0);
		}

		updateActive(item);
		const path = getPathHeaders(item);
		
		if (mode === 'fold') updateAccordionState(path);
		else path.forEach(h => setGroupState(h, true));

		knower.tell(stateKey, {
			element: item,
			href: item.getAttribute('href'),
			text: item.textContent.trim(),
			timestamp: Date.now()
		}, element);
		return true;
	};

	element.getActive = () => activeItem;
	
	element.getActiveData = () => activeItem ? {
		element: activeItem,
		href: activeItem.getAttribute('href'),
		text: activeItem.textContent.trim()
	} : null;

	element.clearActive = () => {
		if (activeItem) {
			updateActive(null);
			knower.tell(stateKey, null, element);
		}
	};

	element.clearSubs = () => {
		element.querySelectorAll('.group-header').forEach(h => setGroupState(h, false));
	};

	// ##### INITIALIZATION

	function upgradeHtml() {
		element.querySelectorAll('.group-header').forEach(header => {
			if (header.nextElementSibling?.classList.contains('group-items')) return;
			const items = [];
			let next = header.nextElementSibling;
			while (next && !next.classList.contains('group-header')) {
				if (next.tagName === 'LI') next.classList.add('list-item');
				items.push(next);
				next = next.nextElementSibling;
			}
			if (items.length) {
				const div = document.createElement('div');
				div.className = 'group-items';
				div.setAttribute('role', 'presentation');
				div.append(...items);
				header.after(div);
			}
		});
	}

	function upgradeAccessibility() {
		if (!element.hasAttribute('role')) element.setAttribute('role', 'tree');
		element.querySelectorAll('ul').forEach(ul => ul.setAttribute('role', 'group'));
		element.querySelectorAll('li').forEach(li => {
			li.setAttribute('role', 'treeitem');
			if (li.classList.contains('active')) li.setAttribute('aria-selected', 'true');
		});
	}

	// Event Listeners
	let isMouseDown = false;
	element.addEventListener('mousedown', () => {
		isMouseDown = true;
		setTimeout(() => isMouseDown = false, 500);
	});

	element.addEventListener('click', (e) => {
		const header = e.target.closest('.group-header');
		if (!header) return;
		
		const expand = header.getAttribute('aria-expanded') !== 'true';
		if (mode === 'fold' && expand) {
			const path = getPathHeaders(header);
			path.add(header);
			updateAccordionState(path);
		} else {
			setGroupState(header, expand);
			if (!expand) { // Close descendants
				header.nextElementSibling?.querySelectorAll('.group-header').forEach(h => setGroupState(h, false));
			}
		}
	});

	element.addEventListener('focusin', (e) => {
		if (isMouseDown) return;

		if (mode === 'fold') {
			const header = e.target.closest('.group-header');
			if (header) {
				const path = getPathHeaders(header);
				path.add(header);
				updateAccordionState(path);
			} else {
				const link = e.target.closest('a');
				if (link) {
					const path = getPathHeaders(link);
					updateAccordionState(path);
				}
			}
		}
	});

	element.addEventListener('keydown', (e) => {
		const target = e.target.closest('a, .group-header');
		if (!target) return;

		const items = Array.from(element.querySelectorAll('a, .group-header')).filter(el => {
			// Only include visible items (skip collapsed groups)
			return el.offsetParent !== null && getComputedStyle(el).visibility !== 'hidden';
		});
		const idx = items.indexOf(target);
		
		if (e.key === 'ArrowDown' && idx < items.length - 1) { e.preventDefault(); items[idx + 1].focus(); }
		else if (e.key === 'ArrowUp' && idx > 0) { e.preventDefault(); items[idx - 1].focus(); }
		else if (e.key === 'Home') { e.preventDefault(); items[0]?.focus(); }
		else if (e.key === 'End') { e.preventDefault(); items[items.length - 1]?.focus(); }
		else if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			target.click();
		}
	});

	if (mode === 'fold') {
		upgradeHtml();
		element.querySelectorAll('.group-header').forEach(h => {
			h.setAttribute('tabindex', '0');
			h.setAttribute('role', 'button');
			setGroupState(h, false);
		});
	}
	
	upgradeAccessibility();

	return () => knower.forget(stateKey);
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

// ################################# nui-column-flow COMPONENT

registerComponent('nui-column-flow', (element) => {
	const sort = element.getAttribute('sort');
	const columns = element.getAttribute('columns');
	const columnWidth = element.getAttribute('column-width');

	// Apply attribute-based overrides
	if (columns) {
		element.style.columnCount = columns;
	}
	if (columnWidth) {
		// Support fraction syntax: "/3" means 1/3 of container width
		if (columnWidth.startsWith('/')) {
			const divisor = parseInt(columnWidth.slice(1));
			if (!isNaN(divisor) && divisor > 0) {
				const containerWidth = element.offsetWidth;
				console.log('Container width:', containerWidth);
				const gapValue = parseFloat(getComputedStyle(element).columnGap) || 0;
				const availableWidth = containerWidth - (gapValue * (divisor - 1));
				element.style.columnWidth = `${availableWidth / divisor}px`;
			}
		} else {
			element.style.columnWidth = columnWidth;
		}
	}

	// Sort children by height if requested
	if (sort && sort.includes('height')) {
		const descending = !sort.startsWith('!');
		const items = Array.from(element.children);
		items.sort((a, b) => {
			const diff = b.offsetHeight - a.offsetHeight;
			return descending ? diff : -diff;
		});
		items.forEach(item => element.appendChild(item));
	}
});

// ################################# PUBLIC API

function ensureBaseStyles() {
	const rootStyles = getComputedStyle(document.documentElement);
	const hasBaseVariables = rootStyles.getPropertyValue('--nui-space').trim() !== '';

	if (!hasBaseVariables) {
		const scriptPath = document.currentScript?.src || import.meta.url;
		const basePath = scriptPath.substring(0, scriptPath.lastIndexOf('/'));
		const cssPath = `${basePath}/css/nui-theme.css`;

		const link = document.createElement('link');
		link.rel = 'stylesheet';
		link.href = cssPath;
		document.head.appendChild(link);

		console.warn('[NUI] Default theme auto-loaded from:', cssPath, '(Include nui.js in <head> to prevent layout shifts)');
	}
}

export const nui = {
	config,
	knower,
	dom,

	init(options) {
		if (options) {
			Object.assign(config, options);
		}

		ensureBaseStyles();

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
	doer: doer,

	createContentLoader(container, options = {}) {
		return createContentLoader(container, options);
	},

	createRouter(loader, options = {}) {
		return createRouter(loader, options);
	},

	enableContentLoading(options = {}) {
		return enableContentLoading(options);
	}
};

// ################################# CONTENT LOADER

function createContentLoader(container, options = {}) {
	const basePath = options.basePath || '/pages';
	const onError = options.onError || null;
	const pages = new Map();
	let currentPage = null;
	let loadingIndicator = null;

	function showLoading() {
		loadingIndicator = document.querySelector('nui-loading[mode="bar"]');
		if (loadingIndicator) {
			loadingIndicator.setAttribute('active', '');
		}
		knower.tell('content-loading', true);
	}

	function hideLoading() {
		if (loadingIndicator) {
			loadingIndicator.removeAttribute('active');
		}
		knower.tell('content-loading', false);
	}

	async function load(pageId, params = {}) {
		if (pages.has(pageId)) {
			return show(pageId, params);
		}

		showLoading();

		try {
			const response = await fetch(`${basePath}/${pageId}.html`);
			if (!response.ok) {
				throw new Error(`Page ${pageId} not found (${response.status})`);
			}
			
			const html = await response.text();

			const pageEl = document.createElement('div');
			pageEl.className = 'content-page';
			pageEl.dataset.pageId = pageId;
			pageEl.style.display = 'none';
			pageEl.innerHTML = html;

			container.appendChild(pageEl);

			let module = null;
			try {
				module = await import(`${basePath}/${pageId}.js`);
				if (module.init) {
					await module.init(pageEl, nui, params);
				}
			} catch (e) {
				// No module = pure HTML page (this is fine)
			}

			pages.set(pageId, { element: pageEl, module, params });

			hideLoading();
			return show(pageId, params);
		} catch (error) {
			hideLoading();
			console.error(`[Content Loader] Failed to load page ${pageId}:`, error);
			
			if (onError) {
				onError(pageId, error);
			} else {
				// Show default error page
				showErrorPage(pageId, error);
			}
			
			return false;
		}
	}

	function showErrorPage(pageId, error) {
		const errorEl = document.createElement('div');
		errorEl.className = 'content-page error-page';
		errorEl.innerHTML = `
			<div style="padding: var(--nui-space-double); text-align: center;">
				<h1>Page Not Found</h1>
				<p>Could not load page: <code>${pageId}</code></p>
				<p style="color: var(--color-text-dim);">${error.message}</p>
				<button onclick="window.location.hash = ''">Go Home</button>
			</div>
		`;
		
		pages.forEach(({ element }) => {
			element.style.display = 'none';
		});
		
		container.appendChild(errorEl);
		
		setTimeout(() => {
			errorEl.remove();
		}, 5000);
	}

	function show(pageId, params = {}) {
		const page = pages.get(pageId);
		if (!page) return false;

		pages.forEach(({ element }, id) => {
			element.style.display = id === pageId ? 'block' : 'none';
		});

		if (page.module?.onShow) {
			page.module.onShow(page.element, params);
		}

		currentPage = pageId;
		return true;
	}

	function getCurrent() {
		return currentPage;
	}

	function getPage(pageId) {
		return pages.get(pageId);
	}

	return {
		load,
		show,
		getCurrent,
		getPage
	};
}

// ################################# ROUTER

function createRouter(loader, options = {}) {
	const linkList = options.linkList || null;
	const defaultPage = options.defaultPage || null;
	let isNavigating = false;

	function parseHash() {
		const hash = window.location.hash.slice(1);
		if (!hash) return null;
		
		const params = new URLSearchParams(hash);
		return Object.fromEntries(params);
	}

	async function handleRoute() {
		if (isNavigating) return;
		
		const params = parseHash();
		if (!params || !params.page) {
			if (defaultPage) {
				navigate(defaultPage);
			}
			return;
		}

		isNavigating = true;
		
		try {
			await loader.load(params.page, params);
			
			if (params.id && linkList) {
				const selector = `a[href*="${params.id}"]`;
				linkList.setActive?.(selector);
			}
		} finally {
			isNavigating = false;
		}
	}

	function navigate(page, id = null, otherParams = {}) {
		const params = new URLSearchParams({ page, ...otherParams });
		if (id) params.set('id', id);
		
		window.location.hash = params.toString();
	}

	function start() {
		window.addEventListener('hashchange', handleRoute);
		handleRoute();
	}

	function stop() {
		window.removeEventListener('hashchange', handleRoute);
	}

	return {
		navigate,
		start,
		stop,
		parseHash
	};
}

// ################################# CONTENT LOADING SETUP

function enableContentLoading(options = {}) {
	const containerSelector = options.container || 'nui-content main';
	const navigationSelector = options.navigation || 'nui-side-nav';
	const basePath = options.basePath || '/pages';
	const defaultPage = options.defaultPage || null;
	const onError = options.onError || null;

	const container = typeof containerSelector === 'string' 
		? document.querySelector(containerSelector) 
		: containerSelector;

	const navigation = typeof navigationSelector === 'string'
		? document.querySelector(navigationSelector)
		: navigationSelector;

	if (!container) {
		console.error('[NUI] Content container not found:', containerSelector);
		return null;
	}

	const loader = createContentLoader(container, { 
		basePath,
		onError 
	});

	const router = createRouter(loader, {
		linkList: navigation,
		defaultPage,
		onError
	});

	doer.register('navigate', (target, source, event, param) => {
		router.navigate(param);
	});

	router.start();

	return { loader, router };
}

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
