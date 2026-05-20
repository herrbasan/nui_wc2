// Auto-generated page registrations — all Playground page logic
// Pattern: nui.registerPage('route', { html: 'pages/route.html', init(element, params, nui) { ... } })
// Generated on 2026-05-20

import { nui } from '../../NUI/nui.js';

// ── Home ──

nui.registerPage('home', {
	html: 'home.html',
	init(element, params, nui) {
		element.addEventListener('nui-action', (e) => {
		        const { param } = e.detail;
		        if (param?.startsWith('#')) {
		            window.location.hash = param.slice(1);
		        }
		    });
	}
});

// ── Core Components ──

nui.registerPage('components/badge', {
	html: 'components/badge.html',
	init(element, params, nui) {
		let count = 0;
		const targetBtn = element.querySelector('#demo-notification-btn');
		
		element.addEventListener('nui-action-badge', (e) => {
		if (e.detail.param === 'increment') {
		count++;
		targetBtn.setAttribute('data-badge', count.toString());
		} else if (e.detail.param === 'clear') {
		count = 0;
		targetBtn.removeAttribute('data-badge');
		}
		});
	}
});

nui.registerPage('components/banner', {
	html: 'components/banner.html',
	init(element, params, nui) {
		let replacementCounter = 0;
		
		element.addEventListener('nui-action', (e) => {
		const { name, target, param } = e.detail;
		
		switch(name) {
		case 'banner-show':
		if (target && target.show) target.show();
		break;
		case 'banner-close':
		if (target && target.close) target.close(param);
		break;
		
		case 'show-top-banner':
		nui.components.banner.show({
		content: 'This banner appears at the top of the content area.',
		placement: 'top',
		autoClose: 3000
		});
		break;
		case 'show-bottom-banner':
		nui.components.banner.show({
		content: 'This banner appears at the bottom of the content area.',
		placement: 'bottom',
		autoClose: 3000
		});
		break;
		case 'show-persistent-banner':
		nui.components.banner.show({
		content: 'This banner stays until you dismiss it.',
		placement: 'top',
		autoClose: 0
		});
		break;
		case 'show-info-banner':
		nui.components.banner.show({
		content: 'ℹ️ This is an info banner (role="status").',
		placement: 'bottom',
		priority: 'info',
		autoClose: 3000
		});
		break;
		case 'show-alert-banner':
		nui.components.banner.show({
		content: '⚠️ This is an alert banner (role="alert") - screen readers announce immediately.',
		placement: 'bottom',
		priority: 'alert',
		autoClose: 4000
		});
		break;
		case 'show-replacement-demo':
		replacementCounter++;
		nui.components.banner.show({
		content: `Banner #${replacementCounter} - Click again to replace this banner.`,
		placement: 'top',
		autoClose: 5000
		});
		break;
		case 'show-cookie-consent':
		const cookieBanner = nui.components.banner.show({
		content: `
		<div style="display: flex; flex-direction: column; gap: 1rem;">
		<div>
		<strong style="font-size: 1.1rem;">🍪 Cookie Preferences</strong>
		<p style="margin: 0.5rem 0 0 0; opacity: 0.8;">
		We use cookies to enhance your browsing experience.
		</p>
		</div>
		<div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
		<nui-button><button type="button" data-action="handle-cookies:all">Accept All</button></nui-button>
		<nui-button><button type="button" data-action="handle-cookies:essential">Essential Only</button></nui-button>
		<nui-button><button type="button" data-action="handle-cookies:customize">Customize</button></nui-button>
		</div>
		</div>
		`,
		placement: 'bottom',
		showCloseButton: false,
		autoClose: 0
		});
		
		cookieBanner.element.addEventListener('nui-action', (e) => {
		element.dispatchEvent(new CustomEvent('nui-action', {
		detail: e.detail
		}));
		});
		break;
		case 'handle-cookies':
		nui.components.banner.show({
		content: `Cookie preference saved: <strong>${param}</strong>`,
		placement: 'bottom',
		autoClose: 2000
		});
		break;
		case 'show-progress-demo':
		nui.components.banner.show({
		content: 'This banner will close in 5 seconds. Watch the progress bar!',
		placement: 'top',
		autoClose: 5000
		});
		break;
		case 'show-no-progress-demo':
		nui.components.banner.show({
		content: 'This banner will close in 5 seconds (no progress bar).',
		placement: 'top',
		autoClose: 5000,
		showProgress: false
		});
		break;
		}
		});
	}
});

nui.registerPage('components/button', {
	html: 'components/button.html',
	init(element, params, nui) {
		const busyBtns = element.querySelectorAll('.demo-busy-btn');
					busyBtns.forEach(btn => {
						btn.addEventListener('click', () => {
							btn.setLoading(true);
							setTimeout(() => {
								btn.setLoading(false);
							}, 2000);
						});
					});
		
					const uploadBtn = element.querySelector('#demo-upload-btn');
					const uploadResult = element.querySelector('#demo-upload-result');
					if (uploadBtn) {
						uploadBtn.addEventListener('nui-file-selected', (e) => {
							const files = e.detail.files;
							if (files.length > 0) {
								uploadResult.textContent = `Selected: ${files[0].name} (${files[0].size} bytes)`;
							} else {
								uploadResult.textContent = 'Selection canceled';
							}
						});
					}
		
					const segmented = element.querySelector('#demo-segmented');
					const segmentedResult = element.querySelector('#demo-segmented-result');
					if (segmented) {
						segmented.addEventListener('nui-change', (e) => {
							segmentedResult.textContent = `Selected: ${e.detail.value}`;
						});
					}
		
					element.addEventListener('nui-action', (e) => {
						const { name, target } = e.detail;
						
						if (name === 'highlight-target') {
							if (target) {
								target.style.backgroundColor = 'var(--color-highlight)';
								target.style.color = 'white';
								setTimeout(() => {
									target.style.backgroundColor = 'var(--color-shade2)';
									target.style.color = 'inherit';
								}, 500);
							}
						} else if (name === 'toggle-highlight') {
							if (target) {
								target.classList.toggle('highlight');
							}
						}
					});
	}
});

nui.registerPage('components/card', {
	html: 'components/card.html',
	init(element, params, nui) {
		const output = element.querySelector('[data-demo-output]');
		
		    function render(text) {
		        if (output) output.textContent = text;
		    }
		
		    element.addEventListener('nui-action', (e) => {
		        const { name, target, param } = e.detail;
		        
		        switch (name) {
		            case 'demo':
		                if (param === 'mock') {
		                    render('Mock action fired natively from interactive card!');
		                }
		                break;
		            // Note: banner-show, banner-close, dialog-open, & dialog-close are globally registered natively by NUI
		        }
		    });
	}
});

nui.registerPage('components/code', {
	html: 'components/code.html',
	init(element, params, nui) {
		// One-time setup if needed
	}
});

nui.registerPage('components/dialog', {
	html: 'components/dialog.html',
	init(element, params, nui) {
		// Import rich-text addon if not already registered (needed for programmatic page demo)
			if (!customElements.get('nui-rich-text')) {
				const link = document.createElement('link');
				link.rel = 'stylesheet';
				link.href = '../NUI/css/modules/nui-rich-text.css';
				document.head.appendChild(link);
				import('../../NUI/lib/modules/nui-rich-text.js');
			}
		
			// Watch the custom-confirm state and display it
			const stateEl = element.querySelector('#custom-confirm-state');
			const customConfirm = element.querySelector('#custom-confirm');
		
			customConfirm.addEventListener('nui-dialog-open', () => {
				stateEl.textContent = 'State: open | Result: pending...';
			});
		
			customConfirm.addEventListener('nui-dialog-close', (e) => {
				stateEl.textContent = 'State: closed | Result: ' + e.detail.returnValue;
			});
		
			// Setup action handlers using data-action delegation
			element.addEventListener('nui-action', async (e) => {
				const { name, target, param } = e.detail;
		
				switch (name) {
					case 'show-alert':
						await nui.components.dialog.alert('Hello!', 'This is a standard system alert.', {placement: 'top'});
						break;
					case 'show-confirm':
						const confirmRes = await nui.components.dialog.confirm('Confirmation', 'Are you sure you want to proceed?', {placement: 'top'});
						break;
					case 'show-prompt':
						const promptRes = await nui.components.dialog.prompt('Enter Details', 'Please provide your information.', {
							placement: 'top',
							fields: [
								{ id: 'name', label: 'Name', value: 'John Doe' },
								{ id: 'email', label: 'Email', type: 'email' }
							]
						});
						break;
					case 'show-alert-top':
						await nui.components.dialog.alert('Top Placement', 'This alert appears at the top.', { placement: 'top' });
						break;
					case 'show-alert-bottom':
						await nui.components.dialog.alert('Bottom Placement', 'This alert appears at the bottom.', { placement: 'bottom' });
						break;
					case 'show-blocking-alert':
						await nui.components.dialog.alert('Important Notice', 'This dialog cannot be closed with Escape or by clicking outside. You must click OK.', { 
							blocking: true,
							placement: 'top'
						});
						break;
					case 'show-blocking-confirm':
						const blockingRes = await nui.components.dialog.confirm('Terms of Service', 'Do you accept the terms of service? You must choose an option.', {
							blocking: true,
							placement: 'top'
						});
						break;
					case 'show-programmatic-page':
						(async () => {
							const { dialog, main } = await nui.components.dialog.page('Create User', '', {
								contentScroll: true,
								buttons: [
									{ label: 'Cancel', type: 'outline', value: 'cancel' },
									{ label: 'Create', type: 'primary', value: 'create' }
								]
							});
		
							main.innerHTML = `
								<section>
									<h3>Account Details</h3>
									<nui-form>
										<nui-input-group>
											<label>Username</label>
											<nui-input><input type="text" placeholder="jdoe"></nui-input>
										</nui-input-group>
										<nui-input-group>
											<label>Email Address</label>
											<nui-input><input type="email" placeholder="you@example.com" required></nui-input>
											<span class="description">We'll never share your email with anyone.</span>
										</nui-input-group>
										<nui-input-group>
											<label>Role</label>
											<nui-select>
												<select>
													<option value="">Select a role...</option>
													<option value="admin">Administrator</option>
													<option value="editor">Editor</option>
													<option value="viewer">Viewer</option>
												</select>
											</nui-select>
										</nui-input-group>
									</nui-form>
								</section>
		
								<section>
									<h3>Preferences</h3>
									<nui-form>
										<nui-input-group>
											<label>Theme</label>
											<nui-select>
												<select>
													<option value="light">Light</option>
													<option value="dark">Dark</option>
													<option value="system">System</option>
												</select>
											</nui-select>
										</nui-input-group>
										<nui-field label="Notifications"><nui-toggle checked></nui-toggle></nui-field>
										<nui-field label="Enable beta features"><nui-toggle></nui-toggle></nui-field>
									</nui-form>
								</section>
		
								<section>
									<h3>Description</h3>
									<nui-rich-text placeholder="Enter a description..."></nui-rich-text>
								</section>
							`;
		
							const resultEl = element.querySelector('#page-dialog-result');
							const actionEl = element.querySelector('#page-dialog-action');
							const valuesEl = element.querySelector('#page-dialog-values');
		
							dialog.addEventListener('nui-dialog-open', () => {
								resultEl.hidden = false;
							});
		
							dialog.addEventListener('nui-dialog-close', (e) => {
								const action = e.detail.returnValue;
								actionEl.textContent = action;
		
								if (action === 'create') {
									const username = main.querySelector('input[type="text"]')?.value;
									const email = main.querySelector('input[type="email"]')?.value;
									const role = main.querySelector('nui-select select')?.value;
									const theme = main.querySelectorAll('nui-select select')[1]?.value;
									const notifications = main.querySelector('nui-toggle')?.checked;
									const beta = main.querySelectorAll('nui-toggle')[1]?.checked;
									const description = main.querySelector('nui-rich-text')?.value;
		
									valuesEl.textContent = JSON.stringify({
										username,
										email,
										role,
										theme,
										notifications,
										betaFeatures: beta,
										description
									}, null, 2);
								} else {
									valuesEl.textContent = 'No form data (cancelled)';
								}
							});
						})();
						break;
				}
			});
	}
});

