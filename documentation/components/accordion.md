# nui-accordion

## Design Philosophy

Accordions and tabs solve similar problems (too much content for the available space) but with different trade-offs. While tabs show one panel at a time with navigation always visible, accordions:
- Allow multiple sections open simultaneously
- Show section headers even when collapsed
- Work better for mobile where horizontal tab space is limited

NUI's accordion uses the native `<details>`/`<summary>` elements as its foundation. This provides:
- Built-in accessibility and keyboard support (`Enter`/`Space` to toggle)
- Works inherently without JavaScript (progressive enhancement)

## Declarative Usage

```html
<nui-accordion>
	<details>
		<summary>First Section</summary>
		<div class="accordion-content">
			<p>Content for the first section</p>
		</div>
	</details>
	<details>
		<summary>Second Section</summary>
		<div class="accordion-content">
			<p>Content for the second section</p>
		</div>
	</details>
</nui-accordion>
```

### Attributes

| Attribute | Type    | Default | Description |
|-----------|---------|---------|-------------|
| `exclusive` | boolean | `false` | When present, expanding one `<details>` natively enforces the other sibling `<details>` blocks to close. Mimics traditional tab behavior. |
| `no-animation` | boolean | `false` | When present, disables smooth height transitions. Bypasses JavaScript animation override in favor of instant native open/close behavior. |

### Class Variants

- **`.nui-accordion-clean`**: Removes the outer borders and background colors, ideal for nesting or minimalist UI without boundaries.

## Programmatic Usage

You can control `nui-accordion` sections both declaratively via `data-action` or procedurally via code.

### DOM Methods

Below are the JavaScript methods available on the `<nui-accordion>` element:

| Method | Parameters | Description |
|--------|------------|-------------|
| `toggle(index)` | `index: number` | Programmatically toggles the state of the `<details>` component at the provided 0-based integer position. Uses animation when animations are enabled. |
| `expandAll()` | none | Opens all `<details>` sections. Ignored if `exclusive` mode is enabled. |
| `collapseAll()` | none | Closes all `<details>` sections. |

### Action Delegates

NUI provides declarative bindings via `data-action`. Assign these to triggers inside or outside the accordion:

| Action | Description |
|--------|-------------|
| `accordion-toggle:{index}@{selector}` | Triggers `toggle(index)` on the target accordion. Example: `accordion-toggle:1@#my-accordion`. |
| `accordion-expand-all@{selector}` | Triggers `expandAll()` on the target accordion. |
| `accordion-collapse-all@{selector}` | Triggers `collapseAll()` on the target accordion. |

### Collapsing All Sections Manually

Since `collapseAll()` operates on standard `<details>` elements, you can also collapse all sections without the action delegate:

```javascript
document.querySelectorAll('#my-accordion details').forEach(d => d.open = false);
```
