# NUI Contributor Instructions

> **🤖 Ground Truth for AI Assistants:**
> For the core philosophy, AX principles, and architecture guide, please read:
> 👉 **[`documentation/DOCUMENTATION.md`](documentation/DOCUMENTATION.md)**

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

> **📋 Component Registry:** `documentation/components.json` is the **source of truth** for all components, their events, imports, and documentation pages. When adding or modifying components, update the registry. This file also contains `llmGuide` fields that provide crucial instructions for how to use each component. Read this file instead of guessing.

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

For complex components, place an LLM Guide inside a separate `.md` file alongside the demo page.
For instance, if your demo is `Playground/pages/components/my-component.html`, place the guide in `my-component.md`.
Then, reference it using `<nui-markdown src="pages/components/my-component.md"></nui-markdown>`.

**🤖 LLM Reader Instruction:** If you are analyzing an HTML demo page and see a `<nui-markdown src="...">` tag, you MUST use your file reading tools to read the referenced `.md` file to understand the component's API and usage rules.

```html
<details class="collapsible-section">
	<summary><strong>LLM Guide</strong></summary>
	<nui-markdown id="llm-guide" data-component="nui-my-component" src="pages/components/my-component.md"></nui-markdown>
</details>
```

---

## Router + Page Script Contract (Critical)

The Playground uses a fragment-based SPA pattern.

**Execution flow:**
1. Router fetches: `pages/components/button.html`
2. Router injects HTML into wrapper.
3. Router calls: `customElements.upgrade(wrapper)`.
4. Router finds: `<script type="nui/page">`.
5. Router executes the script via `new Function()`.

**Script template:**
```html
<script type="nui/page">
function init(element, params, nui) {
    // One-time setup
    const output = element.querySelector('[data-demo-output]');

    // Optional lifecycle hooks
    element.show = (params) => { /* Start timers */ };
    element.hide = () => { /* Cleanup */ };
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

### Router + page script contract (critical)

⚠️ **THIS IS THE MOST IMPORTANT SECTION FOR LLMs.** The router pattern is non-standard by design.

**Why this pattern exists:** Standard `<script>` tags execute immediately when HTML is parsed. But NUI pages contain custom elements (`<nui-button>`, `<nui-tabs>`, etc.) that need to be upgraded first. If scripts run too early, everything breaks.

**The solution:** NUI uses `<script type="nui/page">` - a custom type that browsers ignore. After fetching the HTML and upgrading custom elements, NUI manually extracts and executes this script.

**Execution flow (step by step):**

```
1. User navigates to: #page=components/button
2. Router fetches: pages/components/button.html
3. Router creates wrapper: <nui-page class="content-page ...">
4. Router injects HTML into wrapper
5. Router calls: customElements.upgrade(wrapper)
   → All <nui-*> elements inside are now upgraded
6. Router finds: <script type="nui/page">
7. Router removes the script tag from DOM
8. Router executes the script via new Function()
```

**⚠️ CSP Requirement:** Step 8 uses `new Function()` which requires `'unsafe-eval'` in your Content Security Policy. Without it, page scripts silently fail. Add `script-src 'self' 'unsafe-eval'` to your CSP.

**⚠️ Script placement:** If the fragment uses `<nui-page>` as root, `<script type="nui/page">` must be **inside** the `<nui-page>` tag. NUI discards everything outside it when extracting content.
9. Script's init(element, params, nui) is called automatically
```

**The script tag is a trigger, not a container:**

The `<script type="nui/page">` tag signals "execute page logic now." The actual code can be:

1. **Inline** - Code directly in the tag (most common)
2. **Imported** - Module imported in `main.js`, trigger tag is empty or calls the imported function
3. **Pre-loaded** - Standard `<script type="text/javascript">` defines the function, trigger tag calls it

```html
<!-- Option 1: Inline (most common) -->
<script type="nui/page">
function init(element, params, nui) {
    element.querySelector('nui-button').addEventListener('nui-click', handler);
}
</script>

<!-- Option 2: Empty trigger (logic imported in main.js) -->
<script type="nui/page" data-init="components/button"></script>

<!-- Option 3: Pre-loaded function -->
<script type="text/javascript">
function initButtonPage(element, params, nui) { /* ... */ }
</script>
<script type="nui/page">
function init(element, params, nui) {
    initButtonPage(element, params, nui);
}
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

### Page script template

```html
<script type="nui/page">
function init(element, params, nui) {
    // One-time setup
    const output = element.querySelector('[data-demo-output]');

    // Optional lifecycle hooks
    element.show = (params) => { /* Start timers */ };
    element.hide = () => { /* Cleanup */ };
}
</script>
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
   - Add `<script type="nui/page">` at the bottom
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
