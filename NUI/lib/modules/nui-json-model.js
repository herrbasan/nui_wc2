// JSON/YAML document model — pure functions, no DOM.
//
// The format layer (nui-json-format.js) knows how to read and write text. This
// module knows how to address and change a STRUCTURE, and — this is the point —
// it never changes one without going back through the text.
//
// There is exactly one function that produces a new document: applyEdit(). Every
// other operation here is a pure structure mutation, and applyEdit() is the only
// path from a mutation to a document. There is no second way to write.
//
//   clone -> mutate -> serialize -> RE-PARSE -> verify -> assert root -> return
//                              ^^^^^^^^^^^^^^^^
//                              The re-parse is the whole design. A value that
//                              cannot survive serialize→parse is REJECTED, so the
//                              text never changes. Four silent round-trip
//                              corruptions were found in nui.js by the suite in
//                              nui-format-roundtrip.js; re-parsing on every commit
//                              is what turns the next one into a thrown error
//                              instead of a quietly ruined file.

import { FORMATS, verifyYaml, assertEditableRoot } from './nui-json-format.js';

export const TYPES = ['string', 'number', 'boolean', 'null', 'object', 'array'];

// ── Paths (JSON Pointer, RFC 6901) ──────────────────────────────────────
// A pointer is the wire format — it is what a "copy path" menu item hands the
// clipboard, and it is what survives a round trip through a URL or a diff. Paths
// are accepted as arrays internally because parsing one per keystroke is waste.

