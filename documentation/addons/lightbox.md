# nui-lightbox

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

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `loop` | boolean | `false` | When present, allows continuous navigation cycling from the last image to the first. |
| `data-lightbox-src` | string | _none_ | Applies to inner `<img>` to specify the full-resolution image to display. |

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

### Events

| Event | Detail | Description |
|-------|--------|-------------|
| None | | |

