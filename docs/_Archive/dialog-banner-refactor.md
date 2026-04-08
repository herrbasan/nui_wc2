# Dialog & Banner Component Refactor

**Date:** December 2025  
**Status:** ✅ Completed

---

## Implementation Summary

The refactor separated concerns between dialogs (interactive, modal) and banners (passive, informational).

### Completed Changes

1. **Dialog Component (`<nui-dialog>`):**
   - Placement modes: `top`, `center` (default), `bottom`
   - Modal (`.showModal()`) and non-modal (`.show()`) support
   - Removed banner-top/banner-bottom placements (now in banner component)
   - Z-index for non-modal dialogs: `calc(var(--z-backdrop, 999) + 1)`

2. **Dialog System (`nui.dialog`):**
   - Kept: `alert()`, `confirm()`, `prompt()` with consistent options
   - Removed: `login()`, `consent()`, `progress()` (will be separate components)
   - All methods support: `{ target, placement, modal }` options

3. **Banner Component (`<nui-banner>`):**
   - Placement: `top`, `bottom` (default)
   - Auto-close with countdown timer
   - Priority levels: `info` (role="status"), `alert` (role="alert")
   - Slide animations: `ani-slide-in-top/bottom`, `ani-slide-out-top/bottom`

4. **Banner Factory (`nui.banner.create()`):**
   - Singleton-per-placement: new banner replaces existing at same position
   - Returns controller: `{ element, close, update, onClose }`
   - Lazy watcher: only updates Knower if watchers exist

5. **Files Modified:**
   - `NUI/nui.js`: Added nui-banner component and bannerFactory
   - `NUI/css/nui-theme.css`: Added banner CSS, removed old dialog banner modes
   - `Playground/pages/components/dialog.html`: Cleaned up examples
   - `Playground/pages/components/banner.html`: New demo page
   - `Playground/js/main.js`: Added banner to navigation

---

## Philosophy Alignment Analysis

Before implementation, this refactor must be evaluated against the library's core principles.

### ✅ Reliability (Simplicity Over Cleverness)

**Current Issue:** The dialog system mixes concerns - true modal dialogs, banners, login forms, progress bars, and consent flows are all handled by one system with growing complexity.

**Proposed Solution:** 
- `<nui-dialog>` does ONE thing: wrap `<dialog>` with animation and placement
- `<nui-banner>` does ONE thing: edge-anchored notification with optional auto-close
- Factory functions (`alert`, `confirm`, `prompt`) are thin wrappers for common patterns

**Alignment:** ✅ Each component has a single, clear responsibility. No clever abstractions.

---

### ✅ Performance (Element Reuse Consideration)

**Key Question:** Should dialogs/banners be reused (singleton) or regenerated?

**Analysis per the "When to Reuse" guidelines:**

| Pattern | Reuse? | Reasoning |
|---------|--------|-----------|
| `<nui-dialog>` declarative | N/A | User defines in HTML, persists in DOM |
| `nui.dialog.alert/confirm/prompt` | **Regenerate** | Structure is simple, infrequent use, auto-removed on close |
| `<nui-banner>` declarative | N/A | User defines in HTML, persists in DOM |

**Current Implementation (regeneration):**
```javascript
_createDialog(target, placement) {
    const dialog = document.createElement('nui-dialog');
    // ... create fresh each time
    nativeDialog.addEventListener('close', () => dialog.remove(), { once: true });
}
```

**Alternative (reuse singleton):**
```javascript
_getSystemDialog() {
    let dialog = document.getElementById('nui-system-dialog');
    if (!dialog) {
        // create once
    }
    return dialog; // reuse, just swap content
}
```

**Decision:** The current regeneration approach is acceptable because:
1. Alert/confirm/prompt are infrequent (user-blocking interactions)
2. Below the 1000+ element threshold where reuse matters
3. Auto-removal keeps DOM clean
4. Simpler code (no content-swapping logic)

However, if profiling shows dialog creation as a bottleneck, switch to singleton pattern.

**Alignment:** ✅ Pragmatic choice, measurable if needed.

---

### ✅ Semantic HTML Foundation

