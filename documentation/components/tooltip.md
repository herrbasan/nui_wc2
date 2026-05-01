# nui-tooltip

## Design Philosophy

The tooltip component provides contextual help without cluttering the interface. It follows the principle of progressive disclosure — showing information only when the user shows interest (hover or focus).

Because tooltips often cause z-index and overflow clipping issues, NUI uses the native HTML **Popover API**. This promotes the tooltip to the browser's top layer, guaranteeing it will never be trapped inside an `overflow: hidden` parent.

**Browser support:** The Popover API is supported in Chrome 114+, Firefox 125+, Safari 17+. In unsupported browsers, tooltips degrade gracefully — they may appear but without top-layer guarantees.

## Declarative Usage

### Auto-attachment (Adjacent Placement)

By default, the tooltip attaches to its immediately preceding sibling:

```html
<nui-button><button type="button">Hover me</button></nui-button>
<nui-tooltip>Helpful explanation here</nui-tooltip>
```

### Explicit Targeting

If DOM structure prevents adjacent placement, use the `for` attribute:

```html
<button id="mybtn">Hover me</button>
<nui-tooltip for="mybtn">Tooltip text</nui-tooltip>
```

## Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `for` | string | `null` | The `id` of the element this tooltip should attach to. If omitted, it attaches to the previous sibling. |
| `position` | string | `"auto"` | Manual placement override: `"top"`, `"bottom"`, `"left"`, `"right"`, or `"auto"` (calculates optimal position to prevent viewport collision). |
| `offset` | number | `16` | Distance in pixels from the target element. |

## Rich Content

Tooltips can act as mini-popovers. The hover intent is bound to both the trigger and the tooltip itself, so users can move their mouse into the tooltip to interact with complex content:

```html
<nui-button><button type="button">Rich Info</button></nui-button>
<nui-tooltip>
    <span class="title">Complex Setup</span>
    <p>We support text, links, and forms inside.</p>
    <a href="#">Learn more</a>
</nui-tooltip>
```

## Programmatic Usage

All display logic (hover intents, keyboard focus, `Escape` dismissal) is handled automatically upon initialization. The target element gets an `aria-describedby` attribute linking to the tooltip's `id` (auto-generated if omitted).

### Dynamic Tooltips

For procedural UI generation, inject the `<nui-tooltip>` adjacent to your target in the DOM. The component auto-initializes via `connectedCallback`:

```javascript
const btn = document.createElement('nui-button');
btn.innerHTML = '<button type="button">Action</button>';

const tooltip = document.createElement('nui-tooltip');
tooltip.textContent = 'Explains the action';

container.append(btn, tooltip);
```

### Showing and Hiding

Tooltips are triggered by hover and focus events. For programmatic control, you can show/hide by dispatching the appropriate events on the target, or by toggling the popover manually:

```javascript
const tooltip = document.querySelector('nui-tooltip');

// Show programmatically
tooltip.togglePopover?.(true);

// Hide programmatically
tooltip.togglePopover?.(false);
```

## Accessibility

- Target elements receive `aria-describedby` pointing to the tooltip's `id`.
- Tooltips appear on **focus** (keyboard) and **hover** (mouse).
- `Escape` key dismisses the tooltip.
- Tooltip content is announced by screen readers when the target receives focus.

## When to Use

**Use tooltips for:**
- Brief explanations of icon-only buttons
- Supplementary context that would clutter the main UI
- Keyboard shortcut hints

**Avoid tooltips for:**
- Critical information the user must read (use inline text or a callout)
- Interactive forms or complex content (use a dialog or popover instead)
- Touch-only interfaces (hover doesn't exist on touch; use press-and-hold or inline text)
