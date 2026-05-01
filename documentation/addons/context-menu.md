# Context Menu (`nui-context-menu`)

## Setup

This is an addon module. Load both the JS and CSS before use:

```html
<link rel="stylesheet" href="NUI/css/modules/nui-context-menu.css">
<script type="module" src="NUI/lib/modules/nui-context-menu.js"></script>
```

## Design Philosophy

The context menu module is a **programmatic-only API** for creating floating popup menus. Unlike most NUI components, it is *not* a custom element you declare in HTML. It is a factory function that returns a menu controller you can show and hide via JavaScript.

This design choice reflects the nature of context menus: they are ephemeral, highly position-dependent, and triggered by specific user interactions (like a right-click) rather than being part of the static document structure.

Context menus reuse the same styling and positioning logic as `nui-menu` dropdowns. The visual appearance is consistent, and the keyboard navigation (arrow keys, Enter, Escape) is identical.

## Programmatic Usage

### Factory Pattern

```javascript
import { contextMenu } from '../NUI/lib/modules/nui-context-menu.js';

// 1. Define the menu
const menu = contextMenu([
	{ label: 'Cut', action: 'cut', shortcut: 'Ctrl+X', icon: 'content_cut' },
	{ label: 'Copy', action: 'copy', shortcut: 'Ctrl+C', icon: 'content_copy' },
	{ label: 'Paste', action: 'paste', shortcut: 'Ctrl+V', disabled: true },
	{ type: 'separator' },
	{ label: 'Select All', action: 'select-all', shortcut: 'Ctrl+A' }
], {
	onAction: (action, item) => {
		console.log(`Executed action: ${action}`, item);
	}
});

// 2. Bind to an event (e.g. right-click)
document.addEventListener('contextmenu', (e) => {
	e.preventDefault();
	menu.show(e.clientX, e.clientY);
});
```

### With Submenus (Nested Items)

Context menus can have unlimited nested submenus (though UX best practices suggest limiting to 2-3 levels). 

```javascript
const formatMenu = contextMenu([
	{
		label: 'Text Size',
		items: [
			{ label: 'Small', action: 'size-small' },
			{ label: 'Medium', action: 'size-medium' },
			{ label: 'Large', action: 'size-large' }
		]
	},
	{ type: 'separator' },
	{ label: 'Settings', action: 'open-settings' }
]);
```

---

## Data Structure

Menu items are constructed using plain JavaScript objects with a specific shape.

| Property | Type | Description |
|----------|------|-------------|
| `label` | `String` | **Required.** The visible text of the menu item. |
| `action` | `String` | **Required** (if no `items`). The action ID passed to the `onAction` callback when clicked. |
| `type` | `'separator'` | Special property. If `type: 'separator'`, it renders a dividing line (ignores all other fields). |
| `shortcut` | `String` | Optional text displayed right-aligned (e.g., `"Ctrl+S"`). purely visual. |
| `icon` | `String` | Optional NUI icon name. Renders a `<nui-icon>` to the left of the label. |
| `disabled` | `Boolean` | Optional. If `true`, grays out the item and prevents activation/clicking. |
| `items` | `Array` | Optional array of nested menu items. Turns this item into a submenu trigger. |

---

## API Reference

### `contextMenu(items, options)`

Creates a new context menu instance. Opening a menu automatically closes any existing context menus globally on the page.

#### Parameters

- **`items`**: `Array` — An array of menu item objects as defined above.
- **`options`**: `Object`
    - `onAction(action, item)`: Called when a leaf item is clicked or activated via Enter.
    - `onSubmenuOpen(label)`: Called when a submenu opens.

#### Returns: Menu Controller Object

The factory function returns an object with the following methods:

| Method | Parameters | Description |
|--------|------------|-------------|
| `show(x, y)` | `x: number, y: number` | Spawns the context menu at the exact viewport coordinates requested (e.g., from a `MouseEvent.clientX/Y`). Automatically flips to stay on-screen if too close to an edge. |
| `showAt(element, align?)` | `element: Element`, `align: String` | Spawns the menu anchored to a specific DOM element (like a button). |
| `hide()` | *(None)* | Programmatically closes the menu. |

---

## Keyboard Navigation

Full keyboard accessibility is built into the module:
- **Arrow Up / Down**: Navigate between items in the current menu level.
- **Arrow Right**: Open a submenu (if focused on an item with children).
- **Arrow Left**: Close the current submenu and return focus to the parent menu item.
- **Enter**: Activate the focused item.
- **Escape**: Close the entire context menu tree.