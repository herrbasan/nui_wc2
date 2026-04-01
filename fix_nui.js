const fs = require('fs');
let content = fs.readFileSync('NUI/ui.js', 'utf8');

// Find and replace loadFragment function
const oldFn = `async function loadFragment(url, wrapper, params) {
		try {
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(\`Failed to load \${url} (\${response.status})\`);
		}

		let html = await response.text();

		// Strip Live Server injection (development only)
		html = html.replace(/<!-- Code injected by live-server -->[\s\S]*?<\/script>/gi, '');

		wrapper.innerHTML = html;

		customElements.upgrade(wrapper);
		executePageScript(wrapper, params);

	} catch (error) {
		console.error('[NUI] Fragment load error:', error);
		wrapper.innerHTML = \`
			<div class="error-page" style="padding: var(--nui-space-double); text-align: center;">
				<h1>Page Not Found</h1>
				<p>Could not load: <code>\${url}</code></p>
				<p style="color: var(--color-text-dim);">\${error.message}</p>
			</div>
		\`;
	}
}`;

const newFn = `async function loadFragment(url, wrapper, params) {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(\`Failed to load \${url} (\${response.status})\`);
	}

	let html = await response.text();

	// Strip Live Server injection (development only)
	html = html.replace(/<!-- Code injected by live-server -->[\s\S]*?<\/script>/gi, '');

	wrapper.innerHTML = html;

	customElements.upgrade(wrapper);
	executePageScript(wrapper, params);
}`;

if (content.includes(oldFn)) {
  content = content.replace(oldFn, newFn);
  fs.writeFileSync('NUI/ui.js', content);
  console.log('Done');
} else {
  console.log('Pattern not found');
  // Try to find the function start
  const idx = content.indexOf('async function loadFragment');
  console.log('loadFragment starts at:', idx);
  // Show what's there
  if (idx > 0) {
    console.log('Content around it:');
    console.log(content.substring(idx, idx + 500));
  }
}