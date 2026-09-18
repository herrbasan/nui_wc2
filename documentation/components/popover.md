# nui-popover

## What it is

A **non-modal dialog anchored to a trigger** — a small panel that hangs off the control it belongs to and lets you keep working with the page around it.

Semantically it is a dialog, and it says so: the element carries `role="dialog"` by default. Mechanically it is a popover, and that is where the name comes from — the element's `popover="auto"` attribute is what puts it in the top layer and supplies **light dismiss, Escape, and focus return**. The component contains no dismissal logic of its own.

## Choosing between the three overlay components

Read this table first. Picking the wrong one is the most common mistake, and two of the three wrong choices fail *silently*.

| You want | Use | Why not the others |
|---|---|---|
| Help text on hover/focus | `nui-tooltip` | Non-interactive by contract; it must not contain focusable content |
| A small panel of controls anchored to a button | `nui-popover` | — |
| A blocking dialog in the middle of the screen | `nui-dialog` | Modal: it makes the page inert and has no anchoring |

- `nui-tooltip` is **hover/focus-driven and non-interactive**. Putting a form in it violates the ARIA tooltip pattern and the component's own doc rules it out.
- `nui-dialog` is **modal and screen-placed** (`placement="center|top|bottom"`). It cannot anchor to a trigger, and the page behind it is inert while it is open.
- `nui-popover` is the anchored, interactive, non-blocking one.

## Usage

The trigger is the element **immediately before** the popover, or whatever `for` points at.

```html
<nui-button variant="icon">
	<button type="button" aria-label="Section options"><nui-icon name="settings"></nui-icon></button>
</nui-button>
<nui-popover aria-label="Section options">
	<label>Placement</label>
	<nui-select id="placement-select"><select></select></nui-select>
</nui-popover>
```

```html
<!-- Or target it explicitly -->
<button id="open-settings" type="button">Options</button>
<nui-popover for="open-settings" aria-label="Settings">
	<p>Panel content</p>
</nui-popover>
```

### The trigger must contain a real `<button>`

The component wires the trigger as the platform's **own invoker** (`popovertarget`), not with a click listener. That attribute is honoured only on native control elements, so `<nui-button>` works **because it wraps a `<button>`** — and the inner button must be authored explicitly.

If no button can be found, the component **throws**. It does not fall back to a click handler, because a hand-rolled toggle cannot tell an opening click from the click that caused a light dismiss, and the panel would become impossible to close.

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `for` | string | `null` | `id` of the trigger. If omitted, the previous sibling is the trigger. |
| `placement` | string | `"auto"` | `"top"`, `"bottom"`, `"left"`, `"right"`, `"auto"` (picks the side with room), or `"center"`. Clamped into the viewport. |
| `offset` | number | `8` | Distance in pixels from the trigger. |
| `container` | string | `null` | Selector naming the **frame** the panel is sized and centred in. Defaults to the page content region. **Throws** if it matches nothing. |
| `aria-label` / `aria-labelledby` | string | — | Names the dialog. Recommended — without a name it is announced as "dialog" and nothing else. |

The component sets `role="dialog"` and `popover="auto"` itself. Set `role` explicitly only if the content is not a dialog.

## Nesting: keep inner dropdowns inside the panel

**Put any component that opens its own popup — `nui-select`, `nui-tag-input`, a nested `nui-popover` — inside the `<nui-popover>` element in the DOM.**

The platform light-dismisses an `auto` popover when a click lands outside it, and "outside" is judged by DOM ancestry. A nested popup that is a DOM descendant of the panel is *nested* and will not dismiss it; a popup rendered elsewhere (e.g. appended to `document.body`) counts as outside and **will close the panel mid-interaction**.

## Events

| Event | Fired when |
|-------|-----------|
| `nui-popover-open` | The panel became visible — by any path. |
| `nui-popover-close` | The panel became hidden — by any path, including light dismiss and Escape. |

Both bubble. They are emitted from the platform's `toggle` event, so they fire for invoker clicks, outside clicks, Escape, and programmatic calls alike.

## Programmatic control

```javascript
const panel = document.querySelector('nui-popover');

panel.show();
panel.hide();
panel.toggle();
panel.isOpen();     // boolean
```

`aria-expanded` on the invoker is maintained by the component — do not set it yourself.

## Sizing and centring

The **frame** is the page's content region — the nearest `nui-content` (or `nui-main`) ancestor of the trigger, the same landmark the banner factory treats as the content area. In an app shell that is the region beside the sidebar, not the whole window: centring over a sidebar is centring on the screen, not on the page the panel belongs to. A document with no shell falls through to `<body>`, which measures as the viewport.

Within that frame the panel is capped at **80% of its width**, so it can hold a real form rather than a couple of rows.

Past **60% of the frame's width**, the bubble body **centres itself horizontally in the frame** rather than being pushed off-screen with the trigger, but **remains anchored vertically to the button** with the arrow pointer aimed directly at the control. In that mode the panel is also capped to **80% of the frame's height** and scrolls if needed.

Explicit `placement="center"` asks for true viewport/frame centring without anchoring or arrow. `container="<selector>"` names the frame by hand.

The tooltip keeps its own narrow `320px` cap, is never frame-relative, and never centres.

## Positioning and scroll behaviour

Positioning is **hardware-accelerated via native CSS Anchor Positioning** where supported (Baseline 2026: Chrome 125+, Safari 18.2+, Firefox 147+), falling back to JavaScript placement (`placeAnchored()`) on older engines.

- **Compositor-driven anchoring:** Tethering is handled natively by the browser's render pipeline. When the page scrolls (touch fling, trackpad, scrollbar drag), the popover moves synchronously with its trigger with zero frame lag, zero layout recalculations, and zero JavaScript running during the scroll.
- **Auto-dismiss on scroll-out:** An `IntersectionObserver` watches the trigger while open. When the trigger scrolls off-screen or out of its scroll container, the popover automatically dismisses rather than lingering as an orphaned bubble at the edge of the viewport.
- **Fallback behaviour:** In legacy browsers without CSS Anchor Positioning, `placeAnchored()` calculates geometry on open, and background scrolling dismisses the panel cleanly (matching native mobile controls and `nui-tooltip`) to prevent main-thread jank.

## Content

The panel is a plain container. Put anything focusable in it; the top layer means an ancestor's `overflow: hidden` cannot clip it, and the panel tracks its trigger on scroll and resize — with the caveats in *Known behaviour and limitations*.

```html
<nui-popover aria-label="Filters" placement="bottom">
	<div class="my-panel-rows">
		<label>Show archived</label>
		<nui-input><input type="checkbox"></nui-input>
	</div>
</nui-popover>
```

Consumers style **their own content** inside the panel. Do not write CSS against `nui-popover` itself — the surface, border, radius, padding and shadow are the component's, same as every other NUI component.

## Accessibility

- `role="dialog"` on the panel, non-modal — so no `aria-modal` and no focus trap: the rest of the page stays usable.
- The invoker receives `aria-haspopup="dialog"` and a managed `aria-expanded`.
- `Escape` closes the panel and focus returns to the invoker; light dismiss does the same.
- A `role="dialog"` with no accessible name logs a warning — add `aria-label`.

## Browser support

Requires the Popover API: Chrome 114+, Safari 17+, Firefox 125+. Unsupported browsers get a **thrown error**, not a silently broken panel.
