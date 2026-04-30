# nui-progress

## Design Philosophy
The progress component provides visual feedback for task completion and busy states. It offers multiple visual variants (linear, circular, indeterminate) through a single, self-contained element that manages its own internal rendering. The component automatically handles ARIA attributes for accessibility.

## How It Works
The component is self-contained and generates all internal markup automatically. For linear progress, it creates the track and fill bar. For circular progress, it renders an SVG ring. The percentage label is calculated from `value` and `max` attributes and can be hidden with `hide-text`.

Attribute changes are reactive — updating `value` immediately updates the visual progress without requiring JavaScript method calls.

## Usage Patterns

### Linear Progress Bar
Display deterministic progress with automatic percentage calculation:

```html
<nui-progress value="45"></nui-progress>
<nui-progress value="65" hide-text></nui-progress>
```

### Circular Progress
Use `type="circular"` for compact or spinner-like indicators:

```html
<nui-progress type="circular" value="60"></nui-progress>
<nui-progress type="circular" value="75" hide-text></nui-progress>
```

### Indeterminate States
When progress value is unknown, use busy indicators:

```html
<!-- Linear indeterminate -->
<nui-progress type="busy"></nui-progress>

<!-- Circular indeterminate -->
<nui-progress type="circular-busy"></nui-progress>
```

### Custom Sizing
Control size with the `size` attribute:

```html
<!-- Fixed size -->
<nui-progress type="circular-busy" size="4rem"></nui-progress>

<!-- Responsive sizing -->
<div style="width: 6rem; height: 6rem;">
        <nui-progress type="circular-busy" size="50%"></nui-progress>
</div>

<!-- Thicker bar -->
<nui-progress type="bar" value="50" size="1.2rem"></nui-progress>
```

### Programmatic Updates
Update progress by setting attributes:

```javascript
const progress = document.querySelector('nui-progress');

// Update value
progress.setAttribute('value', '75');

// Create dynamically
const newProgress = nui.util.createElement('nui-progress', {
    attrs: { value: '0', max: '100' }
});
```

## When to Use
Use linear progress bars for file uploads, form completion, or multi-step processes where the user benefits from seeing overall progress. Use circular indicators for compact contexts like buttons or cards. Use indeterminate/busy states when duration is unknown or for loading spinners.