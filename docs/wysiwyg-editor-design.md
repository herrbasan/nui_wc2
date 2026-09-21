# WYSIWYG Document Editor — Design Foundations

Discussion outcomes between user + partner. Status: **settled unless marked OPEN**.
Spec reference: md-blocks (locked), `D:\Work\_GIT\md-blocks\md-blocks-spec.md`.
Sibling doc: `docs/blocks-editor-design.md` (the structural editor — separate offering, settled 2026-09-19).
Execution plan: `docs/wysiwyg-editor-implementation-plan.md` (2026-09-21 — intent, architecture, phases, acceptance).

## Position

- **Two editors, not two modes.** Blocks editor = structural, for web dev and editing
  LLM-generated pages. This editor = **content editing**, reduced functionality, aimed at
  writing documents. (Settled 2026-09-19.)
- **md-blocks is the model.** Same parse/serialize core as the blocks editor. Layout blocks
  (sections, columns) contain content blocks; the tree is exactly the spec tree.
- **Ships as an NUI addon, never core** (user, 2026-09-21). The editor is its own JS
  module + its own CSS file — core `nui.js` stays untouched except generic format-level
  capabilities the renderer already owns. **Custom styling is a requirement:** every
  style lives in the addon's separate CSS file so a host can restyle or replace it; JS
  injects no styles.
- **Fidelity target (user, 2026-09-21):** the canvas looks as much like the *target
  rendering* as possible — the selected profile's real output, not an editor theme.
- Order of work: blocks editor quirks first. Shared infrastructure (see `nui-table-editor`)
  can start anytime — both editors consume it.

## Editing model (settled 2026-09-21)

- **The editing surface IS the rendered document.** No permanent framing, palettes,
  outlines, or chrome. The user edits what looks like the final product.
- **Hover/focus materializes structure.** Section frames and block frames appear on hover,
  each with **floating contextual UI scoped to the hovered level** — section UI (template,
  profile-relevant options) is not block UI (style select, drag, delete) is not cell UI.
- **Least visual clutter (user, 2026-09-21).** Controls live exclusively in hovering,
  context-sensitive dialogs — nothing persistent, nothing competing with the document.
  A block gets a subtle **highlight on hover** so its bounds are legible before any
  control appears; sections get the outer frame, the block highlight nests inside it.
