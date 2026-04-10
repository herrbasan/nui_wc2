const http = require('http');
const fs = require('fs');
const path = require('path');
const { NUI_PATH, serveFile } = require('./file-utils');
const { createProject } = require('./project-generator');

/**
 * Launch web UI for interactive project creation
 */
function launchWebUI() {
	const port = 3456;
	
	// Load HTML template
	const templatePath = path.join(__dirname, '..', 'templates', 'web-ui.html');
	const html = fs.readFileSync(templatePath, 'utf8');
	
	const server = http.createServer((req, res) => {
		if (req.url === '/') {
			res.writeHead(200, { 'Content-Type': 'text/html' });
			res.end(html);
		} else if (req.url === '/nui-theme.css') {
			serveFile(path.join(NUI_PATH, 'css', 'nui-theme.css'), 'text/css', res);
		} else if (req.url === '/nui.js') {
			serveFile(path.join(NUI_PATH, 'nui.js'), 'application/javascript', res);
		} else if (req.url.startsWith('/assets/')) {
			const assetPath = req.url.replace('/assets/', '').split('#')[0];
			serveFile(path.join(NUI_PATH, 'assets', assetPath), 'image/svg+xml', res);
		} else if (req.url === '/api/create' && req.method === 'POST') {
			let body = '';
			req.on('data', chunk => body += chunk);
			req.on('end', () => {
				const { name, layout } = JSON.parse(body);
				
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
				
				// Pass layout options to project generator
				// Default: header + left sidebar (always), optional right sidebar and footer
				createProject(name, [], { 
					header: true,  // Always included
					leftSidebar: layout?.leftSidebar ?? true,
					rightSidebar: layout?.rightSidebar ?? false,
					footer: layout?.footer ?? false
				});
				
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
