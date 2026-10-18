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
- **External toolbar & video-like fullscreen controls:** With `toolbar` (or `controls`), a pill toolbar sits directly under the slide canvas, in three labelled groups separated by rules — **navigation** (previous, counter, next), **delivery** (autoplay, narration) and **view** (fullscreen, settings). Autoplay shows play/pause; narration shows a voice-over icon and, while speaking, a **stop square** — a second pause glyph beside autoplay read as one control. In normal page flow the toolbar never obscures slide content; in fullscreen it floats at the bottom and reveals as the cursor approaches the bottom edge.
- **Autoplay is advance, narration is speech — two controls, two states.** The play button starts/pauses automatic advancement; the speaker button speaks the current slide through the markdown speech hook. Pausing autoplay stops the flow (and any narration it started); the narration control stays independent, so a presenter can pause the timer and still re-hear a slide.
- **Settings are behaviour, not presentation.** The gear opens a dialog that edits the same options `configure()` accepts: whether slides narrate themselves, how long to hold after speech (`narration-delay`, default 1 s), how long a silent slide stays up (`dwell`, default 5 s), and the deck's colour mode. Attribute values are the initial defaults; the dialog edits the running deck.
- **A slide is a surface, not a reading column.** The page's content measure (`--nui-md-content-maxwidth`) is a pagination concern, so the deck resets it: sections, columns and media span the canvas instead of sitting as a narrow strip in the middle of it. Media takes the height the text leaves (`object-fit: contain`), and columns stretch to that height and centre their content — top-aligning piles a slide's slack into a single band at the bottom, which reads as a mistake rather than as composition.
- **Forced colour mode.** `mode="light"` or `mode="dark"` sets `color-scheme` on the deck only, so artwork drawn on light paper does not invert with a dark host page (and vice versa). `auto` — the absence of the attribute — follows the page.
- **Vars are data, narration is delivery.** A surface renderer draws surfaces: `mb:var` cards and `preset=narration` blocks are withheld from the slide (the narration words stay in the DOM for the speech hook and `narration()`), so a deck cannot leak configuration onto a slide.
- **Placement is a profile extension, not vocabulary.** A section can carry `mb:var name=layout` with a JSON map of block id → rectangle in surface percentages. The format stores it as data and needs no new grammar; `mb:columns` stays untouched for simple splits, and the map is the escape hatch for composed slides.
- **Derived metadata:** Slide numbering (`1 / 5`) is computed and attached dynamically at render time; it is never hardcoded in source markdown.
- **Narration is delivery text (MD-Blocks spec §5.2):** blocks marked `preset=narration` are not drawn on the slide. They stay in the DOM, and the deck exposes them as data — `narration(index)` and `nui-slide-change.detail.narration` — so a delivery (TTS) profile can read the current slide's script. The optional `notes` attribute surfaces them below the canvas as speaker notes, never on the surface.
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
| `toolbar` | boolean | _none_ | When present, renders the control bar under the slide: navigation | autoplay, narration | fullscreen, settings. Automatically hidden in fullscreen. (Alias: `controls`). |
| `notes` | boolean | _none_ | Shows the current slide's narration as speaker notes beneath the toolbar (never on the slide), with a play/stop control that speaks it through the markdown speech hook. Hidden in fullscreen, and hidden per slide when that slide has no narration. |
| `narrate` | boolean | _none_ | Each slide speaks its own narration when it becomes current, and autoplay waits for that speech to finish before advancing. |
| `autoplay` | boolean | _none_ | Starts playing on mount, and reflects the running state (the toolbar button toggles it). Stops at the last slide. |
| `dwell` | number | `5` | Slide duration when there is no narration to wait for (clamped 0.5–60 s). |
| `narration-delay` | number | `1` | Pause AFTER a narration finishes, before advancing (clamped 0–60 s; `0` advances as soon as the voice stops). |
| `font-size` | string \| number | `"1.2rem"` | Base font size for the slide canvas (`"20px"`, `"1.35rem"`, `"125%"`, or a bare number: `<= 4` = rem, `> 4` = px). Can also be set in the document's YAML frontmatter (`font-size` / `slideshow.fontSize`) or per-slide via `mb:var name=font-size`. |
| `font-scale` | number | `1` | Font size boost multiplier (`0.5`–`2.5`, default `1` = `100%`) applied on top of the base font size. Editable live via the **Font size boost** slider in the settings dialog, in YAML frontmatter (`font-scale`), or per-slide via `mb:var name=font-scale`. |
| `mode` | `auto` \| `light` \| `dark` | `auto` | Forces the deck's colour scheme. `auto` follows the page; the other values set `color-scheme` on the deck subtree, so slide surfaces, toolbar and notes all follow. |
| `height` | string | _none_ | When set to `"fill"`, stretches to `height: 100%` of an explicit parent container. When set to `"viewport"`, stretches to `100dvh` for standalone presentation. Default is natural responsive page flow. |

