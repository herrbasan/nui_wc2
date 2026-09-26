# NUI LLM Cheatsheet

> **🤖 Read this first.** Every component, exact HTML structure, all built-in actions, addon requirements. No philosophy — just patterns.

---

## Start Here — an App in Five Steps

1. **Copy [`nui-boilerplate/`](nui-boilerplate/).** It is the canonical start — do not hand-write a shell from the reference below.
2. **Rename and set the title** — `<title>`, and the `<h1>` in `<div slot="left">`.
3. **Load navigation data** — `document.querySelector('#main-navigation').loadData([...])`, items with `href: '#page=…'` or `'#feature=…'`.
4. **Call `nui.setupRouter({ container, navigation, basePath, defaultPage })`.** Without it, nav `href`s do nothing.
5. **Pick the page pattern** — `nui.registerPage(name, { html, init })` for HTML fragments; `nui.registerType(type, fn)` / `nui.registerFeature(name, fn)` for views generated in JS.

Then read **Quick Rules** below before generating any NUI HTML, and run the self-check at the end of this section before you declare the app done.

### Self-Check Before You Ship

- [ ] `nui-app` children in order, each with its native element or the correct `nui-*` equivalent
- [ ] `nui-content` → **`nui-main`** (not a bare `<main>`)
- [ ] the sidebar's link list carries no explicit `mode` other than `fold`
- [ ] nav items carry route `href`s **and** `setupRouter` ran with `navigation:`
- [ ] addons have **both** the JS import and the CSS link
- [ ] the `nui-app:not(.nui-ready)` gate is present so the shell does not flash
- [ ] `nui.debug.run()` reports clean (see **Debug Addon** below)

---

## Development Tools

### Debug Addon (`nui-debug`)

Validates your HTML for common mistakes and logs structured warnings. **Zero production cost** — just don't import it.

```html
<!-- Development only — remove for production -->
<script type="module" src="NUI/lib/modules/nui-debug.js"></script>
<link rel="stylesheet" href="NUI/css/modules/nui-debug.css">
```

Or enable it from the URL with this loader in your app entry. **It is not a library feature** — NUI core knows nothing about addons, so an arbitrary app will not respond to `?nui-debug` unless it adds this. `nui-boilerplate/js/app.js` ships it:

```javascript
if (new URLSearchParams(location.search).has('nui-debug')) {
  import('NUI/lib/modules/nui-debug.js');
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'NUI/css/modules/nui-debug.css';
  document.head.appendChild(link);
}
```

**What it checks:** missing inner elements, wrong `nui-app` children, `data-action` selector targets, attribute typos, unregistered addon elements, tabs structure.

**Programmatic use:**
```javascript
const result = nui.debug.run();
// { valid: false, count: 3, issues: [{ element: 'nui-button', message: '...', fix: '<nui-button><button>...</button></nui-button>' }] }
```

### Addon Auto-Loading (dev-only)

When `config.debug !== false` (the default), NUI automatically imports JS + CSS for addon elements found in the DOM. You can write `<nui-list></nui-list>` without imports and it just works — with a console message showing the explicit imports to add for production.

---

## Quick Rules (read before generating ANY NUI HTML)

1. **Every NUI component wraps a native HTML element.** In development, NUI auto-creates the inner element if missing (with an info log). For production, always include it explicitly.
2. **Use `data-action` for built-in operations** (dialog-open, tabs-select, banner-close, card-flip, etc.) and simple declarative wiring. **Use `nui.registerPage()` + `addEventListener`** for complex page-specific logic. `nui-click` is an internal event — do not listen for it directly.
3. **`<nui-app>` requires EXACT children in order.** See the structure diagram below.
4. **Addons require BOTH JS import AND CSS.** Core components work without imports.
5. **Use `nui.ready()` before calling programmatic APIs.** `await nui.ready()` — resolves when init is complete.
6. **In page scripts, use `element.querySelector()` not `document.querySelector()`.** The element is the page wrapper.
7. **NEVER style NUI components.** Adding `style=""`, `<style>` blocks, or custom CSS classes to NUI components breaks the design system. The component IS the style — visual variation comes from attributes (`variant`, `type`, `size`, `fill`), not from CSS. If you feel the urge to style something, you are almost certainly using the wrong pattern. See the **Styling Rules** section below.

---

## `nui-app` Required Structure

```
<nui-app>                          ← Activates CSS Grid app shell
├── <nui-skip-links></nui-skip-links>  ← ACCESSIBILITY: auto-generates skip links (a role="navigation" landmark)
├── <nui-app-header>               ← REQUIRED: top bar
│   └── <header>                   ← MUST wrap native <header>
│       ├── <div slot="left">      ← Left zone (menu toggle, title)
│       ├── <div slot="center">    ← Center zone (optional)
│       └── <div slot="right">     ← Right zone (actions, theme toggle)
├── <nui-sidebar behavior="primary">  ← REQUIRED: left nav
│   └── <nav> or <nui-link-list>   ← either is valid; they are different things
├── <nui-content>                  ← REQUIRED: main content area
│   └── <nui-main>                 ← REQUIRED: <nui-main>, NOT a bare <main>
│       └── (your page content)
└── <nui-app-footer> (optional)    ← Bottom bar
    └── <footer>                   ← MUST wrap native <footer>
```

**Every `nui-*` layout wrapper MUST contain its native HTML element.** Missing inner native elements = broken layout with zero visual feedback.

Three of these are invisible in the rendered result, so they are worth stating where the decision is made:

- **`<nui-main>`, not `<main>`, inside `nui-content`.** `nui-main` carries `role="main"` and `id="main-content"` itself, and the app-mode CSS scroll container is `nui-content > nui-main`. A bare `<main>` gets no scroll behaviour and no theme styling for router-injected pages — with no error.
- **`<nav>` and `<nui-link-list>` are not interchangeable.** `nui-link-list` renders `role="tree"` (items are `treeitem`s); it is a widget, not a landmark. `<nav>` provides the navigation landmark. Use the link list alone if the tree is enough, or wrap it in `<nav>` if you want the landmark — but know which you are choosing.
- **`nui-sidebar` forces `mode="fold"`** on an inner link list that has no explicit `mode`. See `## Navigation Components` → `nui-link-list`.

