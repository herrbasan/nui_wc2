#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const http = require('http');

// Paths relative to script location
const PLAYGROUND_PATH = 'Playground';
const NUI_PATH = 'NUI';
const DOCS_PATH = 'docs';

// Load component registry
function loadRegistry() {
	const registryPath = path.join(DOCS_PATH, 'components.json');
	if (!fs.existsSync(registryPath)) {
		console.error('Error: components.json not found at', registryPath);
		process.exit(1);
	}
	return JSON.parse(fs.readFileSync(registryPath, 'utf8'));
}

const registry = loadRegistry();

// Available components (derived from registry)
const AVAILABLE_COMPONENTS = registry.components
	.filter(c => c.page.startsWith('components/'))
	.map(c => c.page.replace('components/', ''))
	.filter((v, i, a) => a.indexOf(v) === i); // Unique values

// Addon components (require additional imports)
const ADDON_COMPONENTS = registry.components
	.filter(c => c.category === 'addon' || c.imports)
	.reduce((acc, c) => {
		acc[c.name] = c.imports;
		return acc;
	}, {});

// Reference data for templates
const REFERENCE = registry.reference;

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
 * Extract and adapt the app shell from Playground/index.html
 */
function extractAppShell(projectName) {
	const playgroundIndex = fs.readFileSync(path.join(PLAYGROUND_PATH, 'index.html'), 'utf8');
	
	// Parse and modify the HTML
	let appShell = playgroundIndex
		// Fix paths: ../NUI/ -> ./NUI/
		.replace(/\.\.\//g, './')
		// Remove addon CSS modules that won't be included by default
		.replace(/<link rel="stylesheet" href="\.\/NUI\/css\/modules\/[^"]+"\s*\/?>\s*/g, '')
		// Remove the notification button (with badge)
		.replace(/\s*<nui-button[^>]*data-badge[^>]*>[\s\S]*?<\/nui-button>\s*/g, '')
		// Change Playground-specific CSS to app.css
		.replace(/css\/main\.css/, 'css/app.css')
		// Update title
		.replace(/<title>[^<]*<\/title>/, `<title>${projectName}</title>`)
		// Remove h1 text, keep slot structure
		.replace(/(<div slot="left">)\s*<nui-button[^>]*>[\s\S]*?<\/nui-button>\s*<h1>[^<]*<\/h1>/, 
			'$1\n\t\t\t\t<nui-button data-action="toggle-sidebar">\n\t\t\t\t\t<button type="button" aria-label="Toggle navigation menu">\n\t\t\t\t\t\t<nui-icon name="menu">☰</nui-icon>\n\t\t\t\t\t</button>\n\t\t\t\t</nui-button>\n\t\t\t\t<h1>' + projectName + '</h1>')
		// Change main.js to app.js
		.replace(/js\/main\.js/, 'js/app.js');
	
	return appShell;
}

/**
 * Extract a component demo page for use as a starter
 */
function extractComponentPage(componentName) {
	const pagePath = path.join(PLAYGROUND_PATH, 'pages', 'components', `${componentName}.html`);
	
	if (!fs.existsSync(pagePath)) {
		console.warn(`Warning: Component page not found: ${componentName}`);
		return null;
	}
	
	let content = fs.readFileSync(pagePath, 'utf8');
	
	// Fix relative paths for the generated app structure
	content = content.replace(/\.\.\/\.\.\//g, '../');
	content = content.replace(/\.\.\//g, './');
	
	return content;
}

/**
 * Generate app.js with navigation for selected components
 */
function generateAppJs(projectName, selectedComponents) {
	// Build navigation items from selected components
	const navItems = selectedComponents.map(name => {
		const label = name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
		return { label, href: `#page=components/${name}` };
	});
	
	// Add default home page
	const navigationData = [
		{
			label: 'Home',
			icon: 'home',
			items: [
				{ label: 'Dashboard', href: '#page=home' }
			]
		},
		...(navItems.length > 0 ? [{
			label: 'Components',
			icon: 'widgets',
			items: navItems
		}] : []),
		{
			label: 'Settings',
			icon: 'settings',
			items: [
				{ label: 'Preferences', href: '#page=settings' }
			]
		}
	];
	
	return `import { nui } from '../NUI/nui.js';

const navigationData = ${JSON.stringify(navigationData, null, 4)};

const linkList = document.querySelector('nui-link-list');
if (linkList) {
    linkList.loadData(navigationData);
}

nui.enableContentLoading({
    container: 'nui-main',
    navigation: 'nui-sidebar',
    basePath: 'pages',
    defaultPage: 'home'
});

document.addEventListener('nui-action', (e) => {
    const { name } = e.detail;
    switch (name) {
        case 'toggle-sidebar':
            document.querySelector('nui-app')?.toggleSideNav?.();
            break;
        case 'toggle-theme':
            toggleTheme();
            break;
        case 'toggle-sidebar:right':
            document.querySelector('nui-app')?.toggleSideNav?.('right');
            break;
        case 'scroll-to-top':
            document.querySelector('nui-content')?.scrollTo({ top: 0, behavior: 'smooth' });
            break;
    }
});

function toggleTheme() {
    const root = document.documentElement;
    const current = root.style.colorScheme || 
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    root.style.colorScheme = current === 'dark' ? 'light' : 'dark';
}

// Update footer info
const footerInfo = document.getElementById('appFooterInfo');
if (footerInfo) {
    footerInfo.textContent = '${projectName} — Built with NUI';
}

console.log('${projectName} initialized');
`;
}

/**
 * Generate a simple home page
 */
function generateHomePage(selectedComponents) {
	const componentList = selectedComponents.length > 0
		? `<ul>${selectedComponents.map(c => `<li><a href="#page=components/${c}">${c}</a></li>`).join('')}</ul>`
		: '<p>No components selected. Add some with <code>--with-&lt;component&gt;</code></p>';
	
	return `<header>
    <h2>Dashboard</h2>
    <p class="lead">Welcome to your NUI application</p>
</header>

<section>
    <nui-card>
        <div class="nui-headline">Getting Started</div>
        <p>This app was generated from the NUI Playground examples. Each component page contains working code you can adapt.</p>
    </nui-card>
</section>

<section>
    <h3>Component Examples</h3>
    ${componentList}
</section>
`;
}

/**
 * Generate settings page
 */
function generateSettingsPage() {
	return `<header>
    <h2>Settings</h2>
    <p class="lead">Configure your application</p>
</header>

<section>
    <nui-card>
        <div class="nui-headline">Application Settings</div>
        <p>Add your settings here.</p>
    </nui-card>
</section>
`;
}

/**
 * Generate app.css
 */
function generateAppCss() {
	return `body {
    margin: 0;
    overflow: hidden;
}

nui-app:not(.nui-ready) {
    display: none;
}

/* Page-specific styles */
.page-home section {
    margin-bottom: var(--nui-space-double);
}
`;
}

/**
 * Generate README with setup instructions from registry
 */
function generateReadme(projectName, selectedComponents) {
	const componentSection = selectedComponents.length > 0
		? `\n## Included Components\n\n${selectedComponents.map(c => `- \`${c}\``).join('\n')}\n`
		: '';

	// Check if any selected components need addon imports
	const needsAddons = selectedComponents.some(c => {
		const compName = `nui-${c}`;
		return ADDON_COMPONENTS[compName] || ADDON_COMPONENTS[`nui-${c.replace('-', '')}`];
	});

	const addonSection = needsAddons ? `
## Addon Components

Some components require additional imports:

${selectedComponents.map(c => {
	const compName = `nui-${c}`;
	const imports = ADDON_COMPONENTS[compName];
	if (!imports) return null;
	const jsImport = imports.js ? `\`<script type="module" src="${imports.js}"></script>\`` : '';
	const cssImport = imports.css ? `\`<link rel="stylesheet" href="${imports.css}">\`` : '';
	return `### ${compName}\n${jsImport ? `- JS: ${jsImport}\n` : ''}${cssImport ? `- CSS: ${cssImport}\n` : ''}`;
}).filter(Boolean).join('\n')}
` : '';

	const setup = REFERENCE?.setup?.minimal || {
		code: '<link rel="stylesheet" href="NUI/css/nui-theme.css">\n<script type="module" src="NUI/nui.js"></script>'
	};
	
	return `# ${projectName}

Generated with NUI Create App.${componentSection}

## Quick Start

1. Ensure the NUI library is at \`./NUI\` (copy or symlink from your NUI installation)
2. Serve with a local server:
   \`\`\`bash
   npx serve .
   # or
   python -m http.server 8080
   \`\`\`
3. Open http://localhost:3000 (or your server URL)

## Minimal Setup

\`\`\`${setup.lang || 'html'}
${setup.code}
\`\`\`
${addonSection}
## Project Structure

- \`${projectName}/\`
  - \`index.html\` - App shell (extracted from Playground)
  - \`css/app.css\` - Your styles
  - \`js/app.js\` - App initialization
  - \`pages/\`
    - \`home.html\` - Dashboard
    - \`settings.html\` - Settings page
    - \`components/\` - Component demo pages (working examples)
  - \`NUI/\` - NUI library (copy from your NUI installation)

## Key Patterns

### Components wrap native elements
\`\`\`html
<nui-button>
    <button type="button">Click</button>
</nui-button>
\`\`\`

### SPA routing uses hash URLs
\`\`\`html
<a href="#page=components/dialog">Dialog Demo</a>
\`\`\`

### Page scripts
\`\`\`html
<script type="nui/page">
function init(element) {
    // Page setup here
    element.show = () => console.log('visible');
    element.hide = () => console.log('hidden');
}
</script>
\`\`\`

## Adapting Component Examples

Each component page in \`pages/components/\` is a working example extracted from the NUI Playground. To adapt them:

1. Remove sections you don't need
2. Modify the \`<script type="nui/page">\` for your logic
3. Keep the HTML structure - it follows NUI's patterns
`;
}

/**
 * Main project creation function
 */
function createProject(name, selectedComponents) {
	const projectPath = path.resolve(name);
	
	if (fs.existsSync(projectPath)) {
		console.error(`Error: Directory "${name}" already exists.`);
		process.exit(1);
	}
	
	console.log(`Creating project: ${name}...`);
	console.log(`Components: ${selectedComponents.length > 0 ? selectedComponents.join(', ') : 'none'}\n`);
	
	// Create directory structure
	fs.mkdirSync(projectPath, { recursive: true });
	fs.mkdirSync(path.join(projectPath, 'css'), { recursive: true });
	fs.mkdirSync(path.join(projectPath, 'js'), { recursive: true });
	fs.mkdirSync(path.join(projectPath, 'pages', 'components'), { recursive: true });
	
	// Extract and write app shell from Playground
	fs.writeFileSync(path.join(projectPath, 'index.html'), extractAppShell(name));
	
	// Write CSS
	fs.writeFileSync(path.join(projectPath, 'css', 'app.css'), generateAppCss());
	
	// Write app.js with navigation
	fs.writeFileSync(path.join(projectPath, 'js', 'app.js'), generateAppJs(name, selectedComponents));
	
	// Write pages
	fs.writeFileSync(path.join(projectPath, 'pages', 'home.html'), generateHomePage(selectedComponents));
	fs.writeFileSync(path.join(projectPath, 'pages', 'settings.html'), generateSettingsPage());
	
	// Copy selected component pages
	for (const component of selectedComponents) {
		const pageContent = extractComponentPage(component);
		if (pageContent) {
			fs.writeFileSync(
				path.join(projectPath, 'pages', 'components', `${component}.html`),
				pageContent
			);
		}
	}
	
	// Copy NUI if it exists at the project root
	const sourceNuiPath = path.resolve(NUI_PATH);
	const targetNuiPath = path.join(projectPath, 'NUI');
	
	if (fs.existsSync(sourceNuiPath)) {
		console.log('Copying NUI library...');
		copyRecursive(sourceNuiPath, targetNuiPath);
		console.log('✅ NUI library copied.\n');
	}
	
	// Write README
	fs.writeFileSync(path.join(projectPath, 'README.md'), generateReadme(name, selectedComponents));
	
	console.log(`✅ Project "${name}" created successfully!\n`);
	console.log('Next steps:');
	console.log(`  cd ${name}`);
	if (!fs.existsSync(targetNuiPath)) {
		console.log('  cp -r /path/to/nui/library/NUI ./NUI');
	}
	console.log('  npx serve .');
}

/**
 * Launch web UI for interactive project creation
 */
function launchWebUI() {
	const port = 3456;
	
	const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NUI Create App</title>
    <style>
        * { box-sizing: border-box; }
        body {
            font-family: system-ui, -apple-system, sans-serif;
            margin: 0;
            padding: 2rem;
            background: #0f172a;
            color: #e2e8f0;
            min-height: 100vh;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
        }
        h1 {
            font-size: 2.5rem;
            margin-bottom: 0.5rem;
            background: linear-gradient(135deg, #60a5fa, #a78bfa);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .subtitle {
            color: #94a3b8;
            margin-bottom: 2rem;
        }
        .form-group {
            margin-bottom: 1.5rem;
        }
        label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 500;
            color: #cbd5e1;
        }
        input[type="text"] {
            width: 100%;
            padding: 0.75rem 1rem;
            background: #1e293b;
            border: 1px solid #334155;
            border-radius: 0.5rem;
            color: #e2e8f0;
            font-size: 1rem;
        }
        input[type="text"]:focus {
            outline: none;
            border-color: #60a5fa;
        }
        .components-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: 0.75rem;
            margin-top: 0.5rem;
        }
        .component-checkbox {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 0.75rem;
            background: #1e293b;
            border: 1px solid #334155;
            border-radius: 0.375rem;
            cursor: pointer;
            transition: all 0.2s;
        }
        .component-checkbox:hover {
            border-color: #60a5fa;
            background: #252f47;
        }
        .component-checkbox input {
            cursor: pointer;
        }
        .component-checkbox span {
            font-size: 0.875rem;
            color: #cbd5e1;
        }
        .actions {
            display: flex;
            gap: 1rem;
            margin-top: 2rem;
            padding-top: 2rem;
            border-top: 1px solid #334155;
        }
        button {
            padding: 0.75rem 1.5rem;
            border-radius: 0.5rem;
            font-size: 1rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
        }
        .btn-primary {
            background: #3b82f6;
            color: white;
            border: none;
        }
        .btn-primary:hover {
            background: #2563eb;
        }
        .btn-secondary {
            background: transparent;
            color: #94a3b8;
            border: 1px solid #475569;
        }
        .btn-secondary:hover {
            color: #e2e8f0;
            border-color: #64748b;
        }
        .select-all {
            margin-bottom: 0.75rem;
            display: flex;
            gap: 1rem;
        }
        .select-all button {
            padding: 0.375rem 0.75rem;
            font-size: 0.875rem;
        }
        #status {
            margin-top: 1.5rem;
            padding: 1rem;
            border-radius: 0.5rem;
            display: none;
        }
        #status.success {
            display: block;
            background: #064e3b;
            color: #6ee7b7;
            border: 1px solid #059669;
        }
        #status.error {
            display: block;
            background: #450a0a;
            color: #fca5a5;
            border: 1px solid #dc2626;
        }
        pre {
            background: #0f172a;
            padding: 1rem;
            border-radius: 0.375rem;
            overflow-x: auto;
            margin-top: 0.75rem;
        }
        code {
            font-family: ui-monospace, monospace;
            font-size: 0.875rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🏗️ NUI Create App</h1>
        <p class="subtitle">Generate a new NUI application with selected component examples</p>
        
        <form id="createForm">
            <div class="form-group">
                <label for="projectName">Project Name</label>
                <input type="text" id="projectName" placeholder="my-nui-app" required>
            </div>
            
            <div class="form-group">
                <label>Components</label>
                <div class="select-all">
                    <button type="button" class="btn-secondary" onclick="selectAll()">Select All</button>
                    <button type="button" class="btn-secondary" onclick="selectNone()">Select None</button>
                </div>
                <div class="components-grid" id="componentsGrid">
                    ${AVAILABLE_COMPONENTS.map(c => `
                    <label class="component-checkbox">
                        <input type="checkbox" name="components" value="${c}">
                        <span>${c}</span>
                    </label>
                    `).join('')}
                </div>
            </div>
            
            <div class="actions">
                <button type="submit" class="btn-primary">Create Project</button>
            </div>
        </form>
        
        <div id="status"></div>
    </div>
    
    <script>
        function selectAll() {
            document.querySelectorAll('input[name="components"]').forEach(cb => cb.checked = true);
        }
        function selectNone() {
            document.querySelectorAll('input[name="components"]').forEach(cb => cb.checked = false);
        }
        
        document.getElementById('createForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const status = document.getElementById('status');
            status.className = '';
            status.textContent = 'Creating project...';
            
            const name = document.getElementById('projectName').value;
            const components = Array.from(document.querySelectorAll('input[name="components"]:checked'))
                .map(cb => cb.value);
            
            try {
                const res = await fetch('/api/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, components })
                });
                
                const data = await res.json();
                
                if (data.success) {
                    status.className = 'success';
                    status.innerHTML = 
                        '<strong>✅ Project created successfully!</strong>' +
                        '<pre><code>cd ' + data.projectPath + '\nnpx serve .</code></pre>';
                } else {
                    status.className = 'error';
                    status.textContent = 'Error: ' + data.error;
                }
            } catch (err) {
                status.className = 'error';
                status.textContent = 'Error: ' + err.message;
            }
        });
    </script>
