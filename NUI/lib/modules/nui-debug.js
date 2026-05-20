/**
 * NUI Debug Addon — validates DOM structure for common LLM mistakes.
 * Development only: remove this import for production.
 * 
 * Usage:
 *   <script type="module" src="NUI/lib/modules/nui-debug.js"></script>
 *   — or —
 *   Open http://localhost:5500/?nui-debug
 */

import { nui } from '../../nui.js';

// ---------------------------------------------------------------------------
// Validator registry — each checks one class of mistake
// ---------------------------------------------------------------------------

const validators = [];
const issues = [];

function registerValidator(name, checkFn) {
	validators.push({ name, check: checkFn });
}

// ---------------------------------------------------------------------------
// Output helpers
// ---------------------------------------------------------------------------

let warnCount = 0;

function warn(element, message, fix = '') {
	warnCount++;
	const entry = {
		element: element.tagName?.toLowerCase() || 'unknown',
		id: element.id || null,
		message,
		fix
	};
	issues.push(entry);

	console.warn(`[NUI DEBUG #${warnCount}] ${message}`, element);
	if (fix) {
		console.info(`  → Fix: ${fix}`);
	}

	// Visual indicator (requires nui-debug.css)
	if (!element._debugMarked) {
		element._debugMarked = true;
		element.style.outline = '2px dashed red';
		element.style.outlineOffset = '2px';
		element.title = (element.title ? element.title + ' | ' : '') + message;
	}
}

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

registerValidator('nui-app structure', (root) => {
	root.querySelectorAll('nui-app').forEach(app => {
		const kids = [...app.children].filter(c => c.tagName.includes('-'));
		if (!kids.some(c => c.tagName === 'NUI-APP-HEADER')) {
			warn(app, 'Missing <nui-app-header>. Layout will break.',
				'Add <nui-app-header><header>...</header></nui-app-header> as first child of <nui-app>');
		}
		if (!kids.some(c => c.tagName === 'NUI-CONTENT')) {
			warn(app, 'Missing <nui-content>. Layout will break.',
				'Add <nui-content><main>...</main></nui-content> as child of <nui-app>');
		}
		// Bare native elements at app level
		[...app.children].forEach(c => {
			if (['HEADER', 'NAV', 'MAIN', 'FOOTER'].includes(c.tagName) &&
				!c.closest('nui-app-header, nui-sidebar, nui-content, nui-app-footer')) {
				warn(c, `Bare <${c.tagName.toLowerCase()}> in <nui-app> without layout wrapper.`,
					`Wrap as <nui-app-header><${c.tagName.toLowerCase()}>...</${c.tagName.toLowerCase()}></nui-app-header>`);
			}
		});
	});
});

registerValidator('missing inner elements', (root) => {
	const needs = {
		'NUI-BUTTON':  ['button', '<nui-button><button type="button">Click</button></nui-button>'],
		'NUI-INPUT':   ['input,textarea', '<nui-input><input type="text" placeholder="..."></nui-input>'],
		'NUI-SELECT':  ['select', '<nui-select><select>...</select></nui-select>'],
		'NUI-DIALOG':  ['dialog', '<nui-dialog><dialog>...</dialog></nui-dialog>'],
		'NUI-TABLE':   ['table', '<nui-table><table>...</table></nui-table>'],
		'NUI-TABS':    ['nav', '<nui-tabs><nav><button>Tab</button></nav><section>Content</section></nui-tabs>'],
		'NUI-SLIDER':  ['input[type="range"]', '<nui-slider><input type="range" min="0" max="100" value="50"></nui-slider>'],
	};
	Object.entries(needs).forEach(([tag, [selector, fix]]) => {
		root.querySelectorAll(tag).forEach(el => {
			if (!el.querySelector(selector)) {
				const tagName = tag.toLowerCase();
				warn(el, `<${tagName}> is missing its inner native element.`, fix);
			}
		});
	});
});

registerValidator('nui-tabs structure', (root) => {
	root.querySelectorAll('nui-tabs').forEach(tabs => {
		const tablist = tabs.querySelector('[role="tablist"]') ||
			[...tabs.children].find(c => c.querySelector('button, a'));
		const panels = [...tabs.children].filter(c => c !== tablist && c.tagName !== 'SCRIPT');
		if (!tablist) {
			warn(tabs, 'No tab buttons found.',
				'Add <nav> with <button> elements inside <nui-tabs>');
		}
		if (tablist && panels.length === 0) {
			warn(tabs, 'Has tab buttons but no content panels.',
				'Add <section> elements after the <nav> inside <nui-tabs>');
		}
	});
});

