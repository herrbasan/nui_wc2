# NUI Migration Guide

This document tracks breaking changes and provides migration instructions between versions.

---

## 2026-09-12: `nui-select` dropdown moved to the top layer

The dropdown was `position: absolute` inside the select — so any ancestor with `overflow: hidden` sliced it. That bug returned repeatedly because it is structural: every app shell wraps content in a clipping container, and any card or dialog with a `border-radius` needs `overflow: hidden` too. Raising `z-index` never fixed it (z-index orders painting; it does not escape a clip), and `position: fixed` is not a fix either — it escapes only while no ancestor establishes a containing block, and any `transform`/`filter`/`contain` does.

### What's Changed

- The popup is now a **top-layer popover** (`popover="manual"`, `position: fixed`) anchored to the control's viewport rect. It cannot be clipped by an ancestor's overflow nor displaced by an ancestor's transform.
- Placement is recomputed on open, on **scroll in any ancestor** and on resize, and `max-height` is clamped to the available room (a tall list scrolls rather than leaving the viewport).
- `z-index` no longer applies to the popup; `nui-select.is-open { z-index: 1001 }` was removed.
- Visibility is gated by `:popover-open`; the `hidden` attribute is no longer used on `.nui-select-popup`.
- `popup-width` / `popup-left` / `popup-right` / `popup-max-height` and `setPopup()` keep their select-relative meaning; they are applied at placement time now.
- **New requirement:** the Popover API (Chrome/Edge 114+, Safari 17+, Firefox 125+). On an engine without it the component throws at setup — a loud failure rather than a silently clipped dropdown.

### Workarounds you can now delete

- Forcing `overflow: visible` on dialogs, tab panels, cards or `<main>` so a dropdown could escape (`nui-dialog[mode="page"]` was the documented case).
- Raising `z-index` on a wrapper or sibling to lift a dropdown above a neighbour.
- Re-parenting a popup in the DOM yourself, or shipping your own floating layer.

### Still need attention

- CSS written against `.nui-select-popup[hidden]`, or `display`/`overflow` rules on `.nui-select-popup`, must be removed: an author `display: none` defeats the popover's own visibility gating and the dropdown will never appear.
- A vendored NUI copy keeps its old behaviour until refreshed.

### Why

The dropdown must belong to no ancestor's box. The top layer is the platform's own answer, needs no dependency, and is the same mechanism `<dialog>` uses — the previous approach could only ever be patched case by case, which is why it kept coming back.

---

## 2026-09-12: `nui-select` — none-state and validation semantics

The select now mirrors native `<select>` instead of inventing states. Two behaviour changes can affect existing code; the rest are fail-loud hardenings that only fire on input that was already wrong.

### What's Changed

**Validation timing (the breaking one).** `is-invalid` is no longer raised by a state sync. It used to be toggled from `syncState()`, which runs during the initial build — so a `required` select was painted as an error the instant it was upgraded, before the user could have interacted with it. It is now raised by:

