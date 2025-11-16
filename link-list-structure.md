# nui-link-list Structure Documentation

**Status**: ✅ Implemented (Nov 16, 2025)  
**Component**: `NUI/nui.js` - `<nui-link-list>` element  
**Features**: Dual data sources (HTML/JSON), accordion fold mode, nested groups, separators

---

## Implementation Summary

**Completed Features**:
- ✅ HTML structure processing (Pattern A - DOM-first)
- ✅ JSON data loading (Pattern B - generates matching HTML)
- ✅ Accordion fold mode with height animations
- ✅ Nested group support (unlimited depth)
- ✅ Separator elements (`{ separator: true }`)
- ✅ Unified upgrade path (both patterns use same HTML processing)
- ✅ Icon integration with automatic SVG generation
- ✅ Action buttons on group headers
- ✅ Event attribute processing (`nui-event-click`)

**Fold Mode Behavior**:
- Each group's items wrapped in `<div class="group-items">` for height transitions
- Height animates from `0px` (collapsed) to `scrollHeight` (expanded)
- After animation completes, height resets to `auto` for responsive nested content
- Nested groups can all be open simultaneously (no nested accordion restriction)

---

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

Group headers use `<span>` wrapper for content (fold mode adds `role="button"`):

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

### Navigation Items

Navigation items use `<a>` with `href` for proper links:

```html
<li>
	<a href="#section" [nui-event-click="action"]>
		<nui-icon name="icon-name"></nui-icon>     <!-- Optional: Leading icon -->
		<span>Item Name</span>                      <!-- Required: Text content -->
	</a>
</li>
```

### Separator

```html
<li class="separator">
	<hr>
</li>
```

---

## Nested Groups

Groups can contain other groups via nested `<ul>` elements. Nesting depth is unlimited:

```html
<nui-link-list>
	<ul>
		<li class="group-header">
			<span>
				<span>Level 1 Group</span>
			</span>
		</li>
		<li>
			<a href="#item1"><span>Level 1 Item</span></a>
		</li>
		<ul>
			<li class="group-header">
				<span>
					<span>Level 2 Group</span>
				</span>
			</li>
			<li>
				<a href="#item2"><span>Level 2 Item</span></a>
			</li>
		</ul>
	</ul>
</nui-link-list>
```

---

## Dual Data Source Pattern

### Pattern A: HTML Structure (DOM-First)

Component reads existing semantic HTML markup in the DOM:

```html
<nui-link-list>
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

**Use case**: Server-rendered HTML, progressive enhancement, SEO-friendly content

### Pattern B: JSON Data Structure

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
  - `icon`: Icon name (adds `<nui-icon>`)
  - `action`: Trailing action button (group headers only)
  - `event`: Add `nui-event-click` attribute
  - `href`: Link destination (required for items, omitted for groups)
- **Nested groups**: Items can have their own `items` array (unlimited depth)

**Use case**: Dynamic content, API-driven data, client-side rendering

### Implementation Details

**Unified Approach**: Both patterns produce identical DOM structure
- HTML markup is processed via `upgradeHtml()` function
- JSON generates raw HTML strings, then runs through same `upgradeHtml()` 
- After upgrade, both paths result in enhanced semantic HTML with:
  - Icons converted to full SVG markup
  - Group items wrapped in `.group-items` containers (fold mode)
  - List items get `.list-item` class for styling
  - Event attributes processed and handlers attached

**Processing Flow**:
```
HTML Pattern: Parse existing DOM → upgradeHtml() → Enhanced components
JSON Pattern: Generate HTML strings → upgradeHtml() → Enhanced components
```

**Design Principle**: JSON is a convenience layer for generating HTML, not a separate rendering path

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

## Future Enhancements (Not Yet Implemented)

The following features are documented for future development but not currently part of the component:

### Active Item Tracking
- `.active` class management
- `setActiveItem()` / `clearActive()` methods
- Auto-expand ancestor groups when setting active item

### Search/Filter
- Text-based filtering with `.nui-hidden` class
- Search input auto-wiring via `nui-search-target` attribute
- Match count and statistics

### Keyboard Navigation  
- Arrow keys for item traversal
- Home/End navigation
- Enter/Space for expand/collapse

### Tree Mode
- All groups visible simultaneously (no collapsing)
- Visual hierarchy via CSS (backgrounds, borders)
- Best for small lists and understanding context

---

## Design Principles

1. **Semantic First** - Use standard HTML elements correctly
2. **Progressive Enhancement** - Full functionality without JavaScript, enhanced with JS
3. **Keyboard Accessible** - All interactive elements are in tab order by default
4. **Screen Reader Friendly** - Proper element semantics ensure correct announcements
5. **Valid HTML** - Clean semantic structure
6. **Flexibility** - Structure supports various configurations without code changes
7. **Simplicity** - Avoid over-preparing for features that may never be needed
8. **DOM-First** - Structure contains content and intent; JavaScript adds behavior

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
