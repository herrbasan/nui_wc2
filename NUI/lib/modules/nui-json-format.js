// Format adapters for the JSON/YAML grid editor.
//
// The grid does not know what format it is editing. A value is a value; format
// enters at exactly two seams — parse and serialize — and nowhere else. That is
// the whole reason "supports JSON and YAML" is a structural fact here rather than
// a feature that has to be built twice.
//
// ── Contracts, because they differ and the difference matters ─────────────
//
// JSON  · native, TOTAL, exact.
//   parse throws on malformed input and reports a character position.
//   serialize/parse round-trips every JSON value without loss, because a
//   grid can only ever hold a value JSON.parse produced.
//
// YAML  · the subset parser in nui.js. Round-trips everything it emits —
//   proved by nui-format-roundtrip.js — but it is a subset, not YAML 1.2.
//   UNSUPPORTED: block scalars (| and >), flow MAPPINGS ({a: 1}; flow
//   SEQUENCES [a, b] are fine), anchors and aliases, multiple documents,
//   tags, and date/time scalars (a date arrives as a string).
//
//   *** parseYaml DOES NOT REPORT ERRORS. ***
//   It is best-effort: an unparseable line ends a block, a bad indent yields
//   null, and the function returns a partial structure rather than throwing.
//   A try/catch around it catches almost nothing. An editor therefore cannot
//   rely on parse failure to detect a broken document — see verifyYaml below.
//
//   Consequence for the text-owns-the-document model: a structural edit is
//   mutate → serialize → set text → parse → render. If parse is best-effort,
//   "render" can show a document that is not the text. That must be caught at
//   the boundary rather than assumed away.

import { nui } from '../../nui.js';

const JSON_INDENT = 2;

export const jsonFormat = {
	id: 'json',
	label: 'JSON',
	extensions: ['json'],
	indent: JSON_INDENT,
	/** Total: throws on malformed input, with a character position. */
	parse(text) {
		return JSON.parse(text);
	},
	serialize(value) {
		return JSON.stringify(value, null, JSON_INDENT);
	},
};

export const yamlFormat = {
	id: 'yaml',
	label: 'YAML',
	extensions: ['yaml', 'yml'],
	indent: 2,
	/**
	 * Best-effort. Does NOT throw on malformed input — it returns a partial
	 * structure. Call verifyYaml() if you need to know the text was fully
	 * understood. Throws only when handed a non-string.
	 */
	parse(text) {
		return nui.util.parseYaml(text);
	},
	serialize(value) {
		return nui.util.serializeYaml(value);
	},
};

export const FORMATS = { json: jsonFormat, yaml: yamlFormat };

/**
 * Detect the format from a filename, or null when the name does not say.
 * Deliberately does not sniff content: a `.txt` holding JSON is a caller
 * decision, not something to guess at.
 */
export function formatForFilename(name) {
	const ext = String(name).toLowerCase().split('.').pop();
	for (const format of Object.values(FORMATS)) {
		if (format.extensions.includes(ext)) return format;
	}
	return null;
}

/**
 * Did the reader actually understand the whole text?
 *
 * A fixed-point check alone is NOT enough, and that was learned the hard way:
 * parseYaml('hello') returns {}, and {} IS a stable fixed point, so the check
 * passed a document that had been silently thrown away. The reader's own
 * consumption report is what actually catches it — `skipped` (lines indented
 * under nothing that claims them: the signature of a block scalar or a
 * continuation line) and `leftover` (lines never reached).
 *
 * The fixed-point check is kept as a second, independent guard: it is what
 * catches a serializer that emits something its own reader mangles.
 *
 * @returns {{ok: true} | {ok: false, line?: number, reason: string}}
 */
export function verifyYaml(text, parsed) {
	const report = nui.util.parseYamlReport(text);
	const bad = report.leftover[0] || (report.skipped.length ? { line: report.skipped[0], text: '' } : null);
	if (bad) {
		const what = bad.text ? ` — "${bad.text.trim()}"` : '';
		return {
			ok: false,
			line: bad.line,
			reason: `This YAML reader did not understand line ${bad.line}${what}. `
				+ 'The subset behind it has no block scalars (| or >), no flow mappings, '
				+ 'no anchors and no multiple documents, and a truncated read would show '
				+ 'you a shorter document than your file with no error — so it is not being shown.',
		};
	}
	const again = nui.util.parseYaml(nui.util.serializeYaml(parsed));
	if (JSON.stringify(again) !== JSON.stringify(parsed)) {
		return {
			ok: false,
			reason: 'The structure read from this text does not survive being written '
				+ 'back out. Opening it would risk silently changing the file, so it is not being opened.',
		};
	}
	return { ok: true };
}

/**
 * Reject a document the grid cannot represent, loudly and at the boundary.
 *
 * A root scalar is exactly this case: it serializes to `hello`, which the YAML
 * reader returns as {} — so the round trip would silently replace the user's
 * document with an empty map. JSON has no such problem (JSON.stringify('hello')
 * is '"hello"' and parses straight back), which is why this is keyed on format
 * and not baked into the parser.
 *
 * @returns {{ok: true, root: object|Array} | {ok: false, reason: string}}
 */
export function assertEditableRoot(value, format) {
	const kind = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
	if (kind === 'object' || kind === 'array') return { ok: true, root: value };
	return {
		ok: false,
		reason: `A ${format.label} document must be a map or a sequence at its root; `
			+ `this one is a bare ${kind}. Opening it as a grid would destroy it, `
			+ `so it is not being opened.`,
	};
}

export default FORMATS;
