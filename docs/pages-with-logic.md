# Rethinking "Pages with Logic" for LLM Usability

> **AX first, DX an afterthought at best.** When there's tension between AI Experience and Developer Experience, NUI prioritizes the LLM consumer. The LLM is the primary code generator — the human developer configures, reviews, and ships.
>
> The `<script type="nui/page">` contract is unique to NUI and foreign to all LLM training data. This document analyzes the problem and proposes solutions. Updated with peer review from GLM.

---

## The Problem (Corrected)

An LLM writing a page fragment naturally does this:

```html
<!-- Playground/pages/components/my-feature.html -->
<div class="page-my-feature">
    <h1>My Feature</h1>
    <nui-button>Click Me</nui-button>

    <script>
        // ❌ Browsers skip <script> when inserted via innerHTML — NEVER executes
        document.querySelector('nui-button').addEventListener(...)
    </script>
</div>
```

**Critical correction:** `innerHTML` assignment does NOT execute `<script>` tags — this is specified in the HTML standard. The LLM's code doesn't "run too early" — it **never runs at all**. This is actually a stronger signal to the LLM.

**What LLMs expect:** Write `<script>`, it works. (React, Vue, vanilla HTML all work this way.)

**What NUI requires:** `<script type="nui/nui/page">` with `function init(element, params, nui) { ... }` — a contract found nowhere else.

**Deeper problem:** `<script type="nui/page">` is invisible to linting, syntax highlighting, and editor tooling. When an LLM writes standard `<script>`, editors validate it. The `nui/page` type makes it inert to all tooling — the code looks like inert markup.

---

## Why the Current Contract Exists

Browsers explicitly skip `<script>` tags inserted via `innerHTML` (HTML spec behavior). NUI uses a custom `type="nui/page"` so browsers ignore it, then NUI extracts and executes it after custom elements are upgraded.

---

## Options

### Option A: Documentation-Only

Add a prominent warning in the cheatsheet with a clear WRONG vs CORRECT example.

**Pro:** Zero code change.  
**Con:** LLMs pattern-match from training data, not from docs. They'll still write `<script>` first.

### Option B: Auto-Detect + Warn

In the fragment loader, scan for standard `<script>` tags (no `type`, or `type="text/javascript"` — excluding `type="module"`, `type="example"`). If found, warn:

```
[NUI] Found <script> in page fragment. Scripts inserted via innerHTML never execute.
Use <script type="nui/page"> with function init(element, params, nui) { ... } instead.
```

**Pro:** LLMs see the warning and learn. Low effort.  
**Con:** Doesn't fix the problem, just flags it.

### Option B+: Auto-Detect + Auto-Wrap + Scope Correction (Rejected)

Same detection, but auto-wrap the script content AND fix the scope via regex replacement (`document.*` → `element.*`).

**Decision:** REJECTED. AX is the absolute priority, which demands strict predictability over DX "magic." Using regex to mutate executable JavaScript at runtime is an architectural footgun. It breaks unexpectedly on variable names, comments, and strings. Mutating code before `new Function()` creates debugging nightmares where the executed code doesn't match the LLM's written source.

### Option C: `nui.registerPage()` — The Best Long-Term Answer

Uses standard JavaScript module patterns that every LLM knows. Builds on existing `registerFeature()` infrastructure (`nui.js:5758`).

```javascript
// In main.js or a page module:
import { nui } from '../NUI/nui.js';

nui.registerPage('components/my-feature', {
    html: 'pages/components/my-feature.html',  // optional HTML fragment
    init(element, params, nui) {
        const button = element.querySelector('nui-button');
        button.addEventListener('click', () => { ... });
    }
});
```

The HTML fragment becomes pure markup — no inline scripts:

```html
<!-- Playground/pages/components/my-feature.html -->
<div class="page-my-feature">
    <h1>My Feature</h1>
    <nui-button>Click Me</nui-button>
</div>
```

**Routing:** `#page=components/my-feature` checks registered pages first, then falls back to HTML fetch + `<script type="nui/page">`. Both coexist — migration is gradual.

**Key benefit missed in original analysis:** `registerPage()` eliminates the `new Function()` CSP problem entirely. No Blob URLs, no `'unsafe-eval'`, no workarounds. The code runs as a standard ES module. This solves TWO problems at once.

### Option D: `<script defer>` — Rejected

`defer` doesn't work with `innerHTML`. Browsers still skip the script.

---

## Recommendation (Three-Phase)

| Phase | Action | When |
|-------|--------|------|
| **1. Now** | Option B — Strict linting. Detect `<script>`, throw loud console error | Built into debug addon |
| **2. Next** | Add `nui.registerPage()` API (builds on `registerFeature()`) | High priority |
| **3. Later** | `<script type="nui/page">` becomes legacy. 54 existing pages keep working. | Gradual migration |

`registerPage()` is the cleanest long-term answer because it uses standard module patterns, eliminates the CSP problem entirely, and coexists with the existing script-tag approach.
