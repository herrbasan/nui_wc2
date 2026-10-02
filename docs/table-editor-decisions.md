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

> **Superseded 2026-09-30:** the attempt was later removed from the Playground
> entirely and archived. See "The failed attempt is archived" at the end of this
> log. The reasoning above is why the rename was necessary at the time.

## 2026-09-28 — Fresh implementation, built whole (process deviation, declared)

The process law above ("one task at a time", "every slice ends with a user
feel-check gate") was **deliberately not followed** this session, at the user's
explicit invitation to "do your version of this" as a performance benchmark. The
whole component was built in one pass, then verified in the browser. Recorded here
because the law is not silently voided — it is suspended for this run and still
governs everything after it.

**Placement decision.** The component lives in the library tree
(`NUI/lib/modules/nui-table-editor.js` + `NUI/css/modules/nui-table-editor.css`),
not the Playground. The 2026-09-22 move out of the library was justified by *"the
dead code must not be auto-loaded for a future `<nui-table-editor>`"* — the dead
code is gone and untouched at its Playground path, so that hazard no longer
exists. Consequence: it is a **published addon** and owes a doc, a cheatsheet
entry, and a registry line. RTE integration remains its own slice and was **not**
attempted.

**Slice order (2026-09-22) was not followed either** — it prescribed 12 thin
slices, deliberately deferring drag reorder (slice 9) as "hardest feel". All 12
landed at once, and the *feel* of twelve simultaneous decisions was unseen by a
human until the feel-check on 2026-09-29. It found real defects in every one of
roughly fourteen rounds. That is the argument for the law, not against it.

## 2026-09-28 — The accent is not a state colour

User ruling: **do not use `--color-highlight` for selection fill, focus rings, or
"on" states.** That colour is the accent for links and primary action; spending it
on editing state made the table the loudest thing on the page. Editing state is a
question of "what is under my hands", not "what is important", so it is answered
with neutral surface steps:

| State | Token | Value |
|-------|-------|-------|
| Selection fill | `--nte-select-bg` | `--color-shade3` |
| Caret / focus ring | `--nte-active-ring` | `--text-color-dim` |
| Pressed toggle, selected grip | `--nte-on-bg` | `--color-shade4` |
| Drag drop line | `--nte-drop-line` | `--text-color-dim` |

**Why shade3 and not shade2:** the shared table surface is `--color-shade1` in
light and `--color-shade2` in dark. A shade2 selection fill is *literally the
table colour* in dark mode — it measured `rgb(40,40,40)` on a `rgb(40,40,40)`
table and was invisible. Shade3 steps clear of both the body and the shade4
header in both schemes. This class of bug is invisible in one scheme: it must be
checked in both.

Note `nui-list.css` does use `--color-highlight` for selection
(`--list-accent-subtle`). This is a **deliberate divergence**, not an oversight.
If the ruling is meant to generalise, `nui-list` is the next candidate.

## 2026-09-28 — Six bugs the browser found that reasoning did not

Every one of these passed inspection and failed only under a real pointer. This
is the concrete argument for the feel-check gate.

1. **`focusin` has no `shiftKey`.** It is a FocusEvent. It fires *before* `click`,
   so reading `e.shiftKey` there was always `undefined` → ranges silently
   collapsed to one cell. Shift must be tracked from real `keydown`/`keyup`.
2. **Grips sit outside the table's box** (a row grip is `translateX(-100%)`).
   Reaching for one fires `pointerleave` on the table, so enter/leave hover logic
   switched the chrome off *at the moment the user reached for it*. Unfixable with
   enter/leave — hover is now a geometric hit test with a margin.
3. **The overlay is a sibling on top of the table**, so hover events target the
   *overlay*, not the table. Bound to the table, the grips never lit up — a
   transparent element still swallows the pointer.
4. **`bodyRows()` returns a fresh array each call.** Reordering that array changed
   nothing; the element must be moved with `insertBefore`. The `reorder` event
   fired while the DOM stood still — the event was not evidence of the change.
5. **The initial measure ran while the page was hidden** (the router shows it
   later), so every coordinate was 0,0 and stayed there. Replaced with a
   `ResizeObserver`, which also covers font loading and column resizes.
6. **`onGripPointerDown` was never bound** — written, then orphaned when the grips
   became rebuilt-on-measure. Dead code that looked live. Grips are now bound by
   delegation on the overlay, so rebuilding them cannot leak a listener.

Two CSS findings: the base `button` rule floors every button at `2rem` square with
a highlight fill (affordances must override `min-width`/`min-height`), and the
icon sprite has **no `format_align_*` symbols** (nor `more_vert`, `check` or the
`arrow_*` set — verified against all 121 ids).

The alignment control was first built as **CSS-drawn glyphs**: three
`mask-image` data-URIs rendering left/centre/right marks. A missing sprite symbol
renders as *nothing at all*, silently, so a control depending on an asset that
may not exist is a control that may simply not be there — the CSS glyphs cannot
fail that way, and they follow the theme at any size. (First attempt used literal
`L`/`C`/`R` letters; the drawn marks read better.)

The component used three pre-existing icons: `add` (edge `+` buttons),
`drag_indicator` (row/column grips), `view_column` (header toggle).

## 2026-09-29 — Alignment marks added to the sprite as real symbols

The CSS-drawn glyphs were replaced with real `format_align_left/center/right`
sprite symbols, at the user's preference. Reasoning for the record: the glyphs
were the right *idea* — no asset dependency, cannot fail silently — but they were
CSS masquerading as icons while every other control in the component used the
icon system. One system beats a locally-correct exception, and the marks are now
real Material alignment glyphs rather than the CSS approximation.

Added as three source files in `assets/Material_Icons/` and the sprite rebuilt with
`python assets/generate_icon_sprite.py` — the sprite is generated, so a symbol
added to it directly is erased on the next run. Verified: 124 sources → 124
symbols, `node scripts/sprite-drift.mjs` reports zero drift in both directions, no
symbol id removed, and all three resolve in the browser
(`use href=…#format_align_left`, 16×16) and appear on the cheatsheet page.

## 2026-09-28 — Route rename

The abandoned attempt gave up the canonical route: its page is now
`experiments/dropped-table-editor.html` at `#page=experiments/dropped-table-editor`
(renamed via `git mv`, history preserved), and the fresh component owns
`#page=experiments/table-editor`. Both remain reachable from the Experiments
nav. The dropped attempt's code was not modified.

> **Superseded 2026-09-30:** the dropped attempt is no longer in the Playground.
> It now lives in `_Archive/dropped-table-editor/`.

## 2026-09-28 — UX reference: Blok, read hands-on

Evaluated `blokeditor.com/demo/` by driving it (the `/` slash menu → Table) rather
than reading about it. Kept: `table-layout: fixed` with per-cell borders, compact
cells, coordinate data-attributes, edge add buttons, near-invisible at rest.
**Not** copied: it has no header row by default and no alignment control at all —
GFM requires a header row and alignment is expressible in the target format, so
this component keeps both. The alignment UI is the one genuinely new piece.

## 2026-09-28 — Feel-check round 1: four failures, one root cause

The user sampled the built component and reported: no way to select multiple cells
or rows; Blok allows dragging the mouse over cells/rows to select them in a
gesture; selecting the drag indicator does not highlight the row; the top toolbar
is ugly; and "pretty much like the one Gemini made".

Three of the four were **the same defect wearing three faces**: selection was not
a thing the component had, only a thing it derived per interaction. `selectedRow`,
`selectedCol` and a loose `rangeAnchor` were three variables written by four code
paths, and they disagreed. Replaced with ONE range — `{minRow, maxRow, minCol,
maxCol}`, header being row `-1` — so a single cell, a whole row, a whole column and
a rectangle are the same value, and every gesture writes it. The toolbar looked
generic because it was built on that unstable state.

Four findings worth keeping:

1. **`preventDefault()` on `pointerdown` suppresses the follow-up `click`.** Grip
   selection was bound to `click`, so calling `preventDefault()` to stop native
   drag silently killed the very selection it was meant to make. Selection now
   happens on **press** — which is also better feel: the row lights up the instant
   it is grabbed, telling the user they hold the whole row, not just a handle.
2. **A cross-cell gesture's `click` fires on the common ancestor** (the table),
   not on a cell. The click handler read that as "clicked outside a cell" and
   cleared the range that had just been drawn. The selection silently vanished on
   release. Fixed with a latch consumed by the next click.
3. **The gesture must not begin on press.** It begins when the pointer crosses
   into a *different* cell. A drag that stays inside one cell is text selection,
   and it has to stay text selection — otherwise you can no longer highlight a
   word in a cell, which is the most ordinary thing anyone does in a table. This
   is why the gesture is a *crossing* test and not a distance threshold.
4. **The pointermove must be a single document-level capture listener.** Over a
   cell the overlay is `pointer-events: none`, so events target the cell; over
   chrome they target the overlay. Bound to either host, the gesture sees half the
   drag. Hit-testing is geometry (`cellFromPoint`), so it does not care what is
   layered on top.

## 2026-09-28 — "Double line" under the selection

The selection outline showed a second parallel rule along its bottom edge. Three
contributing mistakes, all invisible in code review:

- `box-sizing` was content-box, so the 2px stroke rendered **outside** the
  computed geometry. The rect grew 2px past its right and bottom edges and
  nothing else. Measured: top/left aligned, bottom/right off by ~2px.
- With `border-collapse`, the table already draws a line at every cell boundary.
  An outline must be centred **on** that line (offset by half a border), not
  flush to the cell's border-box and not pulled inside it — either way both lines
  show.
- The zone pill and the column grips occupied **the same band**: the grips are
  `translateY(-100%)` above the table edge and the zone sat a hairline above that.
  The zone was hiding the handles. Fixed by lifting the zone by grip-height +
  gap, and `z-index` above the grips.

The drag glyph is 1.2rem by default and a grip is 0.875rem tall, so at theme size
the icon overflowed its own handle and rendered as an empty box. The handle is
sized by feel, not by its icon, so the icon gives way.

## 2026-09-28 — Motion: where the flicker actually came from

The user called the interaction "somewhat glitchy" and suggested animation. The
cause was not missing animation but **one impossible transition**: the zone
animated `height: 0 → auto`. That cannot be interpolated, so the browser snapped
it every time — a visible jump on every selection.

Because the zone is absolutely positioned, a full-size box at rest costs the
document nothing, so it does not need a height transition at all: it fades and
lifts 4px, and the box is simply already there.

The selection outline is the opposite case. Easing it during a pointer drag is not
polish, it is **lag** — the outline arrives after the cursor has moved on. So
geometry is eased for keyboard and programmatic changes, and switched off
(`is-gesturing`) while a gesture draws it. One shared easing
(`cubic-bezier(0.2, 0, 0, 1)`) and duration across the component: chrome that
appears with different curves in different places reads as unrelated things.

**Rule worth generalising: an animation that cannot be interpolated is not an
animation, it is a snap. When a transition looks glitchy, check first whether the
property is interpolatable before adding more motion.**

## 2026-09-28 — Ruling reversed: the accent IS a selection colour

The earlier ruling (above) — never spend `--color-highlight` on selection — is
**withdrawn for selection only**. Sampling showed a neutral fill does not read as
a selection; it reads as a tint. The accent is now used for exactly two things:

| State | Treatment |
|-------|-----------|
| Selection backdrop | `color-mix(--color-highlight 18%, --color-shade1)` light / `24%, --color-shade2` dark — **opaque** |
| Selection outline | **none** — the backdrop is the whole selection |
| **Caret ring + keyboard focus** | neutral hairline, `--border-thickness` |

The backdrop went 50% → 30% → 10% → opaque, and only the last step fixed it. The
three alpha values were all the same mistake at different strengths: a
`color-mix(accent N%, transparent)` is a *film*, and alpha compositing shifts the
accent's channels by different amounts depending on what is underneath. Over the
near-black dark surface, 10% of a mid-blue collapses to a muddy grey-blue —
which reads as dirt on the table, not as a colour. That is exactly what the user
reported as "looks odd", and no opacity value fixes it, because the problem is
the compositing model rather than the amount.

Mixing toward the **surface** instead (`color-mix(accent 18%, --color-shade1)`)
gives one flat, opaque colour per scheme: the hue stays the accent, the contrast
against the table stays predictable, and the text contrast measures 13.1:1 light
/ 8.6:1 dark. The ratio is higher in dark (24% vs 18%) because a dark surface
needs more accent to register as a tint at all.

**Worth generalising: a translucent tint is a blend with whatever is underneath,
so its colour is not a property you can specify — it is an outcome. If the
colour has to be *right*, make it opaque and choose the mix explicitly.**

The **outline around the range was removed outright.** It had been justified as
"a selection is one thing, so draw it as one thing" — which is true, and was
still wrong: layered on a filled block it was a *second* indicator saying the
same thing, and the cells' own grid lines already bound the rectangle. Three
ways of saying "selected" (backdrop, outline, caret ring) is one way too many.
The caret ring stays because it says something genuinely different — *the
keyboard is here* — and it is hairline so it does not outweigh the block.

Lesson worth keeping: **an explanation being true is not a reason for the thing
to exist.** The outline was justified by a correct principle and should still
have been cut, because the principle described a *goal* ("read as one thing")
that the fill had already achieved on its own. Re-derive the reason from the
current state before keeping a decision — the reason that justified adding a
thing usually stops justifying it once the thing it was compensating for arrives.

## 2026-09-28 — Ring thickness follows the theme token, never a pixel value

The caret ring was 2px and the user asked for "thin, minimal thickness". Fixed by
using `var(--border-thickness)` for both width and offset, which is what makes it
sit exactly on the grid line. See the device-pixel note above: a hardcoded 2px
rounds *up* to a whole device pixel and reads far heavier than twice 1px.

## 2026-09-28 — Two silent failures found by sampling, not by reading

1. **Alignment set the attribute but never moved the text.** When the addon was
   restructured to inherit `nui-table`'s surface, the `text-align` rules were
   dropped while their comment — "Alignment is an attribute, never an inline
   style" — stayed. The attribute was written, the GFM export was correct, the
   event fired, and **nothing on screen changed**. The most expensive possible
   failure mode: every layer above it reported success. A block that only sets
   `overflow` under a comment about alignment is the kind of thing that survives
   review indefinitely.

2. **Drag reorder was off by one, in a direction-dependent way.** The line was
   drawn at the target cell's *far* edge while the element was inserted *before*
   that cell, so every drop landed one slot short of the promise — and dragging
   toward index 0 clamped to "no move" and did nothing. Replaced with a single
   **boundary** value ("n items lie above/left of the pointer") that drives both
   the line position and the insertion index, so they cannot disagree.

   Two further bugs lived inside that one, both the same mistake — **splicing a
   copy of a live collection and then indexing the live one**:
   - Rows: the insert reference was `bodyRows()[to + 1]`, which is *the dragged
     row itself* when moving toward the start. `insertBefore(el, el)` is a
     no-op, so rows refused to move upward at all.
   - Columns: `Array.from(tr.cells).splice(...)` removed the cell from a **copy**;
     the live `tr.cells` still held 4 cells, so `tr.cells[to]` named the wrong
     element and every drag to the right landed short.
   Both now take the reference from the array *without* the dragged element.

## 2026-09-28 — A note on "thin": device pixels, not CSS pixels

The selection outline was declared `1px` and measured back as `0.667px`. That is
not a bug: Chrome quantises `border-width` to whole **device** pixels, so at a
1.5 ratio 1px CSS snaps down to one device pixel = 0.667px — which is precisely
what the theme's `--border-thickness: thin` cell borders measure. The outline is
now the thinnest line the browser can draw at that ratio, and it matches the
grid exactly.

Worth recording because the arithmetic is counterintuitive in both directions:
`2px` does not render "thinner than 1px, but twice as thick" — it rounds *up* to
a whole device pixel, which is why the old 2px ring looked so much heavier than
a value only twice as large.
## 2026-09-29 — The icon family trap, and closing the format_align verification

The three `format_align_*` path strings were written from recall and flagged
unverified. **Closed: all three are byte-identical to Google's originals**, fetched
from `.../material-design-icons/master/src/editor/<name>/materialicons/24px.svg`,
and corroborated visually (left/centre/right bar alignment is unambiguous at icon
size).

The verification itself produced a finding worth more than the verification.
`assets/download-material-icon.ps1` fetches **Material Symbols**
(`symbols/web/<name>/materialsymbolsoutlined/`, `viewBox="0 -960 960 960"`), but
all 124 sources are **classic Material Icons** (`src/<category>/<name>/materialicons/24px.svg`,
`viewBox="0 0 24 24"`). The generator normalises any viewBox to 24×24, so both
families render at the correct size and **the mismatch is silent** — running the
script would quietly seed a different glyph design into the sprite. The handover
had recommended exactly that command; following it literally would have produced
a wrong-family file that still looked plausible.

Two rules, both already in `Agents.md` in one form or another, made concrete:

- **A source file is not verified because it survives regeneration.** Regeneration
  only proves the source exists. "Is this the real glyph" is a separate question,
  answered by diffing against the upstream original.
- **Any tool that writes into `Material_Icons/` must state which family it fetches
  and fail loudly on the other.** A generator that normalises away the difference
  has removed the error signal, and a wrong-family icon is exactly the kind of
  defect that ships silently into every component that uses it.

## 2026-09-29 — Feel-check signed off; the component is complete

**User: "the feel is really good, i think we surpassed whats floating around in
terms of easy to use table editors."** Fourteen sampling rounds, and every round
found real defects.

### What the rounds actually found, and the shape they share

| defect | why no one could see it |
|---|---|
| both zone labels rendered empty | `el()` wrote `textContent` as an *attribute* — present in the DOM, 0×0, no error |
| header toggle did nothing visible | the theme styles `th` by TAG, so a `<th>` in `<tbody>` is still a header; computed style was byte-identical either way |
| top zone closed under the pointer | `refresh()` began with `clearSelection()` |
| alignment "on" state imperceptible | three treatments for one state, and the weakest was the one pretending to be *elevated* |
| a darker inner line on the caret | `outline-offset: calc(var(--border-thickness) * -1)` — that token is the keyword `thin`, arithmetic on a keyword is invalid, the declaration was dropped, and the comment above it described the behaviour that wasn't happening |
| one grip for a multi-row selection | `is-selected` was set on grips that `position()` then rebuilt, so it survived no gesture |
| selection stayed on the slot after a move | a range is positional; indices silently re-point at whatever moved in |
| multi-column bands dropped the selection | only the band's FIRST cell was probed, so `hi - lo + 1 === size` failed and the re-anchor was skipped in silence |
| text selection died at a cell edge | two gestures genuinely conflict there and nothing had decided which wins |

**Not one was findable by reading the code.** Every one is invisible to inspection
and obvious in front of a pointer. The feel-check is not a formality bolted onto
the process — it is the only instrument that measures this class of thing at all,
and a component whose feel is unverified has an unmeasured error rate.

### Three rules worth carrying past this component

1. **A comment stating a visual property is a claim, not evidence.** "It stays a
   row, just unstyled" was false and is why a no-op survived. Measure
   `getComputedStyle`; do not read the comment above the code.
2. **Derive state, do not mirror it.** Every durable fix here removed a second
   copy of a fact: grips are built from the selection rather than toggled, the
   pressed states share one token, the range is re-anchored from the moved
   elements rather than kept as indices. The bugs were all cases of two things
   believing they both owned the same fact.
3. **A guard that can decline to fire must be tested firing.** The multi-column
   band "worked" — the reorder completed, the grip moved — while the guard
   silently skipped. A partial success reads exactly like a success.

### And the one about how I worked

Four times I reported a fix verified on the narrowest case that could pass: one
row when bands are the feature, one column when columns are the axis, one scheme
when both exist. Each hid a real defect the user had to find. **Test the boundary
of the thing you changed, not its easiest instance** — the easy instance is the
one the eye lands on, and it passing is evidence only about itself.

### Design decisions that closed the session

| decision | reasoning |
|---|---|
| Grips on selection, not hover | moving is a rarer job than reading or aligning; always-on chrome spends focus on the job that is *about to happen* rather than the one that is |
| One grip per band, spanning it | a selection is one thing and one handle says so with a smaller claim than N |
| No grips when the whole table is selected | nothing left to move, so a grip would be a lie about what is selected |
| The accent is not a state colour | the 2026-09-28 ruling, restated: editing state answers "what is under my hands" |
| Cell fill is a neutral grey | user-chosen: `rgb(55,55,55)` / `rgb(230,230,230)`, mixed toward each scheme's own surface |
| Gesture slop is a fraction of the cell | a fixed number means different things in a wide and a narrow cell; a fraction also gets both axes right from one constant, since cells are wider than they are tall |
| Do the 80% with excellence | the cost of a feature is paid whether or not this user needs it |

### The next slice, unstarted

RTE integration. `setupTableEditor(table)` exists for exactly this and adds UI
only inside a `contenteditable` ancestor. Wiring it into `nui-rich-text` to
replace the prompt-insert + context-menu table support was always gated on this
feel-check. The gate is now closed.

## 2026-09-29 — Toolbar placement: centred, and a defined edge

**User: "I would want it to be centred over the table. Also its subtle border
should be a little less subtle."**

Measured before the change: the zone was **328px left of the table's centre** in
a 896px table — it sat flush to the table's left edge (`left: 0`), which is where
it inherited its position from. Its border was `--border-shade1`, which against
`--color-base` (dark `rgb(20,20,20)`) is `rgb(45,45,45)`: a step that reads as
"an outline nobody drew on purpose" rather than as an edge.

**Centring is done with `width: fit-content` + `margin-inline: auto`, not
`left: 50%` + `translateX(-50%)`.** The obvious idiom would have broken the
component: `.nte-zone` already uses `transform` for its appear animation
(`translateY` for the lift, `translateY(0)` when active). Handing `transform` a
second job means the two rules overwrite each other, and the failure is a toolbar
that fades without lifting — a partial animation nobody would report as a bug.
Auto inline margins are the centring that needs nothing but the box. `margin-inline`
rather than `margin`, so the `margin-bottom` that lifts the zone clear of the
column grips is untouched.

**The border goes up exactly one step, `--border-shade1` → `--border-shade2`.**
Not a new colour, and not a "slightly stronger grey": `shade2` is the same step
`nui-dropdown`, `nui-file-tree` and `nui-blocks-editor` already use for a
floating surface that needs a defined edge. The toolbar now reads as chrome of
the same weight as the rest of the library rather than as a special case.

Verified: centre offset `0px` on a single-cell selection (239px zone) and on the
widest case the zone could reach at the time — a whole-table selection carrying
the "4 × 4" caption (292px) — across all four demo tables, including the one
enhanced in place inside a different parent. Both stay clear of the table's top
edge, so the column grips are not covered. (The caption is gone as of the
section below; the zone is a fixed 239px.)

### A boundary test that lied, and what it cost

The narrow-table check (140px) first reported a **13px zone**. It was wrong, and
knowing that took three attempts:

1. The probe container was positioned off-screen, so `getComputedStyle` returned
   **empty strings** and `getBoundingClientRect` returned zeros — an element that
   is not rendered reports nothing, and "no data" was about to be read as "tiny".
2. Re-run inside the live page flow, the zone still measured 13px — but with
   **zero children**. The synthetic `keydown` I dispatched never selected
   anything, so `updateZone()` correctly built an empty zone. 13px was the
   padding of a toolbar with no toolbar in it.
3. A real click on the same 140px table: **3 children, 239px, offset 0**.

The rule generalises past this component: **a synthetic event that does not
reproduce the component's own state change will produce a confident, plausible,
entirely fictional measurement.** Two of the failures in the post-handover audit
were the same mistake. Where the answer looks surprising, suspect the rig first
and prove which it is before reporting anything.

## 2026-09-29 — Post-handover audit: the vertical walk never worked

A cold re-read of the handover drove the demo again. Fourteen sampling rounds had
signed the component off, and the keyboard walk still had a dead axis: **`Enter`
and `ArrowUp`/`ArrowDown` moved nothing.** `Tab` and `ArrowLeft`/`ArrowRight`
worked. Two independent causes, both the same species of error.

**Cause 1 — a parameter accepted and never read.** `moveFocus(from, dr, dc,
appendRow)` computed `r` from the column wrap alone. `dr` was passed in by every
vertical caller and then dropped on the floor. A row walk that ignores its row
argument is not a rounding error; it is a function that cannot do the thing its
name says. Fixed by applying `dr` to `r`.

**Cause 2 — an edge test measured the wrong axis.** The guard that decides
whether a caret sits at a cell boundary collapsed a clone range to the start/end
of the cell — a *horizontal* test. For `ArrowUp`/`ArrowDown` it was still
evaluated, measuring the cell's whole contents: any cell with text measured
non-zero, reported "not at an edge", and the key was swallowed. So even with
cause 1 fixed, vertical movement stayed dead. The boundary test is now per-axis;
the vertical walk is blocked only while text is genuinely selected, which the
preceding guard already establishes.

**Why sampling missed it.** Both are invisible in the horizontal case, which is
the one every earlier round exercised — `Tab` and left/right share the code path
that still worked, and both failures are silent no-ops with no console output.
The feel-check signed the *gestures*; the vertical keyboard axis was never driven.
This is the fourth time the boundary-of-the-change rule has paid: the easy
instance is "does left/right still work", and it did.

### The rule this adds

**A parameter that is never read is a defect the compiler cannot see and the
horizontal test cannot reach.** When a function takes a direction, an axis or an
index, that argument must be provably load-bearing: if deleting its use changes
no behaviour, the caller is lying about what it asked for. The tell is a
half-working feature — one axis of a symmetric control — which reads as "the
other one is just less used" rather than "this is broken".

### A second trap, this one in the harness

`activeElement` can be set while **no focus event fires at all** — observed in a
hidden browser tab, where `cell.focus()` moved `activeElement` and dispatched
nothing. Two consequences worth keeping:

- `[data-active]` read after a synthetic focus is **null**, which looks exactly
  like a selection that never happened. It is a measurement artifact.
- Programmatic `td.click()` and CDP mouse input are both unreliable here (the
  page is a background tab, so trusted input never lands). Complete gestures must
  be assembled by hand — `pointerdown` → `pointermove` → `pointerup` → the
  `click` the browser would have fired. **Omitting that trailing `click` leaves
  `suppressNextClick` armed and silently eats the next real click**, which
  presents as "selection randomly stopped working".

Verify a harness before believing it. Two of the three failures in this audit
were in the test rig, not the component.


## 2026-09-29 — The toolbar sits close, and lifts only for the handles

**User: "can the position be closer to the table and only move up when horizontal
drag handles are visible?"**

Measured first: the gap was a flat **17–18px in every case** — single cell, row
band, column band, whole table. The zone cleared a column grip *unconditionally*,
so it spent 18px of separation on the selections where there is no grip to clear.

**The lift is now conditional, and it is pure CSS.** `.nte-overlay:has(.nte-col-grip)
.nte-zone` sets the clearance only when a column grip exists. Two reasons that
selector and not a JS-maintained class:

- It asks the question directly — *does a column grip exist* — rather than reading
  a flag the JS maintains alongside the grips. A second copy of that fact is
  exactly what this component's bugs have always been, and the class would be
  free to disagree with the grips it describes.
- No JS change at all. The zone's vertical position was already pure CSS
  (`bottom: 100%` + a margin); `position()` only ever placed the overlay box.

**The rule has to sit on the overlay, not the zone.** The zone is a *sibling* of
the grip container, and no selector reaches a sibling's descendants from inside
the zone — the obvious `&:has(~ *)` formulation is inert. I wrote that, saw it
was wrong, and removed it rather than leaving a comment claiming it did something.

**Only column grips are in the band, and that was verified, not assumed.** The
drop lines span the table's own box, and row grips are translated `-100%` to the
*left* — neither enters the space above the top edge. So a row band correctly
gets the close gap, with its row grip untouched beside the table.

Measured after: **8px** for a single cell, a row band, and a whole table;
**17–18px** for a column band and a two-column band, with a rectangle-intersection
check confirming the zone never covers the grip in either. Going back to a single
cell releases the lift.

**The lift animates.** A conditional `margin-bottom` that snapped would read as a
glitch at the moment a grip appeared, so `margin-bottom` joined the existing
transition list. It is animated as a margin rather than a transform offset
because the transform is already carrying the appear lift — the same one-property
-one-job rule that decided the centering.

## 2026-09-29 — The `+` hit area spans the axis; the rule behind it

**User: "the element always has a bottom margin so there is room on that side but
it should use more then that room", following "make the area (hitbox) of the add
buttons as wide/heigh as the axis, with a hover state that has a line behind the
(+) button spanning with widht/height".**

The margin is real and it was being wasted. `nui-table` carries
`margin-block-end: var(--nui-space)` — 16px — and the `+` sat 1.5rem wide in it.
A full-width band is 2.25rem (36px) deep and overhangs that margin by 20px,
which is the "more than that room" the space was there for in the first place.

**The band IS the button.** There is no separate hit strip the pointer has to find
before the control. The visible `+` became a child (`.nte-edge-add-dot`) so the
CSS can centre it inside the band with flexbox — the visible dot keeps its
identity and its own background, and the band is transparent and unstyled. That
split exists because the base `button` rule in `nui-theme.css` gives every button
`min-width`/`min-height: 2rem`, a highlight fill and its own padding: a band that
inherited them would be a 2rem-tall coloured bar across the table.

**`position()` no longer centres anything.** It writes the band's origin and
extent and nothing else — the `addSize` half-size subtraction is gone, along with
the transform that double-counted it yesterday. Centring is now the stylesheet's
single job, so the button can be resized without `position()` knowing. The two
mechanisms competing for one fact are not reconciled here; **one of them was
deleted.**

**The hover rule is a pseudo-element**, 1px of ink, `rgb(70,70,70)`
(`--border-shade3`) — a RULE, so it does not scale with the user's font size,
matching the separator in the zone. It spans the full width (row band) or full
height (column band), and the dot's opaque background sits on top of it, so the
`+` reads as sitting ON the line rather than the line crossing through it.

### Two things this nearly got wrong

**The band is larger than the hover margin.** `HOVER_MARGIN` is 24px; each band
is 36px. With a margin-only neighbourhood test, the outer 12px of the row band
lay outside "over the table", so the chrome would have switched itself off at the
exact moment the pointer reached the band's far edge — the precise failure the
`overTableOrChrome` geometry test was written to avoid, reintroduced through a
number. `overChrome()` now tests the bands' own rects.

**`visibility: hidden` on an idle band is a deadlock.** The band is invisible
until `is-hovered`, and `is-hovered` is set by hovering the table. An invisible
element takes no pointer events, so a band that is `visibility: hidden` can never
be the *first* thing the pointer reaches — it only works if the pointer crosses
the table first. I briefly made the band permanently grabbable to "fix" this,
which is self-contradictory for exactly that reason. It is gated on `is-hovered`
and that is correct; the ordering (pointer crosses the table, band becomes
visible, pointer continues onto it) is what makes it reachable. `visibility` is
still required for a11y: a 36px-tall invisible strip spanning the table would
otherwise be a tab stop, which is a real regression at this size even though it
was only latent at 1.5rem.

Measured: row band 896×36, column band 36×162, each dot centred on its axis to
within 1px. Hit-tested at all four extremes of both bands — far left, far right,
outer edge, far top, far bottom — and every point resolves to the band. Clicking
the row band at its far left and the column band at its far bottom both add a
row/column and emit `structure:add-row`/`add-column`. Real hover confirms
`:hover` matching, the rule at `opacity: 1`, and the dot lifting. Regression sweep
clean: click, shift-extend, row-band grip, column-band grip with the zone
lifting, whole-table no-grips with the zone returning, `ArrowDown`, GFM export.



## 2026-09-29 — The selection caption is gone; the toolbar no longer reflows

**User: "the display of the selected cells in the toolbar is unnecessary i think.
and it make the control jump."**

Both halves of that were true, and the second is the more serious one. The
toolbar carried a quiet `3 × 2` caption, rendered only when the selection covered
more than one cell. Removing it fixed a jump that the centring change had made
worse, and the measurement is why:

| selection | zone width | Align centre button at |
|---|---|---|
| single cell | 239px | x=738 |
| 3 × 2 range | **292px** | **x=712** |
| single cell again | 239px | x=738 |

**53px of width change, and 26px of lateral movement of the controls.** Because
the zone is centred, growth is symmetrical, so every control slides sideways.
The sequence is: click a cell, drag across more, and the toolbar you are reaching
for slides out from under the pointer. The control surface was fighting the very
gesture that had just revealed it — and it is a *worse* defect than the noise the
caption was, because a jump is not something a user can learn to ignore.

**The general rule this establishes: a control surface must not reflow in response
to the state it reports on.** Status text, selection counts, result sizes — all of
these belong somewhere that does not move the controls. A toolbar that changes
width is not a toolbar with extra information, it is a toolbar with a moving
target. The information was also redundant: the selection is already drawn in the
table, in a colour chosen precisely to be the neutral answer to "what is under my
hands".

Measured after: the zone is **239px with Align centre at x=738 in all five
cases** — single cell, a 3 × 2 range, back to single, header only, and a whole
table. `children: 3` throughout: the alignment group, the separator, the header
button. The dead `.nte-zone-info` CSS went with it.

This is the component's own recurring shape one level up. The bugs in this file
were two things believing they both owned a fact; this was one thing — the
caption — changing the size of another thing, the control row, as a side effect
of a fact only the caption cared about.

## 2026-09-29 — The edge `+` buttons: both were off-centre, and the fix is subtractive

**User: "the (+) buttons should be both centered on their axis, the x-axis one
works, y-axis is offset. The Button itself should be a bit bigger / pill shaped
with a shadow."**

**Both were offset, by the same 10px.** The measurement:

| | reported as | actually | error |
|---|---|---|---|
| row button, x-axis | "works" | centre at 806, expected 816 | **−10px** |
| col button, y-axis | "offset" | centre at 620, expected 630 | **−10px** |

The x-axis one was not correct, only *less noticeable*: 10px along an 896px row is
1.1% of the span, and 10px down a 162px column is 6%. A defect measured in pixels
presents as a defect measured in proportion, and the user's eye caught the
proportionally larger one. **When a user reports one instance of a symmetric
thing, the other instance is usually also broken** — the report is a sample of
where the error is *legible*, not where it exists.

**Cause: the centring was applied twice.** `position()` already subtracts the
measured half-size when it writes `left`/`top` (`rect.width / 2 - addSize`), and
the CSS transform then carried `translate(-50%)` as well. Two mechanisms, one
job, each independently correct, together wrong by exactly one half-size. The
transform now nudges only — `translate(0, 0.375rem)` and `translate(0.375rem, 0)`
— leaving centring to `position()`, which *measures* rather than assumes and so
survives the resize below without a second thought.

This is the same shape as the caption, one layer down: two things owning a fact.
The measurement is what separated them, and it is the reason the rule is stated
as a measurement and not as an adjective.

**Bigger, rounder, lifted.** 1.25rem → **1.5rem**, and `border-radius: 50%`
rather than `--border-radius3`. At 1.25rem the 0.5rem radius came within 2px of
the 10px a full round needs, so the shape was a *rounded square by coincidence* —
it would have stopped reading as circular the moment the size changed. Stated as
`50%`, the intent survives any future resize. The shadow is the zone's own
two-part `0 1px 2px / 0 4px 12px`, reused rather than invented, so the toolbar
and the edge affordances that belong to it look like one family; hover deepens it
slightly, which is the affordance acknowledging the pointer.

Measured after: centring error **0 on both axes**, at 896px and at 320px, on the
first table and the second, still 6px clear of each boundary. Both buttons still
add a row/column and still emit `structure:add-row` / `structure:add-column`.

## 2026-09-29 — The `+` dot shrinks; the line is the whole hover

**User: "the hover state should only be a line, it should not have a background
color. but the line could be in the hightlight color. I think we can make the
buttons smaller again, since we have the whole element as hitbox now."**

All three follow from one fact: **the band is the target, and the dot is only a
marker for it.** Once that split existed, the dot's size stopped being a
usability constraint and could be judged as a visual decision.

**1.125rem, down from 1.5rem** — the measured target area is now **89× the dot's**.
The icon went with it: `--icon-size` is 1.2rem, which overflows an 18px circle, so
the glyph is pinned at 0.75rem. That is the second time in this file an icon has
had to be sized to its container rather than to the theme (the grips, earlier) —
the theme's default is right for a theme-sized control, not for one that has been
shrunk to a marker.

**Hover is the line and nothing else.** The dot keeps `--color-base` on hover and
its resting shadow; only the glyph brightens. A second signal underneath the line
would compete with it rather than support it — and because the dot is opaque, a
filled dot would have *obscured* the very line it was announcing.

**The line is `--color-highlight` (`rgb(76,132,229)`), and this is the first
accent in the component.** The standing rule is "the accent is not a state
colour", stated three times in this log and in the addon doc. I applied the
instruction and wrote down why it does not actually contradict the rule, rather
than quietly breaking it:

> The rule governs **editing state** — selection, focus, the "on" states. Those
> answer *"what is under my hands"*; the accent answers *"what is important"*, and
> a table under edit must not be the loudest thing on the page. The edge `+` line
> answers a different question: *"where will a click land"*. It is transient,
> pointer-driven, and gone the moment the pointer leaves — an **available
> action**, which is exactly what the accent is for everywhere else in the
> library.

So the ruling is not weakened, it is **stated more precisely than it was**: the
accent is not a *state* colour. The addon doc's design-philosophy bullet now says
"affordances that announce a clickable target" instead of "links and primary
action" — the narrower phrasing was the thing that made this read as a
contradiction, so the fix is to the phrasing, not to the colour.

Verified in both schemes: rule `rgb(76,132,229)` at `opacity: 1` on hover and
`opacity: 0` idle; dot background `rgb(20,20,20)` dark / `rgb(255,255,255)` light
and **identical on hover**; shadow unchanged; glyph `rgb(230,230,230)` dark /
`rgb(30,30,30)` light. Band geometry untouched at 896×36 and 36×162, dots
centred, and clicking the far left of the row band and the far bottom of the
column band still adds a row/column and emits `structure:add-row` /
`structure:add-column`.

## 2026-09-29 — Three defects a screenshot found that the measurements did not

**User: "the bar should be line and the (+) is now somewhat ugly (plus not
centered and mabye it too small now). The area of the hitbox can be a bit
smaller. we need to stay within the bounds of the bottom margin of the table."
Then: "please check your work visually."**