nui.registerPage('components/dropzone', {
	html: 'components/dropzone.html',
	init(element, params, nui) {
		function wireDropzone(id, outputSelector) {
				const dropzone = element.querySelector('#' + id);
				const output = element.querySelector(outputSelector);
				if (!dropzone || !output) return;
		
				dropzone.addEventListener('nui-dropzone-open', () => {
					output.textContent = 'Dropzone active — drag over a zone...';
				});
		
				dropzone.addEventListener('nui-dropzone-drop', (e) => {
					const { zone, dataTransfer } = e.detail;
					const names = [];
					for (let i = 0; i < dataTransfer.files.length; i++) names.push(dataTransfer.files[i].name);
					output.innerHTML = '<strong>Zone:</strong> ' + zone + ' &nbsp;|&nbsp; <strong>Files:</strong> ' + (names.join(', ') || 'none');
				});
		
				dropzone.addEventListener('nui-dropzone-close', () => {
					if (!output.querySelector('strong')) {
						output.textContent = 'Drag files here to test...';
					}
				});
			}
		
			wireDropzone('demo-2', '[data-demo-output]');
			wireDropzone('demo-3', '[data-demo-output-3]');
		
			const progTarget = element.querySelector('#programmatic-target');
			const progOutput = element.querySelector('[data-demo-output-4]');
			if (progTarget && progOutput) {
				const dz = nui.components.dropzone.create(
					[
						{ name: 'images', label: 'Images' },
						{ name: 'documents', label: 'Documents' },
						{ name: 'audio', label: 'Audio' },
						{ name: 'video', label: 'Video' }
					],
					(detail) => {
						const names = [];
						for (let i = 0; i < detail.dataTransfer.files.length; i++) names.push(detail.dataTransfer.files[i].name);
						progOutput.innerHTML = '<strong>Zone:</strong> ' + detail.zone + ' &nbsp;|&nbsp; <strong>Files:</strong> ' + (names.join(', ') || 'none');
					},
					progTarget
				);
		
				dz.addEventListener('nui-dropzone-open', () => {
					progOutput.textContent = 'Dropzone active — drag over a zone...';
				});
		
				dz.addEventListener('nui-dropzone-close', () => {
					if (!progOutput.querySelector('strong')) {
						progOutput.textContent = 'Drag files here to test...';
					}
				});
			}
	}
});

nui.registerPage('components/icon', {
	html: 'components/icon.html',
	async init(element, params, nui) {
		const iconGrid = element.querySelector('#icon-grid');
			const iconSearch = element.querySelector('#icon-search');
			const iconEmpty = element.querySelector('#icon-empty');
			
			if (!iconGrid) {
				console.warn('[icon page] Icon grid element not found');
				return;
			}
		
			try {
				// Load icons dynamically from sprite
				const icons = await nui.components.icon.getAvailable();
				
				if (!icons || icons.length === 0) {
					iconGrid.innerHTML = '<p class="demo-text-error">Failed to load icons from sprite.</p>';
					return;
				}
				
				function renderIcons(filter = '') {
					const filtered = icons.filter(name => name.toLowerCase().includes(filter.toLowerCase()));
					
					if (filtered.length === 0) {
						iconGrid.innerHTML = '';
						iconEmpty.hidden = false;
						return;
					}
					
					iconEmpty.hidden = true;
					iconGrid.innerHTML = filtered.map(name => `
						<div class="cheatsheet-icon" data-icon="${name}" title="Click to copy: ${name}">
							<nui-icon name="${name}"></nui-icon>
							<span>${name}</span>
						</div>
					`).join('');
					
					// Add click handlers
					iconGrid.querySelectorAll('.cheatsheet-icon').forEach(el => {
						el.addEventListener('click', () => {
							const name = el.dataset.icon;
							navigator.clipboard.writeText(name).then(() => {
								el.classList.add('copied');
								setTimeout(() => el.classList.remove('copied'), 1000);
							});
						});
					});
				}
				
				renderIcons();
				
				iconSearch.addEventListener('input', (e) => {
					renderIcons(e.target.value);
				});
				
				console.log(`[icon page] Loaded ${icons.length} icons`);
			} catch (err) {
				console.error('[icon page] Error loading icons:', err);
				iconGrid.innerHTML = `<p class="demo-text-error">Error loading icons: ${err.message}</p>`;
			}
		
			// Handle click events for the LLM guide
			element.addEventListener('click', (e) => {
				const target = e.target;
				if (target.tagName === 'H2' || target.tagName === 'H3' || target.tagName === 'H4' || target.tagName === 'H5' || target.tagName === 'H6') {
					const action = target.textContent;
					const time = new Date().toISOString();
					eventLog.innerHTML = `<div>[${time}] Clicked: ${action}</div>` + eventLog.innerHTML;
				}
			});
	}
});

nui.registerPage('components/inputs', {
	html: 'components/inputs.html',
	init(element, params, nui) {
		// Handle actions
			element.addEventListener('nui-action', (e) => {
				const action = e.detail.name;
				
				if (action === 'validate-form') {
					const inputs = element.querySelectorAll('#demo-form nui-input, #demo-form nui-textarea');
					let allValid = true;
					inputs.forEach(input => {
						if (input.validate && !input.validate()) {
							allValid = false;
						}
					});
					if (allValid) {
						nui.components.banner.create({
							content: '<p>All fields are valid!</p>',
							priority: 'info',
							autoClose: 3000
						});
					}
					e.stopPropagation();
				}
			});
		
			// Handle event logging
			const eventDemo = element.querySelector('#event-demo');
			const eventLog = element.querySelector('#event-log');
			
			if (eventDemo && eventLog) {
				['nui-input', 'nui-change', 'nui-clear'].forEach(eventType => {
					eventDemo.addEventListener(eventType, (e) => {
						const time = new Date().toLocaleTimeString();
						const detail = JSON.stringify(e.detail || {});
						eventLog.innerHTML = `<div>[${time}] ${eventType}: ${detail}</div>` + eventLog.innerHTML;
					});
				});
			}
	}
});

nui.registerPage('components/link-list', {
	html: 'components/link-list.html',
	init(element, params, nui) {
		// Navigation data structure
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
		
			const demoFold = element.querySelector('#demo-fold');
			const demoTree = element.querySelector('#demo-tree');
			
			if (demoFold && demoFold.loadData) {
				demoFold.loadData(demoNavigationData);
			}
			
			if (demoTree && demoTree.loadData) {
				demoTree.loadData(demoNavigationData);
			}
			
			const codeBlock = element.querySelector('#nav-structure-code');
			if (codeBlock) {
				codeBlock.textContent = JSON.stringify(demoNavigationData, null, 2);
				// Trigger syntax highlighting after content update
				const nuiCode = codeBlock.closest('nui-code');
				if (nuiCode && nuiCode.highlight) {
					nuiCode.highlight();
				}
			}
			
			// Setup interactive testing
			const foldStateDisplay = element.querySelector('#fold-state-display');
			const treeStateDisplay = element.querySelector('#tree-state-display');
			const treePathDisplay = element.querySelector('#tree-path-display');
			const instanceId = 'link-list-page-' + Date.now();
			
			function updateFoldStateDisplay() {
				if (!foldStateDisplay || !demoFold) return;
				const foldData = demoFold.getActiveData?.();
				foldStateDisplay.textContent = foldData ? `Active Item:\n  ${foldData.text}` : 'No active item';
			}
			
			function updateTreeStateDisplay() {
				if (!treeStateDisplay || !demoTree) return;
				const treeData = demoTree.getActiveData?.();
				treeStateDisplay.textContent = treeData ? `Active Item:\n  ${treeData.text}` : 'No active item';
			}
		
			function getBreadcrumbFromItem(item) {
				if (!item) return [];
				const path = [];
				const anchor = item.querySelector('a') || item;
				const itemLabel = anchor.textContent.trim();
				if (itemLabel) path.unshift(itemLabel);
		
				let container = item.closest('.group-items');
				while (container) {
					const header = container.previousElementSibling?.closest('.group-header');
					if (!header) break;
					const labelSpan = header.querySelector('span span');
					const label = (labelSpan ? labelSpan.textContent : header.textContent || '').trim();
					if (label) path.unshift(label);
					container = header.closest('.group-items');
				}
		
				return path;
			}
		
			function updateTreePathDisplay(item = null) {
				if (!treePathDisplay) return;
				const targetItem = item || demoTree?.getActive?.();
				const path = getBreadcrumbFromItem(targetItem);
				treePathDisplay.textContent = path.length ? path.join(' / ') : 'No item selected';
			}
			
			// Handle actions
			element.addEventListener('click', (e) => {
				const actionEl = e.target.closest('[data-action]');
				if (!actionEl) return;
				
				const actionSpec = actionEl.dataset.action;
				if (!actionSpec) return;
				
				const [actionName, param] = actionSpec.split(':');
				
				if (actionName === 'set-active-fold') {
					const allLinks = Array.from(demoFold.querySelectorAll('a:has(span)'));
					const item = allLinks.find(link => link.textContent.trim() === param);
					if (item) demoFold.setActive(item);
					updateFoldStateDisplay();
				} else if (actionName === 'get-active-fold') {
					const foldData = demoFold.getActiveData?.();
							nui.components.dialog.alert('Active State', foldData ? `Fold Mode Active:\n\nText: ${foldData.text}` : 'Fold Mode: No active item');
					updateFoldStateDisplay();
				} else if (actionName === 'clear-active-fold') {
					demoFold.clearActive?.(true);
					updateFoldStateDisplay();
				} else if (actionName === 'set-active-tree') {
					const allLinks = Array.from(demoTree.querySelectorAll('a:has(span)'));
					const item = allLinks.find(link => link.textContent.trim() === param);
					if (item) demoTree.setActive(item);
					updateTreeStateDisplay();
					updateTreePathDisplay(item?.closest('li'));
				} else if (actionName === 'get-active-tree') {
					const treeData = demoTree.getActiveData?.();
							nui.components.dialog.alert('Active State', treeData ? `Tree Mode Active:\n\nText: ${treeData.text}` : 'Tree Mode: No active item');
					updateTreeStateDisplay();
					updateTreePathDisplay();
				} else if (actionName === 'clear-active-tree') {
					demoTree.clearActive?.();
					updateTreeStateDisplay();
					updateTreePathDisplay();
				}
			});
			
			// Watch for state changes using custom events
			if (demoFold) {
				demoFold.addEventListener('nui-active-change', () => updateFoldStateDisplay());
			}
			
			if (demoTree) {
				demoTree.addEventListener('nui-active-change', (e) => {
					updateTreeStateDisplay();
					updateTreePathDisplay(e.detail?.element);
				});
			}
			
			updateFoldStateDisplay();
			updateTreeStateDisplay();
			updateTreePathDisplay();
	}
});

