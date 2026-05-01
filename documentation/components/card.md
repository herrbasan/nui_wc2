# nui-card

## Design Philosophy

Cards provide consistent surface styling while remaining flexible UI containers. Rather than enforcing strict internal layout constraints, the component focuses exclusively on presentation—borders, shadows, background coloration, and interactive hover states—leaving content structure up to the developer. 

This separation of concerns allows cards to comfortably hold any combination of images, text, forms, or actions without fighting against internal DOM restrictions. Because they use standard NUI CSS variables natively, they fit right into standard layout grids.

## Declarative Usage

### Standard Card

The default card stacks its internal content vertically using block flow. It supplies standardized padding, rounded corners, and a subtle shadow box.

```html
<nui-card>
    <img src="image.jpg" alt="Description" />
    <h3>Card Title</h3>
    <p>Card description text goes here.</p>
    <nui-button-container align="end">
        <nui-button><button>Action</button></nui-button>
    </nui-button-container>
</nui-card>
```

### Layout Variants
You can manipulate the orientation of the card using the `layout` attribute. 

**Horizontal Layout:** Places image and text side-by-side using Flexbox.

```html
<nui-card layout="horizontal">
    <img src="thumb.jpg" alt="Thumbnail" />
    <div>
        <h3>Title</h3>
        <p>Description</p>
    </div>
</nui-card>
```

**Image Overlay:** An advanced variant that assumes you want an image covering the background with text layered in an `.overlay` element over top.

```html
<nui-card layout="image-only">
    <img src="background.jpg" alt="Background" />
    <div class="overlay">
        <h3>Overlay Title</h3>
        <p>Description on image</p>
    </div>
</nui-card>
```

## Interactive Cards

Interactive cards respond to clicks and hover states, projecting an active elevation shadow. If a card provides an overarching link or action, add the `interactive` boolean attribute.

```html
<!-- Action system interactive card -->
<nui-card interactive data-action="dialog-open@#my-dialog">
    <h3>Clickable Card</h3>
    <p>Opens a dialog when clicked anywhere.</p>
</nui-card>
```

> **A11y Note:** The `interactive` attribute automatically manages `tabindex` and listens for `Enter` / `Space` keyboard execution, guaranteeing standard focus accessibility.

### Semantic Covering Links

If you want a card's entire surface area to act as an anchor tag, place a standard `<a>` element inside the card with the `nui-card-link` class. The component's CSS will expand this link's clickable bounds to cover the entire card surface without requiring JavaScript event delegation.

```html
<nui-card interactive>
    <a class="nui-card-link" href="/details/123">Read More</a>
    <h3>Linked Card</h3>
    <p>Description text.</p>
</nui-card>
```


## Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `layout` | string | `null` | Controls the internal rendering structure. Options: `"horizontal"`, `"image-only"`, `"flip"`. If omitted, content stacks vertically. |
| `interactive` | boolean | `false` | Assigns an interactive hover state and elevation shadow. Also automatically manages `tabindex` and `Enter`/`Space` keyboard execution for accessibility if no direct child anchor is present. |
| `flipped` | boolean | `false` | When `layout="flip"` is enabled, toggling this boolean attribute physically rotates the card to reveal `.nui-card-back` and hides `.nui-card-front`. |

## Flip Cards

Two-sided cards that physically rotate 180 degrees using CSS 3D transforms. 

Setting `layout="flip"` structures the card to hold exactly two panels (`nui-card-front` and `nui-card-back`) inside a `.nui-card-inner` wrapper. JavaScript automatically binds keyboard navigation and updates `aria-expanded` when the component receives a `flipped` attribute string.

```html
<nui-card layout="flip">
    <div class="nui-card-inner">
        <div class="nui-card-front">
            <h3>Front View</h3>
            <!-- An action flips the container by injecting the 'flipped' attr -->
            <button data-action="card-flip">Turn Over</button>
        </div>
        <div class="nui-card-back">
            <h3>Back View</h3>
            <button data-action="card-flip">Turn Back</button>
        </div>
    </div>
</nui-card>
```

### Programmatic Flipping

To physically trigger a flip on a `layout="flip"` card, just toggle its `flipped` boolean DOM attribute:

```javascript
document.querySelector('nui-card[layout="flip"]').toggleAttribute('flipped');
```
