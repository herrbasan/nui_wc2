# nui-app-header

> **Layout Reference:** For the full structural rules of building an application shell, refer to the `nui-app` guide.

## Overview
The `<nui-app-header>` serves as a semantic flex-container designed to replace complex top-bar code with a standard, predictable structure. It is intended to live directly inside an `<nui-app>` wrapper, working in tandem with `<nui-sidebar>` and `<nui-content>`.

It divides its visual space into three alignment zones via HTML slots: left, center, and right.

## Key Rules
- This is a structural component meant to live exclusively inside `<nui-app>`. 
- Use the `slot` attribute (`slot="left"`, `slot="center"`, `slot="right"`) on your container `div`s to place content inside the header's auto-arranged flex zones.
- **Badges:** Status badges are added directly to action targets (like icon buttons) via `data-badge` attributes. Do not wrap badges in separate DOM elements.
- **Sidebar Integration:** Easily toggle app sidebars using zero-JS declarative data-actions.

## Declarative Usage

```html
<nui-app-header>
    <div slot="left">
        <!-- Sidebar toggle button -->
        <nui-button data-action="toggle-sidebar">
            <button type="button" aria-label="Menu">
                <nui-icon name="menu"></nui-icon>
            </button>
        </nui-button>
        <h1>App Title</h1>
    </div>
    
    <div slot="center">
        <!-- Optional global center controls (e.g. search bar) -->
    </div>
    
    <div slot="right">
        <!-- Button with a badge -->
        <nui-button data-action="show-notifications" data-badge="3">
            <button type="button" aria-label="Notifications">
                <nui-icon name="notifications"></nui-icon>
            </button>
        </nui-button>
        
        <!-- Right Sidebar toggle button -->
        <nui-button data-action="toggle-sidebar:right">
            <button type="button" aria-label="Settings">
                <nui-icon name="settings"></nui-icon>
            </button>
        </nui-button>
    </div>
</nui-app-header>
```

## Status Badges

Any element placed inside the header can accept the `data-badge` attribute. This invokes a CSS-driven badge overlay, perfect for notifications or alerts.

| Attribute | Behavior |
|-----------|----------|
| `data-badge="number"` | Renders a pill badge showing the provided number or text (e.g., `data-badge="5"`). |
| `data-badge=""` | Renders a small, minimal "dot" indicator without text. |

## Interactive Delegation (`data-action`)

The App Shell relies entirely on global event delegation through `data-action` attributes to handle sidebars. This eliminates messy JS listeners for basic layout actions.

- **`data-action="toggle-sidebar"`**: Toggles the visibility of the primary (left) `<nui-sidebar>`.
- **`data-action="toggle-sidebar:right"`**: Toggles the visibility of the secondary `<nui-sidebar position="right">`.

## DOM Structure & Accessibility
When initialized, NUI automatically ensures the underlying `<header>` tag receives `role="banner"` if no ARIA landmark roles are implicitly matched or provided, upgrading your layout's semantic accessibility for screen readers.