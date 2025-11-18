# nui_wc2 - Platform-Native UI Component Library

A lightweight, performant UI component library built on web standards and progressive enhancement. Zero framework dependencies, platform-native approach, CSS-driven styling.

## Philosophy

**Platform-Native Performance**
- Work *with* browser capabilities using direct platform APIs
- Element reuse pattern: "Never generate twice if not needed"
- HTML markup generates semantic DOM - components enhance the structure
- Progressive enhancement via custom elements and external CSS
- Semantic HTML elements inside custom element containers
- Works perfectly with screen readers and assistive technology
- Zero dependencies except companion [UT library](./UT)

**Performance & Reliability**  
- Web platform fundamentals over framework abstractions
- Functional paradigm - pure functions, minimal state
- Measurable performance - test, don't assume
- Element reuse pattern dramatically reduces rendering overhead
- 10-50x smaller bundles than framework-based solutions
- Direct browser API usage for maximum control and speed

**Development Approach**
- Start with semantic HTML that generates a working DOM
- Custom elements as layout containers and behavior attachment points
- Direct element manipulation and event-driven communication using native CustomEvent
- Cache and reuse DOM elements instead of repeated creation/destruction
- External CSS with CSS Variables for theming
- Browser DevTools for debugging - no framework complexity

## Architecture

### Dual-Mode Layout System

The library supports two distinct layout modes based on the presence of a `<nui-app>` container:

#### App Mode (with `<nui-app>`)
```html
<nui-app>
    <nui-top-nav>
        <header><!-- Navigation content --></header>
    </nui-top-nav>
    <nui-side-nav>
        <nav><!-- Sidebar navigation --></nav>
    </nui-side-nav>
    <nui-content>
        <main><!-- Main content --></main>
    </nui-content>
    <nui-footer>
        <footer><!-- App footer --></footer>
    </nui-footer>
</nui-app>
```

**Behavior**: CSS Grid layout with fixed application structure (sidebar, topbar, content grid)
**Use Case**: Desktop applications, admin panels, dashboards

#### Page Mode (without `<nui-app>`)
```html
<nui-top-nav>
    <header><!-- Page header --></header>
</nui-top-nav>
<nui-content>
    <main><!-- Page content flows naturally --></main>
</nui-content>
<nui-footer>
    <footer><!-- Page footer --></footer>
</nui-footer>
```

**Behavior**: Normal document flow, responsive design patterns
**Use Case**: Marketing sites, documentation, blogs

### Component Pattern

Components follow a hybrid HTML-first approach:

1. **Semantic HTML Foundation**
```html
<nui-button>
    <button type="button">Click Me</button>
</nui-button>
```

2. **Custom Element Enhancement**
```javascript
class NuiButton extends HTMLElement {
	connectedCallback() {
		setupButtonBehavior(this);
	}
}

function setupButtonBehavior(element) {
	const button = element.querySelector('button');
	button.addEventListener('click', (e) => {
		element.dispatchEvent(new CustomEvent('nui-click', {
			bubbles: true,
			detail: { source: element }
		}));
	});
}
customElements.define('nui-button', NuiButton);
```

### Reactive Attribute System

Components use an efficient attribute proxy pattern instead of MutationObserver for reactive updates:

**Standard Pattern:**
```javascript
registerComponent('nui-icon', (element) => {
    // Setup component DOM
    const svg = createSVG();
    element.appendChild(svg);
    
    // Define attribute handlers - called when attributes change
    setupAttributeProxy(element, {
        'name': (newValue, oldValue) => {
            updateIcon(newValue);
        }
    });
    
    // Optional: Create property accessors
    defineAttributeProperty(element, 'iconName', 'name');
});
```

**Usage:**
```javascript
// Via attribute (proxied for reactivity)
icon.setAttribute('name', 'settings');  // Handler called automatically

// Via property (if defined)
icon.iconName = 'settings';  // Calls setAttribute internally

// Direct property access
const currentIcon = icon.iconName;  // Returns getAttribute('name')
```