Every number I had measured was *correct*. The band was 36px, the `::before` was
1px, the dot was 19.3px, the glyph was centred by flex. And the component still
rendered a **solid blue bar** with an off-centre `+`. Measurement verified the
thing I was measuring and nothing else.

### 1. The band was a bar, because the theme paints `button:hover`

`button:hover` in `nui-theme.css` is `background-color: var(--color-highlight)`.
Its specificity is (0,1,1) — one *element* plus a pseudo-class — against my
`.nte-edge-add` at (0,1,0). **The theme wins, and the whole 36×896 hit area
floods blue.** The `::before` line was drawn correctly the entire time, on top
of a blue slab, which is why every computed value read as intended and the
screen said otherwise.

The fix is `.nte-edge-add:hover { background: none }` at matching specificity.
A class selector cannot out-specify `button:hover`; the theme's state has to be
cancelled explicitly. This is the standing cost of building an affordance out of
a real `<button>`, and it applies to every state the theme paints.

**The lesson is the one this log keeps earning, in a new costume: I had
`getComputedStyle` reading the *element* and never once reading the *cascade*.**
"Does this property have the value I wrote?" is not the question. "Which rule
won?" is. Every time a value I authored did not appear, the first suspect must
be a competing rule, not a stale stylesheet.

### 2. The `+` sat 1.59px high — and my first fix was inert

