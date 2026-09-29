# Handover — nui-table-editor — 2026-09-29

State of the table editor work at session end. What is done, what is verified, what
is not, and the two things that are genuinely open.

---

## Where the work is

| Path | What it is |
|---|---|
| `NUI/lib/modules/nui-table-editor.js` | The component (~1000 lines) |
| `NUI/css/modules/nui-table-editor.css` | The stylesheet |
| `documentation/addons/table-editor.md` | The API contract |
| `Playground/pages/experiments/table-editor.html` | The demo — **start here** |
| `docs/table-editor-decisions.md` | The full decision log, 2026-09-21 → 2026-09-29 |
| `#page=experiments/dropped-table-editor` | The abandoned first attempt, kept for contrast |

`7383ff0` pushed the component; `01266ef` (alignment icons, sprite source repair,
feel-check fixes) is pushed too. The tree is clean — nothing outstanding.

---

## The component

A native `<table>` that becomes editable in place. **The table is the model**: no
shadow copy of the data, no wrapper in the saved output. Two entry points, one
implementation:

- `setupTableEditor(table, options)` — enhances a table a host already owns
  (rich-text, block editors). Adds no element to the DOM.
- `<nui-table-editor><table>…</table></nui-table-editor>` — thin wrapper for
  standalone and document contexts.

Undo is **host-owned**. The component keeps no history; it emits `nui-change` and
the host snapshots.

### Mechanisms, all verified in the browser

click-to-edit · `Tab`/`Shift+Tab` walk (`Tab` past the last cell appends a row) ·
`Enter` down a row · **drag across cells to sweep a range** · `Shift`+click extend ·
grip click selects the whole row/column · grip drag reorders (all four directions) ·
edge `+` appends row/column · header-row toggle (both directions) · TSV paste grows
and fills · live GFM export with per-column alignment in the delimiter row.

---

## Design decisions that are settled

**The table surface is not restated.** `nui-theme.css` already styles
`table`/`th`/`td` globally, and `<nui-table>` adds the scroll container plus the
responsive fallback. Slotted markup is wrapped in `<nui-table>` and inherits. The
responsive card fallback is explicitly opted *out of* inside the editor — stacked
cards have no column left to grip.

**The accent is spent on the selection only.** Selection backdrop is
`color-mix(--color-highlight, <surface>)` — **opaque, mixed toward the surface, not
toward `transparent`**. An alpha wash is a film: compositing shifts the accent's
channels differently depending on what is underneath, and over the near-black dark
surface it reads as dirt on the table rather than a colour. Caret ring and keyboard
focus stay **neutral hairline** so "these cells" and "the keyboard is here" do not
look alike. All behind `--nte-*` tokens.

**Ring widths use `--border-thickness`, never a fixed px.** Chrome quantises
border-width to whole *device* pixels, so a hardcoded `2px` rounds up and renders
far heavier than twice `1px`.

**One range is the whole selection model** — `{minRow, maxRow, minCol, maxCol}`,
header being row `-1`. A cell, a row, a column and a rectangle are the same value,
so click, shift-click, gesture and grip cannot disagree.

**The zone never animates its height.** `height: 0 → auto` cannot be interpolated,
so the browser snapped it — that was the worst flicker. The zone is absolutely
positioned, so a full-size box at rest costs nothing: it only fades and lifts.

**The selection is a per-cell backdrop and nothing else.** An outline around the
range was added, then removed — layered on a filled block it was a second
indicator saying the same thing. *An explanation being true is not a reason for
the thing to exist: re-derive a decision's justification from the current state.*

---

## Bugs that only a real pointer found

Every one of these passed inspection. This is the concrete case for sampling rather
than reading.

1. **`focusin` is a FocusEvent — it has no `shiftKey`.** It fires *before* `click`,
   so ranges silently collapsed to a single cell. Shift must come from real
   `keydown`/`keyup`.
2. **`preventDefault()` on pointerdown suppresses the follow-up `click`**, which
   killed grip selection entirely. Selection now happens on *press* — better feel
   anyway, since the row lights up as you grab it.
3. **A cross-cell gesture's `click` fires on the table**, not a cell, so the click
   handler read it as "clicked outside" and erased the range just drawn. Needs a
   latch consumed by the next click.
4. **Splicing a *copy* of a live collection then indexing the *live* one.** Every
   drag landed one slot short, and rows refused to move up at all
   (`insertBefore(el, el)` is a no-op).
5. **The gesture must not begin on press** — only when the pointer crosses into a
   *different* cell, so dragging inside a cell still selects text.
6. **One document-level capture listener for pointermove.** Over a cell the overlay
   is `pointer-events: none` (events hit the cell); over chrome they hit the
   overlay. Bound to either host, the gesture sees half the drag.
