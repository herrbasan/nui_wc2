# NUI API Structure Refactor

## Status: Planning

## Problem

The current `nui` object export is inconsistent:

```javascript
// Current structure
nui.dom.create()           // 2-function object feels unnecessary
nui.dom.svg()
nui.dialog.alert()         // Grouped - good
nui.banner.create()        // Grouped - but "create" vs "show"?
nui.storage.set()          // Grouped - good
nui.cssAnimation()         // Direct function
nui.init()                 // Direct function
```

Issues:
1. `dom` object has only 2 functions - unnecessary nesting
2. Inconsistent naming (`banner.create` vs `dialog.alert`)
3. No clear extension points for addons
4. `dialogSystem` exposes private methods (`_createDialog`, `_buildFieldHtml`)
5. `link-list` has no factory pattern (uses `element.loadData()` only)
6. `banner` missing `hide()` functionality

## Proposed Solution: Three-Tier Namespace

```javascript
export const nui = {
    // ═══════════════════════════════════════════
    // ROOT - Core library (always present)
    // ═══════════════════════════════════════════
    config,
    init(options),
    configure(options),
    registerFeature(name, initFn),
    registerType(type, handler),
    createRouter(container, options),
    enableContentLoading(options),
    
    // ═══════════════════════════════════════════
    // COMPONENTS - Data-driven component factories
    // Extensible by addons
    // ═══════════════════════════════════════════
    components: {
        dialog: {
            show(htmlContent, options),
            alert(title, message, options),
            confirm(title, message, options),
            prompt(title, message, options),
        },
        banner: {
            show(options),
            hide(ref),
            hideAll(),
        },
        linkList: {
            create(data, options),
        },
    },
    
    // ═══════════════════════════════════════════
    // UTILITIES - Helper functions
    // Extensible by addons
    // ═══════════════════════════════════════════
    util: {
        createElement(tag, options),
        createSvgElement(tag, attrs),
        cssAnimation(element, className, callback),
        storage: {
            set(options),
            get(options),
            remove(options),
        },
    },
};
```

## Tier Definitions

### Root (`nui.*`)
Core library initialization and maintenance functions. These are essential and always present.

- `config` - Library configuration object
- `init(options)` - Initialize library, register components
- `configure(options)` - Update configuration
- `registerFeature(name, initFn)` - Register content features
- `registerType(type, handler)` - Register type handlers
- `createRouter(container, options)` - Create router instance
- `enableContentLoading(options)` - Enable SPA content loading

### Components (`nui.components.*`)
Factory/API objects for data-driven components. Extensible by addon components.

**Generalized Component Pattern:**
```javascript
// Ephemeral components (created, shown, destroyed)
nui.components.X = {
    show(content, options) → controller,  // Show instance, return controller
    hide(ref),                            // Hide specific instance (ref or 'all')
    hideAll(),                            // Hide all instances
};

// Persistent components (created, lives in DOM)
nui.components.X = {
    create(data, options) → element,      // Create and populate, return element
};
```

**Built-in Components:**

| Component | Type | Methods |
|-----------|------|---------|
| `dialog` | Ephemeral | `show`, `alert`, `confirm`, `prompt` |
| `banner` | Ephemeral | `show`, `hide`, `hideAll` |
| `linkList` | Persistent | `create` |

**Addon Extension Point:**
```javascript
// In nui-gallery.js addon
nui.components.gallery = {
    create(images, options) { ... },
};

// In nui-data-table.js addon
nui.components.dataTable = {
    create(data, options) { ... },
};
```

### Utilities (`nui.util.*`)
Helper functions and subsystems. Extensible by addon utilities.

**Built-in Utilities:**

| Utility | Methods |
|---------|---------|
| `createElement` | `(tag, options) → element` |
| `createSvgElement` | `(tag, attrs) → SVGElement` |
| `cssAnimation` | `(element, className, callback) → cleanup` |
| `storage` | `set(options)`, `get(options)`, `remove(options)` |

**Addon Extension Point:**
```javascript
// In nui-animation.js addon
nui.util.animation = {
    fadeIn(element, duration),
    fadeOut(element, duration),
    // ...
};

// In nui-syntax-highlight.js addon
nui.util.syntaxHighlight = {
    highlight(element, language),
    // ...
};
```

