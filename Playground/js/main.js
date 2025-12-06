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

// Configure NUI for playground paths
nui.configure({
	iconSpritePath: '../NUI/assets/material-icons-sprite.svg'
});

// Register custom actions
nui.registerAction('show-alert', (target, source, event, param) => {
	alert(`Button clicked: ${source.textContent.trim()}`);
});

nui.registerAction('log-action', (target, source, event, param) => {
	console.log('Custom action triggered:', { target, source, param });
});

nui.registerAction('toggle-media', (target, source, event, param) => {
	const icon = document.getElementById('dynamic-icon');
	const isPlaying = icon.getAttribute('name') === 'play';

	// Change icon AND simulate actual functionality
	icon.setAttribute('name', isPlaying ? 'pause' : 'play');
	console.log(isPlaying ? 'Starting playback...' : 'Pausing playback...');

	// In real app: audio.play() or audio.pause()
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
		label: 'Pages',
		icon: 'article',
		items: [
			{ label: 'Introduction', href: '#page=introduction' },
			{ label: 'Getting Started', href: '#page=getting-started' }
		]
	},
	{
		label: 'Components',
		icon: 'empty_dashboard',
		items: [
			{ label: 'App Layout', href: '#page=components/app-layout' },
			{ label: 'Link List', href: '#page=components/link-list' },
			{ label: 'Code', href: '#page=components/code' },
			{ label: 'Icon', href: '#page=components/icon' },
			{ label: 'Button', href: '#page=components/button' },
			{ label: 'Dialog', href: '#page=components/dialog' },
			{ label: 'Banner', href: '#page=components/banner' },
			{ label: 'Animation', href: '#page=components/animation' }
		]
	},
	{
		label: 'Features',
		icon: 'settings',
		items: [
			{ label: 'Dashboard', href: '#feature=dashboard' }
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
	basePath: '/Playground/pages',
	defaultPage: 'introduction'
});

// Note: nui.init() is called automatically in nui.js unless ?skip-init parameter is present
