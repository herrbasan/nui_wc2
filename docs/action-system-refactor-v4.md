# Action System Reform — Proposal for NUI v4.0

> **Status:** Draft for discussion. Not committed.  
> **Breaking change:** Yes.  
> **Goal:** Produce a plan solid enough to share, debate, refine, or discard.

---

## 1. Problem Statement

### 1.1 The current system has one structural flaw

```javascript
// nui.js — setupActionDelegation()
document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    // parse, resolve, dispatch...
});
```

The trigger event is **hardcoded to `click`**. This means:

- A form can't fire `data-action="login"` on `submit`
- An input can't fire `data-action="search"` on `change`
- A slider can't fire `data-action="price-filter"` on release
- Every consumer (boilerplate, Playground, user apps) reimplements the same click delegation pattern

The resolution logic is solid. The triggering mechanism is the problem.

### 1.2 Secondary issues

- **No payload support.** `param` is always a string from the attribute. Can't pass objects, FormData, files.
- **Boilerplate sprawl.** `toggle-sidebar` and `toggle-theme` are defined in the boilerplate `app.js`, not in NUI core. They should just work everywhere.
- **No observability.** There's no way to inspect which actions are firing, from where, in what order.

---

## 2. Design Principles

These define what the system should be. Proposals that violate these are rejected.

### 2.1 State-changing events only

> `data-action` fires on **committed state**, never intermediate state.

A user dragging a slider produces dozens of `input` events per second — none of them are meaningful as "actions." The action fires once, on release. This principle eliminates noise and makes throttling the component's responsibility, not the consumer's.

| Component | Transitional (NOT an action) | State-changing (action trigger) |
|---|---|---|
| `nui-input` | `input` (every keystroke) | `change` (blur/enter) |
| `nui-slider` | `input` (while dragging) | `change` (release) |
| `nui-sortable` | drag events | `nui-sortable-reorder` |
| `nui-dropzone` | `dragenter`/`dragleave` | `nui-drop` |
| `nui-button` | — | `click` |
| `nui-checkbox` | — | `change` |
| `nui-select` | — | `nui-change` |
| `nui-tabs` | — | `nui-tab-change` |
| `nui-accordion` | — | `toggle` |
| Bare `<form>` | — | `submit` |

### 2.2 Opt-in, not always-on

Components do NOT report every event to the action system. They only report when `data-action` is present on the host element. Without it, behavior is unchanged — standard CustomEvents fire as they always have.

```html
<!-- Reports to action system on change -->
<nui-input data-action="search">
    <input type="text" placeholder="Search...">
</nui-input>

<!-- No action system involvement -->
<nui-input>
    <input type="text" placeholder="Name">
</nui-input>
```

### 2.3 Zero configuration for built-in actions

`dialog-open`, `toggle-sidebar`, `card-flip` — these just work. No registration needed. Built-in actions cover the 14 most-used patterns from the Playground audit. App-specific actions (`save-config`, `export-data`) are registered by the application.

### 2.4 Scoped, not global

Handlers can be registered globally or scoped to a specific element. This gives applications control over which components they react to.

```javascript
// Global — fires for any element with data-action="save"
nui.onAction('save', handler);

// Scoped — only fires for this specific element
nui.onAction('save', { target: document.querySelector('#editor') }, handler);

// Scoped — only fires for elements of this component type
nui.onAction('save', { component: 'nui-rich-text' }, handler);
```

### 2.5 Observable, debuggable

```javascript
nui.configure({ debugActions: true })
// Logs: [nui-action] search  ← fired  from <nui-input#search-box>  payload: "hello world"
// Logs: [nui-action] save    ← fired  from <nui-button#save-btn>    payload: undefined
```

Or listen programmatically:

```javascript
nui.onAction('*', ({ name, target, payload }) => {
    console.log(`Action: ${name} from`, target, payload);
});
```

---

## 3. Architecture

### 3.1 Before (current)

```
click → document listener → parse data-action → resolveAction(name)
                                                → registeredActions.get(name)
                                                → builtinActionHandlers[name]  
                                                → CustomEvent dispatch
```

One entry point. One event type.

### 3.2 After (proposed)

```
Component fires its natural state-changing event
    ↓
Component checks: does host have data-action?
    ↓ YES
calls nui.dispatchAction(name, { target, payload, event })
    ↓
resolution chain:
  1. nui.* namespace functions     (nui.components.dialog.open)
  2. registered scoped handlers     (nui.onAction('save', { target: el }, fn))
  3. registered global handlers     (nui.onAction('save', fn))
  4. built-in handlers              (dialog-open, card-flip, etc.)
  5. CustomEvent dispatch           (nui-action, nui-action-${name})
    ↓
if debugActions: console.log(...)
```

