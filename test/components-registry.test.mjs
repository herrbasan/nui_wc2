import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractPageEntries } from '../scripts/update-docs.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'NUI/nui.js'), 'utf8');
const registry = JSON.parse(fs.readFileSync(path.join(root, 'documentation/components.json'), 'utf8'));

const registered = new Set([
	...source.matchAll(/register(?:Layout)?Component\('([^']+)'/g),
	...source.matchAll(/customElements\.define\('([^']+)'/g)
].map(match => match[1]));
const documented = new Set(registry.components.map(component => component.name));

assert.deepEqual([...registered].filter(name => !documented.has(name)).sort(), [],
	'Every registered core component must have a registry entry');
assert.deepEqual([...documented].filter(name => !registered.has(name)).sort(), [],
	'Every core registry entry must name a registered component');
assert.equal(documented.size, registry.components.length, 'Registry names must be unique');

for (const component of registry.components) {
	assert.ok(Array.isArray(component.events), `${component.name}: events must be an array`);
	assert.ok(Object.hasOwn(component, 'innerElement'), `${component.name}: innerElement is required`);
	assert.ok(component.docPath, `${component.name}: docPath is required`);
	assert.ok(fs.existsSync(path.join(root, component.docPath)), `${component.name}: docPath must exist`);
	assert.ok(fs.existsSync(path.join(root, component.demoPath)), `${component.name}: demoPath must exist`);
}

const inputEntries = extractPageEntries(path.join(root, 'Playground/pages/components/inputs.html'));
assert.deepEqual(inputEntries.map(entry => entry.name), [
	'nui-input',
	'nui-input-group',
	'nui-textarea',
	'nui-checkbox',
	'nui-radio'
], 'One demo page must expose every JSON-LD component declaration');
for (const entry of inputEntries) {
	assert.equal(entry.docPath, 'documentation/components/input.md',
		'Related declarations share the page documentation');
}

console.log(`ok   all ${registered.size} registered core components are documented exactly once`);
console.log('ok   every core entry has events, innerElement, docPath, and demoPath metadata');
console.log('ok   multiple JSON-LD declarations on one demo page are extracted');
