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
- **The accent is not a state colour.** `--color-highlight` is reserved for links,
  primary action, and **affordances that announce a clickable target** — selection,
  focus and "on" states use neutral surface steps (`--color-shade3`,
  `--text-color-dim`), so a table under edit never becomes the loudest thing on
  the page. The one place the accent appears is the 1px rule the edge `+` bands
  draw on hover: that is a transient, pointer-driven announcement of where a
  click will land, not a state the table is in. The distinction is *editing state*
  versus *available action*.

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
| Click a cell | Select + edit; the top zone opens with alignment, header and insert controls |
| **Drag across cells** | Selects the rectangle you swept — the primary way to select several cells |
| <kbd>Shift</kbd>+click | Extend the selection into a range. Extending to the first and last cell of a row or column **selects the whole band**, which is what reveals its drag grip and delete `×` |
| Click a row / column grip | Selects that whole row / column |
| Toggle **Header row** | Moves the first row in and out of `<thead>`, converting its cells `td`↔`th`. Off means an ordinary body row — unbolded, unshaded — and the GFM export emits an empty header. |
| **Insert Row / Column** | Inserts a row or column **after** the selected band, and selects it. <kbd>Ctrl</kbd>+click inserts **before** instead |
| <kbd>Ctrl</kbd>+<kbd>C</kbd> on a band | Copy the whole row band or column band. Requires the band to be fully selected — a single cell or a rectangle does **not** copy, so ordinary text copy is never overridden |
| **Paste** | Inserts a copy of the copied band after the selection (<kbd>Ctrl</kbd>+click before it) and selects it. The button appears only once something has been copied |
| <kbd>Tab</kbd> / <kbd>Shift</kbd>+<kbd>Tab</kbd> | Walk cells; <kbd>Tab</kbd> past the last cell appends a row |
| <kbd>Enter</kbd> | Move down a row |
| Arrow keys | Move between cells; <kbd>ArrowUp</kbd> off the first body row reaches the header. Suppressed while text is selected |
| <kbd>Esc</kbd> | Clear the selection |
| Drag a grip | Reorder the row or column, with a drop line |
| Click a band's `×` | Delete that whole row band or column band |
| Paste TSV | Grows the grid and fills it — spreadsheet paste works |

Arrow keys move between cells, and are suppressed while text is selected so
your own cursor movement still works. The horizontal pair additionally yields to
a caret that is not at the start or end of the cell, so <kbd>ArrowLeft</kbd> and
<kbd>ArrowRight</kbd> edit text before they change cells. The vertical pair is
not boundary-gated: a cell has no vertical text edge to be at.

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
document. It is a floating pill — a one-device-pixel `--border-shade2` edge plus
elevation — **centred over the table**, and it holds a **fixed width**: nothing
about the current selection may resize it, or the controls slide sideways out
from under the pointer that is reaching for them.

The zone sits close to the table, and lifts only when a **column** grip is in the
band above the top edge, which is the one thing that occupies it. Row grips sit
beside the table, not above it, and the drop lines stay inside the table's own
box, so a row selection keeps the close gap. The lift animates — a snap would
read as a glitch at the moment the grip appeared.

Grips are positional: each sits at its own row or column, **outside** the table.
A column band's grip is above the table, a row band's is to its left, and each
band's delete `×` sits at the **opposite** end — a column's below the table, a
row's to its right. Two reasons: a drag and a delete are not equivalent in
consequence, so they should not be a click apart; and bracketing the band reads
as "these act on this whole thing". The delete acts on the whole band for the
same reason the drag does — a handle covering three rows that removed only the
first would be lying.

Deleting the **last** remaining row or column does not remove it: the cells are
cleared instead, because a table with no body row has no height to hover and the
editor would become unreachable.

### Insert position

Insert lives in the toolbar rather than on the table's edge because **position is
the feature**. An edge affordance can only mean "at the end"; here the insertion
point is the selection, so a plain click inserts after the band you are looking
at and <kbd>Ctrl</kbd>+click inserts before it. One control, one modifier, both
directions — rather than a second button for the mirror case.

The new row or column is **selected** after insertion, not merely created: the
insertion point is worth confirming, and the fresh selection is also where the
user is about to type.

Note for hosts: inserting a column into a table with a header row creates a `th`
in `<thead>`, not a `td`. A cell's tag is a property of the section it sits in.

### Copy and paste are band-only

Deliberately. A single cell and a rectangle both **refuse** to copy, and the
component leaves <kbd>Ctrl</kbd>+<kbd>C</kbd> entirely alone when they are
selected. Two reasons, and the second is the important one:

1. A band is the unit this component reasons in — one range, one grip, one delete.
   Copying a single cell would introduce a second unit for the same selection, and
   paste would then have to guess which of the two it was.
2. **A user highlighting a word inside a cell to copy it is doing ordinary text
   copy.** Silently substituting a column copy for that would be the more
   surprising failure of the two. Nothing is lost either way: the band copy also
   writes TSV to the system clipboard, so a copied column pastes into a
   spreadsheet intact.

The component keeps its own copy — cells, axis, and per-column alignment — rather
than round-tripping through the system clipboard, which carries only a flat
string. Alignment travelling with the copy is the reason: a right-aligned number
column pasted back left-aligned is a copy with its meaning stripped off. The
system clipboard is written as a side effect for interop, not as the mechanism.

The **Paste** button appears only once something has been copied. A clipboard
control that is always present but usually inert has to be read before it can be
used; one that appears the moment <kbd>Ctrl</kbd>+<kbd>C</kbd> works is the
component reporting its own state.

The band is a real `<button>`, which means every state the theme paints for
`button` has to be undone deliberately — `button:hover` fills with
`--color-highlight` at a higher specificity than any class selector, and its
`min-width`/`min-height` floor would cap the band at 2rem. Any restyling here
must keep the explicit `background: none` on hover and the `min-*: 0` on the base
rule.

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
