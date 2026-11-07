# nui-lightbox

## Setup

This is an addon module. Load both the JS and CSS before use:

```html
<link rel="stylesheet" href="NUI/css/modules/nui-lightbox.css">
<script type="module" src="NUI/lib/modules/nui-lightbox.js"></script>
```

## Design Philosophy

The lightbox component provides focused image viewing without leaving the page. It emphasizes performance through lazy-loading of full-resolution images and accessibility through keyboard navigation and ARIA attributes.

Key features:
- **Thumbnail/full-res separation** - Display thumbnails while loading full images on demand
- **Keyboard navigation** - Arrow keys, Escape to close
- **Carousel support** - Optional `loop` attribute for continuous navigation
- **Touch friendly** - Swipe gestures on mobile

When to Use:
- Photo galleries and portfolios
- Product image viewers
- Documentation screenshots
- Anywhere users need to examine images in detail

The lightbox handles focus management automatically, ensuring keyboard users can navigate and close the viewer easily.

## Declarative Usage

Wrap images in `<nui-lightbox>` for automatic grouping.

```html
<nui-lightbox loop>
    <img src="thumb1.jpg" data-lightbox-src="full1.jpg" alt="Description 1" />
    <img src="thumb2.jpg" data-lightbox-src="full2.jpg" alt="Description 2" />
    <img src="thumb3.jpg" data-lightbox-src="full3.jpg" alt="Description 3" />
</nui-lightbox>
```
The `data-lightbox-src` attribute specifies the full-resolution image to display.

**The markup is the whole interaction — there is no script to write.** The component marks
every image it collected as a trigger (`data-lightbox-trigger`, `role="button"`,
`tabindex="0"`, pointer cursor), so:

- clicking a thumbnail opens the gallery **on that image**;
- `Enter` and `Space` on a focused thumbnail do the same, so the gallery is reachable by
  keyboard without the host adding a thing;
- images inserted **after** the element connects (a message attachment rendered per
  message, a figure list fetched later) are marked too, and open on the right index
  because the index is resolved from the live DOM at click time.

Images that are not `img[data-lightbox]` / `[data-lightbox-src]` stay inert: no marker, no
cursor, no handler.

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `loop` | boolean | `false` | When present, allows continuous navigation cycling from the last image to the first. |
| `data-lightbox-src` | string | _none_ | Applies to inner `<img>` to specify the full-resolution image to display. |
| `data-lightbox` | boolean | _none_ | Marks an inner `<img>` as a trigger that uses its own `src` as the full image. |
| `data-lightbox-trigger` | boolean | _none_ | **Set by the component**, not by you: marks a collected thumbnail. The pointer cursor and focus ring are gated on it, so the affordance only appears where it is real. |

### Class Variants

None

## Programmatic Usage

Call `nui.components.lightbox.show()` with image arrays to open a lightbox from JavaScript without declarative markup:

```javascript
nui.components.lightbox.show([
    { src: 'image1.jpg', title: 'First Image' },
    { src: 'image2.jpg', title: 'Second Image' }
], 0); // Start at index 0
```

### DOM Methods

| Method | Parameters | Description |
|--------|------------|-------------|
| `nui.components.lightbox.show` | `images: Array<{src, title?}>, startIndex?: number` | Opens the lightbox programmatically. |
| `open` | `images?: Array<{src, title?}>, startIndex?: number` | Opens the lightbox on a specific `<nui-lightbox>` element instance. |
| `navigate` | `dir: number, startOffset?: number` | Navigates the lightbox to the previous (`-1`) or next (`1`) slide. |
| `close` | _none_ | Closes the lightbox dialog and cleans up temporary state. |
| `renderCurrent` | _none_ | Updates the DOM to visually show the currently selected image item based on index. |

### Action Delegates

- `lightbox:close`
- `lightbox:prev`
- `lightbox:next`
- `lightbox:open` — opens the gallery (at index `0`); `lightbox:open:<index>` opens on that
  index. For a wrapper or a button around a thumbnail, or any element outside the trigger
  selector. An element carrying `data-action` is always handled by the action path, never
  twice by the click delegation.

### Events

| Event | Detail | Description |
|-------|--------|-------------|
| `nui-lightbox-open` | `{}` | The lightbox dialog became visible. |
| `nui-lightbox-close` | `{}` | The lightbox dialog closed. |

