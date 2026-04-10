#!/usr/bin/env node

const { createProject } = require('./lib/project-generator');
const { launchWebUI } = require('./lib/web-ui');
const { loadRegistry } = require('./lib/file-utils');

// Load component registry
const registry = loadRegistry();

// Available component pages (derived from registry) - for CLI
const AVAILABLE_COMPONENTS = registry.components
	.filter(c => c.page.startsWith('components/'))
	.map(c => c.page.replace('components/', ''))
	.filter((v, i, a) => a.indexOf(v) === i);

// CLI argument parsing
const args = process.argv.slice(2);

// Show help
if (args.includes('--help') || args.includes('-h')) {
	console.log(`
NUI Create App - Generate a new NUI application

Usage:
  node nui-create-app/index.js <project-name> [options]
  node nui-create-app/index.js --ui

Options:
  --with-<component>    Include component demo page (e.g., --with-dialog)
  --with-all            Include all component demo pages
  --with-right-sidebar  Include right sidebar demo (dual-sidebar layout)
  --list                List available components
  --ui                  Launch web UI for interactive creation
  --help, -h            Show this help

Examples:
  node nui-create-app/index.js my-app
  node nui-create-app/index.js my-app --with-dialog --with-select
  node nui-create-app/index.js my-app --with-all
  node nui-create-app/index.js my-app --with-right-sidebar
  node nui-create-app/index.js --ui
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
	console.log('\nUsage: node nui-create-app/index.js <project-name> [options]');
	console.log('Or launch web UI: node nui-create-app/index.js --ui');
	process.exit(1);
}

// Parse options
const rightSidebar = args.includes('--with-right-sidebar');

// Parse selected components
let selectedComponents = [];

if (args.includes('--with-all')) {
	selectedComponents = [...AVAILABLE_COMPONENTS];
} else {
	selectedComponents = args
		.filter(arg => arg.startsWith('--with-') && arg !== '--with-right-sidebar')
		.map(arg => arg.replace('--with-', ''))
		.filter(c => {
			if (AVAILABLE_COMPONENTS.includes(c)) return true;
			console.warn(`Warning: Unknown component "${c}". Use --list to see available components.`);
			return false;
		});
}

// Create the project
createProject(name, selectedComponents, { rightSidebar });
