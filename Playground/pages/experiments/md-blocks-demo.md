---
title: MD-Blocks Sample
lang: en
created: 2026-09-10
tags:
  - markdown
  - md-blocks
  - nui
summary: "A sample MD-Blocks document rendered by nui-markdown."
---

# MD-Blocks Sample

This document is authored in MD-Blocks: ordinary CommonMark whose structure rides in HTML
comments. Today `nui-markdown` renders it as plain Markdown — the comments are removed, so the
`mb:` directives are invisible, and every `---` is an ordinary horizontal rule. As directive
support lands in the `nui-blocks` renderer, the same source becomes sections, columns, and media
blocks.

<!-- mb:block id=opening preset=lead label="Opening statement" -->
A `block` is the unit an editor moves, presents, and names. Plain unannotated Markdown needs
no block at all — it is chunked by one deterministic rule, identically in every tool.
<!-- mb:/block -->

<!-- mb:block id=hero preset=image:hero:bleed label="Hero plate" -->
![NUI artwork — plate 1](images/nui_1.webp)

Everything after that first image is the block's caption, in ordinary Markdown.
<!-- mb:/block -->

<!-- mb:block id=warning preset=card:warning label="Important note" -->
**Warning:** The label word is authored directly in the Markdown, not injected by the preset.
<!-- mb:/block -->

---

# Two Columns of Text

A fundamental layout requirement is parallel reading columns: side-by-side narrative, comparisons, or multi-column editorial prose without cards or decorative chrome.

<!-- mb:columns id=two-col-text weights=[1,1] label="Two columns of text" -->
<!-- mb:col label="First column" -->
### Design Invariants

Every system that endures is designed around invariants rather than conventions. Invariants are the conditions that cannot be violated without corrupting the model. When authoring Markdown, the invariant is CommonMark compatibility: the document must always be readable in any generic viewer.

By anchoring on standard syntax, we eliminate the fragility of proprietary tags. A document written today will still parse cleanly twenty years from now, regardless of what frameworks rise or fall.

<!-- mb:col label="Second column" -->
### Runtime Simplicity

Simplicity is not the absence of features; it is the clarity of boundaries. Moving presentation hints into comment directives ensures that content remains decoupled from layout. The renderer interprets directives as spatial hints, while the document body retains pure narrative structure.

When renderers fail or encounter unknown presets, they degrade gracefully to plain text. There are no missing dependencies, no unhandled exceptions, and no broken layouts.
<!-- mb:/columns -->

---

# Text Flow with Floated Images

Editorial layouts often wrap prose around a key illustration. The authored Markdown is simply an image followed by ordinary paragraphs — 100% valid CommonMark that degrades to a standard image-and-caption stack in raw viewers.

<!-- mb:block id=story-left preset=image:left label="Image left text wrap" -->
![NUI artwork — plate 5](images/nui_5.webp)

### Editorial Wrap (Left)

When an image block is annotated with `preset=image:left`, enhanced renderers float the figure to the left and wrap subsequent prose naturally around its contour.

In generic previews on GitHub or VS Code, this block renders as a clean plate followed by paragraphs. There are no embedded HTML tags, no inline styles, and no syntax extensions that could break portable tooling. As this narrative continues, the prose flows down the right edge and clears underneath once past the image height.
<!-- mb:/block -->

<!-- mb:block id=story-right preset=image:right label="Image right text wrap" -->
![NUI artwork — plate 6](images/nui_6.webp)

### Editorial Wrap (Right)

Similarly, `preset=image:right` floats the media to the right flank. This enables alternating magazine-style layouts across longer articles or case studies without changing the underlying CommonMark structure.

On narrow viewports and mobile screens, both variants automatically drop their floats to prevent squishing text into narrow, unreadable slivers. The content remains fully responsive and accessible.
<!-- mb:/block -->

<!-- mb:block id=story-small preset=image:left:small label="Compact thumbnail wrap" -->
![NUI artwork — plate 7](images/nui_7.webp)

### Compact Vignette (`image:left:small`)

For author portraits, icon badges, or compact vignette plates, appending `:small` scales the figure down to approximately 25% width (`clamp(8rem, 25%, 12rem)`).

Renderers that do not implement `:small` cleanly fall back to the standard `image:left` 40% width, while standard CommonMark tools render it as an ordinary image stack. Full degradation at every layer.
<!-- mb:/block -->

### Inline Icons & Feature Badges

Icons belong to the directive, not the prose. With `preset=image:icon` the asset is referenced by an `icon=` attribute, so generic previews show clean headings and paragraphs — the entire directive vanishes instead of leaving a stray image line.

<!-- mb:block id=feat-runtime preset=image:icon icon=images/icons/bolt.svg alt="Zero build overhead" label="Runtime feature" -->
### Zero Build Overhead
Native web components execute directly in modern browsers without compilation steps, bundlers, or toolchain dependencies.
<!-- mb:/block -->

