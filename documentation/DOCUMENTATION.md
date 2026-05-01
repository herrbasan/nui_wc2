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

## 4. Suggested Reading Order

If you are new to NUI, read in this order:

1. **`guides/introduction.md`** — What NUI is, what it isn't, and the core design philosophy (browser-native, Light DOM, progressive enhancement).
2. **`guides/getting-started.md`** — Minimal setup, loading sequence, layout modes, and the two development patterns (declarative vs. data-driven).
3. **`guides/architecture-patterns.md`** — The router, fragment-based SPA, the `show/hide` lifecycle, and the `nui-page` layout engine. **Critical** if you are building or modifying Playground demo pages.
4. **`guides/declarative-actions.md`** — The `data-action` event delegation pattern. Read this before writing interactive demos.
5. **`guides/api-structure.md`** — The three-tier API (`nui.*`, `nui.components.*`, `nui.util.*`) and component lifecycle.
6. **`guides/accessibility.md`** — DOM-first a11y, auto-enhancement, keyboard patterns, and the `a11y.announce` utility.
7. **`guides/utilities.md`** — Helper functions (`createElement`, `storage`, `enableDrag`, etc.).
8. **`components.json`** — The machine-readable registry. Use it to find the `docPath` for any specific component.
9. **`components/*.md` or `addons/*.md`** — Component-specific API contracts. Read these after the guides, on demand.

**Quick decision tree:**
- *"How do I set up a new project?"* → `getting-started.md`
- *"How do I build a demo page?"* → `architecture-patterns.md`
- *"How do I wire up button clicks?"* → `declarative-actions.md`
- *"What component should I use for X?"* → `components.json`
- *"What events does component Y emit?"* → `components.json` → `components/Y.md`

## 5. Deep Dive Documentation

The `/documentation/` folder contains pure, LLM-optimized Markdown files detailing the exact usage, edge cases, and API contracts for everything in NUI.

- **`/documentation/guides/`**: Meta-concepts and architectural patterns. Start here before diving into individual components.
- **`/documentation/components/`**: The core, dependency-free UI components (buttons, inputs, dialogs, layouts).
- **`/documentation/addons/`**: More complex, optional modules that must be explicitly loaded (rich-text editors, code editors, virtualized lists).

---

## 6. The Playground: Execution Environment

The `Playground/` directory serves as an interactive sandbox.

- **Fragment-Based SPA:** The playground demonstrates NUI's built-in application router (`nui.setupRouter()`). It dynamically fetches HTML fragments from `Playground/pages/**` and caches them.
- If you need to observe how a component's `<script type="nui/page">` executes in a real browser environment, check the HTML files within `Playground/pages/`.
- **Note:** The `Playground` HTML files use `<nui-markdown src="...">` to render the guides for humans. The actual documentation content lives exclusively in the `documentation/**/*.md` files. 

*(If you are scaffolding a new application, a ready-made structure is provided in the `nui-boilerplate/` directory.)*
