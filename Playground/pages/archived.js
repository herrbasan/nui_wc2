export function init() {
	console.log('[archived] Page initialized');
}

export function onShow() {
	console.log('[archived] Page shown');
	
	// Populate icon grid if it exists
	const iconGrid = document.getElementById('icon-grid');
	if (iconGrid) {
		populateIconGrid(iconGrid);
	}
	
	// Setup button handlers for active state management
	setupActiveStateButtons();
	
	// Register custom actions for this page
	registerCustomActions();
}

function populateIconGrid(container) {
	const icons = [
		'menu', 'settings', 'search', 'person', 'notifications', 'mail',
		'folder', 'analytics', 'security', 'add', 'edit', 'delete',
		'wysiwyg', 'empty_dashboard', 'label', 'calendar', 'filter_list',
		'monitor', 'layers', 'play', 'pause', 'stop'
	];
	
	container.innerHTML = icons.map(iconName => `
		<div style="
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: 0.5rem;
			padding: 1rem;
			background: #3a3a3a;
			border-radius: 4px;
		">
			<nui-icon name="${iconName}" style="font-size: 2rem;"></nui-icon>
			<code style="font-size: 0.75rem; color: #aaa;">${iconName}</code>
		</div>
	`).join('');
}

function setupActiveStateButtons() {
	const sideNav = document.querySelector('nui-side-nav');
	if (!sideNav) return;
	
	const btnSetEslint = document.getElementById('btn-set-eslint');
	const btnSetSub1 = document.getElementById('btn-set-sub1');
	const btnGetActive = document.getElementById('btn-get-active');
	const btnClearActive = document.getElementById('btn-clear-active');
	const btnClearCloseAll = document.getElementById('btn-clear-close-all');
	const display = document.getElementById('active-state-display');
	
	if (btnSetEslint) {
		btnSetEslint.addEventListener('nui-click', () => {
			sideNav.setActive('a[href="#plugin-eslint"]');
			updateDisplay(display, sideNav);
		});
	}
	
	if (btnSetSub1) {
		btnSetSub1.addEventListener('nui-click', () => {
			sideNav.setActive('a[href="#sub1"]');
			updateDisplay(display, sideNav);
		});
	}
	
	if (btnGetActive) {
		btnGetActive.addEventListener('nui-click', () => {
			updateDisplay(display, sideNav);
		});
	}
	
	if (btnClearActive) {
		btnClearActive.addEventListener('nui-click', () => {
			sideNav.clearActive();
			updateDisplay(display, sideNav);
		});
	}
	
	if (btnClearCloseAll) {
		btnClearCloseAll.addEventListener('nui-click', () => {
			sideNav.clearActive(true);
			updateDisplay(display, sideNav);
		});
	}
}

function updateDisplay(display, sideNav) {
	if (!display || !sideNav) return;
	
	const data = sideNav.getActiveData();
	if (data) {
		display.textContent = JSON.stringify({
			href: data.href,
			text: data.text
		}, null, 2);
	} else {
		display.textContent = 'No active item';
	}
}

function registerCustomActions() {
	// Action handlers now use event delegation with data-action attributes
	// These are handled in main.js or directly via onclick handlers
	// This function is no longer needed but kept for reference
	console.log('[archived] Custom actions should be handled via data-action attributes');
}
