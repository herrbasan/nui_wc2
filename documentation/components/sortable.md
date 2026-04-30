# nui-sortable & nui-sortable-item

## Design Philosophy
The sortable component enables users to reorder items through an intuitive drag-and-drop interface. It uses FLIP (First, Last, Invert, Play) animation technique for smooth, performant visual transitions that feel natural and responsive across all devices.

## How It Works
The component handles the complexity of drag interactions including touch, mouse, and keyboard navigation. Each `<nui-sortable-item>` represents a draggable element within a `<nui-sortable>` container. The component tracks positions, calculates movements, and applies FLIP animations to create the illusion of elements sliding into their new positions.

Drag handles (using `nui-icon name="drag_indicator"`) provide a clear affordance for initiating drag operations. The `data-id` attribute on items ensures stable identity during reordering.

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

## Events
Listen for the `nui-sortable-change` event to respond to reordering:

```javascript
sortable.addEventListener('nui-sortable-change', (e) => {
    console.log('New order:', e.detail.order); // ['task-2', 'task-1', ...]
});
```

## When to Use
Use sortable when users need to prioritize, organize, or sequence items. Common scenarios include task prioritization, image galleries, playlist ordering, or any interface where item sequence carries meaning. The grid layout works well for dashboard widgets or photo arrangements.