# Evaluating Programmatic Patterns & Core Integration in NUI

The `nui.js` core operates on a strict paradigm: **If a component exposes programmatic imperative functions (like `.show()`, `.close()`, `.showModal()`), those actions *must* be equally available declaratively across the whole application via the `data-action` API without requiring the developer to write middle-man generic `nui-action` JS listeners in their page scripts.**

As was seen with `nui-dialog`—which had `.showModal()` but missed its `builtinActionHandlers` mapping—the following process resolves these omissions.

## The Checklist

When reviewing any existing or newly created component, run these checks to ensure complete core availability:

### 1. Identify Component Programmatic Methods
Search inside `NUI/nui.js` within the component's `registerComponent(...)` block. 
Look for DOM node mapping assignments.
```javascript
// Look for assignments like:
element.show = () => { /*...*/ };
element.close = () => { /*...*/ };
element.toggle = () => { /*...*/ };
element.triggerFeature = () => { /*...*/ };
```
*If your component doesn't expose methods directly to the element, you don't need to bind them globally.*

### 2. Verify Mapping in `builtinActionHandlers`
Check the `builtinActionHandlers` constant block (near the top of `NUI/nui.js`). Every public programmatic method must have a string definition mapping. 
The standard naming convention is `componentname-actionname`.

```javascript
const builtinActionHandlers = {
    // Correct bindings examples:
    'banner-show': (t, _, e) => {
        if (t?.show) { e.stopPropagation(); t.show(); return true; }
        return false;
    },
    'dialog-open': (t, _, e) => {
        if (t?.showModal) { e.stopPropagation(); t.showModal(); return true; }
        return false;
    }
};
```
*Failure Point:* If the `data-action` key acts like an orphan event and relies on manual `document.addEventListener('nui-action')` inside a `Playground/pages/` route script to function correctly, it is missing from here.

### 3. Ensure the Click Event is Halted
Note the use of `e.stopPropagation()` in the handler functions. If a developer places a native NUI `data-action` button inside of another interactive element (like a clickable `<nui-card interactive>`), the inner button's action should execute and **halt**, preventing both the core UI update *and* the parent layout action from firing simultaneously.

### 4. Support Optional Payloads
If the component's method accepts an argument (e.g. `element.close = (ret) => { ... }`), ensure your action handler maps the payload property `p`.
```javascript
// Note the 'p' parameter mapping to t.close(p)
'dialog-close': (t, _, e, p) => {
    if (t?.close) { e.stopPropagation(); t.close(p); return true; }
    return false;
},
```
This enables the `data-action="dialog-close:myPayload@#my-dialog"` syntax.

### 5. Validate Declarative Documentation Examples
Review the component's demo page in `Playground/pages/components/`. 
The `Try It` interactive sections *must* be capable of running independently.
- While using `element.addEventListener('nui-action')` in page scripts is perfectly fine and encouraged for handling specific application logic or business rules, standard component interactions (like opening/closing) should always have a fully functional declarative alternative. Users should not be *forced* to write a script just to open a dialog or dismiss a banner.
- Ensure the `data-action="componentname-actionname@#id"` matches the registered map. 

### 6. Sub-Component Internal Listeners (Progressive Enhancement)
For components that map purely visual state triggers (like an accordion or a tab firing its own toggle), check if the interaction is confined strictly to its children (like `.nui-card-flip`). In those specific internal layout actions, ensure the target is safely resolved recursively upwards so a user doesn't physically need an `@#id` hook to trigger inside itself:
```javascript
'card-flip': (t, el) => {
    // If targeted natively via parent, get the parent. Else search upwards.
    const card = (t !== el) ? t : el.closest('nui-card');
    if (card) { card.toggleAttribute('flipped'); return true; }
    return false;
}
```

## LLM-Optimized Documentation Strategy

Because this library and its Playground are heavily consumed by AI assistants and LLMs to learn NUI's semantics, documentation should present features with a clear boundary of responsibility between declarative HTML and programmatic JavaScript.

### 1. Present Declarative (`data-action`) as the Default for UI State
As an LLM, writing declarative HTML is significantly easier, more token-efficient, and less error-prone than wiring up JavaScript event listeners.
- **Less Context Required:** Writing `<button data-action="dialog-open@#my-dialog">` keeps all logic in one file. The agent doesn't need to retain JS DOM query selectors and event listener structures in its transient memory.
- **Fewer Hallucinations:** When forced to write JS to control UI, LLMs can hallucinate framework methodologies (like React/Vue paradigms), or create duplicate IDs. Declarative HTML forces the AI to stay within pure markup.

*Rule:* Let the documentation lead with the `data-action` pattern for all simple UI toggling, closing, opening, and navigating.

### 2. Present Programmatic (JavaScript) purely for Business Logic / Async
LLMs still absolutely need the programmatic API (`.show()`, `.close()`, `.showModal()`), but it should be framed specifically for **conditional logic and asynchronous workflows**.
- Teach the LLM via examples: *"Use the programmatic API when you need to fetch data, await a promise, validate a form, or check user permissions before showing/hiding a component."*
- This establishes a clear boundary: *"I am just building a layout, so I'll use `data-action`"* vs *"I am saving data and showing a success message, so I'll `await fetch(...)` and then call `banner.show()`"*.

### 3. The "Perfect" Documentation Layout for LLMs
To ensure an AI instantly understands how to utilize a component, structure the component pages as follows:

1. **"Declarative Usage (Default)"**: Show the HTML snippet using `data-action`. Provide a Live Demo that works without any injected page scripts.
2. **"Programmatic Usage (Advanced / Async)"**: Show the JS element references (`document.querySelector(...)` -> `element.showModal()`), ideally wrapped in a realistic business logic scenario (like a mock timeout or form validation).
3. **"Available Events"**: Explicitly list the custom events (e.g., `nui-action`, `nui-dialog-close`, `nui-banner-open`) so the LLM knows what strings to listen for when passing NUI states back up into the user's main application logic.