# MD-Blocks parser

The environment-free parser for the [MD-Blocks](https://github.com/herrbasan/md-blocks) format,
spec **v1.10**. Source: [`parser/`](../parser/) — `md-blocks.js`, with a CJS entry, an ESM entry
and a test suite beside it.

The format's contract lives in the md-blocks repo; this is the implementation the contract points
at. It replaces three parsers that had drifted apart — `parseBlocks()` in `NUI/nui.js`, the CJS
`parse()` in `md-blocks/tools/render.js`, and the narration subset in nSpeech
([nui_wc2#83](https://github.com/herrbasan/nui_wc2/issues/83)).

**Constraints, and they are the point:** plain JavaScript, no DOM, no filesystem, no network, no
dependencies, no build step. Node loads it with `require()`, the browser with `<script>` or the ESM
entry, and every consumer gets the same tree from the same source.

---

## Using it

```js
// Node — CJS
const { parse, parseOrThrow, validate } = require('./parser/md-blocks.js');

// Node — ESM
import { parse } from './parser/md-blocks.mjs';

// Browser
import { parse } from '../parser/md-blocks.mjs';
```

```js
const doc = parse(source);                    // never throws, collects diagnostics
const doc2 = parseOrThrow(source);            // throws MDBlocksError on any error-severity entry
const list = validate(source);                // just the diagnostics
```

`parse(source, options)` takes one option:

| Option | Meaning |
|---|---|
| `extensions` | The §4.2 extension table — `{ image: [...], video: [...], audio: [...], file: [...] }`. Entries are extensions without the dot; a supplied category replaces the default one. It is **profile data**: parsing performs no lookups, so the profile is handed in, never guessed. |

`MDBlocksError` carries `diagnostics` (all of them) and `errors` (the error-severity subset).

---

## The tree

Spec §8, plus the metadata §3 and §7 require:

```text
document { frontmatter, mains[], diagnostics[], line, endLine }
main     { attrs, id?, label?, preset?, sections[], line, endLine }
section  { attrs, id?, label?, preset?, vars[], children[], line, endLine }
var      { attrs, name, value?, fenced, line, endLine }
child    = markdown | block | columns
markdown { markdown, line, endLine }
block    { attrs, id?, label?, preset?, kind?, focal?, icon?, alt?, repeat?,
           markdown, kindStamped, mediaClass, mediaForm, mediaDest, teaser?, line, endLine }
columns  { attrs, id?, label?, preset?, weights?, cols[], line, endLine }
col      { attrs, id?, label?, preset?, children[], closedBy, line, endLine }
```

Three additions to §8, each with a reason:

- **`line` / `endLine`** on every node (1-based) — §7 requires a location on every diagnostic, and a
  node without an extent cannot be edited, selected or navigated.
- **`attrs`** on every container — the authored attributes exactly as parsed. §3's `data:` namespace
  is *open*, so a parser that kept only the known fields would drop what §8 requires preserved on
  round-trip.
- **`kindStamped`**, and the media verdict — §6.2 makes the stamp authoritative, so the tree must
  say which `kind` came from the file and which was inferred, and which media class the first node
  actually has.

Other fields worth knowing:

| Field | Meaning |
|---|---|
| `frontmatter` | `null`, or `{ raw, data, line, endLine }`. `raw` is authoritative; `data` is a YAML subset (scalars, inline lists, block lists, one nesting level) — the format stores frontmatter and never interprets it (§3). |
| `var.fenced` | `'json'`, `'text'`, or `null` when the value came from `value=`. |
| `col.closedBy` | `'col'`, `'/col'`, or `'/columns'` — §4.3 says an explicit `/col` is the same boundary written out, and §8 requires the authored form preserved. |
| `markdown` (node) | One maximal unannotated run, trimmed of surrounding blank lines, with `line`/`endLine` pointing at the source it covers. |
| `teaser` | Only on a `card:teaser` block: `{ dest, label }` when the block's **last** node is a paragraph holding exactly one link, otherwise `null`. |

Markdown bodies are the authored text, verbatim. The parser does not normalise inside a body — §8
allows normalising whitespace *around* directives, not within Markdown.

---

## Diagnostics

Every entry is shaped `{ severity, code, message, line, ... }`, where severity is `error`,
`warning` or `info`, and the extras are `expected` (the form the spec wants), `endLine` (for a
range) and `related: [{ line, message }]` (the "first at line N" of a duplicate). The list is
sorted by line, then code.

**Policy:** `parse()` always returns a complete tree and reports. A tool that must not publish a
guessed tree (§7's last line) calls `parseOrThrow()` and gets the diagnostics as an exception. An
invalid document still yields a walkable tree — the parser repairs structure by closing what the
author left open and reports that it did.

Only what §7 lists is validated. Renderer judgements — unknown presets, `player` on a
destination the profile cannot play, a refined `kind` the profile reads differently, an
unresolvable asset — are **not** parser errors, and the `card:teaser` with no destination is the
clearest case: the block is valid, `teaser` is `null`, and the renderer warns.

### Codes

Structural placement and nesting:

| Code | Condition |
|---|---|
| `unknown-directive` | an `mb:` comment whose kind is not `main`, `section`, `block`, `columns`, `col`, `var` (lowercase) |
| `malformed-directive` | an `mb:` comment that is not alone on its line at column 0 |
| `directive-indented` | a directive with leading whitespace — inside a list item, a quote, or code |
| `directive-in-block` | a directive other than `/block` inside a block |
| `nested-block`, `nested-columns` | a container opened inside itself |
| `main-in-container`, `section-in-container`, `var-in-container` | document-level or section-level directives inside a block or columns |
| `main-closing` | `<!-- mb:/main -->` — a main is a break, it has no closing form |
| `duplicate-section` | a second `mb:section` in one section |
| `stray-close` | `/block`, `/columns`, `/var`, `/section` with nothing of that kind open |
| `close-attributes` | attributes on a closing marker |
| `col-outside-columns` | `col` or `/col` outside columns |
| `block-before-col`, `content-before-col` | content inside columns before the first col |
| `content-outside-column` | content between an explicit `/col` and the next marker |
| `columns-too-few-cols` | fewer than two col markers |
| `weights-invalid`, `weights-length` | weights not a positive-number array, or not one per col |
| `unclosed-block`, `unclosed-columns`, `unclosed-fence`, `unclosed-var-fence` | open at end of file |
| `unsupported-html` | a raw HTML element outside code (§3's profile) |

Attributes:

| Code | Condition |
|---|---|
| `attribute-syntax` | text on a marker that is not `key=value` |
| `attribute-value` | malformed JSON, a raw `<` or `>`, or a `kind` outside `image \| video \| audio \| file` |
| `unknown-attribute` | a bare key not allowed on that directive, or a namespace other than `data:` |
| `duplicate-attribute` | the same key twice |
| `data-empty-key` | `data:=…` with no property name |
| `repeat-invalid` | a value other than `header`/`footer`, or `repeat` on anything but a block |

Vars and identity:

| Code | Condition |
|---|---|
| `var-name-missing` | `var` without `name=` |
| `duplicate-var-name` | the same name twice in one section |
| `var-missing-payload` | neither `value=` nor a `json`/`text` fence directly below |
| `var-invalid-json` | the fence is `json` and its body does not parse |
| `duplicate-id` | the same `id` twice in a document |

Narration (§5.2):

| Code | Condition |
|---|---|
| `audio-without-narration`, `empty-audio` | `audio=` outside a narration block, or empty |
| `name-without-narration`, `empty-name` | `name=` outside a narration block, or empty |
| `speaker-name-conflict` | one speaker id named two ways, reported with both locations |

Content and profile:

| Code | Severity | Condition |
|---|---|---|
| `kind-media-class` | error | a stamped `kind` whose media class contradicts the block's first node |
| `setext-trap` | warning | a paragraph line directly above a root-level `---` — that is a setext H2, not a separator |
| `no-structure` | info | frontmatter but not one directive — valid, and worth saying |

---

## Media blocks (§4.2)

The parser separates two questions that the spec's prose merges:

1. **Shape** — is the block's first node a lone image, or a lone link (including a linked image as
   poster), or a flat unordered list of either? `mediaClass` is `image`, `link` or `null`;
   `mediaForm` is `single` or `list`.
2. **Declaration** — is that shape a *media block*? It is when the shape is an image, when the
   destination's extension is in the profile's table, when the author stamped `kind=`, or when the
   preset names a media family (`image`, `gallery`, `player`, `link`).

`kind` follows: `image` for an image shape; for the link class, the profile's answer — `video`,
`audio`, or `file` for anything else, including an extension the table does not know.

The stamp is checked against the **class**, not the refinement (§6.2): `kind=image` on a block whose
first node is no longer an image is `kind-media-class`; `kind=video` on a `.webm` the profile reads
as audio is not an error, and the stamp survives.

A paragraph with text around the image is not media — it is a text block containing an inline image
(§10). A prose link with no media extension and no media preset stays a link.

---

## Where the spec left an implementer guessing

Raised rather than silently decided. The parser's choice is named so it can be argued with — and so
that the other two implementations can be brought onto it instead of drifting.

1. **A link to an image extension.** §4.2 says the refinement inside the link class is `video`,
   `audio` or `file`, decided by the destination; so `[Photo](shot.jpg)` in a block reads `file`.
   `NUI/nui.js` currently reads `.jpg` as `image`, which would put the `image` kind on a link-class
   node. §6.2 permits profiles to disagree, but the two implementations in this repo should not.
   **Spec decision wanted.**
2. **`mb:section` and the flush rule.** §6.1 lists "a structural directive" among the things that
   flush the implicit Markdown run; §4.1 calls `mb:section` an annotation that "still applies to that
   section" wherever it is written. Read literally, a section marker in the middle of a section
   splits it into two runs. This parser follows §6.1. If that split is unwanted, the spec should say
   `section` is exempt.
3. **Content between `/col` and the next marker.** No node can hold it — a col ended, the next has
   not begun. Reported as `content-outside-column` and dropped, rather than invented into a column.
4. **Comments before the first col.** §4.3 allows blank lines and ordinary comments there, but the
   tree has no place for them; they are dropped. (Comments *inside* a run stay in its Markdown.)
5. **§10's "destination the profile does not know → kind `file`".** Reachable only when something
   else already declares the block media — a stamp, or a media preset. A bare `[Link](file.xyz)`
   with no preset stays a plain link, because §4.2's entry condition is a *known* media extension.
6. **`focal`.** §7 has no row for it, so only JSON syntax is checked: `focal={"x":2,"y":0}` parses.
7. **The setext trap.** §10 says the separator is content and the validator warns; it does not say
   whether a renderer should still break the section. The parser does not break — and the archived
   demo renderer does, which is exactly the kind of divergence this module exists to end.
8. **A directive inside a quote.** §7 lists it as an error, but §3 fixes a directive at column 0, so
   a `>`-prefixed marker is not a directive at all — it is an ordinary comment. The parser reads it
   as content, because reporting it would flag every document that quotes an example without fencing
   it (the md-blocks main-marker test report does exactly that, and quoting the format is a normal
   thing to do). Related: `> ```` does not open a fence either — this parser does not implement
   CommonMark block structure, so code fenced *inside* a quote is plain quoted text. Its directives
   stay inert regardless, since none of them starts at column 0.
9. **Indentation.** One to three columns of leading whitespace is `directive-indented`; four or more
   is indented code, which §3 says is literal. A list item's content indented four columns is
   therefore read as code — the one place where the two cannot be told apart without a full
   CommonMark block parser, and the spec makes the two rules identical in effect.

One more, not a spec gap but a behaviour worth knowing: §3 makes a bare attribute value a number,
a boolean or `null` when it looks like one. `id=1` therefore becomes the number `1`, not the string
`"1"`.

---

## What is not here

- **A serializer.** §8's invariant — `parse(serialize(parse(src))) ≡ parse(src)` — needs one, and the
  tree carries what it needs (`attrs` for authored spelling, `markdown` verbatim, `closedBy`,
  `kindStamped`). It is the next module, not this one.
- **A renderer.** `NUI/nui.js` still renders from its own `parseBlocks()`. Switching it to this
  parser is the consumer migration, and it is what proves the extraction: `nui-blocks`, the nui
  editor, the nSpeech narration extractor (which becomes a read of the tree, not a parser), and
  `md-blocks/tools/{validate,render}.js` becoming thin callers.

---

## Tests

```powershell
node parser/test/run.js            # conformance + fixtures
node parser/test/run.js --report   # what the parser says about each fixture document
node parser/test/run.js teaser     # one topic
```

`parser/test/conformance.js` is §10 transcribed: source, expected diagnostics with line numbers,
expected counts, and probes into the tree. `parser/test/fixtures/` holds the md-blocks demo
documents and the archived model test-runs, unchanged, with `expectations.json` recording where each
came from and what must keep being true.

Both suites also run two invariants:

- **shape** — every node has `line`/`endLine`, every container its children, every document at
  least one main and every main at least one section;
- **coverage** — for a clean document, every non-blank source line is either owned by a node's
  extent or is structure (a directive marker, a section separator). A gap is content the parser
  swallowed, which a tree comparison alone would never show.
