// ----------------------------------------------------------
// MD-Blocks renderer — DOM-free
// ----------------------------------------------------------
//
// The rendering half of the MD-Blocks format, separated from the library so it can be
// imported outside a browser. `nui.js` extends HTMLElement and cannot be loaded in Node,
// so a Node or SSR consumer had no way to render MD-Blocks at all.
//
// Nothing in this file touches the DOM. The browser-side enhancement passes — the
// slideshow, the players, the narration controls, the broken-media markers — stay in
// nui.js, because they need elements to attach to.
//
// The parser is the environment-free module beside this file (./md-blocks.js), the one
// implementation every consumer shares. It is imported for its side effect, and read
// from the global it publishes: a `.js` import rather than a `.mjs` one, because GitHub
// Pages has a documented history of serving `.mjs` as `text/html`, which would block
// module loading and take the whole library down.

import './md-blocks.js';

// The parser publishes its API on the global. Reading it here is the one place the
// renderer depends on the parser, so a missing or broken module fails loudly instead of
// rendering nothing.
const MDBlocks = globalThis.MDBlocks;
if (!MDBlocks || typeof MDBlocks.parse !== 'function') {
	throw new Error('NUI: the MD-Blocks parser (./md-blocks.js) did not publish MDBlocks');
}


// List parser for markdownToHtml. Line-based; handles flat, loose
// (blank-line-separated) and nested lists. Lists never span an existing HTML
// block (headers, tables, etc.) or a code-block token — those always terminate.
function parseLists(text) {
	const lines = text.split('\n');
	const out = [];
	let i = 0;

	const isListItem = (line) => {
		const m = line.match(/^([ \t]*)(-|\*|\d+\.)\s+(.*)$/);
		if (!m) return null;
		return { indent: m[1].replace(/\t/g, '    ').length, ordered: /^\d/.test(m[2]), content: m[3] };
	};

	while (i < lines.length) {
		const item = isListItem(lines[i]);
		if (!item) { out.push(lines[i]); i++; continue; }

		const rootTag = item.ordered ? 'ol' : 'ul';
		const stack = [];
		let html = '';

		const openList = (tag, indent) => {
			html += `<${tag}>`;
			stack.push({ tag, indent, liOpen: false });
		};
		const closeLi = () => {
			const top = stack[stack.length - 1];
			if (top && top.liOpen) { html += '</li>'; top.liOpen = false; }
		};
		const closeList = () => {
			closeLi();              // close this level's open <li>
			const top = stack.pop();
			html += `</${top.tag}>`;
		};

		while (i < lines.length) {
			const line = lines[i];
			const trimmed = line.trim();

			// Blank line: loose-list separator — may continue the list
			if (trimmed === '') {
				let j = i;
				while (j < lines.length && lines[j].trim() === '') j++;
				const next = j < lines.length ? isListItem(lines[j]) : null;
				if (next) { i = j; continue; }
				i = j;
				break;
			}

			const it = isListItem(line);
			if (!it) {
				// Non-item line: continuation of current item if deeper-indented,
				// otherwise the list ends here
				const indent = line.match(/^[ \t]*/)[0].replace(/\t/g, '    ').length;
				if (stack.length && stack[stack.length - 1].liOpen && indent > stack[stack.length - 1].indent) {
					html += ' ' + trimmed;
					i++;
					continue;
				}
				break;
			}

			if (stack.length === 0) {
				openList(rootTag, it.indent);
			} else if (it.indent > stack[stack.length - 1].indent) {
				// Nested list — opens inside the current <li> (do NOT close the li)
				openList(it.ordered ? 'ol' : 'ul', it.indent);
			} else {
				// Same or lower indent: close deeper lists, then this level's <li>
				while (stack.length > 1 && it.indent < stack[stack.length - 1].indent) closeList();
				if (it.indent < stack[0].indent) break;
				closeLi();
			}

			html += `<li>${it.content}`;
			stack[stack.length - 1].liOpen = true;
			i++;
		}

		while (stack.length) closeList();
		// Hard block boundary after the list so following text is not glued on
		out.push(html + '\n');
	}

	return out.join('\n');
}
// ---------------------------------------------------------------------------
// YAML frontmatter support
// ---------------------------------------------------------------------------
// Minimal YAML-subset parser for document frontmatter. Handles the shapes that
// appear in real frontmatter: nested maps, sequences of scalars, sequences of
// maps, quoted scalars, numbers, booleans, null, and inline flow sequences.

function fmEscape(s) {
	return String(s)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}
