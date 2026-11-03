#!/usr/bin/env node
'use strict';

/*
	Zero-dependency test runner for the MD-Blocks parser.

	  node parser/test/run.js            run everything
	  node parser/test/run.js --report   print what the parser says about each fixture document
	  node parser/test/run.js <filter>   only cases whose name contains <filter>

	Two suites: the §10 conformance cases in conformance.js, and the real-world documents in
	fixtures/ — the md-blocks demo set and the archived model test-runs, so the parser is measured
	against documents that were written by someone who had only read the spec.
*/

const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

const core = require('../md-blocks.js');
const cases = require('./conformance.js');

const FIXTURE_DIR = path.join(__dirname, 'fixtures');
const EXPECTATIONS = path.join(FIXTURE_DIR, 'expectations.json');

let passed = 0;
const failures = [];

function pass() { passed++; }

function fail(name, detail) {
	failures.push({ name, detail });
}

function show(value) {
	return JSON.stringify(value, (key, val) => (val === undefined ? '<undefined>' : val));
}

function deepEqual(a, b) {
	if (a === b) return true;
	if (typeof a !== typeof b) return false;
	if (a === null || b === null) return false;
	if (Array.isArray(a) !== Array.isArray(b)) return false;
	if (typeof a !== 'object') return false;
	const aKeys = Object.keys(a);
	const bKeys = Object.keys(b);
	if (aKeys.length !== bKeys.length) return false;
	for (const key of aKeys) {
		if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
		if (!deepEqual(a[key], b[key])) return false;
	}
	return true;
}

function resolvePath(root, expression) {
	const normalised = String(expression)
		.replace(/\[(\d+)\]/g, '.$1')
		.replace(/\[["']([^"']+)["']\]/g, '.$1');
	return normalised.split('.').filter((key) => key !== '').reduce((value, key) => {
		if (value === null || value === undefined) return undefined;
		return value[key];
	}, root);
}

function countTree(doc) {
	const counts = { mains: 0, sections: 0, markdown: 0, blocks: 0, columns: 0, cols: 0, vars: 0 };
	const walk = (node) => {
		if (node.type === 'markdown') { counts.markdown++; return; }
		if (node.type === 'block') { counts.blocks++; return; }
		if (node.type === 'columns') {
			counts.columns++;
			for (const column of node.cols) {
				counts.cols++;
				for (const child of column.children) walk(child);
			}
		}
	};
	counts.mains = doc.mains.length;
	for (const main of doc.mains) {
		for (const section of main.sections) {
			counts.sections++;
			counts.vars += section.vars.length;
			for (const child of section.children) walk(child);
		}
	}
	return counts;
}

// Nothing may disappear: every non-blank source line must be either content owned by a node or
// structure (a directive marker, a section separator). Anything else is text the parser swallowed
// — the failure mode a tree alone cannot show.
function coverageGaps(source, doc) {
	const lines = source.replace(/\r\n?/g, '\n').split('\n');
	const covered = new Array(lines.length + 2).fill(false);
	const mark = (from, to) => {
		for (let i = Math.max(1, from); i <= Math.min(lines.length, to); i++) covered[i] = true;
	};
	if (doc.frontmatter) mark(doc.frontmatter.line, doc.frontmatter.endLine);

	const walkChild = (node) => {
		if (node.type === 'columns') {
			for (const column of node.cols) for (const child of column.children) walkChild(child);
			return;
		}
		mark(node.line, node.endLine);
	};

	for (const main of doc.mains) {
		for (const section of main.sections) {
			for (const item of section.vars) mark(item.line, item.endLine);
			for (const child of section.children) walkChild(child);
		}
	}

	const gaps = [];
	for (let i = 1; i <= lines.length; i++) {
		const text = lines[i - 1];
		if (covered[i] || !text.trim()) continue;
		if (/^ {0,3}<!--[ \t]*mb:/.test(text)) continue;
		if (/^ {0,3}(?:(?:-[ \t]*){3,}|(?:\*[ \t]*){3,}|(?:_[ \t]*){3,})$/.test(text)) continue;
		gaps.push(i);
	}
	return gaps;
}

