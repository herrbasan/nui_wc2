# nui-notepad

Spatial desk, project context swimlanes, focus workbench, and virtualized all-items list for `workshop.notepad` — commitments, step punch-lists, upcoming dates, and context-tagged pins.

## Setup

This is an addon module. Load both the JS and CSS before use:

```html
<link rel="stylesheet" href="NUI/css/modules/nui-notepad.css">
<script type="module" src="NUI/lib/modules/nui-notepad.js"></script>
```

`<nui-notepad>` uses NUI Core components internally (`<nui-virtual-scroll>`, `<nui-select>`, `<nui-input>`, `<nui-icon>`) and requires no other addon imports.

## Design Philosophy

The notepad is **deliberate state** — what is outstanding, what is due, what should not be lost — as opposed to semantic memory. `<nui-notepad>` gives that state a quiet, tactile workspace modeled on two established NUI patterns:

- **Tonal surface hierarchy from `nui-blocks-editor`:** Lanes sit on `--np-lane-bg` with `--np-lane-header-bg` headers; cards sit on `--np-card-bg` (pins on `--np-pin-bg`) with a subtle lane-luminance border (`--np-card-border`) and elevation (`--np-card-shadow`). Urgency never floods a card background — it is signaled by a crisp 3px square left edge bar (`data-tone="overdue"` in `--np-urgent`, `data-tone="soon"` in `--np-soon`, with `border-top-left-radius: 0; border-bottom-left-radius: 0`).
- **Context-driven UX from `nui-table-editor`:** Zero chrome at rest and **0px layout shift on select**. Selecting a card draws an inward hairline ring (`outline-offset: -1px`) and mounts a floating `.np-ContextZone` pill toolbar above the card (`bottom: 100%`, auto-flipping to `top: 100%` via `data-flip="below"` when within 44px of a `<nui-virtual-scroll>` top edge). The card's inner DOM (`<h3 class="np-CardTitle">`, `<p class="np-CardNotes">`, `.np-StepRow` rows) uses the exact same elements and box metrics whether selected or unselected — toggling `contenteditable="plaintext-only"` in place. Long notes clamp to three lines at rest and expand to full height once the card is selected.
- **Semantic color system:** Every card carries a type badge (`_typeIconName`: task → `task_alt`, idea → `keep`, date → `calendar`, contact → `id_card`) tinted by its `--item-accent` — `--np-type-task`, `--np-type-idea`, `--np-type-date`, `--np-type-contact`, with `--np-done-accent` for completed steps. Contexts map to a hue (`_contextHue`: a fixed table for known contexts, a deterministic hash into `[206, 36, 152, 268, 342, 186, 232, 115]` for anything else) published as `--ctx-hue`, from which `.np-Swimlane` and `.np-Card` derive `--ctx-accent`. Lanes use it for the header top rule, the lane-name dot, and the count pill; cards use it for the `#context` badge.
- **Host-owns-storage contract:** `<nui-notepad>` never fetches or persists on its own. The host supplies data via `load(snapshot, fullItems)` (and optional lazy detail via `setItemResolver(fn)`), and the component emits `nui-notepad-mutate` events when the user modifies items. Every in-place edit — title, notes, body, step text, due date, context, step toggle, completion — emits the changed fields so the host can forward them to `PATCH /notepad/items/:id`; `reconcileItem(tempId, serverItem)` swaps an optimistic `add` for the persisted record.

## View Paradigms (`mode`)

The top bar's left segmented control (or the `mode` attribute) switches between four live paradigms over the same item store:

| Mode | Label | Layout & Purpose |
|------|-------|------------------|
| `swimlanes` *(default)* | **Swimlanes** | Multi-column responsive grid (`minmax(21rem, 1fr)`) grouping tasks and pins together by `#context` (`arena`, `blog`, `teaching`, `research`, etc.), each with an item count badge and a bottom `add_circle` composer strip. |
| `bento` | **Desk** | Two-column spatial desk (`1.25fr 1fr`) pairing a multi-column **Tasks** index grid on the left with a **Pins** post-it wall on the right. |
| `focus` | **Focus** | Two-column workbench pairing a single **"Right Now" Focus** spotlight task + clickable queue pills (`.np-StageQueue`) on the left with the **Pins** wall on the right. |
| `list` | **List** | Full-width panel with an `nui-list`-style filter/sort/search header (`.np-ListHeader`) and a variable-height `<nui-virtual-scroll>` body (`.np-ListViewport`, `threshold="12"`, `margin="220"`). |