**Supported Methods:**
- ✅ `setAttribute(name, value)` - Standard and recommended
- ✅ `removeAttribute(name)` - Triggers handler with null
- ✅ `toggleAttribute(name)` - Triggers handler on change
- ✅ Property setters (if defined) - Maps to setAttribute

**Unsupported (rare in practice):**
- ❌ `element.attributes['name'].value = 'x'` - Direct mutation, use setAttribute instead
- ❌ `setAttributeNode(attrNode)` - Rare API, not needed
- ❌ `setAttributeNS(ns, name, value)` - Namespaced attributes, not needed

**Why not MutationObserver?**
- ✅ Zero overhead when attributes don't change
- ✅ Synchronous and predictable
- ✅ Clear stack traces for debugging
- ✅ More LLM-friendly pattern
- ✅ Covers 99.9% of real-world usage
- ❌ MutationObserver: constant polling, async callbacks, cleanup complexity

### The Knower & Doer Systems

The library provides two complementary systems for managing application state and actions, using plain language naming for better discoverability and teaching:

#### The Knower (State Management)

**Philosophy**: "Knower knows things" - A lightweight, opt-in state observation system for cross-component communication.

**Basic Usage:**
```javascript
import { nui } from './NUI/nui.js';

// Tell the Knower something changed
nui.knower.tell('sidebar', { open: true, mode: 'tree' });

// Watch for changes
nui.knower.watch('sidebar', (state, oldState) => {
    console.log('Sidebar changed:', state);
    overlay.style.display = state.open ? 'block' : 'none';
});

// Ask the Knower what it knows
const sidebarState = nui.knower.know('sidebar');
if (sidebarState?.open) {
    // Do something
}

// Stop watching
const unwatch = nui.knower.watch('sidebar', handler);
unwatch(); // Cleanup when done
```

**Component Integration:**
```javascript
registerComponent('nui-side-nav', (element) => {
    const id = element.id || 'side-nav';
    
    // Report state changes to Knower
    const setState = (newState) => {
        nui.knower.tell(id, newState);
    };
    
    // Initialize state
    setState({ open: false, mode: 'tree' });
    
    // Update on interaction
    element.addEventListener('toggle', () => {
        const current = nui.knower.know(id);
        setState({ ...current, open: !current.open });
    });
});

// Other components react to state changes
registerComponent('nui-overlay', (element) => {
    const unwatch = nui.knower.watch('side-nav', (state) => {
        element.classList.toggle('visible', state?.open);
    });
    
    // Cleanup in disconnectedCallback
    element._cleanup = unwatch;
});
```

**Zero Overhead Design:**
- ✅ No Maps created until first use
- ✅ No background polling or timers
- ✅ Automatic cleanup of empty Sets
- ✅ Tree-shakeable if unused
- ✅ Returns unwatch function for easy cleanup

**When to use:**
- Components need to react to other component state
- Cross-component coordination (sidebar → overlay → content)
- Debugging state across the application
- Avoiding tight coupling between components

**When NOT to use:**
- Simple DOM events work fine (use CustomEvent instead)
- Component only cares about its own state
- Parent-child relationships (use props/attributes)

#### The Doer (Action System)

**Philosophy**: "Doer does things" - Centralized action execution with auto-registration for custom events.

**Basic Usage:**
```javascript
import { nui } from './NUI/nui.js';

// Register a custom action
nui.doer.register('show-notification', (target, source, event, message) => {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
});

// Use via declarative attributes
// <button nui-event-click="show-notification:Hello!">Notify</button>

// Or execute programmatically
nui.doer.do('show-notification', element, element, null, 'Hello!');
```

**Auto-Registration Pattern:**
When an unknown action is triggered, the Doer automatically:
1. Dispatches a custom event (`nui-{actionName}`)
2. Tells the Knower about the action execution
3. Allows listening via standard event handlers

