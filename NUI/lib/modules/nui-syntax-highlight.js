// Minimal syntax highlighter - focused on web languages
// Languages: HTML, CSS, JavaScript, TypeScript, JSON
// Target: ~3KB minified
//
// The five languages are a DEFAULT, not a wall. A consumer can ask whether a language is
// known (supportsLanguage) and teach the module its own (registerLanguage) instead of
// discovering the boundary as uncoloured output — issue #69.

const BUILTIN_ALIASES = {
	html: 'html', xml: 'html',
	css: 'css',
	js: 'js', javascript: 'js',
	ts: 'ts', typescript: 'ts',
	json: 'json'
};

// The canonical grammars a caller can rely on. Aliases (js/javascript, ts/typescript,
// html/xml) resolve to these, so `supportsLanguage('javascript')` is true.
export const LANGUAGES = Object.freeze(['html', 'css', 'js', 'ts', 'json']);

// Consumer-supplied tokenizers, keyed by the name they registered. Same ESM module
// instance as the one `nui-code` imports lazily, so registering before a page renders is
// enough — no load-order dance.
const registered = new Map();

function normalizeLanguage(lang) {
	const key = String(lang == null ? '' : lang).trim().toLowerCase();
	if (!key) return '';
	// Known spellings resolve to the canonical grammar; anything else is returned as-is so
	// the caller can tell "no language given" (silent) from "a language nobody knows"
	// (worth one warning).
	return BUILTIN_ALIASES[key] || key;
}

// Ask before assigning `data-lang`: `if (supportsLanguage(ext)) el.dataset.lang = ext;`
export function supportsLanguage(lang) {
	const key = normalizeLanguage(lang);
	return !!key && (!!BUILTIN_ALIASES[key] || registered.has(key));
}

// Teach the module a language. `tokenize(escapedHtml, code)` receives the already
// escaped markup and the raw text, and returns markup using the same `hl-*` class names
// the built-ins emit, so the existing stylesheet colours it.
export function registerLanguage(name, tokenize) {
	const key = String(name == null ? '' : name).trim().toLowerCase();
	if (!key) throw new TypeError('[nui-syntax-highlight] registerLanguage(name, fn): a language name is required');
	if (typeof tokenize !== 'function') throw new TypeError(`[nui-syntax-highlight] registerLanguage("${key}", fn): fn must be a function`);
	registered.set(key, tokenize);
}

// One warning per language, not one per code block: a viewer that renders a directory of
// `.php` files would otherwise bury the console. Mirrors the "unknown preset — content
// rendered plain" precedent in the renderer.
const warnedUnknown = new Set();

function warnUnknownLanguage(lang) {
	const key = String(lang).trim().toLowerCase();
	if (warnedUnknown.has(key)) return;
	warnedUnknown.add(key);
	console.warn(`[nui-syntax-highlight] unknown language "${key}" — rendered as plain text. Known: ${LANGUAGES.join(', ')}. Add a tokenizer with registerLanguage("${key}", fn) from NUI/lib/modules/nui-syntax-highlight.js.`);
}

