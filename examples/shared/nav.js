// Section navigation for a single-page app shell.
//
// A sidebar entry is an in-page anchor. The browser scrolls to the target —
// but keyboard focus stays on the link, so:
//
//   - a screen-reader user is not told the page moved (the hash changed, the
//     focus did not), and
//   - a keyboard user has to tab through everything between the sidebar and
//     the new section.
//
// Moving focus with the scroll fixes both. The target needs `tabindex="-1"`
// to be focusable at all, and it needs `scroll-margin-top` so the fixed app
// header does not cover its heading.

export function bindSectionNav(nav, { onNavigate, indicator } = {}) {
	const app = nav.closest('nui-app');

	// The "you are here" label, shown next to the app title while the sidebar is
	// collapsed. On a phone the sidebar is off canvas, so the active entry — the
	// only orientation the product offers — is out of sight. The label follows the
	// link list's own active state, so it cannot disagree with the navigation.
	const updateIndicator = (text) => {
		if (!indicator) return;
		const collapsed = app
			? app.classList.contains('sidebar-closed') || !app.classList.contains('sidebar-forced')
			: true;
		if (text && collapsed) {
			indicator.textContent = text;
			indicator.hidden = false;
		} else {
			indicator.hidden = true;
		}
	};

	nav.addEventListener('nui-active-change', (e) => {
		const href = e.detail?.href;
		if (!href || !href.startsWith('#')) return;

		const target = document.getElementById(href.slice(1));
		if (!target) return;

		if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
		target.classList.add('ex-section');

		updateIndicator(e.detail.text);

		// The browser's own fragment scroll happens after this handler, so the
		// focus move waits for the next frame — otherwise the two fight and the
		// section ends up half a screen off.
		requestAnimationFrame(() => {
			target.focus({ preventScroll: true });
			onNavigate?.(target, e.detail);
		});
	});

	// The sidebar can open and close without a navigation, and the label's
	// visibility depends on which of those states the shell is in.
	if (app) {
		app.addEventListener('nui-sidebar-change', () => {
			updateIndicator(nav.getActiveData?.()?.text);
		});
	}

	// A page opened directly at a section (`#handbook`) has an active entry before
	// anyone clicks: name the section from the hash, or the indicator starts empty.
	updateIndicator(nav.getActiveData?.()?.text);
}