<!-- mb:block id=feat-fallback preset=image:icon icon=images/icons/shield.svg alt="Graceful fallback" label="Graceful degradation" -->
### Graceful Fallback Everywhere
No renderer support is required. The directive disappears, the heading and paragraphs stay, and nothing in the document looks broken.
<!-- mb:/block -->

<!-- mb:columns id=icon-columns weights=[1,1] label="Icon cards" -->
<!-- mb:col preset=card label="Blocks" -->
<!-- mb:block preset=image:icon icon=images/icons/blocks.svg alt="Blocks" -->
### Structure as blocks
Sections, blocks and columns as movable units.
<!-- mb:/block -->
<!-- mb:col preset=card label="Columns" -->
<!-- mb:block preset=image:icon icon=images/icons/columns.svg alt="Columns" -->
### Parallel reading
Side-by-side prose without decorative chrome.
<!-- mb:/block -->
<!-- mb:/columns -->

An image authored **directly inside a heading** also scales to the heading's font size — an inline affordance for enhanced document and slide renderers, at the cost of looking wrong in generic previews:

### ![Blocks icon](images/icons/media.svg) Direct Heading Icon

Prefer the `icon=` attribute form above whenever the same document has to read well on GitHub.

---

<!-- mb:section id=split preset=band:bleed label="Two-column section" -->
<!-- mb:var name=seconds value=12 -->

# A useful split

The `---` above opened a second section; this one is annotated `preset=band` — a section that sits on a different surface from the page (slightly darker in light mode, slightly lighter in dark mode). It also carries
its own named data — `seconds`, set to 12. Vars belong to the section they appear in. There is
no document-level var: document data lives in the frontmatter.

<!-- mb:columns id=story-split weights=[1,1] label="Story and facts" -->
<!-- mb:col label="The story" -->
## Story first

Source order is reading order. On a narrow screen the columns stack in that same order —
never reordered by CSS alone.

1. Something worth saying.
2. Something worth showing.
3. Something worth keeping.

![NUI artwork — plate 2](images/nui_2.webp)

<!-- mb:col preset=card label="The facts" -->
## At a glance

| Detail | Value |
|---|---|
| Format | MD-Blocks |
| Directives | 5 |
| Renderer | nui-blocks (planned) |

**Note:** the label word is authored here, not injected by the preset.
<!-- mb:/columns -->

The column region ended above. This trailing paragraph is part of this section's ordinary
unannotated Markdown run.

---

# Galleries & Collections

A block that starts with a list of images is a gallery — one movable unit. Clicking any image opens it in the lightbox.

### 1. Responsive Grid (`preset=gallery`)

<!-- mb:block id=gallery-grid kind=image preset=gallery label="Image grid" -->
- ![NUI artwork — plate 3](images/nui_3.webp)
- ![NUI artwork — plate 4](images/nui_4.webp)
- ![NUI artwork — plate 5](images/nui_5.webp)
- ![NUI artwork — plate 6](images/nui_6.webp)

**Plate sequence.** Default gallery renders as a responsive auto-fit grid. Click to inspect in lightbox.
<!-- mb:/block -->

### 2. Featured / Editorial (`preset=gallery:featured`)

<!-- mb:block id=gallery-featured kind=image preset=gallery:featured label="Featured gallery" -->
- ![NUI artwork — plate 1](images/nui_1.webp)
- ![NUI artwork — plate 2](images/nui_2.webp)
- ![NUI artwork — plate 7](images/nui_7.webp)
- ![NUI artwork — plate 8](images/nui_8.webp)

**Featured layout.** The first image is highlighted prominently as the lead plate, with companion shots grouped in a balanced sub-grid below.
<!-- mb:/block -->

### 3. Even Row (`preset=gallery:row`)

<!-- mb:block id=gallery-row kind=image preset=gallery:row label="Gallery row" -->
- ![NUI artwork — plate 3](images/nui_3.webp)
- ![NUI artwork — plate 4](images/nui_4.webp)
- ![NUI artwork — plate 5](images/nui_5.webp)

**Contained banner row.** A single horizontal row that divides the full width equally without overflow or scrollbars.
<!-- mb:/block -->

### 4. Editorial Mosaic (`preset=gallery:mosaic`)

<!-- mb:block id=gallery-mosaic kind=image preset=gallery:mosaic label="Mosaic gallery" -->
- ![NUI artwork — plate 6](images/nui_6.webp)
- ![NUI artwork — plate 7](images/nui_7.webp)
- ![NUI artwork — plate 8](images/nui_8.webp)

**Asymmetric mosaic.** Architectural layout featuring one tall lead image paired with two stacked companion plates.
<!-- mb:/block -->

---

# Visual Structures & Patterns

<!-- mb:block preset=lead -->
Every presentation or publication needs more than just paragraphs. MD-Blocks provides high-impact visual patterns using standard CommonMark authoring.
<!-- mb:/block -->