**Current `<nui-dialog>`:**
```html
<nui-dialog>
    <dialog>  <!-- Native semantic element -->
        <!-- Developer's content -->
    </dialog>
</nui-dialog>
```

**Proposed `<nui-banner>`:**
```html
<nui-banner placement="bottom">
    <p>Message text</p>  <!-- Semantic content -->
    <button>Action</button>  <!-- Semantic button -->
</nui-banner>
```

**Considerations:**
- `<nui-banner>` wraps user content directly (no inner `<dialog>`)
- Should it use `role="alert"` or `role="status"` for accessibility?
- Content inside is semantic HTML controlled by developer

**Recommendation:** Add appropriate ARIA:
```javascript
// In banner connectedCallback
if (!element.hasAttribute('role')) {
    element.setAttribute('role', 'status');
    element.setAttribute('aria-live', 'polite');
}
```

**Alignment:** ✅ Custom element enhances semantic HTML, doesn't replace it.

---

### ✅ Direct Platform APIs

**Dialog uses native `<dialog>` element:**
- `dialog.showModal()` - native API
- `dialog.show()` - native API  
- `dialog.close()` - native API
- `::backdrop` pseudo-element - native CSS

**Banner uses standard positioning:**
- `position: fixed` - native CSS
- CSS animations - native
- No virtual DOM, no framework abstractions

**Alignment:** ✅ Pure platform APIs.

---

### ✅ Knower/Doer Integration

**State Management (Knower):**
- `dialog:{id}:open` → cross-component state observation
- `banner:{id}:open` → same pattern
- `banner:{id}:action` → action result for watchers

**Action System (Doer):**
- `banner-show@{id}` - declarative action trigger
- `banner-close@{id}` - declarative action trigger
- `banner-action@{id}` - with `data-action` for result

**Alignment:** ✅ Uses established Knower/Doer patterns.

---

### ⚠️ Concern: Factory Functions Create Ephemeral Elements

The `nui.dialog.alert()` pattern creates elements programmatically and removes them on close. This is:

**Pros:**
- Clean API for developers
- No DOM pollution (auto-cleanup)
- Familiar pattern (like native `alert()`)

**Cons:**
- Slight deviation from "semantic HTML in markup" principle
- Elements not visible in source HTML

**Mitigation:** 
- Factory functions are convenience layer, not the primary pattern
- Declarative `<nui-dialog>` in HTML remains the recommended approach
- Document both patterns clearly

**Alignment:** ⚠️ Acceptable trade-off for developer ergonomics.

---

### ⚠️ Concern: Banner Auto-Close Timer

The `auto-close="15"` attribute introduces internal state (countdown timer).

**Analysis:**
- Timer is encapsulated within component
- State is simple (countdown number)
- Cleanup is straightforward (`clearInterval` in `disconnectedCallback`)

**Implementation:**
```javascript
registerComponent('nui-banner', (element) => {
    let timer = null;
    let countdown = 0;
    
    element.show = () => {
        const autoClose = element.getAttribute('auto-close');
        if (autoClose) {
            countdown = parseInt(autoClose, 10);
            timer = setInterval(() => {
                countdown--;
                if (countdown <= 0) {
                    element.close('timeout');
                }
            }, 1000);
        }
        // ... show logic
    };
    
    element.close = (action) => {
        if (timer) clearInterval(timer);
        timer = null;
        // ... close logic
    };
});
```

**Alignment:** ✅ Simple state, properly encapsulated.

---

### Summary: Fit Assessment

| Principle | Alignment | Notes |
|-----------|-----------|-------|
| Reliability (Simplicity) | ✅ | Clear separation of concerns |
| Performance | ✅ | Pragmatic regeneration, measurable |
| Semantic HTML | ✅ | Native `<dialog>`, semantic content |
| Direct Platform APIs | ✅ | No abstractions |
| Element Reuse | ✅ | Declarative elements persist, factories are infrequent |
| Knower/Doer | ✅ | Standard patterns |
| Teaching-Friendly | ✅ | Each component is understandable in isolation |

**Overall:** The refactor aligns well with library philosophy. Proceed with implementation.

---

## Overview

