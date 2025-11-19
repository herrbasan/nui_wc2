# nui-link-list Structure Documentation

**Status**: ✅ Complete with Active State Management (Nov 19, 2025)  
**Component**: `NUI/nui.js` - Core navigation component  
**Type**: Core library component (not plugin)

---

## ✅ Active State Management (Implemented)

The link-list component now has **complete active state management**:

### API Methods
- `setActive(selector)` - Set active item, auto-expands parent groups, returns boolean
- `getActive()` - Returns currently active element
- `getActiveData()` - Returns {element, href, text}
- `clearActive()` - Clears active state

### Features
- ✅ Automatic parent group expansion
- ✅ Knower integration (`{instanceId}:active`)
- ✅ Memory cleanup on disconnect
- ✅ State change notifications
- ✅ Timestamp tracking

### Documentation & Testing
- **API Docs:** `NUI/docs/link-list-active-state.md`
- **Test Page:** `Playground/test-link-list.html`
- **Usage:** Direct on `nui-side-nav` or `nui-link-list`

---

## Architecture Overview

The `nui-link-list` component supports **three progressive usage patterns**, each building on semantic HTML with increasing JavaScript capability:

### Pattern A: Pure HTML + CSS (No JavaScript)
```html
<nav class="nui-link-list">
	<ul>
		<li class="group-header"><span>Content</span></li>
		<li><a href="#page">Page</a></li>
	</ul>
</nav>
```
- Semantic HTML works immediately
- Style with library CSS or custom CSS
- **No custom element, no JavaScript required**
- Progressive enhancement foundation

### Pattern B: Enhanced HTML (Custom Element Upgrade)
```html
<nui-link-list mode="fold">
	<ul>
		<li class="group-header"><span>Content</span></li>
		<li><a href="#page">Page</a></li>
	</ul>
</nui-link-list>

<script type="module">
	const nav = document.querySelector('nui-link-list');
	nav.filter('page');  // Component API available
</script>
```
- Custom element wraps existing HTML
- Component parses HTML into internal structure with cached element references
- Adds interactive behavior (fold, filter, search, reorder)
- **HTML is source, component enhances it**

### Pattern C: Factory Mode (JavaScript-Driven)
```javascript
import { createLinkList } from './NUI/nui.js';

const nav = createLinkList({
	target: document.querySelector('#sidebar'),
	data: [
		{
			label: 'Content',
			items: [
				{ label: 'Page', href: '#page' }
			]
		}
	],
	mode: 'fold',
	onSelect: (item) => console.log(item)
});

nav.filter('page');
nav.reorder('item-1', 3);
```
- Pure JavaScript instantiation
- Component generates DOM from data structure
- Elements cached in internal structure
- **Data is source, component generates and manages everything**

---

## Core Philosophy

**Reference-Based Architecture**: All patterns converge on an internal data structure that holds **references** to both user data objects and cached DOM elements. This enables:

- **Element reuse pattern**: DOM elements created once, cached, and mutated (never regenerated)
- **Live data references**: User objects remain connected (no serialization/deserialization)
- **Unified operations**: Filter, sort, reorder work identically across all patterns
- **Performance**: Matches `nui_list.js` pattern for handling 1000+ items efficiently

**Internal Structure** (shared by all patterns):
```javascript
{
	_items: [
		{
			id: 'auto-gen-1',          // Stable ID for operations
			type: 'group-header',      // Type: group-header, item, separator
			label: 'Content',          // Display label
			userData: userObject,      // REFERENCE to user's data (Pattern C)
			element: <li>,             // Cached DOM element
			containerElement: <div>,   // Cached wrapper (fold mode)
			expanded: true,            // Component state
			hidden: false,             // Filter state
			active: false,             // Selection state
			depth: 0,                  // Nesting level
			parentId: null             // Parent reference
		}
	],
	_filtered: [],  // References to visible items (after filter/search)
	_mode: 'fold'
}
```

**Three Sources, One Structure**:
- **Pattern A**: No structure (CSS only)
- **Pattern B**: Parse HTML → build structure with element references
- **Pattern C**: User data → build structure, generate elements once

