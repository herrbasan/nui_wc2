# Authoring Slide Decks & Creating Custom Patterns (`nui-slides`)

`nui-slides` is the presentation profile for **MD-Blocks** documents rendered by `<nui-markdown>`. It turns every root-level `---` section into a `1280×720` (16:9) scaled slide canvas while keeping the source file **pure, readable CommonMark** that validates with zero errors under the MD-Blocks v1.6 spec.

> **Why this lives in NUI and not in the MD-Blocks spec:**
> The MD-Blocks spec defines **document structure** (the 6 directives: `main`, `section`, `block`, `columns`, `col`, `var`, plus the `family[:modifier[:variant]]` preset grammar). Surface geometry, aspect-ratio scaling, colour-scheme overrides, and `mb:var` interpretation are **renderer profile concerns** (MD-Blocks spec §4.4, §5). Nothing in this guide adds new directives or attributes to the format, so every slide deck remains a 100% spec-conformant Markdown document.

---

## 1. The Decision Rule: Three Layers of Composition

Before writing a slide, apply **The Blueprint Test**:
- Does the slide flow naturally top-to-bottom or left-to-right? → **Layer 1 (Flow & Columns)**
- Is it a full-slide image or diagram with a caption/callout card anchored over it? → **Layer 2 (Bleed Plate + Scrim Overlay)**
- Does it have multiple independent floating boxes at custom coordinates, or reading order that differs from visual order? → **Layer 3 (Coordinate Map)**

| Layer | Share of typical deck | Mechanism | Visible in GitHub / VS Code Markdown preview? |
|---|---|---|---|
| **Layer 1: Flow & Columns** | ~85% | Plain Markdown, `mb:columns weights=[...]`, `mb:section preset=center`, `mb:col preset=top` | **No** (HTML comments are invisible) |
| **Layer 2: Plate & Scrim Overlay** | ~12% | `preset=image:hero:bleed` (or `image:hero`) + `preset=card:scrim:<slot>` | **No** (HTML comments are invisible) |
| **Layer 3: Coordinate Map** | ~3% | `mb:var name=layout` mapping block `id` → `{ x, y, w, h, z, valign, align, fit, mode }` | **No** if inline (`value={...}`), or shown as a ```json code block if fenced |

---

## 2. Core Capabilities Reference

### 2.1 Deck-Level Configuration (`<nui-slides>` & YAML Frontmatter)

```html
<nui-slides toolbar notes narrate mode="auto" font-size="1.2rem" font-scale="1" base="1280x720">
    <nui-markdown src="deck.md"></nui-markdown>
