# nui-link-list Structure Documentation

## Core Philosophy

The `nui-link-list` component follows a DOM-first approach where semantic HTML provides the foundation, and JavaScript enhancement adds behavior. The structure is fully functional without JavaScript, semantically correct, and accessible by default.

---

## Basic Structure

### Groups and Items

A **group** is defined by a `<ul>` that starts with a `<li class="group-header">` (the group header), followed by regular `<li>` elements (items).

```html
<nui-link-list>
    <ul>
        <li class="group-header">
            <!-- Group Header -->
        </li>
        <li>
            <!-- Item -->
        </li>
        <li>
            <!-- Item -->
        </li>
    </ul>
</nui-link-list>
```

### Standalone Items (No Group)

Items can exist without a group header:

```html
<nui-link-list>
    <ul>
        <li>
            <!-- Standalone Item -->
        </li>
    </ul>
</nui-link-list>
```

---

## Universal Item Structure

### Group Headers

Group headers use `<button>` for semantic correctness and keyboard accessibility:

```html
<li class="group-header">
    <button type="button">
        <nui-icon name="icon-name">...</nui-icon>     <!-- Optional: Leading icon -->
        <span>Group Name</span>                        <!-- Required: Text content -->
    </button>
    <button type="button" class="action" nui-event-click="action">  <!-- Optional: Trailing action -->
        <nui-icon name="settings">...</nui-icon>
    </button>
</li>
```

### Navigation Items

Navigation items use `<a>` with `href` for proper links:

```html
<li>
    <a href="#section" [nui-event-click="action"]>
        <nui-icon name="icon-name">...</nui-icon>     <!-- Optional: Leading icon -->
        <span>Item Name</span>                         <!-- Required: Text content -->
        <button type="button" class="action" nui-event-click="action">  <!-- Optional: Trailing action -->
            <nui-icon name="delete">...</nui-icon>
        </button>
    </a>
</li>
```

### Required Elements

**For group headers:**
- `<button type="button">` - Container for header content
- `<span>` - Text content (required for accessibility)

**For navigation items:**
- `<a href="...">` - Navigation link
- `<span>` - Text content (required for accessibility)

### Optional Elements
- `<nui-icon>` - Leading icon (visual indicator)
- `<button type="button" class="action">` - Trailing action button (edit, delete, more options)

---

## Attributes and Behavior

### Navigation Links

All navigation items must have `href` for keyboard accessibility:

```html
<a href="#section">
    <span>Section Name</span>
</a>
```

### Custom Actions

Use `nui-event-click` for custom behaviors:

```html
<a href="#content" nui-event-click="navigate:content">
    <span>Content</span>
</a>
```

### Combined (href + action)

```html
<a href="#section" nui-event-click="track:click">
    <span>Tracked Link</span>
</a>
```

### Group Headers

Group headers use `<button>` for semantic correctness:

```html
<li class="group-header">
    <button type="button">
        <nui-icon name="folder"></nui-icon>
        <span>Group Name</span>
    </button>
</li>
```

**Note:** In fold mode, JavaScript will add `aria-expanded` attribute and click handlers to enable expand/collapse behavior.

---

## Nested Groups

Groups can contain other groups via nested `<ul>` elements. Nesting depth is unlimited:

```html
<nui-link-list>
    <ul>
        <li class="group-header">
            <button type="button">
                <span>Level 1 Group</span>
            </button>
        </li>
        <li>
            <a href="#item1"><span>Level 1 Item</span></a>
        </li>
        <ul>
            <li class="group-header">
                <button type="button">
                    <span>Level 2 Group</span>
                </button>
            </li>
            <li>
                <a href="#item2"><span>Level 2 Item</span></a>
            </li>
            <ul>
                <li class="group-header">
                    <button type="button">
                        <span>Level 3 Group</span>
                    </button>
                </li>
                <li>
                    <a href="#item3"><span>Level 3 Item</span></a>
                </li>
            </ul>
        </ul>
    </ul>
</nui-link-list>
```

---

## Variations

### 1. Group Header with Icon
```html
<li class="group-header">
    <button type="button">
        <nui-icon name="wysiwyg"></nui-icon>
        <span>Content & Windows</span>
    </button>
</li>
```

### 2. Group Header with Trailing Action
```html
<li class="group-header">
    <button type="button">
        <nui-icon name="wysiwyg"></nui-icon>
        <span>Content & Windows</span>
    </button>
    <button type="button" class="action" nui-event-click="edit-section:content">
        <nui-icon name="settings"></nui-icon>
    </button>
</li>
```

