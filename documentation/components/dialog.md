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

### `nui.components.dialog.page(title, htmlContent, options?)`

> ⚠️ **CRITICAL:** The second parameter is `htmlContent` (an HTML string injected as the dialog body), NOT a subtitle. Passing a plain string as the second argument will render it as HTML content inside the dialog's `<main>` element.

Spawns an empty shell dialog with predefined layout structure (Header, Main, Footer buttons). Ideal for dynamically injected content (e.g. from an SPA router).

- **Parameters:**
  - `title` — Dialog header title
  - `htmlContent` — HTML string inserted into the dialog's `<main>` body
  - `options.buttons` — Array of `{ label, value, type, icon? }` for footer buttons
  - `options.placement` — `'center'` (default), `'top'`, `'bottom'`
  - `options.blocking` — If true, prevents close via Escape or backdrop click
  - `options.target` — DOM node to attach dialog to (defaults to `document.body`)
- **Returns**: Object `{ dialog: HTMLElement, main: HTMLElement, result: Promise<string> }`. The `result` Promise resolves with the clicked button's `value` when the dialog is closed.
```javascript
// ✅ CORRECT — htmlContent as second parameter
const { dialog, main, result } = nui.components.dialog.page(
    'Settings',
    '<p>Custom form content here.</p>',
    {
        buttons: [
            { label: 'Cancel', value: 'cancel', type: 'outline' },
            { label: 'Save', value: 'save', type: 'primary' }
        ]
    }
);

// ❌ WRONG — treating second param as subtitle
const { dialog } = nui.components.dialog.page('Settings', 'My subtitle', { ... });
// "My subtitle" will render as the content body, not a subtitle!

// Await the result to know which button was clicked
const returnValue = await result;
if (returnValue === 'save') {
    // Save action
}
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
| `placement` | `center` (default), `top`, `bottom` | Controls vertical alignment on desktop screens. Ignored in page mode — a page dialog fills the viewport. |
| `blocking` | `Boolean` | If present on `<nui-dialog>`, clicking the backdrop or pressing Escape will be completely ignored. |
| `mode` | `page` | Builds the app-scale page shell (header / scrollable main / fixed footer) instead of a center-screen overlay. See [Page Mode](#page-mode) below. |
| `title` | `String` | **Page mode only.** Renders the header `<h2>` and an icon-only close button. The header is created only when the attribute is present, even if empty. |
| `data-buttons` | JSON array of `{label, value, type, icon}` | **Page mode only.** Injects `<nui-button>`s into the fixed footer; clicking one closes the dialog with that button's `value`. The `element.buttons` JS property takes precedence over the attribute. |
| `content-scroll` | `false` | **Page mode only.** Sets the `<main>` to `overflow: hidden; padding: 0` with column flex, for embedding a self-measuring scroller such as `<nui-list>`. |

### DOM Structure & Features
- **Inner `<dialog>`**: Must be present — **except in page mode**, where it must be absent. See the gotcha below.
- **`<form method="dialog">`**: Utilizing this native HTML pattern allows any inner submit buttons to automatically close the dialog and pass their `value` attribute upward as the `returnValue`. Page mode does **not** use this pattern — its shell owns the footer. See below.
- **Backdrop Clicks**: Handled natively by `<nui-dialog>`. Clicking the semitransparent background instantly fires the close animations unless `blocking` is active.

---

## Page Mode

`mode="page"` turns the dialog into an app-scale surface: 90vw × 90vh (capped at `--space-page-maxwidth`, default `1200px`) with a structured shell, for workflows too large to sit in a center-screen modal.

```html
<nui-dialog id="picker" mode="page" title="Choose a document"
            data-buttons='[{"label":"Cancel","value":"cancel","type":"outline"},{"label":"Open","value":"open","type":"primary"}]'>
	<p>Content goes here — no <code>&lt;dialog&gt;</code>, no <code>&lt;form&gt;</code>.</p>
</nui-dialog>
```

**The shell it builds** (all three generated — do not author them):

| Region | Contents |
|--------|----------|
| `<header>` | The `title` as an `<h2>`, plus an icon-only close button that closes with `'cancel'`. Only built when the `title` attribute is present. |
| `<main>` | Everything you authored inside `<nui-dialog>`. Scrolls by default. |
| `<footer>` | One `<nui-button>` per entry in `data-buttons`. Each closes the dialog with its `value`. |

### ⚠️ The inner `<dialog>` must be absent

Page mode is built **only when there is no inner `<dialog>`**. The entire page-mode branch lives inside `if (!dialog)`:

```html
<!-- ✅ Correct — the component creates the shell -->
<nui-dialog mode="page" title="Settings">…</nui-dialog>

<!-- ❌ Silent failure — mode="page" is ignored, you get a center-screen modal -->
<nui-dialog mode="page" title="Settings">
	<dialog><main>…</main></dialog>
</nui-dialog>
```

The second form throws nothing and still renders a working overlay dialog, so the only signal is that it is not full-page. This is the most likely authoring mistake in page mode: the rest of this document teaches the declarative form *with* an inner `<dialog>`, and that form wins here.

### Page mode vs. the declarative pattern

| | Declarative custom dialog | `mode="page"` |
|---|---|---|
| Inner `<dialog>` | Required | **Forbidden** |
| Header / footer | You author them | Generated (header needs `title`; footer needs `data-buttons`) |
| Close mechanism | `<form method="dialog">` and button `value` | Generated close button (`'cancel'`) + `data-buttons` values |
| Layout | Content-sized | 90vw × 90vh, `--space-page-maxwidth` cap |

To embed a self-measuring scroller such as `<nui-list>`, add `content-scroll="false"` so the `<main>` stops scrolling and hands the height down instead:

```html
<nui-dialog mode="page" title="Log" content-scroll="false">
	<div style="position: relative; height: 100%;"><nui-list></nui-list></div>
</nui-dialog>
```

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

### Non-modal dismissal (`.show()`)

A dialog opened non-modally — `element.show()` or `data-action="dialog-show"` — has no backdrop, so backdrop click-to-close does not apply. **Escape closes the most recently opened non-modal dialog**: the component wires this itself, because a native `<dialog>` fires no `cancel` event when non-modal, which previously left `.show()` dialogs with no dismissal path at all (issue #38). It dispatches `nui-dialog-cancel` alongside `nui-dialog-close` with `returnValue: 'cancel'`. Set `blocking` on persistent panels to opt out.

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