nui.registerPage('components/markdown', {
	html: 'components/markdown.html',
	init(element, params, nui) {
		// The component auto-initializes the markdown on connection.
			
			// --- Streaming Demo Logic ---
			var btnStart = element.querySelector('#btn-start');
			var btnPause = element.querySelector('#btn-pause');
			var btnReset = element.querySelector('#btn-reset');
			var tempoSelect = element.querySelector('#tempo-select');
			var mdOutput = element.querySelector('#md-output');
			var raw = element.querySelector('#raw');
			var statChunks = element.querySelector('#stat-chunks');
			var statChars = element.querySelector('#stat-chars');
		
			var streamText = '';
			var streamIndex = 0;
			var isPaused = false;
			var streamInterval = null;
			var chunkCount = 0;
		
			var sampleMarkdown = [
				'# Streaming Markdown Test',
				'',
				'This is a slightly longer document designed to stress-test the **incremental streaming renderer**. It includes various Markdown features to ensure boundaries are calculated correctly and rendering performs well.',
				'',
				'## 1. Typography & Inline Elements',
				'',
				'Here is some *italic text*, some **bold text**, and even some ***bold italic text***.',
				'We also support ~~strikethrough~~ for deleted content, and `inline code snippets` for technical references.',
				'Links are quite important too: [Visit NUI Components](#page=components/button).',
				'',
				'---',
				'',
				'## 2. Blockquotes',
				'',
				'> This is a standard blockquote.',
				'> It spans multiple lines to show how it renders.',
				'>',
				'> And it can have multiple paragraphs without breaking.',
				'',
				'***',
				'',
				'## 3. Lists',
				'',
				'### Unordered List',
				'- Apple (Fresh)',
				'- Orange (Citrus)',
				'- Banana (Yellow)',
				'',
				'### Ordered List',
				'1. First, prepare the environment.',
				'2. Second, run the compiler.',
				'3. Finally, deploy the application.',
				'',
				'===',
				'',
				'## 4. Tables',
				'',
				'| Component | Status | Performance |',
				'|------------|--------|-------------|',
				'| Button | Stable | Very Fast |',
				'| Markdown | Beta | O(1) Updates |',
				'| Router | V2 | Excellent |',
				'',
				'---',
				'',
				'## 5. Rich Media',
				'',
				'Images are also supported dynamically during stream:',
				'![Example Icon](assets/icons/favicon.svg)',
				'',
				'## 6. Extended Code Blocks',
				'',
				'Let us look at a more complex JavaScript example. Notice how the streaming pauses syntax highlighting logic until the generic code block boundary is fully sealed.',
				'',
				'```javascript',
				'// NuiDataProcessor: A complex web component example',
				'class DataProcessor extends HTMLElement {',
				'    constructor() {',
				'        super();',
				'        this._records = new Map();',
				'        this._isProcessing = false;',
				'    }',
				'',
				'    async fetchAndTransform(endpoint) {',
				'        try {',
				'            this._isProcessing = true;',
				'            this.dispatchEvent(new CustomEvent("process-start"));',
				'',
				'            const response = await fetch(endpoint);',
				'            if (!response.ok) throw new Error("Network response was not ok");',
				'',
				'            const data = await response.json();',
				'            ',
				'            // Heavy transformation loop over dataset',
				'            for (const item of data) {',
				'                this._records.set(item.id, {',
				'                    ...item,',
				'                    transformedAt: Date.now(),',
				'                    normalizedVal: item.value * 1.5',
				'                });',
				'            }',
				'',
				'            this.dispatchEvent(new CustomEvent("process-complete", { ',
				'                detail: { count: this._records.size }',
				'            }));',
				'        } catch (err) {',
				'            console.error("Transformation failed:", err);',
				'        } finally {',
				'            this._isProcessing = false;',
				'            this.removeAttribute("loading");',
				'        }',
				'    }',
				'}',
				'',
				'// Register the component with the browser',
				'customElements.define("nui-data-processor", DataProcessor);',
				'```',
				'',
				'And here is some CSS to style that custom element:',
				'',
				'```css',
				':root {',
				'    --processor-bg: var(--color-shade2);',
				'    --processor-text: var(--color-base);',
				'}',
				'',
				'nui-data-processor {',
				'    display: block;',
				'    padding: var(--nui-space-double);',
				'    background: var(--processor-bg);',
				'    color: var(--processor-text);',
				'    border-radius: var(--border-radius-large);',
				'    transition: all 0.3s ease;',
				'}',
				'',
				'nui-data-processor[loading] {',
				'    opacity: 0.7;',
				'    pointer-events: none;',
				'}',
				'```',
				'',
				'___',
				'',
				'**End of transmission.**',
				''
			].join('\n');
		
			function getTempo() {
				return tempoSelect.querySelector('select').value;
			}
		
			function streamNext() {
				if (streamIndex >= sampleMarkdown.length) {
					mdOutput.endStream();
					clearInterval(streamInterval);
					streamInterval = null;
					btnStart.querySelector('button').disabled = false;
					btnPause.querySelector('button').disabled = true;
					return;
				}
		
				var chunkSize = Math.floor(Math.random() * 5) + 1;
				var chunk = sampleMarkdown.substring(streamIndex, streamIndex + chunkSize);
				streamText += chunk;
				streamIndex += chunkSize;
		
				raw.textContent = streamText;
				raw.scrollTop = raw.scrollHeight;
		
				mdOutput.appendChunk(chunk);
		
				chunkCount++;
				statChunks.textContent = chunkCount;
				statChars.textContent = streamText.length;
			}
		
			function startStreaming() {
				if (streamInterval) clearInterval(streamInterval);
		
				streamIndex = 0;
				streamText = '';
				isPaused = false;
				chunkCount = 0;
				
				mdOutput.beginStream();
		
				var tempo = getTempo();
		
				btnStart.querySelector('button').disabled = true;
				btnPause.querySelector('button').disabled = false;
				btnPause.querySelector('button').textContent = 'Pause';
		
				if (tempo === 'instant') {
					streamText = sampleMarkdown;
					streamIndex = sampleMarkdown.length;
					raw.textContent = streamText;
					mdOutput.appendChunk(streamText);
					mdOutput.endStream();
					chunkCount = 1;
					statChunks.textContent = chunkCount;
					statChars.textContent = streamText.length;
					btnStart.querySelector('button').disabled = false;
					btnPause.querySelector('button').disabled = true;
				} else {
					streamInterval = setInterval(function() {
						if (!isPaused) streamNext();
					}, parseInt(tempo, 10) || 100);
				}
			}
		
			btnStart.querySelector('button').addEventListener('click', startStreaming);
		
			btnPause.querySelector('button').addEventListener('click', function() {
				isPaused = !isPaused;
				btnPause.querySelector('button').textContent = isPaused ? 'Resume' : 'Pause';
			});
		
			btnReset.querySelector('button').addEventListener('click', function() {
				if (streamInterval) {
					clearInterval(streamInterval);
					streamInterval = null;
				}
				streamIndex = 0;
				streamText = '';
				isPaused = false;
				chunkCount = 0;
		
				btnStart.querySelector('button').disabled = false;
				btnPause.querySelector('button').disabled = true;
				btnPause.querySelector('button').textContent = 'Pause';
		
				raw.textContent = '';
				mdOutput.innerHTML = '';
				statChunks.textContent = '0';
				statChars.textContent = '0';
				
				if (mdOutput._isStreaming) mdOutput.endStream();
			});
		
			// Cleanup on view change
			element.hide = () => {
				if (streamInterval) {
					clearInterval(streamInterval);
					streamInterval = null;
				}
			};
	}
});

nui.registerPage('components/overlay', {
	html: 'components/overlay.html',
	init(element, params, nui) {
		element.addEventListener('nui-action-overlay-open', (e) => {
				const target = e.detail.target;
				if (target && target.showModal) target.showModal();
			});
		
			element.addEventListener('nui-action-overlay-open-loader', (e) => {
				const target = e.detail.target;
				if (target && target.showModal) {
					target.showModal();
					
					// Simulate a delay and then close
					setTimeout(() => {
						target.close();
					}, 3000);
				}
			});
	}
});

nui.registerPage('components/progress', {
	html: 'components/progress.html',
	init(element, params, nui) {
		let intervalId;
		
				const updateProgress = () => {
					const progressEls = element.querySelectorAll('.simulated-progress');
					progressEls.forEach(el => {
						const current = parseFloat(el.getAttribute('value')) || 0;
						let next = current + (Math.random() * 5 + 1);
						if (next >= 100) next = 0; // Reset back to 0
						el.setAttribute('value', next.toString());
					});
				};
		
				// Start background simulation when fragment is shown
				element.show = () => {
					if (!intervalId) {
						intervalId = setInterval(updateProgress, 600);
					}
				};
		
				// Clean up when fragment is hidden
				element.hide = () => {
					if (intervalId) {
						clearInterval(intervalId);
						intervalId = null;
					}
				};
				
				// If already visible on initial load, invoke show() directly
				element.show();
	}
});

