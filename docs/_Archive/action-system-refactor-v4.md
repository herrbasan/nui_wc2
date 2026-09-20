# Action System — Minimal Reform (NUI v4.0)

> **Status:** Draft for discussion.  
> **Breaking change:** Yes (click-only delegation removed).  
> **Principle:** Solve 90% with minimal complexity. Don't build a framework.

---

## 1. The Only Real Problem

```javascript
// Current — works great, but ONLY for clicks
document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    // ...
});
```

`data-action="search"` on an `<input>` doesn't fire on Enter. `data-action="login"` on a `<form>` doesn't fire on submit. That's the bug. Everything else is fine.

---

## 2. How Components Actually Work

Components have two kinds of events — we only care about one.

### Internal events (component's business — ignore these)

```
nui-list:    item-hovered, group-toggled, scroll-position
nui-select:  dropdown-opened, option-highlighted
nui-sortable: drag-started
```

These solve UI problems. Nobody outside the component needs to know.

### External events (other code cares — these become actions)

```
nui-list:    selection-changed, item-activated
nui-select:  value-committed
nui-sortable: order-committed
nui-input:   value-committed (change)
nui-tabs:    tab-changed
nui-dropzone: files-dropped
```

A component has 1–3 external events. That's the action surface. Small, predictable, worth naming.

---

## 3. What We Actually Need (90% solution)

### 3.1 Components dispatch on their natural event

Each component reads `data-action` from its host. On its committed-state event, it calls a dispatch function with the action name and payload.

```javascript
// Inside nui-input setup
inner.addEventListener('change', () => {
    // Normal behavior
    element.dispatchEvent(new CustomEvent('nui-change', { bubbles: true, detail: { value: inner.value } }));
    
    // Action system — only if data-action is set
    const action = element.getAttribute('data-action');
    if (action) nui.dispatchAction(action, { target: element, payload: inner.value });
});
```

That's the pattern. Every component adds ~4 lines.

### 3.2 Built-in actions work without registration

The 14 actions from the Playground audit ship pre-registered:

```javascript
// Registered at startup in nui.js
nui.registerAction('dialog-open',  ({ target }) => target.showModal());
nui.registerAction('dialog-close', ({ target, payload }) => target.close(payload));
nui.registerAction('card-flip', ({ target }) => target.toggleAttribute('flipped'));
nui.registerAction('toggle-sidebar', () => {
    document.querySelector('nui-app')?.toggleSidebar();
});
// ... 10 more
```

### 3.3 Users register custom actions

```javascript
// In app.js — replaces the old switch-case block
nui.registerAction('save-config', ({ payload }) => {
    localStorage.setItem('config', JSON.stringify(payload));
});
```

### 3.4 Cross-tree dispatch (the one thing DOM can't do)

When a button in `<nui-app-header>` needs to open a dialog in `<nui-content>`, CustomEvent bubbling can't reach it. The dispatch function fires on `document` as a fallback for these cases. This is internal — users never see it.

```javascript
function dispatchAction(name, { target, payload }) {
    // 1. Try DOM bubbling first (same subtree)
    const event = new CustomEvent('nui-action', { bubbles: true, detail: { name, target, payload } });
    target.dispatchEvent(event);
    
    // 2. If still unhandled, try document-level (cross-tree)
    if (!event.defaultPrevented) {
        document.dispatchEvent(new CustomEvent('nui-action', { detail: { name, target, payload } }));
    }
}
```

---

## 4. The API (small by design)

```javascript
// Core — called by components
nui.dispatchAction(name, { target, payload, event })

// User registration
nui.registerAction(name, handler)
nui.unregisterAction(name)  // clears all handlers for that name

// Debug
nui.configure({ debugActions: true })
// Logs: [action] search  ← nui-input#search  payload: "hello"

// Handler signature
handler({ name, target, payload }) → void
```

No scoping API. No wildcard listeners. No pub-sub bus. The DOM already scopes events; `nui.registerAction` is for the cross-tree case.

---

## 5. Component Migration (simple)

Each component adds ~4 lines in its existing event listener:

```
nui-button    → click  → if data-action: dispatch
nui-input     → change → if data-action: dispatch  
nui-select    → nui-change → if data-action: dispatch
nui-slider    → nui-change → if data-action: dispatch
nui-checkbox  → change → if data-action: dispatch
nui-tabs      → nui-tab-change → if data-action: dispatch
nui-accordion → toggle → if data-action: dispatch
nui-sortable  → nui-sortable-reorder → if data-action: dispatch
nui-dropzone  → nui-drop → if data-action: dispatch
bare <form>   → submit → if data-action: dispatch
bare <button> → click  → if data-action: dispatch  (fallback)
```

---

## 6. What Gets Deleted

```
✗ setupActionDelegation() — the global click listener
✗ builtinActionHandlers object — replaced by registerAction calls
✗ Boilerplate app.js switch-case — replaced by registerAction
```

---

## 7. What Stays the Same

```
✓ data-action="name:param@selector" syntax
✓ nui-action CustomEvent (for direct DOM listeners)
✓ All 14 built-in action names
✓ Playground demo pages (most just work via the button/form fallback)
```

---

## 8. Migration Path

| Phase | What | Breaking? |
|---|---|---|
| 1 | Add `dispatchAction`, `registerAction` to core. Wire `nui-button`. Convert built-ins. Add fallback for bare elements. | No — additive only |
| 2 | Wire all 11 components. Remove old click listener. Test 42 Playground pages. | Yes |
| 3 | Update boilerplate `app.js`. Update docs. | Yes (for new users) |

---

## 9. What We're NOT Building

- **Not a global event bus.** Components fire events; the DOM routes them. Cross-tree built-ins use document-level dispatch as a narrow escape hatch.
- **Not a state management system.** No stores, no reducers, no middleware. Actions are fire-and-forget messages.
- **Not a scoping API.** If you want to listen to `nui-list` selection changes, add a listener on the parent `<div>` — the event bubbles there naturally.
- **Not a debugging framework.** `debugActions: true` logs to console. That's it.

---

## 10. Decision Checklist

- [x] Fixes the click-only bug
- [x] Components control their own trigger events
- [x] Built-in actions work without registration  
- [x] User registration is simpler than the current switch-case
- [x] No new concepts beyond what's already in the DOM
- [x] Playground pages still work
- [ ] Prototype exists and works