### 3. Item with Action
```html
<li>
    <a href="#content" nui-event-click="navigate:content">
        <span>Content</span>
    </a>
</li>
```

### 4. Item with Icon and Action
```html
<li>
    <a href="#misc" nui-event-click="navigate:misc">
        <nui-icon name="label"></nui-icon>
        <span>Misc</span>
    </a>
</li>
```

### 5. Item with Link Only
```html
<li>
    <a href="#some">
        <span>Some Item</span>
    </a>
</li>
```

### 6. Item with Trailing Action
```html
<li>
    <a href="#item">
        <span>Item Name</span>
        <button type="button" class="action" nui-event-click="delete:item">
            <nui-icon name="delete"></nui-icon>
        </button>
    </a>
</li>
```

### 7. Separator
```html
<li class="separator">
    <hr>
</li>
```

---

## CSS Structure

### Base Styling

```css
/* Remove default list styling */
ul {
    padding-left: 0;
}

/* Indent nested lists */
ul ul {
    padding-left: var(--nui-space-double);
}

/* Custom bullet styling */
ul li {
    list-style: none;
    padding-left: 1.5rem;
}

ul li::before {
    content: "▸";
    color: var(--color-highlight);
    font-size: 1.2em;
    margin-right: 0.5rem;
    margin-left: -1.5rem;
    display: inline-block;
    width: 1rem;
}
```

### Component-Specific Styling

Component modes (like "fold") will add mode-specific classes:

```css
nui-link-list[mode="fold"] .group-header {
    /* Fold mode specific styling */
}
```

---

## JavaScript Enhancement

The component JavaScript will:

1. **Process event attributes** - Setup `nui-event-click` handlers
2. **Add accessibility attributes** - Enhance ARIA labels when context is clear
3. **Enable fold mode** - Make group headers expandable/collapsible
4. **Track active state** - Add `.active` class to selected items
5. **Keyboard navigation** - Arrow keys, Home/End navigation

---

## Future Enhancement Compatibility

The current structure supports future enhancements without markup changes:

### Can Be Added via JavaScript:
- **Badges/Counts** - Inject `<span class="badge">5</span>` after label
- **Drag & Drop** - Add `draggable="true"` and event listeners
- **Multi-select** - Inject checkboxes at runtime
- **State Classes** - Add `.active`, `.disabled`, `.expanded` classes
- **Tooltips** - Add `title` attributes or custom tooltip elements
- **Lazy Loading** - Replace placeholder `<ul>` with loaded content
- **Filtering/Search** - Toggle `display: none` on items
- **Sorting** - Reorder existing DOM nodes

### May Need Preparation:
- **Unique IDs** - Add `data-item-id` for stable references, deep linking, state persistence

---

## Accessibility

### Semantic HTML
- `<ul>` and `<li>` provide proper list semantics
- `<button>` for interactive non-navigational elements (group headers)
- `<a>` with `href` for navigation links (keyboard accessible by default)
- `<span>` for text content (semantically neutral)

### ARIA Attributes
- `class="group-header"` for identification (not `role="presentation"` which removes from accessibility tree)
- JavaScript enhancement adds `aria-expanded="true/false"` to fold-mode group headers
- Component JavaScript may add contextual ARIA labels when needed for clarity

### Keyboard Support
- Tab navigation through all interactive elements (buttons and links) - native browser behavior
- Arrow key navigation (JavaScript enhancement for convenience)
- Enter/Space to activate buttons and links - native browser behavior

---

## Complete Example

```html
<nui-link-list>
    <!-- Group with icon, label, and trailing action -->
    <ul>
        <li class="group-header">
            <button type="button">
                <nui-icon name="wysiwyg"></nui-icon>
                <span>Content & Windows</span>
            </button>
            <button type="button" class="action" nui-event-click="edit-section:content">
                <nui-icon name="settings"></nui-icon>
            </button>
        </li>
        <li>
            <a href="#content" nui-event-click="navigate:content">
                <span>Content</span>
            </a>
        </li>
        <li>
            <a href="#windows" nui-event-click="navigate:windows">
                <span>Windows</span>
            </a>
        </li>
    </ul>
    
    <!-- Group with nested group -->
    <ul>
        <li class="group-header">
            <button type="button">
                <nui-icon name="folder"></nui-icon>
                <span>Developer Tools</span>
            </button>
        </li>
        <li>
            <a href="#overview" nui-event-click="navigate:overview">
                <span>Overview</span>
            </a>
        </li>
        <ul>
            <li class="group-header">
                <button type="button">
                    <nui-icon name="settings"></nui-icon>
                    <span>Build Tools</span>
                </button>
            </li>
            <li>
                <a href="#config" nui-event-click="navigate:config">
                    <span>Configuration</span>
                </a>
            </li>
        </ul>
    </ul>
    
    <!-- Standalone item with icon and trailing action -->
    <ul>
        <li>
            <a href="#misc" nui-event-click="navigate:misc">
                <nui-icon name="label"></nui-icon>
                <span>Misc</span>
                <button type="button" class="action" nui-event-click="delete:misc">
                    <nui-icon name="delete"></nui-icon>
                </button>
            </a>
        </li>
    </ul>
</nui-link-list>
```

