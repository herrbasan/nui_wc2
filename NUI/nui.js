// ################################# CORE SYSTEMS

const components = {};

const nuiBasePath = new URL('.', import.meta.url).pathname.replace(/\/$/, '');

const config = {
	sanitizeActions: true,
	sanitizeRoutes: true,
	iconSpritePath: `${nuiBasePath}/assets/material-icons-sprite.svg`
};

// ################################# MINIMAL EVENT DELEGATION

const builtinActionHandlers = {
	'banner-show': (t, _, e) => {
		if (t?.show) { e.stopPropagation(); t.show(); return true; }
		return false;
	},
	'banner-close': (t, _, e, p) => {
		if (t?.close) { e.stopPropagation(); t.close(p); return true; }
		return false;
	},
	'scroll-to-top': (t, el) => {
		const scrollable = (t !== el) ? t : el.closest('nui-main') || document.querySelector('nui-main');
		if (scrollable) { scrollable.scrollTo({ top: 0, behavior: 'smooth' }); return true; }
		return false;
	}
};

function resolveAction(name) {
	let ctx = nui;
	for (const p of name.split('.')) {
		if (ctx && p in ctx) ctx = ctx[p];
		else return null;
	}
	return typeof ctx === 'function' ? ctx : null;
}

function setupActionDelegation() {
	document.addEventListener('click', (e) => {
		const el = e.target.closest('[data-action]');
		if (!el) return;

		const spec = el.dataset.action;
		if (!spec) return;

		const [part, sel] = spec.split('@');
		const [name, param] = part.split(':');

		const target = sel ? document.el(sel) : el;

		const fn = resolveAction(name);
		if (fn) return fn(target, el, e, param);

		if (builtinActionHandlers[name]?.(target, el, e, param)) return;

		const detail = { name, target, param, originalEvent: e };
		el.dispatchEvent(new CustomEvent('nui-action', { bubbles: true, detail }));
		el.dispatchEvent(new CustomEvent(`nui-action-${name}`, { bubbles: true, detail }));
	});
}

// ################################# ATTRIBUTE PROXY SYSTEM

function setupAttributeProxy(element, handlers = {}) {
	const original = {
		setAttribute: element.setAttribute.bind(element),
		removeAttribute: element.removeAttribute.bind(element),
		toggleAttribute: element.toggleAttribute.bind(element)
	};

	element.setAttribute = function (n, v) {
		const old = this.getAttribute(n);
		original.setAttribute(n, v);
		handlers[n]?.(v, old);
	};

	element.removeAttribute = function (n) {
		const old = this.getAttribute(n);
		original.removeAttribute(n);
		handlers[n]?.(null, old);
	};

	element.toggleAttribute = function (n, force) {
		const old = this.hasAttribute(n);
		const res = original.toggleAttribute(n, force);
		const now = this.hasAttribute(n);
		if (old !== now) handlers[n]?.(now ? '' : null, old ? '' : null);
		return res;
	};

	element._originalAttributeMethods = original;
	return original;
}

function defineAttributeProperty(element, propName, attrName = propName) {
	Object.defineProperty(element, propName, {
		get() { return this.getAttribute(attrName); },
		set(v) { v == null ? this.removeAttribute(attrName) : this.setAttribute(attrName, v); },
		enumerable: true, configurable: true
	});
}

// ################################# DOM UTILITIES

const dom = {
	create(tag, options = {}) {
		const el = document.createElement(tag);
		if (options.id) el.id = options.id;

		if (options.class) {
			const c = options.class;
			const classList = (Array.isArray(c) ? c : [c])
				.filter(Boolean)
				.flatMap(cls => typeof cls === 'string' ? cls.split(/\s+/).filter(Boolean) : []);
			if (classList.length) el.classList.add(...classList);
		}

		if (options.style) {
			if (typeof options.style === 'string') el.style.cssText = options.style;
			else Object.entries(options.style).forEach(([p, v]) => el.style[p] = v);
		}

		if (options.data) Object.entries(options.data).forEach(([k, v]) => el.dataset[k] = v);

		if (options.attrs) {
			Object.entries(options.attrs).forEach(([k, v]) => v != null && el.setAttribute(k, v));
		}

		if (options.events) Object.entries(options.events).forEach(([e, h]) => el.addEventListener(e, h));

		if (options.text) el.textContent = options.text;

		if (options.content) {
			if (typeof options.content === 'string') el.innerHTML = options.content;
			else if (Array.isArray(options.content)) el.append(...options.content.filter(Boolean));
			else el.append(options.content);
		}

		if (options.target) options.target.append(el);
		return el;
	},

	svg(tag, attrs = {}) {
		const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
		Object.entries(attrs).forEach(([k, v]) => v != null && el.setAttribute(k, v));
		return el;
	},

	el: (s, c = document) => s instanceof Element ? s : c.querySelector(s),
	els: (s, c = document) => s instanceof NodeList || s instanceof Array ? [...s] : [...c.querySelectorAll(s)]
};

// Extend native prototypes for convenience
if (typeof window !== 'undefined') {
	['Element', 'Document', 'DocumentFragment'].forEach(t => {
		if (!window[t]) return;
		Object.defineProperties(window[t].prototype, {
			el: { value: function (s) { return s instanceof Element ? s : this.querySelector(s); }, writable: true, configurable: true },
			els: { value: function (s) { return s instanceof NodeList || s instanceof Array ? [...s] : [...this.querySelectorAll(s)]; }, writable: true, configurable: true }
		});
	});
}

// ################################# COMPONENT FACTORY

function createComponent(tagName, setupFn, cleanupFn) {
	return class extends HTMLElement {
		connectedCallback() {
			const c = setupFn?.(this);
			if (typeof c === 'function') this._c = c;
		}
		disconnectedCallback() {
			if (this._originalAttributeMethods) {
				Object.assign(this, this._originalAttributeMethods);
				delete this._originalAttributeMethods;
			}
			this._c?.();
			cleanupFn?.(this);
		}
	};
}