Refactor the dialog system to separate concerns between true dialogs (blocking modal interactions) and banners (passive edge-anchored notifications). This creates clearer component boundaries and enables more flexible composition.

---

## Architecture

### Layer 1: `<nui-dialog>` - Dialog Infrastructure

**Purpose:** Thin wrapper around native `<dialog>` element providing animation, placement, and API.

**Responsibilities:**
- Modal vs non-modal display (`showModal()` / `show()`)
- Placement positioning (`top`, `center`, `bottom`)
- Open/close animations (scale in/out)
- Backdrop handling for modal dialogs
- Event dispatching
- Knower state integration

**Attributes:**
| Attribute | Values | Default | Description |
|-----------|--------|---------|-------------|
| `placement` | `top`, `center`, `bottom` | `center` | Vertical position in viewport |
| `id` | string | - | Used for Knower state key |

**Methods:**
| Method | Description |
|--------|-------------|
| `showModal()` | Open as modal with backdrop |
| `show()` | Open as non-modal |
| `close(returnValue?)` | Close with optional return value |
| `isOpen()` | Returns boolean |

**Events:**
| Event | Detail | Description |
|-------|--------|-------------|
| `nui-dialog-close` | `{ returnValue }` | Fired when dialog closes |
| `nui-dialog-cancel` | - | Fired when cancelled (Escape key) |

**Knower State:**
- `dialog:{id}:open` → `true` | `false`

**HTML Structure:**
```html
<nui-dialog id="my-dialog" placement="top">
    <dialog>
        <!-- Developer's content -->
    </dialog>
</nui-dialog>
```

---

### Layer 2: `<nui-banner>` - Edge-Anchored Notifications

**Purpose:** Positioned notification container that slides in from screen edge. Not a dialog - no blocking behavior.

**Responsibilities:**
- Edge positioning (top or bottom of viewport)
- Slide-in/out animations
- Optional auto-close countdown
- Action handling via Knower/Doer
- Can be declarative in HTML

**Attributes:**
| Attribute | Values | Default | Description |
|-----------|--------|---------|-------------|
| `placement` | `top`, `bottom` | `bottom` | Which edge to anchor to |
| `auto-close` | number (seconds) | - | Optional countdown to auto-close |
| `id` | string | - | Used for Knower state key |

**Methods:**
| Method | Description |
|--------|-------------|
| `show()` | Display the banner with slide animation |
| `close(action?)` | Hide the banner, optionally with action |
| `isOpen()` | Returns boolean |

**Events:**
| Event | Detail | Description |
|-------|--------|-------------|
| `nui-banner-open` | - | Fired when banner opens |
| `nui-banner-close` | `{ action }` | Fired when banner closes |

**Knower State:**
- `banner:{id}:open` → `true` | `false`
- `banner:{id}:action` → action string when closed

**Doer Actions:**
- `banner-show@{id}` - Show the banner
- `banner-close@{id}` - Close the banner
- `banner-action@{id}` - Close with action from `data-action` attribute

**HTML Structure:**
```html
<nui-banner id="cookie-consent" placement="bottom" auto-close="15">
    <p>We use cookies to improve your experience.</p>
    <div class="banner-actions">
        <button nui-event-click="banner-action@cookie-consent" data-action="decline">Decline</button>
        <button nui-event-click="banner-action@cookie-consent" data-action="accept">Accept</button>
    </div>
</nui-banner>
```

**CSS Structure:**
```css
nui-banner {
    position: fixed;
    left: 0;
    right: 0;
    z-index: 1000;
    /* Hidden by default */
    display: none;
}

nui-banner[placement="top"] {
    top: 0;
}

nui-banner[placement="bottom"] {
    bottom: 0;
}

nui-banner[open] {
    display: block;
}

/* Slide animations */
nui-banner[placement="top"].ani-slide-in {
    animation: slide-in-top 0.3s ease-out;
}

nui-banner[placement="bottom"].ani-slide-in {
    animation: slide-in-bottom 0.3s ease-out;
}
```

---

### Layer 3: `nui.dialog` - Convenience Factories

**Purpose:** Programmatic creation of ephemeral dialogs for common workflows.

**Functions:**

