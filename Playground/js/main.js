// Playground main script
console.log('main.js loading...');

import { nui } from '../../NUI/nui.js';
import '../../NUI/lib/modules/nui-animation.js';
import '../../NUI/lib/modules/nui-list.js';
//import { createMonitor } from '../../NUI/lib/modules/nui-monitor.js';

console.log('nui imported');

// Development-only: Enable monitoring
//const monitor = createMonitor(nui);

// Accessibility info display - shows what screen readers would announce
function getAccessibleName(el) {
	if (!el) return '';
	
	// aria-labelledby takes precedence
	const labelledBy = el.getAttribute('aria-labelledby');
	if (labelledBy) {
		const labels = labelledBy.split(/\s+/).map(id => document.getElementById(id)?.textContent?.trim()).filter(Boolean);
		if (labels.length) return labels.join(' ');
	}
	
	// aria-label
	const ariaLabel = el.getAttribute('aria-label');
	if (ariaLabel) return ariaLabel;
	
	// For inputs, check associated label
	if (el.id) {
		const label = document.querySelector(`label[for="${el.id}"]`);
		if (label) return label.textContent?.trim();
	}
	
	// title attribute
	const title = el.getAttribute('title');
	if (title) return title;
	
	// Text content for simple elements
	const text = el.textContent?.trim();
	if (text && text.length < 100) return text;
	
	return '';
}

function getAccessibleRole(el) {
	if (!el) return '';
	
	// Explicit role
	const role = el.getAttribute('role');
	if (role) return role;
	
	// Implicit roles from HTML semantics
	const tag = el.tagName.toLowerCase();
	const implicitRoles = {
		'button': 'button',
		'a': el.hasAttribute('href') ? 'link' : '',
		'input': el.type === 'checkbox' ? 'checkbox' : el.type === 'radio' ? 'radio' : 'textbox',
		'select': 'combobox',
		'textarea': 'textbox',
		'img': 'img',
		'nav': 'navigation',
		'main': 'main',
		'header': 'banner',
		'footer': 'contentinfo',
		'article': 'article',
		'aside': 'complementary',
		'ul': 'list',
		'ol': 'list',
		'li': 'listitem',
		'table': 'table',
		'h1': 'heading',
		'h2': 'heading',
		'h3': 'heading',
		'h4': 'heading',
		'h5': 'heading',
		'h6': 'heading'
	};
	return implicitRoles[tag] || '';
}

function getAccessibleState(el) {
	const states = [];
	
	if (el.getAttribute('aria-expanded') === 'true') states.push('expanded');
	if (el.getAttribute('aria-expanded') === 'false') states.push('collapsed');
	if (el.getAttribute('aria-selected') === 'true') states.push('selected');
	if (el.getAttribute('aria-checked') === 'true') states.push('checked');
	if (el.getAttribute('aria-checked') === 'false') states.push('not checked');
	if (el.getAttribute('aria-pressed') === 'true') states.push('pressed');
	if (el.getAttribute('aria-disabled') === 'true' || el.disabled) states.push('disabled');
	if (el.getAttribute('aria-required') === 'true' || el.required) states.push('required');
	if (el.getAttribute('aria-invalid') === 'true') states.push('invalid');
	if (el.getAttribute('aria-current')) states.push(`current: ${el.getAttribute('aria-current')}`);
	
	const level = el.getAttribute('aria-level') || (el.tagName.match(/^H([1-6])$/)?.[1]);
	if (level) states.push(`level ${level}`);
	
	return states.join(', ');
}

function formatAccessibleInfo(el) {
	const role = getAccessibleRole(el);
	const name = getAccessibleName(el);
	const state = getAccessibleState(el);
	const tag = el.tagName.toLowerCase();
	
	let announcement = '';
	if (name) announcement += name;
	if (role) announcement += announcement ? `, ${role}` : role;
	if (state) announcement += announcement ? `, ${state}` : state;
	
	return announcement || `<${tag}>`;
}