## Key Metrics

<!-- mb:columns id=metrics weights=[1,1,1] label="Impact metrics" -->
<!-- mb:col preset=card:stat label="Metric 1" -->
# 100%
**CommonMark**
Zero proprietary HTML tags
<!-- mb:col preset=card:stat label="Metric 2" -->
# 0ms
**Build Overhead**
Pure browser-native execution
<!-- mb:col preset=card:stat label="Metric 3" -->
# 5
**Directives**
Everything you need to author
<!-- mb:/columns -->

## Editorial Process

<!-- mb:block id=timeline preset=list:steps label="Authoring workflow" -->
1. **Draft in CommonMark** — Write plain paragraphs, headings, and images naturally. No layout distractions.
2. **Add Structure Directives** — Annotate sections, blocks, and columns with unobtrusive single-line HTML comments.
3. **Render Everywhere** — Enjoy clean generic previews in GitHub/VS Code or rich interactive layouts in NUI.
<!-- mb:/block -->

## Notable Thoughts

<!-- mb:block id=dijkstra preset=card:quote label="Dijkstra Quote" -->
> "Simplicity is prerequisite for reliability."
>
> — Edsger W. Dijkstra
<!-- mb:/block -->

## Architecture Guidelines

<!-- mb:columns weights=[1,1] label="Dos and Donts" -->
<!-- mb:col preset=card:good label="Best practices" -->
### Recommended
- Native HTML5 semantic landmarks
- Guessable `family:modifier` presets
- Graceful degradation on all devices
- Direct DOM binding with no build step
<!-- mb:col preset=card:danger label="Anti-patterns" -->
### Avoid
- Horizontal scrollbars in document flow
- Proprietary tag extensions (`<my-component>`)
- Runtime lock-in to single frameworks
- Silent reclassification of content
<!-- mb:/columns -->

<!-- mb:block preset=link:cta label="Call to action" -->
[Explore the Spec on GitHub](https://github.com/herrbasan/md-blocks)
<!-- mb:/block -->

---

# Table Presentations

Standard Markdown tables often default to heavy, boxy spreadsheets. With simple presets, tables adapt to their content.

### 1. Default Table (Full Spreadsheet Grid)

| Name | Type | Description |
|---|---|---|
| `section` | Container | Divides the document into viewport regions or slides |
| `block` | Container | Movable leaf unit carrying presentation presets |
| `columns` | Layout | Responsive multi-column container |

### 2. Clean List (`preset=table:clean`)

No heavy backgrounds or vertical grid lines — only subtle horizontal dividers for clean readability.

<!-- mb:block id=table-clean-demo preset=table:clean label="Clean table" -->
| Name | Type | Description |
|---|---|---|
| `section` | Container | Divides the document into viewport regions or slides |
| `block` | Container | Movable leaf unit carrying presentation presets |
| `columns` | Layout | Responsive multi-column container |
<!-- mb:/block -->

### 3. Data-Driven Column Widths (`preset=table:clean:fit`)

The authored header names are long (`Number of Items`, `Syntactic Classification`, `Detailed Architectural Purpose`), but the data in the first two columns is short (`1`, `Container`). With `preset=table:clean:fit`, columns are sized strictly by their data cells. Headers display as much text as fits with an ellipsis, and hovering any clipped header reveals the full title in a `nui-tooltip`.

<!-- mb:block id=table-fit-demo preset=table:clean:fit label="Data-fit table" -->
| Number of Items | Syntactic Classification | Detailed Architectural Purpose |
|---|---|---|
| 1 | Container | Divides the document into viewport regions or presentation slides |
| 2 | Leaf Unit | Movable presentation block carrying layout and theme presets |
| 3 | Layout Grid | Responsive multi-column layout container with custom weights |
| 4 | Column Slot | Individual column container within a multi-column row |
| 5 | Scoped Data | Document or section variable carrying typed key-value data |
<!-- mb:/block -->

### 4. Specification Sheet (`preset=table:specs`)

Headers are hidden; column 1 acts as a bold, muted label for key/value specifications.

<!-- mb:block id=table-specs-demo preset=table:specs label="Specification sheet" -->
| Property | Value |
|---|---|
| Spec Version | MD-Blocks v1.1 |
| Core Syntax | CommonMark 0.31.2 |
| Runtime Overhead | 0 KB (Native CSS) |
| Fallback Fidelity | 100% Readable |
<!-- mb:/block -->

## Structured data

A var may carry its payload in a fenced code block instead of a `value=` attribute. The marker
and its fence are a single lexical unit: nothing may be inserted between them.

<!-- mb:var name=slideshow -->
```json
{ "loop": false, "secondsPerSlide": 12 }
```

This is the section's second var. Names must be unique within a section, but the same name in
another section would be a completely different var.
