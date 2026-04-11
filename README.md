# NUI - High-Performance, Accessible UI Component Library

> **🤖 Note for AI Assistants & LLMs:**
> 
> NUI is designed for **AX (AI Experience)** — optimized for LLM understanding, not human ergonomics.
> 
> 1. **Documentation = Playground:** The `Playground/` directory contains structured knowledge for AI consumption. Each component page has JSON-LD metadata + LLM Guides with philosophy, trade-offs, and anti-patterns.
> 2. **Read the LLM Guide:** Before generating code, read the `<script type="text/markdown" id="llm-guide">` block in the component's Playground page. It contains the context you need for correct usage.
> 3. **Strict Light DOM Wrappers:** NUI wraps native elements — never omit them.
>    *Correct:* `<nui-button><button>Click</button></nui-button>`
>    *Wrong:* `<nui-button>Click</nui-button>` or `<ui-button>` 
> 4. **See `Playground/README.md`** for the complete LLM Orientation Guide.

> ⚠️ **Early Development** — API may change. Feedback welcome!

> **Breaking Change (2026-04-10):** Router API renamed: `nui.enableContentLoading()` → `nui.setupRouter()`. Old name still works with deprecation warning. Update your init code.
>
> **Breaking Change (2026-04-08):** `nui-code` and `nui-markdown` are now core components (included in `NUI/nui.js`). If you previously imported them from `NUI/lib/modules/`, simply remove those import statements.
>
> **Breaking Change (2026-04-08):** Sidebar API refactored. CSS classes changed from `sidenav-*` to `sidebar-*`. Method renamed from `toggleSideNav()` to `toggleSidebar()` (backward compat maintained). New `behavior` attribute replaces `favored`: `behavior="primary|secondary|manual"`. If you have custom toggle logic in your app, update to use `app.toggleSidebar(position)` instead of custom click handlers.
>
> 📋 **[Migration Guide](./docs/MIGRATION.md)** — Detailed upgrade instructions for all breaking changes.

