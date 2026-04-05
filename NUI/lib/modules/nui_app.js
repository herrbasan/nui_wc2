/**
 * NUI App Window - Electron App Chrome Module
 * 
 * Provides a window chrome with title bar, content area, and optional status bar.
 * Designed for Electron applications but works in any environment.
 * 
 * Usage:
 * const appWindow = await nui.appWindow({
 *     title: 'My Application',
 *     icon: 'settings',
 *     inner: document.body.innerHTML,
 *     statusbar: true,
 *     functions: {
 *         'About': { title: 'About', fnc: () => showAbout() }
 *     },
 *     onClose: () => {}
 * });
 * 
 * // Methods
 * appWindow.close();
 * appWindow.center();
 * appWindow.setFullScreen(true);
 * appWindow.toggleDevTools();
 * appWindow.setStatusBar(content);
 */

import { contextMenu } from './nui-context-menu.js';

let appWindowInstance = null;

function appWindow(prop = {}) {
	if (appWindowInstance) {
		appWindowInstance.close();
	}

	const title = prop.title || document.title || 'Window';
	const inner = prop.inner || '';

	const appEl = document.createElement('div');
	appEl.className = 'nui-app';
	appEl.innerHTML = `
		<div class="nui-title-bar">
			<div class="title">
				<div class="title-icon">${prop.icon ? `<nui-icon name="${prop.icon}"></nui-icon>` : ''}</div>
				<div class="label">${title}</div>
			</div>
			<div class="controls">
				<div class="close" title="Close">
					<svg viewBox="0 0 24 24" width="16" height="16">
						<path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
					</svg>
				</div>
			</div>
		</div>
		<div class="nui-app-content">
			<div class="nui-app-main"></div>
		</div>
		${prop.statusbar ? '<div class="nui-status-bar"></div>' : ''}
	`;

	const titleBar = appEl.querySelector('.nui-title-bar');
	const mainContent = appEl.querySelector('.nui-app-main');
	const statusBar = appEl.querySelector('.nui-status-bar');
	const closeBtn = appEl.querySelector('.nui-title-bar .close');

	if (typeof inner === 'string') {
		mainContent.innerHTML = inner;
	} else if (inner instanceof HTMLElement) {
		mainContent.appendChild(inner);
	}

	if (!prop.statusbar) {
		appEl.classList.add('nofoot');
	}

	const app = {
		element: appEl,
		titleBar,
		content: mainContent,
		statusBar,
		triggerMenu: null,

		close() {
			if (this.triggerMenu) {
				this.triggerMenu.destroy();
				this.triggerMenu = null;
			}
			if (appEl.parentNode) {
				appEl.parentNode.removeChild(appEl);
			}
			appWindowInstance = null;
			if (prop.onClose) {
				prop.onClose();
			}
		},

		setStatusBar(content) {
			if (statusBar) {
				if (typeof content === 'string') {
					statusBar.innerHTML = content;
				} else {
					statusBar.textContent = String(content);
				}
			}
		},

		center() {
			if (window.electron_helper?.window) {
				window.electron_helper.window.center();
			}
		},

		setFullScreen(value) {
			if (window.electron_helper?.window) {
				window.electron_helper.window.setFullScreen(value);
			}
		},

		toggleDevTools() {
			if (window.electron_helper?.window) {
				window.electron_helper.window.toggleDevTools();
			}
		}
	};

	closeBtn.addEventListener('click', () => {
		app.close();
	});

	renderTitleMenu(app, prop);

	if (window.electron_helper?.window) {
		window.electron_helper.window.hook_event('focus', () => {
			document.body.classList.add('focused');
		});
		window.electron_helper.window.hook_event('blur', () => {
			document.body.classList.remove('focused');
		});
	}

	const target = prop.target || document.body;
	if (target === document.body) {
		document.body.innerHTML = '';
	}
	target.appendChild(appEl);
	appWindowInstance = app;

	return app;
}

function renderTitleMenu(app, prop) {
	const titleBar = app.titleBar;

	const menuItems = [];

	menuItems.push({
		label: 'Toggle Theme',
		action: 'toggle-theme'
	});

	if (prop.functions) {
		for (const key in prop.functions) {
			const fn = prop.functions[key];
			if (fn.separator) {
				menuItems.push({ type: 'separator' });
			} else {
				menuItems.push({
					label: fn.title || key,
					action: fn.action || key
				});
			}
		}
	}

	if (window.electron_helper?.window) {
		menuItems.push({ type: 'separator' });
		menuItems.push({
			label: 'Toggle DevTools',
			action: 'toggle-devtools'
		});
		menuItems.push({
			label: 'Toggle Fullscreen',
			action: 'toggle-fullscreen'
		});
		menuItems.push({
			label: 'Center Window',
			action: 'center-window'
		});
		menuItems.push({ type: 'separator' });
		menuItems.push({
			label: 'Close',
			action: 'close-window'
		});
	}

	titleBar.addEventListener('contextmenu', (e) => {
		e.preventDefault();
		if (app.triggerMenu) {
			app.triggerMenu.destroy();
		}

		app.triggerMenu = contextMenu(menuItems, {
			onAction: (action, item) => {
				switch (action) {
					case 'toggle-theme':
						const current = document.documentElement.style.colorScheme || 'light';
						document.documentElement.style.colorScheme = current === 'dark' ? 'light' : 'dark';
						break;
					case 'toggle-devtools':
						if (window.electron_helper?.window) {
							window.electron_helper.window.toggleDevTools();
						}
						break;
					case 'toggle-fullscreen':
						if (window.electron_helper?.window) {
							window.electron_helper.window.isFullScreen().then(isFS => {
								window.electron_helper.window.setFullScreen(!isFS);
							});
						}
						break;
					case 'center-window':
						if (window.electron_helper?.window) {
							window.electron_helper.window.center();
						}
						break;
					case 'close-window':
						if (window.electron_helper?.window) {
							window.electron_helper.window.close();
						}
						break;
					default:
						if (prop.functions?.[action]?.fnc) {
							prop.functions[action].fnc();
						}
				}
			}
		});

		app.triggerMenu.show(e.clientX, e.clientY, titleBar);
	});
}

export { appWindow };
