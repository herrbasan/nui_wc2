# Playground Demo Authoring Guide (LLM-friendly)

> **Note for AI Assistants & Developers:** This guide describes the "Fragment-Based" SPA pattern used specifically for the NUI Playground. This pattern (using `<script type="nui/page">`) is **not mandatory** for NUI applications. Apps can use centralized logic and just use the router to display different states. See `NUI/docs/router-patterns.md` for a complete guide on SPA architecture choices.

This guide defines how to write and maintain demo pages in the NUI Playground.
It is intentionally prescriptive so an LLM (and humans) can make changes without guessing.

## What the Playground is

- The Playground is a small SPA that loads HTML **fragments** from `Playground/pages/**` into the main content area.
- Navigation uses hash routes like `#page=components/button` or `#feature=dashboard`.
- Pages are cached by the router: a page fragment is fetched and initialized **once**, then shown/hidden on navigation.

## Where things live

- `Playground/index.html`: App shell (layout + nav + content region)
- `Playground/js/main.js`: Navigation data + app-level behaviors (sidebar/theme toggles)
- `Playground/css/main.css`: ALL demo styling (shared + page-scoped)
- `Playground/pages/**`: HTML fragments (one file per page)

## Router + page script contract (critical)

When a page is loaded, NUI inserts the fragment into a wrapper `div` and then:

1. Upgrades custom elements in that wrapper.
2. Finds and executes `<script type="nui/page">` inside the wrapper.
3. Removes that script tag after execution.

Important implications:

- `init(element, params)` runs **once per page instance** (because the router caches the wrapper element).
- On navigation, the router calls `element.show(params)` when a page becomes active, and `element.hide()` when it becomes inactive.
- Page code should be written so that:
	- event listeners are attached once (in `init`)
	- timers/polling are started in `show` and stopped in `hide`
	- DOM queries are scoped to the page wrapper (`element.querySelector(...)`), not `document.querySelector(...)`

### Page script template

Put this at the bottom of the fragment (after the page HTML):

```html
<script type="nui/page">
function init(element, params, nui) {
	// One-time setup: cache elements, attach listeners.

	const output = element.querySelector('[data-demo-output]');

	function render(text) {
		if (output) output.textContent = text;
	}

	// Prefer listening on the page wrapper (scoped, cache-safe).
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

## `data-action` contract (how demos do interactions)

NUI provides minimal event delegation for click actions.

### Syntax

`data-action="name[:param][@selector]"`

- `name`: action name (string)
- `param`: optional string payload (after `:`)
- `selector`: optional target selector (after `@`)

Examples:

```html
<button data-action="demo:hello">Run</button>
<button data-action="dialog-open@#my-dialog">Open Dialog</button>
<button data-action="copy-icon:settings">Copy</button>
```

### Events you can listen for

If the action is not handled by a built-in or registered function, NUI dispatches:

- `nui-action` (generic)
- `nui-action-${name}` (specific)

Both bubble. The `detail` object is:

- `detail.name`: action name
- `detail.param`: param string (or undefined)
- `detail.target`: resolved target element (selector target or the clicked element)
- `detail.originalEvent`: the original click event

Recommended page pattern:

```html
<div class="demo-area">
	<nui-button><button type="button" data-action="demo:clicked">Click</button></nui-button>
	<div class="demo-result"><pre data-demo-output>Result: -</pre></div>
</div>

<script type="nui/page">
function init(element) {
	const out = element.querySelector('[data-demo-output]');
	element.addEventListener('nui-action-demo', (e) => {
		out.textContent = 'Result: ' + e.detail.param;
	});
}
</script>
```

## Standard demo primitives (these are real, defined in `Playground/css/main.css`)

Use these classes before inventing new ones:

### `.demo-container`

- Minimal grouping (no chrome)
- Use when you need spacing between blocks but not a visible border.

### `.demo-area`

- Bordered, padded interactive region
- Use for “click here / type here” examples.

### `.demo-chrome`

- Bordered + shaded “component showcase” container
- Use for full widgets like menus/toolbars where you want the component to feel embedded.

### `.demo-callout`

- Shaded callout with left accent
- Use for tips, warnings, or interaction instructions.

### `.demo-actions`

- Responsive button grid
- Use for a set of action buttons that drive a demo.

### `.demo-result`

- Lightweight result separator (currently a bottom border + top margin)
- Recommended content: a `<pre>` inside for predictable formatting.

If you need a padded “panel” style result box, use `.demo-callout` or `.demo-chrome`, or add a page-scoped style.

## Page structure: preferred markup (single-column, scannable)

Most demo pages should read like documentation.

Recommended pattern:

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
			<pre><code data-lang="html">&lt;!-- Example --&gt;</code></pre>
		</nui-code>

		<div class="demo-area">
			<!-- Live example -->
		</div>
	</section>

	<section>
		<h2>More Examples</h2>
		<!-- Repeat: explain → code → live demo -->
	</section>
</div>
```

Notes:

- The outer `.page-my-component` wrapper is optional, but strongly recommended if you need page-scoped CSS.
- Prefer vertical stacking; avoid side-by-side comparisons unless the page is explicitly a gallery.

## When to use `<nui-layout>` in demos

Default: do not.

Use `<nui-layout>` only for “many small items” layouts (icon grids, variant matrices, swatches), typically 8+ items.

## CSS rules

### Shared vs page-scoped

- Shared patterns: add a global class in `Playground/css/main.css`.
- One-off needs: scope under `.page-<slug> ...` in `Playground/css/main.css`.

### Page-scoped naming

The content loader does NOT automatically add `.page-...` classes.
If you want page-scoped CSS, the page fragment must include its own wrapper element with a `.page-<slug>` class.

### Theme variables

- Use existing CSS variables from `NUI/css/nui-theme.css`.
- Do not hard-code new colors/fonts/shadows.

## Inline styles policy (for new edits)

Goal: keep demo HTML clean and predictable.

Allowed:

- Dynamic styles set from JavaScript (position, size, etc.)
- `transition` declarations needed for JS-driven animations

Avoid for new content:

- Inline layout (padding/margin/border)
- Inline colors/backgrounds
- Inline sizing (including icon sizing)
- `<style>` blocks inside page fragments

Existing pages contain some legacy inline styling (especially icon sizing). When touching those pages, migrate styles into `Playground/css/main.css` using page-scoped selectors.

## Adding a new demo page (checklist)

1. Create `Playground/pages/<group>/<name>.html`.
2. Add a navigation entry in `Playground/js/main.js`:
	- `href: '#page=<group>/<name>'`
3. If the page needs scoped styles, wrap the fragment in a single root element:
	- `<div class="page-<name>"> ... </div>`
	- Add styles to `Playground/css/main.css` under a clearly labeled comment.
4. If the page needs JavaScript:
	- Add `<script type="nui/page">` at the bottom.
	- Use `init(element, params, nui)` and attach `element.show/element.hide` if needed.

## Common pitfalls (LLM guardrails)

- Do not assume a page script reruns on navigation; it runs once because pages are cached.
- Do not attach global listeners on `document` from a page unless you also remove them in `element.hide`.
- Use `element.querySelector(...)` for all DOM access inside page scripts.
- When importing NUI modules from a page fragment, use paths relative to `Playground/index.html` (e.g. `import('../NUI/lib/modules/nui-menu.js')`).
