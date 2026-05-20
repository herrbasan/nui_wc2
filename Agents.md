# NUI Contributor Instructions

> **🤖 Ground Truth for AI Assistants:**
> 👉 **Read [`LLM-CHEATSHEET.md`](LLM-CHEATSHEET.md) FIRST.** Every component's exact HTML structure, all 17 built-in `data-action` handlers, addon imports, and the full public API — in one file. Then read:
> 👉 **[`documentation/DOCUMENTATION.md`](documentation/DOCUMENTATION.md)** for philosophy and architecture.

This document contains the **Engineering Manual** for developing and maintaining the NUI library itself.

---

## Agent Tool Usage Guidelines
- **Use native VS Code tools first:** Always use `read_file`, `replace_string_in_file`, `grep_search`, etc. for file inspection, search, and editing.
- **Do not use terminal scripts (Python, sed, awk) as a crutch for file edits or searches.**
- If a native file edit fails, adjust your parameters and retry the native tool properly rather than switching to a terminal script.

## Project Structure

```text
NUI/
├── nui.js              # Core library with all components
├── nui.d.ts            # TypeScript definitions
├── css/nui-theme.css   # Theme and component styles
└── assets/             # Icons, sprites, patterns

Playground/
├── index.html          # SPA entry point
├── pages/
│   ├── documentation/  # Getting started, philosophy
│   ├── components/     # Core component demos (nui-button, nui-tabs, etc.)
│   └── addons/         # Optional module demos
└── js/main.js          # Navigation configuration
```

### Documentation Folders

- **`/docs`**: Internal **development documentation**. Contains notes, migration guides, component upgrade plans, and archived discussion/planning docs. Not meant for end-users.
- **`/documentation`**: Official **front-facing documentation** and Ground Truth. Contains the main `DOCUMENTATION.md` orientation guide and the generated `components.json` registry. This is the source of truth for understanding how to use the library.

## Component Registry

> **📋 Component Registry:** `documentation/components.json` is the **source of truth** for all components, their events, imports, and documentation paths. When adding or modifying components, run `node scripts/update-docs.js` to update the registry. This file contains `docPath` fields pointing to pure Markdown files that provide crucial instructions for how to use each component. Read those markdown files instead of guessing.

---

## Engineering Patterns

### Component Pattern
```javascript
// Thin class - lifecycle hooks only
class NuiButton extends HTMLElement {
    connectedCallback() { setupButtonBehavior(this); }
    disconnectedCallback() { cleanupButton(this); }
}

// Pure functions - logic takes element as parameter
function setupButtonBehavior(element) {
    const button = element.querySelector('button');
    button.addEventListener('click', (e) => {
        element.dispatchEvent(new CustomEvent('nui-click', { bubbles: true }));
    });
}
```

### LLM Guide Documentation (Critical)

NUI components should have a strict Markdown API contract placed in the `/documentation/components/` directory (or `addons/`, etc.). 

**🤖 LLM Reader Instruction:** If you are analyzing an HTML demo page in the Playground and see `<nui-markdown src="...">`, you MUST read the referenced `.md` file to understand the component's API and usage rules.

```html
<nui-markdown src="../documentation/components/my-component.md"></nui-markdown>
```

---

## Router + Page Script Contract (Critical)

The Playground uses a fragment-based SPA pattern.

**Execution flow (primary — `nui.registerPage()` pattern):**
```
1. User navigates to: #page=components/button
2. Router checks for registered page handler (registeredFeatures.get('page:components/button'))
3. Router fetches: pages/components/button.html
4. Router creates wrapper: <nui-page class="content-page ...">
5. Router injects HTML into wrapper
6. Router calls: customElements.upgrade(wrapper)
   → All <nui-*> elements inside are now upgraded
7. Router calls: registered.init(wrapper, params, nui)
```

