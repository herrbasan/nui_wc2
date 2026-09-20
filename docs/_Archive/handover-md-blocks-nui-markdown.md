# Handover: MD-Blocks support in nui-markdown (2026-09-10)

> **Status: Task 1 and Task 2 both done.** The frontmatter work landed as a
> `collapsed` default mode (with `open`/`show`/`strip`/`false` alongside), and the
> experiments page exists at `Playground/pages/experiments/md-blocks`. Three
> renderer bugs found on the way were fixed as well: CRLF/BOM/empty frontmatter
> recognition, HTML comments now stripped, and markdown images made block-level
> media with the house bottom margin. The original brief is kept below as written.

Work agreed with user, **originally not started** at the time of writing. Switching models — this is the brief.

## Goal

Evolve `nui-markdown` (core component, [NUI/nui.js](../NUI/nui.js)) toward rendering MD-Blocks
documents. Spec lives at **github.com/herrbasan/md-blocks** (`md-blocks-spec.md`, directive prefix
`mb:`). Long-term: `nui-blocks` renderer component in this repo.

## Task 1 — frontmatter display optional + collapsed control

Current state (all in `NUI/nui.js`):

- `markdownToHtml(md, { frontmatter })` (~line 6292): modes `show` (default, visible metadata
  card), `strip` (removes), `false` (raw). `parseFrontmatter` ~6236, `renderFrontmatter` ~6278.
- `NuiMarkdown` class ~6409; `_renderMode()` whitelists attribute values `show|strip|false`.
- `.metadata` always exposes the parsed object.

Plan (backward compatible):

1. Add mode `'collapsed'`: render the existing `<dl class="nui-md-frontmatter">` wrapped in
   `<details class="nui-md-frontmatter-details"><summary>Metadata</summary> … </details>`.
   Touch points: `renderFrontmatter` (optional 2nd param), `markdownToHtml` mode handling,
   `_renderMode()` whitelist, `connectedCallback` fm-parse condition, JSDoc comments.
2. CSS: extend the frontmatter block in [NUI/css/nui-theme.css](../NUI/css/nui-theme.css) (~line
   4935) with `.nui-md-frontmatter-details` / `summary` styles. Theme variables only.
3. Docs: modes table in [documentation/components/markdown.md](../documentation/components/markdown.md)
   (~line 80) and the attribute line in [LLM-CHEATSHEET.md](../LLM-CHEATSHEET.md) (~line 722).
   `nui.d.ts` has no frontmatter declarations — nothing to update there.

## Task 2 — experiments page with an MD-Blocks document

- Nav: `Playground/js/main.js` ~line 349, section `Experiments` — add
  `{ label: 'MD-Blocks', href: '#page=experiments/md-blocks' }`.
- New files:
  - `Playground/pages/experiments/md-blocks.html` — intro callout + live render.
  - `Playground/pages/experiments/md-blocks-demo.md` — the document itself; reference it with
    `src="pages/experiments/md-blocks-demo.md"` (fetch resolves relative to `Playground/index.html`).
- Demo document should exercise: YAML frontmatter, `---` section separators, `mb:block`,
  `mb:columns`/`mb:col`, `mb:var`. Local images for a media block: `Playground/images/nui_1..8.webp`.
- Known "before" state: the current renderer escapes HTML comments, so `mb:` directives show as
  visible text until directive support lands. That's acceptable — the page is the progress test bed.

## Verify

Five Server is running: `http://127.0.0.1:5500/Playground/#page=home` (user shares the browser
page). Check the new experiments page renders and the collapsed frontmatter works.

## Conventions (NUI repo)

- Tabs; no new CSS variables; never style `nui-*` components; demo pages are pure markup
  (`nui.registerPage` in `Playground/js/page-init.js` only if JS is needed).
- Repo docs: read `Agents.md` + `LLM-CHEATSHEET.md` first.
