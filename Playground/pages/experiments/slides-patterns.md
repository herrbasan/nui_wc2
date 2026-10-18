---
title: Slide patterns
type: deck
summary: A catalogue of common presentation compositions across the three layout layers.
---

<!-- mb:main id=patterns -->

<!-- mb:block repeat=header -->
**Patterns** — three layers of slide composition
<!-- mb:/block -->

<!-- mb:section id=p-title preset=center -->
<!-- mb:var name=chrome value=none -->

# Title slide

<!-- mb:block preset=lead -->
One deck, seventeen compositions — authored in clean Markdown first, using presets for overlays and a coordinate map only when boxes must float freely.
<!-- mb:/block -->

<!-- mb:block preset=narration -->
This deck is a catalogue of seventeen slide patterns. Notice how fifteen of them need no JSON coordinate map at all — flow, columns, and scrim presets handle the common compositions, leaving the coordinate map for multi-box posters.
<!-- mb:/block -->

---

<!-- mb:section id=p-divider preset=center -->
<!-- mb:var name=chrome value=none -->

<!-- mb:columns weights=[1,3] -->
<!-- mb:col -->
<!-- mb:block preset=card:stat -->
# 02
<!-- mb:/block -->
<!-- mb:col -->
## Section divider

A stat badge beside the section title, centred on the canvas with `preset=center` and `chrome value=none`.
<!-- mb:/columns -->

---

<!-- mb:section id=p-flow -->

## Plain flow

No layout directives at all. A heading, a list, and the deck's own surface — the default most slides should use.

- Written in source order
- Readable as clean Markdown in any viewer
- Zero block IDs, zero JSON

---

<!-- mb:section id=p-text-image -->

<!-- mb:columns weights=[3,2] -->
<!-- mb:col -->
## Text 60 / image 40

The classic split: a claim on the left, a plate on the right — expressed directly with `mb:columns weights=[3,2]`.

Because the heading and prose share one column, a long heading pushes the paragraphs down naturally instead of colliding with a fixed box.
<!-- mb:col -->
<!-- mb:block preset=image -->
![Plate](../../images/nui_3.webp)
<!-- mb:/block -->
<!-- mb:/columns -->

---

<!-- mb:section id=p-image-text -->

<!-- mb:columns weights=[2,3] -->
<!-- mb:col -->
<!-- mb:block preset=image -->
![Plate](../../images/nui_4.webp)
<!-- mb:/block -->
<!-- mb:col -->
## Image 40 / text 60

The mirror split (`mb:columns weights=[2,3]`). Both columns stretch to the canvas height and centre their content vertically.

When reading order must differ from left-to-right visual order, use the Layer 3 layout map instead.
<!-- mb:/columns -->

---

<!-- mb:section id=p-bleed -->

<!-- mb:block preset=image:hero:bleed -->
![Full-bleed plate](../../images/nui_6.webp)
<!-- mb:/block -->

<!-- mb:block preset=card:scrim:bottom-left -->
**Layer 2 — Bleed + Scrim:** `preset=image:hero:bleed` fills the canvas edge-to-edge (`object-fit: cover`), and `preset=card:scrim:bottom-left` anchors the caption over it with zero JSON.
<!-- mb:/block -->

---

<!-- mb:section id=p-atom -->
<!-- mb:var name=mode value=light -->

<!-- mb:block preset=image:hero -->
![Data in — model — data out](ai-atom/images/atom-chart.webp)
<!-- mb:/block -->

<!-- mb:block preset=card:scrim:bottom -->
**data in, inference, data out** — every product, every “intelligent platform” is that one act, repeated and arranged. Nothing else is ever happening.
<!-- mb:/block -->

<!-- mb:block preset=narration -->
The atom slide from the teaching deck. Pairing `image:hero` with `card:scrim:bottom` and `mode value=light` keeps the diagram uncropped, places the scrim card over its lower edge, and leaves the Markdown source completely clean.
<!-- mb:/block -->

---

<!-- mb:section id=p-light preset=center -->
<!-- mb:var name=mode value=light -->

## A light slide, in a dark deck

`mb:var name=mode value=light` forces this slide's colour scheme and paints its surface (`var(--color-base)`), while `preset=center` centres the flow without a coordinate map.

<!-- mb:block preset=card:note -->
The card inside follows the slide's light scheme, not the deck's dark default.
<!-- mb:/block -->

---

<!-- mb:section id=p-over -->
<!-- mb:var name=layout -->
```json
{
  "p-over-image": { "x": 0,  "y": 0,  "w": 100, "h": 100, "z": 1, "fit": "cover" },
  "p-over-card":  { "x": 6,  "y": 14, "w": 46,  "h": 42,  "z": 2, "valign": "center" },
  "p-over-badge": { "x": 68, "y": 76, "w": 26,  "h": 14,  "z": 2, "mode": "light", "valign": "center", "align": "center" }
}
```