document.addEventListener('focusin', (e) => {
	const infoEl = document.querySelector('nui-app-footer #appFooterInfo');
	if (!infoEl) return;
	
	infoEl.textContent = formatAccessibleInfo(e.target);
});

// Text-box trim toggle (Ctrl+Alt+T)
document.addEventListener('keydown', (e) => {
	if (e.ctrlKey && e.altKey && e.key === 't') {
		e.preventDefault();
		const current = document.documentElement.getAttribute('data-text-box-trim') === 'true';
		document.documentElement.setAttribute('data-text-box-trim', !current);
		localStorage.setItem('nui-text-box-trim', !current);
		console.log(`Text-box trim: ${!current ? 'ON' : 'OFF'}`);
		
		// Show banner notification
		const message = !current ? 'Text-box trim enabled (CSS text-box: trim-both text)' : 'Text-box trim disabled';
		nui.components.banner.show({ content: message, priority: 'info', duration: 2000 });
	}
});

// Restore text-box trim preference (default: ON)
const savedTrim = localStorage.getItem('nui-text-box-trim');
if (savedTrim === null || savedTrim === 'true') {
	document.documentElement.setAttribute('data-text-box-trim', 'true');
}

// Parse URL parameters
const urlParams = new URLSearchParams(window.location.search);
const skipInit = urlParams.has('skip-init');
const mode = urlParams.get('mode'); // Future: different test modes

console.log('URL params:', { skipInit, mode });

// Setup action handlers using event delegation on data-action attributes
document.addEventListener('click', (e) => {

	const actionEl = e.target.closest('[data-action]');
	if (!actionEl) return;
	const action = actionEl.dataset.action;

	switch (action) {
		case 'toggle-sidebar':
			const app = document.querySelector('nui-app');
			if (app?.toggleSideNav) {
				app.toggleSideNav();
			}
			break;
		case 'toggle-theme':
			const current = document.documentElement.style.colorScheme || 'light';
			const newTheme = current === 'dark' ? 'light' : 'dark';
			document.documentElement.style.colorScheme = newTheme;
			localStorage.setItem('nui-theme', newTheme);
			break;
		case 'log-action':
			console.log('Custom action triggered:', { actionEl });
			break;
		case 'toggle-media':
			const icon = document.getElementById('dynamic-icon');
			const isPlaying = icon.getAttribute('name') === 'play';
			icon.setAttribute('name', isPlaying ? 'pause' : 'play');
			console.log(isPlaying ? 'Starting playback...' : 'Pausing playback...');
			break;
	}
});

// Register a demo feature (app-level functionality, not a content page)
nui.registerFeature('dashboard', (element, params) => {
	let refreshInterval = null;
	let counter = 0;

	// Build dashboard UI
	element.innerHTML = `
		<header>
			<h1>Dashboard Feature</h1>
			<p class="lead">This is an app feature registered with <code>nui.registerFeature()</code></p>
		</header>
		
		<section class="dashboard-content">
			<div class="nui-card">
				<div class="nui-headline">Live Data</div>
				<div class="nui-copy">
					<p>Updates: <strong id="dash-counter">0</strong></p>
					<p>Status: <span id="dash-status">Initializing...</span></p>
					<p>Last update: <span id="dash-time">-</span></p>
				</div>
			</div>
			
			<div class="nui-card">
				<div class="nui-headline">Feature Benefits</div>
				<div class="nui-copy">
					<ul>
						<li><strong>Lifecycle hooks</strong> - show/hide callbacks for resource management</li>
						<li><strong>Cached element</strong> - created once, reused on navigation</li>
						<li><strong>App-level state</strong> - polling pauses when hidden</li>
						<li><strong>No HTML file</strong> - built entirely in JavaScript</li>
					</ul>
				</div>
			</div>
		</section>
	`;

	const counterEl = element.querySelector('#dash-counter');
	const statusEl = element.querySelector('#dash-status');
	const timeEl = element.querySelector('#dash-time');

	function updateDashboard() {
		counter++;
		counterEl.textContent = counter;
		timeEl.textContent = new Date().toLocaleTimeString();
	}

	// Lifecycle: called when element becomes visible
	element.show = (params) => {
		statusEl.textContent = 'Active (polling every 2s)';
		statusEl.style.color = 'var(--nui-accent)';
		refreshInterval = setInterval(updateDashboard, 2000);
		console.log('[Dashboard] Started polling');
	};

	// Lifecycle: called when element is hidden
	element.hide = () => {
		statusEl.textContent = 'Paused';
		statusEl.style.color = '';
		if (refreshInterval) {
			clearInterval(refreshInterval);
			refreshInterval = null;
		}
		console.log('[Dashboard] Stopped polling');
	};
});

