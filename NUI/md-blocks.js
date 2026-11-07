/*
	MD-Blocks parser — implements the md-blocks format spec v1.10 (github.com/herrbasan/md-blocks).

	Environment-free by contract: no DOM, no filesystem, no network, no dependencies. Node loads
	it with require(), the browser with <script> or through the ESM entry beside it, and every
	consumer gets the same tree from the same source. That is the whole point of this module —
	the format had three parsers that disagreed.

	The tree is spec §8:

	  document { frontmatter, mains[] }
	  main     { id?, label?, preset?, sections[] }
	  section  { id?, label?, preset?, vars[], children[] }
	  child    = markdown | block | columns
	  block    { id?, label?, preset?, kind?, focal?, icon?, alt?, repeat?, markdown }
	  columns  { id?, label?, preset?, weights?, cols[] }
	  col      { id?, label?, preset?, children[] }

	Additions to §8 that §3 and §7 force:
	  · every node carries `line` / `endLine` (1-based) — §7 requires locations on diagnostics;
	  · every node carries `attrs`, the authored attributes exactly as parsed — §3's `data:`
	    namespace is open, so a parser that only promoted known fields would drop what §8
	    requires preserved on round-trip;
	  · `block.markdown` is the authored body, `block.kindStamped` says whether `kind` came from
	    the file or was inferred (§6.2), and `mediaClass` / `mediaForm` / `mediaDest` are the
	    §4.2 verdict that the stamp is checked against.
*/

