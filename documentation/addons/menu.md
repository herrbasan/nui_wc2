# nui-menu

## Setup

This is an addon module. Load both the JS and CSS before use:

```html
<link rel="stylesheet" href="NUI/css/modules/nui-menu.css">
<script type="module" src="NUI/lib/modules/nui-menu.js"></script>
```

## Design Philosophy

This component implements the W3C ARIA menubar pattern, providing application-style menu navigation with dropdowns and nested submenus. It prioritizes keyboard accessibility and predictable behavior over visual complexity, following VS Code's interaction model for familiarity.

### How It Works
The component creates a menubar where each top-level button opens a dropdown menu. Key architectural decisions:

- **Element reuse** - Dropdown containers are created once and repositioned, not recreated
- **State machine** - Clear states (idle, open, hovering) prevent common menu bugs
- **Roving tabindex** - Keyboard navigation follows the ARIA pattern exactly
- **ARIA compliance** - Full support for menubar, menu, and menuitem roles

## Declarative Usage

Define menus with semantic HTML:

```html
<nui-menu>
    <nav>
        <button>File</button>
        <ul>
            <li><button data-action="new-file">New File</button></li>
            <li><button data-action="open">Open...</button></li>
            <li class="separator"></li>
            <li><button data-action="exit">Exit</button></li>
        </ul>
        <button>Edit</button>
        <ul>
            <li><button data-action="cut">Cut</button></li>
            <li><button data-action="copy">Copy</button></li>
        </ul>
    </nav>
</nui-menu>
```

### Keyboard Navigation
| Key | Action |
|-----|--------|
| Left/Right | Navigate between menubar items |
| Down | Open menu and focus first item |
| Up | Open menu and focus last item |
| Enter/Space | Activate item or open submenu |
| Escape | Close menu and return to menubar |
| Home/End | Jump to first/last item |

### Attributes

None

### Class Variants

None

## Programmatic Usage

Create menus dynamically with the same data structure as `nui-link-list`:

```javascript
const menuData = {
    items: [
        {
            label: 'File',
            items: [
                { label: 'New File', action: 'new-file', shortcut: 'Ctrl+N' },
                { label: 'Open...', action: 'open', shortcut: 'Ctrl+O' },
                { type: 'separator' },
                { label: 'Exit', action: 'exit' }
            ]
        },
        {
            label: 'Edit',
            items: [
                { label: 'Cut', action: 'cut', shortcut: 'Ctrl+X' },
                { label: 'Copy', action: 'copy', shortcut: 'Ctrl+C' }
            ]
        }
    ]
};

const menu = document.createElement('nui-menu');
menu.loadData(menuData);
document.body.appendChild(menu);
```

### Nested Submenus
Define hierarchical menus by nesting items:

```javascript
{
    label: 'File',
    items: [
        { 
            label: 'New...', 
            items: [
                { label: 'Text File', action: 'new-text' },
                { label: 'HTML File', action: 'new-html' }
            ]
        },
        { label: 'Open...', action: 'open' }
    ]
}
```

### DOM Methods

| Method | Description |
| --- | --- |
| loadData(data) | Loads menu configuration from a data object. The structure uses the same format as nui-link-list with items array containing menu entries. |

### Action Delegates

None

### Events

None

## When to Use

- Desktop-style applications with menu bars
- Complex toolbars requiring grouped actions
- Interfaces needing keyboard-efficient navigation
- Applications where users expect traditional menu patterns
