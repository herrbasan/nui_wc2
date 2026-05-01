# nui-tooltip

## Design Philosophy

The tooltip component provides contextual help and explanations without cluttering the interface. It follows the principle of progressive disclosure—showing information only when the user shows interest (hover or focus). 

Because rendering tooltips usually causes painful z-index and overflow clipping issues, NUI relies on the native HTML `Popover API`. This explicitly promotes the tooltip to the top layer of the browser rendering context, guaranteeing it will never be trapped inside a `overflow: hidden` parent container.

## Declarative Usage

### Auto-attachment (Adjacent Placement)

By default, the tooltip dynamically attaches itself to its immediately preceding sibling element. 

```html
<nui-button><button type="button">Hover me</button></nui-button>
<nui-tooltip>Helpful explanation here</nui-tooltip>
```

### Explicit Targeting

If DOM structure prevents adjacent placement, use the `for` attribute to explicitly link the tooltip to a target's `id`.

```html
<button id="mybtn">Hover me</button>
<nui-tooltip for="mybtn">Tooltip text</nui-tooltip>
```

## Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `for` | string | `null` | The `id` of the element this tooltip should attach to. If omitted, it attaches to the previous sibling. |
| `position` | string | `"auto"` | Manual placement override. Accepts `"top"`, `"bottom"`, `"left"`, `"right"`, or `"auto"`. If auto, it calculates the most optimal spatial positioning to prevent viewport collision. |
| `offset` | number | `16` | The distance (in pixels) the tooltip should float away from the target element. |

## Rich Content

Tooltips can act as mini-popovers. Since the hover intent is bound to both the trigger and the tooltip itself, users can move their mouse into the tooltip to interact with complex content.

```html
<nui-button><button type="button">Rich Info</button></nui-button>
<nui-tooltip>
    <span class="title">Complex Setup</span>
    <p>We support text, links, and forms inside.</p>
    <a href="#">Learn more</a>
</nui-tooltip>
```

## Programmatic Usage

All event bindings and display logic (hover intents, keyboard focus rings, `Escape` key dismissal) are handled entirely automatically upon initialization. The target element will also automatically be injected with an `aria-describedby` attribute linking to the tooltip's `id` (which is auto-generated if omitted) to satisfy immediate accessibility requirements. 

For procedural UI generation, simply inject the `<nui-tooltip>` adjacent to your target in the DOM.