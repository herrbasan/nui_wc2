# nui-markdown

## Design Philosophy

This component transforms Markdown into semantic HTML using the platform's built-in capabilities without pulling in heavy external libraries. It provides a lightweight, web-focused parser that covers the most common documentation needs while maintaining excellent performance. Furthermore, it cleanly integrates with other NUI components, mapping Markdown code blocks directly onto `nui-code` and Markdown tables onto `nui-table`.

## Declarative Usage

The most robust way to provide static Markdown content to the component is utilizing a `<script type="text/markdown">` unexecuted block. This ensures that HTML parsing does not prematurely butcher code samples or HTML-looking tags before the Markdown converter catches them.

```html
<nui-markdown>
<script type="text/markdown">
# Heading 1

**Bold** and *italic* text.

```javascript
console.log('Hello World');
<\/script> <!-- Note: escape closing script tags! -->
</script>
</nui-markdown>
```

Alternatively, you can fetch Markdown from an external `.md` file using the `src` attribute:

```html
<nui-markdown src="../path/to/document.md"></nui-markdown>
```

> **Critical Note on Escaping:** Inside a `<script type="text/markdown">` block, any `</script>` sequence must literally be escaped as `<\/script>`. This physically prevents the browser's HTML parser from interpreting it as the end of the markdown script element.

### Supported Syntax

The built-in parser supports:
- Headers (H1-H6)
- Bold, italic, strikethrough
- Lists (ordered and unordered)
- Links
- Code blocks (fenced and inline)
- Tables
- Blockquotes
- Horizontal rules
- Images

## Programmatic Usage

### Dynamic Assignment

You can pass content directly to the internal utility function to convert text without component attachment:

```javascript
const mdHtml = nui.util.markdownToHtml('# Hello\n\nParagraph');
document.getElementById('target').innerHTML = mdHtml;
```

### Streaming API for AI/LLM Applications

For AI applications, the component offers block-level incremental rendering to eliminate UI thrashing. It writes stable text out to a fixed DOM tree while updating only the currently active text block.

| Method | Parameters | Description |
|--------|------------|-------------|
| `beginStream()` | none | Initializes the internal text buffers and streaming containers. Clears current content. |
| `appendChunk(chunk)` | `chunk: string` | Pushes the incremental text chunk into the buffer. Parses the current tree boundary incrementally. |
| `endStream()` | none | Finalizes the stream, flushes the final buffers out to the stable DOM container, and seals the block. |

**Example:**

```javascript
const md = document.querySelector('nui-markdown');

md.beginStream();

// As chunks arrive via Server-Sent Events / EventSource / WebSocket
md.appendChunk(chunk);

// When connection completes
md.endStream();
```