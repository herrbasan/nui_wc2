# Blocks Editor — Design Foundations (settled 2026-09-15/16)

Discussion outcomes between user + partner. Status: **settled unless marked OPEN**.
Spec reference: md-blocks v1.3 (locked), `D:\Work\_GIT\md-blocks\md-blocks-spec.md`.

## Architecture position

- **md-blocks is the defining document model.** The editor is its companion. New *persistable
  structure* is a spec decision (spec edit + DECISIONS.md entry + version bump). New *interaction*
  is editor-only and costs no spec change.
- The editor's UI kernel is format-independent (drag, templates, dialogs, media strip).
  The document model is md-blocks-shaped by design (spec §6 exists *for* this editor).
- Other formats attach later as **export targets** — one-way renderings, not round-trip peers.
  MD-Blocks is the only round-trip format; `serializeBlocks` should sit behind an
  `export(doc, format)` interface with md-blocks as native.
- Rationale: text-as-model = authorable (LLMs/humans), diffable, runtime-free.
  Restriction = the speed mechanism (consumption/editing/exchange). Not a phase to grow out of.

## Editing levels

- Editor works at **two levels: sections and blocks**.
- `main` is invisible (= the file). Document has one implicit main; don't model multi-main
  (preserve bytes verbatim, don't edit).
- Chrome (`repeat=header|footer` blocks) is a **document-level property**, shown in a
  document-level UI band, not inside section cards. (Currently written into `sections[0].nodes`
  and filtered out of the canvas — to be fixed.)
- Web / print / slides = the same tree, different **profile**. The Target selector must switch
  the preview profile, not just a badge (currently cosmetic — `currentMode` only toggles
  the chrome panel).

## Section templates (= functions; spec §5.1: "composite palette entries are templates")

Two types, expandable by CMS later. Section header UI: drag handle, title,
**template chip** (derived, never stored), **gear icon (popover with template options)**, delete.
No preset dropdown.

| Template | File writes | Content rule | Options |
|---|---|---|---|
| **Normal** | nothing, or `preset=band`(+`:inverted`) | any blocks | band checkbox, inverted (visible when band on) |
| **Hero** | `preset=cover` (+`:square`/`:banner`/`:strip`), or band variant in contain mode | **exactly one media block** (editor rule) | placement (cover/contain), aspect ratio (wide 16:9 default / square 1:1 / banner 16:5 / strip 16:3; cover only), band+inverted (contain only) |

- **Template recognition is structural, never stored**: hero = `cover` preset family OR a
  section whose whole content is one media block. A normal section filled with a single
  media block IS a hero — same structure, same treatment. The UI can never disagree with
  the document.

- Band+inverted: `preset=band:inverted` (spec §5.1 already blesses "fully inverted theme"
  as a renderer treatment of band).
- Hero = media container, **1..n images/videos** (spec §4.2 media list form already exists;
  single-image form converts to list form when a second item is added — spec: authored form
  is preserved).
- Hero display modes: `cover` (media = background) / `contain` (whole, existing image:contain
  semantics) / filmstrip / masonry later (`cover:filmstrip`, `gallery:masonry` — masonry already
  in starter vocab).
- Hero height = **aspect ratio, not vh** (vh is viewport-relative — meaningless in print,
  dishonest on mobile). The ratio is relative to the **document's width**, so the cover scales
  with the column. Named tokens (preset segments can't contain `:`): bare `cover` = 16:9 wide,
  plus `cover:square` (1:1), `cover:banner` (16:5), `cover:strip` (16:3). Never raw numbers —
  spec §3 bans style values (locked decision).
- Hero text (headline/CTA) = the media block's **caption** (spec §4.2). Optional feature, later.
- Hero gets "inverted" too — every hero has a background even in contain mode.

## Naming

- **"hero" = the editor word** (template name; never in the file).
- **"cover" = the file word** (section preset; media becomes the section background).
- `image:hero` **block** preset stays as-is (inline banner figure, different level, already in use).

## Context-scoped block options (settled 2026-09-16)

**A block's option set is scoped by the section template it lives in.** The block preset
select is not a fixed palette — it is the set of presets that are *meaningful in context*.

- In a **hero** section, the media block's preset is the cover's **arrangement**:
  `Auto` (no block preset) or `gallery:row`. Nothing else is offered.
- In a **normal** section, the full media palette (figure / image:hero / gallery:*).
- Editor + renderer may support context-scoped behavior; **the spec does not formalize it**.
  The spec only owns the *default*:
  **cover + image list = an even row** (each item fills its share, `object-fit: cover`;
  static, no JS). A single image fills. Slideshow rotation is an enhanced-renderer /
  profile concern — not spec law.
- `featured` / `mosaic` are dead in hero context (they dangle thumbnails / compose
  asymmetrically — everything in a hero must fill the object). They remain normal-section
  options.
- Implementation: `inHeroContext()` (sections have `vars`, columns don't) picks
  `HERO_MEDIA_PRESETS` vs `MEDIA_PRESETS` in `renderMediaBlockNode`; the cover's list form
  is `display: flex` + `flex: 1 1 0` per item in `nui-theme.css`.

## Block type vs block style (settled 2026-09-18)

The block preset dropdown conflated two operations: **restyling** (same content, new
presentation — cheap, reversible) and **retyping** (the content's shape must change —
prose → `link:cta` wants a single link, prose → media wants an image). Retyping via
dropdown authored invalid states the RTE cannot honor (a CTA containing three
paragraphs, an icon block with no icon).

- **Shape is fixed at creation.** The insert palette picks the block's TYPE (Prose,
  Media Figure, Link/CTA…). The type never changes afterwards; there is no conversion
  dropdown.
- **Style is mutable within shape.** The block header select offers only presets whose
  authored shape (spec §5.1 "Authored Markdown Shape" column) matches the block type.
  Prose: Standard / Lead / Card: Note / Card: Warning / Card: Stat (+ `image:icon`,
  below). Link block: CTA / Download. Media already works this way (own preset list).
- **Layout vs styling is ontology, not preference:** directives (`columns`/`col`) are
  structure — where content sits; `preset` is an attribute — what content claims to be.
  Palette gets groups: **Content / Layout / Data**. The columns card carries no style
  select. The tree is exactly two levels: section → styling blocks + layout blocks;
  a col holds styling blocks only (spec §4.3), a block holds Markdown only (§4.2).
- **Style reveals the attribute editor it needs.** `image:icon` stays a prose style
  (its body IS prose); selecting it reveals an icon picker for the `icon=`/`alt=`
  block asset attributes (§4.2) — currently unauthorable except via raw mode.
- **Parked:** "turn selection into block" (RTE split gesture). The manual cut /
  new-block path is good enough; the selection→source-line mapping machinery isn't
  worth the maintenance. RTE-internal range styling rejected: no nested blocks
  (spec §4.2 forbids them); styling a range would mean wrapping it in its own
  sibling block, which manual copy already covers.

## `cover` — the spec fix

The word `cover` exists in spec §5.1 as a section modifier with **no definition, no decision-log
entry, no demo use, no implementation**. Per md-blocks Agents.md ("ambiguity is a real bug"),
it gets the meaning above instead of deletion:

- `preset=cover` on a section = the section's media is the background (object-fit: cover);
  shape via ratio variant tokens.
- Renderer rule: in a cover section, the media fills the background; a list splits into an
  even row (spec default for multiple); the block's caption renders as overlay text.
  Generic previews: normal image + text. Nothing breaks.
- Requires: spec §5.1 edit + DECISIONS.md entry + version bump (spec is locked — do deliberately).
  The spec edit must include: cover's modifier slot = ratio; item arrangement belongs to the
  BLOCK preset; cover+list defaults to row.

## band/bleed/width — settled

- `band` = **surface** axis (different background). Section-level only (no block-level band).
- `:bleed` = **extent** axis (cancels container padding only — ~16px each side). Orthogonal,
  works on blocks too.
- **Full-viewport width is NOT part of the spec.** It's a site-level CSS hack (class toggle),
  e.g. NUI's existing `breakout` pattern. Renderer emits `nui-preset-band`; the site's stylesheet
  decides whether it goes full-viewport.
- **Renderer fix needed**: `band` today renders as a rounded card (border + radius + padding).
  It must render **flat**: no border, no radius, background edge-to-edge of the content column,
  content keeps normal page padding. `band:bleed` already goes cornerless — inconsistency.
- User's mental model is background-only: band never affects text placement, only the background.

## OPEN threads (parked)

1. **Range-anchored parser** — the decisive architecture question. Today `normalizeDoc()`
   converts every implicit `md` run into an explicit block+id on load, and the editor
   re-serializes the whole file per keystroke → violates spec §6.1/§6.4/§8 (editing block A
   must not rewrite block B's bytes). Needs a parser that carries source ranges so edits are
   surgical splices. Everything (kind stamping §6.2, validation §7, round-trip §8) hangs on this.
2. **Faithful vs neutral canvas** — should the editor canvas look like the chosen target
   profile (slide edges in deck mode etc.) or stay profile-neutral?
3. **Unknown presets render plain SILENTLY** in nui (`nui.js` emits `nui-preset-<family>`
   with no diagnostic). Spec §5 requires a visible renderer diagnostic. Small fix.
4. **Var rendering** — `mb:var` currently renders as a visible `dl.nui-blocks-var` card
   mid-document (spec-allowed for display renderers). Is that the right look in a document?
5. **Validation (§7) absent** — raw-pane parse failure is console.error + silent no-op;
   no diagnostics UI anywhere.
6. **Editor placement** — md-blocks Agents.md: the editor is meant to be a **nui addon**
   (peer of nui-slides), not Playground-only (`Playground/js/blocks-editor.js`, ~1290 lines).
   Move to `NUI/lib/modules/nui-blocks-editor.js` when the architecture settles.

## Build order (agreed)

1. ✅ Renderer fix (2026-09-16) — band renders flat (no card border/radius);
   `band:inverted` added; unknown presets warn once per session in `mbOpenTag`
   (`nui.js`, spec §5 visible diagnostic); `cover` section rendering added to
   `nui-theme.css`: media = background, caption = scrim overlay, width-relative
   ratio tokens (bare = 16:9 wide, `cover:square` 1:1, `cover:banner` 16:5,
   `cover:strip` 16:3), list form = even row (spec default for multiple).
   **Technique** (two CSS traps hit and solved): the ratio is a `::before`
   spacer with width-relative `padding-top` — NOT the `aspect-ratio` property,
   which inverts and drives the *width* when a height floor binds (horizontal
   scroll). No min-height magic number: `display: contents` dissolves the figure
   so the figcaption joins the section grid in-flow — the caption's own height
   is the natural floor, and a tall caption grows the section instead of clipping.
   Row items: `flex: 1 1 0`, `margin: 0`, hairline `gap: 0.25rem`.
2. **Spec edits** — `cover` meaning + variants, DECISIONS.md, version bump.
   NOTE: implementation now runs ahead of the spec — the spec edit documents what exists.
3. ✅ Editor template model (2026-09-16) — template dialog on "+" (Normal/Hero),
   gear popover per section (band/inverted for normal; placement/ratio/band for hero),
   template chip in header, hero sections hold exactly one media block (no add strips),
   default doc showcases hero+band. **Canvas fidelity**: cover media frames mirror the
   section's options live — fill+crop at the same ratio tokens, plus a read-only
   caption ghost with the renderer's scrim (a strip honestly shows it's mostly
   caption). Gotcha recorded: the base `.media-frame img { max-height: 20rem }`
   clamp silently capped cover fills — overrides must clear inherited clamps.
4. Parser architecture — range-anchored parse (decides editor save architecture)
