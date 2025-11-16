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

// ################################# DOM UTILITIES

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
	const mode = element.getAttribute('mode') || 'tree';
	let activeItem = null;
	let searchCache = null;
	
	element.loadData = (data) => {
		element.innerHTML = '';
		data.forEach(item => {
			element.innerHTML += buildItemHTML(item);
		});
		upgradeHtml();
		if (mode === 'fold') {
			element.querySelectorAll('.group-header').forEach(header => {
				header.setAttribute('tabindex', '0');
				header.setAttribute('role', 'button');
				initialCollapseGroup(header);
			});
		}
	};
	
	function buildItemHTML(item, nested = false) {
		if (item.separator) {
			return '<li class="separator"><hr></li>';
		}
		
		if (item.items) {
			let html = nested ? '<ul>' : '<ul>';
			html += buildGroupHeaderHTML(item);
			
			item.items.forEach(child => {
				if (child.separator) {
					html += buildItemHTML(child, true);
				} else if (child.items) {
					html += buildItemHTML(child, true);
				} else {
					html += buildLinkItemHTML(child);
				}
			});
			
			html += nested ? '</ul>' : '</ul>';
			return html;
		} else {
			return nested ? buildLinkItemHTML(item) : '<ul>' + buildLinkItemHTML(item) + '</ul>';
		}
	}
	
	function buildGroupHeaderHTML(item) {
		let html = '<li class="group-header"><span>';
		if (item.icon) html += `<nui-icon name="${item.icon}"></nui-icon>`;
		html += `<span>${item.label}</span>`;
		html += '</span>';
		
		if (item.action) {
			html += `<button type="button" class="action" nui-event-click="${item.action}">`;
			html += '<nui-icon name="settings"></nui-icon>';
			html += '</button>';
		}
		
		html += '</li>';
		return html;
	}
	
	function buildLinkItemHTML(item) {
		let html = '<li>';
		html += `<a href="${item.href || '#'}"`;
		if (item.event) html += ` nui-event-click="${item.event}"`;
		html += '>';
		if (item.icon) html += `<nui-icon name="${item.icon}"></nui-icon>`;
		html += `<span>${item.label}</span>`;
		html += '</a>';
		html += '</li>';
		return html;
	}
	
	// ##### FEATURE 2: ACTIVE ITEM TRACKING & FOLD MODE
	
	element.setActiveItem = (selector) => {
		const item = typeof selector === 'string' ? element.querySelector(selector) : selector;
		if (!item) return;
		
		if (activeItem) activeItem.classList.remove('active');
		activeItem = item;
		item.classList.add('active');
		
		let parent = item.closest('ul');
		while (parent && element.contains(parent)) {
			const header = parent.querySelector(':scope > .group-header');
			if (header) setGroupState(header, true);
			parent = parent.parentElement?.closest('ul');
		}
	};
	
	element.clearActive = () => {
		if (activeItem) {
			activeItem.classList.remove('active');
			activeItem = null;
		}
	};
	
	function setGroupState(header, expand) {
		header.setAttribute('aria-expanded', expand);
		const container = header.nextElementSibling;
		if (!container?.classList.contains('group-items')) return;
		
		if (expand) {
			container.style.height = container.scrollHeight + 'px';
		} else {
			if (container.style.height === '' || container.style.height === 'auto') {
				container.style.height = container.scrollHeight + 'px';
				container.offsetHeight;
			}
			container.style.height = '0px';
		}
		
		if (container._nuiHeightHandler) {
			container.removeEventListener('transitionend', container._nuiHeightHandler);
		}
		container._nuiHeightHandler = (e) => {
			if (e.target !== container || e.propertyName !== 'height') return;
			container.style.height = header.getAttribute('aria-expanded') === 'true' ? 'auto' : '0px';
			container.removeEventListener('transitionend', container._nuiHeightHandler);
			container._nuiHeightHandler = null;
		};
		container.addEventListener('transitionend', container._nuiHeightHandler);
	}
	
	function toggleGroup(header) {
		const expanded = header.getAttribute('aria-expanded') === 'true';
		if (expanded) {
			setGroupState(header, false);
		} else {
			if (mode === 'fold' && !header.closest('ul ul')) {
				element.querySelectorAll(':scope > ul > .group-header').forEach(h => {
					if (h !== header) setGroupState(h, false);
				});
			}
			setGroupState(header, true);
		}
	}
	
	// ##### FEATURE 3: SEARCH/FILTER
	
	element.search = (query) => {
		if (!searchCache) buildSearchCache();
		
		const q = query.toLowerCase().trim();
		if (!q) {
			element.clearSearch();
			return;
		}
		
		let visibleCount = 0;
		
		searchCache.forEach(entry => {
			const matches = entry.text.includes(q);
			entry.element.classList.toggle('nui-hidden', !matches);
			
			if (matches) {
				visibleCount++;
				// Show parent groups
				let parent = entry.element.closest('ul');
				while (parent && element.contains(parent)) {
					parent.classList.remove('nui-hidden');
					const header = parent.querySelector(':scope > .group-header');
					if (header && mode === 'fold') setGroupState(header, true);
					parent = parent.parentElement?.closest('ul');
				}
			}
		});
		
		// Hide empty groups
		element.querySelectorAll('.group-header').forEach(header => {
			const ul = header.parentElement.querySelector(':scope > ul');
			if (ul) {
				const hasVisible = ul.querySelector('li:not(.nui-hidden)');
				header.classList.toggle('nui-hidden', !hasVisible);
			}
		});
		
		element.setAttribute('data-search-active', 'true');
		element.setAttribute('data-search-query', query);
	};
	
	element.clearSearch = () => {
		element.querySelectorAll('.nui-hidden').forEach(el => {
			el.classList.remove('nui-hidden');
		});
		element.removeAttribute('data-search-active');
		element.removeAttribute('data-search-query');
	};
	
	element.getSearchStats = () => {
		const total = searchCache?.length || 0;
		const visible = element.querySelectorAll('li:not(.nui-hidden) a, li:not(.nui-hidden) .group-header').length;
		return {
			total,
			visible,
			query: element.getAttribute('data-search-query') || ''
		};
	};
	
	function buildSearchCache() {
		searchCache = [];
		element.querySelectorAll('li').forEach(li => {
			const text = li.textContent.toLowerCase();
			searchCache.push({ element: li, text });
		});
	}
	
	// ##### FEATURE 4: KEYBOARD NAVIGATION
	
	function handleKeyboard(e) {
		const target = e.target.closest('a, .group-header');
		if (!target) return;
		
		if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
			e.preventDefault();
			const all = Array.from(element.querySelectorAll('a:not(.nui-hidden), .group-header:not(.nui-hidden)'));
			const idx = all.indexOf(target);
			const next = e.key === 'ArrowDown' ? all[idx + 1] : all[idx - 1];
			if (next) {
				if (next.tagName === 'A') next.focus();
				else next.querySelector('span')?.focus();
			}
		} else if (e.key === 'Home') {
			e.preventDefault();
			const first = element.querySelector('a, .group-header span');
			first?.focus();
		} else if (e.key === 'End') {
			e.preventDefault();
			const all = element.querySelectorAll('a:not(.nui-hidden), .group-header:not(.nui-hidden) span');
			all[all.length - 1]?.focus();
		}
	}
	
	// ##### INITIALIZATION
	
	function upgradeHtml() {
		element.querySelectorAll('.group-header').forEach(header => {
			if (header.nextElementSibling?.classList.contains('group-items')) return;
			
			const items = [];
			let sibling = header.nextElementSibling;
			while (sibling && !sibling.classList?.contains('group-header')) {
				if (sibling.tagName === 'LI' || sibling.tagName === 'UL') {
					if (sibling.tagName === 'LI') sibling.classList.add('list-item');
					items.push(sibling);
				}
				sibling = sibling.nextElementSibling;
			}
			
			if (items.length) {
				const container = document.createElement('div');
				container.className = 'group-items';
				items.forEach(item => container.appendChild(item));
				header.parentElement.insertBefore(container, header.nextElementSibling);
			}
		});
	}
	
	function initialCollapseGroup(header) {
		// Set initial collapsed state without triggering parent updates
		header.setAttribute('aria-expanded', 'false');
		const container = header.nextElementSibling;
		if (container && container.classList.contains('group-items')) {
			container.style.height = '0px';
		}
	}
	
	function init() {
		// Upgrade HTML structure first
		upgradeHtml();
		
		// Make group headers interactive in fold mode
		if (mode === 'fold') {
			element.querySelectorAll('.group-header').forEach(header => {
				header.setAttribute('tabindex', '0');
				header.setAttribute('role', 'button');
				initialCollapseGroup(header);
			});
		}
		
		// Group header click handlers
		element.addEventListener('click', (e) => {
			const header = e.target.closest('.group-header');
			if (header && mode === 'fold') {
				toggleGroup(header);
			}
		});
		
		// Keyboard navigation
		element.addEventListener('keydown', handleKeyboard);
		
		// Search input binding
		const searchInput = document.querySelector(`[nui-search-target="${element.id}"]`);
		if (searchInput) {
			let debounce;
			searchInput.addEventListener('input', (e) => {
				clearTimeout(debounce);
				debounce = setTimeout(() => {
					element.search(e.target.value);
				}, 150);
			});
		}
	}
	
	init();
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
