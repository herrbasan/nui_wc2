# nui-file-tree

## Setup

This is an addon module. Load both the JS and CSS before use:

```html
<link rel="stylesheet" href="NUI/css/modules/nui-file-tree.css">
<script type="module" src="NUI/lib/modules/nui-file-tree.js"></script>
```

## Design Philosophy

File explorers are a recurring need in desktop-style applications, but the
filesystem itself is never the hard part — presentation, lazy expansion,
selection, and keyboard navigation are. `nui-file-tree` owns exactly those
concerns and nothing more.

The component is **filesystem-agnostic**: it never touches `fs`, the File
System Access API, or any I/O. The host supplies a `readdir` provider function
and the tree handles the rest. The same component therefore works in a browser
(File System Access API), in Electron (native `fs` via IPC), or against any
remote/virtual filesystem (HTTP, WebDAV, git trees) — only the adapter differs.

Children are fetched **lazily on first expansion**, so huge directory trees
cost nothing until explored. State lives in the DOM (ARIA treeview attributes),
per NUI conventions.

## Data Shapes

**Provider entry** (what `readdir(path)` must resolve to — an array of):

```javascript
{ name: 'README.md', path: 'docs/README.md', kind: 'file' }
{ name: 'docs',      path: 'docs',             kind: 'dir'  }
```

`path` must be unique within the tree — it is the node's identity (selection,
expansion, refresh all key on it). Malformed entries throw immediately.

**Static node** (for `loadData` — nested, `path` optional, auto-derived):

```javascript
{
	name: 'project', kind: 'dir', children: [
		{ name: 'docs', kind: 'dir', children: [
			{ name: 'SPEC.md', kind: 'file' }
		]},
		{ name: 'README.md', kind: 'file' }
	]
}
```

## Declarative Usage

```html
<nui-file-tree selectable="all" aria-label="Project files">
	<nav></nav>
</nui-file-tree>
```

The element wraps a native `<nav>` (auto-created in dev with an info log, like
all NUI components). Content is populated programmatically — there is no
declarative tree markup; use `loadData()` for static structures.

## Programmatic Usage

### Dynamic tree (provider)

```javascript
const tree = document.querySelector('nui-file-tree');

tree.setProvider(async (path) => {
	const entries = await readdirSomehow(path);
	return entries; // [{ name, path, kind: 'dir'|'file' }]
});

await tree.setRoot({ name: 'my-folder', path: '' });
```

**File System Access API adapter** (browser, Chromium):

```javascript
const dirHandle = await window.showDirectoryPicker();

tree.setProvider(async (path) => {
	let dir = dirHandle;
	for (const seg of path.split('/').filter(Boolean)) {
		dir = await dir.getDirectoryHandle(seg);
	}
	const entries = [];
	for await (const child of dir.values()) {
		entries.push({
			name: child.name,
			path: path ? `${path}/${child.name}` : child.name,
			kind: child.kind === 'directory' ? 'dir' : 'file'
		});
	}
	return entries;
});

await tree.setRoot({ name: dirHandle.name, path: '' });
```

### Static tree

```javascript
tree.loadData({ name: 'project', kind: 'dir', children: [ /* nested nodes */ ] });
```

### Filtering and sorting

```javascript
tree.filter = ['.md', '.markdown'];  // array: filters FILES only, dirs always pass
tree.filter = (entry) => entry.kind === 'dir' || !entry.name.startsWith('.'); // fn: every entry
tree.filter = null;                  // default: show everything

tree.sort = (a, b) => a.name.localeCompare(b.name); // default: dirs first, natural alpha
```

An extension-array filter applies to files only — filtering out directories
would make the tree unnavigable. Changing `filter` or `sort` triggers a
`refresh()`.

### Factory

```javascript
const tree = await nui.components.fileTree.create('#container', {
	provider: myReaddir,
	root: { name: 'root', path: '' },
	selectable: 'files',
	filter: ['.md']
});
```

## API Reference

| Member | Type | Description |
|--------|------|-------------|
| `setProvider(fn)` | method | Set `(path) => Promise<entries>`. Required before `setRoot()`. |
| `setRoot({ name, path })` | async method | Open a dynamic root via the provider. |
| `loadData(rootNode)` | method | Render a static nested tree. No provider needed. |
| `refresh(path?)` | async method | Re-fetch the tree (or one directory), preserving expansion state. |
| `expand(path)` / `collapse(path)` / `toggle(path)` | methods | Expansion control. Path must be loaded — throws otherwise. |
| `select(path)` | method | Programmatic selection. Path must be loaded. |
| `getSelected()` | method | Selected entry `{ name, path, kind }` or `null`. |
| `filter` | property | `fn(entry)` or extension array or `null` (default). |
| `sort` | property | Comparator or `null` (default dirs-first alpha). |
| `selectable` | attribute | `all` (default) \| `files` \| `dirs` — controls what click/Enter selects. |

## Events

| Event | Detail | Description |
|-------|--------|-------------|
| `nui-file-select` | `{ entry }` | Row selected (click or keyboard). |
| `nui-file-activate` | `{ entry }` | File double-clicked or Enter — "open this". |
| `nui-file-context` | `{ entry, x, y }` | Right-click (native menu suppressed; pair with `nui-context-menu`). |
| `nui-tree-error` | `{ entry, error }` | Provider rejected for a directory. The node shows a "Failed to load" row and can be retried by re-expanding. |

All events bubble.

## Keyboard Navigation (ARIA treeview)

Roving tabindex — one tab stop for the whole tree.

| Key | Action |
|-----|--------|
| `↑` / `↓` | Move between visible rows |
| `→` | Expand dir, or move to first child |
| `←` | Collapse dir, or move to parent |
| `Enter` / `Space` | File: select + activate. Dir: select (if allowed) + toggle |
| `Home` / `End` | First / last visible row |

## Error Handling

- **Missing provider** at `setRoot()` → throws.
- **Malformed provider entries** → throws (the contract is internal once the
  provider is set).
- **Provider rejection** (external boundary — permissions, network, deleted
  folders) → tolerated with a trace: `nui-tree-error` event, console error,
  and a visible "Failed to load" row. Collapsing and re-expanding retries.
- **Stale async responses** (root changed while a fetch was in flight) are
  discarded via a generation counter.
