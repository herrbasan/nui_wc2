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
dependencies (`nui-list`, `nui-media-player`, `nui-rich-text`, `nui-code-editor`)
— but their CSS
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
editor.loadUrl(url)                         // fetch + load (host decides sources)
const md = editor.serialize();               // document as md-blocks text
editor.openMediaLibrary = pickerFn;          // optional: host media browse (see Media)
editor.resolveThumb = thumbFn;              // optional: (src, size) -> URL, size = 'thumb' | 'full'
editor.destroy();                            // release window listeners / preview window
```

### Media paths are relative to the document, never to the page

`loadUrl(url)` records where the document lives, and every preview — the split view and
the pop-out — resolves the document's relative image paths against **that URL**. This is
the rule GitHub, VS Code and `<nui-markdown src>` already apply, so a document edited here
renders identically everywhere else.

It matters that the base is applied to the *render*, not to the text. `serialize()` returns
the paths exactly as authored, so loading and saving a document round-trips without
rewriting them. There is deliberately no way to rebase paths on the way in: rewriting the
source to suit one viewer is what silently produces a document no other viewer can resolve.

**Absolute paths are not supported** — a drive path like `D:/Work/.../shot.png` is refused
by the renderer and does not load in a VS Code preview either. They are also the one form
that cannot survive being moved to another machine. Use a path relative to the document.

`nui.components.mediaLibrary(items, opts)` is the picker's own browser, exported
for hosts that have a file store and want the dialog for free — see
[Media](#what-the-editor-owns).

### Events

| Event | Detail | Fired |
|-------|--------|-------|
| `nui-change` (bubbles) | `{ doc, markdown }` | On every edit sync — including `load()`. Debounce on the host side for autosave. |

## What the editor owns

- **New blocks are created EMPTY.** The insert palette seeds no text into the
  document. Seed text is indistinguishable from something the author wrote and it
  survives every save — a stat card seeded `# 99.9% / System Uptime` does not read
  as demo data on a live page, it reads as a claim the site is making. What the
  seed bought was discoverability, and that is a display need: every block body now
  carries an editor-chrome empty state (a placeholder on the rich-text and code
  editors, field placeholders on a link, upload buttons on media, `Add pair` on a
  var), so the hint survives without a character entering the file. One behaviour
  for the Playground and for a deployed host — a demo that seeds and a host that
  does not are not the same product, and the demo would stop being evidence for the
  thing it is demoing. Prose-shaped blocks choose their hint from the style they are
  wearing, so an empty `card:stat` and an empty paragraph say different things.
  The one exception is a var's NAME, which spec §4.4 makes required and which is an
  identifier rather than content.
- **New sections are created empty too**, with no seeded `## Hero Title` /
  `Supporting tagline` and no seeded `label`. A fresh hero is unaffected: a cover
  section's SOLE block is typed as media from the section's own preset, so an empty
  hero body arrives as a media block showing its upload empty state. Clearing a
  section label deletes the attribute rather than writing `label=""` — an empty
  string is not an absent one, and `mbFormatAttrs` would emit it. The title field
  shows its `Section Title` placeholder instead, so the chrome never displays a
  name the file does not carry.
- **Sections** — add/delete/reorder (drag), label, template chip, per-section
  options (cover placement, aspect ratio tokens `cover:square/banner/strip`,
  band/bleed/inverted). Unmodelled profile presets are preserved verbatim, never rewritten.
- **Blocks** — insert palette fixes a block's type at creation (prose, cards,
  media figure, media player, link/CTA, table, code, columns, var). Types are derived
  structurally on load and never converted. Every block carries a style select
  with an escape hatch (`Custom preset…`) validating against the spec grammar
  `family[:modifier[:variant]]`, so documents carrying profile tokens open without loss.
  A hero section is the one case where the type is not read off the block alone: a
  `preset=cover` section types its own sole block as media, because a fresh hero
  has no media yet and an empty body would otherwise derive as prose. The signal
  is the section's own preset, so it survives a reload (`_type` is session-only).
