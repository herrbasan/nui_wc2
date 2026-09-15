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
		<option value="apple">Apple</option>
		<option value="banana">Banana</option>
	</select>
</nui-select>
```

> **No blank option means the select always has a value** — the browser selects the first option. That is the default, and it is what the model below assumes: any departure from it must be declared by an option in the markup.

> **Placeholder is display text, not data.** The prompt shown when nothing is selected comes from (in precedence order): the `placeholder` attribute on `<nui-select>`, then the explicit markup idiom `<option value="" disabled selected>`, then a generic "Select..." fallback. The component **never injects or hides options** — every `<option>` in the markup is a real, selectable row, including one with `value=""`. A blank option is only treated as the prompt when it is **also `disabled`**, and that idiom is correct only on a `required` field — see [the None-State Model](#the-none-state-model). A non-disabled `<option value="">Real choice</option>` is a legitimate value: it renders in the list, is selectable, and displays as the current value when chosen.

### Searchable Select

By adding the `searchable` attribute, `nui-select` injects an inner search field that natively filters the dropdown list in real time.

```html
<nui-select searchable>
	<select name="country">
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

### Compact Select (Toolbars)

Add `size="small"` for the compact 2rem control — the same height as a standard `nui-button`, so it sits flush in a toolbar or card header instead of towering over the icon buttons. The host shrinks to its content rather than stretching to 100%, and the dropdown stays attached to the button.

```html
<nui-select size="small" aria-label="Block style">
	<select>
		<option value="prose">Standard Prose</option>
		<option value="band">Band</option>
	</select>
</nui-select>
```

Inside a `<nui-form-row>`, declare the size once on the row instead — `<nui-form-row size="small">` — and every child (select, input, tag input, button) resolves to the same 2rem. For a row that is the only workable form of the declaration, because `nui-button` has no size vocabulary: 2rem *is* its base height, while inputs and selects default to 2.5rem.

## The None-State Model

A single-value select mirrors the native `<select>` exactly: **there is no intrinsic "nothing selected" state.** Per the HTML spec, when no option carries selectedness the browser selects the first non-disabled option, and `selectedIndex` is `-1` only when no option can be selected at all. "Nothing chosen" is therefore expressed by an **option** — and that is exactly what makes it reachable again: the user picks the none-row like any other row.

| State | How it is expressed | Is it a value? | Can the user return to it? |
|-------|--------------------|----------------|---------------------------|
| **Prompt** (nothing chosen) | `<option value="" disabled selected>` — or the `placeholder` attribute | No — filtered out of `getValue()` and `nui-change` | **No.** Native: you may leave a disabled placeholder, never re-select it. |
| **None-choice** | `<option value="">— None —</option>` (**enabled**) | Yes — `''` | **Yes** — an ordinary selectable row. This is the way back. |
| **A real choice** | any option with a non-empty value | Yes | Yes |

`getValue()` mirrors native `select.value`, so it returns `''` for *both* the prompt and an enabled none-choice — by value alone the two are indistinguishable, exactly as in native HTML. Use **`hasValue()`** to tell them apart:

```javascript
select.hasValue(); // false → showing the prompt; true → a real option carries the selection
```

### Choosing an idiom

```html
<!-- Mandatory choice: the prompt is a one-way display state (native behaviour) -->
<nui-select placeholder="Choose a fruit...">
	<select>
		<option value="" disabled selected></option>
		<option value="apple">Apple</option>
	</select>
</nui-select>

<!-- "None" is a real answer the user can come back to -->
<nui-select placeholder="Choose a fruit...">
	<select>
		<option value="">— None —</option>
		<option value="apple">Apple</option>
	</select>
</nui-select>
```

- Mandatory choice → use the **prompt** idiom with `required` on the inner `<select>`. Error styling is never raised by a state sync: it appears on **blur** (the user engaged the field and left it), on **form submit** (native constraint validation), or when you call `validate()` — which also dispatches `nui-validate` with `{ valid, message }`. An untouched required select never renders as an error.
- **Never put a one-way prompt on an optional select.** If "nothing chosen" is not a valid answer, make the field mandatory or default it to a real option. If it *is* a valid answer, the none-state needs a real option the user can re-select. Left to judgement this is easy to get wrong — so the component does not leave it to judgement: in debug mode it logs a `console.warn` naming the prompt text whenever a disabled blank option is present without `required`. A select that opens unselected and can never return there is precisely the state that warning exists to catch.
- "None" as a legitimate answer → use an **enabled** blank option and label it as a none-choice. Never label a none-option with prompt text such as "Select a fruit..." — that is precisely what makes the two states look identical.
- If your domain genuinely uses `''` as a meaningful value (`<option value="">Local (default)</option>`), that option **is** the none-state: `clear()` selects it and the user can re-select it. There is no third representation.

### API consequences