</nui-slides>
```

A deck can also declare its defaults in YAML frontmatter (stripped from the visual canvas automatically):

```yaml
---
title: Architecture Review
mode: dark
font-size: 1.25rem
font-scale: 1.1
---
```

### 2.2 Per-Slide Variables (`mb:var`)

Place any of these at the top of a section (right after `---` or `<!-- mb:section ... -->`):

| Variable | Values | Effect on that slide |
|---|---|---|
| `<!-- mb:var name=mode value=light -->` | `light` \| `dark` | Forces the slide's `color-scheme` **and** paints its surface (`var(--color-base)`), so a light slide inside a dark deck has a true white paper surface. |
| `<!-- mb:var name=chrome value=none -->` | `none` \| `header` \| `footer` \| `all` | Controls whether the main's repeating header, repeating footer, and `1 / N` slide counter appear on this slide. Use `none` on title, divider, and full-bleed slides. |
| `<!-- mb:var name=align value=center -->` | `start` \| `center` \| `middle` \| `end` | Vertically centres (`center`) or both vertically and horizontally centres (`middle`) in-flow content between header and footer. |
| `<!-- mb:var name=dwell value=12 -->` | `0.5`–`300` (seconds; alias `name=seconds`) | Overrides the deck's silent autoplay duration for this slide. |
| `<!-- mb:var name=font-size value=22px -->` | CSS length (`22px`, `1.4rem`, `120%`) | Overrides the base font size for this slide. |
| `<!-- mb:var name=font-scale value=1.25 -->` | `0.5`–`2.5` | Multiplies the font size on this slide (stacks with the user's **Font size boost** slider in the settings dialog). |

### 2.3 Section, Column & Block Presets for Slides

| Target | Preset | What `nui-slides` does |
|---|---|---|
| `mb:section` | `preset=center` (or `preset=band`) | Vertically centres the slide's in-flow content group between header and footer while keeping `repeat=header` pinned at the top edge. |
| `mb:section` | `preset=center:middle` | Vertically **and** horizontally centres the slide's in-flow content. |
| `mb:section` | `preset=cover` / `preset=cover:contain` | Treats the section's media block as a full-canvas background plate (`object-fit: cover`, or `contain` with `:contain`). |
| `mb:col` | *(default)* | Stretches to canvas height and vertically centres column content (`justify-content: safe center`). |
| `mb:col` | `preset=top` / `preset=bottom` | Pins column content to the top or bottom edge (ideal for left-rail headings and agendas). |
| `mb:block` (media) | `preset=image` / `preset=image:hero` | Takes the remaining canvas/column height with `object-fit: contain` so illustrations never overflow. |
| `mb:block` (media) | `preset=image:hero:bleed` | Expands to `0/0/100/100` (`inset: 0; object-fit: cover`) as a full-bleed background plate. Add `focal={"x":0.5,"y":0.2}` to control `object-position`. |
| `mb:block` (card) | `preset=card:scrim` | Paints ~92% of the active scheme's base surface + `backdrop-filter: blur(6px)` for guaranteed text contrast over photos. |
| `mb:block` (card) | `preset=card:scrim:<slot>` | Anchors a scrim card over a hero/bleed plate at `<slot>`: `bottom`, `bottom-left`, `bottom-right`, `top`, `top-left`, `top-right`, or `center`. |
| `mb:block` (prose) | `preset=narration` | Spoken delivery script (hidden on the slide surface, surfaced in speaker `notes` and read via TTS in source order). |

---

## 3. Ready-to-Use Pattern Recipes

### Pattern 1: Clean Title / Closing Slide (Layer 1)
Centres the title and lead paragraph vertically, and hides the running header and slide counter.

```markdown
<!-- mb:section id=title preset=center -->
<!-- mb:var name=chrome value=none -->

# The Architecture of Trust

<!-- mb:block preset=lead -->
Why deterministic structure beats guesswork in AI-authored documents.
<!-- mb:/block -->
```

### Pattern 2: Section Divider with Stat Badge (Layer 1)
Uses a `1:3` column split on a vertically centred, chrome-free slide.

```markdown
<!-- mb:section id=part-2 preset=center -->
<!-- mb:var name=chrome value=none -->

<!-- mb:columns weights=[1,3] -->
<!-- mb:col -->
<!-- mb:block preset=card:stat -->
# 02
<!-- mb:/block -->
<!-- mb:col -->
## Surface Geometry

How a continuous document becomes a 16:9 canvas without changing a line of prose.
<!-- mb:/columns -->
```

### Pattern 3: 60 / 40 Text & Illustration Split (Layer 1)
Keep the heading and its paragraphs inside the **same** column so a wrapping heading pushes prose down naturally instead of colliding.

```markdown
<!-- mb:columns weights=[3,2] -->
<!-- mb:col -->
## One request in, one response out

A sentence goes in, a finished note comes out. Both columns stretch to the slide canvas and centre their content automatically.
<!-- mb:col -->
<!-- mb:block preset=image -->
![Illustration](images/diagram.webp)
<!-- mb:/block -->
<!-- mb:/columns -->
```

### Pattern 4: Left Rail / Agenda (Layer 1)
Pin the left column to the top with `mb:col preset=top` while the right column carries the steps or lead prose.

```markdown
<!-- mb:columns weights=[1,3] -->
<!-- mb:col preset=top -->
## Agenda

