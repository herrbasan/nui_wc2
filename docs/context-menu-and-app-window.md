# NUI Context Menu & App Window

## Overview

Two separate modules that share styling foundations but serve different purposes.

---

## nui-context-menu

### Status: ✅ IMPLEMENTED

### Concept & Vision

A lightweight, keyboard-accessible context menu popup that appears on demand (right-click or programmatic trigger). Shares the visual language of `nui-menu` (dropdown styling, hover states) but operates independently as a floating overlay rather than a persistent menubar.

### Design Language

**Visual Style**: Inherits from `nui-menu` dropdown aesthetics:
- Dark dropdown panel with subtle shadow
- Hover highlight on items
- Left accent bar for submenu indicators
- Smooth fade-in on open

**Colors** (from `nui-theme.css`):
- Background: `var(--color-shade2)`
- Item hover: `var(--color-shade4)`
- Text: `var(--color-text)`
- Disabled: `var(--color-text-muted)`
- Separator: `var(--border-shade1)`

**Typography**: Inherits from base (system-ui)

**Spacing**: Uses `--nui-space-quarter` and `--nui-space-half` for padding

**Motion**: 150ms ease-out for show/hide transitions

### Component Architecture

**Type**: Programmatic-only custom element (no declarative children)

**Files**:
- `NUI/lib/modules/nui-context-menu.js` - ✅ IMPLEMENTED
- `NUI/css/modules/nui-dropdown.css` - ✅ IMPLEMENTED (shared styles)
- `NUI/css/modules/nui-context-menu.css` - ✅ IMPLEMENTED

**Data Structure**:
```javascript
{
    items: [
        { label: 'Edit', items: [...] },      // Submenu
        { label: 'Copy', action: 'copy' },    // Action item
        { type: 'separator' },                // Divider
        { label: 'Delete', action: 'delete', disabled: true }
    ]
}
```

**API**:
```javascript
// Factory function
const menu = nui.contextMenu(items, { onAction: (action, item) => {} });

// Instance methods
menu.show(x, y, triggerEl);      // Show at coordinates with optional trigger element for scroll detection
menu.showAt(element);            // Show aligned to element
menu.hide();                     // Close
menu.destroy();                  // Clean up

// Static
nui.contextMenu.closeAll();      // Close any open context menus
```

**Keyboard Navigation**:
- `Arrow Up/Down`: Move between items (closes open submenu when navigating away from item with submenu)
- `Enter`: Activate focused item
- `Escape`: Close menu
- `Arrow Right`: Open submenu (if item has children)
- `Arrow Left`: Close submenu / close menu if at root

**Accessibility**:
- `role="menu"` on container
- `role="menuitem"` on items
- `aria-haspopup="menu"` on items with submenus
- `aria-expanded` on submenu triggers
- Focus trap when open
- Announce submenu opens via `a11y.announce()`

**Positioning Logic**:
- Opens at cursor position (contextmenu event) or aligned to trigger element
- Auto-flips horizontally if within 200px of right edge
- Auto-flips vertically if within 200px of bottom edge

**Scroll Detection**:
- When a trigger element is provided, the menu will close when that element or any of its scrollable ancestors is scrolled
- Pass the container element as third parameter: `menu.show(x, y, containerEl)`

### Integration with nui-menu

- `NUI/css/modules/nui-menu.css` updated to import shared dropdown styles
- Both components share the same dropdown CSS classes

---

## nui-app (App Window Chrome)

### Status: 📋 DOCUMENTED ONLY - NOT YET IMPLEMENTED

### Concept & Vision

A window chrome module for Electron applications providing a standard title bar, content area, and optional status bar. Not a component but an imperative API that wraps your application content in a consistent frame.

### Design Language

**Visual Style**: Native window chrome aesthetic:
- Title bar with app icon, title, and window controls
- Content area fills remaining space
- Optional status bar at bottom
- Focus state dims title/status bars

**Colors** (CSS variables):
```css
--nui-app-titlebar-bg: var(--color-shade6);
--nui-app-titlebar-color: var(--color-base);
--nui-app-content-bg: var(--color-shade1);
--nui-app-statusbar-bg: var(--color-shade3);
--nui-app-border: var(--border-shade1);
```

**Dimensions**:
```css
--nui-app-titlebar-height: 3rem;
--nui-app-statusbar-height: 2rem;
```

### Component Architecture

**Type**: Module (imperative API), not a custom element

**Files**:
- `NUI/modules/nui_app.js` - 📋 TODO
- `NUI/css/nui_app.css` - 📋 TODO

**API**:
```javascript
// Initialize app chrome
const appWindow = await nui.appWindow({
    icon: '<nui-icon name="settings"></nui-icon>',  // App icon (optional)
    title: 'My Application',                        // Uses document.title if omitted
    inner: document.body.innerHTML,                 // Content to wrap
    statusbar: true,                               // Show status bar (optional)
    functions: {                                   // Custom menu items (optional)
        'About': { title: 'About', fnc: () => showAbout() }
    },
    onClose: () => {}                              // Close handler (optional)
});

appWindow.close();
appWindow.center();
appWindow.setFullScreen(true);
appWindow.toggleDevTools();
```

**Electron Integration**:
When `window.electron_helper` is present, automatically hooks:
- Window controls to electron APIs
- Focus/blur events to update `.focused` class on `<body>`
- Additional menu items: Toggle DevTools, Toggle Fullscreen, Center Window, Close

**Dark Mode**:
Toggle via `document.body.classList.toggle('dark')`. All chrome elements respond to color scheme.

### Title Bar Menu

Right-click on title bar opens a context menu (using nui-context-menu) with:
1. Toggle Theme (dark/light)
2. Custom functions (if provided)
3. Electron functions (if available): DevTools, Fullscreen, Center, Close

---

## Relationship

- **No direct coupling**: `nui-context-menu` and `nui-app` are independent
- **Shared styling**: Both use `--color-shade*` palette from nui-theme
- **Optional pairing**: App window's title bar menu uses `nui-context-menu` internally, but app window doesn't require context menu to function

---

## Session Summary

### Completed
- [x] Created `docs/context-menu-and-app-window.md`
- [x] Implemented `NUI/lib/modules/nui-context-menu.js`
- [x] Created `NUI/css/modules/nui-dropdown.css` (shared styles)
- [x] Created `NUI/css/modules/nui-context-menu.css`
- [x] Updated `NUI/css/modules/nui-menu.css` to import shared dropdown styles
- [x] Created demo page at `Playground/pages/addons/context-menu.html`
- [x] Added CSS imports to `Playground/index.html`
- [x] Added navigation entry in `Playground/js/main.js`
- [x] Fixed submenu stack (nested submenus now work correctly - level 3+ stays open)
- [x] Added scroll detection - menu closes when trigger element scrolls
- [x] Added auto-close submenu when navigating to different item without submenu

### Outstanding
- [ ] Implement `NUI/modules/nui_app.js` (app window chrome)
- [ ] Create `NUI/css/nui_app.css`
- [ ] Test context-menu in browser

### Files Created/Modified
```
NUI/
├── lib/modules/
│   └── nui-context-menu.js     [NEW]
├── css/modules/
│   ├── nui-dropdown.css        [NEW - shared styles]
│   ├── nui-context-menu.css    [NEW]
│   └── nui-menu.css            [MODIFIED - now imports nui-dropdown.css]
Playground/
├── index.html                  [MODIFIED - added context-menu CSS import]
├── js/main.js                  [MODIFIED - added context-menu nav entry]
└── pages/addons/
    └── context-menu.html       [NEW - demo page]
docs/
└── context-menu-and-app-window.md  [NEW]
```
