# nui-date-range

## Design Philosophy

`nui-date-range` pairs two native `<input type="date">` fields with an optional preset
select, and emits one normalized `nui-date-range-change` event whenever the range
changes.

It exists because "which window am I looking at" is the first question every reporting
and analytics surface has to answer, and every app otherwise rebuilds the same three
pieces: a preset list, two date fields, and the reconciliation between them. The
component owns that reconciliation so a caller only ever handles
`{ from, to, preset }`.

**Two presentations, one value store.** The default is the inline pair of native date
fields — no popup, no grid, no positioning to get wrong, and the browser's own picker
stays keyboard- and locale-correct for free. Add the `calendar` attribute and those
same two fields become a button and a month grid. The inputs are hidden rather than
replaced, so every behaviour below is shared verbatim between the modes and the
attribute can be toggled without losing state.

## Calendar Mode

Add the `calendar` attribute and the two date inputs collapse into a single button that
shows the resolved range. Opening it gives a two-column workstation panel: the month
grid on the left, preset chips plus the manual range fields and the Apply / Cancel
actions on the right.

```html
<nui-date-range calendar>
    <nui-select placeholder="Range">
        <select>
            <option value="" selected>Custom</option>
            <option value="7d">Last 7 days</option>
            <option value="all">All time</option>
        </select>
    </nui-select>
    <input type="date" data-nui-date-range="from" aria-label="From">
    <input type="date" data-nui-date-range="to" aria-label="To">
</nui-date-range>
```

**The two date inputs stay in the DOM and keep holding the value** — calendar mode
hides them, it does not replace them. Clamping, `nui-date-range-change`, `getValue`,
`setValue` and the preset list are the same code in both modes, and a host can add or
remove the attribute without losing state.

The panel is an `<nui-popover>`, so it is a top-layer element: no ancestor's
`overflow: hidden` can clip it and no scroll container traps it.

### Draft and commit

**Nothing in the panel changes the value until Apply.** Picking days, dragging, typing
into the manual fields and clicking a preset chip all edit a *draft*; the committed
range is untouched the whole time and no `nui-date-range-change` fires. This is what
makes Cancel possible — and it means `getValue()` returns the committed range while the
panel is open, not whatever is currently being tried out.

| Closing by | Draft |
|------------|-------|
| **Apply** | committed, emits `nui-date-range-change`, focus returns to the trigger |
| **Cancel** | discarded, focus returns to the trigger |
| **Escape** | discarded, focus returns to the trigger |
| **clicking outside** | discarded, focus stays where you clicked |

The preset selection travels with the draft, so a chip's identity survives Apply and
comes back out as `detail.preset`; picking days by hand clears it again, for the same
reason typing in the inline mode does.

### The range band

The selected span is **one continuous bar**, not a row of pills. Each day's band spans
the full cell so neighbours meet without a seam, and only the two outer ends are
rounded — a radius on every day would make the span unreadable. The endpoints are
marked by their rounded ends; today is a filled dot whether or not it falls in the
range, so "where am I now" is answerable at a glance.

### Bounded calendars

`min` and `max` disable days outside the window, and month paging is **clamped to the
months that still contain selectable days**. Paging into a fully disabled month is a
dead end: the grid renders, nothing is selectable, and keyboard focus has nowhere to
land. The nav buttons disable at the limits rather than making them a silent no-op.

```html
<nui-date-range calendar min="2026-09-16" max="2026-10-05"> … </nui-date-range>
```

### Keyboard

| Key | Action |
|-----|--------|
| `←` `→` | Move one day |
| `↑` `↓` | Move one week |
| `Home` / `End` | Start / end of the week |
| `PageUp` / `PageDown` | Previous / next month, clamped to the selectable range |
| `Enter` / `Space` | Pick the start, then the end |
| `Escape` | Discard a half-made pick, restore what was there on open, return focus to the trigger |

The grid is a roving-tabindex composite: exactly one day is in the tab order at a time
and the arrows move within it. Focus is **restored across every re-render** — the grid
is rebuilt wholesale, so without that the focused day would be destroyed, focus would
fall to `<body>`, and every subsequent keypress (Escape, a second `PageUp`, another
arrow) would go to the document instead of the panel, leaving it keyboard-dead after a
single key.

### Selection

A backwards drag or a backwards second click is **ordered, not rejected** — the pair
comes out `min → max`. A reversed window matches nothing and reads as an empty result
set, which is a worse outcome than quietly swapping the ends.

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
| `calendar` | boolean | – | Renders the calendar popover instead of the inline date inputs. |
| `size` | string | – | `"small"` puts the whole control on the 2rem compact row. |
| `min` | string | – | Sets `min` on both inputs; in calendar mode, disables earlier days. |
| `max` | string | – | Sets `max` on the `to` input; in calendar mode, disables later days. |
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
| `setValue(opts)` | `{ from, to, preset }` | – | Sets the range and emits `nui-date-range-change`. Passing `preset` resolves it against the current clock instead. |
| `clear()` | – | – | Empties both fields (equivalent to the `all` preset). |
| `getPreset()` | – | `string` | Current preset value, or `''`. |
| `setPreset(value)` | `string` | – | Selects a preset, resolves it, and emits. An unrecognised value is a complete no-op. |
| `setDensity(data, opts)` | `object, object?` | – | Calendar mode only. Supplies a `{ 'YYYY-MM-DD': number }` density map (or array) to mark days by traffic volume (`data-density="1..4"`, `opts.max` overrides the normalisation ceiling). Rendered as a small bar under the date number, **not** as a cell background — a filled cell would be indistinguishable from a selected range. |
| `openCalendar()` | – | – | Calendar mode only. Opens the panel programmatically. |

The preset methods are only installed when a `<select>` child is present. `setPreset()`
ignores a value that has no matching `<option>` **before writing anything** — assigning
an unknown value to a native `<select>` silently clears its selection, which would
leave the dropdown showing a preset that no longer matches the range on screen.

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
