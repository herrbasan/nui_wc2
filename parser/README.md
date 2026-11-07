# MD-Blocks parser

The DOM-free parser for the [MD-Blocks format](https://github.com/herrbasan/md-blocks) — spec
**v1.10**. Plain JavaScript, zero dependencies, no build step, no DOM. The same file runs in Node
(CJS or ESM) and in the browser.

**The implementation lives in [`NUI/md-blocks.js`](../NUI/md-blocks.js)** — the folder the library
ships as, so a consumer who copies `NUI/` gets the parser with it. This directory is the contract's
entry point: the forwarders below and the test suite.

The format used to have three parsers — `parseBlocks()` in `NUI/nui.js`, a CJS `parse()` in
`md-blocks/tools/render.js`, and a narration-only subset in nSpeech — each ageing at a different
speed and quietly disagreeing about the tree. This module replaces all three
([nui_wc2#83](https://github.com/herrbasan/nui_wc2/issues/83)), and `NUI/nui.js` renders from it
([nui_wc2#84](https://github.com/herrbasan/nui_wc2/issues/84)).

| File | What it is |
|---|---|
| [`NUI/md-blocks.js`](../NUI/md-blocks.js) | the implementation, written as a UMD factory — `require()`, `<script>`, and ESM all reach the same instance |
| `NUI/md-blocks.cjs` | CJS entry (`module.exports = require('./md-blocks.js')`), survives a future `"type": "module"` |
| `NUI/md-blocks.mjs` | ESM entry with named exports |
| `md-blocks.js` / `md-blocks.cjs` / `md-blocks.mjs` | forwarders to the files above, so older paths keep working |
| `test/run.js` | zero-dependency test runner |
| `test/conformance.js` | spec §10 transcribed as executable cases |
| `test/fixtures/` | the md-blocks demo documents and the archived model test-runs, with expectations |

```js
const { parse } = require('./NUI/md-blocks.cjs');
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
