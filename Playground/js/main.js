// Playground main script
console.log('main.js loading...');

import { nui } from '../../NUI/nui.js';
import '../../NUI/lib/modules/nui-animation.js';
//import { createMonitor } from '../../NUI/lib/modules/nui-monitor.js';

console.log('nui imported');

// Development-only: Enable monitoring
//const monitor = createMonitor(nui);

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
			{ label: 'App Layout', href: '#page=components/app-layout' },
			{ label: 'Storage', href: '#page=components/storage' },
			{ label: 'Link List', href: '#page=components/link-list' },
			{ label: 'Skip Links', href: '#page=components/skip-links' },
			{ label: 'Code', href: '#page=components/code' },
			{ label: 'Icon', href: '#page=components/icon' },
			{ label: 'Button', href: '#page=components/button' },
			{ label: 'Dialog', href: '#page=components/dialog' },
			{ label: 'Banner', href: '#page=components/banner' },
			{ label: 'Tabs', href: '#page=components/tabs' },
			{ label: 'Accordion', href: '#page=components/accordion' },
			{ label: 'Inputs', href: '#page=components/inputs' },
			{ label: 'Table', href: '#page=components/table' },
			{ label: 'Slider', href: '#page=components/slider' }
		]
	},
	{
		label: 'Addons',
		icon: 'extension',
		items: [
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
	container: 'nui-content main',
	navigation: 'nui-side-nav',
	basePath: 'pages',
	defaultPage: 'documentation/introduction'
});

// Note: nui.init() is called automatically in nui.js unless ?skip-init parameter is present