function registerComponent(tagName, setupFn, cleanupFn) {
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

// ################################# ACCESSIBILITY

const a11y = {
	hasLabel(element) {
		return element.hasAttribute('aria-label') ||
			element.hasAttribute('aria-labelledby') ||
			element.hasAttribute('title');
	},

	hasFocusableChild(element) {
		return element.el('button, a[href], input, select, textarea, [tabindex]');
	},

	getTextLabel(element) {
		const span = element.el('span');
		return span ? span.textContent.trim() : element.textContent.trim();
	},

	makeInteractive(element, label = null) {
		const nativeButton = element.el('button');
		const nativeLink = element.el('a[href]');
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

		const icon = button.el('nui-icon');
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

		const heading = landmark.el('h1, h2, h3, h4, h5, h6');
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
		element.els('button').forEach(btn => this.ensureButtonLabel(btn));

		element.els('[onclick], [data-action]').forEach(el => {
			if (el.tagName !== 'BUTTON' && el.tagName !== 'A' && !this.hasFocusableChild(el)) {
				if (!el.hasAttribute('role')) {
					el.setAttribute('role', 'button');
					el.setAttribute('tabindex', '0');
					console.warn('Non-semantic clickable element. Adding role="button".', el);
				}
			}
		});

		element.els('nav, [role="navigation"]').forEach(nav => {
			this.ensureLandmarkLabel(nav);
		});
	}
};

function upgradeAccessibility(element) {
	a11y.upgrade(element);
}

// ################################# COMPONENT REGISTRATION

registerComponent('nui-button', (element) => {
	const button = element.el('button');
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

const iconTemplate = dom.svg('svg', {
	width: '24',
	height: '24',
	viewBox: '0 0 24 24',
	fill: 'currentColor',
	'aria-hidden': 'true',
	focusable: 'false'
});
iconTemplate.appendChild(dom.svg('use'));

registerComponent('nui-icon', (element) => {
	const name = element.getAttribute('name');
	if (!name) return console.warn('nui-icon: Missing "name" attribute');

	element.setAttribute('aria-hidden', 'true');
	if (element.textContent.trim()) element.textContent = '';

	let svg = element.el('svg');
	if (!svg) {
		svg = iconTemplate.cloneNode(true);
		element.append(svg);
	}

	let use = svg.el('use');
	if (!use) {
		use = dom.svg('use');
		svg.append(use);
	}

	const updateIcon = (n) => use.setAttribute('href', n ? `${config.iconSpritePath}#${n}` : '');
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
		if (!element.el('.loading-overlay')) {
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
	let cachedBreakpoint = null;

	function getBreakpoint(element) {
		if (cachedBreakpoint !== null) return cachedBreakpoint;
		if (!element.el('nui-side-nav')) return null;

		const fb = element.getAttribute('nui-vars-sidebar_force-breakpoint');
		const m = fb?.match(/^(\d+(?:\.\d+)?)(px|rem|em)?$/);

		if (!m) return cachedBreakpoint = 768;

		const v = parseFloat(m[1]);
		return cachedBreakpoint = (m[2] === 'rem' || m[2] === 'em') ? v * 16 : v;
	}

	function dispatchSideNavEvent(state) {
		element.dispatchEvent(new CustomEvent('nui-sidenav-change', {
			bubbles: true,
			detail: { state }
		}));
	}

	function updateResponsiveState(element) {
		const sideNav = element.el('nui-side-nav');
		if (!sideNav) {
			if (!element.classList.contains('nui-ready')) {
				requestAnimationFrame(() => element.classList.add('nui-ready'));
			}
			return;
		}

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

		// Update menu toggle button state
		const menuToggle = element.el('[data-action="toggle-sidebar"]');
		if (menuToggle) {
			if (isForced) {
				menuToggle.setAttribute('disabled', 'true');
				menuToggle.setAttribute('aria-hidden', 'true');
				menuToggle.setAttribute('tabindex', '-1');
			} else {
				menuToggle.removeAttribute('disabled');
				menuToggle.removeAttribute('aria-hidden');
				menuToggle.removeAttribute('tabindex');
			}
		}

		dispatchSideNavEvent(newState);

		if (!element.classList.contains('nui-ready')) {
			requestAnimationFrame(() => element.classList.add('nui-ready'));
		}
	}

	function toggleSideNav(element) {
		if (element.classList.contains('sidenav-forced')) return;

		const isOpen = element.classList.contains('sidenav-open');

		if (isOpen) {
			element.classList.remove('sidenav-open');
			element.classList.add('sidenav-closed');
			dispatchSideNavEvent('closed');
		} else {
			element.classList.remove('sidenav-closed');
			element.classList.add('sidenav-open');
			dispatchSideNavEvent('open');
		}
	}

	function updateLayoutClasses(element) {
		const topNav = element.el('nui-top-nav');
		const sideNav = element.el('nui-side-nav');
		const footer = element.el('nui-app-footer');

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
			const sideNav = element.el('nui-side-nav');
			const topNav = element.el('nui-top-nav');

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
	};
});

registerComponent('nui-top-nav', (element) => {
	const header = element.el('header');
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
	const linkList = element.el('nui-link-list');
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

	const app = element.closest('nui-app');

	if (app) {
		element.addEventListener('focusin', () => {
			if (app.classList.contains('sidenav-closed') && !app.classList.contains('sidenav-forced')) {
				app.toggleSideNav?.();
			}
		});

		element.addEventListener('focusout', (event) => {
			if (!app.classList.contains('sidenav-open') || app.classList.contains('sidenav-forced')) return;
			const next = event.relatedTarget;
			if (next && element.contains(next)) return;
			app.toggleSideNav?.();
		});
	}
});

registerComponent('nui-code', (element) => {
	// Check for <script type="example"> pattern first
	const exampleScript = element.querySelector('script[type="example"]');
	if (exampleScript) {
		const lang = exampleScript.getAttribute('data-lang') || 'html';
		const rawText = exampleScript.textContent.trim();
		
		// Create the structure
		const pre = document.createElement('pre');
		const codeBlock = document.createElement('code');
		codeBlock.setAttribute('data-lang', lang);
		codeBlock.textContent = rawText;
		pre.appendChild(codeBlock);
		
		// Replace the script with the pre/code structure
		exampleScript.replaceWith(pre);
		
		// Continue with normal processing
		setupCodeBlock(element, pre, codeBlock, rawText);
		return;
	}
	
	// Original pattern: <pre><code>
	const pre = element.el('pre');
	const codeBlock = element.el('pre code');
	if (!pre || !codeBlock) return;

	const rawText = codeBlock.textContent;
	setupCodeBlock(element, pre, codeBlock, rawText);
});

function setupCodeBlock(element, pre, codeBlock, rawText) {

	const copyButton = dom.create('button', {
		class: 'nui-code-copy',
		attrs: { type: 'button', 'aria-label': 'Copy code to clipboard', title: 'Copy code' },
		content: '<nui-icon name="content_copy"></nui-icon>'
	});

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
	}).catch(() => { });
}

registerComponent('nui-link-list', (element) => {
	const mode = element.getAttribute('mode') || 'tree';
	let activeItem = null;

	function dispatchActiveEvent(data) {
		element.dispatchEvent(new CustomEvent('nui-active-change', {
			bubbles: true,
			detail: data
		}));
	}

	// ##### DATA LOADING & HTML GENERATION

	element.loadData = (data) => {
		const html = data.map(item => buildItemHTML(item)).join('');

		const columnFlow = element.el('nui-column-flow');
		if (columnFlow) {
			columnFlow.innerHTML = html;
		} else {
			element.innerHTML = html;
		}

		upgradeHtml();
		if (mode === 'fold') {
			element.els('.group-header').forEach(h => {
				setGroupState(h, false);
			});
		}
	};

	function buildItemHTML(item, nested = false) {
		if (item.separator) return '<li class="separator" role="none"><hr></li>';
		if (item.items) {
			const children = item.items.map(i => buildItemHTML(i, true)).join('');
			return `<ul role="group">${buildGroupHeaderHTML(item)}<div class="group-items" role="presentation">${children}</div></ul>`;
		}
		const hrefAttr = item.href ? ` href="${item.href}"` : ' href=""';
		const dataAction = item.action ? ` data-action="${item.action}"` : '';
		const link = `<li class="list-item" role="none"><a${hrefAttr}${dataAction} role="treeitem">` +
			`${item.icon ? `<nui-icon name="${item.icon}"></nui-icon>` : ''}<span>${item.label}</span></a></li>`;
		return nested ? link : `<ul role="group">${link}</ul>`;
	}

	function buildGroupHeaderHTML(item) {
		const action = item.headerAction ? `<button type="button" class="action" data-action="${item.headerAction}" aria-label="Settings"><nui-icon name="settings"></nui-icon></button>` : '';
		return `<li class="group-header" role="none"><button type="button" class="group-toggle" role="treeitem" aria-expanded="false">${item.icon ? `<nui-icon name="${item.icon}"></nui-icon>` : ''}<span>${item.label}</span></button>${action}</li>`;
	}

	// ##### STATE MANAGEMENT

	function updateActive(newItem) {
		const toggle = (item, add) => {
			if (!item) return;
			item.classList.toggle('active', add);
			const p = item.parentElement;
			if (p) {
				p.classList.toggle('active', add);
			}
			add ? item.setAttribute('aria-selected', 'true') : item.removeAttribute('aria-selected');
		};
		toggle(activeItem, false);
		activeItem = newItem;
		toggle(activeItem, true);
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
		element.els('.group-header').forEach(header => {
			setGroupState(header, keepOpen.has(header));
		});
	}

	function setGroupState(header, expand) {
		const button = header.el('.group-toggle') || header;
		button.setAttribute('aria-expanded', expand);
		const container = header.nextElementSibling;
		if (!container?.classList.contains('group-items')) return;

		if (expand && container.style.height === 'auto') return;
		if (!expand && container.style.height === '0px') return;

		if (container.scrollHeight === 0) {
			container.style.height = expand ? 'auto' : '0px';
			return;
		}

		container.style.height = container.scrollHeight + 'px';
		if (!expand) container.offsetHeight;
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
		const item = typeof selector === 'string' ? element.el(selector) : selector;
		if (!item) return false;

		updateActive(item);
		const path = getPathHeaders(item);

		if (mode === 'fold') updateAccordionState(path);
		else path.forEach(h => setGroupState(h, true));

		dispatchActiveEvent({
			element: item,
			href: item.getAttribute('href'),
			text: item.textContent.trim(),
			timestamp: Date.now()
		});
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
			dispatchActiveEvent(null);
		}
		if (closeAll) {
			element.els('.group-header').forEach(h => setGroupState(h, false));
		}
	};

	element.clearSubs = () => {
		element.els('.group-header').forEach(h => setGroupState(h, false));
	};

	// ##### INITIALIZATION

	function upgradeHtml() {
		element.els('.group-header').forEach(header => {
			if (header.nextElementSibling?.classList.contains('group-items')) return;
			const items = [];
			let next = header.nextElementSibling;
			while (next && !next.classList.contains('group-header')) {
				if (next.tagName === 'LI') next.classList.add('list-item');
				items.push(next);
				next = next.nextElementSibling;
			}
			if (items.length) {
				const div = dom.create('div', {
					class: 'group-items',
					attrs: { role: 'presentation' },
					content: items
				});
				header.after(div);
			}
		});
	}

	function upgradeAccessibility() {
		if (!element.hasAttribute('role')) element.setAttribute('role', 'tree');
		element.els('ul').forEach(ul => {
			if (!ul.hasAttribute('role')) ul.setAttribute('role', 'group');
		});
		element.els('li:not(.group-header):not(.separator)').forEach(li => {
			if (!li.hasAttribute('role')) li.setAttribute('role', 'none');
		});
		element.els('a').forEach(link => {
			if (!link.hasAttribute('role')) link.setAttribute('role', 'treeitem');
			if (link.closest('.active')) link.setAttribute('aria-selected', 'true');
		});
		element.els('.group-header').forEach(header => {
			if (!header.hasAttribute('role')) header.setAttribute('role', 'none');
			const button = header.el('.group-toggle');
			if (button) {
				if (!button.hasAttribute('role')) button.setAttribute('role', 'treeitem');
				if (!button.hasAttribute('aria-expanded')) button.setAttribute('aria-expanded', 'false');
			}
		});
	}

	let isMouseDown = false;
	element.addEventListener('mousedown', () => {
		isMouseDown = true;
		setTimeout(() => isMouseDown = false, 500);
	});

	element.addEventListener('click', (e) => {
		const groupToggle = e.target.closest('.group-toggle');
		if (groupToggle) {
			const header = groupToggle.closest('.group-header');
			if (header) {
				const expand = groupToggle.getAttribute('aria-expanded') !== 'true';
				if (mode === 'fold' && expand) {
					const path = getPathHeaders(header);
					path.add(header);
					updateAccordionState(path);
				} else {
					setGroupState(header, expand);
					if (!expand) {
						header.nextElementSibling?.els('.group-header').forEach(h => setGroupState(h, false));
					}
				}
			}
			return;
		}

		const link = e.target.closest('a');
		if (link) {
			updateActive(link);
			dispatchActiveEvent({
				element: link,
				href: link.getAttribute('href'),
				text: link.textContent.trim()
			});

			if (!link.getAttribute('href')) {
				e.preventDefault();
			}
		}
	});

	element.addEventListener('focusin', (e) => {
		if (mode === 'fold') {
			const groupToggle = e.target.closest('.group-toggle');
			if (groupToggle) {
				if (isMouseDown) return;
				const header = groupToggle.closest('.group-header');
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
		const target = e.target.closest('a, .group-toggle');
		if (!target) return;

		const items = element.els('a, .group-toggle').filter(el => {
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
		element.els('.group-header').forEach(h => {
			setGroupState(h, false);
		});
	}

	upgradeAccessibility();
});

registerComponent('nui-content', (element) => {
	// nui-content is the positioning context for content area
	// nui-main handles the scroll behavior
	upgradeAccessibility(element);
});

registerComponent('nui-main', (element) => {
	// nui-main is the scroll container for content
	if (!element.hasAttribute('role')) {
		element.setAttribute('role', 'main');
	}
	if (!element.hasAttribute('id')) {
		element.setAttribute('id', 'main-content');
	}
	upgradeAccessibility(element);
});

registerComponent('nui-app-footer', (element) => {
	const footer = element.el('footer');
	if (footer) {
		const isMainFooter = !footer.closest('article, section, aside, main');
		if (isMainFooter && !footer.hasAttribute('role')) {
			footer.setAttribute('role', 'contentinfo');
		}
	}
});

registerComponent('nui-skip-links', (element) => {
	function buildSkipLink(target, label) {
		const targetEl = document.el(target);
		if (!targetEl) return null;

		let targetId = targetEl.id;
		if (!targetId) {
			targetId = `skip-target-${Math.random().toString(36).substr(2, 9)}`;
			targetEl.id = targetId;
		}

		if (!targetEl.hasAttribute('tabindex')) {
			targetEl.setAttribute('tabindex', '-1');
		}

		const link = dom.create('a', {
			attrs: { href: `#${targetId}` },
			class: 'skip-link',
			text: label
		});

		link.addEventListener('click', (e) => {
			e.preventDefault();
			targetEl.focus();
		});

		return link;
	}

	if (element.children.length === 0) {
		const app = element.closest('nui-app') || document.el('nui-app');
		const defaultLinks = [];

		// In app mode, only provide skip to main content
		// (topnav and sidenav are already visible in fixed positions)
		const main = document.el('main');
		if (main) {
			defaultLinks.push({ target: main, label: 'Skip to main content' });
		}

		defaultLinks.forEach(({ target, label }) => {
			const link = buildSkipLink(target, label);
			if (link) element.appendChild(link);
		});
	} else {
		element.els('a[href^="#"]').forEach(link => {
			const target = link.getAttribute('href');
			if (target && target !== '#') {
				const targetEl = document.el(target);
				if (targetEl && !targetEl.hasAttribute('tabindex')) {
					targetEl.setAttribute('tabindex', '-1');
				}
			}

			link.addEventListener('click', (e) => {
				e.preventDefault();
				const targetId = link.getAttribute('href');
				const targetEl = document.el(targetId);
				if (targetEl) {
					targetEl.focus();
				}
			});
		});
	}

	if (!element.hasAttribute('role')) {
		element.setAttribute('role', 'navigation');
	}
	if (!element.hasAttribute('aria-label')) {
		element.setAttribute('aria-label', 'Skip links');
	}
});

registerLayoutComponent('nui-icon-button');

// ################################# nui-layout COMPONENT

registerComponent('nui-layout', (element) => {
	const type = element.getAttribute('type') || 'grid';
	element.classList.add(`nui-layout-${type}`);

	if (type === 'grid') {
		handleGridLayout(element);
	} else if (type === 'flow') {
		handleFlowLayout(element);
	}
});

function handleGridLayout(element) {
	const columns = element.getAttribute('columns');
	const gap = element.getAttribute('gap');
	const n = parseInt(columns) || 1;

	if (gap) element.style.setProperty('--nui-layout-gap', gap);

	element.style.setProperty('--nui-layout-columns', n);
	element.style.setProperty('--nui-layout-columns-tablet', Math.min(n, 2));
}

function handleFlowLayout(element) {
	const columns = element.getAttribute('columns');
	const columnWidth = element.getAttribute('column-width');
	const sort = element.getAttribute('sort');
	const gap = element.getAttribute('gap');
	const n = parseInt(columns) || 1;

	if (gap) element.style.setProperty('--nui-layout-gap', gap);

	element.style.setProperty('--nui-layout-count', n);
	element.style.setProperty('--nui-layout-count-tablet', Math.min(n, 2));

	if (columnWidth?.startsWith('/')) {
		const divisor = parseInt(columnWidth.slice(1));
		if (!isNaN(divisor) && divisor > 0) {
			const containerWidth = element.offsetWidth;
			const gapValue = parseFloat(getComputedStyle(element).columnGap) || 0;
			const availableWidth = containerWidth - (gapValue * (divisor - 1));
			element.style.setProperty('--nui-layout-width', `${availableWidth / divisor}px`);
		}
	}

	if (sort === 'height') {
		const children = Array.from(element.children);
		children.sort((a, b) => b.offsetHeight - a.offsetHeight);
		children.forEach(child => element.appendChild(child));
	}
}

// ################################# nui-column-flow COMPONENT (Deprecated - use nui-layout type="flow")

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
	const dialog = element.el('dialog');
	if (!dialog) return;

	const close = (ret) => {
		dialog.classList.add('closing');
		dialog.addEventListener('transitionend', () => {
			dialog.classList.remove('closing');
			dialog.close(ret);
			element.dispatchEvent(new CustomEvent('nui-dialog-close', { bubbles: true, detail: { returnValue: ret } }));
		}, { once: true });
	};

	element.showModal = () => {
		dialog.showModal();
		element.dispatchEvent(new CustomEvent('nui-dialog-open', { bubbles: true }));
	};

	element.show = () => {
		dialog.show();
		element.dispatchEvent(new CustomEvent('nui-dialog-open', { bubbles: true }));
	};

	element.close = (ret) => {
		if (!dialog.open || dialog.classList.contains('closing')) return;
		close(ret);
	};

	element.isOpen = () => dialog.open;

	dialog.addEventListener('close', () => {
		if (!dialog.classList.contains('closing')) {
			element.dispatchEvent(new CustomEvent('nui-dialog-close', { bubbles: true, detail: { returnValue: dialog.returnValue } }));
		}
	});

	dialog.addEventListener('cancel', (e) => {
		e.preventDefault();
		if (!element.hasAttribute('blocking')) element.close('cancel');
		element.dispatchEvent(new CustomEvent('nui-dialog-cancel', { bubbles: true }));
	});

	dialog.addEventListener('click', (e) => {
		if (element.hasAttribute('blocking')) return;
		const rect = dialog.getBoundingClientRect();
		if (rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
			rect.left <= e.clientX && e.clientX <= rect.left + rect.width) return;
		element.close('backdrop');
	});
});

// ################################# nui-tabs COMPONENT

registerComponent('nui-tabs', (element) => {
	let tabList = element.el('[role="tablist"]');
	if (!tabList) {
		tabList = [...element.children].find(c => c.el('button, a'));
		tabList?.setAttribute('role', 'tablist');
	}
	if (!tabList) return;

	const tabs = tabList.els('button, a');
	tabs.forEach(t => {
		t.setAttribute('role', 'tab');
		if (t.tagName === 'A') t.addEventListener('click', e => e.preventDefault());
	});

	let panels = element.els('[role="tabpanel"]');
	if (!panels.length) {
		panels = [...element.children].filter(c => c !== tabList);
		panels.forEach(p => p.setAttribute('role', 'tabpanel'));
	}

	tabs.forEach((tab, i) => {
		let pid = tab.getAttribute('aria-controls') || tab.getAttribute('href')?.replace('#', '');
		let panel = pid ? element.el(`#${pid}`) : panels[i];

		if (panel) {
			if (!panel.id) panel.id = `nui-panel-${Date.now()}-${i}`;
			if (!tab.id) tab.id = `nui-tab-${Date.now()}-${i}`;

			tab.setAttribute('aria-controls', panel.id);
			panel.setAttribute('aria-labelledby', tab.id);
			if (!panels.includes(panel)) panels.push(panel);
		}
	});

	const activateTab = (targetTab, shouldAnimate = true) => {
		const panelId = targetTab.getAttribute('aria-controls');
		const targetPanel = element.el(`#${panelId}`);

		if (!targetPanel) return;

		const animate = shouldAnimate && !element.hasAttribute('no-animation') &&
			!window.matchMedia('(prefers-reduced-motion: reduce)').matches;

		let startHeight = 0;

		if (animate) {
			startHeight = element.offsetHeight;
			element.style.cssText = `height: ${startHeight}px; overflow: hidden; transition: height 0.3s ease-out`;
		}

		tabs.forEach(t => {
			t.setAttribute('aria-selected', 'false');
			t.setAttribute('tabindex', '-1');
		});
		panels.forEach(p => {
			p.hidden = true;
			p.style.display = 'none';
		});

		targetTab.setAttribute('aria-selected', 'true');
		targetTab.removeAttribute('tabindex');

		targetPanel.hidden = false;
		targetPanel.style.display = '';

		if (animate) {
			void element.offsetHeight;

			element.style.height = 'auto';
			const newHeight = element.scrollHeight;

			element.style.height = `${startHeight}px`;

			void element.offsetHeight;

			element.style.height = `${newHeight}px`;

			const onEnd = (e) => {
				if (e.target !== element) return;
				element.style.cssText = '';
				element.removeEventListener('transitionend', onEnd);
			};
			element.addEventListener('transitionend', onEnd);
		}

		element.dispatchEvent(new CustomEvent('nui-tab-change', {
			bubbles: true,
			detail: { tab: targetTab, panel: targetPanel }
		}));
	};

	tabList.addEventListener('click', (e) => {
		const tab = e.target.closest('[role="tab"]');
		if (tab && tabs.includes(tab)) {
			activateTab(tab);
		}
	});

	tabList.addEventListener('keydown', (e) => {
		const currentTab = e.target.closest('[role="tab"]');
		if (!currentTab) return;

		const index = tabs.indexOf(currentTab);
		let nextIndex = null;

		if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
			nextIndex = (index + 1) % tabs.length;
		} else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
			nextIndex = (index - 1 + tabs.length) % tabs.length;
		} else if (e.key === 'Home') {
			nextIndex = 0;
		} else if (e.key === 'End') {
			nextIndex = tabs.length - 1;
		}

		if (nextIndex !== null) {
			e.preventDefault();
			const nextTab = tabs[nextIndex];
			nextTab.focus();
			activateTab(nextTab);
		}
	});

	const initialTab = tabs.find(t => t.getAttribute('aria-selected') === 'true') || tabs[0];
	if (initialTab) {
		activateTab(initialTab, false);
	}
});

// ################################# nui-accordion COMPONENT

registerComponent('nui-accordion', (element) => {
	const details = element.els(':scope > details');
	const animate = !element.hasAttribute('no-animation') &&
		!window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	const animateDetails = (detail, opening) => {
		if (!animate) return;

		const summary = detail.el('summary');
		const content = detail.el('.accordion-content') || detail.lastElementChild;
		if (!summary || !content) return;

		const start = opening ? summary.offsetHeight : detail.offsetHeight;
		detail.style.cssText = `height: ${start}px; overflow: hidden; transition: height 0.3s ease-out`;

		if (opening) detail.open = true;
		void detail.offsetHeight;

		const end = opening ? detail.scrollHeight : summary.offsetHeight;
		detail.style.height = `${end}px`;

		const onEnd = (e) => {
			if (e.target !== detail) return;

			detail.style.cssText = '';

			if (!opening) detail.open = false;
			detail.removeEventListener('transitionend', onEnd);
		};
		detail.addEventListener('transitionend', onEnd);
	};

	if (animate) {
		details.forEach(detail => {
			const summary = detail.el('summary');
			if (!summary) return;

			summary.addEventListener('click', (e) => {
				e.preventDefault();

				if (element.hasAttribute('exclusive') && !detail.open) {
					details.forEach(d => {
						if (d !== detail && d.open) {
							animateDetails(d, false);
						}
					});
				}

				animateDetails(detail, !detail.open);
			});
		});
	} else if (element.hasAttribute('exclusive')) {
		details.forEach(targetDetail => {
			targetDetail.addEventListener('toggle', (e) => {
				if (targetDetail.open) {
					details.forEach(d => {
						if (d !== targetDetail && d.open) {
							d.removeAttribute('open');
						}
					});
				}
			});
		});
	}
});

// ################################# nui-table COMPONENT

registerComponent('nui-table', (element) => {
	const table = element.querySelector('table');
	if (!table) return;

	// Add enhanced class
	table.classList.add('nui-table-enhanced');

	// Get headers
	const ths = Array.from(table.querySelectorAll('thead th'));
	const headers = ths.map(th => th.textContent.trim());

	// Process rows
	const rows = Array.from(table.querySelectorAll('tbody tr'));
	const totalCells = rows.reduce((sum, row) => sum + row.children.length, 0);
	let tableCellIndex = 1;

	rows.forEach(row => {
		const cells = Array.from(row.children);
		cells.forEach((cell, i) => {
			if (headers[i]) {
				cell.setAttribute('data-label', headers[i]);
			}
			cell.setAttribute('data-row-cell-index', i + 1);
			cell.setAttribute('data-row-cell-total', cells.length);
			cell.setAttribute('data-table-cell-total', totalCells);
			cell.setAttribute('data-table-cell-index', tableCellIndex);
			tableCellIndex++;
		});
	});
});

// ################################# nui-slider COMPONENT

registerComponent('nui-slider', (element) => {
	// Find or create the native input
	let input = element.el('input[type="range"]');
	if (!input) {
		input = dom.create('input', {
			attrs: { type: 'range', min: '0', max: '100', value: '50' }
		});
		element.appendChild(input);
	}

	// Hide native input but keep it accessible
	input.classList.add('nui-slider-native');

	// Create visual elements
	const track = dom.create('div', { class: 'nui-slider-track', target: element });
	const fill = dom.create('div', { class: 'nui-slider-fill', target: track });
	const thumb = dom.create('div', { class: 'nui-slider-thumb', target: track });

	// Get range properties
	function getRange() {
		const min = parseFloat(input.min) || 0;
		const max = parseFloat(input.max) || 100;
		const step = parseFloat(input.step) || 1;
		return { min, max, step };
	}

	// Update visual position from input value
	function updateVisuals() {
		const { min, max } = getRange();
		const value = parseFloat(input.value);
		const percent = ((value - min) / (max - min)) * 100;
		fill.style.width = percent + '%';
		thumb.style.left = percent + '%';
	}

	// Set value from percentage
	function setValueFromPercent(percent) {
		const { min, max, step } = getRange();
		let value = min + (percent * (max - min));

		// Snap to step
		if (step > 0) {
			value = Math.round(value / step) * step;
		}

		// Clamp to range
		value = Math.max(min, Math.min(max, value));

		if (parseFloat(input.value) !== value) {
			input.value = value;
			input.dispatchEvent(new Event('input', { bubbles: true }));
		}
	}

	// Initial sync
	updateVisuals();

	// Listen to native input changes
	input.addEventListener('input', updateVisuals);

	// Enable drag interaction on track
	const cleanup = enableDrag(track, (data) => {
		setValueFromPercent(data.percentX);
		updateVisuals();

		if (data.type === 'start') {
			thumb.classList.add('active');
			element.classList.add('dragging');
		} else if (data.type === 'end') {
			thumb.classList.remove('active');
			element.classList.remove('dragging');
			input.dispatchEvent(new Event('change', { bubbles: true }));
		}
	});

	// Expose API on element
	element.getValue = () => parseFloat(input.value);
	element.setValue = (val) => {
		input.value = val;
		updateVisuals();
	};

	// Return cleanup function
	return cleanup;
});

// ################################# nui-banner COMPONENT

registerComponent('nui-banner', (element) => {
	let wrapper = element.el('.nui-banner-wrapper');
	let contentEl = element.el('.nui-banner-content');
	if (!wrapper) {
		const children = Array.from(element.childNodes);
		contentEl = dom.create('div', { class: 'nui-banner-content', content: children });
		wrapper = dom.create('div', { class: 'nui-banner-wrapper', content: contentEl, target: element });
	} else if (!contentEl) {
		const children = Array.from(wrapper.childNodes);
		contentEl = dom.create('div', { class: 'nui-banner-content', content: children, target: wrapper });
	}

	let autoCloseTimer = null;
	let originalParent = null;
	let originalNextSibling = null;

	if (element._bannerInitialized) return;
	element._bannerInitialized = true;

	const priority = element.getAttribute('priority') || 'info';
	element.setAttribute('role', priority === 'alert' ? 'alert' : 'status');
	element.setAttribute('aria-live', priority === 'alert' ? 'assertive' : 'polite');

	const moveToBannerLayer = () => {
		const contentArea = document.el('nui-app nui-content');
		if (!contentArea) return;

		let bannerLayer = contentArea.el(':scope > .nui-banner-layer');
		if (!bannerLayer) bannerLayer = dom.create('div', { class: 'nui-banner-layer', target: contentArea });

		if (element.parentElement === bannerLayer) return;

		originalParent = element.parentElement;
		originalNextSibling = element.nextSibling;
		bannerLayer.appendChild(element);
	};

	const restorePosition = () => {
		if (!originalParent) return;
		if (originalNextSibling && originalNextSibling.parentElement === originalParent) {
			originalParent.insertBefore(element, originalNextSibling);
		} else if (originalParent.isConnected) {
			originalParent.appendChild(element);
		}
		originalParent = null;
		originalNextSibling = null;
	};

	element.show = () => {
		if (element.hasAttribute('open')) return;
		if (element.closest('nui-content, nui-main')) moveToBannerLayer();

		element.setAttribute('open', '');
		element.dispatchEvent(new CustomEvent('nui-banner-open', { bubbles: true }));

		const autoClose = element.getAttribute('auto-close');
		if (autoClose && parseInt(autoClose, 10) > 0) {
			if (autoCloseTimer) clearTimeout(autoCloseTimer);
			autoCloseTimer = setTimeout(() => element.close('timeout'), parseInt(autoClose, 10));
		}
	};

	element.close = (action = 'close') => {
		if (!element.hasAttribute('open')) return;
		if (autoCloseTimer) clearTimeout(autoCloseTimer);

		element.classList.add('closing');
		element.addEventListener('transitionend', () => {
			element.classList.remove('closing');
			element.removeAttribute('open');
			restorePosition();
			element.dispatchEvent(new CustomEvent('nui-banner-close', { bubbles: true, detail: { action } }));
		}, { once: true });
	};

	element.update = (content) => {
		if (typeof content === 'string') {
			const textEl = element.el('p, span, [data-content]');
			if (textEl) textEl.textContent = content;
		}
	};

	element.isOpen = () => element.hasAttribute('open');
});

// ################################# INPUT COMPONENTS

function generateInputId(prefix = 'nui-input') {
	return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function setupInputBehavior(element, input, config = {}) {
	const { autoResize, showCount } = config;
	let errorEl, countEl, clearBtn;

	const dispatch = (name, detail = {}) => {
		element.dispatchEvent(new CustomEvent(name, {
			bubbles: true,
			detail: { ...detail, name: input.name || input.id || '' }
		}));
	};

	const ensureEl = (type, cls, role) => {
		let el = type === 'error' ? errorEl : countEl;
		if (!el) {
			el = dom.create('div', { class: cls, attrs: role ? { role } : {}, target: element });
			if (type === 'error') errorEl = el; else countEl = el;
		}
		return el;
	};

	const validate = () => {
		const valid = input.validity.valid;
		const hasValue = input.value !== '';
		const hasValidationRules = input.hasAttribute('required') || 
			input.hasAttribute('pattern') || 
			input.hasAttribute('minlength') || 
			input.hasAttribute('maxlength') || 
			input.hasAttribute('min') || 
			input.hasAttribute('max') ||
			element.hasAttribute('validate');
		
		// Show validation states if input has validation rules
		if (hasValidationRules) {
			element.classList.toggle('is-valid', valid && hasValue);
			element.classList.toggle('is-invalid', !valid);
		}

		if (!valid && input.validationMessage) {
			const el = ensureEl('error', 'nui-error-message', 'alert');
			el.textContent = input.validationMessage;
			input.setAttribute('aria-invalid', 'true');
			input.setAttribute('aria-describedby', el.id || (el.id = generateInputId('error')));
		} else {
			if (errorEl) errorEl.textContent = '';
			input.removeAttribute('aria-invalid');
			input.removeAttribute('aria-describedby');
		}
		return valid;
	};

	const updateState = () => {
		if (autoResize) {
			// Get min/max rows from attributes
			const minRows = parseInt(element.getAttribute('min-rows')) || 1;
			const maxRows = parseInt(element.getAttribute('max-rows')) || 999;
			
			// Calculate line height
			const style = getComputedStyle(input);
			const lineHeight = parseInt(style.lineHeight) || parseInt(style.fontSize) * 1.5;
			const padding = parseInt(style.paddingTop) + parseInt(style.paddingBottom);
			const border = parseInt(style.borderTopWidth) + parseInt(style.borderBottomWidth);
			
			// Set min height based on min-rows
			const minHeight = (lineHeight * minRows) + padding + border;
			const maxHeight = (lineHeight * maxRows) + padding + border;
			
			// Reset and measure
			input.style.height = minHeight + 'px';
			const scrollHeight = input.scrollHeight;
			
			// Constrain to min/max
			let newHeight = Math.max(minHeight, Math.min(scrollHeight, maxHeight));
			input.style.height = newHeight + 'px';
			
			// Set overflow based on whether we hit max
			input.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
		}
		if (showCount) {
			const el = ensureEl('count', 'nui-char-count');
			const max = input.maxLength > 0 ? input.maxLength : null;
			const len = input.value.length;
			el.textContent = max ? `${len} / ${max}` : len;
			if (max) el.classList.toggle('at-limit', len >= max);
		}
		if (clearBtn) clearBtn.style.display = input.value ? 'flex' : 'none';
	};

	if (element.hasAttribute('clearable')) {
		clearBtn = dom.create('button', {
			class: 'nui-clear-btn',
			attrs: { type: 'button', 'aria-label': 'Clear input' },
			style: 'display: none',
			content: '<nui-icon name="close"></nui-icon>',
			target: element
		});
		clearBtn.addEventListener('click', () => {
			input.value = '';
			input.focus();
			updateState();
			dispatch('nui-clear');
			dispatch('nui-input', { value: '', valid: true });
		});
	}

	input.addEventListener('input', () => {
		updateState();
		if (input.value !== '') validate();
		else {
			element.classList.remove('is-valid', 'is-invalid');
			if (errorEl) errorEl.textContent = '';
			input.removeAttribute('aria-invalid');
		}
		dispatch('nui-input', { value: input.value, valid: input.validity.valid });
	});

	input.addEventListener('blur', () => {
		validate();
		dispatch('nui-change', { value: input.value, valid: input.validity.valid });
	});

	element.validate = () => {
		const valid = validate();
		dispatch('nui-validate', { valid, message: input.validationMessage });
		return valid;
	};

	element.clear = () => {
		input.value = '';
		updateState();
		element.classList.remove('is-valid', 'is-invalid');
		if (errorEl) errorEl.textContent = '';
		dispatch('nui-clear');
	};

	element.focus = () => input.focus();

	if (autoResize) {
		input.style.boxSizing = 'border-box';
		updateState();
	} else {
		updateState();
	}
}

function setupCheckableBehavior(element, type) {
	const input = element.el(`input[type="${type}"]`);
	if (!input) return;

	const label = element.el('label');
	if (label && !label.htmlFor) {
		if (!input.id) input.id = generateInputId(type);
		label.htmlFor = input.id;
	}

	const isRadio = type === 'radio';
	const indicator = dom.create('span', {
		class: isRadio ? 'nui-radio-circle' : 'nui-check-box',
		attrs: { 'aria-hidden': 'true' },
		content: isRadio ? '' : `<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>`
	});

	input.after(indicator);

	element.addEventListener('click', (e) => {
		if (e.target === input || e.target === label || input.disabled) return;
		if (isRadio && input.checked) return;

		input.checked = isRadio ? true : !input.checked;
		input.dispatchEvent(new Event('change', { bubbles: true }));
	});

	input.addEventListener('change', () => {
		element.dispatchEvent(new CustomEvent('nui-change', {
			bubbles: true,
			detail: {
				checked: input.checked,
				value: input.value,
				name: input.name || input.id || ''
			}
		}));
	});
}

// ################################# nui-input-group COMPONENT

registerComponent('nui-input-group', (element) => {
	const label = element.el(':scope > label');
	const inputComponent = element.el('nui-input, nui-textarea, nui-checkbox, nui-radio');
	const input = inputComponent?.el('input, textarea');

	if (label && input && !input.id && !label.htmlFor) {
		const id = generateInputId();
		input.id = id;
		label.htmlFor = id;
	}

	if (input) {
		const updateState = () => {
			element.classList.toggle('has-error', !input.validity.valid && input.value !== '');
			element.classList.toggle('is-disabled', input.disabled);
			element.classList.toggle('is-required', input.required);
		};

		input.addEventListener('blur', updateState);
		input.addEventListener('input', () => {
			// Clear error on typing
			if (element.classList.contains('has-error') && input.validity.valid) {
				element.classList.remove('has-error');
			}
		});

		// Initial state
		updateState();
	}
});

// ################################# nui-input COMPONENT

registerComponent('nui-input', (element) => {
	const input = element.el('input');
	if (input) setupInputBehavior(element, input);
});

// ################################# nui-textarea COMPONENT

registerComponent('nui-textarea', (element) => {
	const textarea = element.el('textarea');
	if (!textarea) return;

	const autoResize = element.hasAttribute('auto-resize');
	const showCount = element.hasAttribute('show-count');

	setupInputBehavior(element, textarea, { autoResize, showCount });
});

// ################################# nui-checkbox COMPONENT

registerComponent('nui-checkbox', (element) => {
	setupCheckableBehavior(element, 'checkbox');
});

// ################################# nui-radio COMPONENT

registerComponent('nui-radio', (element) => {
	setupCheckableBehavior(element, 'radio');
});

// ################################# nui-tag-input COMPONENT
// Lightweight tag management for multi-select and standalone use

registerComponent('nui-tag-input', (element) => {
	const name = element.getAttribute('name') || '';
	const isEditable = element.hasAttribute('editable');
	const placeholder = element.getAttribute('placeholder') || 'Add tag...';

	// Internal state
	const tags = [];
	let activeIdx = -1;

	// Parse existing hidden inputs
	element.els('input[type="hidden"]').forEach(inp => {
		const val = inp.value?.trim();
		if (val && !tags.some(t => t.value === val)) {
			tags.push({ value: val, label: val });
		}
	});

	// Build DOM - tags container only focusable when there are tags to navigate
	const container = dom.create('div', {
		class: 'nui-tag-input-tags',
		attrs: { role: 'listbox', 'aria-label': 'Selected tags' },
		target: element
	});
	const liveRegion = dom.create('div', { class: 'visually-hidden', attrs: { 'aria-live': 'polite' }, target: element });
	let input = null;
	let nuiInput = null;

	// Keyboard navigation for tags container
	container.addEventListener('keydown', e => {
		if (!tags.length) return;
		const nav = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[e.key];
		if (nav !== undefined) {
			e.preventDefault();
			let next = activeIdx + nav;
			if (next < 0) next = tags.length - 1;
			else if (next >= tags.length) next = isEditable ? -1 : 0;
			if (next === -1 && isEditable) { input.focus(); return; }
			setActive(next);
		} else if (e.key === 'Home') {
			e.preventDefault(); setActive(0);
		} else if (e.key === 'End') {
			e.preventDefault();
			if (isEditable) { input.focus(); activeIdx = -1; updateHighlight(); }
			else setActive(tags.length - 1);
		} else if ((e.key === 'Backspace' || e.key === 'Delete' || e.key === 'Enter' || e.key === ' ') && activeIdx >= 0) {
			e.preventDefault();
			const nextIdx = Math.min(activeIdx, tags.length - 2);
			element.removeTag(tags[activeIdx].value);
			if (tags.length) setActive(Math.max(0, nextIdx));
			else if (isEditable) input.focus();
		} else if (e.key === 'Escape') {
			activeIdx = -1; updateHighlight(); container.blur();
		}
	});

	container.addEventListener('focus', () => { if (tags.length && activeIdx < 0) setActive(0); });
	container.addEventListener('blur', () => { activeIdx = -1; updateHighlight(); });

	if (isEditable) {
		// Use nui-input wrapper for consistent styling
		nuiInput = dom.create('nui-input', { class: 'nui-tag-input-wrapper', target: element });
		input = dom.create('input', {
			attrs: { type: 'text', placeholder, autocomplete: 'off' },
			target: nuiInput
		});
		input.addEventListener('keydown', e => {
			if (e.key === 'Enter') {
				e.preventDefault();
				const val = input.value.trim();
				if (val && element.addTag(val)) input.value = '';
			} else if (e.key === 'Backspace' && !input.value && tags.length) {
				e.preventDefault();
				setActive(tags.length - 1);
				container.focus();
			} else if ((e.key === 'ArrowLeft' || e.key === 'ArrowUp') && input.selectionStart === 0 && tags.length) {
				e.preventDefault();
				setActive(tags.length - 1);
				container.focus();
			} else if (e.key === 'Home' && input.selectionStart === 0 && tags.length) {
				e.preventDefault();
				setActive(0);
				container.focus();
			}
		});
	}

	const dispatch = (name, detail) => element.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));

	const setActive = idx => {
		activeIdx = idx;
		updateHighlight();
		if (idx >= 0 && idx < container.children.length) {
			const el = container.children[idx];
			container.setAttribute('aria-activedescendant', el.id);
			el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
		} else {
			container.removeAttribute('aria-activedescendant');
		}
	};

	const updateHighlight = () => {
		Array.from(container.children).forEach((el, i) => el.classList.toggle('is-active', i === activeIdx));
	};

	const updateContainerTabindex = () => {
		// Only focusable when there are tags to navigate; otherwise input gets focus
		container.tabIndex = tags.length > 0 ? 0 : -1;
	};

	const render = () => {
		container.innerHTML = '';
		tags.forEach((tag, i) => {
			const el = dom.create('span', {
				class: 'nui-tag',
				id: `${element.id || 'tag'}-${i}`,
				attrs: { role: 'option', 'aria-selected': 'true', 'data-value': tag.value },
				target: container
			});
			dom.create('span', { class: 'nui-tag-text', text: tag.label, target: el });
			const btn = dom.create('button', {
				class: 'nui-tag-remove',
				attrs: { type: 'button', 'aria-label': `Remove ${tag.label}`, tabindex: '-1' },
				content: '×',
				target: el
			});
			btn.onclick = e => { e.stopPropagation(); element.removeTag(tag.value); };
		});
		element.classList.toggle('has-tags', tags.length > 0);
		if (activeIdx >= tags.length) activeIdx = tags.length - 1;
		updateHighlight();
		updateContainerTabindex();
		syncHiddenInputs();
	};

	const syncHiddenInputs = () => {
		element.els('input[type="hidden"]').forEach(inp => inp.remove());
		if (name) {
			tags.forEach(tag => {
				element.insertBefore(dom.create('input', { attrs: { type: 'hidden', name, value: tag.value } }), container);
			});
		}
	};

	const announce = msg => { liveRegion.textContent = msg; setTimeout(() => liveRegion.textContent = '', 1000); };

	// Public API
	element.addTag = (value, label) => {
		if (!value || typeof value !== 'string') return false;
		value = value.trim();
		if (!value || tags.some(t => t.value === value)) return false;
		const tag = { value, label: label || value };
		tags.push(tag);
		render();
		announce(`${tag.label} added`);
		dispatch('nui-tag-add', tag);
		dispatch('nui-change', { values: element.getValues(), tags: element.listTags() });
		return true;
	};

	element.removeTag = value => {
		const idx = tags.findIndex(t => t.value === value);
		if (idx === -1) return false;
		const tag = tags.splice(idx, 1)[0];
		render();
		announce(`${tag.label} removed`);
		dispatch('nui-tag-remove', tag);
		dispatch('nui-change', { values: element.getValues(), tags: element.listTags() });
		return true;
	};

	element.hasTag = value => tags.some(t => t.value === value);
	element.listTags = () => tags.map(t => ({ ...t }));
	element.getValues = () => tags.map(t => t.value);
	element.clear = () => { while (tags.length) element.removeTag(tags[0].value); };
	element.focus = () => (input || container).focus();

	render();
});

// ################################# nui-select COMPONENT
// Enhanced select with search and multi-select tag support

// Track all open selects to ensure only one is open at a time
const openSelects = new Set();

// ################################# MOBILE MODAL (Singleton)
let mobileModal = null;

const getMobileSelectModal = () => {
	if (mobileModal) return mobileModal;

	const backdrop = dom.create('div', {
		class: 'nui-modal-backdrop',
		attrs: { hidden: '' },
		events: { click: (e) => e.target === backdrop && mobileModal.activeSelect?.close() }
	});

	const modal = dom.create('div', { class: 'nui-select-sheet', target: backdrop });
	const tags = dom.create('div', { class: 'nui-select-sheet-tags', attrs: { hidden: '' }, target: modal });
	const content = dom.create('div', { class: 'nui-select-sheet-content', target: modal });
	const search = dom.create('div', { class: 'nui-select-sheet-search', target: modal });
	const footer = dom.create('div', { class: 'nui-select-sheet-footer', target: modal });
	const label = dom.create('span', { target: footer });
	dom.create('button', { text: 'Done', events: { click: () => mobileModal.activeSelect?.close() }, target: footer });

	mobileModal = {
		backdrop, modal, content, tags, search, label, activeSelect: null,
		open(sel) {
			this.activeSelect = sel;
			document.body.append(backdrop);
			backdrop.hidden = false;
			requestAnimationFrame(() => backdrop.classList.add('is-open'));
		},
		close() {
			if (!this.activeSelect) return;
			backdrop.classList.remove('is-open');
			setTimeout(() => {
				backdrop.hidden = true;
				backdrop.remove();
				this.activeSelect.onMobileClose();
				this.activeSelect = null;
			}, 200);
		}
	};

	return mobileModal;
};

registerComponent('nui-select', (element) => {
	const select = element.el('select');
	if (!select) return;

	const isMulti = select.multiple;
	const isSearchable = element.hasAttribute('searchable');
	const isMobileEnabled = element.hasAttribute('mobile-sheet');
	
	// Ensure select has a placeholder option if not multi-select
	if (!isMulti && !select.querySelector('option[value=""]')) {
		const placeholderOpt = document.createElement('option');
		placeholderOpt.value = '';
		placeholderOpt.textContent = element.getAttribute('placeholder') || 'Select...';
		select.prepend(placeholderOpt);
	}
	
	const placeholder = element.getAttribute('placeholder') ||
		select.querySelector('option[value=""]')?.textContent || 'Select...';

	// Extract label from parent nui-input-group or element attributes
	let label = element.getAttribute('label') || 
		select.getAttribute('aria-label') || 
		element.closest('nui-input-group')?.querySelector('label')?.textContent?.trim() || 
		placeholder;
	
	// Store as data attribute for reference
	element.dataset.label = label;

	// Cache option->row mapping
	const rowCache = new WeakMap();
	let isOpen = false;

	// Hide native select (styled via CSS)
	select.tabIndex = -1;

	// Build control button
	const control = dom.create('button', {
		class: 'nui-select-control',
		attrs: { type: 'button' },
		target: element
	});

	// Set aria-label on control if not already present
	if (!control.hasAttribute('aria-label') && label) {
		control.setAttribute('aria-label', label);
	}

	// Control inner content
	let valueDisplay, previewTags, countBadge;
	if (isMulti) {
		const preview = dom.create('span', { class: 'nui-select-preview', target: control });
		previewTags = dom.create('span', { class: 'nui-select-preview-tags', target: preview });
		// Add placeholder text for multi-select
		const placeholderSpan = dom.create('span', { 
			class: 'nui-select-value is-placeholder', 
			text: placeholder, 
			target: preview 
		});
		dom.create('span', { class: 'nui-select-preview-fade', attrs: { 'aria-hidden': 'true' }, target: preview });
		countBadge = dom.create('span', { class: 'nui-select-count', target: control });
	} else {
		valueDisplay = dom.create('span', { class: 'nui-select-value', text: placeholder, target: control });
		valueDisplay.classList.add('is-placeholder');
	}
	dom.create('span', { class: 'nui-select-arrow', target: control });

	// Build popup
	const popup = dom.create('div', { class: 'nui-select-popup', attrs: { hidden: '' }, target: element });

	// Tags section for multi-select
	let tagInput = null;
	if (isMulti) {
		const tagsSection = dom.create('div', { class: 'nui-select-popup-tags', target: popup });
		tagInput = dom.create('nui-tag-input', { target: tagsSection });
		tagInput.addEventListener('nui-tag-remove', e => {
			const opt = Array.from(select.options).find(o => o.value === e.detail.value);
			if (opt?.selected) { opt.selected = false; syncState(); }
		});
	}

	// Search input
	let searchInput = null;
	if (isSearchable) {
		const searchWrap = dom.create('div', { class: 'nui-select-search', target: popup });
		const nuiInput = dom.create('nui-input', { target: searchWrap });
		searchInput = dom.create('input', {
			attrs: { type: 'text', placeholder: 'Search...', autocomplete: 'off' },
			target: nuiInput
		});
		searchInput.addEventListener('input', () => filter(searchInput.value));
	}

	// Options list
	const list = dom.create('div', { class: 'nui-select-options', target: popup });
	const noResults = dom.create('div', { class: 'nui-select-no-results', text: 'No results', attrs: { hidden: '' }, target: list });

	// Build option rows from native select
	const buildOptions = () => {
		list.els('.nui-select-option, .nui-select-group').forEach(el => el.remove());

		const addOption = (opt, parent) => {
			if (opt.value === '' && !isMulti) return; // Skip placeholder
			const row = dom.create('div', {
				class: 'nui-select-option' + (opt.disabled ? ' is-disabled' : ''),
				attrs: { 'data-value': opt.value },
				target: parent
			});
			if (isMulti) dom.create('span', { class: 'nui-select-option-check', target: row });
			dom.create('span', { class: 'nui-select-option-text', text: opt.textContent, target: row });
			row.onclick = e => { e.stopPropagation(); pick(opt); };
			rowCache.set(opt, row);
		};

		Array.from(select.children).forEach(child => {
			if (child.tagName === 'OPTGROUP') {
				const group = dom.create('div', { class: 'nui-select-group', target: list });
				dom.create('div', { class: 'nui-select-group-label', text: child.label, target: group });
				Array.from(child.children).forEach(opt => opt.tagName === 'OPTION' && addOption(opt, group));
			} else if (child.tagName === 'OPTION') {
				addOption(child, list);
			}
		});
		syncState();
	};

	// Sync visual state with native select
	const syncState = () => {
		const selected = Array.from(select.selectedOptions).filter(o => o.value !== '');

		// Update option rows
		Array.from(select.options).forEach(opt => {
			const row = rowCache.get(opt);
			if (row) row.classList.toggle('is-selected', opt.selected);
		});

		if (isMulti) {
			// Sync tag input
			if (tagInput?.addTag) {
				const current = new Set(tagInput.getValues());
				const wanted = new Set(selected.map(o => o.value));
				current.forEach(v => { if (!wanted.has(v)) tagInput.removeTag(v); });
				selected.forEach(o => { if (!current.has(o.value)) tagInput.addTag(o.value, o.textContent); });
			}
			// Update preview
			const placeholderSpan = previewTags.parentElement.querySelector('.nui-select-value');
			previewTags.innerHTML = '';
			if (selected.length) {
				selected.slice(0, 3).forEach(o => dom.create('span', { class: 'nui-tag nui-tag--readonly', text: o.textContent, target: previewTags }));
				if (placeholderSpan) placeholderSpan.hidden = true;
			} else {
				if (placeholderSpan) placeholderSpan.hidden = false;
			}
			countBadge.textContent = selected.length || '';
			countBadge.hidden = !selected.length;
		} else {
			const sel = selected[0];
			valueDisplay.textContent = sel?.textContent || placeholder;
			valueDisplay.classList.toggle('is-placeholder', !sel);
		}

		element.classList.toggle('is-invalid', !select.validity.valid);
		element.dispatchEvent(new CustomEvent('nui-change', { bubbles: true, detail: { values: selected.map(o => o.value) } }));
	};

	// Pick an option
	const pick = opt => {
		if (opt.disabled) return;
		if (isMulti) {
			opt.selected = !opt.selected;
		} else {
			Array.from(select.options).forEach(o => o.selected = (o === opt));
			close();
		}
		select.dispatchEvent(new Event('change', { bubbles: true }));
		syncState();
	};

	// Filter options
	const filter = q => {
		q = q.toLowerCase().trim();
		let count = 0;
		Array.from(select.options).forEach(opt => {
			const row = rowCache.get(opt);
			if (!row) return;
			const match = opt.textContent.toLowerCase().includes(q);
			row.hidden = !match;
			if (match) count++;
		});
		// Show/hide groups
		list.els('.nui-select-group').forEach(g => {
			g.hidden = !Array.from(g.querySelectorAll('.nui-select-option')).some(r => !r.hidden);
		});
		noResults.hidden = count > 0;
	};

	// Open/close
	const open = () => {
		if (isOpen || select.disabled) return;

		// Check mobile
		// User Req: "up to 500px if the viewport also has a significant larger height"
		if (isMobileEnabled && window.innerWidth <= 500 && window.innerHeight > 500) {
			openMobile();
			return;
		}

		// Close all other open selects
		openSelects.forEach(otherSelect => {
			if (otherSelect !== element && otherSelect.close) {
				otherSelect.close();
			}
		});

		isOpen = true;
		openSelects.add(element);
		element.classList.add('is-open');
		popup.hidden = false;

		// Reset scroll position
		list.scrollTop = 0;

		// Position above/below
		const rect = control.getBoundingClientRect();
		const below = window.innerHeight - rect.bottom;
		element.classList.toggle('is-above', below < 300 && rect.top > below);
		element.classList.toggle('is-below', !(below < 300 && rect.top > below));

		if (isSearchable) {
			searchInput.value = '';
			filter('');
			// Don't auto-focus to avoid showing focus ring on mouse/touch interaction
		}
		element.dispatchEvent(new CustomEvent('nui-open', { bubbles: true }));
	};

	const openMobile = () => {
		openSelects.forEach(s => s !== element && s.close?.());

		const m = getMobileSelectModal();
		isOpen = true;
		openSelects.add(element);
		element.classList.add('is-open');

		// Move elements
		m.content.appendChild(list);
		list.hidden = false;

		const searchWrap = popup.querySelector('.nui-select-search');
		if (searchInput && searchWrap) {
			m.search.appendChild(searchWrap);
			searchInput.value = '';
			filter('');
		}

		m.label.textContent = label;

		// Multi-select tags
		const desktopTags = popup.querySelector('.nui-select-popup-tags');
		m.tags.innerHTML = '';
		m.tags.hidden = !isMulti;

		if (isMulti && desktopTags) {
			const toggle = dom.create('button', { class: 'nui-sheet-tags-toggle', target: m.tags });
			const text = dom.create('span', { target: toggle });
			dom.create('span', { text: '▼', target: toggle });
			const wrap = dom.create('div', { attrs: { hidden: '' }, target: m.tags });
			wrap.appendChild(desktopTags);

			toggle.onclick = () => {
				wrap.hidden = !wrap.hidden;
				toggle.classList.toggle('is-expanded', !wrap.hidden);
			};

			const updateCount = () => {
				const count = select.selectedOptions.length;
				text.textContent = `${count} items selected`;
				m.tags.hidden = !count;
			};
			updateCount();
			element.addEventListener('nui-change', updateCount);

			element.onMobileClose = () => {
				element.removeEventListener('nui-change', updateCount);
				popup.appendChild(list);
				searchWrap && popup.insertBefore(searchWrap, list);
				popup.prepend(desktopTags);
				element.onMobileClose = null;
			};
		} else {
			element.onMobileClose = () => {
				popup.appendChild(list);
				searchWrap && popup.insertBefore(searchWrap, list);
				element.onMobileClose = null;
			};
		}

		m.open(element);
		element.dispatchEvent(new CustomEvent('nui-open', { bubbles: true }));
	};

	const close = () => {
		if (!isOpen) return;

		// Check if we are in mobile mode
		const mobileModal = getMobileSelectModal();
		if (mobileModal.activeSelect === element) {
			mobileModal.close(); // Triggers animation and eventually onMobileClose
		}

		isOpen = false;
		openSelects.delete(element);
		element.classList.remove('is-open', 'is-above', 'is-below');
		popup.hidden = true;
		element.dispatchEvent(new CustomEvent('nui-close', { bubbles: true }));
	};

	// Event listeners
	control.addEventListener('click', e => { e.stopPropagation(); isOpen ? close() : open(); });

	const onOutsideClick = e => {
		if (isOpen && !element.contains(e.target)) {
			// Ignore if click is within mobile modal
			const mobileModal = getMobileSelectModal();
			if (mobileModal?.modal?.contains(e.target)) return;
			close();
		}
	};
	document.addEventListener('click', onOutsideClick);

	// Setup
	element.classList.add(isMulti ? 'is-multi' : 'is-single');
	if (select.disabled) element.classList.add('is-disabled');
	buildOptions();

	// Public API
	element.open = open;
	element.close = close;
	element.refresh = buildOptions;
	element.validate = () => {
		const valid = select.checkValidity();
		element.classList.toggle('is-invalid', !valid);
		return valid;
	};

	// Cleanup function
	return () => {
		openSelects.delete(element);
		document.removeEventListener('click', onOutsideClick);
	};
});

// ################################# BANNER FACTORY

const activeBanners = { top: null, bottom: null };

const bannerFactory = {
	create(options = {}) {
		const placement = options.placement || 'bottom';
		let target = options.target;
		if (!target) {
			const contentArea = document.el('nui-app nui-content');
			if (contentArea) {
				let bannerLayer = contentArea.el(':scope > .nui-banner-layer');
				if (!bannerLayer) {
					bannerLayer = dom.create('div', {
						class: 'nui-banner-layer',
						target: contentArea
					});
				}
				target = bannerLayer;
			} else {
				target = document.body;
			}
		}

		if (activeBanners[placement]) {
			activeBanners[placement].element.close('replaced');
		}

		const banner = dom.create('nui-banner', {
			id: 'nui-banner-' + Date.now(),
			attrs: {
				placement: placement,
				priority: options.priority,
				'auto-close': options.autoClose
			}
		});

		const contentEl = dom.create('div', {
			class: 'nui-banner-content',
			content: options.content
		});

		const wrapper = dom.create('div', {
			class: 'nui-banner-wrapper',
			content: contentEl,
			target: banner
		});

		if (options.showCloseButton !== false) {
			dom.create('button', {
				class: 'nui-banner-close',
				attrs: { type: 'button' },
				text: '✕',
				events: { click: () => banner.close('dismiss') },
				target: wrapper
			});
		}

		if (options.autoClose && options.showProgress !== false) {
			dom.create('div', {
				class: 'nui-banner-progress',
				style: `animation-duration: ${options.autoClose}ms; animation-name: nui-banner-progress`,
				target: banner
			});
		}

		if (target) target.append(banner);

		const controller = {
			element: banner,
			close(action) {
				banner.close(action);
			},
			update(content) {
				banner.update(content);
			},
			onClose(callback) {
				banner.addEventListener('nui-banner-close', (e) => {
					callback(e.detail.action);
				}, { once: true });
			}
		};

		activeBanners[placement] = controller;

		banner.addEventListener('nui-banner-close', () => {
			if (activeBanners[placement]?.element === banner) {
				activeBanners[placement] = null;
			}
			banner.remove();
		}, { once: true });

		banner.show();

		return controller;
	},

	show(options = {}) {
		return this.create(options);
	},

	hide(ref) {
		if (ref === 'all' || ref === undefined || ref === null) {
			return this.hideAll();
		}

		if (ref?.element instanceof HTMLElement) {
			ref.element.close('dismiss');
			return true;
		}

		if (ref instanceof HTMLElement) {
			ref.close?.('dismiss');
			return true;
		}

		return false;
	},

	hideAll() {
		Object.values(activeBanners).forEach(controller => {
			controller?.element?.close('dismiss');
		});
		return true;
	}
};

// ################################# DIALOG SYSTEM

const dialogSystem = {
	_createDialog(target, placement, blocking = false) {
		const dialog = dom.create('nui-dialog', {
			id: 'nui-system-dialog-' + Date.now(),
			attrs: {
				placement: placement,
				blocking: blocking ? '' : null
			},
			content: '<dialog><div class="nui-dialog-content"></div></dialog>',
			target: target || document.body
		});
		return dialog;
	},

	_buildFieldHtml(field) {
		const id = field.id;
		const type = field.type || 'text';
		const value = field.value || '';
		const placeholder = field.placeholder || '';
		const required = field.required ? 'required' : '';
		const pattern = field.pattern ? `pattern="${field.pattern}"` : '';
		const min = field.min !== undefined ? `min="${field.min}"` : '';
		const max = field.max !== undefined ? `max="${field.max}"` : '';
		const minlength = field.minlength !== undefined ? `minlength="${field.minlength}"` : '';
		const maxlength = field.maxlength !== undefined ? `maxlength="${field.maxlength}"` : '';

		if (type === 'textarea') {
			return `
				<nui-input-group>
					<label>${field.label}</label>
					<nui-textarea>
						<textarea id="${id}" placeholder="${placeholder}" ${required} ${minlength} ${maxlength}>${value}</textarea>
					</nui-textarea>
				</nui-input-group>
			`;
		}

		if (type === 'checkbox') {
			const checked = field.checked ? 'checked' : '';
			return `
				<nui-input-group>
					<nui-checkbox>
						<input type="checkbox" id="${id}" ${checked}>
						<label>${field.label}</label>
					</nui-checkbox>
				</nui-input-group>
			`;
		}

		return `
			<nui-input-group>
				<label>${field.label}</label>
				<nui-input>
					<input id="${id}" value="${value}" type="${type}" placeholder="${placeholder}" ${required} ${pattern} ${min} ${max} ${minlength} ${maxlength}>
				</nui-input>
			</nui-input-group>
		`;
	},

	_buildButtonHtml(button) {
		const type = button.type || 'outline';
		const id = button.id ? `id="${button.id}"` : '';
		const icon = button.icon ? `<nui-icon name="${button.icon}"></nui-icon>` : '';
		return `<nui-button type="${type}"><button ${id}>${icon}${button.label}</button></nui-button>`;
	},

	_buildButtonsHtml(buttons) {
		if (!buttons || buttons.length === 0) return '';
		return `<nui-button-container align="end">${buttons.map(b => this._buildButtonHtml(b)).join('')}</nui-button-container>`;
	},

	_defaultButtons: {
		alert: [
			{ id: 'nui-dialog-ok', label: 'OK', type: 'primary', value: 'ok' }
		],
		confirm: [
			{ id: 'nui-dialog-cancel', label: 'Cancel', type: 'outline', value: 'cancel' },
			{ id: 'nui-dialog-ok', label: 'OK', type: 'primary', value: 'ok' }
		],
		prompt: [
			{ id: 'nui-dialog-cancel', label: 'Cancel', type: 'outline', value: null },
			{ id: 'nui-dialog-ok', label: 'OK', type: 'primary', value: 'ok' }
		]
	},

	_show(htmlContent, options = {}) {
		const { classes = [], target, placement, modal = true, blocking = false } = options;
		const dialog = this._createDialog(target, placement, blocking);
		const content = dialog.el('.nui-dialog-content');
		const nativeDialog = dialog.el('dialog');

		if (classes.length) nativeDialog.classList.add(...classes);

		if (typeof htmlContent === 'string') {
			content.innerHTML = htmlContent;
		} else {
			content.innerHTML = '';
			content.appendChild(htmlContent);
		}

		if (modal) {
			dialog.showModal();
		} else {
			dialog.show();
		}

		nativeDialog.addEventListener('close', () => dialog.remove(), { once: true });

		return dialog;
	},

	alert(title, message, options = {}) {
		const buttons = options.buttons || this._defaultButtons.alert;

		return new Promise((resolve) => {
			const html = `
				<div class="nui-dialog-alert">
					<div class="nui-headline">${title}</div>
					<div class="nui-copy">${message}</div>
					${this._buildButtonsHtml(buttons)}
				</div>
			`;
			const dialog = this._show(html, { classes: ['nui-alert'], ...options });

			buttons.forEach(btn => {
				const el = dialog.el(`#${btn.id}`);
				if (el) {
					el.addEventListener('click', () => {
						dialog.close(btn.value || btn.id);
						resolve(btn.value);
					}, { once: true });
				}
			});

			dialog.el('dialog').addEventListener('close', () => resolve(), { once: true });
		});
	},

	confirm(title, message, options = {}) {
		const buttons = options.buttons || this._defaultButtons.confirm;

		return new Promise((resolve) => {
			const html = `
				<div class="nui-dialog-alert">
					<div class="nui-headline">${title}</div>
					<div class="nui-copy">${message}</div>
					${this._buildButtonsHtml(buttons)}
				</div>
			`;
			const dialog = this._show(html, { classes: ['nui-alert'], ...options });

			buttons.forEach(btn => {
				const el = dialog.el(`#${btn.id}`);
				if (el) {
					el.addEventListener('click', () => {
						dialog.close(btn.value || btn.id);
						resolve(btn.value === 'ok' || btn.value === true);
					}, { once: true });
				}
			});

			dialog.el('dialog').addEventListener('close', () => resolve(false), { once: true });
		});
	},

	prompt(title, message, options = {}) {
		const fields = options.fields || [];
		const buttons = options.buttons || this._defaultButtons.prompt;

		return new Promise((resolve) => {
			const inputsHtml = fields.map(f => this._buildFieldHtml(f)).join('');

			const html = `
				<div class="nui-dialog-prompt">
					<div class="nui-headline">${title}</div>
					${message ? `<div class="nui-copy">${message}</div>` : ''}
					<div class="nui-dialog-body">${inputsHtml}</div>
					${this._buildButtonsHtml(buttons)}
				</div>
			`;
			const dialog = this._show(html, { classes: ['nui-prompt'], ...options });

			const getValues = () => {
				const values = {};
				fields.forEach(f => {
					const input = dialog.el(`#${f.id}`);
					if (input) {
						if (f.type === 'checkbox') {
							values[f.id] = input.checked;
						} else {
							values[f.id] = input.value;
						}
					}
				});
				return values;
			};

			buttons.forEach(btn => {
				const el = dialog.el(`#${btn.id}`);
				if (el) {
					el.addEventListener('click', () => {
						dialog.close(btn.value || btn.id);
						if (btn.value === 'ok' || btn.value === true) {
							resolve(getValues());
						} else {
							resolve(btn.value);
						}
					}, { once: true });
				}
			});

			dialog.el('dialog').addEventListener('close', () => resolve(null), { once: true });

			setTimeout(() => {
				const first = dialog.el('input, textarea');
				if (first) first.focus();
			}, 50);
		});
	}
};

function createLinkList(data = [], options = {}) {
	const element = dom.create('nui-link-list', {
		id: options.id,
		class: options.class,
		attrs: {
			mode: options.mode,
			...options.attrs
		}
	});

	if (data && element.loadData) {
		element.loadData(data);
	}

	return element;
}

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

	// If hash doesn't contain '=', it's an anchor link, not a route
	if (!hash.includes('=')) return null;

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
	const scriptEl = wrapper.el('script[type="nui/page"]');
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

		let html = await response.text();
		
		// Strip Live Server injection (development only)
		html = html.replace(/<!-- Code injected by live-server -->[\s\S]*?<\/script>/gi, '');
		
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
	const wrapper = dom.create('div', {
		class: [`content-${type}`, `content-${type}-${id.replace(/\//g, '-').replace(/[^a-z0-9-]/gi, '')}`],
		content: '<div class="loading">Loading...</div>'
	});

	if (type === 'page') {
		const basePath = options.basePath || '/pages';
		wrapper.nuiLoaded = loadFragment(`${basePath}/${id}.html`, wrapper, params);
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
	let isInitialLoad = true;
	let navigationId = 0;

	container = typeof container === 'string'
		? document.el(container)
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
		element.classList.remove('nui-page-active');
		element.hide?.();
	}

	function showElement(element, params) {
		element.inert = false;
		element.show?.(params);

		element.classList.add('nui-page-active');

		const focusTarget = element.el('h1, h2, [autofocus], main') || element;
		if (focusTarget.tabIndex < 0) focusTarget.tabIndex = -1;
		focusTarget.focus({ preventScroll: true });
	}

	function handleDeepLink(element, params) {
		// Find the actual scroll container (nui-main in app mode)
		const scrollContainer = container.closest('nui-main') || container.closest('nui-content')?.el('nui-main') || container;

		if (params.id) {
			const target = element.el(`#${params.id}`);
			if (target) {
				requestAnimationFrame(() => {
					target.scrollIntoView({ behavior: 'smooth', block: 'start' });
				});
			}
		} else {
			scrollContainer.scrollTop = 0;
		}
	}

	async function navigate(route) {
		if (!route) {
			if (defaultRoute) {
				location.hash = defaultRoute;
			}
			return;
		}

		const currentNavId = ++navigationId;
		const { type, id, params } = route;
		const cacheKey = getCacheKey(type, id);

		let element = cache.get(cacheKey);
		if (!element) {
			element = pageContent(type, id, params, { basePath });
			cache.set(cacheKey, element);
			container.appendChild(element);
			element.style.display = 'none';
		}

		if (element.nuiLoaded) {
			try {
				await element.nuiLoaded;
			} catch (e) {
			}
		}

		if (currentNavId !== navigationId) {
			return;
		}

		if (currentElement !== element) {
			hideElement(currentElement);

			element.style.display = '';

			void element.offsetHeight;

			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					// Only focus content on navigation, not on initial page load
					if (!isInitialLoad) {
						showElement(element, params);
					} else {
						element.inert = false;
						element.show?.(params);
						element.classList.add('nui-page-active');
						isInitialLoad = false;
					}
					handleDeepLink(element, params);
				});
			});

			currentElement = element;
			currentRoute = { type, id, params, element };

			container.dispatchEvent(new CustomEvent('nui-route-change', {
				bubbles: true,
				detail: currentRoute
			}));
		} else {
			handleDeepLink(element, params);
		}
	}

	function handleHashChange() {
		const route = parseUrl();

		// If parseUrl returns null, check if it's an anchor link (no route)
		if (!route) {
			const hash = location.hash.slice(1);
			// If there's a hash but no route, it's an anchor link
			if (hash) {
				console.log('Anchor link detected:', hash);

				// Immediately reset any body scroll that may have occurred
				window.scrollTo(0, 0);
				document.documentElement.scrollTop = 0;
				document.body.scrollTop = 0;

				console.log('Body scrollTop AFTER reset:', document.body.scrollTop, 'documentElement scrollTop:', document.documentElement.scrollTop);
				console.log('Window pageYOffset:', window.pageYOffset, 'scrollY:', window.scrollY);

				// Find and scroll the content container
				const target = document.getElementById(hash);
				if (target) {
					const contentScroll = document.querySelector('nui-main') ||
						document.querySelector('nui-content');
					if (contentScroll) {
						// Calculate position relative to content container
						const containerRect = contentScroll.getBoundingClientRect();
						const targetRect = target.getBoundingClientRect();
						const scrollOffset = targetRect.top - containerRect.top + contentScroll.scrollTop;
						console.log('Container top:', containerRect.top, 'Target top:', targetRect.top, 'Scrolling to:', scrollOffset);

						requestAnimationFrame(() => {
							contentScroll.scrollTo({ top: scrollOffset, behavior: 'smooth' });
							// Remove hash from URL
							history.replaceState(null, '', location.pathname + location.search);
						});
					} else {
						// Fallback
						target.scrollIntoView({ behavior: 'smooth', block: 'start' });
						history.replaceState(null, '', location.pathname + location.search);
					}
				}

				return;
			}
			// Otherwise, no hash at all - navigate to default
		}

		navigate(route);
	}

	function handleAnchorClick(e) {
		const link = e.target.closest('a[href^="#"]');
		if (!link) return;

		const hash = link.getAttribute('href').slice(1);
		// Skip if it's a route (contains '=')
		if (hash.includes('=')) return;

		console.log('Intercepted anchor click:', hash);
		e.preventDefault();
		e.stopPropagation();

		// Find and scroll the content container
		const target = document.getElementById(hash);
		if (!target) {
			console.log('Target not found:', hash);
			return;
		}

		// Find the scrollable container from the link's context
		let contentScroll = link.closest('nui-main');
		console.log('Link closest nui-main:', contentScroll);

		// If link is not inside nui-main, find the target's container
		if (!contentScroll) {
			contentScroll = target.closest('nui-main');
			console.log('Target closest nui-main:', contentScroll);
		}

		// Last resort: find first visible nui-main
		if (!contentScroll) {
			contentScroll = document.querySelector('nui-main:not([hidden])');
			console.log('querySelector nui-main:', contentScroll);
		}

		// Try without :not([hidden])
		if (!contentScroll) {
			contentScroll = document.querySelector('nui-main');
			console.log('querySelector nui-main (any):', contentScroll);
		}

		if (contentScroll) {
			// Immediately prevent any pending scroll
			window.scrollTo(0, 0);

			// Get positions
			const containerRect = contentScroll.getBoundingClientRect();
			const targetRect = target.getBoundingClientRect();

			// Calculate absolute position within scrollable content
			const scrollOffset = targetRect.top - containerRect.top + contentScroll.scrollTop;

			// Use native smooth scroll
			contentScroll.scrollTo({ top: scrollOffset, behavior: 'smooth' });
		} else {
			console.log('No content scroll container found');
			// Fallback
			target.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	}

	function start() {
		if (isStarted) return;
		isStarted = true;
		document.addEventListener('click', handleAnchorClick);
		window.addEventListener('hashchange', handleHashChange);
		handleHashChange();
	}

	function stop() {
		if (!isStarted) return;
		isStarted = false;
		document.removeEventListener('click', handleAnchorClick);
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
	const containerSelector = options.container || 'nui-content nui-main';
	const navigationSelector = options.navigation || 'nui-side-nav';
	const basePath = options.basePath || '/pages';
	const defaultPage = options.defaultPage || null;

	const container = typeof containerSelector === 'string'
		? document.el(containerSelector)
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
		? document.el(navigationSelector)
		: navigationSelector;

	if (navigation) {
		container.addEventListener('nui-route-change', (e) => {
			const route = e.detail;
			if (!route) return;

			const app = navigation.closest('nui-app');
			if (app && app.classList.contains('sidenav-open') && !app.classList.contains('sidenav-forced')) {
				app.toggleSideNav();
			}

			const hash = location.hash;
			let found = navigation.setActive?.(`a[href="${hash}"]`);
			if (!found && route.id) {
				found = navigation.setActive?.(`a[href*="${route.type}=${route.id}"]`);
			}
		});
	}

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

		dom.create('link', {
			attrs: { rel: 'stylesheet', href: cssPath },
			target: document.head
		});

		console.warn('[NUI] Default theme auto-loaded from:', cssPath, '(Include nui.js in <head> to prevent layout shifts)');
	}


}

