# Knower/Doer System Evaluation

**Date:** December 2025  
**Status:** Under Review  
**Question:** Should we keep, modify, or remove the Knower/Doer system?

---

## What They Are

### Doer (Action System)
Declarative action dispatch via HTML attributes:
```html
<button nui-event-click="open@#my-dialog">Open</button>
<button nui-event-click="toggle-theme">Toggle Theme</button>
```

### Knower (State System)
JavaScript subscription system for cross-component state:
```javascript
nui.knower.tell('sidebar:open', true);
nui.knower.watch('sidebar:open', (isOpen) => { ... });
```

---

## The Case FOR Keeping

### Doer Benefits
1. **Concise syntax** - `nui-event-click="open@#dialog"` vs `onclick="document.querySelector('#dialog').showModal()"`
2. **Separation of concerns** - Actions defined separately from triggers
3. **Discoverability** - Scan HTML to see all interactions
4. **Consistency** - Standard pattern across all components

### Knower Benefits
1. **Cross-component communication** - Components don't need direct references
2. **Single source of truth** - State lives in one place
3. **Decoupling** - Publisher doesn't know subscribers
4. **Persistence potential** - Could sync to localStorage/server

### Combined Benefits
1. **Rapid prototyping** - Wire up interactions without writing JS
2. **Teaching tool** - Introduces reactive patterns before frameworks

---

## The Case AGAINST Keeping

### Doer Problems
1. **Limited power** - Complex actions still need JavaScript
2. **New syntax to learn** - `action@#target:param` vs standard DOM APIs
3. **Debugging indirection** - Action dispatch harder to trace than direct calls
4. **Platform alternatives exist:**
   ```html
   <!-- Doer -->
   <button nui-event-click="open@#dialog">Open</button>
   
   <!-- Platform (works everywhere, no library needed) -->
   <button onclick="document.querySelector('#dialog').showModal()">Open</button>
   ```

### Knower Problems
1. **Requires JavaScript anyway** - No declarative binding to DOM
2. **Overhead for simple cases** - Event listeners work fine
3. **Memory leak potential** - Must clean up watchers
4. **Platform alternatives exist:**
   ```javascript
   // Knower
   nui.knower.watch('dialog:open', handler);
   
   // Platform (standard, no abstraction)
   dialog.addEventListener('nui-dialog-open', handler);
   ```

### Combined Problems
1. **~200+ lines of library code** - Adds to bundle size
2. **New concepts to learn** - Knower/Doer/tell/watch/register
3. **Debugging complexity** - Extra layer between intent and execution
4. **No clear win** - Every example can be done with platform APIs

---

## Test Cases Evaluated

### Actual Usage Analysis (from codebase search)

---

#### **1. Playground index.html - toggle-sidebar, toggle-theme**
```html
<nui-button nui-event-click="toggle-sidebar">
<nui-button nui-event-click="toggle-theme">
```

| Approach | Code |
|----------|------|
| **Current (Doer)** | `nui-event-click="toggle-sidebar"` |
| **Platform Alt** | `onclick="this.closest('nui-app').toggleSideNav()"` |

**Verdict:** Doer is slightly cleaner, but requires pre-registered action. Platform is self-contained.

---

#### **2. Dialog page - open/close dialogs**
```html
<button nui-event-click="open@#dialog-top">Top</button>
<button nui-event-click="close@#dialog-top">Close</button>
```

| Approach | Code |
|----------|------|
| **Current (Doer)** | `nui-event-click="open@#dialog-top"` |
| **Platform Alt** | `onclick="document.querySelector('#dialog-top').showModal()"` |

**Verdict:** Doer is shorter. But `open`/`close` are generic actions that could apply to anything—platform is explicit about what's happening.

---

#### **3. Dialog page - show-alert, show-confirm, etc.**
```html
<button nui-event-click="show-alert">Alert</button>
```
```javascript
nui.doer.register('show-alert', async () => {
    await nui.dialog.alert('Hello!', 'Message');
});
```

