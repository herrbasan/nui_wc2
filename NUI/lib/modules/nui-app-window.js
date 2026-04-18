/**
 * NUI App Window - Window Chrome Module
 *
 * Wraps content with window chrome: title bar, content area, optional status bar.
 * Designed for Electron frameless windows but works in any environment.
 *
 * Usage:
 * const win = appWindow({
 *     title: 'My Application',
 *     icon: 'settings',
 *     inner: document.body.innerHTML,
 *     statusbar: true,
 *     onClose: () => {}
 * });
 *
 * win.close();   // calls onClose
 * win.focus();   // adds 'focused' class to body
 * win.blur();    // removes 'focused' class from body
 * win.element;   // root DOM element
 * win.content;   // main content area
 */

function appWindow(prop = {}) {

	const title = prop.title || document.title || 'Window';
	const inner = prop.inner || '';

	const appEl = document.createElement('div');
	appEl.className = 'nui-app';
	appEl.innerHTML = `
		<div class="nui-app-titlebar">
			<div class="title">
				<div class="title-icon">${prop.icon ? `<nui-icon name="${prop.icon}"></nui-icon>` : ''}</div>
				<div class="label">${title}</div>
			</div>
			<div class="controls">
				<div class="close" title="Close">
					<nui-icon name="close"></nui-icon>
				</div>
			</div>
		</div>
		<div class="nui-app-content">
			<div class="nui-app-main"></div>
		</div>
		${prop.statusbar ? '<div class="nui-status-bar"></div>' : ''}
	`;

	const mainContent = appEl.querySelector('.nui-app-main');
	const closeBtn = appEl.querySelector('.nui-app-titlebar .close');

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
		content: mainContent,

		close() {
			if (prop.onClose) {
				prop.onClose();
			}
		},

		focus() {
			appEl.ownerDocument.body.classList.add('focused');
		},

		blur() {
			appEl.ownerDocument.body.classList.remove('focused');
		}
	};

	closeBtn.addEventListener('click', () => {
		app.close();
	});

	const target = prop.target || document.body;
	if (target === document.body) {
		document.body.innerHTML = '';
	}
	target.appendChild(appEl);

	// Re-initialize nui-app responsive observers after moving content in the DOM.
	// appWindow clears/replaces the body which disconnects nui-app's internal
	// ResizeObserver. The nui-app component guards against double-init, so
	// observers are never re-created. We detect moved nui-app elements and
	// attach a fresh observer that calls invalidateBreakpointCache().
	const nuiApps = mainContent.querySelectorAll('nui-app');
	for (const nuiApp of nuiApps) {
		if (nuiApp.invalidateBreakpointCache) {
			nuiApp.invalidateBreakpointCache();
			const ro = new ResizeObserver(() => {
				nuiApp.invalidateBreakpointCache();
			});
			ro.observe(nuiApp);
		}
	}

	return app;
}

export { appWindow };
