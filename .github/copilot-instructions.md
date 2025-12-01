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

### Development Philosophy: Platform-Native Performance

**Core Principle:** Work *with* browser capabilities to achieve measurable performance gains through direct platform API usage and optimization patterns proven over decades of web development.

Based on the paper `reference/dom-first.md`, this project follows these core principles:

#### Foundation Principles
- **Semantic HTML Foundation**: HTML markup generates working DOM structure (progressive enhancement)
- **Direct Platform APIs**: Use native browser APIs - no abstraction layers
- **Element Reuse Pattern**: "Never generate twice if not needed" - cache and reuse DOM elements
- **Zero Framework Dependencies**: Pure web platform APIs only
- **Dual-Mode Layout System**: App mode (CSS Grid) vs Page mode (document flow) based on `<nui-app>` presence
- **Screen Reader Friendly**: Semantic HTML inside custom element containers
- **Measurable Performance**: Test and measure, don't assume

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

**Semantic HTML Foundation:**
- Always start with semantic HTML markup that generates a working DOM
- Custom elements serve as enhancement containers
- Standard HTML elements inside (`<header>`, `<nav>`, `<button>`, `<ul>`, etc.)
- Screen readers interact with semantic HTML elements, not custom elements
- Progressive enhancement - works with CSS/JS disabled
- Use `<layout>` and `<item>` elements sparingly as layout containers only
- Consider `display: contents` for layout elements to make them transparent to screen readers

**Direct Platform APIs:**
- Work directly with DOM elements using platform APIs (querySelector, addEventListener, etc.)
- JavaScript was designed to manipulate the DOM directly - use it that way
- No abstraction layers - direct is fastest
- Browser DevTools for debugging and performance measurement
- Leverage browser memory management and layout engine optimizations

**Element Reuse Pattern** ("Never Generate Twice"):
- Cache DOM element references in data structures or closures
- Reuse elements by mutating content/position/visibility instead of recreation
- Browser keeps elements in memory even when detached - leverage this
- Dramatically faster than repeated creation/destruction cycles
- Common use cases: tooltips, modals, list items, overlays, form errors

**Performance Impact:**
- Noticeable difference at 1000+ elements
- List operations: ~10x performance improvement with element reuse (measured)
- Memory: Reuse creates once | Regeneration churns GC constantly
- Below 1000 elements: Difference exists but may not be perceptible

#### Element Reuse: Detailed Patterns

**Why Reuse Over Regeneration:**
DOM elements are persistent objects in memory, not ephemeral templates. The browser keeps elements alive even when detached. Creating new elements requires parsing, style calculation, and layout work. Reusing existing elements by mutating properties (position, content, visibility) is the platform's fastest path - this is how the rendering engine is designed to work.

**Tooltip Pattern** (Single reused element):
```javascript
// Generate once
const tooltip = document.createElement('div');
tooltip.className = 'tooltip';
tooltip.innerHTML = '<span class="text"></span>';
document.body.appendChild(tooltip);

// Reuse forever - just mutate
function showTooltip(text, target) {
    tooltip.querySelector('.text').textContent = text;  // Fast: textContent mutation
    const rect = target.getBoundingClientRect();
    tooltip.style.left = rect.left + 'px';              // Fast: property change
    tooltip.style.top = rect.bottom + 5 + 'px';
    tooltip.classList.add('visible');
}

function hideTooltip() {
    tooltip.classList.remove('visible');
}

// Attach to multiple triggers
document.querySelectorAll('[data-tooltip]').forEach(el => {
    el.addEventListener('mouseenter', () => showTooltip(el.dataset.tooltip, el));
    el.addEventListener('mouseleave', hideTooltip);
});
```

**Modal/Dialog Pattern** (Content swapping):
```javascript
// One modal container
const modal = document.createElement('div');
modal.className = 'modal';
modal.innerHTML = `
    <div class="modal-content">
        <h2 class="title"></h2>
        <div class="message"></div>
        <div class="actions">
            <button class="confirm">OK</button>
            <button class="cancel">Cancel</button>
        </div>
    </div>
`;
document.body.appendChild(modal);

// Reuse for different dialogs
function showConfirm(title, message, onConfirm) {
    modal.querySelector('.title').textContent = title;
    modal.querySelector('.message').textContent = message;
    modal.querySelector('.confirm').onclick = () => {
        onConfirm();
        modal.classList.remove('open');
    };
    modal.querySelector('.cancel').onclick = () => {
        modal.classList.remove('open');
    };
    modal.classList.add('open');
}

// Usage
showConfirm('Delete Item?', 'This cannot be undone', () => {
    deleteItem(itemId);
});
```

