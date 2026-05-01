# NUI: Architecture & Orientation Guide

**NUI** is a high-performance, low-footprint UI component library built on native web standards. This document serves as the primary orientation guide for LLMs and AI Assistants working with the codebase.

---

## 1. The Core Concept

NUI is a **browser-native UI toolkit** built on Custom Elements (`<nui-*>`). It is not a reactive framework. There is no virtual DOM, no complex state-management middleware, and zero dependencies.

Instead of replacing standard HTML elements, NUI **enhances** them. 
- **Strict Light DOM Wrappers:** Components wrap semantic, native elements. For example, `<nui-button>` wraps a native `<button>`, preserving native focus, form submission, and true disabled states. 
- **DOM as the Source of Truth:** State lives in the DOM (via standard attributes, `data-*`, and `hidden`), making it highly predictable, inspectable, and accessible.
- **Declarative Event Delegation:** NUI uses the `data-action` attribute (`data-action="name:param@selector"`) for CSP-safe, decoupled HTML-to-JS communication, drastically reducing the need for scattered event listeners.

---

## 2. The Philosophy: AX vs DX (AI Experience First)

NUI is a proof of concept for **AI-First Design**. 

For decades, the industry has optimized for Developer Experience (DX) by layering complex abstractions (React, Vue, CSS-in-JS) over the browser engine to make code easier for humans to write. This adds overhead and obscures native behavior.

When the primary consumer or generator of code is an LLM, we can strip away the baggage. The **AI Experience (AX)** approach is optimized for models:
- **Explicit over Clever:** Use platform-native APIs and predictable patterns that AI can easily recognize. No "magic" abstractions.
- **Performance & Reliability First:** By working directly with the DOM, applications are blazingly fast and fail loudly rather than silently swallowing errors.
- **Accessibility by Default:** By relying on semantic HTML foundations, ARIA compliance and screen reader support are natural byproducts, not afterthoughts.
- **No Custom CSS:** Rely exclusively on the CSS variables provided in `nui-theme.css`. Never invent CSS variables or use inline styles for static layout.

---

## 3. The Source of Truth: `components.json`

**CRITICAL RULE FOR AI ASSISTANTS:** Do not guess component names, structures, imports, or CSS variables.

The single machine-readable source of truth for the entire library is:
?? **`documentation/components.json`**

This registry acts as the master manifest, providing:
- Component names, categories (components vs. addons), and emitted events.
- Required JavaScript module imports for non-core features (if `imports` is not `null`).
- **`docPath`:** The exact file path to the comprehensive Markdown API guide for the component (e.g., `documentation/components/accordion.md`).
- **`demoPath`:** The exact file path to the interactive HTML demo snippet (e.g., `Playground/pages/components/accordion.html`).

**Always locate a component in `documentation/components.json` first, then read its corresponding `docPath` file before attempting to scaffold or debug it.**

---

## 4. Documentation Navigation

### Guides — Start Here

These cover the meta-concepts and architectural patterns. Read in order if you are new to NUI.

