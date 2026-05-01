# LLM Guide: NUI Application Architecture

> **For LLMs:** This guide and the Playground documentation are your authoritative reference. `AGENTS.md` in the project root is for **human contributors** using AI coding assistants - it contains workflow instructions and development preferences, not component APIs or architectural patterns.

## The Layout Engine: nui-page

Before diving into routing patterns, understand NUI's layout foundation:

```html
<nui-page>
    <!-- All children constrained for readability (default) -->
    <section>...</section>
    
    <!-- Break out for full-width sections -->
    <nui-layout breakout>...</nui-layout>
    
    <section>...</section>
</nui-page>
```

**Key points:**
- `nui-page` wraps all page content (created by router or static)
- Children are constrained to `--space-page-maxwidth` (~56rem) for readability
- Add `breakout` attribute to any child to span full container width
- Use `.maxwidth-container` inside breakout elements to re-constrain content

The `breakout` attribute works on any element, not just `nui-layout`.

## The Router's Core Purpose

NUI's router (`nui.createRouter()` / `nui.setupRouter()`) is fundamentally a **state-to-DOM coordinator**. It translates URL hash changes into DOM visibility operations. This is different from framework routers that dictate component hierarchies and data fetching.

The router's job is minimal by design:
1. Parse URL hash (`#type=identifier?params`)
2. Find or create a container element for that identifier
3. Call `show()` on the active container, `hide()` on others
4. Cache containers to preserve state between navigations

This simplicity enables multiple architectural patterns.

## Pattern 1: Centralized Application Logic

**Philosophy:** Your application is a JavaScript program. The router is just a view controller.

**How it works:**
- Register feature functions with `nui.registerFeature()`
- Features receive a container element and URL parameters
- Features build UI programmatically using DOM APIs or templates
- State management happens in your code, not the router

**Best for:**
- Complex applications with shared state (dashboards, editors)
- Real-time collaborative apps
- Apps where multiple views access the same data

**The pattern in practice:**
```javascript
// Centralized state
const appState = { documents: [], currentDoc: null };

// Feature registration
nui.registerFeature('editor', (element, params) => {
	// Build UI
	element.innerHTML = `
		<header><h1>${appState.currentDoc?.title}</h1></header>
		<div class="editor-content"></div>
	`;
	
	// Sync with state
	const content = element.querySelector('.editor-content');
	content.textContent = appState.currentDoc?.content;
	
	// Lifecycle hooks
	element.show = () => { /* refresh from state */ };
});
```

## Pattern 2: Fragment-Based Pages

**Philosophy:** Pages are HTML files. The router fetches and displays them.

**How it works:**
- Call `nui.enableContentLoading()` with basePath
- Create HTML fragments in the pages folder
- Navigation fetches fragments and injects them
- Each fragment can have inline `<script type="nui/page">` for initialization

**⚠️ CSP Requirement:** The router uses `new Function()` to execute page scripts. Your Content Security Policy must include `'unsafe-eval'` in `script-src`, otherwise scripts silently fail.

**⚠️ Script placement:** If the fragment uses `<nui-page>` as root, the `<script type="nui/page">` must be **inside** the `<nui-page>` tag. NUI discards everything outside it when extracting content.

**Best for:**
- Content-heavy sites (documentation, blogs)
- Component libraries and playgrounds
- Rapid prototyping without build tools

**The fragment contract:**
When a fragment loads, the router:
1. Creates a wrapper `<div>` and sets innerHTML
2. Executes `<script type="nui/page">` with `init(element, params, nui)`
3. Removes the script tag
4. Caches the wrapper for future navigation

The `init()` function runs once. `element.show()` and `element.hide()` are called on navigation.

## Pattern 3: Hybrid Architecture

**Philosophy:** Use the right tool for each view.

**How it works:**
- Static content uses fragment loading (`#page=help`)
- Dynamic features use registered functions (`#feature=dashboard`)
- Both coexist in the same application

**Best for:**
- Most real-world applications
- Apps with both content pages and interactive tools
- Migration scenarios (gradually moving from static to dynamic)

