# Input Components Implementation Plan

## Overview

This document outlines the plan for implementing form input components for the NUI library. The goal is to create beautiful, accessible input components that leverage native browser functionality while providing enhanced styling and useful features.

---

## Component Architecture

### Design Principles

1. **Native First**: Use native `<input>`, `<textarea>`, `<label>` elements inside custom element wrappers
2. **Standalone Capability**: Each input component works independently without a group wrapper
3. **Progressive Enhancement**: Components enhance native elements, don't replace them
4. **Accessibility**: Proper ARIA attributes, keyboard navigation, screen reader support
5. **Validation**: Leverage native constraint validation API, enhance where lacking

### Component Hierarchy

```
<nui-input-group>          <!-- Optional label/description wrapper -->
    <label>Field Label</label>
    <nui-input>            <!-- or nui-textarea, nui-checkbox, nui-radio -->
        <input type="...">
    </nui-input>
    <span class="description">Helper text</span>
</nui-input-group>
```

---

## Components

### 1. `<nui-input-group>` - Label Wrapper

**Purpose**: Structural wrapper that adds a label and optional description to any input component.

**HTML Structure**:
```html
<nui-input-group>
    <label>Email Address</label>
    <nui-input>
        <input type="email" required>
    </nui-input>
    <span class="description">We'll never share your email</span>
</nui-input-group>
```

**Features**:
- Label styling (uppercase, muted color, small font)
- Description styling (small, muted, below input)
- Error message display area
- Auto-associates `<label>` with nested input via `for`/`id` if not set
- Layout: flexbox column with consistent gaps

**Attributes**:
- None required - purely structural

**CSS Classes Applied**:
- `.has-error` - when nested input is invalid
- `.is-disabled` - when nested input is disabled
- `.is-required` - when nested input has `required` attribute

**JavaScript Logic**:
- `connectedCallback`: Find nested label and input, auto-associate if needed
- Observe nested input for validation state changes
- Minimal logic - primarily CSS-driven

---

### 2. `<nui-input>` - Text Input Component

**Purpose**: Enhanced single-line text input with styling and optional features.

**HTML Structure**:
```html
<!-- Basic -->
<nui-input>
    <input type="text" placeholder="Type here...">
</nui-input>

<!-- With clear button -->
<nui-input clearable>
    <input type="search" value="Search term">
</nui-input>

<!-- With icon (future) -->
<nui-input>
    <nui-icon name="search"></nui-icon>
    <input type="search">
</nui-input>
```

**Supported Input Types**:
- `text`, `email`, `password`, `number`, `search`, `url`, `tel`, `date`, `time`, `datetime-local`

**Features**:
- Visual styling matching theme (background, border, focus states)
- Focus ring animation
- Clear button (× icon) when `clearable` attribute present and input has value
- Validation state classes (`.is-valid`, `.is-invalid`)
- Disabled/readonly visual states
- Password visibility toggle for `type="password"` (optional enhancement)

**Attributes**:
| Attribute | Type | Description |
|-----------|------|--------------|
| `clearable` | boolean | Shows clear button when input has value |

**Events**:
- `nui-input` - Fires on input, includes `{ value, valid, name }` in detail
- `nui-change` - Fires on change (blur), includes `{ value, valid, name }` in detail
- `nui-clear` - Fires when clear button clicked, includes `{ name }` in detail

**Accessibility**:
- Native input handles keyboard
- Clear button has `aria-label="Clear input"`
- `aria-invalid` set based on validation state
- `aria-describedby` links to error message if present

**JavaScript Logic**:
```javascript
// Pseudocode
connectedCallback:
    - Find nested <input>
    - Add event listeners (input, change, focus, blur)
    - If clearable, create clear button element (reuse pattern)
    - Set up validation observer

onInput:
    - Update clear button visibility
    - Check validation state
    - Dispatch nui-input event

onClear:
    - Clear input value
    - Focus input
    - Dispatch nui-clear event

onBlur:
    - Run validation
    - Update validation classes
    - Dispatch nui-change event
```

