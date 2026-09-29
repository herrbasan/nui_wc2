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