// ################################# STORAGE SYSTEM

function parseTTL(ttl) {
	if (!ttl || ttl === 'forever') return null;
	if (ttl === 'session') return 0;

	if (typeof ttl === 'number') {
		if (ttl > 1e12) return new Date(ttl);
		return new Date(ttl * 1000);
	}

	if (/^\d{4}-\d{2}-\d{2}$/.test(ttl)) {
		return new Date(ttl + 'T23:59:59');
	}

	const match = ttl.match(/^(\d+)-(minutes?|hours?|days?|months?|years?)$/);
	if (match) {
		const value = parseInt(match[1], 10);
		const unit = match[2].replace(/s$/, '');
		const now = new Date();

		switch (unit) {
			case 'minute': return new Date(now.getTime() + value * 60 * 1000);
			case 'hour': return new Date(now.getTime() + value * 60 * 60 * 1000);
			case 'day': return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
			case 'month': return new Date(now.setMonth(now.getMonth() + value));
			case 'year': return new Date(now.setFullYear(now.getFullYear() + value));
		}
	}

	return null;
}

const storage = {
	set({ name, value, target = 'cookie', ttl = 'forever' }) {
		if (!name || value === undefined || value === null) return false;

		const expires = parseTTL(ttl);

		if (target === 'localStorage') {
			try {
				const entry = { value };
				if (expires) entry.expires = expires.getTime();
				localStorage.setItem(name, JSON.stringify(entry));
				return true;
			} catch {
				return false;
			}
		}

		let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
		cookie += '; path=/';
		cookie += '; SameSite=Lax';

		if (location.protocol === 'https:') {
			cookie += '; Secure';
		}

		if (expires === 0) {
			// Session cookie - no expires attribute
		} else if (expires) {
			cookie += `; expires=${expires.toUTCString()}`;
		} else {
			// "forever" = 10 years
			const far = new Date();
			far.setFullYear(far.getFullYear() + 10);
			cookie += `; expires=${far.toUTCString()}`;
		}

		document.cookie = cookie;
		return true;
	},

	get({ name, target = 'cookie' }) {
		if (!name) return undefined;

		if (target === 'localStorage') {
			try {
				const raw = localStorage.getItem(name);
				if (!raw) return undefined;

				const entry = JSON.parse(raw);
				if (entry.expires && Date.now() > entry.expires) {
					localStorage.removeItem(name);
					return undefined;
				}
				return entry.value;
			} catch {
				return undefined;
			}
		}

		const cookies = document.cookie.split('; ');
		for (const cookie of cookies) {
			const [cookieName, ...rest] = cookie.split('=');
			if (decodeURIComponent(cookieName) === name) {
				return decodeURIComponent(rest.join('='));
			}
		}
		return undefined;
	},

	remove({ name, target = 'cookie' }) {
		if (!name) return false;

		if (target === 'localStorage') {
			try {
				if (localStorage.getItem(name) === null) return false;
				localStorage.removeItem(name);
				return true;
			} catch {
				return false;
			}
		}

		const exists = this.get({ name, target: 'cookie' }) !== undefined;
		if (!exists) return false;

		let cookie = `${encodeURIComponent(name)}=`;
		cookie += '; path=/';
		cookie += '; expires=Thu, 01 Jan 1970 00:00:00 GMT';
		cookie += '; SameSite=Lax';

		if (location.protocol === 'https:') {
			cookie += '; Secure';
		}

		document.cookie = cookie;
		return true;
	}
};