---

### 3. `<nui-textarea>` - Multiline Text Component

**Purpose**: Enhanced textarea with auto-resize and character count features.

**HTML Structure**:
```html
<!-- Basic -->
<nui-textarea>
    <textarea placeholder="Your message..."></textarea>
</nui-textarea>

<!-- Auto-resize -->
<nui-textarea auto-resize>
    <textarea></textarea>
</nui-textarea>

<!-- With character count -->
<nui-textarea show-count maxlength="500">
    <textarea maxlength="500"></textarea>
</nui-textarea>
```

**Features**:
- Same visual styling as `<nui-input>`
- Auto-resize: grows with content up to max-height
- Character count display (e.g., "123 / 500")
- Min/max rows configuration
- Validation states

**Attributes**:
| Attribute | Type | Description |
|-----------|------|--------------|
| `auto-resize` | boolean | Textarea grows with content |
| `min-rows` | number | Minimum height in rows (default: 3) |
| `max-rows` | number | Maximum height in rows (default: 10) |
| `show-count` | boolean | Display character count |

**Events**:
- `nui-input` - Fires on input
- `nui-change` - Fires on change

**JavaScript Logic**:
```javascript
// Auto-resize implementation
onInput:
    - Reset height to auto
    - Set height to scrollHeight
    - Clamp between min-rows and max-rows
    - Update character count if show-count
```

---

### 4. `<nui-checkbox>` - Checkbox Component

**Purpose**: Custom-styled checkbox with native accessibility.

**HTML Structure**:
```html
<!-- Single checkbox -->
<nui-checkbox>
    <input type="checkbox" name="agree" value="yes">
    <label>I agree to the terms</label>
</nui-checkbox>

<!-- Checked by default -->
<nui-checkbox>
    <input type="checkbox" checked>
    <label>Subscribe to newsletter</label>
</nui-checkbox>

<!-- Indeterminate (set via JS) -->
<nui-checkbox>
    <input type="checkbox" id="parent">
    <label>Select all</label>
</nui-checkbox>
```

**Visual Design**:
- Hide native checkbox visually (not `display: none` - accessibility)
- Custom square box (border, background)
- Checkmark icon on checked (SVG or CSS)
- Indeterminate dash icon
- Focus ring around custom box
- Inline layout: `[checkbox] Label text`

**Features**:
- Custom visual styling
- Checked state animation (subtle scale or fade)
- Indeterminate state support
- Disabled state (muted colors)
- Keyboard accessible (Space to toggle - native)

**Attributes**:
- None required

**Events**:
- `nui-change` - Fires on change, includes `{ checked, value, name }` in detail

**CSS Approach**:
```css
nui-checkbox {
    display: inline-flex;
    align-items: center;
    gap: var(--nui-space-half);
    cursor: pointer;
}

nui-checkbox input[type="checkbox"] {
    /* Visually hidden but accessible */
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
}

nui-checkbox .check-box {
    /* Custom checkbox visual */
    width: 1.25rem;
    height: 1.25rem;
    border: 2px solid var(--nui-input-border);
    border-radius: 3px;
    background: var(--nui-input-bg);
    display: flex;
    align-items: center;
    justify-content: center;
}

nui-checkbox input:checked + label .check-box,
nui-checkbox input:checked ~ .check-box {
    background: var(--color-primary);
    border-color: var(--color-primary);
}

nui-checkbox input:focus-visible ~ .check-box {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
}
```

**JavaScript Logic**:
```javascript
connectedCallback:
    - Find nested input[type="checkbox"] and label
    - Create custom .check-box element with checkmark SVG
    - Insert after input or before label
    - Add click handler on component to toggle checkbox

// Note: Most behavior is CSS-driven using :checked pseudo-class
```

---

### 5. `<nui-radio>` - Radio Button Component

**Purpose**: Custom-styled radio button with native accessibility.

