# Dev Plan: Pages with Logic

> **AX first, DX an afterthought at best.** When there's tension between AI Experience and Developer Experience, NUI prioritizes the LLM consumer. The LLM is the primary code generator — the human developer configures, reviews, and ships.
>
> The `<script type="nui/page">` contract is unique to NUI and foreign to all LLM training data. This dev plan defines how we make page logic "just work" for LLMs.
>
> Reviewed by GLM and Gemini. Updated May 20, 2026.

---

## The Problem

An LLM writing a page fragment naturally writes standard `<script>`:

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

**Critical fact:** `innerHTML` does NOT execute `<script>` tags (HTML spec). The LLM's code never runs at all — not "too early," not "wrong scope," but **dead code**. This is invisible to the LLM.

**What NUI requires instead:**
```html
<script type="nui/page">
function init(element, params, nui) {
    element.querySelector('nui-button').addEventListener(...)
}
</script>
```

This contract is unique to NUI, invisible to tooling, and contradicted by every framework in the LLM's training data.

---

## Phase 1: Auto-Detect + Auto-Fix (Option B+)

### Decision

Detect standard `<script>` tags in fragments, auto-wrap them into the `nui/page` contract, correct `document.*` scope to `element.*`, and log what happened. The LLM's code "just works" and they learn the correct pattern from the console message.

**Gemini dissent noted:** Regex-transforming executable JavaScript is risky (false positives in strings/comments). Mitigation: the transformation is conservative, only targets `document.querySelector/All/el/els`, and always logs exactly what was changed so the LLM can verify.

### Implementation

**File:** `NUI/nui.js` — `loadFragment()` function

```javascript
// In loadFragment(), after innerHTML assignment and customElements.upgrade():
// (around line ~4800 in nui.js)

// Phase 1: Auto-detect standard <script> in fragments
const standardScripts = wrapper.querySelectorAll('script:not([type]):not([src]), script[type="text/javascript"]');
if (standardScripts.length > 0 && config.debug !== false) {
    let content = standardScripts.map(s => s.textContent).join('\n\n');

    // Scope correction: document.* → element.*
    const replacements = 0;
    content = content
        .replace(/document\.querySelector\(/g, () => { replacements++; return 'element.querySelector('; })
        .replace(/document\.querySelectorAll\(/g, 'element.querySelectorAll(')
        .replace(/document\.el\(/g, 'element.el(')
        .replace(/document\.els\(/g, 'element.els(');

    // Remove original scripts
    standardScripts.forEach(s => s.remove());

    // Wrap in init() contract and execute
    const wrapped = `function init(element, params, nui) {\n${content}\n}`;
    console.info(
        `[NUI] Found ${standardScripts.length} standard <script> tag(s) in page fragment. ` +
        `Scripts via innerHTML never execute. Auto-wrapped as <script type="nui/page">. ` +
        `Replaced document.* → element.* scope. ` +
        `Use <script type="nui/page"> with function init(element, params, nui) { ... } explicitly.`
    );

    try {
        const initFn = new Function('element', 'params', 'nui', wrapped + '\ninit(element, params, nui);');
        initFn(wrapper, params, nui);
    } catch (e) {
        console.error('[NUI] Auto-wrapped script execution failed:', e);
    }
}
```

**Files modified:** `NUI/nui.js` — `loadFragment()` function (~15 lines added)

### Acceptance Criteria

- [ ] `<script>document.querySelector('nui-button')</script>` in a page fragment auto-wraps and executes
- [ ] Console shows info message with explicit pattern suggestion
- [ ] `document.querySelector` → `element.querySelector` replacement works for all 4 variants
- [ ] Existing `<script type="nui/page">` pages unaffected (detection skips them)
- [ ] `<script type="module">`, `<script type="example">`, `<script src="...">` unaffected
- [ ] Gated behind `config.debug !== false`

---

## Phase 2: `nui.registerPage()` API

### Decision

Provide a standard JavaScript module API for page registration. This is the pattern LLMs already know from every framework. Builds on the existing `registerFeature()` infrastructure.

### API Design

```typescript
nui.registerPage(id: string, options: {
    html?: string,                    // Path to HTML fragment (optional — can be markup-only)
    init: (element: HTMLElement, params: object, nui: object) => void
}): void
```

### Implementation

**File:** `NUI/nui.js` — add `registerPage()` method to the `nui` export

```javascript
// In the nui object (near registerFeature):
registerPage(id, options = {}) {
    registeredFeatures.set(`page:${id}`, {
        html: options.html || null,
        init: options.init
    });
},
```

**File:** `NUI/nui.js` — modify router's `pageContent()` function

```javascript
// In pageContent(), before fetching HTML:
function pageContent(type, id, params, options = {}) {
    // Phase 2: Check for registered page handler first
    if (type === 'page') {
        const registered = registeredFeatures.get(`page:${id}`);
        if (registered) {
            const wrapper = document.createElement('nui-page');
            wrapper.className = `content-page content-page-${id.replace(/\//g, '-')}`;

            if (registered.html) {
                // Load HTML fragment then call init
                wrapper.nuiLoaded = loadFragment(`${basePath}/${registered.html || id}.html`, wrapper, params)
                    .then(() => registered.init(wrapper, params, nui));
            } else {
                // No HTML — init with empty wrapper (like registerFeature today)
                registered.init(wrapper, params, nui);
            }
            return wrapper;
        }
    }

    // Fall back to existing HTML fetch + <script type="nui/page"> behavior
    // ... existing code ...
}
```

**Files modified:** `NUI/nui.js` — `nui` export (~5 lines), `pageContent()` function (~15 lines)

### Usage Example

```javascript
// In main.js:
import { nui } from './NUI/nui.js';

nui.registerPage('components/my-feature', {
    html: 'pages/components/my-feature.html',
    init(element, params, nui) {
        element.querySelector('nui-button').addEventListener('click', () => {
            nui.components.dialog.alert('Hello', 'Button clicked!');
        });
    }
});
```

```html
<!-- pages/components/my-feature.html — pure markup, no scripts -->
<div class="page-my-feature">
    <h1>My Feature</h1>
    <nui-button>Click Me</nui-button>
</div>
```

Routed as: `#page=components/my-feature` (same URL as today).

### Acceptance Criteria

- [ ] `nui.registerPage('test', { init(el) { el.textContent = 'works'; } })` registers and routes correctly
- [ ] `nui.registerPage('test', { html: 'path.html', init(el) {} })` fetches HTML then calls init
- [ ] Existing `<script type="nui/page">` pages continue working unchanged (fallback path)
- [ ] `#page=components/button` still works for pages without `registerPage()` registration
- [ ] Multiple registered pages coexist with legacy pages
- [ ] No `new Function()` needed — init runs as standard module code (eliminates CSP issue)

---

## Phase 3: Gradual Migration (Future)

Once Phase 1 and Phase 2 are stable:

1. New documentation examples show `registerPage()` as the primary pattern
2. `<script type="nui/page">` documented as legacy (still works, still supported)
3. Existing 54 Playground pages unchanged — no forced migration
4. New pages default to `registerPage()` or pure markup + `data-action`

---

## Gemini's Dissent on Option B+

Gemini raised a valid AX-purist concern: regex-transforming JavaScript at runtime creates a divergence between the LLM's written source code and the executed code. If the replacement hits a false positive (e.g., `// document.querySelector` in a comment), the behavior silently changes.

**Mitigation:** The transformation is conservative (only 4 patterns), always logs exactly what was changed, and only runs in development (`config.debug !== false`). In production, standard `<script>` tags remain dead code — as they already are today. The info log tells the LLM exactly what happened so they can self-correct.
