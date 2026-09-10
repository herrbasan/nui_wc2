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

<!-- mb:block id=hero preset=hero label="Hero plate" -->
![NUI artwork — plate 1](images/nui_1.webp)

Everything after that first image is the block's caption, in ordinary Markdown.
<!-- mb:/block -->

---

<!-- mb:section id=split preset=dark label="Two-column section" -->
<!-- mb:var name=seconds value=12 -->

# A useful split

The `---` above opened a second section; this one is annotated `preset=dark`. It also carries
its own named data — `seconds`, set to 12. Vars belong to the section they appear in. There is
no document-level var: document data lives in the frontmatter.

<!-- mb:columns id=story-split weights=[2,1] label="Story and facts" -->
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

# A collection is one block

<!-- mb:block id=gallery kind=image preset=gallery label="Image sequence" -->
- ![NUI artwork — plate 3](images/nui_3.webp)
- ![NUI artwork — plate 4](images/nui_4.webp)
- ![NUI artwork — plate 5](images/nui_5.webp)

**Three plates.** The caption belongs to the whole collection, not to any single image.
<!-- mb:/block -->

A block that starts with a list of images is a gallery — one movable unit. A standalone image
paragraph *outside* a block is just plain Markdown.

## Structured data

A var may carry its payload in a fenced code block instead of a `value=` attribute. The marker
and its fence are a single lexical unit: nothing may be inserted between them.

<!-- mb:var name=slideshow -->
```json
{ "loop": false, "secondsPerSlide": 12 }
```

This is the section's second var. Names must be unique within a section, but the same name in
another section would be a completely different var.
