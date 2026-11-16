# UX/UI review findings — 2026-11-16

What the new `stylereview.review` tool found while six example applications were built
to exercise it. Every finding was **verified in a browser before anything was changed**,
and roughly a third of them turned out to be measurement artifacts rather than defects —
those are recorded too, because a report that only lists what was fixed teaches the tool
nothing.

**Scope of the exercise.** Six complete NUI applications under `examples/` (fleet-ops,
media-library, support-triage, onboarding, knowledge-base, legacy), each using a dozen or
more components. The examples exist for two purposes: they are the test bed the review
tool is developed against, and they are a pattern library for LLMs.

**Method.** Build → review (Tier-0 probes + one LLM critique) → re-measure the finding
in the browser → fix the library or the example → re-review. A finding that could not be
reproduced in a browser was not treated as a defect.

**Outcome.** 25 library fixes, 19 example fixes, 1 tool defect filed,
14 findings dismissed with the measurement that dismisses them. A later compatibility
review narrowed several fixes and reclassified the remaining inline-style claim as a
style-tool false positive rather than a library defect.

---

## Part 1 — The method, and two environment facts that shape it

### 1.1 The tool's reports are hypotheses

A Tier-0 metric is a measurement, not a verdict. `scrollWidth > clientWidth` on an
element with `text-overflow: ellipsis` is what a truncated label looks like. A 24px icon
hit-target beside a 29px line box is what a centred icon looks like. Roughly a third of
the first reports were of this shape, and acting on them would have made the library
worse.

Two checks earned their keep:

- **Measure the geometry, not the label.** "Icons sit off the text's vertical centre" was
  wrong: the measured centres were identical.
- **Check the DOM for the state the finding claims is missing.** "The skip link is a
  silent click" was wrong: focus lands on `nui-main#main-content` with a visible outline.
  The tool's trace has no focus probe, so it saw no change.

### 1.2 The integrated browser does not composite frames

In the VS Code integrated browser, `page.screenshot()` returns a **stale frame**. Proof:
an element with `position: fixed; z-index: 99999; background: yellow` added after load
never appeared in a screenshot, while the DOM and the accessibility tree both showed it.

Consequence: **a screenshot taken in that window is not evidence of anything painted
after the initial load.** The verification in this exercise used `getBoundingClientRect`,
`getComputedStyle`, `elementFromPoint` and the accessibility tree instead. The review tool
itself renders on Badkid, where frames are real, so its screenshots are sound.

### 1.3 The window has no focus

`document.hasFocus()` is false in that window. Chrome still updates
`document.activeElement`, but it fires **no focus events**. Every focus-driven behaviour
therefore looks dead when measured there — including `nui-sidebar`'s auto-open on focus,
which is correct. The tool's "the nav links are not clickable on mobile" finding is the
same artifact: its flow never pressed the toggle that opens the sidebar.

---

## Part 2 — Library defects (23)

### 2.1 `nui-wizard`