```javascript
// Listen for unregistered actions
document.addEventListener('nui-custom-action', (e) => {
    console.log('Custom action triggered:', e.detail);
    // { element, target, param, originalEvent }
});

// Or watch via Knower
nui.knower.watch('action:custom-action', (state) => {
    console.log('Action executed at:', state.timestamp);
});
```

**Built-in Actions:**
- `toggle-theme` - Switch between light/dark mode
- `toggle-class:className` - Toggle CSS class on target
- `add-class:className` - Add CSS class to target
- `remove-class:className` - Remove CSS class from target
- `toggle-attr:attrName` - Toggle attribute on target
- `set-attr:name=value` - Set attribute on target
- `remove-attr:attrName` - Remove attribute from target

**Action Syntax:**
```html
<!-- Simple action -->
<button nui-event-click="toggle-theme">Theme</button>

<!-- Action with parameter -->
<button nui-event-click="toggle-class:active">Toggle</button>

<!-- Action with target selector -->
<button nui-event-click="toggle-class:open@#sidebar">Open Sidebar</button>
```

### Knower/Doer: Potential Dangers & Mitigation

**The Problem**: Reactive systems like Knower can encourage sprawl in larger teams, similar to React hooks or Vue composables. Each developer adds "just one more watcher" leading to:
- Entangled observers and duplicated state
- Multiple state variables describing the same thing
- Performance degradation from unnecessary re-renders
- Difficult debugging and maintenance

**Mitigation Strategies:**

**1. Enforce Design Discipline**
```javascript
// ❌ BAD: Global watch for component-specific state
nui.knower.watch('button-clicked', handleButtonClick);

// ✅ GOOD: Use DOM queries for component-specific state
const button = document.querySelector('#my-button');
button.addEventListener('click', handleButtonClick);

// ✅ GOOD: Knower only for cross-component coordination
nui.knower.watch('sidebar-state', (state) => {
    // Multiple components need to know about sidebar
    updateOverlay(state);
    updateContentPadding(state);
});
```

**2. Functional Purity as Guardrail**
```javascript
// Treat state changes as pure functions
function updateSidebarState(currentState, action) {
    // Input → Output, no side effects
    switch (action.type) {
        case 'toggle':
            return { ...currentState, open: !currentState.open };
        case 'setMode':
            return { ...currentState, mode: action.mode };
        default:
            return currentState;
    }
}

// Single source of truth
nui.knower.tell('sidebar', updateSidebarState(
    nui.knower.know('sidebar'),
    { type: 'toggle' }
));
```

**3. Performance Monitoring**
```javascript
// Use the NUI Monitor module during development
import { createMonitor } from './NUI/lib/modules/nui-monitor.js';
const monitor = createMonitor(nui);

// Check for issues
monitor.diagnose();
// Warnings for:
// - High watcher counts (possible memory leak)
// - Frequently used unregistered actions
// - High state churn (performance impact)
```

**4. Team Practices & Code Review**
- Document that Knower is for **shared state only**, not per-component caching
- Code reviews should flag over-subscription patterns
- Use Doer for commands, Knower for queries (CQRS-lite)
- Encourage direct DOM manipulation for simple cases

**5. Bounded Contexts**
```javascript
// Namespace your state to avoid collisions
nui.knower.tell('sidebar:main', state);      // Main sidebar
nui.knower.tell('sidebar:settings', state);  // Settings sidebar
nui.knower.tell('modal:confirm', state);     // Specific modal

// Not just generic names that could clash
nui.knower.tell('sidebar', state);  // ❌ Which sidebar?
```

**6. Development Tools**
The NUI Monitor provides real-time visibility:
```javascript
// Check current state snapshot
monitor.printKnower();
// Shows: states, watchers, total counts

// Find duplicate subscriptions
monitor.diagnose();
// Warns about high watcher counts

// Track action frequency
monitor.printActionLog();
// Shows which actions fire frequently
```

**Best Practice Summary:**
- **Knower**: Cross-component state only, single source of truth per ID
- **Doer**: Command execution, auto-registration for extensibility
- **Platform APIs**: Prefer direct element manipulation for component-local concerns
- **Monitor**: Use during development to catch issues early
- **Review**: Check watcher counts and state churn in code reviews

