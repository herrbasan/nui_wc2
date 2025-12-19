# Playground Demo Page Structure Guide

This document establishes consistent patterns for structuring and styling demo pages in the NUI Playground.

## Core Principles

1. **No inline styles in demo HTML** - All styling should be in `Playground/css/main.css`
2. **Use semantic HTML structure** - Proper semantic elements with descriptive class names
3. **Page-scoped CSS** - Page-specific styles use `.page-{name}` prefix
4. **Shared patterns in common classes** - Reusable demo containers use global classes

## Standard Demo Container Classes

These classes provide visual chrome for interactive demonstrations.

### `.demo-area`
**Purpose:** Interactive demo container with visible border  
**Use for:** Any interactive example where users click/interact with components  
**Style:**
```css
padding: 1rem;
border: 1px solid var(--border-shade1);
border-radius: var(--border-radius1);
margin-bottom: 1rem;
```

**Example:**
```html
<div class="demo-area">
	<nui-button>
		<button type="button">Click Me</button>
	</nui-button>
</div>
```

---

### `.demo-result`
**Purpose:** Display area for results, state, or output  
**Use for:** Status displays, state indicators, result panels  
**Style:**
```css
padding: 1rem;
background: var(--color-shade1);
border-radius: var(--border-radius1);
margin-top: 1rem;
```

**Example:**
```html
<div class="demo-area">
	<nui-button data-action="trigger">
		<button type="button">Trigger Action</button>
	</nui-button>
	<div class="demo-result">Result will appear here</div>
</div>
```

**Note:** If you need a result display without margin-top (e.g., as part of a demo-area), use an additional class or page-scoped style to override.

---

### `.demo-callout`
**Purpose:** Information callout with left accent  
**Use for:** Important notes, tips, warnings within demos  
**Style:**
```css
background: var(--color-shade1);
border-left: 4px solid var(--color-highlight);
padding: 1rem;
margin: 1rem 0;
```

**Example:**
```html
<div class="demo-callout">
	<p><strong>Note:</strong> This feature requires JavaScript enabled.</p>
</div>
```

---

### `.demo-chrome`
**Purpose:** Component container with both border and background  
**Use for:** Complete component demonstrations (menus, complex widgets) where you want full visual chrome  
**Style:**
```css
background: var(--color-shade1);
border: var(--border-thickness) solid var(--border-shade2);
border-radius: var(--border-radius2);
padding: 1rem;
margin: 1.5rem 0;
```

**Example:**
```html
<div class="demo-chrome">
	<nui-menu id="app-menu"></nui-menu>
</div>
```

**When to use `.demo-chrome` vs `.demo-area`:**
- Use `.demo-chrome` when the component is fully functional and you want to showcase it in a "real" context (menus, toolbars, complex widgets)
- Use `.demo-area` for interactive examples where users click buttons to trigger actions

---

## Using Layout Component for Demo Organization

**Default: Single-Column Structure**

Demo pages should follow a simple, readable single-column structure that mirrors markdown documents. This makes them easy to read for both humans and LLMs.

```html
<section>
	<h2>Feature Name</h2>
	<p>Description of the feature.</p>
	
	<nui-code>
		<pre><code data-lang="html"><!-- Code example --></code></pre>
	</nui-code>
	
	<div class="demo-area">
		<!-- Interactive demo -->
	</div>
</section>
```

**Multi-Column Layouts: Use Sparingly**

Only use `<nui-layout>` for multi-column layouts when you have **many small elements** to display:

### Valid Use Cases

**Icon galleries or component variant showcases:**
```html
<nui-layout columns="4" gap="1rem">
	<div class="demo-area">Variant 1</div>
	<div class="demo-area">Variant 2</div>
	<div class="demo-area">Variant 3</div>
	<div class="demo-area">Variant 4</div>
	<!-- ... many more small items -->
</nui-layout>
```

**Button variant grids (showing many options):**
```html
<nui-layout columns="3" gap="1rem">
	<nui-button variant="primary"><button>Primary</button></nui-button>
	<nui-button variant="secondary"><button>Secondary</button></nui-button>
	<nui-button variant="danger"><button>Danger</button></nui-button>
	<!-- ... more variants -->
</nui-layout>
```

### Invalid Use Cases

❌ **Don't use multi-column for:**
- Side-by-side comparison of 2-3 demos (use stacked single-column instead)
- "Before and after" examples (show them vertically)
- Related features (each should have its own section)

