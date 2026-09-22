# nui-table-editor — Decision Log

Working record of settled decisions for the table editor component. New entries append
at the bottom. **Nothing here is a build batch** — work proceeds one slice at a time
(process law, 2026-09-22). **The user drives; model proposals arrive as built,
reviewable artifacts, never as descriptions** (working protocol, 2026-09-22).
Supersedes `docs/_Archive/table-editor-implementation-plan.md`.
Feature ceiling details (the 80/20 tiers): `docs/wysiwyg-editor-design.md`.

---

## 2026-09-21 — Intent

First extracted component of the WYSIWYG document-editor direction: the editing surface
is the rendered product; structure and controls appear on hover, context-sensitively.
The table editor must feel like that future today. UX reference: Blok demo (evaluated
hands-on) — in-cell editing, Tab walk, row/col grips, edge add buttons, header toggle —
executed to NUI's polish bar, not theirs. Existing `nui-rich-text` table support
(prompt-insert + context menu) is "not great" (user) and is what this replaces
eventually. The component will serve three hosts: standalone, RTE, document editors —
worth doing right.

## 2026-09-21 — Feature ceiling

**Full-featured = everything the storage formats can express, done perfectly** — not
spreadsheet features. Formats: HTML tables (RTE) and GFM pipe tables (md-blocks):
one header row, per-column alignment (`:---`/`:--:`/`---:`), single-line
inline-markdown cells. The spec may grow when a real document proves a need (column
width rules are the named candidate — proportional `weights=[…]` idiom, never `width=`;
`table:fit` already covers many "width" requests). Out of scope unless that happens:
merge/split (raw HTML is outside the md-blocks profile), cell colors, widths,
multiline cells, formulas, sorting.

## 2026-09-21 — Architecture shape

NUI component pattern — thin class, pure function:

- `setupTableEditor(table, options) → { destroy(), refresh() }` enhances any `<table>`
  in place; the RTE uses this directly so no wrapper element pollutes its saved HTML.
- `<nui-table-editor><table>…</table></nui-table-editor>` thin wrapper for
  standalone/doc-editor contexts; creates a default table if absent.
- DOM-driven: the table IS the model; no shadow state.
- contenteditable detection: inside a contenteditable ancestor the component adds UI
  only, never manages cell editability.
- Alignment via `data-align` attributes (CSP-safe, serializable), never inline styles.
- **Undo is host-owned**: the component emits `nui-change` (`detail.type`:
  content/structure/align/header; content debounced), hosts snapshot.

## 2026-09-21 — Failed attempt: one-shot generation

The whole component was generated in one pass (Gemini). Bones were sound (architecture,
inline detection, overlay-outside-contenteditable, export panel), but the interaction
feel failed review: permanent chrome violating the at-rest law, drag reorder crashing
on index math, corrupted CSS, stuck drag ghost. **Lesson: UX feel cannot be specified
in advance or generated wholesale** — it converges only through a see–touch–adjust loop.
Models compress the typing, not the judging; the user judges feel, the model verifies
mechanics.

## 2026-09-22 — Parked as abandoned experiment

The failed artifact is parked at `#page=experiments/table-editor` with an explicit
"unfinished and abandoned" notice (commit `5a37acb`): decoupled from RTE, cheatsheet,
global stylesheet, and the components.json registry. Reference only — **do not build on
that code.** Any future work restarts from this log.

## 2026-09-22 — Process law: ONE TASK AT A TIME

- Work proceeds in **thin slices** — one tiny interaction per step (e.g. *just* row
  selection, not "row operations").
- Every slice ends with a **user feel-check gate**: the user drives the demo and
  judges ("too slow", "wrong weight", "highlight in the wrong place"). Mechanical
  correctness is necessary but never sufficient.
- No slice starts before the previous one feels right. Scope never grows mid-slice.
- Feature lists are a **menu to order slices from**, never a batch.

**Slice order (proposed):**

1. Skeleton — enhance in place, cells click-to-edit, nothing else
2. Keyboard walk — Tab / Shift+Tab / Enter / arrows; Tab on last cell appends a row
3. Row bounds + selection — first visible chrome, first feel decision
4. Row grip menu — insert above/below, delete row
5. Column selection + grip menu — insert left/right, delete column
6. Edge add buttons — `+` bottom (row) / right (column)
7. Header row toggle — first row ↔ `thead`
8. Column alignment + first top-zone toolbar controls
9. Drag reorder — row, then column; hardest feel, deliberately late
10. TSV paste — spreadsheet clipboard grows and fills the grid
11. Range selection — shift-click ranges, bulk clear
12. Hygiene — change debounce, destroy residue check, a11y pass

RTE integration is its own slice, only after all of the above pass.

## 2026-09-22 — Chrome geometry: one safe zone, above the table

All panel-style info and controls live in a **single overlay zone anchored to the
table's top edge**. It grows **upward** as content requires, **max ≈ 4rem**, and never
displaces the table or the document — pure overlay, zero layout impact. At rest it is
empty; content is context-sensitive (table controls when a cell is active, selection
info for row/column/range selection, hints otherwise). Nothing floats anywhere else.
The failed attempt's permanent, content-overlapping toolbar is the counter-example this
replaces. Positional grips and edge `+` buttons stay at their rows/columns/edges —
they are place affordances, not panels.

## 2026-09-22 — Working protocol: user drives; suggestions are built, not described

The user takes the driver's seat: direction, pacing, and what gets picked up are theirs.
Model suggestions are welcome — but a suggestion is only admissible as a **built,
reviewable artifact** (a working aspect in the slice lab, handed over as a URL), never
as a prose description of a UX pattern. There is no point describing interaction — it
can only be judged by sampling it. Consequence for any model session: if you want to
propose something, build the aspect and let the user review it; otherwise stay silent
and execute the current slice.

## 2026-09-22 — Namespace freed: attempt renamed `dropped-table-editor`

The abandoned attempt is demoted out of the `nui-table-editor` namespace so the fresh
component can claim it. Custom element, CSS class prefix, and data attribute renamed to
`dropped-table-editor`; files moved out of the library tree to
`Playground/js/dropped-table-editor.js` and `Playground/css/dropped-table-editor.css`.
The move matters more than the rename: NUI's dev auto-loader resolves
`NUI/lib/modules/{tag}.js` for addon elements in the DOM, so leaving the old code at
that path would have silently loaded it for any future `<nui-table-editor>`. The
experiment page keeps running the renamed component at its route — ideas remain
pickable, the namespace is clear.
