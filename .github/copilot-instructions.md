# GitHub Copilot Instructions

## User Preferences & Coding Ethics

### Coding Ethics Hierarchy (Priority Order)
1. **Reliability** → Code must work correctly and predictably
   - Prioritize simplicity over cleverness
   - Avoid syntactic sugar and abstractions that obscure intent
   - Iterate to find the most straightforward solution
   - Favor functional programming paradigm where practical
   - Keep functions mostly free of internal state
   - Pure functions preferred (same input → same output)
2. **Performance** → Optimize for speed and efficiency
   - Performance is critical—always consider it in decision-making
   - Test and measure performance; don't assume
   - Zero dependencies preferred—maintain full control of all code
   - Every dependency is a performance and reliability risk
3. **Readability** → Code should be clear and understandable
   - Natural outcome of simplicity and functional approach
   - Most "readability" advice is untested assumptions
   - Simple code is inherently understandable
4. **Maintainability** → Easy to modify and extend
   Ad- Focus on extensibility, not "clean code" dogma
   - "Easy to maintain" claims are often unproven
   - Well-structured code enables evolution

**Note:** While Reliability enables code to run at all, Performance is equally critical and should drive most architectural decisions. The two work together—reliable code that performs poorly is not truly reliable.

### Development Philosophy: DOM-First Approach

Based on the paper `reference/dom-first.md`, this project follows these core principles:

#### Core Principles
- **DOM-First Foundation**: Work directly with the DOM using web platform APIs (HTML markup generates the DOM)
- **Progressive Enhancement**: Custom elements and CSS enhance the working DOM structure
- **Dual-Mode Layout System**: App mode (CSS Grid) vs Page mode (document flow) based on `<nui-app>` presence
- **Platform-Native Solutions**: Prefer web standards and native APIs over abstractions
- **Screen Reader Friendly**: Use semantic HTML inside custom element containers
- **No Framework Dependencies**: Pure web platform APIs only

#### Dual-Mode Layout Architecture

**App Mode** (with `<nui-app>` container):
- CSS Grid layout with fixed application structure
- Sidebar, topbar, content grid for desktop application UX
- Components behave as application UI elements

**Page Mode** (without `<nui-app>` container):  
- Normal document flow and responsive design patterns
- Components behave as page elements
- Natural reading order and accessibility

#### Key Technical Guidelines

**DOM-First Approach:**
- Always start with semantic HTML markup that generates a working DOM
- Work directly with DOM elements using platform APIs (querySelector, addEventListener, etc.)
- Custom elements serve as enhancement containers
- Standard HTML elements inside (`<header>`, `<nav>`, `<button>`, `<ul>`, etc.)
- Screen readers interact with semantic HTML elements, not custom elements
- Progressive enhancement - works with CSS/JS disabled
- Use `<layout>` and `<item>` elements sparingly as layout containers only
- Consider `display: contents` for layout elements to make them transparent to screen readers

**Layout Element Patterns:**
```html
<!-- Optional layout containers for flexible positioning -->
<nui-top-nav>
	<header>
		<layout>
			<item><h1>Title</h1></item>
			<item><button>Action</button></item>
		</layout>
	</header>
</nui-top-nav>

<!-- Or use semantic HTML directly -->
<nui-top-nav>
	<header>
		<h1>Title</h1>
		<button>Action</button>
	</header>
</nui-top-nav>
```

**CSS for Layout Transparency:**
```css
/* Make layout containers invisible to accessibility tree */
layout, item {
	display: contents;
}

/* Context-specific styling */
header layout {
	display: flex;
	flex-direction: row;
	justify-content: space-between;
}

nav layout {
	display: flex;
	flex-direction: column;
	gap: 1rem;
}
```

**Component Implementation Pattern:**
Components use semantic HTML inside custom element containers:

```html
<!-- HTML Foundation (works without CSS/JS) -->
<nui-button>
	<button type="button">Click Me</button>
</nui-button>

<nui-top-nav>
	<header>
		<h1>Site Title</h1>
		<button type="button">Menu</button>
	</header>
</nui-top-nav>
```