**Page logic (primary):**
```javascript
// In js/page-init.js:
nui.registerPage('components/button', {
    html: 'components/button.html',
    init(element, params, nui) {
        element.querySelector('nui-button').addEventListener('click', handler);
    }
});
```

**Page logic (legacy — `<script type="nui/page">`, still supported):**
```html
<script type="nui/page">
function init(element, params, nui) {
    // Runs via new Function() — requires 'unsafe-eval' in CSP
}
</script>
```

---

## `data-action` Contract

NUI provides minimal event delegation for click actions.
**Syntax:** `data-action="name[:param][@selector]"`

Examples:
- `data-action="demo:hello"`
- `data-action="dialog-open@#my-dialog"`

---

## Development Preferences

- **Indentation:** Tabs
- **Shell:** PowerShell (Windows)
- **CSS Variables:** Use existing variables from `NUI/css/nui-theme.css`. Never invent new variables.
- **Testing:** VS Code Live Server at `http://127.0.0.1:5500/Playground/index.html`. If the server is not started and the endpoint is unreachable, ask the user to start it.

## Accessibility

Follow [W3C ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/patterns/). Use roving tabindex for composite components (menus, tabs, toolbars). Use `a11y.announce(message)` for focus-driven state changes (like drag and drop).

## What to Avoid

- Framework abstractions (React, Vue, Angular)
- Virtual DOM implementations
- State management libraries
- CSS-in-JS
- Custom pub/sub systems

## What to Prefer

- Custom elements for structure
- Native event system (`addEventListener`, `CustomEvent`)
- Direct DOM manipulation
- CSS Variables for dynamic styling
- Browser-native APIs

## CSS & Theming Guidelines
- **NEVER invent CSS variables.**
- Always use the variables explicitly defined in the `:root` of `NUI/css/nui-theme.css`.
- **Spacing:** Use `--nui-space`, `--nui-space-half`, `--nui-space-double`, etc. (No "md/lg/xl" suffixes).
- **Colors:** Use `--color-base` and `--color-shade1` through `--color-shade9` for surfaces. Do not use words like "surface" or "background".
- **Borders:** Use `--border-thickness`, `--border-shade1`, `--border-radius1`, etc.
- **Avoid inline styles** unless they are needed for dynamic updates driven by JavaScript. Prefer CSS classes for all static styling. Inline styles may be prohibited by CSP policies and are harder to maintain.

## Workflow: Adding Components

1. **Create component** in `NUI/nui.js` following existing patterns
2. **Add styles** in `NUI/css/nui-theme.css`
3. **Create demo page** in `Playground/pages/components/[name].html` (see below)
4. **Update navigation** in `Playground/js/main.js`

## Creating Demo Pages

This section describes the "Fragment-Based" SPA pattern used for the NUI Playground demo pages. These guidelines ensure LLMs (and humans) can make changes without guessing.

### What the Playground is

- A small SPA that loads HTML **fragments** from `Playground/pages/**` into the main content area
- Navigation uses hash routes like `#page=components/button` or `#feature=dashboard`
- Pages are cached by the router: a page fragment is fetched and initialized **once**, then shown/hidden on navigation

### Page Logic Contract

**⚠️ THIS IS THE MOST IMPORTANT SECTION FOR LLMs.**

**Primary pattern — `nui.registerPage()`:**
Page logic lives in a JS module, not in the HTML fragment. This is the standard pattern LLMs know from every framework.

```javascript
// In js/page-init.js (imported by main.js):
import { nui } from '../../NUI/nui.js';

nui.registerPage('components/my-page', {
    html: 'components/my-page.html',  // path relative to basePath
    init(element, params, nui) {
        // element = page wrapper — scope ALL queries to it
        const button = element.querySelector('nui-button');
        button.addEventListener('click', handler);
        element.show = (params) => { /* runs when page becomes active */ };
        element.hide = () => { /* cleanup */ };
    }
});
```

