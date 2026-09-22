# WYSIWYG Document Editor — Implementation Plan

**For the coding agent:** this is a complete execution brief. Read it fully, then read
the reference material in §3, then execute the phases in order. The decision record
lives in `docs/wysiwyg-editor-design.md` (editing model, 80/20 law) and
`docs/blocks-editor-design.md` (settled patterns this editor inherits: templates,
style-within-shape, context-scoped presets). Follow `Agents.md` and `LLM-CHEATSHEET.md`
conventions exactly.

## 1. Intent

The user is building **two editors, not one editor with modes** (settled 2026-09-19):

1. **Blocks editor** (exists, `Playground/js/blocks-editor.js`) — structural editing for
   web development and for editing what an LLM generated. Blocks are visibly framed cards.
2. **WYSIWYG document editor** (this plan) — *content editing, not structure building.*
   Reduced functionality, aimed at writing documents.

The defining rule, in the user's words: *"We don't show the framing and the UI — we
render the document as if it's the rendered product. On hover, the sections and blocks
are framed and have floating UI elements to modify, based on the context."*

So the editing surface IS the final rendered document. At rest there is zero editor
chrome — no outlines, no toolbars, no cards. Hovering a section frames the section and
floats section-level UI; hovering a block frames the block and floats block-level UI;
selecting text floats the inline toolbar. Insert layout blocks (sections, columns) and
content blocks inside them — the md-blocks tree, edited invisibly.

The UX reference is the Blok demo (blokeditor.com, evaluated hands-on 2026-09-21):
slash menu with grouped palette and markdown-alias hints, gutter `+`/grip on the
focused block, inline toolbar on selection, Enter continues lists / breaks out on empty.
We adopt those interaction patterns — executed to NUI's polish bar. We reject Blok's
foundations: block-type conversion ("Turn into"), a JSON document model, and visible
block chrome at rest.

**The document model is md-blocks, always.** Round-trip fidelity to the spec
(`D:\Work\_GIT\md-blocks\md-blocks-spec.md`) is the acceptance bar. Offer only what
round-trips.

## 2. Position & dependencies

- **Sequencing (user's order):** blocks editor quirks first; this editor after. Shared
  infrastructure (renderer source maps, `nui-table-editor`, doc-model ops) proceeds
  anytime — both editors consume it.
- **Consumes:** `nui-table-editor` (tables), the media library picker (images), the
  RTE's inline-formatting machinery (prose), the md-blocks render pipeline (canvas).
- **Working name:** `nui-doc-editor`. Final naming is an open question (§10).

## 3. What already exists (build on these, do not rebuild)

| Asset | Where | Role for this editor |
|---|---|---|
| `util.parseBlocks` / `util.serializeBlocks` | `NUI/nui.js` (~L7064, ~L7297) | The doc model's read/write core. Single source of truth. |
| `markdownToHtml` / `renderBlocks` + `mbRender*` helpers | `NUI/nui.js` (~L7920+) | The canvas renderer — the REAL product renderer. |
| MD-Blocks rendered styles | `NUI/css/nui-theme.css` (~L5576+) | What makes the canvas look like the product. |
| `nui-slides` | `NUI/lib/modules/nui-slides.js` | The slides profile of the same tree. |
| Blocks editor app | `Playground/js/blocks-editor.js` (~2400 lines) | Settled patterns to port: section templates (normal/hero), style select scoped by shape, grouped palette (Content/Layout/Data), link block editor, media library integration, raw mode. |
| RTE inline machinery | `NUI/lib/modules/nui-rich-text.js` | Inline formatting + history patterns for prose editing. |
| `nui-table-editor` | `docs/table-editor-decisions.md` | Tables inside the document. Built first, consumed here. |

## 4. Architecture

### 4.1 The canvas IS the real renderer (settled direction)

Render the document with `markdownToHtml` — the same pipeline that renders the shipped
product — never a parallel editor-flavored renderer. Two renderers = fidelity drift =
the death of WYSIWYG honesty. **The canvas must look as much like the target rendering
as possible** (user, 2026-09-21): the selected profile's real output, with the host's
theme styles — not an editor skin.

**Required infrastructure:** an opt-in **source map** in the `mbRender*` helpers:
when `options.sourceMap` is set, every rendered section / block / column node carries
`data-mb-path="m0/s1/n2"` (main/section/node index path; column children extend it).
Production rendering (no option) stays byte-identical. The editing layer maps any DOM
target back to its tree node via `target.closest('[data-mb-path]')`. This render option
is the **only core touchpoint** — a generic format-level capability of the existing
renderer. All editor functionality lives in the addon (§4.4), never in core.

### 4.2 Model-first mutations (architecture law)

The rendered DOM is a **view**. Every edit — inline typing, style change, move, delete —
is applied to the parsed **doc tree** by pure functions, then the canvas re-renders.
Never scrape the DOM back into the model. `serializeBlocks` remains the only writer.

- **Structural / style mutations:** apply op → re-render the affected section subtree →
  restore hover/selection from the stored path.
- **Inline prose typing:** the prose node edits in place (contenteditable); its text is
  written back to the tree on a debounce (and before any structural op). No re-render
  while typing — the caret never moves under the user.
- **Selection preservation:** before any re-render, record (path, startOffset,
  endOffset); after render, restore. If restoration fails, place caret at node start —
  never throw, never lose the document.

### 4.3 Doc-model ops (shared, pure, testable)

A pure ops module consumed by both editors. Home: **inside the addon package** (a
sibling module beside `nui-doc-editor.js`, e.g. `NUI/lib/modules/doc-model.js`), not
core — the editor's functionality is an addon concern (user, 2026-09-21). Core already
provides `util.parseBlocks`/`util.serializeBlocks`; that format layer is the only core
dependency.

```
insertSection(doc, index, template)      deleteSection(doc, path)
moveBlock(doc, fromPath, toPath)         insertBlock(doc, path, blockType, preset)
deleteBlock(doc, path)                   duplicateBlock(doc, path)
setBlockPreset(doc, path, preset)        // style only — shape never changes
setSectionPreset(doc, path, preset)      setBlockText(doc, path, markdownLines)
```

Each returns a new/updated doc; none touches the DOM. The blocks editor migrates onto
these later (convergence is desirable, not a phase-1 requirement).

### 4.4 Where it lives — an addon from day one (user, 2026-09-21)

The functionality is **planned as an NUI addon, not as part of the core**:

- `NUI/lib/modules/nui-doc-editor.js` — element + editing layer (thin class over pure
  functions, NUI component pattern).
- `NUI/css/modules/nui-doc-editor.css` — **every** editor style, in this separate file.
- `documentation/addons/doc-editor.md` — API + styling-hooks contract.
- Playground hosts only a demo page consuming the addon, exactly like every other
  addon demo (explicit JS import + CSS link; auto-load in dev).

**Custom styling is a shipped feature, not an accident:** the addon's chrome (hover
frames, floating dialogs, grips, toolbar) is styled exclusively by that CSS file — JS
injects no styles, class hooks are stable and documented, and a host can override or
wholesale replace the file to theme the editor. The *document* itself renders with the
host's theme/profile styles (that's what makes the canvas match the target rendering);
only the *chrome* belongs to the addon's CSS.

