# Layout Component Refactor Proposal

## 1. Objective
Unify disparate layout mechanisms (specifically `nui-column-flow` and ad-hoc CSS Grid patterns) into a single, extensible `<nui-layout>` component. This component serves as a declarative interface for CSS Layout systems, prioritizing readability and consistency.

## 2. Core Philosophy
- **Mandatory Type**: The `type` attribute is the single source of truth for the layout engine (`grid`, `flow`, `flex`).
- **Platform Native**: Directly maps to CSS Grid, Multi-column Layout, and Flexbox.
- **Smart Defaults**: Configuration should be minimal.
- **Extensible**: The pattern allows adding new types (e.g., `masonry` in the future) without breaking changes.

### 2.1 Strategic Justification
This component represents a calculated deviation from the library's "pure native" preference. Multi-column layouts are a high-friction area where developers frequently reach for heavy CSS frameworks solely for their grid systems. By providing a lightweight, declarative syntax for common layout patterns, we prevent the need for these heavy dependencies. The trade-off of learning a small component syntax is outweighed by the benefit of keeping the overall application dependency-free and performant.

## 3. Proposed API

### Primary Attributes

| Attribute | Required | Description | Supported Types |
| :--- | :--- | :--- | :--- |
| `type` | **Yes** | The layout engine to use. Values: `grid`, `flow`, `flex`. | All |
| `columns` | No | Number of columns. Maps to `repeat(N, 1fr)` or `column-count`. | `grid`, `flow` |
| `split` | No | Specific column sizing ratios (e.g., `2fr,1fr`). Overrides `columns`. | `grid` |
| `gap` | No | Gap size (e.g., `1rem`, `var(--nui-gap)`). | All |
| `sort` | No | JS-based reordering logic (e.g., `height`). | `flow` |
| `column-width`| No | Specific width logic for flow columns (e.g., `/3` for smart calculation). | `flow` |

### Alignment Attributes (Optional)
| Attribute | Description | CSS Equivalent |
| :--- | :--- | :--- |
| `align` | Vertical alignment. | `align-items` |
| `justify` | Horizontal distribution. | `justify-content` |

## 4. Layout Types & Examples

### A. Grid Layout (`type="grid"`)
The default structure for 2-dimensional layouts.

**Equal Columns:**
```html
<nui-layout type="grid" columns="3" gap="1rem">
    <div>Card 1</div>
    <div>Card 2</div>
    <div>Card 3</div>
</nui-layout>
```

**Uneven Split:**
```html
<nui-layout type="grid" split="2fr, 1fr">
    <aside>Sidebar</aside>
    <main>Content</main>
</nui-layout>
```

### B. Flow Layout (`type="flow"`)
Replaces `nui-column-flow`. Uses CSS Multi-column layout, ideal for text or masonry-like card layouts where vertical stacking order matters less than packing efficiency.

**Standard Columns:**
```html
<nui-layout type="flow" columns="3">
    <!-- Items flow down col 1, then col 2... -->
</nui-layout>
```

**Smart Width Calculation (Legacy Support):**
Retains the logic from `nui-column-flow` where `/3` calculates the exact pixel width to fit 3 columns based on container width.
```html
<nui-layout type="flow" column-width="/3">
    <!-- Items -->
</nui-layout>
```

**Balanced/Sorted Flow:**
Uses JavaScript to reorder DOM elements to ensure columns are visually balanced (simulating Masonry).
```html
<nui-layout type="flow" columns="3" sort="height">
    <!-- Items are reordered by JS to balance column heights -->
</nui-layout>
```

### C. Flex Layout (`type="flex"`)
For 1-dimensional layouts (rows or columns) where content size drives the layout.

**Toolbar Example:**
```html
<nui-layout type="flex" justify="space-between" align="center">
    <h1>Title</h1>
    <button>Action</button>
</nui-layout>
```

## 5. Implementation Strategy

### Phase 1: The Component
Create `nui-layout` in `nui.js`.

```javascript
registerComponent('nui-layout', (element) => {
    const type = element.getAttribute('type');
    
    // Common Setup
    element.classList.add(`nui-layout-${type}`);
    
    // Type: Flow (Ported from nui-column-flow)
    if (type === 'flow') {
        handleFlowLayout(element); // Logic for sort="height" and column-width="/N"
    }
    
    // Type: Grid
    if (type === 'grid') {
        handleGridLayout(element); // Logic for columns="N" vs split="..."
    }
    
    // Type: Flex
    if (type === 'flex') {
        // Mostly CSS, but maybe some helper logic
    }
});
```

### Phase 2: CSS Architecture
Use CSS Variables to keep the component reactive and lightweight.

```css
nui-layout {
    display: block; /* Default */
    gap: var(--nui-layout-gap, 1rem);
}

/* Grid Mode */
nui-layout[type="grid"] {
    display: grid;
    grid-template-columns: var(--nui-layout-columns, 1fr);
}

/* Flow Mode */
nui-layout[type="flow"] {
    display: block;
    column-count: var(--nui-layout-count, auto);
    column-width: var(--nui-layout-width, auto);
}

/* Flex Mode */
nui-layout[type="flex"] {
    display: flex;
    flex-direction: row;
    justify-content: var(--nui-layout-justify, start);
    align-items: var(--nui-layout-align, stretch);
}
```

## 6. Open Questions for Discussion
1.  **Responsiveness**: Should we include a `breakpoint` attribute (e.g., `breakpoint="md"`) that disables the layout (stacks items) below a certain width? Or rely on global CSS variables?
2.  **Legacy `column-width`**: Should we rename `column-width="/3"` to something more intuitive like `columns="3 strict"` or just keep it for backward compatibility?
3.  **Sort Performance**: The `sort="height"` feature requires DOM manipulation. Should this be a separate "Addon" or part of the core `nui-layout`? (Recommendation: Keep in core but only activate if attribute is present).