function enableDrag(target, callback, options = {}) {
	const subtarget = options.subtarget || target;
	let activePointerId = null;

	function handleDown(e) {
		e.preventDefault();
		activePointerId = e.pointerId;
		target.setPointerCapture(e.pointerId);

		target.addEventListener('pointermove', handleMove);
		target.addEventListener('pointerup', handleUp);
		target.addEventListener('pointercancel', handleUp);
		target.addEventListener('lostpointercapture', handleUp);

		report(e, 'start');
	}

	function handleMove(e) {
		if (e.pointerId !== activePointerId) return;
		report(e, 'move');
	}

	function handleUp(e) {
		if (e.pointerId !== activePointerId) return;
		report(e, 'end');
		cleanup();
	}

	function report(e, type) {
		const rect = subtarget.getBoundingClientRect();
		const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
		const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));

		callback({
			type,
			x,
			y,
			percentX: x / rect.width,
			percentY: y / rect.height,
			clientX: e.clientX,
			clientY: e.clientY,
			isTouch: e.pointerType === 'touch'
		});
	}

	function cleanup() {
		if (activePointerId !== null) {
			try { target.releasePointerCapture(activePointerId); } catch { }
		}
		activePointerId = null;
		target.removeEventListener('pointermove', handleMove);
		target.removeEventListener('pointerup', handleUp);
		target.removeEventListener('pointercancel', handleUp);
		target.removeEventListener('lostpointercapture', handleUp);
	}

	target.addEventListener('pointerdown', handleDown);

	// Return cleanup function that fully removes all listeners
	return () => {
		cleanup();
		target.removeEventListener('pointerdown', handleDown);
	};
}

