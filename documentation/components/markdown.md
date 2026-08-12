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
- Lists (ordered and unordered, tight or loose, nested by indentation)
- Links
- Code blocks (fenced and inline)
- Tables
- Blockquotes
- Horizontal rules
- Images

**List notes:** Blank lines between items (loose lists) keep items in a single list. Indent a marker under an item to nest a sub-list. This holds for the streaming API too — chunks that split a list across `\n\n` boundaries are held in the live region until the list ends, so numbering never restarts mid-list.

### YAML Frontmatter

A leading `---`-fenced YAML block (as used by Jekyll, Hugo, Astro, etc.) is detected and handled specially instead of being mangled into horizontal rules.

```yaml
---
title: "The Abyss Gazes Back"
slug: the-abyss-gazes-back
lang: en
created: 2026-07-25
modified: 2026-08-12
authors:
  - id: david-a-renelt
    role: human
  - id: kimi-k3
    role: editor
tags:
  - ai
  - nietzsche
  - purpose
series: null
summary: "A one-line summary rendered as a distinct field."
---

# The Abyss Gazes Back

Body text follows the metadata card.
```

**Rendering modes** (attribute `frontmatter`, default `show`):

| Value | Behavior |
|-------|----------|
| `show` | Render the frontmatter as a styled metadata card above the body. |
| `strip` | Remove the frontmatter entirely; only the body renders. |
| `false` | Disable handling; the block renders as-is (legacy horizontal-rule behavior). |

```html
<!-- Renders a metadata card -->
<nui-markdown src="post.md"></nui-markdown>

<!-- Strips the frontmatter -->
<nui-markdown src="post.md" frontmatter="strip"></nui-markdown>
```

The parsed frontmatter is always exposed as a **data structure** on the element, regardless of render mode:

```javascript
const md = document.querySelector('nui-markdown');
console.log(md.metadata); // e.g. { title: '...', tags: ['ai', 'nietzsche'], authors: [{ id: '...', role: 'human' }] }
```

**Programmatic mode override:** the `frontmatterMode` property takes precedence over the `frontmatter` attribute when both are set (programmatic wins on duplication).

```javascript
md.frontmatterMode = 'strip'; // overrides frontmatter="show" attribute
```

**Streaming note:** frontmatter handling applies to static and `src`-based rendering. The streaming API (`beginStream`/`appendChunk`/`endStream`) is intended for incremental LLM output and does not strip or render frontmatter.

**Supported frontmatter YAML subset:** nested maps, sequences of scalars, sequences of maps, quoted scalars, numbers, booleans, `null`/`~`, inline flow sequences (`[a, b]`), and `#` comments. Non-string keys and complex YAML types (anchors, multi-document, block scalars) are not supported.

## Programmatic Usage

### Dynamic Assignment

You can pass content directly to the internal utility function to convert text without component attachment:

```javascript
const mdHtml = nui.util.markdownToHtml('# Hello\n\nParagraph');
document.getElementById('target').innerHTML = mdHtml;
```

The second argument controls frontmatter handling: `markdownToHtml(md, { frontmatter: 'show' | 'strip' | false })`. Lower-level utilities are also exposed:

```javascript
nui.util.parseFrontmatter(md);   // { raw, data, content } | null
nui.util.parseYaml(src);         // object
nui.util.renderFrontmatter(data);// HTML string | null
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