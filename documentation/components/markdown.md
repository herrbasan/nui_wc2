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
- HTML comments (removed, as in every other Markdown renderer)

**Comments:** an HTML comment is dropped from the output, matching GitHub, VS Code and Obsidian, where comments are invisible. This also means structured-comment formats — MD-Blocks directives such as `<!-- mb:block -->` — never reach the page: a structure-aware renderer consumes them from the source before calling the converter. A comment inside fenced or inline code is content and stays literal. An unterminated `<!--` is left visible rather than swallowing the rest of the document.

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

**Rendering modes** (attribute `frontmatter`, default `collapsed`):

| Value | Behavior |
|-------|----------|
| `collapsed` | **Default.** Render the metadata card inside a closed, subtle `<details>` disclosure, so it does not intrude on the body. |
| `show` / `open` | Render the metadata card above the body, always visible. |
| `strip` | Remove the frontmatter entirely; only the body renders. |
| `false` | Disable handling; the block renders as-is (legacy horizontal-rule behavior). |

```html
<!-- Default: metadata card inside a closed disclosure -->
<nui-markdown src="post.md"></nui-markdown>

<!-- Always visible -->
<nui-markdown src="post.md" frontmatter="open"></nui-markdown>

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
md.frontmatterMode = 'open'; // overrides frontmatter="collapsed" attribute
```

**Streaming note:** frontmatter handling applies to static and `src`-based rendering. The streaming API (`beginStream`/`appendChunk`/`endStream`) does not parse frontmatter: streamed text has no beginning, so a leading `---` is treated as a horizontal rule rather than the start of a metadata block. A `frontmatter` mode cannot be set while streaming.

**Supported frontmatter YAML subset:** nested maps, sequences of scalars, sequences of maps, quoted scalars, numbers, booleans, `null`/`~`, inline flow sequences (`[a, b]`), and `#` comments. Non-string keys and complex YAML types (anchors, multi-document, block scalars) are not supported.

### MD-Blocks structure

The converter understands **MD-Blocks** ([spec](https://github.com/herrbasan/md-blocks), v1.3) out of the box, with nothing to enable. MD-Blocks is a superset of CommonMark: structure rides in HTML comments, the content stays plain Markdown, and a document that uses none of it renders exactly as before.

```md
---
title: A document
---

<!-- mb:block repeat=header -->
**Deck Title**
<!-- mb:/block -->

Plain Markdown is content.

<!-- mb:block preset=note -->
A note. The label word is authored here, never injected.
<!-- mb:/block -->

---

<!-- mb:columns weights=[2,1] -->
<!-- mb:col -->
Left.
<!-- mb:col preset=card -->
Right.
<!-- mb:/columns -->

<!-- mb:block repeat=footer -->
*Confidential — 2026*
<!-- mb:/block -->
```

| Construct | Renders as |
|-----------|------------|
| `<!-- mb:main id= preset= -->` | Starts a new **main** chrome scope (`<main class="nui-blocks-main">`). A document with no `mb:main` has one implicit main. `mb:main` is a **break**, not a container: it ends where the next one begins or at end-of-document (there is no closing `mb:/main`). An opening marker annotates the implicit main. |
| Root-level `---` | The next **section** (`<section class="nui-blocks-section">`). A break is internal structure and is *never drawn* — it does not become an `<hr>`. |
| `<!-- mb:section id= preset= -->` | Attributes for the section it appears in. |
| `<!-- mb:block -->` … `<!-- mb:/block -->` | `<div class="nui-blocks-block">`. |
| `<!-- mb:block repeat=header\|footer -->` | **Repeating chrome template.** Extracted from sections and emitted once per main scope into `<header class="nui-blocks-chrome nui-blocks-chrome-header">` or `<footer class="nui-blocks-chrome nui-blocks-chrome-footer">`. A section holding only chrome templates is not emitted as a blank surface. Profile renderers (like `nui-slides`) clone chrome onto each surface. |
| `<!-- mb:columns -->` / `mb:col` / `mb:/columns` | `<div class="nui-blocks-columns">` grid. Column count comes from the number of `col` markers; `weights` sets the ratio. Stacks in source order on narrow screens. |
| `<!-- mb:var name= value= -->` | **Surfaced as data.** Rendered as a `<dl class="nui-blocks-var">` data card at the position it was authored: the name in monospace, a `value=` scalar beside it, and a fenced `json`/`text` payload pretty-printed through `<nui-code>` (highlighted and copyable). A collection renderer reads `section.vars` and emits nothing here. |
| Media block | A block whose **first node** is an image (including empty alt text `![](...)`), image list, or media link becomes `<figure>` + `<figcaption>`. Everything after the media is the caption. `kind` is inferred from the extension. |
| `icon=` attribute | `preset=image:icon` with `icon=<path>` injects a decorative badge from the directive, so generic previews show clean prose with no stray image line. |

`id` becomes an anchor target, `preset` a `nui-preset-*` class, and `label` is editor-only and never rendered. A preset is `family[:modifier[:variant]]` — the family sets the semantic element and class, each further segment adds a `nui-variant-*` / `nui-size-*` class, and a renderer that does not know a segment drops it rather than failing.

**Chrome scopes and surfaces:** A document is one or more mains. Chrome (headers, footers) is authored once on the main and emitted on `<main>`. Surface renderers like `nui-slides` (in `NUI/lib/modules/nui-slides.js`) turn each section into a distinct slide surface and repeat the chrome onto every slide.

**Scope.** Only the rendering half of the spec is implemented. The editor contract — §6.1 chunking, §6.2 `kind` stamping, §7 validation, §8 round-trip — is deliberately out of scope; a validator or editor owns those.

**Consequences worth knowing:**

1. A root-level `---` can no longer be a horizontal rule, exactly as the spec's §9 records. Inside a `block` or `col`, `---` is an ordinary `<hr>`.
2. A directive inside fenced or inline code stays literal, since directives are recognised from the Markdown block structure and never by text replacement.
3. Blank and comment-only regions are filtered out, so file-header comments or pure chrome blocks do not produce blank leading surfaces.

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