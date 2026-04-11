#!/usr/bin/env node
/**
 * NUI Documentation Generator
 * 
 * Extracts JSON-LD metadata and LLM Guides from Playground pages,
 * then generates docs/components.json as the machine-readable source of truth.
 * 
 * Usage:
 *   node scripts/update-docs.js
 */

const fs = require('fs');
const path = require('path');

// Configuration
const PAGES_DIR = path.join(__dirname, '..', 'Playground', 'pages');
const OUTPUT_FILE = path.join(__dirname, '..', 'docs', 'components.json');

/**
 * Recursively find all HTML files in a directory
 */
function findHtmlFiles(dir, files = []) {
	const items = fs.readdirSync(dir);
	for (const item of items) {
		const fullPath = path.join(dir, item);
		const stat = fs.statSync(fullPath);
		if (stat.isDirectory()) {
			findHtmlFiles(fullPath, files);
		} else if (item.endsWith('.html')) {
			files.push(fullPath);
		}
	}
	return files;
}

/**
 * Get all HTML files in a specific subdirectory
 */
function getFilesInDir(subdir) {
	const dirPath = path.join(PAGES_DIR, subdir);
	if (!fs.existsSync(dirPath)) return [];
	
	return fs.readdirSync(dirPath)
		.filter(f => f.endsWith('.html'))
		.map(f => path.join(dirPath, f));
}

/**
 * Extract metadata and LLM Guide from an HTML page
 */
function extractPageData(htmlPath) {
	const html = fs.readFileSync(htmlPath, 'utf-8');
	const relativePath = path.relative(PAGES_DIR, htmlPath).replace(/\\/g, '/');
	
	// Extract JSON-LD
	const jsonLdMatch = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
	if (!jsonLdMatch) {
		console.warn(`[update-docs] No JSON-LD found in ${relativePath}`);
		return null;
	}
	
	let metadata;
	try {
		metadata = JSON.parse(jsonLdMatch[1]);
	} catch (err) {
		console.error(`[update-docs] Invalid JSON-LD in ${relativePath}: ${err.message}`);
		return null;
	}
	
	// Validate required fields
	if (!metadata.name) {
		console.warn(`[update-docs] Missing 'name' in ${relativePath}`);
	}
	if (!metadata['@type']) {
		console.warn(`[update-docs] Missing '@type' in ${relativePath}`);
	}
	
	// Extract LLM Guide from <nui-markdown id="llm-guide">
	// The markdown is inside a <script type="text/markdown"> within the nui-markdown wrapper
	const llmWrapperMatch = html.match(/<nui-markdown[^>]*id="llm-guide"[^>]*>[\s\S]*?<script type="text\/markdown">([\s\S]*?)<\/script>/);
	let llmGuide = null;
	if (llmWrapperMatch) {
		// Unescape the script tag sequence for consumers
		// The literal characters in the file are: < \/script>
		// The backslash is NOT an escape - it's literally in the HTML source
		llmGuide = llmWrapperMatch[1].replace(/<\\\/script>/g, '</script>').trim();
	}
	
	return { ...metadata, llmGuide, _sourcePath: relativePath };
}

/**
 * Convert file path to page identifier (e.g., "components/button")
 */
function pathToPage(filePath) {
	const relative = path.relative(PAGES_DIR, filePath).replace(/\\/g, '/');
	return relative.replace(/\.html$/, '');
}

/**
 * Main generator function
 */
