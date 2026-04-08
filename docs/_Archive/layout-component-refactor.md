# Layout Component Refactor Proposal (v0.4)

## 1. Objective
Provide a **highly constrained, robust** layout utility for common content patterns. `<nui-layout>` is strictly for creating **equal-width column grids** and **masonry-like flows**.

## 2. Core Philosophy

### 2.1 The Viewport Math: Why 1-2-3 Columns

**The foundational principle:** All content, regardless of what it is, must be consumable at the smallest viewport (320px mobile). This is non-negotiable. If content can't fit in a single column at 320px, the design is broken.

From this principle, a simple mental model emerges:

| Viewport | Width | Columns | Reasoning |
| :--- | :--- | :--- | :--- |
| **Mobile** | ~320px | 1 | Base unit. Content must fit here first. |
| **Tablet** | ~640px | 2 | 2× mobile width = 2 columns. |
| **Desktop** | ~960px+ | 3 | 3× mobile width = 3 columns. |

This means the **natural column counts are 1, 2, and 3**. Anything beyond 3 is a design choice, not a viewport necessity.

By limiting the component to this pattern, we:
- **Enforce a best practice** instead of enabling arbitrary complexity
- **Make the right thing the easy thing** — devs don't have to think about breakpoints
- **Guarantee content fits** on all viewports without custom media queries

### 2.2 The "Content Grid" Principle
This component is for **Content Layouts** (cards, form fields, dashboard widgets, galleries), not **App Layouts** (sidebars, headers, persistent nav).
- **Content Layouts** are fluid, repetitive, and usually equal-width.
- **App Layouts** are structural and require specific ratios. Use `<nui-app>` or custom CSS for these.

### 2.3 The Constraint is the Feature
`<nui-layout>` deliberately limits what you can express:
- **Equal Columns Only**: No ratios, no pixel widths.
- **Automatic Responsiveness**: Predictable behavior on Tablet and Mobile.
- **No Configuration**: Just tell it how many columns you want.

This is not a limitation—it's the point. The component encodes a proven responsive pattern that covers ~80% of content layout needs.

## 3. Proposed API

### Primary Attributes

| Attribute | Required | Description | Type |
| :--- | :--- | :--- | :--- |
| `type` | No | Layout engine: `grid` (default), `flow`. | All |
| `columns` | No | Number of equal columns (default: 1). | `grid`, `flow` |
| `gap` | No | Gap size (e.g., `1rem`). | All |
| `sort` | No | JS reordering: `height`. | `flow` |
| `column-width` | No | Smart width: `/3` = divide container by 3. | `flow` |

**Removed:** `split` attribute (use custom CSS for uneven layouts).

## 4. Layout Types & Examples

### A. Grid Layout (`type="grid"` - Default)

**Standard Grid:**
```html
<nui-layout columns="3">
    <div>Card 1</div>
    <div>Card 2</div>
    <div>Card 3</div>
</nui-layout>
```

**Form Layout (2 Columns):**
```html
<nui-layout columns="2">
    <label>First Name <input></label>
    <label>Last Name <input></label>
</nui-layout>
```

### B. Flow Layout (`type="flow"`)

**Replaces `nui-column-flow`.** Uses CSS Multi-column layout.

**Standard Columns:**
```html
<nui-layout type="flow" columns="3">
    <!-- Items flow vertically, then wrap -->
</nui-layout>
```

**Smart Width Calculation:**
```html
<nui-layout type="flow" column-width="/3">
    <!-- Column width = container width / 3 -->
</nui-layout>
```

**Balanced/Sorted Flow:**
```html
<nui-layout type="flow" columns="3" sort="height">
    <!-- JS reorders items to balance column heights -->
</nui-layout>
```

## 5. Responsive Behavior (The Contract)

The component enforces a strict responsive contract based on standard breakpoints.

| Viewport | Grid Behavior (`columns="N"`) | Flow Behavior |
| :--- | :--- | :--- |
| **Desktop** (≥ 768px) | **N** columns | **N** columns |
| **Tablet** (480px - 767px) | **min(N, 2)** columns (Clamped) | **min(N, 2)** columns |
| **Mobile** (< 480px) | **1** column (Stack) | **1** column |

