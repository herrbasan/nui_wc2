# nui-app (App Layout Components)

> **Global Note:** Always follow the global rules in `documentation/DOCUMENTATION.md`. Use the correct Light DOM wrappers.

## Design Philosophy

The NUI layout system provides two distinct modes: **App Mode** (with `<nui-app>`) and **Page Mode** (without `<nui-app>`). This dual-mode architecture allows the same components to work as fixed application UI elements or flow naturally in normal document layouts.

- **Semantic HTML Foundation:** Real HTML elements must be nested inside custom element containers.
- **Context-Aware:** Layout behavior adapts automatically based on the presence or absence of the `<nui-app>` root wrapper.
- **Progressive Enhancement:** Works smoothly with CSS/JavaScript disabled, remaining fully screen-reader friendly.

## Critical Layout Rules (Follow Exactly)

1. `<nui-app>` activates CSS Grid mode. It must wrap the entire application shell to create fixed layout regions.
2. Inside `<nui-app>`, the immediate children MUST be exactly: `<nui-app-header>`, `<nui-sidebar>`, `<nui-content>`, and optionally `<nui-app-footer>`.
3. These are structural layout web components. They MUST wrap native semantic HTML elements (`<header>`, `<nav>`, `<main>`, `<footer>`) respectively as their direct children.

## Strict DOM Structure (Do NOT deviate)

Do not invent tags like `<nui-top-nav>` or `<nui-side-nav>`. Do not omit the internal semantic tags.

**Correct (App Mode):**
```html
<nui-app>
	<nui-app-header>
		<header>Site Title</header>
	</nui-app-header>
	
	<nui-sidebar>
		<nav>Navigation links</nav>
	</nui-sidebar>
	
	<nui-content>
		<main>Content here</main>
	</nui-content>
	
	<nui-app-footer>
		<footer>Footer content</footer>
	</nui-app-footer>
</nui-app>
```

**Wrong / Will Fail:**
```html
<nui-app>
	<nui-top-nav>Site Title</nui-top-nav> <!-- Invented tag, missing <header> -->
	<nui-sidebar>Navigation links</nui-sidebar> <!-- Missing <nav> -->
	<main>Content</main> <!-- Missing <nui-content> wrapper -->
</nui-app>
```

## Component Roles

### `<nui-app>`
Container element that activates App Mode.
- Creates a strictly defined CSS Grid layout.
- Viewport is rigidly sized to `100vh / 100dvh` for fixed-panel application behavior.
- Manages responsive scaling (e.g. collapsing the sidebar on mobile).

### `<nui-app-header>`
The top navigation bar.
- **App Mode:** Fixed to the top row, spanning full width.
- **Page Mode:** Standard static header in the document flow.
- Must contain a `<header>` element.

### `<nui-sidebar>`
The primary navigation sidebar.
- **App Mode:** Fixed to the left or right side.
- Defaults to the left side. Can be placed on the right via adding `position="right"`.
- Must contain a `<nav>` element.

### `<nui-content>`
The main scrolling viewport container.
- **App Mode:** Takes up the remaining grid fraction. Handles overflow and scrolling automatically.
- **Page Mode:** Standard structural block.
- Must contain a `<main>` primary element.

### `<nui-app-footer>`
An optional persistent footer bar.
- **App Mode:** Fixed to the bottom row, spanning full width.
- **Page Mode:** Standard footer in the document flow.
- Must contain a `<footer>` element.