**Why?** Multi-column layouts reduce readability and create cognitive load. Users need to compare across columns rather than scanning linearly. LLMs also process content more naturally in single-column format.

### When Layout Component Makes Sense
**Use `<nui-layout>` when:**
- Displaying 8+ small, similar items (icon grid, color swatches, small cards)
- Creating a gallery or catalog view
- Showing exhaustive variant matrices

**Don't use `<nui-layout>` when:**
- You have 2-3 demos to show (stack them vertically instead)
- Content is text-heavy or conceptually different
- The page is primarily explanatory (not a gallery)

---

### `.demo-container`
**Purpose:** Minimal semantic container (no visual chrome)  
**Use for:** Grouping demos without adding visual boundaries  
**Style:**
```css
margin-bottom: var(--nui-space, 1rem);
```

---

### `.demo-actions`
**Purpose:** Grid layout for action buttons  
**Use for:** Groups of buttons that trigger demo functionality  
**Style:**
```css
display: grid;
grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
gap: var(--nui-space, 1rem);
margin: var(--nui-space, 1rem) 0;
```

---

## Page-Scoped Styles

When a page needs specific styling that doesn't fit the common patterns, use page-scoped CSS in `main.css`.

### Naming Convention
```css
.page-{page-name} .element-class {
	/* styles */
}
```

### Example: Declarative Actions Page
```css
/* Declarative Actions page styles */
.page-declarative-actions .syntax-display {
	font-family: monospace;
	font-size: 1.2rem;
}

.page-declarative-actions #task-card {
	max-width: 400px;
}

.page-declarative-actions .task-card-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 1rem;
}
```

### When to Add Page-Scoped Styles

**Add page-scoped styles when:**
- A page has unique component demonstrations that need specific structure
- Layout requirements are specific to one page's context
- Element relationships (flex, grid) are unique to the demo being shown

**Don't add page-scoped styles for:**
- Common patterns that appear on multiple pages (create shared class instead)
- Simple utility needs (use existing CSS variables/spacing)
- Temporary experiments (refactor to proper pattern first)

## Inline Styles: When They're Acceptable

### ✅ Acceptable Inline Styles

1. **Semantic highlighting in code examples**
   ```html
   <span style="color: var(--color-highlight)">name</span>
   ```

2. **Dynamic values set by JavaScript**
   ```javascript
   element.style.left = rect.left + 'px';
   element.style.backgroundColor = dynamicColor;
   ```

3. **Transition properties for JS animations**
   ```html
   <div id="animated-element" style="transition: background 0.3s;">
   ```

### ❌ Not Acceptable Inline Styles

- Layout properties (padding, margin, border)
- Static colors or backgrounds
- Font sizing, family, or weight
- Display properties (flex, grid)
- Any styling that could be in CSS

## Page Structure Template

```html
<header>
	<h1>Component Name</h1>
	<p>Brief description of the component.</p>
</header>

<section>
	<h2>Basic Usage</h2>
	<p>Description of this example.</p>
	
	<nui-code>
		<pre><code data-lang="html">&lt;!-- Code example --&gt;</code></pre>
	</nui-code>
	
	<div class="demo-area">
		<!-- Interactive demo -->
	</div>
</section>

<section>
	<h2>Advanced Features</h2>
	<!-- More examples -->
</section>

<script type="nui/page">
function init(element) {
	// Page-specific JavaScript
}
</script>
```

## Adding New Patterns

When you encounter a new pattern that doesn't fit existing classes:

1. **Stop and document** - Don't just add inline styles
2. **Check for reusability** - Will this appear on other pages?
3. **Choose scope** - Should it be global or page-scoped?
4. **Add to this document** - Update this guide with the new pattern
5. **Implement in CSS** - Add to `main.css` in appropriate section

## CSS Organization in main.css

```css
/* Playground styles */
body { /* ... */ }

/* Component demo page styles */
.demo-container { /* ... */ }
.demo-area { /* ... */ }
.demo-result { /* ... */ }
.demo-callout { /* ... */ }
/* ... other shared classes */

/* Page-specific styles (alphabetically) */

/* Accordion page styles */
.page-accordion { /* ... */ }

/* Button page styles */
.page-button { /* ... */ }

/* Declarative Actions page styles */
.page-declarative-actions { /* ... */ }
```

## Notes

- Page class names are automatically added by the content loading system (e.g., `.page-button`, `.page-accordion`)
- All CSS variables (colors, spacing, borders) come from `NUI/css/nui-theme.css`
- Respect the existing variable system rather than hardcoding values
