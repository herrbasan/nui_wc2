# MD-Blocks parser

The DOM-free parser for the [MD-Blocks format](https://github.com/herrbasan/md-blocks) — spec
**v1.10**. Plain JavaScript, zero dependencies, no build step, no DOM. The same file runs in Node
(CJS or ESM) and in the browser.

The format used to have three parsers — `parseBlocks()` in `NUI/nui.js`, a CJS `parse()` in
`md-blocks/tools/render.js`, and a narration-only subset in nSpeech — each ageing at a different
speed and quietly disagreeing about the tree. This module replaces all three
([nui_wc2#83](https://github.com/herrbasan/nui_wc2/issues/83)).

| File | What it is |
|---|---|
| `md-blocks.js` | the implementation, written as a UMD factory — `require()`, `<script>`, and ESM all reach the same instance |
| `md-blocks.cjs` | CJS entry (`module.exports = require('./md-blocks.js')`), survives a future `"type": "module"` |
| `md-blocks.mjs` | ESM entry with named exports |
| `test/run.js` | zero-dependency test runner |
| `test/conformance.js` | spec §10 transcribed as executable cases |
| `test/fixtures/` | the md-blocks demo documents and the archived model test-runs, with expectations |

```js
const { parse } = require('./parser/md-blocks.js');
const doc = parse(source);
```

Full contract — API, tree shape, every diagnostic code, the media rules, and the three places the
spec left an implementer guessing — is in
[`documentation/guides/md-blocks-parser.md`](../documentation/guides/md-blocks-parser.md).

```powershell
node parser/test/run.js            # everything
node parser/test/run.js --report   # what the parser says about each fixture document
node parser/test/run.js media      # cases whose name contains "media"
```