1. [Introduction](#page=documentation/introduction) — What NUI is, what it isn't, core design philosophy.
2. [Getting Started](#page=documentation/getting-started) — Minimal setup, loading sequence, layout modes, declarative vs. data-driven patterns.
3. [Architecture Patterns](#page=documentation/architecture-patterns) — The router, fragment-based SPA, `show/hide` lifecycle, `nui-page` layout engine. **Critical** for building or modifying Playground pages.
4. [Declarative Actions](#page=documentation/declarative-actions) — The `data-action` event delegation pattern. Read before writing interactive demos.
5. [API Structure](#page=documentation/api-structure) — Three-tier API (`nui.*`, `nui.components.*`, `nui.util.*`) and component lifecycle.
6. [Accessibility](#page=documentation/accessibility) — DOM-first a11y, auto-enhancement, keyboard patterns, `a11y.announce` utility.
7. [Utilities](#page=documentation/utilities) — Helper functions: `createElement`, `storage`, `enableDrag`, array helpers, `detectEnv`.
8. [Visual Cheatsheet](#page=documentation/cheatsheet) — Quick reference for icons, CSS variables, and common patterns.

### Core Components — Dependency-Free

No imports needed. Available after loading `nui.js`.

**Forms**
- [Button](#page=components/button) — Native button wrapper with variants, loading state, icon support. Paired with `nui-button-container` for groups and segmented controls.
- [Input](#page=components/inputs) — Text, textarea, checkbox, radio, toggle inputs wrapping native elements with validation.
- [Select](#page=components/select) — Enhanced dropdown with search, multi-select tags, option groups, async loading, and mobile bottom sheet.
- [Slider](#page=components/slider) — Range input wrapper with custom visual styling.
- [Tag Input](#page=components/tag-input) — Tag/chip input with keyboard navigation and editable or display-only modes.
- [Dropzone](#page=components/dropzone) — File drop overlay with named zones and automatic grid layout.

**Layout**
- [App Layout](#page=components/app-layout) — Application shell with CSS Grid: header, sidebar, content, footer.
- [App Header](#page=components/app-header) — Top bar with left/center/right slot zones and sidebar toggle.
- [Page](#page=components/app-layout) — Content layout engine with readable max-width and `breakout` attribute for full-width sections.
- [Card](#page=components/card) — Flexible content container with surface styling and layout modes.
- [Layout Grid](#page=components/layout) — Responsive column grid (1/2/3 columns based on viewport).

**Navigation**
- [Tabs](#page=components/tabs) — ARIA Tab Pattern with height animation and progressive enhancement.
- [Accordion](#page=components/accordion) — Expandable sections using native `<details>`/`<summary>` with exclusive mode.
- [Link List](#page=components/link-list) — Navigation tree with collapsible groups, active state, and data-driven API.

**Overlays**
- [Dialog](#page=components/dialog) — Modal and non-modal dialogs built on native `<dialog>` with system dialogs (alert/confirm/prompt).
- [Overlay](#page=components/overlay) — Raw modal container for lightboxes and full-screen loaders.

**Feedback**
- [Banner](#page=components/banner) — Edge-anchored notification banners with auto-close and priority levels.
- [Progress](#page=components/progress) — Linear, circular, and indeterminate progress indicators.

**Data**
- [Table](#page=components/table) — Responsive table wrapper with mobile card transformation.

**UI**
- [Badge](#page=components/badge) — Status badges and notification indicators with variant styling.
- [Code](#page=components/code) — Code block with syntax highlighting for web languages.
- [Icon](#page=components/icon) — SVG sprite-based icon with text fallback and decorative mode.
- [Markdown](#page=components/markdown) — Lightweight Markdown-to-HTML converter with streaming support.
- [Tooltip](#page=components/tooltip) — Contextual help using native Popover API with smart positioning.

**Accessibility**
- [Skip Links](#page=components/skip-links) — WCAG skip navigation links, auto-detects landmarks.

**Interaction**
- [Sortable](#page=components/sortable) — Drag-and-drop reordering with FLIP animations and touch/mouse/keyboard support.

### Addons — Explicit Import Required

These modules require loading additional JS (and often CSS). Each doc lists the exact import tags.

- [Code Editor](#page=addons/code-editor) — Editable code input with real-time syntax highlighting, auto-indent, and line numbers.
- [Context Menu](#page=addons/context-menu) — Programmatic floating popup menus with submenus and keyboard navigation.
- [Lightbox](#page=addons/lightbox) — Image gallery with thumbnail/full-res lazy loading, carousel loop, and touch gestures.
- [List](#page=addons/list) — Virtualized scroller with integrated search, sort, filter. Renders only visible items for large datasets.
- [Media Player](#page=addons/media-player) — Custom-skinnable video/audio player wrapper over native media elements.
- [Menu](#page=addons/menu) — Application-style menubar with dropdowns, nested submenus, and full keyboard navigation.
- [Rich Text](#page=addons/rich-text) — Lightweight WYSIWYG editor with toolbar for basic formatting, links, tables, and images.
- [Wizard](#page=addons/wizard) — Multi-step wizard with progression navigation, validation, and layout modes.
- [App Window](#page=addons/app-window) — Programmatic window chrome for Electron frameless windows.

---

### Quick Decision Tree

- *"How do I set up a new project?"* → [Getting Started](#page=documentation/getting-started)
- *"How do I build a demo page?"* → [Architecture Patterns](#page=documentation/architecture-patterns)
- *"How do I wire up button clicks?"* → [Declarative Actions](#page=documentation/declarative-actions)
- *"What component should I use for X?"* → `components.json`
- *"What events does component Y emit?"* → `components.json` → component's `.md` doc
- *"How do I create a modal dialog?"* → [Dialog](#page=components/dialog)
- *"How do I handle large datasets?"* → [List](#page=addons/list)
- *"How do I make my app accessible?"* → [Accessibility](#page=documentation/accessibility)

---

## 5. The Playground: Execution Environment

The `Playground/` directory serves as an interactive sandbox.

- **Fragment-Based SPA:** The playground demonstrates NUI's built-in application router (`nui.setupRouter()`). It dynamically fetches HTML fragments from `Playground/pages/**` and caches them.
- If you need to observe how a component's `<script type="nui/page">` executes in a real browser environment, check the HTML files within `Playground/pages/`.
- **Note:** The `Playground` HTML files use `<nui-markdown src="...">` to render the guides for humans. The actual documentation content lives exclusively in the `documentation/**/*.md` files. 

*(If you are scaffolding a new application, a ready-made structure is provided in the `nui-boilerplate/` directory.)*