// ################################# ICON SYSTEM

const iconSystem = {
	_cache: null,
	async getAvailable() {
		if (this._cache) return this._cache;
		try {
			const response = await fetch(config.iconSpritePath);
			const text = await response.text();
			const parser = new DOMParser();
			const doc = parser.parseFromString(text, 'image/svg+xml');
			const symbols = doc.querySelectorAll('symbol');
			this._cache = Array.from(symbols).map(s => s.id).sort();
			return this._cache;
		} catch (e) {
			console.error('Failed to load icon sprite:', e);
			return [];
		}
	},

	create(name, asElement = false) {
		if (asElement) {
			return dom.create('nui-icon', { attrs: { name } });
		}
		return `<nui-icon name="${name}"></nui-icon>`;
	}
};

const util = {
	createElement: dom.create,
	createSvgElement: dom.svg,
	enableDrag,
	storage
};

const componentsApi = {
	dialog: dialogSystem,
	banner: bannerFactory,
	linkList: {
		create: createLinkList
	},
	icon: iconSystem
};

export const nui = {
	config,
	util,
	components: componentsApi,

	init(options) {
		if (options) {
			Object.assign(config, options);
		}

		ensureBaseStyles();
		setupActionDelegation();

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

	registerFeature(name, initFn) {
		registeredFeatures.set(name, initFn);
	},

	registerType(type, handler) {
		registeredTypes.set(type, handler);
	},

	configure(options) {
		Object.assign(config, options);
	},

	createRouter(container, options = {}) {
		return createRouter(container, options);
	},

	enableContentLoading(options = {}) {
		return enableContentLoading(options);
	}
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
