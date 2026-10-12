# nui-notepad — Addon Dev Plan (handover from localweb2 session, 2026-10-12)

## Goal

`<nui-notepad>` — a NUI addon element rendering the workshop **notepad** Today
view (deliberate state: pins/ideas, tasks with step checklists, dates,
contacts). Primary consumers: localweb2 dashboard (read-only), LLM Gateway
chat app (later, editable). Built as an addon experiment like
`nui-blocks-editor`; may migrate to a future standalone addons project — the
host-owns-storage contract keeps that migration free.

Precedent to mirror: `documentation/addons/blocks-editor.md`,
`NUI/lib/modules/nui-blocks-editor.js`, `Playground/pages/experiments/blocks-editor.html`.

## Data source & contract

Backend: mcp_server REST (port 3100), spec at
`D:\DEV\mcp_server\documentation\tools\notepad.md`. Key routes:

- `GET /notepad/snapshot?context=` — Today view, computed on read (PRIMARY poll target)
- `GET /notepad/items/:id` — full record incl. `body` + `ref` (click-through only)
- `GET /notepad/items?type=&status=&owner=&context=&limit=` — filtered lists (phase 2 swimlanes)
- `GET /notepad/contexts` — registry (also in snapshot footer)
- Mutations (`POST/PATCH/DELETE`, promote, complete) — RESERVED for the
  `editable` phase (chat app), not v1

CORS is already open on these routes for browser components.

**Two entry points** (adaptation of blocks-editor's "never fetches on its own"):

1. `src="/api/notepad"` attribute → self-polling mode. The 90% case: dashboard
   widgets pointing at a REST base. Polls `{src}/snapshot` every `poll`
   seconds (default 30), fetches `{src}/items/:id` only on click-through.
2. `load(snapshot)` method → host-driven mode for non-REST hosts. `refresh()`
   re-fetches in src mode.

## Element spec

### Attributes (all optional)

| attr | values | effect |
|------|--------|--------|
| `src` | URL base | enables self-polling mode |
| `poll` | seconds, default 30 | snapshot poll interval |
| `owner` | `both` (default) / `david` / `machine` | board filter; `both` = David primary, machine collapsed secondary |
| `editable` | boolean | RESERVED (chat-app phase): complete step/task, promote pin, add item |

### API

- `load(snapshot)` — render a host-supplied snapshot
- `refresh()` — force re-poll (src mode)
- `activate()` / `deactivate()` — start/stop polling + rendering. Called
  duck-typed by host view switchers (localweb2's renderer loop calls these on
  whatever object is registered per view).
- **Self-managing visibility**: observe own `hidden` attribute (and/or
  IntersectionObserver) → polling and DOM mutation halt while hidden. This
  satisfies localweb2's zero-reflow view contract with no app-specific wiring.
  `activate()`/`deactivate()` are the explicit override.

### Rendering

Sections top-to-bottom, mirroring the snapshot's own shape:

1. **Overdue tasks** — red badge tone
2. **Due soon** (within `dueSoonDays`) — amber
3. **Open tasks** — card per task: title, context chip, due, step progress
   (`2/3`), next step line
4. **Upcoming dates** — `when` + `daysUntil`; yearly recurrences arrive
   pre-mapped by the backend
5. **Pins** (recentIdeas, max 5) — post-it cards; `stalePins` flagged visually
6. **Context registry footer** — dim, small

Click-through on any card → `GET {src}/items/:id` → expand in place showing
`notes`, `body`, `ref` links (pattern-match: `http(s):` → anchor,
`storage:`/paths → code style, `session:` → dim label).

**Zero-reflow contract** (localweb2 rule, portable): `innerHTML` only at
skeleton init. Element pools per section keyed by item id — pool rebuild only
when the id set changes; otherwise `Text.nodeValue` mutations with
`if (node.nodeValue !== str)` guards. No CSS overrides of NUI internals;
spacing/colors/typography via NUI custom properties only. Component ships with
no horizontal padding (integrator's gutter positions it).

## Fixtures (already captured, this repo)

- `Playground/pages/experiments/notepad-snapshot.json` — live capture
  2026-10-12 (DEMO seed data: 1 overdue, 2 due-soon, 5 open tasks, 1 date,
  5 pins, 0 stale)
- `Playground/pages/experiments/notepad-item-13.json` — task detail with
  3 steps (2 done), `body: null`
- `Playground/pages/experiments/notepad-item-23.json` — pin detail,
  hand-enriched with `body` + `ref` sample (live DEMO data has no bodies;
  fixture covers the click-through-expanded state)

Experiment harness `Playground/pages/experiments/notepad.html` loads the
fixture directly (fetch relative path) — no live mcp_server needed. A toggle
to switch between fixture and live `http://127.0.0.1:3100/notepad` src is a
nice-to-have.

## File checklist

- [ ] `NUI/lib/modules/nui-notepad.js`
- [ ] `NUI/css/modules/nui-notepad.css`
- [ ] `documentation/addons/notepad.md` (shape of blocks-editor.md: setup,
      design position, attributes, API, spacing contract)
- [ ] `Playground/pages/experiments/notepad.html` + registration wherever
      experiments are indexed (check `Playground/js/page-init.js` / `main.js`)
- [ ] `LLM-CHEATSHEET.md` entry if addons are listed there

## Phase B — localweb2 integration (separate session, after addon lands)

- Commit addon in nui_wc2 first; gitlink bump = its own commit in localweb2
- GET-only proxy `/api/notepad/*` in `src/server.js` + `mcpNotepadUrl` in
  `src/config.js` (browser runs on LAN clients; `127.0.0.1:3100` would be
  wrong there — same pattern as `/api/usage-limits`)
- `index.html`: `view-notepad` section + addon CSS link + JS import;
  `app.js`: nav entry + views map. `<nui-notepad src="/api/notepad">` IS the
  renderer (activate/deactivate duck-typing), no wrapper class
- Docs: localweb2 `documentation/API.md`, `SYSTEM.md`, `Agents.md`

## Phase C — chat app (later, separate session)

- Same element, `editable` + `src="http://127.0.0.1:3100/notepad"` (chat app
  runs on Badkid, direct CORS works, no proxy)
- Mutations per the REST spec: complete step/task, promote, add, edit

## Open questions for the dev session

1. Post-it visual language: does NUI already have a card preset that fits
   pins, or does the addon CSS define `.np-pin`? Check nui-card variants first.
2. Stale-pin display: snapshot has `stalePins: []` in DEMO data — design the
   flag anyway (amber border + "stale" chip), verify against spec default 60d.
3. Whether `owner=machine` section header shows item count when collapsed.