nui.registerPage('components/select', {
	html: 'components/select.html',
	async init(element, params, nui) {
		// API Demo handlers
			const apiSelect = element.querySelector('#api-demo-select');
			const apiValue = element.querySelector('#api-value');
			
			if (apiSelect) {
				apiSelect.addEventListener('nui-change', (e) => {
					const val = e.detail.values[0] || 'none';
					if (apiValue) apiValue.textContent = val;
				});
				
				apiSelect.addEventListener('nui-item-add', () => {
					// Update display after adding item
					setTimeout(() => {
						const val = apiSelect.getValue() || 'none';
						if (apiValue) apiValue.textContent = val;
					}, 0);
				});
			}
			
			element.addEventListener('nui-action-select-demo', (e) => {
				const param = e.detail.param;
				if (!apiSelect) return;
		
				switch(param) {
					case 'opt2':
						apiSelect.select('opt2');
						break;
					case 'clear':
						apiSelect.clear();
						if (apiValue) apiValue.textContent = 'none';
						break;
					case 'add':
						const num = apiSelect.getItems().length;
						apiSelect.addItem(`opt${num + 1}`, `New Option ${num + 1}`);
						break;
					case 'toggle':
						apiSelect.setDisabled(!apiSelect.isDisabled());
						break;
				}
			});
		
			// Async Data Loading Demo
			const asyncSelect = element.querySelector('#async-demo-select');
			const asyncValue = element.querySelector('#async-value');
			const asyncDisabled = element.querySelector('#async-disabled');
			const asyncCount = element.querySelector('#async-count');
			const asyncDemoLoad = element.querySelector('#async-demo-load');
		
			function updateAsyncDisplay() {
				if (!asyncSelect || !asyncValue || !asyncDisabled || !asyncCount) return;
				asyncValue.textContent = asyncSelect.getValue() || 'none';
				asyncDisabled.textContent = asyncSelect.isDisabled() ? 'yes' : 'no';
				asyncCount.textContent = asyncSelect.getItems().length;
			}
		
			if (asyncSelect) {
				asyncSelect.addEventListener('nui-change', updateAsyncDisplay);
				updateAsyncDisplay();
			}
		
			// Load Data button - uses loadOptions() for automatic loading state
			if (asyncDemoLoad) {
				asyncDemoLoad.addEventListener('click', async () => {
					if (!asyncSelect) return;
		
					// loadOptions handles showLoading/hideLoading automatically
					const { data, error } = await asyncSelect.loadOptions(async () => {
						// Simulate 1.5s API delay
						await new Promise(resolve => setTimeout(resolve, 1500));
						return [
							{ id: 'model-a', name: 'Model Alpha' },
							{ id: 'model-b', name: 'Model Beta' },
							{ id: 'model-g', name: 'Model Gamma' },
							{ id: 'model-d', name: 'Model Delta' }
						];
					});
		
					if (error) {
						alert('Failed to load: ' + error.message);
					} else {
						// Populate with data (loadOptions already enabled and cleared loading)
						asyncSelect.setItems([
							{ value: '', label: 'Select a model...' },
							...data.map(m => ({ value: m.id, label: m.name }))
						]);
					}
					updateAsyncDisplay();
				});
			}
		
			// Multi-select API demo
			const multiSelect = element.querySelector('#multi-api-demo');
			const multiValue = element.querySelector('#multi-api-value');
			
			function updateMultiValue() {
				if (!multiSelect || !multiValue) return;
				const vals = multiSelect.getValue();
				multiValue.textContent = vals.length ? vals.join(', ') : 'none';
			}
			
			if (multiSelect) {
				multiSelect.addEventListener('nui-change', updateMultiValue);
			}
			
			element.addEventListener('nui-action-multi-demo', (e) => {
				const param = e.detail.param;
				if (!multiSelect) return;
				
				switch(param) {
					case 'select-all':
						const allValues = multiSelect.getItems().map(i => i.value);
						multiSelect.setValue(allValues);
						break;
					case 'unselect-red':
						multiSelect.unselect('red');
						break;
					case 'clear':
						multiSelect.clear();
						break;
					case 'add-random':
						const colors = ['Yellow', 'Purple', 'Orange', 'Pink', 'Cyan', 'Magenta'];
						const randomColor = colors[Math.floor(Math.random() * colors.length)];
						const existing = multiSelect.getItems().find(i => 
							i.label.toLowerCase() === randomColor.toLowerCase()
						);
						if (!existing) {
							multiSelect.addItem(
								randomColor.toLowerCase(), 
								randomColor
							);
						}
						break;
				}
				updateMultiValue();
			});
			
			// Event demo
			const eventSelect = element.querySelector('#event-demo');
			const eventLog = element.querySelector('#event-log div');
			const loggedEvents = [];
			
			function logEvent(name, detail) {
				if (!eventLog) return;
				const time = new Date().toLocaleTimeString();
				let info = '';
				if (detail && detail.values) {
					info = `values: [${detail.values.join(', ')}]`;
				} else if (detail && detail.value) {
					info = `value: ${detail.value}`;
				}
				loggedEvents.unshift(`${time} - ${name}${info ? ' (' + info + ')' : ''}`);
				if (loggedEvents.length > 5) loggedEvents.pop();
				eventLog.innerHTML = loggedEvents.map(e => `<div>${e}</div>`).join('');
			}
			
			if (eventSelect) {
				eventSelect.addEventListener('nui-open', () => logEvent('nui-open'));
				eventSelect.addEventListener('nui-close', () => logEvent('nui-close'));
				eventSelect.addEventListener('nui-change', (e) => logEvent('nui-change', e.detail));
				eventSelect.addEventListener('nui-select', (e) => logEvent('nui-select', e.detail));
				eventSelect.addEventListener('nui-clear', () => logEvent('nui-clear'));
			}
			
			// Form validation demo
			const form = element.querySelector('#demo-form');
			if (form) {
				form.addEventListener('submit', (e) => {
					e.preventDefault();
					const select = form.querySelector('nui-select');
					if (select && select.validate()) {
						nui.components.dialog?.alert('Success', 'Form submitted successfully!');
					}
				});
			}
	}
});

nui.registerPage('components/skip-links', {
	html: 'components/skip-links.html',
	init(element, params, nui) {
		// Page initialization logic
	}
});

nui.registerPage('components/slider', {
	html: 'components/slider.html',
	init(element, params, nui) {
		function bindValueMirror(sliderSelector, outputSelector) {
					const input = element.querySelector(sliderSelector);
					const output = element.querySelector(outputSelector);
					if (!input || !output) return;
		
					output.textContent = input.value;
					input.addEventListener('input', () => {
						output.textContent = input.value;
					});
				}
		
				bindValueMirror('#demo-slider-1 input', '#slider-value-1');
				bindValueMirror('#demo-slider-2 input', '#slider-value-2');
		
				const slider3 = element.querySelector('#demo-slider-3 input');
				const events = element.querySelector('#slider-events');
				if (slider3 && events) {
					events.textContent = 'Drag the slider...';
					slider3.addEventListener('input', () => {
						events.textContent = 'input: ' + slider3.value;
					});
					slider3.addEventListener('change', () => {
						events.textContent = 'change (final): ' + slider3.value;
					});
				}
	}
});

nui.registerPage('components/sortable', {
	html: 'components/sortable.html',
	init(element, params, nui) {
		const output = element.querySelector('[data-demo-output]');
			const sortable = element.querySelector('#demo-sortable');
			let counter = 5;
		
			function render(text) {
				if (output) output.textContent = text;
			}
		
			element.addEventListener('nui-sortable-change', (e) => {
				render('[' + e.detail.order.join(', ') + ']');
			});
		
			element.addEventListener('nui-action-demo-sortable-add', (e) => {
				const newId = `task-${counter++}`;
				const html = `
					<nui-sortable-item data-id="${newId}">
						<span class="drag-handle"><nui-icon name="drag_indicator"></nui-icon></span>
						<span style="flex: 1;">New Task Item ${counter - 1}</span>
						<button data-action="sortable-item-delete" class="demo-delete-btn" aria-label="Delete item"><nui-icon name="close"></nui-icon></button>
					</nui-sortable-item>
				`;
				if (sortable) {
					sortable.addItem(html);
				}
			});
		
			const imageGrid = element.querySelector('#demo-sortable-images');
			if (imageGrid) {
				const images = Array.from({ length: 118 }, (_, i) => String(i + 1).padStart(3, '0') + '.webp');
				// Shuffle array
				for (let i = images.length - 1; i > 0; i--) {
					const j = Math.floor(Math.random() * (i + 1));
					[images[i], images[j]] = [images[j], images[i]];
				}
				
				const selectedImages = images.slice(0, 20);
				
				const htmlStrings = selectedImages.map(img => `
					<nui-sortable-item data-id="${img}" class="image-item">
						<img src="images/Random_Picts/160p/${img}" alt="Thumbnail">
						<button data-action="sortable-item-delete" class="demo-delete-btn overlay" aria-label="Delete image"><nui-icon name="close"></nui-icon></button>
					</nui-sortable-item>
				`);
				imageGrid.setItems(htmlStrings);
			}
		
			element.show = () => {
				// Visible
			};
		
			element.hide = () => {
				// Cleanup
			};
	}
});

nui.registerPage('components/tabs', {
	html: 'components/tabs.html',
	init(element, params, nui) {
		const tabs = element.querySelector('#event-tabs');
			const log = element.querySelector('#tab-log');
			
			if (tabs && log) {
				tabs.addEventListener('nui-tab-change', (e) => {
					const detail = e.detail;
					const tabText = detail.tab.textContent.trim();
					const panelId = detail.panel.id;
					log.textContent = `Log: Switched to "${tabText}" (Panel ID: ${panelId})`;
				});
			}
	}
});

nui.registerPage('components/tag-input', {
	html: 'components/tag-input.html',
	init(element, params, nui) {
		// Helper to get output element
			function out(name) {
				return element.querySelector(`[data-output="${name}"]`);
			}
		
			// Helper to get tag-input by demo name
			function tagInput(name) {
				return element.querySelector(`[data-demo="${name}"]`);
			}
		
			// Helper to update output with current tags
			function showTags(name) {
				const ti = tagInput(name);
				if (!ti || !ti.listTags) return;
				const tags = ti.listTags();
				const output = out(name);
				if (output) {
					output.textContent = tags.length 
						? `Tags: ${tags.map(t => t.label || t.value).join(', ')}`
						: 'Tags: (none)';
				}
			}
		
			// Basic demo actions
			element.addEventListener('nui-action-tag-add', (e) => {
				const ti = tagInput(e.detail.param);
				if (ti && ti.addTag) {
					ti.addTag('sample-' + Date.now().toString(36));
					showTags(e.detail.param);
				}
			});
		
			element.addEventListener('nui-action-tag-remove', (e) => {
				const ti = tagInput(e.detail.param);
				if (ti && ti.listTags && ti.removeTag) {
					const tags = ti.listTags();
					if (tags.length > 0) {
						ti.removeTag(tags[tags.length - 1].value);
						showTags(e.detail.param);
					}
				}
			});
		
			element.addEventListener('nui-action-tag-clear', (e) => {
				const ti = tagInput(e.detail.param);
				if (ti && ti.clear) {
					ti.clear();
					showTags(e.detail.param);
				}
			});
		
			// API demo actions
			element.addEventListener('nui-action-api-add', (e) => {
				const ti = tagInput('api');
				if (ti && ti.addTag) {
					const result = ti.addTag('Lion');
					out('api').textContent = `addTag('Lion') → ${result}`;
				}
			});
		
			element.addEventListener('nui-action-api-add2', (e) => {
				const ti = tagInput('api');
				if (ti && ti.addTag) {
					const result = ti.addTag('Tiger', 'Tiger 🐯');
					out('api').textContent = `addTag('Tiger', 'Tiger 🐯') → ${result}`;
				}
			});
		
			element.addEventListener('nui-action-api-remove', (e) => {
				const ti = tagInput('api');
				if (ti && ti.removeTag) {
					const result = ti.removeTag('Lion');
					out('api').textContent = `removeTag('Lion') → ${result}`;
				}
			});
		
			element.addEventListener('nui-action-api-has', (e) => {
				const ti = tagInput('api');
				if (ti && ti.hasTag) {
					const result = ti.hasTag('Tiger');
					out('api').textContent = `hasTag('Tiger') → ${result}`;
				}
			});
		
			element.addEventListener('nui-action-api-list', (e) => {
				const ti = tagInput('api');
				if (ti && ti.listTags) {
					const result = ti.listTags();
					out('api').textContent = `listTags() → ${JSON.stringify(result, null, 2)}`;
				}
			});
		
			element.addEventListener('nui-action-api-values', (e) => {
				const ti = tagInput('api');
				if (ti && ti.getValues) {
					const result = ti.getValues();
					out('api').textContent = `getValues() → ${JSON.stringify(result)}`;
				}
			});
		
			element.addEventListener('nui-action-api-clear', (e) => {
				const ti = tagInput('api');
				if (ti && ti.clear) {
					ti.clear();
					out('api').textContent = `clear() → done`;
				}
			});
		
			// Events demo - listen to tag events
			const eventsInput = tagInput('events');
			if (eventsInput) {
				const eventsLog = [];
				
				eventsInput.addEventListener('nui-tag-add', (e) => {
					eventsLog.unshift(`+ Added: "${e.detail.label || e.detail.value}"`);
					out('events').textContent = eventsLog.slice(0, 5).join('\n');
				});
		
				eventsInput.addEventListener('nui-tag-remove', (e) => {
					eventsLog.unshift(`- Removed: "${e.detail.label || e.detail.value}"`);
					out('events').textContent = eventsLog.slice(0, 5).join('\n');
				});
			}
		
			// Form submission demo
			const form = element.querySelector('[data-demo-form]');
			if (form) {
				form.addEventListener('submit', (e) => {
					e.preventDefault();
					const formData = new FormData(form);
					const entries = [...formData.entries()];
					out('form').textContent = `Form data:\n${entries.map(([k, v]) => `  ${k}: ${v}`).join('\n') || '  (empty)'}`;
				});
			}
		
			// Editable demo - update output on change
			const editableInput = tagInput('editable');
			if (editableInput) {
				editableInput.addEventListener('nui-change', () => {
					showTags('editable');
				});
			}
		
			// Initial display for prepopulated
			// (wait for component to upgrade)
			requestAnimationFrame(() => {
				showTags('prepopulated');
			});
	}
});