### 3.3 What disappears

| Removed | Replaced by |
|---|---|
| `setupActionDelegation()` global click listener | Per-component event listeners |
| `builtinActionHandlers` standalone object | `nui.registerAction()` calls at startup |
| Boilerplate `app.js` switch-case | `nui.registerAction()` in user code |
| `nui-action` event as the primary mechanism | `nui-action` remains as a fallback observable |

---

## 4. API Design

### 4.1 Public API

```typescript
// Fire an action (called internally by components)
nui.dispatchAction(name: string, options: {
    target: HTMLElement,      // the element that carries data-action
    payload?: any,            // arbitrary data (string, object, FormData...)
    event?: Event             // the original DOM event that triggered this
}): boolean                   // true if any handler consumed it

// Register a handler (global scope)
nui.registerAction(name: string, handler: ActionHandler): void

// Register a handler (scoped)
nui.onAction(name: string, scope: { target?: HTMLElement, component?: string }, handler: ActionHandler): void

// Listen for debugging/logging (wildcard)
nui.onAction('*', handler: ActionHandler): void

// Handler signature
type ActionHandler = (ctx: {
    name: string,             // action name
    target: HTMLElement,      // element that carries data-action
    payload: any,             // data carried with the action
    event: Event              // original DOM event (may be a CustomEvent)
}) => boolean | void;         // return true to stop propagation

// Off (cleanup)
nui.offAction(name: string, handler: ActionHandler): void
```

### 4.2 Built-in actions (14 total, zero config)

Based on audit of 180+ `data-action` usages across 42 Playground pages:

| Action | Playground usage | What it does |
|---|---|---|
| `dialog-open` | 16× (wizard, card, dialog, cheatsheet) | Opens a `<dialog>` element |
| `dialog-close` | 15× (rich-text, card, dialog, cheatsheet) | Closes a `<dialog>` element |
| `card-flip` | 9× (card) | Flips a card front/back |
| `toggle-sidebar` | 7× (app-header, app-layout, getting-started) | Toggles the app sidebar |
| `banner-close` | 5× (banner, card) | Closes a banner |
| `banner-show` | 4× (banner, card) | Shows a banner |
| `tabs-select` | 4× (tabs) | Selects a tab |
| `toggle-theme` | 4× (button, getting-started) | Toggles light/dark theme |
| `overlay-close` | 3× (overlay) | Closes an overlay |
| `select-open` | 3× (select) | Opens a select dropdown |
| `overlay-open` | 2× (overlay) | Opens an overlay |
| `accordion-toggle` | 2× (accordion) | Toggles an accordion item |
| `accordion-expand-all` | 2× (accordion) | Expands all accordion items |
| `accordion-collapse-all` | 2× (accordion) | Collapses all accordion items |

### 4.3 App-specific actions (user registers)

```javascript
// In app.js — only custom actions
nui.registerAction('save-config', ({ payload }) => {
    localStorage.setItem('config', JSON.stringify(payload));
});
nui.registerAction('export-data', () => {
    downloadFile('/api/export');
});
```

The boilerplate shrinks from 30 lines of click delegation to 5 lines of action registration.

### 4.4 Comparison: before vs after

**Before (boilerplate app.js):**
```javascript
document.addEventListener('click', (e) => {
    const actionEl = e.target.closest('[data-action]');
    if (!actionEl) return;
    const spec = actionEl.dataset.action;
    const [actionPart] = spec.split('@');
    const [action, param] = actionPart.split(':');
    switch (action) {
        case 'toggle-sidebar':
            document.querySelector('nui-app')?.toggleSidebar(param || 'left');
            break;
        case 'toggle-theme':
            const s = document.documentElement.style;
            s.colorScheme = s.colorScheme === 'dark' ? 'light' : 'dark';
            break;
        case 'save-config':
            console.log('Save config');
            break;
    }
});
```

**After:**
```javascript
// Built-in actions (toggle-sidebar, toggle-theme, etc.) just work — no code needed.

// App-specific actions:
nui.registerAction('save-config', ({ payload }) => {
    localStorage.setItem('config', JSON.stringify(payload));
});
```

---

## 5. Component Migration

### 5.1 What each component must do

Each component that wants to support `data-action` adds a few lines in its setup:

```javascript
// Pattern for any component
registerComponent('nui-input', (element) => {
    const inner = element.querySelector('input');
    if (!inner) return;
    
    // Normal behavior: fire nui-change CustomEvent
    inner.addEventListener('change', () => {
        element.dispatchEvent(new CustomEvent('nui-change', { 
            bubbles: true, 
            detail: { value: inner.value } 
        }));
        
        // Action system hook — only if data-action is present
        const action = element.getAttribute('data-action');
        if (action) {
            nui.dispatchAction(action, {
                target: element,
                payload: inner.value,
                event: event
            });
        }
    });
});
```

