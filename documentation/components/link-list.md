# nui-link-list

## Design Philosophy

Navigation lists are the backbone of application wayfinding. NUI provides both declarative HTML and data-driven JavaScript APIs to accommodate different content sources.

The component transforms structured data (or structured HTML) into accessible navigation with keyboard support, active state management, and collapsible groups.

## Data-Driven Usage

For dynamic navigation loaded from configuration or APIs:

```javascript
const navData = [
	{
		label: 'Main Menu',
		items: [
			{ label: 'Dashboard', href: '#dashboard', icon: 'dashboard' },
			{ label: 'Settings', href: '#settings', icon: 'settings' }
		]
	},
	{
		label: 'Documents',
		items: [
			{ label: 'Overview', href: '#docs' },
			{ label: 'API Reference', href: '#api' }
		]
	}
];

const nav = nui.components.linkList.create(navData, { mode: 'fold' });
document.querySelector('nui-sidebar').appendChild(nav);
```

The `mode` option controls group behavior:
- **fold** - Only one group open at a time (accordion style)
- **tree** - Multiple groups can be open simultaneously

## Active State Management

The component automatically highlights the link matching the current URL hash. It sets `aria-current="page"` for accessibility and applies visual styling.

```javascript
// Set active link manually
linkList.setActive('#dashboard');
```

## Declarative Usage

For static navigation, write the HTML directly:

```html
<nui-link-list mode="fold">
	<nav>
		<details open>
			<summary>Main Menu</summary>
			<ul>
				<li><a href="#dashboard">Dashboard</a></li>
				<li><a href="#settings">Settings</a></li>
			</ul>
		</details>
	</nav>
</nui-link-list>
```

The structure uses `<details>`/`<summary>` for groups, providing native collapsibility before JavaScript enhances it.


## Row Actions

A row can carry a trailing control that is **not** navigation. It renders as a sibling of the link (or of the group toggle), so clicking it never activates or expands the row. Available on group headers and on leaf items, at any depth.

Declarative form — a `<button class="action">` inside the `<li>`:

```html
<li class="group-header">
	<span>
		<nui-icon name="folder"></nui-icon>
		<span>Group Name</span>
	</span>
	<button type="button" class="action" data-action="edit-section:group">
		<nui-icon name="settings"></nui-icon>
	</button>
</li>
```

Data-driven form — `rowAction` on the item, either a data-action string or `{action, icon, label}`:

```javascript
{
	label: 'Content & Windows',
	icon: 'wysiwyg',
	rowAction: { action: 'edit-section:content', icon: 'settings', label: 'Edit section' },
	items: [
		{ label: 'Content', rowAction: 'edit-item:content' }
	]
}
```

`icon` defaults to `settings`; `label` (the `aria-label`) defaults to `"Settings"`. The row action is dimmed at rest and lifts to full opacity on hover or keyboard focus, so it does not compete with the row's label.

Because it is an icon-only control, pair it with an [`nui-tooltip`](tooltip.md) carrying the explanation. For a procedurally generated row, inject the tooltip adjacent to the button after `loadData()` — the tooltip host is `position: fixed`, so it adds nothing to the row's layout:

```javascript
const tooltip = document.createElement('nui-tooltip');
tooltip.textContent = 'Edit section — Content & Windows';
row.querySelector('button.action').after(tooltip);
```

To handle the action itself, register a handler with `nui.registerAction(name, fn)`. It resolves before the generic events and receives the target, the action element, the event, and the param after the colon:

```javascript
nui.registerAction('edit-section', async (target, el, event, param) => {
	const { dialog, main } = await nui.components.dialog.page('Edit section', '', {
		buttons: [
			{ label: 'Cancel', type: 'outline', value: 'cancel' },
			{ label: 'Save', type: 'primary', value: 'save' }
		]
	});
	// ...populate `main`, then read the outcome from nui-dialog-close
});
```

With no registered handler, the action instead fires the bubbling `nui-action` and `nui-action-<name>` events on the button. The legacy key `headerAction` is still accepted as an alias of `rowAction`, but only `rowAction` also works on leaf items.

## Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `mode` | string | `"tree"` | Controls whether multiple groups can be expanded simultaneously (`"tree"`) or if expanding one group collapses the others (`"fold"`). **Overridden to `"fold"` when the list is inside a `<nui-sidebar>`** — `nui-sidebar` sets the attribute itself if none is authored. Setting `mode="tree"` there is valid on a valid attribute, throws nothing, and looks plausible on screen, but the sidebar wins. |

## Programmatic API

| Method | Parameters | Return Type | Description |
|--------|------------|-------------|-------------|
| `loadData(data)` | `Array` | `void` | Renders the link list dynamically from a JSON array of `{label, items, href, icon, separator, action, rowAction}`. `action` is the link's own data-action; `rowAction` adds a trailing control (see Row Actions). |
| `setActive(selector)` | `string \| Element` | `boolean` | Programmatically marks a specific link as active (applies styling and ARIA attributes), and automatically expands its parent groups if collapsed. |
| `getActive()` | none | `Element \| null` | Returns the currently active anchor element. |
| `getActiveData()` | none | `Object \| null` | Returns an object containing the active element, its `href`, and its `text` content. |
| `clearActive(closeAll)` | `boolean` | `void` | Clears the active selection state. If `closeAll` is true, it also collapses all open groups. |

## Events

| Event | Detail Payload | Description |
|-------|----------------|-------------|
| `nui-active-change` | `{ element, href, text }` | Fired whenever the active selected link changes natively (via click) or programmatically. |
## Keyboard Navigation

Link lists implement roving tabindex:
- Tab focuses the list itself
- Arrow keys navigate between items
- Enter/Space activates links
- Right/Left expands/collapses groups

This reduces tab stops while keeping full accessibility.
