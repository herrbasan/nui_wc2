# LLM Guide: NUI API Organization

## The Three-Tier Architecture

NUI exports a single `nui` object organized into three conceptual layers:

```
nui.*                 → Root: Core library, lifecycle, configuration
nui.components.*      → Components: Factory APIs for data-driven UI
nui.util.*            → Utilities: Helper functions
```

This structure provides clear extension points and makes the API discoverable.

## Root Level: Core Library

**Purpose:** Library initialization, configuration, and fundamental operations.

**Key members:**
- `nui.init()` - Initialize the library (auto-called on load)
- `nui.configure()` - Update configuration
- `nui.setupRouter()` - Setup SPA router (replaces enableContentLoading)
- `nui.registerFeature()` - Register JS-only page types
- `nui.registerType()` - Register content handlers

**Design principle:** Root functions affect the entire application. They're called once at setup, not repeatedly during rendering.

## Components Namespace: Data-Driven UI

**Purpose:** Factory APIs for components that are created dynamically rather than declared in HTML.

**Two component patterns:**

**Ephemeral components** (created, shown, destroyed):
```javascript
// Dialog appears, user interacts, it closes
await nui.components.dialog.confirm('Delete?', 'Cannot undo');
```

**Persistent components** (created, appended, remain):
```javascript
// Create once, use indefinitely
const nav = nui.components.linkList.create(data);
document.body.appendChild(nav);
```

**Built-in components:**
- `dialog` - Modal system dialogs (alert, confirm, prompt)
- `banner` - Toast notifications
- `linkList` - Navigation tree from data

**Addon pattern:**
Components register themselves under `nui.components.*`:
```javascript
// In nui-gallery.js
nui.components.gallery = {
	create(images, options) { ... }
};
```

This enables a standard import-and-use pattern:
```javascript
import './NUI/lib/modules/nui-gallery.js';
const gallery = nui.components.gallery.create(images);
```

## Utilities Namespace: Helper Functions

**Purpose:** Stateless operations that don't render UI.

**Categories:**
- **DOM:** `createElement`, `createSvgElement`
- **Data:** `sortByKey`, `filter`
- **Storage:** `storage` (cookies/localStorage)
- **Interaction:** `enableDrag`
- **Environment:** `detectEnv`

**Usage pattern:**
```javascript
// Destructure for convenience
const { createElement, storage } = nui.util;

// Use directly
const el = createElement('div', { class: 'card' });
storage.set({ name: 'pref', value: 'dark' });
```

## Why This Organization Matters

**Discoverability:**
```javascript
// See what's available
console.log(Object.keys(nui.components));
// ['dialog', 'banner', 'linkList', 'icon']
```

**Extensibility:**
Addons extend the namespaces without conflicting:
- New component? Add to `nui.components.*`
- New utility? Add to `nui.util.*`
- New root function? Add to `nui.*`

**Tree-shaking:**
The namespace structure helps bundlers understand the API surface for dead code elimination.

## The Component Lifecycle

Understanding when things happen:

1. **Import time:** Module loads, code executes
2. **DOM ready:** `nui.init()` called (auto or manual)
3. **Custom elements defined:** `customElements.define()` called
4. **HTML parsed:** Elements upgrade automatically
5. **connectedCallback:** Component initializes for each element

For factory APIs (like `nui.components.dialog.confirm()`), the lifecycle is immediate:
- Function called
- DOM created
- Dialog shown
- Promise resolves on close
- DOM removed

## API Stability

NUI follows semantic versioning:
- Root API: Very stable
- Components namespace: Stable, additions only in minor versions
- Utilities: Stable, additions only in minor versions

Addons may have their own versioning but follow the same namespace pattern.
