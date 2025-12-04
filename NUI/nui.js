// NUI - DOM-First UI Component Library
// Include in <head> with type="module"

// ################################# CORE SYSTEMS

const components = {};
const config = {
	sanitizeActions: true,
	sanitizeRoutes: true,
	iconSpritePath: '/NUI/assets/material-icons-sprite.svg'
};

// ################################# THE DOER

const doer = {
	_actions: {},
	_ownerCleanups: new Map(),

	register(name, fn, ownerId = null) {
		this._actions[name] = fn;

		if (ownerId) {
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
		element.querySelectorAll('button').forEach(btn => this.ensureButtonLabel(btn));

		element.querySelectorAll('[onclick], [nui-event-click]').forEach(el => {
			if (el.tagName !== 'BUTTON' && el.tagName !== 'A' && !this.hasFocusableChild(el)) {
				if (!el.hasAttribute('role')) {
					el.setAttribute('role', 'button');
					el.setAttribute('tabindex', '0');
					console.warn('Non-semantic clickable element. Adding role="button".', el);
				}
			}
		});

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
	const pre = element.querySelector('pre');
	const codeBlock = element.querySelector('pre code');
	if (!pre || !codeBlock) return;

	const rawText = codeBlock.textContent;

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

	import('./lib/modules/nui-syntax-highlight.js').then(module => {
		let lang = codeBlock.getAttribute('data-lang');

		if (!lang) {
			const code = codeBlock.textContent.trim();
			if (/^<[!/?\w]/.test(code) || /<!DOCTYPE/i.test(code)) {
				lang = 'html';
			}
			else if (/^\s*[{\[]/.test(code) && /"[\w-]+":\s*/.test(code)) {
				lang = 'json';
			}
			else if (/\b(interface|type|enum|namespace|declare)\b/.test(code) || /:\s*(string|number|boolean|any)\b/.test(code)) {
				lang = 'typescript';
			}
			else if (/[.#][\w-]+\s*{/.test(code) || /@media|@import/.test(code)) {
				lang = 'css';
			}
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
	}).catch(() => {});
});

registerComponent('nui-link-list', (element) => {
	const instanceId = ensureInstanceId(element, 'link-list');
	const stateKey = `${instanceId}:active`;
	const mode = element.getAttribute('mode') || 'tree';
	let activeItem = null;

	// ##### DATA LOADING & HTML GENERATION

	element.loadData = (data) => {
		const html = data.map(item => buildItemHTML(item)).join('');

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

			if (!link.getAttribute('href')) {
				e.preventDefault();
			}
		}
	});

	element.addEventListener('focusin', (e) => {
		if (mode === 'fold') {
			const header = e.target.closest('.group-header');
			if (header) {
				if (isMouseDown) return;
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

	if (columns) {
		element.style.columnCount = columns;
	}
	if (columnWidth) {
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

	if (direction === 'column') element.classList.add('direction-column');
	element.classList.add('align-' + align);
	element.classList.add('gap-' + gap);
});

// ################################# nui-dialog COMPONENT

registerComponent('nui-dialog', (element) => {
	const dialog = element.querySelector('dialog');
	if (!dialog) return;

	let isAnimating = false;
	let cancelDialogAni = null;
	let cancelBackdropAni = null;
	let fakeBackdrop = null;

	const cleanup = () => {
		if (cancelDialogAni) cancelDialogAni();
		if (cancelBackdropAni) cancelBackdropAni();
		cancelDialogAni = null;
		cancelBackdropAni = null;
		
		if (fakeBackdrop) {
			fakeBackdrop.remove();
			fakeBackdrop = null;
		}
		
		dialog.classList.remove('closing', 'ani-scale-in', 'ani-scale-out');
		isAnimating = false;
	};

	element.showModal = () => {
		if (dialog.open) return;
		
		cleanup(); // Cancel any pending close animation
		dialog.showModal();
		isAnimating = true;
		cancelDialogAni = nui.cssAnimation(dialog, 'ani-scale-in', () => {
			isAnimating = false;
			cancelDialogAni = null;
		});
		knower.tell(`dialog:${element.id}:open`, true);
	};

	element.close = (returnValue) => {
		if (!dialog.open || isAnimating && dialog.classList.contains('closing')) return; // Already closing
		
		cleanup(); // Cancel any pending open animation
		isAnimating = true;
		
		dialog.classList.add('closing');
		fakeBackdrop = document.createElement('div');
		fakeBackdrop.className = 'nui-dialog-backdrop';
		document.body.appendChild(fakeBackdrop);
		
		cancelBackdropAni = nui.cssAnimation(fakeBackdrop, 'ani-fade-out');
		cancelDialogAni = nui.cssAnimation(dialog, 'ani-scale-out', () => {
			cleanup();
			dialog.close(returnValue);
		});
		knower.tell(`dialog:${element.id}:open`, false);
	};

	element.isOpen = () => dialog.open;

	dialog.addEventListener('close', () => {
		element.dispatchEvent(new CustomEvent('nui-dialog-close', { bubbles: true, detail: { returnValue: dialog.returnValue } }));
		knower.tell(`dialog:${element.id}:open`, false);
	});

	dialog.addEventListener('cancel', (e) => {
		e.preventDefault();
		element.close('cancel');
		element.dispatchEvent(new CustomEvent('nui-dialog-cancel', { bubbles: true }));
	});

	dialog.addEventListener('click', (e) => {
		const rect = dialog.getBoundingClientRect();
		const isInDialog = (rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
			rect.left <= e.clientX && e.clientX <= rect.left + rect.width);
		if (!isInDialog) {
			element.close('backdrop');
		}
	});

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

		nativeDialog.className = '';
		if (classes.length) nativeDialog.classList.add(...classes);

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
					<nui-button-container align="end">
						<button class="primary" id="nui-dialog-ok">OK</button>
					</nui-button-container>
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
					<nui-button-container align="end">
						<button class="outline" id="nui-dialog-cancel">Cancel</button>
						<button class="primary" id="nui-dialog-ok">OK</button>
					</nui-button-container>
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
					<nui-button-container align="end">
						<button class="outline" id="nui-dialog-cancel">Cancel</button>
						<button class="primary" id="nui-dialog-ok">OK</button>
					</nui-button-container>
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
					<nui-button-container align="end">
						<button class="primary" id="nui-dialog-enter">${options.label_button || 'Enter'}</button>
					</nui-button-container>
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
				<nui-button-container align="between">
					<button class="outline" id="nui-dialog-decline">
						${options.btn_abort || 'Decline'} <span id="consent-timer">(15)</span>
					</button>
					<button class="primary" id="nui-dialog-allow">${options.btn_allow || 'Allow'}</button>
				</nui-button-container>
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
				<nui-button-container align="end">
					<button class="outline" id="nui-dialog-stop">Stop</button>
				</nui-button-container>
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

		const body = dialog.querySelector('.nui-dialog-body');
		if (options.content instanceof Element) {
			body.appendChild(options.content);
		} else {
			body.innerHTML = options.content || '';
		}

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

// ################################# CONTENT LOADER & ROUTER

const registeredFeatures = new Map();
const registeredTypes = new Map();

function sanitizeRouteId(id) {
	if (!config.sanitizeRoutes) return id;
	return id
		.replace(/\.\./g, '')
		.replace(/[<>'"]/g, '')
		.replace(/^\/+/, '')
		.replace(/\/+/g, '/');
}

function parseUrl() {
	const hash = location.hash.slice(1);
	if (!hash) return null;

	const hashParams = new URLSearchParams(hash);
	const entries = [...hashParams.entries()];
	if (entries.length === 0) return null;

	const [type, id] = entries[0];
	const searchParams = Object.fromEntries(new URLSearchParams(location.search));

	return {
		type,
		id: sanitizeRouteId(id),
		params: searchParams
	};
}

function executePageScript(wrapper, params) {
	const scriptEl = wrapper.querySelector('script[type="nui/page"]');
	if (!scriptEl) return;

	scriptEl.remove();

	try {
		const initFn = new Function(
			'element',
			'params',
			'nui',
			scriptEl.textContent + '\nif (typeof init === "function") init(element, params);'
		);
		initFn(wrapper, params, nui);
	} catch (error) {
		console.error('[NUI] Page script error:', error);
	}
}

async function loadFragment(url, wrapper, params) {
	try {
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`Failed to load ${url} (${response.status})`);
		}

		const html = await response.text();
		wrapper.innerHTML = html;

		customElements.upgrade(wrapper);
		executePageScript(wrapper, params);

	} catch (error) {
		console.error('[NUI] Fragment load error:', error);
		wrapper.innerHTML = `
			<div class="error-page" style="padding: var(--nui-space-double); text-align: center;">
				<h1>Page Not Found</h1>
				<p>Could not load: <code>${url}</code></p>
				<p style="color: var(--color-text-dim);">${error.message}</p>
			</div>
		`;
	}
}

function pageContent(type, id, params, options = {}) {
	const wrapper = document.createElement('div');
	wrapper.className = `content-${type} content-${type}-${id.replace(/\//g, '-').replace(/[^a-z0-9-]/gi, '')}`;
	wrapper.innerHTML = '<div class="loading">Loading...</div>';

	if (type === 'page') {
		const basePath = options.basePath || '/pages';
		loadFragment(`${basePath}/${id}.html`, wrapper, params);
	} else if (type === 'feature') {
		const initFn = registeredFeatures.get(id);
		if (initFn) {
			wrapper.innerHTML = '';
			try {
				initFn(wrapper, params);
			} catch (error) {
				console.error(`[NUI] Feature init error (${id}):`, error);
				wrapper.innerHTML = `<div class="error">Feature error: ${error.message}</div>`;
			}
		} else {
			wrapper.innerHTML = `<div class="error">Unknown feature: ${id}</div>`;
		}
	} else {
		const typeHandler = registeredTypes.get(type);
		if (typeHandler) {
			wrapper.innerHTML = '';
			try {
				typeHandler(id, params, wrapper);
			} catch (error) {
				console.error(`[NUI] Type handler error (${type}):`, error);
				wrapper.innerHTML = `<div class="error">Handler error: ${error.message}</div>`;
			}
		} else {
			wrapper.innerHTML = `<div class="error">Unknown route type: ${type}</div>`;
		}
	}

	return wrapper;
}

function createRouter(container, options = {}) {
	const cache = new Map();
	const defaultRoute = options.default || null;
	const basePath = options.basePath || '/pages';
	let currentElement = null;
	let currentRoute = null;
	let isStarted = false;

	container = typeof container === 'string'
		? document.querySelector(container)
		: container;

	if (!container) {
		console.error('[NUI Router] Container not found');
		return null;
	}

	function getCacheKey(type, id) {
		return `${type}:${id}`;
	}

	function hideElement(element) {
		if (!element) return;
		element.inert = true;
		element.style.display = 'none';
		element.hide?.();
	}

	function showElement(element, params) {
		element.inert = false;
		element.style.display = '';
		element.show?.(params);

		requestAnimationFrame(() => {
			const focusTarget = element.querySelector('h1, h2, [autofocus], main') || element;
			if (focusTarget.tabIndex < 0) focusTarget.tabIndex = -1;
			focusTarget.focus({ preventScroll: true });
		});
	}

	function handleDeepLink(element, params) {
		if (params.id) {
			const target = element.querySelector(`#${params.id}`);
			if (target) {
				requestAnimationFrame(() => {
					target.scrollIntoView({ behavior: 'smooth', block: 'start' });
				});
			}
		} else {
			container.scrollTop = 0;
		}
	}

	function navigate(route) {
		if (!route) {
			if (defaultRoute) {
				location.hash = defaultRoute;
			}
			return;
		}

		const { type, id, params } = route;
		const cacheKey = getCacheKey(type, id);

		hideElement(currentElement);

		let element = cache.get(cacheKey);
		if (!element) {
			element = pageContent(type, id, params, { basePath });
			cache.set(cacheKey, element);
			container.appendChild(element);
		}

		showElement(element, params);
		handleDeepLink(element, params);

		currentElement = element;
		currentRoute = { type, id, params, element };

		knower.tell('route', currentRoute);
	}

	function handleHashChange() {
		const route = parseUrl();
		navigate(route);
	}

	function start() {
		if (isStarted) return;
		isStarted = true;
		window.addEventListener('hashchange', handleHashChange);
		handleHashChange();
	}

	function stop() {
		if (!isStarted) return;
		isStarted = false;
		window.removeEventListener('hashchange', handleHashChange);
	}

	function go(type, id, params = {}) {
		const hashValue = `${type}=${id}`;
		const searchParams = new URLSearchParams(params);
		const search = searchParams.toString();

		if (search) {
			history.pushState(null, '', `?${search}#${hashValue}`);
		} else {
			location.hash = hashValue;
		}
	}

	function uncache(type, id) {
		const cacheKey = getCacheKey(type, id);
		const element = cache.get(cacheKey);
		if (element) {
			element.remove();
			cache.delete(cacheKey);
		}
	}

	return {
		start,
		stop,
		go,
		uncache,
		get current() { return currentRoute; },
		get cache() { return cache; }
	};
}

function enableContentLoading(options = {}) {
	const containerSelector = options.container || 'nui-content main';
	const navigationSelector = options.navigation || 'nui-side-nav';
	const basePath = options.basePath || '/pages';
	const defaultPage = options.defaultPage || null;

	const container = typeof containerSelector === 'string'
		? document.querySelector(containerSelector)
		: containerSelector;

	if (!container) {
		console.error('[NUI] Content container not found:', containerSelector);
		return null;
	}

	const router = createRouter(container, {
		default: defaultPage ? `page=${defaultPage}` : null,
		basePath
	});

	const navigation = typeof navigationSelector === 'string'
		? document.querySelector(navigationSelector)
		: navigationSelector;

	if (navigation) {
		knower.watch('route', (route) => {
			if (!route) return;
			const hash = location.hash;
			let found = navigation.setActive?.(`a[href="${hash}"]`);
			if (!found && route.id) {
				found = navigation.setActive?.(`a[href*="${route.type}=${route.id}"]`);
			}
		});
	}

	doer.register('navigate', (target, source, event, param) => {
		if (param.includes('=')) {
			location.hash = param;
		} else {
			router.go('page', param);
		}
	});

	router.start();

	return router;
}

// ################################# INIT & PUBLIC API

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

	cssAnimation(element, className, callback) {
		const onEnd = () => {
			element.removeEventListener('animationend', onEnd);
			element.classList.remove(className);
			if (callback) callback(element);
		};
		element.addEventListener('animationend', onEnd);
		element.classList.add(className);
		
		return () => {
			element.removeEventListener('animationend', onEnd);
			element.classList.remove(className);
		};
	},

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

	registerFeature(name, initFn) {
		registeredFeatures.set(name, initFn);
	},

	registerType(type, handler) {
		registeredTypes.set(type, handler);
	},

	configure(options) {
		Object.assign(config, options);
	},

	knower: knower,
	doer: doer,

	createRouter(container, options = {}) {
		return createRouter(container, options);
	},

	enableContentLoading(options = {}) {
		return enableContentLoading(options);
	},

	dialog: dialogSystem
};

// ################################# AUTO-INITIALIZATION

if (typeof window !== 'undefined') {
	window.nui = nui;

	if (!window.nuiInitialized) {
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
}