// Every parse must produce a tree a consumer can walk without defending itself: the §8 shape,
// with a location on every node.
function treeProblems(doc) {
	const problems = [];
	const where = (node) => `${node.type} at line ${node.line}`;
	if (!Array.isArray(doc.mains) || !doc.mains.length) problems.push('document has no mains');
	if (!Array.isArray(doc.diagnostics)) problems.push('document has no diagnostics array');

	const checkNode = (node) => {
		if (!node || typeof node !== 'object') { problems.push('a child is not a node'); return; }
		if (typeof node.line !== 'number' || typeof node.endLine !== 'number') problems.push(`${where(node)}: missing line/endLine`);
		if (node.type === 'markdown' && typeof node.markdown !== 'string') problems.push(`${where(node)}: markdown is not a string`);
		if (node.type === 'block') {
			if (typeof node.markdown !== 'string') problems.push(`${where(node)}: markdown is not a string`);
			if (!node.attrs || typeof node.attrs !== 'object') problems.push(`${where(node)}: attrs missing`);
		}
		if (node.type === 'columns') {
			if (!Array.isArray(node.cols)) problems.push(`${where(node)}: cols missing`);
			else for (const column of node.cols) checkNode(column);
		}
		if (node.type === 'col' || node.type === 'section') {
			if (!Array.isArray(node.children)) problems.push(`${where(node)}: children missing`);
			else for (const child of node.children) checkNode(child);
		}
	};

	for (const main of doc.mains) {
		if (typeof main.line !== 'number') problems.push('a main has no line');
		if (!Array.isArray(main.sections) || !main.sections.length) problems.push('a main has no sections');
		for (const section of main.sections || []) checkNode(section);
	}
	return problems;
}

function projectDiagnostics(doc) {
	return doc.diagnostics.map((entry) => ({ severity: entry.severity, code: entry.code, line: entry.line }));
}

function check(source, expectation, options) {
	const problems = [];
	const doc = core.parse(source, options);
	problems.push(...treeProblems(doc));

	if (expectation.clean === true && core.errorsOf(doc).length) {
		problems.push(`expected no errors, got ${show(projectDiagnostics(doc).filter((d) => d.severity === 'error'))}`);
	}
	if (expectation.clean === true) {
		const gaps = coverageGaps(source, doc);
		if (gaps.length) problems.push(`source lines owned by no node: ${gaps.join(', ')}`);
	}
	if (expectation.clean === false && !core.errorsOf(doc).length) {
		problems.push('expected at least one error, got none');
	}
	if (expectation.diagnostics) {
		const actual = projectDiagnostics(doc);
		if (!deepEqual(actual, expectation.diagnostics)) {
			problems.push(`diagnostics mismatch\n    expected ${show(expectation.diagnostics)}\n    actual   ${show(actual)}`);
		}
	}
	if (expectation.counts) {
		const actual = countTree(doc);
		for (const key of Object.keys(expectation.counts)) {
			if (actual[key] !== expectation.counts[key]) {
				problems.push(`count ${key}: expected ${expectation.counts[key]}, got ${actual[key]} (${show(actual)})`);
			}
		}
	}
	for (const probe of expectation.select || []) {
		const actual = resolvePath(doc, probe.path);
		if (!deepEqual(actual, probe.expect)) {
			problems.push(`${probe.path}: expected ${show(probe.expect)}, got ${show(actual)}`);
		}
	}
	for (const probe of expectation.find || []) {
		const list = resolvePath(doc, probe.path);
		if (!Array.isArray(list)) {
			problems.push(`find ${probe.key}=${probe.value}: ${probe.path} is not an array`);
			continue;
		}
		const found = list.find((item) => item && (item[probe.key] === probe.value ||
			(item.attrs && item.attrs[probe.key] === probe.value)));
		if (!found) {
			problems.push(`find ${probe.key}=${probe.value}: not present in ${probe.path}`);
			continue;
		}
		for (const sub of probe.select || []) {
			const actual = resolvePath(found, sub.path);
			if (!deepEqual(actual, sub.expect)) {
				problems.push(`${probe.key}=${probe.value} ${sub.path}: expected ${show(sub.expect)}, got ${show(actual)}`);
			}
		}
	}
	return problems;
}

/* --------------------------------------------------------------------- run */