`.nte-edge-add-dot` is a `<span>`, so the theme's text-flow rule `span > nui-icon`
applied: `top: -0.1rem` plus side margins. That rule exists to optically align an
icon with a line of prose; here the icon is the only content of a fixed box, so
the optical nudge is simply an error.

My first attempt set `vertical-align: middle`, which **does not apply to flex
children** — so it changed nothing and I would have reported it fixed if I had
not re-measured. The actual fix resets `margin` and `top`.

### 3. The band has to fit the table's margin, which drags the dot down with it

`nui-table` gives the affordance `margin-block-end: var(--nui-space)` — 16px.
That margin is the budget: at 2.25rem the band ran 20px past it and swallowed
the next element; at 1.5rem it still overhung by 8px.

The band cannot be smaller than its dot, so shrinking the band means shrinking
the dot. The dot went to **0.875rem with `box-sizing: border-box`** — without
that, the 1px border is added *outside* the box and a 1rem dot renders 17.3px,
overflowing a 16px band by 1.3px and visibly clipping the `+` on a short table.
The screenshot showed the clipped `+`; the arithmetic had said "fits".

And `min-width`/`min-height: 0` on the base band rule turns out to be
load-bearing rather than tidy-up: the theme's `button` rule floors every button
at `var(--nui-space-double)` (2rem = 32px), and a `height` cannot shrink a box
whose floor is 32px. Anyone shrinking this again must keep those two lines.