- **UX patterns borrowed from Blok** (blokeditor.com research, 2026-09-21):
  - Slash menu: `/` turns the current block into a filter input; grouped palette with
    markdown-alias hints (`#`, `##`, ` ``` `, `---`).
  - Gutter affordances on the focused block: `+` insert, grip (drag to move, click = menu).
  - Inline toolbar on text selection (B/I/U/S, code, link).
  - Enter continues lists; Enter on an empty item breaks out to prose.
  - The demo page IS the document — adopt for the Playground demo.
- **Blok patterns rejected:**
  - "Turn into" / block-type conversion — stays rejected (blocks-editor-design §"Block type
    vs block style", 2026-09-18): shape fixed at creation, style mutable within shape.
  - JSON document model (ours is Markdown text — authorable, diffable).
  - Visible block chrome at rest (their blocks are always framed; ours only on hover).

## nui-table-editor — first shared investment (priority, settled 2026-09-21)

Current state: `nui-rich-text.js` table support = prompt-driven insert +
context menu (insert/delete row/col, delete table). No header row, no alignment,
no keyboard navigation, no reorder, no selection. Decision: extract and rebuild as a
standalone addon component, as easy to use and full-featured as the format allows.

### Component shape

`<nui-table-editor><table>…</table></nui-table-editor>` — upgrades a native table
(NUI progressive-enhancement idiom, same as `nui-table`). DOM-driven, zero dependencies.
Consumers: RTE (replaces `_showTableContext`), blocks editor table block, this editor.

### Feature set (proposed)

- **In-cell editing** with inline markdown marks (reuse RTE inline machinery per cell;
  cells store Markdown, never HTML).
- **Hover edge handles** as the primary structural path: insert row above/below,
  column left/right (Notion/Blok-style `+` on borders). Context menu stays for
  keyboard/a11y parity.
- **Header row toggle** (first row ↔ `thead`).
- **Column alignment** (left/center/right → pipe-table separator `:---` / `:--:` / `---:`).
- **Row/column selection + drag reorder.**
- **Keyboard walk:** Tab / Shift+Tab moves cells, Enter = row below, arrows navigate;
  Tab on the last cell appends a row.
- **Paste TSV** (Excel/Sheets clipboard) expands the table.
- Delete row/col/table, clear cell contents.
- **Round-trip law:** DOM table ↔ md-blocks pipe table, lossless. The editor offers only
  what round-trips.

### Format ceiling (settled 2026-09-21 — with an escape valve)

**The editor's ceiling is what the spec expresses; the spec grows when a real document
proves the need.** Build the whole pipe-table envelope perfectly first; treat spec
extensions (column width rules are the named candidate) as follow-up decisions,
each with spec edit + DECISIONS.md entry + version bump.

Hard spec facts that shape the ceiling (md-blocks spec §3, §5.1):

- **Raw HTML is outside the profile** ("escape them or show them as code") — an HTML
  escape-hatch table block would fight the format's grain. Effectively ruled out.
- **No `width`/`style`/`class` attributes** — presentation lives in the renderer's
  preset table. But `mb:columns weights=[2,1]` is blessed, so a future column-width
  extension follows the **proportional-weights idiom**, never `width=`.
- **GFM tables are the whole table model:** one header row, per-column alignment via
  the separator row (`:---` / `:--:` / `---:`), single-line inline-markdown cells.
- **`table` presets already exist** — `clean`, `specs` (2-col key/value, header hidden),
  `fit` (columns sized by data, long headers clip + hover reveal). Some "I need widths"
  requests are honestly `fit` requests.

### The 80/20 exploration (2026-09-21, grounded in Blok's table UX)

Blok's table (verified hands-on): 3×3 default insert, in-cell editing, Tab cell-walk,
per-row + per-column grips (drag = reorder, click = menu: Insert above/below, Delete),
edge add-row/add-column buttons, floating toolbar with header toggle and cell
background paint. No merge, no resize — even their "spreadsheet-grade" claim is
80% interaction polish, not spreadsheet features.

**Tier 1 — the 80% (daily use, all spec-expressible, no spec changes needed):**

| Feature | Spec vehicle |
|---|---|
| In-cell editing, inline marks (bold/italic/code/link/strike) | GFM inline in cells |
| Tab / Shift+Tab cell walk, arrows; Tab on last cell appends a row | editor behavior |
| Edge add row/column; row/col grip menus (insert above/below/left/right, delete) | editor behavior → pipe rows/cols |
| Header row toggle | presence of the GFM header + separator row |
| Column alignment (L/C/R) | separator row `:---` / `:--:` / `---:` |
| Table style select (default grid / clean / specs / fit) | block preset `table:*` (already in spec) |
| Paste TSV (Excel/Sheets), copy selection as TSV, auto-grow on overflow | editor behavior |
| Row/col drag reorder (grip drag) | row/column order in the text |
| Undo/redo | host editor's history stack |

**Tier 2 — frequent enough to plan for:**

- Multi-cell range selection (mouse drag / shift-click) for bulk clear/copy/delete.
- Row headers (first-column `th`) — not GFM-expressible; `table:specs` already implies
  label-column semantics. Spec candidate if real documents ask for it.
- **Column width rules** — the user's named candidate. Spec path: proportional
  `weights=[2,1,1]` idiom (mirrors `mb:columns`), never `width=`. First honest question
  when asked: does `table:fit` solve it?

**Tier 3 — the 20%, deferred or out of scope:**

- Cell merge/split — impossible in GFM and raw HTML is outside the profile. Banned
  unless the spec grows new table syntax (big fight, low document value).
- Cell/row background colors — presentation; spec bans style values; preset territory.
- Multiline cells — GFM cells are single-line; `<br>` is inline HTML, outside profile.
- Sorting, filtering, sticky headers — renderer/profile runtime concerns, not authoring.
- Formulas — spreadsheet territory, out of scope.

**Consequence:** Tier 1 needs zero spec changes. The editor is buildable now;
each Tier 2 spec candidate is decided when a real document proves it.

**Implementation:** planned in `docs/table-editor-implementation-plan.md` (2026-09-21).
Architecture: pure function `setupTableEditor(table)` + thin `<nui-table-editor>`
wrapper, so the RTE enhances tables in place (no wrapper in its saved HTML) while
standalone/doc-editor contexts use the element. Coding delegated to Gemini per user
direction; same component serves the standalone demo, the RTE, and later this editor.

### OPEN questions

- Multi-cell range selection (Tier 2): build the selection abstraction range-capable
  from day one, expose only cell/row/col grips initially. Confirm scope.
- Undo integration: component-local history vs. host editor's stack (RTE already has
  `_saveHistory`). Favorite: host-owned — the component emits change events, the host
  snapshots. Keeps one undo stack per editing surface.