| # | Symptom | Root cause | Fix |
|---|---|---|---|
| 1 | The step strip was clipped inside the header on a phone (`scrollW 416 / clientW 326`), so the last steps were unreachable | The nav's grid is sized `fit-content` **inline** by the addon, so `max-width: 100%` resolved against the *content* box — the theme sets no global `box-sizing`, and the nav's border box became 100% **plus** its own padding. A grid's automatic minimum size is its min-content width (7 × 3rem tracks), so it also refused to shrink and could not become a scroll container | `min-width: 0; max-width: 100%; box-sizing: border-box; overflow-x: auto; overflow-y: hidden` on `.nui-wizard-nav`. The circles stay aligned with their titles because both rows share the grid's columns |
| 2 | The active step's title measured **4.03:1** — the most important label in the nav, failing AA for small text | `--color-highlight` (rgb 76,132,229) on `--color-shade2` (rgb 240,240,240) | `--text-color` (measured **11.81:1**) with `font-weight: 600`. The accent stays on the step's *number circle*, which is a graphic, not text |
| 3 | "1 of 4" measured **3.73:1** — the only orientation cue for position in the flow | `--color-shade5` (rgb 128,128,128) | `--text-color-dim` (measured **7.11:1**) |
| 4 | Four type sizes inside a 1.6px band (12.8 / 13.6 / 14 / 14.4) | `var(--nui-font-size-sm, 0.8rem)`, `0.875rem`, `0.85em`, `0.85rem` — none of them the theme's tokens | `--font-size-xsmall` for the nav title and the "!" glyph, `--font-size-small` for the indicator and the step number |
| 5 | **A blocked "Next" changed nothing.** The bubble is transient and is not text to assistive technology; the step dot kept no state; focus stayed put | `next()` called `form.reportValidity()` directly and returned | `next()` now calls `validateStep()`, which sets the step's `status="invalid"` and its message (the dot turns red and carries the message), calls the offending control's `validate()` so the **field** paints the error and describes itself, and focuses that control |
| 6 | A step that had failed and then passed kept the old error as its dot's tooltip | `setStatus('valid')` left `data-status-message` in place | `setStatus` clears a stale message when the status changes and no new message is given |
| 7 | The nav buttons were announced as "1", "2", "3", "4" — no title, no position | The button's text is the number | `aria-label="Step 1 of 4 — Profile"`, and `aria-current="step"` on the active one (removed from the others) |
| 8 | The active step was an unlabelled slab of form fields | The step had no name | The step is `role="group"` with `aria-labelledby` pointing at its nav title's id. The tree now reads `group "Profile"` |

### 2.2 `nui-select`

| # | Symptom | Root cause | Fix |
|---|---|---|---|
| 9 | The visible label did not follow a change that arrived **from outside** the component — a form library, a native form reset, or an addon that owns the inner `<select>` and writes `select.value` then dispatches `change` | The component's own paths (`pick`, `setValue`, `select`, `clear`) synced explicitly; nothing listened to the native `change` or containing form's `reset` event | A `change` listener calls `syncState(false)`; a form `reset` listener does the same in a microtask, after the browser restores the default options. Neither path raises a duplicate `nui-change` |
| 10 | The **native** `<select>` — the form control, the thing that submits and validates — had no accessible name. Only the visible button was named | The resolved label was applied to the control, not to the select | The label is applied to the inner select only when it has no `aria-label`, `aria-labelledby`, or associated `<label>` of its own |

### 2.3 `nui-tag-input`

| # | Symptom | Root cause | Fix |
|---|---|---|---|
| 11 | The field a person types into had **no name** — a placeholder, which vanishes with the first character and is not what a screen reader reads | The field was created with a placeholder only | `aria-label` from the `label` attribute → the enclosing `nui-input-group`'s label → the placeholder |

### 2.4 `nui-notepad`

| # | Symptom | Root cause | Fix |
|---|---|---|---|
| 12 | Step rows overflowed their list by **8px** and the step text was cut mid-word ("…Ask whether invalidation belongs h") | `.np-StepRow` carries a deliberate negative side margin (the hover background bleeds into the card padding) while `.np-StepsList` clipped it — so the row was wider than the box and the text was clipped at the card edge | **First attempt (wrong):** `overflow-x: clip` on the list. It killed the bleed, left the text touching the card edge, and the overflow was still measurable. **Final:** the list reserves the bleed itself — `margin-inline: calc(var(--nui-space-half) * -1); padding-inline: var(--nui-space-half)` — so the row's border box is exactly the list's border box (measured `sw == cw`), and the bleed lands inside the card's padding where it belongs |
| 13 | Three buttons in one card were all named "Mark step done" | The glyph is a decoration, so the name was generic | The name carries the step's text: `Mark step done: Collect the last three incidents` (truncated at 60 characters) |
| 14 | The sort-direction button said only "Toggle sort direction" — no state | A generic action label | `Sort direction: ascending` / `Sort direction: descending` |
| 15 | A re-sort or a filter changed **nothing observable**: the cards reordered, the header controls and their labels stayed exactly as they were | No live region and no state on the controls | The result count is `aria-live="polite"` — the count is the only thing that changes when a sort lands |
| 16 | The notepad's own search field was named by its placeholder | Same shape as #11 | `aria-label="Search notes"` |

