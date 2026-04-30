# nui-skip-links

## Design Philosophy

Skip links embody the principle that accessibility features should benefit all users while being essential for some. Keyboard users rely on skip links to bypass repetitive navigation and reach main content quickly. This component implements the WCAG 2.1 Level A requirement for bypass blocks.

## How It Works

The component provides two usage modes:

1. **Automatic mode** - Detects `<main>` elements and generates appropriate skip links
2. **Declarative mode** - Accepts custom anchor elements for specific navigation needs

Skip links are visually hidden until focused, appearing as the first focusable element when users press Tab. The component automatically manages `tabindex="-1"` on target elements to ensure proper focus handling.

## Usage Patterns

### Automatic Generation

When placed without children, the component scans for common landmarks:

```html
<nui-app>
    <nui-skip-links></nui-skip-links>
    <nui-app-header>...</nui-app-header>
    <nui-content>
        <main>...</main>
    </nui-content>
</nui-app>
```

### Custom Skip Links

Define specific navigation paths with anchor elements:

```html
<nui-skip-links>
    <a href="#search">Skip to search</a>
    <a href="#main-content">Skip to main content</a>
    <a href="#footer">Skip to footer</a>
</nui-skip-links>
```

## Integration Points

- Adds `role="navigation"` and `aria-label="Skip links"` automatically
- Uses `a11y.announce()` for screen reader feedback on activation
- Handles focus management without scrolling animations

## When to Use

- All applications with navigation before main content
- Pages with complex sidebar navigation
- Multi-step forms where users may want to skip instructions
- Any page requiring WCAG 2.1 Level A compliance

## Testing

To verify skip links work correctly:
1. Load the page
2. Press Tab - the first skip link should appear at the top-left
3. Press Enter - focus should move to the target section
4. Continue tabbing - navigation should proceed from the target element