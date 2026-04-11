# Router & Page Script Execution Model

> **CRITICAL FOR LLMs:** This document explains how the NUI Playground loads pages and executes scripts. The pattern is **non-standard** by design - it ensures scripts run **after** custom elements are upgraded.
> 
> **Note:** `AGENTS.md` in the project root is for **human contributors** using AI coding assistants. This guide and the [Architecture Patterns page](#page=documentation/architecture-patterns#router-deep-dive) are the authoritative sources for LLMs.

## The Golden Rule

**NEVER use `<script type="module">` or `<script type="text/javascript">` for page logic.** They execute before custom elements are upgraded and will break.

**ALWAYS use `<script type="nui/page">`** at the bottom of the HTML fragment. This is the only script type the router will execute.

### ⚠️ Critical: Script Must Be Inside `<nui-page>`

If your fragment uses `<nui-page>` as the root element, the `<script type="nui/page">` **must be inside it**, not after it:

```html
<!-- ✅ CORRECT: Script inside nui-page -->
<nui-page class="page-my-component">
    <header><h1>My Component</h1></header>
    <section>...</section>
    
    <script type="nui/page">
    function init(element, params, nui) {
        // ...
    }
    </script>
</nui-page>
```

```html
<!-- ❌ WRONG: Script outside nui-page -->
<nui-page class="page-my-component">
    <header><h1>My Component</h1></header>
</nui-page>

<script type="nui/page">
// THIS WILL BE LOST - NUI discards everything outside <nui-page>
</script>
```

**Why:** When a fragment has `<nui-page>` as root, NUI extracts `fragmentPage.innerHTML` to populate the wrapper. Anything outside the `<nui-page>` tag is discarded.

## ⚠️ Content Security Policy (CSP) Warning

The router uses `new Function()` to execute page scripts after custom elements are upgraded. **This requires `'unsafe-eval'` in your Content Security Policy.**

If your project has a CSP that blocks `eval()` or `new Function()`, page scripts will silently fail to execute. Custom elements will still upgrade (they don't need eval), but `<script type="nui/page">` will be ignored.

**Symptoms of CSP blocking page scripts:**
- Page HTML loads correctly
- Custom elements (like `<nui-select>`) render and work
- Page logic (`init()` function) never runs
- No console errors (the error is swallowed by the router)

**Fix: Add `'unsafe-eval'` to your CSP:**

```html
<meta http-equiv="Content-Security-Policy" content="script-src 'self' 'unsafe-eval';">
```

Or if you already have a CSP header, add `'unsafe-eval'` to the `script-src` directive:

```
Content-Security-Policy: script-src 'self' 'unsafe-eval' https://cdn.example.com;
```

**Alternative:** If you cannot use `'unsafe-eval'`, use the manual fallback pattern - call your page init functions from the `nui-route-change` event instead of relying on auto-execution.

## How It Works

```
1. Router fetches: pages/components/button.html
2. Router injects HTML into <nui-page> wrapper
3. Router calls: customElements.upgrade(wrapper)
   → All <nui-*> elements are now functional
4. Router finds: <script type="nui/page">
5. Router executes it and calls: init(element, params, nui)
```

## The Pattern (Use This)

Put this at the **bottom** of every page HTML file:

```html
<script type="nui/page">
function init(element, params, nui) {
    // element = the <nui-page> wrapper (scoped DOM root)
    // params = URL parameters object
    // nui = the NUI library instance
    
    // One-time setup: cache elements, attach listeners
    const button = element.querySelector('nui-button');
    button.addEventListener('nui-click', (e) => {
        console.log('Button clicked!');
    });
    
    // Optional: lifecycle hooks for show/hide
    element.show = (params) => {
        // Called when page becomes visible
    };
    
    element.hide = () => {
        // Called when page is hidden
    };
}
</script>
```

## Key Rules

| Rule | Why |
|------|-----|
| **Script runs ONCE** | Pages are cached; `init()` won't re-run on navigation |
| **Use `element.querySelector()`** | Scope queries to the page wrapper, not `document` |
| **Function must be named `init`** | Router looks for this specific name |
| **No `document.addEventListener`** | Unless you remove it in `element.hide()` |

## Caching Behavior

```
First visit to #page=components/button:
  1. Fetch HTML
  2. Create wrapper element
  3. Execute init(element, params, nui)
  4. Show page

Second visit to #page=components/button:
  1. Find cached wrapper element
  2. Call element.show(params) ← init() is NOT called again
  3. Show page

When leaving the page:
  1. Call element.hide()
  2. Hide page (display: none)
```

## Common Mistakes

### ❌ Wrong: Using `document.querySelector`

```javascript
function init(element, params, nui) {
    const button = document.querySelector('nui-button'); // WRONG!
}
```

### ✅ Correct: Using `element.querySelector`

```javascript
function init(element, params, nui) {
    const button = element.querySelector('nui-button'); // CORRECT!
}
```

### ❌ Wrong: Attaching global listeners without cleanup

```javascript
function init(element, params, nui) {
    document.addEventListener('resize', handleResize); // WRONG!
}
```

### ✅ Correct: Cleanup in hide()

```javascript
function init(element, params, nui) {
    function handleResize() { /* ... */ }
    document.addEventListener('resize', handleResize);
    
    element.hide = () => {
        document.removeEventListener('resize', handleResize);
    };
}
```

### ❌ Wrong: Assuming script re-runs on navigation

```javascript
function init(element, params, nui) {
    let counter = 0; // WRONG! Won't reset on navigation
}
```

### ✅ Correct: Reset state in show()

```javascript
function init(element, params, nui) {
    let counter = 0;
    element.show = (params) => {
        counter = 0; // CORRECT! Reset when page becomes visible
    };
}
```

## Lifecycle Hooks

| Hook | When Called | Use For |
|------|-------------|---------|
| `init(element, params, nui)` | First page load only | Setup, attach listeners, cache elements |
| `element.show(params)` | Every time page becomes visible | Start timers, reset state, fetch data |
| `element.hide()` | Every time page is hidden | Stop timers, cleanup, save state |

## URL Parameters

```
#page=components/button?variant=primary&size=large
```

```javascript
function init(element, params, nui) {
    console.log(params.variant); // "primary"
    console.log(params.size);    // "large"
}
```

## Advanced: Splitting Page Logic

For complex pages, you can split the logic. The `<script type="nui/page">` tag is a **trigger** - it can contain code or call a pre-defined function.

### Option A: Pre-loaded function (same file)

```html
<!-- Define the function -->
<script type="text/javascript">
function initButtonPage(element, params, nui) {
    // ... page logic ...
}
</script>

<!-- Trigger tag calls it -->
<script type="nui/page">
function init(element, params, nui) {
    initButtonPage(element, params, nui);
}
</script>
```

### Option B: Imported module (via main.js)

```javascript
// main.js
import { initButtonPage } from './pages/components/button.js';
window.nuiPageInit = window.nuiPageInit || {};
window.nuiPageInit['components/button'] = initButtonPage;
```

```html
<!-- pages/components/button.html -->
<script type="nui/page" data-init="components/button"></script>
```

> **Note:** For 95% of pages, use the inline pattern shown in "The Pattern" section above. Only split logic when the page script exceeds ~100 lines.

## Execution Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Navigation: #page=components/button                         │
├─────────────────────────────────────────────────────────────┤
│ 1. Router creates <nui-page> wrapper                        │
│ 2. Fetch pages/components/button.html                       │
│ 3. Inject HTML into wrapper                                 │
│ 4. customElements.upgrade(wrapper)                          │
│    → <nui-button>, <nui-tabs>, etc. are now functional      │
│ 5. Find <script type="nui/page">                            │
│ 6. Remove script from DOM                                   │
│ 7. Execute via new Function()                               │
│ 8. Call init(wrapper, params, nui)                          │
│    → Attach listeners, cache elements, define show/hide     │
│ 9. Show page (remove display:none)                          │
├─────────────────────────────────────────────────────────────┤
│ Navigation: #page=components/dialog (different page)        │
├─────────────────────────────────────────────────────────────┤
│ 1. Hide current page: wrapper.hide()                        │
│ 2. Hide current page: display:none                          │
│ 3. Load new page (same process as above)                    │
├─────────────────────────────────────────────────────────────┤
│ Navigation: #page=components/button (return to cached page) │
├─────────────────────────────────────────────────────────────┤
│ 1. Find cached wrapper in Map                               │
│ 2. Call wrapper.show(params)                                │
│    → init() is NOT called again                             │
│ 3. Show page (remove display:none)                          │
└─────────────────────────────────────────────────────────────┘
```

## Troubleshooting

### Page scripts don't run, but custom elements work

**Cause 1: CSP blocking `new Function()`.** See the CSP Warning section above.

**Cause 2: Script tag outside `<nui-page>`.** If your fragment uses `<nui-page>` as root, the script must be inside it. Anything outside is discarded when NUI extracts `fragmentPage.innerHTML`.

**Diagnose:** Add this temporary patch to `nui.js` (around line 4896):

```javascript
if (element.nuiLoaded) {
    try {
        await element.nuiLoaded;
    } catch (e) {
        console.error('[NUI Router] Page load error:', e);
    }
}
```

If you see a `Refused to evaluate a string as JavaScript` error, it's CSP.

### `init()` is called but `element.querySelector` returns null

The script is executing before the DOM is ready. This shouldn't happen - the router calls `customElements.upgrade()` first. Check that your HTML fragment doesn't have unclosed tags that break the DOM tree.

### Page works on first load but breaks on return navigation

You're likely attaching global event listeners in `init()` without cleaning them up in `element.hide()`. Since pages are cached, `init()` only runs once but the page can be shown/hidden many times.

### Manual fallback pattern (when auto-execution isn't available)

```javascript
// main.js
container.addEventListener('nui-route-change', (e) => {
    const { type, id, element, params } = e.detail;
    
    if (type === 'page' && id === 'tuner/select') {
        initSelectPage(element, params, nui);
    }
});
```