Final measured state: band **16px deep and 16px wide** — exactly the margin, not
one pixel more — clearing the next element; dot 14px, fitting the band; glyph
offset **0**; target area **102× the dot's**. Real mouse clicks at the far left
of the row band and the far bottom of the column band still add a row and a
column. Confirmed on a 1-row table and a 90px-wide table (target 7× there, the
one case where the ratio gets thin) and in both colour schemes, in the isolated
harness and in the Playground.

### On the harness

The first version was `page.setContent` on `about:blank` with absolute URLs. It
returned plausible numbers and could not be reloaded or screenshotted against
the real page, which is exactly when it was needed. The working version is a
real file served by the same Live Server, gitignored at `.scratch/`, holding
three tables — wrapped, enhanced in place, and headerless — each with ordinary
content directly below it, because **"does the band overlap what follows" is not
answerable without something following it.**

## 2026-09-29 — Insert moves into the toolbar; delete joins the bands

**User: "We could have the 'add column' and 'add row' in the toolbar instead of
the edges of the table. The upside would be that it could insert at the cursor,
so after the currently selected column / row. As pro feature, on ctrl-click it
would do it before the column / row. Also, we currently don't have the concept
of deleting rows or columns, but that we could do like we do the drag, just the
opposite site, so when a column is selected, it has the drag widget on top, and
on the bottom an 'x' to delete the column, same with the rows."**

