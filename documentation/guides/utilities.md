# LLM Guide: NUI Utilities Architecture

## Design Philosophy

NUI utilities are **minimal, focused helpers** that complement the browser's native APIs rather than replacing them. They follow the same principles as the components: work with the platform, add convenience without abstraction.

The utilities are organized under `nui.util.*` as a flat namespace. Each utility solves a specific problem that comes up repeatedly when building UIs.

## createElement: Concise DOM Construction

The native DOM API is verbose. `createElement` provides a declarative options object:

```javascript
const button = nui.util.createElement('button', {
	class: 'btn btn-primary',
	attrs: { type: 'submit', disabled: true },
	events: { click: handleClick },
	content: 'Save Changes'
});
```

**Key insight:** This isn't a virtual DOM or template system. It returns a real DOM element that can be appended immediately. The utility just collapses multiple imperative calls into one declarative call.

## Storage: Unified Cookie/LocalStorage API

Browsers have two storage mechanisms with different APIs. `nui.util.storage` unifies them:

```javascript
// Same API, different backing stores
nui.util.storage.set({ name: 'theme', value: 'dark' });                    // cookie
nui.util.storage.set({ name: 'theme', value: 'dark', target: 'localStorage' }); // localStorage
```

**TTL support:** Both stores support time-to-live:
```javascript
nui.util.storage.set({ 
	name: 'session', 
	value: token, 
	ttl: '2-hours' 
});
```

**Why cookies by default?** They're sent to the server, enabling server-side rendering scenarios and sharing state between client and server.

## enableDrag: Pointer Abstraction

Mouse and touch events have different APIs. `enableDrag` unifies them:

```javascript
nui.util.enableDrag(element, (data) => {
	// data.type: 'start' | 'move' | 'end'
	// data.x/y: pointer position relative to element
	// data.percentX/Y: 0..1 for slider-type interactions
});
```

Returns a cleanup function to remove listeners. This pattern (return cleanup) is used throughout NUI for resource management.

## sortByKey and filter: Array Operations

Working with data arrays is common. These utilities provide:

**sortByKey:** Nested property sorting with numeric option
```javascript
// Sort by nested property
nui.util.sortByKey(users, 'profile.name');

// Numeric sort
nui.util.sortByKey(products, 'price', true);
```

**filter:** Multi-property search
```javascript
nui.util.filter({
	data: items,
	search: 'query',
	prop: ['title', 'description', 'tags']
});
```

These are simple wrappers around `Array.sort()` and `Array.filter()` with convenience features for common UI patterns.

## detectEnv: Capability Detection

Feature detection over browser sniffing, but sometimes you need to know:

```javascript
const env = nui.util.detectEnv();
// { isTouch, isMac, isIOS, isSafari, isFF }
```

Use sparingly. Prefer feature detection (`'ontouchstart' in window`) for capability checks.

## Utilities vs Components

Utilities are functions. Components are custom elements. The boundary:

- **Utility:** Stateless operation on data or DOM (sort, createElement, storage get/set)
- **Component:** Stateful UI element with lifecycle (button, dialog, tabs)

When in doubt: if it needs to render something visible, it's probably a component. If it processes data or helps build UI, it's probably a utility.

## Extending Utilities

Addons can add utilities to `nui.util.*`. Follow the pattern:
- Flat namespace (no nested objects)
- Single responsibility
- Return cleanup functions for anything that adds listeners
- Accept options objects for complex parameters