---

## Design Principles

1. **Semantic First** - Use standard HTML elements correctly (`<button>` for buttons, `<a>` for links)
2. **Progressive Enhancement** - Full functionality without JavaScript, enhanced with JS
3. **Keyboard Accessible** - All interactive elements are in tab order by default
4. **Screen Reader Friendly** - Proper element semantics ensure correct announcements
5. **Valid HTML** - No nested `<a>` tags or misused semantic elements
6. **Flexibility** - Structure supports various configurations without code changes
7. **Consistency** - Clear patterns for group headers (button) vs navigation items (link)
8. **Simplicity** - Avoid over-preparing for features that may never be needed
9. **DOM-First** - Structure contains content and intent; JavaScript adds behavior

---

## Key Structural Decisions

### Why `<button>` for Group Headers?
- Semantically correct for non-navigational interactive elements
- Keyboard accessible by default (in tab order)
- Screen readers announce as "button" which signals interactivity
- No `href` needed (unlike `<a>` without `href` which breaks accessibility)

### Why `<span>` Instead of `<label>`?
- `<label>` is semantically for form controls only
- `<span>` is semantically neutral text container
- Avoids confusing screen readers with incorrect element usage

### Why `href` Required on All `<a>` Tags?
- Links without `href` aren't keyboard accessible by default
- Ensures plain HTML mode is fully functional
- Provides fallback navigation even without JavaScript

### Why Trailing Actions Use `<button>`?
- Avoids invalid HTML (nested `<a>` tags)
- Semantically correct (actions, not navigation)
- Clear visual and behavioral separation from parent element

### Why `class="group-header"` Instead of `role="presentation"`?
- `role="presentation"` removes element from accessibility tree
- Contradictory to have interactive content inside "presentation" element
- Class-based selection is clearer for both CSS and JavaScript

---

## Component Development

### Feature 1: Dual Data Source Support

The component must support two initialization patterns:

#### Pattern A: HTML Structure (DOM-First)
Component reads existing semantic HTML markup in the DOM:

```html
<nui-link-list>
    <ul>
        <li class="group-header">
            <span>
                <nui-icon name="folder">📁</nui-icon>
                <span>Group Name</span>
            </span>
        </li>
        <li>
            <a href="#item">
                <span>Item Name</span>
            </a>
        </li>
    </ul>
</nui-link-list>
```

**Use case**: Server-rendered HTML, progressive enhancement, SEO-friendly content

#### Pattern B: JSON Data Structure
Component generates HTML from JavaScript object:

```javascript
const data = [
    {
        label: 'Content & Windows',
        icon: 'wysiwyg',
        action: 'edit-section:content',
        items: [
            { label: 'Content', href: '#content', event: 'navigate:content' },
            { label: 'Windows', href: '#windows', event: 'navigate:windows' }
        ]
    },
    {
        label: 'Buttons & Fields',
        icon: 'empty_dashboard',
        items: [
            { label: 'Buttons', href: '#buttons' },
            { label: 'Fields', href: '#fields' }
        ]
    },
    { label: 'Misc', href: '#misc', icon: 'label' },
    {
        label: 'Developer Tools',
        icon: 'monitor',
        items: [
            { label: 'Overview', href: '#overview' },
            {
                label: 'Build Tools',
                icon: 'settings',
                items: [
                    { label: 'Configuration', href: '#config' },
                    { label: 'Scripts', href: '#scripts' }
                ]
            }
        ]
    },
    { separator: true }
];

const listElement = document.querySelector('nui-link-list');
listElement.loadData(data);
```

