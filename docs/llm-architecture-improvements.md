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
        warn(app, 'Missing <nui-app-header>. Layout will break.',
          'Add <nui-app-header><header>...</header></nui-app-header> as first child of <nui-app>');
      if (!kids.some(c => c.tagName === 'NUI-CONTENT'))
        warn(app, 'Missing <nui-content>. Layout will break.',
          'Add <nui-content><main>...</main></nui-content> as child of <nui-app>');
      // Bare native elements
      [...app.children].forEach(c => {
        if (['HEADER','NAV','MAIN','FOOTER'].includes(c.tagName) && !c.closest('nui-app-header, nui-sidebar, nui-content'))
          warn(c, `Bare <${c.tagName.toLowerCase()}> in <nui-app>.`,
            `<nui-app-header><${c.tagName.toLowerCase()}>...</${c.tagName.toLowerCase()}></nui-app-header>`);
      });
    });
  }
});

validators.push({
  name: 'missing inner elements',
  check(root) {
    const needs = {
      'NUI-BUTTON': ['button', '<nui-button><button type="button">Click</button></nui-button>'],
      'NUI-INPUT':  ['input', '<nui-input><input type="text" placeholder="..."></nui-input>'],
      'NUI-SELECT': ['select', '<nui-select><select>...</select></nui-select>'],
      'NUI-DIALOG': ['dialog', '<nui-dialog><dialog>...</dialog></nui-dialog>'],
      'NUI-TABLE':  ['table', '<nui-table><table>...</table></nui-table>'],
      'NUI-TABS':   ['nav', '<nui-tabs><nav><button>Tab</button></nav><section>Content</section></nui-tabs>'],
    };
    Object.entries(needs).forEach(([tag, [innerTag, fix]]) => {
      root.querySelectorAll(tag).forEach(el => {
        if (!el.querySelector(innerTag)) {
          warn(el, `Missing inner <${innerTag}>.`, fix);
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
  issues.length = 0;
  warnCount = 0;
  validators.forEach(v => {
    try { v.check(root); } catch(e) { console.error(`[NUI DEBUG] Validator "${v.name}" failed:`, e); }
  });

  if (warnCount === 0) {
    console.log('[NUI DEBUG] ✓ No issues found.');
  } else {
    console.log(`[NUI DEBUG] ${warnCount} issue(s) found. Fix them before going to production.`);
  }

  return { valid: warnCount === 0, count: warnCount, issues: issues.map(i => ({...i})) };
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

## Proposal 2: Auto-Wrap Missing Inner Elements (P0 — Tier 1 only)

### Current State
NUI requires wrapping native elements inside custom elements:
```html
<nui-button><button type="button">Click</button></nui-button>
```

This pattern contradicts millions of LLM training examples where components are self-contained (`<Button>Click</Button>` in React, `<v-btn>Click</v-btn>` in Vuetify, etc.).

### Proposal: Ship Only Tier 1 (Forms)

Detect missing inner native elements at `connectedCallback` time and auto-create them, logging an `info` message. **Tier 2 (layout auto-wrap) is handled by the debug addon's validators instead — less risk, same feedback.**

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

**`label` attribute precedence for `nui-button`:**

```html
<!-- Case 1: label attribute wins if no explicit <button> -->
<nui-button label="Save" variant="primary"></nui-button>
<!-- → creates: <nui-button variant="primary"><button type="button">Save</button></nui-button> -->

<!-- Case 2: explicit <button> wins over label (label ignored) -->
<nui-button label="Save"><button type="button">Cancel</button></nui-button>
<!-- → keeps "Cancel", ignores label -->

<!-- Case 3: bare textContent wins if no label and no button -->
<nui-button>Click Me</nui-button>
<!-- → creates: <nui-button><button type="button">Click Me</button></nui-button> -->
```

Console output example:
```
[NUI] ℹ <nui-button> auto-created inner <button>. For zero-JS fallback, use:
  <nui-button><button type="button">Click</button></nui-button>
```

**Tier 2 — NOT auto-wrapping (debug addon handles this):**

For `nui-app` bare children: do NOT auto-wrap at runtime. DOM mutation during `connectedCallback` can cause re-entrancy issues when the MutationObserver fires validators, which fire more mutations, etc. Instead, the debug addon's validators flag it with a clear `fix` field. The LLM reads the warning and corrects the HTML.

**What we do NOT auto-wrap:**

- `nui-checkbox` / `nui-radio` — needs `<input>` + `<label>` with `for`/`id` linking, too fragile to guess
- `nui-link-list` — deeply nested tree structure, structure IS the data
- `nui-sortable` — needs `nui-sortable-item` children with `data-id`
- `nui-app` children — Tier 2, handled by debug validators

### Precedent
Several NUI components already auto-generate their internal DOM:
- `nui-slider` already creates `<input type="range">` if missing
- `nui-progress` generates all internal SVG/div structure
- `nui-skip-links` auto-generates links from landmark detection
- `nui-dropzone` restructures children into backdrop + content
- `nui-dialog` (page mode) creates `<dialog>`, `<header>`, `<main>`, `<footer>`

This proposal extends an existing pattern, not inventing one.

---

## Proposal 3: Settle the Interaction Model Confusion (P0-equivalent — just add 2 lines to cheatsheet)

### Current State
Two competing models for handling clicks:

1. **`data-action="name:param@selector"`** — declarative, CSP-safe, 17 built-in handlers
2. **`addEventListener('click', ...)`** — imperative, standard, used everywhere in the codebase

LLMs discover both and don't know which to use. This is not a code problem — it's a documentation boundary problem.

### Resolution: Option C — Keep Both, Clarify Boundary

No code change. Add these two sentences to `LLM-CHEATSHEET.md` Quick Rules:

> - **Use `data-action` for built-in operations** (dialog-open, tabs-select, banner-close, etc.) and simple declarative wiring.
> - **Use `addEventListener` in `<script type="nui/page">`** for complex page-specific logic that does multiple things, async work, or state management.

This is the right answer because:
- `data-action` is NUI's most distinctive feature — throwing it away removes the declarative pattern entirely
- `addEventListener` is necessary for complex logic that `data-action` can't express (async, multi-step, conditional)
- The confusion is about boundaries, not about either pattern being wrong

---

## Proposal 4: Addon Auto-Loading (P1)

### Current State
9 addons require BOTH `<script>` import AND `<link>` CSS. 18 manual statements. Forgetting one = silent failure.

### Proposal: Hardcoded Lookup Table (Simplified)

Instead of each addon exporting its own manifest, use a single lookup table in `nui.js` derived from `components.json`:

```javascript
// In nui.js — single source of truth for addon auto-loading
const ADDON_MAP = {
  'nui-list':         { js: 'lib/modules/nui-list.js',         css: 'css/modules/nui-list.css' },
  'nui-lightbox':     { js: 'lib/modules/nui-lightbox.js',     css: 'css/modules/nui-lightbox.css' },
  'nui-code-editor':  { js: 'lib/modules/nui-code-editor.js',  css: 'css/modules/nui-code-editor.css' },
  'nui-media-player': { js: 'lib/modules/nui-media-player.js', css: 'css/modules/nui-media-player.css' },
  'nui-wizard':       { js: 'lib/modules/nui-wizard.js',       css: 'css/modules/nui-wizard.css' },
  'nui-menu':         { js: 'lib/modules/nui-menu.js',         css: 'css/modules/nui-menu.css' },
  'nui-context-menu': { js: 'lib/modules/nui-context-menu.js', css: 'css/modules/nui-context-menu.css' },
  'nui-rich-text':    { js: 'lib/modules/nui-rich-text.js',    css: 'css/modules/nui-rich-text.css' },
  'nui-app-window':   { js: 'lib/modules/nui-app-window.js',   css: 'css/modules/nui-app-window.css' },
};

// MutationObserver: on detecting unregistered nui-* element,
// dynamically import JS + inject CSS, then log instructions.
```

**Why hardcoded instead of per-addon manifests:**
- No need to touch all 9 addon files
- Data already exists in `components.json`
- 9 entries is trivial to maintain
- Auto-load + info-log pattern (suggesting explicit imports for production) is exactly right

Console output:
```
[NUI] Auto-loaded nui-list (JS + CSS). Add explicit imports for production:
  <link rel="stylesheet" href="NUI/css/modules/nui-list.css">
  <script type="module" src="NUI/lib/modules/nui-list.js"></script>
```

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
Slightly more complex. Need to handle module caching (Blob URLs should be revoked after use). Edge case: the wrapped code can't use top-level `return` statements (but page scripts shouldn't anyway). Another edge case: `this` inside the wrapped code changes because it runs as a module — any page scripts relying on `this === window` would break (unlikely but worth documenting).

---

## Proposal 6: Component Introspection API (P3 — Nice-to-have, not critical)

### Assessment
This is the least valuable proposal. LLMs already have `components.json` and `LLM-CHEATSHEET.md` — they read those at session start. An introspection API would only help in live browser sessions where the LLM can call it. In most LLM workflows, editing files is the primary mode, not running console commands.

### If Built
Generate from `components.json` statically rather than maintaining a parallel data structure. A build step that produces a `nui-help.js` module with the structured API data embedded.

```javascript
// Generated at build time from components.json
nui.help('nui-dialog');
// → { tagName, innerElement, attributes, methods, events, programmatic, docPath }
```

---

## Proposal 7: Explicit Init (Won't Build — `nui.ready()` already solves this)

### Assessment
The `nui.ready()` Promise (added May 19) already solves the race condition. Every LLM already knows to use `await nui.ready()` — it's in the cheatsheet's Quick Rules (#5). Making init explicit is a breaking change for minimal benefit. This is solving a problem that documentation already addresses.

---

## Peer Review: GLM (Gemini Language Model) Feedback

*Incorporated into the proposals above. Key refinements:*

| Feedback | Action |
|----------|--------|
| Debug addon should return structured issues with `fix` field | ✅ Added — `{ element, id, message, fix }` in return value |
| Tier 2 auto-wrap risks DOM re-entrancy | ✅ Moved Tier 2 to debug addon validators only (log, don't mutate) |
| `label` attribute needs precedence rules | ✅ Documented: explicit `<button>` wins, `label` falls back, `textContent` last |
| Interaction model: Option C is correct | ✅ Settled on 2-line boundary rule in cheatsheet, no code change |
| Addon auto-loading: hardcode the map | ✅ Single `ADDON_MAP` lookup table instead of per-addon manifests |
| CSP Blob URL: note `this` change | ✅ Documented edge case |
| Introspection API: low value for LLMs | ✅ Deprioritized to P3, won't build unless need arises |
| Explicit init: `nui.ready()` already solves | ✅ Won't build |

---

## Summary: Refined Priority Matrix

| Priority | Proposal | Impact | Risk |
|----------|----------|--------|------|
| **P0** | #1 Debug Addon (`nui-debug`) + structured `fix` output | Eliminates silent failures, LLMs can self-correct | None — addon, zero production code |
| **P0** | #2 Auto-wrap Tier 1 (form components only) | Fixes the #1 LLM mistake pattern | Low — Tier 2 moved to debug addon |
| **P0** | #3 Add 2-line boundary rule to cheatsheet | Resolves `data-action` vs `addEventListener` confusion | None — documentation only |
| **P1** | #4 Addon auto-loading (hardcoded lookup) | Eliminates "forgot CSS import" class of bugs | Low-Medium — dynamic imports in observer |
| **P1** | #5 Replace `new Function()` with Blob URL | Removes CSP fragility | Low-Medium — `this` edge case documented |
| **P3** | #6 Component introspection API | Marginal LLM value — cheatsheet already serves this | Low — generated from components.json |
| — | #7 Explicit init | Won't build — `nui.ready()` already solves the problem | — |

### Build Order

1. **Cheatsheet: add 2 lines** (Proposal 3) — 5 minutes, immediate impact
2. **Debug addon** (Proposal 1) — the foundation. All other validation lives here.
3. **Auto-wrap Tier 1** (Proposal 2) — eliminates the most common silent mistake
4. **Addon auto-loading** (Proposal 4) — kills the "forgot CSS" class of bugs
5. **Blob URL** (Proposal 5) — removes CSP requirements for page scripts