| Approach | Code |
|----------|------|
| **Current (Doer)** | Attribute + registered action |
| **Platform Alt** | `onclick="nui.dialog.alert('Hello!', 'Message')"` |

**Verdict:** Platform is simpler! No registration needed. The Doer approach adds indirection without benefit.

---

#### **4. Link-list page - watching active state**
```javascript
nui.knower.watch(`${foldId}:active`, () => updateFoldStateDisplay(), instanceId);
nui.knower.watch(`${treeId}:active`, () => updateTreeStateDisplay(), instanceId);
```

| Approach | Code |
|----------|------|
| **Current (Knower)** | Watch state key, call update function |
| **Platform Alt** | `element.addEventListener('nui-active-change', updateDisplay)` |

**Verdict:** Nearly identical complexity. Platform version is more familiar to developers.

---

#### **5. Link-list internal - publishing active state**
```javascript
knower.tell(stateKey, {
    element: item,
    href: item.getAttribute('href'),
    text: item.textContent.trim(),
    timestamp: Date.now()
}, element);
```

| Approach | Code |
|----------|------|
| **Current (Knower)** | `knower.tell(stateKey, data)` |
| **Platform Alt** | `element.dispatchEvent(new CustomEvent('nui-active-change', { detail: data }))` |

**Verdict:** Platform is slightly more verbose but standard. Knower hides the event dispatch.

---

#### **6. Router - publishing route changes**
```javascript
knower.tell('route', currentRoute);
// ...
knower.watch('route', (route) => {
    // Update navigation highlighting
});
```

| Approach | Code |
|----------|------|
| **Current (Knower)** | Publish route, watch for changes |
| **Platform Alt** | `dispatchEvent(new CustomEvent('nui-route-change'))` + `addEventListener` |

**Verdict:** This is the strongest Knower use case—central state that multiple components need. But custom events work too.

---

#### **7. Sidebar state - accordion open/closed**
```javascript
knower.tell(stateKey, newState, element);
knower.tell(stateKey, 'closed', element);
knower.tell(stateKey, 'open', element);
```

**Verdict:** Internal component state. Could use element attributes or custom events instead.

---

#### **8. Dialog state - open/closed**
```javascript
knower.tell(`dialog:${element.id}:open`, true);
knower.tell(`dialog:${element.id}:open`, false);
```

**Verdict:** Publishes state for external watchers. Could use custom events: `dialog.dispatchEvent(new CustomEvent('nui-open'))`.

---

#### **9. Banner state - open/action**
```javascript
knower.tell(`banner:${element.id}:open`, true);
knower.tell(`banner:${element.id}:action`, action);
```

**Verdict:** Same pattern as dialog. Custom events would work.

---

#### **10. Input components - focus/clear/validate actions**
```javascript
doer.register(`focus@nui-input`, (target) => target.focus?.(), instanceId);
doer.register(`clear@nui-input`, (target) => target.clear?.(), instanceId);
doer.register(`validate@nui-input`, (target) => target.validate?.(), instanceId);
```

| Approach | Code |
|----------|------|
| **Current (Doer)** | `nui-event-click="focus@nui-input"` |
| **Platform Alt** | `onclick="document.querySelector('nui-input').focus()"` |

**Verdict:** Platform is explicit. Doer adds magic.

---

#### **11. main.js - custom actions (show-alert, log-action, toggle-media)**
```javascript
nui.registerAction('show-alert', (target, source, event, param) => {
    alert(`Button clicked: ${source.textContent.trim()}`);
});
```

**Verdict:** This is just wrapping a simple function call. Platform:
```javascript
document.querySelector('[data-action="show-alert"]').onclick = () => alert('...');
```
Or simpler: `onclick="alert('...')"`.

---

#### **12. archived.js - edit-section, toggle-media**
```javascript
window.nui.doer.register('edit-section', (target, source, event, section) => {
    alert(`Edit section: ${section}`);
});
```