</body>
</html>`;

	const server = http.createServer((req, res) => {
		if (req.url === '/') {
			res.writeHead(200, { 'Content-Type': 'text/html' });
			res.end(html);
		} else if (req.url === '/api/create' && req.method === 'POST') {
			let body = '';
			req.on('data', chunk => body += chunk);
			req.on('end', () => {
				try {
					const { name, components } = JSON.parse(body);
					
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
					
					createProject(name, components);
					
					res.writeHead(200, { 'Content-Type': 'application/json' });
					res.end(JSON.stringify({ success: true, projectPath: name }));
				} catch (err) {
					res.writeHead(500, { 'Content-Type': 'application/json' });
					res.end(JSON.stringify({ success: false, error: err.message }));
				}
			});
		} else {
			res.writeHead(404);
			res.end('Not found');
		}
	});
	
	server.listen(port, () => {
		console.log(`\n🚀 NUI Create App UI running at http://localhost:${port}`);
		console.log('Press Ctrl+C to stop\n');
	});
}

// CLI argument parsing
const args = process.argv.slice(2);

// Show help
if (args.includes('--help') || args.includes('-h')) {
	console.log(`
NUI Create App - Generate a new NUI application

Usage:
  node nui-create-app.js <project-name> [options]
  node nui-create-app.js --ui

Options:
  --with-<component>    Include component demo page (e.g., --with-dialog)
  --with-all            Include all component demo pages
  --list                List available components
  --ui                  Launch web UI for interactive creation
  --help, -h            Show this help

Examples:
  node nui-create-app.js my-app
  node nui-create-app.js my-app --with-dialog --with-select
  node nui-create-app.js my-app --with-all
  node nui-create-app.js --ui
`);
	process.exit(0);
}

// List available components
if (args.includes('--list')) {
	console.log('Available components:\n');
	AVAILABLE_COMPONENTS.forEach(c => console.log(`  --with-${c}`));
	console.log('\nOr use --with-all to include all components');
	process.exit(0);
}

// Launch web UI
if (args.includes('--ui')) {
	launchWebUI();
	return;
}

// Get project name
const name = args.find(arg => !arg.startsWith('--'));

if (!name) {
	console.error('Error: Project name required');
	console.log('\nUsage: node nui-create-app.js <project-name> [options]');
	console.log('Or launch web UI: node nui-create-app.js --ui');
	process.exit(1);
}

// Parse selected components
let selectedComponents = [];

if (args.includes('--with-all')) {
	selectedComponents = [...AVAILABLE_COMPONENTS];
} else {
	selectedComponents = args
		.filter(arg => arg.startsWith('--with-'))
		.map(arg => arg.replace('--with-', ''))
		.filter(c => {
			if (AVAILABLE_COMPONENTS.includes(c)) return true;
			console.warn(`Warning: Unknown component "${c}". Use --list to see available components.`);
			return false;
		});
}

// Create the project
createProject(name, selectedComponents);