**HTML Structure**:
```html
<nui-input-group>
    <label>Choose an option:</label>
    <nui-radio>
        <input type="radio" name="choice" value="a">
        <label>Option A</label>
    </nui-radio>
    <nui-radio>
        <input type="radio" name="choice" value="b">
        <label>Option B</label>
    </nui-radio>
    <nui-radio>
        <input type="radio" name="choice" value="c" disabled>
        <label>Option C (disabled)</label>
    </nui-radio>
</nui-input-group>
```

**Visual Design**:
- Hide native radio visually
- Custom circle (border, background)
- Inner filled circle on checked
- Focus ring around custom circle
- Inline layout: `(radio) Label text`

**Features**:
- Custom visual styling
- Selection animation (inner dot scales in)
- Disabled state
- Keyboard accessible (Arrow keys to navigate - native)

**Attributes**:
- None required

**Events**:
- `nui-change` - Fires on change, includes `{ checked, value, name }` in detail

**CSS Approach**:
```css
nui-radio {
    display: inline-flex;
    align-items: center;
    gap: var(--nui-space-half);
    cursor: pointer;
}

nui-radio input[type="radio"] {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
}

nui-radio .radio-circle {
    width: 1.25rem;
    height: 1.25rem;
    border: 2px solid var(--nui-input-border);
    border-radius: 50%;
    background: var(--nui-input-bg);
    display: flex;
    align-items: center;
    justify-content: center;
}

nui-radio .radio-circle::after {
    content: '';
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background: var(--color-primary);
    transform: scale(0);
    transition: transform 0.15s ease;
}

nui-radio input:checked ~ .radio-circle::after {
    transform: scale(1);
}
```

---

## Validation Strategy

### Native Constraint Validation

Leverage the browser's built-in validation:

```javascript
const input = element.querySelector('input');

// Check validity
input.validity.valid          // Overall valid?
input.validity.valueMissing   // Required but empty?
input.validity.typeMismatch   // Wrong format (email, url)?
input.validity.patternMismatch // Doesn't match pattern?
input.validity.tooShort       // Below minlength?
input.validity.tooLong        // Above maxlength?
input.validity.rangeUnderflow // Below min?
input.validity.rangeOverflow  // Above max?

// Get error message
input.validationMessage       // Browser's error message

// Custom message
input.setCustomValidity('Custom error message');
```

### Validation Display

- Show validation state on blur (not on every keystroke)
- Option to validate on input for real-time feedback
- Error message displayed below input (inside `<nui-input-group>`)
- Use `aria-invalid` and `aria-describedby` for accessibility

### Custom Validation

Allow custom validation functions:

```html
<nui-input id="username">
    <input type="text" required minlength="3">
</nui-input>

<script>
document.getElementById('username').validate = async (value) => {
    if (await checkUsernameExists(value)) {
        return 'Username already taken';
    }
    return null; // Valid
};
</script>
```

---

## Doer Actions

Input components register useful Doer actions for cross-component commands:

| Action | Target | Description |
|--------|--------|-------------|
| `focus@nui-input` | `<nui-input>` | Focus the nested input |
| `clear@nui-input` | `<nui-input>` | Clear the input value and focus |
| `validate@nui-input` | `<nui-input>` | Trigger validation and update state |
| `focus@nui-textarea` | `<nui-textarea>` | Focus the nested textarea |
| `clear@nui-textarea` | `<nui-textarea>` | Clear the textarea value |
| `reset@nui-input-group` | `<nui-input-group>` | Reset all nested inputs to default |

**Usage Examples**:
```javascript
// Focus email field from another component
nui.doer.do('focus@nui-input', emailField);

// Clear search after submission
nui.doer.do('clear@nui-input', searchField);

// Validate before form submission
nui.doer.do('validate@nui-input', requiredField);
```

---

## Events

All input components dispatch bubbling custom events:

| Event | Components | Detail |
|-------|------------|--------|
| `nui-input` | input, textarea | `{ value, valid, name }` |
| `nui-change` | input, textarea, checkbox, radio | `{ value, valid, name }` or `{ checked, value, name }` |
| `nui-clear` | input, textarea | `{ name }` |
| `nui-validate` | input, textarea | `{ valid, message, name }` |

