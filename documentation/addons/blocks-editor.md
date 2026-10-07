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

### Full-width placement

The theme constrains `nui-page > *`, so to let the editor use the whole page
width, the element (or its wrapper) must sit **directly** under `nui-page` —
`setPreviewMode` puts the `breakout` attribute on the component itself when the
inline preview is active. A host that nests it deeper adds `breakout` to its
own direct page child:

```html
<nui-page>
    <section breakout>
        <nui-blocks-editor></nui-blocks-editor>
    </section>
</nui-page>
```

### Spacing contract

The component ships with **no horizontal padding**. Spacing to the surrounding
layout is the integrator's decision: the host page's gutter alone positions the
editor, so it aligns with the host's own headers, buttons and text. Full-bleed
sections (`preset=band:bleed`) cancel `--nui-space` of the *page* gutter — that
is the renderer's contract with the page, not with this component. A host that
wants extra clearance wraps the component and pads the wrapper. Vertical
padding (`--nui-space`) is kept inside the panes as breathing room above the
toolbar and below the last section, which no host layout provides.

## Programmatic API

```javascript
const editor = document.querySelector('nui-blocks-editor');

editor.load('# Hello\n\nmd-blocks text');   // load from markdown text
editor.load(docModel);                       // or a parsed doc model (cloned)
editor.loadUrl(url, rebasePair?)             // fetch + load (host decides sources)
const md = editor.serialize();               // document as md-blocks text
editor.openMediaLibrary = pickerFn;          // optional: host media browse (see Media)
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
  library picker dialog. **The built-in library is a demo** (Playground mock:
  `images/nui_*.webp`, sample URLs). A host with a real file story replaces the
  picker before the first media pick:

  ```javascript
  editor.openMediaLibrary = async ({ multiple = true, filterType = null } = {}) => {
      // host-native browse (OS dialog, FS Access API, CMS library …)
      // return [] when cancelled, else [{ src, label }] entries
  };
  ```

  The `src` values the picker returns are written verbatim into the document,
  so the host decides whether they are paths, URLs or session object URLs.
- **Frontmatter** — shape-driven structured editor (strings, dates, numbers,
  booleans, tag lists, maps, entry tables) plus a raw YAML mode with round-trip parsing.
- **Preview** — inline split (draggable divider, keyboard resizable), hidden, or
  a separate browser window kept in sync on every change.

## Demo

Playground: `#page=experiments/blocks-editor` — the page wires its demo
documents into the component with `loadUrl()`, demonstrating exactly the
host-side integration a project writes.
