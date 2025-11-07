# nui_wc2 - DOM-First UI Component Library

A lightweight, performant UI component library built on custom elements and vanilla JavaScript. Zero framework dependencies, pure DOM manipulation, external CSS styling.

## Philosophy

**DOM-First Architecture**
- Direct DOM manipulation using native APIs
- Custom elements for semantic structure (no Shadow DOM complexity)
- JavaScript enhancement pattern for progressive behavior
- External CSS only - clean separation of concerns
- Zero dependencies except companion [UT library](./UT)

**Performance & Reliability**
- Simplicity over cleverness - iterate to find straightforward solutions
- Functional paradigm - pure functions, minimal state
- Measurable performance - test, don't assume
- 10-50x smaller bundles than framework-based solutions
- Direct browser API usage for maximum speed

**Development Approach**
- Element-centric components (logic + presentation together)
- Event-driven communication using native CustomEvent
- Explicit state management - predictable, traceable updates
- CSS Variables for reactive styling
- Browser DevTools for debugging - no framework abstractions

## Architecture

### Core Concept

Components are built using three layers:

1. **Custom Element** - Semantic HTML structure
```html
<nui-button type="primary">Click Me</nui-button>
```

2. **JavaScript Enhancement** - Behavior attached via `customElements.define()`
```javascript
class NuiButton extends HTMLElement {
	connectedCallback() {
		this.addEventListener('click', this.handleClick);
	}
	
	handleClick(e) {
		this.dispatchEvent(new CustomEvent('nui-click', {
			bubbles: true,
			detail: { source: this }
		}));
	}
}
customElements.define('nui-button', NuiButton);
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

## Project Structure

```
nui_wc2/
├── UT/                          # Companion utility library (submodule)
├── lib/                         # Component library
│   ├── nui.js                  # Main library entry point
│   ├── components/             # Individual components
│   │   ├── button.js
│   │   ├── navbar.js
│   │   ├── modal.js
│   │   └── ...
│   └── core/                   # Core utilities
│       ├── component.js        # Base component class
│       └── registry.js         # Component registration
├── css/                        # Component styles
│   ├── nui-main.css           # Core CSS variables & utilities
│   ├── nui-button.css
│   ├── nui-navbar.css
│   └── ...
├── playground/                 # Interactive demo/testing environment
│   ├── index.html             # Demo application
│   ├── playground.js          # Demo app logic
│   ├── playground.css         # Demo styling
│   └── examples/              # Component examples by category
│       ├── buttons.js
│       ├── navigation.js
│       └── ...
├── docs/                       # Documentation
└── .github/                    # GitHub configuration
    └── copilot-instructions.md

reference/                      # Reference materials (not tracked)
├── nui/                       # Original NUI library (git clone)
└── dom-first.md              # Philosophy paper
```

## Companion Libraries

**UT Library** (`./UT/`)
- Core utilities for DOM manipulation, data handling, CSS variables
- Independent library, can be used standalone
- Provides foundational functions: `ut.el()`, `ut.createElement()`, `ut.getCssVar()`, etc.
- Zero dependencies, ~24KB minified

**Relationship**
- UT = Core utilities (element creation, selection, data manipulation)
- nui_wc2 = UI components (buttons, navbars, modals, forms)
- Both follow DOM-first principles
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

## Usage Example

```html
<!DOCTYPE html>
<html>
<head>
	<link rel="stylesheet" href="css/nui-main.css">
	<link rel="stylesheet" href="css/nui-button.css">
	<link rel="stylesheet" href="css/nui-navbar.css">
</head>
<body>
	
	<nui-navbar>
		<nui-button slot="left" icon="menu">Menu</nui-button>
		<span slot="title">My App</span>
		<nui-button slot="right" icon="settings">Settings</nui-button>
	</nui-navbar>
	
	<main>
		<nui-button type="primary">Primary Action</nui-button>
		<nui-button type="secondary">Secondary Action</nui-button>
	</main>
	
	<script type="module" src="UT/nui_ut.js"></script>
	<script type="module" src="lib/nui.js"></script>
	
	<script>
		document.addEventListener('nui-click', (e) => {
			console.log('Button clicked:', e.detail);
		});
	</script>
	
</body>
</html>
```

## Performance Targets

- **Bundle Size**: < 15KB minified (components only, excluding UT)
- **Load Time**: < 50ms to interactive (on modern hardware)
- **Memory**: Minimal overhead, no duplicate trees
- **Render Speed**: Direct DOM updates, no diffing overhead

## Migration from Original NUI

This library is a complete rework of the original NUI library with significant architectural changes. Here are the key differences:

### CSS Architecture Changes

**Theme System: `light-dark()` Function**

The original NUI used class-based theme switching (`.dark` class), but nui_wc2 uses the modern CSS `light-dark()` function for automatic theme detection.

**Old approach (reference/nui):**
```css
body {
	--color-text: rgb(0, 0, 0);
}
body.dark {
	--color-text: rgb(255, 255, 255);
}
```

**New approach (nui_wc2):**
```css
:root {
	color-scheme: light dark;
}