#### `nui.dialog.alert(title, message, options?)`
Simple notification that user acknowledges.

```javascript
await nui.dialog.alert('Success', 'File saved successfully.');
```

**Options:**
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `target` | Element | `document.body` | Container to append dialog |
| `placement` | string | `center` | Dialog placement |
| `buttonText` | string | `'OK'` | Button label |

**Returns:** `Promise<void>` - resolves when closed

---

#### `nui.dialog.confirm(title, message, options?)`
Yes/No decision dialog.

```javascript
const confirmed = await nui.dialog.confirm('Delete?', 'This cannot be undone.');
if (confirmed) {
    // proceed
}
```

**Options:**
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `target` | Element | `document.body` | Container to append dialog |
| `placement` | string | `center` | Dialog placement |
| `confirmText` | string | `'OK'` | Confirm button label |
| `cancelText` | string | `'Cancel'` | Cancel button label |

**Returns:** `Promise<boolean>` - `true` if confirmed, `false` if cancelled

---

#### `nui.dialog.prompt(title, fields, options?)`
Collect input from user.

```javascript
const values = await nui.dialog.prompt('Enter Details', [
    { id: 'name', label: 'Name', value: 'Default' },
    { id: 'email', label: 'Email', type: 'email' }
]);

if (values) {
    console.log(values.name, values.email);
}
```

**Fields Array:**
| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Field identifier (becomes key in result) |
| `label` | string | Display label |
| `value` | string | Default value |
| `type` | string | Input type (text, email, password, etc.) |

**Options:**
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `target` | Element | `document.body` | Container to append dialog |
| `placement` | string | `center` | Dialog placement |
| `confirmText` | string | `'OK'` | Confirm button label |
| `cancelText` | string | `'Cancel'` | Cancel button label |

**Returns:** `Promise<object|null>` - values object or `null` if cancelled

---

## Use Cases

### Cookie Consent Banner
```html
<nui-banner id="consent" placement="bottom" auto-close="15">
    <p>🍪 We use cookies to improve your experience.</p>
    <button nui-event-click="banner-action@consent" data-action="decline">Decline</button>
    <button nui-event-click="banner-action@consent" data-action="accept">Accept All</button>
</nui-banner>

<script>
    // Check if consent already given
    if (!localStorage.getItem('cookie-consent')) {
        document.getElementById('consent').show();
    }
    
    // Handle response
    knower.watch('banner:consent:action', (action) => {
        localStorage.setItem('cookie-consent', action);
        if (action === 'accept') {
            // Enable analytics, etc.
        }
    });
</script>
```

### Notification Banner
```html
<nui-banner id="notification" placement="top" auto-close="5">
    <p>Your changes have been saved.</p>
</nui-banner>

<script>
    // Show notification after save
    function onSave() {
        document.getElementById('notification').show();
    }
</script>
```

### Delete Confirmation
```javascript
async function deleteItem(id) {
    const confirmed = await nui.dialog.confirm(
        'Delete Item?', 
        'This action cannot be undone.',
        { placement: 'top' }
    );
    
    if (confirmed) {
        await api.delete(id);
    }
}
```

### Custom Dialog
```html
<nui-dialog id="settings" placement="center">
    <dialog>
        <h2>Settings</h2>
        <form>
            <label>
                <input type="checkbox" name="darkMode"> Dark Mode
            </label>
            <label>
                <input type="checkbox" name="notifications"> Notifications
            </label>
        </form>
        <button onclick="document.getElementById('settings').close()">Close</button>
    </dialog>
</nui-dialog>

<button onclick="document.getElementById('settings').showModal()">Open Settings</button>
```

---

## Implementation Steps

### Phase 1: Clean Up Dialog
1. Remove banner placement modes (`banner-top`, `banner-bottom`) from `<nui-dialog>` CSS
2. Keep only `top`, `center`, `bottom` placements
3. Ensure non-modal mode still works correctly

### Phase 2: Simplify Dialog System
1. Remove `login()`, `consent()`, `progress()` from `dialogSystem`
2. Keep only `alert()`, `confirm()`, `prompt()`
3. Clean up associated CSS

