---
title: Slide layout
type: deck
summary: Layer 3 — placing blocks on the slide surface with a section layout map.
---

<!-- mb:main id=layout-demo -->

<!-- mb:block repeat=header -->
**Layout Map (Layer 3)** — freeform placement on the surface
<!-- mb:/block -->

<!-- mb:section id=split -->
<!-- mb:var name=layout -->
```json
{
  "split-prose":  { "x": 6,  "y": 12, "w": 48, "h": 76, "valign": "center" },
  "split-figure": { "x": 58, "y": 10, "w": 36, "h": 80 }
}
```

<!-- mb:block id=split-prose -->
## Reading order vs. canvas coordinates

Keep heading and prose together in one block so they flow naturally, and use `"valign": "center"` on the area so the text centres vertically without manual `y` offsets.

The map is **all-or-nothing** for its section: if any block lacks an area, the whole section falls back to flow and logs why.
<!-- mb:/block -->

<!-- mb:block id=split-figure preset=image -->
![NUI composition plate](../../images/nui_2.webp)
<!-- mb:/block -->

<!-- mb:block preset=narration -->
Each block is placed by its id in percentages of the surface. Keeping the heading and its paragraphs inside one block with vertical alignment prevents text collisions when headings wrap.
<!-- mb:/block -->

---

<!-- mb:section id=overlap -->
<!-- mb:var name=layout -->
```json
{
  "overlap-title": { "x": 6, "y": 56, "w": 56, "h": 32, "z": 2, "valign": "center" },
  "overlap-image": { "x": 0, "y": 0,  "w": 100, "h": 100, "z": 1, "fit": "cover" }
}
```

<!-- mb:block id=overlap-title preset=card:scrim -->
### Stacking and image fit

Read first, painted on top: `z: 2` puts the scrim card over the backdrop while keeping the heading first in the Markdown source. `"fit": "cover"` crops the backdrop edge-to-edge.
<!-- mb:/block -->

<!-- mb:block id=overlap-image preset=image -->
![Full-surface plate](../../images/nui_5.webp)
<!-- mb:/block -->

<!-- mb:block preset=narration -->
When reading order and paint order disagree, z settles it. The title comes first in the document, where it belongs, and still paints over the full-bleed image.
<!-- mb:/block -->

---

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
![Bleed plate](../../images/nui_7.webp)
<!-- mb:/block -->

<!-- mb:block id=poster-title preset=card:scrim -->
### Multi-box poster + block mode

Title card at top-left, a forced-light credit badge at bottom-right (`"mode": "light"`), and one bleed image underneath (`"fit": "cover"`).
<!-- mb:/block -->

<!-- mb:block id=poster-credit preset=card:scrim -->
**Plate: NUI demo set**
<!-- mb:/block -->

<!-- mb:block preset=narration -->
And a third composition: a title card at the top left, a light-mode credit pill at the bottom right, and one bleed image underneath — authored with an inline var value so generic Markdown previews stay completely clean.
<!-- mb:/block -->