3. **Layout Elements (Optional)**

For flexible positioning, use `<layout>` and `<item>` elements:

```html
<nui-top-nav>
    <header>
        <layout>
            <item><h1>Title</h1></item>
            <item><button>Action</button></item>
        </layout>
    </header>
</nui-top-nav>
```

**Screen Reader Optimization:**
```css
/* Make layout containers transparent to accessibility tree */
layout, item {
    display: contents;
}

/* Context-specific styling */
header layout {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
}
```

**Philosophy**: Use layout elements sparingly. Prefer semantic HTML directly when possible. Layout elements exist for flexible positioning without adding unnecessary DOM depth that could affect screen readers.

### Interaction Patterns

The library provides two approaches for adding interactivity, emphasizing **direct platform APIs** as the primary pattern:

#### Platform-Native Approach (Recommended)

**Direct JavaScript Enhancement** - Full control and platform knowledge
```javascript
// Find elements and enhance them directly
const themeButton = document.querySelector('[data-theme-toggle]');
themeButton.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
});

// Component interaction
const sidebar = document.querySelector('nui-side-nav');
const menuButton = document.querySelector('[data-menu-toggle]');
menuButton.addEventListener('click', () => {
    const isOpen = sidebar.hasAttribute('data-open');
    sidebar.toggleAttribute('data-open', !isOpen);
    menuButton.setAttribute('aria-expanded', !isOpen);
});
```

#### Attribute System (Quick Setup)

**Declarative Actions** - Limited but convenient for simple interactions
```html
<button nui-event-click="toggle-theme" data-theme-toggle>Dark/Light</button>
<button nui-event-click="toggle@nui-side-nav" data-menu-toggle>Menu</button>
```

**When to use each approach:**
- **Platform-Native**: Complex logic, custom behavior, learning web standards, full control
- **Attribute System**: Rapid prototyping, simple toggles, getting started quickly

**Advanced Pattern Example:**
```javascript
// Custom component enhancement with complex logic
class NuiDataTable extends HTMLElement {
    connectedCallback() {
        this.setupSorting();
        this.setupFiltering();
        this.setupPagination();
    }
    
    setupSorting() {
        const headers = this.querySelectorAll('[data-sortable]');
        headers.forEach(header => {
            header.addEventListener('click', (e) => {
                const column = e.target.dataset.column;
                const direction = this.getSortDirection(column);
                this.sortData(column, direction);
                this.updateSortUI(column, direction);
            });
        });
    }
    
    // More advanced logic...
}
```

3. **External CSS** - All styling via external stylesheets
```css
nui-button {
	display: inline-block;
	padding: var(--nui-button-padding);
	background: var(--nui-button-bg);
}
```

### Key Principles

**No Shadow DOM**
- Avoids style encapsulation complexity
- Maintains CSS inheritance and cascade
- Simpler debugging with standard DevTools
- Direct DOM access without shadow piercing

**Enhancement Pattern**
- HTML structure works without JavaScript
- JavaScript progressively enhances behavior
- Graceful degradation built-in

**Event-Driven Communication**
- Components communicate via native DOM events
- Loose coupling between components
- Standard event bubbling and capturing
- No complex state management required

## CSS Architecture and Theming

**CSS Variables with Light-Dark Support**
- Components use CSS custom properties (variables) for all styling
- Variables have sensible fallback values for graceful degradation
- **Light-dark() function** provides automatic theme switching
- No internal styles - complete external CSS control
- Users can override any aspect of the design system

**Why This Approach?**
We chose CSS variables with `light-dark()` over class-based switching to maximize user control and modern CSS capabilities:

- **Automatic Theme Switching**: Respects user's system color scheme preference
- **Custom Design Systems**: Users can override any aspect globally or per-component
- **Progressive Enhancement**: Components work with minimal CSS or complete custom styling
- **No Lock-in**: Library CSS is optional - use your own design system entirely
- **Maintainability**: Single source of truth for design tokens
- **Performance**: No CSS-in-JS overhead or style injection

