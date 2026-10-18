# Proposal — a layout system for MD-Blocks presentations

**Status:** prototype, implemented in `nui-slides`, not part of the MD-Blocks spec.
**Scope:** a renderer profile extension that stays inside the format's existing grammar.
**Author:** NUI project (with David), October 2026.

This proposes how a plain Markdown document can compose **slide layouts** — splits,
overlays, full-bleed media, forced colour modes — without teaching the format a new
layout language, and without breaking any renderer that does not know about it.

The prototype is live in the NUI Playground; see [Demo pages](#demo-pages) at the end.

> Reference documentation for the implemented component: [`documentation/addons/slides.md`](../documentation/addons/slides.md).

---

## The problem

MD-Blocks gives a document structure: sections (= slides), blocks, columns, named data.
That is enough for a slide that flows, but not for the compositions a real deck needs:

- a 60/40 split where the image runs the full height,
- a title over a full-bleed photograph,
- a caption card sitting on artwork,
- a light slide inside a dark deck,
- a quote with a lot of air around it.

`mb:columns` covers the first one crudely (a grid of the whole section), and nothing
covers the others. The question this proposal answers is where that capability lives.

## Goals

1. **The document stays Markdown.** No new syntax in the prose; a generic preview
   (GitHub, VS Code, Obsidian) still reads it as an ordinary document.
2. **No change to the six directives.** A spec-conformant parser must not have to learn
   anything, and a document must stay valid when it is not being presented.
3. **Every renderer keeps a meaning.** A page renderer shows the prose in source order;
   a deck reads geometry; neither has to know about the other.
4. **Failing is loud.** A broken layout falls back, with a message — not a half-laid
   slide.
5. **Authorable by an LLM and editable by the existing editor** (round-trip, no loss).

## Non-goals

- A general CSS framework for documents.
- Absolute positioning on printed or continuous pages.
- A visual design tool (that would be an editor feature, on top of this data).

---

## The model: three layers, from flow to freeform

To keep presentation source files readable as ordinary Markdown (with zero fenced JSON on
95 % of slides), slide composition is structured into **three progressive layers**, all
within the existing MD-Blocks v1.6 grammar:

1. **Layer 1 — Flow, Columns & Alignment (~85 % of slides, 0 JSON, 0 IDs)**
   - Standard Markdown flow, `mb:columns weights=[3,2]` / `[2,3]` / `[1,3]` splits, and
     column vertical alignment (`mb:col preset=top` / `preset=bottom`, defaulting to
     `safe center`).
   - Section vertical centering (`<!-- mb:section preset=center -->`, `preset=band`, or
     `preset=center:middle` for vertical + horizontal centering) centres the in-flow
     content group between header and footer via `auto` margins while keeping
     `repeat=header` pinned at the top edge.
   - Per-slide section vars: `mb:var name=chrome value=none|header|footer` (suppresses
     running chrome/counter on title or divider slides) and `mb:var name=dwell value=N`
     (or `seconds`).

2. **Layer 2 — Bleed Plates & Anchored Scrim Overlays (~12 % of slides, 0 JSON, 0 IDs)**
   - Full-bleed background imagery via `preset=image:hero:bleed` or
     `<!-- mb:section preset=cover -->` (`object-fit: cover`, or `preset=cover:contain`
     for uncropped diagrams).
   - Anchored high-contrast overlay cards via the 3rd preset segment on `card:scrim`:
     `preset=card:scrim:bottom`, `:bottom-left`, `:bottom-right`, `:top`, `:top-left`,
     `:top-right`, `:center`.
   - In page renderers (`nui-markdown`), unknown 3rd segments degrade gracefully per
     spec §5 to an ordinary scrim card in source order; in `nui-slides`, the card
     anchors over the plate while the media block retains 100 % of the slide height.

````markdown
<!-- mb:block preset=image:hero -->
![Data in — model — data out](../images/atom-chart.webp)
<!-- mb:/block -->

<!-- mb:block preset=card:scrim:bottom -->
**data in, inference, data out** — every product, every "intelligent platform" is that one act, repeated and arranged.
<!-- mb:/block -->
````

3. **Layer 3 — Freeform Coordinate Map (~3 % of slides, multi-box posters & visual tools)**
   - When a slide needs multiple independent floating boxes, decoupled reading and paint
     order (`z`), or arbitrary coordinates, a section carries `mb:var name=layout`.
   - Can be authored either as a fenced ```` ```json ```` block or inline on the comment
     line (`<!-- mb:var name=layout value={...} -->`) so generic Markdown previews show
     zero code blocks.

### Layer 3 Syntax (`mb:var name=layout`)

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
![Bleed plate](images/plate.webp)
<!-- mb:/block -->

<!-- mb:block id=poster-title preset=card:scrim -->
### Multi-box poster

Heading and prose stay inside one block and centre vertically via `"valign": "center"`.
<!-- mb:/block -->

<!-- mb:block id=poster-credit preset=card:scrim -->
**Plate: NUI demo set**
<!-- mb:/block -->
````

### Area Properties (Layer 3)

- `x`, `y`, `w`, `h` — **percentages of the slide surface**, origin top-left (`0/0/100/100` is a true bleed).
- `z` — optional integer stacking order (omitted = document order).
- `valign` — `"start" | "center" | "end"` vertical alignment inside the rectangle (avoids splitting headings and paragraphs into separate `y`-positioned boxes that collide on wrap).
- `align` — `"start" | "center" | "end"` horizontal text alignment inside the rectangle.
- `fit` — `"cover" | "contain"` object-fit override for media blocks (`preset=image:hero:bleed` defaults to `cover`; `focal={"x":0..1,"y":0..1}` on the block sets `object-position`).
- `mode` — `"light" | "dark"` block-level colour scheme override.

### Rules

1. **All-or-nothing per section (Layer 3).** Every visible block needs an id _and_ an entry. A
   missing id, a missing area, or an unknown key makes the renderer ignore the map,
   warn in the console, and lay the section out in flow.
2. **Source order is the default paint order.** Overlaps are allowed; `z` settles them.
3. **Areas are rectangles and do not clip.** Content that outgrows its area or slide is
   flagged with `data-overflow` and a console diagnostic naming the slide and `#block-id`.
4. **The map is configuration.** `mb:var` cards are withheld on a slide (as narration
   already is), so data never leaks onto the surface.
5. **Chrome is a frame.** A repeating header/footer and the slide counter paint above
   placed areas (`z: 10`), and can be hidden per slide via `mb:var name=chrome value=none`.

### Surface geometry (the profile's side)

Placement only works if the slide is a **canvas**, not a page. `nui-slides` therefore
treats the section as a surface:

- the page's reading measure (a CSS custom property) is reset on the deck, so sections,
  columns and media span the canvas instead of a narrow text column;
- media takes the height the text leaves (`object-fit: contain`), so a 16:9 image cannot
  overflow a slide that also has a heading or a card;
- columns stretch to that height and centre their content, instead of piling every
  slide's slack into one band at the bottom;
- chrome and the slide counter are a frame layer above content (`z: 10`).

None of this is document vocabulary — it is the profile deciding what a surface is. The
seams are existing CSS custom properties (`--nui-md-content-maxwidth`) and
`color-scheme`, which is why the same file keeps the page's reading measure in a page
renderer.

### Degradation

| Renderer | What it does |
|---|---|
| Deck (`nui-slides`) | reads the map, places the blocks |
| Page renderer (`nui-markdown`) | shows the prose in source order; the var renders as a data card |
| Generic preview (GitHub, VS Code) | shows the fenced JSON as an ordinary code block, then the prose |
| Spec validator | reports **0 errors** — the document uses only core vocabulary |

---

## Colour mode and contrast

Geometry is not the only thing a deck must control. Colour is a **three-scope cascade**,
all through `color-scheme`:

| Scope | Declared by | Effect |
|---|---|---|
| Deck | `mode="auto \| light \| dark"` attribute | default for every slide, toolbar and notes |
| Slide | `mb:var name=mode value=light` (or `dark`) | forces that slide's scheme **and paints its surface** |
| Block | `preset=card:scrim` | a surface that guarantees contrast over imagery |

Two details matter:

- **A slide mode must paint its own surface.** A section is a transparent layer over the
  deck canvas; flipping `color-scheme` alone would put dark text on a still-dark canvas.
- **Contrast over a photograph is a surface problem.** The default card is a 5 % tint of
  the text colour — a lift on a known surface, nothing at all over artwork.
  `card:scrim` paints ~92 % of the scheme's own surface (plus a backdrop blur), so the
  normal text colour keeps normal contrast in light and dark. A renderer that does not
  know `scrim` draws an ordinary card.

---

## Why this shape, and what was rejected

| Alternative | Why not |
|---|---|
| **New directives** (`mb:area`, `mb:place`) | The six-directive set is the format's discipline. A conformant parser ignores unknown comments, which sounds compatible until any conforming tool drops them on save. |
| **New block attributes** (`area="…"`) | A grammar change; every existing document and validator would need to change. Unknown attributes are parse errors by design. |
| **Extend `mb:columns` with spans/rows** | Columns are a flow-level split of the whole section. Placement needs overlaps, full-bleed media and regions that are not a grid — and changing columns would break every existing deck. |
| **Named layout templates only** (`preset=split:60-40`) | Cheap and good for the common cases, but cannot express a poster or a caption over a plate. Templates can be added **on top** of this model; they cannot replace it. |
| **Raw CSS in a `<style>` block** | Infinite, but it reopens the trust boundary (external `url()`, fixed positioning, host selectors), fails silently on typos, and cannot be validated. Worth an opt-in escape hatch later; not as the primary mechanism. |

The important property of the var approach: **the geometry lives where the format already
keeps section data**, so nothing new has to be learned — not by the parser, the validator,
the editor, or a page renderer.

---

## Evidence from the prototype

- **`nui-slides`** implements the map, `z`, slide mode, and the scrim card.
- **Validator:** all demo decks report 0 errors / 0 warnings.
- **Blocks editor:** round-trips a laid-out deck without loss (ids, var name, JSON
  payload, unknown attributes such as `overlay=bottom`).
- **Real deck:** the AI Atom teaching deck (8 slides, 8 images) mounts with zero
  overflow under the new surface rules.
- **Atom overlay:** the source deck's unsupported `overlay=bottom` composition is
  rebuilt with a map + scrim + slide mode; measured text contrast is **16.67:1**
  (it was **1.25:1** for the header before the slide mode was declared).
- **Columns:** a two-column slide now spans the surface (1027 × 556 of a 1280 × 720
  canvas) instead of a narrow strip; content is centred rather than piled at the top.

## Resolved design questions (implemented in prototype)

1. **Templates vs. map?** Resolved via the **three-layer split**: Layer 1 (`preset=center`,
   `mb:columns weights=[3,2]`, `mb:col preset=top`) and Layer 2 (`image:hero:bleed` +
   `card:scrim:<slot>`) express 17 of the 18 slides in `slides-patterns.md` with **zero
   JSON and zero block IDs**, leaving Layer 3 (`mb:var name=layout`) for genuine multi-box
   posters.
2. **Block-level colour mode.** Implemented via `"mode": "light" | "dark"` inside a Layer 3
   layout area (`el.style.colorScheme`), alongside deck-level `mode` and slide-level
   `mb:var name=mode`.
3. **Vertical & horizontal alignment inside an area.** Implemented via
   `"valign": "start" | "center" | "end"` and `"align": "start" | "center" | "end"` in
   Layer 3 areas, and `preset=center` / `preset=center:middle` / `mb:var name=align` in
   Layer 1 flow.
4. **Image fit & focal point.** Implemented via `"fit": "cover" | "contain"` in Layer 3
   areas, automatic `object-fit: cover` on `preset=image:hero:bleed` and `preset=cover`
   plates, and `focal={"x":0..1,"y":0..1}` mapped to `object-position`.
5. **Overflow policy & print.** Both slide-level and per-area (`#id`) overflows are
   detected and reported via `data-overflow` + console diagnostics. `@media print`
   preserves the 16:9 aspect-ratio box so both flow and `[data-layout]` slides print
   cleanly.
6. **Spec boundary.** Zero changes to `md-blocks-spec.md`. Even the AI Atom deck's
   `overlay=bottom` case is now expressed via the standard 3-segment preset grammar
   (`preset=card:scrim:bottom`), passing `tools/validate.js` with **0 errors and 0
   warnings** across all four demo decks.

---

## Demo pages

The Playground runs from the repository root (`Playground/index.html`), e.g. with
`Five Server` or any static server on port 5500.

| Demo | Route | Source |
|---|---|---|
| **Pattern catalogue** — 18 slides covering every common composition, each labelled with what it needs | `#page=experiments/slides-patterns` | [`Playground/pages/experiments/slides-patterns.md`](../Playground/pages/experiments/slides-patterns.md) |
| **Layout prototype** — the map, stacking, and the reworked source of the mechanism | `#page=experiments/slides-layout` | [`Playground/pages/experiments/slides-layout.md`](../Playground/pages/experiments/slides-layout.md) |
| **Real deck** — the AI Atom teaching deck, verbatim (incl. its unsupported `overlay` token) | `#page=experiments/ai-atom-deck` | [`Playground/pages/experiments/ai-atom/slides/01-the-floor.md`](../Playground/pages/experiments/ai-atom/slides/01-the-floor.md) |
| **Component demo** — autoplay, narration, notes, settings | `#page=addons/slides` | [`Playground/pages/addons/slides-demo.md`](../Playground/pages/addons/slides-demo.md) |

Local URLs, for convenience:

```
http://127.0.0.1:5500/Playground/index.html#page=experiments/slides-patterns
http://127.0.0.1:5500/Playground/index.html#page=experiments/slides-layout
http://127.0.0.1:5500/Playground/index.html#page=experiments/ai-atom-deck
http://127.0.0.1:5500/Playground/index.html#page=addons/slides
```

Implementation: `NUI/lib/modules/nui-slides.js` (placement, modes, chrome),
`NUI/css/modules/nui-slides.css` (surface geometry), `NUI/css/nui-theme.css`
(`card:scrim`). Format reference: [`md-blocks-spec.md`](https://github.com/herrbasan/md-blocks)
— this proposal adds nothing to it.