### 2.5 `nui-slides`

| # | Symptom | Root cause | Fix |
|---|---|---|---|
| 17 | The toolbar overflowed a narrow deck (379px of content in a 318px box) and the flex row squashed the icons | `nowrap` with no wrap, no `max-width`, and the buttons could shrink below their size | The toolbar wraps (`flex-wrap: wrap`, `justify-content: center`, `max-width: 100%`); the buttons are `flex: none` — a control never shrinks below its size, it wraps to the next line; the pill radius drops below 30rem, because a wrapped pill reads as a blob. Verified at 390px: toolbar 318 × 89, two rows, no overflow |
| 18 | The previous button rotated a `chevron_right` with a **static inline style on a `nui-icon`** — the library breaking its own rule against static inline styling | `prevBtn.querySelector('nui-icon').style.transform = 'rotate(180deg)'` | The real `chevron_left` icon: source file `assets/Material_Icons/chevron_left.svg`, generator run (**128 → 129 icons**), `scripts/sprite-drift.mjs` reports **zero drift in both directions** |
| 19 | The deck's narration button and the page's narration button were both named "Play narration"; the deck's was disabled with no reason in its name | One name for two scopes, and the disabled state lived only in `title` | `Play this slide's narration` / `Stop this slide's narration`, and `No narration on this slide` when the slide carries no script. The label is written in both branches, so a slide that *has* narration gets its name back |

### 2.6 `nui-skip-links`

| # | Symptom | Root cause | Fix |
|---|---|---|---|
| 20 | The link prevented the anchor's native action and moved only focus; the viewport and route needed explicit handling | `preventDefault()` + `targetEl.focus()` only | `jumpTo()` focuses with `preventScroll: true` and calls `scrollIntoView({ block: 'start' })`. It deliberately does **not** rewrite the hash: NUI's router stores the route there, and replacing `#page=...` with `#main-content` loses the current route on reload or URL sharing. Verified: hash stays `#page=components/button`, `activeElement` → `NUI-MAIN#main-content` |

### 2.7 `nui-file-list`

| # | Symptom | Root cause | Fix |
|---|---|---|---|
| 21 | Every row could truncate its filename at a **different point**, and long names had no hover recovery | The status column took its width from its badge, which varies ("uploading" vs "failed"), so the name column's width could vary per row | The status column has a fixed width (`flex: 0 0 5.5rem`), and the name and detail carry a `title` with the full string for hover recovery. The complete text remains in the DOM; `title` is supplementary, not a universal keyboard/touch solution |

### 2.8 `nui-radio` / `nui-checkbox`

| # | Symptom | Root cause | Fix |
|---|---|---|---|
| 22 | No `validate()` — only the text controls had one, so a component that owns a field could only ask a radio group by reaching into its input | `setupCheckableBehavior` never exposed it | `validate()` on the checkables: toggles `is-invalid`, sets/removes `aria-invalid`, emits `nui-validate` with `{ valid, message }` |

### 2.9 Type scale (three modules)

| # | Symptom | Root cause | Fix |
|---|---|---|---|
| 23 | `nui-menu` 14px, `nui-dropdown` 14px, `nui-code-editor` 14px against the theme's `--font-size-small` (14.4px) — three near-identical sizes on one page | Hardcoded rem values instead of the token | `var(--font-size-small)` in all three |

### 2.10 The icon sprite

Adding `chevron_left` followed the house procedure (source file → generator → drift check).
The generator reported **129 icons**; `scripts/sprite-drift.mjs` reported **0 symbols
without a source and 0 sources without a symbol**. The diff shows one symbol added and
nothing removed.

---

## Part 3 — Example fixes and consistency improvements (8)

These were bugs in the examples, which is the point: the examples are patterns, and a
pattern with a bug teaches the bug.

