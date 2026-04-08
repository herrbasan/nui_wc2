# Layout Component Refactor Proposal (v0.3)

## 1. Objective
Provide a **constrained, opinionated** layout component for common column-based patterns. `<nui-layout>` is a productivity tool for the 80% case, not a complete abstraction over CSS Grid.

## 2. Core Philosophy

### 2.1 The Constraint is the Feature
`<nui-layout>` deliberately limits what you can express:
- **Ratios only** for column sizing (no pixel values, no `minmax()`)
- **Single breakpoint** for responsive behavior (stack on mobile, layout on desktop)
- **No complex Grid features** (row spanning, named areas, subgrid)

This constraint pushes developers toward fluid, ratio-based layouts that are inherently responsive.

### 2.2 Design Boundary
If you need:
- Pixel-perfect widths
- Custom responsive breakpoints
- `minmax()`, `auto-fit`, row spanning
- Complex Grid or Flexbox patterns

...use CSS directly. The component is a shortcut for common patterns, not a replacement for CSS knowledge.

### 2.3 Strategic Justification
Multi-column layouts are the #1 reason developers reach for heavy CSS frameworks. By providing a lightweight, declarative syntax for common patterns, we prevent the need for Bootstrap/Tailwind dependencies. The trade-off: learning a small, focused API.

## 3. Proposed API

### Primary Attributes

| Attribute | Required | Description | Type |
| :--- | :--- | :--- | :--- |
| `type` | No | Layout engine: `grid` (default), `flow`. | All |
| `columns` | No | Equal column count (e.g., `3`). | `grid`, `flow` |
| `split` | No | Ratio-based sizing (e.g., `1:2`, `1:2:1`). Overrides `columns`. | `grid` |
| `gap` | No | Gap size (e.g., `1rem`). | All |
| `sort` | No | JS reordering: `height`. | `flow` |
| `column-width` | No | Smart width: `/3` = divide container by 3. | `flow` |

### The `split` Syntax (Ratio-Based)

Numbers represent **proportions**, converted to `fr` units:

```html
<nui-layout split="1:2">        <!-- grid-template-columns: 1fr 2fr -->
<nui-layout split="1:2:1">      <!-- grid-template-columns: 1fr 2fr 1fr -->
<nui-layout split="2:3:1">      <!-- grid-template-columns: 2fr 3fr 1fr -->
```

The special keyword `auto` is allowed for natural-width columns:

```html
<nui-layout split="auto:1">     <!-- grid-template-columns: auto 1fr -->
```

**No units allowed.** If you need `200px` or `minmax()`, use CSS directly.

## 4. Layout Types & Examples

### A. Grid Layout (`type="grid"` - Default)

**Equal Columns:**
```html
<nui-layout columns="3">
    <div>Card 1</div>
    <div>Card 2</div>
    <div>Card 3</div>
</nui-layout>
```

**Sidebar + Content (Ratio):**
```html
<nui-layout split="1:3">
    <aside>Sidebar</aside>
    <main>Content</main>
</nui-layout>
```

**Holy Grail (Ratio):**
```html
<nui-layout split="1:3:1">
    <aside>Left</aside>
    <main>Content</main>
    <aside>Right</aside>
</nui-layout>
```

**Auto-width Sidebar:**
```html
<nui-layout split="auto:1">
    <nav>Nav (natural width)</nav>
    <main>Content (fills remaining)</main>
</nui-layout>
```

### B. Flow Layout (`type="flow"`)

**Replaces `nui-column-flow`.** Uses CSS Multi-column layout, ideal for text or masonry-like card layouts where vertical stacking order matters less than packing efficiency.

**Standard Columns:**
```html
<nui-layout type="flow" columns="3">
    <!-- Items flow vertically, then wrap to next column -->
</nui-layout>
```

**Smart Width Calculation (Legacy Support):**
Retains the logic from `nui-column-flow` where `/3` calculates the exact pixel width to fit 3 columns based on container width.
```html
<nui-layout type="flow" column-width="/3">
    <!-- Column width = container width / 3 -->
</nui-layout>
```

**Balanced/Sorted Flow (Masonry-lite):**
Uses JavaScript to reorder DOM elements to ensure columns are visually balanced (simulating Masonry).
```html
<nui-layout type="flow" columns="3" sort="height">
    <!-- JS reorders items to balance column heights -->
</nui-layout>
```

> **Accessibility Note:** `sort="height"` reorders DOM elements visually but not for screen readers. Use thoughtfully.

## 5. Responsive Behavior

**Mobile-First:** All layouts default to a single-column stack. The specified layout applies at the desktop breakpoint (768px / 48rem).

```
Mobile (< 768px):  [Stack]
Desktop (≥ 768px): [Grid/Flow as specified]
```

For custom breakpoints, use CSS directly.

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
    const split = element.getAttribute('split');
    const gap = element.getAttribute('gap');

    if (gap) element.style.setProperty('--nui-layout-gap', gap);

    let template = '1fr';
    
    if (split) {
        // Parse ratio syntax: "1:2:1" -> "1fr 2fr 1fr"
        template = split.split(':').map(s => {
            s = s.trim();
            if (s === 'auto') return 'auto';
            return s + 'fr';
        }).join(' ');
    } else if (columns) {
        template = `repeat(${columns}, 1fr)`;
    }
    
    element.style.setProperty('--nui-layout-columns', template);
}

function handleFlowLayout(element) {
    // Port logic from nui-column-flow
    const columns = element.getAttribute('columns');
    const columnWidth = element.getAttribute('column-width');
    const sort = element.getAttribute('sort');
    const gap = element.getAttribute('gap');

    if (gap) element.style.setProperty('--nui-layout-gap', gap);
    if (columns) element.style.setProperty('--nui-layout-count', columns);
    
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
    // Reorder children by height for balanced columns
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

@media (min-width: 48rem) {
    nui-layout.nui-layout-grid {
        display: grid;
        grid-template-columns: var(--nui-layout-columns, 1fr);
    }

    nui-layout.nui-layout-flow {
        column-count: var(--nui-layout-count, auto);
        column-width: var(--nui-layout-width, auto);
        column-gap: var(--nui-layout-gap, 1rem);
    }
}

nui-layout.nui-layout-flow > * {
    break-inside: avoid;
}
```

## 7. Migration from `nui-column-flow`

| Before | After |
| :--- | :--- |
| `<nui-column-flow columns="3">` | `<nui-layout type="flow" columns="3">` |
| `<nui-column-flow column-width="/3">` | `<nui-layout type="flow" column-width="/3">` |
| `<nui-column-flow column-width="/3" sort="height">` | `<nui-layout type="flow" column-width="/3" sort="height">` |

`nui-column-flow` can be deprecated or kept as an alias.

## 8. Summary

| Feature | Supported | Not Supported (Use CSS) |
| :--- | :--- | :--- |
| Equal columns | `columns="3"` | — |
| Ratio splits | `split="1:2:1"` | Pixel values, `minmax()` |
| Auto-width | `split="auto:1"` | — |
| Custom gap | `gap="2rem"` | — |
| Flow/Masonry | `type="flow"` | — |
| Height balancing | `sort="height"` | — |
| Custom breakpoints | — | Use CSS media queries |
| Row spanning | — | Use CSS Grid directly |
| Named grid areas | — | Use CSS Grid directly |
