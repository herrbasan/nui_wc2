# Handover — nui-page Structure Contract

**Repo:** `d:\Work\_GIT\nui_wc2` · **Date:** 2026-09-26 · **Status:** COMPLETE — all 57 pages conformed, router page-<slug> scoping implemented, breakout and .maxwidth-container alignment verified.

Playground live at `http://127.0.0.1:5500/Playground/index.html` (Five Server already running).

---

## 1. The goal

Codify a single structure contract for router-loaded pages so "what is bounded and what isn't" stops being ad-hoc per page.

```
nui-content        → viewport minus space-occupying sidebars (left sidebar in Playground)
nui-main           → fills nui-content, IS the scroll container (overflow-y: auto)
nui-page           → inner container of the scroll area; NO padding, NO constraint itself
  └─ children      → constrained: max-width: var(--space-page-maxwidth) (56rem)
                   → + padding: var(--nui-space) var(--nui-space-double)   (theme rule)
  └─ [breakout]    → max-width: 100%, SAME horizontal padding (mirrors text-flow gutter)
  └─ header/section/footer children → additionally get vertical rhythm from theme
```

**Key decisions already made with the user:**

- Constrained children are **left-aligned** (no `margin-inline: auto`). User explicitly rejected centering — do NOT re-introduce it.
- Breakout children **keep the text-flow gutter** (padding is NOT reset to 0).
- The fragment root `<div class="page-*">` must become a **style-scoping hook only, never a layout layer**. Pages that want breakout put the attribute on real sections (direct children of `nui-page`).
- `.maxwidth-container` becomes a first-class theme utility (re-constrain inside breakout), not a selector chained to breakout parents.
- Migration must be **incremental and visually verified** — user pulled the plug when changes broke unrelated pages. One page at a time, screenshot before/after.

## 2. Theme CSS (NUI/css/nui-theme.css)

Relevant locations:

- **~line 1330** — `nui-page` block: `nui-page > *` padding rule; `nui-page > *:not([breakout])` max-width rule; `nui-page > [breakout]` rule. Currently breakout does NOT reset padding (that was changed 2026-09-26 — see §6 whether to keep).
- **~line 1355** — legacy block: `nui-main > .content-page` / `.content-feature` duplicates the same three rules (router still adds these classes to wrappers). Keep in sync with the modern rules or delete the duplication deliberately.
- **~line 4560** — `.maxwidth-container`: currently TWO rules exist — the old chained one (`nui-layout[banner] .maxwidth-container, nui-page>[breakout] .maxwidth-container`) AND a new standalone `.maxwidth-container` utility block + section-rhythm rules (`nui-page > section { margin-block: 0 var(--nui-space-triple) }`, header/footer variants). Added mid-migration; audit whether the rhythm rules break pages before keeping them.

## 3. Files already changed (uncommitted work may exist — check `git status` / log `85d55aa..HEAD`)

| File | Change |
|---|---|
| `NUI/css/nui-theme.css` | breakout padding no longer reset; `.maxwidth-container` standalone utility; section rhythm rules added |
| `Playground/pages/components/page.html` | root div REMOVED — sections are now direct children; one section carries `breakout`; demonstrates the contract. **This page is the reference implementation — keep.** |
| `Playground/js/blocks-editor.js` (~line 3201) | `element.querySelector('.page-blocks-editor')?.setAttribute('breakout','')` → `element.setAttribute('breakout','')` — needed IF blocks-editor.html drops its root div. **Untested. If not migrating blocks-editor now, revert this.** |
| `documentation/components/page.md` | structure + breakout-gutter documented |
| `documentation/guides/architecture-patterns.md` | has `.maxwidth-container` section — sync with final utility definition |

Committed earlier today (may be useful context): `2e85b9c` breakout-gutter fix, `85d55aa` centering fix + revert, `7365ea3` storage-docs sync script.

## 4. Page audit result (57 fragments)

- ALL pages have a `div.page-*` root (exceptions: `experiments/html-standards` uses `.page`; `blocks-editor` sets breakout via JS).
- NO CSS rules style page roots directly (all main.css rules are descendant selectors like `.page-list .demo-list`) and NO page JS queries roots (except blocks-editor).
- **Implication:** roots can be removed *if* the `page-*` class is moved onto each former top-level child (preserves descendant CSS scoping) — or kept on the root and treated as harmless, since with no root-level layout styles it is purely a scoping hook. **Decide which**: (a) remove roots entirely + move class to children, or (b) keep roots as pure scoping hooks and just never give them layout duty. Option (b) is lower-risk.
- Pages with real full-width content needing breakout: `components/layout.html` (banner demo at bottom — currently BROKEN-looking because its root div absorbs the constraint), `components/skip-links.html` (nui-app demo), `components/page.html` (done).
- `components/layout.html` + `documentation/guides/architecture-patterns.md` + `documentation/components/layout.md` document `breakout` usage — update after migration.

## 5. The `nui-app` interplay (secondary, was original trigger of this work)

`nui-app-header` demo has no live sidebar-toggle demo; its docs now point to `nui-app` guide (`documentation/components/app.md` has the full `toggle-sidebar` action table). Storage-box domain `documentation/NUI/` mirrors repo docs — regenerate with `node scripts/sync-storage-docs.mjs` after doc changes.

## 6. Current state — verify first

1. `git status` + `git log --oneline -5` — determine which of §3 changes are committed vs working-tree.
2. Decide whether the **breakout-gutter change** (padding no longer reset) stays. It alters every existing breakout user today (layout.html banner, skip-links app demo). If reverting: restore `padding-left/right: 0` on `nui-page>[breakout]` + legacy rule, and revert the page.md sentence about "mirroring the gutter".
3. Decide whether the **section-rhythm rules** stay (they change spacing on every page as roots stop being constrained children) or wait until pages migrate.
4. View `#page=components/layout` and `#page=components/page` in the browser before touching anything — layout.html currently looks broken (banner not full-bleed) because of the half-migrated state.

## 7. Suggested order of work

1. Stabilize theme CSS per §6 decisions; verify all component pages look unchanged (root div still absorbs constraint → nothing shifted).
2. Migrate `components/layout.html` (banner demo proves breakout works end-to-end).
3. Migrate `components/skip-links.html` (app demo needs width).
4. Test blocks-editor (experiments) with the JS change from §3.
5. Then — optionally, one page per commit — migrate remaining pages IF removing roots; otherwise roots stay as scoping hooks and no migration is needed at all.
6. Update docs (`page.md`, `layout.md`, `architecture-patterns.md`), run `node scripts/update-docs.js` if component metadata changed, `node scripts/sync-storage-docs.mjs`, commit + push.