nui.registerPage('components/tooltip', {
	html: 'components/tooltip.html',
	init(element, params, nui) {
		element.addEventListener('nui-action-demo:clicked', () => {
		        alert('Tooltip button clicked!');
		    });
	}
});

// ── Addons ──

nui.registerPage('addons/app-window', {
	html: 'addons/app-window.html',
	init(element, params, nui) {
		const launchBtn = element.querySelector('#launch-app button');
			const overlay = element.querySelector('#app-window-overlay');
			const container = element.querySelector('#app-window-container');
		
			launchBtn.addEventListener('click', async () => {
				const { appWindow } = await import('../../NUI/lib/modules/nui-app-window.js');
		
				overlay.showModal();
		
				appWindow({
					title: 'Demo Application',
					icon: 'settings',
					inner: `
						<div style="padding: var(--nui-space-double);">
							<h1 style="margin-top: 0;">Welcome to NUI App Window</h1>
							<p>This is the app window chrome rendered inside an overlay.</p>
							<p>Click the close button in the title bar to dismiss.</p>
						</div>
					`,
					statusbar: true,
					target: container,
					onClose: () => {
						overlay.close();
						container.innerHTML = '';
					}
				});
			});
		
			element.show = () => {};
			element.hide = () => {
				if (overlay?.open) {
					overlay.close();
				}
				container.innerHTML = '';
			};
	}
});

nui.registerPage('addons/code-editor', {
	html: 'addons/code-editor.html',
	init(element, params, nui) {
		const editor = element.querySelector('#demo-editor');
		    const output = element.querySelector('[data-output]');
		
		    if (editor && output) {
		        output.textContent = editor.value; // init
		        editor.addEventListener('nui-change', (e) => {
		            output.textContent = e.detail.value;
		        });
		    }
	}
});

nui.registerPage('addons/context-menu', {
	html: 'addons/context-menu.html',
	init(element, params, nui) {
		const outputLog = element.querySelector('#output-log');
			
			function log(message) {
				const p = document.createElement('p');
				p.style.margin = '0';
				p.style.padding = 'var(--nui-space-quarter) 0';
				p.style.borderBottom = '1px solid var(--border-shade1)';
				p.textContent = new Date().toLocaleTimeString() + ': ' + message;
				const firstP = outputLog.querySelector('p');
				if (firstP && firstP.style.color) {
					outputLog.innerHTML = '';
				}
				outputLog.appendChild(p);
			}
		
			// Basic menu
			const basicMenuItems = [
				{ label: 'Cut', action: 'cut', shortcut: 'Ctrl+X' },
				{ label: 'Copy', action: 'copy', shortcut: 'Ctrl+C' },
				{ label: 'Paste', action: 'paste', shortcut: 'Ctrl+V' },
				{ type: 'separator' },
				{ label: 'Select All', action: 'select-all', shortcut: 'Ctrl+A' }
			];
		
			// Menu with submenus
			const submenuItems = [
				{
					label: 'Format',
					items: [
						{ label: 'Bold', action: 'format-bold', shortcut: 'Ctrl+B' },
						{ label: 'Italic', action: 'format-italic', shortcut: 'Ctrl+I' },
						{ label: 'Underline', action: 'format-underline', shortcut: 'Ctrl+U' },
						{ type: 'separator' },
						{
							label: 'Text Size',
							items: [
								{ label: 'Small', action: 'size-small' },
								{ label: 'Medium', action: 'size-medium' },
								{ label: 'Large', action: 'size-large' },
								{ label: 'Huge', action: 'size-huge' }
							]
						}
					]
				},
				{ label: 'Refresh', action: 'refresh' },
				{ type: 'separator' },
				{ label: 'Settings', action: 'settings' }
			];
		
			// Menu with disabled items
			const disabledItems = [
				{ label: 'Undo', action: 'undo' },
				{ label: 'Redo', action: 'redo', disabled: true },
				{ type: 'separator' },
				{ label: 'Cut', action: 'cut' },
				{ label: 'Copy', action: 'copy' },
				{ label: 'Paste', action: 'paste', disabled: true }
			];
		
			import('../../NUI/lib/modules/nui-context-menu.js').then(({ contextMenu }) => {
				// Create three separate menus
				const basicMenu = contextMenu(basicMenuItems, {
					onAction: (action, item) => {
						log(`Basic menu: ${action} (${item.label})`);
					}
				});
		
				const submenuMenu = contextMenu(submenuItems, {
					onAction: (action, item) => {
						log(`Submenu menu: ${action} (${item.label})`);
					},
					onSubmenuOpen: (label) => {
						log(`Submenu opened: ${label}`);
					}
				});
		
				const disabledMenu = contextMenu(disabledItems, {
					onAction: (action, item) => {
						log(`Disabled menu: ${action} (${item.label})`);
					}
				});
		
				// Attach to demo areas
				const basicDemo = element.querySelector('#basic-demo');
				const submenuDemo = element.querySelector('#submenu-demo');
				const disabledDemo = element.querySelector('#disabled-demo');
		
				basicDemo.addEventListener('contextmenu', (e) => {
					e.preventDefault();
					basicMenu.show(e.clientX, e.clientY, e.currentTarget);
				});
		
				submenuDemo.addEventListener('contextmenu', (e) => {
					e.preventDefault();
					submenuMenu.show(e.clientX, e.clientY, e.currentTarget);
				});
		
				disabledDemo.addEventListener('contextmenu', (e) => {
					e.preventDefault();
					disabledMenu.show(e.clientX, e.clientY, e.currentTarget);
				});
		
				log('Context menus initialized. Right-click the demo areas above.');
			}).catch(err => {
				log('Error loading context-menu module: ' + err.message);
				console.error(err);
			});
	}
});

nui.registerPage('addons/lightbox', {
	html: 'addons/lightbox.html',
	init(element, params, nui) {
		// Declarative setup
		    const declarativeWrapper = element.querySelector('#demo-lightbox');
		    if (declarativeWrapper) {
		        const imgs = declarativeWrapper.querySelectorAll('img');
		        imgs.forEach((img, i) => {
		            img.addEventListener('click', () => {
		                declarativeWrapper.open([], i);
		            });
		        });
		    }
		
		    // Programmatic setup
		    element.addEventListener('nui-action', (e) => {
		        if (e.detail.name === 'lightbox-demo' && e.detail.param === 'programmatic') {
		            if (nui.components && nui.components.lightbox) {
		                nui.components.lightbox.show([
		                    { src: 'images/Random_Picts/1080p/054.webp', title: 'Forest' },
		                    { src: 'images/Random_Picts/1080p/060.webp', title: 'River' }
		                ], 0);
		            }
		        }
		    });
	}
});

nui.registerPage('addons/list', {
	html: 'addons/list.html',
	init(element, params, nui) {
		const api = window.nui || nui;
			if (!api || !api.util) return;
		
			const { fromHTML } = api.util.dom;
		
			// Generate 5000 demo products with images
			const categories = ['Electronics', 'Clothing', 'Home', 'Sports', 'Books'];
			const products = [];
			const imageNames = [];
			for (let i = 1; i <= 118; i++) {
				imageNames.push(String(i).padStart(3, '0') + '.webp');
			}
			
			for (let i = 0; i < 5000; i++) {
				const category = categories[Math.floor(Math.random() * categories.length)];
				products.push({
					oidx: i,
					name: `${category} Product ${i + 1}`,
					category: category,
					price: Math.floor(Math.random() * 200) + 10,
					rating: (Math.random() * 3 + 2).toFixed(1),
					image: imageNames[i % imageNames.length],
					inStock: Math.random() > 0.2
				});
			}
		
			// Full-featured demo
			const fullDemoList = element.querySelector('#fullDemoList');
			fullDemoList.loadData({
				data: products,
				render: (item) => {
					const el = fromHTML(`
						<div class="nui-list-image-item">
							<div>${item.oidx + 1}</div>
							<div class="image-cell list-item-image-cell">
								<img src="" alt="${item.name}">
							</div>
							<div class="list-item-content">
								<div class="list-item-title">${item.name}</div>
								<div class="list-item-meta">${item.category} • ⭐ </div>
							</div>
							<div class="list-item-price">$${item.price}</div>
						</div>
					`);
					
					const img = el.querySelector('img');
					el.update = () => {
						img.src = `images/Random_Picts/160p/${item.image}`;
						img.onload = () => img.classList.add('loaded');
					};
					
					return el;
				},
				search: [
					{ prop: 'name' },
					{ prop: 'category' }
				],
				sort: [
					{ label: 'Name (A-Z)', prop: 'name' },
					{ label: 'Price (Low-High)', prop: 'price', numeric: true },
					{ label: 'Price (High-Low)', prop: 'price', numeric: true, dir: 'desc' },
					{ label: 'Rating', prop: 'rating', numeric: true, dir: 'desc' }
				],
				filters: [
					{
						prop: 'category',
						label: 'Category',
						options: categories.map(c => ({ value: c, label: c }))
					}
				],
				footer: {
					buttons_left: [
						{
							label: 'Delete Selected',
							type: 'danger',
							fnc: () => {
								const selected = fullDemoList.getSelection();
								console.log('Would delete:', selected);
							}
						}
					],
					buttons_right: [
						{
							label: 'Export CSV',
							type: 'primary',
							fnc: () => console.log('Exporting...')
						}
					]
				},
				selection: 'multi',
				events: (e) => {
					if (e.type === 'selection') {
						console.log('Selection:', e.value, 'items');
					}
				}
			});
		
			// Minimal list (no header/footer)
			const minimalData = products.slice(0, 100).map((p, i) => ({
				id: i,
				name: p.name,
				price: p.price
			}));
			
			const minimalList = element.querySelector('#minimalList');
			minimalList.loadData({
				data: minimalData,
				render: (item) => {
					return fromHTML(`
						<div class="nui-list-log-item">
							<div>${item.id}</div>
							<div>${item.name}</div>
							<div>$${item.price}</div>
						</div>
					`);
				}
			});
		
			// Log mode
			const logData = [];
			const logModeList = element.querySelector('#logModeList');
			
			logModeList.loadData({
				data: logData,
				render: (item) => {
					return fromHTML(`
						<div class="nui-list-log-item">
							<div>${item.id}</div>
							<div>${item.message}</div>
							<div>${new Date(item.time).toLocaleTimeString()}</div>
						</div>
					`);
				},
				logmode: true
			});
		
			// Add log entries
			let logCounter = 0;
			const messages = [
				'User authenticated',
				'Database query executed',
				'Cache invalidated',
				'API request completed',
				'File uploaded',
				'Session refreshed'
			];
			
			const logInterval = setInterval(() => {
				logData.push({
					id: logCounter++,
					message: messages[Math.floor(Math.random() * messages.length)],
					time: Date.now()
				});
				logModeList.appendData();
				
				if (logCounter >= 50) {
					clearInterval(logInterval);
				}
			}, 800);
		
			element.show = () => {
				console.log('List demo visible');
			};
		
			element.hide = () => {
				clearInterval(logInterval);
				console.log('List demo hidden');
			};
	}
});

