# nui-virtual-scroll & nui.util.virtualScroll

## Design Philosophy
`nui-virtual-scroll` is NUI Core's **variable-height detached-element recycler**. Unlike `nui-list` (which requires uniform item height and data-driven row templates), `nui-virtual-scroll` virtualizes arbitrary, variable-height DOM elements — chat messages with `<nui-markdown>` and `<nui-code>`, expandable `<nui-details>` panels, rich project cards, or mixed-content feeds — while preserving full element identity, event listeners, and internal component state.

## How It Works

1. **Activation Threshold (`threshold`, default `30`):** Below the threshold, items remain in normal flex-column flow with zero virtualization overhead. Once item count reaches `threshold` (and `clientHeight > 0`), the container transitions into a staged recycler.
2. **Detached-Element Recycling:** All items are measured once in natural flow (`getBoundingClientRect().height` + natural CSS `marginTop + marginBottom + rowGap` stored permanently as `slot.spacing`). A `.nui-vs-stage` container is given the exact pixel `totalHeight`, and only items intersecting `[scrollTop - margin, scrollTop + clientHeight + margin]` stay attached (`position: absolute; top: offset`). Off-screen items are detached via `removeChild` — completely out of the browser's layout and paint trees — while surviving in memory.
3. **Binary Search Visible Range:** Slots are ordered by `offset`, so each scroll pass locates the visible window in `O(log n + visible)` with zero `Set` allocation.
4. **Cascade Decoupling:** When an item changes height, `slot.offset` is updated in data for all subsequent slots, but `style.top` is written **only to currently attached elements**. Detached elements receive their updated `style.top` lazily when re-attached.
5. **Reactive Height Frame Loop (`wake` / `sleep`):** A per-container `requestAnimationFrame` loop measures attached slots in a strict READ phase before the WRITE phase. Smoothly cascades height changes from animations, expandable disclosures, or streaming content, then sleeps automatically after 30 idle frames (~0.5s).
6. **Scroll Anchoring:** When a slot **fully above the viewport** (`slot.offset + oldHeight <= viewTop`) changes height or is removed, `scrollTop` is compensated by `anchorDelta` in the same frame so content under the user's eyes never jumps.
7. **Hidden-Container Immunity:** Never measures while `clientHeight === 0` (`display: none` or background tab). Marks `staleMeasurements = true` and reconciles automatically via `ResizeObserver` when visible again.
8. **Pinned & Focused Items:** Items pinned via `pin(el)`, `data-vs-pinned="true"`, `data-is-streaming="true"`, or currently holding `document.activeElement` are exempt from detachment while off-screen.

## Usage Patterns

### Declarative Web Component (`<nui-virtual-scroll>`)

```html
<nui-virtual-scroll id="feed" threshold="30" margin="200" style="height: 32rem;">
	<article class="feed-card">Variable height item 1...</article>
	<article class="feed-card">Variable height item 2...</article>
	<!-- 30+ items automatically activate stage virtualization -->
</nui-virtual-scroll>
```

```javascript
const feed = element.el('#feed');

// Append a new variable-height element (auto-activates when crossing threshold)
feed.appendItem(cardEl);

// Remove an element or all elements matching a predicate (with scroll anchoring)
feed.removeItem(el => el.dataset.id === '42');

// Jump to an item index ('start' | 'center' | 'end') or bottom
feed.scrollToIndex(120, { align: 'center', behavior: 'smooth' });
feed.scrollToBottom('smooth');

// Query all items in order (including currently detached off-screen elements)
const allElements = feed.getItems();
```

### Attaching to Any Existing Container (`nui.util.virtualScroll`)

Use `nui.util.virtualScroll(container, options)` when you want to virtualize an existing scrollable container (`<div>`, `<section>`, swimlane body) without changing its tag:

```javascript
const vs = nui.util.virtualScroll(containerEl, {
	items: '.chat-message',   // optional selector (default: direct children)
	threshold: 30,            // min items to activate stage
	margin: 200,              // px overscan above/below viewport
	align: (el) => el.classList.contains('user') ? 'right' : 'stretch'
});

// Append / remove / pin during streaming
vs.append(messageEl);
vs.pin(streamingEl);
vs.unpin(streamingEl);
vs.remove(el => el.dataset.exchangeId === id);
```

## Attributes (`<nui-virtual-scroll>`)

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `threshold` | number | `30` | Minimum number of items before stage virtualization activates. Below this count, items stay in normal DOM flow. |
| `margin` | number | `200` | Overscan buffer in pixels above and below the visible viewport. |
| `items` | string | `null` | Optional CSS selector for item elements. When omitted, all direct child elements are treated as items. |

## Programmatic API (`<nui-virtual-scroll>` & Controller)

| Method / Property | Parameters | Return Type | Description |
|-------------------|------------|-------------|-------------|
| `appendItem(el)` / `vs.append(el)` | `HTMLElement` | `HTMLElement` | Appends an element to the end of the scroller (registers a slot if active, or activates if crossing `threshold`). |
| `appendItems(els)` | `Iterable<HTMLElement>` | `void` | Appends multiple elements in sequence. |
| `setItems(els, opts)` | `Iterable<HTMLElement>, { preserveScroll?: boolean }` | `void` | Clears the container, inserts all elements, and activates if `els.length >= threshold`. Pass `{ preserveScroll: true }` to retain the current `scrollTop` across in-place re-renders. |
| `removeItem(target)` / `vs.remove(target)` | `HTMLElement \| (el, idx) => boolean` | `number` | Removes matching item(s) from the slot list and DOM, cascading offsets and anchoring scroll position. |
| `clear()` | none | `void` | Removes all items and deactivates the stage. |
| `pin(el)` / `unpin(el)` | `HTMLElement` | `void` | Exempts an element from detachment while off-screen (e.g. active streaming bubble). |
| `scrollToIndex(index, opts)` | `number, { align?: 'start'\|'center'\|'end', behavior?: 'auto'\|'smooth' }` | `void` | Scrolls the item at `index` into view. |
| `scrollToBottom(behavior)` | `'auto' \| 'smooth'` | `void` | Scrolls to the bottom of the stage and updates visible slots. |
| `wake()` | none | `void` | Wakes the rAF height-detection frame loop for 30 frames. |
| `recalc()` / `refresh()` | none | `boolean` | Forces a full natural-flow re-measurement of all slots. |
| `activate()` / `deactivate()` | none | `boolean \| void` | Manually activates or deactivates the virtual stage (restoring normal flow on deactivate). |
| `getItems()` / `vs.items` | getter | `HTMLElement[]` | Returns all managed item elements in order, **including detached off-screen elements**. Never use `querySelectorAll` to enumerate virtualized items. |
| `isVirtual` | getter | `boolean` | `true` when the `.nui-vs-stage` recycler is active. |
| `itemCount` / `vs.count` | getter | `number` | Total number of items (attached + detached). |
| `attachedCount` | getter | `number` | Number of items currently attached in the DOM. |