---

## Styling Rules (CRITICAL — read before adding ANY CSS)

### ❌ NEVER do these:

```html
<!-- ❌ Inline styles on NUI components -->
<nui-button style="background: blue; padding: 12px;">...</nui-button>
<nui-card style="border: 2px solid red;">...</nui-card>
<nui-tabs style="margin-top: 20px;">...</nui-tabs>

<!-- ❌ Custom CSS targeting NUI components -->
<style>
  nui-button { border-radius: 12px; }
  .my-custom-card { box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
</style>
```

### ✅ DO these instead:

```html
<!-- ✅ Use component attributes for visual variation -->
<nui-button variant="primary">...</nui-button>
<nui-card>...</nui-card>
<nui-tabs fill>...</nui-tabs>

<!-- ✅ For spacing between YOUR elements, use theme variables on YOUR wrappers -->
<div style="display: flex; gap: var(--nui-space);">
  <nui-button><button>Save</button></nui-button>
  <nui-button variant="outline"><button>Cancel</button></nui-button>
</div>

<!-- ✅ For layout-only CSS, scope under your page class in main.css -->
<!-- In Playground/css/main.css: -->
<!-- .page-my-feature .my-layout { display: grid; gap: var(--nui-space-double); } -->
```

### Decision Tree (follow when tempted to add CSS)

| You want to... | Do this instead |
|---------------|-----------------|
| Change a button's color | Use `variant="primary\|outline\|ghost\|danger\|warning"` |
| Make a button look like an icon | Use `variant="icon"` with `<nui-icon>` inside |
| Change spacing between elements | Use your own wrapper `<div>` with `gap: var(--nui-space)` |
| Add a border to something | Check if `<nui-card>` already does what you want |
| Change font size | Use `<h1>`–`<h6>` or the `lead` class — NUI handles typography |
| Make something full-width | Use `nui-page` `breakout` attribute or `nui-layout` |
| Add a shadow/elevation | NUI components handle elevation — check component docs |
| Tabular data | Use `<nui-table><table>...</table></nui-table>` |
| Still stuck? | Read the component's `.md` doc in `documentation/components/` |

**Rule of thumb:** If you're reaching for CSS, stop and ask: "Is there a NUI component or attribute that already does this?" 95% of the time, the answer is yes.

---

## Theme CSS Variables (complete reference)

If you MUST apply CSS (spacing on your own wrappers, very rare theming), use ONLY these variables. Never invent new ones.

### Spacing
| Variable | Value |
|----------|-------|
| `--nui-space` | `1rem` (base unit) |
| `--nui-space-eighth` | `calc(1rem / 8)` |
| `--nui-space-quarter` | `calc(1rem / 4)` |
| `--nui-space-half` | `calc(1rem / 2)` |
| `--nui-space-double` | `calc(1rem * 2)` |
| `--nui-space-triple` | `calc(1rem * 3)` |
| `--nui-space-quadruple` | `calc(1rem * 4)` |

### Surfaces (light → dark gradient)
| Variable | Role |
|----------|------|
| `--color-base` | Page background |
| `--color-shade1` | Slightly elevated |
| `--color-shade2` | Card, input backgrounds |
| `--color-shade3` | Hover states |
| `--color-shade4` | Active/pressed states |
| `--color-shade5`–`--color-shade9` | Borders, dim text, disabled |

### Text
| Variable | Use |
|----------|-----|
| `--text-color` | Primary text |
| `--text-color-dim` | Secondary text |
| `--color-text` | Alias for primary |
| `--color-text-dim` | Alias for secondary |
| `--color-text-muted` | Muted/disabled text |
| `--color-text-subtle` | Very faint text |

### Borders
| Variable | Use |
|----------|-----|
| `--border-thickness` | Border width (typically `thin`) |
| `--border-radius1` | Small radius (eighth-space) |
| `--border-radius2` | Medium radius (quarter-space) |
| `--border-radius3` | Large radius (half-space) |
| `--border-shade1`–`--border-shade4` | Border colors (light→dark) |

### Accent / Highlight
| Variable | Use |
|----------|-----|
| `--color-highlight` | Primary accent (buttons, links, focus) |
| `--color-highlight-dim` | Muted accent |
| `--color-accent` | Alias for `--color-highlight` |

### Typography
| Variable | Value |
|----------|-------|
| `--font-size-base` | `1rem` |
| `--font-size-xsmall` | `0.8rem` |
| `--font-size-small` | `0.9rem` |
| `--font-size-medium` | `1.2rem` |
| `--font-size-large` | `1.5rem` |
| `--font-size-xlarge` | `2rem` |
| `--system-ui` | System font stack |

### Layout
| Variable | Use |
|----------|-----|
| `--sidebar-width` | Sidebar width (`21rem`) — shared by BOTH left and right sidebars; per-side widths are not supported (use the `sidebar-width` attribute on `<nui-app>` to override) |
| `--app-header-height` | Top bar height (`4rem`) |
| `--nui-form-row-height` | Form control height (`2.5rem`) |
| `--icon-size` | Icon dimensions (`1.2rem`) |

### Other
| Variable | Use |
|----------|-----|
| `--color-white` | Always white |
| `--color-black` | Always black |
| `--shadow-color` | Box-shadow base color |
| `--nui-breakpoint-mobile` | `320px` |
| `--nui-breakpoint-tablet` | `640px` |

---

## Core Components

### nui-button

```html
<!-- ✅ CORRECT (production) -->
<nui-button>
  <button type="button">Click Me</button>
</nui-button>

<!-- ✅ ALSO WORKS (dev — auto-creates inner <button> with info log) -->
<nui-button>Click Me</nui-button>
<nui-button label="Save" variant="primary"></nui-button>

<nui-button variant="primary">
  <button type="submit">Submit</button>
</nui-button>

<nui-button variant="icon">
  <button type="button" aria-label="Close">
    <nui-icon name="close"></nui-icon>
  </button>
</nui-button>

<!-- ❌ WRONG — do not listen for nui-click, use data-action instead -->
<!-- Instead use: -->
<nui-button data-action="my-action">
  <button type="button">Click Me</button>
</nui-button>
```

