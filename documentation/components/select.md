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
		<option value="" disabled selected>Select a fruit...</option>
		<option value="apple">Apple</option>
		<option value="banana">Banana</option>
	</select>
</nui-select>
```

> **Placeholder is display text, not data.** The prompt shown when nothing is selected comes from (in precedence order): the `placeholder` attribute on `<nui-select>`, then the explicit markup idiom `<option value="" disabled selected>`, then a generic "Select..." fallback. The component **never injects or hides options** — every `<option>` in the markup is a real, selectable row, including one with `value=""`. A blank option is only treated as the placeholder when it is **also `disabled`** (the idiom above). A non-disabled `<option value="">Real choice</option>` is a legitimate value: it renders in the list, is selectable, and displays as the current value when chosen.

### Searchable Select

By adding the `searchable` attribute, `nui-select` injects an inner search field that natively filters the dropdown list in real time.

```html
<nui-select searchable>
	<select name="country">
		<option value="" disabled selected>Select a country...</option>
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

## Populating Options Dynamically

**Programmatic API is the preferred method.** Always reach for `.setItems()` / `.addItem()` / `.removeItem()` first — they are synchronous, validated, dispatch the matching events (`nui-items-replace`, `nui-item-add`, `nui-item-remove`), and integrate with `.setValue()` / `.getItems()` state management.

```javascript
const select = element.el('nui-select');

// ✅ PREFERRED — programmatic data API
select.setItems([
	{ value: 'us', label: 'United States' },
	{ value: 'uk', label: 'United Kingdom' }
]);
```

Direct DOM writes into the inner `<select>` also work — the component observes mutations on the slotted select and rebuilds the visible dropdown automatically — but they are a **compatibility fallback, not the recommended path**: no events are dispatched, and the rebuild is deferred to a microtask.

```javascript
// ⚠️ WORKS, but fallback — no events, deferred sync
const inner = select.el('select');
inner.innerHTML = '<option value="us">United States</option>';
```

> ⚠️ **Historical trap:** the dropdown renders from component state, not from a live read of the slotted DOM. Before the mutation observer existed, `innerHTML` population left the visible dropdown stale while the DOM silently held your options — a failure with zero errors. If you maintain an old vendored copy of NUI (pre-observer), direct DOM writes fail silently: always use the programmatic API.

> **Verifying state (LLM/test consumers):** read what the component RENDERS (open the dropdown, read the visible rows, use `.getItems()`), not the underlying slotted DOM — the two can diverge.

## Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `searchable` | boolean | Enables real-time text-filtering of select options. |
| `mobile-sheet` | boolean | Forces mobile bottom-sheet UI presentation instead of dropdowns. *(Automatically engaged on devices <= 640px wide).* |
| `placeholder` | string | Prompt text shown when nothing is selected. Takes precedence over the disabled-blank-option idiom. |

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