- **blur** — the user engaged the control and left it (native `:user-invalid` semantics). Focus moving into the dropdown is not departure.
- **form submit** — native constraint validation fires `invalid` on the inner `<select>`.
- **`validate()`** — explicit, and now dispatches `nui-validate` with `{ valid, message }` (the event the component's design plan always specified; `nui-input` already did this).

A sync that leaves the control valid still clears the class, so no stale error state can linger. A select with no `required` never gains the class.

**None-state.** A single-value select is never left unselected. `clear()` used to set `selectedIndex = -1`, producing a state the user could neither reach nor leave (and which a browser reset would silently undo). It now selects the enabled blank none-option, else the disabled prompt, else the first selectable option, and warns when it has to fall back. `setValue('')` / `setValue(null)` behave the same way.

**Fail-loud hardenings.** `setValue()` throws `RangeError` for an unknown or disabled value (it used to deselect everything, after which the browser's reset algorithm re-selected the *first* option — a typo silently persisted the wrong value). `setItems()` and `addItem()` throw `TypeError` on an item without a `value` (they used to create options whose value was the literal string `"undefined"` and whose label was empty — no error, the select just looked unloaded). `loadOptions()` feeds its result straight to `setItems()`, so map your API shape to `{ value, label }` inside the async function.

**Additions.** `hasValue()` — `getValue()` mirrors native `select.value` and returns `''` for both the disabled prompt and an enabled blank none-choice; `hasValue()` separates them. `hideLoading()` no longer overwrites the displayed value with prompt text. In debug mode a `console.warn` reports a disabled blank option that is not `required` (a one-way prompt on an optional field).

### Workarounds you can now delete

- Suppressing the error class after render (`classList.remove('is-invalid')`, a `setTimeout` that strips it, or a CSS override killing the red underline).
- Avoiding `required` and hand-rolling validation because `required` looked broken on load. Use `required` + `validate()` / native submit.
- Working around the unreachable none-state with a dummy option or a blank-value sentinel in the data.

### Still need attention

- Anything that read `nui-select.is-invalid` **before** any interaction (e.g. `querySelectorAll('nui-select.is-invalid')` gating a submit button at page load) now finds nothing. Ask the component directly: `validate()`, `hasValue()`, or `getValue()`.
- A select that starts at a disabled prompt but is **not** a mandatory field is a modelling error the component will now warn about. Either add `required`, or give the none-state a real option — `<option value="">— None —</option>` — which the user can re-select. See the None-State Model in `documentation/components/select.md`.
- `setValue()` callers that may pass a value not present in the list need a guard or a `try`/`catch`; they previously failed silently.

### Why

Native `<select>` has no intrinsic "nothing selected" state: the browser selects the first non-disabled option, and `selectedIndex` is `-1` only when nothing *can* be selected. Expressing "nothing chosen" as an option is what makes it reachable again. Validation timing follows the archived `docs/_Archive/nui-select-plan.md` ("on blur or form submit… dispatch `nui-validate`") and matches the policy `nui-input` has shipped all along — errors surface from user interaction, never from a render.

---

## 2026-04-10: Router API Rename

### What's Changed
- `nui.enableContentLoading()` → `nui.setupRouter()`
- Old name still works as deprecated alias (console warning)

### Migration

**Before:**
```javascript
nui.enableContentLoading({
    container: 'nui-main',
    navigation: 'nui-sidebar',
    basePath: 'pages'
});
```

**After:**
```javascript
nui.setupRouter({
    container: 'nui-main',
    navigation: 'nui-sidebar',
    basePath: 'pages'
});
```

### Why
The new name better describes what the function does: it sets up a complete SPA router with hash-based navigation, not just "content loading."

---

## 2026-04-08: Core Component Moves

### What's Changed
- `nui-markdown` moved from addon to core
- `nui-code` moved from addon to core

### Migration

**Before:**
```javascript
import '../NUI/lib/modules/nui-markdown.js';
import '../NUI/lib/modules/nui-code.js';
```

**After:**
Remove the imports entirely. These components are now included in `NUI/nui.js`.

---

## 2026-04-08: Sidebar API Refactor

### What's Changed
- CSS classes: `sidenav-*` → `sidebar-*`
- Method: `toggleSideNav()` → `toggleSidebar()` (backward compat maintained)
- Attribute: `favored` → `behavior="primary|secondary|manual"`

### Migration

**HTML:**
```html
<!-- Before -->
<nui-sidebar favored></nui-sidebar>

<!-- After -->
<nui-sidebar behavior="primary"></nui-sidebar>
```

**JavaScript:**
```javascript
// Before
app.toggleSideNav();

// After
app.toggleSidebar();        // Toggles left (default)
app.toggleSidebar('right'); // Toggles right
```

### Why
The new API provides proper hierarchy for multiple sidebars (primary opens first, secondary waits for more space) and clearer naming.

---

## General Migration Tips

1. **Check the console** — Deprecated APIs log warnings with migration hints
2. **Test navigation** — After router/sidebar changes, verify all navigation works
3. **Check responsive behavior** — Sidebar changes may affect layout at different breakpoints