| Variants | `primary`, `outline`, `ghost`, `danger`/`delete`, `warning`, `icon` |
| State | `state="loading"` (also disable inner button) |
| Method | `.setLoading(bool)` — toggles loading state and disabled |
| Inner element | `<button>` or `<a>` — always set `type="button"` unless it's a submit |
| Auto-wrap | `label="Text"` attribute creates button with that text. Plain `textContent` also works in dev. |

📖 **Full docs:** [`documentation/components/button.md`](documentation/components/button.md)

### nui-input / nui-textarea / nui-checkbox / nui-radio

```html
<!-- ✅ CORRECT — text input -->
<nui-input>
  <input type="text" placeholder="Name">
</nui-input>

<!-- ✅ CORRECT — textarea with auto-resize -->
<nui-textarea auto-resize show-count>
  <textarea maxlength="500" placeholder="Message"></textarea>
</nui-textarea>

<!-- ✅ CORRECT — checkbox -->
<nui-checkbox>
  <input type="checkbox" id="agree">
  <label for="agree">I agree</label>
</nui-checkbox>

<!-- ✅ CORRECT — radio -->
<nui-radio>
  <input type="radio" name="choice" value="a">
  <label>Option A</label>
</nui-radio>

<!-- ❌ WRONG — no inner input -->
<nui-input placeholder="Name"></nui-input>
```

| Attributes | `type`, `size` (`"small"` = compact 2rem), `clearable`, `auto-resize`, `show-count`, `min-rows`, `max-rows` |
| Events | `nui-input`, `nui-change`, `nui-clear` (CustomEvent, bubbles) |
| Methods | `.validate()`, `.clear()`, `.focus()` |

⚠️ **Compact rows:** `<nui-form-row size="small">` puts every child — select, input, tag-input AND button — on 2rem. Declare it on the row, not per control: `nui-button` has no `size` vocabulary (2rem is its base height) while `nui-input`/`nui-select` default to 2.5rem, so per-control `size="small"` can never align a row.

📖 **Full docs:** [`documentation/components/input.md`](documentation/components/input.md)

### nui-select

```html
<!-- ✅ CORRECT -->
<nui-select searchable>
  <select name="country">
    <option value="">Select country...</option>
    <option value="us">United States</option>
    <option value="uk">United Kingdom</option>
  </select>
</nui-select>

<!-- ✅ CORRECT — multi-select -->
<nui-select searchable>
  <select name="languages" multiple>
    <option value="js">JavaScript</option>
    <option value="py">Python</option>
  </select>
</nui-select>

<!-- ✅ CORRECT — opt-in list actions -->
<nui-select searchable select-all clearable>
  <select name="tabs" multiple>
    <option value="a">Alpha</option>
    <option value="b">Beta</option>
  </select>
</nui-select>

<!-- ❌ WRONG — no inner <select> -->
<nui-select>
  <option value="a">A</option>
</nui-select>
```

| Attributes | `searchable`, `mobile-sheet`, `placeholder`, `size` (`"small"` = compact 2rem toolbar variant, host narrows to content), `select-all` (multi only — toggling row acting on the *visible* options), `clearable` ("Clear selection" row; on a single-select only when a none-state exists) |
| Events | `nui-change`, `nui-select`, `nui-open`, `nui-close`, `nui-clear`, `nui-select-all` (`{selected, count}`), `nui-validate` (`{valid, message}`, from `validate()` only) |

ℹ️ **The dropdown is a top-layer popover** (`popover="manual"`, `position: fixed`, viewport-anchored, re-placed on scroll/resize) — so no ancestor's `overflow: hidden` can clip it and no ancestor's `transform` can displace it. Never add `display`/`overflow`/`hidden` rules to `.nui-select-popup`, and delete any consumer workaround that forced `overflow: visible` on a dialog/tabpanel/card to let a dropdown escape. Requires the Popover API (Chrome 114+, Safari 17+, Firefox 125+).
| Methods | `.open()`, `.close()`, `.setValue(v)`, `.getValue()`, `.hasValue()`, `.clear()`, `.setItems(arr)`, `.addItem(v,l)`, `.removeItem(v)`, `.enable()`, `.disable()`, `.loadOptions(asyncFn)` |

⚠️ **None-state — a single select has no "nothing selected".** `getValue()` returns `''` both for the disabled prompt and for an enabled blank none-choice; `.hasValue()` separates them (an *enabled* blank IS a value). The user's way back to "none" is an **enabled** `<option value="">— None —</option>`; a `disabled` blank is a one-way prompt (native: leave it, never return). `clear()` / `setValue(null)` select the none-choice, else the prompt, else the **first** option — never `selectedIndex = -1` (that state has no UI way back and does not survive a browser reset).

⚠️ **Fail loud, not silent:** `setValue(v)` **throws RangeError** for an unknown or disabled value (it used to silently re-select the first option — a typo persisted the wrong value), and `setItems()` / `addItem()` **throw TypeError** on a **leaf** item with no `value`. `.loadOptions()` feeds its result straight to `setItems()`, so map your API shape to `{ value, label }` inside the async function — `{ id, name }` objects used to create options whose value was the literal `"undefined"`. Accepted item shapes are `{ value, label }`, a plain string, and the `{ group, options }` container (`NuiSelectGroup`) — a container has no `value` and is exempt from the check; its options are checked individually.

⚠️ **Populating options: ALWAYS use the programmatic API** — `.setItems()` / `.addItem()`. They are synchronous, dispatch events, and integrate with `.getValue()`/`.setValue()`. Writing `<option>` elements into the inner `<select>` directly is only a tolerated fallback (a MutationObserver rebuilds the dropdown, but no events fire); in older NUI copies it silently does nothing visible. When verifying state, read what the component RENDERS (`.getItems()`, visible rows), not the slotted DOM.

📖 **Full docs:** [`documentation/components/select.md`](documentation/components/select.md)

