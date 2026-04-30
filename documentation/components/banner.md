# nui-banner

Edge-anchored notification banners with optional auto-close, priority levels, and a singleton manager per placement. Banners communicate status without interrupting user flow.

## Design Philosophy

Banners provide passive, transient feedback. Unlike dialogs, banners appear at the edge of the screen (top or bottom) and do not trap focus. Use banners for success/failure feedback, background process completion, and non-blocking notifications. Avoid using them for critical warnings that require acknowledgment (use dialogs instead).

## Declarative Usage

Inline banners flow or anchor declaratively without writing JavaScript. Use the `data-action` API to show or hide them.

```html
<nui-banner id="demo-banner" placement="bottom" auto-close="5000">
	<div class="nui-banner-content">
		<span>Your changes have been saved.</span>
		<button type="button" data-action="banner-close:dismiss@#demo-banner">Dismiss</button>
	</div>
</nui-banner>

<!-- Open the banner -->
<nui-button data-action="banner-show@#demo-banner">
	<button type="button">Show Banner</button>
</nui-button>
```

## Element Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `placement` | `bottom` | The edge to anchor the banner to (`top` or `bottom`). |
| `priority` | `info` | Accessibility priority level (`info` or `alert`). |
| `auto-close` | (none) | Auto-dismissal timeout in milliseconds (e.g., `5000`). If omitted, the banner remains until manually closed. |

## Programmatic Factory (nui.components.banner)

For dynamic notifications, NUI provides a singleton factory. It ensures only one banner per placement exists at a time, automatically replacing existing ones.

```javascript
// Show a dynamic banner
const banner = nui.components.banner.show({
	content: 'Settings saved successfully',
	placement: 'bottom', // 'top' or 'bottom'
	priority: 'info',    // 'info' or 'alert'
	autoClose: 3000,     // milliseconds, 0 to persist
	showCloseButton: true, // Auto-generates a close button (default: true)
	showProgress: true     // Shows a progress bar if autoClose is set (default: true)
});

// The factory returns a controller object:
banner.update('Wait, something went wrong!');
setTimeout(() => banner.close('error'), 3000);

// Listen for the closing action
banner.onClose((action) => {
	console.log(`Banner closed via: ${action}`); // e.g. "dismiss", "error", "replaced"
});
```

### Factory Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `content` | String/HTML | `''` | The HTML or text content to display. |
| `placement` | String | `'bottom'` | Edge placement (`top` or `bottom`). |
| `priority` | String | `'info'` | Screen reader priority (`info` or `alert`). |
| `autoClose` | Number | `0` | Milliseconds before auto-close. |
| `showCloseButton` | Boolean | `true` | Automatically injects a dismiss button. |
| `showProgress` | Boolean | `true` | Shows a visual countdown animation if `autoClose` is active. |
| `target` | Element | (auto) | The DOM element to append to (defaults to `.nui-banner-layer` or `document.body`). |

## Element Methods & Events

If interacting directly with a `<nui-banner>` DOM element (instead of the factory controller):

### Methods

| Method | Description |
|--------|-------------|
| `.show(action?)` | Opens the banner. |
| `.close(action?)` | Closes the banner. The optional `action` string is passed to the close event. |
| `.update(content)` | Replaces the inner HTML of the banner. |

### Events

| Event | Detail | Description |
|-------|--------|-------------|
| `nui-banner-open` | `{}` | Fired when the banner finishes opening. |
| `nui-banner-close` | `{ action: String }` | Fired when the banner closes. The `action` helps identify how it closed (e.g., `dismiss`, `auto-close`). |

### Action Delegates

| Action | Description |
|--------|-------------|
| `banner-show@<selector>` | Opens the target banner. |
| `banner-close[:action]@<selector>` | Closes the target banner, passing the optional `:action` string (e.g., `data-action="banner-close:cancel@#my-banner"`). |
