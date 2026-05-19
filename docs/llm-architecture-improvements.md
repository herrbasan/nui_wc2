# Architectural Improvements for LLM Usability

> Generated May 19, 2026 after a deep audit of the NUI library by an LLM that read the entire ~5800-line `nui.js`, all component docs, all playground pages, and all 11 LLM-filed GitHub issues.

---

## The Meta-Problem

NUI was designed for **human developers who can see the rendered page**. LLMs are blind. They navigate by:

1. **Console output** (errors, warnings — their only feedback channel)
2. **Return values** (promises that resolve/reject)
3. **Documentation** (which they pattern-match against training data)

When an LLM writes `<nui-app><header>Title</header></nui-app>`, the page renders text — it looks "working." No error, no warning. The LLM moves on, assuming success, and the layout is silently broken.

**Core insight:** The library must treat the console as its primary UI for LLM consumers.

---

## Proposal 1: Debug Addon (`nui-debug`) — P0

### Current State
Many failure modes are completely silent. Wrong `nui-app` children → broken layout, zero console output. Missing inner `<button>` → unstyled text, zero warnings. This is production-friendly but LLM-hostile.

The few warnings that exist (May 19 update) are baked into `nui.js`, adding code that ships to production.

### Proposal: Addon, Not Core

A `nui-debug` addon module — zero production cost, loaded only during development:

```html
<!-- Development only — remove for production -->
<script type="module" src="NUI/lib/modules/nui-debug.js"></script>
```

Or auto-load via query param (for LLM-driven development):
```
http://localhost:5500/?nui-debug
```
→ NUI detects the param, dynamically imports the debug module.

### Architecture

The debug module hooks into NUI's existing systems — no changes needed to individual components:

```
NUI/lib/modules/nui-debug.js   ← validation logic
NUI/css/modules/nui-debug.css  ← optional visual overlays (red border on broken elements)
```

```javascript
// nui-debug.js
import { nui } from '../../nui.js';

const validators = [];

// --- Registry: each validator checks one class of mistake ---

validators.push({
  name: 'nui-app structure',
  check(root) {
    root.querySelectorAll('nui-app').forEach(app => {
      const kids = [...app.children].filter(c => c.tagName.includes('-'));
      if (!kids.some(c => c.tagName === 'NUI-APP-HEADER'))
        warn(app, 'Missing <nui-app-header>. Layout will break.');
      if (!kids.some(c => c.tagName === 'NUI-CONTENT'))
        warn(app, 'Missing <nui-content>. Layout will break.');
      // Bare native elements
      [...app.children].forEach(c => {
        if (['HEADER','NAV','MAIN','FOOTER'].includes(c.tagName) && !c.closest('nui-app-header, nui-sidebar, nui-content'))
          warn(c, `Bare <${c.tagName.toLowerCase()}> in <nui-app>. Wrap: <nui-app-header><${c.tagName.toLowerCase()}></nui-app-header>`);
      });
    });
  }
});

validators.push({
  name: 'missing inner elements',
  check(root) {
    const needs = {
      'NUI-BUTTON': '<button>',
      'NUI-INPUT': '<input> or <textarea>',
      'NUI-SELECT': '<select>',
      'NUI-DIALOG': '<dialog>',
      'NUI-TABLE': '<table>',
    };
    Object.entries(needs).forEach(([tag, inner]) => {
      root.querySelectorAll(tag).forEach(el => {
        const innerTag = inner.match(/<(\w+)/)?.[1];
        if (innerTag && !el.querySelector(innerTag)) {
          warn(el, `Missing inner ${inner}. Required: <${tag.toLowerCase()}>${inner}</${tag.toLowerCase()}>`);
        }
      });
    });
  }
});

validators.push({
  name: 'nui-tabs structure',
  check(root) {
    root.querySelectorAll('nui-tabs').forEach(tabs => {
      const tablist = tabs.querySelector('[role="tablist"]') || [...tabs.children].find(c => c.querySelector('button, a'));
      const panels = [...tabs.children].filter(c => c !== tablist && c.tagName !== 'SCRIPT');
      if (!tablist) warn(tabs, 'No tab buttons found. Add <nav> with <button> elements.');
      if (tablist && panels.length === 0) warn(tabs, 'Has tab buttons but no content panels. Add <section> elements.');
    });
  }
});

validators.push({
  name: 'unregistered addon elements',
  check(root) {
    const knownAddons = ['nui-list','nui-lightbox','nui-code-editor','nui-media-player',
      'nui-wizard','nui-menu','nui-context-menu','nui-rich-text'];
    knownAddons.forEach(tag => {
      root.querySelectorAll(tag).forEach(el => {
        if (!customElements.get(tag)) {
          warn(el, `<${tag}> not registered. Missing JS import. See LLM-CHEATSHEET.md.`);
        }
      });
    });
  }
});

validators.push({
  name: 'attribute typos',
  check(root) {
    const knownVariants = {
      'NUI-BUTTON': ['primary','outline','ghost','danger','delete','warning','icon'],
      'NUI-BADGE': ['primary','success','danger','warning','info'],
      'NUI-PROGRESS': ['bar','circular','busy','circular-busy'],
    };
    Object.entries(knownVariants).forEach(([tag, valid]) => {
      root.querySelectorAll(tag).forEach(el => {
        const variant = el.getAttribute('variant') || el.getAttribute('type');
        if (variant && !valid.includes(variant)) {
          const suggestion = valid.find(v => v.startsWith(variant.slice(0,2)));
          warn(el, `Unknown variant/type="${variant}".${suggestion ? ' Did you mean "' + suggestion + '"?' : ' Valid: ' + valid.join(', ')}`);
        }
      });
    });
  }
});

// --- Engine ---

let warnCount = 0;

function warn(element, message) {
  warnCount++;
  console.warn(`[NUI DEBUG #${warnCount}] ${message}`, element);

  // Optional: add visual indicator in the DOM (requires nui-debug.css)
  if (!element._debugMarked) {
    element._debugMarked = true;
    element.style.outline = '2px dashed red';
    element.style.setProperty('--debug-message', `"${message}"`);
  }
}

