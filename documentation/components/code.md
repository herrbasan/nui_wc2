# nui-code

## Design Philosophy

The `<nui-code>` component provides lightweight syntax highlighting focused exclusively on web development languages. Rather than bundling a heavy general-purpose highlighter like Prism or Highlight.js, it handles the essential web languages with a minimal footprint (~6.8KB gzipped total for JS + CSS).

It is designed to wrap native `<pre><code>` blocks, gracefully degrading to plain text if JavaScript fails or hasn't loaded yet. It features zero-configuration automatic language detection and lazy-loads its highlighting module only when a `<nui-code>` element exists on the page.

## Declarative Usage

### Basic Code Block
Standard usage wraps a standard HTML code block. NUI applies syntax highlighting automatically upon connection.

```html
<nui-code>
	<pre><code data-lang="js">
function greet(name) {
	return `Hello, ${name}!`;
}
	</code></pre>
</nui-code>
```

### Example Blocks (Playground / Documentation)
For documentation purposes, escaping HTML `<code>` blocks can be tedious. `nui-code` supports authoring code inside a `<script type="example">` tag. The component will automatically parse the `textContent`, escape it, and convert it into a highlighted `<pre><code data-lang="...">` structure at runtime.

*(Note: To include a literal end-script tag inside this block, you must escape it slightly like `<\\/script>` – the component cleans this string up during parsing).*

```html
<nui-code>
	<script type="example" data-lang="html">
<nui-button>
	<button>Click me</button>
</nui-button>
	</script>
</nui-code>
```

---

## Language Support & Detection

The component defaults to analyzing the text pattern to determine the language if `data-lang` is not explicitly provided on the `<code>` or `<script>` block. 

### Supported Languages (Optimized Syntax Highlighting)
- `html` / `xml`
- `css`
- `js` / `javascript` 
- `ts` / `typescript` 
- `json`

### Automatic Detection Patterns
If `data-lang` is omitted, `nui-code` infers the language based on regular expressions:
- **HTML**: Starts with `<` or `<!DOCTYPE`.
- **JSON**: Starts with `{` or `[` and contains `"key": value` patterns.
- **TypeScript**: Contains `interface`, `type`, `enum` declarations or type annotations.
- **CSS**: Contains CSS selectors followed by `{` or `@media`.
- **JavaScript**: Contains `const`, `let`, `var`, `function`, `class`, or arrow functions.

*Other languages will render perfectly as monospace text blocks but without syntax coloring.*

---

## Component API & DOM

| Feature | Description |
|---------|-------------|
| Inner Element | Accepts `<pre><code>` or `<script type="example">`. The content is read once at connection. |
| `data-lang` *(Attr)* | Explicitly controls the syntax highlighter. Placed on the inner `<code>` or the `<script type="example">` element. |
| Copy Action | A "Copy to Clipboard" `<button>` is automatically injected into the `<nui-code>` block (floating in the top right). It uses `navigator.clipboard.writeText` to copy the original unformatted raw text. |
| Theme Sync | Syntax colors automatically sync with light/dark modes using the native `light-dark()` CSS function in `nui-theme.css`. |