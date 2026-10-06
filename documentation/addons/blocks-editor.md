# nui-blocks-editor

Visual editor for MD-Blocks documents: sections, blocks, columns, named vars,
frontmatter, and a live preview (side-by-side, hidden, or in its own window).

## Setup

This is an addon module. Load both the JS and CSS before use:

```html
<link rel="stylesheet" href="NUI/css/modules/nui-blocks-editor.css">
<script type="module" src="NUI/lib/modules/nui-blocks-editor.js"></script>
```

The module registers the `<nui-blocks-editor>` element and imports its own addon
dependencies (`nui-list`, `nui-media-player`, `nui-rich-text`) — but their CSS
must be linked by the host if those components render (the media library picker,
player blocks, block caption editors). Core components need no imports.

## Design position

The editor is the companion of the md-blocks format: the document model is
spec-shaped, and everything the editor writes is legal md-blocks. It works at
two levels — sections and blocks — and never invents file syntax: section
templates (hero/band) are re-derived from preset + content shape on every
render, so the UI can never disagree with the document.

**The editor never fetches or persists anything on its own.** `load()` /
`serialize()` is the whole storage contract — the host owns the file system.

## Declarative usage

```html
<!-- Fully featured, default document -->
<nui-blocks-editor></nui-blocks-editor>
```

### Attributes (all optional — absence means fully featured)

| Attribute | Values | Effect |
|-----------|--------|--------|
| `no-preview` | boolean | Removes the preview pane, split divider and mode switcher entirely |
| `no-frontmatter` | boolean | Removes the frontmatter summary card (metadata is still kept in the document) |
| `preview` | `inline` (default) / `hidden` / `window` | Initial preview mode |

## Programmatic API

```javascript
const editor = document.querySelector('nui-blocks-editor');

editor.load('# Hello\n\nmd-blocks text');   // load from markdown text
editor.load(docModel);                       // or a parsed doc model (cloned)
editor.loadUrl(url, rebasePair?)             // fetch + load (host decides sources)
const md = editor.serialize();               // document as md-blocks text
editor.destroy();                            // release window listeners / preview window
```

### Events

| Event | Detail | Fired |
|-------|--------|-------|
| `nui-change` (bubbles) | `{ doc, markdown }` | On every edit sync — including `load()`. Debounce on the host side for autosave. |

## What the editor owns

- **Sections** — add/delete/reorder (drag), label, template chip, per-section
  options (cover placement, aspect ratio tokens `cover:square/banner/strip`,
  band/bleed/inverted). Unmodelled profile presets are preserved verbatim, never rewritten.
- **Blocks** — insert palette fixes a block's type at creation (prose, cards,
  media figure, media player, link/CTA, table, columns, var). Types are derived
  structurally on load and never converted. Every block carries a style select
  with an escape hatch (`Custom preset…`) validating against the spec grammar
  `family[:modifier[:variant]]`, so documents carrying profile tokens open without loss.
- **Media** — lead-image preview, sortable thumb rail (drag-out removes), media
  library picker dialog. **The library inside the module is the Playground mock**
  (`images/nui_*.webp`, sample URLs) — hosts with a real library will want to
  replace `MEDIA_LIBRARY`/`openMediaLibrary` in `NUI/lib/modules/nui-blocks-editor.js`.
- **Frontmatter** — shape-driven structured editor (strings, dates, numbers,
  booleans, tag lists, maps, entry tables) plus a raw YAML mode with round-trip parsing.
- **Preview** — inline split (draggable divider, keyboard resizable), hidden, or
  a separate browser window kept in sync on every change.

## Demo

Playground: `#page=experiments/blocks-editor` — the page wires its demo
documents into the component with `loadUrl()`, demonstrating exactly the
host-side integration a project writes.
