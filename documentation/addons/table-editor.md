# nui-table-editor

> **Status: complete.** Mechanism and interaction feel are both signed off. The
> feel-check was closed by sampling the demo at
> `#page=experiments/table-editor` — ten-plus rounds, every round finding real
> defects. The abandoned first attempt remains at
> `#page=experiments/dropped-table-editor` for contrast.

## Setup

This is an addon module. Load both the JS and CSS before use:

```html
<link rel="stylesheet" href="NUI/css/modules/nui-table-editor.css">
<script type="module" src="NUI/lib/modules/nui-table-editor.js"></script>
```

## Design Philosophy

The editing surface *is* the rendered product. At rest the component shows an
ordinary NUI table — no framing, no toolbar, no handles. Structure and controls
appear on hover and focus, and leave again.

Two rules drive every visual decision:

- **The table is the model.** There is no shadow copy of the data. A host can
  enhance a `<table>` it already owns, and the saved HTML stays clean.
- **The accent is not a state colour.** `--color-highlight` is reserved for links
  and primary action. Selection, focus and "on" states use neutral surface steps
  (`--color-shade3`, `--text-color-dim`), so a table under edit never becomes the
  loudest thing on the page.

The table's appearance is **not** restated here. `nui-theme.css` already styles
`table`/`th`/`td`, and the component wraps slotted markup in `<nui-table>` so the
shared surface and responsive behaviour apply. The addon CSS only adds what
editing requires.

## Declarative Usage

### Structure

```html
<nui-table-editor>
    <table>
        <thead>
            <tr>
                <th data-align="left">Item</th>
                <th data-align="right">Price</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td data-align="left">Keyboard</td>
                <td data-align="right">$129.99</td>
            </tr>
        </tbody>
    </table>
</nui-table-editor>
```

A bare `<table>` is wrapped in `<nui-table>` automatically; a table you already
wrapped yourself is left alone. With no table at all, a 1×1 default is created.

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `editable` | boolean | `true` | `editable="false"` gives grips and structure controls without making cells editable. |

### Cell Attributes

| Attribute | Values | Description |
|-----------|--------|-------------|
| `data-align` | `left` \| `center` \| `right` | Per-column alignment. Serializes to the GFM delimiter row. |

Alignment is an **attribute, never an inline style** — it must survive a round
trip through Markdown and back.

## Programmatic Usage

### Enhancing a table in place

Hosts that own their own markup (rich-text, block editors) enhance a table
directly. No wrapper element is added, so the host's saved output is untouched:

```javascript
import { setupTableEditor } from 'NUI/lib/modules/nui-table-editor.js';

const editor = setupTableEditor(document.querySelector('table'));
editor.exportMarkdown();  // → GFM pipe table
editor.refresh();         // re-apply attributes and re-measure
editor.destroy();         // remove all chrome, restore the DOM
```

`options.chromeHost` sets which ancestor the overlay anchors to — required when
the table's parent is a scroll container that would clip the chrome.

### Inside a contenteditable host

If the table has a `contenteditable` ancestor, the component **adds UI only**. It
never sets `contenteditable` and never takes over keys: editability and keyboard
handling stay with the host. Pass `editable: false` to be explicit.

### The wrapper element API

```javascript
const el = document.querySelector('nui-table-editor');
el.table;             // the <table>
el.exportMarkdown();  // GFM pipe table string
el.isHeader;          // boolean
el.refresh();
```

### Events

The component keeps **no history**. Undo is host-owned: it emits `nui-change`
and the host snapshots.

| `detail.type` | Emitted when | Extra detail |
|--------------|--------------|--------------|
| `content` | Cell text changed (debounced 300ms) | `cell` |
| `structure` | Row/column added, deleted, pasted | `action` |
| `align` | Column alignment changed | `value`, `column` |
| `header` | Header row toggled | `action` |
| `reorder` | Row or column dragged | `kind`, `from`, `to` |

```javascript
table.addEventListener('nui-change', (e) => {
    if (e.detail.type === 'structure') save();
});
```

### GFM export

`exportMarkdown()` returns a GitHub Flavored Markdown pipe table. GFM has exactly
one header row, so a headerless table is emitted with an empty header to stay
valid. Alignment becomes the delimiter row:

```markdown
| Component | Status | Lines |
| :--- | :---: | ---: |
| nui-button | Stable | 184 |
```

## Interaction

| Action | Result |
|--------|--------|
| Hover a row / column | That row's and column's grips appear — only those two |
| Click a cell | Select + edit; the top zone opens with alignment and header controls |
| **Drag across cells** | Selects the rectangle you swept — the primary way to select several cells |
| <kbd>Shift</kbd>+click | Extend the selection into a range |
| Click a row / column grip | Selects that whole row / column |
| Toggle **Header row** | Moves the first row in and out of `<thead>`, converting its cells `td`↔`th`. Off means an ordinary body row — unbolded, unshaded — and the GFM export emits an empty header. |
| <kbd>Tab</kbd> / <kbd>Shift</kbd>+<kbd>Tab</kbd> | Walk cells; <kbd>Tab</kbd> past the last cell appends a row |
| <kbd>Enter</kbd> | Move down a row |
| <kbd>Esc</kbd> | Clear the selection |
| Drag a grip | Reorder the row or column, with a drop line |
| Click an edge `+` | Append a row (bottom) or column (right) |
| Paste TSV | Grows the grid and fills it — spreadsheet paste works |

Arrow keys move between cells only at a text boundary; otherwise they stay
available to your own cursor movement.

### The selection gesture

Press a cell and drag across cells to sweep a rectangle. The gesture does **not**
begin on press — it begins the moment the pointer crosses into a *different*
cell. A drag that stays inside one cell is ordinary text selection and stays
that way, so you can still highlight a word in a cell.