**Shared Core Operations**:
- `filter(searchTerm)` - Operates on `_items`, updates `_filtered`, mutates cached elements
- `reorder(itemId, newIndex)` - Reorders `_items` array, repositions cached elements
- `toggleFold(groupId)` - Mutates `expanded` state, animates cached `containerElement`
- `setActive(itemId)` - Updates `active` flags, mutates cached element classes
- `refresh()` - Re-renders from structure using cached elements

---

## HTML Structure Reference

### Basic Structure

**Groups and Items**: A group is defined by a `<ul>` that starts with `<li class="group-header">`, followed by regular `<li>` elements (items).

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

**Standalone Items** (no group):
```html
<nui-link-list>
	<ul>
		<li>
			<!-- Standalone Item -->
		</li>
	</ul>
</nui-link-list>
```

### Element Types

**Group Headers** (use `<span>` wrapper for content):
```html
<li class="group-header">
	<span>
		<nui-icon name="icon-name"></nui-icon>     <!-- Optional: Leading icon -->
		<span>Group Name</span>                     <!-- Required: Text content -->
	</span>
	<button type="button" class="action" nui-event-click="action">  <!-- Optional: Trailing action -->
		<nui-icon name="settings"></nui-icon>
	</button>
</li>
```

**Navigation Items** (use `<a>` with `href`):
```html
<li>
	<a href="#section" [nui-event-click="action"]>
		<nui-icon name="icon-name"></nui-icon>     <!-- Optional: Leading icon -->
		<span>Item Name</span>                      <!-- Required: Text content -->
	</a>
</li>
```

**Separator**:
```html
<li class="separator">
	<hr>
</li>
```

### Nested Groups

Groups can contain other groups via nested `<ul>` elements. Nesting depth is unlimited:

```html
<nui-link-list>
	<ul>
		<li class="group-header">
			<span><span>Level 1 Group</span></span>
		</li>
		<li>
			<a href="#item1"><span>Level 1 Item</span></a>
		</li>
		<ul>
			<li class="group-header">
				<span><span>Level 2 Group</span></span>
			</li>
			<li>
				<a href="#item2"><span>Level 2 Item</span></a>
			</li>
		</ul>
	</ul>
</nui-link-list>
```

---

## Pattern Details

### Pattern B: Enhanced HTML Structure

**HTML Foundation**:
```html
<nui-link-list mode="fold">
	<ul>
		<li class="group-header">
			<span>
				<nui-icon name="folder"></nui-icon>
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

**Component Enhancement**:
```javascript
// On connectedCallback
1. Parse HTML into internal structure
   - Each element gets an ID and type classification
   - Elements are cached as references in structure
   - Extract labels, icons, hrefs, actions
   
2. Build relationships
   - Track depth and parent/child relationships
   - Flatten nested groups into single array
   
3. Setup behaviors
   - Fold mode: wrap groups in containers
   - Event handlers: attach to cached elements
   - State management: expanded/collapsed tracking
```

**Use cases**: Server-rendered HTML, progressive enhancement, SEO-friendly content

### Pattern C: Factory Mode (JavaScript-Driven)

**JavaScript Object Structure**:
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

const nav = createLinkList({
	target: document.querySelector('#sidebar'),
	data: data,
	mode: 'fold'
});
```

**Object Structure Rules**:
- Array of JavaScript objects (live references, not serialized data)
- **Group**: Has `items` array (nested array of objects)
- **Standalone item**: Has `href` property
- **Separator**: Has `separator: true` flag
- **Optional properties**:
  - `icon`: Icon name (string)
  - `action`: Trailing action button name (group headers only)
  - `event`: Event name for `nui-event-click` attribute
  - `href`: Link destination (required for items, omitted for groups)
- **Nested groups**: Items can have their own `items` array (unlimited depth)
- **User data**: Objects remain as live references (mutations visible to component)

**Factory creates**:
```javascript
1. Build internal structure from user data
   - Generate IDs for all items
   - Store REFERENCES to user objects (userData property)
   - Create DOM elements once, cache in structure
   
2. Render to container
   - Mount elements from structure
   - Setup fold containers and animations
   - Attach event handlers
   
3. Return API object
   {
      element: <nui-link-list>,
      filter: (term) => {},
      reorder: (id, index) => {},
      setActive: (id) => {},
      refresh: () => {},
      destroy: () => {}
   }
```

