console.log('[icon] Module loaded');

// Wait for DOM to be ready
function initIconPage() {
	console.log('[icon] Initializing icon page');
	
	// Populate icon grid
	const iconGrid = document.getElementById('icon-grid');
	if (iconGrid) {
		populateIconGrid(iconGrid);
	} else {
		console.warn('[icon] Icon grid element not found');
	}
}

// Run immediately if DOM is ready, otherwise wait
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initIconPage);
} else {
	initIconPage();
}

function populateIconGrid(container) {
	// All available Material Design icons in the sprite
	const icons = [
		'add', 'add_circle', 'analytics', 'arrow', 'article', 'aspect_ratio',
		'assessment', 'attach_money', 'brightness', 'calendar', 'chat', 'close',
		'credit_card', 'database', 'delete', 'done', 'download', 'drag_handle',
		'drag_indicator', 'edit', 'edit_note', 'empty_dashboard', 'filter_list',
		'folder', 'fullscreen', 'grid_on', 'headphones', 'id_card', 'image',
		'info', 'install_desktop', 'invert_colors', 'key', 'keyboard', 'label',
		'layers', 'location_on', 'logout', 'mail', 'media_folder', 'menu',
		'monitor', 'more', 'mouse', 'my_location', 'notifications', 'open_in_full',
		'palette', 'pause', 'person', 'photo_camera', 'play', 'print', 'public',
		'rainy', 'save', 'search', 'security', 'settings', 'sign_language',
		'smart_display', 'sort', 'speaker', 'stadia_controller', 'star_rate',
		'sticky_note', 'sync', 'upload', 'volume', 'warning', 'work', 'wysiwyg'
	];
	
	container.innerHTML = icons.map(iconName => `
		<div class="icon-item" data-icon="${iconName}">
			<nui-icon name="${iconName}" style="font-size: 2rem;"></nui-icon>
			<code>${iconName}</code>
		</div>
	`).join('');
	
	// Add click handlers to copy icon name
	container.querySelectorAll('.icon-item').forEach(item => {
		item.addEventListener('click', async () => {
			const iconName = item.dataset.icon;
			
			try {
				await navigator.clipboard.writeText(iconName);
				
				// Visual feedback
				const code = item.querySelector('code');
				const originalText = code.textContent;
				code.textContent = 'Copied!';
				code.style.opacity = '1';
				code.style.color = 'var(--nui-accent)';
				
				setTimeout(() => {
					code.textContent = originalText;
					code.style.opacity = '0.7';
					code.style.color = '';
				}, 1000);
			} catch (err) {
				console.error('Failed to copy:', err);
			}
		});
		
		// Hover effect (CSS handles most, but add/remove active class if needed)
		item.addEventListener('mouseenter', (e) => {
			// Hover styles are now in CSS
		});
		
		item.addEventListener('mouseleave', (e) => {
			// Hover styles are now in CSS
		});
	});
}
