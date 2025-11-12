// Playground main script
console.log('main.js loading...');

import { nui } from '../../NUI/nui.js';

console.log('nui imported');

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

// Listen for button clicks to test component behavior
document.addEventListener('nui-click', (e) => {
	console.log('Button clicked:', e.detail.source);
});

// Listen for navigation clicks
document.addEventListener('nui-nav-click', (e) => {
	console.log('Navigation clicked:', e.detail);
});

// Sidebar API tests
document.addEventListener('DOMContentLoaded', () => {
	const linkList = document.querySelector('nui-link-list');
	
	if (!linkList) {
		console.warn('nui-link-list not found');
		return;
	}
	
	// Test: Set first group active
	const testActive0 = document.getElementById('test-active-0');
	if (testActive0) {
		testActive0.addEventListener('click', () => {
			const firstItem = linkList.querySelector('.nui-sidebar-item');
			if (firstItem) {
				linkList.clearActive();
				firstItem.classList.add('active');
				console.log('Set first item active');
			}
		});
	}
	
	// Test: Set sub-item active (second group, first sub-item)
	const testActiveSub = document.getElementById('test-active-sub');
	if (testActiveSub) {
		testActiveSub.addEventListener('click', () => {
			const groups = linkList.querySelectorAll('.nui-sidebar-item.group');
			if (groups.length >= 2) {
				const secondGroup = groups[1];
				const firstSubItem = secondGroup.querySelector('.sub-item');
				if (firstSubItem) {
					linkList.clearActive();
					linkList.clearSubs();
					firstSubItem.classList.add('active');
					
					// Open parent group
					const subEl = secondGroup.querySelector('.sub');
					if (subEl) {
						secondGroup.classList.add('open');
						subEl.style.height = subEl.scrollHeight + 'px';
					}
					console.log('Set sub-item active and opened parent');
				}
			}
		});
	}
	
	// Test: Clear all active states
	const testClearActive = document.getElementById('test-clear-active');
	if (testClearActive) {
		testClearActive.addEventListener('click', () => {
			linkList.clearActive();
			console.log('Cleared all active states');
		});
	}
});