**Usage Pattern**:
```javascript
// Parent form catches all input changes
form.addEventListener('nui-change', (e) => {
    console.log(`${e.detail.name} changed to ${e.detail.value}`);
    updateFormState();
});
```

---

## Why NOT Knower for Inputs

**Decision**: Input components do NOT integrate with Knower for field-level state.

### Rationale

1. **Forms already have state management**
   ```javascript
   // Native - already works
   const data = new FormData(form);  // All values, instantly
   form.reset();                      // Clear all
   form.elements.email.value;         // Direct access
   ```

2. **Input state is local, not shared**
   - Knower is for cross-component state (sidebar open, theme, app state)
   - Field values are local to the form
   - Other components don't need to know what's in the email field

3. **Performance concern**
   - Per-keystroke `tell()` fires watchers, clones state, checks changes
   - Unnecessary overhead for typing

4. **Desync risk**
   - Two sources of truth (DOM + Knower) can diverge
   - Native form APIs are the authoritative source

### Form-Level State (If Needed)

For cross-component coordination, store form-level state, not field values:

```javascript
// Good: Form-level state other components might care about
nui.knower.tell('checkout-form', { 
    step: 2, 
    valid: true,
    dirty: true 
});

// Bad: Field-level values (just use the DOM)
nui.knower.tell('checkout-form.email', 'user@example.com'); // ❌
```

### Escape Hatch

If someone truly needs Knower sync for a rare use case:

```javascript
// User-land implementation - 5 lines
const input = document.querySelector('nui-input input');
input.addEventListener('input', () => {
    nui.knower.tell('special-case', { value: input.value });
});
```

Not worth baking into every input component.

---

## CSS Variables

### Input Theme Variables

```css
:root {
    /* Backgrounds */
    --nui-input-bg: var(--color-base);
    --nui-input-bg-hover: var(--color-shade1);
    --nui-input-bg-focus: var(--color-shade1);
    --nui-input-bg-disabled: var(--color-shade2);
    
    /* Borders */
    --nui-input-border: var(--color-shade4);
    --nui-input-border-hover: var(--color-shade5);
    --nui-input-border-focus: var(--color-shade6);
    --nui-input-border-error: var(--color-error);
    --nui-input-border-success: var(--color-success);
    
    /* Text */
    --nui-input-text: var(--color-text-dim);
    --nui-input-text-focus: var(--color-text);
    --nui-input-text-placeholder: var(--color-shade5);
    --nui-input-text-disabled: var(--color-shade4);
    
    /* Label */
    --nui-input-label-color: rgba(255, 255, 255, 0.5);
    --nui-input-label-size: 0.75rem;
    
    /* Sizing */
    --nui-input-height: calc(var(--nui-space) * 2.5);
    --nui-input-padding: var(--nui-space);
    --nui-input-radius: var(--border-radius1);
    --nui-input-gap: var(--nui-space-quarter);
    
    /* Checkbox/Radio */
    --nui-check-size: 1.25rem;
    --nui-check-radius: 3px;
    --nui-radio-radius: 50%;
}
```

---

## Implementation Order

### Phase 1: Foundation
1. CSS variables for inputs
2. `<nui-input-group>` - label wrapper
3. `<nui-input>` - basic text input styling

### Phase 2: Core Inputs
4. `<nui-textarea>` - with auto-resize
5. `<nui-checkbox>` - custom styling
6. `<nui-radio>` - custom styling

### Phase 3: Enhancements
7. Validation display and error messages
8. Clear button for `<nui-input>`
9. Character count for `<nui-textarea>`
10. Doer actions (focus, clear, validate, reset)

### Phase 4: Polish
11. Animations (focus, check, select) - keep under 150ms
12. Disabled/readonly states
13. Playground demo page
14. Documentation

---

## Implementation Notes