All four operations already existed — `insertRow`, `insertColumn`, `deleteRows`,
`deleteColumns` — and none of them were reachable. This was a UI change, not new
machinery, which is why it went in a single slice.

### Why insert had to leave the edge

**The edge affordance structurally cannot express the feature.** It lives on the
table's boundary, so it can only ever mean "at the end". The user's upside —
insert *at the selection* — is not a parameter that could be added to it. Moving
the control into the zone is what makes position expressable at all, and the
modifier is then nearly free: one button, plain = after, Ctrl = before, instead
of a second control for the mirror case.

Two details that needed deciding rather than transcribing:

- **`insertRow(after)` cannot insert before the first row.** At `-1` it finds no
  reference row and appends to the end instead, so "before" had no form in the
  existing function. Rather than contort the call site, `insertRowAt(index)`
  states the operation the callers actually need.
- **The inserted row/column is SELECTED, not just created.** The insertion point
  is worth confirming, and a fresh selection is also where the user is about to
  type. An unselected empty row appearing in a grid is ambiguous.

### Delete is the band's other end

A column band's drag grip is above the table; its `×` is below. A row band's grip
is left; its `×` is right. Three reasons, in weight order: **a drag and a delete
are not equivalent in consequence** and should not be a click apart; the two
handles bracket the band, which reads as "these act on this whole thing"; and it
uses the space that is empty. The delete acts on the WHOLE band for the same
reason the drag does — a handle spanning three rows that removed one would be a
lie about what it does.