**Use cases**: Dynamic content, API-driven data, client-side SPA navigation, live data binding

### Implementation Details

**Converged Architecture**: Both patterns build the same internal structure

**Pattern B Flow**:
```
HTML → Parse to structure with element refs → Setup behaviors → API available
```

**Pattern C Flow**:
```
User objects → Build structure with user refs → Generate elements → Mount → Return API
```

**Key Differences**:
- **Pattern B**: Elements exist first, structure wraps them
- **Pattern C**: Structure exists first, elements generated from it
- **Both**: Same structure format, same operations, same element caching strategy

**Reference Benefits**:
- User can mutate their objects, call `refresh()` to update
- Component holds element references, never regenerates DOM
- Filter/sort operations rearrange references, not elements
- 10x performance improvement for 1000+ items (proven in `nui_list.js`)

---

## Complete Ground Truth Example

This HTML structure demonstrates all features working together - nested groups, separators, icons, action buttons, and deep nesting (3+ levels):

```html
<nui-link-list mode="fold">
	<!-- Group with icon, label, and trailing action -->
	<ul>
		<li class="group-header">
			<span>
				<nui-icon name="wysiwyg"></nui-icon>
				<span>Content & Windows</span>
			</span>
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
	
	<!-- Group with icon and label -->
	<ul>
		<li class="group-header">
			<span>
				<nui-icon name="empty_dashboard"></nui-icon>
				<span>Buttons & Fields</span>
			</span>
		</li>
		<li>
			<a href="#buttons" nui-event-click="navigate:buttons">
				<span>Buttons</span>
			</a>
		</li>
		<li>
			<a href="#fields" nui-event-click="navigate:fields">
				<span>Fields</span>
			</a>
		</li>
	</ul>
	
	<!-- Standalone item with icon -->
	<ul>
		<li>
			<a href="#misc" nui-event-click="navigate:misc">
				<nui-icon name="label"></nui-icon>
				<span>Misc</span>
			</a>
		</li>
	</ul>
	
	<!-- Group with nested sub-group (2 levels) -->
	<ul>
		<li class="group-header">
			<span>
				<nui-icon name="folder"></nui-icon>
				<span>Group</span>
			</span>
		</li>
		<li>
			<a href="#some">
				<span>Some Item</span>
			</a>
		</li>
		<li>
			<a href="#another">
				<span>Another Item</span>
			</a>
		</li>
		<ul>
			<li class="group-header">
				<span>
					<nui-icon name="calendar"></nui-icon>
					<span>Sub Group</span>
				</span>
			</li>
			<li>
				<a href="#sub1">
					<span>Subgroup Item 1</span>
				</a>
			</li>
			<li>
				<a href="#sub2">
					<span>Subgroup Item 2</span>
				</a>
			</li>
		</ul>
	</ul>
	
	<!-- Group with separator -->
	<ul>
		<li class="group-header">
			<span>
				<nui-icon name="filter_list"></nui-icon>
				<span>Functions & Objects</span>
			</span>
		</li>
		<li>
			<a href="#fnc1" nui-event-click="navigate:fnc1">
				<span>Function Item 1</span>
			</a>
		</li>
		<li>
			<a href="#fnc2" nui-event-click="navigate:fnc2">
				<span>Function Item 2</span>
			</a>
		</li>
		<li>
			<a href="#fnc3" nui-event-click="navigate:fnc3">
				<span>Function Item 3</span>
			</a>
		</li>
		<li class="separator"><hr></li>
		<li>
			<a href="#obj1" nui-event-click="navigate:obj1">
				<span>Object Item 1</span>
			</a>
		</li>
		<li>
			<a href="#obj2" nui-event-click="navigate:obj2">
				<span>Object Item 2</span>
			</a>
		</li>
	</ul>
	
	<!-- Deep nesting example (3+ levels) -->
	<ul>
		<li class="group-header">
			<span>
				<nui-icon name="monitor"></nui-icon>
				<span>Developer Tools</span>
			</span>
		</li>
		<li>
			<a href="#devtools-overview" nui-event-click="navigate:devtools-overview">
				<span>Overview</span>
			</a>
		</li>
		<ul>
			<li class="group-header">
				<span>
					<nui-icon name="settings"></nui-icon>
					<span>Build Tools</span>
				</span>
			</li>
			<li>
				<a href="#build-config" nui-event-click="navigate:build-config">
					<span>Configuration</span>
				</a>
			</li>
			<li>
				<a href="#build-scripts" nui-event-click="navigate:build-scripts">
					<span>Scripts</span>
				</a>
			</li>
			<ul>
				<li class="group-header">
					<span>
						<nui-icon name="layers"></nui-icon>
						<span>Plugins</span>
					</span>
				</li>
				<li>
					<a href="#plugin-babel" nui-event-click="navigate:plugin-babel">
						<span>Babel</span>
					</a>
				</li>
				<li>
					<a href="#plugin-webpack" nui-event-click="navigate:plugin-webpack">
						<span>Webpack</span>
					</a>
				</li>
				<li>
					<a href="#plugin-eslint" nui-event-click="navigate:plugin-eslint">
						<span>ESLint</span>
					</a>
				</li>
			</ul>
		</ul>
		<ul>
			<li class="group-header">
				<span>
					<nui-icon name="search"></nui-icon>
					<span>Testing</span>
				</span>
			</li>
			<li>
				<a href="#test-unit" nui-event-click="navigate:test-unit">
					<span>Unit Tests</span>
				</a>
			</li>
			<li>
				<a href="#test-integration" nui-event-click="navigate:test-integration">
					<span>Integration Tests</span>
				</a>
			</li>
			<li>
				<a href="#test-e2e" nui-event-click="navigate:test-e2e">
					<span>E2E Tests</span>
				</a>
			</li>
		</ul>
	</ul>
</nui-link-list>
```

