# Dialog (`nui-dialog`)

## Design Philosophy

NUI's dialog system is built strictly cleanly over the native HTML `<dialog>` element. The native `<dialog>` provides focus trapping, Escape key handling, and robust accessibility semantics that are historically error-prone to recreate with `div`s.

The `nui-dialog` custom element acts as a Light DOM wrapper that orchestrates:
- Open/Close scale and fade animations
- Intelligent backdrop click-to-close behavior
- Placement options (center, top, bottom)
- Promise-based system dialog generation (alert, confirm, prompt)

## Usage Strategies

There are two primary ways to use NUI dialogs:

1. **System Dialogs (Programmatic)**: For common patterns (alert, confirm, prompt, page), use the JavaScript factory API. It dynamically generates the DOM, handles the promise resolution, and cleans itself up.
2. **Custom Overlays (Declarative)**: For complex, highly customized modal content, author standard HTML `<nui-dialog><dialog>...</dialog></nui-dialog>` structures and trigger them programmatically or declaratively via `data-action`.

---

## 1. System Dialogs (Programmatic)

The `nui` global exposes asynchronous factory methods for spawning standard interactions. These return Promises that resolve based on user action.

### `nui.components.dialog.alert(title, message, options?)`
Shows a simple alert with an OK button.
- **Returns**: `Promise<true>` when closed.
```javascript
await nui.components.dialog.alert('Success', 'Profile updated successfully.');
```

### `nui.components.dialog.confirm(title, message, options?)`
Prompts the user to make a boolean decision.
- **Returns**: `Promise<boolean>` (`true` for OK, `false` for Cancel or backdrop click).
```javascript
const confirmed = await nui.components.dialog.confirm(
	'Delete Repository?', 
	'This action cannot be undone.'
);
if (confirmed) {
	// Proceed with deletion
}
```

### `nui.components.dialog.prompt(title, message, options?)`
Prompts the user for data entry using a generated form.
- **`options.fields`**: Array of input configurations `{ id, label, value, type }`.
- **Returns**: `Promise<Object | null>` (Object mapping field IDs to values, or null if cancelled).
```javascript
const values = await nui.components.dialog.prompt('Rename File', '', {
	fields: [
		{ id: 'filename', label: 'File Name', value: 'index.js' }
	]
});
if (values) console.log(values.filename);
```

### `nui.components.dialog.page(title, subtitle, options?)`
Spawns an empty shell dialog with predefined layout structure (Header, Main, Footer buttons). Ideal for dynamically injected content (e.g. from an SPA router).
- **Returns**: Object `{ dialog: HTMLElement, main: HTMLElement }`.
```javascript
const { dialog, main } = await nui.components.dialog.page('Settings', '', {
	buttons: [
		{ label: 'Cancel', value: 'cancel', type: 'outline' },
		{ label: 'Save', value: 'save', type: 'primary' }
	]
});

main.innerHTML = '<p>Custom form content here.</p>';

dialog.addEventListener('nui-dialog-close', (e) => {
	if (e.detail.returnValue === 'save') {
		// Save action
	}
});
```

### System Dialog Options
All factory methods accept an `options` object:

| Option | Type | Description |
|--------|------|-------------|
| `placement` | `String` | `'center'` (default), `'top'`, `'bottom'` |
| `blocking` | `Boolean` | Prevent closing via Escape key or backdrop clicks. Forces interaction with the provided buttons. |
| `target` | `Element` | The DOM node to attach the generated dialog element to (defaults to `document.body`). |

---

## 2. Custom Dialogs (Declarative)

For fully custom layouts, define the dialog in HTML.

```html
<nui-dialog id="settings-dialog" placement="top">
	<dialog>
		<form method="dialog">
			<header>
				<h2>Advanced Settings</h2>
			</header>
			<main>
				<p>Modal content goes here.</p>
			</main>
			<footer>
				<nui-button-container align="end">
					<nui-button variant="outline"><button value="cancel">Cancel</button></nui-button>
					<nui-button variant="primary"><button value="save">Save</button></nui-button>
				</nui-button-container>
			</footer>
		</form>
	</dialog>
</nui-dialog>
```

### HTML API: `nui-dialog`

| Attribute | Value | Description |
|-----------|-------|-------------|
| `placement` | `center` (default), `top`, `bottom` | Controls vertical alignment on desktop screens. |
| `blocking` | `Boolean` | If present on `<nui-dialog>`, clicking the backdrop or pressing Escape will be completely ignored. |

### DOM Structure & Features
- **Inner `<dialog>`**: Must be present.
- **`<form method="dialog">`**: Utilizing this native HTML pattern allows any inner submit buttons to automatically close the dialog and pass their `value` attribute upward as the `returnValue`.
- **Backdrop Clicks**: Handled natively by `<nui-dialog>`. Clicking the semitransparent background instantly fires the close animations unless `blocking` is active.

---

## Events & Programmatic Control

Whether a dialog is spawned via JS or declared in HTML, it emits standardized events and supports control methods.

| Event / Method | Target | Description |
|----------------|--------|-------------|
| `element.open()` | `<nui-dialog>` | Programmatically opens the dialog. |
| `element.close(value)` | `<nui-dialog>` | Programmatically closes the dialog, passing an optional string `value`. |
| `nui-dialog-open` *(Event)* | `<nui-dialog>` | Fired immediately when the dialog begins its open animation. |
| `nui-dialog-close` *(Event)* | `<nui-dialog>` | Fired immediately when the dialog begins closing. `e.detail.returnValue` contains the string value of the button that closed it. |
| `nui-dialog-cancel` *(Event)* | `<nui-dialog>` | Fired alongside `close` if the dialog was closed via Escape key or backdrop click. `returnValue` will be `'cancel'`. |

## Declarative Triggers (No JS Required)

You do not need to write JavaScript to open/close explicitly declared modal dialogs. Use the `data-action` engine binding:

```html
<!-- Open a specific dialog -->
<button data-action="dialog-open@#settings-dialog">Open Settings</button>

<!-- Close the dialog it resides in natively -->
<button data-action="dialog-close">Close</button>

<!-- Close the dialog with a specific return value -->
<button data-action="dialog-close:save">Save Settings</button>
```