# Form Inputs (`nui-input`, `nui-checkbox`, `nui-radio`, `nui-input-group`)

## Design Philosophy

Form inputs in NUI follow a strict wrapper pattern: enhance the native HTML element to add styling and behaviors while perfectly preserving native browser features.

This is especially critical for form elements because:
- **Native Context**: Native inputs handle baseline validation, keyboard navigation, password managers, and autocomplete automatically.
- **Form Submission**: Standard `<form>` submission relies on real input `name` and `value` properties.
- **Accessibility**: Screen readers expect standard form markup linked via `for` and `id` attributes.

Each wrapper (`<nui-input>`, `<nui-textarea>`, `<nui-checkbox>`, etc.) surrounds the native form element. Declarative attributes like `required`, `pattern`, `minlength`, `type`, `name`, and `value` belong on the **inner native element**, not the NUI wrapper.

---

## 1. Text Inputs (`nui-input`, `nui-textarea`)

Wraps `<input>` (of any text-like type) or `<textarea>`.

### Declarative Usage

```html
<nui-input>
	<input type="text" placeholder="Enter username" required minlength="3">
</nui-input>

<!-- With clear button -->
<nui-input clearable>
	<input type="search" placeholder="Search...">
</nui-input>

<!-- Textarea with auto-resizing -->
<nui-textarea auto-resize max-rows="5">
	<textarea placeholder="Type your message"></textarea>
</nui-textarea>
```

### Component API: `nui-input` & `nui-textarea`

| Attribute / Property | Applies To | Description |
|----------------------|------------|-------------|
| `clearable` *(Attr)* | `<nui-input>` | Adds an "X" button that appears when the input has content. Clicking it clears the field and focuses the input. |
| `auto-resize` *(Attr)*| `<nui-textarea>`| Automatically grows the height of the textarea as the user types, up to `max-rows`. |
| `min-rows` *(Attr)* | `<nui-textarea>` | Minimum number of text lines to display when `auto-resize` is enabled. |
| `max-rows` *(Attr)* | `<nui-textarea>` | Maximum number of lines before the textarea becomes scrollable (when `auto-resize` is enabled). |
| `validate()` *(Method)*| Both | Triggers native form validation logic, updates UI states (`is-valid`, `is-invalid`), shows error tooltips if invalid, and returns a boolean. |
| `clear()` *(Method)* | Both | Programmatically clears the input value and resets validation states. |

### DOM Features

| Feature | Description |
|---------|-------------|
| Inner Element | You must provide an `<input>` or `<textarea>` as the child. All standard HTML validation attributes (`required`, `minlength`, `type="email"`, etc.) should be placed here. |
| `type="search"` | If the inner input is `type="search"`, a search icon is automatically prepended inside the `nui-input`. |
| Validation UI | On blur or input change, the component evaluates `input.validity.valid`. If invalid, `is-invalid` is added, and a warning icon appears natively. |

### Events

| Event | Description |
|-------|-------------|
| `nui-input` | Fires on every keystroke (`input` event). `detail` contains `{ value: string, valid: boolean, name: string }`. |
| `nui-change`| Fires on blur tracking value finalization. `detail` contains `{ value: string, valid: boolean, name: string }`. |
| `nui-clear` | Fires when the field is cleared via the `clearable` button or `clear()` method. |
| `nui-validate`| Fires when explicit validation occurs. `detail` contains `{ valid: boolean, message: string }`. |

---

## 2. Checkables (`nui-checkbox`, `nui-radio`)

Wraps `<input type="checkbox">` and `<input type="radio">`.
Unlike text inputs, these wrappers **must** contain their `<label>` directly inside the wrapper. The wrapper builds the visual indicator (the checkmark box or radio circle) sibling to the input.

### Declarative Usage

```html
<!-- Checkbox -->
<nui-checkbox>
	<input type="checkbox" id="terms" name="terms" required>
	<label for="terms">I accept the terms and conditions</label>
</nui-checkbox>

<!-- Radio Group -->
<nui-radio>
	<input type="radio" id="plan-monthly" name="plan" value="monthly">
	<label for="plan-monthly">Monthly Plan</label>
</nui-radio>
<nui-radio>
	<input type="radio" id="plan-annual" name="plan" value="annual">
	<label for="plan-annual">Annual Plan</label>
</nui-radio>

<!-- Switch / Toggle variant -->
<nui-checkbox variant="switch">
	<input type="checkbox" id="notifications" name="notifications">
	<label for="notifications">Enable push notifications</label>
</nui-checkbox>
```

### Component API: `nui-checkbox` & `nui-radio`

| Attribute / Property | Applies To | Description |
|----------------------|------------|-------------|
| `variant="switch"` *(Attr)* | `<nui-checkbox>` | Renders the checkbox as a sliding toggle switch instead of a square box. |
| `checked` *(Prop)* | Both | Getter/Setter bridging directly to the inner input's `checked` state. |

### Events

| Event | Description |
|-------|-------------|
| `nui-change`| Fires when the checked state changes. `detail` contains `{ checked: boolean, value: string, name: string }`. |

---

## 3. Input Groups (`nui-input-group`)

Wraps any NUI input control (text, select, checkbox) along with a top-level `<label>` and optional description text to create a cohesive semantic UI block.

### Declarative Usage

```html
<nui-input-group>
	<label for="user-email">Email Address</label>
	
	<nui-input>
		<input type="email" id="user-email" name="email" required>
	</nui-input>
	
	<span class="description">We'll never share your email with anyone.</span>
</nui-input-group>
```

### Component API: `nui-input-group`

| Feature | Description |
|---------|-------------|
| ID Generation | If the inner `input` lacks an `id`, and the `<label>` lacks a `for`, `nui-input-group` automatically generates a matching UUID to semantically bind them for screen readers. |
| State Tracking | The group component observes the inner input and adds classes like `is-disabled`, `is-required`, or `has-error` to the `<nui-input-group>` wrapper to style the label and description accordingly. |