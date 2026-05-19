# NUI LLM Cheatsheet

> **🤖 Read this first.** Every component, exact HTML structure, all built-in actions, addon requirements. No philosophy — just patterns.

---

## Quick Rules (read before generating ANY NUI HTML)

1. **Every NUI component wraps a native HTML element.** You CANNOT use `<nui-button>Click</nui-button>`. You MUST put a real `<button>` inside.
2. **Use `data-action` for click handling, NOT `addEventListener('nui-click', ...)`.**
3. **`<nui-app>` requires EXACT children in order:** `<nui-app-header>`, `<nui-sidebar>`, `<nui-content>`, optionally `<nui-app-footer>`.
4. **Addons require BOTH JS import AND CSS.** Core components work without imports.
5. **Use `nui.ready()` before calling programmatic APIs.** `await nui.ready()` — resolves when init is complete.
6. **Only use CSS variables from `nui-theme.css`.** Never invent new variables. Space: `--nui-space`, `--nui-space-half`, `--nui-space-double`. Colors: `--color-base`, `--color-shade1` through `--color-shade9`. Borders: `--border-thickness`, `--border-radius1`/`2`/`3`.
7. **In page scripts, use `element.querySelector()` not `document.querySelector()`.** The element is the page wrapper.

---

## Core Components

### nui-button

```html
<!-- ✅ CORRECT -->
<nui-button>
  <button type="button">Click Me</button>
</nui-button>

<nui-button variant="primary">
  <button type="submit">Submit</button>
</nui-button>

<nui-button variant="icon">
  <button type="button" aria-label="Close">
    <nui-icon name="close"></nui-icon>
  </button>
</nui-button>

<!-- ❌ WRONG — no inner button -->
<nui-button>Click Me</nui-button>

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

| Attributes | `type`, `clearable`, `auto-resize`, `show-count`, `min-rows`, `max-rows` |
| Events | `nui-input`, `nui-change`, `nui-clear` (CustomEvent, bubbles) |
| Methods | `.validate()`, `.clear()`, `.focus()` |

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

<!-- ❌ WRONG — no inner <select> -->
<nui-select>
  <option value="a">A</option>
</nui-select>
```

| Attributes | `searchable`, `mobile-sheet`, `placeholder` |
| Events | `nui-change`, `nui-select`, `nui-open`, `nui-close`, `nui-clear` |
| Methods | `.open()`, `.close()`, `.setValue(v)`, `.getValue()`, `.clear()`, `.setItems(arr)`, `.addItem(v,l)`, `.removeItem(v)`, `.enable()`, `.disable()`, `.loadOptions(asyncFn)` |

### nui-slider

```html
<nui-slider>
  <input type="range" min="0" max="100" value="50">
</nui-slider>
```
| Methods | `.getValue()`, `.setValue(val)` |

### nui-tag-input

```html
<nui-tag-input name="tags" editable placeholder="Add tag..."></nui-tag-input>
```
| Attributes | `name` (for form hidden inputs), `editable` (adds text input), `placeholder` |
| Events | `nui-tag-add`, `nui-tag-remove`, `nui-change` |
| Methods | `.addTag(value, label?)`, `.removeTag(value)`, `.hasTag(value)`, `.listTags()`, `.getValues()`, `.clear()`, `.focus()` |

### nui-dropzone

```html
<nui-dropzone>
  <div data-drop="images">Drop images here</div>
  <div data-drop="documents">Drop documents here</div>
</nui-dropzone>
```
| Events | `nui-dropzone-drop` (detail: `{ zone, dataTransfer }`) |

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
    <nav>Navigation</nav>
  </nui-sidebar>

  <nui-content>
    <main>Content here</main>
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

<!-- ❌ WRONG — nui-content missing inner <main> -->
<nui-app>
  <nui-content>Content</nui-content>
