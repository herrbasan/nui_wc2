# nui-slider

## Design Philosophy
The slider component enhances the native `<input type="range">` with custom visual styling while preserving all native accessibility and form integration benefits. By wrapping rather than replacing the native input, it maintains screen reader compatibility, keyboard navigation, and standard form submission behavior.

## How It Works
The component wraps a native range input and automatically creates visual track, fill, and thumb elements. It uses `nui.util.enableDrag` internally to provide smooth touch and mouse interaction with a larger hit area than the visual appearance suggests.

All range attributes (`min`, `max`, `step`, `value`, `disabled`) live on the inner native input, where they belong. Events bubble naturally from the input through the wrapper.

## Usage Patterns

### Basic Slider
Wrap a native range input with custom styling:

```html
<nui-slider>
        <input type="range" min="0" max="100" value="50">
</nui-slider>
```

### Custom Range and Step
Configure the input with standard range attributes:

```html
<nui-slider>
        <input type="range" min="0" max="10" step="1" value="5">
</nui-slider>
```

### Event Handling
Listen to native events on the input (they bubble to the wrapper):

```javascript
const slider = document.querySelector('nui-slider');
const input = slider.querySelector('input[type="range"]');

// Live updates while dragging
input.addEventListener('input', (e) => {
    console.log('Current value:', e.target.value);
});

// Final value on release
input.addEventListener('change', (e) => {
    console.log('Final value:', e.target.value);
});
```

### Programmatic Control
Use the component methods for JS control:

```javascript
const slider = document.querySelector('nui-slider');

slider.setValue(75);
console.log(slider.getValue());
```

### Dynamic Creation
Create sliders programmatically using the utility:

```javascript
const input = document.createElement('input');
input.type = 'range';
input.min = 0;
input.max = 100;
input.value = 50;

const slider = nui.util.createElement('nui-slider', {}, [input]);
document.body.appendChild(slider);
```


## Attributes
*(All attributes such as `min`, `max`, `step`, and `value` should be placed directly on the nested native `<input type="range">`)*

## Programmatic API

| Method | Parameters | Return Type | Description |
|--------|------------|-------------|-------------|
| `setValue(val)` | `number \| string` | `void` | Programmatically sets the value of the internal native input and recalculates the visual track and thumb position immediately. |

## Events
*(This component relies completely on native `input` and `change` events bubbling up from the inner `<input type="range">`)*
## When to Use
Use the slider when you need numeric input within a bounded range, especially for settings like volume, opacity, or any value where the relative position matters visually. The custom styling provides better visual integration with the NUI theme while maintaining full native input behavior.
