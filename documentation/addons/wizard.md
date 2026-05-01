# nui-wizard

## Setup

This is an addon module. Load both the JS and CSS before use:

```html
<link rel="stylesheet" href="NUI/css/modules/nui-wizard.css">
<script type="module" src="NUI/lib/modules/nui-wizard.js"></script>
```

## Design Philosophy

The `nui-wizard` component is a Light DOM wrapper that takes `<nui-wizard-step>` children and automatically injects a navigation header and action footer containing Next/Back/Cancel/Complete buttons. It allows segmenting complex forms or configuration views into sequential logical steps.

## Declarative Usage

### Two Operation Modes
The `mode` attribute on `<nui-wizard>` determines constraints:
1. **`mode="required"` (default):** Steps are sequential. The Next button relies on the browser's native `form.reportValidity()`. If a step contains a `<form>`, it will be validated before allowing navigation to the next step. Future steps cannot be directly clicked in the navigation dots.
2. **`mode="free"`:** Unconstrained mode. All steps in the progress nav are clickable, and navigation does not check HTML5 form validation.

### Structure
```html
<nui-wizard mode="required">
    <nui-wizard-step data-title="Profile">
        <form>
            <!-- Step content -->
            <input type="text" required>
        </form>
    </nui-wizard-step>
    <nui-wizard-step data-title="Settings">
        <p>Step 2 content</p>
    </nui-wizard-step>
</nui-wizard>
```

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `mode` | string | `"required"` | `"required"` enforces sequential validation; `"free"` allows unconstrained navigation. |

### Class Variants

None

## Programmatic Usage

### Step Status API
Each `<nui-wizard-step>` supports a `status` attribute that visually reflects validation state in the navigation dots. Four status values are available:

| Status | Visual | Use Case |
|--------|--------|----------|
| `valid` | Green circle with checkmark | Step data is verified and saved |
| `invalid` | Red circle with X mark | Validation failed |
| `warning` | Yellow circle with ! | Partial or soft validation issue |
| `pending` | Spinning circle | Async validation in progress |

### Setting Status

**Declarative** (HTML attribute):
```html
<nui-wizard-step status="valid" data-title="Profile">...</nui-wizard-step>
```

**Programmatic** (JS method):
```js
const step = wizard.querySelector('nui-wizard-step');
step.setStatus('valid');                          // mark as valid
step.setStatus('invalid', 'Email already taken'); // mark as invalid with message
step.setStatus('warning', 'Saved as draft');      // mark with warning
step.clearStatus();                               // remove all status
```

Status messages appear as tooltips when hovering over the nav dot.

### Inspecting Status
```js
step.getStatus();  // returns 'valid', 'invalid', 'warning', 'pending', or ''
```

### Validation Strategies

#### Strategy 1: Native HTML5 Validation (Default)
Works automatically in `mode="required"`. The wizard calls `form.reportValidity()` on any `<form>` inside the current step before advancing.

```html
<nui-wizard-step data-title="Profile">
    <form>
        <input type="text" required minlength="2">
        <input type="email" required>
    </form>
</nui-wizard-step>
```

#### Strategy 2: Custom Sync Validation via `before-next`
Listen to `nui-wizard-before-next`, run your logic, and call `e.preventDefault()` to block or let it pass:

```js
wizard.addEventListener('nui-wizard-before-next', (e) => {
    const step = wizard.steps[e.detail.from];
    if (!myCustomCheck(step)) {
        e.preventDefault();
        step.setStatus('invalid', 'Custom validation failed');
    }
});
```

If you handle validation yourself, set `e.detail.handled = true` to skip the built-in HTML5 form check.

#### Strategy 3: Async Validation (Promise)
Assign a Promise to `e.detail.promise`. The wizard auto-manages busy state:

```js
wizard.addEventListener('nui-wizard-before-next', (e) => {
    e.detail.promise = fetch('/api/validate', { method: 'POST' })
        .then(r => {
            if (!r.ok) throw new Error('Server validation failed');
            return r.json();
        });
});
```
- Wizard enters busy state while the Promise resolves
- Navigation advances on success; returns `false` from the handler to block
- On rejection, the wizard dispatches `nui-wizard-validation-error` and stays on the current step

#### Strategy 4: Manual Status Control
Set step status directly whenever it makes sense for your UX:

```js
input.addEventListener('blur', () => {
    const step = input.closest('nui-wizard-step');
    if (input.value.length < 3) {
        step.setStatus('invalid', 'Too short');
    } else {
        step.setStatus('valid');
    }
});
```

### Wizard-Level Validation Helpers

| Method | Parameters | Return Type | Description |
|--------|------------|-------------|-------------|
| `validateStep(index)` | `number` | `boolean` | Validate a specific step (runs `form.reportValidity()` + sets status). |
| `validateAllSteps()` | none | `boolean` | Validate all steps, returns `true` if all valid. |
| `reset()` | none | `void` | Clear all statuses and return to step 0. |
| `goTo(index)` | `number` | `void` | Navigate programmatically to a specific step index. |
| `setBusy(isBusy)` | `boolean` | `void` | Enable/disable wizard controls (used during async operations). |

### Advanced Logic: Intercepting Navigation
Users can intercept the next action to perform async checks (like saving step data to a server) using the `nui-wizard-before-next` event, which is cancelable (`e.preventDefault()`).

```js
wizard.addEventListener('nui-wizard-before-next', async (e) => {
    e.preventDefault(); // Pause navigation
    wizard.setBusy(true); // Disable controls
    await fetch('/api/save'); 
    wizard.setBusy(false);
    wizard.goTo(e.detail.to); // Advance programmatically
});
```

### Dialog Embedding
Wizards can operate inside page flow, but are often placed inside `<nui-dialog mode="page">`. In such cases, listen for `nui-wizard-cancel` and `nui-wizard-complete` events to close the dialog container.

## Events

| Event | Type | Detail | Description |
|-------|------|--------|-------------|
| `nui-wizard-before-next` | `CustomEvent` | `{ from: number, to: number, handled: boolean, promise: Promise \| null }` | Fired before navigating to the next step. Cancelable (`e.preventDefault()`). Set `e.detail.promise` for async validation. Set `e.detail.handled = true` to skip built-in HTML5 validation. |
| `nui-wizard-step-change` | `CustomEvent` | `{ current: number }` | Fired after the active step changes. |
| `nui-wizard-cancel` | `CustomEvent` | none | Fired when the user clicks Cancel. |
| `nui-wizard-complete` | `CustomEvent` | none | Fired when the user clicks Complete on the final step. Cancelable. |
| `nui-wizard-validation-error` | `CustomEvent` | `{ step: number, message: string }` | Fired when async validation (via `e.detail.promise`) rejects. |

## When to Use

Use `nui-wizard` when you need to break a complex process into digestible steps:
- Multi-step forms (checkout, onboarding, configuration)
- Setup wizards with validation at each stage
- Processes where step completion status should be visible

Avoid for:
- Simple single-page forms (overkill)
- Content that should be skippable or non-linear without clear progression