### All-Items List Mode (`mode="list"`)

List mode combines `<nui-list>`'s header ergonomics with `<nui-virtual-scroll>`'s variable-height detached-element recycling:

- **Sort (`<nui-select size="small">` + `.np-SortDirBtn`):**
  - `urgency` *(default)* — Overdue tasks → due-soon tasks → open tasks → upcoming dates → pins; completed items sink to the bottom.
  - `title` — Alphabetical (`A–Z`).
  - `context` — Grouped alphabetically by `#context`, then title.
  - `recent` — Newest first by `createdAt` timestamp (falling back to numeric `id`).
  - Direction button rotates the arrow icon (`up` / `down`) to invert the active sort.
- **Filters (`<nui-select size="small">`):**
  - **Type:** `All Types` (`__all__`), `Tasks` (`task`), `Pins` (`idea`), `Dates` (`date`), `Contacts` (`contact`).
  - **Context:** `All Contexts` (`__all__`) or any `#context` present in `snapshot.contexts` or loaded items.
  - **Status:** `All Status` (`__all__`), `Overdue` (`overdue`), `Due Soon (≤7d)` (`soon`), `Open` (`open`), `Completed` (`done`).
- **Live Search (`<nui-input type="search" clearable>`):** Filters across title, notes, body, `#context`, type, step checklist text, and `ref` strings, updating the `N items` / `M of N` count badge immediately.
- **Scroll Preservation:** In-place edits re-render cards via `scroller.setItems(cards, { preserveScroll: true })` and call `scroller.wake()` on `contenteditable` input so variable-height changes cascade smoothly without resetting scroll position.

## Declarative Usage

```html
<nui-notepad id="my-notepad" mode="swimlanes" owner="david"></nui-notepad>
```

### Attributes

| Attribute | Values | Default | Description |
|-----------|--------|---------|-------------|
| `mode` | `'swimlanes'` \| `'bento'` \| `'focus'` \| `'list'` | `'swimlanes'` | Initial view mode. |
| `owner` | `'david'` \| `'both'` \| `'machine'` | `'david'` | Initial owner filter (`'both'` corresponds to the **All** segment in the top bar). |

## Programmatic API

```javascript
const notepad = document.querySelector('#my-notepad');

// Optional: lazy item detail resolver invoked on first card selection
notepad.setItemResolver(async (id) => {
	const res = await fetch(`/api/notepad/items/${id}`);
	return res.ok ? res.json() : null;
});

// Load a workshop.notepad snapshot + optional array of full item records
notepad.load(snapshot, fullItems);
```

### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `load(snapshot, fullItems?)` | `(snapshot: object, fullItems?: object[]) => void` | Deep-clones and ingests a `workshop.notepad` snapshot (`overdue`, `dueSoon`, `openTasks`, `upcoming`, `recentIdeas`, `stalePins`, `contexts`, `today`) merged with any full item records in `fullItems`. When a snapshot task only carries summary counts (`stepsTotal`, `stepsDone`, `nextStep`) without a `steps` array, placeholder step rows `{ done, text }` are synthesized automatically. Every id listed in `snapshot.stalePins` is flagged `item._stale = true` after the merge, so the flag survives a `fullItems` record that omitted it. |
| `setItemResolver(fn)` | `((id: number \| string) => Promise<object \| null>) => void` | Registers an async callback invoked once per item (`_detailLoaded`) when a card is clicked, merging full fields (`body`, `notes`, `steps`, `ref`, `attachments`) before opening selection. |
| `reconcileItem(tempId, serverItem)` | `(tempId: number \| string, serverItem: object) => object \| null` | Replaces an optimistic item created by an `add` mutation with the server record once the host has persisted it. Looks the temp id up in the internal item map, ingests `serverItem` over it (including the new `id`), transfers selection/spotlight from the temp id to `serverItem.id`, and re-renders. If the temp id is no longer present and `serverItem.id` is defined, the item is ingested and rendered without warning — the host can call it blindly after every `POST /notepad/items`. |
| `activate()` | `() => void` | No-op lifecycle hook so hosts can activate all views uniformly. The component owns no paint loop; telemetry stays in its item map and rendering only happens on `load()` / mutation. |
| `deactivate()` | `() => void` | No-op counterpart to `activate()`. Safe to call at any time. |

### Data Shapes

**Snapshot (`snapshot` passed to `load()`):**