</nui-app>
```

### nui-app-header
| Slots | `left`, `center`, `right` |
| Inner | `<header>` (auto-gets `role="banner"`) |

### nui-sidebar
| Attributes | `behavior="primary"` (collapses first), `behavior="secondary"`, `behavior="manual"`, `position="right"` |
| Inner | `<nav>` or `<nui-link-list>` |

### nui-content / nui-main
| Role | `nui-content` = positioning context, `nui-main` = scroll container (gets `role="main"`) |

### nui-page
| Attributes | `breakout` (allows full-width child sections) |
| Use as | Content wrapper in page fragments |

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

### nui-layout

```html
<nui-layout type="grid" columns="3" gap="1rem">
  <div>Item 1</div>
  <div>Item 2</div>
</nui-layout>
```
| Attributes | `type="grid"|"flow"`, `columns`, `gap`, `column-width`, `sort` |

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
| Attributes | `mode="tree|fold"` |
| Event | `nui-active-change` |
| Methods | `.loadData(data)`, `.setActive(selector)`, `.getActive()`, `.clearActive()`, `.clearSubs()` |

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

### nui-overlay

```html
<nui-overlay id="loader">
  <dialog>
    <nui-progress type="busy"></nui-progress>
  </dialog>
</nui-overlay>
```

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

### nui-progress

```html
<nui-progress value="60" max="100"></nui-progress>
<nui-progress type="circular" value="75"></nui-progress>
<nui-progress type="busy"></nui-progress>
<nui-progress type="circular-busy"></nui-progress>
```
| Attributes | `type="bar|circular|busy|circular-busy"`, `value`, `max`, `hide-text`, `size` |

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

---

## UI Components

### nui-badge

```html
<nui-badge variant="primary">New</nui-badge>
<nui-badge data-badge="3">
  <button>Notifications</button>
</nui-badge>
```
| Variants | `primary`, `success`, `danger`, `warning`, `info` |

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

### nui-icon

```html
<nui-icon name="settings"></nui-icon>
<nui-icon name="close" decorative></nui-icon>
```
| Attribute | `name` (Material Icons sprite name) |

### nui-markdown

```html
<!-- From file -->
<nui-markdown src="path/to/file.md"></nui-markdown>

<!-- Inline -->
<nui-markdown>
  <script type="text/markdown"># Hello **world**</script>
</nui-markdown>
```
| Streaming | `.beginStream()`, `.appendChunk(text)`, `.endStream()` |

### nui-tooltip

```html
<button id="btn1">Hover me</button>
<nui-tooltip for="btn1" position="bottom">Help text here</nui-tooltip>
```
| Attributes | `for` (target element ID), `position="top|bottom|left|right|auto"`, `offset` |

### nui-skip-links

```html
<!-- Auto-generates skip links for nui-app structure -->
<nui-skip-links></nui-skip-links>
```

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

```html
<!-- Example: nui-list -->
<link rel="stylesheet" href="NUI/css/modules/nui-list.css">
<script type="module" src="NUI/lib/modules/nui-list.js"></script>
```

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

// Custom registrations
nui.registerFeature(name, initFn)    // Register a feature handler
nui.registerAction(name, handler)     // Register a data-action handler
nui.registerType(type, handler)       // Register a custom route type
```

---

## Page Script Pattern (Playground)

```html
<!-- Inside a page fragment at Playground/pages/components/foo.html -->
<script type="nui/page">
function init(element, params, nui) {
    // Runs ONCE when page is first loaded
    // element = the page wrapper — ALWAYS scope queries to it
    const button = element.querySelector('nui-button');

    element.show = (params) => {
        // Runs every time page becomes active (after init)
    };

    element.hide = () => {
        // Runs every time page becomes inactive — cleanup timers, listeners
    };
}
</script>
```

**⚠️ CSP:** Page scripts require `script-src 'unsafe-eval'` in your Content Security Policy.

---

## Boilerplate (New Project)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="NUI/css/nui-theme.css">
  <script type="module" src="NUI/nui.js"></script>
</head>
<body>
  <nui-app content-min-width="55rem">
    <nui-skip-links></nui-skip-links>
    <nui-app-header>
      <header>
        <div slot="left"><h1>My App</h1></div>
      </header>
    </nui-app-header>
    <nui-sidebar>
      <nav>Nav here</nav>
    </nui-sidebar>
    <nui-content>
      <main>Content here</main>
    </nui-content>
  </nui-app>
</body>
</html>
```