export function escapeToken(token) {
	return String(token).replace(/~/g, '~0').replace(/\//g, '~1');
}

export function unescapeToken(token) {
	return String(token).replace(/~1/g, '/').replace(/~0/g, '~');
}

export function toPointer(path) {
	return path.length === 0 ? '' : '/' + path.map(escapeToken).join('/');
}

export function parsePointer(pointer) {
	if (pointer === '' || pointer === '#') return [];
	if (pointer[0] !== '/') throw new Error(`JSON Pointer must start with "/": got "${pointer}"`);
	return pointer.slice(1).split('/').map(unescapeToken);
}

const asPath = (path) => (typeof path === 'string' ? parsePointer(path) : path);

function parentOf(root, path) {
	let node = root;
	for (let i = 0; i < path.length - 1; i++) {
		node = node[Array.isArray(node) ? Number(path[i]) : path[i]];
		if (node === undefined) throw new Error(`Path ${toPointer(path)} does not exist: ${toPointer(path.slice(0, i + 1))} is missing`);
	}
	return node;
}

// ── Reads ───────────────────────────────────────────────────────────────

export function typeOf(value) {
	if (value === null) return 'null';
	if (Array.isArray(value)) return 'array';
	return typeof value;
}

export function getAt(root, path) {
	const p = asPath(path);
	if (p.length === 0) return root;
	const node = parentOf(root, p);
	const key = Array.isArray(node) ? Number(p[p.length - 1]) : p[p.length - 1];
	const found = node[key];
	if (found === undefined) throw new Error(`No value at ${toPointer(p)}`);
	return found;
}

export function hasAt(root, path) {
	const p = asPath(path);
	let node = root;
	for (const token of p) {
		if (node === null || typeof node !== 'object') return false;
		const key = Array.isArray(node) ? Number(token) : token;
		if (!Object.prototype.hasOwnProperty.call(node, key)) return false;
		node = node[key];
	}
	return true;
}

// ── Pure structure mutations — each returns a NEW structure ─────────────
// structuredClone, not JSON round-trip: a value that cannot be cloned (a
// function, a symbol) should throw here, where the call site is, rather than
// vanish into a serializer.

export function setAt(root, path, value) {
	const p = asPath(path);
	if (p.length === 0) throw new Error('Cannot set the document root — replace the document instead');
	const next = structuredClone(root);
	const parent = parentOf(next, p);
	const token = p[p.length - 1];
	parent[Array.isArray(parent) ? Number(token) : token] = structuredClone(value);
	return next;
}

export function removeAt(root, path) {
	const p = asPath(path);
	if (p.length === 0) throw new Error('Cannot remove the document root — the document would be nothing');
	const next = structuredClone(root);
	const parent = parentOf(next, p);
	const key = Array.isArray(parent) ? Number(p[p.length - 1]) : p[p.length - 1];
	if (Array.isArray(parent)) parent.splice(key, 1);
	else delete parent[key];
	return next;
}

/** Insert into an array (splice at index) or add a key to an object. */
export function insertAt(root, path, value) {
	const p = asPath(path);
	if (p.length === 0) throw new Error('Cannot insert at the document root');
	const next = structuredClone(root);
	const parent = parentOf(next, p);
	const token = p[p.length - 1];
	if (Array.isArray(parent)) {
		const index = Number(token);
		if (!Number.isInteger(index) || index < 0 || index > parent.length) {
			throw new Error(`Array index out of range: ${index} (length ${parent.length})`);
		}
		parent.splice(index, 0, structuredClone(value));
	} else {
		if (Object.prototype.hasOwnProperty.call(parent, token)) {
			throw new Error(`"${token}" already exists at ${toPointer(p)}`);
		}
		parent[token] = structuredClone(value);
	}
	return next;
}

/**
 * Rename an object key in place, preserving its POSITION. Rebuilding the object
 * instead would move the key to the end, and the editor must not reorder a
 * human's file behind their back.
 */
export function renameKey(root, path, newName) {
	const p = asPath(path);
	if (p.length === 0) throw new Error('Cannot rename the document root');
	const next = structuredClone(root);
	const parent = parentOf(next, p);
	if (Array.isArray(parent)) throw new Error('Array entries are indexed, not named — use move instead');
	const oldName = p[p.length - 1];
	if (!newName) throw new Error('A property needs a name');
	if (oldName === newName) return next;
	if (Object.prototype.hasOwnProperty.call(parent, newName)) {
		throw new Error(`"${newName}" already exists at ${toPointer(p.slice(0, -1))}`);
	}
	const rebuilt = {};
	for (const [k, v] of Object.entries(parent)) {
		rebuilt[k === oldName ? newName : k] = k === oldName ? v : structuredClone(v);
	}
	for (const k of Object.keys(parent)) delete parent[k];
	Object.assign(parent, rebuilt);
	return next;
}

export function moveAt(root, path, delta) {
	const p = asPath(path);
	const next = structuredClone(root);
	const parent = parentOf(next, p);
	if (!Array.isArray(parent)) throw new Error('Only array entries can be moved; properties are reordered by renaming, not by position');
	const from = Number(p[p.length - 1]);
	const to = from + delta;
	if (to < 0 || to >= parent.length) throw new Error(`Cannot move index ${from} by ${delta}: out of range (length ${parent.length})`);
	const [item] = parent.splice(from, 1);
	parent.splice(to, 0, item);
	return next;
}

// ── Types ───────────────────────────────────────────────────────────────

const CREATION_DEFAULTS = { string: '', number: 0, boolean: false, object: {}, array: [] };
const isContainer = (t) => t === 'object' || t === 'array';

/**
 * Coerce a value to another type, or REFUSE. There is no lossy path.
 *
 * Converting a container to a scalar would throw away data, so it throws rather
 * than guessing a summary — "type changes destroy data" is only safe if the
 * editor says which, every time. A null converts to anything (that is a
 * creation, not a conversion) and identical types pass through untouched.
 *
 * @returns {{ok: true, value: *}|{ok: false, reason: string}}
 */
export function convertTo(value, target) {
	if (!TYPES.includes(target)) throw new Error(`Unknown type "${target}" — expected one of ${TYPES.join(', ')}`);
	const from = typeOf(value);
	if (from === target) return { ok: true, value };
	if (target === 'null') return { ok: true, value: null };

	if (from === 'null') return { ok: true, value: structuredClone(CREATION_DEFAULTS[target]) };

	if (isContainer(from) || isContainer(target)) {
		const detail = isContainer(from)
			? `${from} with ${typeOf(value) === 'array' ? value.length : Object.keys(value).length} ${isContainer(from) && typeOf(value) === 'array' ? 'entries' : 'keys'}`
			: from;
		return {
			ok: false,
			reason: `Converting a ${detail} to ${target} would discard it. `
				+ `Delete it instead, or add a ${target} alongside it.`,
		};
	}

	if (target === 'string') return { ok: true, value: String(value) };
	if (target === 'number') {
		if (from === 'boolean') return { ok: true, value: value ? 1 : 0 };
		const n = Number(value);
		if (value.trim() === '' || Number.isNaN(n)) return { ok: false, reason: `"${value}" is not a number` };
		return { ok: true, value: n };
	}
	if (target === 'boolean') {
		if (from === 'number') return { ok: true, value: value !== 0 };
		const s = String(value).toLowerCase();
		if (s === 'true') return { ok: true, value: true };
		if (s === 'false') return { ok: true, value: false };
		return { ok: false, reason: `"${value}" is not a boolean — write true or false` };
	}
	throw new Error(`Unhandled conversion ${from} → ${target}`);
}

/**
 * The type a new value should get, inferred from what is already in the same
 * column. This is the cheap, high-value half of "context sensitive": adding a
 * property to a column of numbers should not require picking "number" from a
 * menu to get a `0` instead of `""`.
 */
export function inferColumnType(values) {
	const counts = new Map();
	for (const v of values) {
		const t = typeOf(v);
		if (t === 'null') continue;
		counts.set(t, (counts.get(t) || 0) + 1);
	}
	if (counts.size === 0) return 'string';
	let best = null, bestN = 0;
	for (const [t, n] of counts) {
		if (n > bestN) { best = t; bestN = n; }
	}
	if (bestN * 2 <= values.length) return 'mixed';
	return best;
}

// ── The single writer ───────────────────────────────────────────────────

/**
 * Open a document. Throws with a reason rather than returning something the
 * grid cannot safely edit.
 */
export function openDocument(text, formatId) {
	const format = FORMATS[formatId];
	if (!format) throw new Error(`Unknown format "${formatId}"`);
	if (typeof text !== 'string') throw new Error('Document text must be a string');
	const root = assertEditableRoot(format.parse(text), format);
	if (!root.ok) throw new Error(root.reason);
	if (formatId === 'yaml') {
		const verdict = verifyYaml(text, root.root);
		if (!verdict.ok) throw new Error(verdict.reason);
	}
	return { text, structure: root.root, format };
}

/**
 * The ONLY way to produce a new document. `mutate` receives a clone and returns
 * a structure; this function serializes it, parses it back, and REFUSES the
 * edit unless the text is a faithful representation of the mutation.
 *
 * @param {{text:string, formatId:string, mutate:(draft:object)=>object, label?:string}} edit
 * @returns {{text:string, structure:object, format:object, label?:string}}
 * @throws  if the root is uneditable, if the format is truncated, if serialize
 *          throws, or — the important one — if the serialized text does not
 *          parse back to the mutated structure.
 */
export function applyEdit({ text, formatId, mutate, label }) {
	const format = FORMATS[formatId];
	if (!format) throw new Error(`Unknown format "${formatId}"`);
	const { structure } = openDocument(text, formatId);

	const mutated = mutate(structuredClone(structure));
	const rootCheck = assertEditableRoot(mutated, format);
	if (!rootCheck.ok) throw new Error(rootCheck.reason);

	const nextText = format.serialize(rootCheck.root);
	if (typeof nextText !== 'string') throw new Error('The serializer returned no text');

	// Re-read what was actually written. This is the text contract enforced at
	// runtime rather than assumed from a test suite.
	const reparsed = format.parse(nextText);
	if (JSON.stringify(reparsed) !== JSON.stringify(rootCheck.root)) {
		throw new Error(
			`Refusing the edit${label ? ` "${label}"` : ''}: the ${format.label} text it produced `
			+ 'does not read back as the same document. The text has not been changed.'
		);
	}
	if (formatId === 'yaml') {
		const verdict = verifyYaml(nextText, reparsed);
		if (!verdict.ok) throw new Error(verdict.reason);
	}
	return { text: nextText, structure: rootCheck.root, format, label };
}

/**
 * What does this piece of text MEAN, according to the format's own reader?
 *
 * The cell badge displays the type; it does not CONSTRAIN it. If a cell holds a
 * string and you type 42, the honest result is the number 42 — because the text
 * is the truth, and `v: 42` reads back as a number. Forcing a quote to preserve
 * the badge would put a display concern in charge of the document.
 *
 * So the question is answered by asking the format itself, never by a second set
 * of rules here: a second opinion is exactly how a grid and a parser come to
 * disagree about the same file. For YAML that means running the real reader over
 * a probe line, so `true`, `4096`, `null` and `hello` are classified by the same
 * code that will later read the document back.
 *
 * A container is refused: a cell edits a LEAF. Pasting `{"a":1}` into a scalar
 * cell is a structural edit, and it goes through the grid, not the cell.
 *
 * @returns {{ok: true, value: *} | {ok: false, reason: string}}
 */
export function coerceScalar(text, formatId) {
	const format = FORMATS[formatId];
	if (!format) throw new Error(`Unknown format "${formatId}"`);
	if (typeof text !== 'string') throw new Error('Cell text must be a string');

	let value;
	if (formatId === 'json') {
		try { value = JSON.parse(text); }
		catch { value = text; }   // a bare word is a string; JSON only types valid literals
	} else {
		// A trailing newline is required: without it the last line is never
		// consumed, and the reader would report the probe as truncated.
		const probe = `__coerce__: ${text}\n`;
		const parsed = nui.util.parseYamlReport(probe);
		if (parsed.skipped.length || parsed.leftover.length) {
			return { ok: false, reason: `"${text}" spans more than one line, which a single cell cannot hold.` };
		}
		value = parsed.value.__coerce__;
	}

	if (value !== null && typeof value === 'object') {
		return { ok: false, reason: 'That is a map or a list, not a single value. Add it as a property instead.' };
	}
	if (value === undefined) {
		return { ok: false, reason: 'An empty cell has no value yet — give it one, or delete the property.' };
	}
	return { ok: true, value };
}

// ── Undo ────────────────────────────────────────────────────────────────
// Free, and only because text owns the document. No structural undo logic, no
// DOM snapshots — just the strings that were true at each point.

export function createHistory(initialText, limit = 200) {
	let past = [initialText];
	let present = initialText;
	let future = [];
	let lastCoalesceKey = null;
	let lastAt = -Infinity;

	return {
		current: () => present,
		canUndo: () => past.length > 1,
		canRedo: () => future.length > 0,
		/**
		 * @param {string} text the new document text
		 * @param {string} [coalesceKey] consecutive edits with the same key
		 *   within `coalesceMs` collapse into one undo step — typing in a cell is
		 *   one intention, not one step per keystroke.
		 */
		push(text, coalesceKey, coalesceMs = 600, now = 0) {
			if (text === present) return;
			const coalesce = coalesceKey !== undefined && coalesceKey === lastCoalesceKey && now - lastAt <= coalesceMs;
			if (!coalesce) {
				past.push(present);
				if (past.length > limit) past.shift();
			}
			present = text;
			future = [];
			lastAt = now;
			lastCoalesceKey = coalesceKey;
		},
		undo() {
			if (past.length <= 1) return null;
			future.unshift(present);
			present = past.pop();
			lastCoalesceKey = null;
			return present;
		},
		redo() {
			if (future.length === 0) return null;
			past.push(present);
			present = future.shift();
			lastCoalesceKey = null;
			return present;
		},
	};
}

export default {
	openDocument, applyEdit, createHistory, coerceScalar,
	getAt, hasAt, setAt, removeAt, insertAt, renameKey, moveAt,
	typeOf, convertTo, inferColumnType, toPointer, parsePointer,
};
