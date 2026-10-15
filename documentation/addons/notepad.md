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
- **Context-driven UX from `nui-table-editor`:** Zero chrome at rest and **0px layout shift on select**. Selecting a card draws an inward hairline ring (`outline-offset: -1px`) and mounts a floating `.np-ContextZone` pill toolbar above the card (`bottom: 100%`, auto-flipping to `top: 100%` via `data-flip="below"` when within 44px of a `<nui-virtual-scroll>` top edge). The card's inner DOM (`<h3 class="np-CardTitle">`, `<p class="np-CardNotes">`, `.np-StepRow` rows) uses the exact same elements and box metrics whether selected or unselected — toggling `contenteditable="plaintext-only"` in place.
- **Host-owns-storage contract:** `<nui-notepad>` never fetches or persists on its own. The host supplies data via `load(snapshot, fullItems)` (and optional lazy detail via `setItemResolver(fn)`), and the component emits `nui-notepad-mutate` events when the user modifies items.

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
  - **Type:** `All Types` (`__all__`), `Tasks` (`task`), `Pins` (`idea`), `Dates` (`date`).
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
| `load(snapshot, fullItems?)` | `(snapshot: object, fullItems?: object[]) => void` | Deep-clones and ingests a `workshop.notepad` snapshot (`overdue`, `dueSoon`, `openTasks`, `upcoming`, `recentIdeas`, `stalePins`, `contexts`, `today`) merged with any full item records in `fullItems`. When a snapshot task only carries summary counts (`stepsTotal`, `stepsDone`, `nextStep`) without a `steps` array, placeholder step rows `{ done, text }` are synthesized automatically. |
| `setItemResolver(fn)` | `((id: number \| string) => Promise<object \| null>) => void` | Registers an async callback invoked once per item (`_detailLoaded`) when a card is clicked, merging full fields (`body`, `notes`, `steps`, `ref`) before opening selection. |

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
	stalePins: [/* stale idea summaries */],
	contexts: ['arena', 'blog', 'infrastructure', 'research', 'teaching']
}
```

**Full Item Record (`fullItems` entry or `setItemResolver` return value):**

```javascript
{
	id: 13,
	type: 'task',                // 'task' | 'idea' | 'date'
	title: 'Digest episode 9 notes',
	status: 'open',              // 'open' | 'done' | 'cancelled' | 'promoted'
	owner: 'david',              // 'david' | 'machine'
	context: 'arena',
	due: '2026-10-11',           // tasks: 'YYYY-MM-DD' | null
	notes: 'Short card note',
	body: 'Optional extended body text',
	steps: [
		{ done: true,  text: 'pull transcript' },
		{ done: false, text: 'cross-check scoreboard' }
	],
	ref: ['docs/arena/ep9.md']
}
```

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
| `'step-toggle'` | `{ action: 'step-toggle', id, stepIndex, done }` | User clicked a step row (at rest) or its `·`/`✓` toggle button. Recomputes `stepsDone`, `stepsTotal`, `nextStep`, and sets `status` to `'done'` when all steps are checked. |
| `'complete'` | `{ action: 'complete', id }` | User clicked **Done** or **Reopen** in a selected task's floating toolbar. |
| `'promote'` | `{ action: 'promote', id }` | User clicked **To Task** in a selected pin's floating toolbar, converting the `idea` into a `task` in place. |
| `'remove'` | `{ action: 'remove', id }` | User clicked the danger **Delete** button in the floating toolbar (marks `status = 'cancelled'`). |
| `'add'` | `{ action: 'add', id, type, title, owner, context, status, createdAt, ... }` | User submitted the inline `+` composer at the foot of a swimlane, desk column, or list view. |

## Interaction & In-Place Editing

| Action | Behavior |
|--------|----------|
| Click a step row (card unselected) | Toggles step completion immediately (`step-toggle`) without selecting the card. |
| Click a card | Resolves lazy detail if needed, selects the card (`data-selected="true"`), and opens the floating `.np-ContextZone` toolbar above it. |
| Edit card title / note (when selected) | Title (`<h3>`) and notes (`<p>`) become `contenteditable="plaintext-only"`. `Enter` blurs; `Escape` exits selection. |
| Edit steps (when selected) | Step text (`.np-StepText`) becomes `contenteditable="plaintext-only"`. `Enter` inserts a new step below and focuses it; `Backspace` on an empty step removes it. |
| **To Task** (toolbar on `idea`) | Promotes the pin to a task with an empty step checklist and keeps it selected. |
| **Done / Reopen** (toolbar on `task`) | Toggles `status` between `'done'` and `'open'` and closes selection. |
| **+ Step** (toolbar on `task`) | Appends a new step to the task and selects its text for immediate typing. |
| **Due** (toolbar on `task`) | Opens the native browser date picker (`showPicker()`) via a hidden `<input type="date">` anchored inside the button. |
| **+ Note** (toolbar when `notes` is empty) | Reveals the `.np-CardNotes` paragraph and focuses it. |
| **`#context`** (toolbar) | Cycles the item's `context` through the registered `snapshot.contexts` list. |
| **Delete** (toolbar) | Cancels/removes the item and emits `action: 'remove'`. |
| Click `+` (`add_circle`) at lane/list foot | Opens `.np-InlineComposer` with a `Pin` / `Task` segmented switch; `Enter` submits, `Escape` or outside click dismisses. |
| Click outside selected card / composer | Clears card selection and closes any open inline composer. |