### 4.5 Hover framing (the visual contract)

- **Least visual clutter is the law (user, 2026-09-21).** Controls live exclusively in
  hovering, context-sensitive dialogs/popovers — nothing persistent, nothing that
  competes with the document.
- **Block bounds on hover:** a hovered block gets a subtle highlight (a surface shift,
  not a heavy outline) so its bounds are legible before any control appears. Sections
  get the outer frame; the block highlight nests inside it.
- `:hover` / `:focus-within` on `[data-mb-path]` drives all of this via CSS only.
- Floating UI is **level-scoped**: exactly one floating cluster visible at a time, for
  the deepest hovered level. Section UI never competes with block UI.
- All chrome is absolutely positioned overlay — zero layout shift on hover.
- CSS variables from `nui-theme.css` only; no new variables, no inline styles.

## 5. Levels & their contextual UI

| Level | Hover frame | Floating UI |
|---|---|---|
| **Document** | — | Top bar: title (frontmatter), target profile switch (web / print / slides — the canvas renders the selected profile), source-mode toggle, save/export. |
| **Section** | outer outline | Template chip (derived, never stored — blocks-editor law), gear → popover with the template's options (band/bleed/inverted; cover placement/aspect), drag handle, delete. |
| **Block** | inner outline | Grip (drag = reorder within/between columns, click = menu: style select **scoped to the block's shape**, duplicate, delete), appearing `+` between blocks. |
| **Inline** | — | Selection toolbar: B / I / U / S / code / link / clear. |
| **Media block** | block frame | Click image → media library replace; caption edits inline. |
| **Table** | block frame | `nui-table-editor` owns everything inside the rendered table. |
| **Link block** | block frame | Two-field editor (label/URL) + CTA/Download style, ported from blocks editor. |

**Shape law (from blocks editor, applies here unchanged):** a block's TYPE is fixed at
creation (chosen in the insert palette); only its STYLE (preset) is mutable afterwards,
and the style select offers only presets whose authored shape matches the type. No
"turn into" anywhere.

**Slash menu:** `/` in an empty prose block turns it into the grouped insert palette
(Content / Layout / Data) with markdown-alias hints. Choosing a content block converts
the block; choosing a layout block wraps.

**Keyboard flow:**
- Enter splits a prose block at the caret; Backspace at block start merges into the
  previous prose block. (This is the document-flow feel — phased, see §7.)
- Enter continues lists; Enter on an empty list item breaks out to prose.
- Escape climbs levels: cell → block → section → document.
- Arrow keys at text boundaries move between blocks.

## 6. Chrome, raw mode & fidelity rules

- **Chrome (repeat header/footer)** is a document-level property band, not a section
  block — inherited from blocks-editor design (it filters chrome out of the canvas).
- **Source mode:** full raw Markdown view (like blocks editor's raw mode) — this editor
  targets LLM-authored documents; source must always be one click away and byte-faithful.
- **`main` is invisible** (the file). Multi-main documents: render and preserve bytes
  verbatim; do not edit (blocks-editor law).
- **Unknown/unsupported structure** renders as the product renders it and is preserved
  untouched — never silently normalized away.

## 7. Phases

Each phase ends demo-able and passes its acceptance slice before the next starts.

**Phase 0 — shared infrastructure**
- `options.sourceMap` in the `mbRender*` helpers (`data-mb-path` stamping; production
  output byte-identical when off).
- Doc-model ops module (§4.3) with unit-test-style demo assertions.
- Gate: render a structured fixture doc with source maps; every node resolvable from
  DOM → tree path; ops round-trip through `serializeBlocks`/`parseBlocks` losslessly.

**Phase 1 — read path & hover contract**
- Render a demo document as the product; zero chrome at rest; hover/focus frames per
  level; floating UI skeletons (static, correct placement, level-scoped exclusivity).

**Phase 2 — inline prose**
- Click into prose → caret; typing writes back debounced; selection → inline toolbar
  (B/I/U/S/code/link/clear); Enter split / Backspace merge between prose blocks;
  list continue/break-out. Source view stays in sync.

**Phase 3 — structural editing**
- Block grips (drag reorder incl. between columns), block menu (style select by shape,
  duplicate, delete), between-block `+`, slash palette, section UI (template chip, gear
  popover with real options, drag, delete, add-section).

**Phase 4 — media, tables, links**
- Media replace via media library; inline caption editing; tables handed to
  `nui-table-editor`; link block two-field editor.

**Phase 5 — profiles & polish**
- Working profile switch (web/print/slides canvas), hero/cover template options,
  chrome band, a11y pass (roving tabindex, `a11y.announce` on structural moves),
  keyboard-complete (every mouse op reachable by keyboard), docs page
  (`documentation/`), demo content that IS a real document (Blok demo trick).

## 8. Files

| Action | Path |
|---|---|
| modify | `NUI/nui.js` — **only** the generic `options.sourceMap` render option in the `mbRender*` helpers (no editor code in core) |
| create | `NUI/lib/modules/nui-doc-editor.js` — the addon: element, editing layer |
| create | `NUI/lib/modules/doc-model.js` — pure doc-tree ops (§4.3), importable by the blocks editor too |
| create | `NUI/css/modules/nui-doc-editor.css` — ALL editor chrome styles, host-replaceable |
| create | `documentation/addons/doc-editor.md` — API + styling hooks contract |
| create | `Playground/pages/addons/doc-editor.html` — demo page consuming the addon |
| modify | `Playground/js/main.js` (nav), `Playground/js/page-init.js` (`nui.registerPage`) |
| run | `node scripts/update-docs.js` |

## 9. Acceptance criteria (headline set; each phase adds its own)

1. A loaded md-blocks document renders **identically** to the product renderer at rest
   (pixel-level: no chrome, no outlines).
2. Hover section → section frame + section UI only; hover block → block frame + block
   UI only; moving between them never flickers or stacks UI.
3. Type in prose → source mode shows the same Markdown a human would write; round-trip
   through parse→serialize is lossless for the fixture corpus.
4. Split/merge prose with Enter/Backspace feels like a document editor, and the tree
   stays spec-legal.
5. Every structural op (move/insert/delete/style) lands in source mode exactly as the
   spec writes it (preset attributes, section separators, block comments).
6. Slash palette inserts layout + content blocks per the grouped palette; a hero
   section behaves per the settled template rules.
7. A table inside the document is fully edited by `nui-table-editor` (its own
   acceptance list), with undo owned by this editor's history.
8. Undo/redo covers text + structure as one stack, caret-restoring.
9. Profile switch re-renders the canvas as web / print / slides without re-parsing.
10. Keyboard-only completion of: insert block, style it, move it, delete it.

## 10. Open questions & non-goals

**Open:**
- Final name (`nui-doc-editor` is a working title).
- Depth of cross-block text flow (true continuous-text editing across block types is
  the hard 20% — decide after Phase 3 whether Phase 6 pursues it).
- Whether/when the blocks editor migrates onto the Phase 0 ops module.

**Non-goals (reject on sight):**
- Collaboration, comments, kanban/database blocks, i18n machinery (Blok feature list —
  not this product).
- Block-type conversion UI ("Turn into").
- Any second document model (JSON/HTML) — md-blocks text only.
- Editing multi-main structure, raw HTML pass-through editing, spreadsheet tables.
- New CSS variables, TypeScript, dependencies, build steps.
