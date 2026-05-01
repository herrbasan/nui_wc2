# nui-overlay

## Design Philosophy

While `nui-dialog` provides a structured modal with header/footer regions, `nui-overlay` is a minimal container for custom modal content. It provides the essential overlay behavior (backdrop, centering, focus management) without imposing layout constraints.

Use overlay when:
- Building lightboxes for images
- Creating custom modal forms with unique layouts
- Implementing full-screen loading states
- Any content that needs modal presentation but doesn't fit the dialog structure

## Structure

```html
<nui-overlay id="lightbox">
	<dialog>
		<img src="photo.jpg" alt="Photo">
		<button data-action="overlay-close@#lightbox">Close</button>
	</dialog>
</nui-overlay>
```

The inner `<dialog>` element provides the native modal behavior. The overlay wrapper adds NUI styling and theme integration.

## Opening and Closing

Declarative triggers:
```html
<button data-action="overlay-open@#lightbox">View Photo</button>
```

Programmatic control:
```javascript
const overlay = document.getElementById('lightbox');
overlay.showModal();
// Later...
overlay.close();
```

## Blocking Mode

Add the `blocking` attribute to prevent closing by clicking the backdrop:

```html
<nui-overlay blocking>
	<dialog>
		<!-- Critical content that needs explicit dismissal -->
	</dialog>
</nui-overlay>
```

In blocking mode, users must interact with content inside the overlay or click an explicit close button.

## Events

Listen for overlay lifecycle:

```javascript
overlay.addEventListener('nui-overlay-open', () => {
	// Overlay is now visible
});

overlay.addEventListener('nui-overlay-close', () => {
	// Overlay was closed
});
```

## Overlay vs Dialog

**Use overlay for:**
- Custom layouts (lightboxes, full-screen modals)
- Content that doesn't fit dialog structure
- Image galleries, media viewers

**Use dialog for:**
- Standard alerts and confirmations
- Forms with standard header/content/footer
- System-level notifications
