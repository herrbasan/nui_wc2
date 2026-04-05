# NUI - High-Performance, Accessible UI Component Library

> **🤖 Note for AI Assistants & LLMs:**
> 1. **Documentation = Playground:** The `Playground/` directory IS the official documentation. Looking for how a component works? Read its file in `Playground/pages/components/` or `Playground/pages/addons/`.
> 2. **Check the LLM Guide:** Complex components (like `nui-list` or `nui-dialog`) have a `<script type="text/markdown" id="llm-guide">` at the very top of their Playground file. **You MUST read this guide** before generating code for that component!
> 3. **Strict Light DOM Wrappers:** NUI uses the *Light DOM*. It wraps semantic HTML. **Never** invent tags or omit the internal native element.
>    *Correct:* `<nui-button><button>Click</button></nui-button>`
>    *Wrong:* `<nui-button>Click</nui-button>` or `<ui-button>` 
> 4. **Read `Playground/README.md`** for the complete LLM Orientation Guide.

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
| `nui-app-header` | Top navigation container (`<header>` accessibility upgrades) |
| `nui-sidebar` | Side navigation container (integrates with `nui-link-list`) |
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
| `nui-progress` | Progress indicator (determinate and circular) |
| `nui-badge` | Inline badge for status, labels, counts |
| `nui-card` | Flexible content container |
| `nui-tabs` | Tab panels with keyboard navigation |
| `nui-accordion` | Collapsible sections |
| `nui-overlay` | Generic modal backdrop / lightbox |
| `nui-dialog` | Modal dialogs (wraps native `<dialog>`) |
| `nui-banner` | Notifications and alerts |
| `nui-table` | Table enhancements (responsive labels/card layout helpers) |
| `nui-sortable` | Drag-and-drop reordering with FLIP animation |
| `nui-slider` | Custom range input with drag support |
| `nui-dropzone` | Drag-and-drop overlay with named drop zones |
| `nui-input-group` | Form field grouping helper |
| `nui-input` | Text input enhancements |
| `nui-textarea` | Textarea enhancements |
| `nui-checkbox` | Checkbox enhancements |
| `nui-radio` | Radio button enhancements |
| `nui-select` | Enhanced select with search and multi-select |
| `nui-tag-input` | Tag management with keyboard navigation |
| `nui-link-list` | Navigation trees with ARIA tree pattern |
| `nui-code` | Code blocks with copy button + syntax highlighting |
| `nui-tooltip` | Popover tooltip for hover/focus annotations |

## Optional Modules

These are opt-in addons in `NUI/lib/modules/`.

| Module | Type | What it does | CSS |
|--------|------|--------------|-----|
| `nui-menu` | Component | Application-style menubar with dropdowns and keyboard navigation | `NUI/css/modules/nui-menu.css` |
| `nui-list` | Component | Virtualized list for large datasets | `NUI/css/modules/nui-list.css` |
| `nui-lightbox` | Component | Image and media gallery lightbox | `NUI/css/modules/nui-lightbox.css` |
| `nui-rich-text` | Component | Native WYSIWYG editor with custom toolbars | `NUI/css/modules/nui-rich-text.css` |
| `nui-code-editor` | Component | Lightweight code editor with syntax highlighting | `NUI/css/modules/nui-code-editor.css` |
| `nui-app-window` | Component | Desktop-style app window with title bar, status bar, dark mode | `NUI/css/modules/nui-app-window.css` |
| `nui-media-player` | Component | Audio/video player with streaming support | `NUI/css/modules/nui-media-player.css` |
| `nui-context-menu` | Component | Right-click context menu | `NUI/css/modules/nui-context-menu.css` |
| `nui-markdown` | Component | Markdown renderer | — |
| `nui-syntax-highlight` | Utility | Exports `highlight(code, lang)`; `nui-code` imports it on-demand automatically | `NUI/css/modules/nui-syntax-highlight.css` |
| `nui-monitor` | Utility | Deprecated | — |

Minimal loading example:

```html
<link rel="stylesheet" href="NUI/css/nui-theme.css">

<!-- Only if you use the related addons -->
<link rel="stylesheet" href="NUI/css/modules/nui-menu.css">
<link rel="stylesheet" href="NUI/css/modules/nui-app-window.css">

<script type="module" src="NUI/nui.js"></script>

<!-- Optional modules -->
<script type="module" src="NUI/lib/modules/nui-menu.js"></script>
```

## Philosophy

NUI embraces the web platform. Instead of abstracting away the DOM, it works with it directly. Components use semantic HTML inside custom element containers, making them accessible and debuggable with standard browser tools.

This approach won't be for everyone—and that's okay. If you need a full reactive framework, there are great options out there. NUI is for projects where simplicity and performance are the priority.

## Learn More

**[See the Playground for live examples and documentation →](https://herrbasan.github.io/nui_wc2/)**

## License

MIT
