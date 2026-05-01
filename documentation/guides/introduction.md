# LLM Guide: NUI Philosophy & Architecture

## What NUI Is (And Isn't)

NUI is a **browser-native UI toolkit** built on Custom Elements. It is not a framework, does not have a virtual DOM, and does not abstract away the browser. Instead, it provides well-designed custom elements that enhance semantic HTML with consistent styling, accessibility behaviors, and progressive enhancement.

### Core Design Philosophy

**1. The Browser is the Framework**
- NUI uses the platform: Custom Elements, CSS Custom Properties, native `<dialog>`, `<button>`, etc.
- No virtual DOM - direct DOM manipulation is encouraged and efficient
- Event system uses native `CustomEvent` and `addEventListener`

**2. Semantic HTML as Foundation**
Every NUI component expects valid HTML inside it:
- `<nui-button>` wraps a native `<button>` element
- `<nui-dialog>` wraps a native `<dialog>` element
- `<nui-tabs>` organizes `<nav>` and `<section>` elements

This means accessibility (keyboard navigation, screen readers) works even before JavaScript loads, and the DOM remains readable and debuggable.

**3. Progressive Enhancement**
Components upgrade existing markup rather than replacing it. The page renders meaningfully without JavaScript, then components add behaviors:
- An `<nui-tabs>` with `<nav>` and `<section>` children works as plain HTML (shows all content)
- After upgrade, it becomes an interactive tab interface with ARIA attributes

**4. Two Usage Patterns**

**Declarative (HTML-first):** For static content known at authoring time
```html
<nui-button>
	<button type="submit">Save</button>
</nui-button>
```

**Data-driven (JavaScript API):** For dynamic content
```javascript
const dialog = await nui.components.dialog.confirm('Delete?', 'This cannot be undone.');
```

**5. Router as State Coordinator**
NUI includes a lightweight hash-based router (`nui.setupRouter()`) that translates URL changes into DOM visibility. It's not a framework router - it doesn't dictate your architecture. Three patterns are supported:
- **Centralized:** JavaScript generates all UI, router just shows/hides
- **Fragment-based:** HTML fragments fetched on demand (Playground pattern)
- **Hybrid:** Mix both approaches

## How This Documentation Works

**This LLM Guide is the primary knowledge source for AI agents.** When you (an LLM) are asked to work with NUI, this guide and the component-specific LLM Guides (found in `<script type="text/markdown">` blocks on each page) are your reference.

**Important:** `AGENTS.md` in the project root is for **human contributors** using AI coding assistants. It contains workflow instructions, coding ethics, and development preferences. It is NOT the source of truth for component APIs, router behavior, or architectural patterns. Those live in the Playground documentation.

**Where to find information:**
- **Component APIs:** Each component page has an LLM Guide in `<script type="text/markdown">` blocks
- **Router & Page Loading:** See the [Architecture Patterns](#page=documentation/architecture-patterns#router-deep-dive) page
- **Design System:** `NUI/css/nui-theme.css` contains all CSS variables
- **Source Code:** `NUI/nui.js` is the single source file

## When to Use NUI

**Ideal for:**
- Applications that need high performance without framework overhead
- Teams that prefer direct browser API usage
- Projects where accessibility is mandatory
- SPAs that don't need complex state management

**Not ideal for:**
- Apps requiring complex reactive state management (use frameworks)
- Projects needing server-side rendering (NUI is client-side)
- Teams wanting drag-and-drop visual builders

## Key Concepts

**Light DOM, Not Shadow DOM:**
NUI components use the Light DOM. Content is visible to CSS and JavaScript without piercing shadow boundaries. This enables:
- Global theming via CSS variables
- Standard event bubbling
- Easy debugging in browser devtools

**CSS Variables for Theming:**
All styling uses CSS custom properties. The `:root` defines the design system, and components reference these variables. No CSS-in-JS, no build step required.

**State Lives in the HTML:**
Instead of hidden JavaScript state, NUI puts state in attributes and data attributes where it's visible:
- `data-tab="active"` shows which tab is active
- `hidden` attribute controls panel visibility
- This makes debugging easier and enables CSS to respond to state
