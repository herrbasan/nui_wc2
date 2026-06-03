# Dev Plan: Action System Refactor v4.0

> **Status:** Draft for discussion  
> **Breaking change:** Yes — requires migration of all `data-action` consumers  
> **Target:** NUI v4.0

---

## 1. Current State Audit

### 1.1 What exists today

| Layer | Location | Mechanism |
|---|---|---|
| Core delegation | `nui.js:97` — `setupActionDelegation()` | `document.addEventListener('click', ...)` — parses `data-action`, resolves handlers |
| Resolution chain | `nui.js:110-118` | `nui.*` namespace functions → `registeredActions` Map → `builtinActionHandlers` → `CustomEvent` dispatch |
| Built-in handlers | `nui.js:23-84` | 17 handlers: `banner-show/close`, `dialog-open/show/close`, `overlay-open/close`, `select-open/close`, `card-flip`, `tabs-select`, `accordion-toggle/expand-all/collapse-all`, `scroll-to-top` |
| CustomEvent fallback | `nui.js:117-118` | `nui-action` + `nui-action-${name}` — bubbles, carries `{ name, target, param, originalEvent }` |
| User registration | `nui.js:5872` | `nui.registerAction(name, handler)` — stored in `registeredActions` Map |
| App boilerplate | `nui-boilerplate/js/app.js:8-36` | Manual `document.addEventListener('click', ...)` with `switch-case` for `toggle-sidebar`, `toggle-theme`, `save-config` |
| Playground | `Playground/js/main.js` | No custom action handling — relies entirely on built-in handlers |

### 1.2 Core limitation

```
data-action  →  click  →  parse  →  resolve
```

The trigger event is **hardcoded to click**. If you want an action to fire on `submit`, `change`, `input`, `keydown`, or a component's custom event — you can't do it declaratively. You must write imperative `addEventListener` code.

### 1.3 Current consumers of click-only actions

| Consumer | Actions | Impact of breaking change |
|---|---|---|
| Built-in handlers | 17 actions | Must be migrated to event-agnostic dispatch |
| Boilerplate `app.js` | `toggle-sidebar`, `toggle-theme`, `save-config` | Must be rewritten |
| Playground demo pages | Dialog, banner, tabs, accordion, card-flip demos | Must be updated |
| User applications | Unknown | Migration guide needed |

---

## 2. Vision: Event-Agnostic Action System

### 2.1 Core principle

> **Components own their trigger events. The action system provides resolution, not triggering.**

```
Component fires event  →  reads data-action from host  →  calls nui.dispatchAction()  →  resolution chain
```

The `data-action` attribute becomes a **declarative intent marker** that components read on whatever event they consider natural. The action system resolves what happens — it doesn't dictate what triggers it.

### 2.2 New API surface

```javascript
// Public API on nui object

// Dispatch an action programmatically (called by components or user code)
nui.dispatchAction(name, options)   // → boolean (whether handled)
// options: { target, source, payload, originalEvent }

// Register a global action handler
nui.registerAction(name, handler)   // → void
// handler: ({ target, source, payload, event }) => boolean

// Built-in actions become registered actions (same API, just pre-registered)
// No more separate builtinActionHandlers object
```

### 2.3 Resolution chain (unchanged in spirit)

```
1. nui.* namespace functions   (nui.components.banner.show)
2. registeredActions            (nui.registerAction('my-action', handler))
3. CustomEvent dispatch          (nui-action + nui-action-{name})
```

The key difference: resolution is no longer coupled to a click event. The `dispatchAction` call can originate from any event type.

### 2.4 Component integration pattern

Each component reads `data-action` from its host element and dispatches on its natural trigger:

| Component | Natural trigger | Example |
|---|---|---|
| `nui-button` | `click` | `<nui-button data-action="save:draft">` |
| `nui-input` | `change` / `input` | `<nui-input data-action="search">` |
| `nui-checkbox` | `change` | `<nui-checkbox data-action="toggle-feature">` |
| `nui-tabs` | Custom `nui-tab-change` | `<nui-tabs data-action="section-changed">` |
| `nui-select` | Custom `nui-change` | `<nui-select data-action="filter">` |
| `nui-sortable` | Custom `nui-sortable-reorder` | `<nui-sortable data-action="reorder-list">` |
| `nui-dropzone` | Custom `nui-drop` | `<nui-dropzone data-action="file-upload">` |
| Bare HTML `<form>` | `submit` | `<form data-action="login">` |
| Bare HTML `<button>` | `click` (fallback) | `<button data-action="delete:item-42">` |

