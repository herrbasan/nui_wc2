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

## 4. Deep Dive Documentation

The `/documentation/` folder contains pure, LLM-optimized Markdown files detailing the exact usage, edge cases, and API contracts for everything in NUI.

- **`/documentation/guides/`**: Start here for meta-concepts. Read `architecture-patterns.md`, `getting-started.md`, `accessibility.md`, `api-structure.md`, etc., to understand the philosophical and structural rules of the toolkit.
- **`/documentation/components/`**: The core, dependency-free UI components (buttons, inputs, dialogs, layouts).
- **`/documentation/addons/`**: More complex, optional modules that must be explicitly loaded (rich-text editors, code editors, virtulized lists).

---

## 5. The Playground: Execution Environment

The `Playground/` directory serves as an interactive sandbox.

- **Fragment-Based SPA:** The playground demonstrates NUI's built-in application router (`nui.setupRouter()`). It dynamically fetches HTML fragments from `Playground/pages/**` and caches them.
- If you need to observe how a component's `<script type="nui/page">` executes in a real browser environment, check the HTML files within `Playground/pages/`.
- **Note:** The `Playground` HTML files use `<nui-markdown src="...">` to render the guides for humans. The actual documentation content lives exclusively in the `documentation/**/*.md` files. 

*(If you are scaffolding a new application, a ready-made structure is provided in the `nui-boilerplate/` directory.)*