**Key Structural Points**:
- Each top-level `<ul>` = one group or standalone item
- Nested `<ul>` = sub-groups (sibling to parent's `<li>` elements)
- Group headers use `<span>` wrapper (not `<button>` in raw HTML)
- Icons and text always wrapped in `<span>` for consistent structure
- Separators are `<li class="separator"><hr></li>`
- After `upgradeHtml()`, group items get wrapped in `<div class="group-items">`

---

## Fold Mode Implementation

**Activation**: `mode="fold"` attribute on `<nui-link-list>`

**Behavior**:
- Groups can expand/collapse via click on `.group-header`
- Nested groups can all be open simultaneously
- Height animations on `.group-items` containers (0px ↔ scrollHeight)
- After animation completes, height resets to `auto` for responsive content

**DOM Transformation**:
```html
<!-- Before upgrade (raw HTML) -->
<ul>
	<li class="group-header"><span>...</span></li>
	<li><a href="#">Item 1</a></li>
	<li><a href="#">Item 2</a></li>
</ul>

<!-- After upgrade (fold mode) -->
<ul>
	<li class="group-header" tabindex="0" role="button" aria-expanded="false">
		<span>...</span>
	</li>
	<div class="group-items" style="height: 0px;">
		<li class="list-item"><a href="#">Item 1</a></li>
		<li class="list-item"><a href="#">Item 2</a></li>
	</div>
</ul>
```

**Animation Details**:
- CSS transition: `.group-items { transition: height 0.3s ease; }`
- Expand: Set height to `scrollHeight`, wait for transition, reset to `auto`
- Collapse: Set height to `scrollHeight`, force reflow, set to `0px`
- Height reset enables nested content to flow naturally

---

## Component API (Patterns B & C)

### Public Methods

```javascript
const nav = document.querySelector('nui-link-list'); // Pattern B
// OR
const nav = createLinkList({ ... }); // Pattern C

// Filter/search operations
nav.filter(searchTerm);        // Show only matching items
nav.clearFilter();             // Reset filter

// Active item management
nav.setActive(itemId);         // Set active item, scroll into view
nav.clearActive();             // Clear active state

// Fold state (mode="fold" only)
nav.toggleFold(groupId);       // Toggle specific group
nav.expandAll();               // Expand all groups
nav.collapseAll();             // Collapse all groups

// Data operations (live updates)
nav.reorder(itemId, newIndex); // Reorder items
nav.updateItem(itemId, props); // Update item properties
nav.refresh();                 // Re-render from current structure

// Structure access
const items = nav.getItems();  // Get current item structure
const filtered = nav.getFiltered(); // Get currently visible items

// Cleanup
nav.destroy();                 // Remove handlers, clear references
```

### Events

```javascript
// Selection events
nav.addEventListener('nui-select', (e) => {
	console.log('Selected:', e.detail.item);
});

// Fold state changes
nav.addEventListener('nui-fold-change', (e) => {
	console.log('Group:', e.detail.groupId, 'Expanded:', e.detail.expanded);
});

// Filter results
nav.addEventListener('nui-filter-change', (e) => {
	console.log('Visible items:', e.detail.count);
});
```

---

## Future Enhancements (Planned)

### Search/Filter (Priority 1)
- Real-time text filtering across all items
- Match highlighting in results
- Auto-expand groups containing matches
- Match count statistics

### Keyboard Navigation (Priority 2)
- Arrow keys for item traversal
- Home/End navigation
- Enter/Space for expand/collapse
- Type-ahead search

### Reordering (Priority 3)
- Drag-and-drop reordering
- Programmatic reorder API
- Move between groups
- Persist order changes

### Tree Mode (Priority 4)
- All groups visible simultaneously (no collapsing)
- Visual hierarchy via CSS (backgrounds, borders)
- Best for small lists showing full context

---

## Library Context

**Component Type**: Core library component (ships with `nui.js`)

**Relationship to Plugins**: 
- Core library includes essential UI components (navigation, buttons, inputs, modals, tabs)
- Advanced features come as separate plugins (data tables, charts, advanced forms)
- Layout patterns (cards, grids) are CSS-only (no JavaScript)

**Similar Core Components**:
- `nui-button` - Button component
- `nui-modal` - Modal/dialog component  
- `nui-tabs` - Tab container component
- `nui-input` - Form input component
- `nui-top-nav` - Top navigation bar
- `nui-side-nav` - Sidebar container

**Plugin Examples** (separate files):
- `nui-data-table.js` - Advanced sortable/filterable tables
- `nui-chart.js` - Data visualization
- `nui-rich-editor.js` - WYSIWYG editor

**CSS Patterns** (no JavaScript):
- Cards (`<div class="nui-card">`)
- Grid layouts (`<div class="nui-grid">`)
- Spacing utilities (`<div class="nui-space-4">`)

---

## Design Principles

1. **Three-Tier Progressive Enhancement** - Works as HTML+CSS, custom element, or factory
2. **Reference-Based Architecture** - Cache elements and user data, never regenerate
3. **Semantic HTML Foundation** - Use standard elements correctly
4. **Platform Native APIs** - Direct DOM manipulation, no frameworks
5. **Element Reuse Pattern** - Create once, mutate forever (10x performance for 1000+ items)
6. **Keyboard Accessible** - All interactive elements in tab order by default
7. **Screen Reader Friendly** - Proper semantic structure for assistive technology
8. **Zero Dependencies** - Pure web platform APIs only

---

## Accessibility

### Semantic HTML
- `<ul>` and `<li>` provide proper list semantics
- `<a>` with `href` for navigation links (keyboard accessible by default)
- `<span>` for text content (semantically neutral)

### ARIA Attributes
- `class="group-header"` for identification
- JavaScript enhancement adds `aria-expanded="true/false"` to fold-mode group headers
- `role="button"` added to group headers in fold mode
- Component JavaScript may add contextual ARIA labels when needed for clarity

### Keyboard Support
- Tab navigation through all interactive elements - native browser behavior
- Fold mode group headers become keyboard accessible (`tabindex="0"`)
- Enter/Space to activate - native browser behavior

---

## Reference Implementation

The old NUI library provides visual design inspiration:
- **CSS**: [nui_main.css line 1064-1098](https://github.com/herrbasan/nui/blob/main/css/nui_main.css#L1064-L1098) - Sidebar navigation styling with `.sub` containers
- **JavaScript**: [nui.js line 99-260](https://github.com/herrbasan/nui/blob/main/nui.js#L99-L260) - `renderNav()` function with group/sub-item structure

Key patterns from old library:
- Group containers (`.sub`) have lighter background: `rgba(var(--color-shade0), 0.15)`
- Individual items have subtle hover and active states
- Horizontal line separators (`.hline`) at top/bottom of groups
- Left border highlight for active items: `0.3rem solid var(--color-highlight)`