For bare HTML elements (no NUI component wrapper), a lightweight `data-action` click delegation remains as a **convenience fallback**, not the primary mechanism.

### 2.5 Payload support

Currently `param` is a string from the attribute. The new system supports arbitrary payloads:

```javascript
// String param from attribute (backward compat)
<button data-action="delete:item-42">

// Object payload from component (new)
nui.dispatchAction('file-upload', { payload: { files: [...], name: 'doc.pdf' } })

// Form data from form submit
<form data-action="login">  →  payload = new FormData(form)
```

---

## 3. Architecture

### 3.1 Before (current)

```
┌─────────────────────────────────────────────────┐
│  document.addEventListener('click', ...)          │
│  ┌───────────────────────────────────────────┐   │
│  │  setupActionDelegation()                   │   │
│  │  1. closest('[data-action]')               │   │
│  │  2. parse spec                             │   │
│  │  3. resolveAction(name)                    │   │
│  │  4. registeredActions.get(name)            │   │
│  │  5. builtinActionHandlers[name]            │   │
│  │  6. CustomEvent dispatch                   │   │
│  └───────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│  Boilerplate app.js                           │
│  document.addEventListener('click', ...)       │
│  switch (action) { case 'toggle-sidebar': }   │
└──────────────────────────────────────────────┘
```

### 3.2 After (proposed)

```
┌─────────────────────────────────────────────────┐
│  nui.dispatchAction(name, options)                │
│  ┌───────────────────────────────────────────┐   │
│  │  1. resolveAction(name)                    │   │
│  │  2. registeredActions.get(name)            │   │
│  │  3. CustomEvent dispatch                   │   │
│  └───────────────────────────────────────────┘   │
│  Called by:                                      │
│  • nui-button (click)                            │
│  • nui-input (change/input)                      │
│  • nui-form (submit)                             │
│  • nui-select (nui-change)                       │
│  • nui-tabs (nui-tab-change)                     │
│  • nui-sortable (nui-sortable-reorder)           │
│  • nui-dropzone (nui-drop)                       │
│  • bare elements (click fallback)                │
└─────────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│  Boilerplate app.js                           │
│  nui.registerAction('toggle-sidebar', ...)     │
│  nui.registerAction('toggle-theme', ...)       │
│  nui.registerAction('save-config', ...)        │
└──────────────────────────────────────────────┘
```

---

## 4. Component-by-Component Migration

### 4.1 Core components (in `nui.js`)

| Component | Current state | Migration |
|---|---|---|
| `nui-button` | Emits `nui-click`, no action dispatch | Add: read `data-action` from host, call `nui.dispatchAction()` on click |
| `nui-input` / `nui-textarea` | No action support | Add: read `data-action` from host wrapper, dispatch on `change` |
| `nui-checkbox` / `nui-radio` | No action support | Add: read `data-action`, dispatch on `change` |
| `nui-select` | No action support | Add: dispatch on `nui-change` |
| `nui-tabs` | No action support | Add: dispatch on `nui-tab-change` |
| `nui-sortable` | No action support | Add: dispatch on `nui-sortable-reorder` |
| `nui-dropzone` | No action support | Add: dispatch on `nui-drop` |
| `nui-accordion` | No action support | Add: dispatch on toggle |
| `nui-slider` | No action support | Add: dispatch on `nui-change` |

### 4.2 Built-in handlers → Registered actions

Current `builtinActionHandlers` object becomes pre-registered actions via `nui.registerAction()`:

```javascript
// Before
const builtinActionHandlers = { 'dialog-open': (t, _, e) => { ... } };

// After
nui.registerAction('dialog-open', ({ target, event }) => {
    if (target?.showModal) { event.stopImmediatePropagation(); target.showModal(); return true; }
    return false;
});
```

All 17 existing handlers migrate. The API signature changes from `(target, source, event, param)` to `({ target, source, event, payload })` — more readable, extensible.

### 4.3 Boilerplate `app.js`

