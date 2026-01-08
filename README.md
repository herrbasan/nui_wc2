# NUI - High-Performance, Accessible UI Component Library

> ⚠️ **Early Development** — API may change. Feedback welcome!

A lightweight UI component library built on web standards. No framework required.

**Fast** — Direct DOM manipulation, no virtual DOM overhead  
**Accessible** — ARIA roles and keyboard navigation built in  
**Simple** — Semantic HTML foundation, minimal boilerplate

**[📖 Documentation & Playground →](https://herrbasan.github.io/nui_wc2/)**

## What is NUI?

NUI is a collection of UI components that work directly with the browser's native APIs. It's designed for developers who want a simple, fast foundation without the overhead of a full framework.

- **Zero dependencies** — just HTML, CSS, and JavaScript
- **No build step required** — drop it in and go
- **Progressive enhancement** — semantic HTML that works, then enhanced with JavaScript
- **Accessible by default** — proper ARIA support and keyboard navigation built in

## Quick Start

```html
<link rel="stylesheet" href="NUI/css/nui-theme.css">
<script type="module" src="NUI/nui.js"></script>

<nui-button>
    <button type="button">Click Me</button>
</nui-button>
```

The semantic `<button>` inside works on its own. The `<nui-button>` wrapper adds enhanced behavior and styling.

## Features

- **Dual-Mode Layout** — App mode (dashboard-style grid) or Page mode (natural document flow)
- **CSS Variable Theming** — Customize the entire design system with CSS custom properties
- **Keyboard Navigation** — Full arrow key and Tab support where appropriate

## Components

| Component | Description |
|-----------|-------------|
| `nui-app` | App shell with sidebar/topbar layout behavior |
| `nui-top-nav` | Top navigation container (`<header>` accessibility upgrades) |
| `nui-side-nav` | Side navigation container (integrates with `nui-link-list`) |
| `nui-content` | Content container (layout + accessibility upgrades) |
| `nui-main` | Main content container (layout + accessibility upgrades) |
| `nui-app-footer` | App footer container |
| `nui-skip-links` | Skip links navigation (auto-targets `<main>`) |
| `nui-layout` | Responsive layout helper (grid / flow) |
| `nui-column-flow` | Deprecated (use `nui-layout type="flow"`) |
| `nui-button` | Button enhancements |
| `nui-button-container` | Button group layout (alignment / spacing) |
| `nui-icon` | Icon system with SVG sprite support |
| `nui-icon-button` | Layout helper for icon-only buttons |
| `nui-loading` | Loading overlay / indicator |
| `nui-tabs` | Tab panels with keyboard navigation |
| `nui-accordion` | Collapsible sections |
| `nui-dialog` | Modal dialogs (wraps native `<dialog>`) |
| `nui-banner` | Notifications and alerts |
| `nui-table` | Table enhancements (responsive labels/card layout helpers) |
| `nui-slider` | Custom range input with drag support |
| `nui-input-group` | Form field grouping helper |
| `nui-input` | Text input enhancements |
| `nui-textarea` | Textarea enhancements |
| `nui-checkbox` | Checkbox enhancements |
| `nui-radio` | Radio button enhancements |
| `nui-link-list` | Navigation trees with ARIA tree pattern |
| `nui-code` | Code blocks with copy button + web-language syntax highlighting (HTML/CSS/JS/TS/JSON) |

## Optional Modules

These are opt-in addons in `NUI/lib/modules/`.

| Module | Type | What it does | CSS |
|--------|------|--------------|-----|
| `nui-menu` | Component | Adds the `<nui-menu>` addon component (supports `.loadData(...)` and declarative HTML) | `NUI/css/modules/nui-menu.css` |
| `nui-animation` | Utility | Adds `nui.animate(...)` and `Element.prototype.ani(...)` (Web Animations wrapper) | — |
| `nui-syntax-highlight` | Utility | Exports `highlight(code, lang)`; `nui-code` imports it on-demand automatically | `NUI/css/modules/nui-syntax-highlight.css` |
| `nui-monitor` | Utility | Deprecated (was for removed Knower/Doer experiments) | — |

Minimal loading example:

```html
<link rel="stylesheet" href="NUI/css/nui-theme.css">

<!-- Only if you use the related addons -->
<link rel="stylesheet" href="NUI/css/modules/nui-menu.css">
<link rel="stylesheet" href="NUI/css/modules/nui-syntax-highlight.css">

<script type="module" src="NUI/nui.js"></script>

<!-- Optional modules -->
<script type="module" src="NUI/lib/modules/nui-menu.js"></script>
<script type="module" src="NUI/lib/modules/nui-animation.js"></script>
```

## Philosophy

NUI embraces the web platform. Instead of abstracting away the DOM, it works with it directly. Components use semantic HTML inside custom element containers, making them accessible and debuggable with standard browser tools.

This approach won't be for everyone—and that's okay. If you need a full reactive framework, there are great options out there. NUI is for projects where simplicity and performance are the priority.

## Learn More

**[See the Playground for live examples and documentation →](https://herrbasan.github.io/nui_wc2/)**

## License

MIT
