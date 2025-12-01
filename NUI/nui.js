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

registerComponent('nui-code', (element) => {
	// Store original raw text before highlighting
	const pre = element.querySelector('pre');
	const codeBlock = element.querySelector('pre code');
	if (!pre || !codeBlock) return;

	const rawText = codeBlock.textContent;

	// Add copy button
	const copyButton = document.createElement('button');
	copyButton.className = 'nui-code-copy';
	copyButton.type = 'button';
	copyButton.innerHTML = '<nui-icon name="content_copy"></nui-icon>';
	copyButton.setAttribute('aria-label', 'Copy code to clipboard');
	copyButton.title = 'Copy code';

	copyButton.addEventListener('click', async () => {
		try {
			await navigator.clipboard.writeText(rawText);
			copyButton.innerHTML = '<nui-icon name="check"></nui-icon>';
			copyButton.classList.add('copied');
			setTimeout(() => {
				copyButton.innerHTML = '<nui-icon name="content_copy"></nui-icon>';
				copyButton.classList.remove('copied');
			}, 2000);
		} catch (err) {
			console.error('Failed to copy code:', err);
		}
	});

	element.insertBefore(copyButton, pre);

	// Auto-highlight code blocks when component connects
	import('./lib/modules/nui-syntax-highlight.js').then(module => {
		let lang = codeBlock.getAttribute('data-lang');

		// Auto-detect language if not specified - supports HTML, CSS, JS, TS, JSON
		if (!lang) {
			const code = codeBlock.textContent.trim();
			// Check for HTML first (most common in docs)
			// Note: textContent decodes HTML entities, so we check for actual < characters
			if (/^<[!/?\w]/.test(code) || /<!DOCTYPE/i.test(code)) {
				lang = 'html';
			}
			// JSON (starts with { or [, has "key": pattern)
			else if (/^\s*[{\[]/.test(code) && /"[\w-]+":\s*/.test(code)) {
				lang = 'json';
			}
			// TypeScript (interface, type, or explicit types)
			else if (/\b(interface|type|enum|namespace|declare)\b/.test(code) || /:\s*(string|number|boolean|any)\b/.test(code)) {
				lang = 'typescript';
			}
			// CSS
			else if (/[.#][\w-]+\s*{/.test(code) || /@media|@import/.test(code)) {
				lang = 'css';
			}
			// JavaScript (fallback - const, let, var, function, etc.)
			else if (/\b(const|let|var|function|import|export|class|=>)\b/.test(code)) {
				lang = 'js';
			}

			if (lang) {
				codeBlock.setAttribute('data-lang', lang);
			}
		}

		if (lang) {
			codeBlock.innerHTML = module.highlight(rawText, lang);
		}
	}).catch(() => {
		// Syntax highlight module not available - that's fine
	});
});

registerComponent('nui-link-list', (element) => {
	const instanceId = ensureInstanceId(element, 'link-list');
	const stateKey = `${instanceId}:active`;
	const mode = element.getAttribute('mode') || 'tree';
	let activeItem = null;

	// ##### DATA LOADING & HTML GENERATION

	element.loadData = (data) => {
		const html = data.map(item => buildItemHTML(item)).join('');

		// Check if there's a column-flow wrapper to preserve
		const columnFlow = element.querySelector('nui-column-flow');
		if (columnFlow) {
			columnFlow.innerHTML = html;
		} else {
			element.innerHTML = html;
		}

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
		const hrefAttr = item.href ? ` href="${item.href}"` : ' href=""';
		const link = `<li><a${hrefAttr}${item.event ? ` nui-event-click="${item.event}"` : ''}>` +
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

	element.clearActive = (closeAll = false) => {
		if (activeItem) {
			updateActive(null);
			knower.tell(stateKey, null, element);
		}
		if (closeAll) {
			element.querySelectorAll('.group-header').forEach(h => setGroupState(h, false));
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
		if (header) {
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
			return;
		}

		// Handle link clicks - set active state
		const link = e.target.closest('a');
		if (link) {
			const listItem = link.closest('li');
			if (listItem) {
				updateActive(listItem);
				knower.tell(stateKey, {
					element: listItem,
					link: link,
					href: link.getAttribute('href'),
					text: link.textContent.trim()
				}, element);
			}

			// Prevent navigation if there's no href or it's empty
			if (!link.getAttribute('href')) {
				e.preventDefault();
			}
		}
	});

	element.addEventListener('focusin', (e) => {
		if (mode === 'fold') {
			const header = e.target.closest('.group-header');
			if (header) {
				if (isMouseDown) return; // Skip header focus during mouse clicks
				const path = getPathHeaders(header);
				path.add(header);
				updateAccordionState(path);
			} else {
				const link = e.target.closest('a');
				if (link) {
					// Always expand parent groups for links, even during mouse clicks
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

// ################################# nui-button-container COMPONENT

registerComponent('nui-button-container', (element) => {
	const align = element.getAttribute('align') || 'start';
	const gap = element.getAttribute('gap') || 'small';
	const direction = element.getAttribute('direction') || 'row';

	element.style.display = 'flex';

	// Direction
	element.style.flexDirection = direction;

	// Alignment
	if (direction === 'column') {
		element.style.alignItems = {
			'start': 'flex-start',
			'center': 'center',
			'end': 'flex-end',
			'stretch': 'stretch'
		}[align] || 'flex-start';
	} else {
		element.style.justifyContent = {
			'start': 'flex-start',
			'center': 'center',
			'end': 'flex-end',
			'between': 'space-between'
		}[align] || 'flex-start';
		element.style.flexWrap = 'wrap';
		element.style.alignItems = 'center';
	}

	// Gap
	const gapMap = {
		'none': '0',
		'small': 'var(--nui-space-half, 0.5rem)',
		'medium': 'var(--nui-space, 1rem)',
		'large': 'var(--nui-space-double, 2rem)',
		// Aliases
		'sm': 'var(--nui-space-half, 0.5rem)',
		'md': 'var(--nui-space, 1rem)',
		'lg': 'var(--nui-space-double, 2rem)'
	};
	element.style.gap = gapMap[gap] || gap;
});

// ################################# nui-dialog COMPONENT

registerComponent('nui-dialog', (element) => {
	const dialog = element.querySelector('dialog');
	if (!dialog) return;

	// Public API
	element.showModal = () => {
		dialog.showModal();
		knower.tell(`dialog:${element.id}:open`, true);
	};

	element.close = (returnValue) => {
		dialog.close(returnValue);
		knower.tell(`dialog:${element.id}:open`, false);
	};

	element.isOpen = () => dialog.open;

	// Events
	dialog.addEventListener('close', () => {
		element.dispatchEvent(new CustomEvent('nui-dialog-close', { bubbles: true, detail: { returnValue: dialog.returnValue } }));
		knower.tell(`dialog:${element.id}:open`, false);
	});

	dialog.addEventListener('cancel', () => {
		element.dispatchEvent(new CustomEvent('nui-dialog-cancel', { bubbles: true }));
	});

	// Backdrop click to close
	dialog.addEventListener('click', (e) => {
		const rect = dialog.getBoundingClientRect();
		const isInDialog = (rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
			rect.left <= e.clientX && e.clientX <= rect.left + rect.width);
		if (!isInDialog) {
			dialog.close('backdrop');
		}
	});

	// Doer integration
	const instanceId = ensureInstanceId(element, 'dialog');
	doer.register('dialog-open', () => element.showModal(), instanceId);
	doer.register('dialog-close', () => element.close(), instanceId);
});

// ################################# DIALOG SYSTEM

const dialogSystem = {
	_getSystemDialog() {
		let dialog = document.getElementById('nui-system-dialog');
		if (!dialog) {
			dialog = document.createElement('nui-dialog');
			dialog.id = 'nui-system-dialog';
			dialog.innerHTML = '<dialog><div class="nui-dialog-content"></div></dialog>';
			document.body.appendChild(dialog);
		}
		return dialog;
	},

	_show(htmlContent, classes = []) {
		const dialog = this._getSystemDialog();
		const content = dialog.querySelector('.nui-dialog-content');
		const nativeDialog = dialog.querySelector('dialog');

		// Reset classes
		nativeDialog.className = '';
		if (classes.length) nativeDialog.classList.add(...classes);

		// Set content
		if (typeof htmlContent === 'string') {
			content.innerHTML = htmlContent;
		} else {
			content.innerHTML = '';
			content.appendChild(htmlContent);
		}

		dialog.showModal();
		return dialog;
	},

	alert(title, message) {
		return new Promise((resolve) => {
			const html = `
				<div class="nui-dialog-alert">
					<div class="nui-headline">${title}</div>
					<div class="nui-copy">${message}</div>
					<div class="nui-dialog-actions right">
						<button class="primary" id="nui-dialog-ok">OK</button>
					</div>
				</div>
			`;
			const dialog = this._show(html, ['nui-alert']);

			const onOk = () => {
				dialog.close('ok');
				resolve();
			};

			const btn = dialog.querySelector('#nui-dialog-ok');
			if (btn) btn.addEventListener('click', onOk, { once: true });
			dialog.querySelector('dialog').addEventListener('close', () => resolve(), { once: true });
		});
	},

	confirm(title, message) {
		return new Promise((resolve) => {
			const html = `
				<div class="nui-dialog-alert">
					<div class="nui-headline">${title}</div>
					<div class="nui-copy">${message}</div>
					<div class="nui-dialog-actions right">
						<button class="outline" id="nui-dialog-cancel">Cancel</button>
						<button class="primary" id="nui-dialog-ok">OK</button>
					</div>
				</div>
			`;
			const dialog = this._show(html, ['nui-alert']);

			const onOk = () => { dialog.close('ok'); resolve(true); };
			const onCancel = () => { dialog.close('cancel'); resolve(false); };

			dialog.querySelector('#nui-dialog-ok').addEventListener('click', onOk, { once: true });
			dialog.querySelector('#nui-dialog-cancel').addEventListener('click', onCancel, { once: true });
			dialog.querySelector('dialog').addEventListener('close', () => resolve(false), { once: true });
		});
	},

	prompt(title, fields) {
		return new Promise((resolve) => {
			const inputsHtml = fields.map(f => `
				<div class="nui-input">
					<label>${f.label}</label>
					<input id="${f.id}" value="${f.value || ''}" type="${f.type || 'text'}">
				</div>
			`).join('');

			const html = `
				<div class="nui-dialog-prompt">
					<div class="nui-headline">${title}</div>
					<div class="nui-dialog-body">${inputsHtml}</div>
					<div class="nui-dialog-actions right">
						<button class="outline" id="nui-dialog-cancel">Cancel</button>
						<button class="primary" id="nui-dialog-ok">OK</button>
					</div>
				</div>
			`;
			const dialog = this._show(html, ['nui-prompt']);

			const onOk = () => {
				const values = {};
				fields.forEach(f => {
					const input = dialog.querySelector(`#${f.id}`);
					if (input) values[f.id] = input.value;
				});
				dialog.close('ok');
				resolve(values);
			};

			const onCancel = () => { dialog.close('cancel'); resolve(null); };

			dialog.querySelector('#nui-dialog-ok').addEventListener('click', onOk, { once: true });
			dialog.querySelector('#nui-dialog-cancel').addEventListener('click', onCancel, { once: true });
			dialog.querySelector('dialog').addEventListener('close', () => resolve(null), { once: true });

			// Focus first input
			setTimeout(() => {
				const first = dialog.querySelector('input');
				if (first) first.focus();
			}, 50);
		});
	},

	login(options) {
		return new Promise((resolve) => {
			const html = `
				<div class="nui-dialog-login">
					<div class="nui-headline">${options.title || 'Enter Credentials:'}</div>
					<div class="nui-dialog-body">
						<div class="nui-input">
							<label>${options.label_login || 'Login'}:</label>
							<input id="login-user" autocomplete="username">
						</div>
						<div class="nui-input">
							<label>${options.label_password || 'Password'}:</label>
							<input id="login-pass" type="password" autocomplete="current-password">
						</div>
						<div id="login-error" class="nui-error-message" style="display:none; color:var(--palette-alert); margin-top:0.5rem;"></div>
					</div>
					<div class="nui-dialog-actions right">
						<button class="primary" id="nui-dialog-enter">${options.label_button || 'Enter'}</button>
					</div>
				</div>
			`;
			const dialog = this._show(html, ['nui-login']);

			const errorEl = dialog.querySelector('#login-error');
			const userIn = dialog.querySelector('#login-user');
			const passIn = dialog.querySelector('#login-pass');
			const btn = dialog.querySelector('#nui-dialog-enter');

			const showError = (msg) => {
				errorEl.textContent = msg;
				errorEl.style.display = 'block';
				userIn.value = '';
				passIn.value = '';
				userIn.focus();
				btn.classList.remove('progress');
			};

			const onEnter = async () => {
				btn.classList.add('progress');
				errorEl.style.display = 'none';

				if (options.callback) {
					// Pass a controller object to the callback
					const controller = {
						values: { login: userIn.value, password: passIn.value },
						error: showError,
						close: () => {
							dialog.close('ok');
							resolve({ login: userIn.value, password: passIn.value });
						}
					};
					options.callback(controller);
				} else {
					dialog.close('ok');
					resolve({ login: userIn.value, password: passIn.value });
				}
			};

			btn.addEventListener('click', onEnter);
			passIn.addEventListener('keydown', e => { if (e.key === 'Enter') onEnter(); });

			setTimeout(() => userIn.focus(), 50);
		});
	},

	consent(options, callback) {
		let timer = null;
		let counter = 15;

		const html = `
			<div class="nui-dialog-consent">
				<div class="nui-copy">${options.text}</div>
				<div class="nui-dialog-actions">
					<button class="outline" id="nui-dialog-decline" style="margin-right:auto">
						${options.btn_abort || 'Decline'} <span id="consent-timer">(15)</span>
					</button>
					<button class="primary" id="nui-dialog-allow">${options.btn_allow || 'Allow'}</button>
				</div>
			</div>
		`;
		const dialog = this._show(html, ['nui-consent']);

		const timerSpan = dialog.querySelector('#consent-timer');

		const close = (action) => {
			if (timer) clearInterval(timer);
			dialog.close(action);
			if (callback) callback(action);
		};

		timer = setInterval(() => {
			counter--;
			if (counter < 0) {
				close('abort');
			} else {
				timerSpan.textContent = `(${counter})`;
			}
		}, 1000);

		dialog.querySelector('#nui-dialog-decline').addEventListener('click', () => close('abort'), { once: true });
		dialog.querySelector('#nui-dialog-allow').addEventListener('click', () => close('allow'), { once: true });
	},

	progress(title) {
		const html = `
			<div class="nui-dialog-progress">
				<div class="nui-headline">${title}</div>
				<div class="nui-progress-container">
					<div class="nui-progress-text">Starting...</div>
					<div class="nui-progress-bar-track">
						<div class="nui-progress-bar-fill" style="width: 0%"></div>
					</div>
				</div>
				<div class="nui-dialog-actions right">
					<button class="outline" id="nui-dialog-stop">Stop</button>
				</div>
			</div>
		`;
		const dialog = this._show(html, ['nui-progress']);

		const textEl = dialog.querySelector('.nui-progress-text');
		const fillEl = dialog.querySelector('.nui-progress-bar-fill');

		return {
			update(current, max) {
				const pct = Math.min(100, Math.max(0, (current / max) * 100));
				textEl.textContent = `${current} of ${max}`;
				fillEl.style.width = `${pct}%`;
			},
			onStop(cb) {
				dialog.querySelector('#nui-dialog-stop').addEventListener('click', () => {
					cb(() => dialog.close('stop'));
				});
			},
			close() {
				dialog.close();
			}
		};
	},

	modal(options) {
		const html = `
			<div class="nui-dialog-page" style="${options.maxWidth ? 'max-width:' + options.maxWidth : ''}">
				<div class="nui-dialog-header">
					<h2>${options.header_title || ''}</h2>
					<button class="icon-only close-btn"><nui-icon name="close"></nui-icon></button>
				</div>
				<div class="nui-dialog-body"></div>
				<div class="nui-dialog-footer"></div>
			</div>
		`;
		const dialog = this._show(html, ['nui-modal-page']);

		// Content
		const body = dialog.querySelector('.nui-dialog-body');
		if (options.content instanceof Element) {
			body.appendChild(options.content);
		} else {
			body.innerHTML = options.content || '';
		}

		// Buttons
		if (options.buttons) {
			const footer = dialog.querySelector('.nui-dialog-footer');
			['left', 'center', 'right'].forEach(pos => {
				if (options.buttons[pos]) {
					const div = document.createElement('div');
					div.className = pos;
					options.buttons[pos].forEach(btn => {
						const b = document.createElement('button');
						b.textContent = btn.name;
						if (btn.type) b.setAttribute('type', btn.type);
						b.dataset.action = btn.action;
						b.addEventListener('click', () => {
							if (options.callback) options.callback({ type: btn.action, target: b });
							if (btn.action === 'close') dialog.close();
						});
						div.appendChild(b);
					});
					footer.appendChild(div);
				}
			});
		} else {
			dialog.querySelector('.nui-dialog-page').classList.add('no-foot');
		}

		dialog.querySelector('.close-btn').addEventListener('click', () => dialog.close());

		return {
			close: () => dialog.close()
		};
	}
};

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
	animate,

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
	},

	dialog: dialogSystem
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
		// 1. Check if page is already loaded
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

            // 2. Create wrapper element
			const pageEl = document.createElement('div');
			const pageClass = pageId.replace(/\//g, '-').replace(/[^a-z0-9-]/gi, '');
			pageEl.className = `content-page page-${pageClass}`;
			pageEl.dataset.pageId = pageId;
			pageEl.style.display = 'none'; // Hidden by default
			pageEl.innerHTML = html;			container.appendChild(pageEl);

			// 3. Upgrade custom elements in the loaded content
			// This ensures dynamically loaded NUI components get initialized
			customElements.upgrade(pageEl);

			// 4. Execute scripts
			const scripts = pageEl.querySelectorAll('script');
			for (const oldScript of scripts) {
				const newScript = document.createElement('script');

				// Copy attributes (including type="module")
				Array.from(oldScript.attributes).forEach(attr => {
					newScript.setAttribute(attr.name, attr.value);
				});

				// Copy content
				newScript.textContent = oldScript.textContent;

				// Replace old script with new one to trigger execution
				oldScript.parentNode.replaceChild(newScript, oldScript);
			}

			pages.set(pageId, { element: pageEl, params });

			hideLoading();
			return show(pageId, params);
		} catch (error) {
			hideLoading();
			console.error(`[Content Loader] Failed to load page ${pageId}:`, error);

			if (onError) {
				onError(pageId, error);
			} else {
				showErrorPage(pageId, error);
			}

			return false;
		}
	}

	function showErrorPage(pageId, error) {
		// Check if error page already exists
		const errorId = `error-${pageId}`;
		if (pages.has(errorId)) {
			return show(errorId);
		}

		const errorEl = document.createElement('div');
		errorEl.className = 'content-page error-page';
		errorEl.innerHTML = `
			<div style="padding: var(--nui-space-double); text-align: center;">
				<h1>Page Not Found</h1>
				<p>Could not load page: <code>${pageId}</code></p>
				<p style="color: var(--color-text-dim);">${error.message}</p>
				<button onclick="window.history.back()">Go Back</button>
			</div>
		`;

		container.appendChild(errorEl);
		pages.set(errorId, { element: errorEl });
		show(errorId);
	}

	function show(pageId, params = {}) {
		const page = pages.get(pageId);
		if (!page) return false;

		// 4. Toggle visibility
		pages.forEach(({ element }, id) => {
			if (id === pageId) {
				element.style.display = 'block';
			} else {
				element.style.display = 'none';
			}
		});

		currentPage = pageId;

		// 5. Handle ID parameter (Deep Linking)
		if (params.id) {
			const targetEl = page.element.querySelector(`#${params.id}`) || document.getElementById(params.id);
			if (targetEl) {
				// Wait for display:block to take effect
				requestAnimationFrame(() => {
					targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
					// Optional: focus if interactive
					if (targetEl.matches('a, button, input, [tabindex]')) {
						targetEl.focus();
					}
				});
			}
		} else {
			// Scroll to top if no specific ID requested
			container.scrollTop = 0;
		}

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

			if (linkList) {
				const hash = window.location.hash;
				// 1. Try exact match
				let found = linkList.setActive?.(`a[href="${hash}"]`);

				// 2. If not found (e.g. deep link), try matching the page parameter
				if (!found && params.page) {
					found = linkList.setActive?.(`a[href*="page=${params.page}"]`);
				}
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

// ################################# ANIMATION

const easePresets = {
	sine: {
		in: 'cubic-bezier(0.13, 0, 0.39, 0)',
		out: 'cubic-bezier(0.61, 1, 0.87, 1)',
		inOut: 'cubic-bezier(0.36, 0, 0.64, 1)'
	},
	quad: {
		in: 'cubic-bezier(0.11, 0, 0.5, 0)',
		out: 'cubic-bezier(0.5, 1, 0.89, 1)',
		inOut: 'cubic-bezier(0.44, 0, 0.56, 1)'
	},
	cubic: {
		in: 'cubic-bezier(0.32, 0, 0.67, 0)',
		out: 'cubic-bezier(0.33, 1, 0.68, 1)',
		inOut: 'cubic-bezier(0.66, 0, 0.34, 1)'
	},
	quart: {
		in: 'cubic-bezier(0.5, 0, 0.75, 0)',
		out: 'cubic-bezier(0.25, 1, 0.5, 1)',
		inOut: 'cubic-bezier(0.78, 0, 0.22, 1)'
	},
	quint: {
		in: 'cubic-bezier(0.64, 0, 0.78, 0)',
		out: 'cubic-bezier(0.22, 1, 0.36, 1)',
		inOut: 'cubic-bezier(0.86, 0, 0.14, 1)'
	},
	expo: {
		in: 'cubic-bezier(0.7, 0, 0.84, 0)',
		out: 'cubic-bezier(0.16, 1, 0.3, 1)',
		inOut: 'cubic-bezier(0.9, 0, 0.1, 1)'
	},
	circ: {
		in: 'cubic-bezier(0.55, 0, 1, 0.45)',
		out: 'cubic-bezier(0, 0.55, 0.45, 1)',
		inOut: 'cubic-bezier(0.85, 0.09, 0.15, 0.91)'
	},
	back: {
		in: 'cubic-bezier(0.36, 0, 0.66, -0.56)',
		out: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
		inOut: 'cubic-bezier(0.8, -0.4, 0.5, 1)'
	}
};

const propTemplates = {
	x: { template: 'translateX', transform: true, defaultMetric: 'px' },
	y: { template: 'translateY', transform: true, defaultMetric: 'px' },
	z: { template: 'translateZ', transform: true, defaultMetric: 'px' },
	scaleX: { template: 'scaleX', transform: true, defaultMetric: false },
	scaleY: { template: 'scaleY', transform: true, defaultMetric: false },
	scale: { template: 'scale', transform: true, defaultMetric: false },
	rotate: { template: 'rotate', transform: true, defaultMetric: 'deg' },
	left: { defaultMetric: 'px' },
	top: { defaultMetric: 'px' },
	right: { defaultMetric: 'px' },
	bottom: { defaultMetric: 'px' },
	width: { defaultMetric: 'px' },
	height: { defaultMetric: 'px' }
};

function addDefaultMetric(metric, value) {
	if (!metric) return value;
	if (isNaN(value)) return value;
	return value.toString() + metric;
}

function getNestedEase(path) {
	const parts = path.split('.');
	let result = easePresets;
	for (const part of parts) {
		if (result && typeof result === 'object' && part in result) {
			result = result[part];
		} else {
			return undefined;
		}
	}
	return result;
}

function parseAnimationProp(props) {
	const out = { transform: '' };

	for (const key in props) {
		if (key in propTemplates) {
			const tmpl = propTemplates[key];
			if (tmpl.transform) {
				out.transform += tmpl.template + '(' + addDefaultMetric(tmpl.defaultMetric, props[key]) + ') ';
			} else if (tmpl.template) {
				out[tmpl.template] = addDefaultMetric(tmpl.defaultMetric, props[key]);
			} else {
				out[key] = addDefaultMetric(tmpl.defaultMetric, props[key]);
			}
		} else if (key === 'ease' || key === 'easing') {
			out.easing = props[key];
			const preset = getNestedEase(props[key]);
			if (preset !== undefined) {
				out.easing = preset;
			}
		} else {
			if (key === 'transform') props[key] += ' ';
			out[key] = props[key];
		}
	}

	if (out.transform.length < 2) {
		delete out.transform;
	}

	return out;
}

function parseAnimationProps(props) {
	if (!Array.isArray(props)) {
		return parseAnimationProp(props);
	}
	return props.map(p => parseAnimationProp(p));
}

function animate(el, duration, props, options = {}) {
	const defaults = {
		duration: duration || 1000,
		fill: 'forwards',
		composite: 'replace',
		direction: 'normal',
		delay: 0,
		endDelay: 0,
		iterationStart: 0,
		iterations: 1
	};

	const opts = parseAnimationProp({ ...defaults, ...options });

	if (!Array.isArray(props)) {
		props = [{}, props];
		if (props[1].easing) {
			props[0].easing = props[1].easing;
		}
	}

	const keyframes = new KeyframeEffect(el, parseAnimationProps(props), opts);
	const animation = new Animation(keyframes, document.timeline);

	let loopStop = true;

	const ani = {
		animation,
		duration: opts.duration,
		totalDuration: opts.duration + opts.delay + opts.endDelay,
		stops: [],
		lastTime: 0,
		currentTime: 0,
		currentFrame: 0,
		state: 'init',
		lastState: '',
		currentKeyframe: 0,
		progress: 0
	};

	// Calculate keyframe stops
	for (let i = 0; i < props.length; i++) {
		if (!props[i].offset) {
			if (i === 0) props[i].offset = 0;
			else if (i === props.length - 1) props[i].offset = 1;
			else props[i].offset = i / (props.length - 1);
		}
		ani.stops.push((props[i].offset * opts.duration) + opts.delay);
	}
	if (opts.delay) ani.stops.unshift(0);
	if (opts.endDelay) ani.stops.push(ani.totalDuration);

	function fireEvent(type, data) {
		if (opts.events) {
			opts.events({ type, target: ani, ...data });
		}
	}

	function checkKeyframe() {
		let idx = 0;
		for (let i = 0; i < ani.stops.length; i++) {
			if (ani.currentTime >= ani.stops[i]) idx = i;
		}
		return idx;
	}

	function update() {
		if (animation?.currentTime !== ani.lastTime) {
			ani.currentTime = animation.currentTime;
			ani.lastTime = ani.currentTime;
			ani.progress = ani.currentTime / ani.totalDuration;
		}
		if (ani.lastState !== animation.playState) {
			ani.lastState = animation.playState;
			fireEvent(animation.playState);
		}
		const idx = checkKeyframe();
		if (ani.currentKeyframe !== idx) {
			ani.currentKeyframe = idx;
			fireEvent('keyframe', { idx });
		}
		if (opts.update) opts.update(ani);
	}

	function loop() {
		if (animation) update();
		if (!loopStop) requestAnimationFrame(loop);
	}

	ani.play = (time) => {
		fireEvent('start');
		if (time !== undefined) animation.currentTime = time;
		loopStop = false;
		animation.play();
		loop();
	};

	ani.pause = () => {
		fireEvent('pause');
		animation.pause();
	};

	ani.cancel = () => {
		fireEvent('cancel');
		animation.cancel();
	};

	ani.update = update;

	animation.onfinish = () => {
		fireEvent('finished');
		loopStop = true;
		if (opts.cb) opts.cb(ani);
	};

	animation.onremove = () => {
		fireEvent('remove');
		loopStop = true;
	};

	animation.oncancel = () => {
		fireEvent('cancel');
		loopStop = true;
	};

	// Auto-start unless paused
	if (!opts.paused) {
		loop();
		ani.play();
	}

	return ani;
}

// Add animate method to Element prototype
if (typeof Element !== 'undefined' && !Element.prototype.ani) {
	Element.prototype.ani = function(duration, props, options) {
		return animate(this, duration, props, options);
	};
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
