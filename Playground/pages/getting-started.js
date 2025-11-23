// Getting Started page module

const loadTime = Date.now();

export function init(container, nui, params) {
	console.log('[Getting Started] Page initialized');
	
	// Calculate and display page load time
	const timeElement = container.querySelector('#page-load-time');
	if (timeElement) {
		const elapsed = Date.now() - loadTime;
		timeElement.innerHTML = `<small>Page loaded in ${elapsed}ms</small>`;
		timeElement.style.color = 'var(--color-text-dim)';
		timeElement.style.marginTop = 'var(--nui-space)';
	}
	
	// Watch for theme changes
	nui.knower.watch('theme', (theme) => {
		console.log('[Getting Started] Theme changed to:', theme);
		container.classList.toggle('dark-theme', theme === 'dark');
	});
}

export function onShow(container, params) {
	console.log('[Getting Started] Page shown with params:', params);
	
	// Update load time display when shown again
	const timeElement = container.querySelector('#page-load-time');
	if (timeElement) {
		const elapsed = Date.now() - loadTime;
		timeElement.innerHTML = `<small>Page cached (first load was ${elapsed}ms ago)</small>`;
	}
}
