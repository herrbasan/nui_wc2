# Rethinking "Pages with Logic" for LLM Usability

> The `<script type="nui/page">` contract is unique to NUI and foreign to all LLM training data. This document analyzes the problem and proposes solutions.

---

## The Problem

An LLM writing a page fragment naturally does this:

```html
<!-- Playground/pages/components/my-feature.html -->
<div class="page-my-feature">
    <h1>My Feature</h1>
    <nui-button>Click Me</nui-button>

    <script>
        // ❌ This runs BEFORE custom elements upgrade — silently fails
        document.querySelector('nui-button').addEventListener(...)
    </script>
</div>
```

The router fetches this HTML, injects it, calls `customElements.upgrade()`, THEN looks for `<script type="nui/page">`. The standard `<script>` already ran — too early.

**What LLMs expect:** Write `<script>`, it works. (React, Vue, vanilla HTML all work this way.)

**What NUI requires:** `<script type="nui/page">` with `function init(element, params, nui) { ... }` — a contract found nowhere else.

---

## Why the Current Contract Exists

Browsers execute `<script>` immediately when innerHTML is set. But NUI needs custom elements upgraded first. By using a custom `type="nui/page"`, browsers ignore the script — NUI handles execution after upgrade is complete.

---

## Options

### Option A: Documentation-Only

Add a prominent warning in the cheatsheet with a clear WRONG vs CORRECT example.

**Pro:** Zero code change.  
**Con:** LLMs pattern-match from training data, not from docs. They'll still write `<script>` first.

### Option B: Auto-Detect + Warn

In `executePageScript()`, scan the fragment for standard `<script>` tags (not `type="nui/page"`, not `type="module"`, not `type="example"`). If found, warn:

```
[NUI] Found <script> tag in page fragment. This runs before custom elements upgrade.
Use <script type="nui/page"> with function init(element, params, nui) { ... } instead.
```

**Pro:** LLMs see the warning and learn. Low effort.  
**Con:** Doesn't fix the problem, just flags it.

### Option B+: Auto-Detect + Auto-Wrap

Same detection, but instead of warning, auto-wrap the script content:

```javascript
// LLM writes: <script>document.querySelector('nui-button').addEventListener(...)</script>

// NUI auto-converts to:
// <script type="nui/page">
//   function init(element, params, nui) {
//     document.querySelector('nui-button').addEventListener(...)
//   }
// </script>
```

**Pro:** LLM's code just works. They can see the corrected form in dev tools and learn.  
**Con:** `document.querySelector` should be `element.querySelector`. Hard to fix that automatically.

### Option C: `nui.registerPage()` — No Script Tags

Instead of `<script type="nui/page">`, use a programmatic API:

```javascript
// In main.js or a module:
nui.registerPage('components/my-feature', (element, params) => {
    const button = element.querySelector('nui-button');
    button.addEventListener('click', ...);
});
```

The page HTML becomes pure markup with zero JavaScript. Logic lives in a JS module.

**Pro:** Standard JavaScript module pattern — LLMs know this. No `new Function()`, no CSP issues, no custom script types.  
**Con:** Separates markup from logic. Requires changing the Playground architecture.

### Option D: `<script defer>` Support

Let standard `<script defer>` work inside page fragments. The router would:
1. Inject HTML
2. Upgrade custom elements  
3. Find all `<script defer>` in the fragment
4. Execute them

**Pro:** LLMs know `<script defer>`. No custom type.  
**Con:** `defer` doesn't prevent immediate execution on innerHTML — browsers still run it. Would need to intercept and delay.

---

## Recommendation

**Short-term (do now):** Option B — add detection and warning to `executePageScript()`. Already in the debug addon's scope.

**Medium-term (consider):** Option C — `nui.registerPage()` as an alternative pattern. This is the most natural pattern for LLMs (it's how they wire React components) and eliminates the script-tag confusion entirely.

**Not recommended:** Option A alone (docs don't fix pattern-matching). Option D (browser behavior makes it unreliable).
