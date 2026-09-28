# File Icon (`nui-file-icon`)

## Setup

`nui-file-icon` is a core component. No module imports or extra stylesheets are required:

```html
<!-- Core NUI includes nui-file-icon automatically -->
<nui-file-icon name="report.pdf"></nui-file-icon>
```

## Design Philosophy

A plain vector document sheet with a folded corner, wearing a **banner plate that rides its left edge** — mostly on the sheet, with a small overhang to the left. The banner carries the 3-letter extension, the banner is colored by category, and **the label is always white**. The sheet itself stays neutral so the banner is the only thing that speaks.

Because the label is white on every category color, the plate is deepened (`color-mix` 80% toward black) from the raw category hue. That is what keeps white legible on the pale categories (`text`, `ts`, `c`) instead of washing out.

Every file type shares a consistent design token system:
- **Default / Large:** Document sheet with folded corner, plus the category-colored banner riding the left edge.
- **Small:** The banner alone, sheet stripped, with the top-right corner chipped off at an angle so the plate still reads as a page — ideal for tree views, table rows, and dense lists.

It is a display component. It holds no data, dispatches no events, and requires no external icons.

## Quick Start

```html
<!-- From an explicit extension — with or without the dot -->
<nui-file-icon type="pdf"></nui-file-icon>
<nui-file-icon type=".zip"></nui-file-icon>

<!-- From a filename or path: the extension is derived -->
<nui-file-icon name="report.pdf"></nui-file-icon>
<nui-file-icon name="src/index.ts"></nui-file-icon>
<nui-file-icon name="assets/hero@2x.png"></nui-file-icon>

<!-- Dense rows / tree view mode: banner only -->
<nui-file-icon size="small" name="app.ts"></nui-file-icon>
```

## Deriving the Type

| Input | Result |
|-------|--------|
| `type="pdf"` / `extension="pdf"` | `pdf` — takes precedence over `name` |
| `name="report.pdf"` | `pdf` |
| `name="assets/hero@2x.png"` | `png` — last path segment only |
| `name=".gitignore"` | none — renders `FIL` in neutral state |
| `name="Makefile"` | none — renders `FIL` in neutral state |
| `type="pd f"` | **throws `TypeError`** — invalid character pattern |

## 3-Letter Abbreviation Rule

Extensions longer than 3 characters are automatically normalized to 2 or 3 letters (e.g. `json` &rarr; `JSN`, `html` &rarr; `HTM`, `docx` &rarr; `DOC`, `pptx` &rarr; `PPT`, `xlsx` &rarr; `XLS`, `yaml` &rarr; `YML`, `toml` &rarr; `TML`). This frees up horizontal space and lets the label on the banner run large enough to stay legible at icon scale.

## Categories & Colors

- **PDF**: Acrobat Red (`pdf`)
- **TypeScript**: TS Blue (`ts`, `tsx`)
- **JavaScript**: JS Amber (`js`, `mjs`, `cjs`, `jsx`)
- **HTML**: HTML Orange-Red (`html`, `htm`)
- **CSS**: CSS Blue (`css`, `scss`, `sass`, `less`)
- **Python**: Python Blue (`py`, `ipynb`)
- **Rust**: Rust Orange (`rs`)
- **Go**: Go Cyan (`go`)
- **C / C++**: Blue-Grey (`c`, `h`, `cpp`, `hpp`)
- **C#**: C# Purple (`cs`)
- **Java / Kotlin**: Java Amber (`java`, `jar`, `kt`)
- **PHP**: PHP Indigo (`php`)
- **Ruby**: Ruby Red (`rb`)
- **Shell / Scripts**: Terminal Green (`sh`, `bash`, `zsh`, `ps1`, `bat`)
- **Data & Config**: Warm Gold (`json`, `yaml`, `yml`, `toml`, `xml`, `sql`, `db`, `env`)
- **Documents**: Word Blue (`doc`, `docx`, `odt`, `rtf`, `pages`)
- **Plain Text**: Slate Grey (`txt`, `md`, `markdown`, `log`)
- **Spreadsheets**: Excel Green (`xls`, `xlsx`, `csv`, `tsv`, `ods`)
- **Presentations**: Coral Orange (`ppt`, `pptx`, `odp`, `key`)
- **Images**: Purple / Magenta (`png`, `jpg`, `gif`, `webp`, `avif`, `svg`, `ico`)
- **Audio**: Pink / Rose (`mp3`, `wav`, `flac`, `m4a`, `ogg`, `aac`, `aif`)
- **Video**: Violet (`mp4`, `webm`, `mkv`, `mov`, `avi`)
- **Archives**: Brown-Gold (`zip`, `tar`, `gz`, `7z`, `rar`, `bz2`)
- **Fonts**: Teal (`ttf`, `otf`, `woff`, `woff2`)
- **Neutral / Obscure**: Muted Gray (`bin`, `dat`, `bak`, or files without extension)

## Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `name` | string | Filename or path; the extension is derived from the last dot of the last segment. |
| `type` / `extension` | string | An explicit extension, with or without a leading dot. Takes precedence over `name`. |
| `size` | string | `"small"` (banner only with a chipped top-right corner, for trees and dense rows), `"large"` (detail view), or omit for the default sheet + banner. |
| `label` | string | Makes the icon a labelled `role="img"` for standalone use. |