**List Pattern** (Cached elements in data structure):
```javascript
// Based on reference/nui/nui_list.js pattern
const items = data.map((d, i) => ({
    id: i,
    data: d,
    el: null,        // Cached DOM element
    selected: false
}));

function renderItem(data) {
    const el = document.createElement('div');
    el.className = 'list-item';
    el.innerHTML = `<span class="name">${data.name}</span>`;
    return el;
}

function update() {
    container.innerHTML = ''; // Clear container
    items.forEach((item, i) => {
        if (!item.el) {
            item.el = renderItem(item.data);  // Generate once
        }
        // Just reposition and reattach
        item.el.style.top = i * itemHeight + 'px';
        container.appendChild(item.el);
    });
}

function sort(key) {
    // Sorting just rearranges wrapper objects
    items.sort((a, b) => a.data[key].localeCompare(b.data[key]));
    update(); // Same elements, new positions - fast!
}

function updateItem(id, newData) {
    const item = items.find(i => i.id === id);
    item.data = newData;
    item.el.querySelector('.name').textContent = newData.name;  // Surgical update
}
```

**Form Validation Pattern** (Persistent error elements):
```javascript
// Create error elements once per field
const fields = document.querySelectorAll('input[required]');
fields.forEach(input => {
    const error = document.createElement('div');
    error.className = 'error-message';
    error.style.display = 'none';
    input.parentNode.appendChild(error);
    input.errorElement = error;  // Cache reference
});

// Reuse by changing visibility and content
function showError(input, message) {
    input.errorElement.textContent = message;
    input.errorElement.style.display = 'block';
    input.classList.add('invalid');
}

function hideError(input) {
    input.errorElement.style.display = 'none';
    input.classList.remove('invalid');
}
```

**When to Reuse:**
- ✅ Element appears/disappears frequently (tooltips, modals, spinners, overlays)
- ✅ Structure is fixed, content varies (form errors, notifications, list items)
- ✅ Large lists (1000+ items) where sorting/filtering is common (see `reference/nui/nui_list.js`)
- ✅ Animations/transitions benefit from persistent elements (state preservation)
- ✅ Performance-critical operations where measurements show meaningful gains

**When to Regenerate:**
- ✅ Structure changes significantly (not just content/position)
- ✅ Element appears once and rarely changes afterward
- ✅ Server-rendered HTML on initial page load (progressive enhancement)
- ✅ Complexity of reuse logic outweighs generation cost (KISS principle)
- ✅ Small number of elements where performance difference is imperceptible

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

#### Component Patterns

**Tree View Pattern (`nui-link-list`):**
- **Structure**: `role="tree"` > `role="group"` > `role="treeitem"`
- **Navigation**: Hybrid model supporting both Tab (web standard) and Arrow keys (app standard)
- **Behavior**: "Close All -> Open Path" strategy for reliable accordion behavior
- **Accessibility**: Auto-expand on focus to prevent keyboard traps in collapsed sections
- **Visibility**: Use `visibility: hidden` on collapsed items to remove them from tab order

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
- Direct JavaScript using platform APIs remains the recommended approach

**Other Namespaces:**
- `nui-url-*`: Resource references and API endpoints
- `nui-data-*`: Data binding and content sources

#### Interaction Patterns Priority

**Primary Pattern: Direct JavaScript (Recommended)**
```javascript
// Direct platform API usage - full control, teaches fundamentals
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

**Philosophy:** Attribute system is convenience sugar for rapid prototyping. Direct JavaScript using platform APIs is the primary teaching pattern showing platform fundamentals.

#### Knower & Doer Systems

**The Knower (State Management)** - "Knower knows things"
- Lightweight, opt-in state observation for cross-component communication
- Use for shared state only (sidebar open/closed, theme, global app state)
- NOT for component-local state (use closures or DOM attributes instead)
- Single source of truth per state ID

```javascript
// Tell the Knower something changed
nui.knower.tell('sidebar', { open: true, mode: 'tree' });

// Watch for changes (returns unwatch function)
const unwatch = nui.knower.watch('sidebar', (state, oldState) => {
    overlay.style.display = state.open ? 'block' : 'none';
});

// Query current state
const state = nui.knower.know('sidebar');
```

**The Doer (Action Execution)** - "Doer does things"
- Centralized action system with auto-registration
- Built-in actions for common operations (toggle-theme, toggle-class, etc.)
- Unknown actions auto-dispatch custom events and update Knower

```javascript
// Register custom action
nui.doer.register('show-notification', (target, source, event, message) => {
    // Action implementation
});

