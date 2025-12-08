# Programmatic Component Creation

## Philosophy

**Declarative HTML is the primary API.** Every NUI component works by writing semantic HTML markup. This is the documented, tested, and recommended approach.

**Programmatic creation is an advanced option** for power users who need to generate UI from data at runtime (dashboards, CMS-driven pages, dynamic forms).

This document captures the patterns for programmatic creation. It's intentionally minimal—only components that genuinely benefit from a data-driven API get one.

---

## Design Principles

### 1. Keep It Slim
Every line of code is a maintenance liability. Programmatic APIs are only added where:
- The HTML structure is complex/recursive (link-list)
- Runtime generation is a common use case (dialogs, banners)
- Writing the HTML manually would be painful and error-prone

If `document.createElement` + `innerHTML` works fine, don't add an abstraction.

### 2. The Setup Function is the Single Source of Truth
The component's `setupFn` (in `connectedCallback`) handles all enhancement logic:
- Adding event listeners
- Wiring ARIA attributes
- Setting up keyboard navigation
- Animations and transitions

**Both paths flow through this:**
- Declarative HTML → `setupFn` enhances it
- Programmatic creation → user sets `innerHTML` → `connectedCallback` → `setupFn` enhances it

There's no separate "render" function. The setup function *is* the renderer. Changes to component behavior happen in one place.

### 3. HTML Structure is Stable
The expected HTML structure for each component is essentially fixed—it's semantic HTML that follows web standards. Changes happen in the *enhancement* layer (the setup function), not the HTML structure.

This means:
- No "map" or "template" system needed
- Playground demos serve as living documentation of expected structure
- The AI can learn structure from examples; logic from the setup functions

### 4. Use Existing Utilities
When building programmatic components, use the `dom` helper with its options object:

```js
// dom.create(tag, options) - generalized element factory
dom.create('div', {
    id: 'my-id',
    class: ['panel', 'active'],       // string or array
    style: { display: 'flex' },       // inline styles
    data: { action: 'submit' },       // data-* attributes
    attrs: { role: 'dialog' },        // HTML attributes
    events: { click: handleClick },   // event listeners
    content: [child1, child2],        // Element(s) or HTML string
    target: parentElement             // auto-append
});

// Shorthand helpers
dom.div('wrapper', [child1, child2]);
dom.button('Save', { class: 'primary', events: { click: save } });
dom.span('Label', 'label-class');
dom.icon('settings');
```

These are used internally. Factories should leverage them instead of raw `document.createElement`.

---

## The Core Insight

The "what a component looks like" knowledge should live in one place: the component's setup function. This function should handle both:

1. **Declarative path**: HTML exists → enhance it
2. **Programmatic path**: Element is empty → generate canonical structure, then enhance

```js
function setupDialog(el) {
    // If empty, generate the canonical structure
    if (!el.querySelector('dialog')) {
        el.innerHTML = `
            <dialog>
                <header><h2></h2></header>
                <main></main>
                <footer></footer>
            </dialog>
        `;
    }
    // Then enhance (add events, ARIA, etc.)
    // ...
}
```

This avoids duplicating structure knowledge between HTML templates and JS generators.

---

## Which Components Get Programmatic APIs?

**Components with `loadData()` or factories:**

| Component | Why | Status |
|-----------|-----|--------|
| `nui-link-list` | Navigation from CMS/API data | ✅ Has `loadData` |
| `nui-dialog` | Runtime alerts/confirms/prompts | ✅ Has factory (`nui.dialog`) |
| `nui-banner` | Runtime notifications | ✅ Has factory (`nui.banner`) |

**Components that DON'T need it:**

| Component | Why |
|-----------|-----|
| `nui-button` | Just write the HTML |
| `nui-icon` | Attributes only (`name="save"`) |
| `nui-tabs` | Static content, write the HTML |
| `nui-accordion` | Static content, write the HTML |
| `nui-code` | Just wrap a `<pre>` |
| `nui-input` | Just wrap an `<input>` |

The decision is pragmatic: if there's a real use case for generating it from data, add an API. Otherwise, declarative HTML is sufficient.

---

## Existing APIs

### nui-link-list

```js
const nav = document.querySelector('nui-link-list');
nav.loadData([
    { label: 'Home', href: '#home', icon: 'home', classes: ['link-home'] },
    { label: 'Settings', classes: ['link-settings'], items: [
        { label: 'Profile', href: '#profile' },
        { label: 'Security', href: '#security' }
    ]}
]);
```

### nui-dialog (via nui.dialog)