**JSON Structure Rules**:
- Array of objects (each object = group or standalone item)
- **Group**: Has `items` array → creates `<ul>` with `.group-header` and children
- **Standalone item**: Has `href` → creates `<ul>` with single `<li><a>`
- **Separator**: Has `separator: true` → creates `<li class="separator"><hr></li>`
- **Optional properties**:
  - `icon`: Icon name (adds `<nui-icon>` with unicode fallback)
  - `action`: Trailing action button (group headers only)
  - `event`: Add `nui-event-click` attribute
  - `href`: Link destination (required for items, omitted for groups)
- **Nested groups**: Items can have their own `items` array (unlimited depth)

**Generated HTML matches semantic structure**:
```html
<!-- From first group object -->
<ul>
    <li class="group-header">
        <span>
            <nui-icon name="wysiwyg">📝</nui-icon>
            <span>Content & Windows</span>
        </span>
        <button type="button" class="action" nui-event-click="edit-section:content">
            <nui-icon name="settings">⚙</nui-icon>
        </button>
    </li>
    <li>
        <a href="#content" nui-event-click="navigate:content">
            <span>Content</span>
        </a>
    </li>
    <li>
        <a href="#windows" nui-event-click="navigate:windows">
            <span>Windows</span>
        </a>
    </li>
</ul>
```

**Use case**: Dynamic content, API-driven data, client-side rendering

#### Implementation Requirements

**Priority**: Pattern A (HTML) must work first and remain the primary pattern
- Component initializes by processing existing DOM structure
- If `data` attribute or `loadData()` method is used, generate HTML from JSON
- Generated HTML should match the semantic structure exactly
- After generation, component treats it as Pattern A (processes the DOM)

**Design principle**: JSON is a convenience layer for generating HTML, not a separate rendering path

---

### Feature 2: Active Item Tracking & Fold Mode Behavior

When used in navigation context (e.g., `nui-side-nav`), the component serves dual purpose:
1. **Navigation interface** - User clicks to navigate between sections
2. **Location indicator** - Shows current position in site hierarchy

#### Active Item Visual Indication

The active item receives `.active` class:

```html
<li>
    <a href="#current-page" class="active">
        <span>Current Page</span>
    </a>
</li>
```

**Behavior**:
- Only one item can be `.active` at a time
- Active item's parent groups remain expanded (showing the path)
- Styling indicates current location to user

#### Fold Mode: Top-Level Accordion Behavior

**Mode activation**: `mode="fold"` attribute on `<nui-link-list>`

**Accordion behavior**:
- Top-level groups: Only one can be open at a time (accordion)
- Nested groups: Can all be open simultaneously (no accordion restriction)
- Opening a top-level group closes other top-level siblings
- Active item's ancestor groups remain open initially

**Interaction flow**:
```
User clicks "Media Elements" (top-level) → Opens, closes "Content & Windows"
User clicks "Media Players" (nested) → Opens, "SuperSlide" can stay open
User clicks "SuperList" (top-level) → Opens, closes "Media Elements"
```

**Rationale**:
- Top-level accordion keeps viewport manageable (primary goal)
- Nested groups rarely exceed 2-3 items (practical navigation depth)
- Simpler implementation (~30% less code than full recursive accordion)
- Better UX (explore nested items without constant re-opening)
- Unlocked active path (user can temporarily hide current location during exploration)

**Flow on navigation**:
```
1. Page loads → setActiveItem('#current-page') → Active path expanded
2. User explores → Can collapse/expand any group (including active path)
3. User clicks item → Navigation occurs → Page/state updates
4. New context → setActiveItem('#new-page') → New active path expanded
```

**API**:
```javascript
const nav = document.querySelector('nui-link-list');

// Set active item (expands ancestor groups)
nav.setActiveItem('#configuration');

// Or by element reference
const item = nav.querySelector('a[href="#configuration"]');
nav.setActiveItem(item);

// Clear active state
nav.clearActive();
```

**DOM attributes**:
```html
<!-- Expanded group -->
<li class="group-header" aria-expanded="true">
    <span>...</span>
</li>

<!-- Collapsed group -->
<li class="group-header" aria-expanded="false">
    <span>...</span>
</li>

<!-- Active item -->
<li>
    <a href="#current" class="active">...</a>
</li>
```

---

### Feature 3: Built-in Search/Filter

**Goal**: Make navigation lists searchable without external dependencies

**Requirement**: Core feature (part of nui.js, not optional module)

#### Search Behavior

