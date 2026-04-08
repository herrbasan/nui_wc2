# Sidebar Implementation Reference

This document serves as a reference for implementing the sidebar component in the nui_wc2 library, drawing from the existing n000b_ui_playground implementation.

## Sources

### 1. Live Demo
- **URL**: https://herrbasan.github.io/n000b_ui_playground/#page=content&id=containers
- **Description**: Interactive demo showing the sidebar in action with tree navigation, sub-items, and responsive behavior.

### 2. CSS Styling
- **File**: `reference/nui/css/nui_main.css`
- **Lines**: 965 onwards
- **Key Classes**:
  - `.nui-sidebar`: Main sidebar container with fixed positioning and grid layout
  - `.nui-sidebar-item`: Individual navigation items with hover/active states
  - `.nui-sidebar-item .item`: Inner item structure with icon and text
  - `.nui-sidebar-item .sub`: Collapsible sub-menu container
  - `.nui-sidebar-item .sub-item`: Sub-menu items
  - `.nui-sidebar-item.active`: Active state styling with left border highlight

### 3. JavaScript Implementation
- **File**: `reference/nui/ui.js`
- **Function**: `nui.renderNav(options)`
- **Key Features**:
  - Tree navigation with expandable sub-items
  - Active state management
  - Click handling for navigation
  - Responsive behavior (force mode for wide screens)
  - Special action buttons on items

### 4. Old NUI Library Integration
- **Repository**: https://github.com/herrbasan/n000b_ui_playground
- **File**: `js/n000b_ui_playground.js`
- **Integration Point**: `g.sidebar = nui.renderNav(nav_options);`
- **Navigation Data Structure**: Hierarchical array with `name`, `id`, `icon`, and optional `sub` arrays
- **Event Handling**: Hash-based navigation with `nav(obj)` function

## Key Implementation Details

### Navigation Data Structure
```javascript
let nav_options = {
    fnc: nav,  // Navigation callback function
    nav: [
        { 
            name:'Content & Windows', 
            id:'content',
            icon: ut.icon('wysiwyg'),
            sub: [
                {
                    name:'Containers',
                    id:'containers',
                    icon: ut.icon('arrow')
                },
                {
                    name:'Page Layout',
                    id:'page',
                    icon: ut.icon('arrow')
                }
            ]
        }
    ]
}
```

### CSS Grid Layout
- Sidebar uses `display: grid` with `grid-template-rows: 1fr auto`
- Fixed positioning: `position: fixed; top: var(--topbar-height); left: 0; bottom: 0`
- Width controlled by `--sidebar-width` CSS variable
- Smooth transitions with `transition: left 0.2s`

### Responsive Behavior
- Force mode: When window width > content_width, adds `nui-sidebar-force` class
- Open/close states managed via `nui-sidebar-open` body class
- Click outside closes sidebar on content area

### Active State Management
- `setActive(idx, sidx)` function for programmatic activation
- Visual feedback with `.active` class and left border highlight
- Sub-item expansion when parent is active

### Special Actions
- Items can have `special` property with custom icon and click handler
- Positioned absolutely in top-right of item
- Used for settings or additional actions per navigation item

## Migration Notes for nui_wc2

### Current Status
- HTML structure works without JavaScript (semantic nav with links)
- Basic component structure established in current implementation
- Need to match visual styling and interaction patterns from old library

### Required Enhancements
1. **Tree Navigation**: Implement collapsible sub-menus with smooth height transitions
2. **Active States**: Match the left border highlight and background color changes
3. **Icon Integration**: Ensure proper icon sizing and positioning (1.8rem icons in 4rem containers)
4. **Special Actions**: Support for additional action buttons on navigation items
5. **Responsive Behavior**: Implement force mode and mobile overlay patterns

### CSS Variables Used
- `--sidebar-width`: Controls sidebar width
- `--sidebar-background`: Background color
- `--sidebar-shadow`: Box shadow
- `--sidebar-text`: Text color
- `--sidebar-item-height`: Item height (typically 3rem)
- `--topbar-height`: Top offset for fixed positioning
- `--color-highlight`: Active state accent color
- `--border-thickness`: Border width
- `--border-shade1`: Border color

### Event System Integration
- Use `nui.doer` for navigation actions
- Integrate with `nui.knower` for sidebar state management
- Support hash-based navigation for bookmarkable URLs

## Testing Checklist
- [ ] Tree navigation expands/collapses correctly
- [ ] Active states highlight properly
- [ ] Icons display at correct size
- [ ] Responsive behavior on mobile/desktop
- [ ] Special actions work when present
- [ ] Keyboard navigation support
- [ ] Screen reader compatibility