### nui-slider

```html
<nui-slider>
  <input type="range" min="0" max="100" value="50">
</nui-slider>
```
| Methods | `.getValue()`, `.setValue(val)` |

📖 **Full docs:** [`documentation/components/slider.md`](documentation/components/slider.md)

### nui-tag-input

```html
<nui-tag-input name="tags" editable placeholder="Add tag..."></nui-tag-input>
```
| Attributes | `name` (for form hidden inputs), `editable` (adds text input), `placeholder` |
| Events | `nui-tag-add`, `nui-tag-remove`, `nui-change` |
| Methods | `.addTag(value, label?)`, `.removeTag(value)`, `.hasTag(value)`, `.listTags()`, `.getValues()`, `.clear()`, `.focus()` |

📖 **Full docs:** [`documentation/components/tag-input.md`](documentation/components/tag-input.md)

### nui-dropzone

```html
<nui-dropzone>
  <div data-drop="images">Drop images here</div>
  <div data-drop="documents">Drop documents here</div>
</nui-dropzone>
```
| Events | `nui-dropzone-drop` (detail: `{ zone, dataTransfer }`) |

📖 **Full docs:** [`documentation/components/dropzone.md`](documentation/components/dropzone.md)

---

## Layout Components

### nui-app (Application Shell)

```html
<!-- ✅ CORRECT — EXACT children, each wrapping native element -->
<nui-app content-min-width="55rem">
  <nui-skip-links></nui-skip-links>

  <nui-app-header>
    <header>
      <div slot="left">Logo / Title</div>
      <div slot="center"></div>
      <div slot="right">Actions</div>
    </header>
  </nui-app-header>

  <nui-sidebar behavior="primary">
    <nui-link-list></nui-link-list>
  </nui-sidebar>

  <nui-content>
    <nui-main>Content here</nui-main>
  </nui-content>

  <nui-app-footer>
    <footer>Footer</footer>
  </nui-app-footer>
</nui-app>

<!-- ❌ WRONG — missing required children or wrong order -->
<nui-app>
  <header>Title</header>
  <main>Content</main>
</nui-app>

<!-- ❌ WRONG — nui-content with a bare <main>: nui-main is the scroll container -->
<nui-app>
  <nui-content><main>Content</main></nui-content>
</nui-app>
```

| `<nui-app>` Attributes | `content-min-width="55rem"` (breakpoint trigger), `content-width="48rem"` (max content column width), `sidebar-width="18rem"` (overrides CSS var — **shared by BOTH left and right sidebars**; per-side widths are not supported), `sidebar-breakpoint="none"|"768px"` (override auto breakpoint — applies to BOTH sidebars; for per-side breakpoints, see Legacy Attributes below) |
| `<nui-sidebar>` Attributes | `behavior="primary|secondary|auto|manual"` (breakpoint priority), `position="left|right"` |
| Legacy `<nui-app>` Attributes | `nui-vars-sidebar_width`, `nui-vars-sidebar_force-breakpoint` (left only), `nui-vars-sidebar-right_force-breakpoint` (right only) — still honored. Use the per-side `*_force-breakpoint` variants when left and right need different breakpoints. The new `sidebar-width` attribute takes precedence and applies to both sidebars. |
| `data-action` | `toggle-sidebar` (left), `toggle-sidebar:left`, `toggle-sidebar:right` |
| Events | `nui-sidebar-change` → `detail: { position, state }` where state is `open|closed|forced` |
| Methods | **Drive the sidebar, not its inner link list** — `app.toggleSidebar(pos)`; `setActive` / `getActive` / `getActiveData` / `clearActive` / `clearSubs` are delegated from `nui-sidebar` |
| CSS Vars | `--sidebar-width` (21rem), `--app-header-height` (4rem) |

📖 **Full docs:** [`documentation/components/app.md`](documentation/components/app.md)

### nui-app-header
| Slots | `left`, `center`, `right` |
| Inner | `<header>` (auto-gets `role="banner"`) |

📖 **Full docs:** [`documentation/components/app-header.md`](documentation/components/app-header.md)

### nui-sidebar
| Attributes | `behavior="primary"` (collapses first), `behavior="secondary"`, `behavior="manual"`, `position="right"` |
| Inner | `<nav>` or `<nui-link-list>`. A link list inside a sidebar is **forced to `mode="fold"`** when no `mode` is authored — do not set `mode="tree"` here |
| Delegated | `setActive` / `getActive` / `getActiveData` / `clearActive` / `clearSubs` — call them on the sidebar, not the inner list |

### nui-content / nui-main
| Role | `nui-content` = positioning context; **`nui-main`** = scroll container, and it sets `role="main"` + `id="main-content"` itself |
| Child | `<nui-main>` — **not** a bare `<main>`. App-mode CSS targets `nui-content > nui-main`, so a `<main>` breaks scrolling and router page styling silently |

### nui-page
| Attributes | `breakout` (allows full-width child sections) |
| Use as | Content wrapper in page fragments |

📖 **Full docs:** [`documentation/components/page.md`](documentation/components/page.md)

### nui-card

```html
<nui-card>
  <h3>Card Title</h3>
  <p>Card content</p>
</nui-card>

<nui-card layout="flip" interactive>
  <div class="front">Front content</div>
  <div class="back">Back content</div>
</nui-card>
```
| Attributes | `layout="flip"`, `interactive`, `flipped` |

📖 **Full docs:** [`documentation/components/card.md`](documentation/components/card.md)

### nui-layout

```html
<nui-layout type="grid" columns="3" gap="1rem">
  <div>Item 1</div>
  <div>Item 2</div>
</nui-layout>
```
| Attributes | `type="grid"|"flow"`, `columns`, `gap`, `column-width`, `sort` |

📖 **Full docs:** [`documentation/components/layout.md`](documentation/components/layout.md)

### nui-button-container

```html
<nui-button-container align="end" gap="small" mode="segmented">
  <nui-button><button>Save</button></nui-button>
  <nui-button><button>Cancel</button></nui-button>
</nui-button-container>
```
| Attributes | `align="start|center|end"`, `gap`, `direction="row|column"`, `mode="segmented|single-select"` |
| Event | `nui-change` (for segmented/single-select mode) |

