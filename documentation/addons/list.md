# nui-list

## Design Philosophy

`nui-list` is a virtualized scroller with integrated data operations (search, sort, filter). It renders only visible items (~10-20) regardless of dataset size, utilizing a virtualization algorithm to maintain optimal DOM performance even with massive lists.

## Declarative Usage

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| None | | | Configuration is strictly handled via the initialization options object. |

### Class Variants

None

## Programmatic Usage

### DOM Methods

| Method | Parameters | Description |
|--------|------------|-------------|
| `update` | `force: boolean` | Re-renders visible items in the viewport. |
| `updateData` | `data: Array, skipFilter?: boolean` | Replaces the data array and optionally skips re-evaluating filters. |
| `appendData` | `newData: Array` | Adds new items to the existing list (commonly used in log mode). |
| `getSelection` | `full: boolean` | Returns an array of selected indices, or full item objects if `full` is true. |
| `setSelection` | `indexArray: Array` | Sets the active selection using the provided original indices. |
| `getSelectedListIndex` | _none_ | Returns the index of the currently selected item within the filtered list. |
| `scrollToIndex` | `index: number` | Scrolls the viewport to make the specified filtered list index visible. |
| `updateItem` | `index: number, newData: object` | Updates a specific item in the list. |
| `updateItems` | `items: Array` | Updates multiple items in the list. |
| `reset` | _none_ | Resets list state. |
| `cleanUp` | _none_ | Removes event listeners and intersection observers. |

### Action Delegates

- None

### Events

| Event | Detail | Description |
|-------|--------|-------------|
| `selection` | `value: number` | Fired when the selection count changes via `options.events` callback. |
| `sort` | `index: number, direction: string` | Fired when the list sorting is updated via callback. |
| `filter` | `prop: string, value: string` | Fired when a filter dropdown value is changed via callback. |
| `search_input` | `value: string` | Fired when the search text is modified via callback. |
| `visibility` | `value: boolean` | Fired when the list enters or leaves the visible viewport via callback. |

