# nui-icon

## Design Philosophy

Icons in NUI use SVG sprites rather than font files. This choice provides several advantages:
- Vector graphics scale cleanly at any size.
- A single HTTP request handles all icons (via a sprite sheet).
- CSS color inheritance works naturally.
- Eliminates the Flash of Unstyled Content (FOUC) typical with font loading.

## SVG Sprite System

All icons are sourced from a single configurable SVG file. By default, NUI connects to a `material-icons-sprite.svg` path. The `<nui-icon>` component extracts and renders icons by their name reference.

```html
<nui-icon name="settings">⚙</nui-icon>
```

Text content placed inside the `<nui-icon>` tag serves strictly as a fallback. Once JavaScript initializes the component, it replaces the inner text with an instantiated `<svg>` to render the vector icon.

## Sizing

Icons immediately inherit `font-size` from their parent element. This ensures perfect alignment and proportion with the surrounding text:

```html
<p>Settings <nui-icon name="settings"></nui-icon></p>
```

If you require an explicit size, assign it via CSS or inline styles:

```html
<nui-icon name="settings" style="font-size: 24px;"></nui-icon>
```

## Theming & Color

Icons inherit the text `color` strictly via CSS. 

```css
/* Inherit document text color */
nui-icon { color: var(--color-text); }

/* Custom coloring */
.alert nui-icon { color: var(--color-danger); }
```

## Accessibility (A11y)

By default, NUI scripts force `<nui-icon>` elements to have `aria-hidden="true"`. We treat icons as decorative supplements. When using icons side-by-side with text, they should remain hidden from screen readers. 

```html
<nui-button>
	<button>
		<nui-icon name="save"></nui-icon>
		Save Changes
	</button>
</nui-button>
```

**Icon-Only Action Constraints:** If your button contains only an icon and no text, you must place an explicit `aria-label` on the wrapper (e.g. the `<button>`) to identify the control for assistive technology.

```html
<nui-button>
	<button aria-label="Close Panel">
		<nui-icon name="close"></nui-icon>
	</button>
</nui-button>
```

## Attributes and Properties

| Attribute | Type     | Description |
|-----------|----------|-------------|
| `name`    | `string` | The ID identifier attached to the corresponding `<symbol>` inside the SVG sprite sheet. |

### DOM Properties

| Property | Type | Description |
|---|---|---|
| `element.iconName` | `string` | Gets or sets the icon name programmatically. Updating this property will instantly trigger a re-render of the SVG reference. |