nui.registerPage('addons/media-player', {
	html: 'addons/media-player.html',
	init(element, params, nui) {
		element.addEventListener('nui-action-demo-media', (e) => {
		        const target = element.querySelector('#prog-player-target');
		        if (!target) return;
		        
		        if (e.detail.param === 'createVideo') {
		            target.innerHTML = '';
		            target.style.display = 'block';
		            
		            nui.components.mediaPlayer.create(target, {
		                url: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
		                type: 'video',
		                poster: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/Sintel.jpg',
		                attributes: {
		                    loop: true
		                },
		                playerAttributes: {
		                    style: 'width: 100%; aspect-ratio: 16/9; display: block;'
		                }
		            });
		        }
		        else if (e.detail.param === 'createAudio') {
		            target.innerHTML = '';
		            target.style.display = 'block';
		
		            nui.components.mediaPlayer.create(target, {
		                url: 'https://herrbasan.com/files/AlmostFinished/herrbasan_Baer.mp3',
		                type: 'audio',
		                attributes: {
		                    loop: true
		                },
		                playerAttributes: {
		                    style: 'width: 100%; display: block;'
		                }
		            });
		        }
		    });
	}
});

nui.registerPage('addons/menu', {
	html: 'addons/menu.html',
	init(element, params, nui) {
		// Load the menu addon module
			import('../../NUI/lib/modules/nui-menu.js').then(() => {
				// Basic menu data
				const basicMenuData = {
				items: [
					{
						label: 'File',
						items: [
							{ label: 'New File', action: 'new-file', shortcut: 'Ctrl+N' },
							{ label: 'Open...', action: 'open', shortcut: 'Ctrl+O' },
							{ type: 'separator' },
							{ label: 'Save', action: 'save', shortcut: 'Ctrl+S' },
							{ label: 'Save As...', action: 'save-as', shortcut: 'Ctrl+Shift+S' },
							{ type: 'separator' },
							{ label: 'Exit', action: 'exit', shortcut: 'Alt+F4' }
						]
					},
					{
						label: 'Edit',
						items: [
							{ label: 'Undo', action: 'undo', shortcut: 'Ctrl+Z' },
							{ label: 'Redo', action: 'redo', shortcut: 'Ctrl+Y' },
							{ type: 'separator' },
							{ label: 'Cut', action: 'cut', shortcut: 'Ctrl+X' },
							{ label: 'Copy', action: 'copy', shortcut: 'Ctrl+C' },
							{ label: 'Paste', action: 'paste', shortcut: 'Ctrl+V' },
							{ type: 'separator' },
							{ label: 'Find', action: 'find', shortcut: 'Ctrl+F' },
							{ label: 'Replace', action: 'replace', shortcut: 'Ctrl+H' }
						]
					},
					{
						label: 'View',
						items: [
							{ label: 'Zoom In', action: 'zoom-in', shortcut: 'Ctrl+=' },
							{ label: 'Zoom Out', action: 'zoom-out', shortcut: 'Ctrl+-' },
							{ label: 'Reset Zoom', action: 'zoom-reset', shortcut: 'Ctrl+0' },
							{ type: 'separator' },
							{ label: 'Toggle Sidebar', action: 'toggle-sidebar', shortcut: 'Ctrl+B' },
							{ label: 'Toggle Terminal', action: 'toggle-terminal', shortcut: 'Ctrl+`' }
						]
					}
				]
			};
		
			// Nested menu data
			const nestedMenuData = {
				items: [
					{
						label: 'File',
						items: [
							{
								label: 'New...',
								items: [
									{ label: 'Text File', action: 'new-text' },
									{ label: 'HTML File', action: 'new-html' },
									{ label: 'CSS File', action: 'new-css' },
									{ label: 'JavaScript File', action: 'new-js' },
									{ type: 'separator' },
									{ label: 'Folder', action: 'new-folder' }
								]
							},
							{
								label: 'Open Recent',
								items: [
									{ label: 'project-1.html', action: 'open-recent-1' },
									{ label: 'script.js', action: 'open-recent-2' },
									{ label: 'styles.css', action: 'open-recent-3' },
									{ type: 'separator' },
									{ label: 'Clear Recent', action: 'clear-recent' }
								]
							},
							{ type: 'separator' },
							{ label: 'Save', action: 'save', shortcut: 'Ctrl+S' },
							{ label: 'Save All', action: 'save-all', shortcut: 'Ctrl+K S' }
						]
					},
					{
						label: 'Preferences',
						items: [
							{ label: 'Settings', action: 'settings', shortcut: 'Ctrl+,' },
							{
								label: 'Theme',
								items: [
									{ label: 'Light', action: 'theme-light' },
									{ label: 'Dark', action: 'theme-dark' },
									{ label: 'High Contrast', action: 'theme-contrast' },
									{ type: 'separator' },
									{ label: 'Auto (System)', action: 'theme-auto' }
								]
							},
							{
								label: 'Color Scheme',
								items: [
									{ label: 'Default', action: 'color-default' },
									{ label: 'Monokai', action: 'color-monokai' },
									{ label: 'Solarized', action: 'color-solarized' },
									{ label: 'Dracula', action: 'color-dracula' }
								]
							},
							{ type: 'separator' },
							{ label: 'Keyboard Shortcuts', action: 'shortcuts', disabled: true }
						]
					},
					{
						label: 'Help',
						items: [
							{ label: 'Documentation', action: 'docs' },
							{ label: 'Keyboard Shortcuts', action: 'help-shortcuts' },
							{ type: 'separator' },
							{ label: 'About', action: 'about' }
						]
					}
				]
			};
		
			// Load menus
			const basicMenu = element.querySelector('#basic-menu');
			const nestedMenu = element.querySelector('#nested-menu');
			
			if (basicMenu && basicMenu.loadData) {
				basicMenu.loadData(basicMenuData);
			}
			
			if (nestedMenu && nestedMenu.loadData) {
				nestedMenu.loadData(nestedMenuData);
			}
			}).catch(err => {
				console.error('Failed to load nui-menu module:', err);
			});
	}
});