```js
// Alert (with default OK button)
await nui.dialog.alert('Title', 'Message');

// Alert with custom button
await nui.dialog.alert('Success!', 'Your file was saved.', {
    buttons: [{ id: 'ok', label: 'Got it', type: 'primary', value: 'ok' }]
});

// Confirm (returns true/false)
const confirmed = await nui.dialog.confirm('Delete?', 'This cannot be undone.');

// Confirm with custom buttons
const result = await nui.dialog.confirm('Save changes?', 'You have unsaved work.', {
    buttons: [
        { id: 'discard', label: 'Discard', type: 'outline', value: false },
        { id: 'save', label: 'Save', type: 'primary', icon: 'save', value: true }
    ]
});

// Prompt with multiple fields
const userData = await nui.dialog.prompt('User Details', 'Please fill in your info', {
    fields: [
        { id: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Enter name' },
        { id: 'email', label: 'Email', type: 'email', required: true },
        { id: 'bio', label: 'Bio', type: 'textarea' },
        { id: 'newsletter', label: 'Subscribe to newsletter', type: 'checkbox', checked: true }
    ],
    buttons: [
        { id: 'cancel', label: 'Cancel', type: 'outline', value: null },
        { id: 'submit', label: 'Submit', type: 'primary', value: 'ok' }
    ]
});
// userData is { name: '...', email: '...', bio: '...', newsletter: true } or null if cancelled
```

### nui-banner (via nui.banner)

```js
// Structured banner with priority, placement, auto-close
nui.banner.create({
    content: 'Your changes have been saved.',
    priority: 'info',       // 'info' | 'alert'
    placement: 'bottom',    // 'top' | 'bottom'
    autoClose: 3000,        // ms, optional
    showCloseButton: true,  // optional
    classes: ['banner-success']
});
```

---

## Data Shapes (Reference)

For components with `loadData`, these are the expected data structures:

### link-list items

```js
{
    label: 'string',      // Display text
    href: 'string',       // URL (optional)
    icon: 'string',       // Icon name (optional)
    action: 'string',     // data-action value (optional)
    classes: ['string'],  // optional CSS classes
    items: [...]          // Nested items (optional)
}
```

### dialog fields (via nui.dialog.prompt)

```js
{
    id: 'fieldId',           // Required: unique identifier, used as key in returned values
    label: 'Field Label',    // Required: display label
    type: 'text',            // 'text' | 'email' | 'password' | 'number' | 'url' | 'tel' | 'textarea' | 'checkbox'
    value: '',               // Initial value (optional)
    placeholder: '',         // Placeholder text (optional)
    required: false,         // HTML5 required validation (optional)
    pattern: '',             // Regex pattern for validation (optional)
    min: 0,                  // Min value for number inputs (optional)
    max: 100,                // Max value for number inputs (optional)
    minlength: 0,            // Min length for text inputs (optional)
    maxlength: 100,          // Max length for text inputs (optional)
    checked: false           // For checkbox type only (optional)
}
```

### dialog buttons (via nui.dialog)

```js
{
    id: 'button-id',      // Required: used for querySelector and as fallback value
    label: 'Button Text', // Required: display text
    type: 'primary',      // 'primary' | 'outline' | 'ghost' (optional, default: 'outline')
    icon: 'icon_name',    // Icon name (optional)
    value: 'ok'           // Value returned when clicked (optional, defaults to id)
                          // For prompt: 'ok' or true returns field values, anything else returns the value directly
}
```

**Default buttons:**
- `alert`: `[{ id: 'nui-dialog-ok', label: 'OK', type: 'primary', value: 'ok' }]`
- `confirm`: `[{ id: 'nui-dialog-cancel', label: 'Cancel', type: 'outline', value: 'cancel' }, { id: 'nui-dialog-ok', label: 'OK', type: 'primary', value: 'ok' }]`
- `prompt`: Same as confirm

### banner (via nui.banner)

```js
{
    content: 'Your changes have been saved.',
    priority: 'info',        // 'info' | 'alert'
    placement: 'bottom',     // 'top' | 'bottom'
    autoClose: 3000,         // ms, optional
    showCloseButton: true,   // optional
    classes: ['banner-success']
}
```

---

## Documentation Strategy

Each component page follows this structure:

1. **Basic Usage** — Declarative HTML examples (primary)
2. **Attributes** — Configuration options
3. **Events** — Custom events emitted
4. **Advanced: Programmatic** — (only if API exists) `loadData` or factory usage

This makes the programmatic option discoverable without confusing beginners.

---

## What We're NOT Building

- ❌ `nui.create()` factory for all components — overkill for declarative-first library
- ❌ `upgradeElement()` / `upgradeTree()` — connectedCallback handles this
- ❌ Standardized data shapes for simple wrappers — just use HTML
- ❌ `loadData` for tabs/accordion — static content, no real use case

The goal is minimal code for maximum utility. If someone needs dynamic tabs, they can write:

```js
const tabs = document.createElement('nui-tabs');
tabs.innerHTML = `
    <nav><button>Tab 1</button><button>Tab 2</button></nav>
    <section>Content 1</section>
    <section>Content 2</section>
`;
container.append(tabs);
// connectedCallback handles the rest
```

No framework needed. Platform APIs work fine.