### Phase 3: Create Banner Component
1. Create `<nui-banner>` component in `nui.js`
2. Add CSS for positioning and animations
3. Implement:
   - `show()` / `close()` methods
   - Auto-close countdown logic
   - Knower/Doer integration
   - Slide animations

### Phase 4: Update Demo Pages
1. Update dialog demo page (remove login, consent, progress examples)
2. Create banner demo page with consent example
3. Document usage patterns

### Phase 5: Future Components (Separate Effort)
- `<nui-login>` - Standalone auth form
- `<nui-progress>` - Standalone progress indicator

---

## Files to Modify

| File | Changes |
|------|---------|
| `NUI/nui.js` | Remove banner from dialog, add banner component, simplify dialogSystem |
| `NUI/css/nui-theme.css` | Remove banner-* dialog styles, add banner component styles |
| `Playground/pages/components/dialog.html` | Update examples |
| `Playground/pages/components/banner.html` | New demo page |
| `Playground/js/main.js` | Add banner to navigation |

---

## Open Questions

1. ~~Should banners stack if multiple are shown?~~ **Resolved:** Singleton-per-placement strategy (see below)
2. Should auto-close show visual countdown? (Timer display)
3. ~~Should banners be dismissible by clicking outside?~~ **Resolved:** No - explicit action preferred

---

## Design Decisions (From Review)

### Banner Stacking: Singleton-per-Placement Strategy

**Problem:** Multiple banners at same placement creates visual mess.

**Solution:** Enforce one banner per placement position. When `nui.banner({ placement: 'bottom' })` is called:
1. Check for existing open banner at `bottom`
2. If exists, close it immediately (skip close animation for speed)
3. Show new banner

**Implementation:**
```javascript
// Track active banners by placement
const activeBanners = { top: null, bottom: null };

nui.banner = (options) => {
    const placement = options.placement || 'bottom';
    
    // Close existing banner at this placement
    if (activeBanners[placement]) {
        activeBanners[placement].close('replaced');
    }
    
    // Create and show new banner
    const banner = createBanner(options);
    activeBanners[placement] = banner;
    
    banner.onClose(() => {
        if (activeBanners[placement] === banner) {
            activeBanners[placement] = null;
        }
    });
    
    return banner;
};
```

**Note:** Declarative `<nui-banner>` elements are not subject to this - they are explicitly placed by the developer and don't auto-replace each other.

---

### Banner Accessibility: Role by Priority

**Problem:** `role="status"` is correct for informational banners, but critical errors need `role="alert"`.

**Solution:** Add `priority` attribute/option:

| Priority | Role | aria-live | Use Case |
|----------|------|-----------|----------|
| `info` (default) | `status` | `polite` | "Changes saved", "Welcome back" |
| `alert` | `alert` | `assertive` | "Connection lost", "Session expired" |

**Declarative:**
```html
<nui-banner priority="alert" placement="top">
    <p>Connection lost. Reconnecting...</p>
</nui-banner>
```

**Factory:**
```javascript
nui.banner({
    content: 'Connection lost!',
    priority: 'alert',
    placement: 'top'
});
```

**Implementation:**
```javascript
// In connectedCallback or show()
const priority = element.getAttribute('priority') || 'info';
if (priority === 'alert') {
    element.setAttribute('role', 'alert');
    element.setAttribute('aria-live', 'assertive');
} else {
    element.setAttribute('role', 'status');
    element.setAttribute('aria-live', 'polite');
}
```

---

### Z-Index Architecture

**Problem:** Banners need consistent stacking context.

**Solution:** Define z-index CSS variables in theme:

```css
:root {
    --z-banner: 1000;
    --z-dialog-backdrop: 1001;  /* Not needed - dialog uses top-layer */
}

nui-banner {
    z-index: var(--z-banner);
}
```

**Note:** Modal dialogs using `showModal()` live in the browser's "top layer" which is above all z-index values. Non-modal dialogs need consideration - they should probably be above banners:

```css
nui-dialog dialog:not(:modal) {
    z-index: calc(var(--z-banner) + 1);
}
```

---

### Banner Factory Return Value

**Problem:** Caller may need to update or dismiss banner programmatically.

**Solution:** Return controller object:

