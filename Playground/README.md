# NUI Playground - LLM Orientation Guide

> **Start here if you're an AI assistant tasked with using the NUI library.**

**CRITICAL ALIAS:** This `Playground` directory **IS** the official documentation and live testing environment for the NUI library. When asked to "read the documentation" or "find how a component works," look for its page in `Playground/pages/`.

## 1. Global Rules & Strict DOM Structure (READ THIS)
NUI uses the **Light DOM** and acts as a wrapper for native semantic HTML. You must NEVER omit the internal semantic elements or invent custom element tags that don't exist.

**Correct (Wrappers):**
```html
<nui-button><button type="button">Action</button></nui-button>
<nui-input><input type="text" /></nui-input>
```

**Wrong / Will Fail (Do NOT do this):**
```html
<!-- Missing inner button -->
<nui-button>Action</nui-button> 
<!-- Inventing a non-existent tag -->
<nui-action-btn>Action</nui-action-btn> 
```

**Global Constraints:**
- **Styling:** Do NOT write `<style>` blocks or inline custom variables. Use the standard variables provided in `NUI/css/nui-theme.css`.
- **Element Creation:** Always use `nui.util.createElement(tag, attrs, children)` instead of raw `document.createElement`.

## 2. Component Pages & Local LLM Guides
Our component files serve as living documentation. For complex components, we embed highly specific rules directly in their demo page inside a `<script type="text/markdown" id="llm-guide">` tag. 

**If you are generating code for a complex component, you MUST open its file and read the `id="llm-guide"` block at the top.**

- `nui-list` (Virtualized List) -> `Playground/pages/addons/list.html`
- `nui-select` (Custom Select) -> `Playground/pages/components/select.html`
- `nui-dialog` (Modals/Overlays) -> `Playground/pages/components/dialog.html`

---

## 3. Quick Start for LLMs

**Read in this order:**

1. **[Getting Started](../Agents.md#getting-started)** - Library setup, two usage modes (standalone vs SPA), basic patterns
2. **[Architecture Patterns](pages/documentation/architecture-patterns.html)** - Three valid SPA patterns (Centralized vs Fragment-Based vs Hybrid)
3. **[API Structure](pages/documentation/api-structure.html)** - The three-tier API (`nui.*`, `nui.components.*`, `nui.util.*`)
4. **[Declarative Actions](pages/documentation/declarative-actions.html)** - The `data-action` event delegation pattern

Then refer to specific component pages in `pages/components/` as needed.

## Key Concepts

### Two Layout Modes

**App Mode** (desktop applications with sidebar):
```html
<nui-app>
  <nui-app-header>
    <header>...</header>
  </nui-app-header>
  <nui-sidebar>
    <nav>...</nav>
  </nui-sidebar>
  <nui-content>
    <main>...</main>
  </nui-content>
</nui-app>
```

**Page Mode** (traditional websites):
```html
<nui-app-header>
  <header>...</header>
</nui-app-header>
<nui-content>
  <main>...</main>
</nui-content>
```

### Two Component Patterns

**Declarative (HTML-First)** - Default approach:
- `nui-button` wraps `<button>`
- `nui-tabs` uses `<nav>` + buttons
- `nui-accordion` uses `<details>`
- `nui-input` wraps form elements

**Data-Driven (JavaScript)** - For dynamic content:
- `nui.components.dialog.alert()` / `confirm()` / `prompt()`
- `nui.components.banner.show()`
- `nui.components.linkList.create(data)`

### The Router is a Visibility Toggler

The router translates URL hashes (`#page=about`) into showing/hiding DOM elements. It does NOT require HTML fragments - you can use centralized JS logic too. See Architecture Patterns.

## Directory Structure

```
Playground/
├── index.html                 # SPA shell - app layout + nav
├── js/main.js                 # Navigation data + app-level behaviors
├── css/main.css               # Demo styling (shared + page-scoped)
├── pages/
│   ├── documentation/         # Core docs (start here)
│   │   ├── introduction.html
│   │   ├── getting-started.html
│   │   ├── architecture-patterns.html  # Important: 3 SPA patterns
│   │   ├── api-structure.html          # Important: API reference
│   │   └── declarative-actions.html    # Important: event delegation
│   ├── components/            # Component demos (20+ components)
│   └── addons/                # Optional module demos
└── README.md                  # This file
```

## Key Files Reference

| File | Purpose | When to Read |
|------|---------|--------------|
| `../NUI/nui.js` | Core library (~3600 lines) | When implementing components |
| `../NUI/css/nui-theme.css` | Required theme + all component styles | Always include |
| `pages/documentation/getting-started.html` | Setup, usage patterns, complete example | **First** |
| `pages/documentation/architecture-patterns.html` | SPA structure options | **Second** |
| `pages/documentation/api-structure.html` | API reference | **Third** |
| `pages/components/app-layout.html` | App shell components (`nui-app`, `nui-sidebar`, `nui-app-header`) | When building page layout |
| `pages/components/layout.html` | Content constraints (`nui-layout` columns) | When organizing internal content |
- **Explicit patterns** - Components follow consistent HTML-first or data-driven patterns
- **Clear section markers** - Source uses `// #################################` section headers
- **Self-documenting API** - `Object.keys(nui.components)` shows available factories
- **Minimal abstractions** - Direct DOM manipulation, no framework indirection

## Quick API Reference

```javascript
// Initialization
import { nui } from './NUI/nui.js';
nui.enableContentLoading({ container: 'nui-main', basePath: 'pages' });

// Component factories (ephemeral)
await nui.components.dialog.confirm('Title', 'Message');
nui.components.banner.show({ content: 'Saved!', autoClose: 3000 });

// Component factories (persistent)
const nav = nui.components.linkList.create([{ label: 'Home', href: '#' }]);

// Utilities
nui.util.storage.set({ name: 'key', value: 'val', ttl: '7d' });
const cleanup = nui.util.enableDrag(element, callback);
```

## For Library Development

If you're tasked with **extending NUI itself** (adding components, modifying core), see `../Agents.md` for:
- Coding ethics and philosophy
- Component patterns
- Workflow for adding components
- Creating demo pages for new components