function generateComponentsJson() {
	console.log('[update-docs] Starting documentation generation...');
	
	const result = {
		schemaVersion: 1,
		generated: new Date().toISOString(),
		source: 'Playground/pages/**',
		components: [],
		addons: [],
		reference: [],
		setup: {},
		api: {},
		patterns: {},
		events: []
	};
	
	// Track seen API entries to detect duplicates
	const seenApi = {
		root: new Set(),
		components: new Set(),
		utilities: new Set()
	};
	
	function checkDuplicate(entryName, section, filePath) {
		if (seenApi[section].has(entryName)) {
			console.warn(`[update-docs] Duplicate API entry '${entryName}' in ${section} (from ${filePath})`);
		}
		seenApi[section].add(entryName);
	}
	
	// Process components
	console.log('[update-docs] Processing components...');
	const componentFiles = getFilesInDir('components');
	for (const file of componentFiles) {
		const data = extractPageData(file);
		if (!data) continue;
		
		const pagePath = pathToPage(file);
		const { _sourcePath, llmGuide, ...cleanData } = data;
		
		result.components.push({
			...cleanData,
			page: pagePath,
			llmGuide
		});
		
		// Aggregate events
		if (data.events && data.events.length > 0) {
			result.events.push({
				component: data.name,
				events: data.events.map(e => typeof e === 'string' ? { name: e } : e)
			});
		}
		
		console.log(`[update-docs]  ✓ ${data.name}`);
	}
	
	// Process addons
	console.log('[update-docs] Processing addons...');
	const addonFiles = getFilesInDir('addons');
	for (const file of addonFiles) {
		const data = extractPageData(file);
		if (!data) continue;
		
		const pagePath = pathToPage(file);
		const { _sourcePath, llmGuide, ...cleanData } = data;
		
		result.addons.push({
			...cleanData,
			page: pagePath,
			llmGuide
		});
		
		// Aggregate events from addons too
		if (data.events && data.events.length > 0) {
			result.events.push({
				component: data.name,
				events: data.events.map(e => typeof e === 'string' ? { name: e } : e)
			});
		}
		
		console.log(`[update-docs]  ✓ ${data.name}`);
	}
	
	// Process documentation (distributed slices)
	console.log('[update-docs] Processing documentation pages...');
	const docFiles = getFilesInDir('documentation');
	for (const file of docFiles) {
		const data = extractPageData(file);
		if (!data) continue;
		
		const pagePath = pathToPage(file);
		const { _sourcePath, llmGuide, setup, api, patterns, ...cleanData } = data;
		
		result.reference.push({
			...cleanData,
			page: pagePath,
			llmGuide
		});
		
		// Merge distributed slices with conflict detection
		if (setup) {
			for (const [key, value] of Object.entries(setup)) {
				if (result.setup[key]) {
					console.warn(`[update-docs] Duplicate setup key '${key}' in ${_sourcePath}`);
				}
				result.setup[key] = value;
			}
		}
		
		if (api) {
			if (api.root) {
				for (const entry of api.root) {
					checkDuplicate(entry.name, 'root', _sourcePath);
				}
				result.api.root = [...(result.api.root || []), ...api.root];
			}
			if (api.components) {
				for (const entry of api.components) {
					checkDuplicate(entry.namespace || entry.name, 'components', _sourcePath);
				}
				result.api.components = [...(result.api.components || []), ...api.components];
			}
			if (api.utilities) {
				for (const entry of api.utilities) {
					checkDuplicate(entry.name, 'utilities', _sourcePath);
				}
				result.api.utilities = [...(result.api.utilities || []), ...api.utilities];
			}
		}
		
		if (patterns) {
			for (const [key, value] of Object.entries(patterns)) {
				if (result.patterns[key]) {
					console.warn(`[update-docs] Overwriting pattern '${key}' from ${_sourcePath}`);
				}
				result.patterns[key] = value;
			}
		}
		
		console.log(`[update-docs]  ✓ ${data.name}`);
	}
	
	// Write output
	console.log('[update-docs] Writing components.json...');
	const outputDir = path.dirname(OUTPUT_FILE);
	if (!fs.existsSync(outputDir)) {
		fs.mkdirSync(outputDir, { recursive: true });
	}
	
	fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, '\t'));
	
	console.log('[update-docs] Done!');
	console.log(`[update-docs] Generated: ${OUTPUT_FILE}`);
	console.log(`[update-docs] Stats: ${result.components.length} components, ${result.addons.length} addons, ${result.reference.length} reference pages`);
}

// Run if called directly
if (require.main === module) {
	try {
		generateComponentsJson();
	} catch (err) {
		console.error('[update-docs] Error:', err.message);
		console.error(err.stack);
		process.exit(1);
	}
}

module.exports = { generateComponentsJson, extractPageData };
