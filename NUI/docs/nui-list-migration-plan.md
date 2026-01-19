# nui-list Migration Plan

## Overview

Migrate `reference/nui/nui_list.js` (superList) to the new NUI structure as an addon component (`nui-list`). This component handles 50,000+ items efficiently using virtual scrolling and element reuse patterns.

## Component Status

**Source**: `reference/nui/nui_list.js` (731 lines)  
**Target**: `NUI/lib/modules/nui-list.js` + `NUI/css/modules/nui-list.css`  
**Type**: Addon component (complex, specialized use case)  
**API**: `.loadData()` pattern (like `nui-menu`)

## Core Principles to Preserve

### 1. Performance Characteristics (DO NOT CHANGE)
- **Element reuse pattern** - DOM elements cached on data objects, created once
- **Two rendering modes** - Normal (<1000 items) and Fixed (≥1000 items)
- **Virtual scrolling** - Only render visible items + buffer
- **requestAnimationFrame loop** - Smooth updates tied to browser paint cycle
- **Smart updates** - Scroll position tracking to avoid redundant renders

### 2. Proven Optimizations
- Reverse array instead of re-sorting when only direction changed
- IntersectionObserver to pause rendering when hidden
- Height change detection via interval monitoring
- Debounced search input (100ms)
- Touch device detection for mode selection

## Migration Strategy

### Phase 1: Component Structure
**Goal**: Wrap existing code in NUI component pattern without breaking functionality.

**Changes**:
```javascript
// NUI/lib/modules/nui-list.js
import { nui } from '../../nui.js';

nui.components.list = {
    create(options) {
        // Existing superList factory function
        // Minimal changes - just wrap it
    }
};

// Custom element registration
class NuiList extends HTMLElement {
    connectedCallback() {
        // Component setup
    }
    
    loadData(options) {
        // Call nui.components.list.create()
    }
}

customElements.define('nui-list', NuiList);
export default nui.components.list;
```

**API Pattern**:
```html
<nui-list></nui-list>
```
```javascript
const list = document.querySelector('nui-list');
list.loadData({
    data: [...],
    render: (item) => { /* ... */ },
    sort: [...],
    search: [...]
});
```

### Phase 2: Dependency Resolution

**Current Dependencies**:
- `ut` (utility library) - DOM helpers, filtering, sorting
- `superSelect` - Sort dropdown component

**Resolution Strategy**:

1. **DOM Utilities** → Use `nui.util` (already exists in nui.js)
   - `ut.htmlObject()` → `nui.util.dom.create()`
   - `ut.el()` → `element.querySelector()`
   - `ut.killKids()` → `element.innerHTML = ''`
   - `ut.killMe()` → `element.remove()`
   - `ut.createElement()` → `nui.util.dom.create()`
   
2. **Filter/Sort Utilities** → Port to `nui.util`
   - `ut.filter()` → `nui.util.filter()` (add if missing)
   - `ut.sortByKey()` → `nui.util.sortByKey()` (add if missing)
   - `ut.detectEnv()` → `nui.util.detectEnv()` (add if missing)

3. **Select Component** → Use new `nui-select`
   - Replace `superSelect()` with `<nui-select>` component
   - May reveal issues in nui-select implementation (good - dogfooding!)

4. **Icon System** → Use `nui-icon`
   - `ut.icon('search')` → `<nui-icon name="search"></nui-icon>`

### Phase 3: HTML Structure Modernization

**Current**: String template → `ut.htmlObject()`  
**New**: Use semantic HTML + NUI components

