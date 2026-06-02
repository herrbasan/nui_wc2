# nui-app (Application Shell)

> **Global Note:** Always follow the global rules in `documentation/DOCUMENTATION.md`. Use the correct Light DOM wrappers.

## Design Philosophy

The NUI layout system provides two distinct modes: **App Mode** (with `<nui-app>`) and **Page Mode** (without `<nui-app>`). This dual-mode architecture allows the same components to work as fixed application UI elements or flow naturally in normal document layouts.

- **Semantic HTML Foundation:** Real HTML elements must be nested inside custom element containers.
- **Context-Aware:** Layout behavior adapts automatically based on the presence or absence of the `<nui-app>` root wrapper.
- **Progressive Enhancement:** Works smoothly with CSS/JavaScript disabled, remaining fully screen-reader friendly.

## Critical Layout Rules (Follow Exactly)

1. `<nui-app>` activates CSS Grid mode. It must wrap the entire application shell to create fixed layout regions.
2. Inside `<nui-app>`, the immediate children MUST be exactly: `<nui-app-header>`, `<nui-sidebar>`, `<nui-content>`, and optionally `<nui-app-footer>`.
3. These are structural layout web components. They MUST wrap native semantic HTML elements (`<header>`, `<nav>`, `<main>`, `<footer>`) respectively as their direct children.

## Strict DOM Structure (Do NOT deviate)

Do not invent tags like `<nui-top-nav>` or `<nui-side-nav>`. Do not omit the internal semantic tags.

**Correct (App Mode):**
```html
<nui-app>
	<nui-app-header>
		<header>Site Title</header>
	</nui-app-header>

	<nui-sidebar>
		<nav>Navigation links</nav>
	</nui-sidebar>

	<nui-content>
		<main>Content here</main>
	</nui-content>

	<nui-app-footer>
		<footer>Footer content</footer>
	</nui-app-footer>
</nui-app>
```

**Wrong / Will Fail:**
```html
<nui-app>
	<nui-top-nav>Site Title</nui-top-nav> <!-- Invented tag, missing <header> -->
	<nui-sidebar>Navigation links</nui-sidebar> <!-- Missing <nav> -->
	<main>Content</main> <!-- Missing <nui-content> wrapper -->
</nui-app>
```

---

## `<nui-app>` — Declarative Attributes

These attributes are placed on the `<nui-app>` element to control layout behavior.

### `content-min-width`

Sets the minimum width the content area needs before sidebars are forced to collapse. This is the primary knob for responsive breakpoint control.

| Value | Behavior |
|-------|----------|
| `"55rem"` | Content needs at least 55rem of width. Sidebars collapse when viewport < content-min + sidebar widths. |
| `"800px"` | Content needs at least 800px. Accepts `px`, `rem`, `em`. |
| *(not set)* | Defaults to `0` (no minimum). Sidebars collapse based only on their own widths. |

```html
<nui-app content-min-width="55rem">
	<!-- Sidebars collapse earlier if content doesn't have 55rem of space -->
</nui-app>
```

### `sidebar-breakpoint`

Global override for when sidebars collapse. Overrides the automatic hierarchical breakpoint calculation.

| Value | Behavior |
|-------|----------|
| `"auto"` *(default)* | Automatic calculation based on `content-min-width` + sidebar `behavior`. |
| `"none"` / `"false"` / `"never"` | Sidebars **never** auto-collapse. Always visible (forced state). |
| `"768px"` | Collapse when viewport < 768px. Accepts `px`, `rem`, `em`. |

```html
<!-- Never collapse sidebars -->
<nui-app sidebar-breakpoint="none">
	...
</nui-app>

<!-- Custom breakpoint -->
<nui-app sidebar-breakpoint="900px" content-min-width="50rem">
	...
</nui-app>
```

---

## `<nui-app>` — Auto-Managed CSS Classes

These classes are added/removed automatically by the component. You generally should NOT set them manually, but you CAN read them for styling or logic.

### Sidebar State Classes (left sidebar)

| Class | Meaning |
|-------|---------|
| `sidebar-open` | Left sidebar is visible as an overlay (viewport below breakpoint). Click outside to dismiss. |
| `sidebar-closed` | Left sidebar is hidden (viewport below breakpoint). |
| `sidebar-forced` | Left sidebar is permanently visible (viewport above breakpoint). Toggle button is disabled. |

### Sidebar State Classes (right sidebar)

