# Session Record — Blocks-Editor Frontmatter Work (2026-09-22)

**Goal:** Test the blocks-editor against real documents (a production blog post
from MCP storage), with special attention to the YAML frontmatter portion.

## What landed (and works)

1. **Real bug found & fixed: YAML round-trip corruption.** `serializeBlocks`
   wrote frontmatter back as single-line `JSON.stringify` — re-parsing silently
   destroyed nested structures (authors, tags). Added `util.serializeYaml`
   (block-style emitter, exact inverse of `parseYaml` for all its shapes;
   quotes scalars only when re-parse would change the value; handles top-level
   maps/arrays/scalars). `parseYaml` also learned `{}` flow maps. Verified
   lossless in-browser on a real post. Documented in LLM-CHEATSHEET.md.
2. **Test material:** `blog/posts/the-ghost-in-the-agent.md` (richest
   frontmatter of the blog: nested authors, tags, null series, quoted strings
   with colons) copied to `Playground/pages/experiments/`, hero image to
   `Playground/images/`. Editor has "Load Demo" + "Load Blog Post" buttons.
3. **Generic frontmatter editor** (page-mode `nui-dialog`, NUI components
   throughout): shape-driven only — string → nui-input (date picker for any
   ISO-date string; convenience, value stays a string), long string →
   nui-textarea, number/boolean/null → matching inputs, list of scalars →
   nui-tag-input, list of maps → nui-card entries with a user-driven add-key
   row, deeper shapes → per-value YAML textarea. Raw YAML mode as escape
   hatch. Add Field types: Text / Date / List / Key-Value Pairs.
4. **Standards analysis:** blog frontmatter maps cleanly onto Hugo / Dublin
   Core / Schema.org (`created`→`date`, `modified`→`lastmod`, `lang`→
   `inLanguage`, roles → MARC relators). Only `version` (translation
   staleness) and `role: ai` are genuinely custom. Raum consumers of
   `created`/`modified` fully mapped: `tools/pages.mjs` lines 16/26 only;
   build.mjs consumes parsed output; migrate-md-blocks.mjs is one-shot;
   nCMS reads neither.

## The debugging saga (the expensive part)

Symptom: clicks on buttons "intercepted" by parent containers — Playwright
and the user's real mouse alike. Hours spent theorizing (dialog backdrop,
tooltips, animations, sortable overlays). Root cause: **the VS Code
integrated browser delivers real mouse events scaled by a constant factor
(~0.9063)** — every click lands ~9% up-left of aim. Page-internal geometry
(`elementFromPoint`, `getBoundingClientRect`) was always correct; only input
delivery was off. Discriminating test: log delivered `e.clientX/Y` vs the
requested click point — a constant ratio means environment, not code.
Ctrl+0 via page keyboard does not help (host-level). Stored as workshop
memory #3921 so no future session burns time on this.

## Process failures (called out by David, correctly)

- Built the first structured editor with hand-rolled buttons/inputs/CSS
  instead of the library's own components — in the UI library's own repo.
- Baked blog-schema assertions (lang select, role select) into what should
  have been a generic YAML editor from the start.
- Read "start from scratch" as license to rewrite the dialog as an inline
  card editor without asking — the single worst call of the session.
- Three rewrites where one careful pass would have done. Very high token
  cost for the value delivered.

## Final state on disk (uncommitted)

- `NUI/nui.js` — serializeYaml + `{}` support (keep).
- `LLM-CHEATSHEET.md` — serializeYaml documented (keep).
- `Playground/pages/experiments/blog-the-ghost-in-the-agent.md`,
  `Playground/images/the-ghost-in-the-agent_hero.webp` (keep).
- `Playground/js/blocks-editor.js`, `Playground/pages/experiments/
  blocks-editor.html`, `NUI/css/modules/nui-blocks-editor.css` — frontmatter
  editor, restored to the approved page-mode dialog version.

## Lessons

- Verify with delivered-event coordinates before theorizing about app bugs.
- In a component library repo, the first move is always the library's own
  components — check components.json before writing a single control.
- "Start over" means the approach, not the UI architecture — ask which.
- A green light covers the job; it does not cover redesigning what was
  already approved.
