# nui-list

## Setup

`nui-list` is an addon module. Load both the JS and CSS before use:

```html
<link rel="stylesheet" href="NUI/css/modules/nui-list.css">
<script type="module" src="NUI/lib/modules/nui-list.js"></script>
```

## Design Philosophy

`nui-list` is a virtualized scroller that renders only the visible portion of large datasets (~10-20 DOM elements regardless of total size). It integrates search, sort, filter, and selection directly into the component, so you don't need to wire up external controls.

The component uses two rendering modes automatically:
- **Normal mode** (<1000 items): Standard scroll-position tracking.
- **Fixed mode** (1000+ items): Percentage-based scroll calculation for smoother performance with very large datasets.

All data operations (search, sort, filter) work against a cloned internal array, preserving your original data intact.

## Quick Start

A list requires three things: a container with explicit height, a `<nui-list>` element, and a `loadData()` call.

### 1. Container with Height

The list fills its container via absolute positioning. The container must have `position: relative` and a definite height:

```html
<div style="position: relative; height: 500px;">
    <nui-list id="myList"></nui-list>
</div>
```

### 2. Data and Render Function

```javascript
const products = [
    { id: 1, name: 'Wireless Headphones', category: 'Electronics', price: 129 },
    { id: 2, name: 'Cotton T-Shirt', category: 'Clothing', price: 29 },
    // ...
];

function renderProduct(item) {
    const el = document.createElement('div');
    el.className = 'product-item';
    el.innerHTML = `
        <div class="name">${item.name}</div>
        <div class="category">${item.category}</div>
        <div class="price">$${item.price}</div>
    `;
    return el;
}

document.getElementById('myList').loadData({
    data: products,
    render: renderProduct
});
```

### 3. Declarative Template Alternative

For simple cases, use a `<template data-item>` with `{{key}}` placeholders instead of a render function:

```html
<nui-list id="myList">
    <template data-item>
        <div class="product-item">
            <span>{{name}}</span>
            <span>${{price}}</span>
        </div>
    </template>
</nui-list>

<script>
document.getElementById('myList').loadData(products);
</script>
```

When calling `loadData(array)` with a plain array (no options object), the component looks for a `<template data-item>` inside the element.

---

## Configuration

`loadData()` accepts an options object with these properties:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `data` | `Array<Object>` | `[]` | **Required.** Array of data objects. Your data structure is preserved; the list adds internal `oidx` (original index) tracking. |
| `render` | `Function(item) → HTMLElement` | *(none)* | **Required** unless using `<template data-item>`. Called once per visible item. Must return an `HTMLElement`. |
| `search` | `Array<{prop: String}>` | *(none)* | Enables a search input in the header. Each entry specifies a property to search within. Case-insensitive. Example: `[{ prop: 'name' }, { prop: 'category' }]` |
| `sort` | `Array<{label, prop, numeric?, dir?}>` | *(none)* | Enables a sort dropdown in the header. `numeric: true` for numeric sort. `dir: 'desc'` for descending default. |
| `sort_default` | `Number` | `0` | Index into `sort` array for the initially active sort column. |
| `sort_direction_default` | `'up' \| 'down'` | `'up'` | Initial sort direction. |
| `filters` | `Array<{prop, label, options, default?}>` | *(none)* | Enables filter dropdowns. Each filter maps a data property to selectable options. An "All" option (`__all__`) is auto-prepended. Supports dot-notation for nested props. |
| `footer` | `Object` | *(none)* | Enables a footer bar. Shape: `{ buttons_left: [{label, fnc, type?}], buttons_right: [{label, fnc, type?}] }`. Footer also displays selection count. |
| `logmode` | `Boolean` | `false` | Auto-scrolls to bottom. Used for logs, chat, streaming data. User scroll pauses auto-scroll; it resumes when scrolled back to bottom. |
| `multiple` | `Boolean` | `false` | Every click toggles selection without requiring Ctrl. |
| `single` | `Boolean` | `false` | Disables multi-selection entirely (no Shift+Click, no Ctrl+Click). |
| `events` | `Function(eventObj)` | `() => {}` | Centralized event callback. See Events section below. |
| `verbose` | `Boolean` | `false` | Enables console logging with `[NUI-LIST]` prefix for debugging. |

### Full Configuration Example

