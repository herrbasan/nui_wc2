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
		label: 'Overview',
		icon: 'empty_dashboard',
		items: [
			{ label: 'Introduction',  event: 'navigate:introduction' },
			{ label: 'Getting Started', event: 'navigate:getting-started' }
		]
	},
	{
		label: 'Content & Windows',
		icon: 'wysiwyg',
		action: 'edit-section:content',
		items: [
			{ label: 'Content', href: '#content' },
			{ label: 'Windows', href: '#windows' }
		]
	},
	{
		label: 'Buttons & Fields',
		icon: 'empty_dashboard',
		items: [
			{ label: 'Buttons', href: '#buttons' },
			{ label: 'Fields', href: '#fields' }
		]
	},
	{
		label: 'Misc',
		icon: 'label',
		href: '#misc',
		event: 'navigate:misc'
	},
	{
		label: 'Group',
		icon: 'folder',
		items: [
			{ label: 'Some Item', href: '#some' },
			{ label: 'Another Item', href: '#another' },
			{
				label: 'Sub Group',
				icon: 'calendar',
				items: [
					{ label: 'Subgroup Item 1', href: '#sub1' },
					{ label: 'Subgroup Item 2', href: '#sub2' }
				]
			}
		]
	},
	{
		label: 'Functions & Objects',
		icon: 'filter_list',
		items: [
			{ label: 'Function Item 1', href: '#fnc1' },
			{ label: 'Function Item 2', href: '#fnc2' },
			{ label: 'Function Item 3', href: '#fnc3' },
			{ separator: true },
			{ label: 'Object Item 1', href: '#obj1' },
			{ label: 'Object Item 2', href: '#obj2' }
		]
	},
	{
		label: 'Developer Tools',
		icon: 'monitor',
		items: [
			{ label: 'Overview', href: '#devtools-overview' },
			{
				label: 'Build Tools',
				icon: 'settings',
				items: [
					{ label: 'Configuration', href: '#build-config' },
					{ label: 'Scripts', href: '#build-scripts' },
					{
						label: 'Plugins',
						icon: 'layers',
						items: [
							{ label: 'Babel', href: '#plugin-babel' },
							{ label: 'Webpack, a tool I truly hate, so I give it a title that reflects my feelings', href: '#plugin-webpack' },
							{ label: 'ESLint', href: '#plugin-eslint' }
						]
					}
				]
			},
			{
				label: 'Testing',
				icon: 'search',
				items: [
					{ label: 'Unit Tests', href: '#test-unit' },
					{ label: 'Integration Tests', href: '#test-integration' },
					{ label: 'E2E Tests', href: '#test-e2e' }
				]
			}
		]
	}
];

// Load side navigation from JSON
const sideNav = document.querySelector('nui-side-nav nui-link-list');
if (sideNav && sideNav.loadData) {
	sideNav.loadData(navigationData);
	console.log('Side navigation loaded from JSON');
}

// All available icons (from sprite generation output)
const availableIcons = [
	'add', 'add_circle', 'analytics', 'arrow', 'article', 'aspect_ratio', 'assessment', 
	'attach_money', 'brightness', 'calendar', 'chat', 'close', 'credit_card', 'database', 
	'delete', 'done', 'download', 'drag_handle', 'drag_indicator', 'edit', 'edit_note', 
	'empty_dashboard', 'filter_list', 'folder', 'fullscreen', 'grid_on', 'headphones', 
	'id_card', 'image', 'info', 'install_desktop', 'invert_colors', 'key', 'keyboard', 
	'label', 'layers', 'location_on', 'logout', 'mail', 'media_folder', 'menu', 'monitor', 
	'more', 'mouse', 'my_location', 'notifications', 'open_in_full', 'palette', 'pause', 
	'person', 'photo_camera', 'play', 'print', 'public', 'rainy', 'save', 'search', 
	'security', 'settings', 'sign_language', 'smart_display', 'sort', 'speaker', 
	'stadia_controller', 'star_rate', 'sticky_note', 'sync', 'upload', 'volume', 
	'warning', 'work', 'wysiwyg'
];

// Function to populate icon grid
function populateIconGrid() {
	const grid = document.getElementById('icon-grid');
	if (!grid) return;
	
	grid.innerHTML = ''; // Clear existing content
	
	availableIcons.forEach(iconName => {
		const iconItem = document.createElement('div');
		iconItem.style.cssText = `
			display: flex; 
			flex-direction: column; 
			align-items: center; 
			gap: 0.5rem; 
			padding: 0.75rem; 
			background: #3a3a3a; 
			border-radius: 6px; 
			border: 1px solid #444;
			cursor: pointer;
			transition: background 0.2s ease;
		`;
		
		// Add hover effect
		iconItem.addEventListener('mouseenter', () => {
			iconItem.style.background = '#4a4a4a';
		});
		iconItem.addEventListener('mouseleave', () => {
			iconItem.style.background = '#3a3a3a';
		});
		
		// Add click to copy name
		iconItem.addEventListener('click', () => {
			navigator.clipboard.writeText(iconName).then(() => {
				const originalText = iconItem.querySelector('span').textContent;
				iconItem.querySelector('span').textContent = 'Copied!';
				setTimeout(() => {
					iconItem.querySelector('span').textContent = originalText;
				}, 1000);
			});
		});
		
		// Create icon element
		const iconElement = document.createElement('nui-icon');
		iconElement.setAttribute('name', iconName);
		iconElement.style.cssText = 'color: #fff; font-size: 24px;';
		
		// Create label
		const label = document.createElement('span');
		label.textContent = iconName;
		label.style.cssText = `
			font-size: 0.75rem; 
			color: #ccc; 
			text-align: center; 
			word-break: break-word;
			line-height: 1.2;
		`;
		
		iconItem.appendChild(iconElement);
		iconItem.appendChild(label);
		grid.appendChild(iconItem);
	});
}