---

## Navigation Components

### nui-tabs

```html
<!-- ✅ CORRECT -->
<nui-tabs>
  <nav>
    <button>Tab 1</button>
    <button>Tab 2</button>
  </nav>
  <section>Panel 1 content</section>
  <section hidden>Panel 2 content</section>
</nui-tabs>

<!-- ❌ WRONG — panels not direct siblings of <nav> -->
<nui-tabs>
  <button>Tab 1</button>
  <div><section>Content</section></div>
</nui-tabs>
```
| Attributes | `fill` (flex fill mode), `no-animation` |
| Event | `nui-tab-change` (detail: `{ tab, panel }`) |
| Method | `.selectTab(indexOrId)` |

📖 **Full docs:** [`documentation/components/tabs.md`](documentation/components/tabs.md)

### nui-accordion

```html
<nui-accordion exclusive>
  <details>
    <summary>Section 1</summary>
    <p>Content 1</p>
  </details>
  <details>
    <summary>Section 2</summary>
    <p>Content 2</p>
  </details>
</nui-accordion>
```
| Attributes | `exclusive`, `no-animation` |
| Methods | `.toggle(index)`, `.expandAll()`, `.collapseAll()` |

📖 **Full docs:** [`documentation/components/accordion.md`](documentation/components/accordion.md)

### nui-link-list

```html
<nui-link-list mode="fold">
  <ul>
    <li class="group-header">
      <button class="group-toggle">Group</button>
    </li>
    <li><a href="#page=docs/intro">Introduction</a></li>
  </ul>
</nui-link-list>
```
| Attributes | `mode="tree|fold"`. **Inside a `nui-sidebar` the mode is forced to `fold`** — authoring `mode="tree"` there is valid on a valid attribute, throws nothing, and looks plausible, but is overwritten |
| Event | `nui-active-change` |
| Methods | `.loadData(data)`, `.setActive(selector)`, `.getActive()`, `.clearActive()`, `.clearSubs()` |

📖 **Full docs:** [`documentation/components/link-list.md`](documentation/components/link-list.md)

### nui-details

```html
<!-- Static content -->
<nui-details summary="License Info">
  <p>Content here.</p>
</nui-details>

<!-- Load from URL (immediate by default, or lazy) -->
<nui-details summary="Changelog" src="/docs/changelog.md"></nui-details>
<nui-details summary="Changelog" src="/docs/changelog.md" lazy></nui-details>
```
| Attributes | `summary="Title"`, `src="/path.md"`, `lazy` (defer fetch until opened) |
| Content types *(src only)* | `.md` → nui-markdown, `.html` → innerHTML, other → text |
| Caching *(src only)* | Content fetched once, reused on subsequent opens |
| Static content | No `src` → children become the body of a closed `<details>`, opened on click. `lazy` is ignored. For a *set* of collapsible sections use `nui-accordion` instead. |

📖 **Full docs:** [`documentation/components/details.md`](documentation/components/details.md)

---

## Overlay Components

### nui-dialog

```html
<!-- ✅ CORRECT — declarative custom dialog -->
<nui-dialog id="my-dialog" placement="center">
  <dialog>
    <form method="dialog">
      <header><h2>Title</h2></header>
      <main>Content here</main>
      <footer>
        <nui-button>
          <button type="button" data-action="dialog-close">Cancel</button>
        </nui-button>
      </footer>
    </form>
  </dialog>
</nui-dialog>

<!-- ✅ CORRECT — page mode (auto-generates header/footer) -->
<nui-dialog id="settings" mode="page" title="Settings" placement="top">
  <p>Custom form content here.</p>
</nui-dialog>
```

**Programmatic API** (use these for alert/confirm/prompt):

```javascript
// Alert
await nui.components.dialog.alert('Title', 'Message', { placement: 'center' });

// Confirm — returns boolean
const ok = await nui.components.dialog.confirm('Delete?', 'Cannot undo.');

// Prompt — returns object or null
const vals = await nui.components.dialog.prompt('Rename', '', {
  fields: [{ id: 'name', label: 'Name', value: 'default' }]
});

// Page dialog — returns { dialog, main, result }
const { dialog, main, result } = nui.components.dialog.page(
  'Settings',              // title
  '<p>Custom HTML</p>',    // htmlContent (NOT subtitle!)
  {
    placement: 'center',
    blocking: false,
    buttons: [
      { label: 'Cancel', value: 'cancel', type: 'outline' },
      { label: 'Save', value: 'save', type: 'primary' }
    ]
  }
);
// result is a Promise that resolves with the button value when closed
const returnValue = await result;
```
| Attributes | `mode="page"`, `title="..."`, `placement="center|top|bottom"`, `blocking` |
| Methods | `.showModal()`, `.show()`, `.close(retVal)`, `.isOpen()` |
| Events | `nui-dialog-open`, `nui-dialog-close`, `nui-dialog-cancel` |
| ⚠️ `page()` signature | `page(title, htmlContent, options)` — 2nd param is HTML content, NOT subtitle |

📖 **Full docs:** [`documentation/components/dialog.md`](documentation/components/dialog.md)

### nui-overlay

```html
<nui-overlay id="loader">
  <dialog>
    <nui-progress type="busy"></nui-progress>
  </dialog>
</nui-overlay>
```

📖 **Full docs:** [`documentation/components/overlay.md`](documentation/components/overlay.md)

---

## Feedback Components

### nui-banner
```javascript
// Programmatic (preferred):
const banner = nui.components.banner.show({
  content: 'File saved successfully.',
  placement: 'bottom',
  priority: 'info',
  autoClose: 5000
});
banner.close(); // manual close
banner.update('New text');
nui.components.banner.hideAll();
```
| Events | `nui-banner-open`, `nui-banner-close` |

📖 **Full docs:** [`documentation/components/banner.md`](documentation/components/banner.md)

### nui-progress