async function main() {
	const args = process.argv.slice(2);
	const report = args.indexOf('--report') !== -1;
	const filter = args.find((arg) => arg.indexOf('--') !== 0);

	// 1. module shape, and the two entry points agreeing
	if (typeof core.parse !== 'function') fail('module: CJS entry exposes parse()', 'parse is not a function');
	else pass();
	if (core.SPEC_VERSION !== '1.10') fail('module: SPEC_VERSION is 1.10', `got ${core.SPEC_VERSION}`);
	else pass();

	try {
		const esm = await import(pathToFileURL(path.join(__dirname, '..', 'md-blocks.mjs')).href);
		if (typeof esm.parse !== 'function') throw new Error('parse is not a function');
		const viaCjs = core.parse('<!-- mb:block -->\n![a](a.jpg)\n<!-- mb:/block -->');
		const viaEsm = esm.parse('<!-- mb:block -->\n![a](a.jpg)\n<!-- mb:/block -->');
		if (!deepEqual(viaCjs, viaEsm)) throw new Error('ESM and CJS entries produced different trees');
		pass();
	} catch (error) {
		fail('module: ESM entry parses identically to CJS', error.message);
	}

	try {
		core.parseOrThrow('<!-- mb:block -->\ntext\n<!-- mb:/block -->');
		pass();
	} catch (error) {
		fail('module: parseOrThrow accepts a valid document', error.message);
	}

	try {
		core.parseOrThrow('<!-- mb:/main -->');
		fail('module: parseOrThrow throws on an invalid document', 'it returned');
	} catch (error) {
		if (error.name === 'MDBlocksError' && Array.isArray(error.diagnostics)) pass();
		else fail('module: parseOrThrow throws on an invalid document', `wrong error: ${error.name} ${error.message}`);
	}

	// The coverage invariant is only worth having if it can see a gap — feed it one.
	{
		const source = [
			'<!-- mb:columns -->',
			'stray content',
			'<!-- mb:col -->',
			'A',
			'<!-- mb:col -->',
			'B',
			'<!-- mb:/columns -->',
		].join('\n');
		const gaps = coverageGaps(source, core.parse(source));
		if (gaps.indexOf(2) !== -1) pass();
		else fail('harness: coverage check detects a dropped line', `expected line 2 in the gaps, got ${show(gaps)}`);
	}

	// 2. conformance cases
	for (const testCase of cases) {
		if (filter && testCase.name.indexOf(filter) === -1) continue;
		const problems = check(testCase.src, testCase, testCase.options);
		if (problems.length) fail(`${testCase.spec} ${testCase.name}`, problems.join('\n    '));
		else pass();
	}

	// 3. real-world documents
	if (fs.existsSync(FIXTURE_DIR)) {
		const expectations = fs.existsSync(EXPECTATIONS)
			? JSON.parse(fs.readFileSync(EXPECTATIONS, 'utf8'))
			: {};
		const files = fs.readdirSync(FIXTURE_DIR).filter((file) => file.endsWith('.md')).sort();

		for (const file of files) {
			if (filter && file.indexOf(filter) === -1) continue;
			const source = fs.readFileSync(path.join(FIXTURE_DIR, file), 'utf8');
			const expectation = expectations[file];

			if (report) {
				const doc = core.parse(source);
				console.log(`\n=== ${file}  (${expectation ? expectation.source || 'no provenance' : 'NO EXPECTATION'})`);
				console.log(`    counts ${show(countTree(doc))}`);
				for (const entry of doc.diagnostics) {
					console.log(`    ${entry.severity} ${entry.code} line ${entry.line}: ${entry.message}`);
				}
				continue;
			}

			if (!expectation) {
				fail(`fixture ${file}`, 'has no entry in fixtures/expectations.json');
				continue;
			}
			const problems = check(source, expectation);
			if (problems.length) fail(`fixture ${file}`, problems.join('\n    '));
			else pass();
		}
	}

	if (report) return;

	console.log(`\n${passed} passed, ${failures.length} failed`);
	if (failures.length) {
		console.log('');
		for (const failure of failures) console.log(`FAIL  ${failure.name}\n    ${failure.detail}`);
		process.exitCode = 1;
	}
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