function runAll(root = document) {
  warnCount = 0;
  validators.forEach(v => {
    try { v.check(root); } catch(e) { console.error(`[NUI DEBUG] Validator "${v.name}" failed:`, e); }
  });

  if (warnCount === 0) {
    console.log('[NUI DEBUG] ✓ No issues found.');
  } else {
    console.log(`[NUI DEBUG] ${warnCount} issue(s) found. Fix them before going to production.`);
  }

  return { valid: warnCount === 0, count: warnCount };
}

// --- Hooks ---

// Run after NUI is initialized
nui.ready().then(() => {
  // Small delay to let all custom elements upgrade
  setTimeout(() => runAll(), 100);
});

// Also observe for dynamically added elements
new MutationObserver(() => {
  // Debounced — don't spam on rapid DOM changes
  clearTimeout(runAll._debounce);
  runAll._debounce = setTimeout(() => runAll(), 500);
}).observe(document.documentElement, { childList: true, subtree: true });

// Expose for manual calls
nui.debug = { run: runAll, validators };
```

### Usage

```html
<!-- Option A: Explicit import (dev only, remove for production) -->
<script type="module" src="NUI/lib/modules/nui-debug.js"></script>

<!-- Option B: Auto-load via query param (for LLM-driven dev) -->
<!-- Just open http://localhost:5500/?nui-debug — NUI auto-imports the module -->

<!-- Option C: Programmatic -->
<script type="module">
  import { nui } from './NUI/nui.js';
  await nui.ready();
  await import('./NUI/lib/modules/nui-debug.js');
  const result = nui.debug.run();
  if (!result.valid) console.table(result.warnings);