```html
<!-- Old approach -->
<div class="superlist">
    <div class="header">
        <div class="left"><label>Sort by:</label></div>
        <div class="right">
            <div class="nui-input search">...</div>
        </div>
    </div>
</div>

<!-- New approach -->
<nui-list>
    <div class="nui-list-header">
        <div class="nui-list-sort">
            <label>Sort by:</label>
            <nui-select></nui-select>
            <button class="nui-list-sort-direction" aria-label="Toggle sort direction">
                <nui-icon name="arrow"></nui-icon>
            </button>
        </div>
        <nui-input-group class="nui-list-search">
            <nui-icon name="search"></nui-icon>
            <input type="search" placeholder="Search">
        </nui-input-group>
    </div>
    <div class="nui-list-viewport">
        <div class="nui-list-container"></div>
    </div>
    <div class="nui-list-footer">
        <div class="nui-list-footer-left"></div>
        <div class="nui-list-footer-center"></div>
        <div class="nui-list-footer-right"></div>
    </div>
</nui-list>
```

### Phase 4: CSS Module Creation

**Target**: `NUI/css/modules/nui-list.css`

**Structure**:
```css
/* Core layout */
nui-list { /* absolute positioning, flex column */ }
.nui-list-header { /* flex layout, search/sort alignment */ }
.nui-list-viewport { /* scrollable, overflow-y: auto */ }
.nui-list-container { /* relative, height set by JS */ }
.nui-list-footer { /* flex layout, 3-column grid */ }

/* Items */
.nui-list-item { /* absolute positioning, transitions */ }
.nui-list-item.selected { /* selection styling */ }

/* Modes */
nui-list[data-mode="fixed"] .nui-list-fixed { /* overlay mode */ }

/* Theming via CSS variables */
nui-list {
    --nui-list-item-height: 60px;
    --nui-list-header-bg: var(--nui-surface);
    --nui-list-selection-bg: var(--nui-accent);
}
```

**Move from inline styles**: Current code has minimal inline styles (only positioning), most styling should already work with NUI theme system.

## Declarative vs Programmatic Pattern

### Both Patterns Supported

The component will support both declarative (simple cases) and programmatic (complex cases) patterns.

#### Pattern 1: Declarative (Simple Data Display)
```html
<nui-list>
	<template data-item>
		<div class="list-item">
			<span>{{name}}</span>
			<span>{{email}}</span>
		</div>
	</template>
</nui-list>

<script>
const list = document.querySelector('nui-list');
list.loadData([
	{name: 'John Doe', email: 'john@example.com'},
	{name: 'Jane Smith', email: 'jane@example.com'}
]);
</script>
```

**When to use:**
- Simple data display
- No complex logic in rendering
- Static template structure

**How it works:**
1. Extract `<template data-item>` innerHTML once in `connectedCallback`
2. Create render function that does string replacement: `html.replace(/{{key}}/g, item[key])`
3. Use `nui.util.dom.fromHTML(html)` to create element (fast native parser)
4. No `cloneNode`, no `querySelector` overhead - just string manipulation + innerHTML

#### Pattern 2: Programmatic (Complex Logic)
```javascript
const list = document.querySelector('nui-list');
list.loadData({
	data: imageData,
	render: (item) => {
		const div = nui.util.dom.fromHTML(`
			<div class="list-item">
				<img src="" style="opacity:0">
				<span>${item.name}</span>
			</div>
		`);
		
		// Lazy loading logic
		const img = div.querySelector('img');
		div.update = () => {
			img.src = `thumb/${item.image}.webp`;
			img.addEventListener('load', () => img.style.opacity = '1');
		};
		
		return div;
	}
});
```

**When to use:**
- Lazy loading (images, etc.)
- Event handlers on items
- Conditional rendering logic
- Update callbacks
- Performance optimizations

### Performance Considerations