(function (root, factory) {
	const api = factory();
	if (typeof module === 'object' && module.exports) module.exports = api;
	if (root) root.MDBlocks = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
	'use strict';

	const SPEC_VERSION = '1.10';

	const STRUCTURAL = ['main', 'section', 'block', 'columns', 'col', 'var'];

	const ALLOWED = {
		main: ['id', 'label', 'preset'],
		section: ['id', 'label', 'preset'],
		block: ['id', 'label', 'preset', 'kind', 'focal', 'icon', 'alt', 'repeat', 'audio', 'name'],
		columns: ['id', 'label', 'preset', 'weights'],
		col: ['id', 'label', 'preset'],
		var: ['name', 'value'],
	};

	// §4.2: the extension table is profile data (§8 forbids lookups while parsing). These are the
	// defaults the browser renderer declares today, so both stay in step until it migrates.
	const DEFAULT_EXTENSIONS = {
		image: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'svg', 'bmp'],
		video: ['mp4', 'webm', 'mov', 'm4v', 'ogv'],
		audio: ['mp3', 'wav', 'ogg', 'oga', 'm4a', 'flac'],
		file: ['pdf', 'zip'],
	};

	const MEDIA_KINDS = ['image', 'video', 'audio', 'file'];

	// §5.1 families that describe a media block. A preset is presentation and cannot change the
	// media *class* (§4.2), but naming one is how an author declares a block media whose
	// destination extension the profile does not know — §10's "kind file, rendered plain".
	const MEDIA_PRESET_FAMILIES = ['image', 'gallery', 'player', 'link'];

	const DIRECTIVE_RE = /^<!--[ \t]*mb:(\/?)([a-zA-Z]*)((?:[ \t][^>]*?)?)[ \t]*-->[ \t]*$/;
	const INDENTED_DIRECTIVE_RE = /^[ \t]+<!--[ \t]*mb:/;
	const ANY_MB_COMMENT_RE = /^<!--[ \t]*mb:/;
	const THEMATIC_RE = /^ {0,3}(?:(?:-[ \t]*){3,}|(?:\*[ \t]*){3,}|(?:_[ \t]*){3,})$/;
	const FENCE_RE = /^ {0,3}(`{3,}|~{3,})(.*)$/;
	const FENCE_CLOSE_RE = /^ {0,3}(`{3,}|~{3,})[ \t]*$/;
	const HTML_ELEMENT_RE = /<\/?[A-Za-z][A-Za-z0-9-]*(\s[^<>]*?)?\/?>/;
	const HTML_COMMENT_ONLY_RE = /^[ \t]*<!--[\s\S]*-->[ \t]*$/;

	/* ------------------------------------------------------------ diagnostics */

	function createDiagnostics() {
		const list = [];
		const report = (severity, code, message, line, extra) => {
			const entry = { severity, code, message, line: line || 1 };
			if (extra) {
				if (extra.expected !== undefined) entry.expected = extra.expected;
				if (extra.endLine !== undefined) entry.endLine = extra.endLine;
				if (extra.related !== undefined) entry.related = extra.related;
			}
			list.push(entry);
			return entry;
		};
		return { list, report };
	}

	/* ---------------------------------------------------------- attributes */

	function skipToken(src, i) {
		let j = i;
		while (j < src.length && !/[ \t]/.test(src[j])) j++;
		return j;
	}

	// §3: a bare token is a string unless it is a number, a boolean or null.
	function coerceBare(raw) {
		if (raw === 'true') return true;
		if (raw === 'false') return false;
		if (raw === 'null') return null;
		if (/^-?(?:\d+|\d*\.\d+)(?:[eE][-+]?\d+)?$/.test(raw)) return Number(raw);
		return raw;
	}

	// A value starting with " [ or { is strict JSON (§3); anything else is a bare token that ends
	// at whitespace. Malformed JSON is reported, never reinterpreted as a string.
	function scanJsonValue(src, i) {
		const start = i;
		if (src[i] === '"') {
			let j = i + 1;
			while (j < src.length) {
				if (src[j] === '\\') { j += 2; continue; }
				if (src[j] === '"') { j++; break; }
				j++;
			}
			if (j - 1 <= start || src[j - 1] !== '"') return null;
			try { return { value: JSON.parse(src.slice(start, j)), end: j }; } catch (err) { return null; }
		}
		let depth = 0;
		let inString = false;
		let j = i;
		while (j < src.length) {
			const ch = src[j];
			if (inString) {
				if (ch === '\\') { j += 2; continue; }
				if (ch === '"') inString = false;
				j++;
				continue;
			}
			if (ch === '"') { inString = true; j++; continue; }
			if (ch === '[' || ch === '{') depth++;
			else if (ch === ']' || ch === '}') {
				depth--;
				if (depth === 0) { j++; break; }
			}
			j++;
		}
		if (depth !== 0) return null;
		try { return { value: JSON.parse(src.slice(start, j)), end: j }; } catch (err) { return null; }
	}

	function parseAttributes(text, kind, lineNo, report) {
		const attrs = {};
		const seen = Object.create(null);
		const src = String(text || '');
		const allowed = ALLOWED[kind] || [];
		let i = 0;

		while (i < src.length) {
			while (i < src.length && /[ \t]/.test(src[i])) i++;
			if (i >= src.length) break;

			if (src.startsWith('data:=', i)) {
				report('error', 'data-empty-key', 'the data: namespace needs a property name (data:<key>=…)', lineNo);
				i = skipToken(src, i);
				continue;
			}

			const km = /^([a-z][a-z0-9_-]*(?::[a-z][a-z0-9_-]*)?)=/.exec(src.slice(i));
			if (!km) {
				const j = skipToken(src, i);
				report('error', 'attribute-syntax', `not a key=value attribute: "${src.slice(i, j)}"`, lineNo);
				i = j;
				continue;
			}

			const key = km[1];
			i += km[0].length;
			const start = i;
			const lead = src[i];
			let raw;
			let value;
			let end;

			if (lead === '"' || lead === '[' || lead === '{') {
				const scanned = scanJsonValue(src, i);
				if (!scanned) {
					report('error', 'attribute-value', `attribute "${key}" has a value that is not valid JSON`, lineNo);
					i = skipToken(src, i);
					continue;
				}
				raw = src.slice(start, scanned.end);
				value = scanned.value;
				end = scanned.end;
			} else {
				end = skipToken(src, i);
				raw = src.slice(start, end);
				value = coerceBare(raw);
			}
			i = end;

			if (/[<>]/.test(raw)) {
				report('error', 'attribute-value',
					`attribute "${key}" contains a raw < or > — a value can never escape the comment; use \\u003c / \\u003e`,
					lineNo);
				continue;
			}
			if (seen[key]) {
				report('error', 'duplicate-attribute', `duplicate attribute "${key}"`, lineNo);
				continue;
			}
			seen[key] = true;

			const colon = key.indexOf(':');
			const ns = colon === -1 ? null : key.slice(0, colon);
			const base = colon === -1 ? key : key.slice(colon + 1);

			if (ns !== null && ns !== 'data') {
				report('error', 'unknown-attribute',
					`unknown attribute namespace "${ns}:" in "${key}" — only data: is open to documents`, lineNo);
				continue;
			}
			if (ns === null && base === 'repeat' && kind !== 'block') {
				report('error', 'repeat-invalid', `repeat is valid only on a block, not on ${kind}`, lineNo);
				continue;
			}
			if (ns === null && allowed.indexOf(base) === -1) {
				report('error', 'unknown-attribute', `unknown attribute "${key}" on ${kind}`, lineNo,
					{ expected: allowed.join(' | ') + ' | data:<key>' });
				continue;
			}
			attrs[key] = value;
		}

		return attrs;
	}

	/* ---------------------------------------------------------- frontmatter */

	// A deliberate subset: scalars, inline lists, block lists, one nesting level. `raw` is the
	// authoritative copy — the format stores frontmatter and never interprets it (§3), so a
	// consumer holding a real YAML parser should re-read `raw` rather than trust `data`.
	function parseYaml(text) {
		const root = {};
		const stack = [{ indent: -1, node: root }];
		const lines = String(text || '').split('\n');

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			if (!line.trim() || /^\s*#/.test(line)) continue;
			const indent = line.match(/^ */)[0].length;

			while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
			const parent = stack[stack.length - 1].node;

			const item = /^ *- +(.*)$/.exec(line);
			if (item) {
				if (Array.isArray(parent)) parent.push(yamlScalar(item[1]));
				continue;
			}

			const pair = /^ *([A-Za-z0-9_.-]+):[ \t]*(.*)$/.exec(line);
			if (!pair) continue;
			const key = pair[1];
			const rest = pair[2];

			if (rest === '') {
				const next = lines[i + 1];
				const child = next && /^ *- +/.test(next) ? [] : {};
				parent[key] = child;
				stack.push({ indent, node: child });
				continue;
			}
			parent[key] = yamlScalar(rest);
		}

		return root;
	}

	function yamlScalar(text) {
		const value = String(text).trim();
		if (value === '') return '';
		if (value[0] === '[' && value[value.length - 1] === ']') {
			const inner = value.slice(1, -1).trim();
			if (!inner) return [];
			return splitInlineList(inner).map(yamlScalar);
		}
		if (value[0] === '{' && value[value.length - 1] === '}') {
			try { return JSON.parse(value); } catch (err) { /* keep the string form */ }
		}
		if (value[0] === '"' && value[value.length - 1] === '"') {
			try { return JSON.parse(value); } catch (err) { return value.slice(1, -1); }
		}
		if (value[0] === "'" && value[value.length - 1] === "'") return value.slice(1, -1);
		const unquoted = value.replace(/\s+#.*$/, '');
		if (unquoted === 'true') return true;
		if (unquoted === 'false') return false;
		if (unquoted === 'null' || unquoted === '~') return null;
		if (/^-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?$/.test(unquoted)) return Number(unquoted);
		return unquoted;
	}

	function splitInlineList(text) {
		const parts = [];
		let depth = 0;
		let quote = null;
		let current = '';
		for (let i = 0; i < text.length; i++) {
			const ch = text[i];
			if (quote) {
				current += ch;
				if (ch === '\\') { current += text[++i] || ''; continue; }
				if (ch === quote) quote = null;
				continue;
			}
			if (ch === '"' || ch === "'") { quote = ch; current += ch; continue; }
			if (ch === '[' || ch === '{') depth++;
			if (ch === ']' || ch === '}') depth--;
			if (ch === ',' && depth === 0) { parts.push(current.trim()); current = ''; continue; }
			current += ch;
		}
		if (current.trim()) parts.push(current.trim());
		return parts;
	}

	/* ------------------------------------------------------- inline scanning */

	// Finds images and links at the top level of a paragraph, with bracket-depth awareness so a
	// link wrapping an image — [![poster](p.jpg)](film.mp4) — is one token, not two.
	function scanInline(text) {
		const tokens = [];
		let i = 0;
		while (i < text.length) {
			const ch = text[i];
			if (ch === '\\') { i += 2; continue; }
			if (ch === '`') {
				let n = 0;
				while (text[i + n] === '`') n++;
				const close = text.indexOf('`'.repeat(n), i + n);
				i = close === -1 ? i + n : close + n;
				continue;
			}
			if (ch === '!' && text[i + 1] === '[') {
				const token = parseInlineToken(text, i, true);
				if (token) { tokens.push(token); i = token.end; continue; }
				i += 2;
				continue;
			}
			if (ch === '[') {
				const token = parseInlineToken(text, i, false);
				if (token) { tokens.push(token); i = token.end; continue; }
				i++;
				continue;
			}
			i++;
		}
		return tokens;
	}

	function parseInlineToken(text, start, isImage) {
		let depth = 1;
		let j = start + (isImage ? 2 : 1);
		while (j < text.length) {
			const ch = text[j];
			if (ch === '\\') { j += 2; continue; }
			if (ch === '`') {
				let n = 0;
				while (text[j + n] === '`') n++;
				const close = text.indexOf('`'.repeat(n), j + n);
				j = close === -1 ? j + n : close + n;
				continue;
			}
			if (ch === '[') depth++;
			else if (ch === ']') {
				depth--;
				if (depth === 0) break;
			}
			j++;
		}
		if (depth !== 0) return null;
		const label = text.slice(start + (isImage ? 2 : 1), j);
		if (text[j + 1] !== '(') return null;

		const destination = parseDestination(text, j + 2);
		if (!destination) return null;

		if (isImage) return { type: 'image', dest: destination.dest, label, start, end: destination.end };

		const linkedImage = /^!\[[^\]]*\]\([^)]*\)$/.test(label.trim());
		return { type: 'link', dest: destination.dest, label, linkedImage, start, end: destination.end };
	}

	function parseDestination(text, from) {
		let i = from;
		while (i < text.length && /\s/.test(text[i])) i++;
		let dest;
		if (text[i] === '<') {
			const close = text.indexOf('>', i);
			if (close === -1) return null;
			dest = text.slice(i + 1, close);
			i = close + 1;
		} else {
			const start = i;
			let depth = 0;
			while (i < text.length) {
				const ch = text[i];
				if (ch === '\\') { i += 2; continue; }
				if (ch === '(') { depth++; i++; continue; }
				if (ch === ')') {
					if (depth === 0) break;
					depth--;
					i++;
					continue;
				}
				if (depth === 0 && /\s/.test(ch)) break;
				i++;
			}
			dest = text.slice(start, i);
		}
		while (i < text.length && /\s/.test(text[i])) i++;
		const quote = text[i];
		if (quote === '"' || quote === "'" || quote === '(') {
			const closer = quote === '(' ? ')' : quote;
			const close = text.indexOf(closer, i + 1);
			if (close === -1) return null;
			i = close + 1;
			while (i < text.length && /\s/.test(text[i])) i++;
		}
		if (text[i] !== ')') return null;
		return { dest, end: i + 1 };
	}

	/* ------------------------------------------------------- markdown blocks */

	function isBlockStart(line) {
		if (!line.trim()) return true;
		if (FENCE_RE.test(line)) return true;
		if (THEMATIC_RE.test(line)) return true;
		if (/^ {0,3}#{1,6}(\s|$)/.test(line)) return true;
		if (/^ {0,3}>/.test(line)) return true;
		if (/^ {0,3}([-*+]|\d{1,9}[.)])([ \t]+|$)/.test(line)) return true;
		if (/^ {0,3}</.test(line)) return true;
		return false;
	}

	function readList(lines, from) {
		const items = [];
		let ordered = null;
		let baseIndent = null;
		let i = from;
		let current = null;

		while (i < lines.length) {
			const line = lines[i];
			const ul = /^( {0,3})([-*+])([ \t]+)(.*)$/.exec(line);
			const ol = /^( {0,3})(\d{1,9}[.)])([ \t]+)(.*)$/.exec(line);
			const marker = ul || ol;

			if (marker) {
				const indent = marker[1].length;
				const isOrdered = !ul;
				// A deeper marker is a sub-list of the current item, not a sibling: §4.2's "flat
				// list" test must see the nesting, or a nested gallery reads as a flat one.
				if (baseIndent === null) baseIndent = indent;
				if (indent > baseIndent) {
					if (!current) break;
					current.continued = true;
					current.text += '\n' + line.trim();
					i++;
					continue;
				}
				if (indent < baseIndent) break;
				if (ordered === null) ordered = isOrdered;
				else if (ordered !== isOrdered) break;
				current = { text: marker[4], continued: false };
				items.push(current);
				i++;
				continue;
			}

			if (!line.trim()) {
				let j = i + 1;
				while (j < lines.length && !lines[j].trim()) j++;
				if (j >= lines.length) break;
				const next = lines[j];
				if (/^[ \t]/.test(next) || /^ {0,3}([-*+]|\d{1,9}[.)])([ \t]+)/.test(next)) {
					i = j;
					continue;
				}
				break;
			}

			if (/^[ \t]/.test(line)) {
				if (!current) break;
				current.continued = true;
				current.text += '\n' + line.trim();
				i++;
				continue;
			}
			break;
		}

		return { node: { type: 'list', ordered: !!ordered, items }, next: i };
	}

	function splitBlocks(text) {
		const lines = String(text || '').split('\n');
		const nodes = [];
		let i = 0;

		while (i < lines.length) {
			const line = lines[i];
			if (!line.trim()) { i++; continue; }

			const fence = FENCE_RE.exec(line);
			if (fence) {
				const start = i;
				const char = fence[1][0];
				const len = fence[1].length;
				i++;
				while (i < lines.length) {
					const close = FENCE_CLOSE_RE.exec(lines[i]);
					i++;
					if (close && close[1][0] === char && close[1].length >= len) break;
				}
				nodes.push({ type: 'fence', text: lines.slice(start, i).join('\n') });
				continue;
			}

			if (/^ {0,3}#{1,6}(\s|$)/.test(line)) {
				nodes.push({ type: 'heading', text: line });
				i++;
				continue;
			}

			if (THEMATIC_RE.test(line)) {
				nodes.push({ type: 'hr', text: line });
				i++;
				continue;
			}

			if (/^ {0,3}>/.test(line)) {
				const start = i;
				while (i < lines.length && /^ {0,3}>/.test(lines[i])) i++;
				nodes.push({ type: 'blockquote', text: lines.slice(start, i).join('\n') });
				continue;
			}

			if (/^ {0,3}</.test(line)) {
				const start = i;
				if (line.indexOf('<!--') !== -1) {
					while (i < lines.length && lines[i].indexOf('-->') === -1) i++;
					i = Math.min(i + 1, lines.length);
				} else {
					i++;
				}
				nodes.push({ type: 'html', text: lines.slice(start, i).join('\n') });
				continue;
			}

			if (/^ {0,3}([-*+]|\d{1,9}[.)])([ \t]+|$)/.test(line)) {
				const list = readList(lines, i);
				nodes.push(list.node);
				i = list.next;
				continue;
			}

			if (line.indexOf('|') !== -1 && i + 1 < lines.length &&
				/^[ \t]*\|?[ \t]*:?-{1,}[ \t]*(\|[ \t]*:?-{1,}[ \t]*)*\|?[ \t]*$/.test(lines[i + 1])) {
				const start = i;
				i += 2;
				while (i < lines.length && lines[i].indexOf('|') !== -1 && lines[i].trim()) i++;
				nodes.push({ type: 'table', text: lines.slice(start, i).join('\n') });
				continue;
			}

			const start = i;
			i++;
			while (i < lines.length && !isBlockStart(lines[i])) i++;
			nodes.push({ type: 'paragraph', text: lines.slice(start, i).join('\n') });
		}

		return nodes;
	}

	// Comments are inert: §6.1 says they do not split a run, so they are not the first node of
	// anything either.
	function contentNodes(text) {
		return splitBlocks(text).filter((node) => !(node.type === 'html' && HTML_COMMENT_ONLY_RE.test(node.text)));
	}

	function extensionOf(dest) {
		const clean = String(dest || '').split('#')[0].split('?')[0];
		const dot = clean.lastIndexOf('.');
		const slash = Math.max(clean.lastIndexOf('/'), clean.lastIndexOf('\\'));
		if (dot === -1 || dot < slash) return '';
		return clean.slice(dot + 1).toLowerCase();
	}

	function kindForExtension(ext, extensions) {
		if (!ext) return 'file';
		if (extensions.video.indexOf(ext) !== -1) return 'video';
		if (extensions.audio.indexOf(ext) !== -1) return 'audio';
		return 'file';
	}

	function isMediaDestination(dest, extensions) {
		const ext = extensionOf(dest);
		if (!ext) return false;
		return extensions.video.indexOf(ext) !== -1 ||
			extensions.audio.indexOf(ext) !== -1 ||
			extensions.image.indexOf(ext) !== -1 ||
			extensions.file.indexOf(ext) !== -1;
	}

	// "Exactly one media node and nothing else" — the §4.2 test, applied to one paragraph or one
	// list item. Returns null when the text is anything other than a lone image or a lone link.
	function loneMedia(text, extensions) {
		const tokens = scanInline(text);
		if (tokens.length !== 1) return null;
		const token = tokens[0];
		if ((text.slice(0, token.start) + text.slice(token.end)).trim()) return null;

		if (token.type === 'image') return { shape: 'image', kind: 'image', dest: token.dest };
		return {
			shape: 'link',
			kind: kindForExtension(extensionOf(token.dest), extensions),
			dest: token.dest,
			linkedImage: token.linkedImage,
		};
	}

	// The structural verdict: what shape the block's first node has. Whether that shape is
	// *declared* media is a separate question (a stamp, an image node, or a known extension).
	function analyzeMedia(text, extensions) {
		const nodes = contentNodes(text);
		if (!nodes.length) return null;

		const first = nodes[0];
		if (first.type === 'paragraph') {
			const lone = loneMedia(first.text, extensions);
			if (!lone) return null;
			return { shape: lone.shape, kind: lone.kind, form: 'single', dest: lone.dest, linkedImage: lone.linkedImage };
		}

		if (first.type === 'list' && !first.ordered && first.items.length) {
			let verdict = null;
			for (const item of first.items) {
				if (item.continued) return null;
				const lone = loneMedia(item.text, extensions);
				if (!lone) return null;
				if (!verdict) verdict = lone;
				else if (verdict.shape !== lone.shape) return null;
			}
			if (!verdict) return null;
			return { shape: verdict.shape, kind: verdict.kind, form: 'list', dest: verdict.dest };
		}

		return null;
	}

	// §5.1: "when the block's last node is a paragraph containing exactly one link, that link is
	// the card's destination." A missing destination is a renderer warning (§7), not an error.
	function analyzeTeaser(text) {
		const nodes = contentNodes(text);
		if (!nodes.length) return null;
		const last = nodes[nodes.length - 1];
		if (last.type !== 'paragraph') return null;
		const tokens = scanInline(last.text);
		if (tokens.length !== 1) return null;
		const token = tokens[0];
		if (token.type !== 'link') return null;
		if ((last.text.slice(0, token.start) + last.text.slice(token.end)).trim()) return null;
		return { dest: token.dest, label: token.label };
	}

	/* ------------------------------------------------------------- helpers */

	function presetParts(preset) {
		if (typeof preset !== 'string') return null;
		const parts = preset.split(':');
		return { family: parts[0], modifier: parts[1], variant: parts[2] };
	}

	function isOrdinaryComment(line) {
		const trimmed = line.trim();
		return trimmed.indexOf('<!--') === 0 && trimmed.indexOf('-->') !== -1 && !ANY_MB_COMMENT_RE.test(trimmed);
	}

	// §3 protects indented code: a directive four or more columns in is code, not a misplaced
	// marker. Below that it can only be a list item or a quote — an authoring error.
	function indentationColumns(line) {
		let columns = 0;
		for (const ch of line) {
			if (ch === ' ') columns++;
			else if (ch === '\t') columns += 4;
			else break;
		}
		return columns;
	}

	function isParagraphLine(line) {
		const text = String(line || '').trim();
		if (!text) return false;
		if (text.indexOf('<!--') === 0) return false;
		if (/^#{1,6}(\s|$)/.test(text)) return false;
		if (/^(>|[-*+][ \t]|\d{1,9}[.)][ \t])/.test(text)) return false;
		if (/^(`{3,}|~{3,})/.test(text)) return false;
		if (text[0] === '|') return false;
		if (THEMATIC_RE.test(text)) return false;
		return true;
	}

	function mergeExtensions(custom) {
		const merged = {
			image: DEFAULT_EXTENSIONS.image.slice(),
			video: DEFAULT_EXTENSIONS.video.slice(),
			audio: DEFAULT_EXTENSIONS.audio.slice(),
			file: DEFAULT_EXTENSIONS.file.slice(),
		};
		if (custom) {
			for (const key of Object.keys(merged)) {
				if (Array.isArray(custom[key])) {
					merged[key] = custom[key].map((ext) => String(ext).replace(/^\./, '').toLowerCase());
				}
			}
		}
		return merged;
	}

	function buffer(node) {
		if (!node.__buffer) {
			Object.defineProperty(node, '__buffer', { value: { lines: [], start: 0 }, writable: true, enumerable: false });
		}
		return node.__buffer;
	}

	function resetBuffer(node) {
		const buf = buffer(node);
		buf.lines = [];
		buf.start = 0;
	}

	function pushLine(node, line, lineNo) {
		const buf = buffer(node);
		if (!buf.lines.length) buf.start = lineNo;
		buf.lines.push(line);
	}

	// Trims the blank lines around a run (§8 may normalise whitespace around directives) and
	// returns the text with its source extent.
	function takeText(node) {
		const buf = buffer(node);
		let first = 0;
		let last = buf.lines.length - 1;
		while (first <= last && !buf.lines[first].trim()) first++;
		while (last >= first && !buf.lines[last].trim()) last--;
		if (first > last) {
			resetBuffer(node);
			return null;
		}
		const text = buf.lines.slice(first, last + 1).join('\n');
		const startLine = buf.start + first;
		const endLine = buf.start + last;
		resetBuffer(node);
		return { text, startLine, endLine };
	}

	/* ---------------------------------------------------------------- parse */

	function parse(source, options) {
		const opts = options || {};
		const extensions = mergeExtensions(opts.extensions);
		const src = String(source == null ? '' : source).replace(/\r\n?/g, '\n');
		const lines = src.split('\n');

		const diag = createDiagnostics();
		const report = diag.report;

		const doc = {
			type: 'document',
			frontmatter: null,
			mains: [],
			diagnostics: diag.list,
			line: 1,
			endLine: lines.length,
		};

		let i = 0;
		if (lines[0] !== undefined && lines[0].trim() === '---') {
			let close = -1;
			for (let j = 1; j < lines.length; j++) {
				if (lines[j].trim() === '---') { close = j; break; }
			}
			if (close > 0) {
				const raw = lines.slice(1, close).join('\n');
				doc.frontmatter = { raw, data: parseYaml(raw), line: 1, endLine: close + 1 };
				i = close + 1;
			}
		}

		let main = null;
		let section = null;
		let mode = 'root';
		let block = null;
		let blockReturn = 'root';
		let columns = null;
		let col = null;
		let sawCol = false;
		let fence = null;
		let varFence = null;
		let expectVar = null;
		let sectionMarkerSeen = false;
		let mainMarkerSeen = false;
		let directiveCount = 0;
		let prevLine = '';
		const ids = new Map();
		const varNames = new Map();
		const speakers = new Map();

		const startMain = (lineNo) => {
			main = { type: 'main', attrs: {}, sections: [], line: lineNo, endLine: lineNo };
			doc.mains.push(main);
		};
		const startSection = (lineNo) => {
			section = { type: 'section', attrs: {}, vars: [], children: [], line: lineNo, endLine: lineNo };
			sectionMarkerSeen = false;
			main.sections.push(section);
		};

		startMain(1);
		startSection(1);

		const innermost = () => block || col || section;

		const flush = (node) => {
			if (!node) return;
			const taken = takeText(node);
			if (!taken) {
				if (node.type === 'block') node.markdown = '';
				return;
			}
			if (node.type === 'block') {
				node.markdown = taken.text;
				checkRawHtml(taken.text, taken.startLine);
				return;
			}
			node.children.push({ type: 'markdown', markdown: taken.text, line: taken.startLine, endLine: taken.endLine });
			checkRawHtml(taken.text, taken.startLine);
		};

		function checkRawHtml(text, startLine) {
			const body = text.split('\n');
			let open = null;
			for (let k = 0; k < body.length; k++) {
				const line = body[k];
				if (open) {
					const close = FENCE_CLOSE_RE.exec(line);
					if (close && close[1][0] === open.char && close[1].length >= open.len) open = null;
					continue;
				}
				const start = FENCE_RE.exec(line);
				if (start) {
					open = { char: start[1][0], len: start[1].length };
					continue;
				}
				const stripped = line.replace(/`[^`]*`/g, '');
				if (!HTML_ELEMENT_RE.test(stripped)) continue;
				if (HTML_COMMENT_ONLY_RE.test(stripped)) continue;
				report('error', 'unsupported-html',
					'raw HTML elements are outside the profile — escape them or show them as code', startLine + k);
			}
		}

		const pushContent = (line, lineNo) => {
			if (mode === 'block') { pushLine(block, line, lineNo); return; }
			if (mode === 'col') { pushLine(col, line, lineNo); return; }
			if (mode === 'root') { pushLine(section, line, lineNo); return; }
			// mode === 'columns': only blanks and ordinary comments may precede the first col, and
			// nothing may sit between an explicit /col and the next marker — the source has nowhere
			// to go in the tree, so it is reported instead of being dropped in silence.
			if (!line.trim() || isOrdinaryComment(line)) return;
			report('error', sawCol ? 'content-outside-column' : 'content-before-col',
				sawCol
					? 'content between an explicit mb:/col and the next marker belongs to no column'
					: 'content inside columns before the first col marker',
				lineNo);
		};

		const closeBlock = (lineNo) => {
			flush(block);
			block.endLine = lineNo;
			applyBlockSemantics(block);
			const parent = blockReturn === 'col' && col ? col : section;
			parent.children.push(block);
			block = null;
			blockReturn = 'root';
			mode = parent === col ? 'col' : 'root';
		};

		const closeCol = (boundary, lineNo) => {
			if (!col) return;
			flush(col);
			col.closedBy = boundary;
			col.endLine = lineNo;
			columns.cols.push(col);
			col = null;
			sawCol = true;
			mode = 'columns';
		};

		function applyBlockSemantics(node) {
			const attrs = node.attrs;
			const preset = presetParts(attrs.preset);
			const media = analyzeMedia(node.markdown, extensions);
			const stamped = attrs.kind !== undefined;

			for (const key of ['focal', 'icon', 'alt', 'repeat']) {
				if (attrs[key] !== undefined) node[key] = attrs[key];
			}

			let mediaClass = null;
			if (media) {
				// A shape is media when it is an image, when the destination's extension is in the
				// profile table (§4.2), when the author stamped a kind — the stamp declares it — or
				// when the preset names a media family.
				const declared = stamped || media.shape === 'image' ||
					isMediaDestination(media.dest, extensions) ||
					!!(preset && MEDIA_PRESET_FAMILIES.indexOf(preset.family) !== -1);
				if (declared) {
					mediaClass = media.shape;
					node.mediaForm = media.form;
					node.mediaDest = media.dest;
					node.kind = stamped ? attrs.kind : media.kind;
				}
			}

			node.mediaClass = mediaClass;
			node.kindStamped = stamped;

			if (stamped) {
				node.kind = attrs.kind;
				if (MEDIA_KINDS.indexOf(attrs.kind) === -1) {
					report('error', 'attribute-value',
						`kind "${attrs.kind}" is not one of ${MEDIA_KINDS.join(' | ')}`, node.line);
				} else if (!media) {
					report('error', 'kind-media-class',
						`stamped kind="${attrs.kind}" but the block's first node is neither an image nor a link — ` +
						'a stamp pins the media class, so this is a change of kind, not a text block',
						node.line, { expected: 'a lone image or a lone link as the first node' });
				} else {
					const stampClass = attrs.kind === 'image' ? 'image' : 'link';
					if (media.shape !== stampClass) {
						report('error', 'kind-media-class',
							`stamped kind="${attrs.kind}" contradicts the media class of the first node (${media.shape})`,
							node.line, { expected: stampClass === 'image' ? 'an image first node' : 'a link first node' });
					}
				}
			}

			if (preset && preset.family === 'card' && preset.modifier === 'teaser') {
				node.teaser = analyzeTeaser(node.markdown);
			}
		}

		function applyCommon(node, attrs, lineNo) {
			for (const key of ['id', 'label', 'preset']) {
				if (attrs[key] !== undefined) node[key] = attrs[key];
			}
			if (attrs.id !== undefined) {
				const previous = ids.get(attrs.id);
				if (previous !== undefined) {
					report('error', 'duplicate-id', `duplicate id "${attrs.id}" (first at line ${previous})`, lineNo,
						{ related: [{ line: previous, message: 'first use' }] });
				} else {
					ids.set(attrs.id, lineNo);
				}
			}
		}

		function validateAttributes(kind, attrs, lineNo) {
			if (kind !== 'block') return;
			if (attrs.repeat !== undefined && attrs.repeat !== 'header' && attrs.repeat !== 'footer') {
				report('error', 'repeat-invalid', `repeat "${attrs.repeat}" is not header or footer`, lineNo,
					{ expected: 'header | footer' });
			}
			const preset = presetParts(attrs.preset);
			const narration = !!preset && preset.family === 'narration';
			if (attrs.audio !== undefined) {
				if (!narration) {
					report('error', 'audio-without-narration', 'audio= is valid only on a narration block', lineNo);
				} else if (String(attrs.audio) === '') {
					report('error', 'empty-audio', 'audio= needs a destination', lineNo);
				}
			}
			if (attrs.name !== undefined) {
				if (!narration) {
					report('error', 'name-without-narration',
						'name= is the display name of a narration speaker; it is valid only on a narration block',
						lineNo);
				} else if (String(attrs.name) === '') {
					report('error', 'empty-name', 'name= needs a value', lineNo);
				} else {
					const id = preset.modifier || '';
					const previous = speakers.get(id);
					if (previous && previous.name !== attrs.name) {
						report('error', 'speaker-name-conflict',
							`speaker "${id || '(default)'}" is named "${previous.name}" at line ${previous.line} ` +
							`and "${attrs.name}" here`,
							lineNo, { related: [{ line: previous.line, message: 'first name' }] });
					} else if (!previous) {
						speakers.set(id, { name: attrs.name, line: lineNo });
					}
				}
			}
		}

		function finishColumns(lineNo) {
			const nodes = columns;
			columns = null;
			col = null;
			sawCol = false;
			mode = 'root';
			nodes.endLine = lineNo;

			const count = nodes.cols.length;
			if (count < 2) {
				report('error', 'columns-too-few-cols',
					`columns has ${count} col marker(s) — the count is the structure, minimum 2`,
					nodes.line, { expected: 'at least 2 col markers' });
			}
			const weights = nodes.attrs.weights;
			if (weights !== undefined) {
				const valid = Array.isArray(weights) && weights.length > 0 &&
					weights.every((weight) => typeof weight === 'number' && isFinite(weight) && weight > 0);
				if (!valid) {
					report('error', 'weights-invalid', 'weights must be a JSON array of positive numbers', nodes.line);
				} else if (weights.length !== count) {
					report('error', 'weights-length',
						`weights has ${weights.length} entries but the marker count is ${count}`, nodes.line,
						{ expected: 'one weight per col marker' });
				}
			}
			section.children.push(nodes);
		}

		function handleClose(kind, attrText, lineNo) {
			if (kind === 'main') {
				report('error', 'main-closing',
					'mb:/main does not exist — a main ends where the next mb:main begins, or at the end of the document',
					lineNo);
				return;
			}
			if (kind === 'block') {
				if (mode !== 'block') { report('error', 'stray-close', 'stray mb:/block — no block is open', lineNo); return; }
				if (attrText.trim()) report('error', 'close-attributes', 'mb:/block takes no attributes', lineNo);
				closeBlock(lineNo);
				return;
			}
			if (kind === 'columns') {
				if (mode !== 'columns' && mode !== 'col') {
					report('error', 'stray-close', 'stray mb:/columns — no columns are open', lineNo);
					return;
				}
				if (attrText.trim()) report('error', 'close-attributes', 'mb:/columns takes no attributes', lineNo);
				closeCol('/columns', lineNo);
				finishColumns(lineNo);
				return;
			}
			if (kind === 'col') {
				if (mode !== 'columns' && mode !== 'col') {
					report('error', 'col-outside-columns', 'mb:/col outside columns', lineNo);
					return;
				}
				if (attrText.trim()) report('error', 'close-attributes', 'mb:/col takes no attributes', lineNo);
				if (mode === 'col') closeCol('/col', lineNo);
				return;
			}
			report('error', 'stray-close', `mb:/${kind} is not a closing marker`, lineNo);
		}

		function handleDirective(match, lineNo) {
			directiveCount++;
			const closing = match[1] === '/';
			const kind = match[2];
			const attrText = match[3] || '';

			if (STRUCTURAL.indexOf(kind) === -1) {
				report('error', 'unknown-directive',
					`"mb:${kind}" is not a directive — the six kinds are main, section, block, columns, col, var, lowercase`,
					lineNo);
				return;
			}

			if (closing) { handleClose(kind, attrText, lineNo); return; }

			const attrs = parseAttributes(attrText, kind, lineNo, report);
			validateAttributes(kind, attrs, lineNo);

			if (kind === 'main') {
				if (mode !== 'root') {
					report('error', 'main-in-container',
						'mb:main is document level — it cannot appear inside a block or columns', lineNo);
					return;
				}
				flush(section);
				const untouched = !mainMarkerSeen && main.sections.length === 1 &&
					section.children.length === 0 && section.vars.length === 0 &&
					Object.keys(section.attrs).length === 0;
				if (untouched) {
					// §4.5: a marker that is the first thing in the document annotates the main it
					// opens rather than leaving an empty one in front of it.
					main.line = lineNo;
				} else {
					main.endLine = lineNo - 1;
					startMain(lineNo);
					startSection(lineNo);
				}
				main.attrs = attrs;
				applyCommon(main, attrs, lineNo);
				mainMarkerSeen = true;
				return;
			}

			if (kind === 'section') {
				if (mode !== 'root') {
					report('error', 'section-in-container', `mb:section cannot appear inside ${mode}`, lineNo);
					return;
				}
				flush(section);
				if (sectionMarkerSeen) {
					report('error', 'duplicate-section', 'a section carries at most one mb:section', lineNo);
					return;
				}
				section.attrs = attrs;
				applyCommon(section, attrs, lineNo);
				sectionMarkerSeen = true;
				return;
			}

			if (kind === 'block') {
				if (mode === 'block') {
					report('error', 'nested-block', `nested block — the open block starts at line ${block.line}`, lineNo);
					return;
				}
				if (mode === 'columns') {
					report('error', 'block-before-col', 'a block cannot appear inside columns before the first col', lineNo);
					return;
				}
				flush(innermost());
				blockReturn = mode === 'col' ? 'col' : 'root';
				block = { type: 'block', attrs, line: lineNo, endLine: lineNo, markdown: '' };
				applyCommon(block, attrs, lineNo);
				mode = 'block';
				return;
			}

			if (kind === 'columns') {
				if (mode !== 'root') {
					report('error', 'nested-columns', `columns cannot appear inside ${mode}`, lineNo);
					return;
				}
				flush(section);
				columns = { type: 'columns', attrs, cols: [], line: lineNo, endLine: lineNo };
				applyCommon(columns, attrs, lineNo);
				sawCol = false;
				mode = 'columns';
				return;
			}

			if (kind === 'col') {
				if (mode !== 'columns' && mode !== 'col') {
					report('error', 'col-outside-columns', 'a col marker is valid only inside columns', lineNo);
					return;
				}
				if (mode === 'col') closeCol('col', lineNo);
				col = { type: 'col', attrs, children: [], line: lineNo, endLine: lineNo, closedBy: null };
				applyCommon(col, attrs, lineNo);
				sawCol = true;
				mode = 'col';
				return;
			}

			// var
			if (mode !== 'root') {
				report('error', 'var-in-container', `var inside ${mode} — vars are section level only`, lineNo);
				return;
			}
			flush(section);
			if (attrs.name === undefined) {
				report('error', 'var-name-missing', 'var requires name=', lineNo);
				return;
			}
			const node = { type: 'var', name: attrs.name, attrs, line: lineNo, endLine: lineNo, value: undefined, fenced: null };
			const scope = `${doc.mains.indexOf(main)}:${main.sections.indexOf(section)}:${attrs.name}`;
			const previous = varNames.get(scope);
			if (previous !== undefined) {
				report('error', 'duplicate-var-name',
					`duplicate var name "${attrs.name}" in this section (first at line ${previous})`, lineNo,
					{ related: [{ line: previous, message: 'first use' }] });
			} else {
				varNames.set(scope, lineNo);
			}
			if (attrs.value !== undefined) node.value = attrs.value;
			else expectVar = node;
			section.vars.push(node);
		}

		for (; i < lines.length; i++) {
			const line = lines[i];
			const lineNo = i + 1;

			// A var and its fenced payload are one lexical unit (§4.4).
			if (varFence) {
				const close = FENCE_CLOSE_RE.exec(line);
				if (close && close[1][0] === varFence.char && close[1].length >= varFence.len) {
					const raw = varFence.body.join('\n');
					if (varFence.info === 'json') {
						try {
							varFence.node.value = JSON.parse(raw.trim() === '' ? 'null' : raw);
						} catch (err) {
							report('error', 'var-invalid-json',
								`var "${varFence.node.name}" payload is not valid JSON: ${err.message}`,
								varFence.line, { endLine: lineNo });
							varFence.node.value = raw;
						}
					} else {
						varFence.node.value = raw;
					}
					varFence.node.fenced = varFence.info;
					varFence.node.endLine = lineNo;
					varFence = null;
				} else {
					varFence.body.push(line);
				}
				prevLine = line;
				continue;
			}

			if (expectVar) {
				if (!line.trim()) { prevLine = line; continue; }
				const fenceMatch = FENCE_RE.exec(line);
				const info = fenceMatch ? fenceMatch[2].trim() : '';
				if (fenceMatch && (info === 'json' || info === 'text')) {
					varFence = {
						char: fenceMatch[1][0],
						len: fenceMatch[1].length,
						info,
						body: [],
						line: lineNo,
						node: expectVar,
					};
					expectVar = null;
					prevLine = line;
					continue;
				}
				report('error', 'var-missing-payload',
					`var "${expectVar.name}" has neither value= nor a json / text fence directly below it`,
					expectVar.line, { expected: 'value=<value>, or a ```json or ```text fence below it' });
				expectVar = null;
				// fall through: the line is ordinary content again
			}

			if (fence) {
				pushContent(line, lineNo);
				const close = FENCE_CLOSE_RE.exec(line);
				if (close && close[1][0] === fence.char && close[1].length >= fence.len) fence = null;
				prevLine = line;
				continue;
			}

			const open = FENCE_RE.exec(line);
			if (open) {
				pushContent(line, lineNo);
				fence = { char: open[1][0], len: open[1].length };
				prevLine = line;
				continue;
			}

			if (INDENTED_DIRECTIVE_RE.test(line) && indentationColumns(line) < 4) {
				report('error', 'directive-indented',
					'a directive must start at column 0 — an indented one is inside a list item, quote or code', lineNo);
				prevLine = line;
				continue;
			}

			const directive = DIRECTIVE_RE.exec(line);
			if (directive) {
				if (mode === 'block') {
					// The only directive a block holds is its own close; anything else is an authoring
					// error, and consuming it keeps the marker out of the block's Markdown body.
					const isClose = directive[1] === '/';
					const inner = directive[2];
					if (isClose) {
						handleClose(inner, directive[3] || '', lineNo);
					} else if (inner === 'block') {
						report('error', 'nested-block', `nested block — the open block starts at line ${block.line}`, lineNo);
					} else if (inner === 'columns') {
						report('error', 'nested-columns', 'columns cannot appear inside a block', lineNo);
					} else if (inner === 'main') {
						report('error', 'main-in-container',
							'mb:main is document level — it cannot appear inside a block', lineNo);
					} else {
						report('error', 'directive-in-block',
							`mb:${inner} inside a block — a block holds Markdown only`, lineNo);
					}
					prevLine = line;
					continue;
				}
				handleDirective(directive, lineNo);
				prevLine = line;
				continue;
			}

			const trimmed = line.trim();
			if (line[0] === '<' && ANY_MB_COMMENT_RE.test(trimmed) && trimmed.indexOf('-->') !== -1) {
				report('error', 'malformed-directive',
					'a directive is an HTML comment alone on its line, at column 0, with nothing after it', lineNo);
				prevLine = line;
				continue;
			}

			if (mode === 'root' && THEMATIC_RE.test(line)) {
				if (isParagraphLine(prevLine)) {
					// §3/§10: the parser does not second-guess CommonMark — this is a setext H2, so it
					// stays content and the missing blank line is what gets reported.
					report('warning', 'setext-trap',
						'a paragraph line directly above --- is a setext H2, not a section separator — ' +
						'surround the --- with blank lines', lineNo, { expected: 'a blank line above the ---' });
					pushContent(line, lineNo);
					prevLine = line;
					continue;
				}
				flush(section);
				section.endLine = lineNo - 1;
				startSection(lineNo);
				prevLine = line;
				continue;
			}

			pushContent(line, lineNo);
			prevLine = line;
		}

		if (fence) report('error', 'unclosed-fence', 'code fence is never closed', lines.length, { endLine: lines.length });
		if (varFence) {
			report('error', 'unclosed-var-fence', `var "${varFence.node.name}" payload fence is never closed`,
				varFence.line, { endLine: lines.length });
		}
		if (expectVar) {
			report('error', 'var-missing-payload',
				`var "${expectVar.name}" has neither value= nor a json / text fence directly below it`,
				expectVar.line, { expected: 'value=<value>, or a ```json or ```text fence below it' });
		}
		if (mode === 'block' && block) {
			report('error', 'unclosed-block', `block opened at line ${block.line} is never closed`,
				lines.length, { related: [{ line: block.line, message: 'opened here' }] });
			closeBlock(lines.length);
		}
		if (mode === 'columns' || mode === 'col') {
			report('error', 'unclosed-columns', `columns opened at line ${columns.line} is never closed`,
				lines.length, { related: [{ line: columns.line, message: 'opened here' }] });
			closeCol('/columns', lines.length);
			finishColumns(lines.length);
		}

		flush(innermost());
		section.endLine = lines.length;
		main.endLine = lines.length;

		if (directiveCount === 0 && doc.frontmatter) {
			report('info', 'no-structure',
				'document has frontmatter but uses none of the format — valid, but it is plain prose with metadata', 1);
		}

		doc.diagnostics.sort((a, b) => a.line - b.line || (a.code < b.code ? -1 : a.code > b.code ? 1 : 0));
		return doc;
	}

	/* --------------------------------------------------------------- facade */

	function MDBlocksError(diagnostics) {
		const errors = diagnostics.filter((entry) => entry.severity === 'error');
		const first = errors[0];
		const error = new Error(first
			? `MD-Blocks: ${errors.length} error(s); first at line ${first.line}: ${first.message}`
			: 'MD-Blocks: parse failed');
		error.name = 'MDBlocksError';
		error.diagnostics = diagnostics;
		error.errors = errors;
		return error;
	}
	MDBlocksError.prototype = Object.create(Error.prototype);

	function errorsOf(doc) {
		return (doc.diagnostics || []).filter((entry) => entry.severity === 'error');
	}

	function warningsOf(doc) {
		return (doc.diagnostics || []).filter((entry) => entry.severity === 'warning');
	}

	function validate(source, options) {
		return parse(source, options).diagnostics;
	}

	// The fail-loud path for tools that must not publish a guessed tree (§7).
	function parseOrThrow(source, options) {
		const doc = parse(source, options);
		const errors = errorsOf(doc);
		if (errors.length) throw MDBlocksError(doc.diagnostics);
		return doc;
	}

	return {
		SPEC_VERSION,
		parse,
		parseOrThrow,
		validate,
		errorsOf,
		warningsOf,
		MDBlocksError,
		DEFAULT_EXTENSIONS,
	};
});