- **Code** — a block whose body is exactly one fenced code block derives as the
  code type, the same way a lone pipe table derives as a table. It is deliberately
  **not** a preset family: fenced code is baseline CommonMark and carries no
  directive, so the language lives in the fence's info string, not in an attribute.
  Its body editor is `<nui-code-editor>` — the component built for this: it
  highlights as you type, keeps its value as `textContent` (no HTML round-trip,
  which is what corrupted fences inside a prose block), and brings line numbers,
  auto-indent on Enter and closing brackets. A rich-text editor mangles code —
  indentation, blank lines and `<` are all content — so the code type never uses
  one. The language is a control in the **card header, beside Delete** — it is a
  property of the block, and the header is where every other block-level property
  lives; a control stranded above the code it describes reads as a form field the
  block happens to contain. It inherits the header's borderless-at-rest select
  styling. The list is plain text plus every token `nui-syntax-highlight` branches
  on (js, ts, html, xml, css, json). That is the
  complete set: any other language still fences, copies and round-trips, it just
  renders unhighlighted. A document naming one still opens, with that token added
  to the list. Selecting a language sets `nui-code-editor`'s `lang` property, which
  re-highlights in place. There is
  no style select beyond the unset state and the custom hatch, because there is no
  `code` preset to offer. Two selects make the header too wide below ~360px, so the
  code card's header wraps to two rows rather than clipping the style select.
- **Media** — lead-image preview, sortable thumb rail (drag-out removes), media
  library picker dialog. **The addon ships no media of its own**: with no hook
  assigned the picker opens to a named empty state, not a silent empty list. A host
  assigns the picker before the first media pick:

  ```javascript
  editor.openMediaLibrary = async ({ multiple = true, filterType = null } = {}) => {
      // host-native browse (OS dialog, FS Access API, CMS library …)
      // return [] when cancelled, else [{ src, label, thumb }] entries
  };
  ```

  `filterType` narrows the set per call site: `'image'` for media figures,
  `'player'` for audio/video tracks, `null` for the icon badge.

  The addon also exports the browser itself, so a host with a file store supplies
  the *set* rather than writing a dialog:

  ```javascript
  editor.openMediaLibrary = (opts) => nui.components.mediaLibrary(myItems, opts);
  ```

  `nui.components.mediaLibrary(items, { multiple, filterType })` returns the
  picked `[{ src, label }]` entries, or `[]` when cancelled. Items are
  `{ id, label, src, thumb, type, variants }`; `type` is `'image' | 'audio' |
  'video' | 'file'` and drives the `filterType` split.

  `src` values are written verbatim into the document, so the host decides whether
  they are paths, URLs or session object URLs. Thumbnails are a separate hook —
  `editor.resolveThumb = async (src, size) => urlOrNull` — because a stored
  full-size path may have no cheap preview URL (FS handles, CMS stores).

  `size` is what the caller needs: `'thumb'` for the rail tile and the icon badge,
  `'full'` for the frame, which previews the document and must show what the reader
  gets. One src, two sizes:

  ```javascript
  editor.resolveThumb = async (src, size = 'thumb') =>
      size === 'thumb' ? thumbFor(src) : fullFor(src);
  ```

  A host with a single rendition returns it for both. Returning `null` is never
  fatal — the caller falls back to the stored `src`, so declining a size degrades
  to the real file rather than to nothing. A single-argument resolver (ignoring
  `size`) keeps working and simply serves both sizes the same way.

  Library items carry `thumb` for the picker tile; it is optional and falls back
  to `src`.
- **Frontmatter** — shape-driven structured editor (strings, dates, numbers,
  booleans, tag lists, maps, entry tables) plus a raw YAML mode with round-trip parsing.
- **Preview** — inline split (draggable divider, keyboard resizable), hidden, or
  a separate browser window kept in sync on every change.

## Demo

Playground: `#page=experiments/blocks-editor` — the page wires its demo
documents into the component with `loadUrl()` and supplies the media library
(130 items: 8 NUI plates, 118 Random Picts, and 4 sample audio/video tracks)
via `openMediaLibrary` and `resolveThumb`, demonstrating exactly the host-side
integration a project writes. The addon itself carries none of that data, and
the page's "What this page wires" section names the two hooks.