The surface is the grip's, deliberately identical: same object, same look, the
glyph is the only difference. The hover is a **neutral** surface step, not red —
this component's standing rule is that editing state is answered neutrally, and
a delete hover is editing state.

The existing floor guards already covered the dangerous case: deleting the last
remaining row **clears** it rather than removing it (`structure:clear-rows`),
because a table with no body row has no height to hover and the editor would
become unreachable. Verified by deleting down to one row and clicking again.

### The doc said so, and the code did not

**User: "it only deletes the first, not all selected columns/rows."** The section
above had already stated the requirement — a handle spanning three rows that
removed one "would be a lie about what it does" — and the implementation
removed exactly one. The comment sat directly above the handler that got it
wrong, describing the behaviour rather than the code, which is the usual way a
stated intent and a wrong implementation coexist for a long time.

The cause was plumbing, not logic. The GRIP was built from the band and carried
its extent (`data-row-from`/`data-row-to`); the DELETE handle beside it carried
only `data-row-del="<band.from>"`. The handler therefore had no idea a band was
selected, and `deleteRow(tr)` / `deleteColumn(index)` took a single row or a
single index. Two halves of one idea, and only one of them knew the band
existed.

- Both delete handles now carry the band extent (`data-row-del-to`,
  `data-col-del-to`), which is the one-line part.
- The functions take a RANGE and remove it **from the end backwards**. This is
  the part that would have bitten next: removing a span front-to-back shifts
  every later index, and "deletes the wrong things" would have replaced "only
  deletes the first" with something subtler and harder to notice.
- The floor guards generalised to a band: if removing the selection would leave
  fewer than one body row (or column), the selection is CLEARED instead, because
  an empty tbody has no height to hover.

Verified: selecting two of three body rows deletes both and leaves the third
intact; selecting two of three columns deletes both and leaves the third intact
(which is the case that proves the backwards removal); selecting all three rows
clears them rather than removing them.

### A real bug the accessibility snapshot caught

Inserting a column into a table **with a header** put a `td` in `<thead>`. The
snapshot read `rowheader "Component", cell, rowheader "Status", cell, ...` — the
header row parsed as a mix of `rowheader` and plain `cell` instead of a run of
`columnheader`s. And because the theme styles `th` by tag, the new column's
heading rendered unbolded and unshaded next to its neighbours.

A cell's tag is a property of the **section it sits in**, not the column it
belongs to. Invisible to a pixel diff of the grid's data, obvious in the
accessibility tree — which is the one place the whole column's semantics live.

### Two things I got wrong, both caught by looking

**1. A line-range deletion removed the drag grips' positioning.** I removed the
edge-add CSS by line number rather than by rule, and the range swallowed
`.nte-row-grip`/`.nte-col-grip` axis offsets, the icon sizing, and
`cursor: grabbing` on drag. The grips rendered *inside* the table. No error, no
lint, and a computed style that reported exactly what the file no longer said.

**2. A percentage offset resolved against the wrong box.** With the grip
containers left `static`, a `position: relative` handle resolves `top: 100%`
against the CONTAINER's content box — which is sized by the handles themselves,
not by the table. The column delete computed `top: 28px` and sat inside the
table. `100%` looked right and landed nowhere useful. Fixed by making the
containers `position: absolute; inset: 0` so they *are* the table's box; the
delete then computes `top: 195.333px`, the table's exact height.

Both are the same lesson this log has now drawn three times, so it is worth
stating as a rule rather than an anecdote: **a range-based edit to a stylesheet
has no idea what it is deleting, and a percentage offset has no idea what it is
resolving against.** Edit by rule, or read the diff.

### Verified

Insert after / Ctrl-insert before on both axes; inserted column is selected; new
`th` in `<thead>`; delete removes a whole row band and a whole column band; the
last-row and last-column floors clear instead of removing; drag reorder still
works end-to-end (column dragged to position 1, drop line shown, selection and
per-column alignment travelling with it). Regression: arrow walk, per-column
alignment, header toggle round-trip, GFM export, insert→delete round trip
balanced. Geometry measured on both band kinds and screenshotted, in the harness
and the Playground.

## 2026-09-29 — The two-minute problem, and why no hint was added

**User: "The editor might not be intuitive in the first 2 minutes, but at minute
3 its incredibly fast to work with." Then, naming the cost precisely: "the
selection gesture is not guessable but .. discoverable :)"**

That is the whole review in two clauses, and it is a much more useful verdict than
a score. Two gestures carry the component: **insert at the selection**, and
**select a whole row/column band**. Everything else — alignment, the header
toggle, keyboard walk, TSV paste — is either guessable or self-evident. Two is a
good number. Zero would be a failure, and eight would be a spreadsheet.

**The measurement that matters.** On a single click: six visible controls, zero
grips, zero deletes. Every structural affordance in the component is invisible
until a band exists. So the question is not "is this discoverable" in the
abstract — it is whether a user who tries an ordinary thing gets a signal.

They do, on the second try:

| attempt | what appeared |
|---|---|
| single click | toolbar only, no handles |
| shift+click to the row's last cell | `Row 1` + `Delete row 1` |
| click the header cell, shift+click the last row cell | `Column 1` + `Delete column 1` |

Two ordinary attempts, each revealing a different band type.

### The hint I did not add

I started to add a line to the zone naming the gesture. It is the reflex move and
it is wrong here, for a reason that is already this component's founding law:
*at rest it is an ordinary table.* Permanent instructional text is chrome, and
chrome is spent on the majority — the users who select a cell and type, who never
want a band, and who would be paying for a sentence about a gesture they will
never make. The handles appearing **because you did something** is a stronger
teaching signal than a label would be: it is immediate, it is tied to the exact
action that caused it, and it costs nothing when unused.

**Discoverable beats documented, when the documentation would have to be
permanent.** The cost is real and it is not zero — the first two minutes — so this
is a trade, not a free win. It is the right trade only because the alternative
taxes everyone to help a few.

What *was* worth fixing is the doc, which described a hover affordance that was
deliberately removed months ago: it promised that hovering a row or column would
reveal its grip, and there is no hover state. Anyone reading it would have hunted
for something that does not exist. The line now says what actually happens —
extending to the first and last cell of a row or column selects the band, and
that is what reveals the handles.

### The finding this leaves open

Nothing in the component points at the band gesture on first contact, and the
grips are the only route to drag and delete. That is a deliberate trade and it is
now written down with its reasoning, so a future change that adds a persistent
hint has to argue against this paragraph rather than against a feeling. The thing
to watch is the user who *never* tries shift+click: for them, two of the
component's capabilities do not exist. If that turns out to matter, the honest
fix is a one-time coach mark dismissed on first successful band selection — not a
permanent line, and not hover chrome.

## 2026-09-29 — A new cell looked like a text input, and was dead

**User: "I found a bug, a newly created cell/row has now input field."**

The report named a *symptom* — an appearance — and the defect underneath was a
missing attribute. The two were the same line of code.

**Tab past the last cell produced a row you could not type into.** The new cells
carried no `contenteditable` at all:

```
toolbar insert → <td data-align="left" data-selected data-active contenteditable="true"><br></td>
Tab append     → <td data-align="left" data-selected data-active><br></td>
```

### Why it looked like an input field

`moveFocus` still called `focusCell` on the new cell, so the browser put a caret
in it. What the user got was therefore an **empty, bordered box with a blinking
cursor in it** — which is a picture of a text input, drawn by a cell that was not
one and could not be typed into. The appearance and the breakage came from the
same missing line, which is why it read as a styling bug and was not one: every
computed value was correct, the fill was the same neutral grey as any selected
cell, the outline was the same hairline, and there was no overlay, no pseudo
element and no focus ring. Searching for "input field" in the CSS finds nothing,
and there is no `<input>` or `<textarea>` anywhere in the module.

### The actual cause: editability was a side effect of measuring

`refresh()` ends with a sweep that sets `contenteditable` on every cell. So
editability was not a property of a cell — it was a side effect of the component
re-measuring itself. Every path that happened to call `refresh()` after creating
a cell produced an editable cell, and the one path that did not produced a dead
one. Tab-append creates a row, selects it, focuses it, and never re-measures.

That is the whole bug in one sentence: **a property of the thing was being
maintained by an unrelated operation.** It is the same shape as the caption that
resized the toolbar and the transform that double-counted the centring — one
thing's invariant maintained somewhere else, correct until a path appeared that
did not go through that somewhere else.