**Verdict:** Same pattern. Platform alternative is simpler.

---

### Summary Table

| Usage | Knower/Doer Benefit | Platform Alt Complexity | Winner |
|-------|---------------------|------------------------|--------|
| toggle-sidebar | Shorter syntax | Slightly longer | Tie |
| toggle-theme | Shorter syntax | Slightly longer | Tie |
| open/close dialog | Shorter syntax | Explicit | Platform |
| show-alert etc | Requires registration | Inline works | Platform |
| watch link-list active | Central subscription | Event listener | Tie |
| publish active state | Internal use | Custom event | Platform |
| route changes | Multiple subscribers | Custom event | Knower (slight) |
| sidebar state | Internal | Attributes | Platform |
| dialog/banner state | External watchers | Custom events | Tie |
| input actions | Magic dispatch | Direct call | Platform |
| custom actions | Central registry | Direct/inline | Platform |

**Score: Platform wins or ties in 10/11 cases. Knower has slight edge in 1 case (route).**

---

## Questions to Answer

### 1. Does it solve a real problem?
- [ ] Yes - List the problem: ___
- [x] Partially - Route state has multiple subscribers (but custom events work too)

### 2. Does it make code simpler?
- [ ] Yes - Show example: ___
- [x] No - In 10/11 cases, platform APIs are equal or simpler

### 3. Does it teach valuable patterns?
- [ ] Yes - Patterns transfer to: ___
- [x] No - Teaches custom API instead of platform fundamentals

### 4. Is the abstraction worth the cost?
- Cost: ~300+ lines of code (knower + doer + event delegation + registered actions)
- Benefit: Slightly shorter syntax in some cases
- [x] No - Cost exceeds benefit

### 5. Does it align with project philosophy?
Project philosophy: "Direct platform APIs, zero abstraction layers, teachable patterns"
- [x] No - It IS an abstraction layer that obscures platform APIs

### 6. What would we lose by removing it?
- `nui-event-click="action"` syntax → Replace with `onclick="..."` 
- `nui-event-click="open@#id"` → Replace with `onclick="document.querySelector('#id').showModal()"`
- `knower.watch('route', ...)` → Replace with `addEventListener('nui-route-change', ...)`
- Central action registry → Just call functions directly

### 7. What would we gain by removing it?
- ~300+ lines less library code
- Teaches platform APIs instead of custom APIs
- Standard debugging (no action dispatch to trace)
- No memory leak concerns from watcher cleanup
- Simpler mental model

---

## Options

### Option A: Keep As-Is
- Pros: Already built, some syntax convenience
- Cons: Doesn't align with philosophy, no clear benefit

### Option B: Enhance to Add Value
Add declarative bindings to make Knower useful without JS:
```html
<span nui-bind="dialog:id:open">closed</span>
<div nui-show="sidebar:open">...</div>
```
- Pros: Makes declarative system complete
- Cons: Moves toward framework territory (Vue/Alpine), more code

### Option C: Keep Doer, Remove Knower
Doer provides some convenience for simple actions. Knower has no declarative use.
- Pros: Reduces complexity, keeps simple action dispatch
- Cons: Still an abstraction layer

### Option D: Remove Both
Replace with direct platform API usage throughout.
- Pros: Aligns with philosophy, reduces code, teaches platform
- Cons: Slightly more verbose in some cases

---

## Recommendation

**Option D: Remove Both**

Reasoning:
1. Zero cases where Knower/Doer provided meaningful advantage
2. Platform APIs are standard, teachable, and debuggable
3. Aligns with "zero abstraction layers" philosophy
4. Reduces ~200+ lines of library code
5. Every example tested works fine with platform APIs

---

## Migration Path (if removing)