7. **The caret ring was 2px** and read as a white box in a screenshot.

---

## The icon sprite — corrected model, and a real repair

**The sprite is a generated artefact.** `python assets/generate_icon_sprite.py`
builds it from `assets/Material_Icons/*.svg`. Anything hand-written into the sprite
is erased on the next run. Adding an icon means adding a source file and
rebuilding. `Agents.md` has the full procedure; `icons_get` is the discovery tool.

**What was found and fixed:** 13 symbols were in the sprite with **no source file**
— 10 pre-existing (`mic`, `archive`, `auto_stories`, `folder_open`,
`chevron_right`, `code`, `description`, `unfold_less`, `unfold_more`,
`content_cut`, added straight to the sprite by commits `c0400a6` / `a8492f1` /
`bbc6fdc`) plus the three `format_align_*` used by this component. All were one
generator run from being deleted — which is very likely how the 8-icon losses of
2026-09-24 happened.

All 13 were written back as source files using **path data taken from the
committed sprite**, not retyped. Result: **124 sources → 124 symbols, zero drift
both directions, zero symbol ids removed**, all resolve in the browser and appear
on `#page=documentation/cheatsheet`.

`scripts/sprite-drift.mjs` is the new guard: it diffs sprite ids against source
files and reports both directions of drift. Run it after any icon change.

### Verified 2026-09-29

The three `format_align_*` paths were diffed against **Google's originals** and are
**byte-identical**:

```
raw.githubusercontent.com/google/material-design-icons/master/src/editor/<name>/materialicons/24px.svg
```

All three `d` attributes match the committed source files exactly. The glyphs were
also confirmed visually in the toolbar — left/centre/right bar alignment is
unambiguous at icon size, so the render corroborates the path match.

⚠️ **`download-material-icon.ps1` is the wrong tool for this job and will mislead
you.** It fetches the *Material Symbols* family
(`symbols/web/<name>/materialsymbolsoutlined/`, `viewBox="0 -960 960 960"`), while
all 124 sources are *classic Material Icons* (`src/<category>/<name>/materialicons/24px.svg`,
`viewBox="0 0 24 24"`). Both render at the right size — the generator normalises any
viewBox to 24×24 — so the mismatch is **silent**: the sprite would quietly mix two
glyph families. The classic layout also has no flat path; the category is one of 18
(`action`, `editor`, `content`, …), which is presumably why the script never used it.

The classic URL is stable and category is the only unknown. Until the script is
fixed, fetch originals by hand with the URL above.

---

## Closed 2026-09-29 — feel-check signed off

**The user signed off the interaction feel: "the feel is really good, i think we
surpassed whats floating around in terms of easy to use table editors."** The
component is complete.

The feel-check ran as a long sampling loop rather than a single gate — roughly
fourteen rounds over one session, and **every round found real defects**, none of
which were visible to code review:

- two silent no-ops: zone labels rendered empty (`el()` wrote `textContent` as an
  attribute), and the header toggle changed the DOM without changing the screen
  (`th` is styled by tag, so a `<th>` in `<tbody>` is still a header)
- the top zone closed under the pointer on every button press
- three different treatments for one "on" state, two of them near-invisible
- a dead `outline-offset` whose own comment claimed a behaviour it did not have
- grips lighting one row for a multi-row selection, and blinking out on mouseup
- the selection staying on the slot rather than following what moved
- multi-column bands not carrying the selection at all
- text selection destroyed by a few pixels of hand overshoot at a cell edge

**Every one was found by the user driving the UI, and none by inspection.** The
process law in `docs/table-editor-decisions.md` — one slice at a time, user gates
each — was suspended for the initial build against the user's invitation. It was
never repealed, and the feel-check it describes is what this session ran, at
larger scale. The deviation is recorded in the log rather than hidden.

## Open

**RTE integration is not started, deliberately.** The component exposes
`setupTableEditor(table)` for exactly this, and inside a `contenteditable`
ancestor it adds UI only and never touches keys. Wiring it into `nui-rich-text`
to replace the existing prompt-insert + context-menu table support is its own
slice, and the gate that was holding it — the feel-check — is now closed.

The component was built in one pass at the user's invitation, against the
slice-at-a-time law. That deviation is recorded in the decision log rather than
hidden.

---

## A note on how this session went

Most of the wall-clock time went into a diagnostic that produced no actionable
change, and its wrong conclusions were propagated into four files and a GitHub
issue before being removed. Two process rules came out of it and are worth
carrying: **when a tool error names a path, suspect the operating model before the
transport** — and **do not write a theory into a file that outlives the session
until it survives a controlled test.**