// Use via attributes or programmatically
nui.doer.do('show-notification', element, element, null, 'Hello!');
```

**Dangers & Mitigation:**
- **Problem**: Reactive systems invite over-subscription (like React hooks sprawl)
- **Mitigation**: 
  - Use Knower only for cross-component state, not component-local
  - Prefer direct platform queries for component-specific concerns
  - Namespace state IDs to avoid collisions (`sidebar:main` not just `sidebar`)
  - Monitor watcher counts during development (use nui-monitor.js)
  - Code review for over-subscription patterns
  - Treat state changes as pure functions (input → output)

**Development Monitoring:**
```javascript
import { createMonitor } from './NUI/lib/modules/nui-monitor.js';
const monitor = createMonitor(nui);
monitor.diagnose(); // Check for high watcher counts, state churn, etc.
```

**Refactor Note (November 2025): ID-Based Cleanup**
To prevent memory leaks from object references, the system now uses an ID-based cleanup mechanism.
- Components use the `nui-id` attribute for both state scoping and cleanup tracking
- `knower.watch(id, handler, ownerId?)` accepts optional `ownerId` (string) for cleanup tracking
- `doer.register(name, fn, ownerId?)` accepts optional `ownerId` (string) for cleanup tracking
- Cleanup is triggered via `knower.clean(id)` and `doer.clean(id)` in `disconnectedCallback`
- This ensures no direct DOM references are held by the central systems

**Usage Pattern:**
```javascript
registerComponent('my-component', (element) => {
	const instanceId = ensureInstanceId(element, 'my-comp');
	
	// Register watcher with cleanup tracking
	knower.watch('some-state', (state) => {
		// Handle state change
	}, instanceId);
	
	// Register action with cleanup tracking
	doer.register('my-action', (target, source, event, param) => {
		// Handle action
	}, instanceId);
});

// Cleanup happens automatically in disconnectedCallback:
// - knower.clean(instanceId) removes all watchers
// - doer.clean(instanceId) removes all actions
```

**Lazy Execution Optimization:**
Unknown actions only update Knower state if watchers exist, reducing memory churn:
```javascript
// This won't create state if no one is watching
doer.do('unknown-action', target, source, event, param);

// Check before expensive operations
if (knower.hasWatchers('expensive-state')) {
	knower.tell('expensive-state', computeExpensiveValue());
}
```

**Fool-Proof Safeguards (Memory Leak Prevention):**
System warns users about common mistakes that cause memory leaks:
```javascript
// Warns if registering watcher on disconnected component
knower.watch('state', handler, 'disconnected-id'); 
// Console: [KNOWER] Registering watcher for disconnected component...

