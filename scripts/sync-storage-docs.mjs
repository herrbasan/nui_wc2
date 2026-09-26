// Sync repo docs -> MCP storage documentation/NUI/ (full-copy replacement).
// Storage names: component_<name>.md, addon_<name>.md, guide_<name>.md,
// concept_*.md, reference_cheatsheet.md, README.md (index).
import fs from 'fs';
import path from 'path';

const REPO = 'd:/Work/_GIT/nui_wc2';
const DEST = '//BADKID/Stuff/MCP_Storage/documentation/NUI';
const DATE = '2026-09-26';

const groups = [
	{ prefix: 'component', dir: 'documentation/components' },
	{ prefix: 'addon', dir: 'documentation/addons' },
	{ prefix: 'guide', dir: 'documentation/guides' },
];

function fm(title, source, category, tags, see) {
	const lines = [
		'---',
		`title: ${title}`,
		`source: ${source}`,
		`date: ${DATE}`,
		`category: ${category}`,
		`tags: [${tags.join(', ')}]`,
	];
	if (see && see.length) {
		lines.push('see:');
		for (const s of see) lines.push(`  - ${s}`);
	}
	lines.push('---', '');
	return lines.join('\n');
}

const written = [];
const failures = [];

for (const g of groups) {
	for (const f of fs.readdirSync(path.join(REPO, g.dir))) {
		if (!f.endsWith('.md')) continue;
		const name = f.slice(0, -3);
		const storageName = `${g.prefix}_${name.replace(/-/g, '_')}.md`;
		const body = fs.readFileSync(path.join(REPO, g.dir, f), 'utf8');
		const source = `D:\\Work\\_GIT\\nui_wc2\\${g.dir}\\${f}`;
		const head = fm(
			`${name.replace(/-/g, ' ')} — NUI ${g.prefix}`,
			source,
			`nui-${g.prefix}`,
			['nui', name],
		);
		try {
			fs.writeFileSync(path.join(DEST, storageName), head + body);
			written.push(storageName);
		} catch (e) {
			failures.push(`${storageName}: ${e.message}`);
		}
	}
}

// concept_ax_vs_dx.md <- DOCUMENTATION.md
// concept_data_action.md + reference_cheatsheet.md <- LLM-CHEATSHEET.md
const docMd = fs.readFileSync(path.join(REPO, 'documentation/DOCUMENTATION.md'), 'utf8');
const cheatMd = fs.readFileSync(path.join(REPO, 'LLM-CHEATSHEET.md'), 'utf8');
const special = [
	['concept_ax_vs_dx.md', 'AX vs DX — AI Experience Design', docMd, 'documentation/DOCUMENTATION.md'],
	['concept_data_action.md', 'The data-action System', cheatMd, 'LLM-CHEATSHEET.md'],
	['reference_cheatsheet.md', 'NUI LLM Cheatsheet', cheatMd, 'LLM-CHEATSHEET.md'],
];
for (const [storageName, title, body, srcRel] of special) {
	const source = `D:\\Work\\_GIT\\nui_wc2\\${srcRel}`;
	const head = fm(title, source, storageName.startsWith('reference') ? 'nui-reference' : 'nui-concept', ['nui']);
	try {
		fs.writeFileSync(path.join(DEST, storageName), head + body);
		written.push(storageName);
	} catch (e) {
		failures.push(`${storageName}: ${e.message}`);
	}
}

// Report leftovers in storage with no repo counterpart (not deleted)
const storageFiles = fs.readdirSync(DEST).filter(f => f.endsWith('.md') && f !== 'README.md' && f !== 'Agents.md');
const orphans = storageFiles.filter(f => !written.includes(f));

console.log(`written: ${written.length}`);
if (failures.length) console.log('FAILURES:\n' + failures.join('\n'));

// Verify: read back every storage file and compare against expected content
const stale = [];
for (const f of storageFiles) {
	const dest = path.join(DEST, f);
	if (!fs.existsSync(dest)) { stale.push(`${f}: MISSING`); continue; }
	const actual = fs.readFileSync(dest, 'utf8');
	if (!actual.startsWith('---\ntitle:')) stale.push(`${f}: NO FRONTMATTER (len ${actual.length})`);
	else if (!actual.includes(`date: ${DATE}`)) stale.push(`${f}: STALE DATE (len ${actual.length})`);
}
if (stale.length) console.log('STALE/UNVERIFIED:\n' + stale.join('\n'));
else console.log('verify: all storage files carry fresh frontmatter');

const orphans2 = storageFiles.filter(f => !written.includes(f));
if (orphans2.length) console.log('not in written list: ' + orphans2.join(', '));