nui.registerPage('addons/rich-text', {
	html: 'addons/rich-text.html',
	async init(element, params, nui) {
		// We ensure NUI is ready and dynamically load the JS and CSS for the module if not already loaded by the page lifecycle
		        const loadDependencies = async () => {
		            if (!customElements.get('nui-rich-text')) {
		                const link = document.createElement('link');
		                link.rel = 'stylesheet';
		                link.href = '../NUI/css/modules/nui-rich-text.css';
		                document.head.appendChild(link);
		
		                await import('../../NUI/lib/modules/nui-rich-text.js');
		            }
		            if (!customElements.get('nui-list')) {
		                const linkList = document.createElement('link');
		                linkList.rel = 'stylesheet';
		                linkList.href = '../NUI/css/modules/nui-list.css';
		                document.head.appendChild(linkList);
		
		                await import('../../NUI/lib/modules/nui-list.js');
		            }
		        };
		
		        const outputArea = element.querySelector('#output-area');
		        const editor1 = element.querySelector('#editor1');
		        const editor2 = element.querySelector('#editor2');
		        
		        let currentEditor = null; // Track which editor triggered it
		        let selectedItemData = null;
		let selectedItems = []; // Moved to init scope for hide() access
		        loadDependencies().catch(console.error);
		
		        // Generate mock image data
		        const imageData = [];
		        for(let i=1; i<=118; i++) {
		            const pad = i.toString().padStart(3, '0');
		            imageData.push({
		                id: pad,
		                url_160: `images/Random_Picts/160p/${pad}.webp`,
		                url_1080: `images/Random_Picts/1080p/${pad}.webp`,
		                url_orig: `images/Random_Picts/Original/${pad}.webp`
		            });
		        }
		
		        function renderListItem(item) {
		            const el = document.createElement('div');
		            el.className = 'demo-img-list-item';
		            el.tabIndex = 0;
		            el.innerHTML = `
		                <img class="demo-img-list-thumb" alt="Image ${item.id}" />
		                <div>
		                    <p class="demo-img-list-title">Image ${item.id}</p>
		                    <p class="demo-img-list-meta">Random Nature Collection</p>
		                </div>
		            `;
		            
		            const img = el.querySelector('img');
		            
		            el.update = () => {
		                if (item._imageLoaded) {
		                    img.src = item.url_160;
		                    return;
		                }
		                
		                img.src = item.url_160;
		                img.onload = () => {
		                    item._imageLoaded = true;
		                    el.update = null; // Clean up so bounds tracking doesn't refire
		                };
		            };
		            
		            return el;
		        }
		
		        element.addEventListener('nui-image-upload', (e) => {
		            const file = e.detail.file;
		            const editor = e.target;
		            
		            // In a real app, you would upload to a server and get a URL back.
		            // For this demo, we read the File as a data URL to show that the event fired successfully.
		            const reader = new FileReader();
		            reader.onload = (event) => {
		                editor.insertImage(event.target.result, file.name || 'Pasted Image');
		            };
		            reader.readAsDataURL(file);
		        });
		
		        element.addEventListener('nui-image-request', async (e) => {
		            e.preventDefault(); // Stop default generic prompt
		            const currentEditor = e.target;
		
		            const container = document.createElement('div');
		            container.style.cssText = 'flex: 1; min-height: 0; display: flex; flex-direction: column;';
		            
		            const listStyles = document.createElement('style');
		            listStyles.textContent = `
		                .demo-img-list-item { display: flex; align-items: center; gap: var(--nui-space); padding: var(--nui-space-half) var(--nui-space); border-bottom: 1px solid var(--border-shade1); cursor: pointer; transition: background-color var(--transition-fast); }
		                .demo-img-list-item:hover { background-color: var(--color-shade1); }
		                .demo-img-list-item.selected { background-color: var(--color-highlight-dim); border-left: 4px solid var(--color-primary); color: white; }
		                .demo-img-list-item.selected .demo-img-list-meta { color: rgba(255, 255, 255, 0.8); }
		                .demo-img-list-item.selected:hover { background-color: var(--color-highlight); }
		                .demo-img-list-thumb { width: 112px; height: 63px; object-fit: cover; border-radius: var(--border-radius1); border: 1px solid var(--border-shade1); background-color: var(--color-shade2); }
		                .demo-img-list-meta { display: flex; flex-direction: column; gap: 4px; color: var(--color-text-dim); font-size: var(--font-size-small); }
		                .demo-img-list-title { color: var(--color-text); font-weight: 500; font-size: var(--font-size-normal); }
		                .demo-img-list-item.selected .demo-img-list-title { color: white; }
		            `;
		
		            const listWrapper = document.createElement('div');
		            listWrapper.style.cssText = 'flex: 1; min-height: 0; position: relative;';
		
		            const listElement = document.createElement('nui-list');
		            listElement.style.cssText = '--nui-list-item-height: 75px; flex: 1; height: 100%;';
		            listWrapper.appendChild(listElement);
		
		            container.appendChild(listStyles);
		            container.appendChild(listWrapper);
		
		            const nuiApi = window.nui || nui;
		            const { dialog, main, result } = await nuiApi.components.dialog.page("Select an Image", container, {
		                contentScroll: false,
		                buttons: [
		                    { label: "Cancel", type: "outline", value: "cancel" },
		                    { label: "Insert Image", type: "primary", value: "insert" }
		                ]
		            });
		            dialog.style.cssText = '--space-page-maxwidth: 600px;';
		
		            const confirmBtn = dialog.querySelector('button[data-value="insert"]');
		            if (confirmBtn) confirmBtn.disabled = true;
		            
		            selectedItems = [];
		            function onListEvents(ev) {
		                if (ev.type === 'selection') {
		                    const selected = listElement.getSelection ? listElement.getSelection(true) : [];
		                    if (selected && selected.length > 0) {
		                        selectedItems = selected.map(item => item.data);
		                        if (confirmBtn) {
		                            confirmBtn.disabled = false;
		                            confirmBtn.textContent = `Insert Image (${selected.length} Selected)`;
		                        }
		                    } else {
		                        selectedItems = [];
		                        if (confirmBtn) {
		                            confirmBtn.disabled = true;
		                            confirmBtn.textContent = 'Insert Image';
		                        }
		                    }
		                }
		            }
		
		            customElements.whenDefined('nui-list').then(() => {
		                setTimeout(() => { // ensure dialog layout metrics are computed
		                    listElement.loadData({
		                        multiple: true,
		                        data: imageData,
		                        render: renderListItem,
		                        events: onListEvents,
		                        search: [{ prop: 'id' }],
		                        idField: 'id'
		                    });
		                }, 10);
		            });
		
		            // Wait for user interaction from the dialog's result promise
		            const action = await result;
		            if (action === 'insert' && selectedItems.length > 0) {
		                for (const item of selectedItems) {
		                    currentEditor.insertImage(item.url_1080, "Placeholder Image " + item.id);
		                }
		            }
		        });
		
		        // Add proper cleanup
		        element.hide = () => {
		             selectedItems = [];
		        };
		
		        // --- Demo Input/Output Logic ---
		        element.addEventListener('nui-action-set-html', (e) => {
		            const targetEditor = e.detail.target;
		            if (targetEditor) {
		                targetEditor.setValue(`<h2>Inserted HTML</h2><p>This was added programmatically at <strong>${new Date().toLocaleTimeString()}</strong>.</p>`);
		                if (outputArea) {
		                    outputArea.textContent = 'Loaded new HTML into editor.';
		                }
		            }
		        });
		
		        element.addEventListener('nui-action-set-markdown', (e) => {
		            const targetEditor = e.detail.target;
		            if (targetEditor) {
		                targetEditor.setMarkdown(`## Inserted Markdown\n\nThis was parsed from markdown programmatically at **${new Date().toLocaleTimeString()}**.\n\n* List item 1\n* List item 2\n\n\`\`\`javascript\nconsole.log("Hello from Markdown");\n\`\`\``);
		                if (outputArea) {
		                    outputArea.textContent = 'Loaded parsed Markdown into editor.';
		                }
		            }
		        });
		
		        element.addEventListener('nui-action-get-html', (e) => {
		            const targetEditor = e.detail.target;
		            if (targetEditor && outputArea) {
		                // Escape HTML for display
		                const html = targetEditor.value;
		                outputArea.textContent = html;
		            }
		        });
		        
		        element.addEventListener('nui-action-get-markdown', (e) => {
		            const targetEditor = e.detail.target;
		            if (targetEditor && outputArea) {
		                outputArea.textContent = targetEditor.markdown;
		            }
		        });
		
		        loadDependencies().catch(console.error);
	}
});

nui.registerPage('addons/wizard', {
	html: 'addons/wizard.html',
	init(element, params, nui) {
		/* ── Status Visual Reference ── */
					const wStatus = element.el('#wizard-status-demo');
					const statusOut = element.el('#status-demo-output');
		
					function bindStatusBtn(id, stepIdx, status, msg) {
						element.el(id).addEventListener('click', () => {
							wStatus.steps[stepIdx].setStatus(status, msg);
							statusOut.textContent = `Step ${stepIdx + 1} status set to "${status}"` + (msg ? `: ${msg}` : '');
						});
					}
		
					bindStatusBtn('#btn-set-valid', 0, 'valid', 'Account verified');
					bindStatusBtn('#btn-set-invalid', 1, 'invalid', 'Details incomplete');
					bindStatusBtn('#btn-set-warning', 1, 'warning', 'Partial data saved');
					bindStatusBtn('#btn-set-pending', 2, 'pending', '');
		
					element.el('#btn-clear-status').addEventListener('click', () => {
						wStatus.steps.forEach(s => s.clearStatus());
						statusOut.textContent = 'All statuses cleared.';
					});
		
					/* ── Strategy 1: Native HTML5 ── */
					const wNative = element.el('#wizard-native');
					const nativeOut = element.el('#native-output');
		
					wNative.addEventListener('nui-wizard-step-change', (e) => {
						nativeOut.textContent = `Now on step ${e.detail.current + 1}.`;
						nativeOut.style.color = '';
					});
					wNative.addEventListener('nui-wizard-complete', () => {
						nativeOut.textContent = 'Native validation wizard completed!';
						nativeOut.style.color = 'var(--palette-activate)';
					});
					wNative.addEventListener('nui-wizard-cancel', () => {
						nativeOut.textContent = 'Cancelled.';
						nativeOut.style.color = 'var(--palette-alert)';
					});
		
					/* ── Strategy 2: Custom Sync Validation ── */
					const wSync = element.el('#wizard-sync');
					const syncOut = element.el('#sync-output');
		
					wSync.addEventListener('nui-wizard-before-next', (e) => {
						const step = wSync.steps[e.detail.from];
						if (e.detail.from === 0) {
							const code = step.querySelector('input[name="code"]');
							if (code && code.value.toUpperCase() !== 'NUI') {
								e.preventDefault();
								step.setStatus('invalid', 'Invite code must be "NUI"');
								syncOut.textContent = 'Rejected: wrong invite code.';
								syncOut.style.color = 'var(--palette-alert)';
								return;
							}
							step.setStatus('valid');
						}
						if (e.detail.from === 1) {
							const name = step.querySelector('input[name="name"]');
							if (name && name.value.trim().length < 2) {
								e.preventDefault();
								step.setStatus('invalid', 'Name too short');
								return;
							}
							step.setStatus('valid');
						}
					});
		
					wSync.addEventListener('nui-wizard-step-change', (e) => {
						syncOut.textContent = `Step ${e.detail.current + 1} — custom sync validation active.`;
						syncOut.style.color = '';
					});
					wSync.addEventListener('nui-wizard-complete', () => {
						syncOut.textContent = 'Sync validation wizard completed!';
						syncOut.style.color = 'var(--palette-activate)';
					});
		
					/* ── Strategy 3: Async Server-Side Validation ── */
					const wAsync = element.el('#wizard-async');
					const asyncOut = element.el('#async-output');
		
					function simulateServerCheck(username) {
						return new Promise((resolve, reject) => {
							setTimeout(() => {
								if (username.toLowerCase().startsWith('admin')) {
									reject(new Error('Username is already taken'));
								} else {
									resolve({ available: true });
								}
							}, 1500);
						});
					}
		
					wAsync.addEventListener('nui-wizard-before-next', (e) => {
						const step = wAsync.steps[e.detail.from];
						if (e.detail.from === 0) {
							const username = step.querySelector('input[name="username"]').value.trim();
							if (!username) return;
							step.setStatus('pending');
							e.detail.promise = simulateServerCheck(username)
								.then((result) => {
									step.setStatus('valid');
									asyncOut.textContent = 'Username available!';
									asyncOut.style.color = 'var(--palette-activate)';
									return result;
								})
								.catch((err) => {
									step.setStatus('invalid', err.message);
									asyncOut.textContent = `Server error: ${err.message}`;
									asyncOut.style.color = 'var(--palette-alert)';
									throw err;
								});
						}
						if (e.detail.from === 1) {
							step.setStatus('valid');
						}
					});
		
					wAsync.addEventListener('nui-wizard-validation-error', (e) => {
						asyncOut.textContent = `Validation error on step ${e.detail.step + 1}: ${e.detail.message}`;
						asyncOut.style.color = 'var(--palette-alert)';
					});
		
					wAsync.addEventListener('nui-wizard-step-change', (e) => {
						asyncOut.textContent = `Step ${e.detail.current + 1} — async validation on step 1.`;
						asyncOut.style.color = '';
					});
					wAsync.addEventListener('nui-wizard-complete', () => {
						asyncOut.textContent = 'Async validation wizard completed!';
						asyncOut.style.color = 'var(--palette-activate)';
					});
		
					/* ── Strategy 4: Manual Status Control ── */
					const wManual = element.el('#wizard-manual');
					const manualOut = element.el('#manual-output');
					const titleInput = element.el('#manual-title');
		
					titleInput.addEventListener('input', () => {
						const step = wManual.steps[0];
						const len = titleInput.value.length;
						if (len === 0) {
							step.clearStatus();
							manualOut.textContent = 'Cleared.';
						} else if (len < 3) {
							step.setStatus('warning', 'Minimum 3 characters');
							manualOut.textContent = `Too short (${len}/3).`;
						} else if (len > 20) {
							step.setStatus('invalid', 'Too long (max 20)');
							manualOut.textContent = `Too long (${len}/20).`;
						} else {
							step.setStatus('valid');
							manualOut.textContent = `Valid (${len} chars).`;
						}
					});
		
					const priorityBtns = element.els('.priority-btn');
					const priorityResult = element.el('#manual-priority-result');
					priorityBtns.forEach(btn => {
						btn.addEventListener('click', () => {
							const val = btn.getAttribute('data-value');
							const step = wManual.steps[1];
							if (val === 'high') {
								step.setStatus('warning', 'High priority selected');
								priorityResult.textContent = 'High priority — marked with warning.';
							} else {
								step.setStatus('valid', `"${val}" priority set`);
								priorityResult.textContent = `"${val}" priority selected.`;
							}
						});
					});
		
					wManual.addEventListener('nui-wizard-complete', () => {
						manualOut.textContent = 'Manual control wizard completed!';
						manualOut.style.color = 'var(--palette-activate)';
					});
		
					/* ── Dialog Wizard ── */
					const wDialog = element.el('#wizard-dialog-inner');
					const dialogOut = element.el('#dialog-output');
					const dialog = element.el('#wizard-dialog');
		
					wDialog.addEventListener('nui-wizard-complete', () => {
						dialogOut.textContent = 'Dialog wizard completed!';
						dialogOut.style.color = 'var(--palette-activate)';
						dialog.el('dialog').close();
					});
					wDialog.addEventListener('nui-wizard-cancel', () => {
						dialogOut.textContent = 'Dialog wizard cancelled.';
						dialogOut.style.color = 'var(--palette-alert)';
						dialog.el('dialog').close();
					});
	}
});

