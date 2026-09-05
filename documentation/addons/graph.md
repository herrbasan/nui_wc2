# &lt;nui-graph&gt; Addon

High-performance, low-power canvas sparkline component designed for high-frequency telemetry, sensor monitoring, and live time-series dashboards.

---

## Why nui-graph?

- **Direct Canvas Blits**: Completely avoids DOM elements and SVG path recalculations.
- **HiDPI Retina Subpixel Rendering**: Sized to `clientWidth * devicePixelRatio * 2` and scaled down via CSS transform matrix, eliminating blurry waveforms without layout thrashing.
- **Fast-Path API**: Supports `.draw(ringBuffer)` and `.push(sample)` for sub-millisecond telemetry updates.
- **Low-Power Optimized**:
  - Draws strictly on demand via `requestAnimationFrame`.
  - Suspends painting automatically when the browser tab is hidden or backgrounded.
  - Zero background animation loops or CPU polling.

---

## Required Imports (Addon)

```html
<script type="module" src="NUI/lib/modules/nui-graph.js"></script>
<link rel="stylesheet" href="NUI/css/modules/nui-graph.css">
```

---

## Declarative Usage

```html
<!-- Static sparkline with stroke and semi-transparent area fill -->
<nui-graph 
    stroke="rgb(76, 132, 229)" 
    fill="rgba(76, 132, 229, 0.3)" 
    min="0" 
    max="100" 
    line-width="2" 
    data="[10, 15, 25, 45, 30, 60, 40, 75, 55, 90]">
</nui-graph>
```

---

## Interactive Time Scrubbing & Tooltip Configuration

Enable `interactive` to render a scrub crosshair with hovering value and historical time:

```html
<!-- Telemetry graph with relative time offset (e.g. "45.2 W • -14m 20s ago") -->
<nui-graph 
    interactive 
    scale="adaptive" 
    floor-max="10" 
    interval="5000" 
    unit="W" 
    decimals="1" 
    time-format="both" 
    stroke="#3498db" 
    fill="rgba(52, 152, 219, 0.2)">
</nui-graph>
```

### Tooltip Configuration Options

| Attribute / Property | Values | Default | Description |
| :--- | :--- | :--- | :--- |
| `unit` | String | `""` | Metric unit label appended to values (e.g. `unit="W"`, `unit="MB/s"`, `unit="°C"`, `unit="%"`). |
| `interval` | Number (ms) | `1000` | Sampling duration in milliseconds per data point. Used to calculate how far in the past historical samples occurred (e.g., `interval="1000"` for 1s ticks, `interval="5000"` for 5s ticks). |
| `decimals` | Number | `auto` | Decimal places to display (e.g. `decimals="0"` for integer metrics like ping/RPM, `decimals="2"` for rates). |
| `time-format` | `'relative'` \| `'clock'` \| `'both'` \| `'none'` | `'relative'` | How the timestamp is rendered:<br>• `'relative'`: `-18m 20s ago`<br>• `'clock'`: `16:22:05`<br>• `'both'`: `-18m ago (16:22:05)`<br>• `'none'`: hide time string |
| `graph.formatTooltip` | Function | `null` | Programmatic hook returning custom HTML or string for total control over tooltip contents. |

### Custom Tooltip Formatter Example

```javascript
const graph = document.querySelector('nui-graph');

// Complete custom formatting
graph.formatTooltip = ({ value, displayValue, unit, relativeTime, clockTime, samplesFromNow }) => {
    return `<strong>${displayValue} ${unit}</strong> <span style="opacity:0.6">${clockTime}</span>`;
};
```

### Event: `nui-graph-scrub`

When hovering or scrubbing, `<nui-graph>` dispatches a bubbling `nui-graph-scrub` CustomEvent:

```javascript
graph.addEventListener('nui-graph-scrub', (e) => {
    const { index, value, timeStr, samplesFromNow } = e.detail;
    console.log(`Scrubbed sample ${index}: ${value} (${timeStr})`);
});
```

---

## Smooth Streaming (Opt-In)

Add the `smooth` attribute for continuously panning charts (Smoothie-style, like the opnSense dashboard): the line glides leftward at the sample rate and a "head dot" holds the newest value at the right edge until the next sample lands.

```html
<nui-graph smooth interval="1000" capacity="120"></nui-graph>
```

**Performance contract — this is NOT an always-on rAF loop:**

- The animation loop starts on `push()` and runs **only while the stream is fresh** (within `1.5 × interval` of the last push).
- When the stream stalls, is paused, or the tab is hidden, the loop stops and the graph reverts to the default paint-on-change path with **zero rAF loops**.
- Static `data` attribute graphs never animate.
- Rendering cost during streaming: one canvas render per frame (identical path math to the static render — the pan is applied to the X coordinates only).

**When to use it:** live dashboards with slow sample rates (1s+) where discrete jumps feel choppy. Do not enable it on high-frequency streams where the jump per interval is already sub-pixel — it would only burn frames.

---

## Programmatic Streaming API

```javascript
const graph = document.querySelector('nui-graph');

// Option A: Push a single new sample into the internal rolling ring buffer
// Optional 2nd argument: exact timestamp in ms
graph.push(42.5, Date.now());

// Option B: High-frequency batch replacement (e.g. from an SSE 240-sample buffer)
// Optional 2nd argument: array of matching timestamps
graph.draw([12, 14, 18, 22, 35, 19, ...]);

// Option C: Clear the graph
graph.clear();
```

---

## Complete Attributes Reference

| Attribute | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `stroke` | String | `'rgb(76, 132, 229)'` | Waveform line color (CSS color expression). |
| `fill` | String | `null` | Optional bottom-anchored area fill color. |
| `min` | Number | `auto` | Minimum value of the Y axis (auto-scales if omitted). |
| `max` | Number | `auto` | Maximum value of the Y axis (auto-scales to peak if omitted). |
| `scale` | `'fixed'` \| `'adaptive'` | `'fixed'` | When set to `'adaptive'`, uses friendly 1-2-5 ladder quantization to prevent jitter. |
| `floor-max` | Number | `0` | Minimum upper ceiling in adaptive mode. Prevents idle noise from expanding to 100% height. |
| `line-width` | Number | `2` | Stroke thickness in logical pixels. |
| `capacity` | Number | `240` | Maximum size of the internal rolling buffer for `.push()`. |
| `label` | String | `null` | Embedded text label rendered inside the graph container (e.g. `label="CPU Package"`). |
| `label-position` | `'top-left'` \| `'top-right'` \| `'bottom-left'` \| `'bottom-right'` | `'top-left'` | Corner placement for the embedded label. |
| `interactive` | Boolean | `false` | Enables mouse scrubbing crosshair, target pip, and floating HUD tooltip. |
| `smooth` | Boolean | `false` | Opt-in smooth streaming: pans the chart continuously between samples with a head dot at the right edge. rAF loop runs only while the stream is fresh. |
| `unit` | String | `""` | Value unit label (e.g., `'MB/s'`, `'W'`, `'%'`). |
| `interval` | Number | `1000` | Time per sample in ms (used for time calculations). |
| `time-format` | String | `'relative'` | Tooltip time display: `'relative'`, `'clock'`, `'both'`, `'none'`. |
| `decimals` | Number | `auto` | Number of decimal places in tooltip values. |
| `reverse` | Boolean | `false` | Inverts the Y axis (useful for rank or latency graphs). |
| `data` | JSON String | `[]` | Initial flat array of numbers. |