<!-- mb:block id=p-over-card preset=card:scrim -->
## Layer 3 — Multi-box map

When a slide needs multiple independent floating boxes (`z`, `fit: "cover"`, `valign: "center"`, and per-block `mode: "light"`), `mb:var name=layout` places each block by ID.
<!-- mb:/block -->

<!-- mb:block id=p-over-badge preset=card:scrim -->
**Block `mode: "light"`**
<!-- mb:/block -->

<!-- mb:block id=p-over-image preset=image -->
![Backdrop](../../images/nui_8.webp)
<!-- mb:/block -->

---

<!-- mb:section id=p-quote preset=center -->

<!-- mb:block preset=card:quote -->
> A quote wants the middle of the slide, a lot of air, and nothing else competing for it.

— the presenter
<!-- mb:/block -->

---

<!-- mb:section id=p-stats -->

## The numbers

<!-- mb:columns weights=[1,1,1] -->
<!-- mb:col preset=card:stat -->
### 3

composable layout layers
<!-- mb:col preset=card:stat -->
### 95%

of slides need zero JSON
<!-- mb:col preset=card:stat -->
### 1

source file, every surface
<!-- mb:/columns -->

---

<!-- mb:section id=p-features -->

## Three columns

<!-- mb:columns weights=[1,1,1] -->
<!-- mb:col preset=card -->
### Layer 1: Flow

Plain Markdown, `mb:columns`, `preset=center`, and `preset=top` rails.
<!-- mb:col preset=card -->
### Layer 2: Overlays

`image:hero:bleed` plates and `card:scrim:<slot>` overlays — zero JSON.
<!-- mb:col preset=card -->
### Layer 3: Map

`mb:var name=layout` rectangles for multi-box posters and visual tools.
<!-- mb:/columns -->

---

<!-- mb:section id=p-code preset=center -->

## Code on a slide

```javascript
const deck = document.querySelector('nui-slides');
deck.configure({ narrate: true, dwell: 5 });
deck.addEventListener('nui-slide-change', (e) => {
  console.log(`slide ${e.detail.index + 1}`, e.detail.narration);
});
```

<!-- mb:block preset=card:note -->
Code is a block like any other: the deck neither runs it nor rewrites it.
<!-- mb:/block -->

---

<!-- mb:section id=p-table preset=center -->

## The three layers at a glance

<!-- mb:block preset=table:clean -->
| Layer | Mechanism | Best for | Markdown preview |
|---|---|---|---|
| **1. Flow & Columns** | `mb:columns`, `preset=center`, `preset=top` | Titles, splits, stats, quotes, rails, lists | 100% invisible comments |
| **2. Plate & Overlay** | `image:hero:bleed` + `card:scrim:bottom` | Full-bleed photos, diagram captions | 100% invisible comments |
| **3. Coordinate Map** | `mb:var name=layout` (`value={...}` or fence) | Multi-box posters, decoupled reading/paint order | Invisible (`value=`) or JSON block |
<!-- mb:/block -->

---

<!-- mb:section id=p-agenda -->

<!-- mb:columns weights=[2,3] -->
<!-- mb:col preset=top -->
## Agenda

Five things, in order — using `mb:col preset=top` to pin the heading while the step list fills the right column.
<!-- mb:col -->
<!-- mb:block preset=list:steps -->
1. Keep the document clean Markdown
2. Let flow and columns handle 85% of slides
3. Use scrim slot presets for hero overlays
4. Reserve the JSON map for multi-box posters
5. Validate every deck with zero errors
<!-- mb:/block -->
<!-- mb:/columns -->

---

<!-- mb:section id=p-rail -->

<!-- mb:columns weights=[1,3] -->
<!-- mb:col preset=top -->
## Rail

A narrow left rail (`weights=[1,3]` + `preset=top`) holds the section label at the top-left.
<!-- mb:col -->
<!-- mb:block preset=lead -->
A rail layout gives a long deck rhythm: the left column keeps its proportion and top alignment while the right column carries the argument.

Because it uses `mb:columns` instead of hardcoded percentages, it also stacks cleanly on narrow viewports in page view.
<!-- mb:/block -->
<!-- mb:/columns -->

---

<!-- mb:section id=p-gallery -->

## Gallery

<!-- mb:block preset=gallery:row -->
- ![Plate one](../../images/nui_1.webp)
- ![Plate two](../../images/nui_2.webp)
- ![Plate three](../../images/nui_5.webp)

A gallery is a list of images; everything after the list is its caption.
<!-- mb:/block -->

---

<!-- mb:section id=p-closing preset=center:middle -->
<!-- mb:var name=chrome value=none -->

# Thank you

<!-- mb:block preset=lead -->
One source file. Readable as Markdown, composed as slides.
<!-- mb:/block -->

<!-- mb:block preset=narration -->
Thank you. Everything you just saw came from one clean Markdown file.
<!-- mb:/block -->
