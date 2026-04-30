# nui-select

## Design Philosophy

Native `<select>` elements suffer from limitations: inconsistent styling across browsers, lack of search capability, and a notably deficient multi-select experience. `nui-select` solves these issues by layering a robust, accessible custom UI over a standard native inner `<select>`.

The core insight here is that **the native `<select>` stays in the DOM**. 
- Form submissions remain completely standard (submitting the native input).
- Browser validation works out-of-the-box.
- The custom wrapper simply acts as a synchronized proxy.

## Declarative Usage

A basic selection dropdown requires wrapping a native `<select>` element inside `<nui-select>`.

```html
<nui-select>
	<select name="fruit">
		<option value="">Select a fruit...</option>
		<option value="apple">Apple</option>
		<option value="banana">Banana</option>
	</select>
</nui-select>
```

> **Note on Placeholders:** The first `<option>` with a blank `value=""` is automatically treated as the placeholder.

### Searchable Select

By adding the `searchable` attribute, `nui-select` injects an inner search field that natively filters the dropdown list in real time.

```html
<nui-select searchable>
	<select name="country">
		<option value="">Select a country...</option>
		<option value="no">Norway</option>
		<option value="de">Germany</option>
		<option value="fr">France</option>
	</select>
</nui-select>
```

### Multi-Select with Tags

To enable multiple selections, simply apply the native `multiple` attribute directly to the `<select>` inner element. `nui-select` reads this and adapts the UI into a tokenized tag input display. Note: `searchable` strongly pairs with multi-select.

```html
<nui-select searchable>
	<select name="languages" multiple>
		<option value="python">Python</option>
		<option value="javascript" selected>JavaScript</option>
		<option value="rust">Rust</option>
	</select>
</nui-select>
```

### Option Groups

`nui-select` inherently understands and inherits native `<optgroup>` tags perfectly, styling them as distinct segments.

```html
<nui-select>
	<select name="food">
		<optgroup label="Fruits">
			<option value="apple">Apple</option>
		</optgroup>
		<optgroup label="Vegetables">
			<option value="carrot">Carrot</option>
		</optgroup>
	</select>
</nui-select>
```

## Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `searchable` | boolean | Enables real-time text-filtering of select options. |
| `mobile-sheet` | boolean | Forces mobile bottom-sheet UI presentation instead of dropdowns. *(Automatically engaged on devices <= 640px wide).* |
| `placeholder` | string | Used as a fallback if no `value=""` `<option>` is supplied in the raw HTML. |

## Programmatic Usage

Because the actual form values live natively inside the underlying `<select>`, you can either modify the DOM of the `<select>` directly and ask `nui-select` to resync, or use the component's exposed methods.

### DOM Methods

| Method | Parameters | Description |
|--------|------------|-------------|
| `setItems(items)` | `Array<Object>` | Programmatically rewrites the inner `<select>` tag options. Objects require `{ value, label }` or `{ group, options: [...] }`. |
| `clear()` | none | Deselects all options. |
| `open()` | none | Programmatically unfolds the select popup element. |
| `close()` | none | Folds the popup shut. |
| `disable()` | none | Sets the component and underlying control to disabled. |
| `enable()` | none | Re-enables the interactive controls. |

#### `setItems()` Structure

```javascript
document.querySelector('nui-select').setItems([
    { group: 'Frontend', options: [
        { label: 'React', value: 'react' },
        { label: 'Vue', value: 'vue' }
    ]},
    { label: 'Uncategorized', value: 'misc' }
]);
```

### Events

Because it encapsulates a complex interaction, `nui-select` broadcasts specific lifecycle events.

| Event | Type | Description |
|-------|------|-------------|
| `nui-change` | `CustomEvent` | Fires when the overarching value changes. Detail contains `{ values, labels, options }` arrays. |
| `nui-select` | `CustomEvent` | Fires anytime a specific option row is clicked/picked. Contains `{ value, label, selected }`. |
| `nui-open` | `CustomEvent` | Fires when the popup drops open. |
| `nui-close` | `CustomEvent` | Fires when the popup is shut. |
| `nui-clear` | `CustomEvent` | Fires when the clear method deletes all active choices. |