## Breaking Changes

| Before | After |
|--------|-------|
| `nui.dom.create()` | `nui.util.createElement()` |
| `nui.dom.svg()` | `nui.util.createSvgElement()` |
| `nui.dialog.alert()` | `nui.components.dialog.alert()` |
| `nui.dialog.confirm()` | `nui.components.dialog.confirm()` |
| `nui.dialog.prompt()` | `nui.components.dialog.prompt()` |
| `nui.banner.create()` | `nui.components.banner.show()` |
| `nui.storage.set()` | `nui.util.storage.set()` |
| `nui.cssAnimation()` | `nui.util.cssAnimation()` |

## New Functionality

### `nui.components.banner.hide(ref)`
Hide a specific banner by reference, or all banners.

```javascript
const banner = nui.components.banner.show({ content: 'Hello' });
// Later...
nui.components.banner.hide(banner);  // Hide specific
nui.components.banner.hide('all');   // Hide all
```

### `nui.components.banner.hideAll()`
Convenience alias for `hide('all')`.

### `nui.components.linkList.create(data, options)`
Create and populate a `nui-link-list` element from data.

```javascript
const list = nui.components.linkList.create([
    { label: 'Home', href: '/' },
    { label: 'Settings', icon: 'settings', items: [
        { label: 'Profile', href: '/settings/profile' },
        { label: 'Security', href: '/settings/security' },
    ]},
]);
container.appendChild(list);
```

Returns the element. Element still has instance methods: `loadData()`, `setActive()`, `getActive()`, `clearActive()`, `clearSubs()`.

## Design Rationale

1. **Clear extension points** - Addons know exactly where to register (`nui.components.*` or `nui.util.*`)

2. **Consistent component pattern** - All component factories follow the same shape

3. **Self-documenting** - `console.log(nui.components)` shows all available component factories

4. **Root stays clean** - Only true core functions at top level

5. **Verbosity is a feature** - `nui.components.dialog.alert()` makes the architecture obvious; users can alias if needed: `const { dialog } = nui.components`

## Project Goals Alignment

- Keep code lean and platform-native (no extra abstraction layers); reflect structure in `nui.d.ts` instead of inline comments. Only structural comments in `nui.js`.
- Maintain zero-dependency, direct DOM/API usage; namespaces are organizational, not wrappers.
- Document behaviors and types in `nui.d.ts` to keep source minimal and fast to parse.

## Implementation Watch-outs

- Action delegation (`data-action`) currently invokes root `nui[actionName]`; after namespacing, delegation must also look up `nui.util[...]` and `nui.components[...]`, or provide temporary root aliases with deprecation warnings.
- Internal callers using `dom.create`, `dom.svg`, `cssAnimation`, or root `dialog`/`banner`/`storage` need to be updated; consider keeping short-lived aliases to reduce regressions.
- TypeScript definitions (`nui.d.ts`) must move in lockstep with the new namespaces; otherwise TS consumers break immediately.
- Playground pages, docs, and examples must switch to `nui.components.*` / `nui.util.*`; this is the main ripple for users following examples.
- Banner hide/hideAll should reuse the existing `activeBanners` tracking to avoid leaks; ensure close semantics (reason codes) stay consistent.
- Link-list factory (`linkList.create`) should wrap element creation + `loadData` while preserving instance methods (`setActive`, `getActive`, `clearActive`, `clearSubs`).

## Implementation Tasks

- [ ] Rename `dom` object methods → `nui.util.createElement`, `nui.util.createSvgElement`
- [ ] Move `dialogSystem` → `nui.components.dialog`, clean up private methods
- [ ] Rename `bannerFactory.create` → `nui.components.banner.show`
- [ ] Add `banner.hide(ref)` and `banner.hideAll()` functionality
- [ ] Create `nui.components.linkList.create()` factory function
- [ ] Move `storage` → `nui.util.storage`
- [ ] Move `cssAnimation` → `nui.util.cssAnimation`
- [ ] Update TypeScript definitions (`nui.d.ts`)
- [ ] Update Playground demos/pages to use new API (most component examples will need path updates)
- [ ] Update documentation
