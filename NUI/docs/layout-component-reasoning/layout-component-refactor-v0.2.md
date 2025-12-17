# Layout Component Refactor Proposal (v0.2)

## 1. Objective
Unify column-based layout mechanisms into a single, extensible `<nui-layout>` component. This component serves as a declarative interface for **CSS Grid** and **Multi-column Layouts**, prioritizing readability, consistency, and ease of use for common "N-column" patterns.

**Note:** This proposal explicitly excludes Flexbox layouts (`type="flex"`) to maintain a cohesive "column" mental model. Flexbox is better served by utility classes or specific components (like toolbars).

## 2. Core Philosophy
- **Column-Centric**: The component is strictly for arranging content into columns (whether 2D Grid or 1D Flow).
- **CSS Variables First**: The component logic writes to CSS variables (e.g., `--nui-layout-columns`), not inline styles. This ensures developers can override behavior with custom CSS classes ("escape hatch").
- **Mobile-First Defaults**: Layouts default to a single-column stack on mobile viewports, applying the requested layout only on larger screens.
- **Platform Native**: Directly maps to CSS Grid and Multi-column Layout.

### 2.1 Strategic Justification
This component represents a calculated deviation from the library's "pure native" preference. Multi-column layouts are a high-friction area where developers frequently reach for heavy CSS frameworks solely for their grid systems. By providing a lightweight, declarative syntax for common layout patterns, we prevent the need for these heavy dependencies. The trade-off of learning a small component syntax is outweighed by the benefit of keeping the overall application dependency-free and performant.

## 3. Proposed API

### Primary Attributes

| Attribute | Required | Description | Supported Types |
| :--- | :--- | :--- | :--- |
| `type` | No | The layout engine to use. Values: `grid` (default), `flow`. | All |
| `columns` | No | Number of columns. Maps to `repeat(N, 1fr)` or `column-count`. | `grid`, `flow` |
| `split` | No | Specific column sizing ratios (e.g., `2fr,1fr`). Overrides `columns`. | `grid` |
| `gap` | No | Gap size (e.g., `1rem`, `var(--nui-gap)`). | All |
| `sort` | No | JS-based reordering logic (e.g., `height`). | `flow` |
| `column-width`| No | Specific width logic for flow columns (e.g., `/3` for smart calculation). | `flow` |

## 4. Layout Types & Examples

### A. Grid Layout (`type="grid"` - Default)
The default structure for 2-dimensional layouts.

**Equal Columns:**
```html
<nui-layout columns="3" gap="1rem">
    <div>Card 1</div>
    <div>Card 2</div>
    <div>Card 3</div>
</nui-layout>
```

**Uneven Split:**
```html
<nui-layout split="2fr, 1fr">
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

## 5. Implementation Strategy

### Phase 1: The Component
Create `nui-layout` in `nui.js`.

```javascript
registerComponent('nui-layout', (element) => {
    const type = element.getAttribute('type') || 'grid';
    
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
});

function handleGridLayout(element) {
    const columns = element.getAttribute('columns');
    const split = element.getAttribute('split');
    const gap = element.getAttribute('gap');

    if (gap) element.style.setProperty('--nui-layout-gap', gap);

    let template = '1fr';
    if (split) {
        // Parse "30,auto" -> "30% auto"
        template = split.split(',').map(s => {
            s = s.trim();
            if (s === 'auto') return 'auto';
            if (!isNaN(s)) return s + '%'; // Assume % for raw numbers
            return s;
        }).join(' ');
    } else if (columns) {
        template = `repeat(${columns}, 1fr)`;
    }
    
    element.style.setProperty('--nui-layout-columns', template);
}
```

### Phase 2: CSS Architecture
Use CSS Variables to keep the component reactive and lightweight.

```css
nui-layout {
    display: block; /* Default stack for mobile */
    gap: var(--nui-layout-gap, 1rem);
}

/* Desktop Breakpoint (e.g., 768px) */
@media (min-width: 48rem) {
    
    /* Grid Mode */
    nui-layout.nui-layout-grid {
        display: grid;
        grid-template-columns: var(--nui-layout-columns, 1fr);
    }

    /* Flow Mode */
    nui-layout.nui-layout-flow {
        display: block;
        column-count: var(--nui-layout-count, auto);
        column-width: var(--nui-layout-width, auto);
    }
}
```

## 6. Open Questions for Discussion
1.  **Responsiveness**: The proposal assumes a single breakpoint (stack -> layout). Is this sufficient? (Verdict: Yes, for 90% of cases. Custom CSS handles the rest).
2.  **Sort Performance**: The `sort="height"` feature requires DOM manipulation. We will implement this with a debounce to minimize reflows.
