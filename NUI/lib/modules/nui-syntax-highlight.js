// Minimal syntax highlighter - focused on web languages
// Languages: HTML, CSS, JavaScript, TypeScript, JSON
// Target: ~3KB minified

export function highlight(code, lang) {
	// Check if code is already escaped (contains &lt; etc)
	const isEscaped = /&[lg]t;/.test(code);
	let html = isEscaped ? code : escapeHtml(code);
	
	// Use placeholders to prevent nested replacements
	const tokens = [];
	let tokenId = 0;
	
	function wrap(match, className) {
		const token = `~~TOKEN_${tokenId++}~~`;
		tokens.push({ token, html: `<span class="hl-${className}">${match}</span>` });
		return token;
	}
	
	if (lang === 'html' || lang === 'xml') {
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
	} else if (lang === 'css') {
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
	} else if (lang === 'js' || lang === 'javascript') {
		// Comments
		html = html.replace(/(\/\/.*$)/gm, (m) => wrap(m, 'comment'));
		html = html.replace(/(\/\*[\s\S]*?\*\/)/g, (m) => wrap(m, 'comment'));
		// Template literals with ${} support
		html = html.replace(/(`(?:[^`\\$]|\\.|(?:\$(?!{))|\$\{[^}]*\})*`)/g, (m) => wrap(m, 'template'));
		// Strings
		html = html.replace(/('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/g, (m) => wrap(m, 'string'));
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
	} else if (lang === 'ts' || lang === 'typescript') {
		// Comments
		html = html.replace(/(\/\/.*$)/gm, (m) => wrap(m, 'comment'));
		html = html.replace(/(\/\*[\s\S]*?\*\/)/g, (m) => wrap(m, 'comment'));
		// Template literals
		html = html.replace(/(`(?:[^`\\$]|\\.|(?:\$(?!{))|\$\{[^}]*\})*`)/g, (m) => wrap(m, 'template'));
		// Strings
		html = html.replace(/('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/g, (m) => wrap(m, 'string'));
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
	} else if (lang === 'json') {
		// Keys (property names in quotes before colon)
		html = html.replace(/("(?:[^"\\]|\\.)*?")\s*:/g, (m, p1) => wrap(p1, 'prop') + ':');
		// String values (after colon or in arrays, brackets)
		html = html.replace(/:\s*("(?:[^"\\]|\\.)*?")/g, (m, p1) => ': ' + wrap(p1, 'string'));
		html = html.replace(/\[\s*("(?:[^"\\]|\\.)*?")/g, (m, p1) => '[' + wrap(p1, 'string'));
		html = html.replace(/,\s*("(?:[^"\\]|\\.)*?")/g, (m, p1) => ', ' + wrap(p1, 'string'));
		// Boolean and null literals
		html = html.replace(/\b(true|false|null)\b/g, (m) => wrap(m, 'literal'));
		// Numbers (including negative, floats, scientific notation)
		html = html.replace(/:\s*(-?\d+\.?\d*(?:[eE][+-]?\d+)?)/g, (m, p1) => ': ' + wrap(p1, 'number'));
		html = html.replace(/\[\s*(-?\d+\.?\d*(?:[eE][+-]?\d+)?)/g, (m, p1) => '[' + wrap(p1, 'number'));
		html = html.replace(/,\s*(-?\d+\.?\d*(?:[eE][+-]?\d+)?)/g, (m, p1) => ', ' + wrap(p1, 'number'));
	}
	
	// Replace all tokens with actual HTML
	tokens.forEach(({ token, html: replacement }) => {
		html = html.replace(token, replacement);
	});

	return html;
}

function escapeHtml(str) {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}