```html
<nui-progress value="60" max="100"></nui-progress>
<nui-progress type="circular" value="75"></nui-progress>
<nui-progress type="busy"></nui-progress>
<nui-progress type="circular-busy"></nui-progress>
```
| Attributes | `type="bar|circular|busy|circular-busy"`, `value`, `max`, `hide-text`, `size` |

📖 **Full docs:** [`documentation/components/progress.md`](documentation/components/progress.md)

---

## Data Components

### nui-table

```html
<nui-table>
  <table>
    <thead><tr><th>Name</th><th>Age</th></tr></thead>
    <tbody><tr><td>Alice</td><td>30</td></tr></tbody>
  </table>
</nui-table>
```

📖 **Full docs:** [`documentation/components/table.md`](documentation/components/table.md)

---

## UI Components

### nui-badge

```html
<nui-badge variant="primary">New</nui-badge>
<nui-badge data-badge="3">
  <button>Notifications</button>
</nui-badge>

<!-- Connection / presence status: coloured dot + pulse while transitional -->
<nui-badge status="online">Online</nui-badge>
<nui-badge status="connecting">Connecting…</nui-badge>
```
| Variants | `primary`, `success`, `danger`, `warning`, `info` |
| Status | `status="online|away|offline|connecting|retrying"` — leading dot; `connecting`/`retrying` pulse. The label carries the meaning (the dot is a pseudo-element, invisible to screen readers) |

📖 **Full docs:** [`documentation/components/badge.md`](documentation/components/badge.md)

### nui-code

```html
<nui-code>
  <pre><code data-lang="javascript">const x = 1;</code></pre>
</nui-code>

<!-- Auto-extracted from script tag -->
<nui-code>
  <script type="example" data-lang="html"><nui-button><button>Hi</button></nui-button></script>
</nui-code>
```

📖 **Full docs:** [`documentation/components/code.md`](documentation/components/code.md)

### nui-icon

```html
<nui-icon name="settings"></nui-icon>
<nui-icon name="close" decorative></nui-icon>
```
| Attribute | `name` (Material Icons sprite name) |

📖 **Full docs:** [`documentation/components/icon.md`](documentation/components/icon.md)

### nui-markdown

```html
<!-- From file -->
<nui-markdown src="path/to/file.md"></nui-markdown>

<!-- Inline -->
<nui-markdown>
  <script type="text/markdown"># Hello **world**</script>
</nui-markdown>
```
| Attribute | `src`, `frontmatter="collapsed|show|open|strip"` (default `collapsed`; `false` disables) |
| Property | `.metadata` → parsed YAML frontmatter object (or `null`); `.frontmatterMode` programmatic override — wins over the `frontmatter` attribute |
| Streaming | `.beginStream()`, `.appendChunk(text)`, `.endStream()` |

**Frontmatter:** a leading `---`-fenced YAML block renders as a metadata card — by default (`frontmatter="collapsed"`) inside a closed, subtle `<details>` so it does not intrude on the body; `frontmatter="open"` (alias `show`) renders it always visible; `frontmatter="strip"` removes it. Programmatic `.frontmatterMode = 'open'` overrides the attribute. The parsed object is always exposed as `.metadata`. Utils: `nui.util.parseYaml`, `nui.util.serializeYaml` (block-style inverse of `parseYaml` — same shapes: nested maps, sequences of scalars/maps, quoted scalars; round-trips losslessly), `nui.util.parseFrontmatter`, `nui.util.renderFrontmatter`, and `markdownToHtml(md, { frontmatter })`.

**MD-Blocks:** understood out of the box, nothing to enable. Root-level `---` starts the next **section** (`<section class="nui-blocks-section">`) and is never drawn — it is not an `<hr>`. `mb:main` defines chrome scopes (`<main class="nui-blocks-main">`, break form, no `mb:/main`). `mb:block repeat=header|footer` defines repeating chrome templates emitted onto `<main>` and cloned onto surfaces by `nui-slides`. `mb:block`/`mb:/block` → `<div class="nui-blocks-block">`; `mb:columns`/`mb:col`/`mb:/columns` → a grid, count from the `col` markers and ratio from `weights`; a block whose **first node** is media (including empty alt `![](...)`) becomes `<figure>`/`<figcaption>`. `mb:var` is data, surfaced as a `<dl class="nui-blocks-var">` card (name + value; a fenced `json`/`text` payload through `<nui-code>`) because this is a display renderer — dropping it would be lossier than a generic preview. `id` → anchor, `label` never rendered. `preset` is `family[:modifier[:variant]]` → `nui-preset-*` / `nui-variant-*` / `nui-size-*` classes, and an unknown segment is dropped rather than fatal. `image:icon` takes its asset from the `icon=` attribute so generic previews stay clean prose. `preset=link` / `link:cta` is an **action row**: the block is a `<nav>` and the links are its direct children — authored list/paragraph scaffolding is dropped. A media destination refused by the trust boundary or by the app's policy hook is never requested and renders as `<span class="nui-md-media-rejected">` carrying the alt text plus `data-refused-destination` / `data-refused-reason`, so a refusal can never be mistaken for a typo. App-level hooks: `nui.util.setMarkdownImagePolicy(fn)` and `nui.util.setMarkdownImageRewrite(fn)`. Directives inside code fences stay literal. Spec: github.com/herrbasan/md-blocks. Only the rendering half is implemented — the editor contract is out of scope.

📖 **Full docs:** [`documentation/components/markdown.md`](documentation/components/markdown.md)

### nui-popover

A **non-modal dialog anchored to its trigger** — the gear-panel shape: interactive content that hangs off the control it belongs to, and no ancestor's `overflow: hidden` can clip it. Its own dropdowns (`nui-select`, `nui-tag-input`) must stay **inside** the element in the DOM: the platform light-dismisses an `auto` popover when a click lands outside it, and DOM ancestry is what makes a nested popup count as inside.