| Call | Result on a single-value select |
|------|----------------------------------|
| `clear()` | Selects the none-choice if present, else the prompt, else the first selectable option (a native form reset). It never leaves `selectedIndex` at `-1`, because that state has no way back in the UI and does not even survive a browser reset. Logs a console warning when it has to fall back to the first option. |
| `setValue('')` / `setValue(null)` | Same as `clear()`. |
| `setValue(v)` | Selects the matching option. **Throws `RangeError`** when no option has that value, or when the option is disabled — a typo used to silently re-select the first option. |
| `setItems(items)` | Replaces the options; the browser then selects the first selectable option (native). Items are `{ value, label }` or a plain string — an object without `value` **throws `TypeError`** instead of creating an option whose value is the literal `"undefined"`. `loadOptions()` hands its result straight to `setItems()`, so map your API shape to `{ value, label }` inside the async function. |

> **Multi-select differs:** "nothing selected" is a real, stable state there (`getValue()` returns `[]`), so `clear()` simply empties the selection.

## The Dropdown Lives in the Top Layer

The popup is a **top-layer popover** (`popover="manual"`), positioned from the control's viewport rect. It can therefore be neither clipped nor displaced:

- **`overflow: hidden` on an ancestor cannot clip it.** That was the long-standing bug: app shells wrap content in a clipping container, and any card with a `border-radius` needs one, so the dropdown was sliced whenever it crossed a boundary. A higher `z-index` never helped — z-index orders painting, it does not escape a clip.
- **`position: fixed` would not have been enough either.** Fixed positioning escapes an ancestor's clip only while no ancestor establishes a *containing block* — any `transform`, `filter`, `backdrop-filter` or `contain` does, and app chrome (an animated sidebar, for instance) carries transforms. Top-layer elements escape both.
- **`z-index` is gone** from the popup, and `nui-select.is-open` no longer sets one. The top layer paints above all page content by definition.
- The popup is re-placed on open, on **scroll in any ancestor** (capture-phase listener) and on resize. Its `max-height` is clamped to the room actually available, so a tall list scrolls instead of running off the screen.
- `popup-width` / `popup-left` / `popup-right` / `popup-max-height` and `setPopup()` keep their meaning — insets relative to the control — and are now applied at placement time, so they survive scrolling too.

**Do not put `display` or `overflow` rules on `.nui-select-popup`.** Visibility is gated by the popover state (`:popover-open`); an author `display: none` would keep it hidden even when open. Use `popup-*` attributes or `setPopup()` for geometry, and never the `hidden` attribute — it is no longer used on this element.

> **Consumer workarounds to delete:** patches that forced `overflow: visible` on dialogs, tab panels or cards so a dropdown could escape. The popup now escapes on its own.

**Requirement:** the Popover API (Chrome/Edge 114+, Safari 17+, Firefox 125+). On an engine without it the component throws at setup rather than silently degrading into a clipped dropdown.

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
| `placeholder` | string | Prompt text shown when nothing is selected. Takes precedence over the disabled-blank-option idiom. Display text only — it is never a selectable row. See [the None-State Model](#the-none-state-model). |
| `size` | string | `"small"` gives the compact 2rem control for toolbars and card headers, and narrows the host to its content instead of stretching to 100%. Only the *height* is compact: the horizontal padding is the base control's (`var(--nui-space)`, which is also `button`'s), so a compact select and a compact button line their text up on the same inset rather than needing per-control tuning. Omit for the full-height form control (`--nui-form-row-height`, 2.5rem). |

## Programmatic Usage

Because the actual form values live natively inside the underlying `<select>`, you can either modify the DOM of the `<select>` directly and ask `nui-select` to resync, or use the component's exposed methods.

### DOM Methods

| Method | Parameters | Description |
|--------|------------|-------------|
| `setItems(items)` | `Array<Object>` | Programmatically rewrites the inner `<select>` tag options. Objects require `{ value, label }` or `{ group, options: [...] }`. Throws `TypeError` on an item without a `value`. |
| `getValue()` | none | The selected value (native `select.value`). Returns `''` for both the prompt and an enabled none-choice — see [the None-State Model](#the-none-state-model). |
| `hasValue()` | none | `true` only when a real option carries the selection (an enabled blank none-choice counts; a disabled prompt does not). Disambiguates the `''` returned by `getValue()`. |
| `setValue(v)` | value | Selects the matching option. `null`/`undefined`/`''` behave like `clear()`. Throws `RangeError` for an unknown or disabled value. |
| `clear()` | none | Returns the select to its "nothing chosen" representation — the none-choice, else the prompt, else the first selectable option. Multi-select empties the selection. |
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
| `nui-validate` | `CustomEvent` | Fires when `validate()` runs. Detail contains `{ valid, message }`. Not fired by blur or form submit — those only apply the `is-invalid` class. |