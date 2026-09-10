# MD-Blocks ↔ legacy CMS tree mapping

> **Adapter documentation for the migration.** MD-Blocks is its own project —
> **https://github.com/herrbasan/md-blocks** (spec: `md-blocks-spec.md`). This mapping
> documents how an MD-Blocks document maps onto the n000b CMS `{ sections }` block tree — it belongs
> with the consumer, not with the format spec.
> Source: former §6 of the spec (proposal D revision), moved here 2026-09-10.
> Directive prefix updated `bm:` → `mb:` 2026-09-10 (repo rename decision).

| MD-Blocks | Legacy `{ sections }` |
|---|---|
| frontmatter | page fields + Header `vars` block (`name`, `customer`, `year`, tags) |
| `---` (+ optional `mb:section`) | `section { label, class←preset }` |
| unannotated Markdown (maximal run) | `block { type: richtext }` |
| `mb:block` (text) | `block { type: richtext, label, class←preset }` |
| `mb:block` (media) | `block { type: media \| files, data: [refs], caption }` |
| `mb:columns` + `mb:col` | `columns { columns: [[…],[…]], label, class }` |
| `mb:var` | `block { type: input \| vars }` |

Legacy `group` = `block | columns` — no wrapper directive needed. Legacy arbitrary `class` strings need
a migration table to presets; not automatic.