### Theming Examples

**Global Theme Override**
```css
:root {
  --button-color-background: #ff6b6b;
  --border-radius0: 8px;
  --color-text: #333;
}
```

**Component-Specific Customization**
```css
nui-button {
  --nui-button-bg: linear-gradient(45deg, #ff6b6b, #ffa500);
  --nui-button-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
}
```

**Complete Custom Styling (No Library CSS)**
```css
nui-button {
  background: #your-brand-color;
  border-radius: 12px;
  /* Full control over appearance */
}
```

### Light-Dark Function

The `light-dark()` function automatically switches values based on color scheme:

```css
/* Automatic light/dark switching */
--color-shade0: light-dark(255,255,255, 0,0,0); /* white in light, black in dark */
--border-shade1: light-dark(rgb(220,220,220), rgb(55,55,55)); /* light gray / dark gray */
```

**Manual Override** (optional utility classes):
```css
body.light { color-scheme: light; }
body.dark { color-scheme: dark; }
```

### CSS Variable Patterns

Components follow consistent variable naming and fallback patterns:

```css
/* Component uses variables with library defaults as fallbacks */
nui-button {
  background: var(--nui-button-bg, var(--nui-primary, #007acc));
  border-radius: var(--nui-border-radius, 4px);
  transition: var(--nui-transition, 0.2s ease);
}
```

This ensures components are styleable without requiring library CSS while providing sensible defaults when the library styles are used.

## Configuration System

### nui-* Attribute Namespace

Components use a structured attribute system for declarative configuration:

#### CSS Variables (`nui-vars-*`)
```html
<nui-app nui-vars-sidebar_width="15rem" nui-vars-sidebar_force-breakpoint="75rem">
<nui-side-nav nui-vars-sidenav_mode="tree">
```

**Processing**: Attributes are converted to CSS custom properties on the element
- `nui-vars-sidebar_width="15rem"` → `--nui-sidebar-width: 15rem`
- `nui-vars-sidenav_mode="tree"` → `--nui-sidenav-mode: tree`

#### State Management (`nui-state-*`)
```html
<nui-sidebar nui-state-visible="false">
<nui-modal nui-state-open="true">
```

#### Event Handling (`nui-event-*`)
```html
<button nui-event-click="toggle-theme">Dark/Light</button>
<button nui-event-click="toggle@nui-side-nav">Menu</button>
```

#### Other Namespaces
- `nui-url-*`: Resource references and API endpoints  
- `nui-data-*`: Data binding and content sources

**Philosophy**: DOM as configuration system - variables live in elements, events attach to elements, components read their own attributes to configure behavior.

## Project Structure

```
nui_wc2/
├── UT/                          # Companion utility library  
├── NUI/                         # Main library folder
│   ├── lib/                    # Component library
│   │   └── core/              # Core UI components
│   │       └── nui-button.js  # First component implementation
│   └── css/                   # Styling (optional - users can provide their own)
│       ├── nui-defaults.css   # Default CSS variable values
│       └── core/              # Core component styles
│           └── nui-button.css
├── playground/                 # Interactive demo/testing environment
│   ├── index.html             # Demo application
│   ├── css/                   # Demo styles
│   └── js/                    # Demo scripts
└── .github/                    # GitHub configuration
    └── copilot-instructions.md

reference/                      # Reference materials (not tracked)
├── nui/                       # Original NUI library (reference only)
├── nui_screenshots/           # Visual reference from old library
└── platform-native.md         # Philosophy paper
```

## Companion Libraries

**UT Library** (`./UT/`)
- Core utilities for DOM manipulation, data handling, CSS variables
- Independent library, can be used standalone
- Provides foundational functions for web development
- Zero dependencies, lightweight

**Relationship**
- UT = Core utilities (element creation, selection, data manipulation)
- nui_wc2 = UI components (buttons, navbars, layouts, forms)
- Both follow HTML-first principles
- Both can be used independently or together

