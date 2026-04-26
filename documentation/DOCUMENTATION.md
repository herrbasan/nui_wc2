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

The single machine-readable source of truth for all components is:
👉 **`documentation/components.json`**

This registry contains everything you need to know to implement any NUI feature:
- Component names, categories, and emitted events.
- **`llmGuide` blocks:** Essential instructions embedded directly in the JSON that explain the design philosophy, exact DOM structure, trade-offs, and anti-patterns for each component. 
- Required addons/imports for non-core features like the rich-text editor or virtualized lists.

**Always read `documentation/components.json` before attempting to scaffold or debug a component.**

---

## 4. The Playground: Living Documentation

The `Playground/` directory serves as both an interactive demo for human users and a rich context library for LLMs.

- **Fragment-Based SPA:** The playground demonstrates NUI's built-in application router (`nui.setupRouter()`). It dynamically fetches HTML fragments from `Playground/pages/**` and caches them.
- **Documentation by Example:** Every component—from `<nui-layout>` to `<nui-dialog>`—has a dedicated page containing live, interactive examples.
- **LLM-Optimized:** The code inside the Playground is structured for queryability. If you need to understand intricate architectural patterns (like setup, layout modes, or SPA wiring), reviewing the HTML inside `Playground/pages/documentation/` and `Playground/pages/components/` will provide the exact implementation patterns.

*(Note: If you are scaffolding a new application, a ready-made structure is provided in the `nui-boilerplate/` directory, which you can use as a starting point.)*