| Class | Meaning |
|-------|---------|
| `sidebar-right-open` | Right sidebar is visible as an overlay. |
| `sidebar-right-closed` | Right sidebar is hidden. |
| `sidebar-right-forced` | Right sidebar is permanently visible. |

### Layout Presence Classes

| Class | Condition |
|-------|-----------|
| `has-top-nav` | `<nui-app-header>` is present. |
| `has-sidebar` | A left `<nui-sidebar>` is present. |
| `has-sidebar-right` | A right `<nui-sidebar>` is present. |
| `has-footer` | `<nui-app-footer>` is present. |
| `nui-ready` | Added after the first responsive state calculation completes. Transitions are suppressed until this class is present. |

---

## `<nui-sidebar>` — Declarative Attributes

### `position`

Controls which side of the screen the sidebar occupies.

| Value | Behavior |
|-------|----------|
| `"left"` *(default)* | Anchored to the left edge. Controlled by `sidebar-open`/`sidebar-closed`/`sidebar-forced` classes. |
| `"right"` | Anchored to the right edge. Controlled by `sidebar-right-open`/`sidebar-right-closed`/`sidebar-right-forced` classes. |

```html
<!-- Right-positioned sidebar -->
<nui-sidebar position="right">
	<nav>Settings panel</nav>
</nui-sidebar>
```

### `behavior`

Controls how the sidebar participates in the automatic breakpoint calculation. This determines the viewport width at which the sidebar switches from overlay mode to permanently-visible (forced) mode.

| Value | Breakpoint Formula | Use Case |
|-------|--------------------|----------|
| `"auto"` *(default)* | Left sidebar → `primary`. All others → `secondary`. | Most applications. |
| `"primary"` | `contentMinWidth + thisSidebarWidth` | The main navigation sidebar. Collapses only when content is the bottleneck. |
| `"secondary"` | `contentMinWidth + primarySidebarWidth + thisSidebarWidth` | A secondary sidebar (e.g., context panel). Collapses earlier — only stays open if there's room after the primary sidebar AND content. |
| `"manual"` | Never auto-collapses (forced at all viewport sizes). | Sidebars you always want visible regardless of viewport. |

```html
<!-- Primary navigation (collapses last) -->
<nui-sidebar behavior="primary">
	<nav>Main navigation</nav>
</nui-sidebar>

<!-- Secondary context panel (collapses first) -->
<nui-sidebar position="right" behavior="secondary">
	<nav>Properties panel</nav>
</nui-sidebar>
```

**How `"auto"` resolves:** If NO sidebar has `behavior="primary"`, the left sidebar is treated as primary. If a primary sidebar exists, all other sidebars are treated as secondary. This ensures sensible defaults without requiring explicit configuration.

---

## `data-action` — Sidebar Control

Toggle sidebars declaratively — no JavaScript required.

| Action | Effect |
|--------|--------|
| `data-action="toggle-sidebar"` | Toggles the left sidebar open/closed. |
| `data-action="toggle-sidebar:left"` | Explicitly toggles the left sidebar. |
| `data-action="toggle-sidebar:right"` | Toggles the right sidebar open/closed. |

```html
<!-- In <nui-app-header> -->
<nui-button data-action="toggle-sidebar">
	<button type="button" aria-label="Menu">
		<nui-icon name="menu"></nui-icon>
	</button>
</nui-button>

<nui-button data-action="toggle-sidebar:right">
	<button type="button" aria-label="Settings">
		<nui-icon name="settings"></nui-icon>
	</button>
</nui-button>
```

Toggle buttons are automatically **disabled** (`disabled` attribute, `aria-hidden`, `tabindex="-1"`) when the corresponding sidebar is in forced (permanently visible) state.

---

## Events

### `nui-sidebar-change`

Dispatched on the `<nui-app>` element whenever any sidebar changes state.

```javascript
document.querySelector('nui-app').addEventListener('nui-sidebar-change', (e) => {
	console.log(e.detail.position); // "left" | "right"
	console.log(e.detail.state);    // "open" | "closed" | "forced"
});
```

| Detail Property | Type | Values |
|-----------------|------|--------|
| `position` | string | `"left"` or `"right"` |
| `state` | string | `"open"` (overlay visible), `"closed"` (hidden), `"forced"` (permanently visible) |

---

## Programmatic API

### `<nui-app>` Methods

