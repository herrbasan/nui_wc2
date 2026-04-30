# nui-dropzone

## Design Philosophy
The dropzone component provides a container-scoped file drop overlay that appears automatically when files are dragged into the browser window. Rather than requiring users to target a small drop area, it creates an intuitive full-container overlay with named zones for categorizing dropped files.

## How It Works
The component listens for `dragenter`, `dragleave`, and `drop` events at the window level. When files enter the browser, the overlay becomes visible via the `active` attribute, which CSS uses to toggle opacity and pointer-events. The overlay hides when the drag leaves the window (`relatedTarget === null`) or when files are dropped.

Each zone child with `[data-drop]` receives an `.active` class on drag hover, providing visual feedback for the target area.

## Grid Auto-Layout
The component automatically calculates an optimal grid layout based on zone count:
- 1 zone → single column
- 2 zones → 2 columns
- 3 zones → 2 columns (2 top, 1 bottom)
- 4 zones → 2×2 grid
- 5 zones → 3+2 layout
- 6 zones → 3×2 grid

The layout uses `Math.ceil(Math.sqrt(count))` for column count, with incomplete rows spanning wider to fill space evenly.

## Usage Patterns

### Declarative HTML
Wrap zones in `<nui-dropzone>` with `data-drop` attributes for named drop targets:

```html
<div style="position: relative; min-height: 12rem;">
        <nui-dropzone>
                <div data-drop="images">Images</div>
                <div data-drop="documents">Documents</div>
        </nui-dropzone>
</div>
```

### Programmatic Creation
Create dropzones dynamically using the component API:

```javascript
nui.components.dropzone.create(
    [
        { name: 'images', label: 'Images' },
        { name: 'documents', label: 'Documents' }
    ],
    (detail, event) => { 
        console.log(detail.zone, detail.dataTransfer.files); 
    },
    document.querySelector('#target')
);
```

## Events
The component dispatches these events:
- `nui-dropzone-open` — Overlay became visible
- `nui-dropzone-drop` — Files were dropped. Detail includes `{ zone, dataTransfer, originalEvent }`
- `nui-dropzone-close` — Overlay hidden after drop or drag-leave

## When to Use
Use the dropzone when you want users to categorize files during upload (like separating images from documents), or when you need a prominent, hard-to-miss drop target that covers a specific container area rather than the entire page.