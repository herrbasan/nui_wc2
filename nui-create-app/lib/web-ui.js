const http = require('http');
const fs = require('fs');
const path = require('path');
const { NUI_PATH, serveFile } = require('./file-utils');
const { createProject } = require('./project-generator');

/**
 * Launch web UI for interactive project creation
 */
function launchWebUI(availableComponents) {
	const port = 3456;
	
	// Generate component data - MUST include 'id' or 'idx' for tracking
	const componentsData = availableComponents.map((c, idx) => ({
		id: idx,           // Required for list tracking
		idx: idx,          // For convenience
		name: c,           // Component name (e.g., 'button')
		label: c.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')  // Display label (e.g., 'Button')
	}));
	
	// Load HTML template and inject data
	const templatePath = path.join(__dirname, '..', 'templates', 'web-ui.html');
	let html = fs.readFileSync(templatePath, 'utf8');
	html = html.replace('{{COMPONENTS_DATA}}', JSON.stringify(componentsData));
	
	const server = http.createServer((req, res) => {
		if (req.url === '/') {
			res.writeHead(200, { 'Content-Type': 'text/html' });
			res.end(html);
		} else if (req.url === '/nui-theme.css') {
			serveFile(path.join(NUI_PATH, 'css', 'nui-theme.css'), 'text/css', res);
		} else if (req.url === '/nui.js') {
			serveFile(path.join(NUI_PATH, 'nui.js'), 'application/javascript', res);
		} else if (req.url === '/nui-list.css') {
			serveFile(path.join(NUI_PATH, 'css', 'modules', 'nui-list.css'), 'text/css', res);
		} else if (req.url === '/nui-list.js') {
			serveFile(path.join(NUI_PATH, 'lib', 'modules', 'nui-list.js'), 'application/javascript', res);
		} else if (req.url.startsWith('/assets/')) {
			const assetPath = req.url.replace('/assets/', '').split('#')[0];
			serveFile(path.join(NUI_PATH, 'assets', assetPath), 'image/svg+xml', res);
		} else if (req.url === '/api/create' && req.method === 'POST') {
			let body = '';
			req.on('data', chunk => body += chunk);
			req.on('end', () => {
				const { name, components, rightSidebar } = JSON.parse(body);
				
				if (!name || !/^[a-zA-Z0-9_-]+$/.test(name)) {
					res.writeHead(400, { 'Content-Type': 'application/json' });
					res.end(JSON.stringify({ success: false, error: 'Invalid project name' }));
					return;
				}
				
				const projectPath = path.resolve(name);
				if (fs.existsSync(projectPath)) {
					res.writeHead(400, { 'Content-Type': 'application/json' });
					res.end(JSON.stringify({ success: false, error: 'Directory already exists' }));
					return;
				}
				
				createProject(name, components, { rightSidebar });
				
				res.writeHead(200, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify({ success: true, projectPath: name }));
			});
		} else {
			res.writeHead(404);
			res.end('Not found');
		}
	});
	
	server.listen(port, () => {
		console.log(`\nNUI Create App UI running at http://localhost:${port}`);
		console.log('Press Ctrl+C to stop\n');
	});
}

module.exports = { launchWebUI };
