# LLM Guide: NUI Accessibility Architecture

## The Philosophy: DOM-First A11y

NUI's accessibility approach is built on a simple truth: **the browser knows more about accessibility than any JavaScript framework.** Instead of complex abstraction layers, NUI uses semantic HTML as the foundation and enhances it where necessary.

This means:
- Native `<button>` elements are the interactive targets (not divs)
- Native `<dialog>` provides focus trapping and Escape handling
- Native `<input>` with proper labels for form controls
- ARIA attributes are added automatically during component upgrade

The result: accessibility works even before JavaScript loads, and screen readers see standard, predictable markup.

## Intelligent Enhancement

NUI doesn't just preserve native accessibility - it enhances it intelligently:

**Icon-Only Buttons:**
When NUI sees `<button><nui-icon name="settings"></nui-icon></button>`, it:
1. Generates an appropriate `aria-label` based on the icon name
2. Hides the icon from screen readers (`aria-hidden="true"`)
3. Logs a warning so developers know it happened

**Composite Components:**
Components like tabs and menus implement roving tabindex automatically:
- Only the active item is in the tab sequence
- Arrow keys navigate between items
- Screen readers announce state changes

**Focus Management:**
Dialogs and overlays handle focus automatically:
- Focus moves into the modal when opened
- Focus is trapped within the modal while open
- Focus returns to the trigger when closed

## The A11y Utility

NUI provides `nui.a11y.announce()` for dynamic content:

```javascript
// Screen reader will announce this
nui.a11y.announce('File uploaded successfully');
```

This uses a visually hidden live region that screen readers monitor. It's the standard pattern for announcing changes that aren't focus-driven.

## Component-Specific Patterns

**nui-tabs:**
Follows the ARIA Tab Pattern exactly:
- `role="tablist"` on the navigation container
- `role="tab"` on each button with `aria-selected`
- `role="tabpanel"` on content sections with `aria-labelledby`

**nui-select:**
Adapts to the platform:
- Desktop: Combobox pattern with typeahead search
- Mobile: Native bottom sheet for touch optimization

**nui-sortable:**
Implements keyboard reordering:
- Space/Enter to "grab" an item
- Arrow keys to move it
- Space/Enter to "drop" it
- Live region announcements for each move

**nui-table:**
Responsive transformation:
- Desktop: Standard table with headers
- Mobile: Card layout with `data-label` attributes preserving column context for screen readers

## Reduced Motion Support

NUI respects `prefers-reduced-motion` automatically:
- CSS transitions respect the media query
- JavaScript animations check the preference
- No action required from developers

## Why This Matters for LLMs

When generating NUI code, understanding this architecture means:
- Don't add redundant ARIA attributes (components handle it)
- Do use semantic HTML (the foundation of the system)
- Don't use divs for buttons (breaks the enhancement model)
- Do trust the component's built-in behaviors

The accessibility is batteries-included, not bolted-on.