```javascript
// Before: manual click delegation
document.addEventListener('click', (e) => {
    const actionEl = e.target.closest('[data-action]');
    if (!actionEl) return;
    const [action, param] = actionEl.dataset.action.split(':');
    switch (action) {
        case 'toggle-sidebar': /* ... */ break;
        case 'toggle-theme': /* ... */ break;
    }
});

// After: declarative registration
nui.registerAction('toggle-sidebar', ({ payload }) => {
    document.querySelector('nui-app')?.toggleSidebar(payload || 'left');
    return true;
});
nui.registerAction('toggle-theme', () => {
    const s = document.documentElement.style;
    s.colorScheme = s.colorScheme === 'dark' ? 'light' : 'dark';
    return true;
});
```

### 4.4 Playground demo pages

All existing `data-action` usage in demo pages continues to work — the click fallback handles bare elements. No changes needed to the HTML. The demo pages demonstrating `data-action` may need updated code examples.

### 4.5 Click fallback for bare elements

```javascript
// Minimal delegation for elements without a component wrapper
function setupClickFallback() {
    document.addEventListener('click', (e) => {
        const el = e.target.closest('[data-action]');
        if (!el) return;
        // Skip if a NUI component already handled this
        if (el.closest('nui-button, nui-input, nui-select, nui-tabs, nui-sortable, nui-dropzone, nui-accordion, nui-slider, nui-checkbox, nui-radio')) return;
        
        const spec = el.dataset.action;
        const [part, sel] = spec.split('@');
        const [name, param] = part.split(':');
        const target = sel ? document.querySelector(sel) : el;
        
        nui.dispatchAction(name, { target, source: el, payload: param, event: e });
    });
}
```

---

## 5. Implementation Phases

### Phase 1: Core API (non-breaking, additive)

- [ ] Add `nui.dispatchAction(name, options)` to the public API
- [ ] Refactor resolution chain to a standalone function
- [ ] Convert `builtinActionHandlers` to registered actions
- [ ] Migrate `nui-button` to call `dispatchAction` on click (alongside existing `nui-click`)
- [ ] Add `nui.registerAction()` documentation

### Phase 2: Component Integration

- [ ] Add `dispatchAction` calls to all form/input components
- [ ] Add `dispatchAction` calls to navigation components (tabs, accordion, sortable)
- [ ] Add `dispatchAction` calls to overlay components (dialog, banner, overlay)
- [ ] Test all 42 Playground demo pages

### Phase 3: Consumer Migration

- [ ] Rewrite `nui-boilerplate/js/app.js` to use `nui.registerAction()`
- [ ] Update Playground `main.js` if needed
- [ ] Update `LLM-CHEATSHEET.md` action system section
- [ ] Update `documentation/guides/declarative-actions.md`

### Phase 4: Cleanup

- [ ] Remove `setupActionDelegation()` click listener
- [ ] Add minimal click fallback for bare HTML elements
- [ ] Remove `builtinActionHandlers` object
- [ ] Update component documentation to document `data-action` support per component

---

## 6. Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Existing user code breaks | High | Phased rollout; click fallback preserves bare-element behavior |
| Component event timing issues | Medium | Components dispatch on their natural event; no race conditions introduced |
| Playground demo breakage | Medium | 42 pages to verify; mostly passive `data-action` usage on bare elements |
| Documentation drift | Low | Update docs in Phase 3 before removing old system |
| Performance regression | Low | Fewer global listeners, more scoped per-component listeners |

---

## 7. Open Questions

1. **`nui-action` CustomEvent payload shape:** Should it change from `{ name, target, param, originalEvent }` to `{ name, target, source, payload, event }`? Changing it is a breaking change for anyone listening to `nui-action`.

2. **Click fallback scope:** Should the fallback listener be on `document` (global) or only inside `<nui-app>`? Global is simpler but catches clicks everywhere.

3. **`data-action` on `<nui-button>` vs inner `<button>`:** Currently built-in handlers receive the `nui-button` element. Should actions dispatch from the host or the inner native element?

4. **Form submit handling:** Should `<form data-action="login">` be handled by a new `nui-form` component, or by a bare-element submit listener? Leaning toward bare-element listener for simplicity, `nui-form` component later.

5. **Backward compat window:** How long do we support the old click-delegation path? Proposal: one major version (v4.0 ships both, v5.0 removes old path).

---

## 8. Success Criteria

- [ ] Any component can fire an action on any event type
- [ ] `data-action` on bare HTML buttons/links still works (click fallback)
- [ ] All 42 Playground demo pages function correctly
- [ ] Boilerplate `app.js` is shorter and simpler
- [ ] No global `setupActionDelegation()` click listener remains (except fallback)
- [ ] Documentation is updated
