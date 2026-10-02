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
| `Playground/js/blocks-editor.js` (~line 3201) | **Corrected 2026-10-02 — see §8.** Setting `breakout` on the page wrapper never worked: the theme constrains `nui-page > *`, never `nui-page`. It now goes on `.editor-workspace`, the real direct child. |
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

## 8. Resolution 2026-10-02 — the blocks editor was the last page holding `breakout` on the wrong element

**Symptom:** with the children-constraint in place, the editor and its preview sat in
a 56rem (896px) column inside a container measuring 1229px — 269px of dead space to
the right of the preview.

**The bug was a difference of kind, not of target.** `setPreviewMode` set `breakout`
on `element`, the `nui-page` wrapper, and the CSS read:

```css
nui-main > .content-page > .page-blocks-editor[breakout],
.page-blocks-editor[breakout] { … }
```

The first selector states the intent — `.page-blocks-editor` is expected to be a
CHILD of `.content-page`. The router puts `page-<slug>` on the `.content-page`
element itself, so that selector never matched anything, and the second selector
matched the wrapper, which the theme **never constrains**: the rule is
`nui-page > *:not([breakout])`. An attribute on the wrapper reads as full-bleed and
changes nothing. The constrained element was `.editor-workspace`, the real child.

That is what §3's "untested" note was worth. The change recorded there moved the
attribute from an element that did not exist — `element.querySelector('.page-blocks-editor')`
found nothing and `?.` swallowed it — to one that is unconstrained. Both were wrong,
in opposite directions, and neither was observable without measuring.

**Fix:** the attribute goes on `workspace`, the direct child, because that is the
only element the theme's rule can reach. The two CSS selectors that keyed off
`[breakout]` on the wrapper now key off the page class alone; the wrapper-keyed
`:has(.editor-workspace[…])` rules are unchanged.

**Measured:** workspace 960px before, 1229px after, zero horizontal overflow, and
`scrollHeight === clientHeight`, so the panes still own their own scrolling. Split
still 58/58; a real divider drag moved canvas 676→451 and preview 441→666; Hide
Preview and back to Side by Side both round-trip. The 56rem cap can only bind above
an 896px container, so narrow viewports are unaffected by construction.

`components/layout.html` was re-checked and is correct: its `nui-layout[breakout]`
banner is a true direct child at 1221px while its siblings sit at 960px. The
"banner not full-bleed" note in §6.4 is stale — the page root divs have since been
removed, so §7.2 is done and §7.4 is this section.