Fixed at the root rather than the symptom: `makeEditable(cells)` is called by
`insertRow`, `insertRowAt` and `insertColumn`, so every cell is editable because
it was created, and a future fifth creation path cannot reintroduce this. The
sweep in `refresh()` stays — it is still right for cells that arrive from a
host's own markup — but it is no longer load-bearing for cells this component
made.

### Verified

All four creation paths produce editable cells: Tab-append, toolbar insert,
Ctrl-insert-before, and insert-column (body *and* header). Every cell in the
table — 35 of them after a mixed sequence — carries `contenteditable="true"`,
zero exceptions. Typing into a Tab-created row takes and reaches the GFM export.
TSV paste that grows the grid leaves every new cell editable. Deleting a band
leaves the remainder editable.

The lesson, the third instance of it in this file, worth stating as a rule:
**if a property belongs to an object, set it where the object is made. A sweep
that happens to cover it today is a coincidence with a future path — and the
future path is where the bug lives.**

## 2026-09-29 — Hue is a warning, so it belongs to the moment of acting

**User, on the experiment that coloured the three operations permanently: "it's
too loud visually .. so roll that back"**

The rollback was to the *resting state*, not to the idea. A permanent blue drag
handle is a blue thing sitting on the page whether or not anyone is touching it;
there is no reading of that which is quiet. What the experiment had actually
found was the right question — *what is this handle for?* — and the loudness came
from answering it with a resting colour.

The surviving form: **nothing in the component is coloured at rest.** A band sits
on `--color-shade4`, and turns `--color-highlight` while the pointer is on it; a
delete turns `--palette-alert` on hover. Both hues are the theme's own — the
accent a link uses, the alert a `variant="danger"` button uses — so they already
mean "interactive" and "destructive" everywhere else in the library, and nothing
is invented to carry a new meaning.

The rule this generalises to: **every colour on screen at any moment is one the
user caused.** A resting hue is a standing claim on attention that nothing
earned. Spend it on the moment of acting, and it becomes information.

Both mixes go toward the band's own resting surface
(`color-mix(in srgb, var(--color-highlight) 42%, var(--color-shade4))`) rather
than toward white, so a hovered band reads as the same object one step brighter
instead of a different object — the component's standing rule about colour
(opaque, mixed toward the surface, never toward transparent) applied to a hover.

## 2026-09-29 — The band and the grid are one line, or the joint is doubled

Bands grew from 1rem to `--nte-band: 1.5rem` at the same time as their shadows
came off, and the growth introduced a defect nobody asked for. `--border-thickness`
is `thin`, which at dpr 1.5 computes to **0.666667px**. The grip draws that line
on the edge that meets the table, and the table draws its own line in the same
place, so the joint rendered at **1.33px** — a visibly heavier edge at exactly
the one place the user is looking for the band to be continuous with the grid.

The fix is to remove the grip's border on the meeting edge (`border-right: 0` on
`.nte-row-grip`, `border-bottom: 0` on `.nte-col-grip`). The table's line is
already there and is the correct weight, so the grip steps aside and lets it do
the job. This is the same decision as the squared inner corner above it: **finish
the joint instead of stopping halfway.** Two elements that abut are one edge, and
one edge is drawn once.

The same measurement produced the toolbar's gap. With a column band selected the
zone is lifted clear of the col grip, which needed
`margin-bottom: calc(var(--nte-band) + var(--nui-space-half))` — otherwise the
toolbar sat on top of the handles. Verified at **8px with a band and 8px
without**, so the lift moves the toolbar and does not reflow it.

## 2026-09-29 — A token declared on the wrong element is a value that is absent

No user report; the two tables in the harness simply did not match.

`setupTableEditor(table, { chromeHost })` appends the overlay to the host, so for
a table enhanced **in place** the grips, the zone and the drop lines are children
of a plain `<div>` that is neither the `nui-table-editor` wrapper nor the table.
The state tokens were declared on the wrapper and the table only. Every token on
that chrome resolved to nothing and each rule fell back to its own default.

The symptom was a component that looked like two different components. The bands
read `--nte-on-bg` and fell back to `--color-shade3` (dark `rgb(60,60,60)`)
instead of the intended `--color-shade4` (dark `rgb(80,80,80)`) — twenty points
apart, plainly visible side by side. Less visibly, the zone's `transition`
referenced `--nte-ease`, so the whole transition list was invalid and silently
dropped, and the drop line lost its colour. The wrapped case was correct purely
because its chrome happened to sit inside a token scope.

`.nte-overlay` was added to the selector list, because the overlay is the one
element that always contains every piece of chrome. The table stays in the list
because the cells need these too.

**A token declared on the wrong element does not resolve to the wrong value — it
resolves to nothing, and the fallback hides the mistake.** A fallback is
indistinguishable from a correct value unless you compare the two cases against
each other, which is why the harness holds a table in each of the three
arrangements for exactly this reason.

## 2026-09-29 — Clicking outside clears the selection, including a band's

**User: "A selection of a row or a columns stays when clicked outside the table"**

Dismissal on an outside press already existed and was already committed
(`3eace97`); the report was that it did not work for bands. Two independent
causes, both of which had to go.

### The clear returned before the grips were rebuilt

`applyRange(null)` removes the cell highlight *above* its early return, so a cell
selection cleared perfectly — it has no handles to leave behind. A row or column
band owns a drag grip and a delete control, and both are **built from the range**.
The clear was therefore only visibly broken for the selections that own visible
chrome, which is exactly why it read as "the outside click does not work" rather
than "the highlight is stale in one case".

`buildGrips()` now runs in the null branch too. There is no flag to clear: the
grips are derived, so a null range produces no bands, and the handles and the
selection cannot disagree.

### The drag could never end, and that killed the dismissal permanently

This is the one worth keeping. `endDrag` was bound to `pointerup` on the
**overlay**. Starting a drag runs `applyRange` → `position()` → `buildGrips()`,
and `buildGrips` **replaces the grip the press arrived on** — so by the time the
pointer was released, the element that would have received the release was
detached from the tree and the event had no path up to the overlay.

The only reason it ever worked was `overlay.setPointerCapture?.(e.pointerId)`,
which retargets the whole pointer stream to the overlay and so delivered the
release to a listener that was otherwise unreachable. **The drag's lifetime hung
on an optional API silently doing a listener's job.** Where that call is missing
or throws, `drag` never becomes null: `is-dragging` sticks, and because the
outside-press dismissal opens with `if (drag) return`, every subsequent click
outside the table stops clearing the selection — permanently, with nothing on
screen to explain it.

The drag now ends from the **document, in the capture phase**, beside the sweep
gesture that already had to listen there for the same reason. One owner, on the
one element that cannot be rebuilt mid-gesture.

Two rules, both instances of things this log has already paid for:

- **A gesture's teardown must not depend on an element the gesture can replace.**
  Bind it where every event is guaranteed to arrive, or the gesture can outlive
  its own release.
- **An early return in a "set this state" function is a partial update.** The
  function's job is to make the visible state match the model; returning before
  the model is fully applied leaves the two disagreeing, and the disagreement
  shows up in whatever had a second, derived representation.

### Verified

Row band, column band and single cell each clear completely on an outside press
— selected cells, grips and delete controls all back to zero, in both directions
— on the wrapped, in-place and headerless tables. A press *on* a grip or a delete
correctly keeps the selection, because that is chrome and not outside. Drag
reorder still commits with the teardown moved to the document, the band follows
the row it moved, the drop line shows during the drag, `is-dragging` clears
afterwards, and a band remains selectable afterwards.

One rig note, because it nearly sent me after a phantom: dispatching the release
at the grip captured *before* the press is not a gesture a real pointer can
perform — the element is gone by then. The rig has to resolve the release target
with `document.elementFromPoint` at that moment, which is what the browser
hit-tests. The failing synthetic version reproduced the symptom exactly, and the
faithful one did not.

## 2026-09-30 — The comments come out of the code

**User: "The code contains a lot of documentation. I think this is the wrong place
to do that. And it will run stale anyways, so please remove it and if you feel
there is things to note, put them in the docs\table-editor-decisions.md"**

Measured before cutting, which is the only way to argue about "a lot":
**1813 lines, 605 of them comment lines (33%), 115 blocks.** The stylesheet was
worse in proportion — 800 lines, 359 in comments (45%).

The argument for removal is not taste, it is that the two places fail
differently and neither has an alarm. A comment has no compile step and no
review gate, so it decays silently: it describes a version of the code that no
longer exists, and nothing reports the gap. In a file this size that is not a
matter of *if*. And the decay is invisible precisely where it is most dangerous
— the long comments explaining a subtle invariant are the ones that keep
describing an earlier fix after the code moved on, and they read as authoritative
precisely because they are long.

### What stayed, and the rule for it