```html
<!-- pages/components/my-page.html — pure markup, no scripts -->
<div class="page-my-page">
    <nui-button>Click Me</nui-button>
</div>
```

**Legacy pattern — `<script type="nui/page">` (still supported, not recommended):**
Inline scripts inside HTML fragments. Requires `'unsafe-eval'` in CSP.
</script>
```

**Important implications:**

- `init(element, params, nui)` runs **ONCE** when the page is first loaded
- Pages are **CACHED** - the wrapper element is reused on navigation
- On navigation, the router calls `element.show(params)` when a page becomes active, and `element.hide()` when it becomes inactive
- `init()` will **NOT** be called again when returning to a cached page

**Page code should:**
- Attach event listeners once (in `init`)
- Start timers/polling in `show` and stop in `hide`
- Scope DOM queries to the page wrapper (`element.querySelector(...)`), not `document.querySelector(...)`

**Caching behavior diagram:**

```
First visit to #page=components/button:
  1. Fetch HTML
  2. Create wrapper element
  3. Execute init(element, params, nui)
  4. Show page

Second visit to #page=components/button:
  1. Find cached wrapper element
  2. Call element.show(params) ← init() is NOT called again
  3. Show page

When leaving the page:
  1. Call element.hide()
  2. Hide page (display: none)
```

**Common mistakes (DO NOT DO THESE):**

```javascript
// ❌ WRONG: Using document.querySelector
function init(element, params, nui) {
    const button = document.querySelector('nui-button');
    // May find buttons from other pages or miss the target
}

// ✅ CORRECT: Using element.querySelector
function init(element, params, nui) {
    const button = element.querySelector('nui-button');
    // Scoped to this page's wrapper
}
```

```javascript
// ❌ WRONG: Attaching global listeners without cleanup
function init(element, params, nui) {
    document.addEventListener('resize', handleResize);
    // Listener persists after page is hidden
}

// ✅ CORRECT: Cleanup in hide()
function init(element, params, nui) {
    function handleResize() { /* ... */ }
    document.addEventListener('resize', handleResize);
    element.hide = () => {
        document.removeEventListener('resize', handleResize);
    };
}
```

```javascript
// ❌ WRONG: Assuming script re-runs on navigation
function init(element, params, nui) {
    let counter = 0;
    // This won't reset when user navigates away and back
}

