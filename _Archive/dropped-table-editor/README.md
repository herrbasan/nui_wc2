# Archived: `dropped-table-editor`

**This is dead code, kept deliberately. Do not build on it, and do not restore it
to the Playground.**

The real component is `NUI/lib/modules/nui-table-editor.js`. Its design history,
and every decision behind it, is in `docs/table-editor-decisions.md` — that
document is the record; this directory is the artifact.

## What this was

The first attempt at a table editor, generated in one pass on 2026-09-21. The
bones were sound — inline detection, the overlay living outside the
`contenteditable`, the export panel. The interaction feel failed review.

It was parked on 2026-09-22 with an explicit "unfinished and abandoned" notice,
then renamed on 2026-09-28 to `dropped-table-editor` so the fresh implementation
could claim the `nui-table-editor` namespace.

## Why the rename mattered more than the archive

NUI's dev auto-loader resolves `NUI/lib/modules/{tag}.js` for any addon element
found in the DOM. Leaving the old code at that path would have meant a future
`<nui-table-editor>` silently loaded **this** implementation instead of the real
one — with no error, just wrong behaviour. The rename was a correctness fix, not
tidiness.

It was then sat in the Playground at `#page=experiments/dropped-table-editor` for
two days "for contrast", reachable from the nav.

## Why it is being archived now

The contrast page outlived its usefulness. It cost a nav entry, a
`registerPage` block, three live files, and a permanent hazard: a second
table-editor implementation sitting in the same repo, one nav click away, in a
Playground whose whole purpose is to be copied from.

**The reasoning is what was worth keeping, and it is in the decisions doc. The
code never was.** A failed implementation is not a reference — reading it to
understand the real one is strictly worse than reading the log, because the log
says *why* each decision went the other way and the code cannot.

## What actually went wrong

Worth keeping, because it is the reason the fresh one was built differently:

- **Permanent chrome** violating the at-rest law — an editor that framed itself
  even when untouched.
- **Drag reorder crashing on index math** — the boundary/item confusion the
  current `rowBoundaryAt` / `endDrag` arithmetic exists to prevent.
- **Corrupted CSS** and a **stuck drag ghost**.

The lesson recorded at the time: **UX feel cannot be specified in advance or
generated wholesale.** It converges only through a see–touch–adjust loop. Models
compress the typing; the user judges the feel, and something mechanical verifies
the mechanics.

## Files

| File | Role |
|---|---|
| `dropped-table-editor.js` | The attempt. Custom element `dropped-table-editor`, ~37 KB |
| `dropped-table-editor.css` | Its stylesheet, class prefix `dropped-table-editor-` |
| `dropped-table-editor.html` | The contrast page as it last stood in `Playground/pages/experiments/` |

The page is inert as archived: its `<script type="module">` pointed at
`Playground/js/dropped-table-editor.js`, which no longer exists at that path.
Nothing loads it.