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

## Keyboard Navigation

Link lists implement roving tabindex:
- Tab focuses the list itself
- Arrow keys navigate between items
- Enter/Space activates links
- Right/Left expands/collapses groups

This reduces tab stops while keeping full accessibility.