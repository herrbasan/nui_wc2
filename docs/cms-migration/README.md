# CMS Migration — working documents

> **Status:** Phase 2 in progress (2026-09-08). The authoring format was decided 2026-09-10
> (**MD-Blocks**) and lives in its own repo; the migration plan proceeds against it.

Two-phase effort:

1. **Understand & plan** — how the n000b CMS works and how it migrates onto nui_wc2.
2. **Authoring format** — define the markdown format that replaces the CMS's JSON block tree
   (sections → blocks | columns) while preserving the editor's composition power.

## Layout

- [cms-migration-plan.md](cms-migration-plan.md) — migration vision, invariants, plan.
  Working copy; canonical at `X:\documentation\CMS Migration\cms-migration-plan.md`.
- [cms-spec.md](cms-spec.md) — self-contained spec of the existing n000b CMS (distilled from the live tour).
- [tour-notes.md](tour-notes.md) — walkthrough notes; the current editor's UX is the format's spec.
- [screenshots/](screenshots/) — admin tour screenshots referenced by `cms-spec.md`.
- [fixtures/](fixtures/) — real CMS content export (`westenergie-work.json`).

## MD-Blocks — moved to its own repo

The format was adopted 2026-09-10 as **MD-Blocks** and spun out the same day:
**https://github.com/herrbasan/md-blocks** — spec, decision record, demo documents, and the full
design history (proposals A–D, ranking, authoring test-runs) in its `_Archive/`. It is purely the
format — no CMS coupling. The consumer-side mapping from MD-Blocks to the legacy CMS block tree
lives here: [md-blocks-mapping.md](md-blocks-mapping.md). The renderer (`nui-blocks`) and the
editor addon are nui-side consumers, developed in this repo.