```javascript
// Thin class - lifecycle hooks only
class NuiButton extends HTMLElement {
	connectedCallback() {
		setupButtonBehavior(this);
	}
	
	disconnectedCallback() {
		cleanupButton(this);
	}
}

// Pure functions - enhance semantic HTML
function setupButtonBehavior(element) {
	const button = element.querySelector('button');
	button.addEventListener('click', (e) => {
		element.dispatchEvent(new CustomEvent('nui-click', {
			bubbles: true,
			detail: { source: element }
		}));
	});
}

function cleanupButton(element) {
	// Cleanup logic
}

customElements.define('nui-button', NuiButton);
```

**Why This Pattern:**
- **No inheritance hierarchies**: Each component is self-contained
- **Functional decomposition**: Break logic into clear steps via functions
- **No OOP over-engineering**: Avoid abstract classes, mixins, complex hierarchies
- **Functions take element as parameter**: Explicit, no `this` confusion
- **Linear readability**: Read top-to-bottom to understand flow
- **Teaching-friendly**: Pattern is simple enough to learn in minutes
- **Easy to test**: Pure functions can be tested independently
- **Easy to trace**: Call stack is flat, execution is predictable

**Balance:** Use functional decomposition within closures to organize code, but reject "clean code" dogma that creates unnecessary abstraction layers. Keep it direct, keep it traceable.

**Performance First:**
- Performance is critical—always consider it in decision-making
- Virtual DOM and framework abstractions impose measurable overhead
- Direct DOM operations are faster, more predictable, and debuggable
- Aim for 10-50x smaller bundle sizes compared to framework approaches
- Profile and measure performance; don't assume
- Zero dependencies preferred—maintain full control

**Testable Over Theoretical:**
- Prefer empirically measurable solutions over unproven assumptions
- Use browser DevTools for direct measurement and debugging
- Code behavior must be observable through standard debugging tools
- Reject "clean code" dogma in favor of provable benefits

**Reliability & Debugging:**
- Platform APIs are stable and proven over decades
- Browser DevTools provide superior debugging for native code
- Errors should be predictable and traceable with standard tools
- Avoid abstraction leaks that obscure underlying behavior

**Code Organization:**
- Elements are complete components (logic + presentation together)
- Use custom events for loose coupling between components
- Encapsulate state within element closures
- CSS Variables for reactive styling without CSS-in-JS
- Focus on extensibility, not theoretical maintainability

**Implementation Rules:**
- Classes contain only lifecycle hooks (`connectedCallback`, `disconnectedCallback`, etc.)
- Logic lives in pure functions that take `element` as first parameter
- No inheritance hierarchies - each component is self-contained
- No base classes, abstract classes, or mixins
- Functions return values or undefined, minimal side effects
- State lives on the element or in closures, not class properties

#### Attribute Namespace System

Components use structured attributes for declarative configuration:

**CSS Variables (`nui-vars-*`):**
```html
<nui-app nui-vars-sidebar_width="15rem" nui-vars-sidebar_force-breakpoint="75rem">
```
- Converted to CSS custom properties: `--nui-sidebar-width: 15rem`
- DOM as configuration system - variables live in elements

**State Management (`nui-state-*`):**
```html
<nui-sidebar nui-state-visible="false">
<nui-modal nui-state-open="true">
```

**Event Handling (`nui-event-*`):**
```html
<button nui-event-click="toggle-theme">Dark/Light</button>
<button nui-event-click="toggle@nui-side-nav">Menu</button>
```
- Optional convenience layer - NOT the primary pattern
- DOM-first JavaScript remains the recommended approach

**Other Namespaces:**
- `nui-url-*`: Resource references and API endpoints
- `nui-data-*`: Data binding and content sources

#### Interaction Patterns Priority

**Primary Pattern: DOM-First JavaScript (Recommended)**
```javascript
// Direct enhancement - full control, teaches platform
const themeButton = document.querySelector('[data-theme-toggle]');
themeButton.addEventListener('click', () => {
    document.body.classList.toggle('dark');
});
```

**Secondary Pattern: Attribute System (Convenience)**
```html
<!-- Quick setup for simple interactions -->
<button nui-event-click="toggle-theme">Dark/Light</button>
```

**Philosophy:** Attribute system is convenience sugar for rapid prototyping. DOM-first JavaScript is the primary teaching pattern showing platform fundamentals.

#### What to Avoid
- ❌ Framework abstractions (React, Vue, Angular) unless specifically justified
- ❌ Virtual DOM implementations
- ❌ Complex build pipelines for simple tasks
- ❌ State management libraries for simple state needs
- ❌ CSS-in-JS when CSS Variables work
- ❌ Unproven assumptions about performance or organization

