---
title: Mara Voss — Landscape Portfolio
customer: Solo practice
year: 2026
tags: [Photography, Landscape, Gallery]
cover: images/dolomites.svg
status: live
gallery:
  defaultSeconds: 8
  autoplay: true
---

# Mara Voss

<!-- bm:block id=opening preset=lead label="Opening statement" -->
Mara Voss photographs the places where weather still writes the first draft of a landscape. Her work
favours quiet hours — dawn light over high passes, storm-lit ridgelines, the long shadows of late
afternoon.

This page is a portfolio built in the same extended Markdown: every image, caption, and piece of data
below is authored as ordinary source.
<!-- bm:/block -->

The work spans the eastern Alps and the northern coastline, with occasional longer journeys into the
Nordics. Whatever the region, the intent is the same: to stand still long enough for a place to show
itself.

<!-- bm:block id=hero preset=hero focal={"x":0.5,"y":0.3} -->
![A ridgeline above the Tre Cime at first light](images/dolomites.svg)

**Where the work begins:** a high pass in the Dolomites, photographed before the first lift of the day.
<!-- bm:/block -->

---

# How a picture is made

The practice is deliberately slow. Mara scouts a location on foot, returns for the weather she needs,
and often makes a single image in a morning. The text below splits that process from the practical facts
about the work.

<!-- bm:columns id=process-split weights=[2,1] label="Approach and facts" -->
<!-- bm:col label="The approach" -->
## Light over route

A good landscape is usually a negotiation with the forecast. Mara reads the sky for days, then commits
to a walk when the light and the route are likely to agree.

1. Choose a place that rewards patience.
2. Arrive before the light arrives.
3. Wait for the weather to finish its sentence.

![A fog-filled valley below the pass](images/valley-fog.svg)

The image above is plain Markdown. It only becomes a media leaf once it is given a preset or a caption.

<!-- bm:col preset=card label="Portfolio facts" -->
## At a glance

| Detail | Choice |
|---|---|
| Focus | Alpine & coastal landscape |
| Medium | Large-format film and digital |
| Print | Limited editions of 25 |
| Home | Innsbruck, Austria |

**Note:** prints are made by hand and signed; the essential feeling of the image must survive in ink.
<!-- bm:/columns -->

The column region ended above. This paragraph returns to full-width flow.

---

# A season, not three separate trips

The gallery below is one collection. Images can be reordered together, while each keeps its own
alternative text.

<!-- bm:block id=selected-gallery preset=gallery label="Selected landscapes" -->
- ![The Tre Cime at first light](images/dolomites.svg)
- ![A storm passing over the Lofoten coast](images/lofoten-storm.svg)
- ![Birch forest in autumn fog, Dalarna](images/dalarna-birch.svg)
- ![Moonrise over the Ortler group](images/ortler-moon.svg)

**Four views from the last season.** The caption belongs to the whole gallery; each image still carries
its own description for readers without the picture.
<!-- bm:/block -->

When a single image needs its own crop or story, it leaves the gallery and becomes its own block.

---

<!-- bm:section id=commissioning preset=dark label="Commissioning slide" -->
<!-- bm:var name=seconds value=10 -->

# Commissioning new work

A commission begins with a place and a season, not a finished image. The variables below are this
section's own data: `seconds` sets how long a slideshow lingers on it.

<!-- bm:columns id=offer-steps label="How to work together" -->
<!-- bm:col preset=card -->
## 1. Talk

![A sketch map of a proposed route](images/route-sketch.svg)

An early conversation about the place, the season, and what the image is for.

<!-- bm:col preset=card -->
## 2. Scout

![The coastline at dusk](images/coast-dusk.svg)

A reconnaissance visit, usually in conditions unlike the final shoot.

<!-- bm:col preset=card -->
## 3. Deliver

![A framed print on a wall](images/framed-print.svg)

A limited print or a licensed digital file, agreed before the walk begins.
<!-- bm:/columns -->

> A commission succeeds when the image outlives the conversation that started it.

---

# Formats and licensing

A fresh section. It inherits neither the dark preset nor `seconds`; the heading is simply a heading.

## About editions

<!-- bm:block id=edition-note preset=note label="Edition note" -->
### Note: the archive stays small

Mara deliberately limits each edition to twenty-five prints. The negatives are then retired, so the
available work grows slowly and rarely repeats.

- Framed and unframed prints are available on request.
- Digital licences are granted per use, never as a blanket release.
<!-- bm:/block -->

## Where the work lives

Downloads and exhibition notes are grouped as a list of links:

<!-- bm:block id=exhibition-links label="Current exhibitions" -->
- [Print catalogue](images/catalogue.pdf)
- [Upcoming shows](exhibitions.html)
- [Press kit](images/press-kit.pdf)
<!-- bm:/block -->

---

<!-- bm:var name=seconds value=20 -->

# Data with an explicit home

Named data has two homes. Document data — title, tags, gallery defaults — sits in the frontmatter.
Data about one section is a `var` inside that section. This section's `seconds` is independent of the
commissioning section's earlier one; nothing is inherited.

## A structured edition value

<!-- bm:var name=edition -->
```json
{
  "paper": "Hahnemühle Photo Rag",
  "edition": 25,
  "colours": "pigment ink"
}
```

## Presenter note

<!-- bm:var name=presenter-note -->
```text
Walk through the workflow before showing the gallery.
The important contrast is content versus editing structure.
```

The presenter note stays readable in basic previews; the page renderer does not insert it into the body.

---

# Keep the source useful

Further reading is a list of file links:

<!-- bm:block id=further-reading label="Related documents" -->
- [The format proposal](spec.md)
- [A note on printing practice](printing-notes.md)
<!-- bm:/block -->

## Continue exploring

<!-- bm:block id=next-step preset=cta label="Next step" -->
**Like the work?** [Write with a commission request](mailto:hello@maravoss.example).

Link text and destination are authored. A renderer may emphasise the link; it must not rewrite the wording.
<!-- bm:/block -->

---

<!-- bm:section id=colophon label="Closing slide" -->

Eight sections, separated by seven rules; this closing one has no heading, which the `---` convention
allows for free. One themed section (**Commissioning new work**); the next `---` resets it. Directives
used: `section` ×2, `block` ×9, `columns` ×2, `col` ×6, `var` ×4. Every heading, image, link, and caption
is ordinary Markdown; document data is frontmatter.

[spec]: spec.md "Blocks Markdown — minimal proposal"