```javascript
{
	today: '2026-10-15',
	dueSoonDays: 7,
	overdue: [/* task summaries */],
	dueSoon: [/* task summaries */],
	openTasks: [/* task summaries */],
	upcoming: [/* { id, type: 'date', title, owner, when: 'YYYY-MM-DD', daysUntil, recur } */],
	recentIdeas: [/* { id, type: 'idea', title, owner, context, createdAt } */],
	stalePins: [/* { id, title, owner, createdAt } — open ideas older than ~60 days */],
	contexts: ['arena', 'blog', 'infrastructure', 'research', 'teaching']
}
```

**Full Item Record (`fullItems` entry or `setItemResolver` return value):**

```javascript
{
	id: 13,
	type: 'task',                // 'task' | 'idea' | 'date' | 'contact'
	title: 'Digest episode 9 notes',
	status: 'open',              // 'open' | 'done' | 'cancelled' | 'promoted'
	owner: 'david',              // 'david' | 'machine'
	context: 'arena',
	due: '2026-10-11',           // tasks: 'YYYY-MM-DD' | null
	notes: 'Short card note',
	body: 'Optional extended body text',   // null until authored
	steps: [
		{ done: true,  text: 'pull transcript' },
		{ done: false, text: 'cross-check scoreboard' }
	],
	ref: ['docs/arena/ep9.md', 'https://example.com/spec'],
	attachments: [
		{ ref: 'notepad:ab12cd.png', name: 'shot.png', type: 'image/png', size: 51234 }
	],
	when: null,                  // dates: next occurrence 'YYYY-MM-DD'
	recur: null,                 // dates: 'none' | 'yearly'
	daysUntil: null,             // dates: whole days from snapshot.today
	promotedTo: null,            // ideas: id of the task it became
	phone: null,                 // contacts only
	email: null,                 // contacts only
	address: null,               // contacts only
	_stale: false                // set by load() from snapshot.stalePins
}
```

All backend fields are preserved verbatim on ingest — the component never drops `attachments`, `when`, `recur`, `daysUntil`, `promotedTo`, `phone`, `email`, or `address` while editing other fields.

**Contact items:** `type: 'contact'` records carry `phone` / `email` / `address` and no `context`. They are ingested like any other item and surface in **List** mode (the type filter has a **Contacts** option); the task/pin lanes stay task/pin-only. Since a contact has no `notes`, the card's notes line shows `[phone, email, address].filter(Boolean).join(' · ')` read-only.

## Events

`<nui-notepad>` updates its in-memory item map immediately for responsive UI and dispatches `nui-notepad-mutate` (bubbles) for host persistence:

```javascript
notepad.addEventListener('nui-notepad-mutate', (e) => {
	const { action, id, ...payload } = e.detail;
	console.log('Notepad mutation:', action, id, payload);
});
```

| `detail.action` | `e.detail` Shape | Trigger |
|-----------------|------------------|---------|
| `'update'` | `{ action: 'update', id, patch }` | Any in-place field edit committed on blur. `patch` carries only the changed keys: `{ title }`, `{ notes }`, `{ body }`, `{ steps }`, `{ due }`, or `{ context }`. `steps` is always the cleaned payload `[{ done, text }]` (empty entries dropped, text trimmed). Wire it to `PATCH /notepad/items/:id` with the patch as the body. |
| `'step-toggle'` | `{ action: 'step-toggle', id, stepIndex, done, steps, status }` | User clicked a step row (at rest) or its `·`/`✓` toggle button. Recomputes `stepsDone`, `stepsTotal`, and `nextStep` (leaving task `status` unchanged until **Done** is clicked). `steps` is the cleaned payload; `status` is the item's status. |
| `'complete'` | `{ action: 'complete', id, status }` | User clicked **Done** or **Reopen** in a selected task's floating toolbar. `status` is the resulting value (`'done'` or `'open'`). |
| `'promote'` | `{ action: 'promote', id }` | User clicked **To Task** in a selected pin's floating toolbar, converting the `idea` into a `task` in place. |
| `'remove'` | `{ action: 'remove', id }` | User clicked the danger **Delete** button in the floating toolbar (marks `status = 'cancelled'`). |
| `'add'` | `{ action: 'add', id, type, title, owner, context, status, createdAt, ... }` | User submitted the inline `+` composer at the foot of a swimlane, desk column, or list view. The id is a local timestamp placeholder — persist the item, then call `reconcileItem(tempId, serverItem)` with the server record. |

