# nui-button & nui-button-container

## Design Philosophy

The button component embodies NUI's core principle: **enhance, don't replace**. Rather than creating a synthetic button from `div`s with click handlers, `nui-button` wraps the native `<button>` element (or `<a>`) and adds visual styling while preserving all native behaviors.

This matters because native buttons have capabilities no `div` can replicate perfectly:
- Keyboard focus and activation (`Space`/`Enter`)
- Form submission and reset behavior
- Disabled state that truly prevents interaction
- Automatic accessibility announcements

This wrapper pattern keeps concerns clear: the wrapper (`<nui-button>`) handles appearance and component states, while the inner element (`<button>` or `<a>`) handles semantics, accessibility, and form integration.

## Declarative Usage

### Basic Button

```html
<nui-button>
	<button type="button">Click Me</button>
</nui-button>
```

### Form Submit Button

```html
<nui-button variant="primary">
	<button type="submit">Submit Form</button>
</nui-button>
```

### Anchor Button

You can wrap an `<a>` tag to get button styling on links:

```html
<nui-button variant="outline">
	<a href="#page=components/grid">Go to Grid</a>
</nui-button>
```

### Loading State

```html
<nui-button state="loading">
	<button type="button" disabled>Loading...</button>
</nui-button>
```

### File Input Wrapper

`nui-button` can wrap an invisible file input to create a styled file upload button:

```html
<nui-button variant="outline">
	<button type="button">Upload File</button>
	<input type="file" accept="image/*" style="display: none">
</nui-button>
```

---

## Component API: `nui-button`

### Attributes / Variants

| Attribute | Value | Description |
|-----------|-------|-------------|
| `variant` | (default) | Standard action button with the default background color. |
| `variant` | `primary` | Solid accent color. Use for the main call-to-action on a view. |
| `variant` | `outline` | Secondary actions. Transparent background with a distinct border. |
| `variant` | `ghost` | Subtle actions. Transparent background, borderless, reveals background on hover. |
| `variant` | `danger` / `delete` | Red/warning visual style for destructive actions. |
| `variant` | `warning` | Yellow/orange visual style for warning actions. |
| `variant` | `icon` | Circular or squared borderless style, mainly used when surrounding an icon. |
| `state` | `loading` | Activates the loading spinner visual state. When set, you must also `disabled` the inner button. |

### DOM Details & Classes

| Detail | Description |
|--------|-------------|
| `.icon-only` *(Class)* | Automatically added to the `<nui-button>` if the *only* visible child is a `<nui-icon>`. Automatically handles padding and sizing for icon buttons. |
| `a` / `button` *(Inner Element)* | Ensure you explicitly set `type="button"` on `<button>` elements to prevent accidental form submissions, unless it's an actual submit button. |

### Methods

| Method | Parameters | Description |
|--------|-----------|-------------|
| `setLoading(isLoading)` | `isLoading: boolean` | Adds/removes the `state="loading"` attribute and automatically toggles the `disabled` property on the inner `<button>`. |

### Events

| Event | Description |
|-------|-------------|
| `nui-click` | Fired when the inner button is clicked. Bubbles. `detail.source` contains a reference to the `<nui-button>`. |
| `nui-file-selected` | Fired when a file is selected via an internal `<input type="file">`. `detail.files` contains the selected `FileList`. |

---

## Component API: `nui-button-container`

`nui-button-container` groups related buttons providing consistent spacing, alignment, and optional selection behaviors.

### Declarative Usage

```html
<!-- Simple grouped buttons aligned right -->
<nui-button-container align="end" gap="small">
	<nui-button variant="outline"><button type="button">Cancel</button></nui-button>
	<nui-button variant="primary"><button type="button">Save</button></nui-button>
</nui-button-container>

<!-- Segmented Control (Toggle Group) -->
<nui-button-container mode="segmented">
	<nui-button><button type="button" data-value="day">Day</button></nui-button>
	<nui-button><button type="button" data-value="week">Week</button></nui-button>
	<nui-button><button type="button" data-value="month">Month</button></nui-button>
</nui-button-container>
```

### Attributes

| Attribute | Value | Description |
|-----------|-------|-------------|
| `align` | `start` (default), `center`, `end`, `between`, `stretch` | Aligns the buttons along the primary axis or cross-axis depending on the direction. |
| `gap` | `none`, `small` (default), `medium`, `large` | Sets the spacing between the buttons. |
| `direction` | `row` (default), `column` | Sets the layout direction of the container. |
| `mode` | `segmented`, `single-select` | Enables single-item selection state management tracking the active `<nui-button>`. Sets `state="active"` on the selected button. |
| `variant` | `segmented` | Gives the container border styling like a connected toggle button group. (Same as passing `mode="segmented"`). |

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `value` | `String` | Gets or sets the value of the currently active button in `segmented` or `single-select` modes. Reads from the inner button's `data-value`, `value`, `id`, or `textContent`. |

### Events

| Event | Description |
|-------|-------------|
| `nui-change` | Fired when `mode` is `segmented` or `single-select` and a new button is selected. `detail.selected` is the `<nui-button>`. `detail.value` is the computed string value. |