Five steps, in order.
<!-- mb:col -->
<!-- mb:block preset=list:steps -->
1. Define the surface
2. Flow the common 85%
3. Anchor overlays with scrim slots
4. Place multi-box posters with a map
5. Verify with zero overflow
<!-- mb:/block -->
<!-- mb:/columns -->
```

### Pattern 5: Full-Bleed Photograph + Scrim Caption (Layer 2)
`image:hero:bleed` fills the 16:9 canvas edge-to-edge (`object-fit: cover`), and `card:scrim:bottom-left` floats over it.

```markdown
<!-- mb:block preset=image:hero:bleed focal={"x":0.5,"y":0.3} -->
![Showroom floor](images/showroom.webp)
<!-- mb:/block -->

<!-- mb:block preset=card:scrim:bottom-left -->
**Munich Pilot** — The scrim paints 92% of the slide's base surface with a blur, keeping 16:1 text contrast over any photograph.
<!-- mb:/block -->
```

### Pattern 6: Uncropped Diagram on Light Paper + Bottom Overlay (Layer 2)
When a diagram is drawn on a white background, force `mode value=light` on the slide, use `preset=image:hero` (`object-fit: contain`), and overlay `preset=card:scrim:bottom`.

```markdown
<!-- mb:var name=mode value=light -->

<!-- mb:block preset=image:hero -->
![Data in — model — data out](images/atom-chart.webp)
<!-- mb:/block -->

<!-- mb:block preset=card:scrim:bottom -->
**data in, inference, data out** — every product, every "intelligent platform" is that one act, repeated and arranged.
<!-- mb:/block -->
```

---

## 4. How to Create Your Own Patterns

There are **three ways** to create new slide patterns, ordered from lightest to most reusable:

### Method A: Compose a New Pattern with Existing Primitives (No JSON, No CSS)

Before reaching for coordinates, combine:
1. **Column weights (`weights=[a,b,c]`):** Any ratio (`[1,2]`, `[1,4]`, `[2,1,1]`) works up to 6 columns.
2. **Column vertical pin (`mb:col preset=top` / `preset=bottom`):** Mix a top-pinned label column with a bottom-pinned caption column and a full-height centre image column:

```markdown
<!-- mb:columns weights=[1,2,1] -->
<!-- mb:col preset=top -->
### Context
Pinned to the top-left of the slide.
<!-- mb:col -->
<!-- mb:block preset=image:hero:bleed -->
![Center plate](images/plate.webp)
<!-- mb:/block -->
<!-- mb:col preset=bottom -->
<!-- mb:block preset=card:note -->
Pinned to the bottom-right of the slide.
<!-- mb:/block -->
<!-- mb:/columns -->
```

### Method B: Design a Custom Coordinate Pattern (`mb:var name=layout`)

When you need overlapping layers, asymmetric floating cards, or diagram callouts at exact canvas coordinates, design a **Layer 3 layout map**.

#### Step 1: Sketch on the `100 × 100` percentage canvas
The slide canvas is `1280×720` (16:9), addressed as `0..100` in both axes (`x`, `y`, `w`, `h` from top-left):
- **Safe margins:** Keep text areas within `x: 6..94` and `y: 10..90` (`y: 12` if the slide has a repeating header).
- **Never split a heading and its paragraphs into two `y`-positioned blocks.** Put the heading and its prose inside **one** `mb:block` and use `"valign": "center"` (or `"start"` / `"end"`) on the area. That way a two-line heading never collides with the paragraph below it.

#### Step 2: Write the blocks in reading order, then assign areas
Source order should always be the order a human or screen reader reads the document. Use `"z"` when an earlier block in the document must paint on top of a later background image:

````markdown
<!-- mb:section id=custom-poster -->
<!-- mb:var name=layout -->
```json
{
  "bg-plate":    { "x": 0,  "y": 0,  "w": 100, "h": 100, "z": 1, "fit": "cover" },
  "main-claim":  { "x": 6,  "y": 14, "w": 44,  "h": 48,  "z": 2, "valign": "center" },
  "kpi-top":     { "x": 64, "y": 14, "w": 30,  "h": 28,  "z": 2, "mode": "light", "valign": "center" },
  "kpi-bottom":  { "x": 64, "y": 48, "w": 30,  "h": 28,  "z": 2, "mode": "dark",  "valign": "center" }
}
```

<!-- mb:block id=main-claim preset=card:scrim -->
## Reading order comes first

This card is first in the Markdown file and sits above the background plate (`z: 2`).
<!-- mb:/block -->

<!-- mb:block id=kpi-top preset=card:stat -->
### 16.7:1
Measured contrast ratio
<!-- mb:/block -->

<!-- mb:block id=kpi-bottom preset=card:stat -->
### 0 ms
Runtime layout overhead
<!-- mb:/block -->

<!-- mb:block id=bg-plate preset=image -->
![Backdrop](images/backdrop.webp)
<!-- mb:/block -->
````

> **Tip — Invisible single-line form:** If you don't want the fenced ```` ```json ```` block to appear as a code block in GitHub/VS Code Markdown previews, put the JSON inline in the `value=` attribute:
> `<!-- mb:var name=layout value={"bg-plate":{"x":0,"y":0,"w":100,"h":100,"z":1,"fit":"cover"},"main-claim":{"x":6,"y":14,"w":44,"h":48,"z":2,"valign":"center"}} -->`

