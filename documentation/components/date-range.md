# nui-date-range

## Design Philosophy

`nui-date-range` pairs two native `<input type="date">` fields with an optional preset
select, and emits one normalized `nui-change` event whenever the range changes.

It exists because "which window am I looking at" is the first question every reporting
and analytics surface has to answer, and every app otherwise rebuilds the same three
pieces: a preset list, two date fields, and the reconciliation between them. The
component owns that reconciliation so a caller only ever handles
`{ from, to, preset }`.

**It is not a calendar widget.** The browser's own date picker is used as-is: the
component adds no popup, no grid, and no overlay. That keeps it keyboard- and
locale-correct for free and means it has no positioning or focus-trap surface to get
wrong. If you need a visual calendar, that is a different component.

## Declarative Usage

```html
<!-- Minimal — two date fields, no presets -->
<nui-date-range>
    <input type="date" data-nui-date-range="from">
    <input type="date" data-nui-date-range="to">
</nui-date-range>
```

The two inputs are **required and must be direct children**, each marked with
`data-nui-date-range="from"` / `"to"`. The marking is what distinguishes them from a
preset `<select>`, which is optional and unmarked.

### With presets

A `<select>` **inside** the component becomes the preset list. Wrap it in `<nui-select>`
to get NUI's dropdown styling; the component finds the inner `<select>` either way.

```html
<nui-date-range>
    <nui-select size="small" placeholder="Range">
        <select>
            <option value="" selected>Custom</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All time</option>
        </select>
    </nui-select>
    <input type="date" data-nui-date-range="from" aria-label="From">
    <input type="date" data-nui-date-range="to" aria-label="To">
</nui-date-range>
```

The component is self-contained: the preset select is a **child**, not a sibling. A
sibling `<nui-select>` would be found by neither the preset resolver nor the layout,
and the presets would silently never fire.

**Preset values** are `today`, `yesterday`, `7d`, `30d`, `90d` and `all`. Ranges are
inclusive on both ends, so `7d` is today plus the six days before it — seven days in
total. `all` clears both fields, and the empty string is the "no preset" state that
the component restores whenever a date is typed by hand.

An unrecognised preset value is ignored rather than throwing, so an app can ship a
preset before the library knows about it.
## Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `size` | string | – | `"small"` puts the whole control on the 2rem compact row. |
| `min` | string | – | Sets `min` on both inputs. |
| `max` | string | – | Sets `max` on the `to` input. |
| `now` | string | – | Anchors preset resolution to this `YYYY-MM-DD` date instead of the system clock. For deterministic rendering and tests. |

## Events

| Event | Detail | Description |
|-------|--------|-------------|
| `nui-date-range-change` | `{ from, to, preset }` | Bubbles. `from`/`to` are `YYYY-MM-DD` strings, or `''` when unbounded. `preset` is the preset key that produced the range, or `''` for a hand-entered or programmatic one. |

Fires on input, on change (picker close / keyboard commit), on preset selection, and
from `setValue()`.

⚠️ **The event is `nui-date-range-change`, not `nui-change`.** A preset
`<nui-select>` is a child, so its own `nui-change` (detail `{ values, labels, options }`)
bubbles straight through this element. A shared name would deliver two incompatible
payloads to one listener, and the inner one carries no `from`/`to` at all.

```javascript
document.querySelector('nui-date-range').addEventListener('nui-date-range-change', (e) => {
	console.log(e.detail); // { from: '2026-09-29', to: '2026-10-05', preset: '7d' }
});
```

## Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `getValue()` | – | `{ from, to }` | Current range. |
| `setValue(opts)` | `{ from, to, preset }` | – | Sets the range and emits `nui-change`. Passing `preset` resolves it against the current clock instead. |
| `clear()` | – | – | Empties both fields (equivalent to the `all` preset). |
| `getPreset()` | – | `string` | Current preset value, or `''`. |
| `setPreset(value)` | `string` | – | Selects a preset, resolves it, and emits. |

The preset methods are only installed when a `<select>` child is present.

## Behaviour worth knowing

**An inverted range is clamped, not emitted.** Typing a `from` later than the current
`to` pushes `to` up to match; typing a `to` earlier than the current `from` pulls
`from` down. The field the user is typing in wins, so their intent is preserved
instead of being silently overwritten. This keeps every emitted range well-formed —
a range that is reversed matches nothing and would otherwise look like a data outage.

**Hand-editing clears the preset.** A typed date is by definition outside the preset
set, so the component resets the select to its empty option rather than leaving it
displaying a range it no longer describes.

**`max` is applied to the `to` input only, `min` to both.** A range can legitimately
end in the future (a forecast) but not start in the past of your earliest data.

## Accessibility

Each input needs a label. Give them visible ones:

```html
<label for="dr-from">From</label>
<nui-date-range>
    <input type="date" id="dr-from" data-nui-date-range="from">
    <input type="date" id="dr-to" data-nui-date-range="to">
</nui-date-range>
```

Do not add a visible separator glyph between the fields — it is decoration, and each
labelled input already carries the meaning. If you do add one for visual balance, give
it `aria-hidden="true"`.

## Styling

Never style the component or its inputs. The wrapper is a flex row and the inputs
inherit the global bare-input treatment, so they line up with adjacent
`<nui-form-row>` controls at the same `--nui-form-row-height`.

**Put `size` on `<nui-date-range>`, never on the child `<nui-select>`.** The component
resolves its row height once, in its own scope, and hands that number to its children.
A `size` on the child re-declares the height variable in the *child's* scope, so the
select would drop to 2rem while the date inputs stayed at 2.5rem. The component
defends against this in CSS, but the wrapper attribute is the intended spelling.

```html
<!-- compact toolbar row — every control lands on 2rem -->
<nui-form-row size="small">
    <nui-select size="small" placeholder="Site"><select>…</select></nui-select>
    <nui-date-range size="small">
        <nui-select placeholder="Range"><select>…</select></nui-select>
        <input type="date" data-nui-date-range="from" aria-label="From">
        <input type="date" data-nui-date-range="to" aria-label="To">
    </nui-date-range>
    <nui-button><button type="button">Refresh</button></nui-button>
</nui-form-row>
```