```javascript
list.loadData({
    data: products,
    render: renderProduct,

    search: [
        { prop: 'name' },
        { prop: 'category' }
    ],

    sort: [
        { label: 'Name (A-Z)', prop: 'name' },
        { label: 'Price (Low-High)', prop: 'price', numeric: true },
        { label: 'Price (High-Low)', prop: 'price', numeric: true, dir: 'desc' }
    ],

    filters: [
        {
            prop: 'category',
            label: 'Category',
            options: [
                { value: 'Electronics', label: 'Electronics' },
                { value: 'Clothing', label: 'Clothing' },
                { value: 'Home', label: 'Home' }
            ]
        }
    ],

    footer: {
        buttons_left: [
            { label: 'Delete Selected', type: 'danger', fnc: () => {
                const selected = list.getSelection();
                console.log('Deleting indices:', selected);
            }}
        ],
        buttons_right: [
            { label: 'Export CSV', type: 'primary', fnc: () => {
                console.log('Exporting...');
            }}
        ]
    },

    events: (e) => {
        if (e.type === 'selection') {
            console.log(`${e.value} items selected`);
        }
    }
});
```

---

## Selection

Click an item to select it. Click again to deselect. The list supports standard desktop selection modifiers:

| Interaction | Behavior |
|-------------|----------|
| **Click** | Selects a single item; deselects if clicking the only selected item. |
| **Shift+Click** | Range select from last selected item to clicked item. |
| **Ctrl+Click** | Toggle individual item without clearing other selections. |
| **Alt+Click** | Debug — logs the item's data to console. |

**Modes:**
- **Default**: Standard selection with Shift/Ctrl modifiers.
- `single: true`: Only one item selectable at a time. No Shift/Ctrl behavior.
- `multiple: true`: Every click toggles without needing Ctrl.

```javascript
// Single-selection mode
list.loadData({ data, render, single: true });

// Get selection (returns array of original indices)
const indices = list.getSelection();

// Get full item objects instead
const items = list.getSelection(true);
```

---

## DOM Structure

The component builds this structure internally. You don't author this HTML, but understanding it helps with CSS targeting:

```
<nui-list>
  <div class="nui-list-header">          ← Auto-shown when search/sort/filters are configured
    <div class="nui-list-sort">
      <nui-select>...</nui-select>       ← Sort dropdown
      <button class="nui-list-sort-direction up/down">  ← Sort direction toggle
      <nui-select class="nui-list-filter-select">       ← Filter dropdown(s)
    </div>
    <nui-input type="search">            ← Search bar
  </div>
  <div class="nui-list-body">
    <div class="nui-list-viewport">      ← Scrollable area
      <div class="nui-list-container">   ← Height = total items × itemHeight
        <!-- .nui-list-item elements positioned absolutely -->
      </div>
    </div>
  </div>
  <div class="nui-list-footer">          ← Auto-shown when footer is configured
    <div class="nui-list-footer-left">   ← Action buttons
    <div class="nui-list-footer-center">
      <div class="nui-list-footer-info"> ← "X of Y selected"
    </div>
    <div class="nui-list-footer-right">  ← Action buttons
  </div>
</nui-list>
```

Items are positioned absolutely with `style.top` set to `index × itemHeight`. Only visible items exist in the DOM. The rendering loop runs via `requestAnimationFrame` and pauses automatically when the list scrolls off-screen (tracked via `IntersectionObserver`).

---

## Programmatic API

### Methods

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `loadData(dataOrOptions)` | `Array` or `Object` | `void` | Initialize with data. Pass a plain array (requires `<template data-item>`) or a full options object. |
| `update(force?)` | `force: Boolean` | `void` | Re-render visible items based on current scroll position. Pass `true` to force re-render even if scroll hasn't changed. |
| `updateData(data?, skipFilter?)` | `Array, Boolean` | `void` | Replace the entire data array and rebuild. Set `skipFilter = true` to skip re-applying filters. |
| `appendData()` | none | `void` | Append items added to `options.data` beyond the current `clone.length`. Preserves selection and scroll position. Re-filters if search/sort is active. Used for log mode and streaming. |
| `getSelection(full?)` | `full: Boolean` | `Array` | Returns array of original indices. If `full = true`, returns objects `{ oidx, el, data, selected }`. |
| `setSelection(indices)` | `Number \| Number[]` | `void` | Set selection by filtered-list index. Accepts single number or array. Clears previous selection. Scrolls to first selected item. |
| `getSelectedListIndex()` | none | `Array<Number>` | Returns filtered-list indices (not original indices) for selected items. |
| `scrollToIndex(index)` | `Number` | `void` | Scroll the viewport so the item at the given filtered-list index is visible. |
| `updateItem(idx, data?, force?)` | `Number, Object, Boolean` | `void` | Update a single item by original data index. Nullifies its DOM element to force re-render on next `update()`. |
| `updateItems(items, force?)` | `Array<{idx, data}>` | `void` | Batch update multiple items. |
| `updateOptions(newOptions)` | `Object` | `void` | Merge new options into existing config. Rebuilds header if search/sort/filters changed. |
| `reset()` | none | `void` | Scroll to top (or bottom in logmode), clear selection, reset scroll tracking. |
| `cleanUp()` | none | `void` | Remove all event listeners, disconnect IntersectionObserver, clear intervals, empty data. **Call before removing the element from DOM.** |