// Navigation data (JSON) - mirrors the HTML structure
const navigationData = [
	{
		label: 'Documentation',
		icon: 'article',
		items: [
			{ label: 'Introduction', href: '#page=documentation/introduction' },
			{ label: 'Getting Started', href: '#page=documentation/getting-started' },
			{ label: 'Declarative Actions', href: '#page=documentation/declarative-actions' },
			{ label: 'API Structure', href: '#page=documentation/api-structure' },
		]
	},
	{
		label: 'Components',
		icon: 'empty_dashboard',
		items: [
			{
				label: 'Layout & Structure',
				items: [
					{ label: 'App Layout', href: '#page=components/app-layout' },
					{ label: 'Layout', href: '#page=components/layout' },
					{ label: 'Skip Links', href: '#page=components/skip-links' }
				]
			},
			{
				label: 'Forms & Inputs',
				items: [
					{ label: 'Button', href: '#page=components/button' },
					{ label: 'Inputs', href: '#page=components/inputs' },
					{ label: 'Tag Input', href: '#page=components/tag-input' },
					{ label: 'Select', href: '#page=components/select' },
					{ label: 'Slider', href: '#page=components/slider' }
				]
			},
			{
				label: 'Content & Display',
				items: [
					{ label: 'Tabs', href: '#page=components/tabs' },
					{ label: 'Accordion', href: '#page=components/accordion' },
					{ label: 'Table', href: '#page=components/table' },
					{ label: 'Dialog', href: '#page=components/dialog' },
					{ label: 'Banner', href: '#page=components/banner' }
				]
			},
			{
				label: 'Navigation',
				items: [
					{ label: 'Link List', href: '#page=components/link-list' }
				]
			},
			{
				label: 'Elements & Utilities',
				items: [
					{ label: 'Icon', href: '#page=components/icon' },
					{ label: 'Storage', href: '#page=components/storage' }
				]
			}
		]
	},
	{
		label: 'Addons',
		icon: 'extension',
		items: [
			{ label: 'Code', href: '#page=addons/code' },
			{ label: 'List', href: '#page=addons/list' },
			{ label: 'Menu', href: '#page=addons/menu' },
			{ label: 'Animation', href: '#page=addons/animation' }
		]
	},
	{
		label: 'Experiments',
		icon: 'settings',
		items: [
			{ label: 'Dashboard', href: '#feature=dashboard' },
			{ label: 'HTML Standards', href: '#page=experiments/html-standards' },
		]
	}
];

// Load side navigation from JSON
const sideNav = document.querySelector('nui-side-nav nui-link-list');
if (sideNav && sideNav.loadData) {
	sideNav.loadData(navigationData);
	console.log('Side navigation loaded from JSON');
}

// Setup content loading (simplified single call)
nui.enableContentLoading({
	container: 'nui-content nui-main',
	navigation: 'nui-side-nav',
	basePath: 'pages',
	defaultPage: 'documentation/introduction'
});

// Note: nui.init() is called automatically in nui.js unless ?skip-init parameter is present