// ── Documentation ──

nui.registerPage('documentation/cheatsheet', {
	html: 'documentation/cheatsheet.html',
	async init(element, params, nui) {
		// ===== Icons Section =====
			const iconGrid = element.querySelector('#icon-grid');
			const iconSearch = element.querySelector('#icon-search');
			const iconEmpty = element.querySelector('#icon-empty');
			
			let icons = [];
			try {
				icons = await nui.components.icon.getAvailable();
			} catch (err) {
				console.warn('[cheatsheet] Failed to load icons dynamically');
				icons = [];
			}
			
			function renderIcons(filter = '') {
				const filtered = icons.filter(name => name.toLowerCase().includes(filter.toLowerCase()));
				
				if (filtered.length === 0) {
					iconGrid.innerHTML = '';
					iconEmpty.hidden = false;
					return;
				}
				
				iconEmpty.hidden = true;
				iconGrid.innerHTML = filtered.map(name => `
					<div class="cheatsheet-icon" data-icon="${name}" title="Click to copy: ${name}">
						<nui-icon name="${name}"></nui-icon>
						<span>${name}</span>
					</div>
				`).join('');
				
				iconGrid.querySelectorAll('.cheatsheet-icon').forEach(el => {
					el.addEventListener('click', () => {
						const name = el.dataset.icon;
						navigator.clipboard.writeText(name).then(() => {
							el.classList.add('copied');
							setTimeout(() => el.classList.remove('copied'), 1000);
						});
					});
				});
			}
			
			renderIcons();
			iconSearch.addEventListener('input', (e) => renderIcons(e.target.value));
			
			// ===== CSS Variables Section =====
			const cssVarGrid = element.querySelector('#css-var-grid');
			const cssVarSearch = element.querySelector('#css-var-search');
			const cssVarEmpty = element.querySelector('#css-var-empty');
			
			// Get computed CSS variables from :root
			function getCssVariables() {
				const vars = [];
				const rootStyles = getComputedStyle(document.documentElement);
				
				// Iterate through all custom properties
				for (let i = 0; i < rootStyles.length; i++) {
					const prop = rootStyles[i];
					if (prop.startsWith('--')) {
						const value = rootStyles.getPropertyValue(prop).trim();
						vars.push({ name: prop, value });
					}
				}
				
				return vars.sort((a, b) => a.name.localeCompare(b.name));
			}
			
			const cssVars = getCssVariables();
			
			function isColorVar(name, value) {
				// Check if variable name or value suggests it's a color
				const colorPatterns = ['color', 'shade', 'highlight', 'accent', 'text-', 'bg-', 'border-', 'shadow', 'palette'];
				const isColorName = colorPatterns.some(p => name.includes(p));
				const isColorValue = value.match(/^(rgb|rgba|hsl|hsla|#[0-9a-f]{3,8}|light-dark)/i);
				return isColorName || isColorValue;
			}
			
			function isSizeVar(name, value) {
				// Check if value is a size (rem, px, em, %)
				return value.match(/^[\d.]+(rem|px|em|%|vh|vw|ch|ex)$/);
			}
			
			function renderCssVars(filter = '') {
				let filtered = cssVars.filter(v => v.name.toLowerCase().includes(filter.toLowerCase()));
				
				if (filtered.length === 0) {
					cssVarGrid.innerHTML = '';
					cssVarEmpty.hidden = false;
					return;
				}
				
				cssVarEmpty.hidden = true;
				
				cssVarGrid.innerHTML = filtered.map(v => {
					const isColor = isColorVar(v.name, v.value);
					const isSize = isSizeVar(v.name, v.value);
					
					let preview = '';
					if (isColor) {
						preview = `<div class="var-preview" style="background: var(${v.name});"></div>`;
					} else if (isSize && v.name.includes('space')) {
						preview = `<div class="spacing-visual" style="width: var(${v.name}); height: 24px;"></div>`;
					} else if (v.name.includes('radius')) {
						preview = `<div class="var-preview" style="border-radius: var(${v.name}); background: var(--color-shade2);"></div>`;
					} else if (v.name.includes('border') && !v.name.includes('radius') && !v.name.includes('color')) {
						preview = `<div class="var-preview" style="border: var(${v.name}) solid var(--color-highlight);"></div>`;
					} else {
						preview = `<div class="var-preview" style="background: var(--color-shade2); display: flex; align-items: center; justify-content: center; font-size: 10px;">CSS</div>`;
					}
					
					return `
						<div class="var-item" data-var="${v.name}" title="Click to copy: ${v.name}">
							${preview}
							<code>${v.name}</code>
							<span class="var-value" title="${v.value}">${v.value.length > 40 ? v.value.substring(0, 40) + '...' : v.value}</span>
						</div>
					`;
				}).join('');
				
				// Add click handlers
				cssVarGrid.querySelectorAll('.var-item').forEach(el => {
					el.addEventListener('click', () => {
						const name = el.dataset.var;
						navigator.clipboard.writeText(`var(${name})`).then(() => {
							el.classList.add('copied');
							setTimeout(() => el.classList.remove('copied'), 1000);
						});
					});
				});
			}
			
			renderCssVars();
			cssVarSearch.addEventListener('input', (e) => renderCssVars(e.target.value));
	}
});

nui.registerPage('documentation/declarative-actions', {
	html: 'documentation/declarative-actions.html',
	init(element, params, nui) {
		// We can listen on the page element itself since events bubble up
			element.addEventListener('nui-action', (e) => {
				const { name, target, param } = e.detail;
		
				if (name === 'demo-update') {
					target.textContent = 'Updated at ' + new Date().toLocaleTimeString();
					target.style.backgroundColor = 'var(--color-highlight-dim)';
					target.style.color = 'white';
					
					setTimeout(() => {
						target.style.backgroundColor = 'var(--color-shade2)';
						target.style.color = 'inherit';
					}, 1000);
				}
		
				if (name === 'demo-select') {
					const display = element.querySelector('#demo-param-display');
					display.textContent = param;
				}
			});
		
			// Component Delegation Demo
			const card = element.querySelector('#task-card');
			const status = element.querySelector('#task-status');
			const log = element.querySelector('#task-log');
		
			if (card) {
				card.addEventListener('nui-action', (e) => {
					e.stopPropagation();
					const { name } = e.detail;
					
					log.textContent = `Log: Action "${name}" triggered`;
					
					switch(name) {
						case 'approve':
							status.textContent = 'Approved';
							status.style.backgroundColor = 'var(--palette-activate)';
							status.style.color = 'white';
							break;
						case 'reject':
							status.textContent = 'Rejected';
							status.style.backgroundColor = 'var(--palette-alert)';
							status.style.color = 'white';
							break;
						case 'delete':
							card.style.opacity = '0.5';
							card.style.pointerEvents = 'none';
							log.textContent = 'Log: Task deleted';
							break;
					}
				});
			}
	}
});

nui.registerPage('documentation/experiments/html-standards', {
	html: 'documentation/experiments/html-standards.html',
	init(element, params, nui) {
		const c = element.querySelector('#math-canvas');
		                            if(!c) return;
		                            const ctx = c.getContext('2d');
		                            let t = 0;
		                            let animId;
		
		                            function draw() {
		                                if (!c.isConnected) {
		                                    cancelAnimationFrame(animId);
		                                    return;
		                                }
		                                // Fade out existing content to transparent
		                                ctx.globalCompositeOperation = 'destination-out';
		                                ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
		                                ctx.fillRect(0, 0, c.width, c.height);
		                                ctx.globalCompositeOperation = 'source-over';
		
		                                ctx.beginPath();
		                                for(let i=0; i<c.width; i+=2) {
		                                    const y = c.height/2 + Math.sin(i*0.03 + t)*30 + Math.sin(i*0.02 - t*1.5)*20;
		                                    if(i===0) ctx.moveTo(i,y); else ctx.lineTo(i,y);
		                                }
		                                ctx.strokeStyle = `hsl(${t*20}, 70%, 50%)`;
		                                ctx.lineWidth = 2;
		                                ctx.stroke();
		                                t += 0.05;
		                                animId = requestAnimationFrame(draw);
		                            }
		                            draw();
	}
});

// ── Experiments ──

nui.registerPage('experiments/html-standards', {
	html: 'experiments/html-standards.html',
	init(element, params, nui) {
		const c = element.querySelector('#math-canvas');
		                            if(!c) return;
		                            const ctx = c.getContext('2d');
		                            let t = 0;
		                            let animId;
		
		                            function draw() {
		                                if (!c.isConnected) {
		                                    cancelAnimationFrame(animId);
		                                    return;
		                                }
		                                // Fade out existing content to transparent
		                                ctx.globalCompositeOperation = 'destination-out';
		                                ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
		                                ctx.fillRect(0, 0, c.width, c.height);
		                                ctx.globalCompositeOperation = 'source-over';
		
		                                ctx.beginPath();
		                                for(let i=0; i<c.width; i+=2) {
		                                    const y = c.height/2 + Math.sin(i*0.03 + t)*30 + Math.sin(i*0.02 - t*1.5)*20;
		                                    if(i===0) ctx.moveTo(i,y); else ctx.lineTo(i,y);
		                                }
		                                ctx.strokeStyle = `hsl(${t*20}, 70%, 50%)`;
		                                ctx.lineWidth = 2;
		                                ctx.stroke();
		                                t += 0.05;
		                                animId = requestAnimationFrame(draw);
		                            }
		                            draw();
	}
});

