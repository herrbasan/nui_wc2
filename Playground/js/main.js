// Playground main script
console.log('main.js loading...');

import { nui } from '../../NUI/nui.js';
//import { createMonitor } from '../../NUI/lib/modules/nui-monitor.js';

console.log('nui imported');

// Development-only: Enable monitoring
//const monitor = createMonitor(nui);

// Parse URL parameters
const urlParams = new URLSearchParams(window.location.search);
const skipInit = urlParams.has('skip-init');
const mode = urlParams.get('mode'); // Future: different test modes

console.log('URL params:', { skipInit, mode });

// Configure NUI for playground paths (optional - default should work)
nui.configure({
	iconSpritePath: '/NUI/assets/material-icons-sprite.svg'
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
			{ label: 'Icon', href: '#page=components/icon' }
		]
	},
	{
		label: 'Archived',
		icon: 'folder',
		items: [
			{ label: 'Legacy Demos', href: '#page=archived' }
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