### Focus-Visible Targeting

For checkbox/radio, the focus ring must appear on the visible custom element, not the hidden native input:

```css
/* Focus ring on the custom visual */
nui-checkbox input:focus-visible ~ .check-box {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
}

/* NOT on the hidden input */
nui-checkbox input:focus-visible {
    /* This is hidden - user won't see it */
}
```

### Disabled State for Affordances

When input is disabled, all interactive affordances must also disable:

```css
nui-input:has(input:disabled) .clear-btn {
    display: none; /* or pointer-events: none + opacity: 0.5 */
}

nui-input:has(input:disabled) {
    cursor: not-allowed;
    opacity: 0.6;
}
```

### Auto-Generated ID Strategy

For label association when IDs aren't provided:

```javascript
function generateId(prefix = 'nui-input') {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

// In connectedCallback
const input = element.querySelector('input, textarea');
const label = element.closest('nui-input-group')?.querySelector('label');

if (label && input && !input.id && !label.htmlFor) {
    const id = generateId();
    input.id = id;
    label.htmlFor = id;
}
```

### Textarea Auto-Resize

Critical: Use `border-box` sizing and reset height before measuring:

```javascript
function autoResize(textarea) {
    textarea.style.height = 'auto';  // Reset first
    const newHeight = Math.min(
        Math.max(textarea.scrollHeight, minHeight),
        maxHeight
    );
    textarea.style.height = newHeight + 'px';
}
```

### Error Display Location

- **Standalone inputs**: Error message rendered inside the component
- **Grouped inputs**: Error message can be inside component OR in group's error slot
- **Priority**: Component's own error takes precedence

### Element Reuse Pattern

Following the library's core principle: "Never generate twice if not needed."

**Clear Button** (single reused element per input):
```javascript
// In connectedCallback - create once
let clearBtn = null;

function ensureClearButton(element) {
    if (!clearBtn) {
        clearBtn = document.createElement('button');
        clearBtn.type = 'button';
        clearBtn.className = 'nui-clear-btn';
        clearBtn.setAttribute('aria-label', 'Clear input');
        clearBtn.innerHTML = '<nui-icon name="close"></nui-icon>';
        clearBtn.addEventListener('click', handleClear);
        element.appendChild(clearBtn);
    }
    return clearBtn;
}

// Show/hide by visibility, never recreate
function updateClearButton(input) {
    if (!clearBtn) return;
    clearBtn.style.display = input.value ? 'flex' : 'none';
}
```

**Error Message Element** (cached per input):
```javascript
// Create once in connectedCallback
let errorEl = null;

function ensureErrorElement(element) {
    if (!errorEl) {
        errorEl = document.createElement('div');
        errorEl.className = 'nui-error-message';
        errorEl.setAttribute('role', 'alert');
        errorEl.style.display = 'none';
        element.appendChild(errorEl);
    }
    return errorEl;
}

// Mutate content and visibility, never recreate
function showError(message) {
    errorEl.textContent = message;
    errorEl.style.display = 'block';
}

function hideError() {
    errorEl.style.display = 'none';
}
```

**Checkbox/Radio Custom Visual** (created once):
```javascript
// In connectedCallback - create custom visual once
function setupCheckbox(element) {
    const input = element.querySelector('input[type="checkbox"]');
    
    // Create custom visual element once
    const checkBox = document.createElement('span');
    checkBox.className = 'nui-check-box';
    checkBox.innerHTML = '<svg>...</svg>'; // Checkmark icon
    
    // Insert after input (for CSS sibling selectors)
    input.after(checkBox);
    
    // Cache reference if needed for direct manipulation
    element._checkBox = checkBox;
}

// State changes handled via CSS :checked selector
// No JS recreation needed
```

**Character Count Display** (for textarea):
```javascript
// Create once
let countEl = null;

function ensureCountElement(element) {
    if (!countEl) {
        countEl = document.createElement('div');
        countEl.className = 'nui-char-count';
        element.appendChild(countEl);
    }
    return countEl;
}

// Update by mutating textContent
function updateCount(current, max) {
    countEl.textContent = `${current} / ${max}`;
}
```