### Keyboard Navigation

When the deck or any element within it has focus:

| Key | Action |
|-----|--------|
| `ArrowRight`, `ArrowDown`, `PageDown`, `Space` | Next slide |
| `ArrowLeft`, `ArrowUp`, `PageUp` | Previous slide |
| `Home` / `End` | Jump to first / last slide |
| `g` / `G` | Toggle slide overview grid (also triggered by clicking the `1 / N` counter in the toolbar) |
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
| `options` | `object` | The running behaviour: `{ autoplay, narrate, dwell, narrationDelay, fontScale, fontSize, mode }`. Read-only view — change it with `configure()`. |

### Methods

| Method | Parameters | Description |
|--------|------------|-------------|
| `show(i)` | `i: number` | Navigates directly to the specified zero-based slide index. |
| `next()` | _none_ | Navigates to the next slide. |
| `prev()` | _none_ | Navigates to the previous slide. |
| `toggleFullscreen()` | _none_ | Toggles fullscreen presentation mode on the deck. |
| `toggleOverview(force?)` | `force?: boolean` | Opens or closes the slide overview grid inside the viewport. |
| `configure(options)` | `{ narrate?, dwell?, narrationDelay?, fontScale?, fontSize?, mode?, autoplay? }` | Merges behaviour and typography options and applies them live (changes restart the current slide's flow; `fontScale` / `fontSize` scale slide typography and re-check overflow; `mode` re-colours the deck). Returns the resulting `options`. Attributes are the same values, so declarative and programmatic configuration cannot disagree. |
| `narration(i?)` | `i: number` (default: current) | Returns that slide's narration blocks as an array of verbatim strings, in source order. The deck's delivery seam; `[]` when the slide has none or the index is out of range. |
| `nui.components.slides.configure(options, el?)` | Factory | Programmatic configuration for the default (or a given) deck. |

### Events

| Event | `detail` | Description |
|-------|----------|-------------|
| `nui-slide-change` | `{ index, count, section, narration }` | Dispatched whenever the active slide changes. `narration` is the string array `narration(index)` returns, so a delivery profile does not have to scrape the DOM. |
| `nui-slides-autoplay` | `{ playing: boolean }` | Dispatched when autoplay starts or stops — by the toolbar, by `configure()`, or because the deck reached its last slide. |
| `nui-slides-options` | `{ options }` | Dispatched by `configure()` after the values are applied. |
| `nui-slides-error` | `{ message: string }` | Dispatched if mounting fails (e.g. missing content or invalid markup). |

## Autoplay & the settings dialog

Two independent controls, one flow:

```text
slide becomes current
        │
        ├─ narrate?  → speak the slide's script
        │              └─ wait for it to finish
        │              └─ narration-delay (default 1 s)
        │
        └─ no narration → dwell (default 5 s)
                 │
                 └─ next slide ── (last slide: autoplay stops)
```

The toolbar's play button starts or pauses this flow. The narration button is separate: it
speaks the current slide on demand, and pausing autoplay stops any speech it started but
does not disable the control. Every navigation — by autoplay, keyboard, or `next()` —
re-bases the flow on the slide that is now current, so a stale timer can never advance a
slide the viewer already left.

```html
<nui-slides toolbar notes narrate dwell="4" narration-delay="1">
    <nui-markdown src="deck.md"></nui-markdown>
</nui-slides>
```

```javascript
const deck = document.querySelector('nui-slides');
deck.configure({ narrate: true, dwell: 2.5, narrationDelay: 1, autoplay: true });
deck.options;   // { autoplay: true, narrate: true, dwell: 2.5, narrationDelay: 1 }
```

The gear button opens the same options in a dialog (narrate, colour mode, pause after narration, slide duration);
`Apply` calls `configure()`. The dialog edits the running deck — persistence is the
host's decision, exactly as it is for the document itself.

### Why the format needs no new vocabulary for this

"Fill the surface" and "force light mode" look like document facts, but they are not:
the MD-Blocks format deliberately stores structure and leaves geometry to the renderer
profile (§5, and the spec's own separation of format from profile). A section is already
a surface; how much of that surface its content claims is the profile's decision. The
seam is a CSS custom property, not an attribute — `--nui-md-content-maxwidth` on the
deck — so the same document keeps the page's reading measure in a page renderer and
fills the canvas in a deck. A document that truly needs to state layout intent has the
existing hooks: frontmatter (document-wide) or `mb:var` (per section), both of which the
format stores without interpreting.

## Slide layout (three-layer profile system)

> The rationale, rejected alternatives, and pattern catalogue are documented in
> [`docs/slide-layout-proposal.md`](../../docs/slide-layout-proposal.md).

To keep decks readable as clean Markdown while supporting rich slide compositions, `nui-slides`
organises layout into three progressive layers:

### Layer 1: Flow, Columns & Section Vars (0 JSON, 0 IDs)

- **Vertical & horizontal centering:** Add `preset=center` (or `preset=band`) to `mb:section` to vertically centre the slide's in-flow content between header and footer; use `preset=center:middle` (or `mb:var name=align value=middle`) to centre both axes.
- **Proportional splits & rails:** Use `mb:columns weights=[3,2]`, `[2,3]`, `[1,3]`. Columns stretch to the canvas height and centre their content by default (`safe center`); add `preset=top` or `preset=bottom` on `mb:col` to pin a rail or heading to the top/bottom edge.
- **Per-slide section vars:**
  - `<!-- mb:var name=chrome value=none|header|footer -->` — hides running header/footer and slide counter on title, divider, or bleed slides.
  - `<!-- mb:var name=dwell value=12 -->` (or `name=seconds`) — overrides the silent autoplay duration for that slide.
  - `<!-- mb:var name=mode value=light|dark -->` — forces the slide's colour scheme and paints its surface (`var(--color-base)`).

### Layer 2: Bleed Plates & Scrim Overlays (0 JSON, 0 IDs)

- **Full-bleed plates:** `<!-- mb:block preset=image:hero:bleed -->` or `<!-- mb:section preset=cover -->` fills the 16:9 canvas edge-to-edge (`object-fit: cover`; use `preset=cover:contain` for uncropped diagrams, and `focal={"x":0.5,"y":0.2}` on the image block to control `object-position`).
- **Anchored scrim overlays:** Use the 3rd preset segment on `card:scrim` to anchor an overlay card over a hero or bleed plate without coordinates:
  - `preset=card:scrim:bottom`, `card:scrim:bottom-left`, `card:scrim:bottom-right`
  - `preset=card:scrim:top`, `card:scrim:top-left`, `card:scrim:top-right`
  - `preset=card:scrim:center`

```markdown
<!-- mb:block preset=image:hero -->
![Data in — model — data out](images/atom-chart.webp)
<!-- mb:/block -->

<!-- mb:block preset=card:scrim:bottom -->
**data in, inference, data out** — every product is that one act, repeated and arranged.
<!-- mb:/block -->
```

### Layer 3: Freeform Coordinate Map (`mb:var name=layout`)

For multi-box posters or when reading order and visual stacking differ, a section can place its blocks anywhere on the surface with an `mb:var name=layout` map (authored as a fenced ```` ```json ```` block or inline via `value={...}`):

````markdown
<!-- mb:section id=poster -->
<!-- mb:var name=layout -->
```json
{
  "poster-image":  { "x": 0,  "y": 0,  "w": 100, "h": 100, "z": 1, "fit": "cover" },
  "poster-title":  { "x": 6,  "y": 12, "w": 50,  "h": 36,  "z": 2, "valign": "center" },
  "poster-credit": { "x": 66, "y": 80, "w": 28,  "h": 12,  "z": 2, "mode": "light", "valign": "center", "align": "center" }
}
```

<!-- mb:block id=poster-image preset=image:hero:bleed -->
![Plate](images/plate.webp)
<!-- mb:/block -->

<!-- mb:block id=poster-title preset=card:scrim -->
### Multi-box poster
Heading and prose stay inside one block and centre vertically via `"valign": "center"`.
<!-- mb:/block -->

<!-- mb:block id=poster-credit preset=card:scrim -->
**Plate: NUI demo set**
<!-- mb:/block -->
````

Rules:
- **Percentages of the slide surface** (`x`, `y`, `w`, `h`), origin top-left. `0/0/100/100` is a true bleed.
- **All-or-nothing per section:** every visible block needs an id and an entry; an incomplete map warns and falls back to flow.
- **Area options:** `z` (integer stacking order), `valign` (`start|center|end`), `align` (`start|center|end`), `fit` (`cover|contain`), and `mode` (`light|dark` block-level colour scheme override).
- **Chrome is the frame (`z: 10`):** repeating header/footer and slide counter sit above placed areas unless hidden with `mb:var name=chrome value=none` or overridden with a higher `z`.

**Why a var and not new syntax.** The format's six directives are fixed, and a profile
extension must not widen them. `mb:var` is already defined as section data (spec §4.4):
the spec stores it without interpreting it, a page renderer shows the prose in source
order, a generic preview shows the fenced JSON (a code block), and the deck reads it as
geometry. The same document therefore has a meaning in every renderer, and none of them
had to change. `mb:columns` is untouched: it stays the simple, flow-level split; the
layout map is the escape hatch when a slide is composed rather than flowed.

The blocks editor preserves the var and its JSON unchanged, so a laid-out deck
round-trips today; a visual area editor would be an editor feature, not a format one.

### Creating your own slide patterns

> Full pattern cookbook and authoring tutorial: [`documentation/guides/slide-patterns.md`](../guides/slide-patterns.md) (`documentation/NUI/guide_slide_patterns.md` in MCP storage).

Three ways to create custom patterns, ordered from lightest to most reusable:

1. **Compose with Layer 1 & 2 primitives (no JSON, no CSS):** Combine `mb:columns weights=[a,b,c]`, column alignment (`mb:col preset=top|bottom`), section centering (`mb:section preset=center|center:middle`), section vars (`chrome`, `mode`, `font-size`, `font-scale`, `dwell`), full-bleed plates (`preset=image:hero:bleed` with `focal={"x":...,"y":...}`), and anchored scrim slots (`preset=card:scrim:bottom-left`).
2. **Design a Layer 3 coordinate map (`mb:var name=layout`):** Sketch rectangles in `0..100` canvas percentages (`x, y, w, h, z`). Keep a heading and its paragraphs inside **one** block with `"valign": "center"` so wrapped headings never collide with body text. Use inline `<!-- mb:var name=layout value={...} -->` if you want zero JSON code blocks in generic Markdown previews.
3. **Promote a recurring layout to a CSS preset:** Because `nui-markdown` maps `preset=family:modifier:variant` to `.nui-preset-<family>.nui-variant-<modifier>.nui-variant-<variant>`, any recurring placement can be defined as a CSS rule under `nui-slides .nui-blocks-section:not([data-layout])` (for example `.nui-preset-card.nui-variant-scrim.nui-variant-rail-right`) — zero parser changes, zero validator warnings, and graceful degradation in page view.

## Colour mode & contrast

Colour is controlled at three scopes, all through `color-scheme`:

| Scope | Declared by | Effect |
|---|---|---|
| Deck | `mode="auto \| light \| dark"` (attribute) | the default scheme for every slide, toolbar and notes |
| Slide | `mb:var name=mode value=light` (or `dark`) | forces that slide's scheme |
| Block | preset variants — `preset=card:scrim` | a surface treatment that guarantees contrast over imagery |

**A slide override must paint its own surface.** A section is a transparent layer over the
deck's canvas, so flipping `color-scheme` alone would put dark text on the deck's still-dark
background. The slide mode therefore also sets its background to the scheme's base colour.

**Text over an image needs a surface, not a tint.** The default card is a 5 % tint of the text
colour — a lift on a known surface, and no surface at all over a photograph. `preset=card:scrim`
paints ~92 % of the scheme's own surface (plus a backdrop blur), so the normal text colour keeps
its normal contrast. It is profile vocabulary: a renderer that does not know `scrim` draws an
ordinary card.

Prefer scheme tokens (`--text-color`, `--color-base`, `--color-shadeN`) in any custom styling;
hardcode a colour only where the composition genuinely requires a fixed value.

## Narration (delivery text)

A block with `preset=narration` is **text the presentation delivers aloud** rather than
content it shows (MD-Blocks spec §5.2). Source order is delivery order, and a section may
carry any number of them:

```markdown
<!-- mb:block preset=narration -->
The words to speak, verbatim.
<!-- mb:/block -->
```

The deck never renders it on the slide. Four ways to reach it:

```javascript
// 1. Per-slide data (any slide)
deck.narration(0);          // ["The words to speak, verbatim."]

// 2. With the slide change (the delivery hook)
deck.addEventListener('nui-slide-change', (e) => speak(e.detail.narration.join(' ')));

// 3. The toolbar's narration button — speaks the current slide on demand
//    <nui-slides toolbar>

// 4. Speaker notes beneath the controls (authoring / rehearsal)
//    <nui-slides toolbar notes>
```

The optional `notes` attribute writes the current slide's narration into a labelled
`.nui-slides-notes` strip below the toolbar (the controls sit directly under the slide,
the narration under them); it is removed in fullscreen and hidden when the slide has
none. The strip carries a **play/stop control** — the same action as the toolbar's
narration button — and it speaks the slide's narration, every block in source order,
handed over as one script through the same hook as the per-block controls
(`nui.util.setMarkdownSpeech`), so an application's TTS endpoint answers rather than a
private player. Advancing a slide stops playback, and the text is verbatim — no
typographic pass, no injected label in the string.
