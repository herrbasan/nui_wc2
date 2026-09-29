// Format round-trip suite.
//
// The grid's text owns the document, so every structural edit is
//   mutate structure -> serialize -> set text -> parse -> render
// A shape that cannot survive that cycle corrupts the file SILENTLY: no error,
// no exception, just a document that quietly stops matching what the grid shows.
// This suite is the evidence that the cycle is safe, and the place to add a
// shape the grid can produce.
//
// It runs the SAME fixtures against every registered format, because the grid
// is format-agnostic: whatever shape the view can put on screen, the format
// layer has to be able to write down and read back. A gap in one format is a
// gap in the editor, even when the other format is clean.
//
// JSON passes all of these because JSON.stringify and JSON.parse are total and
// exact. YAML passes them because nui.js's subset parser was fixed to make them
// pass. The difference between those two sentences is the whole story of this
// suite.

import { FORMATS } from './nui-json-format.js';

/** The shapes the grid can produce, plus the ones that have broken before. */
export const FIXTURES = [
	['flat-scalars', { a: 1, b: 'x', c: true, d: null }],
	['nested-map', { a: { b: { c: 1 } } }],
	['array-scalars', { t: ['a', 'b', 'c'] }],
	['array-of-maps', { f: [{ id: 1, n: 'a' }, { id: 2, n: 'b' }] }],
	['array-of-arrays', { m: [[1, 2], [3, 4]] }],
	['empty-array', { e: [] }],
	['empty-map', { e: {} }],
	['empty-nested-both', { e: [], f: {} }],
	['mixed-array', { m: [1, 'a', true, null] }],
	['root-array', ['a', 'b']],

	// Keys. A bare key's colon is read as the key/value separator whatever
	// follows it, so any colon forces quoting — and the reader must then
	// unquote it, or the document comes back with the quote characters in it.
	['key-with-space', { 'my key': 1 }],
	['key-with-colon', { 'a:b': 1 }],
	['key-with-colon-spaces', { 'a: b': 1 }],
	['key-with-quote', { 'say "hi"': 1 }],
	['key-with-apostrophe', { "it's": 1 }],
	['key-with-both-quotes', { ["m'x" + '"y']: 1 }],
	['key-with-backslash', { 'a\\b': 1 }],
	['key-with-hash', { 'a#b': 1 }],
	['key-leading-dash', { '-x': 1 }],
	['key-numeric-looking', { '4096': 'x' }],
	['key-reserved-word', { 'true': 1 }],
	['key-empty', { '': 1 }],
	['numeric-key', { 4096: 'x' }],
	['nested-weird-key', { outer: { 'a:b': { 'c:d': [1, 2] } } }],
	['seq-of-maps-weird-key', { f: [{ 'a:b': 1, 'c d': 2 }] }],

	// Values. A string that LOOKS like another type is the whole reason a grid
	// exists — it must survive as a string, or "2.4.0" silently becomes a number.
	['string-looks-numeric', { v: '4096' }],
	['string-looks-version', { v: '2.4.0' }],
	['string-looks-bool', { v: 'true' }],
	['string-padded-space', { v: '  hi  ' }],
	['string-leading-dash', { v: '-dash' }],
	['string-has-colon-hash', { v: 'a: b #c' }],
	['string-interior-quote', { v: 'he said "hi"' }],
	['string-interior-quote-hash', { v: 'he said "hi" # tag' }],
	['string-apostrophe', { v: "it's" }],
	['string-backslash', { v: 'C:\\path\\to' }],
	['empty-string-value', { v: '' }],
	['unicode', { v: 'héllo → 🎉' }],

	// Newlines are lost, not just misread: the reader is line-oriented.
	['multiline-string', { v: 'line1\nline2' }],

	['deep-5', { a: { b: { c: { d: { e: 1 } } } } }],
	['ragged-array-of-maps', { f: [{ a: 1 }, { b: 2 }] }],
	['array-of-array-of-maps', { f: [[{ a: 1 }]] }],

	// The reference document from docs/json-grid-reference.md, verbatim.
	['reference-sample', {
		product: 'JSON Toolkit',
		version: '2.4.0',
		private: false,
		stars: 4096,
		tags: ['formatter', 'viewer', 'converter'],
		maintainer: { name: 'Ada Lovelace', email: 'ada@jsontoolkit.io', verified: true },
		features: [
			{ id: 1, name: 'Beautify', enabled: true },
			{ id: 2, name: 'Minify', enabled: true },
			{ id: 3, name: 'Validate', enabled: true },
		],
		release: { date: '2026-05-01', notes: null, downloads: 1284903 },
	}],
];

/**
 * Accepted, known, and KEPT IN THE SUITE. A gap that is not tested is a gap
 * that gets rediscovered as a bug. Keyed by format id because the same shape
 * can be fine in one format and impossible in another — a root scalar
 * round-trips through JSON cleanly and is unrepresentable in this YAML subset,
 * which is exactly why the root check lives in the editor and not the parser.
 */
export const ACCEPTED_GAPS = {
	yaml: new Set(['root-scalar']),
	json: new Set(),
};

export const EXTRA_FIXTURES = [['root-scalar', 'hello']];

function runOne(format, name, value, accepted) {
	// JSON.stringify compares key ORDER too. Insertion order is document order,
	// and the editor must not reorder a human's file behind their back — so a
	// reordering is a real failure, not a cosmetic one.
	const want = JSON.stringify(value);
	let text;
	try {
		text = format.serialize(value);
	} catch (e) {
		return { name, ok: false, stage: 'serialize', err: String(e) };
	}
	let parsed;
	try {
		parsed = format.parse(text);
	} catch (e) {
		return { name, ok: false, stage: 'parse', err: String(e), y: text };
	}
	const got = JSON.stringify(parsed);
	return got === want ? { name, ok: true } : { name, ok: false, y: text, want, got, accepted };
}

/**
 * @returns {Array<{id:string,label:string,total:number,passed:number,failed:Array,accepted:Array}>}
 *   one entry per registered format, in FORMATS order.
 */
export function runFormatRoundtrip(formats = FORMATS) {
	return Object.values(formats).map(format => {
		const acceptedFor = ACCEPTED_GAPS[format.id] || new Set();
		const fixtures = [...FIXTURES, ...EXTRA_FIXTURES];
		const results = fixtures.map(([name, value]) => runOne(format, name, value, acceptedFor.has(name)));
		const failed = results.filter(r => !r.ok && !r.accepted);
		const accepted = results.filter(r => !r.ok && r.accepted);
		return {
			id: format.id,
			label: format.label,
			total: results.length,
			passed: results.length - failed.length - accepted.length,
			clean: failed.length === 0,
			results,
			failed,
			accepted,
		};
	});
}

export default runFormatRoundtrip;
