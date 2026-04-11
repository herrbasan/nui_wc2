#!/usr/bin/env node
/**
 * NUI MCP Server
 * 
 * Standalone MCP server for NUI component documentation.
 * Pure Node.js, no external dependencies, stdio transport.
 * 
 * Usage:
 *   node scripts/mcp-server.js
 * 
 * Or configure in MCP client:
 *   { "command": "node", "args": ["scripts/mcp-server.js"] }
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Resolve paths relative to project root
const PROJECT_ROOT = path.join(__dirname, '..');
const REGISTRY_PATH = path.join(PROJECT_ROOT, 'docs', 'components.json');
const PAGES_DIR = path.join(PROJECT_ROOT, 'Playground', 'pages');
const THEME_CSS_PATH = path.join(PROJECT_ROOT, 'NUI', 'css', 'nui-theme.css');
const ICON_SPRITE_PATH = path.join(PROJECT_ROOT, 'NUI', 'assets', 'material-icons-sprite.svg');

// Server identity
const SERVER_NAME = 'nui-docs';
const SERVER_VERSION = '1.0.0';

// State
let initialized = false;
let registry = null;
let assetCache = { commit: null, cssVars: null, icons: null };

// ─── MCP Protocol Helpers ───────────────────────────────────────────────────

function sendResponse(id, result) {
	writeJson({ jsonrpc: '2.0', id, result });
}

function sendError(id, code, message, data) {
	writeJson({ jsonrpc: '2.0', id, error: { code, message, data } });
}

function sendNotification(method, params) {
	writeJson({ jsonrpc: '2.0', method, params });
}

function writeJson(obj) {
	const body = JSON.stringify(obj);
	process.stdout.write(`Content-Length: ${Buffer.byteLength(body, 'utf-8')}\r\n\r\n${body}`);
}

function readMessage() {
	return new Promise((resolve) => {
		let headers = '';
		let contentLength = 0;
		let body = '';

		const onData = (chunk) => {
			const text = chunk.toString('utf-8');

			if (!contentLength) {
				headers += text;
				const match = headers.match(/Content-Length:\s*(\d+)/i);
				if (match) {
					contentLength = parseInt(match[1], 10);
					const headerEnd = headers.indexOf('\r\n\r\n');
					if (headerEnd !== -1) {
						body = headers.slice(headerEnd + 4);
						if (body.length >= contentLength) {
							process.off('data', onData);
							resolve(body.slice(0, contentLength));
							return;
						}
					}
				}
			} else {
				body += text;
				if (body.length >= contentLength) {
					process.off('data', onData);
					resolve(body.slice(0, contentLength));
				}
			}
		};

		process.stdin.on('data', onData);
	});
}

// ─── Data Loading ────────────────────────────────────────────────────────────

function loadRegistry() {
	if (registry) return registry;
	try {
		registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'));
		return registry;
	} catch {
		return null;
	}
}

function readPage(pagePath) {
	const filePath = path.join(PAGES_DIR, `${pagePath}.html`);
	try {
		return fs.readFileSync(filePath, 'utf-8');
	} catch {
		return null;
	}
}

function extractLlmGuide(html) {
	const match = html.match(/<nui-markdown[^>]*id="llm-guide"[^>]*>[\s\S]*?<script type="text\/markdown">([\s\S]*?)<\/script>/);
	if (!match) return null;
	return match[1].replace(/<\\\/script>/g, '</script>').trim();
}

function extractCodeExamples(html) {
	const examples = [];
	const regex = /<script\s+type="example"\s+data-lang="(\w+)">([\s\S]*?)<\/script>/gi;
	let m;
	while ((m = regex.exec(html)) !== null) {
		examples.push({ lang: m[1], code: m[2].trim() });
	}
	return examples;
}

function extractTextContent(html) {
	let text = html;
	text = text.replace(/<script[\s\S]*?<\/script>/gi, '');
	text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
	text = text.replace(/<nui-markdown[\s\S]*?<\/nui-markdown>/gi, '');
	text = text.replace(/<details[\s\S]*?<\/details>/gi, '');
	text = text.replace(/<nui-code[\s\S]*?<\/nui-code>/gi, '');
	text = text.replace(/<br\s*\/?>/gi, '\n');
	text = text.replace(/<\/?(p|h[1-6]|li|div|section|header|footer|main|article|aside|nav|ul|ol|dl|dt|dd|blockquote|pre|figure|figcaption|address)\b[^>]*>/gi, '\n');
	text = text.replace(/<\/?(strong|b|em|i|mark|small|del|ins|sub|sup|abbr|code|kbd|samp|var|cite|q|span|a)\b[^>]*>/gi, '');
	text = text.replace(/<[^>]+>/g, '');
	text = text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
	text = text.replace(/\n{3,}/g, '\n\n');
	return text.split('\n').map(l => l.replace(/^\t+/, '').trimEnd()).join('\n').trim();
}

function getSubmoduleCommit() {
	try {
		return execSync('git rev-parse HEAD', { cwd: PROJECT_ROOT, encoding: 'utf-8' }).trim();
	} catch {
		return null;
	}
}

function ensureAssetCache() {
	const commit = getSubmoduleCommit();
	if (assetCache.commit === commit) return assetCache;

	let cssVars = [];
	let icons = [];

	try {
		const css = fs.readFileSync(THEME_CSS_PATH, 'utf-8');
		const varRegex = /(--[\w-]+)\s*:\s*([^;}{]+)/g;
		let m;
		while ((m = varRegex.exec(css)) !== null) {
			cssVars.push({ name: m[1], value: m[2].trim() });
		}
	} catch {}

	try {
		const svg = fs.readFileSync(ICON_SPRITE_PATH, 'utf-8');
		const idRegex = /<symbol\s+id="([^"]+)"/g;
		let m;
		while ((m = idRegex.exec(svg)) !== null) {
			icons.push(m[1]);
		}
	} catch {}

	assetCache = { commit, cssVars, icons };
	return assetCache;
}

// ─── Tool Definitions ───────────────────────────────────────────────────────

const TOOLS = [
	{
		name: 'nui_list_components',
		description: 'List all NUI components with name, group, description, and documentation page. Use this first to discover available components before querying specific docs.',
		inputSchema: { type: 'object', properties: {} }
	},
	{
		name: 'nui_get_component',
		description: 'Get documentation, LLM usage guide, and code examples for a specific NUI component. Returns the LLM guide (correct/wrong usage patterns) and code examples extracted from the Playground page. Use nui_list_components first to find valid component names.',
		inputSchema: {
			type: 'object',
			properties: {
				component: { type: 'string', description: "Component name (e.g. 'nui-button', 'nui-dialog', 'nui.util.storage')" }
			},
			required: ['component']
		}
	},
	{
		name: 'nui_get_guide',
		description: 'Get NUI documentation for a specific topic: getting-started, architecture-patterns, api-structure, declarative-actions, accessibility, utilities. Returns the full guide content from the Playground documentation pages.',
		inputSchema: {
			type: 'object',
			properties: {
				topic: { type: 'string', description: "Guide topic name (e.g. 'getting-started', 'api-structure', 'utilities')" }
			},
			required: ['topic']
		}
	},
	{
		name: 'nui_get_reference',
		description: 'Compact API reference cheat sheet. Returns setup boilerplate, addon imports, root API (nui.*), components API (nui.components.*), utilities (nui.util.*), data-action syntax, router contract, and key component events. Use this for quick lookups without reading full guide pages.',
		inputSchema: { type: 'object', properties: {} }
	},
	{
		name: 'nui_get_css_variables',
		description: 'Get all CSS variables defined in nui-theme.css. Returns categorized list of variable names and their values. Dynamically generated from the submodule source (cached per commit).',
		inputSchema: { type: 'object', properties: {} }
	},
	{
		name: 'nui_get_icons',
		description: 'Get all icon names available in the material-icons-sprite.svg. Returns a comma-separated list of icon IDs for use with nui-icon. Dynamically generated from the submodule source (cached per commit).',
		inputSchema: { type: 'object', properties: {} }
	}
];

// ─── Tool Handlers ───────────────────────────────────────────────────────────

function handleListComponents() {
	const reg = loadRegistry();
	if (!reg) return { error: 'Failed to load component registry.' };

	const lines = [];

	// Core components
	if (reg.components && reg.components.length > 0) {
		lines.push('## Components');
		for (const c of reg.components) {
			lines.push(`- **${c.name}** (${c.group}) — ${c.description}`);
		}
		lines.push('');
	}

	// Addons
	if (reg.addons && reg.addons.length > 0) {
		lines.push('## Addons');
		for (const a of reg.addons) {
			const imports = a.imports ? ` [${a.imports.js || ''}${a.imports.css ? ', ' + a.imports.css : ''}]` : '';
			lines.push(`- **${a.name}** — ${a.description}${imports}`);
		}
		lines.push('');
	}

	// Reference pages
	if (reg.reference && reg.reference.length > 0) {
		lines.push('## Reference');
		for (const r of reg.reference) {
			lines.push(`- **${r.name}** — ${r.description}`);
		}
		lines.push('');
	}

	return { text: lines.join('\n') };
}

function handleGetComponent(name) {
	const reg = loadRegistry();
	if (!reg) return { error: 'Failed to load component registry.' };

	// Search in components and addons
	const allEntries = [...(reg.components || []), ...(reg.addons || [])];
	const entry = allEntries.find(c =>
		c.name.toLowerCase() === name.toLowerCase() ||
		c.name === name
	);

	if (!entry) {
		const available = allEntries.map(c => c.name).join(', ');
		return { error: `Component "${name}" not found. Available: ${available}` };
	}

	const html = readPage(entry.page);
	if (!html) return { error: `Documentation page not found: ${entry.page}` };

	const parts = [];

	// LLM Guide
	const llmGuide = extractLlmGuide(html);
	if (llmGuide) {
		parts.push('## LLM Guide\n\n' + llmGuide);
	}

	// Code Examples
	const examples = extractCodeExamples(html);
	if (examples.length > 0) {
		parts.push('## Code Examples\n');
		for (const ex of examples) {
			parts.push(`\`\`\`${ex.lang}\n${ex.code}\n\`\`\``);
		}
	}

	// Documentation text
	const textContent = extractTextContent(html);
	if (textContent) {
		parts.push('## Documentation\n\n' + textContent);
	}

	// Metadata
	parts.push('## Metadata');
	parts.push(`- **Page:** ${entry.page}`);
	parts.push(`- **Group:** ${entry.group || 'unknown'}`);
	if (entry.events && entry.events.length > 0) {
		parts.push(`- **Events:** ${entry.events.join(', ')}`);
	}
	if (entry.innerElement) {
		parts.push(`- **Inner Element:** ${entry.innerElement}`);
	}
	if (entry.imports) {
		if (entry.imports.js) parts.push(`- **JS Import:** ${entry.imports.js}`);
		if (entry.imports.css) parts.push(`- **CSS Import:** ${entry.imports.css}`);
	}

	return { text: parts.join('\n\n') };
}

function handleGetGuide(topic) {
	const reg = loadRegistry();
	if (!reg) return { error: 'Failed to load component registry.' };

	const entry = reg.reference?.find(g =>
		g.name.toLowerCase() === topic.toLowerCase() ||
		g.name === topic
	);

	if (!entry) {
		const available = reg.reference?.map(g => g.name).join(', ') || 'none';
		return { error: `Guide "${topic}" not found. Available: ${available}` };
	}

	const html = readPage(entry.page);
	if (!html) return { error: `Documentation page not found: ${entry.page}` };

	const parts = [];

	const textContent = extractTextContent(html);
	if (textContent) {
		parts.push(textContent);
	}

	const examples = extractCodeExamples(html);
	if (examples.length > 0) {
		parts.push('## Code Examples\n');
		for (const ex of examples) {
			parts.push(`\`\`\`${ex.lang}\n${ex.code}\n\`\`\``);
		}
	}

	return { text: parts.join('\n\n') };
}

function handleGetReference() {
	const reg = loadRegistry();
	if (!reg) return { error: 'Failed to load component registry.' };

	const lines = [];

	// Setup
	if (reg.setup) {
		lines.push('## Setup\n');
		if (reg.setup.minimal) {
			lines.push(`### Minimal (${reg.setup.minimal.description})`);
			lines.push('```' + (reg.setup.minimal.lang || 'html'));
			lines.push(reg.setup.minimal.code);
			lines.push('```\n');
		}
		if (reg.setup.foucPrevention) {
			lines.push(`### ${reg.setup.foucPrevention.description}`);
			lines.push('```' + (reg.setup.foucPrevention.lang || 'css'));
			lines.push(reg.setup.foucPrevention.code);
			lines.push('```\n');
		}
		if (reg.setup.addons) {
			lines.push('### Addon Imports');
			lines.push('| Addon | JS | CSS |');
			lines.push('|-------|----|-----|');
			for (const addon of reg.setup.addons) {
				lines.push(`| ${addon.name} | ${addon.js || '—'} | ${addon.css || '—'} |`);
			}
			lines.push('');
		}
	}

	// Root API
	if (reg.api?.root) {
		lines.push('## Root API (`nui.*`)\n```js');
		for (const item of reg.api.root) {
			lines.push(item.signature + (item.description ? ` // ${item.description}` : ''));
		}
		lines.push('```\n');
	}

	// Components API
	if (reg.api?.components) {
		lines.push('## Components API (`nui.components.*`)');
		for (const comp of reg.api.components) {
			lines.push(`\n### ${comp.namespace} (${comp.type}${comp.experimental ? ', experimental' : ''})`);
			if (comp.description) lines.push(comp.description);
			lines.push('```js');
			for (const method of comp.methods) {
				lines.push(method.signature + (method.async ? ' // async' : ''));
			}
			lines.push('```');
		}
		lines.push('');
	}

	// Utilities
	if (reg.api?.utilities) {
		lines.push('## Utilities (`nui.util.*`)\n```js');
		for (const util of reg.api.utilities) {
			if (util.type === 'namespace') {
				for (const method of util.methods) {
					lines.push(method.signature + (method.note ? ` // ${method.note}` : ''));
				}
			} else {
				lines.push(util.signature);
			}
		}
		lines.push('```\n');
	}

	// Patterns
	if (reg.patterns?.dataAction) {
		const da = reg.patterns.dataAction;
		lines.push('## data-action Syntax');
		lines.push('```');
		lines.push(da.syntax);
		lines.push('```');
		if (da.description) lines.push(da.description);
		if (da.events) {
			lines.push(`Dispatches: \`${da.events.generic}\` (generic) + \`${da.events.specific}\` (specific)`);
		}
		if (da.detail) lines.push(`detail: ${JSON.stringify(da.detail)}`);
		if (da.bubbles !== undefined) lines.push(`bubbles: ${da.bubbles}`);
		lines.push('');
	}

	if (reg.patterns?.router) {
		lines.push('## Router Contract');
		const router = reg.patterns.router;
		if (router.hashFormat) lines.push(`- Hash format: ${router.hashFormat.join(' or ')}`);
		if (router.caching) lines.push(`- ${router.caching}`);
		if (router.scopeRule) lines.push(`- ${router.scopeRule}`);
		lines.push('');
	}

	// Events
	if (reg.events && reg.events.length > 0) {
		lines.push('## Key Component Events\n');
		lines.push('| Component | Events | Detail |');
		lines.push('|-----------|--------|--------|');
		for (const item of reg.events) {
			const events = item.events.map(e => e.name).join(', ');
			const detail = item.events[0]?.detail || item.events[0]?.note || '';
			lines.push(`| ${item.component} | ${events} | ${detail} |`);
		}
	}

	return { text: lines.join('\n') };
}

function handleGetCssVariables() {
	const cache = ensureAssetCache();
	if (!cache.cssVars || cache.cssVars.length === 0) {
		return { error: 'Failed to read CSS variables from nui-theme.css.' };
	}

	const lines = [`## NUI CSS Variables (${cache.cssVars.length} total, commit: ${cache.commit?.substring(0, 7)})`, ''];

	const categories = {
		'Spacing': /^--nui-space|^--space-/,
		'Font': /^--font-/,
		'Text Color': /^--text-color/,
		'Color Base': /^--color-(base|contrast|white|black|highlight|accent|banner)/,
		'Color Shades': /^--color-shade\d/,
		'Border': /^--border-/,
		'Shadow': /^--shadow-/,
		'Icon': /^--icon-/,
		'Other': null
	};

	const grouped = {};
	for (const cat of Object.keys(categories)) grouped[cat] = [];

	for (const v of cache.cssVars) {
		let placed = false;
		for (const [cat, regex] of Object.entries(categories)) {
			if (regex && regex.test(v.name)) {
				grouped[cat].push(v);
				placed = true;
				break;
			}
		}
		if (!placed) grouped['Other'].push(v);
	}

	for (const [cat, vars] of Object.entries(grouped)) {
		if (vars.length === 0) continue;
		lines.push(`### ${cat}`);
		for (const v of vars) {
			lines.push(`- \`${v.name}\` → \`${v.value}\``);
		}
		lines.push('');
	}

	return { text: lines.join('\n') };
}

function handleGetIcons() {
	const cache = ensureAssetCache();
	if (!cache.icons || cache.icons.length === 0) {
		return { error: 'Failed to read icon sprite from material-icons-sprite.svg.' };
	}

	const lines = [
		`## NUI Icon Sprite (${cache.icons.length} icons, commit: ${cache.commit?.substring(0, 7)})`,
		'',
		'Usage: `<nui-icon name="ICON_NAME">fallback</nui-icon>`',
		'',
		'```text',
		cache.icons.join(', '),
		'```'
	];

	return { text: lines.join('\n') };
}

// ─── Request Routing ─────────────────────────────────────────────────────────

function handleRequest(method, params) {
	switch (method) {
		case 'initialize':
			initialized = true;
			return {
				protocolVersion: '2024-11-05',
				capabilities: {
					tools: { listChanged: false }
				},
				serverInfo: { name: SERVER_NAME, version: SERVER_VERSION }
			};

		case 'tools/list':
			return { tools: TOOLS };

		case 'tools/call': {
			const { name, arguments: args = {} } = params;
			switch (name) {
				case 'nui_list_components': return handleListComponents();
				case 'nui_get_component': return handleGetComponent(args.component);
				case 'nui_get_guide': return handleGetGuide(args.topic);
				case 'nui_get_reference': return handleGetReference();
				case 'nui_get_css_variables': return handleGetCssVariables();
				case 'nui_get_icons': return handleGetIcons();
				default: return { error: `Unknown tool: ${name}` };
			}
		}

		case 'ping':
			return {};

		default:
			return { error: `Unknown method: ${method}` };
	}
}

function formatResult(result) {
	if (result.error) {
		return { content: [{ type: 'text', text: result.error }], isError: true };
	}
	return { content: [{ type: 'text', text: result.text }] };
}

// ─── Main Loop ───────────────────────────────────────────────────────────────

async function main() {
	// Set encoding
	process.stdin.setEncoding('utf-8');
	process.stdout.setEncoding('utf-8');

	while (true) {
		const raw = await readMessage();
		let msg;
		try {
			msg = JSON.parse(raw);
		} catch {
			continue;
		}

		const { id, method, params } = msg;

		try {
			const result = handleRequest(method, params);

			if (method === 'tools/call') {
				sendResponse(id, formatResult(result));
			} else if (id !== undefined) {
				sendResponse(id, result);
			}
		} catch (err) {
			if (id !== undefined) {
				sendError(id, -32603, err.message);
			}
		}
	}
}

main().catch(err => {
	console.error('[mcp-server] Fatal:', err);
	process.exit(1);
});
