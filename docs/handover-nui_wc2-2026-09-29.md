# Handover — nui_wc2 — 2026-09-29

**Status: nui-table-editor complete.** Feel-check signed off after ~14 sampling
rounds; mechanics and interaction feel are both verified. Open: RTE integration
(a separate slice, unstarted) and deferred visual quibbles.

Supersedes the same-day `handover-table-editor-2026-09-29.md`, now deleted — it
was written mid-session and read as though the work were still open. The
decision log carries the full history; this is the orientation.

---

## Read this first

The demo is at `#page=experiments/table-editor` and the browser is already
open on it. **Drive it before reading anything else** — a fresh pair of eyes
sampling the component cold is worth more than any amount of reading this file,
and every serious defect found during the build was invisible to inspection.

If there is a visual or interaction quibble, it needs a **measured value, not
an adjective**. "Subtle grey" is not a specification. The cell fill converged
over five rounds and landed on `rgb(55,55,55)` dark / `rgb(230,230,230)`
light, given as exact numbers and solved for the mixing ratio. Spacing behaves
the same way: the gesture margin went 8px → 12px → 30px → *a fraction of the
cell* (0.14), and each step was a judgement only the user could make.

---

## Where the work is

| Path | What it is |
|---|---|
| `NUI/lib/modules/nui-table-editor.js` | The component |
| `NUI/css/modules/nui-table-editor.css` | The stylesheet |
| `documentation/addons/table-editor.md` | The API contract |
| `Playground/pages/experiments/table-editor.html` | The demo — **start here** |
| `docs/table-editor-decisions.md` | Full decision log, 2026-09-21 → 2026-09-29 |
| `#page=experiments/dropped-table-editor` | REMOVED — the abandoned first attempt is archived at `_Archive/dropped-table-editor/`, no longer in the Playground |

Everything is on `main` and pushed. `4274244` is the sign-off commit.

---

## The component

A native `<table>` that becomes editable in place. **The table is the model**:
no shadow copy of the data, no wrapper in the saved output. Two entry points,
one implementation:

- `setupTableEditor(table, options)` — enhances a table a host already owns
  (rich-text, block editors). Adds no element to the DOM.
- `<nui-table-editor><table>…</table></nui-table-editor>` — thin wrapper for
  standalone and document contexts.

Undo is **host-owned**. The component keeps no history; it emits `nui-change`
and the host snapshots.

Inside a `contenteditable` ancestor it adds **UI only** and never touches keys
or editability — that is what makes the RTE integration possible later.

### Mechanisms, all verified in the browser

click-to-edit · `Tab`/`Shift+Tab` walk (`Tab` past the last cell appends a row) ·
`Enter` down a row · arrow-key walk (`ArrowUp` off the first body row reaches the
header) · **drag across cells to sweep a range** · `Shift`+click extend ·
grip click selects a whole row/column · grip drag reorders · edge `+` appends
row/column · header-row toggle · TSV paste grows and fills · live GFM export
with per-column alignment.

> **Fixed after sign-off, 2026-09-29:** the vertical axis of that walk — `Enter`,
> `ArrowUp`, `ArrowDown` — did nothing. `moveFocus` accepted a `dr` argument and
> never applied it, and the caret-boundary guard measured the horizontal axis
> even for vertical keys, so any cell with text reported "not at an edge" and the
> key was swallowed. Both fixed and verified across nine cases. Full account in
> `docs/table-editor-decisions.md`. **Lesson: a parameter that is never read is a
> defect, and a half-working symmetric control reads as "less used", not broken.**

---

## Design decisions, and why

The reasoning is in `docs/table-editor-decisions.md`. The ones most likely to
be re-litigated without context:

**Grips appear on selection, not on hover.** Moving things in a table is a rarer
job than reading, editing or aligning. Chrome that is always present spends
focus on the job that is *about to happen* rather than the one that is.

**One grip per band, spanning it** — not one per row. The selection is a single
thing and one handle says so with a smaller claim than N. It also cannot lie: a
grip spanning two rows moves those two rows.

**No grips when the whole table is selected.** Nothing left to move, so a grip
would be a lie about what is selected — and it would be the loudest the chrome
ever gets. The selection stays fully visible; only the handles go.

**The accent is not a state colour.** `--color-highlight` is for links and
primary action. Editing state answers "what is under my hands", not "what is
important", so it is answered with a neutral surface step. This was violated
once during the build and reverted.

**Opaque, mixed toward the surface, never toward transparent.** A low-alpha
wash shifts hue depending on what sits underneath; over the near-black dark
surface a little mid-blue collapses to a muddy grey-blue that reads as dirt.

**Ring widths use `--border-thickness`, never a fixed px.** Chrome quantises
border-width to whole *device* pixels, so a hardcoded `2px` rounds up and
renders far heavier than twice `1px`.

**`opacity: 0` does not remove content from the a11y tree or the tab order.**
Only `visibility` or `display` do. The idle zone uses `visibility` for exactly
this reason.

---

## The rules that bit, and what they generalise to

Every one of these is invisible to code review and obvious in front of a
pointer. All were found by the user driving the UI.

1. **A comment stating a visual property is a claim, not evidence.**
   `// it stays a row, just unstyled` was false, and that is why a no-op shipped.
   Measure `getComputedStyle`; do not read the comment above the code.
2. **Derive state, do not mirror it.** Every durable fix removed a second copy
   of a fact: grips are *built* from the selection rather than toggled, all
   "on" states share one token, the range is re-anchored from the moved
   elements rather than kept as indices. Every bug was two things believing
   they both owned the same truth.
3. **A guard that can decline to fire must be tested firing.** The multi-column
   band "worked" — the reorder completed, the grip moved — while the guard
   silently skipped. A partial success reads exactly like a success.
4. **`calc()` on a keyword is invalid and the declaration is dropped silently.**
   `--border-thickness` is the keyword `thin`; `calc(thin * -1)` vanished and
   the comment above it described the behaviour that was not happening.
5. **A live `HTMLCollection` has no `indexOf`.** `tr.cells` is one. This threw
   and lost a selection while the visible result looked correct.

---

## How to test this thing

**The boundary of a change, not its easiest instance.** Four times during the
build a fix was reported verified on the narrowest case that could pass — one
row when bands are the feature, one column when columns are the axis, one
scheme when both exist. Each hid a real defect the user had to find.

Synthetic `td.click()` does **not** focus the cell (`activeElement` stays
`BODY`), so keydown-driven features look broken when they are not. Use
`page.mouse.click` at real coordinates. Scoping matters: the demo page has four
tables, and an unscoped `querySelectorAll` measures across all of them — that
one produced a false "this is broken" report.

Drags across `contenteditable` cells perform *text selection*, not a range
sweep. Use shift+click to test selection logic. Drag testing corrupts the demo
table's content; a reload clears it and nothing persists.

---

## Open

**RTE integration — unstarted, its own slice.** The component exposes
`setupTableEditor(table)` for exactly this and adds UI only inside a
`contenteditable` ancestor. Wiring it into `nui-rich-text` to replace the
existing prompt-insert + context-menu table support was gated on the
feel-check, and that gate is now closed.

**Visual quibbles** — David has some, deliberately deferred to a separate
session. This handover does not know what they are; they are the first thing to
collect.
