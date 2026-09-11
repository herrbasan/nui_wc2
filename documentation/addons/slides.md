# nui-slides

## Setup

This is an addon module. Load both the JS and CSS before use:

```html
<link rel="stylesheet" href="NUI/css/modules/nui-slides.css">
<script type="module" src="NUI/lib/modules/nui-slides.js"></script>
```

## Design Philosophy

`nui-slides` is the presentation profile for MD-Blocks documents rendered by `nui-markdown`. While standard Markdown rendering flows content into a continuous vertical page, `nui-slides` turns every root-level `section` into a discrete presentation surface — one slide per viewport — and manages slide transitions, scaling, and focus.

Key design principles:
- **Direct in-flow presentation:** `<nui-slides>` sits directly in the document flow with a responsive aspect ratio matching its canvas (16:9 by default), complete with integrated styling. It does not require a custom container wrapper.
- **Canvas-based scaling:** A slide is composed in a fixed logical coordinate space (16:9 `1280x720` by default). The entire canvas scales automatically to fit the deck viewport while preserving aspect ratio, typography, and layout proportions across all screen sizes.
- **Surface, not scroll:** Slides do not scroll. The deck displays exactly one slide at a time and marks non-visible slides as `inert`, keeping assistive technologies and tab order focused on visible content.
- **Chrome repetition:** Document chrome (headers, footers) is authored once on the MD-Blocks `main` scope with `repeat=header` or `repeat=footer`. `nui-slides` clones this chrome across all slides in that scope.
- **Metadata stripping:** Frontmatter metadata (YAML) is automatically stripped from the visible slide surfaces so loose metadata disclosures do not pollute the slide canvas. The parsed object remains accessible via `nui-markdown.metadata` (e.g. used for deck `aria-label`).
- **External toolbar & video-like fullscreen controls:** With `toolbar` (or `controls`), a sleek pill toolbar provides intuitive navigation (Previous, Next, slide counter, and Fullscreen toggle). In normal page flow, the toolbar is positioned outside the slide canvas directly beneath it, never obscuring slide content. In fullscreen mode, it floats at the bottom and smoothly reveals when the cursor approaches the bottom edge, matching standard video player control behavior.
- **Derived metadata:** Slide numbering (`1 / 5`) is computed and attached dynamically at render time; it is never hardcoded in source markdown.
- **Overflow reporting:** If content exceeds the slide canvas height, `nui-slides` logs a warning in the console and marks the slide with `data-overflow` rather than silently cropping content.

When to Use:
- Presentations and slide decks authored in pure Markdown / MD-Blocks
- Product tours and step-by-step briefings
- Fullscreen kiosks and digital signage

## Declarative Usage

Wrap a `<nui-markdown>` element inside `<nui-slides>`. Placed directly in standard page flow:

```html
<nui-slides toolbar base="1280x720">
    <nui-markdown src="presentation.md"></nui-markdown>
</nui-slides>
```

You can also use inline markdown with `<script type="text/markdown">`:

```html
<nui-slides toolbar base="1280x720">
    <nui-markdown>
        <script type="text/markdown">
<!-- mb:block repeat=header -->
**My Deck** — Q3 Architecture Review
<!-- mb:/block -->

# Title Slide

Welcome to the presentation.

---

# Second Slide

- Point 1
- Point 2

<!-- mb:block repeat=footer -->
*Confidential*
<!-- mb:/block -->
        <\/script>
    </nui-markdown>
</nui-slides>
```

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `base` | string | `"1280x720"` | Logical canvas dimensions. Specify `"widthxheight"` (e.g. `"1280x720"` for 16:9, `"1024x768"` for 4:3) or a bare width (e.g. `"1600"` which implies 16:9). In page flow, the component automatically sets its aspect ratio to match. |
| `toolbar` | boolean | _none_ | When present, renders a floating bottom toolbar for non-fullscreen mode with Previous, Next, counter, and Fullscreen toggle. Automatically hidden in fullscreen. (Alias: `controls`). |
| `height` | string | _none_ | When set to `"fill"`, stretches to `height: 100%` of an explicit parent container. When set to `"viewport"`, stretches to `100dvh` for standalone presentation. Default is natural responsive page flow. |

### Keyboard Navigation

When the deck or any element within it has focus:

| Key | Action |
|-----|--------|
| `ArrowRight`, `ArrowDown`, `PageDown`, `Space` | Next slide |
| `ArrowLeft`, `ArrowUp`, `PageUp` | Previous slide |
| `Home` | Jump to first slide |
| `End` | Jump to last slide |
| `f` / `F` | Toggle fullscreen mode |

*Note: Keyboard navigation automatically stands down when focus is on interactive controls (`<a>`, `<button>`, `<input>`, `<textarea>`, etc.).*

## Programmatic Usage

Control slide transitions using the `nui.components.slides` helper or directly on the element instance:

```javascript
// Via global helper
nui.components.slides.show(0);  // Show first slide
nui.components.slides.next();   // Advance to next slide
nui.components.slides.prev();   // Return to previous slide

// On an element instance
const deck = document.querySelector('nui-slides');
deck.show(2);
deck.next();
deck.prev();
console.log(`Slide ${deck.current + 1} of ${deck.count}`);
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `count` | `number` | Total number of slides in the deck. |
| `current` | `number` | Zero-based index of the currently displayed slide. |

### Methods

| Method | Parameters | Description |
|--------|------------|-------------|
| `show(i)` | `i: number` | Navigates directly to the specified zero-based slide index. |
| `next()` | _none_ | Navigates to the next slide. |
| `prev()` | _none_ | Navigates to the previous slide. |
| `toggleFullscreen()` | _none_ | Toggles fullscreen presentation mode on the deck. |
| `nui.components.slides.toggleFullscreen(el?)` | Factory | Programmatically toggle fullscreen mode on a deck. |

### Events

| Event | `detail` | Description |
|-------|----------|-------------|
| `nui-slide-change` | `{ index: number, count: number, section: HTMLElement }` | Dispatched whenever the active slide changes. |
| `nui-slides-error` | `{ message: string }` | Dispatched if mounting fails (e.g. missing content or invalid markup). |
