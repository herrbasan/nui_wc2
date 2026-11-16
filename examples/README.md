# NUI examples — a pattern library

Six complete, self-contained NUI applications. They exist for two reasons:

1. **A test bed for the UX/UI review tool** (`stylereview.review`). Each example is a
   realistic surface with a realistic component mix, so a finding can be judged against
   something a person would actually ship — not a component gallery.
2. **A pattern library for LLMs.** Every example is a complete answer to "how would you
   build X with NUI?" — the markup, the wiring, and the reasons. Read the example, not the
   component docs, when the question is "how do these go together?".

Nothing here is a demo of one component. Every example uses a dozen or more.

## Running them

The examples are static pages. They need a server (ES modules do not load over `file://`):

```bash
python -m http.server 5500 --bind 0.0.0.0
# → http://127.0.0.1:5500/examples/fleet-ops/index.html
```

Replace the slug: `fleet-ops`, `media-library`, `support-triage`, `onboarding`,
`knowledge-base`, `legacy`.

## The shared contract

`shared/app.css` and `shared/nav.js` are shared by every example. They are the pattern
layer — the things an app writes once and every screen inherits.

| File | What it owns |
|---|---|
| `shared/app.css` | Example-owned wrapper classes only (`.ex-*`). **Theme variables only** — it never styles a `nui-*` element. |
| `shared/nav.js` | `bindSectionNav(nav, { indicator })` — sidebar anchors that scroll **and move focus**, plus the "you are here" label for the narrow layout. |
| `assets/` | Demo images and one generated WAV. |

`bindSectionNav` is the pattern to copy for any in-page navigation:

```js
import { bindSectionNav } from '../shared/nav.js';

const nav = document.getElementById('page-nav');
nav.loadData([{ label: 'Overview', href: '#overview', icon: 'analytics' }]);
bindSectionNav(nav, { indicator: document.querySelector('[data-current-route]') });
```

It exists because a plain anchor scrolls without moving focus: the hash changes, the
keyboard cursor stays on the link, and a screen-reader user is never told the page moved.
The helper sets `tabindex="-1"` on the target, scrolls it clear of the fixed header, and
moves focus with it. The `indicator` option drives the section name next to the app
title — on a phone the sidebar is off canvas, so that label is the only orientation the
user has.

## The examples

### `fleet-ops` — Meridian Fleet Operations

The reference example. An operations dashboard: shell, navigation, a virtualised list, a
chart, filters, and a notification log.

- **Components:** `nui-app` · `nui-app-header` · `nui-sidebar` + `nui-link-list` ·
  `nui-content`/`nui-main`/`nui-page` · `nui-list` · `nui-graph` · `nui-input-group` ·
  `nui-select` · `nui-tag-input` · `nui-popover` ·
  `nui-notification-log` · `nui-app-footer`
- **Patterns:** a filter row whose controls all resolve to one height; a list whose rows
  are a fixed pitch (the row is measured once, so rows must not differ in height); a
  group header with a sibling action button that jumps straight to a section, so a
  collapsed group is never a dead end.

### `media-library` — Aperture Media Library

Files: a folder tree, an upload list with per-file status, an asset grid, and a details
panel that reads the selection back.

- **Components:** `nui-file-tree` · `nui-file-list` · `nui-file-icon` · `nui-dropzone` ·
  `nui-lightbox` · `nui-media-player` · `nui-code-editor` · `nui-context-menu` ·
  `nui-select` · `nui-textarea`
- **Patterns:** a tree and a list over the same data; a details panel that is pure
  output; keyboard-operable asset buttons; working density and sort controls; a nav
  label that says exactly what the heading at the destination says.

### `support-triage` — Halcyon Support Triage

A queue. The list is the product; everything else serves it.

- **Components:** `nui-list` · `nui-dialog` · `nui-tabs` · `nui-rich-text` ·
  `nui-accordion` · `nui-details` · `nui-badge` · `nui-select`
- **Patterns:** tabs over three tables of the same data at different grains; a triage
  dialog whose actions are scoped to one ticket; a reply template the agent starts from.

### `onboarding` — Vantage Account Setup

A four-step wizard with a review step that reads the earlier steps back.

- **Components:** `nui-wizard` + `nui-wizard-step` · `nui-progress` · `nui-radio` ·
  `nui-checkbox` · `nui-select` · `nui-date-range` · `nui-slider` · `nui-tag-input` ·
  `nui-textarea` · `nui-overlay` · `nui-accordion`
- **Patterns:** a step's title as a heading in the content area *and* as the nav label;
  validation that is visible after the browser's bubble is gone (the field carries the
  error, the step dot carries the message); a blocking overlay for the one genuinely slow
  operation, with the outcome announced in a polite live region.

### `knowledge-base` — Lumen Knowledge Base

A document site: a menu bar, a Markdown handbook, a deck of the same handbook, a review
board, a sortable reading queue and a glossary.