In-place edits update `this._snapshot` alongside the item map, so a host re-reading the snapshot sees the edited values without a refetch.

## Interaction & In-Place Editing

| Action | Behavior |
|--------|----------|
| Click a step row (card unselected) | Toggles step completion immediately (`step-toggle`) without selecting the card. |
| Click a card | Resolves lazy detail if needed, selects the card (`data-selected="true"`), and opens the floating `.np-ContextZone` toolbar above it. |
| Edit card title / note (when selected) | Title (`<h3 data-edit-title>`) and notes (`<p data-edit-notes>`) become `contenteditable="plaintext-only"`. `Enter` blurs; `Escape` blurs then exits selection. The edit is committed on **blur** (`update` with `{ title }` / `{ notes }`); clicking outside flushes the active editor first, so a detach cannot swallow it. |
| Edit steps (when selected) | Step text (`.np-StepText[data-edit-step]`) becomes `contenteditable="plaintext-only"`. `Enter` inserts a new step below and focuses it; `Backspace` on an empty step removes it. Both emit `update` with the cleaned `steps` payload; text edits emit on blur. |
| **Body** | Long-form text renders in `.np-CardBody` (label `BODY`, top border, max-height with scroll). When `body` is set it shows at rest (plain text) and is editable while selected (`[data-edit-body]`); blur emits `update` with `{ body: null }` when emptied. |
| **+ Body** (toolbar when `body` is null/undefined) | Initializes `body = ''`, re-renders, and focuses the body editor. |
| **To Task** (toolbar on `idea`) | Promotes the pin to a task with an empty step checklist and keeps it selected. |
| **Done / Reopen** (toolbar on `task`) | Toggles `status` between `'done'` and `'open'`, emits `complete` with the resulting `status`, and closes selection. |
| **+ Step** (toolbar on `task`) | Appends a new step to the task and selects its text for immediate typing. |
| **Due** (toolbar on `task`) | Opens the native browser date picker (`showPicker()`) via a hidden `<input type="date">` (`[data-due-input]`) anchored inside the button; `change` emits `update` with `{ due }`. |
| **+ Note** (toolbar when `notes` is empty) | Reveals the `.np-CardNotes` paragraph and focuses it. |
| **`#context`** (toolbar, not on contacts) | Cycles the item's `context` through the registered `snapshot.contexts` list and emits `update` with `{ context }`. |
| **Delete** (toolbar) | Cancels/removes the item and emits `action: 'remove'`. |
| Ref chips (selected card) | `.np-RefsRow` renders one chip per `ref` string. Values matching `/^(https?:\/\/|\/)/` become `<a class="np-RefChip np-RefChip--link">` (new tab, `rel="noopener"`); anything else stays a plain `<span class="np-RefChip">`. Clicking a link stops propagation so it opens without toggling selection. |
| Attachment chips (selected card) | Each `attachments` entry renders as a linked chip `📎 name` inside `.np-RefsRow`. href = `att.url`, or `/api/notepad/files/<hash.ext>` when `att.ref` starts with `notepad:` (the mcp_server `/notepad/files/:fileRef` route). |
| Stale pins | Items flagged `_stale` while `status === 'open'` render an amber `.np-StaleBadge` (`title="Open for >60 days"`) next to the title. The badge is informational — nothing is auto-archived. |
| Click `+` (`add_circle`) at lane/list foot | Opens `.np-InlineComposer` with a `Pin` / `Task` segmented switch; `Enter` submits, `Escape` or outside click dismisses. |
| Click outside selected card / composer | Commits any active in-place edit, clears card selection, and closes any open inline composer. |

### Persisting edits (host contract)

Every in-place edit dispatches `nui-notepad-mutate` with `action: 'update'` and a minimal `patch`, so a host can forward it straight through:

```javascript
notepad.addEventListener('nui-notepad-mutate', async (e) => {
	const { action, id, patch, ...rest } = e.detail;
	if (action === 'update') {
		await fetch(`/api/notepad/items/${id}`, {
			method: 'PATCH',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(patch)
		});
		return;
	}
	if (action === 'add') {
		const res = await fetch('/api/notepad/items', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(rest)
		});
		const { item } = await res.json();
		notepad.reconcileItem(id, item);
	}
});
```

`reconcileItem(tempId, serverItem)` swaps the optimistic record for the persisted one (id, fields, selection, spotlight) and re-renders.