// Warns if registering action on disconnected component
doer.register('action', fn, 'disconnected-id');
// Console: [DOER] Registering action for disconnected component...
```

**Exception Resilience:**
Watchers are wrapped in try-catch blocks so one failing watcher doesn't crash the system:
```javascript
// Safe iteration allows DOM manipulation during notifications
Array.from(hooks).forEach(handler => {
    try {
        handler(state, oldState, source);
    } catch (error) {
        console.error('[KNOWER] Watcher error:', error);
        // Other watchers continue executing
    }
});
```

**Test Coverage:**
Comprehensive 22-test suite validates:
- Memory leak prevention (all scenarios)
- Exception resilience (system survives errors)
- Race conditions (200 parallel create/destroy cycles)
- Edge cases (DOM manipulation during callbacks, circular dependencies, etc.)
- Performance (1000 updates in <100ms)

All tests pass. System is production-ready.

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
- ✅ Direct element manipulation within component logic (no Shadow DOM)
- ✅ Element reuse over regeneration for performance-critical operations
- ✅ Browser-native features and APIs

### Project Goals
- **Teaching Tool**: Library serves as reference implementation for platform-native performance patterns
- **Stable Core**: Minimal updates to core components - extensions via modules
- **User Control**: Complete design system flexibility via CSS variables
- **Platform Knowledge**: Help developers understand web platform fundamentals and performance optimization
- **Accessibility by Default**: Components should upgrade elements with appropriate ARIA attributes when purpose can be inferred from context

### Implementation Approach
- **Start Small, Build Solid**: Work in careful, incremental steps during initial development
- **Architecture First**: Discuss and validate structural decisions before implementing
- **Avoid Rebuilds**: Get the foundation right - rushing leads to starting over
- **Incremental Validation**: Implement one component, validate pattern, then proceed
- **Question Assumptions**: If something seems complex, pause and discuss simpler alternatives
- **Critical Evaluation**: When the user suggests something, question it as much as you'd question your own ideas:
  - Ask "what problem does this solve?"
  - Consider simpler alternatives
  - Point out potential issues or trade-offs
  - Push back if it conflicts with the core philosophy
  - **The user's input should be questioned just as critically as AI suggestions**

**AI Collaboration Mindset:**
- **Explore eagerly, critique honestly**: Be enthusiastic about exploring ideas, but maintain critical analysis throughout
- **Avoid cheerleading**: Don't validate ideas just because the user proposed them—examine trade-offs objectively
- **Be willing to scrap**: If analysis reveals fundamental problems, recommend starting over rather than patching
- **Consistent skepticism**: Apply the same critical lens to user suggestions and AI-generated solutions
- **Focus on measurability**: Prefer solutions with testable, observable outcomes over theoretical elegance
- **Acknowledge uncertainty**: When you don't know if something will work long-term, say so explicitly
- **No persona-switching**: Maintain steady analytical stance rather than oscillating between supportive/critical modes
- **User knowledge profile**: The user has ~30 years of real-world development experience with hundreds of projects. They bring practical wisdom about what survives in production, how teams work, and what maintenance costs look like over time. However, they are human—subject to biases, incomplete information, and preference for familiar patterns. Question both their suggestions and your own with equal rigor. Their experience is valuable context, not gospel. Look for the "why" behind their decisions and challenge assumptions when something doesn't add up.

**Critical Early Phase**: The first few components establish patterns for the entire library. Take time to get these right. Better to spend hours planning than days rebuilding.

### Performance Budget Guidelines

**HTTP/2 Frame Size Optimization:**
- **Target boundaries**: 16KB → 32KB → 64KB (powers of 2 for optimal network performance)
- **Current sprite**: 29.57KB (fits in 2 HTTP/2 frames, well under 32KB boundary)
- **Philosophy**: Size constraints drive better design decisions and feature prioritization
- **Historical perspective**: 56k modem awareness remains valuable for global accessibility and mobile data costs

**Size Budget Enforcement:**
- **Core library**: Only essential, proven features that solve real problems
- **Speculative features**: Moved to optional modules or custom actions (not core)
- **Every byte justified**: Each feature must demonstrate clear value vs size cost
- **Tooling automation**: Automated sprite generation maintains efficiency without manual optimization

### Development Environment & Preferences
- **Code Formatting**: Use tab indentation for all code files
- **Comments**: Only use comments to structure and separate blocks of code, not for explanations
- **Shell Commands**: Use PowerShell syntax (Windows environment in VS Code)
- **Testing/Preview**: VS Code built-in Live Server functionality for testing
- **Live Server Endpoint**: `http://127.0.0.1:5500/Playground/index.html` (Use this for browser testing)

### Project Context
- **Reference Material**: `reference/` folder contains the NUI library for reference only (not part of repo)
- **Old NUI Library Playground**: [Live Demo](https://herrbasan.github.io/n000b_ui_playground/#page=content&id=containers) - Interactive playground showing previous NUI library implementation
- **Visual Reference**: `reference/nui_screenshots/` - Screenshots of the old NUI library components and layouts for visual reference
- **Instructions File**: `.github/copilot-instructions.md` - User preferences and coding guidelines (this file)
- **Project Documentation**: `README.md` - Project goals, aims, and documentation
- **Development Log**: `.github/ai-contributor-notes.md` - Detailed session notes documenting architectural decisions and lessons learned

### Playground Architecture
The Playground is a Single Page Application (SPA) that uses a custom content loading system.
- **Entry Point**: `Playground/index.html`
- **Pages**: Located in `Playground/pages/` as HTML fragments
- **Navigation**: JSON-based configuration in `Playground/js/main.js`
- **Content Loading**: `nui.enableContentLoading()` handles fetching and injecting page content
- **Script Execution**: Scripts in loaded pages are re-injected to ensure execution

### Workflow: Adding New Components
1. **Generate Component**: Create the component in `NUI/nui.js` following existing patterns (functional decomposition, `registerComponent`).
2. **Integrate Features**: specific functionality should utilize:
   - **Knower**: For cross-component state.
   - **Doer**: For actions.
   - **Attribute System**: For configuration (`nui-vars-*`, `nui-state-*`).
   - **Accessibility**: Ensure proper ARIA roles and keyboard navigation.
3. **Create Demo Page**: Add a live example page in `Playground/pages/components/[component-name].html`.
   - Follow the pattern of existing component pages (header, examples, code snippets).
4. **Update Navigation**: Add the new page to the `navigationData` array in `Playground/js/main.js` so it appears in the sidebar.

### Backlog
- [ ] Refactor `nui-link-list` and other interactive elements to expose standard API methods (`next`, `prev`, `activate`) and register generic `doer` actions.