</script>
```

### What This Enables

| For LLMs | For Humans |
|----------|-----------|
| Console output is their primary feedback — every mistake produces a clear message | Red dashed outlines on broken elements, hover to see the message |
| `nui.debug.run()` returns structured results an LLM can check | Open `?nui-debug` to audit a page before shipping |
| MutationObserver catches dynamically added mistakes | Zero production overhead — don't import the module |
| Validators are self-contained — easy to add new ones without touching core | Can be shipped as a browser extension bookmarklet |

### Zero Production Cost

The debug module is never loaded in production. `nui.js` itself stays lean — no validation logic, no `if (debug)` branches, no console.warn calls for structural mistakes. The few warnings that already exist in `nui.js` (May 19 additions for CSP eval, unregistered addons) should migrate to the debug module.

### Validator Catalog (What It Checks)

| Validator | Detects |
|-----------|---------|
| `nui-app structure` | Missing layout children, bare native elements outside wrappers |
| `missing inner elements` | `<nui-button>` without `<button>`, `<nui-select>` without `<select>`, etc. |
| `nui-tabs structure` | Missing tablist, missing panels |
| `unregistered addon elements` | `<nui-list>` in DOM but `nui-list.js` not imported |
| `attribute typos` | `variant="primry"`, `type="circlar"` |
| (extensible) | Add more validators without touching core |

### Level System (Future)

```javascript
nui.debug.run({ level: 'strict' });  // Everything
nui.debug.run({ level: 'basic' });   // Missing elements only
nui.debug.run({ level: 'pedantic'}); // Even suggests better patterns
```

---

## Proposal 2: Auto-Wrap Missing Inner Elements (P0)

### Current State
NUI requires wrapping native elements inside custom elements:
```html
<nui-button><button type="button">Click</button></nui-button>
```

This pattern contradicts millions of LLM training examples where components are self-contained (`<Button>Click</Button>` in React, `<v-btn>Click</v-btn>` in Vuetify, etc.).

### Proposal
Detect missing inner native elements at `connectedCallback` time and auto-create them, logging an `info` message.

**Tier 1 — Form components (auto-wrap + info log):**

| Component | LLM writes | Auto-wrap creates |
|-----------|-----------|-------------------|
| `nui-button` | `<nui-button>Click</nui-button>` | `<button>`, moves `textContent`, logs info |
| `nui-button` | `<nui-button label="Click" variant="primary">` | `<button>` with text from `label` attribute |
| `nui-input` | `<nui-input placeholder="Name">` | `<input type="text">`, copies attributes |
| `nui-input` | `<nui-input type="email">` | `<input type="email">` |
| `nui-textarea` | `<nui-textarea placeholder="Msg">` | `<textarea>`, copies attributes |
| `nui-select` | `<nui-select><option value="a">A</option></nui-select>` | `<select>`, moves `<option>`s into it |
| `nui-dialog` | `<nui-dialog><p>Content</p></nui-dialog>` | `<dialog>`, wraps content |
| `nui-tabs` | `<nui-tabs><button>Tab1</button><section>C</section></nui-tabs>` | Wraps buttons in `<nav>`, keeps panels |

All forms remain backward compatible. Explicit inner elements work silently. Auto-wrapped elements work with an info log suggesting the explicit form for zero-JS fallback.

Console output example:
```
[NUI] ℹ <nui-button> auto-created inner <button>. For zero-JS fallback, use:
  <nui-button><button type="button">Click</button></nui-button>
```

**Tier 2 — Layout components (auto-wrap + warning):**

For `nui-app`, detect bare `<header>`, `<nav>`, `<main>`, `<footer>` children and wrap them:
```javascript
// LLM writes:
<nui-app>
  <header>Title</header>
  <main>Content</main>
</nui-app>

// Auto-corrected to:
<nui-app>
  <nui-app-header><header>Title</header></nui-app-header>
  <nui-content><main>Content</main></nui-content>
