# File List (`nui-file-list`)

## Setup

`nui-file-list` is an addon, and it renders [`nui-file-icon`](file-icon.md) in every row — so load both.

```html
<link rel="stylesheet" href="NUI/css/modules/nui-file-icon.css">
<link rel="stylesheet" href="NUI/css/modules/nui-file-list.css">
<script type="module" src="NUI/lib/modules/nui-file-icon.js"></script>
<script type="module" src="NUI/lib/modules/nui-file-list.js"></script>
```

## Design Philosophy

One component for both ends of the same need: the files just dropped into an upload zone, and the document library they eventually live in. What differs between those contexts is the action set and whether a status is shown — not the structure. So the action set is configurable, the status is optional, and the row is the same either way.

Two deliberate limits:

- **It reports, it does not own.** The host owns the file array. `remove` and `download` have sensible built-in defaults, but every action is dispatched as a cancellable event first, and reordering reorders the component's copy and reports the result rather than reaching into your data.
- **It renders no control that cannot act.** A `download` action is skipped for a file with no `url`, the same way the clear row in `nui-select` is only rendered when a none-state exists.

## Quick Start

```html
<nui-file-list id="files"></nui-file-list>
```

```javascript
document.getElementById('files').loadData([
	{ name: 'release-notes.md', size: 18432, url: '/files/release-notes.md' },
	{ name: 'quarterly-report.pdf', size: 1843200, url: '/files/report.pdf' },
	{ name: 'brand/logo.svg', size: 5120 }        // no url → no download button
], { actions: ['download', 'remove'] });
```

## File Objects

| Property | Type | Description |
|----------|------|-------------|
| `name` | string | **Required.** Shown as the row title; also drives the file-type icon. |
| `size` | number \| string | A byte count is formatted (`1843200` → `1.8 MB`); a string is shown verbatim. |
| `url` | string | Where to download from. Without one, the `download` action is not rendered. |
| `detail` | string | Extra text for the second line, before the size. Space-separated as `detail · size`. |
| `status` | string | Rendered as a badge. `done`/`uploaded` → success, `uploading`/`pending`/`queued` → info, `failed`/`error` → danger, `paused` → warning. An unmapped value renders a neutral badge. |
| `id` | string | Identity for reordering. Defaults to `name`. |

## Options

`loadData(files, options)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `actions` | `string[]` | `['download', 'remove']` | Which per-row actions to render. Known keys: `download`, `remove`, `preview`, `open`. An unknown key is allowed — the host handles it — and gets a generic icon. |
| `sortable` | boolean | `false` | Enables drag reordering. |
| `emptyText` | string | `'No files'` | Message when the list is empty. |
| `onAction` | `Function(action, file, index)` | `null` | Convenience callback, in addition to the events. |

## Actions and the Cancel Contract

A row action fires **two** events before anything happens, both cancellable:

1. `nui-file-action` — the catch-all, `detail: { action, file, index }`
2. `nui-file-<action>` — per-action, same detail

`preventDefault()` on **either** suppresses the built-in behaviour. The defaults are:

- `remove` — removes the file from the list, then fires `nui-file-removed`
- `download` — only when `file.url` exists; triggers a download of `url` as `name`

Everything else is left to the host.

```javascript
files.addEventListener('nui-file-remove', e => {
	e.preventDefault();                      // keep it in the list
	confirmDialog(e.detail.file.name);
});
```

## Sortable

`sortable: true` makes each row a `<nui-sortable-item>` inside a `<nui-sortable>` — **a core component, not an addon**, so this adds no second import. Dragging starts from the `.drag-handle` icon only, which keeps the row's own buttons clickable and its text selectable.

The component reorders *its own* copy and reports the result as `nui-file-reorder` with `{ files, order }`. Cancel it and the rows snap back to the previous order — the escape hatch for a host that owns the sequence (a server-side order, a fixed priority).

```javascript
files.addEventListener('nui-file-reorder', async e => {
	const ok = await saveOrder(e.detail.files.map(f => f.name));
	if (!ok) e.preventDefault();              // rows return to their old positions
});
```

## Events

| Event | Detail | Fires |
|-------|--------|-------|
| `nui-file-action` | `{ action, file, index }` | Any row action, before the default. Cancellable. |
| `nui-file-<action>` | `{ action, file, index }` | Per-action, before the default. Cancellable. |
| `nui-file-removed` | `{ file, index }` | After a file has been removed. |
| `nui-file-reorder` | `{ files, order }` | After a drag. Cancellable — cancelling restores the old order. |

## Methods

| Method | Parameters | Description |
|--------|------------|-------------|
| `loadData(files, options)` | `Array`, `Object` | Replace the list and options. **Throws `TypeError`** if `files` is not an array. |
| `addFiles(files)` | `Array` | Append to the current list. Throws `TypeError` on a non-array. |
| `removeFile(fileOrIndex)` | `Object \| number` | Remove one entry. Returns `false` when it is not present. |
| `getFiles()` | none | A copy of the current list. |
| `clear()` | none | Empty the list. |

## Common Patterns

### Upload staging list

```javascript
const staging = document.querySelector('#staging');
staging.loadData([], { actions: ['remove'] });

dropzone.addEventListener('nui-files-added', e => {
	staging.addFiles(e.detail.files.map(f => ({ name: f.name, size: f.size, status: 'queued' })));
});
```

Update a status later by reloading or by replacing the entry — the component renders from its array, so `staging.getFiles()` is the source for your own progress map.

### Document library

```javascript
library.loadData(documents, { actions: ['download', 'remove'], sortable: true });
```

## When to Use

**Use `nui-file-list` when:**
- Staging files before an upload or after a drop
- Showing a document library with per-file actions
- You need reorderable file rows

**Use something else when:**
- You need a hierarchical browser — use [`nui-file-tree`](file-tree.md)
- You need thousands of virtualized rows — use [`nui-list`](list.md) with `nui-file-icon` in your render function