**Clamping (not forcing):**
- `columns="4"` → 4 on desktop, **2** on tablet, 1 on mobile
- `columns="2"` → 2 on desktop, **2** on tablet, 1 on mobile
- `columns="1"` → 1 on desktop, **1** on tablet, 1 on mobile (respected)

Author intent is preserved; large values are capped to fit the viewport.

## 6. Implementation

### JavaScript (nui.js)

```javascript
registerComponent('nui-layout', (element) => {
    const type = element.getAttribute('type') || 'grid';
    element.classList.add(`nui-layout-${type}`);
    
    if (type === 'grid') {
        handleGridLayout(element);
    } else if (type === 'flow') {
        handleFlowLayout(element);
    }
});

function handleGridLayout(element) {
    const columns = element.getAttribute('columns');
    const gap = element.getAttribute('gap');
    const n = parseInt(columns) || 1;

    if (gap) element.style.setProperty('--nui-layout-gap', gap);
    
    // Set desktop value
    element.style.setProperty('--nui-layout-columns', n);
    // Set tablet value (clamped to max 2)
    element.style.setProperty('--nui-layout-columns-tablet', Math.min(n, 2));
}

function handleFlowLayout(element) {
    // Port logic from nui-column-flow
    const columns = element.getAttribute('columns');
    const columnWidth = element.getAttribute('column-width');
    const sort = element.getAttribute('sort');
    const gap = element.getAttribute('gap');
    const n = parseInt(columns) || 1;

    if (gap) element.style.setProperty('--nui-layout-gap', gap);
    
    // Set desktop value
    element.style.setProperty('--nui-layout-count', n);
    // Set tablet value (clamped to max 2)
    element.style.setProperty('--nui-layout-count-tablet', Math.min(n, 2));
    
    // Smart width calculation
    if (columnWidth?.startsWith('/')) {
        const divisor = parseInt(columnWidth.slice(1));
        if (!isNaN(divisor) && divisor > 0) {
            const containerWidth = element.offsetWidth;
            const gapValue = parseFloat(getComputedStyle(element).columnGap) || 0;
            const availableWidth = containerWidth - (gapValue * (divisor - 1));
            element.style.setProperty('--nui-layout-width', `${availableWidth / divisor}px`);
        }
    }
    
    if (sort === 'height') {
        sortByHeight(element);
    }
}

function sortByHeight(element) {
    const children = Array.from(element.children);
    children.sort((a, b) => b.offsetHeight - a.offsetHeight);
    children.forEach(child => element.appendChild(child));
}
```

### CSS (nui-theme.css)

```css
nui-layout {
    display: block;
    gap: var(--nui-layout-gap, 1rem);
}

/* Mobile (Default - Stack) */
nui-layout.nui-layout-grid {
    display: grid;
    grid-template-columns: 1fr;
}
nui-layout.nui-layout-flow {
    column-count: 1;
}

/* Tablet (≥ 30rem / 480px) - Clamped to max 2 */
@media (min-width: 30rem) {
    nui-layout.nui-layout-grid {
        grid-template-columns: repeat(var(--nui-layout-columns-tablet, 1), 1fr);
    }
    nui-layout.nui-layout-flow {
        column-count: var(--nui-layout-count-tablet, 1);
    }
}

/* Desktop (≥ 48rem / 768px) - Full columns */
@media (min-width: 48rem) {
    nui-layout.nui-layout-grid {
        grid-template-columns: repeat(var(--nui-layout-columns, 1), 1fr);
    }
    nui-layout.nui-layout-flow {
        column-count: var(--nui-layout-count, auto);
        column-width: var(--nui-layout-width, auto);
    }
}

nui-layout.nui-layout-flow > * {
    break-inside: avoid;
}
```

## 7. Summary

| Feature | Supported | Not Supported (Use CSS) |
| :--- | :--- | :--- |
| Equal columns | `columns="3"` | — |
| Custom gap | `gap="2rem"` | — |
| Flow/Masonry | `type="flow"` | — |
| Height balancing | `sort="height"` | — |
| Uneven splits | — | Use CSS Grid |
| Custom breakpoints | — | Use CSS media queries |
