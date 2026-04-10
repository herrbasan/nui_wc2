# NUI Migration Guide

This document tracks breaking changes and provides migration instructions between versions.

---

## 2026-04-10: Router API Rename

### What's Changed
- `nui.enableContentLoading()` → `nui.setupRouter()`
- Old name still works as deprecated alias (console warning)

### Migration

**Before:**
```javascript
nui.enableContentLoading({
    container: 'nui-main',
    navigation: 'nui-sidebar',
    basePath: 'pages'
});
```

**After:**
```javascript
nui.setupRouter({
    container: 'nui-main',
    navigation: 'nui-sidebar',
    basePath: 'pages'
});
```

### Why
The new name better describes what the function does: it sets up a complete SPA router with hash-based navigation, not just "content loading."

---

## 2026-04-08: Core Component Moves

### What's Changed
- `nui-markdown` moved from addon to core
- `nui-code` moved from addon to core

### Migration

**Before:**
```javascript
import '../NUI/lib/modules/nui-markdown.js';
import '../NUI/lib/modules/nui-code.js';
```

**After:**
Remove the imports entirely. These components are now included in `NUI/nui.js`.

---

## 2026-04-08: Sidebar API Refactor

### What's Changed
- CSS classes: `sidenav-*` → `sidebar-*`
- Method: `toggleSideNav()` → `toggleSidebar()` (backward compat maintained)
- Attribute: `favored` → `behavior="primary|secondary|manual"`

### Migration

**HTML:**
```html
<!-- Before -->
<nui-sidebar favored></nui-sidebar>

<!-- After -->
<nui-sidebar behavior="primary"></nui-sidebar>
```

**JavaScript:**
```javascript
// Before
app.toggleSideNav();

// After
app.toggleSidebar();        // Toggles left (default)
app.toggleSidebar('right'); // Toggles right
```

### Why
The new API provides proper hierarchy for multiple sidebars (primary opens first, secondary waits for more space) and clearer naming.

---

## General Migration Tips

1. **Check the console** — Deprecated APIs log warnings with migration hints
2. **Test navigation** — After router/sidebar changes, verify all navigation works
3. **Check responsive behavior** — Sidebar changes may affect layout at different breakpoints
