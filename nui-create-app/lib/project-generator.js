const fs = require('fs');
const path = require('path');
const { PLAYGROUND_PATH, NUI_PATH, copyRecursive } = require('./file-utils');
const registry = require('./file-utils').loadRegistry();

const ADDON_COMPONENTS = registry.components
	.filter(c => c.category === 'addon' || c.imports)
	.reduce((acc, c) => {
		acc[c.name] = c.imports;
		return acc;
	}, {});

const REFERENCE = registry.reference;

/**
 * Extract and adapt the app shell from Playground/index.html
 */
function extractAppShell(projectName, includeRightSidebar = false) {
	const playgroundIndex = fs.readFileSync(path.join(PLAYGROUND_PATH, 'index.html'), 'utf8');
	
	let appShell = playgroundIndex
		.replace(/\.\.\//g, './')
		.replace(/<link rel="stylesheet" href="\.\.\/NUI\/css\/modules\/[^"]+"\s*\/?>\s*/g, '')
		.replace(/\s*<nui-button[^>]*data-badge[^>]*>[\s\S]*?<\/nui-button>\s*/g, '')
		.replace(/\s*<nui-button[^>]*data-action="toggle-sidebar:right"[^>]*>[\s\S]*?<\/nui-button>\s*/, '')
		.replace(/\s*<nui-sidebar[^>]*position="right"[^>]*>[\s\S]*?<\/nui-sidebar>\s*/, '')
		.replace(/<nui-sidebar([^>]*)>/, (match, attrs) => {
			if (!attrs.includes('behavior=')) {
				return `<nui-sidebar${attrs} behavior="primary">`;
			}
			return match;
		})
		.replace(/css\/main\.css/, 'css/app.css')
		.replace(/<title>[^<]*<\/title>/, `<title>${projectName}</title>`)
		.replace(/(<div slot="left">)\s*<nui-button[^>]*>[\s\S]*?<\/nui-button>\s*<h1>[^<]*<\/h1>/, 
			'$1\n\t\t\t\t<nui-button data-action="toggle-sidebar">\n\t\t\t\t\t<button type="button" aria-label="Toggle navigation menu">\n\t\t\t\t\t\t<nui-icon name="menu">☰</nui-icon>\n\t\t\t\t\t</button>\n\t\t\t\t</nui-button>\n\t\t\t\t<h1>' + projectName + '</h1>')
		.replace(/js\/main\.js/, 'js/app.js');
	
	if (includeRightSidebar) {
		const rightToggleButton = `
                    <nui-button data-action="toggle-sidebar:right">
                        <button type="button" aria-label="Toggle right sidebar">
                            <nui-icon name="settings">⚙</nui-icon>
                        </button>
                    </nui-button>`;
		appShell = appShell.replace(/(<div slot="right">)/, `$1${rightToggleButton}`);
		
		const rightSidebar = `
            <nui-sidebar position="right" behavior="manual">
                <div style="padding: var(--nui-space); display: flex; flex-direction: column; gap: var(--nui-space);">
                    <h3 style="margin-top: 0;">Configuration</h3>
                    <p style="font-size: var(--font-size-small); color: var(--color-text-muted);">This right sidebar demonstrates the dual-sidebar layout feature.</p>
                    
                    <div style="margin-top: var(--nui-space);">
                        <label style="font-weight: bold; font-size: var(--font-size-small); display: block; margin-bottom: var(--nui-space-half);">Environment</label>
                        <nui-select>
                            <select>
                                <option>Production</option>
                                <option>Staging</option>
                                <option>Development</option>
                            </select>
                        </nui-select>
                    </div>

                    <div style="margin-top: auto; padding-top: var(--nui-space-double);">
                        <nui-button variant="primary" style="width: 100%;">
                            <button type="button">Apply</button>
                        </nui-button>
                    </div>
                </div>
            </nui-sidebar>`;
		appShell = appShell.replace(/(<\/nui-sidebar>)(\s*<nui-content>)/, `$1${rightSidebar}$2`);
	}
	
	return appShell;
}

/**
 * Extract a component demo page
 */
function extractComponentPage(componentName) {
	const pagePath = path.join(PLAYGROUND_PATH, 'pages', 'components', `${componentName}.html`);
	
	if (!fs.existsSync(pagePath)) {
		console.warn(`Warning: Component page not found: ${componentName}`);
		return null;
	}
	
	let content = fs.readFileSync(pagePath, 'utf8');
	content = content.replace(/\.\.\/\.\.\//g, '../');
	content = content.replace(/\.\.\//g, './');
	
	return content;
}

/**
 * Generate app.js with navigation
 */
function generateAppJs(projectName, selectedComponents) {
	const navItems = selectedComponents.map(name => {
		const label = name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
		return { label, href: `#page=components/${name}` };
	});
	
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

document.addEventListener('click', (e) => {
    const actionEl = e.target.closest('[data-action]');
    if (!actionEl) return;
    
    const actionSpec = actionEl.dataset.action;
    const [actionPart] = actionSpec.split('@');
    const [action, param] = actionPart.split(':');

    switch (action) {
        case 'toggle-sidebar': {
            const app = document.querySelector('nui-app');
            if (app?.toggleSidebar) {
                app.toggleSidebar(param || 'left');
            }
            break;
        }
        case 'toggle-theme':
            toggleTheme();
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

const footerInfo = document.getElementById('appFooterInfo');
if (footerInfo) {
    footerInfo.textContent = '${projectName} — Built with NUI';
}

console.log('${projectName} initialized');
`;
}

/**
 * Generate home page
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

.page-home section {
    margin-bottom: var(--nui-space-double);
}
`;
}

/**
 * Generate README
 */
function generateReadme(projectName, selectedComponents) {
	const componentSection = selectedComponents.length > 0
		? `\n## Included Components\n\n${selectedComponents.map(c => `- \`${c}\``).join('\n')}\n`
		: '';

	const needsAddons = selectedComponents.some(c => {
		const compName = `nui-${c}`;
		return ADDON_COMPONENTS[compName] || ADDON_COMPONENTS[`nui-${c.replace('-', '')}`];
	});

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
function createProject(name, selectedComponents, options = {}) {
	const projectPath = path.resolve(name);
	
	if (fs.existsSync(projectPath)) {
		console.error(`Error: Directory "${name}" already exists.`);
		process.exit(1);
	}
	
	console.log(`Creating project: ${name}...`);
	console.log(`Components: ${selectedComponents.length > 0 ? selectedComponents.join(', ') : 'none'}\n`);
	
	fs.mkdirSync(projectPath, { recursive: true });
	fs.mkdirSync(path.join(projectPath, 'css'), { recursive: true });
	fs.mkdirSync(path.join(projectPath, 'js'), { recursive: true });
	fs.mkdirSync(path.join(projectPath, 'pages', 'components'), { recursive: true });
	
	fs.writeFileSync(path.join(projectPath, 'index.html'), extractAppShell(name, options.rightSidebar));
	fs.writeFileSync(path.join(projectPath, 'css', 'app.css'), generateAppCss());
	fs.writeFileSync(path.join(projectPath, 'js', 'app.js'), generateAppJs(name, selectedComponents));
	fs.writeFileSync(path.join(projectPath, 'pages', 'home.html'), generateHomePage(selectedComponents));
	fs.writeFileSync(path.join(projectPath, 'pages', 'settings.html'), generateSettingsPage());
	
	for (const component of selectedComponents) {
		const pageContent = extractComponentPage(component);
		if (pageContent) {
			fs.writeFileSync(
				path.join(projectPath, 'pages', 'components', `${component}.html`),
				pageContent
			);
		}
	}
	
	const sourceNuiPath = path.resolve(NUI_PATH);
	const targetNuiPath = path.join(projectPath, 'NUI');
	
	if (fs.existsSync(sourceNuiPath)) {
		console.log('Copying NUI library...');
		copyRecursive(sourceNuiPath, targetNuiPath);
		console.log('NUI library copied.\n');
	}
	
	fs.writeFileSync(path.join(projectPath, 'README.md'), generateReadme(name, selectedComponents));
	
	console.log(`Project "${name}" created successfully!\n`);
	console.log('Next steps:');
	console.log(`  cd ${name}`);
	if (!fs.existsSync(targetNuiPath)) {
		console.log('  cp -r /path/to/nui/library/NUI ./NUI');
	}
	console.log('  npx serve .');
}

module.exports = {
	createProject,
	extractAppShell,
	extractComponentPage,
	generateAppJs,
	generateHomePage,
	generateSettingsPage,
	generateAppCss,
	generateReadme
};
