# nui-layout (Content Container)

## Design Philosophy

Most layout systems offer unlimited flexibility—any column count, any breakpoint, any ratio. This often leads to inconsistent implementations and repeated responsive logic. `nui-layout` takes the opposite approach: **the constraint is the feature**.

By encoding best practices directly into the component, it eliminates the need for developers to write the same responsive patterns repeatedly. The component enforces a natural column progression based on viewport math.

## How It Works

The viewport math emerges from a simple principle: content must be consumable on the smallest viewport (320px mobile). This yields natural column counts:

| Viewport | Width | Columns | Reasoning |
|----------|-------|---------|-----------|
| Mobile | ~320px | 1 | Base unit |
| Tablet | ~640px | 2 | 2x mobile width |
| Desktop | ~960px+ | 3+ | 3x mobile width |

This means **1, 2, and 3 are the natural column counts**. The component encodes this pattern and handles responsive collapsing automatically.

## Layout Types

### Grid Layout (Default)

Equal-height columns using CSS Grid. Specify the target column count for desktop; the component handles tablet and mobile automatically.

```html
<nui-layout columns="2">
    <nui-card>Card 1</nui-card>
    <nui-card>Card 2</nui-card>
</nui-layout>
```

### Flow Layout

Content flows vertically then wraps, creating a masonry-like effect:

```html
<nui-layout type="flow" columns="3">
    <nui-card>Item 1</nui-card>
    <nui-card>Item 2</nui-card>
</nui-layout>
```

Add `sort="height"` to reorder items so tallest items appear first for better balance.

### Breakout Mode

Break out of max-width constraints for full-bleed sections using the `breakout` attribute on any child of `nui-page`:

```html
<nui-page>
    <nui-layout breakout>
        <div class="maxwidth-container">Full-width content</div>
    </nui-layout>
</nui-page>
```

Use `breakout` on any element that should span the full width of the container while siblings remain constrained for readability.


## Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `type` | string | `"grid"` | Controls the internal layout algorithm. Options: `"grid"`, `"flow"`. |
| `columns` | number | `1` | Target column count for desktop viewports. The component automatically scales this down for tablet/mobile. |
| `gap` | string | `null` | Optional CSS string (e.g. `1rem`) to override the gap between elements. |
| `column-width` | string | `null` | *(Flow layout only)* Optional explicit width setting. Accepts syntax like `"/3"` to force equal thirds dynamically. |
| `sort` | string | `null` | *(Flow layout only)* If `"height"`, DOM elements will be automatically reordered so taller items appear first. |

## Responsive Contract

The component automatically clamps column counts at different breakpoints:

| Viewport | columns="2" | columns="3" | columns="4" |
|----------|-------------|-------------|-------------|
| Desktop (>=768px) | 2 | 3 | 4 |
| Tablet (480-767px) | 2 | 2 | 2 |
| Mobile (<480px) | 1 | 1 | 1 |

## When to Use

- **Grid**: Cards, form fields, dashboard widgets, galleries
- **Flow**: Masonry layouts, tag clouds, image galleries
- **Breakout**: Hero sections, featured callouts, visual separators (use `breakout` attribute)

This component handles content layouts. For structural app chrome (sidebars, headers), use `nui-app` instead.

## nui-page Container

The `nui-page` component is the recommended container for page content. It automatically constrains children to a readable max-width. Use the `breakout` attribute on any child to make it span full width:

```html
<nui-page>
    <section><!-- Constrained --></section>
    <nui-layout breakout><!-- Full width --></nui-layout>
    <section><!-- Constrained --></section>
</nui-page>
```
