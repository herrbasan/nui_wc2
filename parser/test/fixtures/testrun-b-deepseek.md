<!-- bm:document
  version: 1
  data: {"title":"Mara Voss — Landscape Portfolio","customer":"Independent","year":2026,"tags":["Portfolio","Photography","Landscape"],"status":"published"}
-->

<!-- bm:var name=accent scope=document value=muted -->

# Mara Voss

<!-- bm:block id=opening preset=lead label="Opening statement" -->
I photograph the places where weather has more authority than people. My work follows ridgelines,
coastlines, and the quiet hours when the light is honest.

This portfolio is authored in Blocks Markdown. The same source reads as an ordinary page and, in an
enhanced renderer, resolves into columns, a gallery, and a featured exhibition.
<!-- bm:/block -->

# Selected work, 2024–2026

The work below spans three field seasons. Each project began as a question about how a place holds
time — and each ended with more questions than it answered.

<!-- bm:media id=hero kind=image preset=hero focal={"x":0.5,"y":0.25} caption=true -->
![Dawn breaking over the Dolomites ridge line](images/dolomites.svg)

**The starting point:** a single morning on the Tre Cime plateau, waiting for the first hard light.

# One landscape, two readings

A body of work benefits from both a wide view and a close one. On a narrow screen the same source order
remains useful: the essay first, the technical notes second.

<!-- bm:columns id=work-split count=2 weights=[3,1] label="Essay and technical notes" -->
<!-- bm:col id=work-essay label="The essay" -->
## Patience as a medium

Most of what I do is wait. The camera only records the instant the light, the weather, and my presence
finally agree. I return to the same shelf of rock for years before a single useful frame appears.

1. Read the forecast, then ignore it.
2. Arrive before the colour does.
3. Make one honest exposure, not a hundred anxious ones.

![Mara working beside a mountain stream](images/field-notes.svg)

This image needs no directive: a standalone image in column flow is an implicit media leaf.

<!-- bm:col id=work-notes preset=card label="Technical notes" -->
## At a glance

| Detail | Choice |
|---|---|
| Format | Medium-format film |
| Subject | Alpine and coastal landscapes |
| Season | Autumn and winter |
| Base | Munich |

**Constraint:** the essential frame must work without artificial light.

<!-- bm:/columns -->

The column region ends here. This paragraph is full-width flow again.

# Three places, one body of work

The following list is one grouped media block. An editor can reorder its items without disturbing the
surrounding page structure. A generic preview simply presents three images.

<!-- bm:media id=portfolio-gallery kind=image preset=gallery caption=true label="Portfolio image sequence" -->
- ![Dolomites in first light](images/dolomites.svg)
- ![A North Sea shoreline in winter](images/shoreline.svg)
- ![A valley fog settling at dusk](images/valley-fog.svg)

**Three exposures from three seasons.** This is a caption for the whole collection; each image keeps its
own alternative description.

When an image needs its own caption or crop, it gets its own media block. A gallery does not guess which
neighbouring sentence belongs to which item.

<!-- bm:section id=featured-exhibition preset=dark label="Featured exhibition slide" -->
# The long light — a touring show

<!-- bm:var name=slides scope=section value=6 -->

Six prints, framed and hung in a single line, so a visitor walks the length of a season. This heading and
the preceding section directive belong to one section, not two. A slideshow renderer can treat it as one
slide.

<!-- bm:columns id=exhibition-rooms count=2 label="Exhibition rooms" -->
<!-- bm:col id=room-alps preset=card label="Room one: the Alps" -->
## The Alps

![Print of a Dolomites ridge](images/dolomites.svg)

A limestone balcony above the clouds. These prints favour scale over detail; the mountain is meant to
be looked at from a distance.

<!-- bm:col id=room-coast preset=card label="Room two: the coast" -->
## The coast

![Print of a winter shoreline](images/shoreline.svg)

Low sun over a cold sea. These are quieter prints, closer to the tide line, where the work happens in
the water itself.

<!-- bm:/columns -->

> A good exhibition gives the visitor a place to stand, not just a wall to walk past.

# A note on how the work is shown

This plain heading starts a fresh section. It does not inherit the previous section's dark preset or its
section-scoped slide count.

<!-- bm:block id=print-note preset=note label="Printing note" -->
### Note: paper is part of the image

Every print in the portfolio is made on baryta paper and finished by hand. The texture of the surface
changes how the highlights fall.

- Prints are produced in editions of fifteen.
- Each negative is scanned once and stored untouched.
  - Preservation of the original file is part of the process.

> If the paper changes, the print is no longer the same photograph.
<!-- bm:/block -->

<!-- bm:block id=availability-warning preset=warning label="Availability warning" -->
### Warning: originals are not offered as files

Do not ask for unprocessed digital files. Finished prints and licensed reproductions are the only forms
in which this work leaves the studio.
<!-- bm:/block -->

# A conversation starter

<!-- bm:block id=contact-cta preset=cta label="Contact link" -->
**Prefer a conversation?** [Write to the studio](mailto:studio@maravoss.example).

The link text and destination are authored content. A renderer may emphasise the link, but it must not
replace the wording with a generated button label.
<!-- bm:/block -->

---

This portfolio is a demo document in the Blocks Markdown format. It has five sections. The only
explicitly themed section is **The long light — a touring show**; the next H1 resets it.

Mara Voss is a fictional photographer created for this format experiment. Placeholder image paths such as
`images/dolomites.svg` are illustrative and not expected to resolve.
