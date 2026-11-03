---
title: Aurora Desk — Media Sheet
subtitle: Every media shape, one block each
year: 2026
---

<!-- mb:main id=media label="Media sheet" -->

<!-- mb:block repeat=header -->
Aurora Desk · Media sheet · Aurora Systems
<!-- mb:/block -->

<!-- mb:block repeat=footer -->
Sample media: MDN CC0 shared assets. The still images are local to this folder.
<!-- mb:/block -->

<!-- mb:block id=cover kind=image preset=image:hero focal={"x":0.5,"y":0.35} label="Cover frame" -->
![Aurora Desk under a tracking rig, long exposure](images/hero.jpg)

**Image class, single item.** The block's first node is one image and everything after it is the
caption. Here `kind` and `focal` are stamped the way an editor writes them on save (§6.2); hand-authored,
both may be omitted, and the kind is inferred from the first node.
<!-- mb:/block -->

---

<!-- mb:section id=video label="Video" -->

## Video

<!-- mb:block id=walkthrough label="Walkthrough — plain link" -->
[Watch the walkthrough](https://mdn.github.io/shared-assets/videos/flower.mp4)

**Link class, plain form.** A link whose destination ends in a media extension makes the block media on
its own — no new directive, no attribute, and a generic preview still shows a readable link. The
refinement is inferred from the destination: `video`.
<!-- mb:/block -->

<!-- mb:block id=teaser preset=player label="Teaser — linked poster" -->
[![A bee on a flower, the teaser's opening frame](images/launch.jpg)](https://mdn.github.io/shared-assets/videos/friday.mp4)

**Link class, with a poster, `preset=player`.** The poster is a *linked image*: the first node is still
one media node, so the block stays single-item and the prose below is still its caption. Poster and film
are independent destinations — one may be local while the other is remote. A poster only makes sense for
something that plays, which is what `player` asks for.
<!-- mb:/block -->

<!-- mb:block id=webm kind=video label="Alt cut — stamped" -->
[Watch the WebM cut](https://mdn.github.io/shared-assets/videos/flower.webm)

**Link class, stamped `kind=video`.** The stamp pins the *class*, not the refinement: a profile whose
extension table reads `.webm` as audio warns and keeps the stamp rather than declaring the file invalid
(§6.2, §7). Remove the link and the block becomes a validation error, not a text block.
<!-- mb:/block -->

---

<!-- mb:section id=audio label="Audio" -->

## Audio

<!-- mb:block id=reference preset=player label="Reference sample" -->
[Play the reference sample](https://mdn.github.io/shared-assets/audio/t-rex-roar.mp3)

**Link class, `audio`, single item, `preset=player`.** Nothing distinguishes this block from the video
above except the destination's extension — audio and video share one class, and the refinement is the
difference. `player` is the token that says *play it here* rather than *go there*; without it this block
would render as the link it is authored as.
<!-- mb:/block -->

<!-- mb:block id=takes preset=player label="Session takes" -->
- [Voices around a fire](https://mdn.github.io/shared-assets/audio/voices-around-a-fire.mp3)
- [Countdown](https://mdn.github.io/shared-assets/audio/countdown.mp3)
- [Guitar](https://mdn.github.io/shared-assets/audio/guitar.mp3)

**Link class, `audio`, list form, `preset=player`.** A flat list of media links is *one* media block, and
the authored form is preserved — a one-item list would stay a list. `player` on a list asks for a
playlist; how a profile presents one is its own business.
<!-- mb:/block -->

---

<!-- mb:section id=other label="Files and galleries" -->

## Files and galleries

<!-- mb:block id=spec-sheet preset=link:download label="Spec sheet" -->
[Download the spec sheet (PDF)](https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf)

**Link class, `file`, `preset=link:download`.** Not every link-class block is playable. The refinement
comes from the extension table a profile declares, and a destination that table does not recognise reads
as `file`. The `link` family is the explicit *don't embed*; on a file destination the `:download`
modifier is the natural spelling.
<!-- mb:/block -->

<!-- mb:block id=stills preset=gallery:row label="Stills" -->
- ![Rig, wide](images/tour.jpg)
- ![Kiosk, detail](images/kiosk.jpg)
- ![Launch, night](images/launch.jpg)

**Image class, list form**, with a gallery preset. The kind stays `image`; the preset is presentation.
<!-- mb:/block -->

---

<!-- mb:section id=columns label="Media in columns" -->

## Media in columns

<!-- mb:columns weights=[1,1] label="Frame and track" -->
<!-- mb:col -->
<!-- mb:block id=col-still kind=image preset=image:contain label="Frame" -->
![Rig, wide](images/tour.jpg)

A `block` inside a `col` — image class.
<!-- mb:/block -->
<!-- mb:col -->
<!-- mb:block id=col-track label="Track" -->
[Voices around a fire](https://mdn.github.io/shared-assets/audio/voices-around-a-fire.mp3)

A `block` inside a `col` — link class. Columns hold blocks, so both media classes compose with the
layout primitives without special casing.
<!-- mb:/block -->
<!-- mb:/columns -->