// parseYaml is BEST-EFFORT and reports nothing: an unreadable line ends a block
// and the function returns a partial structure. That is unacceptably silent for
// an editor whose text owns the document — a file the reader half-understood
// would be shown as a shorter document with no error anywhere.
//
// This is the reporting variant. `skipped` collects lines the reader stepped
// over (content indented under nothing that claims it — the signature of a block
// scalar or a continuation line, neither of which the subset supports), and
// `leftover` collects meaningful lines the reader never reached. Either being
// non-empty means the text was NOT fully understood, and says where.
function parseYamlReport(src) {
	if (typeof src !== 'string') return { value: {}, skipped: [], leftover: [] };
	const lines = src.replace(/\r\n/g, '\n').split('\n');
	const skipped = [];
	let i = 0;

	const indentOf = (line) => line.match(/^[ \t]*/)[0].replace(/\t/g, '    ').length;

	const stripComment = (s) => {
		let inS = false, inD = false;
		for (let k = 0; k < s.length; k++) {
			const c = s[k];
			if (c === '\\' && inD) { k++; continue; }
			if (c === "'" && !inD) inS = !inS;
			else if (c === '"' && !inS) inD = !inD;
			else if (c === '#' && !inS && !inD && (k === 0 || /\s/.test(s[k - 1]))) return s.slice(0, k);
		}
		return s;
	};

	// Split a "key: value" line at the first colon that is OUTSIDE quotes, or
	// return null when the line carries no key at all. A regex cannot do this:
	// a quoted key containing a colon ("a:b": 1) splits mid-string, and the old
	// /^([^:]+):(.*)$/ silently produced {"a": "b": 1}.
	// Backslash escapes matter here exactly as they do in stripComment: without
	// them the escaped quote in "m'x\"y": 1 closed the string early, leaving the
	// separator colon "inside" a string that was already closed, and the whole
	// entry parsed away as {}.
	const splitKey = (line) => {
		let inS = false, inD = false;
		for (let k = 0; k < line.length; k++) {
			const c = line[k];
			if (c === '\\' && inD) { k++; continue; }
			if (c === "'" && !inD) inS = !inS;
			else if (c === '"' && !inS) inD = !inD;
			else if (c === ':' && !inS && !inD) return [line.slice(0, k), line.slice(k + 1)];
		}
		return null;
	};

	// A quoted key carries its quote characters in the text; the document's key
	// does not have them. Decodes exactly what parseScalar's quoted branch does,
	// so serializeYaml's JSON.stringify is undone here symmetrically.
	const unquoteKey = (k) => {
		const t = k.trim();
		if (t.length >= 2 && t[0] === '"' && t[t.length - 1] === '"') {
			return t.slice(1, -1).replace(/\\(["\\nrt])/g, (m, c) => ({ '"': '"', '\\': '\\', n: '\n', r: '\r', t: '\t' }[c]));
		}
		if (t.length >= 2 && t[0] === "'" && t[t.length - 1] === "'") return t.slice(1, -1).replace(/''/g, "'");
		return t;
	};

	function parseScalar(raw) {
		let s = stripComment(raw).trim();
		if (s === '' || s === '~' || /^null$/i.test(s)) return null;
		if (/^true$/i.test(s)) return true;
		if (/^false$/i.test(s)) return false;
		if ((s[0] === '"' && s[s.length - 1] === '"') || (s[0] === "'" && s[s.length - 1] === "'")) {
			let body = s.slice(1, -1);
			if (s[0] === '"') body = body.replace(/\\(["\\nrt])/g, (m, c) => ({ '"': '"', '\\': '\\', n: '\n', r: '\r', t: '\t' }[c]));
			else body = body.replace(/''/g, "'");
			return body;
		}
		if (s.startsWith('[') && s.endsWith(']')) {
			const inner = s.slice(1, -1).trim();
			if (!inner) return [];
			return inner.split(',').map((p) => parseScalar(p.trim()));
		}
		if (s === '{}') return {};
		if (/^-?\d+$/.test(s)) return parseInt(s, 10);
		if (/^-?\d*\.\d+$/.test(s)) return parseFloat(s);
		return s;
	}

	const nextMeaningful = () => {
		let j = i;
		while (j < lines.length && (lines[j].trim() === '' || lines[j].trim().startsWith('#'))) j++;
		return j;
	};

	function parseValue(rest, indent) {
		if (rest.trim() !== '') return parseScalar(rest);
		const j = nextMeaningful();
		if (j < lines.length && indentOf(lines[j]) > indent) return parseBlock(indentOf(lines[j]));
		return null;
	}

	function parseSeqItem(content, indent) {
		const c = content.trim();
		if (c === '') {
			i++; // consume the "- " line
			const j = nextMeaningful();
			if (j < lines.length && indentOf(lines[j]) > indent) return parseBlock(indentOf(lines[j]));
			return null;
		}
		const sp = splitKey(c);
		if (sp) {
			const obj = {};
			i++; // consume the "- key: ..." line
			obj[unquoteKey(sp[0])] = parseValue(sp[1], indent);
			// Sibling deeper-indented "key: value" lines continue this inline map.
			while (i < lines.length) {
				const nl = lines[i];
				if (nl.trim() === '' || nl.trim().startsWith('#')) { i++; continue; }
				const nind = indentOf(nl);
				if (nind <= indent) break;
				const nsp = splitKey(nl);
				if (!nsp) { i++; continue; }
				i++;
				obj[unquoteKey(nsp[0])] = parseValue(nsp[1], nind);
			}
			return obj;
		}
		i++; // consume the "- scalar" line
		return parseScalar(c);
	}

	function parseBlock(indent) {
		const map = {};
		const arr = [];
		let isSeq = null;
		while (i < lines.length) {
			const line = lines[i];
			if (line.trim() === '' || line.trim().startsWith('#')) { i++; continue; }
			const ind = indentOf(line);
			if (ind < indent) break;
			// Deeper than this block and not claimed by any key above it: the
			// subset cannot read it, so record it rather than drop it silently.
			if (ind > indent) { skipped.push(i + 1); i++; continue; }
			const dash = line.match(/^(\s*)-[ \t]*(.*)$/);
			if (dash) {
				if (isSeq === null) isSeq = true;
				if (!isSeq) break;
				arr.push(parseSeqItem(dash[2], indent));
				continue;
			}
			const sp = splitKey(line);
			if (sp) {
				if (isSeq === null) isSeq = false;
				if (isSeq) break;
				i++; // consume the "key:" line
				map[unquoteKey(sp[0])] = parseValue(sp[1], indent);
				continue;
			}
			break;
		}
		return isSeq ? arr : map;
	}

	i = nextMeaningful();
	if (i >= lines.length) return { value: {}, skipped, leftover: [] };
	const value = parseBlock(indentOf(lines[i]));

	// Anything meaningful still ahead of the cursor was never read.
	const leftover = [];
	for (let k = i; k < lines.length; k++) {
		if (lines[k].trim() === '' || lines[k].trim().startsWith('#')) continue;
		leftover.push({ line: k + 1, text: lines[k] });
	}
	return { value, skipped, leftover };
}
function parseYaml(src) {
	return parseYamlReport(src).value;
}
// Serialize a frontmatter object back to block-style YAML — the inverse of
// parseYaml for every shape parseYaml produces: nested maps, sequences of
// scalars, sequences of maps, quoted scalars, numbers, booleans, null, and
// empty collections. Scalars are quoted only when a plain emission would
// re-parse as something else: leading indicator characters, ": " or " #"
// inside the value, reserved words, numeric lookalikes, or surrounding
// whitespace. JSON.stringify IS YAML's double-quoted style for the escapes
// parseScalar understands (\", \\, \n, \r, \t).
function fmNeedsQuote(s) {
	return s === ''
		|| /^\s|\s$/.test(s)
		|| /^[-?:,\[\]{}#&*!|>'"%@`]/.test(s)
		|| /:\s|\s#/.test(s)
		|| /^(null|~|true|false)$/i.test(s)
		|| /^-?\d+$/.test(s)
		|| /^-?\d*\.\d+$/.test(s)
		// A newline or tab in a bare scalar is not recoverable: the parser reads
		// one line at a time, so "v: a\nb" came back as "a" and "b" was lost.
		// JSON.stringify escapes exactly what parseScalar's quoted branch decodes.
		|| /[\n\r\t]/.test(s)
		// A quote ANYWHERE, not only in the leading position the indicator rule
		// above covers. The reader tracks quote state to find the key/value
		// separator, so one stray apostrophe swallows the colon and the whole
		// entry parses away: {"it's": 1} came back as {}.
		|| /["']/.test(s);
}
// A key is quoted under the value's rules PLUS one of its own: any colon at all,
// not just ": ". A bare key's colon is read as the key/value separator whatever
// follows it, so "a:b: 1" parsed back as {"a": "b: 1"}. The value rule is not
// sufficient because it only quotes a colon followed by whitespace.
const fmKey = (k) => {
	const s = String(k);
	return (s.includes(':') || s.includes('#') || /[\n\r\t]/.test(s) || fmNeedsQuote(s))
		? JSON.stringify(s)
		: s;
};
function fmSerializeScalar(v) {
	if (v === null || v === undefined) return 'null';
	if (typeof v === 'boolean' || typeof v === 'number') return String(v);
	const s = String(v);
	return fmNeedsQuote(s) ? JSON.stringify(s) : s;
}
function serializeYaml(obj) {
	const lines = [];
	// keyPrefix carries the already-indented "key:" (or "-") the value hangs
	// off; ind is the indentation of that line, so nested content lands at
	// ind + 2 — deeper than the line its parseValue call measures against.
	const writeValue = (keyPrefix, v, ind) => {
		if (Array.isArray(v)) {
			if (v.length === 0) { lines.push(`${keyPrefix} []`); return; }
			lines.push(keyPrefix);
			writeSeq(v, ind + 2);
		} else if (v !== null && typeof v === 'object') {
			if (Object.keys(v).length === 0) { lines.push(`${keyPrefix} {}`); return; }
			lines.push(keyPrefix);
			writeMap(v, ind + 2);
		} else {
			lines.push(`${keyPrefix} ${fmSerializeScalar(v)}`);
		}
	};
	// writeValue/writeMap/writeSeq recurse into each other; all calls happen
	// after the consts below are initialized, so the TDZ never bites.
	const writeMap = (map, ind) => {
		const pad = ' '.repeat(ind);
		for (const [k, v] of Object.entries(map)) writeValue(`${pad}${fmKey(k)}:`, v, ind);
	};
	const writeSeq = (arr, ind) => {
		const pad = ' '.repeat(ind);
		for (const item of arr) {
			if (item !== null && typeof item === 'object' && !Array.isArray(item) && Object.keys(item).length > 0) {
				// Sequence of maps: first key rides the dash line, siblings at
				// dash-indent + 2 — exactly what parseSeqItem's sibling loop expects.
				const [[k0, v0], ...rest] = Object.entries(item);
				writeValue(`${pad}- ${fmKey(k0)}:`, v0, ind + 2);
				for (const [k, v] of rest) writeValue(`${pad}  ${fmKey(k)}:`, v, ind + 2);
			} else {
				writeValue(`${pad}-`, item, ind);
			}
		}
	};
	if (Array.isArray(obj)) writeSeq(obj, 0);
	else if (obj !== null && typeof obj === 'object') writeMap(obj, 0);
	else lines.push(fmSerializeScalar(obj));
	return lines.join('\n');
}
// Extract leading YAML frontmatter (a "---" fenced block at the very top of the
// document). Returns null when there is none. The block closes at the FIRST "---"
// line after the opener, as every other frontmatter parser does — so an empty
// block (`---\n---`) is a block, and a following "---" is body content.
// Tolerant of the three things a real file does to those leading bytes: CRLF line
// endings (a file fetched via `src` is verbatim, while the HTML parser hands inline
// content over as LF), a UTF-8 BOM (PowerShell's Out-File and some editors write
// one), and the empty block itself, which is valid YAML with a null document.
function parseFrontmatter(md) {
	if (typeof md !== 'string') return null;
	const m = md.match(/^(?:\uFEFF)?---[ \t]*\r?\n(?:---[ \t]*(?:\r?\n|$)|([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$))/);
	if (!m) return null;
	return {
		raw: m[0],
		data: parseYaml(m[1]),
		content: md.slice(m[0].length),
	};
}
function humanizeKey(key) {
	return String(key).replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
function renderFrontmatterObject(obj) {
	const entries = Object.entries(obj);
	if (entries.length === 0) return '<span class="nui-md-frontmatter-null">&mdash;</span>';
	return '<dl class="nui-md-frontmatter-nested">' + entries.map(([k, v]) =>
		`<div><dt>${fmEscape(humanizeKey(k))}</dt><dd>${renderFrontmatterValue(v)}</dd></div>`
	).join('') + '</dl>';
}
function renderFrontmatterValue(v) {
	if (v === null || v === undefined) return '<span class="nui-md-frontmatter-null">&mdash;</span>';
	if (Array.isArray(v)) {
		if (v.length === 0) return '<span class="nui-md-frontmatter-null">&mdash;</span>';
		if (v.every((x) => x === null || typeof x !== 'object')) {
			return '<span class="nui-md-frontmatter-tags">' + v.map((x) =>
				`<span class="nui-md-frontmatter-chip">${fmEscape(x)}</span>`
			).join('') + '</span>';
		}
		return v.map((x) => (typeof x === 'object' && x !== null)
			? renderFrontmatterObject(x)
			: `<span class="nui-md-frontmatter-chip">${fmEscape(x)}</span>`).join('');
	}
	if (typeof v === 'object') return renderFrontmatterObject(v);
	return fmEscape(v);
}
// Recognized `frontmatter` modes. 'collapsed' is the default — the metadata card
// renders inside a closed <details> so it does not intrude on the document.
// 'show' / 'open' render the card visible, 'strip' removes it. Any value not in
// this set (including false / 'false') disables frontmatter handling entirely.
const FRONTMATTER_MODES = new Set(['collapsed', 'show', 'open', 'strip']);
// Render parsed frontmatter as a metadata card. Pass { collapsed: true } to wrap
// the card in a closed disclosure. Returns null when there is nothing to show.
function renderFrontmatter(data, options) {
	if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
	const rows = Object.entries(data).map(([k, v]) => {
		if (v === null || v === undefined || (Array.isArray(v) && v.length === 0)) return '';
		const dt = `<dt>${fmEscape(humanizeKey(k))}</dt>`;
		if (k === 'summary' && typeof v === 'string') {
			return `<div class="nui-md-frontmatter-field nui-md-frontmatter-summary">${dt}<dd>${fmEscape(v)}</dd></div>`;
		}
		return `<div class="nui-md-frontmatter-field">${dt}<dd>${renderFrontmatterValue(v)}</dd></div>`;
	}).filter(Boolean).join('');
	if (!rows) return null;
	const card = `<dl class="nui-md-frontmatter" aria-label="Document metadata">${rows}</dl>`;
	if (options && options.collapsed) {
		return `<details class="nui-md-frontmatter-details"><summary>Metadata</summary>${card}</details>`;
	}
	return card;
}
// Identifier-safe preset/kind name — presets are identifiers in the format; this
// keeps a malformed one from escaping into a class attribute.
function mbIdent(value) {
	return String(value == null ? '' : value).toLowerCase().replace(/[^a-z0-9_-]/g, '');
}
// The kind a destination implies, ignoring a stamped kind — the link class refines to
// video | audio | file (§4.2), never to image: an image is a shape, not an extension.
// The extension table is the parser's profile data, so it is read from there rather
// than kept here: two tables would be two answers.
function mbInferredKind(dest, isImage) {
	if (isImage) return 'image';
	const clean = String(dest || '').split('#')[0].split('?')[0];
	const dot = clean.lastIndexOf('.');
	const ext = dot === -1 ? '' : clean.slice(dot + 1).toLowerCase();
	const profile = MDBlocks.DEFAULT_EXTENSIONS;
	if (profile.video.indexOf(ext) !== -1) return 'video';
	if (profile.audio.indexOf(ext) !== -1) return 'audio';
	return 'file';
}
// Whether the destination's extension is one the profile knows as media. A link to
// something that is not a media file — a repository, a page — is a plain link, and a
// block holding one is not a media block even when its preset names a media family
// (`preset=link:cta` is a call to action, not a download).
function mbIsMediaDest(dest) {
	const clean = String(dest || '').split('#')[0].split('?')[0];
	const dot = clean.lastIndexOf('.');
	const slash = Math.max(clean.lastIndexOf('/'), clean.lastIndexOf('\\'));
	if (dot === -1 || dot < slash) return false;
	const ext = clean.slice(dot + 1).toLowerCase();
	const profile = MDBlocks.DEFAULT_EXTENSIONS;
	return profile.video.indexOf(ext) !== -1 || profile.audio.indexOf(ext) !== -1 ||
		profile.image.indexOf(ext) !== -1 || profile.file.indexOf(ext) !== -1;
}
// A markdown run becomes the renderer's md node. The parser hands over a TRIMMED
// run (§8 may normalise whitespace around directives); the renderer only ever
// joins these lines back together, so the trim is invisible to the output.
function mbMarkdownNodes(markdown) {
	return markdown ? [{ type: 'md', lines: markdown.split('\n') }] : [];
}
// Canonical node -> renderer node. The renderer walks { type:'md', lines },
// { type:'block', nodes }, { type:'columns', cols[].nodes } and { type:'var' }.
// The canonical tree uses { type:'markdown', markdown }, section.children,
// block.markdown and col.children — so the mapping is structural only: no
// parsing decision is reinterpreted here, and the canonical fields (attrs,
// line/endLine, the media verdict) are carried through untouched.
function mbAdaptNode(node) {
	if (!node) return node;
	if (node.type === 'markdown') {
		return { ...node, type: 'md', lines: node.markdown.split('\n') };
	}
	if (node.type === 'block') {
		// A block holds Markdown only (§3) — the canonical parser reports a nested
		// block or columns as an error rather than nesting them, so the body is
		// always one markdown run.
		return { ...node, nodes: mbMarkdownNodes(node.markdown) };
	}
	if (node.type === 'columns') {
		return {
			...node,
			nodes: [],
			cols: (node.cols || []).map(col => ({
				...col,
				nodes: (col.children || []).map(mbAdaptNode)
			}))
		};
	}
	return node;
}
// Canonical document -> the tree the renderer walks.
//
// The canonical §8 tree keeps a section's vars in `vars` and its content in
// `children`; the renderer walks one node list. A var is authored as a
// directive in the flow, so it is spliced back into that list at the position
// its source line gives it — otherwise a var would stop rendering where it was
// written and drift to the end of its section.
function mbAdaptSection(section) {
	const entries = [
		...(section.children || []).map((node, index) => ({ node, index })),
		...(section.vars || []).map((node, index) => ({ node, index }))
	];
	const nodes = entries
		.sort((a, b) => {
			const lineA = a.node.line ?? Number.POSITIVE_INFINITY;
			const lineB = b.node.line ?? Number.POSITIVE_INFINITY;
			return (lineA - lineB) || (a.index - b.index);
		})
		.map(entry => mbAdaptNode(entry.node));
	return { ...section, nodes };
}
function mbAdaptDocument(doc) {
	return {
		...doc,
		mains: (doc.mains || []).map(main => ({
			...main,
			sections: (main.sections || []).map(mbAdaptSection)
		}))
	};
}
// The document parser. The canonical parser never throws: it reports diagnostics
// and returns a walkable tree, and an invalid document is still rendered from
// what it could parse.
function parseBlocks(src) {
	return mbAdaptDocument(MDBlocks.parse(src));
}
function mbFormatAttrs(attrs) {
	if (!attrs) return '';
	const parts = [];
	for (const [k, v] of Object.entries(attrs)) {
		if (v === undefined || v === null) continue;
		if (typeof v === 'boolean' || typeof v === 'number') {
			parts.push(`${k}=${v}`);
		} else if (Array.isArray(v) || (typeof v === 'object' && v !== null)) {
			parts.push(`${k}=${JSON.stringify(v)}`);
		} else {
			const s = String(v);
			if (/^[a-z0-9_:.-]+$/i.test(s)) {
				parts.push(`${k}=${s}`);
			} else {
				parts.push(`${k}=${JSON.stringify(s)}`);
			}
		}
	}
	return parts.length ? ' ' + parts.join(' ') : '';
}
function serializeNode(node) {
	if (!node) return '';
	if (node.type === 'md') {
		return (node.lines || []).join('\n');
	}
	if (node.type === 'var') {
		const attrStr = mbFormatAttrs({ name: node.name, value: node.fenced ? undefined : node.value });
		let out = `<!-- mb:var${attrStr} -->`;
		if (node.fenced && node.value !== undefined) {
			const lang = node.fenced === 'json' ? 'json' : 'text';
			const text = typeof node.value === 'string' ? node.value : JSON.stringify(node.value, null, 2);
			out += `\n\`\`\`${lang}\n${text}\n\`\`\``;
		}
		return out;
	}
	if (node.type === 'block') {
		const attrStr = mbFormatAttrs(node.attrs);
		const inner = (node.nodes || []).map(serializeNode).filter(Boolean).join('\n\n');
		return `<!-- mb:block${attrStr} -->\n${inner}\n<!-- mb:/block -->`;
	}
	if (node.type === 'columns') {
		const attrStr = mbFormatAttrs(node.attrs);
		const colStrs = (node.cols || []).map((c) => {
			const cAttrs = mbFormatAttrs(c.attrs);
			const cInner = (c.nodes || []).map(serializeNode).filter(Boolean).join('\n\n');
			return `<!-- mb:col${cAttrs} -->\n${cInner}`;
		}).join('\n');
		return `<!-- mb:columns${attrStr} -->\n${colStrs}\n<!-- mb:/columns -->`;
	}
	return '';
}
function serializeBlocks(doc) {
	if (!doc) return '';
	const parts = [];
	if (doc.frontmatter && typeof doc.frontmatter === 'object' && Object.keys(doc.frontmatter).length > 0) {
		parts.push('---');
		parts.push(serializeYaml(doc.frontmatter));
		parts.push('---\n');
	}

	const mains = doc.mains || [];
	mains.forEach((main, mIdx) => {
		const hasMainAttrs = main.attrs && Object.keys(main.attrs).length > 0;
		if (hasMainAttrs || mains.length > 1) {
			parts.push(`<!-- mb:main${mbFormatAttrs(main.attrs)} -->\n`);
		}

		(main.sections || []).forEach((sec, sIdx) => {
			if (sIdx > 0) {
				parts.push('\n---\n');
			}
			if (sec.attrs && Object.keys(sec.attrs).length > 0) {
				parts.push(`<!-- mb:section${mbFormatAttrs(sec.attrs)} -->\n`);
			}
			const secBody = (sec.nodes || []).map(serializeNode).filter(Boolean).join('\n\n');
			if (secBody) {
				parts.push(secBody);
			}
		});
	});

	return parts.join('\n').trim() + '\n';
}
// Media is recognised only when the FIRST node of a block is the media itself;
// everything after it is the caption.
//
// The SHAPE is found here — which authored form the block takes, and where the media
// ends and the caption begins. The KIND is the parser's verdict (§4.2/§6.2): the parser
// classified the first node, and a stamped kind is authoritative when an editor wrote
// one. So this function never decides image/video/audio/file — it asks the parser, and
// the extension table lives in one place.
//
// A link to something that is not a media file is not a media block, however its preset
// reads: `preset=link:cta` is a call to action, not a download.
function mbDetectMedia(block) {
	const nodes = block.nodes;
	const first = nodes[0];
	if (!first || first.type !== 'md') return null;
	const lines = first.lines.slice();
	let start = 0;
	while (start < lines.length && !lines[start].trim()) start++;
	const head = (lines[start] || '').trim();

	const IMG = /^!\[([^\]]*)\]\(\s*(\S+?)(?:\s+["'][^"']*["'])?\s*\)$/;
	const ITEM = /^[-*+]\s+!\[([^\]]*)\]\(\s*(\S+?)(?:\s+["'][^"']*["'])?\s*\)$/;
	const LINKED = /^\[!\[([^\]]*)\]\(\s*(\S+?)(?:\s+["'][^"']*["'])?\s*\)\]\(\s*(\S+?)(?:\s+["'][^"']*["'])?\s*\)$/;
	const LINK = /^\[([^\]]+)\]\(\s*(\S+?)(?:\s+["'][^"']*["'])?\s*\)$/;
	// The two link shapes in LIST form — one media link per item, nothing else.
	const LINK_ITEM = /^(?:[-*+]|\d+\.)\s+\[([^\]]+)\]\(\s*(\S+?)(?:\s+["'][^"']*["'])?\s*\)$/;
	const LINKED_ITEM = /^(?:[-*+]|\d+\.)\s+\[!\[([^\]]*)\]\(\s*(\S+?)(?:\s+["'][^"']*["'])?\s*\)\]\(\s*(\S+?)(?:\s+["'][^"']*["'])?\s*\)$/;

	let shape = null, consumed = 0, dest = null;
	let items = null;   // link-class only: [{ dest, text, poster }] in authored order
	if (LINKED.test(head)) {
		// A linked image — the poster is the image, the link is where it goes.
		const m = head.match(LINKED);
		shape = 'linked';
		dest = m[3];
		items = [{ dest: m[3], text: m[1], poster: m[2] }];
		consumed = start + 1;
	} else if (IMG.test(head)) {
		shape = 'image';
		consumed = start + 1;
	} else if (ITEM.test(head)) {
		let j = start;
		while (j < lines.length && (!lines[j].trim() || ITEM.test(lines[j].trim()))) j++;
		if (j > start) { shape = 'image-list'; consumed = j; }
	} else if (LINK.test(head) && mbIsMediaDest(head.match(LINK)[2])) {
		const m = head.match(LINK);
		shape = 'link';
		dest = m[2];
		items = [{ dest: m[2], text: m[1], poster: null }];
		consumed = start + 1;
	} else if (LINKED_ITEM.test(head) || (LINK_ITEM.test(head) && mbIsMediaDest(head.match(LINK_ITEM)[2]))) {
		// Flat list of media links — one leaf in list form (§4.2). The authored form
		// is preserved: a one-item list stays a list.
		let j = start;
		items = [];
		while (j < lines.length) {
			const t = lines[j].trim();
			if (!t) { j++; continue; }
			const lp = t.match(LINKED_ITEM);
			const li = t.match(LINK_ITEM);
			if (lp) items.push({ dest: lp[3], text: lp[1], poster: lp[2] });
			else if (li && mbIsMediaDest(li[2])) items.push({ dest: li[2], text: li[1], poster: null });
			else break;
			j++;
		}
		if (items.length) { shape = 'link-list'; dest = items[0].dest; consumed = j; }
		else items = null;
	}
	if (!shape) return null;

	const isImage = shape === 'image' || shape === 'image-list';
	// The parser's verdict when it has one — it carries the stamped kind. A block the
	// parser did not classify as media (a linked image whose link is not a media file,
	// say) still renders, with the kind its destination implies.
	const inferred = mbInferredKind(dest, isImage);
	const kind = block.mediaClass
		? (block.kindStamped ? mbIdent(block.kind) : block.kind)
		: inferred;

	const rest = lines.slice(consumed);
	const captions = [];
	if (rest.join('\n').trim()) captions.push({ type: 'md', lines: rest });
	for (let i = 1; i < nodes.length; i++) captions.push(nodes[i]);

	return {
		kind,
		inferred,
		isList: shape === 'image-list' || shape === 'link-list',
		items,
		mediaHtml: markdownCore(lines.slice(start, consumed).join('\n')),
		captionHtml: mbRenderNodes(captions),
	};
}
function mbRenderNode(node) {
	if (!node) return '';
	if (node.type === 'md') return markdownCore(node.lines.join('\n'));
	if (node.type === 'block') return mbRenderBlock(node);
	if (node.type === 'columns') return mbRenderColumns(node);
	if (node.type === 'var') return mbRenderVar(node);
	return '';
}
// A var is data, never prose (spec §4.4) — but nui-markdown is a general DISPLAY
// renderer, so it shows what is there. Dropping it would make this renderer lossier
// than a generic preview, which cannot see the directive at all and quietly renders
// the fenced payload as an ordinary code block. Showing it is parity; the name is
// the one thing the generic renderer lost, so the name is the addition.
//
// A fenced payload goes through `nui-code`, so it is highlighted and copyable. A
// `value=` scalar stays inline — a copy button beside `12` is noise, not affordance.
function mbRenderVar(node) {
	if (!node || !node.name) return '';
	let body = '';
	if (node.fenced === 'json' || node.fenced === 'text') {
		const lang = node.fenced === 'json' ? 'json' : 'text';
		const text = typeof node.value === 'string' ? node.value : JSON.stringify(node.value, null, 2);
		body = `<nui-code><pre><code data-lang="${lang}">${fmEscape(text)}</code></pre></nui-code>`;
	} else if (node.value !== undefined && node.value !== null) {
		const text = typeof node.value === 'object' ? JSON.stringify(node.value) : String(node.value);
		body = `<span class="nui-blocks-var-value">${fmEscape(text)}</span>`;
	}
	return `<dl class="nui-blocks-var" data-var="${fmEscape(node.name)}"><dt>${fmEscape(node.name)}</dt><dd>${body}</dd></dl>`;
}
function mbRenderNodes(nodes) {
	return (nodes || []).map(mbRenderNode).filter(Boolean).join('\n');
}
// Parse colon-delimited preset token: `family[:modifier[:variant]]`.
function mbParsePreset(value) {
	if (!value) return null;
	const parts = String(value).trim().toLowerCase().split(':').map(mbIdent).filter(Boolean);
	if (!parts.length) return null;
	return {
		family: parts[0],
		modifier: parts[1] || null,
		variant: parts[2] || null,
		parts
	};
}
// Families the renderer knows how to treat. Anything else renders plain — valid
// syntax, but the degradation contract (spec §5: "visible renderer diagnostic")
// requires the unknown token to be reported, so each one warns once per session.
const MB_KNOWN_PRESET_FAMILIES = new Set(['card', 'image', 'gallery', 'link', 'list', 'table', 'page-break', 'band', 'cover', 'lead', 'note', 'warning', 'cta', 'player', 'narration', 'section', 'center', 'top', 'bottom']);
const mbUnknownPresetSeen = new Set();
// `id` becomes an anchor target, `preset` produces semantic classes. `label` is editor-only
// and is never rendered.
function mbOpenTag(tag, base, attrs, extra, extraAttrs) {
	const cls = [base];
	if (extra) cls.push(extra);
	const p = mbParsePreset(attrs && attrs.preset);
	if (p && !MB_KNOWN_PRESET_FAMILIES.has(p.family) && !mbUnknownPresetSeen.has(p.parts.join(':'))) {
		mbUnknownPresetSeen.add(p.parts.join(':'));
		console.warn(`[nui-markdown] unknown preset "${p.parts.join(':')}" — content rendered plain (graceful degradation, spec §5).`);
	}
	if (p) {
		cls.push('nui-preset-' + p.family);
		if (p.modifier) cls.push('nui-variant-' + p.modifier);
		if (p.variant) {
			cls.push('nui-variant-' + p.variant);
			if (p.variant === 'small' || p.variant === 'large') cls.push('nui-size-' + p.variant);
		}
	}
	const id = attrs && attrs.id ? ` id="${fmEscape(attrs.id)}"` : '';
	const x = extraAttrs ? ` ${extraAttrs}` : '';
	return `<${tag} class="${cls.join(' ')}"${id}${x}`;
}
// A refused media destination leaves a MARKER in the output, not just a line in the
// console. Dropping the destination and rendering the alt text — which is what this
// did — made "refused by policy" and "path is wrong" byte-identical in the rendered
// document, so the one outcome that needs a decision looked exactly like the one
// that needs a typo fixed, and neither could be told from a missing asset. The
// reader of a document cannot open the console. Spec §7 asks for the opposite:
// "renderer warning, source reference retained" — the alt text stays visible and
// the refused destination stays recoverable from the marker itself.
function mdRejectedMedia(reason, destination, alt) {
	const text = String(alt == null ? '' : alt);
	const dest = String(destination == null ? '' : destination);
	console.warn(`[nui-markdown] refused media destination (${reason}): ${dest}`);
	return `<span class="nui-md-media-rejected" role="img"`
		+ ` aria-label="${fmEscape(text ? text + ' — media refused' : 'media refused')}"`
		+ ` title="Refused (${fmEscape(reason)}): ${fmEscape(dest)}"`
		+ ` data-refused-destination="${fmEscape(dest)}"`
		+ ` data-refused-reason="${fmEscape(reason)}">${fmEscape(text)}</span>`;
}
// A media destination is a relative path or an http(s) URL. Everything else is
// refused per the spec's trust boundary (§8): executable schemes, protocol-relative
// URLs, drive paths. Document input is a boundary, so a refusal is REPORTED — the
// caller turns `refused` into a marker the reader can see, because a console warning
// is not a report to the person reading the document. Returns `{ dest }` when
// permitted (a null `dest` means the attribute was absent), `{ refused }` with the
// reason when not.
function mbSafeDest(dest) {
	const d = String(dest == null ? '' : dest).trim();
	if (!d) return { dest: null };
	if (/^https?:\/\//i.test(d)) return { dest: d };
	if (/^[a-z][a-z0-9+.-]*:/i.test(d)) return { refused: 'scheme not allowed' };
	if (d.startsWith('//') || /^[a-z]:[\\/]/i.test(d)) return { refused: 'absolute or protocol-relative path' };
	return { dest: d };
}
// One pipeline for every media destination the renderer writes into a src/poster
// attribute: the §8 trust boundary, the document base, then the app-level
// rewrite/policy hooks (which canonicalize /storage/... to the app's same-origin
// proxy path and gate trust — nui_wc2#33). A refusal is a visible marker, never
// a silently dropped attribute (see mdRejectedMedia). Returns `{ url }` (null
// when the attribute was absent) or `{ rejected }` with the marker HTML.
function mbMediaUrl(rawDest, alt) {
	let verdict = mbSafeDest(rawDest);
	// Host trust override (setMarkdownMediaTrust): a DESKTOP shell renders the
	// user's own documents from the user's own disk — a drive path here is a
	// file the user picked, not an injection. The vouching happens BEFORE the
	// refusal becomes a marker; the fn returns a usable destination or null.
	if (verdict.refused && typeof markdownMediaTrust === 'function') {
		const dest = markdownMediaTrust(String(rawDest == null ? '' : rawDest).trim());
		if (dest) verdict = { dest };
	}
	if (verdict.refused) return { rejected: mdRejectedMedia(verdict.refused, rawDest, alt) };
	let url = verdict.dest;
	if (!url) return { url: null };
	if (_mdDocBase && !/^[a-z][a-z0-9+.-]*:/i.test(url) && !url.startsWith('/') && !url.startsWith('#')) {
		try { url = new URL(url, _mdDocBase).href; } catch (e) { /* unparsable base — leave as authored */ }
	}
	if (typeof markdownImageRewrite === 'function') {
		const rewritten = markdownImageRewrite(url);
		if (typeof rewritten === 'string' && rewritten.length > 0) url = rewritten;
	}
	if (typeof markdownImagePolicy === 'function' && !markdownImagePolicy(url)) {
		return { rejected: mdRejectedMedia('destination not permitted', rawDest, alt) };
	}
	return { url };
}
// preset=player — the deliberate embed (spec §5.1): a link-class media block
// renders as inline playback instead of the reference the author wrote. The
// carrying element is profile territory: <nui-media-player> wraps a native
// <video|audio controls>, so the output IS the spec's mapped element even when
// the player addon is absent, and the house player upgrades it in place when
// present. Returns null when player is inapplicable — the caller then renders
// the plain reference, which is the spec's fallback, not an error state.
function mbRenderPlayer(block, media, openTag) {
	const stamped = block.attrs && block.attrs.kind ? mbIdent(block.attrs.kind) : null;
	if (stamped && stamped !== media.inferred) {
		console.warn(`[nui-markdown] preset=player: stamped kind "${stamped}" disagrees with the destination's "${media.inferred}" — rendered plain, stamp preserved (spec §7).`);
		return null;
	}
	if (media.kind !== 'video' && media.kind !== 'audio') {
		console.warn(`[nui-markdown] preset=player on a non-playable destination (kind=${media.kind}) — rendered as the authored link (spec §7).`);
		return null;
	}
	const items = media.items || [];
	if (!items.length) return null;

	const tag = media.kind === 'video' ? 'video' : 'audio';
	const caption = media.captionHtml ? `<figcaption>${media.captionHtml}</figcaption>` : '';

	const renderMediaEl = (item) => {
		const url = mbMediaUrl(item.dest, item.text);
		if (url.rejected) return url.rejected;
		const poster = tag === 'video' && item.poster ? mbMediaUrl(item.poster, '') : null;
		const posterAttr = poster && poster.url ? ` poster="${fmEscape(poster.url)}"` : '';
		const label = item.text ? ` aria-label="${fmEscape(item.text)}"` : '';
		return `<nui-media-player type="${tag}"><${tag} controls playsinline preload="metadata" src="${fmEscape(url.url)}"${posterAttr}${label}></${tag}></nui-media-player>`;
	};

	if (!media.isList) {
		return `${openTag}>${renderMediaEl(items[0])}${caption}</figure>`;
	}

	// Playlist: one player + the track list. Rows are buttons carrying their
	// destination; util.enhancePlayers wires them to the player after injection.
	const tracks = items.map((item, i) => {
		const url = mbMediaUrl(item.dest, item.text);
		if (url.rejected) return `<li>${url.rejected}</li>`;
		const poster = tag === 'video' && item.poster ? (mbMediaUrl(item.poster, '').url || '') : '';
		const iconName = tag === 'video' ? 'smart_display' : 'music_note';
		return `<li><button type="button" class="nui-blocks-track${i === 0 ? ' active' : ''}" data-src="${fmEscape(url.url)}"${poster ? ` data-poster="${fmEscape(poster)}"` : ''}><nui-icon name="${iconName}"></nui-icon><span class="nui-blocks-track-title">${fmEscape(item.text || item.dest)}</span></button></li>`;
	}).join('');
	return `${openTag}>${renderMediaEl(items[0])}<ol class="nui-blocks-playlist">${tracks}</ol>${caption}</figure>`;
}
function mbRenderBlock(block) {
	const media = mbDetectMedia(block);
	const p = mbParsePreset(block.attrs && block.attrs.preset);

	// `icon=` carries an asset reference in the directive rather than in the body, so
	// generic previews show clean prose with no stray image line. The preset decides
	// how the icon is presented; the attribute is only meaningful alongside it. A
	// refused destination is not a reason to drop the block: the caption is content
	// the directive asked to show, so the figure is still emitted around a marker.
	const iconAttr = p && p.family === 'image' && p.modifier === 'icon'
		? String((block.attrs && block.attrs.icon) || '').trim()
		: '';

	if (media) {
		const playerWanted = p && p.family === 'player';
		const extra = ['nui-blocks-media', `nui-blocks-${media.kind}`];
		// A player list is a PLAYLIST, not a gallery — the gallery class brings
		// image-grid treatment that has no meaning for a track list.
		if (!playerWanted && (media.isList || (p && p.family === 'gallery'))) extra.push('nui-blocks-gallery');
		if (playerWanted) extra.push('nui-blocks-player');
		let focalAttrs = '';
		const f = block.attrs && block.attrs.focal;
		if (f && typeof f === 'object' && Number.isFinite(Number(f.x)) && Number.isFinite(Number(f.y))) {
			const fx = Math.max(0, Math.min(1, Number(f.x)));
			const fy = Math.max(0, Math.min(1, Number(f.y)));
			focalAttrs = `data-focal="${fx},${fy}" style="--nui-focal-x:${(fx * 100).toFixed(1)}%;--nui-focal-y:${(fy * 100).toFixed(1)}%"`;
		}
		const open = mbOpenTag('figure', 'nui-blocks-block', block.attrs, extra.join(' '), focalAttrs);
		if (playerWanted) {
			const player = mbRenderPlayer(block, media, open);
			// null = inapplicable (warned inside) — fall through to the plain
			// reference rendering, which IS the spec's fallback (§7).
			if (player) return player;
		}
		const caption = media.captionHtml ? `<figcaption>${media.captionHtml}</figcaption>` : '';
		return `${open}>${media.mediaHtml}${caption}</figure>`;
	}

	if (iconAttr) {
		// The icon <img> is emitted here, outside markdownCore — run it through the
		// same destination pipeline (trust boundary, document base, app hooks) that
		// player sources get, so the app-level rewrite/policy never sees a raw
		// destination that would 404 wherever only a path prefix is routed
		// (nui_wc2#33). Same treatment an inline markdown image gets.
		const resolved = mbMediaUrl(iconAttr, block.attrs.alt || '');
		const open = mbOpenTag('figure', 'nui-blocks-block', block.attrs, 'nui-blocks-media nui-blocks-image');
		const alt = block.attrs.alt || '';
		const mediaHtml = resolved.url
			? `<img src="${fmEscape(resolved.url)}" alt="${fmEscape(alt)}" loading="lazy">`
			: resolved.rejected;
		return `${open}>${mediaHtml}<figcaption>${mbRenderNodes(block.nodes)}</figcaption></figure>`;
	}

	let tag = 'div';
	let extraAttrs = '';
	if (p) {
		if (p.family === 'card') {
			if (p.modifier === 'note' || p.modifier === 'warning') {
				tag = 'aside';
				extraAttrs = 'role="note"';
			} else {
				tag = 'article';
			}
		} else if (p.family === 'note' || p.family === 'warning') {
			tag = 'aside';
			extraAttrs = 'role="note"';
		} else if (p.family === 'link' || p.family === 'cta') {
			tag = 'nav';
		} else if (p.family === 'narration') {
			// Delivery text (spec §5.2): spoken, not shown. Authored as ordinary Markdown,
			// mapped to an <aside> and classed so a surface profile can withhold it while a
			// delivery function finds its words without a descriptor.
			tag = 'aside';
		}
	}

	let content = mbRenderNodes(block.nodes);
	if (p && (p.family === 'link' || p.family === 'cta')) content = mbActionList(content);
	if (p && (p.modifier === 'fit' || p.variant === 'fit')) {
		content = content.replace(/(<table[^>]*>\s*<thead>\s*<tr>)([\s\S]*?)(<\/tr>\s*<\/thead>)/i, (match, openTr, ths, closeTr) => {
			const newThs = ths.replace(/<th>([^<]+)<\/th>/g, (m, text) => {
				const cleanText = text.trim();
				return `<th class="nui-table-th-fit"><div class="nui-table-th-clip" tabindex="0">${cleanText}</div><nui-tooltip position="top">${cleanText}</nui-tooltip></th>`;
			});
			return `${openTr}${newThs}${closeTr}`;
		});
	}

	const open = mbOpenTag(tag, 'nui-blocks-block', block.attrs, null, extraAttrs);
	return `${open}>${content}</${tag}>`;
}
// A `link` block is a set of ACTIONS, not a list of things. The authored Markdown is
// a bullet list only because that is the shape a set of links takes in Markdown; the
// family owns the output element (spec §5 — "the family sets the semantic element and
// class", the authored shape is not the output shape). Left as a list, a
// call-to-action row is announced as "list, 2 items / list item" — structure that
// carries no meaning for an action row and reads as a document outline that is not
// there. The list scaffolding is dropped so the links are direct children of the
// block's <nav>; the container supplies the spacing instead.
//
// The single-link form is a paragraph rather than a list, so it is unwrapped too —
// otherwise one action and two actions would lay out differently for no reason. Any
// other shape (prose mixed with the links, a nested list) is left exactly as authored:
// guessing at an unfamiliar structure is worse than showing it.
function mbActionList(html) {
	const trimmed = String(html).trim();
	const list = trimmed.match(/^<(ul|ol)>([\s\S]*)<\/\1>$/);
	if (list) {
		const items = list[2].match(/<li>[\s\S]*?<\/li>/g);
		// Only when the list holds nothing BUT list items — a nested list would not
		// round-trip through the non-greedy item match, so it fails this test and is
		// returned untouched.
		if (!items || items.join('') !== list[2].trim()) return html;
		return items.map((item) => item.replace(/^<li>([\s\S]*)<\/li>$/, '$1')).join('\n');
	}
	const para = trimmed.match(/^<p>([\s\S]*)<\/p>$/);
	return para ? para[1] : html;
}
function mbRenderColumns(columns) {
	const count = columns.cols.length;
	const weights = Array.isArray(columns.attrs.weights) ? columns.attrs.weights : null;
	const valid = weights && weights.length === count && weights.every((w) => typeof w === 'number' && w > 0);
	const style = valid ? ` style="grid-template-columns:${weights.map((w) => w + 'fr').join(' ')}"` : '';
	const open = mbOpenTag('div', 'nui-blocks-columns', columns.attrs);
	const cells = columns.cols.map((c) => {
		const cellOpen = mbOpenTag('div', 'nui-blocks-col', c.attrs);
		return `${cellOpen}>${mbRenderNodes(c.nodes)}</div>`;
	}).join('\n');
	const lead = mbRenderNodes(columns.nodes);
	return `${open} data-cols="${count}"${style}>${lead ? lead + '\n' : ''}${cells}</div>`;
}
function mbRenderSection(s) {
	const open = mbOpenTag('section', 'nui-blocks-section', s.attrs);
	return `${open}>${mbRenderNodes(s.nodes)}</section>`;
}
function mbSectionHasContent(s) {
	return !!(Object.keys(s.attrs).length || s.vars.length ||
		s.nodes.some((n) => n.type !== 'md' || n.lines.join('\n').replace(/<!--[\s\S]*?-->/g, '').trim()));
}
function mbMainHasContent(m) {
	return m.sections.some(mbSectionHasContent);
}
function mbRenderMain(main) {
	// Chrome is authored once per MAIN and emitted once — on the scope, not on every
	// region inside it. Repeating it across surfaces (each slide, each printed page) is
	// the renderer profile's job, because a scope is not the same thing as a surface.
	const chrome = { header: [], footer: [] };
	const hadContent = main.sections.map(mbSectionHasContent);
	for (const s of main.sections) {
		s.nodes = s.nodes.filter((n) => {
			const slot = n.type === 'block' && n.attrs ? n.attrs.repeat : null;
			if (slot === 'header' || slot === 'footer') { chrome[slot].push(n); return false; }
			return true;
		});
	}
	// Chrome is not content: a region that held nothing but chrome templates is not a
	// surface, or the canonical "chrome at the top of the main" placement would put a
	// blank slide in front of every deck. A region that was empty in the source is a
	// deliberate empty section and is preserved (§4.1).
	const sections = main.sections.filter((s, i) => mbSectionHasContent(s) || !hadContent[i]);

	const slot = (name) => chrome[name].length
		? `<${name} class="nui-blocks-chrome nui-blocks-chrome-${name}">${chrome[name].map(mbRenderBlock).join('\n')}</${name}>`
		: '';
	const open = mbOpenTag('main', 'nui-blocks-main', main.attrs);
	// The section boundary, opt-in (markdownToHtml({ separators: true|'Section' }) or the
	// host's `show-breaks`). It is a LABELLED divider — "Slide 3 of 12" — not a bare rule:
	// the point is an author scanning the rendered page for where slides split, and a plain
	// rule only says a break is somewhere. The label names the surface it INTRODUCES, so a
	// reader meets "Slide 2" and then slide 2. It is a SIBLING of the sections, never a
	// child, so a surface renderer that collects sections (nui-slides) cannot mistake it for
	// a slide. The text rides in an attribute + `::after` so it never enters the document's
	// own textContent.
	const noun = _mdSeparatorNoun;
	const total = sections.length;
	const body = sections.map((s, i) => {
		const html = mbRenderSection(s);
		if (!noun || i === total - 1) return html;
		const label = fmEscape(`${noun} ${i + 2} of ${total}`);
		return `${html}\n<hr class="nui-blocks-separator" data-label="${label}" aria-label="${label}">`;
	}).join('\n');
	return `${open}>${slot('header')}${body}${slot('footer')}</main>`;
}
function renderBlocks(doc) {
	const mains = doc.mains.filter(mbMainHasContent);

	// A document with no structure renders exactly as plain Markdown — no wrapper,
	// unchanged from the previous behaviour. Structure appears only when the source
	// asks for it. The section's markdown was already flushed into its nodes, so read
	// those rather than the emptied buffer.
	const only = mains.length === 1 ? mains[0] : null;
	const structured = mains.length > 1 || (only && (Object.keys(only.attrs).length ||
		only.sections.length > 1 || only.sections.some((s) =>
			Object.keys(s.attrs).length || s.vars.length || s.nodes.some((n) => n.type !== 'md'))));
	if (!structured) {
		const nodes = only ? only.sections[0].nodes : [];
		return markdownCore(nodes.map((n) => n.lines.join('\n')).join('\n\n'));
	}

	return mains.map(mbRenderMain).join('\n');
}
function markdownToHtml(md, options) {
	options = options || {};
	if (typeof md !== 'string' || !md.trim()) return '';

	// Document base (issue #38) is consumed deep inside markdownCore, several
	// renderer frames below this function. Rendering is synchronous, so a
	// document-scoped variable set around the call threads it down without
	// polluting every signature in the MD-Blocks chain. Restored in finally —
	// an exception mid-render must not leak one document's base into the next.
	const prevBase = _mdDocBase;
	_mdDocBase = options.base || null;
	const prevSep = _mdSeparatorNoun;
	// `true` means the unit MD-Blocks already implies — a section IS a slide to a slideshow
	// renderer — while a string names it for a document that is not a deck, so a blog post
	// does not get labelled "Slide 4 of 9". Anything else leaves the divider off entirely.
	_mdSeparatorNoun = options.separators === true ? 'Slide'
		: (typeof options.separators === 'string' && options.separators.trim()) ? options.separators.trim()
			: null;
	let out;
	try {
		out = _markdownToHtmlInner(md, options);
	} finally {
		_mdDocBase = prevBase;
		_mdSeparatorNoun = prevSep;
	}
	return out;
}
// Rendered-document base for relative media destinations (issue #38). Set by
// markdownToHtml for the duration of one synchronous render; null everywhere
// else. markdownCore reads it — see the comment above.
let _mdDocBase = null;
// The noun for the opt-in section dividers, or null when they are off (nui_wc2#75). A
// break is structure, not content (§4.1), so the dividers are off unless asked for. Set by
// markdownToHtml for one synchronous render, threaded the same way as _mdDocBase.
let _mdSeparatorNoun = null;
function _markdownToHtmlInner(md, options) {
	if (typeof md !== 'string' || !md.trim()) return '';

	// YAML frontmatter handling. Recognized modes live in FRONTMATTER_MODES;
	// 'collapsed' (the default) hides the metadata card behind a closed
	// disclosure, 'show' / 'open' render it visible, 'strip' removes it. Any
	// other value (false / 'false' / garbage) disables handling — the block then
	// renders as-is, the legacy horizontal-rule behavior.
	const fmMode = options.frontmatter !== undefined ? options.frontmatter : 'collapsed';
	let fmHtml = '';
	if (FRONTMATTER_MODES.has(fmMode)) {
		const fm = parseFrontmatter(md);
		if (fm) {
			if (fmMode === 'collapsed') fmHtml = renderFrontmatter(fm.data, { collapsed: true }) || '';
			else if (fmMode !== 'strip') fmHtml = renderFrontmatter(fm.data) || '';
			md = fm.content;
		}
	}

	return fmHtml + renderBlocks(parseBlocks(md));
}
// A fenced code block is a block boundary, and blank-line splitting alone cannot
// see that. The fence tokenizer in markdownCore replaces each fence with a token,
// but the token is then just text in whatever blank-line-delimited run contained
// it — so `prose\n```js\ncode\n```\nmore prose` arrived at the block splitter as
// ONE block and got wrapped whole: the fence ended up nested inside a <p>, and
// the renderer emitted `<p><nui-code>…</nui-code><br> more prose</p>`. CommonMark
// says a fence interrupts a paragraph and is never inside one. So the token is
// pulled out as its own block, and the text on either side of it becomes the
// blocks it actually was. Fences inside a list or a blockquote belong to those
// containers and never reach this path.
function splitFenceTokens(block) {
	if (!/\uE000\d+\uE001/.test(block)) return [block];
	const parts = [];
	const re = /\uE000\d+\uE001/g;
	let last = 0;
	let m;
	while ((m = re.exec(block)) !== null) {
		const before = block.slice(last, m.index);
		if (before.trim()) parts.push(before.trim());
		parts.push(m[0]);
		last = m.index + m[0].length;
	}
	const after = block.slice(last);
	if (after.trim()) parts.push(after.trim());
	return parts;
}
// Markdown -> HTML for a plain CommonMark leaf. Structure (MD-Blocks sections,
// blocks, columns) is handled above this; by the time text reaches here it is
// content only.
function markdownCore(md) {
	let html = md.trim().replace(/\r\n/g, '\n');
	const codeBlocks = [];
	// CommonMark's fence rule, which the previous three-backtick-only pattern did not
	// implement: a fence opened with N backticks is closed by a run of AT LEAST N,
	// and the closing line carries no info string. Without it a code block whose
	// content is itself a fence — a Markdown example, the most ordinary thing to put
	// in documentation — closed on its own inner fence and rendered as garbage.
	// `\1` is the opening run; the trailing `` `* `` absorbs any longer closing run.
	// The newline before the closing run is OPTIONAL because an empty fenced block is
	// written as ```lang then ``` on the next line, with no content between — CommonMark
	// allows it, and requiring the newline made every empty fence fall through to the
	// inline-code tokenizer and render as ``` `` <code>js</code> `` ```.
	// Only the first word of the info string is the language; the rest is the author
	// writing a title or attributes, which is content to preserve and not a language.
	html = html.replace(/^[ \t]*(`{3,})([^\n`]*)\n([\s\S]*?)\n?[ \t]*\1`*[ \t]*$/gm, (match, fence, info, code) => {
		const token = `\uE000${codeBlocks.length}\uE001`;
		codeBlocks.push({ token, lang: info.trim().split(/\s+/)[0] || '', code });
		return token;
	});
	html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

	// Inline code spans -> tokens so the emphasis/bold/strike regexes below cannot
	// mangle code content (e.g. `vita_ai_change_manager_v4.md` must stay literal,
	// not become <em>). Restored as <code> last, after fenced code blocks.
	const inlineCode = [];
	html = html.replace(/`([^`]+)`/g, (match, code) => {
		const token = `\uE100${inlineCode.length}\uE101`;
		inlineCode.push({ token, code });
		return token;
	});

	// HTML comments are invisible in every other Markdown renderer, so they are
	// dropped here too — including MD-Blocks directives (`<!-- mb:block -->`), which a
	// structure-aware renderer consumes from the source before it reaches this
	// converter. Fenced and inline code were tokenized above, so a comment shown as
	// an example stays literal. Comments are matched in their escaped form because
	// escaping has already run; an unterminated `<!--` is left visible rather than
	// swallowing the rest of the document.
	html = html.replace(/&lt;!--[\s\S]*?--&gt;/g, '');

	html = html.replace(/^[ \t]*\|(.+)\|\n[ \t]*\|([-:| ]+)\|\n((?:[ \t]*\|.+\|\n?)*)/gm, (match, header, sep, body) => {
		// Split on unescaped pipes only: `\|` is a literal pipe inside a cell
		// (GFM table escaping), never a column boundary. Unescaped after the split.
		const splitCells = (row) => row.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map(c => c.trim().replace(/\\\|/g, '|'));
		const headCells = splitCells(header).map(c => `<th>${c}</th>`).join('');
		const bodyRows = body.trim().split('\n').filter(r => r.trim()).map(row => {
			const cells = splitCells(row).map(c => `<td>${c}</td>`).join('');
			return `<tr>${cells}</tr>`;
		}).join('');
		return `<table class="nui-table"><thead><tr>${headCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
	});

	html = html.replace(/^[ \t]*(#{1,6})\s+(.+)$/gm, (match, hashes, text) => `<h${hashes.length}>${text}</h${hashes.length}>`);

	html = html.replace(/^[ \t]*(&gt;\s+.+(:?\n[ \t]*&gt;\s+.+)*)/gm, (match) => `<blockquote>${match.replace(/^[ \t]*&gt;\s+/gm, '')}</blockquote>`);

	// Lists — line-based parser handling flat, loose (blank-line-separated) and
	// nested lists. Runs before block separation so blank lines inside a list do
	// not fragment it into multiple one-item lists (issue #13).
	html = parseLists(html);

	html = html.replace(/^[ \t]*(={3,})[ \t]*$/gm, '<hr class="equals">');
	html = html.replace(/^[ \t]*(-{3,})[ \t]*$/gm, '<hr class="dash">');
	html = html.replace(/^[ \t]*(\*{3,})[ \t]*$/gm, '<hr class="stars">');
	html = html.replace(/^[ \t]*(_{3,})[ \t]*$/gm, '<hr>');

	const blocks = html.split(/\n{2,}/);
	const htmlBlocks = blocks.flatMap(raw => {
		const trimmed = raw.trim();
		if (!trimmed) return [''];
		return splitFenceTokens(trimmed).map(block => {
			if (!block) return '';
			if (/^\uE000\d+\uE001$/.test(block)) return block;
			if (/^<(h\d|ul|ol|pre|blockquote|table|hr|nui-code)/i.test(block)) return block;
			// CommonMark: a SOFT break is a newline the reader's width decides — HTML
			// collapses it to a space, so a hard-wrapped paragraph reflows instead of
			// breaking where the author typed it. A HARD break is explicit: two or more
			// trailing spaces, or a trailing backslash. Only the paragraph path reaches
			// here; fenced code and the other block forms returned above untouched, so
			// their newlines stay literal.
			return `<p>${block.replace(/(?: {2,}|\\)\n/g, '<br>')}</p>`;
		});
	});
	html = htmlBlocks.join('\n');

	// Scheme-validate URLs before interpolating into attributes. Blocks javascript:, data:, vbscript: etc.
	// Relative paths, #anchors, http(s), and mailto pass through; dangerous schemes render as plain text.
	// The host trust override (setMarkdownMediaTrust) can vouch for a refused
	// destination — a desktop shell rendering the user's own disk uses it for
	// drive paths, which are files the user picked, not injections.
	const safeUrl = (url) => {
		const trimmed = url.trim();
		const scheme = trimmed.match(/^([a-z][a-z0-9+.-]*):/i);
		if (!scheme || /^(https?|mailto)$/i.test(scheme[1])) return trimmed;
		if (typeof markdownMediaTrust === 'function') {
			const dest = markdownMediaTrust(trimmed);
			if (dest) return dest;
		}
		return null;
	};
	// Generated markup and URL attribute values are held as tokens so the emphasis
	// passes below cannot reach into them: an underscore in a filename is not
	// emphasis. A whole <img> is held — alt text is literal per CommonMark — while a
	// link keeps its text inline, so emphasis inside link text still applies.
	// Alt text may be EMPTY (`![](...)`) — a decorative image is legal Markdown and
	// legal media for an MD-Blocks block, so the alt group is `*`, not `+`.
	const heldMarkup = [];
	const hold = (markup) => {
		const token = `\uE200${heldMarkup.length}\uE201`;
		heldMarkup.push({ token, markup });
		return token;
	};
	html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (m, alt, src) => {
		let url = safeUrl(src);
		// Both refusals below are MARKED in the output. Returning the alt text alone
		// made a refused destination indistinguishable from a mistyped one (issue
		// #34) — the rendered document has to say which happened, because that is the
		// difference between "fix your path" and "the policy forbids this".
		if (!url) return hold(mdRejectedMedia('scheme not allowed', src.trim(), alt));
		// Document base (issue #38): a document rendered from a URL has relative
		// destinations resolve against that URL — the same rule every real
		// viewer (GitHub, VS Code, Obsidian) applies. Resolved BEFORE the app
		// rewrite/policy hooks so they see a canonical absolute URL. The base
		// is the document-scoped _mdDocBase set by markdownToHtml — this leaf
		// renderer sits several frames below it with no options in scope.
		if (_mdDocBase && !/^[a-z][a-z0-9+.-]*:/i.test(url) && !url.startsWith('/') && !url.startsWith('#')) {
			try {
				url = new URL(url, _mdDocBase).href;
			} catch (e) {
				console.warn(`[NuiMarkdown] Cannot resolve '${url}' against base '${_mdDocBase}' — left as authored`);
			}
		}
		// App-level rewrite hook (setMarkdownImageRewrite): fn(url) → rewritten
		// url or null. Applied before the policy check so a canonicalized URL
		// (e.g. host-aliased storage origin → same-origin proxy path) is what
		// gets trusted and requested.
		if (typeof markdownImageRewrite === 'function') {
			const rewritten = markdownImageRewrite(url);
			if (typeof rewritten === 'string' && rewritten.length > 0) url = rewritten;
		}
		// App-level origin allow-list (setMarkdownImagePolicy): an image whose
		// source the app does not trust is never requested — and the refusal is
		// reported in the output rather than swallowed into alt text (issue #34).
		if (typeof markdownImagePolicy === 'function' && !markdownImagePolicy(url)) {
			return hold(mdRejectedMedia('destination not permitted', url, alt));
		}
		return hold(`<img src="${url}" alt="${alt}">`);
	});
	html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, text, href) => {
		const url = safeUrl(href);
		return url ? `<a href="${hold(url)}">${text}</a>` : text;
	});
	html = html.replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>');
	html = html.replace(/(\*|_)(.*?)\1/g, '<em>$2</em>');
	html = html.replace(/~~(.*?)~~/g, '<s>$1</s>');
	html = heldMarkup.reduce((result, h) => result.replace(h.token, () => h.markup), html);
	html = codeBlocks.reduce((result, { token, lang, code }) => {
		const safeCode = code.replace(/<\/script/gi, '<\\/script');
		return result.replace(token, `<nui-code><script type="example"${lang ? ` data-lang="${lang}"` : ''}>${safeCode}</script></nui-code>`);
	}, html);
	html = inlineCode.reduce((result, { token, code }) => result.replace(token, `<code>${code}</code>`), html);

	return html;
}
// App-level markdown image policy (issue #32, LLM-Gateway-Chat): fn(url) →
// boolean. Null = allow everything safeUrl passes (previous behavior).
let markdownImagePolicy = null;
// Host trust override for otherwise-refused destinations (drive paths in a
// desktop shell). Called with the raw destination; returns a sanitized
// destination to proceed with, or null/undefined to keep the refusal.
let markdownMediaTrust = null;
// App-level markdown image rewrite: fn(url) → rewritten url or null. Runs
// before the policy check; lets the app canonicalize host aliases (e.g. all
// known spellings of a storage origin → one same-origin proxy path).
let markdownImageRewrite = null;

// ── public surface ─────────────────────────────────────────────────────────
//
// Only the established, reusable API. The renderer internals (markdownCore, the
// mb* helpers) stay private: they are implementation, not contract.

export {
	markdownToHtml,
	parseBlocks,
	serializeBlocks,
	parseYaml,
	parseYamlReport,
	serializeYaml,
	parseFrontmatter,
	renderFrontmatter
};

// The valid frontmatter rendering modes. A resolver rather than the set itself: the
// set is mutable state, and the question the caller actually asks is "is this a mode
// I know?".
export function resolveFrontmatterMode(attr) {
	return FRONTMATTER_MODES.has(attr) ? attr : null;
}

// The app-level hooks that shape a media destination. One state holder, here:
// nui.js delegates its own util.set* functions to these, so a browser app and a
// Node consumer configure the same renderer.

export function setMarkdownImagePolicy(fn) { markdownImagePolicy = (typeof fn === 'function') ? fn : null; }
export function setMarkdownMediaTrust(fn) { markdownMediaTrust = (typeof fn === 'function') ? fn : null; }
export function setMarkdownImageRewrite(fn) { markdownImageRewrite = (typeof fn === 'function') ? fn : null; }
