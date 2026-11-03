---
title: Aurora Desk
customer: Aurora Systems
year: 2026
tags: [Product, Interactive, Markdown]
cover: images/hero.jpg
status: concept
header: Aurora Desk · Product Group
footer: Aurora Systems · Concept · 2026
slideshow:
  autoplay: false
  loop: false
  defaultSeconds: 15
---

# Aurora Desk

<!-- mb:block id=opening preset=lead label="Opening statement" -->
A showroom experience that lets visitors explore at their own pace. One screen, a clear invitation,
and enough room to be curious.

This page is also a live sample of the format: every block boundary, image, and piece of data you see
is authored in plain Markdown.
<!-- mb:/block -->

In GitHub or VS Code this reads as an ordinary project page with horizontal rules between its parts.
In the enhanced renderer each rule is a section boundary, and the same source gains columns, cards,
a gallery, and media players. Document-level data — title, tags, slideshow defaults — lives in the
frontmatter above.

<!-- mb:block preset=hero focal={"x":0.5,"y":0.3} -->
![Abstract artwork — hero plate](images/hero.jpg)

**The starting point:** a quiet invitation to explore, not a screen full of instructions.
<!-- mb:/block -->

The block above is *hand-authored*: no `kind`, no `id`. A parser infers `kind=image` from its first
node. The block below is the same content **after one editor save** — the editor stamped the resolved
`kind` and a stable `id`. From then on, `kind` is authoritative: if the image stops being the first
node, validation fails loud instead of silently reclassifying the block as text.

<!-- mb:block id=hero-stamped kind=image preset=hero focal={"x":0.5,"y":0.3} label="Showroom hero" -->
![Abstract artwork — hero plate](images/hero.jpg)

**Stamped by the editor:** `kind=image` and `id=hero-stamped` were written by the tool, not the author.
<!-- mb:/block -->

<!-- Author note: this is an ordinary comment, not a directive. -->

## A small brief

- Welcome visitors without requiring staff assistance.
- Make the product understandable through direct exploration.
- Let interested visitors continue the conversation later.

> The interface should explain itself through what the visitor can do next.

---

# A useful split

The main story gets more space than the supporting facts. On a narrow screen the source order still
reads well: story first, facts second.

<!-- mb:columns id=product-split weights=[2,1] label="Story and facts" -->
<!-- mb:col label="The story" -->
## Explore without a script

Visitors move directly between features, compare options, and return to an overview whenever they want.
The interface supports exploration rather than forcing a single sequence.

1. Choose an area of interest.
2. Look closer at the details.
3. Save a useful next step.

![Abstract artwork — kiosk plate](images/kiosk.jpg)

The image above is plain Markdown — no directive, no block. It belongs to this column's implicit
Markdown run (§6.1): the same chunk boundaries on every parse, in every tool.

<!-- mb:col preset=card label="Project facts" -->
## At a glance

| Detail | Choice |
|---|---|
| Format | Interactive kiosk |
| Audience | Showroom visitors |
| Input | Touch |
| Year | 2026 |

**Constraint:** the essential journey must work without sound.
<!-- mb:/columns -->

The column region ended above. Together with the heading and intro paragraph, this trailing paragraph
is part of *this section's* implicit Markdown run — maximal consecutive ordinary nodes, flushed only
by the next directive or section break.

---

# A collection, not three separate images

A block that starts with a list of images is one gallery. An editor reorders its items without touching
the surrounding structure; a generic preview shows a list of images.

<!-- mb:block id=project-gallery kind=image preset=gallery label="Project image sequence" -->
- ![Abstract artwork — hero plate](images/hero.jpg)
- ![Abstract artwork — kiosk plate](images/kiosk.jpg)
- ![Abstract artwork — launch plate](images/launch.jpg)
- ![Abstract artwork — study I](images/abstract-1.jpg)
- ![Abstract artwork — study II](images/abstract-2.jpg)

**Three views of one experience.** This caption belongs to the whole collection; each image keeps its
own alternative text.
<!-- mb:/block -->

When one image needs its own caption or crop, give it its own block.

---

<!-- mb:section id=visitor-journey preset=band label="Visitor journey slide" -->
<!-- mb:var name=seconds value=12 -->

# The visitor journey

Three steps, shown as cards in enhanced output. The `---` above opened this section; the directive on
its first line gives it an id and a band preset, and `seconds` is this section's own data.

<!-- mb:columns id=journey-steps label="Journey cards" -->
<!-- mb:col preset=card -->
## 1. Discover

![Abstract artwork — tour plate](images/tour.jpg)

A short overview makes the choices visible before committing to a path.

<!-- mb:col preset=card -->
## 2. Explore