**Filter mode**: Show/hide items based on search query
- Match against item text content (case-insensitive)
- Match against group headers
- Preserve hierarchy (show parent groups of matching items)
- Hide non-matching items and empty groups
- Auto-expand groups containing matches

**Visual feedback**:
- Item/group count indicator (e.g., "Showing 5 of 23")
- Clear search button when query active

#### Implementation

**Compact, zero-dependency solution**:

```javascript
// API
const nav = document.querySelector('nui-link-list');

// Programmatic search
nav.search('configuration');

// Clear search
nav.clearSearch();

// Get search stats
const stats = nav.getSearchStats(); 
// { total: 23, visible: 5, query: 'config' }
```

**DOM integration**:
```html
<!-- Optional: Auto-wire search input -->
<input type="search" nui-search-target="nav-list">

<nui-link-list id="nav-list">
    <!-- items -->
</nui-link-list>
```

**Filtering strategy**:
- Add `.nui-hidden` class to non-matching elements
- Preserve DOM structure (no removal/reinsertion)
- Fast text matching (`.textContent.toLowerCase().includes()`)
- Expand groups containing matches (fold mode integration)

**Search scope**:
- Item labels (✓)
- Group headers (✓)
- Icons (✗ - not searchable)
- URLs/hrefs (✗ - confusing when href doesn't match visible text)

**Performance**:
- Debounce search input (150ms default)
- Cache text content on first search
- Minimal DOM manipulation (class toggling only)

**Complete feature set for core component**:
- ✅ HTML structure parsing (Pattern A)
- ✅ JSON data loading (Pattern B)
- ✅ Active item tracking
- ✅ Accordion/fold mode behavior
- ✅ Search/filter functionality
- ✅ Keyboard navigation (arrow keys, Home/End)
- ✅ Event attribute processing (nui-event-click)

**Out of scope (optional modules/user implementation)**:
- Drag & drop reordering
- Badges/counts
- Multi-select mode
- Context menus
- Lazy loading
- Virtual scrolling

---

### Feature 4: Display Modes - Tree vs Fold

The component supports two display modes optimized for different use cases:

#### Tree Mode (Default)

**Behavior**:
- Full hierarchy visible simultaneously
- No collapsing/expanding - all groups always visible
- Users scroll to see complete structure
- Best for small to medium lists, understanding full context

**Visual hierarchy**:
```css
/* Top-level groups - distinct background */
.group-header {
    background: var(--color-shade3);
    font-weight: bold;
}

/* Nested groups - border-left indicator + normal weight */
ul ul .group-header {
    background: transparent;
    border-left: 3px solid var(--color-highlight);
    font-weight: normal;
    padding-left: calc(var(--nui-space) - 3px);
}

/* Items use standard indentation */
ul ul { padding-left: var(--nui-space-double); }
```

**Use cases**:
- Small lists that fit in viewport
- Documentation navigation
- When users need to see full structure
- Understanding relationships between sections

#### Fold Mode

**Behavior**:
- Top-level accordion (only one top-level group open)
- Nested groups can all be open simultaneously
- Click group header to toggle open/closed
- Opening a top-level group closes its siblings
- Reduces scrolling by collapsing unused sections

**Visual state**:
```html
<!-- Expanded group -->
<li class="group-header" aria-expanded="true">
    <span>...</span>
</li>

<!-- Collapsed group (children hidden) -->
<li class="group-header" aria-expanded="false">
    <span>...</span>
</li>
```

**Practical navigation depth limit**:
- Most navigation is 2 levels maximum (top-level → subsections → items)
- Deeper nesting indicates information architecture issues
- Should use different UI pattern (not sidebar navigation)

**Use cases**:
- Large lists (many top-level sections)
- Mobile navigation (viewport constraints)
- Focused exploration (one section at a time)
- Application navigation with many sections

#### Mode Comparison

| Aspect | Tree Mode | Fold Mode |
|--------|-----------|-----------|
| **Visibility** | All groups visible | Top-level accordion |
| **Navigation** | Scroll | Expand/collapse |
| **Nesting** | All visible | Top-level only collapses |
| **Best for** | Small lists, context | Large lists, mobile |
| **Default** | Yes | Opt-in |

#### API

```javascript
const nav = document.querySelector('nui-link-list');

// Set mode via attribute
nav.setAttribute('mode', 'fold'); // or 'tree'

// Or via HTML
// <nui-link-list mode="fold">
```

**Default**: Tree mode (full visibility, simpler mental model)