```html
<nui-button variant="icon">
	<button type="button" aria-label="Section options"><nui-icon name="settings"></nui-icon></button>
</nui-button>
<nui-popover aria-label="Section options">
	<nui-form-row size="small">
		<label for="ratio">Aspect ratio</label>
		<nui-select size="small"><select id="ratio"></select></nui-select>
	</nui-form-row>
</nui-popover>
```
| Attributes | `for` (trigger ID; defaults to previous sibling), `placement="top|bottom|left|right|auto|center"`, `offset`, `container` (selector naming the frame), `aria-label`/`aria-labelledby` |
| Sizing | the frame is the page **content region** (`nui-content`/`nui-main`), not the viewport — so it centres on the page, not over the sidebar. Capped at **80% of the frame**; past **60% of its width** it centres in the frame, drops the arrow and caps to 80% of the frame's height with a scroll. `placement="center"` forces it; `container="<sel>"` names the frame and **throws** if it matches nothing |
| Sets on itself | `role="dialog"`, `popover="auto"` — never write these yourself |
| Trigger | must be, or contain, a real `<button>`: it is wired via `popovertarget`, and the component **throws** without one |
| API | `.show()`, `.hide()`, `.toggle()`, `.isOpen()` |
| Events | `nui-popover-open`, `nui-popover-close` (bubble; fire for every path in and out) |
| Manages | `aria-haspopup="dialog"` + `aria-expanded` on the invoker |

⚠️ **Pick by interaction, not by looks.** `nui-tooltip` = non-interactive help on hover (must not contain focusable content). `nui-dialog` = modal and screen-placed (page behind it is inert, no anchoring). `nui-popover` = anchored, interactive, non-blocking.

📖 **Full docs:** [`documentation/components/popover.md`](documentation/components/popover.md)

### nui-tooltip

Hover/focus help text only — **non-interactive by contract**. For a panel of controls, use `nui-popover`.

```html
<button id="btn1">Hover me</button>
<nui-tooltip for="btn1" position="bottom">Help text here</nui-tooltip>
```
| Attributes | `for` (target element ID), `position="top|bottom|left|right|auto"`, `offset` |

📖 **Full docs:** [`documentation/components/tooltip.md`](documentation/components/tooltip.md)

### nui-skip-links

```html
<!-- Auto-generates skip links for nui-app structure -->
<nui-skip-links></nui-skip-links>
```

📖 **Full docs:** [`documentation/components/skip-links.md`](documentation/components/skip-links.md)

---

## Interaction Components

### nui-sortable

```html
<nui-sortable>
  <nui-sortable-item data-id="1">
    <span class="drag-handle"><nui-icon name="drag_indicator"></nui-icon></span>
    <span>Item 1</span>
  </nui-sortable-item>
  <nui-sortable-item data-id="2">
    <span class="drag-handle"><nui-icon name="drag_indicator"></nui-icon></span>
    <span>Item 2</span>
  </nui-sortable-item>
</nui-sortable>
```
| Event | `nui-sortable-change` (detail: `{ order: string[] }`) |
| Methods | `.addItem(htmlString)`, `.getItems()`, `.setItems(arr)`, `.clear()` |

📖 **Full docs:** [`documentation/components/sortable.md`](documentation/components/sortable.md)

---

## Addons (Require Explicit Import)

**⚠️ Every addon needs BOTH JS import AND CSS link. Forgetting either = broken component with zero errors.**

| Addon | JS Import | CSS Link |
|-------|-----------|----------|
| nui-list | `NUI/lib/modules/nui-list.js` | `NUI/css/modules/nui-list.css` |
| nui-lightbox | `NUI/lib/modules/nui-lightbox.js` | `NUI/css/modules/nui-lightbox.css` |
| nui-code-editor | `NUI/lib/modules/nui-code-editor.js` | `NUI/css/modules/nui-code-editor.css` |
| nui-media-player | `NUI/lib/modules/nui-media-player.js` | `NUI/css/modules/nui-media-player.css` |
| nui-wizard | `NUI/lib/modules/nui-wizard.js` | `NUI/css/modules/nui-wizard.css` |
| nui-menu | `NUI/lib/modules/nui-menu.js` | `NUI/css/modules/nui-menu.css` |
| nui-context-menu | `NUI/lib/modules/nui-context-menu.js` | `NUI/css/modules/nui-context-menu.css` |
| nui-rich-text | `NUI/lib/modules/nui-rich-text.js` | `NUI/css/modules/nui-rich-text.css` |
| nui-app-window | `NUI/lib/modules/nui-app-window.js` | `NUI/css/modules/nui-app-window.css` |
| nui-file-tree | `NUI/lib/modules/nui-file-tree.js` | `NUI/css/modules/nui-file-tree.css` |
| nui-slides | `NUI/lib/modules/nui-slides.js` | `NUI/css/modules/nui-slides.css` |
| nui-graph | `NUI/lib/modules/nui-graph.js` | `NUI/css/modules/nui-graph.css` |

```html
<!-- Example: nui-list -->
<link rel="stylesheet" href="NUI/css/modules/nui-list.css">
<script type="module" src="NUI/lib/modules/nui-list.js"></script>
```

📖 **Addon docs:** [`documentation/addons/`](documentation/addons/) — list.md, lightbox.md, code-editor.md, media-player.md, wizard.md, menu.md, context-menu.md, rich-text.md, app-window.md, file-tree.md, slides.md, graph.md

---

## Built-in `data-action` Handlers

These work on any element with `data-action="NAME"`. No JavaScript needed.

