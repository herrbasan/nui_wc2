// nui-syntax-highlight.js - Lightweight syntax highlighter
// Supports: JavaScript/TypeScript, HTML, CSS, Python, Bash, JSON, YAML, Markdown
// Multi-pass approach for quality: strip contexts → highlight → restore
// Target: ~10KB for all languages combined

const PLACEHOLDER_START = '\uE000';
const PLACEHOLDER_END = '\uE001';

export function highlight(code, lang, forceEscape = false, streaming = false) {
    const isEscaped = !forceEscape && /&[lg]t;/.test(code);
    let html = isEscaped ? code : escapeHtml(code);

    const langLower = (lang || '').toLowerCase();

    if (langLower === 'html' || langLower === 'xml') {
        return streaming ? highlightHtmlSimple(html) : highlightHtml(html);
    } else if (langLower === 'css') {
        return streaming ? highlightCssSimple(html) : highlightCss(html);
    } else if (langLower === 'js' || langLower === 'javascript') {
        return streaming ? highlightJsSimple(html) : highlightJs(html);
    } else if (langLower === 'py' || langLower === 'python') {
        return streaming ? highlightPythonSimple(html) : highlightPython(html);
    } else if (langLower === 'bash' || langLower === 'sh' || langLower === 'shell' || langLower === 'zsh') {
        return streaming ? highlightBashSimple(html) : highlightBash(html);
    } else if (langLower === 'json') {
        return streaming ? highlightJsonSimple(html) : highlightJson(html);
    } else if (langLower === 'yaml' || langLower === 'yml') {
        return highlightYamlSimple(html);
    } else if (langLower === 'md' || langLower === 'markdown') {
        return highlightMarkdownSimple(html);
    } else if (langLower === 'sql') {
        return highlightSqlSimple(html);
    } else if (langLower === 'php') {
        return highlightPhpSimple(html);
    } else if (langLower === 'rb' || langLower === 'ruby') {
        return highlightRubySimple(html);
    } else if (langLower === 'go') {
        return highlightGoSimple(html);
    } else if (langLower === 'rust') {
        return highlightRustSimple(html);
    }

    return html;
}

// ============================================
// JavaScript Highlighting
// ============================================

// Simple mode for streaming - no context extraction, just basic keyword highlighting
function highlightJsSimple(html) {
    html = highlightJsKeywords(html);
    html = highlightJsBuiltins(html);
    html = highlightJsNumbers(html);
    html = highlightJsFunctions(html);
    return html;
}

// Full mode with multi-pass context extraction for complete code
function highlightJs(html) {
    const ctx = extractContexts(html);
    let code = ctx.code;

    code = highlightJsKeywords(code);
    code = highlightJsBuiltins(code);
    code = highlightJsNumbers(code);
    code = highlightJsFunctions(code);

    // Restore contexts with highlighting
    code = restoreContexts(code, ctx);

    return code;
}

function extractContexts(code) {
    const contexts = [];
    let result = code;

    // Order matters: template literals first (can contain backticks inside)
    // Multi-line comments, single-line comments, template literals, strings
    const patterns = [
        { regex: /`[^`\\]*(?:\\.[^`\\]*)*`/g },  // template literals
        { regex: /\/\*[\s\S]*?\*\//g },           // multi-line comments
        { regex: /\/\/.*$/gm },                    // single-line comments
        { regex: /'(?:[^'\\]|\\.)*'/g },            // single-quoted strings
        { regex: /"(?:[^"\\]|\\.)*"/g },            // double-quoted strings
    ];

    for (const pattern of patterns) {
        result = result.replace(pattern.regex, (match) => {
            const idx = contexts.length;
            // Store the original string (with escapes) for restoration
            contexts.push({ placeholder: `${PLACEHOLDER_START}${idx}${PLACEHOLDER_END}`, content: match });
            return `${PLACEHOLDER_START}${idx}${PLACEHOLDER_END}`;
        });
    }

    return { code: result, contexts };
}

function restoreContexts(code, ctx) {
    let result = code;
    for (let i = 0; i < ctx.contexts.length; i++) {
        const { placeholder, content } = ctx.contexts[i];
        result = result.replace(placeholder, content);
    }
    return result;
}

function highlightJsKeywords(code) {
    const jsKeywords = /\b(const|let|var|function|return|if|else|for|while|do|break|continue|switch|case|default|class|extends|static|new|async|await|import|export|from|as|try|catch|finally|throw|typeof|instanceof|in|of|this|super|delete|void|yield|with|debugger)\b/g;
    code = code.replace(jsKeywords, (m) => `<span class="hl-keyword">${m}</span>`);

    const literals = /\b(true|false|null|NaN|Infinity)\b/g;
    code = code.replace(literals, (m) => `<span class="hl-literal">${m}</span>`);

    return code;
}

function highlightJsBuiltins(code) {
    const builtins = /\b(Array|Object|String|Number|Boolean|Symbol|BigInt|Date|Math|JSON|RegExp|Error|Promise|Proxy|Reflect|Set|Map|WeakSet|WeakMap|console|window|document|performance|localStorage|sessionStorage|navigator|fetch|setTimeout|setInterval|clearTimeout|clearInterval|requestAnimationFrame|process|exports|module|require)\b/g;
    return code.replace(builtins, (m) => `<span class="hl-builtin">${m}</span>`);
}

function highlightJsNumbers(code) {
    // Hex, binary, octal, decimal, floats, scientific notation
    return code.replace(/\b(0x[0-9a-fA-F]+|0b[01]+|0o[0-7]+|\d+\.?\d*(?:[eE][+-]?\d+)?)\b/g, (m) => `<span class="hl-number">${m}</span>`);
}

