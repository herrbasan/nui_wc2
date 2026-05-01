# appWindow

## Setup

This is an addon module. Load the JS before use (no CSS required):

```html
<script type="module" src="NUI/lib/modules/nui-app-window.js"></script>
```

## Design Philosophy

This module provides window chrome (title bar, content area, optional status bar) for Electron frameless windows. It is a programmatic utility, not a custom element, designed specifically for desktop application contexts where the browser chrome is hidden.

The ppWindow() function creates a structured DOM container with:
- **Title bar** - Icon, title, and window controls (close button)
- **Content area** - Main slot for application content
- **Status bar** - Optional bottom bar for status information

## Declarative Usage

*Note: ppWindow is a programmatic factory function and does not have a custom element or declarative usage.*

### Attributes

| Attribute | Description |
|-----------|-------------|
| None | N/A |

### Class Variants

| Class | Description |
|-------|-------------|
| None | N/A |

## Programmatic Usage

### DOM Methods

The ppWindow function is initialized as a factory function.

`javascript
import { appWindow } from '../NUI/lib/modules/nui-app-window.js';

const win = appWindow({
    title: 'Demo Application',
    icon: 'settings',
    inner: '<div><h1>Hello World</h1></div>',
    statusbar: true,
    target: document.getElementById('container'),
    onClose: () => {
        console.log('Window closed');
    }
});
`

#### Initialization Options

| Property | Type | Description |
|----------|------|-------------|
| 	itle | string | Window title (defaults to document.title) |
| icon | string | Icon name from the NUI icon sprite |
| inner | string\|HTMLElement | Content to display in the main area |
| statusbar | oolean | Show status bar at the bottom (default: alse) |
| 	arget | HTMLElement | Container to append the window to (default: document.body) |
| onClose | unction | Callback invoked when win.close() is called |

#### Instance Methods

| Method | Description |
|--------|-------------|
| close() | Calls the onClose callback. Does not remove the element from the DOM. |
| ocus() | Adds ocused class to <body> |
| lur() | Removes ocused class from <body> |

#### Instance Properties

| Property | Type | Description |
|----------|------|-------------|
| element | HTMLElement | The root .nui-app div |
| content | HTMLElement | The .nui-app-main content area |


### Action Delegates

| Action | Element | Description |
|--------|---------|-------------|
| None | N/A | |

### Events

| Event | Detail | Description |
|-------|--------|-------------|
| onClose (callback) | N/A | Callback when close button clicked |