// ✅ CORRECT: Reset state in show()
function init(element, params, nui) {
    let counter = 0;
    element.show = (params) => {
        counter = 0; // Reset when page becomes visible
    };
}
```

### Page logic template

```javascript
// Primary (recommended) — in js/page-init.js:
nui.registerPage('components/my-page', {
    html: 'components/my-page.html',
    init(element, params, nui) {
        // One-time setup
        const output = element.querySelector('[data-demo-output]');
        element.show = (params) => { /* Start timers */ };
        element.hide = () => { /* Cleanup */ };
    }
});
```

### DOM helper shortcuts: `el` / `els`

NUI extends `Element`, `Document`, and `DocumentFragment` prototypes with two lightweight helpers:

- `element.el(selector)` — equivalent to `element.querySelector(selector)`
- `element.els(selector)` — equivalent to `[...element.querySelectorAll(selector)]`

These are used internally by all NUI components and are safe to use in page scripts. They do **not** pierce Shadow DOM (NUI components do not use shadow DOM).

```javascript
// Inside a page init script
const button = element.el('nui-button');           // same as querySelector
const inputs = element.els('input');               // same as querySelectorAll, returned as array
const select = element.el('#my-select select');    // scoped to the page wrapper
```

### `data-action` contract (how demos do interactions)

NUI provides minimal event delegation for click actions. Any element with a `data-action` attribute will trigger the action system on click.

**Syntax:** `data-action="name[:param][@selector]"`

- `name`: action name (string)
- `param`: optional string payload (after `:`)
- `selector`: optional target selector (after `@`)

Examples:
```html
<button data-action="demo:hello">Run</button>
<button data-action="dialog-open@#my-dialog">Open Dialog</button>
<button data-action="copy-icon:settings">Copy</button>
```

**Events:** If the action is not handled by a built-in or registered function, NUI dispatches:
- `nui-action` (generic)
- `nui-action-${name}` (specific)

Both bubble. The `detail` object contains:
- `detail.name`: action name
- `detail.param`: param string (or undefined)
- `detail.target`: resolved target element (selector target or the clicked element)
- `detail.originalEvent`: the original click event

**`nui-button` and `nui-click`:** `nui-button` wraps a native `<button>` and dispatches a `nui-click` custom event when clicked. For simple actions, add `data-action` directly to the `<nui-button>` or its inner `<button>`. For complex logic inside a page script, listen for `nui-click` on the `<nui-button>` host:

```javascript
// ✅ Preferred for custom page logic
element.el('nui-button').addEventListener('nui-click', () => {
    // run custom task
});
```

### Standard demo primitives

Use these classes from `Playground/css/main.css` before inventing new ones:

| Class | Use For |
|-------|---------|
| `.demo-container` | Minimal grouping (no chrome), spacing between blocks |
| `.demo-area` | Bordered, padded interactive region - "click here" examples |
| `.demo-chrome` | Bordered + shaded "component showcase" container |
| `.demo-callout` | Shaded callout with left accent - tips, warnings |
| `.demo-actions` | Responsive button grid for demo actions |
| `.demo-result` | Lightweight result separator |

### Page structure: preferred markup

Most demo pages should read like documentation:

```html
<div class="page-my-component">
    <header>
        <h1>My Component</h1>
        <p class="lead">One-sentence value proposition.</p>
    </header>

    <section>
        <h2>Basic Usage</h2>
        <p>What it is, when to use it.</p>

        <nui-code>
            <script type="example" data-lang="html"><!-- Example --></script>
        </nui-code>

        <div class="demo-area">
            <!-- Live example -->
        </div>
    </section>
</div>
```

### CSS rules

**Shared vs page-scoped:**
- Shared patterns: add a global class in `Playground/css/main.css`
- One-off needs: scope under `.page-<slug> ...` in `Playground/css/main.css`

**Theme variables:**
- Use existing CSS variables from `NUI/css/nui-theme.css`
- Do not hard-code new colors/fonts/shadows

**Inline styles policy:**
- Allowed: Dynamic styles from JavaScript, transitions for JS-driven animations
- Avoid for new content: Inline layout, colors/backgrounds, sizing, `<style>` blocks in fragments

### Adding a new demo page (checklist)

1. Create `Playground/pages/<group>/<name>.html`
2. Add navigation entry in `Playground/js/main.js`:
   - `href: '#page=<group>/<name>'`
3. If page needs scoped styles, wrap fragment in single root element:
   - `<div class="page-<name>"> ... </div>`
   - Add styles to `Playground/css/main.css` under clearly labeled comment
4. If page needs JavaScript:
   - Add `nui.registerPage()` to `Playground/js/page-init.js`
   - Use `init(element, params, nui)` and attach `element.show/element.hide` if needed

### Common pitfalls (LLM guardrails)

- Do not assume a page script reruns on navigation; it runs once because pages are cached
- Do not attach global listeners on `document` from a page unless you also remove them in `element.hide`
- Use `element.querySelector(...)` for all DOM access inside page scripts
- When importing NUI modules from a page fragment, use paths relative to `Playground/index.html`

## Background

This library builds upon the original NUI library (see `reference/` directory), incorporating proven patterns and examples:

- `reference/nui` - Original Library source code
- `reference/000b_ui_playground` - Examples and Usage Patterns
- `reference/ui_screenshots` - Visual reference for component design

## Reference

- `NUI/docs/` - Architecture decisions and design docs
- `README.md` - Project overview