![Abstract artwork — kiosk plate](images/kiosk.jpg)

Details appear when they are useful. The overview stays one obvious action away.

<!-- mb:col preset=card -->
## 3. Continue

![Abstract artwork — launch plate](images/launch.jpg)

The visitor leaves with a useful next step rather than an obligation to finish a form.
<!-- mb:/columns -->

> A good journey has an invitation, room to explore, and a clear way out.

---

# Notes and deliberate boundaries

## A note is still content

<!-- mb:block id=editorial-note preset=note label="Editorial note" -->
### Note: content survives the theme

The word **Note** is authored here, not injected by the preset. If the styling disappears, the message
must not.
<!-- mb:/block -->

<!-- mb:block id=publication-warning preset=warning label="Publication warning" -->
### Warning: hidden does not mean private

Comments and vars are part of the source file. Do not put credentials or private customer information
in a document that will be distributed publicly.
<!-- mb:/block -->

## Two separately movable regions

<!-- mb:block id=decision label="The decision" -->
**Decision:** keep the overview visible while a visitor compares details.
<!-- mb:/block -->

<!-- mb:block id=rationale label="The rationale" -->
**Rationale:** visitors should not have to remember the structure of the experience.

A second block. Save and reload must never merge it with the first.
<!-- mb:/block -->

## An image that is *not* media

<!-- mb:block id=linked-illustration label="Explanation first, image second" -->
Because this block starts with a paragraph of text, it is a text block. The image below is inline
Markdown content, not a media leaf:

[![Abstract artwork — kiosk plate](images/kiosk.jpg)](../md-blocks-spec.md)
<!-- mb:/block -->

## A card that knows where it goes

<!-- mb:block id=writing-teaser preset=card:teaser label="Writing index entry" -->
### Writing

Essays from the book arc — the argument, not the notes.

[Read the writing](https://example.com/aurora/writing/)
<!-- mb:/block -->

The last node is a paragraph holding exactly one link, so that link is the card's destination: an
enhanced renderer makes the whole card clickable. Any other last node — prose, a list, two links —
leaves an ordinary card. A plain preview is unchanged either way, because the destination was never
metadata.

## Code remains code

<!-- mb:block id=literal-syntax label="Literal directive examples" -->
An example, not a nested block. Even the apparent closing marker inside the fence stays literal:

````md
<!-- mb:block id=example preset=note -->
### This belongs to an example

```js
const content = 'Markdown, not an executable template';
```

<!-- mb:/block -->
````

This paragraph still belongs to the outer block. Only the real close below ends it.
<!-- mb:/block -->

---

<!-- mb:section id=spoken label="The spoken layer" -->

# The spoken layer

Some text is written to be **spoken, not shown** — a narration track, a read-aloud pass, a line the
presenter delivers. Mark it `preset=narration` and it stays ordinary Markdown: same body, same close,
same place in the tree. A renderer whose medium is *surfaces* (a slideshow, a printed deck) routes it
to the delivery channel instead of drawing it; a reading renderer may surface it, labelled and set
apart.

<!-- mb:block preset=narration label="Opening line" -->
Aurora Desk is not a form. It is an invitation to look around.
<!-- mb:/block -->

<!-- mb:block preset=narration label="Second beat" -->
Three steps, no instructions, no staff on the floor. That is the whole idea.
<!-- mb:/block -->

Two narrations share this section — *any* number may, and their source order is the delivery order.
That is the one thing a section `var` cannot do, and the reason narration is a block family rather
than a `var`. Deck configuration — voice, pace, language — is deliberately not text: it belongs to the
frontmatter or a `var`, never to the block, which carries only its words. In a generic preview these
two blocks read as ordinary paragraphs.

---

<!-- mb:var name=seconds value=20 -->

# Data with an explicit home

Named data has exactly two homes. Data about the **document** is frontmatter. Data about **one section**
is a `var` inside that section. This section's `seconds` is independent of the visitor-journey section's
`seconds`; nothing is inherited, nothing needs a scope flag.

## A structured section value

<!-- mb:var name=transition -->
```json
{
  "type": "fade",
  "seconds": 0.6
}
```

A var and its fence are **one lexical unit** — nothing may come between them, and the editor moves
them together.

## A readable note for a presenter

<!-- mb:var name=presenter-note -->
```text
Explain the idea before discussing the syntax.
The important contrast is content versus editing structure.
```

---

<!-- mb:section id=colophon label="Closing slide" -->

This closing section has no heading, which the `---` convention allows for free. One themed section
(**The visitor journey**); the next `---` resets it. Every heading, image, link, and caption is ordinary
Markdown; document data is frontmatter; section data is `var`; structure is six directives and one rule.
