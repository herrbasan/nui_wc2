// Auto-generated migration script — run once to convert all pages to registerPage()
// Usage: node scripts/migrate-to-register-page.js
// After running: delete this file, it's a one-shot tool.

const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, '..', 'Playground', 'pages');
const outputFile = path.join(__dirname, '..', 'Playground', 'js', 'page-init.js');

const registrations = [];
const processed = [];

function findHtmlFiles(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...findHtmlFiles(fullPath));
        } else if (entry.name.endsWith('.html') && entry.name !== '_template.html') {
            files.push(fullPath);
        }
    }
    return files;
}

function extractInitBody(html) {
    // Find <script type="nui/page"> ... </script>
    const regex = /<script\s+type="nui\/page"\s*>(.*?)<\/script>/s;
    const match = html.match(regex);
    if (!match) return null;

    let scriptContent = match[1].trim();

    // Check for data-init attribute
    const tagRegex = /<script\s+type="nui\/page"\s+data-init="([^"]*)"\s*>/;
    const tagMatch = html.match(tagRegex);

    // Try to find an init function
    const initMatch = scriptContent.match(/function\s+init\s*\([^)]*\)\s*\{([\s\S]*)\}/);
    if (initMatch) {
        return { body: initMatch[1].trim(), dataInit: tagMatch ? tagMatch[1] : null, fullScript: scriptContent };
    }

    // Check if it calls another function
    const callMatch = scriptContent.match(/function\s+init\s*\([^)]*\)\s*\{[\s\S]*\}/);
    if (callMatch) {
        return { body: callMatch[0], dataInit: tagMatch ? tagMatch[1] : null, fullScript: scriptContent };
    }

    return { body: scriptContent, dataInit: tagMatch ? tagMatch[1] : null, fullScript: scriptContent };
}

function stripScriptBlock(html) {
    return html.replace(/<script\s+type="nui\/page"[^>]*>[\s\S]*?<\/script>/g, '');
}

function getRouteId(filePath) {
    const relative = path.relative(pagesDir, filePath);
    return relative.replace(/\\/g, '/').replace(/\.html$/, '');
}

// ── Process all files ──

const htmlFiles = findHtmlFiles(pagesDir);
console.log(`Found ${htmlFiles.length} HTML files.`);

for (const filePath of htmlFiles) {
    const original = fs.readFileSync(filePath, 'utf-8');
    const extracted = extractInitBody(original);
    const routeId = getRouteId(filePath);

    if (extracted && extracted.body) {
        registrations.push({ routeId, body: extracted.body, filePath });
    }

    // Strip script block
    const cleaned = stripScriptBlock(original);
    if (cleaned !== original) {
        fs.writeFileSync(filePath, cleaned, 'utf-8');
        processed.push(routeId);
        console.log(`  ✓ ${routeId}`);
    }
}

// ── Generate page-init.js ──

let output = `// Auto-generated page registrations — all Playground page logic
// Pattern: nui.registerPage('route', { html: 'pages/route.html', init(element, params, nui) { ... } })
// Generated on ${new Date().toISOString().split('T')[0]}

import { nui } from '../../NUI/nui.js';

`;

const sections = {
    'Home': r => r.routeId === 'home',
    'Core Components': r => r.routeId.startsWith('components/'),
    'Addons': r => r.routeId.startsWith('addons/'),
    'Documentation': r => r.routeId.startsWith('documentation/'),
    'Experiments': r => r.routeId.startsWith('experiments/'),
};

for (const [section, filter] of Object.entries(sections)) {
    const groupRegs = registrations.filter(filter);
    if (groupRegs.length === 0) continue;

    output += `// ── ${section} ──\n\n`;

    for (const reg of groupRegs) {
        const body = reg.body;
        // Dedent body
        const lines = body.split('\n');
        const minIndent = lines.filter(l => l.trim()).reduce((min, l) => Math.min(min, l.match(/^(\t*)/)[1].length), 99);
        const dedented = lines.map(l => l.length >= minIndent ? l.slice(minIndent) : l).join('\n');

// Check if init should be async (has await in non-string, non-comment context)
		const hasAwait = /\bawait\s+(?!.*['\"`])/.test(body);
		const asyncKeyword = hasAwait ? 'async ' : '';

		output += `nui.registerPage('${reg.routeId}', {\n`;
		output += `\thtml: 'pages/${reg.routeId}.html',\n`;
		output += `\t${asyncKeyword}init(element, params, nui) {\n`;

        if (dedented.trim()) {
            const bodyLines = dedented.trim().split('\n');
            for (const line of bodyLines) {
                output += `\t\t${line}\n`;
            }
        }

        output += `\t}\n`;
        output += `});\n\n`;
    }
}

fs.writeFileSync(outputFile, output, 'utf-8');
console.log(`\n✓ Generated ${outputFile} with ${registrations.length} page registrations.`);
console.log(`✓ Stripped script blocks from ${processed.length} HTML files.`);
console.log('\nNext: import page-init.js in Playground/js/main.js');
