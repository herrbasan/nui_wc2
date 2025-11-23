// Introduction page module

export function init(container, nui, params) {
	console.log('[Introduction] Page initialized');
	
	// Watch for theme changes
	nui.knower.watch('theme', (theme) => {
		console.log('[Introduction] Theme changed to:', theme);
		container.classList.toggle('dark-theme', theme === 'dark');
	});
}

export function onShow(container, params) {
	console.log('[Introduction] Page shown with params:', params);
}