registerValidator('unregistered addon elements', (root) => {
	const knownAddons = [
		'nui-list', 'nui-lightbox', 'nui-code-editor', 'nui-media-player',
		'nui-wizard', 'nui-menu', 'nui-context-menu', 'nui-rich-text'
	];
	knownAddons.forEach(tag => {
		root.querySelectorAll(tag).forEach(el => {
			if (!customElements.get(tag)) {
				warn(el, `<${tag}> is not registered. Missing JS import.`,
					`Add <script type="module" src="NUI/lib/modules/${tag.replace('nui-', 'nui-')}.js"></script>`);
			}
		});
	});
});

registerValidator('attribute typos', (root) => {
	const knownVariants = {
		'NUI-BUTTON':  { attr: 'variant', valid: ['primary', 'outline', 'ghost', 'danger', 'delete', 'warning', 'icon'] },
		'NUI-BADGE':   { attr: 'variant', valid: ['primary', 'success', 'danger', 'warning', 'info'] },
		'NUI-PROGRESS': { attr: 'type',   valid: ['bar', 'circular', 'busy', 'circular-busy'] },
		'NUI-BANNER':  { attr: 'priority', valid: ['info', 'alert'] },
		'NUI-DIALOG':  { attr: 'placement', valid: ['center', 'top', 'bottom'] },
	};
	Object.entries(knownVariants).forEach(([tag, { attr, valid }]) => {
		root.querySelectorAll(tag).forEach(el => {
			const value = el.getAttribute(attr);
			if (value && !valid.includes(value)) {
				const suggestion = valid.find(v => v.startsWith(value.slice(0, 2)));
				warn(el, `Unknown ${attr}="${value}" on <${tag.toLowerCase()}>.`,
					suggestion ? `Did you mean ${attr}="${suggestion}"? Valid: ${valid.join(', ')}` : `Valid: ${valid.join(', ')}`);
			}
		});
	});
});

registerValidator('data-action selector resolution', (root) => {
	root.querySelectorAll('[data-action]').forEach(el => {
		const spec = el.dataset.action;
		if (!spec) return;
		const sel = spec.split('@')[1];
		if (!sel) return; // No selector — fine
		const target = root.querySelector(sel);
		if (!target) {
			warn(el, `data-action="${spec}" — selector "${sel}" does not resolve to any element in the DOM.`,
				`Check that the element with id="${sel.replace('#', '')}" exists.`);
		}
	});
});

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

function runAll(root = document) {
	issues.length = 0;
	warnCount = 0;

	validators.forEach(v => {
		try {
			v.check(root);
		} catch (e) {
			console.error(`[NUI DEBUG] Validator "${v.name}" failed:`, e);
		}
	});

	return {
		valid: warnCount === 0,
		count: warnCount,
		issues: issues.map(i => ({ ...i }))
	};
}

function runAndReport(root = document) {
	const result = runAll(root);
	if (result.count === 0) {
		console.log('[NUI DEBUG] ✓ No issues found.');
	} else {
		console.log(`[NUI DEBUG] ${result.count} issue(s) found. Fix them before going to production.`);
	}
	return result;
}

// ---------------------------------------------------------------------------
// Hooks — run after NUI initializes
// ---------------------------------------------------------------------------

nui.ready().then(() => {
	// Initial scan — log summary
	setTimeout(() => runAndReport(), 100);

	// MutationObserver — scoped dirty-region, throttled, silent per-subtree
	new MutationObserver((mutations) => {
		// Skip internal NUI mutations
		const isInternal = mutations.some(m => m.target._nuiInternal);
		if (isInternal) return;

		// Collect dirty roots from mutations
		const dirtyRoots = new Set();
		for (const m of mutations) {
			if (m.type === 'childList') {
				for (const node of m.addedNodes) {
					if (node.nodeType === Node.ELEMENT_NODE) dirtyRoots.add(node);
				}
			}
			if (m.target.nodeType === Node.ELEMENT_NODE) dirtyRoots.add(m.target);
		}

		clearTimeout(runAll._debounce);
		runAll._debounce = setTimeout(() => {
			if (dirtyRoots.size === 0) {
				runAll();
			} else {
				dirtyRoots.forEach(root => runAll(root));
			}
		}, 500);
	}).observe(document.documentElement, {
		childList: true,
		subtree: true,
		attributes: true,
		attributeFilter: ['data-action', 'variant', 'type', 'mode', 'placement', 'priority']
	});
});

// Expose for programmatic use
nui.debug = { run: runAndReport, runSilent: runAll, validators };
