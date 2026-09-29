// Auto-generated page registrations — all Playground page logic
// Pattern: nui.registerPage('route', { html: 'pages/route.html', init(element, params, nui) { ... } })
// Generated on 2026-05-20

import { nui } from '../../NUI/nui.js';
import { initBlocksEditor } from './blocks-editor.js';
import { runFormatRoundtrip } from '../../NUI/lib/modules/nui-format-roundtrip.js';
import * as jsonModel from '../../NUI/lib/modules/nui-json-model.js';
import { setupJsonGrid } from '../../NUI/lib/modules/nui-json-grid.js';

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

nui.registerPage('components/notifications', {
	html: 'components/notifications.html',
	init(element, params, nui) {
		let feedTimer = null;
		let feedCounter = 0;
		const statusEl = element.querySelector('[data-feed-status]');

		const stopFeed = () => {
			if (feedTimer) {
				clearInterval(feedTimer);
				feedTimer = null;
			}
			// The source retracts an entry it previously pushed — same id.
			nui.components.notifications.remove('srv-countdown');
			statusEl.textContent = 'Feed stopped.';
		};

		element.addEventListener('nui-action', (e) => {
			const { name, param } = e.detail;

			switch (name) {
				case 'demo-notify':
					if (param === 'info') {
						nui.notify({ content: 'Report exported to <strong>/exports/report.pdf</strong>' });
					} else if (param === 'banner') {
						nui.notify({ content: 'Settings saved (with banner echo)', banner: true, autoClose: 3000 });
					} else if (param === 'alert') {
						nui.notify({ content: 'Build failed: 3 errors in <code>src/bundle.js</code>', priority: 'alert' });
					} else if (param === 'action') {
						nui.notify({ content: 'Open the Badge demo page', action: 'demo-link' });
					}
					break;

				case 'demo-link':
					window.location.hash = '#page=components/badge';
					break;

				case 'demo-feed':
					if (param === 'start' && !feedTimer) {
						feedCounter = 0;
						statusEl.textContent = 'Feed running …';
						feedTimer = setInterval(() => {
							feedCounter++;
							nui.components.notifications.notify({
								id: `srv-${feedCounter}`,
								content: `Server event #${feedCounter}: job finished`,
								timestamp: Date.now()
							});
							// One long-lived entry, updated in place (same id → replace)
							nui.components.notifications.notify({
								id: 'srv-countdown',
								content: `Batch processing: <strong>${60 - feedCounter}s</strong> remaining — updates without duplicating`,
								timestamp: Date.now()
							});
						}, 3000);
					} else if (param === 'stop') {
						stopFeed();
					}
					break;
			}
		});

		// Pages are cached — a running interval must not survive the page being hidden.
		element.hide = () => stopFeed();
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
										<nui-input-group>
											<label>Notifications</label>
											<nui-checkbox variant="switch">
												<input type="checkbox" name="notifications" checked>
											</nui-checkbox>
										</nui-input-group>
										<nui-input-group>
											<label>Beta features</label>
											<nui-checkbox variant="switch">
												<input type="checkbox" name="beta">
											</nui-checkbox>
										</nui-input-group>
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
									const switchOn = (name) => !!main.querySelector(`input[name="${name}"]`)?.checked;
									const notifications = switchOn('notifications');
									const beta = switchOn('beta');
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
					rowAction: { action: 'demo-section-edit:content', icon: 'info', label: 'Section info' },
					items: [
						{ label: 'Content', rowAction: { action: 'demo-item-edit:content', icon: 'info', label: 'Item info' } },
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
					headerAction: 'demo-legacy-action',
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

			// Row actions: an unhandled data-action dispatches nui-action on the button.
			// The two registered ones below handle their own names, so only the legacy
			// `headerAction` alias reaches this listener.
			element.addEventListener('nui-action', (e) => {
				const { name, param } = e.detail;
				if (!String(name).startsWith('demo-')) return;
				const display = element.querySelector('#row-action-display');
				if (display) display.textContent = `Row action: ${name}${param ? ' (' + param + ')' : ''}`;
			});

			// A row action is an icon-only control, so it carries a tooltip rather than a label
			// (that is the documented use for nui-tooltip). Built AFTER loadData, because a
			// procedurally created target needs its tooltip injected adjacent to it — the
			// tooltip host is position:fixed, so it adds nothing to the row's flex layout.
			function attachRowTooltips(listEl) {
				if (!listEl) return;
				listEl.querySelectorAll('button.action').forEach(btn => {
					if (btn.nextElementSibling?.tagName === 'NUI-TOOLTIP') return;
					const row = btn.closest('li');
					const name = (row?.querySelector('button.group-toggle span, a span')?.textContent || '').trim();
					const tooltip = document.createElement('nui-tooltip');
					tooltip.textContent = name ? `${btn.getAttribute('aria-label')} — ${name}` : btn.getAttribute('aria-label');
					btn.after(tooltip);
				});
			}

			attachRowTooltips(demoFold);
			attachRowTooltips(demoTree);

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
						// Simulate 1.5s API delay, then map the API's own shape to the
						// { value, label } contract — loadOptions hands this array straight
						// to setItems(), which rejects items without a `value`.
						await new Promise(resolve => setTimeout(resolve, 1500));
						const rows = [
							{ id: 'model-a', name: 'Model Alpha' },
							{ id: 'model-b', name: 'Model Beta' },
							{ id: 'model-g', name: 'Model Gamma' },
							{ id: 'model-d', name: 'Model Delta' }
						];
						return rows.map(r => ({ value: r.id, label: r.name }));
					});
		
					if (error) {
						alert('Failed to load: ' + error.message);
					}
					// loadOptions already replaced the options with the returned array, and the
					// prompt comes from the select's own `placeholder` attribute — so there is no
					// prompt row to inject here. Injecting { value: '', label: 'Select a model...' }
					// put the prompt text in the list as an ordinary selectable row, where it is
					// indistinguishable from a real none-choice.
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

nui.registerPage('components/popover', {
	html: 'components/popover.html',
	init(element, params, nui) {
		const panel = element.querySelector('nui-popover');
		const log = element.querySelector('[data-popover-log]');

		element.querySelectorAll('nui-popover nui-select').forEach((sel) => sel.setItems([
			{ value: 'square', label: 'Square (1:1)' },
			{ value: 'wide', label: 'Wide (16:9)' },
			{ value: 'banner', label: 'Banner (16:5)' },
			{ value: 'strip', label: 'Strip (16:3)' }
		]));

		// Both events fire for every path in and out — invoker click, light dismiss,
		// Escape, or one of the buttons below — because the component emits them from the
		// platform's own `toggle` event rather than from its own show/hide calls.
		panel.addEventListener('nui-popover-open', () => { log.textContent = 'nui-popover-open'; });
		panel.addEventListener('nui-popover-close', () => { log.textContent = 'nui-popover-close'; });

		element.querySelectorAll('[data-popover-call]').forEach((btn) => {
			btn.addEventListener('click', () => panel[btn.dataset.popoverCall]());
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

nui.registerPage('addons/graph', {
	html: 'addons/graph.html',
	async init(element, params, nui) {
		await import('../../NUI/lib/modules/nui-graph.js');

		const liveGraph = element.querySelector('#live-stream-graph');
		const valBadge = element.querySelector('#stream-value-badge');
		const toggleBtn = element.querySelector('#btn-stream-toggle button') || element.querySelector('#btn-stream-toggle');
		const spikeBtn = element.querySelector('#btn-stream-spike button') || element.querySelector('#btn-stream-spike');

		let currentVal = 40;
		let isRunning = true;
		let timer = null;

		// Seed initial history
		const initial = [];
		for (let i = 0; i < 60; i++) {
			currentVal += (Math.random() - 0.48) * 6;
			currentVal = Math.max(10, Math.min(90, currentVal));
			initial.push(Math.round(currentVal));
		}
		if (liveGraph && liveGraph.draw) {
			liveGraph.draw(initial);
		}

		function tick() {
			if (!liveGraph || !liveGraph.push) return;
			currentVal += (Math.random() - 0.48) * 8;
			currentVal = Math.max(5, Math.min(95, currentVal));
			const rounded = Math.round(currentVal);
			liveGraph.push(rounded);
			if (valBadge) valBadge.textContent = `Value: ${rounded}%`;
		}

		function startStream() {
			if (timer) clearInterval(timer);
			timer = setInterval(tick, 200);
			isRunning = true;
			if (toggleBtn) toggleBtn.textContent = 'Pause Stream';
		}

		function stopStream() {
			if (timer) clearInterval(timer);
			timer = null;
			isRunning = false;
			if (toggleBtn) toggleBtn.textContent = 'Resume Stream';
		}

		toggleBtn?.addEventListener('click', () => {
			if (isRunning) stopStream();
			else startStream();
		});

		spikeBtn?.addEventListener('click', () => {
			if (!liveGraph || !liveGraph.push) return;
			currentVal = Math.min(100, currentVal + 40);
			liveGraph.push(currentVal);
			if (valBadge) valBadge.textContent = `Value: ${Math.round(currentVal)}%`;
		});

		startStream();

		// ── Section 3: Adaptive Hybrid Scale Demo Setup ──
		const rawScaleGraph = element.querySelector('#graph-raw-scale');
		const adaptScaleGraph = element.querySelector('#graph-adaptive-scale');
		const ceilingBadge = element.querySelector('#adaptive-ceiling-badge');
		const btnSimIdle = element.querySelector('#btn-sim-idle');
		const btnSimBurst = element.querySelector('#btn-sim-burst');

		function feedIdle() {
			const idleData = [];
			for (let i = 0; i < 40; i++) {
				idleData.push(+(0.1 + Math.random() * 0.25).toFixed(2));
			}
			rawScaleGraph?.draw(idleData);
			adaptScaleGraph?.draw(idleData);
			if (ceilingBadge && adaptScaleGraph) {
				requestAnimationFrame(() => {
					ceilingBadge.textContent = `Ceiling: ${adaptScaleGraph.ceiling} MB/s (Floor-max active)`;
				});
			}
		}

		function feedBurst() {
			const burstData = [];
			for (let i = 0; i < 40; i++) {
				if (i > 18 && i < 26) {
					burstData.push(+(28 + Math.random() * 12).toFixed(1));
				} else {
					burstData.push(+(0.2 + Math.random() * 0.3).toFixed(2));
				}
			}
			rawScaleGraph?.draw(burstData);
			adaptScaleGraph?.draw(burstData);
			if (ceilingBadge && adaptScaleGraph) {
				requestAnimationFrame(() => {
					ceilingBadge.textContent = `Ceiling: ${adaptScaleGraph.ceiling} MB/s (Ladder snapped to 50)`;
				});
			}
		}

		btnSimIdle?.addEventListener('click', feedIdle);
		btnSimBurst?.addEventListener('click', feedBurst);
		feedIdle();

		// ── Section 4: Time Scrubbing Demo Setup ──
		const scrubGraph = element.querySelector('#graph-scrubbing-demo');
		if (scrubGraph) {
			const historyData = [];
			let baseVal = 25;
			for (let i = 0; i < 120; i++) {
				if (i > 35 && i < 48) {
					// Historical spike 15-18 mins ago
					historyData.push(Math.round(85 + Math.random() * 45));
				} else {
					baseVal += (Math.random() - 0.5) * 4;
					baseVal = Math.max(15, Math.min(38, baseVal));
					historyData.push(Math.round(baseVal));
				}
			}
			scrubGraph.draw(historyData);
		}

		// ── Section 5: Smooth Streaming (opt-in `smooth`) Demo Setup ──
		const plainGraph = element.querySelector('#graph-plain-stream');
		const smoothGraph = element.querySelector('#graph-smooth-stream');
		const smoothBadge = element.querySelector('#smooth-value-badge');
		const smoothToggleBtn = element.querySelector('#btn-smooth-toggle button') || element.querySelector('#btn-smooth-toggle');

		let smoothVal = 45;
		let smoothRunning = true;
		let smoothTimer = null;

		const smoothSeed = [];
		for (let i = 0; i < 60; i++) {
			smoothVal += (Math.random() - 0.48) * 6;
			smoothVal = Math.max(10, Math.min(90, smoothVal));
			smoothSeed.push(Math.round(smoothVal));
		}
		plainGraph?.draw(smoothSeed.slice());
		smoothGraph?.draw(smoothSeed.slice());

		function smoothTick() {
			if (!smoothGraph || !smoothGraph.push) return;
			smoothVal += (Math.random() - 0.48) * 8;
			smoothVal = Math.max(5, Math.min(95, smoothVal));
			const rounded = Math.round(smoothVal);
			plainGraph?.push(rounded);
			smoothGraph?.push(rounded);
			if (smoothBadge) smoothBadge.textContent = `Value: ${rounded}%`;
		}

		function startSmoothStream() {
			if (smoothTimer) clearInterval(smoothTimer);
			smoothTimer = setInterval(smoothTick, 200);
			smoothRunning = true;
			if (smoothToggleBtn) smoothToggleBtn.textContent = 'Pause Stream';
		}

		function stopSmoothStream() {
			if (smoothTimer) clearInterval(smoothTimer);
			smoothTimer = null;
			smoothRunning = false;
			if (smoothToggleBtn) smoothToggleBtn.textContent = 'Resume Stream';
		}

		smoothToggleBtn?.addEventListener('click', () => {
			if (smoothRunning) stopSmoothStream();
			else startSmoothStream();
		});

		startSmoothStream();

		// Lifecycle hooks
		element.hide = () => {
			stopStream();
			stopSmoothStream();
		};

		element.show = () => {
			if (!isRunning) startStream();
			if (!smoothRunning) startSmoothStream();
		};
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

nui.registerPage('addons/file-icon', {
	html: 'addons/file-icon.html',
	async init(element, params, nui) {
		if (customElements.get('nui-file-icon')) return;

		const link = document.createElement('link');
		link.rel = 'stylesheet';
		link.href = '../NUI/css/modules/nui-file-icon.css';
		document.head.appendChild(link);

		await import('../../NUI/lib/modules/nui-file-icon.js');
	}
});

nui.registerPage('addons/file-list', {
	html: 'addons/file-list.html',
	async init(element, params, nui) {
		// nui-file-list renders nui-file-icon in every row, so its addon comes first.
		if (!customElements.get('nui-file-icon')) {
			const iconLink = document.createElement('link');
			iconLink.rel = 'stylesheet';
			iconLink.href = '../NUI/css/modules/nui-file-icon.css';
			document.head.appendChild(iconLink);
			await import('../../NUI/lib/modules/nui-file-icon.js');
		}

		if (!customElements.get('nui-file-list')) {
			const listLink = document.createElement('link');
			listLink.rel = 'stylesheet';
			listLink.href = '../NUI/css/modules/nui-file-list.css';
			document.head.appendChild(listLink);
			await import('../../NUI/lib/modules/nui-file-list.js');
		}

		const log = element.querySelector('#file-list-log');
		const logEvent = (name, file) => {
			log.textContent = `${name}  ${file}\n` + log.textContent.split('\n').slice(0, 7).join('\n');
		};

		const basic = element.querySelector('#file-list-basic');
		basic.loadData([
			{ name: 'release-notes.md', size: 18432, url: '#' },
			{ name: 'quarterly-report.pdf', size: 1843200, url: '#' },
			{ name: 'brand/logo.svg', size: 5120 }
		], { actions: ['download', 'remove'] });
		basic.addEventListener('nui-file-action', e => logEvent('nui-file-action', `${e.detail.action} ${e.detail.file.name}`));
		// The demo refuses the built-in download — otherwise clicking one would
		// save a file. This is also the documented way to handle it yourself.
		basic.addEventListener('nui-file-download', e => e.preventDefault());

		const staging = element.querySelector('#file-list-staging');
		staging.loadData([
			{ name: 'presentation.pptx', size: 5242880, status: 'uploading' },
			{ name: 'interview.mp4', size: 128974848, status: 'queued' },
			{ name: 'avatar.png', size: 40960, status: 'done' },
			{ name: 'corrupt.zip', size: 2048, status: 'failed' }
		], { actions: ['remove'] });
		staging.addEventListener('nui-file-action', e => logEvent('nui-file-action', `${e.detail.action} ${e.detail.file.name}`));

		const sortable = element.querySelector('#file-list-sortable');
		sortable.loadData([
			{ name: '01-introduction.md', size: 3200 },
			{ name: '02-methods.md', size: 8100 },
			{ name: '03-results.md', size: 6400 },
			{ name: '04-appendix.md', size: 2100 }
		], { actions: ['remove'], sortable: true });
		sortable.addEventListener('nui-file-reorder', e => logEvent('nui-file-reorder', e.detail.files.map(f => f.name).join(' → ')));
		sortable.addEventListener('nui-file-action', e => logEvent('nui-file-action', `${e.detail.action} ${e.detail.file.name}`));
	}
});

nui.registerPage('addons/file-tree', {
	html: 'addons/file-tree.html',
	async init(element, params, nui) {
		if (!customElements.get('nui-file-tree')) {
			const link = document.createElement('link');
			link.rel = 'stylesheet';
			link.href = '../NUI/css/modules/nui-file-tree.css';
			document.head.appendChild(link);

			await import('../../NUI/lib/modules/nui-file-tree.js');
		}

		// Optional context-menu integration
		let contextMenuFn = null;
		try {
			if (!customElements.get('nui-context-menu')) {
				const menuCss = document.createElement('link');
				menuCss.rel = 'stylesheet';
				menuCss.href = '../NUI/css/modules/nui-context-menu.css';
				document.head.appendChild(menuCss);
			}
			const menuMod = await import('../../NUI/lib/modules/nui-context-menu.js');
			contextMenuFn = menuMod.contextMenu || menuMod.default;
		} catch (err) {
			console.warn('nui-file-tree: context-menu addon could not be preloaded', err);
		}

		const eventLog = element.querySelector('#event-log');
		const logEvent = (name, detail) => {
			const entry = detail?.entry ? `${detail.entry.kind} ${detail.entry.path}` : (detail?.error || '');
			eventLog.textContent = `${name}  ${entry}\n` + eventLog.textContent.split('\n').slice(0, 11).join('\n');
		};

		// Static tree via loadData with VS Code-like rich workspace structure
		const staticTree = element.querySelector('#tree-static');
		const statusText = element.querySelector('#tree-status-text');

		staticTree.loadData({
			name: 'nui_wc2', kind: 'dir', children: [
				{ name: 'documentation', kind: 'dir', children: [
					{ name: 'components', kind: 'dir', children: [
						{ name: 'button.md', kind: 'file', size: '3.4 KB' },
						{ name: 'dialog.md', kind: 'file', size: '5.1 KB' },
						{ name: 'markdown.md', kind: 'file', size: '2.8 KB' }
					]},
					{ name: 'guides', kind: 'dir', children: [
						{ name: 'getting-started.md', kind: 'file', size: '6.2 KB' },
						{ name: 'introduction.md', kind: 'file', size: '4.0 KB' }
					]},
					{ name: 'components.json', kind: 'file', size: '14.2 KB' }
				]},
				{ name: 'NUI', kind: 'dir', children: [
					{ name: 'css', kind: 'dir', children: [
						{ name: 'nui-theme.css', kind: 'file', size: '22 KB' },
						{ name: 'modules', kind: 'dir', children: [
							{ name: 'nui-file-tree.css', kind: 'file', badge: 'M', badgeType: 'modified', size: '6.1 KB' },
							{ name: 'nui-context-menu.css', kind: 'file', size: '3.2 KB' }
						]}
					]},
					{ name: 'lib', kind: 'dir', children: [
						{ name: 'modules', kind: 'dir', children: [
							{ name: 'nui-file-tree.js', kind: 'file', badge: 'M', badgeType: 'modified', size: '12.4 KB' },
							{ name: 'nui-context-menu.js', kind: 'file', size: '5.8 KB' }
						]}
					]},
					{ name: 'nui.js', kind: 'file', badge: 'M', badgeType: 'modified', size: '185 KB' },
					{ name: 'nui.d.ts', kind: 'file', size: '42 KB' }
				]},
				{ name: 'assets', kind: 'dir', children: [
					{ name: 'logo.svg', kind: 'file', size: '1.8 KB' },
					{ name: 'screenshot.png', kind: 'file', size: '240 KB' }
				]},
				{ name: 'Playground', kind: 'dir', children: [
					{ name: 'index.html', kind: 'file', badge: 'M', badgeType: 'modified', size: '18 KB' },
					{ name: 'js', kind: 'dir', children: [
						{ name: 'main.js', kind: 'file', size: '11 KB' },
						{ name: 'page-init.js', kind: 'file', badge: 'U', badgeType: 'added', size: '64 KB' }
					]}
				]},
				{ name: 'empty-dir', kind: 'dir', children: [] },
				{ name: '.gitignore', kind: 'file', size: '180 B' },
				{ name: 'package.json', kind: 'file', size: '1.2 KB' },
				{ name: 'LLM-CHEATSHEET.md', kind: 'file', size: '28 KB' },
				{ name: 'README.md', kind: 'file', size: '8.5 KB' },
				{ name: 'LICENSE', kind: 'file', size: '1.1 KB' }
			]
		});

		// VS Code Toolbar: Collapse All & Expand All
		const btnCollapse = element.querySelector('#btn-collapse-all');
		if (btnCollapse) btnCollapse.addEventListener('click', () => staticTree.collapseAll());

		const btnExpand = element.querySelector('#btn-expand-all');
		if (btnExpand) btnExpand.addEventListener('click', () => staticTree.expandAll(3));

		const btnRefresh = element.querySelector('#btn-refresh');
		if (btnRefresh) btnRefresh.addEventListener('click', () => staticTree.refresh());

		// VS Code Toolbar: Filter / Search toggle
		const btnSearch = element.querySelector('#btn-toggle-search');
		const filterBar = element.querySelector('#tree-filter-bar');
		const filterInput = element.querySelector('#tree-filter-input');
		const filterCount = element.querySelector('#tree-filter-count');

		if (btnSearch && filterBar && filterInput) {
			btnSearch.addEventListener('click', () => {
				filterBar.hidden = !filterBar.hidden;
				if (!filterBar.hidden) {
					filterInput.focus();
					filterInput.select();
				} else {
					filterInput.value = '';
					staticTree.filter = null;
					if (filterCount) filterCount.textContent = '';
				}
			});

			filterInput.addEventListener('input', () => {
				const val = filterInput.value.trim();
				staticTree.filter = val || null;
				if (val) {
					const count = staticTree.querySelectorAll('.nui-file-tree-row').length;
					if (filterCount) filterCount.textContent = `${count} match${count === 1 ? '' : 'es'}`;
				} else {
					if (filterCount) filterCount.textContent = '';
				}
			});

			filterInput.addEventListener('keydown', (e) => {
				if (e.key === 'Escape') {
					filterBar.hidden = true;
					filterInput.value = '';
					staticTree.filter = null;
					if (filterCount) filterCount.textContent = '';
					staticTree.focus();
				}
			});
		}

		// Action handlers
		element.addEventListener('nui-action-toggle-filter', (e) => {
			const tree = e.detail.target;
			tree.filter = tree.filter ? null : ['.md'];
			e.target.querySelector('button').textContent = tree.filter ? 'Filter: off' : 'Filter: .md only';
		});

		element.addEventListener('nui-action-select-readme', (e) => {
			staticTree.select('nui_wc2/README.md');
		});

		element.addEventListener('nui-action-toggle-density', (e) => {
			const tree = e.detail.target;
			const isCompact = tree.density === 'compact';
			tree.density = isCompact ? 'cozy' : 'compact';
			const btn = element.querySelector('#btn-toggle-density');
			if (btn) btn.textContent = isCompact ? 'Density: Compact' : 'Density: Cozy';
			if (statusText) statusText.textContent = `Density set to: ${tree.density}`;
		});

		element.addEventListener('nui-action-toggle-open-mode', (e) => {
			const tree = e.detail.target;
			const isDbl = tree.openMode === 'doubleClick';
			tree.openMode = isDbl ? 'singleClick' : 'doubleClick';
			const btn = element.querySelector('#btn-toggle-open-mode');
			if (btn) btn.textContent = isDbl ? 'Open Mode: Double-Click' : 'Open Mode: Single-Click';
			if (statusText) statusText.textContent = `Open Mode set to: ${tree.openMode}`;
		});

		element.addEventListener('nui-action-refresh', (e) => {
			e.detail.target.refresh();
		});

		// Selection and status bar
		staticTree.addEventListener('nui-file-select', (e) => {
			const entry = e.detail?.entry;
			if (entry && statusText) {
				const meta = entry.size ? ` (${entry.size})` : '';
				statusText.textContent = `${entry.kind.toUpperCase()}: ${entry.path}${meta}`;
			}
		});

		// Context Menu Integration
		staticTree.addEventListener('nui-file-context', (e) => {
			const { entry, x, y } = e.detail;
			if (!contextMenuFn) return;
			const isDir = entry.kind === 'dir';

			const items = isDir ? [
				{ label: 'Expand / Collapse', action: 'toggle', icon: 'folder_open' },
				{ label: 'New File...', action: 'new-file', icon: 'article' },
				{ label: 'New Folder...', action: 'new-folder', icon: 'folder' },
				{ type: 'separator' },
				{ label: 'Copy Path', action: 'copy-path', icon: 'content_copy' },
				{ label: 'Refresh Folder', action: 'refresh', icon: 'sync' }
			] : [
				{ label: 'Open File', action: 'open', icon: 'description' },
				{ label: 'Copy Path', action: 'copy-path', icon: 'content_copy' },
				{ label: 'Reveal in Explorer', action: 'reveal', icon: 'visibility' },
				{ type: 'separator' },
				{ label: 'Rename', action: 'rename', icon: 'edit' },
				{ label: 'Delete', action: 'delete', icon: 'delete' }
			];

			const menu = contextMenuFn(items, {
				onAction: (action) => {
					logEvent(`context-menu:${action}`, { entry });
					if (action === 'toggle') staticTree.toggle(entry.path);
					if (action === 'open') staticTree.dispatchEvent(new CustomEvent('nui-file-activate', { detail: { entry }, bubbles: true }));
					if (action === 'copy-path') {
						navigator.clipboard?.writeText(entry.path);
						if (statusText) statusText.textContent = `Copied: ${entry.path}`;
					}
					if (action === 'refresh') staticTree.refresh(entry.path);
				}
			});
			menu.show(x, y);
		});

		// Async lazy-loading provider demo (works everywhere on static hosts)
		const mockFileSystem = {
			'root': [
				{ name: 'src', path: 'root/src', kind: 'dir' },
				{ name: 'packages', path: 'root/packages', kind: 'dir' },
				{ name: 'public', path: 'root/public', kind: 'dir' },
				{ name: 'tests', path: 'root/tests', kind: 'dir' },
				{ name: 'package.json', path: 'root/package.json', kind: 'file', size: '1.4 KB' },
				{ name: 'tsconfig.json', path: 'root/tsconfig.json', kind: 'file', size: '420 B' },
				{ name: 'README.md', path: 'root/README.md', kind: 'file', size: '3.1 KB' }
			],
			'root/src': [
				{ name: 'components', path: 'root/src/components', kind: 'dir' },
				{ name: 'services', path: 'root/src/services', kind: 'dir' },
				{ name: 'index.ts', path: 'root/src/index.ts', kind: 'file', size: '1.2 KB', badge: 'M', badgeType: 'modified' },
				{ name: 'app.css', path: 'root/src/app.css', kind: 'file', size: '4.8 KB' }
			],
			'root/src/components': [
				{ name: 'Tree.tsx', path: 'root/src/components/Tree.tsx', kind: 'file', size: '8.4 KB' },
				{ name: 'Toolbar.tsx', path: 'root/src/components/Toolbar.tsx', kind: 'file', size: '3.2 KB' },
				{ name: 'Caret.tsx', path: 'root/src/components/Caret.tsx', kind: 'file', size: '1.1 KB' }
			],
			'root/src/services': [
				{ name: 'api.ts', path: 'root/src/services/api.ts', kind: 'file', size: '2.5 KB' },
				{ name: 'storage.ts', path: 'root/src/services/storage.ts', kind: 'file', size: '3.9 KB' }
			],
			'root/packages': [
				{ name: 'core', path: 'root/packages/core', kind: 'dir' },
				{ name: 'cli', path: 'root/packages/cli', kind: 'dir' }
			],
			'root/packages/core': [
				{ name: 'index.js', path: 'root/packages/core/index.js', kind: 'file', size: '14.2 KB' },
				{ name: 'package.json', path: 'root/packages/core/package.json', kind: 'file', size: '890 B' }
			],
			'root/packages/cli': [
				{ name: 'bin.js', path: 'root/packages/cli/bin.js', kind: 'file', size: '4.1 KB' }
			],
			'root/public': [
				{ name: 'favicon.ico', path: 'root/public/favicon.ico', kind: 'file', size: '1.2 KB' },
				{ name: 'manifest.json', path: 'root/public/manifest.json', kind: 'file', size: '340 B' }
			],
			'root/tests': [
				{ name: 'tree.test.ts', path: 'root/tests/tree.test.ts', kind: 'file', size: '6.5 KB' }
			]
		};

		const connectAsyncProvider = async (tree) => {
			// Simulated remote async provider with network latency
			const asyncProvider = async (path) => {
				await new Promise(resolve => setTimeout(resolve, 250)); // simulate network delay
				return mockFileSystem[path] || [];
			};

			tree.setProvider(asyncProvider);
			await tree.setRoot({ name: 'repository', path: 'root' });
			element.querySelector('#live-label').textContent = 'Async provider connected (click folders to lazy-load)';
			const liveTitle = element.querySelector('#live-tree-title');
			if (liveTitle) liveTitle.textContent = 'REPOSITORY (ASYNC LAZY)';
		};

		element.addEventListener('nui-action-connect-provider', (e) => {
			connectAsyncProvider(e.detail.target);
		});

		const liveTree = element.querySelector('#tree-live');
		const btnLiveCollapse = element.querySelector('#btn-live-collapse');
		if (btnLiveCollapse) btnLiveCollapse.addEventListener('click', () => liveTree.collapseAll());
		const btnLiveRefresh = element.querySelector('#btn-live-refresh');
		if (btnLiveRefresh) btnLiveRefresh.addEventListener('click', () => liveTree.refresh());

		for (const tree of element.querySelectorAll('nui-file-tree')) {
			tree.addEventListener('nui-file-select', (e) => logEvent('nui-file-select', e.detail));
			tree.addEventListener('nui-file-activate', (e) => logEvent('nui-file-activate', e.detail));
			tree.addEventListener('nui-file-context', (e) => logEvent('nui-file-context', e.detail));
			tree.addEventListener('nui-tree-error', (e) => logEvent('nui-tree-error', e.detail));
		}
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

nui.registerPage('addons/slides', {
	html: 'addons/slides.html',
	init(element, params, nui) {
		const deck = element.querySelector('#demo-deck');
		if (!deck) return;

		element.addEventListener('nui-action', (e) => {
			const { name } = e.detail;
			if (name === 'slides-prev') deck.prev();
			else if (name === 'slides-next') deck.next();
			else if (name === 'slides-fullscreen') deck.toggleFullscreen();
		});
	}
});

nui.registerPage('experiments/json-grid', {
	html: 'experiments/json-grid.html',
	init(element, params, nui) {
		const host = element.querySelector('#grid');
		const out = element.querySelector('#text-out');
		const log = element.querySelector('#log');

		if (!document.querySelector('link[data-json-grid-css]')) {
			const link = document.createElement('link');
			link.rel = 'stylesheet';
			link.href = '../NUI/css/modules/nui-json-grid.css';
			link.dataset.jsonGridCss = '';
			document.head.append(link);
		}

		const YAML_SAMPLE = [
			'product: JSON Toolkit',
			'version: 2.4.0',
			'private: false',
			'stars: 4096',
			'tags:',
			'  - formatter',
			'  - viewer',
			'  - converter',
			'maintainer:',
			'  name: Ada Lovelace',
			'  email: ada@jsontoolkit.io',
			'  verified: true',
			'features:',
			'  - id: 1',
			'    name: Beautify',
			'    enabled: true',
			'  - id: 2',
			'    name: Minify',
			'    enabled: false',
			'release:',
			'  date: 2026-05-01',
			'  notes: null',
			'  downloads: 1284903',
			'',
		].join('\n');

		const JSON_SAMPLE = JSON.stringify({
			product: 'JSON Toolkit',
			version: '2.4.0',
			private: false,
			stars: 4096,
			tags: ['formatter', 'viewer', 'converter'],
			maintainer: { name: 'Ada Lovelace', email: 'ada@jsontoolkit.io', verified: true },
			features: [
				{ id: 1, name: 'Beautify', enabled: true },
				{ id: 2, name: 'Minify', enabled: false },
			],
			release: { date: '2026-05-01', notes: null, downloads: 1284903 },
		}, null, 2);

		// A document nested far past the default collapse depth. It is the whole
		// argument for depth being a view concern: this opens shallow and stays
		// navigable, and drilling is one click per level.
		//
		// The first key must have NO value: `root: deep` followed by an indented
		// key is content indented under nothing that claims it, and the reader
		// refuses the document for it — which is correct, and was how the first
		// attempt at this sample was rejected.
		const DEEP_SAMPLE = (() => {
			const lines = ['root:'];
			for (let level = 1; level <= 12; level++) lines.push(`${'  '.repeat(level)}level${level}:`);
			lines.push(`${'  '.repeat(13)}leaf: bottom`);
			return lines.join('\n') + '\n';
		})();

		const grid = setupJsonGrid(host, { text: YAML_SAMPLE, format: 'yaml' });

		function show(text) { out.textContent = text; }
		function say(message, isError = false) {
			log.textContent = message;
			log.style.color = isError ? 'var(--color-highlight)' : '';
		}
		show(grid.text);

		// A refusal is a MESSAGE. The grid deliberately does not colour itself —
		// the accent is not a state colour — so the words land somewhere.
		host.addEventListener('nui-error', (e) => say(`Refused — ${e.detail.message}`, true));
		host.addEventListener('nui-say', (e) => say(e.detail.message));
		host.addEventListener('nui-say-error', (e) => say(e.detail.message, true));
		host.addEventListener('nui-change', (e) => {
			show(e.detail.text);
			say(`${e.detail.label} · ${e.detail.format}`);
		});

		// Keyed by PARAM, not by the whole data-action string. `grid:refuse` is
		// name `grid`, param `refuse`, and detail.param carries only the verb.
		const actions = {
			'load-yaml': () => { grid.load(YAML_SAMPLE, 'yaml'); },
			'load-json': () => { grid.load(JSON_SAMPLE, 'json'); },
			'load-deep': () => { grid.load(DEEP_SAMPLE, 'yaml'); },
			'add-property': () => grid.addSibling(''),
			'change-type': () => grid.commit('stars → boolean', (d) => jsonModel.setAt(d, ['stars'], d.stars !== 0)),
			refuse: () => {
				// The context-sensitive menu will offer this; the point is that the
				// offer REFUSES rather than quietly discarding a map.
				const verdict = jsonModel.convertTo(grid.structure.maintainer, 'string');
				say(verdict.ok ? 'unexpectedly allowed' : `Refused — ${verdict.reason}`, !verdict.ok);
			},
			undo: () => {
				const before = grid.text;
				host.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }));
				say(grid.text === before ? 'Nothing to undo' : 'Undo');
			},
			redo: () => {
				host.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, shiftKey: true, bubbles: true }));
				say('Redo');
			},
		};

		element.addEventListener('nui-action-grid', (e) => {
			const run = actions[e.detail.param];
			if (!run) { say(`No handler for "${e.detail.param}"`, true); return; }
			run();
		});

		element.show = () => show(grid.text);
		element.hide = () => { /* the grid is the page's; nothing global to release */ };
	}
});

nui.registerPage('experiments/json-model', {
	html: 'experiments/json-model.html',
	init(element, params, nui) {
		const out = element.querySelector('#out');
		const summary = element.querySelector('#summary');
		const model = jsonModel;

		const YAML_DOC = [
			'product: JSON Toolkit',
			'version: 2.4.0',
			'private: false',
			'stars: 4096',
			'tags:',
			'  - formatter',
			'  - viewer',
			'maintainer:',
			'  name: Ada Lovelace',
			'  verified: true',
			'features:',
			'  - id: 1',
			'    name: Beautify',
			'    enabled: true',
			'',
		].join('\n');

		/** Each case: [name, fn] — throws means the assertion failed. */
		const cases = [
			['pointer: escape and parse', () => {
				const p = model.toPointer(['a/b', 'c~d']);
				if (p !== '/a~1b/c~0d') throw new Error(`expected /a~1b/c~0d, got ${p}`);
				if (model.parsePointer(p).join('|') !== 'a/b|c~d') throw new Error('did not survive the round trip');
			}],
			['pointer: empty is the root', () => {
				if (model.toPointer([]) !== '') throw new Error('empty path must render as ""');
				if (model.parsePointer('').length !== 0) throw new Error('"" must parse to the root');
			}],
			['pointer: rejects a non-pointer', () => {
				let threw = false;
				try { model.parsePointer('features/0'); } catch { threw = true; }
				if (!threw) throw new Error('"features/0" is not a JSON Pointer and must be rejected');
			}],

			['write: set a value end to end', () => {
				const r = model.applyEdit({
					text: YAML_DOC, formatId: 'yaml', label: 'set stars',
					mutate: (d) => model.setAt(d, ['stars'], 5000),
				});
				if (r.structure.stars !== 5000) throw new Error('structure did not change');
				if (!r.text.includes('stars: 5000')) throw new Error('text did not change');
			}],
			['write: rename keeps position', () => {
				const before = model.openDocument(YAML_DOC, 'yaml').structure;
				const r = model.applyEdit({
					text: YAML_DOC, formatId: 'yaml', label: 'rename',
					mutate: (d) => model.renameKey(d, ['maintainer', 'name'], 'owner'),
				});
				const keys = Object.keys(r.structure.maintainer);
				if (keys[0] !== 'owner') throw new Error(`rename moved the key: ${keys.join(', ')}`);
				if (Object.keys(before.maintainer).length !== keys.length) throw new Error('rename changed the key count');
			}],
			['write: rename refuses a collision', () => {
				let threw = false;
				try {
					model.applyEdit({
						text: YAML_DOC, formatId: 'yaml',
						mutate: (d) => model.renameKey(d, ['version'], 'product'),
					});
				} catch { threw = true; }
				if (!threw) throw new Error('renaming onto an existing key must be refused');
			}],
			['write: remove from an array', () => {
				const r = model.applyEdit({
					text: YAML_DOC, formatId: 'yaml', label: 'remove tag',
					mutate: (d) => model.removeAt(d, ['tags', 1]),
				});
				if (r.structure.tags.length !== 1 || r.structure.tags[0] !== 'formatter') throw new Error('wrong entry removed');
			}],
			['write: insert into an array', () => {
				const r = model.applyEdit({
					text: YAML_DOC, formatId: 'yaml', label: 'insert tag',
					mutate: (d) => model.insertAt(d, ['tags', 1], 'converter'),
				});
				if (r.structure.tags.join(',') !== 'formatter,converter,viewer') throw new Error(r.structure.tags.join(','));
			}],
			['write: add a new property', () => {
				const r = model.applyEdit({
					text: YAML_DOC, formatId: 'yaml', label: 'add property',
					mutate: (d) => model.insertAt(d, ['licence'], 'MIT'),
				});
				if (r.structure.licence !== 'MIT') throw new Error('property not added');
			}],
			['write: add a colliding property is refused', () => {
				let threw = false;
				try {
					model.applyEdit({ text: YAML_DOC, formatId: 'yaml', mutate: (d) => model.insertAt(d, ['stars'], 1) });
				} catch { threw = true; }
				if (!threw) throw new Error('inserting an existing key must be refused');
			}],
			['write: move an array entry', () => {
				const r = model.applyEdit({
					text: YAML_DOC, formatId: 'yaml', label: 'move',
					mutate: (d) => model.moveAt(d, ['tags', 0], 1),
				});
				if (r.structure.tags.join(',') !== 'viewer,formatter') throw new Error(r.structure.tags.join(','));
			}],

			['refuse: a rejected edit leaves the text untouched', () => {
				const before = YAML_DOC;
				try {
					model.applyEdit({
						text: before, formatId: 'yaml', label: 'bad',
						mutate: (d) => ({ ...d, gone: undefined }),
					});
				} catch { /* expected */ }
				// The document object is untouched because applyEdit never writes.
				const after = model.openDocument(before, 'yaml');
				if (after.text !== before) throw new Error('text changed on a refused edit');
			}],
			['refuse: a bare scalar is refused in BOTH formats, for different reasons', () => {
				// The same input fails two different checks, and pretending otherwise
				// would be a lie about what the reader did:
				//   JSON  — parses to the string "hello", so assertEditableRoot refuses
				//           it. The reader understood the file perfectly.
				//   YAML  — the reader does NOT understand "hello"; it discards it and
				//           yields {}, which is a perfectly valid empty map. So it is
				//           caught as TRUNCATION, with a line number, before the root
				//           check is ever reached.
				let jsonReason = null;
				try { model.openDocument('"hello"', 'json'); } catch (e) { jsonReason = e.message; }
				if (!jsonReason) throw new Error('json: a bare scalar root must be refused');
				if (!/map or a sequence/i.test(jsonReason)) throw new Error(`json: expected the root reason, got "${jsonReason}"`);

				let yamlReason = null, line = null;
				try { model.openDocument('hello', 'yaml'); } catch (e) { yamlReason = e.message; line = /line (\d+)/.exec(e.message)?.[1]; }
				if (!yamlReason) throw new Error('yaml: a bare scalar root must be refused');
				if (line !== '1') throw new Error(`yaml: expected a truncation at line 1, got ${line} from "${yamlReason}"`);
			}],
			['refuse: a truncated YAML parse is caught, WITH a line number', () => {
				// A block scalar is outside the subset. The reader used to return
				// half a document silently — and the fixed-point check passed it,
				// because an empty document IS a stable fixed point.
				let reason = null, line = null;
				try { model.openDocument('a: 1\nb: |\n  line one\n  line two\n', 'yaml'); }
				catch (e) { reason = e.message; line = /line (\d+)/.exec(e.message)?.[1]; }
				if (!reason) throw new Error('an unsupported construct must be refused, not truncated');
				if (line !== '3') throw new Error(`expected the reader to point at line 3, got ${line} from "${reason}"`);
			}],
			['refuse: a valid document reports no skipped lines', () => {
				const report = nui.util.parseYamlReport(YAML_DOC);
				if (report.skipped.length || report.leftover.length) {
					throw new Error(`a valid document was flagged: skipped=${report.skipped} leftover=${report.leftover.length}`);
				}
			}],
			['refuse: JSON reports a position', () => {
				let message = null;
				try { model.openDocument('{"a": 1,}', 'json'); } catch (e) { message = e.message; }
				if (!message) throw new Error('malformed JSON must throw');
			}],

			['json: the same edits work identically', () => {
				const doc = '{"stars":4096,"tags":["a","b"]}';
				const r = model.applyEdit({ text: doc, formatId: 'json', label: 'json edit', mutate: (d) => model.setAt(d, ['stars'], 7) });
				if (r.structure.stars !== 7) throw new Error('json structure wrong');
				if (!r.text.includes('"stars": 7')) throw new Error(`json text wrong: ${r.text}`);
			}],
			['json: format capability is not editor capability', () => {
				// JSON genuinely round-trips a scalar root — that is why it is not in
				// the YAML accepted-gap list. It is still not OPENABLE, because the
				// grid has no layout for a bare value. Two different limits, and
				// conflating them is how "supported" claims go wrong.
				const report = nui.util;
				if (JSON.stringify(report.parseYaml ? JSON.parse('"hello"') : null) !== '"hello"') {
					throw new Error('precondition: JSON does represent a scalar root');
				}
				let refused = false;
				try { model.openDocument('"hello"', 'json'); } catch { refused = true; }
				if (!refused) throw new Error('the grid must refuse a root it cannot render');
			}],

			['types: scalar conversions', () => {
				if (model.convertTo('42', 'number').value !== 42) throw new Error('string→number');
				if (model.convertTo(0, 'boolean').value !== false) throw new Error('number→boolean');
				if (model.convertTo(true, 'number').value !== 1) throw new Error('boolean→number');
				if (model.convertTo(7, 'string').value !== '7') throw new Error('number→string');
			}],
			['types: a refusal is a refusal', () => {
				const r = model.convertTo({ a: 1 }, 'string');
				if (r.ok) throw new Error('converting a NON-EMPTY map to a string must be refused');
				if (!/discard/i.test(r.reason)) throw new Error(`reason should say data is discarded, got: ${r.reason}`);
			}],
			['types: an EMPTY container converts freely', () => {
				// The add-then-retype flow depends on this: a new value inherits its
				// neighbour's type, and inheriting "object" must not lock it there.
				// An empty container holds nothing, so refusing would be theatre.
				if (!model.convertTo({}, 'number').ok) throw new Error('empty object -> number must be allowed');
				if (model.convertTo({}, 'string').value !== '') throw new Error('empty object -> string');
				if (model.convertTo([], 'object').value === null) throw new Error('empty array -> object');
				if (!model.convertTo([], 'boolean').ok) throw new Error('empty array -> boolean');
			}],
			['types: "abc" is not a number', () => {
				if (model.convertTo('abc', 'number').ok) throw new Error('NaN must be refused');
			}],
			['types: null becomes an empty value of any type', () => {
				if (model.convertTo(null, 'string').value !== '') throw new Error('null→string');
				if (model.convertTo(null, 'object').value === null) throw new Error('null→object');
			}],
			['add: a new key continues the document\'s own numbering', () => {
				// "id1, id2" invites "id3", not "id1_2". A name that looks machine-made
				// in a file a human will read is a small, permanent cost.
				if (model.inferNewKey(['id1', 'id2']) !== 'id3') throw new Error('continues the sequence');
				if (model.inferNewKey(['id2', 'id1', 'id9']) !== 'id10') throw new Error('must not collide even when unordered');
				if (model.inferNewKey(['id01', 'id02']) !== 'id03') throw new Error('keeps the zero padding');
				if (model.inferNewKey(['title']) !== 'newKey') throw new Error('falls back when there is no pattern');
				if (model.inferNewKey(['newKey', 'newKey2']) !== 'newKey3') throw new Error('never collides with its own output');
				if (model.inferNewKey([]) !== 'newKey') throw new Error('empty container');
			}],
			['add: a new value inherits the PREVIOUS sibling\'s type, literally', () => {
				if (model.inferNewValueType({ a: 1, b: 'x' }) !== 'string') throw new Error('previous is a string');
				if (model.inferNewValueType({ a: 'x', b: 7 }) !== 'number') throw new Error('previous is a number');
				if (model.inferNewValueType([1, 2, true]) !== 'boolean') throw new Error('array previous');
				// LITERAL, even when that is awkward: a container previous gives a
				// container. Substituting a "friendlier" type would be a surprise,
				// and the inherited type is a default, not a lock.
				if (model.inferNewValueType({ a: 1, b: { c: 1 } }) !== 'object') throw new Error('a container previous stays a container');
				if (model.inferNewValueType({}) !== 'string') throw new Error('nothing to inherit from');
			}],
			['add: the starting value for a type', () => {
				if (model.defaultValueFor('string') !== '') throw new Error('string');
				if (model.defaultValueFor('number') !== 0) throw new Error('number');
				if (model.defaultValueFor('boolean') !== false) throw new Error('boolean');
				if (JSON.stringify(model.defaultValueFor('object')) !== '{}') throw new Error('object');
				if (JSON.stringify(model.defaultValueFor('array')) !== '[]') throw new Error('array');
			}],
			['types: column inference reads TYPE, not shape', () => {
				if (model.inferColumnType([1, 2, 3]) !== 'number') throw new Error('numbers');
				if (model.inferColumnType(['x', null, 'y']) !== 'string') throw new Error('nulls are ignored');
				if (model.inferColumnType([null, null]) !== 'string') throw new Error('all null falls back to string');
				// "mixed" means the TYPES differ, not that the shapes do. Two maps
				// with different keys are still two maps: a new entry in that column
				// should be a map, and the type picker is what needs this answer.
				if (model.inferColumnType([{ a: 1 }, { b: 2 }]) !== 'object') throw new Error('differing shapes are still objects');
				if (model.inferColumnType([1, 'a', true]) !== 'mixed') throw new Error('differing types is mixed');
			}],

			['undo: restores previous text', () => {
				const h = model.createHistory(YAML_DOC);
				const r = model.applyEdit({ text: YAML_DOC, formatId: 'yaml', mutate: (d) => model.setAt(d, ['stars'], 1) });
				h.push(r.text);
				if (!h.canUndo()) throw new Error('should be able to undo');
				if (h.undo() !== YAML_DOC) throw new Error('undo did not restore the original text');
				if (!h.canRedo()) throw new Error('should be able to redo');
				if (h.redo() !== r.text) throw new Error('redo did not restore the edit');
			}],
			['undo: typing in one cell is one step', () => {
				const h = model.createHistory('a');
				h.push('ab', '/name', 600, 0);
				h.push('abc', '/name', 600, 200);
				h.push('abcd', '/name', 600, 400);
				h.undo();
				if (h.current() !== 'a') throw new Error(`three keystrokes should be one undo step, got ${JSON.stringify(h.current())}`);
			}],
			['undo: a different cell starts a new step', () => {
				const h = model.createHistory('a');
				h.push('ab', '/name', 600, 0);
				h.push('ac', '/other', 600, 200);
				h.undo();
				if (h.current() !== 'ab') throw new Error('editing a different cell must be its own step');
			}],
			['undo: a new edit clears the redo stack', () => {
				const h = model.createHistory('a');
				h.push('b'); h.undo();
				if (!h.canRedo()) throw new Error('precondition');
				h.push('c');
				if (h.canRedo()) throw new Error('redo must be unavailable after a new edit');
			}],
		];

		function run() {
			const results = cases.map(([name, fn]) => {
				try { fn(); return { name, ok: true }; }
				catch (e) { return { name, ok: false, err: String(e && e.message || e) }; }
			});
			const failed = results.filter(r => !r.ok);
			summary.textContent = failed.length
				? `${failed.length} of ${results.length} FAILING`
				: `${results.length}/${results.length} passing`;
			summary.dataset.state = failed.length ? 'fail' : 'pass';

			out.replaceChildren(...results.filter(r => !r.ok).map(r => {
				const row = document.createElement('div');
				row.className = 'rt-row';
				row.dataset.ok = 'false';
				const name = document.createElement('code');
				name.className = 'rt-name';
				name.textContent = r.name;
				const err = document.createElement('pre');
				err.className = 'rt-val';
				err.textContent = r.err;
				row.append(name, err);
				return row;
			}));
			return results;
		}

		const onRun = () => run();
		element.addEventListener('nui-action-jsonmodel', onRun);
		element.show = () => run();
		element.hide = () => element.removeEventListener('nui-action-jsonmodel', onRun);
	}
});

nui.registerPage('experiments/format-roundtrip', {
	html: 'experiments/format-roundtrip.html',
	init(element, params, nui) {
		const out = element.querySelector('#out');
		const summary = element.querySelector('#summary');

		function row(result) {
			const tr = document.createElement('div');
			tr.className = 'rt-row';
			tr.dataset.ok = String(result.ok);
			const name = document.createElement('code');
			name.className = 'rt-name';
			name.textContent = result.name + (result.accepted ? '  (accepted gap)' : '');
			tr.append(name);
			if (result.ok) return tr;

			for (const [label, value] of [
				['emitted', result.y],
				['wanted', result.want],
				['parsed', result.got],
				[result.stage === 'parse' ? 'parse error' : 'serialize error', result.err],
			]) {
				if (!value) continue;
				const tag = document.createElement('span');
				tag.className = 'rt-label';
				tag.textContent = label;
				const pre = document.createElement('pre');
				pre.className = 'rt-val';
				pre.textContent = value;
				tr.append(tag, pre);
			}
			return tr;
		}

		function render() {
			const report = runFormatRoundtrip();

			// An accepted gap is a KNOWN limitation, not a regression. Reporting it
			// as FAILING trains the reader to ignore the line that means something,
			// which is exactly how a real regression gets missed.
			const parts = report.map(f => {
				const bits = [`${f.label} ${f.passed}/${f.total - f.accepted.length}`];
				if (f.accepted.length) bits.push(`${f.accepted.length} accepted gap${f.accepted.length > 1 ? 's' : ''}`);
				if (f.failed.length) bits.push(`${f.failed.length} FAILING`);
				return bits.join(' · ');
			});
			const broken = report.some(f => !f.clean);
			summary.textContent = parts.join('   |   ');
			summary.dataset.state = broken ? 'fail' : 'pass';

			out.replaceChildren(...report.flatMap(f => {
				const heading = document.createElement('h3');
				heading.className = 'rt-format';
				heading.textContent = f.label;
				// A clean format lists nothing: there is no failure to describe, and
				// 42 green ticks is noise that buries the one row that matters.
				return [heading, ...(f.clean && !f.accepted.length ? [] : f.results.map(row))];
			}));
		}

		// Unhandled data-action names dispatch a bubbling nui-action-<name> event.
		const onRun = () => render();
		element.addEventListener('nui-action-roundtrip', onRun);
		element.show = () => render();
		element.hide = () => element.removeEventListener('nui-action-roundtrip', onRun);
	}
});

nui.registerPage('experiments/dropped-table-editor', {
	html: 'experiments/dropped-table-editor.html',
	async init(element, params, nui) {
		// Dynamically load CSS and JS if not already loaded
		if (!customElements.get('dropped-table-editor')) {
			const link = document.createElement('link');
			link.rel = 'stylesheet';
			link.href = 'css/dropped-table-editor.css';
			document.head.appendChild(link);

			await import('./dropped-table-editor.js');
		}

		const mainEditor = element.querySelector('#demo-table-main');
		const exportOutput = element.querySelector('#gfm-export-output');
		const logOutput = element.querySelector('#table-log');

		function tableToGfm(table) {
			if (!table) return '';
			const rows = Array.from(table.rows);
			if (rows.length === 0) return '';

			const hasThead = table.tHead && table.tHead.rows.length > 0;
			const headerRow = hasThead ? table.tHead.rows[0] : rows[0];
			const dataRows = hasThead
				? (table.tBodies[0] ? Array.from(table.tBodies[0].rows) : rows.slice(1))
				: rows.slice(1);

			const colCount = Math.max(...rows.map(r => r.cells.length));
			if (colCount === 0) return '';

			function formatCell(cell) {
				if (!cell) return '';
				return cell.textContent.trim().replace(/\|/g, '\\|');
			}

			// Build header
			const headers = [];
			for (let c = 0; c < colCount; c++) {
				headers.push(formatCell(headerRow.cells[c]));
			}

			// Build separators based on data-align
			const separators = [];
			for (let c = 0; c < colCount; c++) {
				const cell = headerRow.cells[c];
				const align = cell ? cell.getAttribute('data-align') : null;
				if (align === 'center') {
					separators.push(':---:');
				} else if (align === 'right') {
					separators.push('---:');
				} else {
					separators.push(':---');
				}
			}

			let gfm = '';
			if (!hasThead) {
				gfm += '<!-- table: no thead (row 1 used as header) -->\n';
			}
			gfm += `| ${headers.join(' | ')} |\n`;
			gfm += `| ${separators.join(' | ')} |\n`;

			for (const row of dataRows) {
				const cells = [];
				for (let c = 0; c < colCount; c++) {
					cells.push(formatCell(row.cells[c]));
				}
				gfm += `| ${cells.join(' | ')} |\n`;
			}

			return gfm.trim();
		}

		function updateExport() {
			const table = mainEditor ? mainEditor.querySelector('table') : null;
			if (exportOutput && table) {
				exportOutput.textContent = tableToGfm(table);
			}
		}

		element.addEventListener('nui-change', (e) => {
			if (e.target.closest('#demo-table-main')) {
				updateExport();
			}
			if (logOutput) {
				const opType = e.detail?.type || 'change';
				logOutput.textContent = `Last action: ${opType} at ${new Date().toLocaleTimeString()}`;
			}
		});

		// Initial export rendering
		updateExport();
	}
});

nui.registerPage('experiments/table-editor', {
	html: 'experiments/table-editor.html',
	async init(element, params, nui) {
		// The dev auto-loader resolves NUI/lib/modules/{tag}.js for addon elements in
		// the DOM, but the stylesheet is a separate concern and is linked explicitly.
		if (!document.querySelector('link[data-table-editor-css]')) {
			const link = document.createElement('link');
			link.rel = 'stylesheet';
			link.href = '../NUI/css/modules/nui-table-editor.css';
			link.dataset.tableEditorCss = '';
			document.head.appendChild(link);
		}
		if (!customElements.get('nui-table-editor')) {
			await import('../../NUI/lib/modules/nui-table-editor.js');
		}
		await customElements.whenDefined('nui-table-editor');

		const gfm = element.querySelector('#te-gfm code');
		const log = element.querySelector('#te-log');

		function renderExport() {
			const editor = element.querySelector('nui-table-editor');
			if (gfm && editor?._editor) gfm.textContent = editor.exportMarkdown();
		}

		element.addEventListener('nui-change', (e) => {
			if (!e.target.closest('nui-table-editor')) return;
			renderExport();
			if (log) {
				log.textContent = `Last change: ${e.detail.type} at ${new Date().toLocaleTimeString()}`;
			}
		});

		// The host-owned table has no wrapper, so it is enhanced explicitly. The
		// in-place entry point is the API a rich-text or block editor would use.
		const hostRegion = element.querySelector('#te-host');
		if (hostRegion) {
			const { setupTableEditor } = await import('../../NUI/lib/modules/nui-table-editor.js');
			for (const table of hostRegion.querySelectorAll('table')) {
				setupTableEditor(table);
			}
		}

		renderExport();
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

nui.registerPage('experiments/blocks-editor', {
	html: 'experiments/blocks-editor.html',
	init(element, params, nui) {
		initBlocksEditor(element, params, nui);
	}
});