| # | Where | Defect | Fix |
|---|---|---|---|
| 24 | `examples/onboarding/index.html` | **`id="setup-budget"` on both the `nui-slider` and its inner `<input type="range">`.** A duplicate id means the group's `<label for="setup-budget">` resolved to the wrapper — so the slider was announced as **"500"**, its own value | The input is `setup-budget-input`; the label points at it |
| 25 | `examples/knowledge-base/handbook.md` | The embedded document and deck competed with the page's heading hierarchy. Multiple `<h1>` elements are not inherently an accessibility failure, but an embedded document should subordinate its outline to the host page | The embedded document starts at `##` (the page owns the `h1`); the deck's slide titles are distinct **claims** at `###`, and the handbook's Glossary section was removed because the page has a real, searchable one |
| 26 | `examples/knowledge-base/index.html` | The banner carried `priority="alert"` for advisory content — an assertive announcement for a note | The documented default (polite) |
| 27 | `examples/onboarding/index.html` | The "Verifying your domain…" overlay had **no trigger** — dead state that could never appear | The company field opens it; the outcome is announced in a polite live region (`role="status"`); cancelling clears the pending check so the timer cannot close it twice |
| 28 | `examples/media-library/index.html` | The nav said "Uploads" and "Drop zone" while the headings said "Recent uploads" and "Drop new assets" — the user clicked one word and arrived at another | The labels say exactly what the destination heading says |
| 29 | `examples/media-library/index.html` | The notes textarea had no name (placeholder only) | `aria-label` |
| 30 | `examples/shared/nav.js` | The route-label logic was copy-pasted into three example apps | Folded into `bindSectionNav(nav, { indicator })` — the shared helper now owns it |
| 31 | `examples/knowledge-base/index.html` | The example had **no** "you are here" label, while the other three did | Added, and the pattern consolidated into the shared helper |

---

## Part 4 — Findings dismissed (14)

Each of these was reported by the tool and dismissed after measurement. They are the most
useful part of this report for the tool's own development.