The selection is drawn as **one border around the whole range**, not a border per
cell. N adjacent boxes read as N things; a single outline reads as one thing,
which is what a selection is.

### One range is the model

A single cell, a whole row, a whole column and a rectangle are all the same
object — `{ minRow, maxRow, minCol, maxCol }`, where row `-1` is the header. Click,
<kbd>Shift</kbd>+click, the drag gesture and a grip click all write the same
value, so they cannot disagree with one another. Alignment in the zone applies to
**every column** the range touches, which is what "align this block" means.

### Chrome geometry

All panel-style controls live in **one overlay zone above the table's top edge**.
It grows upward, is capped at ~4rem, and never displaces the table or the
document. It is a floating pill — a one-device-pixel `--border-shade1` edge plus
elevation. Grips and edge `+` buttons are positional: they sit at their own row,
column or edge, and the zone is lifted clear of the column grips rather than
covering them.

The zone never animates its own height. `height: 0 → auto` cannot be
interpolated, so the browser snaps it — that snap was the component's worst
flicker. Because the zone is absolutely positioned, a full-size box at rest costs
the document nothing, so it only fades and lifts.

Motion rules: the selection outline tracks the pointer **exactly** while a drag
is drawing it (an eased outline is not polish, it is lag) and is eased for
keyboard and programmatic changes. `prefers-reduced-motion` removes transitions
without hiding chrome.

### State tokens
Overridable per element or host scope:

| Token | Default | Controls |
|-------|---------|----------|
| `--nte-select-bg` | `color-mix(--color-highlight 18% / 24%, --color-shade1 / --color-shade2)` | Selected cell fill |
| `--nte-select-text` | `--text-color` | Text on a selected cell |
| `--nte-active-ring` | `--text-color-dim` | Caret ring and keyboard focus |
| `--nte-on-bg` | `--color-shade4` | Pressed toggle / selected grip |
| `--nte-on-text` | `--text-color` | Text on a pressed control |
| `--nte-drop-line` | `--text-color-dim` | Drag drop indicator |

The selection is the per-cell backdrop and **nothing else**. There is no outline
around the range: layered on a filled block it was a second indicator saying the
same thing, and the cells' own grid lines already bound the rectangle. One way of
saying "selected" beats three.

The one remaining ring is the **caret** — the cell holding the keyboard. It is
hairline, at `--border-thickness`, and inset by the same amount so it sits on the
grid line rather than floating inside the cell.

Selection is the one state that carries the accent — it is the component's
primary output, and a neutral fill read as a tint rather than a selection. The
caret ring stays neutral so "these cells" and "the keyboard is here" remain two
different signals. To go back to a fully neutral scheme, override
`--nte-select-bg` and `--nte-active-ring`; nothing else needs to change.

> The text colour is **not** forced to white. The selection fill is an opaque
> accent-tinted surface, so the theme text colour is already correct in both
> schemes — 13.1:1 in light, 8.6:1 in dark. Forcing white would be the bug.
>
> **Mix toward the surface, not toward `transparent`.** A low-alpha wash
> (`color-mix(accent 10%, transparent)`) looks wrong, and the reason is worth
> knowing: alpha compositing shifts the accent's channels by different amounts
> depending on what is underneath, so over the near-black dark surface 10% of a
> mid-blue collapses to a muddy grey-blue that reads as dirt on the table rather
> than a colour. Mixing toward the surface keeps the hue and the contrast
> predictable, and gives one flat colour per scheme that is unambiguously the
> accent. The ratio is higher in dark (24% vs 18%) because a dark surface needs
> more of the accent to register as a tint.

> Selection uses an accent backdrop, not a neutral surface step: a shade-based
> fill is either invisible in dark mode (the table surface *is* shade2 there) or
> too weak to read as a selection in light.
>
> The caret ring is declared with `--border-thickness`, not a fixed pixel value.
> Chrome quantises border-width to whole **device** pixels, so at a 1.5 ratio a
> `1px` border measures 0.667px — which is exactly what the theme's cell borders
> measure too. Referencing the same token is what keeps the ring matching the
> grid; a hardcoded `2px` rounds *up* to a whole device pixel and renders
> visibly heavier, not proportionally heavier.

## Icons used

`add` (edge `+` buttons), `drag_indicator` (row/column grips),
`view_column` (header toggle), and `format_align_left` / `format_align_center` /
`format_align_right` (the alignment segmented control).

The three `format_align_*` symbols follow the existing marks' construction — a
full-width rule on top, ragged rules below — so they sit with the rest of the icon
set instead of looking like a different family. The control was originally
CSS-drawn glyphs; the sprite symbols replaced them at the user's preference, which
keeps every icon in this component on one system.

> The sprite is a **generated artefact** — `assets/generate_icon_sprite.py` builds
> it from `assets/Material_Icons/*.svg`, so anything hand-written into the sprite
> is erased on the next run. Adding an icon means adding a source file and
> rebuilding; `Agents.md` has the procedure and the checks. A missing icon renders
> as **nothing at all**, with no console error.

### Accessibility

- Grips and edge buttons are icon-only, so each carries an `aria-label`; the zone
  is a `role="toolbar"`, the alignment group a `role="group"`.
- Alignment and header toggles expose `aria-pressed`.
- Cells are real `<th>`/`<td>` and reachable by keyboard; focus is never trapped.
- `prefers-reduced-motion` removes transitions without hiding chrome.

## Notes

- Column widths are **not** editable: no storage format expresses them yet. The
  named future candidate is a proportional `weights=[…]` idiom in the md-blocks
  spec, never `width=`.
- The responsive card fallback of `nui-table` is **opted out of** inside the
  editor. Stacked cards have no column left to grip, and every grip would point
  at nothing.
