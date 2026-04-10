const fs = require('fs');
const path = require('path');

const PLAYGROUND_PATH = 'Playground';
const NUI_PATH = 'NUI';
const DOCS_PATH = 'docs';

/**
 * Load component registry from components.json
 */
function loadRegistry() {
	const registryPath = path.join(DOCS_PATH, 'components.json');
	if (!fs.existsSync(registryPath)) {
		console.error('Error: components.json not found at', registryPath);
		process.exit(1);
	}
	return JSON.parse(fs.readFileSync(registryPath, 'utf8'));
}

/**
 * Recursively copy a directory
 */
function copyRecursive(src, dest) {
	const stat = fs.statSync(src);
	if (stat.isDirectory()) {
		if (!fs.existsSync(dest)) {
			fs.mkdirSync(dest, { recursive: true });
		}
		fs.readdirSync(src).forEach(childItem => {
			copyRecursive(path.join(src, childItem), path.join(dest, childItem));
		});
	} else {
		fs.copyFileSync(src, dest);
	}
}

/**
 * Serve a static file over HTTP
 */
function serveFile(filePath, contentType, res) {
	fs.readFile(filePath, (err, data) => {
		if (err) {
			res.writeHead(404);
			res.end('Not found');
		} else {
			res.writeHead(200, { 'Content-Type': contentType });
			res.end(data);
		}
	});
}

module.exports = {
	PLAYGROUND_PATH,
	NUI_PATH,
	DOCS_PATH,
	loadRegistry,
	copyRecursive,
	serveFile
};