### 5.2 Migration checklist

| Component | Trigger event | data-action support |
|---|---|---|
| `nui-button` | `click` | ✅ Already emits `nui-click`, add dispatch |
| `nui-input` | `change` | 🔲 Add |
| `nui-textarea` | `change` | 🔲 Add |
| `nui-checkbox` | `change` | 🔲 Add |
| `nui-radio` | `change` | 🔲 Add |
| `nui-select` | `nui-change` | 🔲 Add |
| `nui-slider` | `nui-change` | 🔲 Add |
| `nui-tabs` | `nui-tab-change` | 🔲 Add |
| `nui-accordion` | toggle | 🔲 Add |
| `nui-sortable` | `nui-sortable-reorder` | 🔲 Add |
| `nui-dropzone` | `nui-drop` | 🔲 Add |
| Bare `<form>` | `submit` | 🔲 Add fallback listener |
| Bare `<button>`/`<a>` | `click` | 🔲 Add fallback listener |

### 5.3 Click fallback (for bare elements)

```javascript
// Minimal — only handles elements without a NUI component wrapper
function setupClickFallback() {
    document.addEventListener('click', (e) => {
        const el = e.target.closest('[data-action]');
        if (!el) return;
        // Skip if a NUI component already handles this
        const handledBy = el.closest('nui-button, nui-input, nui-select, nui-tabs, nui-sortable, nui-dropzone, nui-accordion, nui-slider, nui-checkbox, nui-radio');
        if (handledBy) return;
        
        const spec = el.dataset.action;
        const [part, sel] = spec.split('@');
        const [name, param] = part.split(':');
        const target = sel ? document.querySelector(sel) : el;
        
        nui.dispatchAction(name, { target, payload: param, event: e });
    });
}
```

---

## 6. Migration Strategy

### Phase 1: Core API (non-breaking, additive)
- Add `nui.dispatchAction()`, `nui.onAction()`, `nui.offAction()` to the public API
- Wire `nui-button` to call dispatchAction on click (alongside existing `nui-click`)
- Convert `builtinActionHandlers` to pre-registered actions
- Add `toggle-sidebar` and `toggle-theme` as built-ins
- Add `nui.configure({ debugActions: true })`

### Phase 2: Component Integration (breaking)
- Add dispatchAction calls to all 13 components in the checklist
- Add click fallback for bare elements
- Remove `setupActionDelegation()` click listener
- Test all 42 Playground demo pages

### Phase 3: Consumer Migration
- Rewrite `nui-boilerplate/js/app.js` to use `nui.registerAction()`
- Update Playground `main.js` if needed
- Update all documentation (cheatsheet, guides, component docs)

---

## 7. Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Existing user `data-action` on bare buttons breaks | High | Click fallback preserves backward compat for bare elements |
| Component event timing | Low | Each component fires its natural event; no new timing introduced |
| Playground demo breakage | Medium | 42 pages to verify; fallback handles most cases |
| Performance | Low | Fewer global listeners, more scoped per-component listeners |
| Over-engineering | Medium | Decision gate below — we evaluate before committing |

---

## 8. Decision Gate

Before committing to this refactor, we need clear answers:

- [ ] Does the proposal solve a real problem for actual users (not just hypothetical)?
- [ ] Is the new API simpler than the old one? (Count lines of code for common tasks)
- [ ] Does the opt-in gate prevent performance regressions?
- [ ] Is the transitional/state-changing distinction clear enough to document in one sentence?
- [ ] Can we build a prototype of Phase 1 in < 4 hours as a proof of concept?

---

## 9. Open Questions

1. **CustomEvent payload shape.** Should `nui-action` change from `{ name, target, param, originalEvent }` to `{ name, target, payload, event }`? Changing it is a breaking change for anyone listening to `nui-action` directly.

2. **`nui-button` click target.** If `data-action` is on `<nui-button>` but the actual click is on the inner `<button>`, which element is `target`? Proposal: target is the custom element host (`<nui-button>`), not the inner native element.

3. **Form submit handling.** Push to a future `nui-form` component, or handle via bare-element fallback now? Leaning toward fallback now, component later.

4. **Action namespacing.** Should built-in actions have a namespace prefix (`nui:dialog-open`) to avoid collisions with user actions? Leaning toward: no prefix for now, document that built-in names are reserved.

5. **Unregistering.** `nui.offAction()` clears a specific handler. Should there also be `nui.clearActions(name)` to remove all handlers for a given action name?