export function highlight(code, lang, forceEscape = false) {
	// Check if code is already escaped (contains &lt; etc)
	const isEscaped = !forceEscape && /&[lg]t;/.test(code);
	let html = isEscaped ? code : escapeHtml(code);

	const key = normalizeLanguage(lang);

	// A registered language owns its own markup; it runs on the escaped text so it can
	// never emit a tag that came from the input.
	if (key && registered.has(key)) {
		return registered.get(key)(html, code);
	}

	// Use placeholders to prevent nested replacements
	const tokens = [];
	let tokenId = 0;
	
	function wrap(match, className) {
		const token = `~~TOKEN_${tokenId++}~~`;
		tokens.push({ token, html: `<span class="hl-${className}">${match}</span>` });
		return token;
	}
	
	if (key === 'html') {
		// Comments first (highest priority)
		html = html.replace(/(&lt;!--[\s\S]*?--&gt;)/g, (m) => wrap(m, 'comment'));
		// Doctype
		html = html.replace(/(&lt;!DOCTYPE[^&]*?&gt;)/gi, (m) => wrap(m, 'keyword'));
		// Tags
		html = html.replace(/(&lt;\/?)([\w-]+)/g, (m, p1, p2) => p1 + wrap(p2, 'tag'));
		// Attributes
		html = html.replace(/([\w-]+)(?==)/g, (m) => wrap(m, 'attr'));
		// Attribute values (with proper escaping)
		html = html.replace(/=("(?:[^"\\]|\\.)*?"|'(?:[^'\\]|\\.)*?')/g, (m, p1) => '=' + wrap(p1, 'string'));
	} else if (key === 'css') {
		// Comments
		html = html.replace(/(\/\*[\s\S]*?\*\/)/g, (m) => wrap(m, 'comment'));
		// Strings (before other patterns to protect content)
		html = html.replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, (m) => wrap(m, 'string'));
		// At-rules
		html = html.replace(/(@[\w-]+)/g, (m) => wrap(m, 'keyword'));
		// !important
		html = html.replace(/(!important)\b/g, (m) => wrap(m, 'important'));
		// Pseudo-classes and pseudo-elements (with params)
		html = html.replace(/(::?[\w-]+(?:\([^)]*\))?)/g, (m) => wrap(m, 'pseudo'));
		// IDs and classes
		html = html.replace(/([.#][\w-]+)/g, (m) => wrap(m, 'selector'));
		// Property names (word before colon, not ::)
		html = html.replace(/\b([\w-]+)(?=\s*:(?!:))/g, (m) => wrap(m, 'prop'));
		// Functions
		html = html.replace(/\b([\w-]+)(?=\()/g, (m) => wrap(m, 'function'));
		// Numbers with units
		html = html.replace(/\b(\d+\.?\d*(?:px|em|rem|%|vh|vw|deg|s|ms)?)\b/g, (m) => wrap(m, 'number'));
	} else if (key === 'js') {
		// Template literals
		html = html.replace(/(`[^`\\]*(?:\\.[^`\\]*)*`)/g, (m) => wrap(m, 'template'));
		// Strings
		html = html.replace(/('[^'\\]*(?:\\.[^'\\]*)*'|"[^"\\]*(?:\\.[^"\\]*)*")/g, (m) => wrap(m, 'string'));
		// Comments
		html = html.replace(/(\/\/.*$)/gm, (m) => wrap(m, 'comment'));
		html = html.replace(/(\/\*[\s\S]*?\*\/)/g, (m) => wrap(m, 'comment'));
		// Keywords
		html = html.replace(/\b(const|let|var|function|return|if|else|for|while|do|break|continue|switch|case|default|class|extends|static|new|async|await|import|export|from|as|default|try|catch|finally|throw|typeof|instanceof|in|of|this|super|delete|void|yield|with)\b/g, (m) => wrap(m, 'keyword'));
		// Built-in objects
		html = html.replace(/\b(Array|Object|String|Number|Boolean|Symbol|BigInt|Date|Math|JSON|RegExp|Error|Promise|Proxy|Reflect|Set|Map|WeakSet|WeakMap|console|window|document|setTimeout|setInterval|clearTimeout|clearInterval|fetch|localStorage|sessionStorage)\b/g, (m) => wrap(m, 'builtin'));
		// Literals
		html = html.replace(/\b(true|false|null|undefined|NaN|Infinity)\b/g, (m) => wrap(m, 'literal'));
		// Numbers (hex, binary, octal, decimal, floats, scientific)
		html = html.replace(/\b(0x[0-9a-fA-F]+|0b[01]+|0o[0-7]+|\d+\.?\d*(?:[eE][+-]?\d+)?)\b/g, (m) => wrap(m, 'number'));
		// Property names in object literals (word followed by colon, not inside strings)
		html = html.replace(/\b([a-zA-Z_$][\w$]*)(?=\s*:(?!:))/g, (m) => wrap(m, 'prop'));
		// Function calls (conservative: lowercase start, before parens)
		html = html.replace(/\b([a-z_$][\w$]*)(?=\s*\()/g, (m) => wrap(m, 'function'));
	} else if (key === 'ts') {
		// Template literals
		html = html.replace(/(`[^`\\]*(?:\\.[^`\\]*)*`)/g, (m) => wrap(m, 'template'));
		// Strings
		html = html.replace(/('[^'\\]*(?:\\.[^'\\]*)*'|"[^"\\]*(?:\\.[^"\\]*)*")/g, (m) => wrap(m, 'string'));
		// Comments
		html = html.replace(/(\/\/.*$)/gm, (m) => wrap(m, 'comment'));
		html = html.replace(/(\/\*[\s\S]*?\*\/)/g, (m) => wrap(m, 'comment'));
		// TypeScript-specific keywords
		html = html.replace(/\b(interface|type|enum|namespace|declare|public|private|protected|readonly|abstract|implements|keyof|infer|is|as)\b/g, (m) => wrap(m, 'keyword'));
		// Regular JS keywords
		html = html.replace(/\b(const|let|var|function|return|if|else|for|while|do|break|continue|switch|case|default|class|extends|static|new|async|await|import|export|from|default|try|catch|finally|throw|typeof|instanceof|in|of|this|super|delete|void|yield|with)\b/g, (m) => wrap(m, 'keyword'));
		// Built-in objects
		html = html.replace(/\b(Array|Object|String|Number|Boolean|Symbol|Date|Math|JSON|RegExp|Error|Promise|Set|Map|console|window|document|fetch)\b/g, (m) => wrap(m, 'builtin'));
		// Type primitives
		html = html.replace(/\b(string|number|boolean|any|void|never|unknown|bigint|symbol)\b/g, (m) => wrap(m, 'type'));
		// Literals
		html = html.replace(/\b(true|false|null|undefined)\b/g, (m) => wrap(m, 'literal'));
		// Numbers
		html = html.replace(/\b(0x[0-9a-fA-F]+|0b[01]+|0o[0-7]+|\d+\.?\d*(?:[eE][+-]?\d+)?)\b/g, (m) => wrap(m, 'number'));
		// Generics in code
		html = html.replace(/&lt;([A-Z][\w,\s|&lt;&gt;]*)&gt;/g, (m, p1) => '&lt;' + wrap(p1, 'type') + '&gt;');
		// Property names in object literals (word followed by colon, not inside strings)
		html = html.replace(/\b([a-zA-Z_$][\w$]*)(?=\s*:(?!:))/g, (m) => wrap(m, 'prop'));
		// Function calls
		html = html.replace(/\b([a-z_$][\w$]*)(?=\s*\()/g, (m) => wrap(m, 'function'));
	} else if (key === 'json') {
		// Every rule captures the whitespace it matched and re-emits it verbatim. The
		// earlier form consumed `\s*` and emitted a literal space instead, which
		// collapsed pretty-printed JSON onto one line — a highlighter must never reflow
		// the text it is decorating: `"b": [\n    2` became `"b": [2`.
		// Keys (property names in quotes before colon)
		html = html.replace(/("(?:[^"\\]|\\.)*?")(\s*):/g, (m, p1, ws) => wrap(p1, 'prop') + ws + ':');
		// String values (after colon or in arrays, brackets)
		html = html.replace(/(:\s*)("(?:[^"\\]|\\.)*?")/g, (m, ws, p1) => ws + wrap(p1, 'string'));
		html = html.replace(/(\[\s*)("(?:[^"\\]|\\.)*?")/g, (m, ws, p1) => ws + wrap(p1, 'string'));
		html = html.replace(/(,\s*)("(?:[^"\\]|\\.)*?")/g, (m, ws, p1) => ws + wrap(p1, 'string'));
		// Boolean and null literals
		html = html.replace(/\b(true|false|null)\b/g, (m) => wrap(m, 'literal'));
		// Numbers (including negative, floats, scientific notation)
		html = html.replace(/(:\s*)(-?\d+\.?\d*(?:[eE][+-]?\d+)?)/g, (m, ws, p1) => ws + wrap(p1, 'number'));
		html = html.replace(/(\[\s*)(-?\d+\.?\d*(?:[eE][+-]?\d+)?)/g, (m, ws, p1) => ws + wrap(p1, 'number'));
		html = html.replace(/(,\s*)(-?\d+\.?\d*(?:[eE][+-]?\d+)?)/g, (m, ws, p1) => ws + wrap(p1, 'number'));
	} else if (key) {
		// Known-looking but unknown: say so once instead of rendering silence.
		warnUnknownLanguage(lang);
	}
	
	// Replace all tokens with actual HTML. 
	// Because tokens can be nested (e.g. a comment containing a string token), we loop until all are resolved.
	// But we use a single fast replace per pass instead of N loop allocations.
	let pass = 0;
	while (html.includes('~~TOKEN_') && pass < 10) {
		html = html.replace(/~~TOKEN_(\d+)~~/g, (m, id) => {
			return tokens[id] ? tokens[id].html : m;
		});
		pass++;
	}

	return html;
}

function escapeHtml(str) {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}