function highlightJsFunctions(code) {
    // Function calls (lowercase identifier before parens)
    return code.replace(/\b([a-z_$][\w$]*)(?=\s*\()/g, (m) => `<span class="hl-function">${m}</span></span>`);
}

// ============================================
// HTML Highlighting
// ============================================

function highlightHtmlSimple(html) {
    // Simple mode - basic highlighting without context extraction
    html = html.replace(/(&lt;!--[\s\S]*?--&gt;)/g, (m) => `<span class="hl-comment">${m}</span>`);
    html = html.replace(/(&lt;!DOCTYPE[^&]*?&gt;)/gi, (m) => `<span class="hl-keyword">${m}</span>`);
    html = html.replace(/(&lt;\/?)([\w-]+)/g, (m, prefix, tag) => `${prefix}<span class="hl-tag">${tag}</span>`);
    html = html.replace(/([\w-]+)(?==)/g, (m) => `<span class="hl-attr">${m}</span>`);
    html = html.replace(/=("(?:[^"\\]|\\.)*?"|'(?:[^'\\]|\\.)*?')/g, (m, val) => `=<span class="hl-string">${val}</span>`);
    return html;
}

function highlightHtml(html) {
    const ctx = extractHtmlContexts(html);
    let code = ctx.code;

    // Comments first (highest priority)
    code = code.replace(/(&lt;!--[\s\S]*?--&gt;)/g, (m) => `<span class="hl-comment">${m}</span>`);

    // Doctype
    code = code.replace(/(&lt;!DOCTYPE[^&]*?&gt;)/gi, (m) => `<span class="hl-keyword">${m}</span>`);

    // Tags - capture opening/closing and tag name
    code = code.replace(/(&lt;\/?)([\w-]+)/g, (m, prefix, tag) => `${prefix}<span class="hl-tag">${tag}</span>`);

    // Attributes
    code = code.replace(/([\w-]+)(?==)/g, (m) => `<span class="hl-attr">${m}</span>`);

    // Attribute values
    code = code.replace(/=("(?:[^"\\]|\\.)*?"|'(?:[^'\\]|\\.)*?')/g, (m, val) => `=<span class="hl-string">${val}</span>`);

    return restoreHtmlContexts(code, ctx);
}

function extractHtmlContexts(code) {
    const contexts = [];
    let result = code;

    // Extract script and style contents
    const patterns = [
        { regex: /(&lt;script[\s\S]*?&lt;\/script&gt;)/gi },
        { regex: /(&lt;style[\s\S]*?&lt;\/style&gt;)/gi },
        { regex: /(?:&lt;textarea[\s\S]*?&lt;\/textarea&gt;)/gi },
    ];

    for (const pattern of patterns) {
        result = result.replace(pattern.regex, (match) => {
            const idx = contexts.length;
            contexts.push({ placeholder: `${PLACEHOLDER_START}HTML${idx}${PLACEHOLDER_END}`, content: match });
            return `${PLACEHOLDER_START}HTML${idx}${PLACEHOLDER_END}`;
        });
    }

    return { code: result, contexts };
}

function restoreHtmlContexts(code, ctx) {
    let result = code;
    for (let i = 0; i < ctx.contexts.length; i++) {
        const { placeholder, content } = ctx.contexts[i];
        result = result.replace(placeholder, content);
    }
    return result;
}

// ============================================
// CSS Highlighting
// ============================================

function highlightCssSimple(html) {
    html = html.replace(/(\/\*[\s\S]*?\*\/)/g, (m) => `<span class="hl-comment">${m}</span>`);
    html = html.replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, (m) => `<span class="hl-string">${m}</span>`);
    html = html.replace(/(@[\w-]+)/g, (m) => `<span class="hl-keyword">${m}</span>`);
    html = html.replace(/(!important)\b/g, (m) => `<span class="hl-important">${m}</span>`);
    html = html.replace(/(::?[\w-]+(?:\([^)]*\))?)/g, (m) => `<span class="hl-pseudo">${m}</span>`);
    html = html.replace(/([.#][\w-]+)/g, (m) => `<span class="hl-selector">${m}</span>`);
    html = html.replace(/\b([\w-]+)(?=\s*:(?!:))/g, (m) => `<span class="hl-prop">${m}</span>`);
    html = html.replace(/\b([\w-]+)(?=\()/g, (m) => `<span class="hl-function">${m}</span>`);
    html = html.replace(/\b(\d+\.?\d*(?:px|em|rem|%|vh|vw|deg|s|ms|vmin|vmax|ch|ex|cm|mm|in|pt|pc)?)\b/g, (m) => `<span class="hl-number">${m}</span>`);
    return html;
}

function highlightCss(html) {
    const ctx = extractCssContexts(html);
    let code = ctx.code;

    // Comments
    code = code.replace(/(\/\*[\s\S]*?\*\/)/g, (m) => `<span class="hl-comment">${m}</span>`);

    // Strings
    code = code.replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, (m) => `<span class="hl-string">${m}</span>`);

    // At-rules
    code = code.replace(/(@[\w-]+)/g, (m) => `<span class="hl-keyword">${m}</span>`);

    // !important
    code = code.replace(/(!important)\b/g, (m) => `<span class="hl-important">${m}</span>`);

    // Pseudo-classes and pseudo-elements
    code = code.replace(/(::?[\w-]+(?:\([^)]*\))?)/g, (m) => `<span class="hl-pseudo">${m}</span>`);

    // IDs and classes
    code = code.replace(/([.#][\w-]+)/g, (m) => `<span class="hl-selector">${m}</span>`);

    // Property names
    code = code.replace(/\b([\w-]+)(?=\s*:(?!:))/g, (m) => `<span class="hl-prop">${m}</span>`);

    // Functions
    code = code.replace(/\b([\w-]+)(?=\()/g, (m) => `<span class="hl-function">${m}</span>`);

    // Numbers with units
    code = code.replace(/\b(\d+\.?\d*(?:px|em|rem|%|vh|vw|deg|s|ms|vmin|vmax|ch|ex|cm|mm|in|pt|pc)?)\b/g, (m) => `<span class="hl-number">${m}</span>`);

    return restoreCssContexts(code, ctx);
}

function extractCssContexts(code) {
    const contexts = [];
    let result = code;

    result = result.replace(/(\/[^\/]*\/[gimy]*)/g, (match) => {
        const idx = contexts.length;
        contexts.push({ placeholder: `${PLACEHOLDER_START}CSS${idx}${PLACEHOLDER_END}`, content: match });
        return `${PLACEHOLDER_START}CSS${idx}${PLACEHOLDER_END}`;
    });

    return { code: result, contexts };
}

function restoreCssContexts(code, ctx) {
    let result = code;
    for (let i = 0; i < ctx.contexts.length; i++) {
        const { placeholder, content } = ctx.contexts[i];
        result = result.replace(placeholder, content);
    }
    return result;
}

// ============================================
// Python Highlighting
// ============================================

function highlightPythonSimple(html) {
    const pyKeywords = /\b(def|class|return|if|elif|else|for|while|break|continue|pass|import|from|as|try|except|finally|raise|with|lambda|yield|global|nonlocal|assert|True|False|None|and|or|not|in|is|async|await)\b/g;
    html = html.replace(pyKeywords, (m) => `<span class="hl-keyword">${m}</span>`);
    const pyBuiltins = /\b(print|len|range|str|int|float|list|dict|set|tuple|bool|type|isinstance|hasattr|getattr|setattr|open|input|map|filter|zip|enumerate|sorted|reversed|min|max|sum|abs|round|pow|divmod|hex|oct|bin|ord|chr|repr|format|frozenset)\b/g;
    html = html.replace(pyBuiltins, (m) => `<span class="hl-builtin">${m}</span>`);
    html = html.replace(/(@[\w.]+)/g, (m) => `<span class="hl-decorator">${m}</span>`);
    html = html.replace(/\b(0x[0-9a-fA-F]+|0b[01]+|0o[0-7]+|\d+\.?\d*(?:[eE][+-]?\d+)?j?)\b/g, (m) => `<span class="hl-number">${m}</span>`);
    html = html.replace(/\b(self)\b/g, (m) => `<span class="hl-literal">${m}</span>`);
    return html;
}

function highlightPython(html) {
    const ctx = extractPythonContexts(html);
    let code = ctx.code;

    // Keywords
    const pyKeywords = /\b(def|class|return|if|elif|else|for|while|break|continue|pass|import|from|as|try|except|finally|raise|with|lambda|yield|global|nonlocal|assert|True|False|None|and|or|not|in|is|async|await)\b/g;
    code = code.replace(pyKeywords, (m) => `<span class="hl-keyword">${m}</span>`);

    // Builtins
    const pyBuiltins = /\b(print|len|range|str|int|float|list|dict|set|tuple|bool|type|isinstance|hasattr|getattr|setattr|open|input|map|filter|zip|enumerate|sorted|reversed|min|max|sum|abs|round|pow|divmod|hex|oct|bin|ord|chr|repr|format|frozenset)\b/g;
    code = code.replace(pyBuiltins, (m) => `<span class="hl-builtin">${m}</span>`);

    // Decorators
    code = code.replace(/(@[\w.]+)/g, (m) => `<span class="hl-decorator">${m}</span>`);

    // Numbers
    code = code.replace(/\b(0x[0-9a-fA-F]+|0b[01]+|0o[0-7]+|\d+\.?\d*(?:[eE][+-]?\d+)?j?)\b/g, (m) => `<span class="hl-number">${m}</span>`);

    // Function definitions (def name)
    code = code.replace(/\b(def)\s+([\w]+)/g, (m, kw, name) => `<span class="hl-keyword">${kw}</span> <span class="hl-function">${name}</span>`);

    // Class definitions (class name)
    code = code.replace(/\b(class)\s+([\w]+)/g, (m, kw, name) => `<span class="hl-keyword">${kw}</span> <span class="hl-class">${name}</span>`);

    // Self
    code = code.replace(/\b(self)\b/g, (m) => `<span class="hl-literal">${m}</span>`);

    return restorePythonContexts(code, ctx);
}

function extractPythonContexts(code) {
    const contexts = [];
    let result = code;

    // Triple-quoted strings first (highest priority)
    const patterns = [
        { regex: /"""[\s\S]*?"""/g },
        { regex: /'''[\s\S]*?'''/g },
        { regex: /#[^\n]*/g },  // Comments
    ];

    for (const pattern of patterns) {
        result = result.replace(pattern.regex, (match) => {
            const idx = contexts.length;
            contexts.push({ placeholder: `${PLACEHOLDER_START}PY${idx}${PLACEHOLDER_END}`, content: match });
            return `${PLACEHOLDER_START}PY${idx}${PLACEHOLDER_END}`;
        });
    }

    return { code: result, contexts };
}

function restorePythonContexts(code, ctx) {
    let result = code;
    for (let i = 0; i < ctx.contexts.length; i++) {
        const { placeholder, content } = ctx.contexts[i];
        result = result.replace(placeholder, content);
    }
    return result;
}

// ============================================
// Bash/Shell Highlighting
// ============================================

function highlightBashSimple(html) {
    html = html.replace(/(#[^\n]*)/g, (m) => `<span class="hl-comment">${m}</span>`);
    html = html.replace(/(^#!\/[^\s]+[^\n]*)/g, (m) => `<span class="hl-meta">${m}</span>`);
    const bashKeywords = /\b(if|then|else|elif|fi|case|esac|for|while|until|do|done|in|function|select|time|coproc|export|local|readonly|declare|typeset|unset|shift|exit|return|break|continue|trap|eval|exec|source|alias|unalias|cd|pwd|echo|printf|read|test|true|false|history|jobs|fg|bg|wait|kill|umask)\b/g;
    html = html.replace(bashKeywords, (m) => `<span class="hl-keyword">${m}</span>`);
    html = html.replace(/(\$\{?[\w]+\}?)/g, (m) => `<span class="hl-variable">${m}</span>`);
    html = html.replace(/(\$[0-9]+)/g, (m) => `<span class="hl-variable">${m}</span>`);
    html = html.replace(/(\$\([^)]*\))/g, (m) => `<span class="hl-subst">${m}</span>`);
    html = html.replace(/("(?:[^"\\]|\\.)*")/g, (m) => `<span class="hl-string">${m}</span>`);
    html = html.replace(/('(?:[^'\\]|\\.)*')/g, (m) => `<span class="hl-string">${m}</span>`);
    html = html.replace(/\b(\d+)\b/g, (m) => `<span class="hl-number">${m}</span>`);
    return html;
}

function highlightBash(html) {
    const ctx = extractBashContexts(html);
    let code = ctx.code;

    // Comments (must be first to avoid $# being interpreted as comment start)
    code = code.replace(/(#[^\n]*)/g, (m) => `<span class="hl-comment">${m}</span>`);

    // Shebang
    code = code.replace(/(^#!\/[^\s]+[^\n]*)/g, (m) => `<span class="hl-meta">${m}</span>`);

    // Keywords
    const bashKeywords = /\b(if|then|else|elif|fi|case|esac|for|while|until|do|done|in|function|select|time|coproc|export|local|readonly|declare|typeset|unset|shift|exit|return|break|continue|trap|eval|exec|source|alias|unalias|cd|pwd|echo|printf|read|printf|test|true|false|history|jobs|fg|bg|wait|kill|umask|exit)\b/g;
    code = code.replace(bashKeywords, (m) => `<span class="hl-keyword">${m}</span>`);

    // Variables ($VAR, ${VAR}, $1, etc)
    code = code.replace(/(\$\{?[\w]+\}?)/g, (m) => `<span class="hl-variable">${m}</span>`);
    code = code.replace(/(\$[0-9]+)/g, (m) => `<span class="hl-variable">${m}</span>`);

    // Command substitution
    code = code.replace(/(\$\([^)]*\))/g, (m) => `<span class="hl-subst">${m}</span>`);
    code = code.replace(/(`[^`]+`)/g, (m) => `<span class="hl-subst">${m}</span>`);

    // Strings (single and double quoted)
    code = code.replace(/("(?:[^"\\]|\\.)*")/g, (m) => `<span class="hl-string">${m}</span>`);
    code = code.replace(/('(?:[^'\\]|\\.)*')/g, (m) => `<span class="hl-string">${m}</span>`);

    // Numbers
    code = code.replace(/\b(\d+)\b/g, (m) => `<span class="hl-number">${m}</span>`);

    return restoreBashContexts(code, ctx);
}

function extractBashContexts(code) {
    const contexts = [];
    let result = code;

    // Here-documents
    result = result.replace(/(&lt;&lt;-?\s*[\w-]+[\s\S]*?(?=^[\w-]+$))/gm, (match) => {
        const idx = contexts.length;
        contexts.push({ placeholder: `${PLACEHOLDER_START}BASH${idx}${PLACEHOLDER_END}`, content: match });
        return `${PLACEHOLDER_START}BASH${idx}${PLACEHOLDER_END}`;
    });

    return { code: result, contexts };
}

function restoreBashContexts(code, ctx) {
    let result = code;
    for (let i = 0; i < ctx.contexts.length; i++) {
        const { placeholder, content } = ctx.contexts[i];
        result = result.replace(placeholder, content);
    }
    return result;
}

// ============================================
// JSON Highlighting
// ============================================

function highlightJsonSimple(html) {
    html = html.replace(/("(?:[^"\\]|\\.)*")\s*:/g, (m) => `<span class="hl-prop">${m}</span>:`);
    html = html.replace(/:\s*("(?:[^"\\]|\\.)*")/g, (m) => `: <span class="hl-string">${m}</span>`);
    html = html.replace(/\b(true|false|null)\b/g, (m) => `<span class="hl-literal">${m}</span>`);
    html = html.replace(/:(\s*-?\d+\.?\d*(?:[eE][+-]?\d+)?)/g, (m, n) => `: <span class="hl-number">${n.trim()}</span>`);
    return html;
}

function highlightJson(html) {
    // Keys
    html = html.replace(/("(?:[^"\\]|\\.)*")\s*:/g, (m, key) => `<span class="hl-prop">${key}</span>:`);

    // String values
    html = html.replace(/:\s*("(?:[^"\\]|\\.)*")/g, (m, val) => `: <span class="hl-string">${val}</span>`);

    // Boolean and null
    html = html.replace(/\b(true|false|null)\b/g, (m) => `<span class="hl-literal">${m}</span>`);

    // Numbers
    html = html.replace(/:\s*(-?\d+\.?\d*(?:[eE][+-]?\d+)?)/g, (m, num) => `: <span class="hl-number">${num}</span>`);
    html = html.replace(/\[\s*(-?\d+\.?\d*(?:[eE][+-]?\d+)?)/g, (m, num) => `[<span class="hl-number">${num}</span>`);
    html = html.replace(/,\s*(-?\d+\.?\d*(?:[eE][+-]?\d+)?)/g, (m, num) => `, <span class="hl-number">${num}</span>`);

    return html;
}

// ============================================
// YAML Highlighting
// ============================================

function highlightYamlSimple(html) {
    html = html.replace(/(#[^\n]*)/g, (m) => `<span class="hl-comment">${m}</span>`);
    html = html.replace(/^(\s*)([\w-]+)(:\s*)/gm, (m, indent, key, colon) => `${indent}<span class="hl-key">${key}</span>${colon}`);
    html = html.replace(/\b(true|false|yes|no|on|off|null|~)\b/gi, (m) => `<span class="hl-literal">${m}</span>`);
    html = html.replace(/:\s*(-?\d+\.?\d*(?:[eE][+-]?\d+)?)/g, (m, num) => `: <span class="hl-number">${num}</span>`);
    html = html.replace(/("(?:[^"\\]|\\.)*")/g, (m) => `<span class="hl-string">${m}</span>`);
    html = html.replace(/([&*][\w-]+)/g, (m) => `<span class="hl-anchor">${m}</span>`);
    return html;
}

function highlightYaml(html) {
    const ctx = extractYamlContexts(html);
    let code = ctx.code;

    // Comments
    code = code.replace(/(#[^\n]*)/g, (m) => `<span class="hl-comment">${m}</span>`);

    // Keys (word followed by colon)
    code = code.replace(/^(\s*)([\w-]+)(:\s*)/gm, (m, indent, key, colon) => `${indent}<span class="hl-key">${key}</span>${colon}`);

    // Boolean and null literals
    code = code.replace(/\b(true|false|yes|no|on|off|null|~)\b/gi, (m) => `<span class="hl-literal">${m}</span>`);

    // Numbers
    code = code.replace(/:\s*(-?\d+\.?\d*(?:[eE][+-]?\d+)?)/g, (m, num) => `: <span class="hl-number">${num}</span>`);

    // Strings in quotes
    code = code.replace(/("(?:[^"\\]|\\.)*")/g, (m) => `<span class="hl-string">${m}</span>`);
    code = code.replace(/('(?:[^'\\]|\\.)*')/g, (m) => `<span class="hl-string">${m}</span>`);

    // Anchors and aliases
    code = code.replace(/([&*][\w-]+)/g, (m) => `<span class="hl-anchor">${m}</span>`);

    return restoreYamlContexts(code, ctx);
}

function extractYamlContexts(code) {
    const contexts = [];
    let result = code;

    // Multi-line strings with |
    result = result.replace(/(\|[^\n]*\n)([\s\S]*?)(?=^[\w-]+:)/gm, (m, marker, content) => {
        const idx = contexts.length;
        contexts.push({ placeholder: `${PLACEHOLDER_START}YML${idx}${PLACEHOLDER_END}`, content: m });
        return `${PLACEHOLDER_START}YML${idx}${PLACEHOLDER_END}`;
    });

    return { code: result, contexts };
}

function restoreYamlContexts(code, ctx) {
    let result = code;
    for (let i = 0; i < ctx.contexts.length; i++) {
        const { placeholder, content } = ctx.contexts[i];
        result = result.replace(placeholder, content);
    }
    return result;
}

// ============================================
// Markdown Highlighting (code blocks within)
// ============================================

function highlightMarkdownSimple(html) {
    html = html.replace(/(`[^`]+`)/g, (m) => `<span class="hl-inline-code">${m}</span>`);
    html = html.replace(/(\*\*[^*]+\*\*)/g, (m) => `<span class="hl-bold">${m}</span>`);
    html = html.replace(/(\*[^*]+\*)/g, (m) => `<span class="hl-italic">${m}</span>`);
    return html;
}

function highlightMarkdown(html) {
    // Inline code
    html = html.replace(/(`[^`]+`)/g, (m) => `<span class="hl-inline-code">${m}</span>`);

    // Bold
    html = html.replace(/(\*\*[^*]+\*\*)/g, (m) => `<span class="hl-bold">${m}</span>`);

    // Italic
    html = html.replace(/(\*[^*]+\*)/g, (m) => `<span class="hl-italic">${m}</span>`);

    // Links
    html = html.replace(/(\[)([^\]]+)(\]\()([^)]+)(\))/g, (m, open, text, middle, url, close) => {
        return `${open}<span class="hl-link-text">${text}</span>${middle}<span class="hl-link-url">${url}</span>${close}`;
    });

    return html;
}

// ============================================
// SQL Highlighting
// ============================================

function highlightSqlSimple(html) {
    const sqlKeywords = /\b(SELECT|FROM|WHERE|AND|OR|NOT|IN|IS|NULL|AS|ON|JOIN|LEFT|RIGHT|INNER|OUTER|FULL|CROSS|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|INDEX|DROP|ALTER|ADD|COLUMN|PRIMARY|KEY|FOREIGN|REFERENCES|UNIQUE|CHECK|DEFAULT|CONSTRAINT|DISTINCT|COUNT|SUM|AVG|MIN|MAX|GROUP|BY|ORDER|ASC|DESC|HAVING|LIMIT|OFFSET|UNION|ALL|EXISTS|BETWEEN|LIKE|CASE|WHEN|THEN|ELSE|END|TRANSACTION|BEGIN|COMMIT|ROLLBACK|GRANT|REVOKE|VIEW|PROCEDURE|FUNCTION|TRIGGER|DECLARE|IF|RETURN|EXEC|EXECUTE|CAST|CONVERT|COALESCE|NULLIF|TRUE|FALSE)\b/gi;
    html = html.replace(sqlKeywords, (m) => `<span class="hl-keyword">${m}</span>`);
    const sqlFuncs = /\b(COUNT|SUM|AVG|MIN|MAX|COALESCE|NULLIF|CAST|CONVERT|SUBSTRING|TRIM|UPPER|LOWER|LENGTH|REPLACE|ROUND|FLOOR|CEIL|ABS|NOW|DATE|TIME|YEAR|MONTH|DAY|HOUR|MINUTE|SECOND|CONCAT|LEFT|RIGHT|REVERSE)\b/gi;
    html = html.replace(sqlFuncs, (m) => `<span class="hl-function">${m}</span>`);
    html = html.replace(/('(?:[^'\\]|\\.)*')/g, (m) => `<span class="hl-string">${m}</span>`);
    html = html.replace(/\b(\d+\.?\d*)\b/g, (m) => `<span class="hl-number">${m}</span>`);
    html = html.replace(/(--[^\n]*)/g, (m) => `<span class="hl-comment">${m}</span>`);
    return html;
}

function highlightSql(html) {
    const ctx = extractSqlContexts(html);
    let code = ctx.code;

    // Keywords
    const sqlKeywords = /\b(SELECT|FROM|WHERE|AND|OR|NOT|IN|IS|NULL|AS|ON|JOIN|LEFT|RIGHT|INNER|OUTER|FULL|CROSS|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|INDEX|DROP|ALTER|ADD|COLUMN|PRIMARY|KEY|FOREIGN|REFERENCES|UNIQUE|CHECK|DEFAULT|CONSTRAINT|DISTINCT|COUNT|SUM|AVG|MIN|MAX|GROUP|BY|ORDER|ASC|DESC|HAVING|LIMIT|OFFSET|UNION|ALL|EXISTS|BETWEEN|LIKE|INNER|OUTER|CASE|WHEN|THEN|ELSE|END|TRANSACTION|BEGIN|COMMIT|ROLLBACK|GRANT|REVOKE|VIEW|PROCEDURE|FUNCTION|TRIGGER|DECLARE|BEGIN|END|IF|ELSE|RETURN|EXEC|EXECUTE|CAST|CONVERT|COALESCE|NULLIF|TRUE|FALSE)\b/gi;
    code = code.replace(sqlKeywords, (m) => `<span class="hl-keyword">${m}</span>`);

    // Functions
    const sqlFuncs = /\b(COUNT|SUM|AVG|MIN|MAX|COALESCE|NULLIF|CAST|CONVERT|SUBSTRING|TRIM|UPPER|LOWER|LENGTH|REPLACE|ROUND|FLOOR|CEIL|ABS|NOW|DATE|TIME|YEAR|MONTH|DAY|HOUR|MINUTE|SECOND|CONCAT|LEFT|RIGHT|REVERSE)\b/gi;
    code = code.replace(sqlFuncs, (m) => `<span class="hl-function">${m}</span>`);

    // Strings
    code = code.replace(/('(?:[^'\\]|\\.)*')/g, (m) => `<span class="hl-string">${m}</span>`);

    // Numbers
    code = code.replace(/\b(\d+\.?\d*)\b/g, (m) => `<span class="hl-number">${m}</span>`);

    // Comments
    code = code.replace(/(--[^\n]*)/g, (m) => `<span class="hl-comment">${m}</span>`);

    return restoreSqlContexts(code, ctx);
}

function extractSqlContexts(code) {
    const contexts = [];
    let result = code;

    // Block comments
    result = result.replace(/(\/\*[\s\S]*?\*\/)/g, (match) => {
        const idx = contexts.length;
        contexts.push({ placeholder: `${PLACEHOLDER_START}SQL${idx}${PLACEHOLDER_END}`, content: match });
        return `${PLACEHOLDER_START}SQL${idx}${PLACEHOLDER_END}`;
    });

    return { code: result, contexts };
}

function restoreSqlContexts(code, ctx) {
    let result = code;
    for (let i = 0; i < ctx.contexts.length; i++) {
        const { placeholder, content } = ctx.contexts[i];
        result = result.replace(placeholder, content);
    }
    return result;
}

// ============================================
// PHP Highlighting
// ============================================

function highlightPhpSimple(html) {
    const phpKeywords = /\b(echo|print|return|if|else|elseif|endif|for|foreach|while|do|switch|case|break|continue|default|function|class|extends|implements|trait|interface|public|private|protected|static|final|abstract|const|new|clone|instanceof|try|catch|finally|throw|use|namespace|as|require|include|require_once|include_once|true|false|null|array|global|isset|unset|empty|die|exit|eval)\b/gi;
    html = html.replace(phpKeywords, (m) => `<span class="hl-keyword">${m}</span>`);
    const phpBuiltins = /\b(count|strlen|strpos|substr|trim|ucfirst|lcfirst|strtolower|strtoupper|str_replace|explode|implode|array_map|array_filter|array_reduce|array_keys|array_values|in_array|array_search|sort|usort|ksort|krsort|json_encode|json_decode|date|time|mktime|strtotime|file_get_contents|file_put_contents|fopen|fclose|fread|fwrite|preg_match|preg_replace|filter_var|htmlspecialchars|addslashes|stripslashes)\b/gi;
    html = html.replace(phpBuiltins, (m) => `<span class="hl-builtin">${m}</span>`);
    html = html.replace(/(\$[\w]+)/g, (m) => `<span class="hl-variable">${m}</span>`);
    html = html.replace(/("(?:[^"\\]|\\.)*")/g, (m) => `<span class="hl-string">${m}</span>`);
    html = html.replace(/('(?:[^'\\]|\\.)*')/g, (m) => `<span class="hl-string">${m}</span>`);
    html = html.replace(/\b(\d+\.?\d*)\b/g, (m) => `<span class="hl-number">${m}</span>`);
    return html;
}

function highlightPhp(html) {
    const ctx = extractPhpContexts(html);
    let code = ctx.code;

    // PHP keywords
    const phpKeywords = /\b(echo|print|return|if|else|elseif|endif|for|foreach|while|do|switch|case|break|continue|default|function|class|extends|implements|trait|interface|public|private|protected|static|final|abstract|const|new|clone|instanceof|try|catch|finally|throw|use|namespace|as|require|include|require_once|include_once|true|false|null|array|global|isset|unset|empty|die|exit|eval)\b/gi;
    code = code.replace(phpKeywords, (m) => `<span class="hl-keyword">${m}</span>`);

    // Built-in functions
    const phpBuiltins = /\b(count|strlen|strpos|substr|trim|ucfirst|lcfirst|strtolower|strtoupper|str_replace|explode|implode|array_map|array_filter|array_reduce|array_keys|array_values|in_array|array_search|sort|usort|ksort|krsort|json_encode|json_decode|date|time|mktime|strtotime|file_get_contents|file_put_contents|fopen|fclose|fread|fwrite|preg_match|preg_replace|filter_var|htmlspecialchars|addslashes|stripslashes)\b/gi;
    code = code.replace(phpBuiltins, (m) => `<span class="hl-builtin">${m}</span>`);

    // Variables
    code = code.replace(/(\$[\w]+)/g, (m) => `<span class="hl-variable">${m}</span>`);

    // Strings
    code = code.replace(/("(?:[^"\\]|\\.)*")/g, (m) => `<span class="hl-string">${m}</span>`);
    code = code.replace(/('(?:[^'\\]|\\.)*')/g, (m) => `<span class="hl-string">${m}</span>`);

    // Numbers
    code = code.replace(/\b(\d+\.?\d*)\b/g, (m) => `<span class="hl-number">${m}</span>`);

    return restorePhpContexts(code, ctx);
}

function extractPhpContexts(code) {
    const contexts = [];
    let result = code;

    // PHP tags
    result = result.replace(/(&lt;\?php[\s\S]*?\?&gt;)/g, (match) => {
        const idx = contexts.length;
        contexts.push({ placeholder: `${PLACEHOLDER_START}PHP${idx}${PLACEHOLDER_END}`, content: match });
        return `${PLACEHOLDER_START}PHP${idx}${PLACEHOLDER_END}`;
    });

    // HTML comments
    result = result.replace(/(&lt;!--[\s\S]*?--&gt;)/g, (match) => {
        const idx = contexts.length;
        contexts.push({ placeholder: `${PLACEHOLDER_START}PHPC${idx}${PLACEHOLDER_END}`, content: match });
        return `${PLACEHOLDER_START}PHPC${idx}${PLACEHOLDER_END}`;
    });

    return { code: result, contexts };
}

function restorePhpContexts(code, ctx) {
    let result = code;
    for (let i = 0; i < ctx.contexts.length; i++) {
        const { placeholder, content } = ctx.contexts[i];
        result = result.replace(placeholder, content);
    }
    return result;
}

// ============================================
// Ruby Highlighting
// ============================================

function highlightRubySimple(html) {
    const rbKeywords = /\b(def|class|module|end|if|elsif|else|unless|case|when|for|while|until|do|begin|rescue|ensure|raise|return|yield|break|next|redo|retry|self|super|new|true|false|nil|and|or|not|in|require|require_relative|include|extend|prepend|attr_reader|attr_writer|attr_accessor|public|private|protected|alias|defined\?|lambda|proc)\b/g;
    html = html.replace(rbKeywords, (m) => `<span class="hl-keyword">${m}</span>`);
    html = html.replace(/(:[\w]+)/g, (m) => `<span class="hl-symbol">${m}</span>`);
    html = html.replace(/("(?:[^"\\]|\\.)*")/g, (m) => `<span class="hl-string">${m}</span>`);
    html = html.replace(/('(?:[^'\\]|\\.)*')/g, (m) => `<span class="hl-string">${m}</span>`);
    html = html.replace(/\b(\d+\.?\d*)\b/g, (m) => `<span class="hl-number">${m}</span>`);
    html = html.replace(/(#[^\n]*)/g, (m) => `<span class="hl-comment">${m}</span>`);
    html = html.replace(/(@[\w]+)/g, (m) => `<span class="hl-ivar">${m}</span>`);
    return html;
}

function highlightRuby(html) {
    const ctx = extractRubyContexts(html);
    let code = ctx.code;

    // Keywords
    const rbKeywords = /\b(def|class|module|end|if|elsif|else|unless|case|when|for|while|until|do|begin|rescue|ensure|raise|return|yield|break|next|redo|retry|self|super|new|true|false|nil|and|or|not|in|require|require_relative|include|extend|prepend|attr_reader|attr_writer|attr_accessor|public|private|protected|alias|defined\?|lambda|proc)\b/g;
    code = code.replace(rbKeywords, (m) => `<span class="hl-keyword">${m}</span>`);

    // Symbols
    code = code.replace(/(:[\w]+)/g, (m) => `<span class="hl-symbol">${m}</span>`);

    // Strings
    code = code.replace(/("(?:[^"\\]|\\.)*")/g, (m) => `<span class="hl-string">${m}</span>`);
    code = code.replace(/('(?:[^'\\]|\\.)*')/g, (m) => `<span class="hl-string">${m}</span>`);

    // Numbers
    code = code.replace(/\b(\d+\.?\d*)\b/g, (m) => `<span class="hl-number">${m}</span>`);

    // Comments
    code = code.replace(/(#[^\n]*)/g, (m) => `<span class="hl-comment">${m}</span>`);

    // Instance variables
    code = code.replace(/(@[\w]+)/g, (m) => `<span class="hl-ivar">${m}</span>`);

    // Class variables
    code = code.replace(/(@@[\w]+)/g, (m) => `<span class="hl-cvar">${m}</span>`);

    // Global variables
    code = code.replace(/(\$[\w]+)/g, (m) => `<span class="hl-gvar">${m}</span>`);

    return restoreRubyContexts(code, ctx);
}

function extractRubyContexts(code) {
    const contexts = [];
    let result = code;

    // %w[] and %i[] arrays
    result = result.replace(/(%[wi]\[[^\]]*\])/g, (match) => {
        const idx = contexts.length;
        contexts.push({ placeholder: `${PLACEHOLDER_START}RB${idx}${PLACEHOLDER_END}`, content: match });
        return `${PLACEHOLDER_START}RB${idx}${PLACEHOLDER_END}`;
    });

    return { code: result, contexts };
}

function restoreRubyContexts(code, ctx) {
    let result = code;
    for (let i = 0; i < ctx.contexts.length; i++) {
        const { placeholder, content } = ctx.contexts[i];
        result = result.replace(placeholder, content);
    }
    return result;
}

// ============================================
// Go Highlighting
// ============================================

function highlightGoSimple(html) {
    const goKeywords = /\b(func|return|if|else|for|range|switch|case|default|break|continue|go|defer|select|chan|map|struct|interface|type|package|import|var|const|true|false|nil|iota|make|new|len|cap|append|copy|delete|panic|recover)\b/g;
    html = html.replace(goKeywords, (m) => `<span class="hl-keyword">${m}</span>`);
    const goTypes = /\b(int|int8|int16|int32|int64|uint|uint8|uint16|uint32|uint64|float32|float64|complex64|complex128|bool|byte|rune|string|error|any)\b/g;
    html = html.replace(goTypes, (m) => `<span class="hl-type">${m}</span>`);
    html = html.replace(/("(?:[^"\\]|\\.)*")/g, (m) => `<span class="hl-string">${m}</span>`);
    html = html.replace(/(`[^`]*`)/g, (m) => `<span class="hl-string">${m}</span>`);
    html = html.replace(/\b(0x[0-9a-fA-F]+|0b[01]+|0o[0-7]+|\d+\.?\d*(?:[eE][+-]?\d+)?i?)\b/g, (m) => `<span class="hl-number">${m}</span>`);
    html = html.replace(/(\/\/.*$)/gm, (m) => `<span class="hl-comment">${m}</span>`);
    return html;
}

function highlightGo(html) {
    const ctx = extractGoContexts(html);
    let code = ctx.code;

    // Keywords
    const goKeywords = /\b(func|return|if|else|for|range|switch|case|default|break|continue|go|defer|select|chan|map|struct|interface|type|package|import|var|const|true|false|nil|iota|make|new|len|cap|append|copy|delete|panic|recover)\b/g;
    code = code.replace(goKeywords, (m) => `<span class="hl-keyword">${m}</span>`);

    // Built-in types
    const goTypes = /\b(int|int8|int16|int32|int64|uint|uint8|uint16|uint32|uint64|float32|float64|complex64|complex128|bool|byte|rune|string|error|any)\b/g;
    code = code.replace(goTypes, (m) => `<span class="hl-type">${m}</span>`);

    // Strings
    code = code.replace(/("(?:[^"\\]|\\.)*")/g, (m) => `<span class="hl-string">${m}</span>`);
    code = code.replace(/(`[^`]*`)/g, (m) => `<span class="hl-string">${m}</span>`);

    // Numbers
    code = code.replace(/\b(0x[0-9a-fA-F]+|0b[01]+|0o[0-7]+|\d+\.?\d*(?:[eE][+-]?\d+)?i?)\b/g, (m) => `<span class="hl-number">${m}</span>`);

    // Comments
    code = code.replace(/(\/\/.*$)/gm, (m) => `<span class="hl-comment">${m}</span>`);
    code = code.replace(/(\/\*[\s\S]*?\*\/)/g, (m) => `<span class="hl-comment">${m}</span>`);

    // Functions
    code = code.replace(/\b([\w]+)(?=\s*\()/g, (m) => `<span class="hl-function">${m}</span></span>`);

    return restoreGoContexts(code, ctx);
}

function extractGoContexts(code) {
    const contexts = [];
    let result = code;

    // Raw strings
    result = result.replace(/(`[^`]*`)/g, (match) => {
        const idx = contexts.length;
        contexts.push({ placeholder: `${PLACEHOLDER_START}GO${idx}${PLACEHOLDER_END}`, content: match });
        return `${PLACEHOLDER_START}GO${idx}${PLACEHOLDER_END}`;
    });

    return { code: result, contexts };
}

function restoreGoContexts(code, ctx) {
    let result = code;
    for (let i = 0; i < ctx.contexts.length; i++) {
        const { placeholder, content } = ctx.contexts[i];
        result = result.replace(placeholder, content);
    }
    return result;
}

// ============================================
// Rust Highlighting
// ============================================

function highlightRustSimple(html) {
    const rustKeywords = /\b(fn|let|mut|const|static|return|if|else|for|while|loop|match|break|continue|struct|enum|impl|trait|type|pub|priv|mod|use|crate|self|super|where|as|in|ref|move|async|await|dyn|unsafe|extern|true|false|Some|None|Ok|Err)\b/g;
    html = html.replace(rustKeywords, (m) => `<span class="hl-keyword">${m}</span>`);
    const rustTypes = /\b(i8|i16|i32|i64|i128|isize|u8|u16|u32|u64|u128|usize|f32|f64|bool|char|str|String|Vec|Box|Rc|Arc|Cell|RefCell|Option|Result|Self)\b/g;
    html = html.replace(rustTypes, (m) => `<span class="hl-type">${m}</span>`);
    html = html.replace(/("(?:[^"\\]|\\.)*")/g, (m) => `<span class="hl-string">${m}</span>`);
    html = html.replace(/\b(0x[0-9a-fA-F]+|0b[01]+|0o[0-7]+|\d+\.?\d*(?:[eE][+-]?\d+)?(?:_?\d+)*(?:f32|f64|i8|i16|i32|i64|i128|isize|u8|u16|u32|u64|u128|usize)?)\b/g, (m) => `<span class="hl-number">${m}</span>`);
    html = html.replace(/(\/\/.*$)/gm, (m) => `<span class="hl-comment">${m}</span>`);
    return html;
}

function highlightRust(html) {
    const ctx = extractRustContexts(html);
    let code = ctx.code;

    // Keywords
    const rustKeywords = /\b(fn|let|mut|const|static|return|if|else|for|while|loop|match|break|continue|struct|enum|impl|trait|type|pub|priv|mod|use|crate|self|super|where|as|in|ref|move|async|await|dyn|unsafe|extern|true|false|Some|None|Ok|Err)\b/g;
    code = code.replace(rustKeywords, (m) => `<span class="hl-keyword">${m}</span>`);

    // Types
    const rustTypes = /\b(i8|i16|i32|i64|i128|isize|u8|u16|u32|u64|u128|usize|f32|f64|bool|char|str|String|Vec|Box|Rc|Arc|Cell|RefCell|Option|Result|Self)\b/g;
    code = code.replace(rustTypes, (m) => `<span class="hl-type">${m}</span>`);

    // Strings
    code = code.replace(/("(?:[^"\\]|\\.)*")/g, (m) => `<span class="hl-string">${m}</span>`);
    code = code.replace(/b"(?:[^"\\]|\\.)*"/g, (m) => `<span class="hl-string">${m}</span>`);

    // Numbers
    code = code.replace(/\b(0x[0-9a-fA-F]+|0b[01]+|0o[0-7]+|\d+\.?\d*(?:[eE][+-]?\d+)?(?:_?\d+)*(?:f32|f64|i8|i16|i32|i64|i128|isize|u8|u16|u32|u64|u128|usize)?)\b/g, (m) => `<span class="hl-number">${m}</span>`);

    // Comments
    code = code.replace(/(\/\/.*$)/gm, (m) => `<span class="hl-comment">${m}</span>`);
    code = code.replace(/(\/\*[\s\S]*?\*\/)/g, (m) => `<span class="hl-comment">${m}</span>`);

    // Macros
    code = code.replace(/([\w]+)(!)/g, (m, name) => `<span class="hl-macro">${name}!</span>`);

    // Functions
    code = code.replace(/\b([\w]+)(?=\s*\()/g, (m) => `<span class="hl-function">${m}</span></span>`);

    return restoreRustContexts(code, ctx);
}

function extractRustContexts(code) {
    const contexts = [];
    let result = code;

    // Raw strings
    result = result.replace(/(r#*"[\s\S]*?"#*)/g, (match) => {
        const idx = contexts.length;
        contexts.push({ placeholder: `${PLACEHOLDER_START}RS${idx}${PLACEHOLDER_END}`, content: match });
        return `${PLACEHOLDER_START}RS${idx}${PLACEHOLDER_END}`;
    });

    return { code: result, contexts };
}

function restoreRustContexts(code, ctx) {
    let result = code;
    for (let i = 0; i < ctx.contexts.length; i++) {
        const { placeholder, content } = ctx.contexts[i];
        result = result.replace(placeholder, content);
    }
    return result;
}

// ============================================
// Utility Functions
// ============================================

function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}