## The Layout Engine: nui-page and Breakout

The `nui-page` component is the foundation of NUI's content layout system. It provides automatic text readability constraints while allowing flexible full-width sections.

### How It Works

When content is loaded (via router or static), `nui-page` automatically:
1. **Constrains width** - All direct children get `max-width: var(--space-page-maxwidth)` for readability
2. **Adds padding** - Consistent horizontal padding via CSS variables
3. **Enables breakout** - Any child with `breakout` attribute spans full width

```html
<nui-page>
    <section>
        <!-- Constrained to ~56rem for readability -->
        <h1>Article Title</h1>
        <p>Body text is easy to read...</p>
    </section>
    
    <div breakout>
        <!-- Full container width -->
        <nui-layout columns="3">...</nui-layout>
    </div>
    
    <section>
        <!-- Back to constrained width -->
    </section>
</nui-page>
```

### The `breakout` Attribute

The `breakout` attribute is **not** specific to `nui-layout` — it's a layout engine feature that works on any direct child of `nui-page`:

```html
<!-- Hero image spans full width -->
<img breakout src="hero.jpg" alt="Hero">

<!-- Callout section breaks out -->
<section breakout class="feature-callout">
    <div class="maxwidth-container">
        <!-- Content still readable -->
    </div>
</section>

<!-- Entire page unconstrained -->
<nui-page>
    <div breakout>
        <section>Full width content</section>
        <section>Also full width</section>
    </div>
</nui-page>
```

### `.maxwidth-container` Utility

When an element breaks out, its content loses the default max-width constraint. Use `.maxwidth-container` to re-apply it to specific children:

```html
<nui-layout breakout class="hero-banner">
    <!-- Full-bleed background -->
    <div class="maxwidth-container">
        <!-- Text stays readable -->
        <h2>Headline</h2>
        <p>Description...</p>
    </div>
</nui-layout>
```

This pattern enables:
- **Full-bleed backgrounds** with readable text
- **Edge-to-edge images** without horizontal scroll
- **Flexible layouts** mixing constrained and full-width sections

## URL Structure Philosophy

NUI uses hash-based routing for a reason: **the server doesn't need to know about routes.**

```
#page=docs/introduction    → Load pages/docs/introduction.html
#feature=dashboard         → Run registered 'dashboard' feature
?page=settings&tab=users   → Query params available to features
```

The hash is never sent to the server. This means:
- Static hosting works perfectly (GitHub Pages, S3, etc.)
- No server-side routing configuration needed
- Deep linking works without backend coordination

## State Management Philosophy

NUI intentionally does not include a state management library. Instead, it provides patterns:

**State in the URL:**
Query parameters are the source of truth for view state. Bookmark `#page=search?query=nui` and the search results load automatically.

**State in the DOM:**
Form inputs, scroll positions, and component states persist in the DOM because fragments are cached, not destroyed.

**State in JavaScript:**
For complex apps, use your preferred pattern (store objects, reactive signals, etc.). The router doesn't care.

## The Show/Hide Lifecycle

Understanding when code runs is crucial:

```javascript
function init(element, params, nui) {
	// Runs ONCE when fragment first loads
	// Set up event listeners, fetch initial data
	
	element.show = (params) => {
		// Runs every time this page becomes active
		// Update from params, refresh data
	};
	
	element.hide = () => {
		// Runs when navigating away
		// Stop timers, clean up transient state
	};
}
```

This lifecycle enables:
- Background data fetching (start in init, display in show)
- Clean teardown (stop intervals in hide)
- Parameter changes without reload (show receives new params)

## Action Delegation and Component Boundaries

The `data-action` pattern enables clean component boundaries:

```javascript
// Component listens on its own element
const card = element.querySelector('.task-card');
card.addEventListener('nui-action', (e) => {
	e.stopPropagation(); // Contain events
	const { name } = e.detail;
	// Handle approve, reject, delete...
});
```

Events bubble up by default, allowing parent components to handle unclaimed actions. This creates a natural hierarchy without explicit parent-child wiring.