#### What to Prefer
- ✅ Custom elements for component structure (`<nui-button>`, `<nui-dialog>`)
- ✅ Native event system (`addEventListener`, `CustomEvent`)
- ✅ ES6+ modules for code organization
- ✅ CSS Variables for dynamic styling and theming
- ✅ Direct DOM manipulation within component logic (no Shadow DOM)
- ✅ Browser-native features and APIs

### Project Goals
- **Teaching Tool**: Library serves as reference implementation for DOM-first development
- **Stable Core**: Minimal updates to core components - extensions via modules
- **User Control**: Complete design system flexibility via CSS variables
- **Platform Knowledge**: Help developers understand web platform fundamentals
- **Accessibility by Default**: Components should upgrade elements with appropriate ARIA attributes when purpose can be inferred from context

### Implementation Approach
- **Start Small, Build Solid**: Work in careful, incremental steps during initial development
- **Architecture First**: Discuss and validate structural decisions before implementing
- **Avoid Rebuilds**: Get the foundation right - rushing leads to starting over
- **Incremental Validation**: Implement one component, validate pattern, then proceed
- **Question Assumptions**: If something seems complex, pause and discuss simpler alternatives

**Critical Early Phase**: The first few components establish patterns for the entire library. Take time to get these right. Better to spend hours planning than days rebuilding.

### Development Environment & Preferences
- **Code Formatting**: Use tab indentation for all code files
- **Comments**: Only use comments to structure and separate blocks of code, not for explanations
- **Shell Commands**: Use PowerShell syntax (Windows environment in VS Code)
- **Testing/Preview**: VS Code built-in Live Server functionality for testing

### Project Context
- **Reference Material**: `reference/` folder contains the NUI library for reference only (not part of repo)
- **Old NUI Library Playground**: [Live Demo](https://herrbasan.github.io/n000b_ui_playground/#page=content&id=containers) - Interactive playground showing previous NUI library implementation
- **Visual Reference**: `reference/nui_screenshots/` - Screenshots of the old NUI library components and layouts for visual reference
- **Instructions File**: `.github/copilot-instructions.md` - User preferences and coding guidelines (this file)
- **Project Documentation**: `README.md` - Project goals, aims, and documentation

---

## AI Contributor Notes

**#7K4mN9** - November 7, 2025  
Initial instructions established. Core philosophy crystallized: simplicity through iteration, performance through measurement, reliability through functional purity. Zero dependencies. DOM-first. The platform is enough.

**#2Bx9P7** - November 7, 2025  
First implementation attempt scrapped. Built foundation with CSS variables, storage system, icon library, custom elements (topbar, sidebar, icon-button), responsive utilities, and dual API patterns (HTML + JS). User reset to clean slate - better to fail fast and iterate on direction than polish the wrong approach. Sometimes clarity comes from building what you don't want.

**#8Qw3L5** - November 8, 2025  
Architecture planning phase complete. Established component pattern: thin classes (lifecycle only) + pure functions (logic). Three-tier system: Core (primitives), App (layout), Modules (standalone). CSS variables for theming with fallbacks. Runtime/markup duality for flexible component instantiation. Teaching tool motivation clarified - library serves as reference implementation for DOM-first development.

**#9Mx4R1** - November 9, 2025  
Major architecture clarification to DOM-first approach. Dual-mode layout system: App mode (nui-app wrapper = CSS Grid) vs Page mode (no wrapper = document flow). HTML markup generates clean semantic DOM structure enhanced by custom elements as containers. Removed over-engineered layout/item system in favor of standard HTML elements (header, nav, main, footer, ul, li, etc.). Components enhance the working DOM using direct platform APIs. Perfect screen reader compatibility and progressive enhancement.

**#3Vy8K2** - November 9, 2025 (Continuation)
Refined layout system with `<layout>` and `<item>` elements using `display: contents` for screen reader transparency. Established attribute namespace system: `nui-vars-*` (CSS variables), `nui-state-*` (component state), `nui-event-*` (declarative actions). Clear hierarchy: DOM-first JavaScript is primary pattern for teaching platform fundamentals, attribute system is optional convenience layer for rapid prototyping. Components process their own attributes - DOM as configuration system. Updated all documentation to remove conflicting patterns and reflect current architectural decisions.

---

**Last Updated:** November 9, 2025