#### Step 3: Check the console & overflow outline
- **All-or-nothing rule:** Every visible content block in that section (excluding `preset=narration` and `mb:var`) must have an `id` and a matching key in `layout`. If any block is missing an `id` or entry, `nui-slides` logs the exact missing `#id` in the console and falls back to flow.
- **Overflow check:** Open the slide and drag the **Font size boost** slider in the settings dialog. If an area's text exceeds its `h` box, `nui-slides` outlines that area (`[data-overflow]`) and logs `[nui-slides] slide M of N area #id is Xpx taller than its layout box`.

---

### Method C: Promote a Recurring Pattern to a Reusable CSS Preset

If you find yourself copying the same coordinate numbers across multiple slides (the Blueprint Test: *"if the numbers are the same every time, it is a pattern"*), promote it to a **CSS preset** in your stylesheet or `nui-slides.css`!

Because `nui-markdown` translates every `preset=family[:modifier[:variant]]` into predictable classes on the `<section>`, `<div>`, `<article>`, or `<figure>`:
- `preset= family` → `.nui-preset-<family>`
- `:modifier` → `.nui-variant-<modifier>`
- `:variant` → `.nui-variant-<variant>`

You can define a new slide layout pattern in pure CSS with zero JavaScript:

```css
/* Example: A custom `preset=section:split-diagonal` or `preset=card:scrim:rail-right` */
nui-slides .nui-blocks-section:not([data-layout]) > .nui-preset-card.nui-variant-scrim.nui-variant-rail-right {
	position: absolute;
	inset-block: var(--nui-space-double);
	inset-inline-end: var(--nui-space-double);
	width: 32%;
	z-index: 3;
	margin: 0;
	display: flex;
	flex-direction: column;
	justify-content: safe center;
}
```

Then in Markdown:

```markdown
<!-- mb:block preset=image:hero:bleed -->
![Full-bleed plate](images/plate.webp)
<!-- mb:/block -->

<!-- mb:block preset=card:scrim:rail-right -->
## Right-hand Scrim Rail

A full-height frosted rail on the right edge of the slide — authored with a single preset token and degrading to an ordinary card in page view.
<!-- mb:/block -->
```

Why this works so well:
1. **Zero parser changes:** `card` is already a known preset family, so `card:scrim:rail-right` emits `.nui-preset-card.nui-variant-scrim.nui-variant-rail-right` automatically.
2. **Graceful degradation (MD-Blocks spec §5):** A page renderer (`nui-markdown` outside `nui-slides`) knows `card:scrim` and ignores the `.nui-variant-rail-right` slide modifier, rendering a normal card in document flow.
3. **Zero validator warnings:** `node tools/validate.js` passes with 0 errors and 0 warnings.
