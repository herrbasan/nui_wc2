# nui-table-editor — Implementation Plan

**For the coding agent:** this is a complete execution brief. Read it fully, then read the
reference files listed in §3, then execute the phases in order. Do not improvise features
beyond Tier 1 — the feature ceiling is settled (see `docs/wysiwyg-editor-design.md` §80/20).
Follow `Agents.md` and `LLM-CHEATSHEET.md` conventions exactly.

## 1. Intent

This component is the first extracted piece of a larger direction: a **WYSIWYG document
editor** as a separate offering to the structural blocks editor. That editor's model —
settled with the user on 2026-09-21 — is *the editing surface IS the rendered document*:
no permanent framing, no palettes, and structure materializes on hover with floating,
context-scoped UI. The table editor must feel like that future, today: at rest, the
table looks like the final rendered product; on hover/focus, the editing chrome appears.

The UX reference is the Blok demo (blokeditor.com), evaluated hands-on. Its table
interaction is the bar: insert a table and type immediately, Tab walks the cells,
per-row and per-column grips (drag to reorder, click for a small menu), `+` buttons on
the bottom/right edges, a header-row toggle. We adopt those patterns — executed to
NUI's polish bar, not Blok's (their demo ships console warnings and a dead undo button;
ours must not).

What exists today is not acceptable: `nui-rich-text` inserts tables through a dialog
prompt and offers a right-click-style context menu with seven structural ops. No header
support, no alignment, no keyboard navigation, no reorder, no selection. The user calls
it "not great" and wants to *invest* in this component: it will serve three hosts
(standalone, RTE, document editors), so the architecture and accessibility are worth
doing right the first time.

**Full-featured means: everything the storage formats can express, done perfectly** —
not spreadsheet features. The formats are HTML tables (RTE) and GFM pipe tables
(md-blocks). What they express is the ceiling; when a real document proves a need
beyond it (column width rules are the named candidate), that's a spec-extension
decision made then, not guessed now.

## 2. Scope

Build `nui-table-editor`: a zero-dependency addon that turns a native `<table>` into a
first-class editable table (the 80% of table editing, done perfectly). Consumed by:

1. A standalone Playground demo page (phase 1 deliverable).
2. `nui-rich-text` (phase 2): replaces its prompt-insert + context-menu table support.
3. The blocks editor / future WYSIWYG doc editor (later; free via phase 2's architecture).

Design law: **offer only what round-trips.** No merge/split, no cell colors, no widths —
those need spec extensions and are explicitly out of scope.

## 3. Reference files (read before writing code)

- `Agents.md` — engineering manual: component pattern, CSS rules, demo page contract.
- `LLM-CHEATSHEET.md` — HTML structure rules, icon names (verify against
  `NUI/assets/material-icons-sprite.svg` — the sprite is a closed set).
- `NUI/lib/modules/nui-rich-text.js` — the existing table support being replaced
  (`insertTable` ~L230, `_showTableContext` ~L879, table context actions ~L1039),
  plus the module skeleton (class + `customElements.define` at ~L1480).
- `NUI/css/modules/nui-rich-text.css` — addon CSS conventions.
- `Playground/pages/addons/rich-text.html` and its registration in
  `Playground/js/page-init.js` + nav entry in `Playground/js/main.js` (~L334).
- `NUI/css/nui-theme.css` — the ONLY source of CSS variables. Never invent new ones.

## 4. Architecture (NUI component pattern: thin class, pure function)

```
setupTableEditor(table, options) → controller   // pure function, all logic
class NuiTableEditor extends HTMLElement         // thin lifecycle wrapper
```

- `setupTableEditor(table, options)` enhances any `<table>` in place and returns a
  controller `{ destroy(), refresh() }`. This is what the RTE uses directly (no wrapper
  element pollutes the RTE's serialized HTML).
- `NuiTableEditor` wraps: `<nui-table-editor><table>…</table></nui-table-editor>`.
  On connect: find the inner `table` (create an empty 3×3 if absent), call
  `setupTableEditor`. On disconnect: `controller.destroy()`.
- Registration at module bottom, guarded:
  `if (!customElements.get('nui-table-editor')) customElements.define('nui-table-editor', NuiTableEditor);`
  plus `export { NuiTableEditor, setupTableEditor };`

## 5. Files to create/modify

| Action | Path |
|---|---|
| create | `NUI/lib/modules/nui-table-editor.js` |
| create | `NUI/css/modules/nui-table-editor.css` |
| create | `Playground/pages/addons/table-editor.html` |
| create | `documentation/addons/table-editor.md` |
| modify | `Playground/js/main.js` — nav entry `{ label: 'Table Editor', href: '#page=addons/table-editor' }` in the Addons group (alphabetical) |
| modify | `Playground/js/page-init.js` — `nui.registerPage('addons/table-editor', …)` following the rich-text pattern |
| modify | `NUI/lib/modules/nui-rich-text.js` — phase 2 integration (§8) |
| run | `node scripts/update-docs.js` — registers the component in `documentation/components.json` |

## 6. Editing model

- **DOM-driven.** The `<table>` IS the model. All ops mutate the DOM; no shadow state
  that can drift. Reading state = reading the DOM.
- **contenteditable detection.** If the table sits inside a `contenteditable` ancestor
  (RTE), the component adds UI + keyboard only — it must NOT set `contenteditable` on
  cells itself. Standalone: cells get `contenteditable="true"` on focus-in, removed on
  destroy.
- **Hover-revealed UI** (matches the rendered-surface philosophy; the table looks like
  a rendered table at rest):
  - **Row grips** — one per row, floating at the row's left edge, visible on row hover.
    Drag = reorder row. Click = small popover menu: Insert above / Insert below /
    separator / Delete row.
  - **Column grips** — one per column, floating above the column, same interaction
    (menu: Insert left / Insert right / Delete column).
  - **Edge add buttons** — `+` centered on the bottom edge (append row) and right edge
    (append column), visible on table hover.
  - **Floating cell toolbar** — appears above the active cell/selection:
    header-row toggle, align left/center/right, separator, delete table.
- **Header row toggle** moves row 1 between a `thead > tr > th` structure and
  `tbody > tr > td`. Default new tables: header ON.
- **Alignment is attribute-driven** (CSP-safe, serializable): set `data-align="left|center|right"`
  on every cell of the column (th and td). CSS: `[data-align="center"] { text-align: center }`.
  Never inline `style=`.
- **Selection model:** build the abstraction range-capable from day one
  (anchor cell + focus cell), but phase-1 UI exposes only: active cell, whole-row /
  whole-column selection via grips, and shift-click range extension for
  bulk clear (Delete key clears contents of selected cells).

## 7. Keyboard map (active while focus is inside the table)

| Key | Action |
|---|---|
| Tab | next cell (row-major); from last cell: append row and move into it |
| Shift+Tab | previous cell |
| Enter | move to same column, row below (append row if at last row) |
| Arrow keys | at cell text boundary, move to adjacent cell |
| Escape | blur cell, select the table as a unit (host may then treat it as a block) |
| Delete/Backspace with range selection | clear contents of selected cells |
| Ctrl+Z / Ctrl+Y | NOT handled by the component — belongs to the host's undo stack |

**Paste:** intercept `paste` on cells. If clipboard text contains `\t` or multi-row
`\n` (TSV from Excel/Sheets): prevent default, grow the grid as needed (rows and
columns), distribute values from the active cell outward, emit change.

## 8. Events & host integration

- **`nui-change`** (bubbles, composed) after every mutation. `detail`:
  `{ type: 'content' | 'structure' | 'align' | 'header', table }`.
  Debounce `content` (300ms typing), fire `structure`/`align`/`header` immediately.
- **Undo is host-owned.** The component never snapshots. Hosts listen for `nui-change`
  and snapshot (RTE: call its existing `_saveHistory()` + `_emitChange()`).

**Phase 2 — RTE integration (`nui-rich-text.js`):**

1. Keep the toolbar `insertTable` flow (dialog.prompt for rows/cols is acceptable), but
   after inserting the table HTML, call `setupTableEditor(tableEl, { inline: true })`.
   Also enhance all pre-existing tables on init and after `value` setter.
2. **Delete** `_showTableContext` and the entire table branch of `_handleContextAction`
   (~L1039–L1095) — the component's grips/toolbar replace them. Keep link and image
   context menus untouched.
3. RTE imports `setupTableEditor` statically from `nui-table-editor.js` and adds a
   hard dependency note: RTE now requires the table-editor module (document in
   `documentation/addons/rich-text.md` and the cheatsheet addons table).
4. RTE forwards component `nui-change` → `_saveHistory()` + `_emitChange()`.
5. On RTE destroy/disconnect: call each controller's `destroy()`.

## 9. CSS rules

- Only variables from `NUI/css/nui-theme.css` (`--nui-space*`, `--color-shade*`,
  `--color-highlight`, `--border-*`, `--border-radius*`). No new variables, no hard-coded
  colors, no inline styles in markup.
- Grips/edge buttons/toolbar: absolutely positioned overlays — zero layout impact on the
  table. Hidden by default (`opacity`/`visibility`), revealed on hover/focus-within.
- Table styling itself stays the host's (nui-theme table styles); the component only
  adds editing chrome.
- Tabs for indentation.

## 10. Demo page (standalone lab)

`Playground/pages/addons/table-editor.html` — the demo IS the test lab:

- A pre-filled table (header row, 3–4 cols × 4 rows, mixed alignment, one column right-aligned).
- An empty-state table (2×2) for from-scratch testing.
- A live "GFM pipe-table export" `<pre>` panel that regenerates on every `nui-change`
  (proves the round-trip law: header row, separator with `:---`/`:--:`/`---:`, escaped
  pipes). This export function lives in the demo page script, not the component.
- A results/log line for manual verification.
Page script in `page-init.js` via `nui.registerPage('addons/table-editor', …)`: import
JS+CSS explicitly (production pattern), wire the export panel, scope all queries to
`element`.

## 11. Acceptance criteria (verify each in the demo page)

1. Click any cell → type → text lands; cell is editable without chrome at rest.
2. Hover a row → grip appears; click → menu with Insert above/below, Delete row; each works.
3. Hover a column → grip appears; menu Insert left/right, Delete column; each works.
4. Drag a row grip → row reorders; same for a column grip.
5. Bottom/right edge `+` appends row/column.
6. Tab walks cells row-major; Tab on the last cell appends a row and focuses it;
   Shift+Tab walks back.
7. Enter moves down a row (appends at bottom).
8. Header toggle flips row 1 between `thead th` and `tbody td`; export panel reflects it
   (GFM header present/absent per host rule — for the demo: header always written,
   toggle adds/removes the `table:specs`-style note in the export header comment).
9. Align L/C/R sets `data-align` on all cells of the column; export separator row shows
   `---`/`:--:`/`---:` correctly.
10. Paste a 4×3 TSV block into a 2×2 table → grid grows to fit, values distributed.
11. Shift-click selects a cell range; Delete clears contents only.
12. Every op above emits `nui-change` and the export panel updates.
13. Esc blurs the cell; component leaves no `contenteditable` residue after destroy.
14. `node --check` passes on the JS (run as `.mjs` semantics — the file is an ES module).
15. RTE page: insert a table, confirm grips/toolbar/keyboard all work inside the RTE,
    Ctrl+Z undoes a structural op (host undo), and the saved HTML contains no component
    chrome (no grips/toolbar markup serialized).

## 12. Explicit non-goals (reject on sight)

- Cell merge/split, cell/row background colors, column resize handles, formulas,
  sorting — spec-capped or renderer concerns.
- No wrapper markup inside the RTE's saved value (hence `setupTableEditor` enhance-in-place).
- No new CSS variables, no icons not present in the sprite (verify names).
- No TypeScript, no dependencies, no build step.
