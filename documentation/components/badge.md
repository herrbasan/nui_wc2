# Badge (`nui-badge`)

Badges provide contextual status information through two complementary patterns: standalone labels for inline status indication, and overlay indicators for notification counts and alerts. The component prioritizes visual clarity while maintaining semantic meaning.

## 1. Standalone Badges (`<nui-badge>`)

Use `<nui-badge>` for inline status labels like "New", "Pending", or "Active". These are semantic elements that communicate state.

### HTML Structure

```html
<nui-badge>Default</nui-badge>
<nui-badge variant="primary">Primary</nui-badge>
<nui-badge variant="success">Success</nui-badge>
<nui-badge variant="warning">Warning</nui-badge>
<nui-badge variant="danger">Danger</nui-badge>
<nui-badge variant="info">Info</nui-badge>
```

### Attributes

| Attribute | Type   | Default | Description |
|-----------|--------|---------|-------------|
| `variant` | string | -       | Changes the color scheme of the badge. Valid options are `primary`, `success`, `warning`, `danger`, and `info`. If omitted, the badge renders in its default neutral state. |

## 2. Integrated Status Attribute (`data-badge`)

The `data-badge` attribute enables notification dots and counts on any element without additional DOM overhead. CSS pseudo-elements handle the visual presentation.

### Usage

Add `data-badge="value"` to your container (like an `<nui-button>`).

#### Action Delegates

NUI provides optional declarative bindings for `nui-action-badge` to automatically manipulate simple numeric indicators. Since `data-badge` is just an attribute on an element, you must handle the event listener manually in your page logic or route it appropriately (see Interactive Example).

### Attributes

| Attribute | Type   | Default | Description |
|-----------|--------|---------|-------------|
| `data-badge`| string | -     | Injects a pseudo-element notification indicator showing the string value provided. An empty string `""` renders a small unnumbered dot. |

```html
<!-- Notification count -->
<nui-button data-badge="3">
    <button aria-label="Messages">
        <nui-icon name="mail"></nui-icon>
    </button>
</nui-button>

<!-- Alert indicator -->
<nui-button data-badge="!">
    <button aria-label="Warnings">
        <nui-icon name="warning"></nui-icon>
    </button>
</nui-button>

<!-- Simple dot (empty string) -->
<nui-button data-badge="">
    <button aria-label="New activity">
        <nui-icon name="notifications"></nui-icon>
    </button>
</nui-button>
```

### Dynamic Updates

Dynamic updates work by changing the `data-badge` attribute using vanilla JavaScript.

```javascript
const btn = document.getElementById('inbox-btn');

// Update badge count
btn.setAttribute('data-badge', '12');

// Clear badge entirely
btn.removeAttribute('data-badge');
```

## When to Use Which?

- **`<nui-badge>` Standalone badges**: Category labels, workflow states, version tags
- **`data-badge` indicators**: Notification counts, unread indicators, status alerts over existing icons/buttons

The `data-badge` approach keeps DOM structure minimal while providing flexible visual indicators.