**Key Principle**: All auxiliary elements (clear buttons, error messages, custom visuals, counters) are created once in `connectedCallback` and cached. Updates happen via property mutation (textContent, style.display, classList), never via element recreation.

### Performance Validation

When implementing, measure with realistic scenarios:

- **Form with 20+ inputs**: Validate that blur-triggered validation doesn't cause perceptible lag
- **Rapid typing**: Ensure input events don't cause layout thrashing (especially with auto-resize textarea)
- **Many checkboxes/radios**: Confirm custom visuals don't impact render performance

If measurements show issues:
- Debounce validation (100-150ms)
- Use `requestAnimationFrame` for visual updates
- Consider `will-change` for animated elements

---

## Open Questions (Resolved)

### 1. Checkbox/Radio Visual Implementation

**Decision**: CSS-only with sibling selectors.

- Start CSS-only for simplicity
- Requires specific HTML structure (input before label or custom element)
- Add JS later only if flexibility demands it

### 2. Error Message Placement

**Decision**: Each input component can show its own error.

- Inputs are self-sufficient for standalone use
- Group provides additional structure/spacing but doesn't own error logic

### 3. Label Association Strategy

**Decision**: Auto-generate IDs if not set.

- Pattern: `nui-input-{random-8-chars}`
- Uses `crypto.randomUUID().slice(0, 8)` for uniqueness
- Sets both `input.id` and `label.htmlFor`

### 4. Form Submission

**Decision**: No `<nui-form>` component for initial implementation.

- Native `<form>` works with our components
- FormData API collects all values
- Consider later if specific form-level features are needed

### 5. Knower Integration

**Decision**: No field-level Knower binding.

- Use events (`nui-change`) for parent notification
- Use Doer actions for commands (`focus`, `clear`, `validate`)
- Form-level Knower state is user-land if needed

---

## File Structure

```
NUI/
├── nui.js                    # Add component registrations
├── css/
│   └── modules/
│       └── nui-inputs.css    # All input component styles
└── docs/
    └── input-components-plan.md  # This file
    
Playground/
└── pages/
    └── components/
        └── inputs.html       # Demo page
```

---

## Future Considerations

### Form Section / Multi-Step Wizard Support

**Context**: Multi-step forms and wizards are valuable UX patterns. After input components are stable, consider a wrapper component to make these easy for developers.

**Concept**: `<nui-form-section>` wrapping related inputs

```html
<nui-form-section id="shipping">
    <nui-input-group>
        <label>Address</label>
        <nui-input><input required></nui-input>
    </nui-input-group>
    <!-- more inputs -->
</nui-form-section>

<nui-form-section id="payment">
    <!-- payment inputs -->
</nui-form-section>

<button onclick="nextStep()">Next</button>
```

**Potential Features**:
- `checkValidity()` - validates all nested inputs, returns boolean
- `reportValidity()` - validates and shows all errors
- `reset()` - resets all nested inputs to initial values
- `nui-section-valid` event - dispatched when section validity changes

**Wizard Integration Ideas**:
- Step indicator component that shows progress
- Section visibility controlled by current step
- "Next" disabled until current section valid
- Smooth transitions between sections

**Key Principle**: Keep it methods + events based. Avoid baking in state management - let developers wire up their own logic or use Knower if they choose.

**Status**: Deferred until input components are complete. Revisit after building a real multi-step form demo to understand actual patterns needed.

---

## References

- [MDN: Constraint Validation](https://developer.mozilla.org/en-US/docs/Web/HTML/Constraint_validation)
- [MDN: ARIA for forms](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/forms)
- [Previous NUI implementation](https://herrbasan.github.io/n000b_ui_playground/#page=interaction&id=inputs)
- Previous NUI CSS: `reference/nui/css/nui_main.css`
- Visual reference screenshot: `reference/nui_screenshots/nui_inputs.png`