| Action | Syntax | What it does |
|--------|--------|-------------|
| `dialog-open` | `data-action="dialog-open@#my-dialog"` | Calls `.showModal()` on target dialog |
| `dialog-show` | `data-action="dialog-show@#my-dialog"` | Calls `.show()` (non-modal) on target dialog |
| `dialog-close` | `data-action="dialog-close"` | Calls `.close()` on closest dialog |
| `overlay-open` | `data-action="overlay-open@#my-overlay"` | Calls `.showModal()` on target overlay |
| `overlay-close` | `data-action="overlay-close"` | Calls `.close()` on closest overlay |
| `select-open` | `data-action="select-open@#my-select"` | Opens target nui-select dropdown |
| `select-close` | `data-action="select-close@#my-select"` | Closes target nui-select dropdown |
| `banner-show` | `data-action="banner-show@#my-banner"` | Shows target nui-banner |
| `banner-close` | `data-action="banner-close"` | Closes closest nui-banner |
| `tabs-select` | `data-action="tabs-select:tabId@#my-tabs"` | Selects tab by ID or index |
| `accordion-toggle` | `data-action="accordion-toggle:0@#my-accordion"` | Toggles accordion section by index |
| `accordion-expand-all` | `data-action="accordion-expand-all@#my-accordion"` | Expands all sections |
| `accordion-collapse-all` | `data-action="accordion-collapse-all@#my-accordion"` | Collapses all sections |
| `card-flip` | `data-action="card-flip@#my-card"` | Toggles `flipped` attribute on nui-card |
| `scroll-to-top` | `data-action="scroll-to-top"` | Smooth scrolls nui-main to top |
| `toggle-sidebar` | `data-action="toggle-sidebar"` | Toggles left sidebar in nui-app |
| `toggle-sidebar` | `data-action="toggle-sidebar:right"` | Toggles right sidebar in nui-app |

**Syntax:** `data-action="name:param@selector"` — param and selector are optional.

**Custom actions:** If no built-in handler matches, NUI dispatches a `nui-action-{name}` CustomEvent that bubbles. Listen for it:

```javascript
document.addEventListener('nui-action-my-custom', (e) => {
  console.log(e.detail.name, e.detail.param, e.detail.target);
});
```

📖 **Full docs:** [`documentation/DOCUMENTATION.md`](documentation/DOCUMENTATION.md) — Declarative Actions section

---

## Public API Reference

```javascript
// Wait for NUI to be ready before calling programmatic APIs
await nui.ready();

// Configuration
nui.configure({ debug: true });

// Utilities
nui.util.createElement('div', { class: 'foo', text: 'hello', target: parent });
nui.util.createSvgElement('circle', { cx: '10', cy: '10', r: '5' });
nui.util.enableDrag(element, callback);      // returns cleanup function
nui.util.storage.set({ name: 'key', value: 'val', target: 'localStorage', ttl: '7-days' });
nui.util.storage.get({ name: 'key', target: 'localStorage' });
nui.util.markdownToHtml('# Hello');           // Markdown → HTML string
nui.util.sortByKey(array, 'prop.sub');        // Sort array by nested key
nui.util.filter({ data, search, prop: ['name'] }); // Filter array by search
nui.util.detectEnv();                         // { isTouch, isMac, isIOS, isSafari, isFF }
nui.util.generateId('prefix');                // Unique ID

// Component factories
nui.components.dialog.alert(title, message, options?)
nui.components.dialog.confirm(title, message, options?)
nui.components.dialog.prompt(title, message, options?)
nui.components.dialog.page(title, htmlContent, options?)  // ⚠️ 2nd param = htmlContent, NOT subtitle
nui.components.banner.show({ content, placement, priority, autoClose })
nui.components.banner.hideAll()
nui.components.dropzone.create(zones, callback, target?)
nui.components.linkList.create(data, options?)
nui.components.icon.create(name, asElement?)

// Router
nui.setupRouter({ container: 'nui-content nui-main', navigation: 'nui-sidebar', defaultPage: 'home' })
nui.createRouter(container, { default: 'page=home', basePath: '/pages' })

// Custom registrations — note the ASYMMETRIC parameter order
nui.registerFeature(name, (wrapper, params) => {})    // feature: element FIRST
nui.registerType(type, (id, params, wrapper) => {})   // type:    id first, wrapper LAST
nui.registerAction(name, (target, el, event, param) => {})
```

⚠️ **`registerFeature` and `registerType` are not interchangeable.** Both take three arguments in a *different order*. Writing a type handler by analogy with a feature handler puts `id` where you expect the element — `wrapper` is then truthy but wrong, so `wrapper.innerHTML = '…'` silently writes into nothing instead of throwing.

📖 **Full API docs:** [`documentation/DOCUMENTATION.md`](documentation/DOCUMENTATION.md) — API Structure section

---

## Page Logic Pattern

**Primary (recommended):** `nui.registerPage()` — standard JS module, no custom script types, no CSP issues.

```javascript
// In your app's main module (e.g., js/page-init.js):
import { nui } from './NUI/nui.js';

nui.registerPage('my-page', {
    html: 'my-page.html',
    init(element, params, nui) {
        element.querySelector('nui-button').addEventListener('click', () => {
            nui.components.dialog.alert('Hello', 'Clicked!');
        });
    }
});
```

**Legacy (still supported, not recommended for new code):** `<script type="nui/page">` inside HTML fragments. Requires `'unsafe-eval'` in CSP.

---

## Boilerplate (New Project)

**Copy [`nui-boilerplate/`](nui-boilerplate/) — do not transcribe a shell from this file.**

That folder is the canonical shell and the thing to base a new app on. It ships the left sidebar driven by `nui-link-list`, a `<nui-main>` content area, a right sidebar, the `?nui-debug` opt-in, and `js/app.js` wiring navigation + router. Keeping a second copy of the shell here would only give you two bases to choose between, which is exactly the coin flip this section used to cause.

Its shell, reduced to the load-bearing parts:

```html
<nui-app sidebar-width="20rem" content-width="60rem" content-min-width="50rem">
  <nui-skip-links></nui-skip-links>

  <nui-app-header>
    <div slot="left">
      <nui-button variant="icon">
        <button type="button" data-action="toggle-sidebar" aria-label="Toggle navigation">
          <nui-icon name="menu">☰</nui-icon>
        </button>
      </nui-button>
      <h1>My App</h1>
    </div>
  </nui-app-header>

  <nui-sidebar behavior="primary" id="nav-sidebar">
    <nui-link-list id="main-navigation"></nui-link-list>
  </nui-sidebar>

  <nui-content>
    <nui-main></nui-main>
  </nui-content>
</nui-app>
```

Note the two things a shell is most often got wrong on: the content child is `<nui-main>`, and the icon button carries an explicit inner `<button>` with an `aria-label` (the auto-created inner button is a development affordance — production markup spells it out).