| Reported | Why it is not a defect |
|---|---|
| A badge "overflows by 8px" | The overhang is intended; the overflow is visible, not clipped |
| The search icon "sits off-centre" | The measured centres were identical (31.67px) |
| The skip link "is a silent click" | The trace has no focus probe. Focus lands on `nui-main#main-content` with a visible 2px outline, and the current route remains intact (#20) |
| Tabs are `display: none` | Set by `nui-tabs` itself; switching works |
| The ticket dialog "never opens" | The *host* has no `open` attribute; the inner `<dialog>` does. The tool measured the host |
| `nui-form-row` is "not registered" | It is registered (`NUI/nui.js`) and it is in `documentation/components.json`. The tool's catalogue lags — filed as #32 |
| The radio's 24px circle against a 32px label | `nui-radio` is `inline-flex` with `align-items: center`; the indicator is centred. The boxes differ in height, the glyphs do not differ in position |
| Icons "do not line up" with their labels (19px vs 29px) | The link-list's documented row structure: `--icon-size` inside a text line box |
| The header "mixes a 32px control with a 16px label" | The slot wrapper is already `display: flex; align-items: center` — the library's own rule. The tool's suggested fix was already in place |
| `.ex-asset__name` "overflows by 4px" | That is what an ellipsised element looks like: `scrollWidth` reports the full text |
| The search field's inner input is 30px against a 24px icon | The icon is a 24px **hit-target button** centred in a 32px control; the inner input's 30.67px is the content box inside the border |
| 31.68px and 32px coexist | Two surfaces, two type scales: the deck's is 1.2rem × 1.65em, the page's `h1` is 2rem. The two never share a surface |
| A 13.3333px type size | The browser's default `<option>` size inside the hidden native select — not rendered |
| The deck's headings "promote to page-level H2" | **Fixed** (#25): the deck's titles are `h3` now, and the slide surface still sizes a first `h3` as a title (`> h3:first-child { font-size: 1.65em }`) |

---

## Part 5 — The tool's own defects (1 filed)

| # | Finding | Where it went |
|---|---|---|
| 32 | The NUI catalogue the critique pass is given is a **hardcoded string** (`CRITIQUE_BRIEF`) and has drifted from the library. `nui-form-row` was reported as an unknown tag on a page that uses it correctly | **herrbasan/mcp_server#80** — load the catalogue from the reviewed project's `documentation/components.json`, the registry the repo already generates, or add a staleness check. The same hardcoded list also omits `nui-input-group`, `nui-file-icon`, `nui-app-footer`, `nui-textarea`, `nui-tag-input` and every deprecated component |

Also filed, against this repo:

- **herrbasan/nui_wc2#91** — **reclassified as a style-tool false positive.** The report
  originally treated `nui-column-flow`'s dynamic `columnCount`/`columnWidth` writes as a
  violation of a blanket no-inline-style rule. The repository rule explicitly permits
  JavaScript-driven dynamic styles, and this is not the only component that uses them.
  No library change is required; the issue can be closed as won't-fix. Static inline
  styling remains a separate concern, as in finding 18.

---

## Part 6 — The first batch (earlier in the exercise)

Recorded here for completeness; these were fixed before the second review round.

**Library.** `nui-wizard` created a nested `<main>` (a duplicate main landmark) → a
`<div>` plus `aria-label="Wizard steps"` on the nav. `nui-input-group` bound the group
label to the first radio/checkbox input (two labels on one input) → checkable groups get
`role="group"`/`role="radiogroup"` with `aria-labelledby`, and `for` is used only for a
single text control; checkable groups now require interaction before `has-error`, while
text controls keep their existing non-empty invalid-value behavior. Author-supplied wizard
step roles and labels are preserved, and an explicitly labelled file-tree `<nav>` keeps
its own name rather than being overwritten by the host label. The global
accessibility pass labelled `<nav role="tablist">`, `<nav role="menubar">` and
`<nav role="tree">` as "Navigation" → navs whose role is overridden are skipped and the
labelling is deferred to a microtask so a component's own role wins. The banner factory's
close button had no accessible name (`✕` only) → `aria-label="Dismiss notification"`.
The markdown renderer emitted `data-lang="markdown"` fences while markdown was not a
known grammar, so the library warned about its own output → a `markdown` grammar (with an
`md` alias) and a `.hl-codeblock` class. The notepad's context badge measured 3.86:1 and
`.hl-comment` 2.42:1 → both raised to clear 4.5:1. The link-list overflowed by 16px
(content-box padding on a 100%-wide element) → `box-sizing`. The search magnifier was a
dead `<button>` in the tab order → a non-interactive, pointer-transparent span. An 11px
graph label and a 12px badge → token sizes. `nui-form-row` was unregistered → registered.
`LLM-CHEATSHEET.md` was missing `nui-form-row`, `nui-input-group`, `nui-file-icon` and
`nui-app-footer` — very likely why the tool called `nui-form-row` an unknown tag.

**Examples.** The nav links went nowhere → section ids plus a shared `bindSectionNav`
that scrolls **and moves focus**. List rows wrapped on mobile → one non-wrapping line
with an ellipsis, because `nui-list` measures the first row and spaces every row by that
height. Thirteen icon names did not exist in the sprite → all verified and replaced. The
banner never became visible → a `banner-show` trigger. The deck duplicated the page's
`h1` outline → split into `deck.md`. Legacy tags shipped inside a real example → moved
to `examples/legacy/`, on a page of their own.

---

## Part 7 — Commit-readiness review

A second pass reviewed the examples as patterns to copy, rather than only as surfaces for
geometry probes. It found the interaction and contract defects that a visual sweep cannot
see.

| # | Where | Defect | Fix |
|---|---|---|---|
| 33 | fleet/support/media dialogs and filters | Labels pointed at NUI wrapper ids, leaving the native select or tag field without the visible label as its accessible name | Use `nui-input-group`; the select/tag component resolves the group's label. Redundant per-control `size` attributes were removed from compact rows |
| 34 | `examples/fleet-ops/app.js` | The custom group action scrolled directly, bypassing active-nav state, focus movement and the route indicator | Activate the real nav anchor and let `bindSectionNav` own the whole interaction |
| 35 | `examples/fleet-ops` | The date-range filter had no effect, and the tag input was unwired | Remove the meaningless date filter; tag filters now participate in `applyFilters()` |
| 36 | `examples/knowledge-base/index.html` | The global search box had no behavior | Removed; the working glossary search remains |
| 37 | `examples/support-triage/app.js` | SLA parsing reduced `3h 10m` to `3`, placing long-lived tickets in the under-one-hour view | Parse hours and minutes into a real minute count |
| 38 | `examples/support-triage/app.js` | After sorting, the selected row index was applied to the unsorted array and could open the wrong ticket | Open `getSelection(true)[0].data`, the selected record itself |
| 39 | `examples/support-triage/index.html` | "Reply to the customer" was a dead checkbox | Removed |
| 40 | `examples/legacy/` | The banner had no real trigger, and the custom listener used an exact selector that could never match a parameterized action | A declarative `banner-show@#legacy-warning` trigger uses the built-in action; the redundant listener is gone |
| 41 | `examples/media-library/` | Asset cards were clickable `<div>`s with no keyboard activation | Native `<button type="button">` cards |
| 42 | `examples/media-library/` | Density and sort controls had no effect | Density changes the grid; sort re-renders by name, size or original date order |
| 43 | `Playground/pages/components/form-row.html` | The compact search example relied on its placeholder for a name | Explicit `aria-label`, in both the live example and its source |
| 44 | `nui-select` | The internal search field of a searchable select was named only by `placeholder="Search..."` | `aria-label="Search options"`; covered by the select regression suite |
| 45 | `nui-select` mobile sheet | Rapid close/reopen cycles left multiple close timers; the first cleared `activeSelect`, and the next dereferenced `null` | Close state is released immediately, stale timers/frames are cancelled, and the backdrop has one owner. The test harness's `searchable`/`mobile-sheet` attributes now go on the NUI host, so these paths are genuinely exercised |

## Part 8 — Verification record

| Check | Result |
|---|---|
| `node test/markdown.test.mjs` | **26/26 pass** |
| `node test/components-registry.test.mjs` | **all pass** (46 core components, each documented once) |
| `test/md-blocks-render.html` | **21/21 pass** |
| `test/nui-select.test.html` | **25/25 pass** |
| `test/nui-lightbox.test.html` | **14/14 pass** |
| `test/nui-link-list.test.html` | **12/12 pass** |
| `test/nui-syntax-highlight.test.html` | **22/22 pass** |
| `test/nui-list-search.test.html` | **15/15 pass** |
| `test/auto-load.test.html` | **6/6 pass** |
| `test/util-surface.test.html` | **12/12 pass** |
| `test/nui-app-ready.test.html` | 5/6 — the one failure is the test's own verdict: *"the page is hidden, so the hidden-tab path ran instead — inconclusive"*. An environment artifact, not a regression |
| `test/router.test.html` | hangs — **pre-existing**, verified by stashing the changes and re-running on the clean baseline |
| Playground sweep (66 pages, every nav link) | **0 console errors, 0 page errors** |
| The six examples, 1440×900 and 390×844 | **0 console errors, 0 console warnings**, no horizontal overflow, no form control without an accessible name, no duplicate `id` |
| `scripts/sprite-drift.mjs` after the icon addition | 0 symbols without a source, 0 sources without a symbol |
| Compatibility follow-up | Skip link preserves the hash route; select reset/native naming checks pass; wizard and file-tree author labels survive; text validation timing is unchanged; checkable errors wait for interaction |
| Commit-readiness interaction review | Sorted ticket selection opens the selected record; SLA grouping is correct; fleet tag filtering and group navigation work; asset buttons work by keyboard; density/sort controls act; the legacy banner opens through its built-in action |
| Six examples, follow-up at 390×844 and 1440×900 | **0 console errors, 0 page errors**, no horizontal overflow, no unnamed form controls, no duplicate `id` |

### Open items

- `test/router.test.html` still hangs on the clean baseline — unrelated to this work.
- The changes are **uncommitted**.
- The local static server used for the reviews is still running (`python -m http.server
  5500 --bind 0.0.0.0`, PID 26048).
</content>