Code keeps **only what a reader of that line cannot get from the line**:

- Section dividers (`// ── Selection ──`) — orientation, zero maintenance.
- One-line function labels where the name does not carry the meaning.
- Constraints that are **invisible from the code** and would be violated silently:
  `tbody.rows` is a live collection; the header row is index `-1`; the overlay is
  not `aria-hidden`; a band's grips are rebuilt on every measure so listeners are
  delegated.

Everything else — the measurements, the post-mortems, the "this used to break
because" narrative, the generalisations — moved here. **The reasoning is
perishable in a way the constraint is not.** A comment that says why a decision
was made is only true until the decision changes, and nobody notices when it does.
The same text here is dated, so a stale claim is visible as a stale claim.

### What the removal itself exposed

Cutting prose out of a file that has been accumulating prose for a week surfaced
two things that reading it never had:

**1. Duplicated comment blocks — the file was contradicting itself.** The overlay
positioning rationale appeared twice, verbatim, six lines apart (161–170). The
`buildGrips` doc comment was *nested inside itself*: a `/**` opened, then another
`/**` opened before the first had closed, so the first one's text was already
inside a comment and the JSDoc structure was corrupt. Two prose blocks describing
the same function in the same file, one of them malformed, is the endgame of
in-code documentation with no owner — and it is the concrete argument for the
move. A duplicated comment is not a style problem; it is two answers to "what
does this do", and nothing in the build picks a winner.

**2. The comment density was tracking the debugging, not the design.** The
densest regions are exactly the ones that were hardest: pointer gestures,
reorder arithmetic, paste offsets. That correlation is the point. Prose
accumulates where the code fought back, which is where the *invariants* are — so
the invariants were the one thing worth keeping in the source, and the war stories
were the one thing worth throwing out.

### The invariants, kept in the source because nothing else carries them

These are the load-bearing facts that survive the move, each one a trap that
fails silently:

| Fact | Where | Silent failure if broken |
|---|---|---|
| `tbody.rows` / `tr.cells` are **live** collections | reorder, paste | `indexOf` resolves against a different snapshot than the element was inserted into → `-1` → an empty row that looks like a successful insert |
| The header row is index **`-1`** | every coordinate function | every range, band and clamp is off by one row |
| The overlay is **not** `aria-hidden` | setup | it holds the real toolbar; hiding it while focusable controls are inside is a contradiction the browser resolves by blocking the hiding — controls unreachable, console warning |
| Grips are **rebuilt** on every measure | delegated `pointerdown` | a listener bound per grip is discarded on each resize, and leaks |
| `setAttribute('textContent')` writes a **dead attribute** | `el()` | textContent is a DOM property; the element stays empty |
| A cell's tag follows its **section**, not its column | `insertColumn` | the header row parses as mixed `rowheader`/`cell`, and the theme styles `th` by tag so the new heading renders unbolded |
| Structural changes must **not** dismiss the selection | `refresh()` | the zone closes under the pointer and one operation becomes two |
| Reorder re-anchors the range from **element references** | `endDrag` | a positional range left alone silently re-points at whatever now sits in those slots |
| A refused clipboard write is **expected** | `copyBand` | the band copy already succeeded; a silent refusal looks like Ctrl+C did nothing |
| One gesture's teardown must not live on an element that gesture rebuilds | `pointerup` on `document` | `drag` never clears, and `if (drag) return` kills the feature permanently |

The last one is this session's, and it is the reason the rest of the table has a
column: each is a place where the code is right and *looks* wrong, and each cost
a round trip to find.

## 2026-09-30 — The failed attempt is archived

**User: "we can retire the failed attempt (copy the files to _Archive, delete and
remove it from the playground)"**

The 2026-09-22 entry parked the one-shot attempt at
`#page=experiments/dropped-table-editor` "for contrast", and it stayed there two
days. Retiring it is a small deletion with a disproportionate reason to be
recorded: **an abandoned implementation is not a reference.**

### Why "kept for contrast" stopped being true

The stated value of the page was to let future work pick ideas off it. But
reading a failed implementation to understand the real one is *strictly worse*
than reading this log, because the log says **why each decision went the other
way** and the code cannot. A reader who opens the old file sees a
working-looking component with no indication that its drag reorder crashes on
index math — the very thing the current boundary arithmetic exists to prevent.
The code does not record its own failure; only this log does.

Worse, the hazard was not the file but the **one nav click**. This is a
Playground, a document whose entire purpose is to be copied from. A second
table-editor implementation sitting in it, in the same nav as the real one, is an
invitation to build on the wrong thing — and the two are visually similar
precisely because the fresh one was partly a response to it.

### What was actually removed

Three live files (`Playground/js/dropped-table-editor.js` 37 KB,
`Playground/css/dropped-table-editor.css` 10 KB,
`Playground/pages/experiments/dropped-table-editor.html` 3.6 KB), the nav entry,
and the 96-line `registerPage` block that loaded them. All copied to
`_Archive/dropped-table-editor/` first, with a README stating plainly that it is
dead and must not be restored.

### The rename mattered more than the archive, and still does

Worth restating because it was a correctness fix rather than tidiness: NUI's dev
auto-loader resolves `NUI/lib/modules/{tag}.js` for any addon element in the DOM.
Had the old code stayed at that path, a future `<nui-table-editor>` would have
silently loaded **the wrong implementation** — no error, just wrong behaviour.
The files were never in the library tree, so today's risk was smaller, but the
failure mode is worth remembering: **a name collision in an auto-loading library
is not a name error, it is a silent substitution.**

### Rule

**Retire an abandoned implementation by moving it out of the tree, not by
deprecating it in place.** Keep the *reasoning* in a dated log, where it is
searchable and cannot be loaded; keep the *artifact* in `_Archive/`, where it is
recoverable and unreachable. What must never survive is a dead implementation
sitting one click from the live one.

The historical entries above were left as written, with forward-pointers added —
a log that gets rewritten when things change stops being a record of what was
decided, and becomes only a record of what is currently true.

## 2026-10-02 — The caret ring belongs to one cell, and only to one

**User: "If any cell select state it active (more then one cell), the focus rect
of the previously active cell should reset."** The screenshot showed a single
selected cell, so the reported state was reproduced first rather than assumed.

There were **two** rects, not one, and they were in different places:

| rect | source | where it landed |
|---|---|---|
| stale caret | `[data-active]`, written by `applyRange` onto `cellAt(minRow, minCol)` | the range's **anchor** — the cell clicked first |
| browser ring | `:focus-visible`, which a `contenteditable` cell matches whenever focused, mouse or keyboard | the cell clicked **last** |

So a three-cell shift-click marked both ends of the range and none of the cells
between. Measured on the first demo table, with real pointer input — the page has
four tables and an unscoped query measures across all of them:

| state | selected | `[data-active]` | rects painted |
|---|---|---|---|
| single click | 1 | 1 cell | 1 |
| Tab → next cell | 1 | 1 cell | 1 |
| shift-click, whole row | 4 | 1 cell (stale) | 2 |
| shift-click, whole column | 3 | 1 cell (stale) | 2 |
| Escape | 0 | none | 1 (`:focus-visible` alone) |

**A ring is a claim about exactly one cell, and a range of several has no such
cell.** The fill already names the members; a rect on one member of a filled block
asserts "the keyboard is here" about a cell the keyboard is not on — it is on the
far end, which is exactly where `:focus-visible` had already put a second rect.
Three ways of saying "selected" was already ruled one too many in this log; the
range outline went, and the caret ring now goes with it for multi-cell ranges.

One flag, one condition. `applyRange` sets `data-nte-multi` on the table when the
range spans more than one cell, and only a single-cell range is given
`[data-active]`. The flag sits on the **table** because no cell can know how large
the range it belongs to is — and CSS needs the same fact to suppress
`:focus-visible`. A per-cell attribute could not express it, and a class the JS
maintained separately from the range would be a second copy of the fact, which is
the shape of most defect in this file.

**Suppressing the browser's ring costs no accessibility affordance**, which is the
part worth stating rather than assuming: multi-cell selection is reachable only by
pointer — shift-click, drag gesture, grips — while the keyboard walk (Tab, arrows,
Enter) always produces a single-cell range and keeps its ring. After Escape clears
the selection the ring returns by itself, because DOM focus is still in that cell.
Verified in all five states above, and the single-cell ring survives both the mouse
and the Tab path.

### Two measurement traps, both re-entered on purpose

`getComputedStyle(cell).outlineWidth` is **not** a test for "is there a ring":
Chrome computes it to `medium` even when `outline-style` is `none`, so filtering
on width reported every cell in the table as ringed and the first fix appeared to
have done nothing. The test is `outlineStyle`.

This is the general shape the log keeps meeting — *which rule won* rather than
*what did I write* — and the corollary here is that a probe must be re-read before
its verdict is believed. Two of the intermediate readings in this fix were the rig,
not the component.













