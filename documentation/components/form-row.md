# nui-form-row

## Design Philosophy

A form row is a **layout** concern, not a control: it places inputs, selects, tag inputs and buttons side by side at one uniform height. The element exists because that uniform height cannot be expressed per control.

`nui-button` has no `size` vocabulary — 2rem *is* its base height — while `nui-input` and `nui-select` default to 2.5rem. Two controls of different vocabularies therefore cannot be sized to match from the control side. The row is the only place where both can be reconciled, because it owns the height they resolve against.

## Declarative Usage

```html
<nui-form-row>
	<label for="name">Name</label>
	<nui-input>
		<input type="text" id="name" placeholder="Enter username">
	</nui-input>
	<nui-button variant="primary">
		<button type="button">Save</button>
	</nui-button>
</nui-form-row>
```

### Compact rows

`size="small"` drops the whole row to 2rem. Declare it **on the row**, never per control:

```html
<nui-form-row size="small">
	<nui-select><select aria-label="Status"><option>All</option></select></nui-select>
	<nui-input><input type="search" placeholder="Search" aria-label="Search"></nui-input>
	<nui-button><button type="button">Go</button></nui-button>
</nui-form-row>
```

Every child — select, input, tag input **and** button — resolves to the same 2rem. A per-control `size="small"` can never line a row up on its own, because the button's height is not a size you can set.

## Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `size` | string | — | `"small"` sets the compact 2rem row height for every child. |

## Notes

- The row is `display: flex` with `flex-wrap: wrap` and a `--nui-space` gap, so it wraps rather than overflowing when the controls do not fit.
- Children get `min-height: var(--nui-form-row-height)` (2.5rem by default, 2rem when compact). Direct children that are form controls get an exact height.
- The row does not bind a label to its control. Use `nui-input-group` when a control needs its own label, description and validation state — the two elements are independent and can be nested.
- Inside a `nui-date-range`, the preset `<select>` must be a **child** of the date range, not of the row.

📖 **Related:** [`nui-input-group`](input.md) for label + control + description, [`nui-select`](select.md) for the dropdown contract.
