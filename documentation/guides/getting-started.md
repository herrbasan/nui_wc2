# LLM Guide: NUI Project Setup & Architecture

## The Essential Setup

NUI requires minimal setup because it works *with* the browser, not against it. The core principle: load CSS first (to prevent FOUC), then load JavaScript as an ES module.

### Required Files

- **`nui-theme.css`**: The foundation. Defines all CSS custom properties (colors, spacing, borders) and base component styles. Must load before any NUI elements render.
- **`nui.js`**: The core library. Registers custom elements, provides the `nui` API object. Load as `type="module"` to enable ES module features.

### The Loading Sequence

1. **CSS loads** (in `<head>`) - Elements have styling immediately.
2. **HTML renders** - Native elements remain visible, while custom elements are treated as `div`s until upgraded.
3. **JS loads** - Custom elements upgrade, behaviors attach.
4. **`nui-ready` class added** - `nui-app` signals initialization is complete.

## Project Structure Patterns

### Standalone Page (Simplest)
Use when you need a few components on a static page. No routing, no SPA behavior.
```html
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta name="color-scheme" content="light dark">
	<!-- NUI Theme (REQUIRED) -->
	<link rel="stylesheet" href="NUI/css/nui-theme.css">
</head>
<body>
	<nui-button>
		<button type="button">Click Me</button>
	</nui-button>

	<!-- Module load -->
	<script type="module" src="NUI/nui.js"></script>
</body>
</html>
```

### SPA with Routing
For multi-page applications. The router (`nui.setupRouter()`) intercepts hash changes and loads content fragments dynamically.

Key architectural decisions:
- `container: 'nui-main'` - Where fragments load.
- `basePath: 'pages'` - Folder containing HTML fragments.
- Navigation uses hash format: `#page=path/to/page`.

### Layout Modes

- **App Mode** (`<nui-app>` present): Creates a desktop-application layout with a fixed header, collapsible sidebar, and scrollable content area. Uses CSS Grid with fixed positioning.
- **Page Mode** (no `<nui-app>` present): Components flow in normal document flow. Good for content sites, documentation, blogs.

## Two Development Patterns

### Declarative Pattern
Write HTML; NUI enhances it. Best when content is known at build time.
- Tabs use `<nav>` with buttons and `<section>` panels
- Buttons wrap native `<button>` elements
- Accordion uses `<details>`/`<summary>`

### Data-Driven Pattern
Use JavaScript APIs for runtime-generated content.
- `nui.components.dialog.confirm()` for modals
- `nui.components.banner.show()` for notifications
- `nui.components.linkList.create()` for navigation trees

## Routing Deep Dive

The router is a **state coordinator**, not a framework. It:
1. Parses URL hash (`#page=about` or `#feature=dashboard`).
2. Creates a wrapper `<nui-page>` or `<div>` for the content.
3. Either fetches HTML (fragment mode) or runs a registered function (feature mode).
4. Caches the wrapper and calls `show()`/`hide()` methods on navigation.

### Fragment Loading
```javascript
nui.setupRouter({
    container: 'nui-main',      // Element selector
    basePath: 'pages',          // Relative to root
    defaultPage: 'home'         // When hash is empty
});
```
Navigating to `#page=about` fetches `pages/about.html`.

### Feature Registration
```javascript
nui.registerFeature('dashboard', (element, params) => {
    // Build UI programmatically
    element.innerHTML = '<div>...</div>';
    
    // Optional lifecycle hooks called by the router
    element.show = () => { /* on visible */ };
    element.hide = () => { /* on hidden */ };
});
```
Navigating to `#feature=dashboard` runs this function.

## Action Delegation Pattern

Instead of attaching listeners to individual buttons, use `data-action` attributes and rely on NUI's event delegation:

```html
<button data-action="save:draft">Save Draft</button>
<button data-action="save:publish">Publish</button>
<button data-action="delete@#post-123">Delete</button>
```

The system parses this syntax: `action:param@target`
- A single listener on the container catches all clicks.
- It translates them into `nui-action` events, and specific `nui-action-{name}` events.
- `event.detail` contains `{ name, param, target }`.
- Dynamic content works without needing to attach new listeners.

## CSS Variables for Theming

NUI uses a semantic, runtime-configurable design token system defined in `NUI/css/nui-theme.css`. **That file is the authoritative reference** for every available variable. The naming conventions follow predictable patterns:

### Variable Naming Conventions

| Pattern | Examples | Purpose |
|---------|----------|---------|
| `--color-base` | Base background | Root surface color |
| `--color-shade1` through `--color-shade9` | Progressive shades | Surfaces, text, borders (shade1 = lightest, shade9 = darkest) |
| `--color-highlight` | Primary accent | Buttons, links, focus rings |
| `--nui-space` | Base spacing unit | Padding, margins, gaps |
| `--nui-space-half`, `--nui-space-double` | Spacing variants | Derived from the base unit |
| `--border-thickness` | Border width | Consistent borders |
| `--border-shade1` | Border color | Matches theme context |
| `--border-radius1`, `--border-radius2` | Corner rounding | Buttons, cards, inputs |

### How to Theme

Override variables in `:root` for global changes, or on a specific container for scoped theming:

```css
:root {
    --color-base: #1a1a2e;
    --color-highlight: #e94560;
}
```

The theme fully supports `color-scheme: light dark` via CSS `light-dark()`, so light and dark modes work automatically when the user's OS preference changes. To add dark mode overrides:

```css
@media (prefers-color-scheme: dark) {
    :root {
        --color-base: #0f0f1a;
    }
}
```

### What Not to Do

- **Never invent new CSS variables.** Use only what `nui-theme.css` defines.
- **Never hard-code colors, sizes, or spacing.** Always use variables.
- **Avoid inline styles** for static layout — use CSS classes.

To see the complete list of variables, read `NUI/css/nui-theme.css`.