// Note: nui.init() is called automatically in nui.js unless ?skip-init parameter is present

// Populate icon grid after DOM is loaded
document.addEventListener('DOMContentLoaded', populateIconGrid);

// Also populate if script loads after DOM
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', populateIconGrid);
} else {
	populateIconGrid();
}

// Sidebar API tests
document.addEventListener('DOMContentLoaded', () => {
	const sideNav = document.querySelector('nui-side-nav');
	const linkList = document.querySelector('nui-link-list');
	const stateDisplay = document.getElementById('active-state-display');
	
	if (!sideNav || !linkList) {
		console.warn('nui-side-nav or nui-link-list not found');
		return;
	}
	
	// Function to update state display
	function updateStateDisplay() {
		if (!stateDisplay) return;
		
		const data = sideNav.getActiveData();
		if (data) {
			stateDisplay.textContent = `Active Item:
  href: ${data.href}
  text: ${data.text}
  element: <li>
  link: <a>`;
		} else {
			stateDisplay.textContent = 'No active item';
		}
	}
	
	// Set Active: ESLint
	document.getElementById('btn-set-eslint')?.addEventListener('click', () => {
		const result = sideNav.setActive('a[href="#plugin-eslint"]');
		console.log('setActive(ESLint) result:', result);
		updateStateDisplay();
	});
	
	// Set Active: Subgroup Item 1
	document.getElementById('btn-set-sub1')?.addEventListener('click', () => {
		const result = sideNav.setActive('a[href="#sub1"]');
		console.log('setActive(Subgroup Item 1) result:', result);
		updateStateDisplay();
	});
	
	// Get Active State
	document.getElementById('btn-get-active')?.addEventListener('click', () => {
		const active = sideNav.getActive();
		const data = sideNav.getActiveData();
		console.log('Active element:', active);
		console.log('Active data:', data);
		
		if (data) {
			alert(`Active Item:\n\nText: ${data.text}\nHref: ${data.href}`);
		} else {
			alert('No active item');
		}
		
		updateStateDisplay();
	});
	
	// Clear Active
	document.getElementById('btn-clear-active')?.addEventListener('click', () => {
		sideNav.clearActive();
		console.log('Cleared active state');
		updateStateDisplay();
	});
	
	// Clear Active & Close All
	document.getElementById('btn-clear-close-all')?.addEventListener('click', () => {
		sideNav.clearActive();
		sideNav.clearSubs();
		console.log('Cleared active state and closed all groups');
		updateStateDisplay();
	});
	
	// Watch for state changes via Knower
	const instanceId = linkList.getAttribute('nui-id');
	if (instanceId) {
		nui.knower.watch(`${instanceId}:active`, (state, oldState) => {
			console.log('[WATCHER] Active state changed:', {
				old: oldState?.text,
				new: state?.text
			});
			updateStateDisplay();
		});
	}
	
	// Handle clicks on sidebar links
	linkList.addEventListener('click', (e) => {
		const link = e.target.closest('a');
		if (link) {
			e.preventDefault();
			sideNav.setActive(link);
			console.log('Link clicked:', link.getAttribute('href'));
		}
	});
	
	// Set initial active state
	setTimeout(() => {
		sideNav.setActive('a[href="#devtools-overview"]');
		updateStateDisplay();
	}, 100);
});

// =============================================================================
// AUTO-REGISTERED CUSTOM ACTION LISTENERS
// =============================================================================

// Pattern 1: Event-driven (immediate response)
document.addEventListener('nui-navigate', (e) => {
	const { param, element } = e.detail;
	console.log('Navigate action triggered (event):', param);
	
	// In real app: load content, update URL, etc.
	// window.location.hash = param;
	// loadContent(param);
});

// Pattern 2: State-driven via Knower (reactive, queryable)
nui.knower.watch('action:navigate', (state, oldState) => {
	console.log('Navigate action triggered (knower):', state.param);
	console.log('  Previous:', oldState?.param, '→ New:', state.param);
	
	// Bonus: Can query last navigation anytime
	// const lastNav = nui.knower.know('action:navigate');
});

// Listen for edit-section actions (event pattern)
document.addEventListener('nui-edit-section', (e) => {
	const { param, element } = e.detail;
	console.log('Edit section action triggered:', param);
	
	// In real app: open editor modal for section
	// openEditor(param);
});

// Listen for custom-action (no param)
document.addEventListener('nui-custom-action', (e) => {
	const { element } = e.detail;
	console.log('Custom action triggered (no param)');
	
	// In real app: perform custom logic
	alert('Custom action executed! Check console for details.');
});

// Listen for load-data actions (knower pattern)
nui.knower.watch('action:load-data', (state) => {
	console.log('Load data action triggered:', state.param);
	console.log('  Timestamp:', new Date(state.timestamp).toLocaleTimeString());
	
	// In real app: fetch data from API
	// fetchData(state.param).then(data => displayData(data));
});