- **Components:** `nui-menu` · `nui-markdown` · `nui-details` · `nui-notepad` ·
  `nui-sortable` · `nui-virtual-scroll` · `nui-code` · `nui-slides` · `nui-tooltip` ·
  `nui-banner` · `nui-badge`
- **Patterns:** an embedded Markdown document starts at `##` — the page owns the `h1`;
  a deck is a separate surface, so its slide titles are claims rather than repeats of the
  page's section names; a document rendered from a file keeps its frontmatter in a
  metadata card.

### `legacy` — NUI Legacy Patterns

The deprecated components, each beside its replacement, on a page of their own so nothing
copies them by accident.

- **Components:** `nui-icon-button` (→ `nui-button variant="icon"`),
  `nui-column-flow` (→ `nui-layout type="flow"`), `nui-loading` (→ `nui-progress`).

## The rules the examples follow

These are the house rules, applied rather than described:

1. **Never style a `nui-*` element.** Variation comes from attributes (`variant`,
   `size`, `fill`). Example CSS owns only the wrappers the app wrote itself.
2. **Theme variables only.** `var(--color-shade1)`, `var(--nui-space)`, and the rest.
   Never a raw hex value.
3. **One `h1` per page.** An embedded document starts at `h2`.
4. **A nav label and the heading it leads to say the same words.**
5. **Every control has an accessible name** — and not from its placeholder.
6. **The document `id` belongs to exactly one element.** A `label[for]` and a wrapper
   cannot share an id: the label then resolves to the wrapper and the real control loses
   its name.
7. **A state change is announced.** Re-sorts, async results and validation errors need a
   live region, not just a visual change.
8. **A control that cannot act is absent**, and a control with no trigger is dead state.

## What the review tool found here

Every one of these was a real defect, found by the tool and fixed in the library or the
example — the catalogue is useful when testing the tool itself. The full report, with
root causes and the measurements that dismissed fourteen false positives, is in
[`docs/ux-review-findings-2026-11-16.md`](../docs/ux-review-findings-2026-11-16.md).

| Where | Defect | Fix |
|---|---|---|
| `nui-wizard` | the step strip overflowed the header on a phone and was silently clipped | the nav scrolls inside the header (`min-width: 0` + `box-sizing: border-box` + `max-width: 100%`) |
| `nui-wizard` | the active step title measured 4.03:1, the step indicator 3.73:1 | `--text-color` and `--text-color-dim`; the accent stays on the step's circle |
| `nui-wizard` | a blocked "Next" changed nothing — the bubble is transient and invisible to AT | the step dot carries the message, the field carries the error, focus moves to the field |
| `nui-wizard` | the nav buttons were named "1", "2", "3" | `aria-label="Step 1 of 4 — Profile"` and `aria-current="step"` |
| `nui-select` | a change from outside the component left the visible label on the old value | the label follows the value |
| `nui-select` | the native `<select>` — the form control — had no name | it inherits the resolved label |
| `nui-tag-input` | the field you type into had no name | it inherits the group's label |
| `nui-notepad` | the step rows overflowed their list by 8px and the text was cut mid-word | the list reserves the bleed itself, so the row exactly fills it |
| `nui-notepad` | three "Mark step done" buttons were indistinguishable | each name carries its step's text |
| `nui-notepad` | the sort direction button said only "Toggle sort direction" | the name states the direction |
| `nui-notepad` | a re-sort changed nothing observable | the result count is a polite live region |
| `nui-slides` | the toolbar overflowed a narrow deck and squashed its buttons | the toolbar wraps; the buttons keep their size |
| `nui-slides` | the previous button rotated a `chevron_right` inline | a real `chevron_left` icon |
| `nui-slides` | a disabled narration button still read "Play narration" | the disabled state is in the name |
| `nui-skip-links` | the link needed explicit focus and scrolling without destroying the router's hash | focus and scroll move; the current route remains in the URL |
| `nui-file-list` | every row truncated its filename at a different place | the status column has a fixed width; the full name is in a `title` |
| `nui-radio`/`nui-checkbox` | no `validate()` — only the text controls had one | the checkables expose it too |

## Known false positives

Not defects — the tool's measurement, not the page's rendering:

- A **radio's 24px circle against a 32px label box**: the row is `inline-flex` with
  `align-items: center`, so the indicator is centred.
- **A badge "overflowing" its box**: `scrollWidth > clientWidth` is what an ellipsised
  element looks like.
- **The closed sidebar's links "not clickable" on a phone**: the sidebar is off canvas
  until it is opened; focus into it opens it, by design.
- **`nui-column-flow`'s inline `column-count`**: the deprecated component sets its own
  style. The page exists to show that component.
- **The deck's 31.68px heading against the page's 32px**: the deck has its own type
  scale (1.2rem × 1.65) — two surfaces, two scales.
