# NUI - Platform-Native UI Component Library

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
| `nui-app` | App shell with sidebar, topbar, content grid |
| `nui-tabs` | Tab panels with keyboard navigation |
| `nui-accordion` | Collapsible sections |
| `nui-dialog` | Modal dialogs (wraps native `<dialog>`) |
| `nui-banner` | Notifications and alerts |
| `nui-table` | Data tables with sorting and filtering |
| `nui-slider` | Custom range input with drag support |
| `nui-input` | Form input enhancements |
| `nui-link-list` | Navigation trees with ARIA tree pattern |
| `nui-code` | Code blocks with syntax highlighting |
| `nui-button` | Button enhancements |
| `nui-icon` | Icon system with SVG sprite support |

## Philosophy

NUI embraces the web platform. Instead of abstracting away the DOM, it works with it directly. Components use semantic HTML inside custom element containers, making them accessible and debuggable with standard browser tools.

This approach won't be for everyone—and that's okay. If you need a full reactive framework, there are great options out there. NUI is for projects where simplicity and performance are the priority.

## Learn More

**[See the Playground for live examples and documentation →](https://herrbasan.github.io/nui_wc2/)**

## License

MIT
