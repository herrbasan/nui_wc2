// Navigation data structure from archived page demos
const demoNavigationData = [
	{
		label: 'Content & Windows',
		icon: 'wysiwyg',
		items: [
			{ label: 'Content' },
			{ label: 'Windows' }
		]
	},
	{
		label: 'Buttons & Fields',
		icon: 'empty_dashboard',
		items: [
			{ label: 'Buttons' },
			{ label: 'Fields' }
		]
	},
	{
		label: 'Group',
		icon: 'folder',
		items: [
			{ label: 'Some Item' },
			{ label: 'Another Item' },
			{
				label: 'Sub Group',
				icon: 'calendar',
				items: [
					{ label: 'Subgroup Item 1' },
					{ label: 'Subgroup Item 2' }
				]
			}
		]
	},
	{
		label: 'Functions & Objects',
		icon: 'filter_list',
		items: [
			{ label: 'Function Item 1' },
			{ label: 'Function Item 2' },
			{ label: 'Function Item 3' },
			{ separator: true },
			{ label: 'Object Item 1' },
			{ label: 'Object Item 2' }
		]
	},
	{
		label: 'Developer Tools',
		icon: 'monitor',
		items: [
			{ label: 'Overview' },
			{
				label: 'Build Tools',
				icon: 'settings',
				items: [
					{ label: 'Configuration' },
					{ label: 'Scripts' },
					{
						label: 'Plugins',
						icon: 'layers',
						items: [
							{ label: 'Babel' },
							{ label: 'Webpack' },
							{ label: 'ESLint' }
						]
					}
				]
			},
			{
				label: 'Testing',
				icon: 'search',
				items: [
					{ label: 'Unit Tests' },
					{ label: 'Integration Tests' },
					{ label: 'E2E Tests' }
				]
			}
		]
	}
];

// Auto-initialize when DOM is ready
function initPage() {
	// Load navigation data into both demo components
	const demoFold = document.getElementById('demo-fold');
	const demoTree = document.getElementById('demo-tree');
	
	if (demoFold && demoFold.loadData) {
		demoFold.loadData(demoNavigationData);
	}
	
	if (demoTree && demoTree.loadData) {
		demoTree.loadData(demoNavigationData);
	}
	
	// Display the navigation structure in the code block
	const codeBlock = document.getElementById('nav-structure-code');
	if (codeBlock) {
		codeBlock.textContent = JSON.stringify(demoNavigationData, null, 2);
	}
	
	// Setup interactive testing buttons
	setupInteractiveTesting(demoFold, demoTree);
}

// Run when script loads
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initPage);
} else {
	initPage();
}

function setupInteractiveTesting(foldList, treeList) {
	const foldStateDisplay = document.getElementById('fold-state-display');
	const treeStateDisplay = document.getElementById('tree-state-display');
	
	// Helper to update fold state display
	function updateFoldStateDisplay() {
		if (!foldStateDisplay || !foldList) return;
		
		const foldData = foldList.getActiveData();
		if (foldData) {
			foldStateDisplay.textContent = `Active Item:\n  ${foldData.text}`;
		} else {
			foldStateDisplay.textContent = 'No active item';
		}
	}
	
	// Helper to update tree state display
	function updateTreeStateDisplay() {
		if (!treeStateDisplay || !treeList) return;
		
		const treeData = treeList.getActiveData();
		if (treeData) {
			treeStateDisplay.textContent = `Active Item:\n  ${treeData.text}`;
		} else {
			treeStateDisplay.textContent = 'No active item';
		}
	}
	
	// Fold Mode: Set Active: ESLint
	const btnSetEslint = document.getElementById('btn-set-eslint');
	if (btnSetEslint && foldList) {
		btnSetEslint.addEventListener('nui-click', () => {
			const eslintLink = foldList.querySelector('a:has(span)');
			const allLinks = Array.from(foldList.querySelectorAll('a:has(span)'));
			const eslintItem = allLinks.find(link => link.textContent.trim() === 'ESLint');
			if (eslintItem) {
				foldList.setActive(eslintItem);
				console.log('[link-list] Set active: ESLint (fold mode)');
			}
			updateFoldStateDisplay();
		});
	}
	
	// Fold Mode: Get Active State
	const btnGetActiveFold = document.getElementById('btn-get-active-fold');
	if (btnGetActiveFold && foldList) {
		btnGetActiveFold.addEventListener('nui-click', () => {
			const foldData = foldList.getActiveData();
			
			if (foldData) {
				alert(`Fold Mode Active:\n\nText: ${foldData.text}`);
			} else {
				alert('Fold Mode: No active item');
			}
			
			updateFoldStateDisplay();
		});
	}
	
	// Fold Mode: Clear Active & Close All
	const btnClearActiveFold = document.getElementById('btn-clear-active-fold');
	if (btnClearActiveFold && foldList) {
		btnClearActiveFold.addEventListener('nui-click', () => {
			foldList.clearActive(true); // true = close all groups
			console.log('[link-list] Cleared fold mode and closed all groups');
			updateFoldStateDisplay();
		});
	}
	
	// Tree Mode: Set Active: Subgroup Item 1
	const btnSetSub1 = document.getElementById('btn-set-sub1');
	if (btnSetSub1 && treeList) {
		btnSetSub1.addEventListener('nui-click', () => {
			const allLinks = Array.from(treeList.querySelectorAll('a:has(span)'));
			const subItem = allLinks.find(link => link.textContent.trim() === 'Subgroup Item 1');
			if (subItem) {
				treeList.setActive(subItem);
				console.log('[link-list] Set active: Subgroup Item 1 (tree mode)');
			}
			updateTreeStateDisplay();
		});
	}
	
	// Tree Mode: Get Active State
	const btnGetActiveTree = document.getElementById('btn-get-active-tree');
	if (btnGetActiveTree && treeList) {
		btnGetActiveTree.addEventListener('nui-click', () => {
			const treeData = treeList.getActiveData();
			
			if (treeData) {
				alert(`Tree Mode Active:\n\nText: ${treeData.text}`);
			} else {
				alert('Tree Mode: No active item');
			}
			
			updateTreeStateDisplay();
		});
	}
	
	// Tree Mode: Clear Active
	const btnClearActiveTree = document.getElementById('btn-clear-active-tree');
	if (btnClearActiveTree && treeList) {
		btnClearActiveTree.addEventListener('nui-click', () => {
			treeList.clearActive();
			console.log('[link-list] Cleared tree mode active state');
			updateTreeStateDisplay();
		});
	}
	
	// Watch for active state changes on fold list
	if (foldList) {
		const foldId = foldList.getAttribute('nui-id');
		if (foldId && window.nui?.knower) {
			window.nui.knower.watch(`${foldId}:active`, (state, oldState) => {
				console.log('[link-list] Fold mode active changed:', state?.text);
				updateFoldStateDisplay();
			}, `link-list-page`);
		}
	}
	
	// Watch for active state changes on tree list
	if (treeList) {
		const treeId = treeList.getAttribute('nui-id');
		if (treeId && window.nui?.knower) {
			window.nui.knower.watch(`${treeId}:active`, (state, oldState) => {
				console.log('[link-list] Tree mode active changed:', state?.text);
				updateTreeStateDisplay();
			}, `link-list-page`);
		}
	}
	
	// Initial state displays
	updateFoldStateDisplay();
	updateTreeStateDisplay();
}

export function onHide() {
	// Cleanup watchers when leaving page
	if (window.nui?.knower) {
		window.nui.knower.clean('link-list-page');
		console.log('[link-list] Cleaned up watchers');
	}
}