</nui-app>
// console.warn: "[NUI] Auto-wrapped bare <header> in <nui-app-header>."
```

**What we do NOT auto-wrap (Tier 3):**

- `nui-checkbox` / `nui-radio` — needs `<input>` + `<label>` with `for`/`id` linking, too fragile to guess
- `nui-link-list` — deeply nested tree structure, structure IS the data
- `nui-sortable` — needs `nui-sortable-item` children with `data-id`

### Precedent
Several NUI components already auto-generate their internal DOM:
- `nui-slider` already creates `<input type="range">` if missing
- `nui-progress` generates all internal SVG/div structure
- `nui-skip-links` auto-generates links from landmark detection
- `nui-dropzone` restructures children into backdrop + content
- `nui-dialog` (page mode) creates `<dialog>`, `<header>`, `<main>`, `<footer>`

This proposal extends an existing pattern, not inventing one.

---

## Proposal 3: Pick One Interaction Model (P2)

### Current State
Two competing models for handling clicks:

1. **`data-action="name:param@selector"`** — declarative, CSP-safe, 17 built-in handlers, well-documented in the cheatsheet
2. **`addEventListener('click', ...)`** — imperative, standard, used everywhere in the actual codebase

An LLM reading the cheatsheet learns `data-action`. An LLM reading the Playground source code sees `addEventListener`. Contradiction → confusion.

### Options

**Option A — Go all-in on `data-action`:**
- Remove `nui-click` CustomEvent entirely
- Make every Playground demo use only `data-action`
- Add console warning when `addEventListener` is used on NUI component hosts: "[NUI] Prefer data-action over addEventListener on <nui-button>. See LLM-CHEATSHEET.md"
- `nui.registerAction()` becomes the standard way to handle custom interactions

**Option B — Deprecate `data-action`, provide helper:**
- `data-action` is complex (syntax parsing, selector resolution, built-in handler map)
- Replace with simpler: `nui.on('click', 'nui-button', handler)` delegation helper
- This mirrors jQuery-style delegation that LLMs know well

**Option C — Keep both, document boundaries clearly:**
- `data-action` for simple built-in operations (dialog-open, select-open, etc.)
- `addEventListener` for complex page logic in `<script type="nui/page">`
- This is the current state — the problem is the boundary is unclear

---

## Proposal 4: Addon Auto-Loading (P1)

### Current State
9 addons require BOTH `<script>` import AND `<link>` CSS. 18 manual statements. Forgetting one = silent failure. The MutationObserver added in the May 19 update detects this but only warns — it doesn't fix.

### Proposal
Addon manifest + auto-loading:

```javascript
// In nui-list.js:
export const manifest = {
  css: '../css/modules/nui-list.css',
  tagName: 'nui-list'
};
```

```javascript
// In nui.js init(): MutationObserver watches for any unregistered nui-* element.
// When detected, dynamically imports the JS module, which triggers CSS injection.

new MutationObserver((mutations) => {
  for (const m of mutations) {
    for (const node of m.addedNodes) {
      if (node.nodeType !== Node.ELEMENT_NODE) continue;
      const tag = node.tagName.toLowerCase();
      if (tag.startsWith('nui-') && !customElements.get(tag)) {
        // Try to auto-load
        tryAutoLoad(tag, node);
      }
    }
  }
}).observe(document.documentElement, { childList: true, subtree: true });
```

Console output:
```
[NUI] Auto-loaded nui-list (JS + CSS). Add explicit imports for production:
  <link rel="stylesheet" href="NUI/css/modules/nui-list.css">
  <script type="module" src="NUI/lib/modules/nui-list.js"></script>
```

**Backward compatibility:** Explicit imports still work and are preferred. Auto-loading is a development convenience that logs instructions for production hardening.

---

## Proposal 5: Replace `new Function()` CSP Footgun (P1)

### Current State
Page scripts (`<script type="nui/page">`) execute via `new Function()`, which requires `'unsafe-eval'` in Content Security Policy. Without it, scripts silently fail. The May 19 update added a `try/catch` warning, but the fundamental problem remains.

### Proposal
Replace with `Blob` URL approach (works with strict CSP):

```javascript
function executePageScript(wrapper, params) {
  const scriptEl = wrapper.el('script[type="nui/page"]');
  if (!scriptEl) return;

  const scriptContent = scriptEl.textContent;
  scriptEl.remove();

  // Validation
  if (!scriptContent.includes('function init(')) {
    console.warn('[NUI] Page script missing init(element, params, nui) function.');
  }

  // Wrap in module and execute via Blob URL (no unsafe-eval needed)
  const wrapped = `
    export function __nuiPageInit(element, params, nui) {
      ${scriptContent}
      if (typeof init === "function") init(element, params, nui);
    }
  `;

  const blob = new Blob([wrapped], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob);

  import(url)
    .then(module => {
      module.__nuiPageInit(wrapper, params, nui);
      URL.revokeObjectURL(url);
    })
    .catch(err => {
      console.error('[NUI] Page script failed:', err);
    });
}
```

This works with `script-src 'self'` — no `'unsafe-eval'` needed. The `import()` dynamic module import is already allowed by the existing `nui-code` syntax highlight loader.

### Trade-off
Slightly more complex. Need to handle module caching (Blob URLs should be revoked after use). Edge case: the wrapped code can't use top-level `return` statements (but page scripts shouldn't anyway).

---

## Proposal 6: Component Introspection API (P2)

### Current State
LLMs can't ask "what components exist?" or "what does nui-dialog support?" at runtime. Information lives only in documentation files.

### Proposal
```javascript
// List all available components
nui.listComponents();
// → ['nui-accordion', 'nui-app', 'nui-app-header', ...]