## Design Goals

### What This Library IS

✅ **Lightweight component system** using custom elements  
✅ **Direct DOM manipulation** with UT utilities  
✅ **External CSS architecture** with CSS Variables  
✅ **Event-driven** component communication  
✅ **Progressive enhancement** pattern  
✅ **Zero framework dependencies**  

### What This Library IS NOT

❌ Not a framework replacement  
❌ No virtual DOM or reconciliation  
❌ No JSX or template languages  
❌ No build step required (optional for optimization)  
❌ No Shadow DOM complexity  
❌ No CSS-in-JS  

## Usage Examples

### HTML-First Foundation

```html
<!DOCTYPE html>
<html>
<head>
	<link rel="stylesheet" href="NUI/css/nui-defaults.css">
	<style>
		/* Optional: Custom theme overrides */
		:root {
			--nui-primary: #ff6b6b;
			--nui-border-radius: 8px;
		}
	</style>
</head>
<body>
	<!-- App Mode Layout -->
	<nui-app nui-vars-sidebar_width="15rem">
		<nui-top-nav>
			<header>
				<h1>My App</h1>
				<button type="button">Menu</button>
			</header>
		</nui-top-nav>
		
		<nui-side-nav>
			<nav>
				<section>
					<h2>Navigation</h2>
					<ul>
						<li><a href="/">Home</a></li>
						<li><a href="/about">About</a></li>
					</ul>
				</section>
			</nav>
		</nui-side-nav>
		
		<nui-content>
			<main>
				<h1>Welcome</h1>
				<nui-button>
					<button type="button">Click Me</button>
				</nui-button>
			</main>
		</nui-content>
	</nui-app>
	
	<script type="module" src="NUI/lib/core/nui-button.js"></script>
</body>
</html>
```

### Page Mode (No nui-app wrapper)

```html
<!DOCTYPE html>
<html>
<head>
	<link rel="stylesheet" href="NUI/css/nui-defaults.css">
</head>
<body>
	<!-- Natural document flow -->
	<header>
		<h1>My Website</h1>
		<nav>
			<ul>
				<li><a href="/">Home</a></li>
				<li><a href="/about">About</a></li>
			</ul>
		</nav>
	</header>
	
	<main>
		<h1>Page Content</h1>
		<nui-button>
			<button type="button">Action Button</button>
		</nui-button>
	</main>
	
	<script type="module" src="NUI/lib/core/nui-button.js"></script>
</body>
</html>
```

## Development Status

🚧 **Early Development** - Architecture established, first implementation in progress

### Current Architecture Status
✅ **HTML-First Foundation**: Semantic HTML that works without CSS/JS  
✅ **Dual-Mode Layout**: App mode vs Page mode system designed  
✅ **CSS Variable System**: `light-dark()` theming with nui-defaults.css  
✅ **Component Pattern**: Thin classes + pure functions established  
✅ **Attribute Namespace**: `nui-vars-*`, `nui-event-*`, `nui-state-*` system  

### Implemented Components
✅ **nui-button**: First component with complete pattern implementation
🚧 **Layout system**: Basic structure defined, CSS implementation in progress

### Next Priority
1. **Dual-mode CSS implementation**: App/Page mode layout CSS
2. **Screen reader optimization**: `display: contents` for layout elements
3. **Attribute processing**: `nui-vars-*` to CSS custom properties
4. **Event system**: `nui-event-*` declarative actions (optional convenience layer)

### Playground Status
✅ **Clean HTML structure**: Works without CSS enhancement  
✅ **Component examples**: Real usage patterns demonstrated  
✅ **Reference integration**: Links to original NUI playground and screenshots

The foundation is solid. Focus now shifts to CSS implementation of the dual-mode layout system and completing the attribute processing systems.

## Credits

Built with [UT utility library](./UT) - Personal web dev utilities from 25+ years of development.

Inspired by platform-native performance principles - Challenging framework-centric web development.

---

**Status**: Active Development | **License**: MIT
