# File Icon (`nui-file-icon`)

## Setup

`nui-file-icon` is an addon. Load both the JS and CSS:

```html
<link rel="stylesheet" href="NUI/css/modules/nui-file-icon.css">
<script type="module" src="NUI/lib/modules/nui-file-icon.js"></script>
```

## Design Philosophy

One document glyph, the extension overlaid on it, the colour chosen by category. Every file type therefore shares a silhouette and differs by a two-illustration-token change — label and colour — which is what makes a mixed file list read as a single system instead of as a pile of unrelated icons. The extension is the label, so the icon needs no per-type artwork: adding a type means naming its category in the component, not drawing a glyph.

It is a display component. It holds no data, dispatches no events, and has no programmatic API.

## Quick Start

```html
<!-- From an explicit extension — with or without the dot -->
<nui-file-icon type="pdf"></nui-file-icon>
<nui-file-icon type=".zip"></nui-file-icon>

<!-- From a filename or path: the extension is derived -->
<nui-file-icon name="report.pdf"></nui-file-icon>
<nui-file-icon name="assets/hero@2x.png"></nui-file-icon>
```

## Deriving the Type

| Input | Result |
|-------|--------|
| `type="pdf"` / `extension="pdf"` | `pdf` — takes precedence over `name` |
| `name="report.pdf"` | `pdf` |
| `name="assets/hero@2x.png"` | `png` — the last path segment only, so directory dots never count |
| `name=".gitignore"` | none — a dotfile has no extension, and renders the neutral `file` state |
| `name="Makefile"` | none — same neutral state |
| `type="pd f"` | **throws `TypeError`** — outside `[a-z0-9+]` after normalisation this is a typo, not a type |

An unrecognised but well-formed extension is *not* an error: it renders with the neutral `file` category. File types are open-ended, and the icon is decoration.

## Categories

Colour is a category, not a per-extension table (`nui-file-icon--doc`, `--code`, `--data`, `--markup`, `--image`, `--audio`, `--video`, `--archive`, `--sheet`, `--slide`, `--file`). The mapping lives in `EXT_CATEGORY` in the component; add an extension there and the stylesheet needs no edit.

## Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `name` | string | Filename or path; the extension is derived from the last dot of the last segment. |
| `type` / `extension` | string | An explicit extension, with or without a leading dot. Takes precedence over `name`. |
| `size` | string | `"small"` for dense rows, `"large"` for a detail view. Omit for the default. |
| `label` | string | Makes the icon a labelled `role="img"` for standalone use. |

## Accessibility

**With no `label`, the glyph is decorative** and its inner markup is `aria-hidden` — which is correct beside a filename, so no `aria-label` is invented for it. **With a `label`**, the host becomes `role="img"` with that name, for the standalone case where the icon is the only thing carrying the meaning.

## Styling

The component exposes scoped custom properties, following the `nui-file-tree` precedent:

| Property | Default | Controls |
|----------|---------|----------|
| `--nfi-w` / `--nfi-h` | `1.75rem` / `2.25rem` | Glyph box. Set by `size`, overridable. |
| `--nfi-ext-size` | `0.5rem` | Extension label size. |
| `--nfi-fold` | `0.5rem` | Size of the folded corner. |
| `--nfi-color` | category colour | Extension label colour. |

## When to Use

**Use `nui-file-icon` when:**
- Showing a file type at a glance — in a list, a table cell, an upload staging row
- You want type recognition without maintaining per-type artwork

**Use something else when:**
- You need a full file browser — use [`nui-file-tree`](file-tree.md)
- You need a list of files with actions — use [`nui-file-list`](file-list.md), which renders this per row