**Key insight**: Both patterns use the same underlying mechanism (browser's HTML parser via innerHTML/createContextualFragment). Template pattern is just convenience, not overhead.

**Declarative:**
```javascript
// Parse template once
const templateHTML = template.innerHTML;

// Per-item: string replace + fromHTML
render: (item) => {
	let html = templateHTML.replace(/{{name}}/g, item.name);
	return nui.util.dom.fromHTML(html);
}
```

**Programmatic:**
```javascript
// Per-item: template literal + fromHTML  
render: (item) => {
	return nui.util.dom.fromHTML(`<div>${item.name}</div>`);
}
```

Both use native HTML parser - no performance difference. Declarative is just DX convenience.

**Virtual scrolling reminder**: Element creation happens for ~20-30 visible items only. After initial render, elements are reused. The declarative vs programmatic choice has negligible impact on overall performance.

### Utility Addition: `nui.util.dom.fromHTML()`

**Added to core utilities** (based on `ut.htmlObject` from old library):
```javascript
dom.fromHTML(html) {
	const fragment = document.createRange().createContextualFragment(html);
	if (fragment.children.length > 1) {
		const wrapper = document.createElement('div');
		wrapper.append(...fragment.children);
		return wrapper;
	}
	return fragment.firstElementChild;
}
```

**Benefits:**
- Fast: Uses browser's native HTML parser (C++ implementation)
- Simple: Parse HTML string → DOM element
- Handles edge cases: Multiple top-level elements automatically wrapped
- Reusable: Useful across all components, not just nui-list

## API Design

### Component Methods (Preserved from Original)

```typescript
interface NuiListInstance extends HTMLElement {
    // Data management
    loadData(options: ListOptions): void;
    updateData(data: any[], skipFilter?: boolean): void;
    appendData(): void;
    updateItem(idx: number, data?: any, force?: boolean): void;
    updateItems(items: Array<number | {idx: number, data: any}>, force?: boolean): void;
    
    // Selection
    getSelection(full?: boolean): any[];
    getSelectedListIndex(): number[];
    setSelection(idx: number | number[]): void;
    
    // View control
    update(force?: boolean): void;
    scrollToIndex(index: number): void;
    reset(): void;
    
    // Lifecycle
    cleanUp(): void;
}

interface ListOptions {
    data: any[];
    render: (item: any) => HTMLElement;
    id?: string;
    events?: (event: ListEvent) => void;
    search?: Array<{prop: string}>;
    sort?: Array<{label: string, prop: string, numeric?: boolean}>;
    sort_default?: number;
    sort_direction_default?: 'up' | 'down';
    footer?: {
        buttons_left?: Array<{label: string, type: string, fnc: (e: MouseEvent) => void}>;
        buttons_right?: Array<{label: string, type: string, fnc: (e: MouseEvent) => void}>;
    };
    logmode?: boolean;
    verbose?: boolean;
    single?: boolean;
}
```

### Event System

**Current**: Custom callback `events: (e) => {}`  
**New**: Standard CustomEvent pattern

```javascript
list.addEventListener('nui-list-selection', (e) => {
    console.log(e.detail.items);      // Selected items
    console.log(e.detail.count);      // Selection count
});

list.addEventListener('nui-list-sort', (e) => {
    console.log(e.detail.column);     // Sort column index
    console.log(e.detail.direction);  // 'up' or 'down'
});

list.addEventListener('nui-list-search', (e) => {
    console.log(e.detail.query);      // Search query
});
```

## Implementation Checklist

### Step 1: Utility Functions
- [x] Add `fromHTML(html)` to `nui.util.dom` (based on `ut.htmlObject`)
- [ ] Port required `ut` functions to `nui.util`
  - [ ] `filter(options)` - Multi-property search
  - [ ] `sortByKey(array, key, numeric)` - Array sorting
  - [ ] `detectEnv()` - Touch detection
- [ ] Test utilities independently

### Step 2: Component Scaffold
- [ ] Create `NUI/lib/modules/nui-list.js`
- [ ] Create `NUI/css/modules/nui-list.css`
- [ ] Define custom element class
- [ ] Implement `.loadData()` method (supports both array and options object)
- [ ] Parse declarative `<template data-item>` in `connectedCallback`
- [ ] Generate render function from template (string replacement + fromHTML)

### Step 3: Core Migration
- [ ] Copy rendering engine (lines 340-470 from original)
- [ ] Adapt to use `nui.util` instead of `ut`
- [ ] Replace `superSelect` with `nui-select`
- [ ] Update HTML structure generation
- [ ] Preserve scroll calculation logic exactly

### Step 4: Feature Parity
- [ ] Header (search + sort)
- [ ] Footer (buttons + info display)
- [ ] Selection (single/multi with Ctrl/Shift)
- [ ] Log mode (auto-scroll to bottom)
- [ ] Height change detection
- [ ] IntersectionObserver pause/resume

### Step 5: Testing
- [ ] Create demo page: `Playground/pages/addons/list.html`
- [ ] Test with 50k items (performance baseline)
- [ ] Test search/filter performance
- [ ] Test sort direction optimization (reverse vs re-sort)
- [ ] Test log mode with live append
- [ ] Test selection modes (single/multi)
- [ ] Test lazy image loading pattern
- [ ] Verify cleanup (no memory leaks)

### Step 6: Documentation
- [ ] Add to README.md component table
- [ ] Update `Playground/js/main.js` navigation
- [ ] TypeScript definitions (port from `nui_list.d.ts`)
- [ ] Usage examples in demo page

## Demo Page Structure

**File**: `Playground/pages/addons/list.html`

**Sections**:
1. **Overview** - What it is, when to use
2. **Basic List** - Simple 100-item example
3. **Search & Sort** - 1000 items with filtering
4. **Performance Demo** - 50,000 items (match old playground)
5. **Log Mode** - Auto-scrolling log viewer
6. **Selection Modes** - Single vs multi-select
7. **Lazy Loading** - Images loaded on demand
8. **API Methods** - Interactive demos of updateItem, setSelection, etc.

## Potential Issues & Solutions

### Issue 1: `nui-select` May Need Enhancements
**Problem**: Old `superSelect` might have features new component lacks.  
**Solution**: This is good! Dogfooding reveals gaps. Enhance `nui-select` as needed.

### Issue 2: Utility Function Gaps in `nui.util`
**Problem**: Missing filter/sort utilities.  
**Solution**: Add them. These are generally useful, not list-specific.

### Issue 3: CSS Variable Integration
**Problem**: Old component uses inline styles for positioning, new NUI uses CSS vars.  
**Solution**: Keep inline styles for positioning (performance-critical), use CSS vars for theming.

### Issue 4: Touch Device Detection
**Problem**: `ut.detectEnv()` might not exist in new structure.  
**Solution**: Add simple touch detection to `nui.util`:
```javascript
nui.util.isTouchDevice = () => {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};
```

## Success Criteria

1. **Performance**: 50k items render smoothly (measure with demo)
2. **API Compatibility**: All original methods work identically
3. **Dogfooding Success**: Reveals and fixes issues in `nui-select`, `nui-input`
4. **Size Budget**: Module + CSS < 25KB minified
5. **Demo Quality**: Matches old playground functionality
6. **Clean Integration**: Works with NUI theme system

## Timeline Estimate

- **Phase 1-2**: Utility setup + scaffold (2-3 hours)
- **Phase 3-4**: Core migration + features (4-6 hours)
- **Phase 5**: Testing + fixes (2-3 hours)
- **Phase 6**: Documentation + demo (2-3 hours)

**Total**: ~10-15 hours of focused work

## Open Questions

1. ~~Should we support declarative HTML pattern in addition to `.loadData()`?~~
   **RESOLVED**: Yes. Template pattern uses same performance (innerHTML parser) as programmatic, just better DX for simple cases.
2. Do we need both modes (normal/fixed) or can modern browsers handle 50k items in normal mode?
   **KEEP BOTH**: Proven optimization, touch devices benefit from normal mode.
3. Should footer buttons use `data-action` pattern or keep callback functions?
   **DECISION PENDING**: Test both, measure DX vs flexibility trade-off.
4. Can we simplify the height-checking mechanism with ResizeObserver instead of interval?
   **TEST**: ResizeObserver might be cleaner, but verify browser support and performance.

## References

- Original: `reference/nui/nui_list.js`
- TypeScript defs: `reference/nui/nui_list.d.ts`
- Usage examples: `reference/n000b_ui_playground/js/n000b_ui_playground.js` (lines 560-694)
- Data generation: `reference/n000b_ui_playground/nui/nui_generate_data.js`