```javascript
const notification = nui.banner({
    content: 'Saving...',
    placement: 'top'
});

// Returns:
{
    element,              // The nui-banner element
    close(action?),       // Close with optional action string
    update(content),      // Update content without closing
    onClose(callback)     // Register close handler
}
```

**Use case - progress feedback:**
```javascript
const banner = nui.banner({ content: 'Uploading...', placement: 'top' });

try {
    await uploadFile(file);
    banner.update('Upload complete!');
    setTimeout(() => banner.close('success'), 2000);
} catch (e) {
    banner.update('Upload failed: ' + e.message);
    banner.element.setAttribute('priority', 'alert');
}
```

---

### Transition Plan for Removed Functions

**Removed from `dialogSystem`:**
- `login()` 
- `consent()`
- `progress()`

**Impact:** Any code using these will break.

**Mitigation:**
1. These functions are only used in the Playground demo page
2. Demo page will be updated to show alternative patterns:
   - **Login:** Custom `<nui-dialog>` with form content (example in demo)
   - **Consent:** `<nui-banner>` with buttons (primary use case for banner)
   - **Progress:** Inline progress bar or custom dialog (future `<nui-progress>` component)

**Future Components (separate effort, not blocking):**
- `<nui-login>` - Standalone auth form
- `<nui-progress>` - Standalone progress indicator

These can be implemented later and optionally wrapped in dialogs when needed.

---

## Declarative Design Checklist

For each component, ensure the declarative path is fully considered:

### `<nui-dialog>`

| Aspect | Implementation |
|--------|----------------|
| **Zero-JS functionality** | Native `<dialog>` works without JS; component enhances with animation |
| **Attribute-driven config** | `placement` attribute controls positioning via CSS |
| **CSS state selectors** | `[open]` for open state styling (native dialog) |
| **Default accessibility** | Native `<dialog>` provides modal semantics |
| **Sensible defaults** | `placement="center"` if omitted |
| **Event bubbling** | `nui-dialog-close`, `nui-dialog-cancel` bubble for declarative handlers |

### `<nui-banner>`

| Aspect | Implementation |
|--------|----------------|
| **Zero-JS functionality** | Hidden by default; requires `.show()` - acceptable for notification pattern |
| **Attribute-driven config** | `placement`, `auto-close` attributes |
| **CSS state selectors** | `[open]` attribute added/removed for styling |
| **Default accessibility** | Auto-apply `role="status"`, `aria-live="polite"` |
| **Sensible defaults** | `placement="bottom"` if omitted |
| **Event bubbling** | `nui-banner-open`, `nui-banner-close` bubble for declarative handlers |
| **Content projection** | User's HTML is direct children, no wrapper needed |

---

## Banner Factory Function

For programmatic banner creation, provide `nui.banner()`:

```javascript
// Create and show a notification banner
const banner = nui.banner({
    content: 'Your changes have been saved.',
    placement: 'top',
    autoClose: 5,
    target: document.body
});

// Listen for close
banner.onClose((action) => {
    console.log('Banner closed:', action); // 'timeout', 'dismiss', or custom
});

// Manual close
banner.close();
```

**Factory vs Declarative:**
- Factory for dynamic/ephemeral notifications (save confirmations, errors, toasts)
- Declarative for persistent/known banners (consent, announcements)

---

## CSS State Selectors

Components should expose state via attributes for CSS-only styling:

```css
/* Dialog placement */
nui-dialog[placement="top"] dialog { /* ... */ }
nui-dialog[placement="center"] dialog { /* ... */ }
nui-dialog[placement="bottom"] dialog { /* ... */ }

/* Banner states */
nui-banner { display: none; }
nui-banner[open] { display: block; }

nui-banner[placement="top"] { top: 0; }
nui-banner[placement="bottom"] { bottom: 0; }

/* Animation classes (added/removed by JS) */
nui-banner.ani-slide-in-top { animation: slide-in-top 0.3s ease-out; }
nui-banner.ani-slide-out-top { animation: slide-out-top 0.3s ease-in; }
```

This allows users to:
1. Override styles based on state without JS
2. Create custom themes targeting specific states
3. Understand component state by inspecting DOM
