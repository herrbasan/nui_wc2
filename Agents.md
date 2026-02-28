# NUI Agent Instructions

## Project Goals

**NUI** is a sleek, high-performance, low-footprint UI library with accessibility built in wherever possible.

Core principles:
1. **Performance First** - Minimal overhead, efficient rendering, zero bloat
2. **Zero Dependencies** - Pure web platform APIs, no framework abstractions
3. **Accessibility by Default** - ARIA compliance, keyboard navigation, screen reader support
4. **Optimized for LLMs** - Code structure and patterns designed for AI understanding and maintenance
5. **Documentation by Example** - The Playground serves as both documentation and live examples

## Project Structure

```
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

## Documentation & Examples

**The Playground is the primary documentation.** Each component has a dedicated page in `Playground/pages/components/` that serves as:
- Live interactive demo
- Usage examples with code
- API documentation

When adding new components, create a demo page following the guidelines in **Creating Demo Pages** section below. Also see [`Playground/README.md`](Playground/README.md) for the LLM orientation guide.

## Coding Ethics (Priority Order)

1. **Reliability** - Code must work correctly; simplicity over cleverness
2. **Performance** - Test and measure; zero dependencies preferred
3. **Readability** - Natural outcome of simplicity
4. **Maintainability** - Focus on extensibility, not "clean code" dogma

## Development Philosophy

### Core Principles
- **Semantic HTML Foundation** - Custom elements enhance, not replace, native HTML
- **Direct Platform APIs** - No abstraction layers; use browser APIs directly
- **Element Reuse** - Cache and reuse DOM elements instead of recreating
- **Measurable Performance** - Test and measure, don't assume

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

### Key Patterns
- **No inheritance hierarchies** - Each component is self-contained
- **CustomEvent for communication** - No pub/sub abstractions
- **CSS Variables for theming** - No CSS-in-JS
- **data-action for simple interactions** - CSP-safe event delegation

## Core Components

**Layout:** `nui-app`, `nui-top-nav`, `nui-side-nav`, `nui-content`, `nui-main`, `nui-app-footer`, `nui-layout`

**UI:** `nui-button`, `nui-icon`, `nui-tabs`, `nui-accordion`, `nui-dialog`, `nui-banner`, `nui-table`, `nui-slider`, `nui-input`, `nui-link-list`, `nui-code`, `nui-loading`

**Planned:** `nui-tooltip`, `nui-progress`

**Addons:** `nui-menu`, `nui-list`, `nui-animation`, `nui-syntax-highlight`

## Development Preferences

- **Indentation:** Tabs
- **Comments:** Only for code structure, not explanations
- **Shell:** PowerShell (Windows)
- **Testing:** VS Code Live Server at `http://127.0.0.1:5500/Playground/index.html`

## Accessibility

Follow [W3C ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/patterns/). Use roving tabindex for composite components (menus, tabs, toolbars).

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

When a page is loaded, NUI inserts the fragment into a wrapper `div` and then:

1. Upgrades custom elements in that wrapper
2. Finds and executes `<script type="nui/page">` inside the wrapper
3. Removes that script tag after execution

Important implications:

- `init(element, params)` runs **once per page instance** (router caches the wrapper element)
- On navigation, the router calls `element.show(params)` when a page becomes active, and `element.hide()` when it becomes inactive
- Page code should:
  - Attach event listeners once (in `init`)
  - Start timers/polling in `show` and stop in `hide`
  - Scope DOM queries to the page wrapper (`element.querySelector(...)`), not `document.querySelector(...)`

### Page script template

```html
<script type="nui/page">
function init(element, params, nui) {
    // One-time setup: cache elements, attach listeners
    const output = element.querySelector('[data-demo-output]');

    function render(text) {
        if (output) output.textContent = text;
    }

    // Prefer listening on the page wrapper (scoped, cache-safe)
    element.addEventListener('nui-action-demo', (e) => {
        render('Action fired: ' + e.detail.param);
    });

    // Optional lifecycle hooks for the router
    element.show = (params) => {
        render('Visible');
    };

    element.hide = () => {
        // Stop timers, detach observers, etc.
    };
}
</script>
```

### `data-action` contract (how demos do interactions)

NUI provides minimal event delegation for click actions.

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