**[📖 Documentation & Playground →](https://herrbasan.github.io/nui_wc2/)**

---

## Why NUI?

### The AX Hypothesis

NUI explores a question: **What if AI Experience (AX) can and should diverge from Developer Experience (DX)?**

Thirty-year-old software — kernels, databases, compilers — is often better structured and more optimized than what we build today. The "improvements" we made for human developers (abstractions, frameworks, visual tools) introduced complexity without proportional gains. DX optimized for human cognitive limitations; in doing so, it created systems harder to reason about, optimize, and maintain.

**AX doesn't carry this baggage.** When the consumer is an LLM:
- Skip the abstraction layers humans need
- Structure information for queryability, not readability  
- Design APIs that expose intent directly
- Document trade-offs explicitly (LLMs use this; humans ignore it)

We call this approach **AX — AI Experience**. NUI is a proof of concept: a UI library designed for LLM consumption first, human consumption second.

This is why NUI is vanilla JS. No framework abstractions. No virtual DOM. No meta-structure. Just the web platform, enhanced. Code that is predictable, inspectable, and obvious to AI systems.

## Core Principles (AX-First)

| Priority | Principle | What it means |
|----------|-----------|---------------|
| 1 | **Optimized for LLMs (AX)** | Code structure, naming, and documentation designed for AI understanding and consumption |
| 2 | **Zero Dependencies** | Pure web platform APIs. No abstractions that obscure behavior from AI analysis. |
| 3 | **Performance First** | Minimal overhead, efficient rendering, zero bloat |
| 4 | **Accessibility by Default** | ARIA compliance, keyboard navigation, screen reader support |
| 5 | **Documentation by Example** | Playground pages are source of truth — structured for LLMs, readable by humans |
| 6 | **Component Composition** | Reuse existing elements; predictable patterns AI can recognize |
| 7 | **Fail Loud** | Errors surface immediately; no silent failures hiding behavior |

---

## The Philosophy: Upgrade, Don't Replace

NUI is built on a simple premise: **the web platform is already excellent.** We don't replace it—we enhance it.

```html
<nui-button>
    <button type="button">Click Me</button>
</nui-button>
```

The semantic `<button>` works on its own. The `<nui-button>` wrapper adds styling, behavior, and accessibility enhancements. If JavaScript fails, you still have a working button.

This approach serves a deeper philosophy:

| Principle | How NUI Embodies It |
|-----------|---------------------|
| **Reliability > Performance** | Native elements first; they work even without JS |
| **Design Failures Away** | Semantic HTML prevents entire classes of accessibility bugs |
| **Zero Dependencies** | Platform APIs only. No abstraction debt. |
| **Fail Fast** | Invalid configs throw immediately; silent failures eliminated |

**The result:** Smaller bundles, better accessibility, and code that makes sense. You get enhanced components while the DOM remains semantic, inspectable, and standards-compliant.

---

## Quick Start

### Option 1: Use the Generator (Recommended)

```bash
node nui-create-app.js my-app --with-dialog --with-select
```

Generates a complete SPA with working component examples extracted from the Playground.

```bash
# See all options
node nui-create-app.js --list
node nui-create-app.js --help

# Or launch the web UI
node nui-create-app.js --ui
```

### Option 2: Manual Setup

```html
<link rel="stylesheet" href="NUI/css/nui-theme.css">
<script type="module" src="NUI/nui.js"></script>

<nui-button>
    <button type="button">Click Me</button>
</nui-button>
```

**For a complete SPA setup,** see the [Getting Started guide](Playground/pages/documentation/getting-started.html) in the Playground.

---

## What Makes NUI Different

**Not a Framework — A Philosophy Made Tangible**

Most component libraries ask you to learn their abstraction. NUI asks you to embrace the platform:

- **Native elements are the foundation** — We wrap `<button>`, `<input>`, `<table>`, not reimplement them
- **The DOM is the source of truth** — No virtual DOM, no state synchronization, no magic
- **Accessibility is automatic** — Screen readers understand semantic HTML; we enhance what already works
- **Performance is inherent** — Direct DOM manipulation, no diffing overhead, lazy enhancement

---

## Documentation: Built for LLMs

The `Playground/` directory contains NUI's documentation. But unlike traditional docs, these pages are **structured knowledge** designed for AI consumption first.

Each component page includes:
- **JSON-LD metadata** — Machine-readable component specs
- **LLM Guide** — Philosophy, trade-offs, anti-patterns, decision logic
- **Live examples** — Demonstrations that happen to render for humans

The result is fed through MCP tools to LLMs, which then generate correct, idiomatic code because they have **context**, not just API signatures.

Humans can browse the same content as a beautiful SPA. But the structure is optimized for machines.

This is AX applied to documentation.

---

## Features

- **Dual-Mode Layout** — App mode (dashboard-style grid) or Page mode (natural document flow)
- **CSS Variable Theming** — Customize the entire design system with CSS custom properties
- **Keyboard Navigation** — Full arrow key and Tab support where appropriate
- **Progressive Enhancement** — Works without JavaScript, enhanced with it

---

## Components

> **📋 Component Registry:** See `docs/components.json` for the machine-readable source of truth — all components, their events, imports, and documentation pages in one place. The boilerplate generator and MCP tools both consume this file.

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
| `nui-button` | Button enhancements |
| `nui-button-container` | Button group layout (alignment / spacing) |
| `nui-icon` | Icon system with SVG sprite support |
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

Minimal loading example:

```html
<link rel="stylesheet" href="NUI/css/nui-theme.css">

<!-- Only if you use the related addons -->
<link rel="stylesheet" href="NUI/css/modules/nui-menu.css">

<script type="module" src="NUI/nui.js"></script>

<!-- Optional modules -->
<script type="module" src="NUI/lib/modules/nui-menu.js"></script>
```

---

## When to Use NUI

NUI fits projects where:

- **Simplicity matters** — You want direct control over the DOM
- **Performance is critical** — No virtual DOM overhead
- **Accessibility is non-negotiable** — Built-in, not bolted-on
- **Long-term maintenance** — Code that remains understandable

If you need a full reactive framework with state management and component lifecycles, there are excellent options (React, Vue, Svelte). NUI is for when you want to work closer to the platform.

---

## Learn More

**[📖 See the Playground for live examples and documentation →](https://herrbasan.github.io/nui_wc2/)**

For LLM-specific guidance, see [`Playground/README.md`](Playground/README.md).

---

## License

MIT
