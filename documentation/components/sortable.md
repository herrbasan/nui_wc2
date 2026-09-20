# nui-sortable & nui-sortable-item

## Design Philosophy
The sortable component enables users to reorder items through an intuitive drag-and-drop interface. It uses FLIP (First, Last, Invert, Play) animation technique for smooth, performant visual transitions that feel natural and responsive across all devices.

## How It Works
The component handles the complexity of drag interactions including touch, mouse, and keyboard navigation. Each `<nui-sortable-item>` represents a draggable element within a `<nui-sortable>` container. The component tracks positions, calculates movements, and applies FLIP animations to create the illusion of elements sliding into their new positions.

Drag handles (using `nui-icon name="drag_indicator"`) provide a clear affordance for initiating drag operations. The `data-id` attribute on items ensures stable identity during reordering.

## Behavior Rules

- **Handle-only drag.** If an item contains a `.drag-handle`, only pointerdown on the handle starts a drag; clicks elsewhere in the item (text, inputs, selects) never do. Items without a handle drag from anywhere non-interactive.
- **Drag threshold.** A pointer must move ~4px before the drag state engages, so plain clicks never fire reorder events.
- **Midpoint insertion.** The drop position is decided by the pointer's position relative to the hovered item's midpoint — Y for vertical lists, X for `horizontal`/`grid` layouts. (Not by the placeholder's current index: the placeholder is in flow, so index-relative decisions feed layout shifts back into the hit-test and oscillate.)
- **Nesting.** Sortables may nest (e.g. items inside an item's own list). The innermost `nui-sortable` owning the item under the pointer owns the gesture; outer lists ignore it. Item lists are direct-children-scoped, so outer lists never see inner items in events or `getItems()`.
- **Auto-scroll.** During a pointer drag, hovering within ~80px of the scroll parent's top/bottom edge scrolls it in that direction, speed ramping linearly with proximity (up to ~18px/frame at the edge). Scrolling continues with a stationary pointer (rAF-driven), placement re-evaluates each tick, and the dragged item stays glued to the pointer. The scroll parent is the nearest scrollable ancestor, falling back to the document.
- **Keyboard.** Space/Enter grabs and drops, arrow keys move, Escape cancels and restores the original position. Grab/drop/move are announced via `a11y.announce`.

## Usage Patterns

### Basic Sortable List
Create a sortable list with draggable items:

```html
<nui-sortable id="my-list">
        <nui-sortable-item data-id="task-1">
                <span class="drag-handle"><nui-icon name="drag_indicator"></nui-icon></span>
                <span style="flex: 1;">Task content</span>
                <button data-action="sortable-item-delete">
                        <nui-icon name="close"></nui-icon>
                </button>
        </nui-sortable-item>
        <!-- more items... -->
</nui-sortable>
```

### Horizontal Layout
Use `data-layout="horizontal"` for row-based ordering:

```html
<nui-sortable data-layout="horizontal">
        <nui-sortable-item data-id="h1">Item 1</nui-sortable-item>
        <nui-sortable-item data-id="h2">Item 2</nui-sortable-item>
</nui-sortable>
```

### Grid Layout
Use `data-layout="grid"` for two-dimensional reordering:

```html
<nui-sortable data-layout="grid">
        <nui-sortable-item data-id="g1">1</nui-sortable-item>
        <nui-sortable-item data-id="g2">2</nui-sortable-item>
        <!-- grid items... -->
</nui-sortable>
```

### Programmatic Control
The component exposes methods for dynamic manipulation:

```javascript
const sortable = document.getElementById('my-list');

// Get current items
const items = sortable.getItems(); // [{ id, element }, ...]

// Add new items
sortable.addItem(`<nui-sortable-item data-id="new">...</nui-sortable-item>`);

// Replace all items
sortable.setItems([htmlString1, htmlString2]);

// Clear all items
sortable.clear();
```


## Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `data-layout` | string | `"vertical"` | Dictates the animation and drop calculation math. Options: `"horizontal"`, `"grid"`. Omit or use `"vertical"` for standard lists. |

## Programmatic API

| Method | Parameters | Return Type | Description |
|--------|------------|-------------|-------------|
| `getItems()` | none | `Array<{id, element}>` | Returns an array of objects representing the current DOM order of items. `id` maps to the `data-id` attribute. |
| `addItem(htmlString)` | `string` | `void` | Appends a new `<nui-sortable-item>` to the end of the list using raw HTML string. |
| `setItems(htmlStrings)` | `string[]` | `void` | Clears the list and replaces it entirely with an array of HTML strings. |
| `clear()` | none | `void` | Empties the sortable container. |

## Events

| Event | Detail Payload | Description |
|-------|----------------|-------------|
| `nui-sortable-change` | `{ order: string[] }` | Fired when a drag-and-drop operation concludes and the order has changed. `order` is an array of `data-id` values matching the new DOM sequence. |

## Action Delegates

| Action | Description |
|--------|-------------|
| `sortable-item-delete` | When placed on a button inside a `<nui-sortable-item>`, removes that item from the list with FLIP animation. |

## When to Use
Use sortable when users need to prioritize, organize, or sequence items. Common scenarios include task prioritization, image galleries, playlist ordering, or any interface where item sequence carries meaning. The grid layout works well for dashboard widgets or photo arrangements.