// Get structured API for a component
nui.help('nui-dialog');
// → {
//   tagName: 'nui-dialog',
//   innerElement: '<dialog>',
//   attributes: { mode: 'page', title: 'string', placement: 'center|top|bottom', blocking: 'boolean' },
//   methods: ['showModal()', 'show()', 'close(returnValue)', 'isOpen()'],
//   events: ['nui-dialog-open', 'nui-dialog-close', 'nui-dialog-cancel'],
//   programmatic: {
//     'nui.components.dialog.alert(title, message, options?)': 'Promise<true>',
//     'nui.components.dialog.confirm(title, message, options?)': 'Promise<boolean>',
//     'nui.components.dialog.prompt(title, message, options?)': 'Promise<Object|null>',
//     'nui.components.dialog.page(title, htmlContent, options?)': '{ dialog, main, result }'
//   },
//   docPath: 'documentation/components/dialog.md'
// }
```

This could be generated from `components.json` at build time and embedded as a static data structure, or queried at runtime from the registry.

### Value for LLMs
An LLM stuck on "how do I open a dialog?" could call `nui.help('nui-dialog')` and get the answer immediately without reading files. This is the most LLM-native API possible — it mirrors how LLMs use tools.

---

## Proposal 7: Explicit Init (No Auto-Init) (P2)

### Current State
`nui.js` auto-calls `nui.init()` on module load. This creates a race condition: code that runs before the module loads can't use programmatic APIs. The May 19 update added `nui.ready()` to mitigate this, but the auto-init pattern is still fragile.

### Proposal
Don't auto-init. Require explicit initialization:

```javascript
// Old (auto-init, still works for backward compat):
<script type="module" src="NUI/nui.js"></script>

// New (explicit, recommended):
<script type="module">
  import { nui } from './NUI/nui.js';
  await nui.init();
  // Now safe to use programmatic APIs
  await nui.components.dialog.confirm('Title', 'Message');
</script>
```

Or for HTML-first usage:
```html
<script type="module" src="NUI/nui.js"></script>
<script type="module">
  await nui.ready(); // already exists
</script>
```

**Backward compatibility:** Keep auto-init for `<script src="NUI/nui.js">` usage. Add a deprecation notice. This is how most modern libraries work — explicit is safer.

---

## Summary: Priority Matrix

| Priority | Proposal | Impact | Risk |
|----------|----------|--------|------|
| **P0** | #1 Debug Addon (`nui-debug`) | Eliminates silent failures entirely | None — addon, zero production code |
| **P0** | #2 Auto-wrap missing inner elements | Eliminates #1 LLM mistake pattern | Medium — must preserve existing explicit patterns |
| **P1** | #4 Addon auto-loading | Eliminates "forgot CSS" class of bugs | Medium — dynamic imports in observer |
| **P1** | #5 Replace `new Function()` with Blob URL | Removes CSP fragility | Low-Medium — behavior change for page scripts |
| **P2** | #3 Pick one interaction model | Removes dual-pattern confusion | High — existing codebase uses both |
| **P2** | #6 Component introspection API | LLM-native API discovery | Low — generated from components.json |
| **P2** | #7 Explicit init | Removes race condition | Low-Medium — backward compat needed |