### Files Affected
1. `NUI/nui.js` - Remove knower, doer, event delegation (~300 lines)
2. `Playground/index.html` - Replace `nui-event-click` attributes
3. `Playground/js/main.js` - Remove `registerAction` calls
4. `Playground/pages/components/dialog.html` - Replace all `nui-event-click`
5. `Playground/pages/components/button.html` - Replace `nui-event-click`
6. `Playground/pages/components/link-list.html` - Replace `knower.watch`
7. `Playground/pages/getting-started.html` - Update code examples
8. `Playground/pages/archived.js` - Remove `doer.register` calls
9. `NUI/lib/modules/nui-monitor.js` - Remove or simplify (no knower to monitor)

### Specific Replacements

**Playground index.html:**
```html
<!-- Before -->
<nui-button nui-event-click="toggle-sidebar">

<!-- After -->
<nui-button>
    <button onclick="this.closest('nui-app').toggleSideNav()">
```

**Dialog page - open/close:**
```html
<!-- Before -->
<button nui-event-click="open@#dialog-top">Top</button>

<!-- After -->
<button onclick="document.querySelector('#dialog-top').showModal()">Top</button>
```

**Dialog page - custom actions:**
```html
<!-- Before -->
<button nui-event-click="show-alert">Alert</button>
<!-- Plus registered action in script -->

<!-- After -->
<button onclick="nui.dialog.alert('Hello!', 'Message')">Alert</button>
```

**Link-list state watching:**
```javascript
// Before
nui.knower.watch(`${foldId}:active`, () => updateFoldStateDisplay(), instanceId);

// After
demoFold.addEventListener('nui-active-change', () => updateFoldStateDisplay());
```

**Internal component state (nui-link-list, nui-dialog, etc.):**
```javascript
// Before
knower.tell(stateKey, data, element);

// After
element.dispatchEvent(new CustomEvent('nui-active-change', { 
    bubbles: true, 
    detail: data 
}));
```

**Router state:**
```javascript
// Before
knower.tell('route', currentRoute);
knower.watch('route', handler);

// After
document.dispatchEvent(new CustomEvent('nui-route-change', { detail: currentRoute }));
document.addEventListener('nui-route-change', (e) => handler(e.detail));
```

### Components Using Knower Internally
These need refactoring to use custom events:
- `nui-link-list` - publishes active state
- `nui-sidebar` - publishes open/closed state  
- `nui-dialog` - publishes open state
- `nui-banner` - publishes open/action state
- Router - publishes route changes

### Cleanup Tasks
1. Remove `knower` object and all methods
2. Remove `doer` object and all methods
3. Remove `nui-event-*` event delegation
4. Remove `registerAction` from public API
5. Update `nui.d.ts` type definitions
6. Update `copilot-instructions.md` to remove Knower/Doer sections
7. Delete or archive `nui-monitor.js` (knower monitoring tool)

---

## Decision

**[ ] Keep as-is**  
**[ ] Enhance (Option B)**  
**[ ] Keep Doer only (Option C)**  
**[x] Remove both (Option D) - with minimal event delegation**  

Notes:
- Remove Knower entirely
- Remove full Doer system (registry, complex dispatch)
- Keep minimal ~10 line event delegation for CSP compatibility
- Use `data-action` attributes calling functions directly on `nui` object
- No custom registry needed—just expose utility functions on `nui`

### Final Approach: Minimal Event Delegation

```html
<button data-action="toggleTheme">Theme</button>
<button data-action="toggleSidebar">Menu</button>
```

```javascript
// ~10 lines in nui.js
document.addEventListener('click', (e) => {
    const actionEl = e.target.closest('[data-action]');
    if (!actionEl) return;
    const action = actionEl.dataset.action;
    if (action && typeof nui[action] === 'function') {
        nui[action](actionEl, e);
    }
});

// Utility functions exposed directly
nui.toggleTheme = () => { ... };
nui.toggleSidebar = () => { ... };
```

**Benefits:**
- CSP-safe (no inline handlers)
- Standard `data-*` attributes
- No registry—functions live directly on `nui`
- Transparent and debuggable
- ~10 lines vs ~300+ for Knower/Doer