### Read-only Properties

| Property | Type | Description |
|----------|------|-------------|
| `data` | `Array` | Reference to `options.data`. |
| `clone` | `Array<{oidx, el, data, selected}>` | Working copy with element refs and selection state. |
| `filtered` | `Array` | Current filtered + sorted subset of `clone`. |
| `currentSearch` | `String` | Active search term. |
| `currentSort` | `Object` | Active sort column from `options.sort`. |
| `currentOrder` | `'up' \| 'down'` | Current sort direction. |
| `currentFilters` | `Object` | Map of filter prop → current value. |
| `itemHeight` | `Number` | Detected item height in pixels (default 60). |

---

## Events

All events are delivered through the `events` callback function. The callback receives a single object with `{ target, type, ... }`.

| `type` | Additional fields | When fired |
|--------|-------------------|------------|
| `'selection'` | `value` (count), `items` | User clicks/selects an item. `value` is the total number of selected items. |
| `'sort'` | `index`, `direction` | Sort column or direction changed via the dropdown. |
| `'filter'` | `prop`, `value` | A filter dropdown value changed. |
| `'search_input'` | `value` | Search input value changed (before debounce). |
| `'list'` | `value: 'filtered'` or `'reset'` | After filter pass completes, or on `reset()`. |
| `'visibility'` | `value: true/false` | IntersectionObserver detects the list entering or leaving the viewport. |
| `'height_change'` | `value` (new height) | Detected that rendered item height differs from expected. |
| `'list_cleanUp'` | `value: 'cleanup'` | During `cleanUp()`. |

```javascript
list.loadData({
    data: products,
    render: renderProduct,
    events: (e) => {
        switch (e.type) {
            case 'selection':
                console.log(`${e.value} items selected`);
                break;
            case 'sort':
                console.log(`Sort by index ${e.index}, direction ${e.direction}`);
                break;
            case 'filter':
                console.log(`Filter ${e.prop} = ${e.value}`);
                break;
            case 'search_input':
                console.log(`Searching: ${e.value}`);
                break;
            case 'visibility':
                console.log(`List ${e.value ? 'visible' : 'hidden'}`);
                break;
        }
    }
});
```

---

## Common Patterns

### Log / Chat Mode

Auto-scrolls to show new entries. Add items to `options.data` and call `appendData()`:

```javascript
const logData = [];
const logList = document.querySelector('#logList');

logList.loadData({
    data: logData,
    render: (item) => {
        const el = document.createElement('div');
        el.innerHTML = `<span>${item.time}</span> <span>${item.message}</span>`;
        return el;
    },
    logmode: true
});

// Add entries over time
function addLogEntry(message) {
    logData.push({ id: logData.length, message, time: Date.now() });
    logList.appendData();
}
```

### Dynamic Data Updates

Replace the entire dataset or update individual items:

```javascript
// Replace all data
list.updateData(newProducts);

// Update a single item (by original index)
list.updateItem(42, { ...products[42], price: 99 });

// Batch update
list.updateItems([
    { idx: 0, data: { ...products[0], price: 19 } },
    { idx: 5, data: { ...products[5], price: 29 } }
]);
```

### Lazy Image Loading

Return an element with an `update` method to lazy-load images when they scroll into view:

```javascript
render: (item) => {
    const el = document.createElement('div');
    el.innerHTML = `<img src="" alt="${item.name}">`;
    const img = el.querySelector('img');
    el.update = () => {
        img.src = `thumbnails/${item.imageId}.jpg`;
    };
    return el;
}
```

The list calls `el.update()` each time the element is recycled (scrolled into view).

### Cleanup Before Removal

Always call `cleanUp()` before removing the list element from the DOM to prevent memory leaks:

```javascript
element.hide = () => {
    list.cleanUp();
};
```

---

## When to Use

**Use `nui-list` when:**
- Rendering more than ~100 items that would cause DOM bloat
- You need integrated search, sort, and filter controls
- Building log viewers, chat windows, or streaming data displays
- Handling large datasets (1000+) where scroll performance matters

**Avoid when:**
- Fewer than ~50 items (use standard HTML lists or `nui-sortable`)
- You need complex layouts per item (grid cards, variable heights) — `nui-list` uses fixed item heights
- Items need drag-and-drop reordering (use `nui-sortable` instead)