body {
	--color-text: light-dark(rgb(0, 0, 0), rgb(255, 255, 255));
	--color-bg: light-dark(rgb(255, 255, 255), rgb(26, 26, 26));
	--color-border: light-dark(rgb(220, 220, 220), rgb(60, 60, 60));
}
```

**Benefits:**
- Automatic theme detection based on system preferences
- No JavaScript required for theme switching
- Single variable declaration instead of duplicates
- More performant - browser-native feature
- Respects user's OS/browser theme settings

**Browser Support:** All modern browsers (Chrome 123+, Firefox 120+, Safari 17.5+)

### Component Architecture Changes

**Two Component Patterns**

The new library uses two distinct patterns for different use cases:

**1. Custom Element Components (Persistent/Declarative)**
- For persistent UI elements defined in HTML markup
- Long-lived in the DOM structure
- Enhanced via `customElements.define()`
- Examples: buttons, navbars, cards, inputs, forms

```html
<!-- Declarative usage in HTML -->
<nui-button type="primary">Click Me</nui-button>
<nui-navbar>
	<span slot="title">My App</span>
</nui-navbar>
```

```javascript
// Component definition
class NuiButton extends HTMLElement {
	connectedCallback() {
		this.addEventListener('click', this.handleClick);
	}
}
customElements.define('nui-button', NuiButton);
```

**2. Dynamic Components (Temporary/Imperative)**
- For temporary UI elements created programmatically
- Short-lived, destroyed after use
- Created via JavaScript functions on the `nui` namespace
- Examples: alerts, prompts, dialogs, loaders, toasts, notifications

```javascript
// Imperative usage in JavaScript
nui.alert('Operation complete!');
nui.confirm('Delete this item?').then(result => { ... });
nui.loaderShow(target, 'Loading data...');

// Example implementation
nui.alert = function(message, options) {
	let overlay = ut.createElement('div', { classes: 'nui-overlay' });
	let dialog = ut.createElement('div', { classes: 'nui-alert' });
	
	overlay.kill = () => { ut.killMe(overlay); };
	document.body.appendChild(overlay);
	return overlay;
}
```

**Why Two Patterns?**
- **Custom Elements**: Semantic, persistent, part of page structure
- **Dynamic Components**: Temporary overlays, don't pollute markup, programmatic control
- **Performance**: Dynamic components can be created/destroyed efficiently
- **Developer Experience**: Each pattern fits its use case naturally

### Storage System

**Built-in Storage Management**

The new library includes a core storage system (`nui.storage`) as base functionality, used internally for theme preferences and available for application state management.

**Features:**
- **IndexedDB primary** with localStorage fallback
- **Persistent storage** support (when available)
- **Reactive updates** - storage changes trigger events
- **Clean data handling** - automatic serialization
- **Multiple instances** - separate storage contexts

**Use Cases:**
- Theme preference persistence (light/dark mode)
- User settings and preferences
- Application state between sessions
- Form data persistence

```javascript
// Internal usage for theme
nui.storage.set('theme', 'dark');
let theme = await nui.storage.get('theme');

// Available for application use
let userPrefs = nui.storage.create('userPreferences');
await userPrefs.set('sidebarCollapsed', true);
```

**Why Built-in:**
Modern web applications need persistent state. Rather than requiring external dependencies, the storage system is part of the base library, ensuring consistent behavior and zero additional overhead.

## Development Status

🚧 **Early Development** - Architecture design phase

Current work focused on:
- Core component base class
- Custom element registration system
- CSS variable architecture
- **Storage system** (`nui.storage`) - IndexedDB/localStorage wrapper for theme preferences and app state
- **Priority components**: Button, Select (custom dropdown), Input fields
- **Interactive playground/demo** for component testing and showcase

### Component Priority

**Phase 1 - Foundation:**
1. **Storage System** - Base library functionality for persisting theme preferences and user settings
2. **Button** - Primary interactive element with variants (primary, secondary, outline, disabled, delete)
3. **Select** - Custom select/dropdown component (replacing native `<select>`)
4. **Input Fields** - Text inputs, textareas with consistent styling

**Phase 2 - Core UI:**
- Navbar/Topbar
- Sidebar navigation
- Card containers
- Modal dialogs
- Alert/Prompt (dynamic components)

**Phase 3 - Advanced:**
- Media Player (specialized component from original library)
- List components (SuperList from original library)
- Additional specialized components as needed

### Playground Demo

The project includes an interactive playground application that serves as both:
- **Live Documentation** - See components in action with real examples
- **Testing Environment** - Test components directly in the browser
- **Design Showcase** - Demonstrates the library's aesthetic and capabilities

Inspired by the [original NUI playground](https://herrbasan.github.io/n000b_ui_playground/), the demo features:
- Sidebar navigation organizing components by category
- Live component examples with interactive functionality
- Clean, modern interface matching component aesthetic
- Dark/light theme support
- Direct browser testing via Live Server

**Philosophy**: The playground's look and feel is as important as the code ethics - demonstrating that DOM-first development produces beautiful, performant interfaces.

## Credits

Built with [UT utility library](./UT) - Personal web dev utilities from 25+ years of development.

Inspired by the [DOM-First philosophy](./reference/dom-first.md) - Challenging framework-centric web development.

---

**Status**: Active Development | **License**: MIT