| Method | Description |
|--------|-------------|
| `.toggleSidebar(position)` | Toggle a sidebar. `position` is `"left"` (default) or `"right"`. No-op if the sidebar is in forced state. |
| `.invalidateBreakpointCache()` | Force recalculation of all sidebar breakpoints. Call after dynamically changing sidebar content or attributes. |

```javascript
const app = document.querySelector('nui-app');

// Programmatically toggle the left sidebar
app.toggleSidebar('left');

// After changing sidebar content dynamically
app.invalidateBreakpointCache();
```

### `<nui-sidebar>` Methods

These delegate to the inner `<nui-link-list>` if one is present:

| Method | Description |
|--------|-------------|
| `.setActive(selector)` | Set the active navigation item by CSS selector. |
| `.getActive()` | Returns the currently active `<a>` element, or `null`. |
| `.getActiveData()` | Returns `{ element, href, text }` for the active item, or `null`. |
| `.clearActive(closeAll)` | Clear the active item. If `closeAll=true`, collapses all groups too. |
| `.clearSubs()` | Collapse all group headers in the link list. |

---

## Auto-Behaviors (No Configuration Needed)

### Backdrop

When a sidebar is open as an overlay (not forced), a semi-transparent backdrop appears behind it. Clicking the backdrop (anywhere outside the sidebar and header) dismisses the sidebar.

### Focus Management

- **Focus-in on a closed sidebar** automatically opens it (so keyboard users can access navigation).
- **Focus-out from an open, non-forced sidebar** automatically closes it.
- This ensures keyboard-only users can navigate sidebars without mouse interaction.

### Platform Gestures

On iOS Safari, pinch-to-zoom gestures are automatically prevented to avoid breaking the fixed app shell layout.

---

## CSS Variables (Reference)

These theme variables control layout dimensions. Set them on `:root` to customize:

| Variable | Default | Controls |
|----------|---------|----------|
| `--sidebar-width` | `21rem` | Width of all `<nui-sidebar>` elements. |
| `--app-header-height` | `4rem` | Height of `<nui-app-header>`. |
| `--footer-height` | *(auto)* | Height of `<nui-app-footer>`. |

```css
:root {
	--sidebar-width: 18rem;       /* Narrower sidebars */
	--app-header-height: 3.5rem;  /* Shorter header */
}
```

---

## Component Roles

### `<nui-app>`
Container element that activates App Mode.
- Creates a strictly defined CSS Grid layout.
- Viewport is rigidly sized to `100vh / 100dvh` for fixed-panel application behavior.
- Manages responsive scaling (e.g. collapsing the sidebar on mobile).

### `<nui-app-header>`
The top navigation bar.
- **App Mode:** Fixed to the top row, spanning full width.
- **Page Mode:** Standard static header in the document flow.
- Must contain a `<header>` element.
- Supports `slot="left"`, `slot="center"`, `slot="right"` zones.
- See [`app-header.md`](app-header.md) for full documentation.

### `<nui-sidebar>`
The primary navigation sidebar.
- **App Mode:** Fixed to the left or right side.
- `position="left"` (default) or `position="right"`.
- Must contain a `<nav>` element or `<nui-link-list>`.
- See above for `behavior` and `position` attributes.

### `<nui-content>`
The main scrolling viewport container.
- **App Mode:** Takes up the remaining grid fraction. Handles overflow and scrolling automatically.
- **Page Mode:** Standard structural block.
- Must contain a `<main>` primary element (or `<nui-main>`).

### `<nui-app-footer>`
An optional persistent footer bar.
- **App Mode:** Fixed to the bottom row, spanning full width.
- **Page Mode:** Standard footer in the document flow.
- Must contain a `<footer>` element.

---

## Deprecated / Legacy Attributes

These still work but are superseded by the attributes documented above. Prefer the new attributes.

| Legacy Attribute | Placement | Replacement |
|------------------|-----------|-------------|
| `favored` | `<nui-sidebar>` | `behavior="primary"` |
| `nui-vars-sidebar_force-breakpoint` | `<nui-app>` | `sidebar-breakpoint` |
| `nui-vars-sidebar-left_force-breakpoint` | `<nui-app>` | `sidebar-breakpoint` |
| `nui-vars-sidebar-right_force-breakpoint` | `<nui-app>` | `sidebar-breakpoint` |
| `.toggleSideNav(position)` | `<nui-app>` method | `.toggleSidebar(position)` |
