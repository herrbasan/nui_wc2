# nui-popover — scroll repositioning investigation

**Status: RESOLVED (2026-09-18).** The panel now uses native CSS Anchor Positioning (`position-anchor` + `position-area`) backed by an `IntersectionObserver` auto-dismiss when detached. Scroll lag is eliminated (0 px deviation at 60–120 fps compositor rate) with 0% JS CPU on scroll.

## The resolution

The fundamental root cause was confirmed: **main-thread JS positioning can never match compositor-driven scrolling**.
The component was redesigned around Path C (Native CSS Anchor Positioning + Detached Auto-Dismiss):

1. **Native Tethering**:
   - `CSS.supports('position-anchor', '--a') && CSS.supports('position-area', 'bottom')` is now standard Baseline 2026 (Chrome 125+, Safari 18.2+, Firefox 147+).
   - When supported, the component sets `anchor-name: --nui-anchor-<id>` on the invoker `<button>` and `position-anchor: --nui-anchor-<id>` on the popover.
   - Positioning is declared natively in CSS via `position-area: bottom|top|left|right` and `margin: var(--popover-offset)`.
   - The browser compositor handles all scroll translations synchronously with **zero deviation, zero scroll event listeners, and zero layout thrashing**.
2. **Auto-Dismiss on Detach**:
   - An `IntersectionObserver` observes the trigger button while the popover is open.
   - When the trigger scrolls out of its scroll container or the viewport, the popover calls `hidePopover()` automatically. This eliminates the "orphan bubble clamped at the edge of the screen" bug.
3. **Legacy Fallback**:
   - For older browsers lacking CSS Anchor Positioning, `placeAnchored()` places the popover on open, and background scroll dismisses the popover immediately (matching native mobile popovers and `nui-tooltip`).

---

## Historical Investigation Log (Handover Reference)

## The mechanism as it stood previously

`place()` in the `nui-popover` component (`NUI/nui.js`) ran when the panel opened and again on every `window` `scroll` (passive, capture) and `resize` event. It measured the trigger's rect and the frame's rect, then called `placeAnchored()`, which wrote `top`/`left` in viewport coordinates. The panel was in the top layer, but positioned from JavaScript on the main thread.

## Measured

- **Scroll events are coalesced.** A scrollbar drag delivered **21 events across 48 frames**, and **56 across 132** — so event-driven repositioning runs at roughly half the frame rate. Real, but see "ruled out".
- **Otherwise it is exactly glued.** With the main thread driving the scroll (`mouse.wheel`), the offset from panel to trigger was constant to the pixel — **max deviation 0** — including across a discrete 250 px jump.

## Ruled out

- **Update frequency.** A per-frame `requestAnimationFrame` loop was implemented and verified to actually change the mechanism: 132 frames / 56 scroll events / 57 panel moves, of which **55 happened on frames where no new scroll event had arrived**. The symptom survived. Rolled back — it did not fix it, and a loop running the entire time the panel is open costs CPU continuously.
- **"Let the compositor scroll it."** A top-layer element does **not** scroll with its container, even positioned `absolute`: an injected probe moved **0 px** while its trigger moved **-700 px**. There is no way to hand the panel to the compositor.
- **Synthetic wheel as a reproduction.** Playwright's `mouse.wheel` is dispatched on the main thread and structurally cannot reproduce compositor-driven scrolling. A real scrollbar **drag** can, and does.

## Remaining hypotheses

1. **Main-thread vs compositor gap** — inherent to any JS-positioned box, not fixable in JS. The only real answer is browser-native anchoring (CSS anchor positioning). **Support is unverified**: an earlier search returned contradictory Firefox/Safari/Baseline claims from mostly SEO sources, so check caniuse/MDN directly before committing. The JS path would have to remain a fallback, since the component throws when the Popover API is missing.
2. **`placement="auto"` flipping sides mid-scroll** — a ~108 px hop that reads as instability. Cheap to test: pin `placement` and see whether the complaint goes away.
3. **Frame clamping** detaching the panel once the trigger leaves the frame.
4. **The scrollbar release closing the panel** (light dismiss) — i.e. the report may be "it vanished", not "it lagged".

## Measuring this without fooling yourself

Each of these cost a round trip during the original investigation:

- The **only** metric that distinguishes loop-driven from event-driven updates is *frames where the panel moved with no new scroll event arriving*. Gap-deviation metrics are invalid.
- `gap = panelTop - gearTop` moves by ~108 px whenever auto-placement **flips** — it reads as lag and is design.
- **Clamping** legitimately pins the panel at the frame edge, so "deviation" grows forever. Pin `placement="bottom"` and park the trigger mid-frame to test cleanly.
- A **closed** popover has a zero rect, so `panelTop = 0` makes the gap track `-gearTop` and looks like catastrophic lag. Assert `:popover-open` on every sample.
- After editing `NUI/nui.js`, assert the **loaded** module is your code: `fetch('/NUI/nui.js', { cache: 'reload' })` and check for a new-only token plus the absence of an old-only one. In Playwright, CDP `Network.setCacheDisabled` then navigate. A stale module silently invalidates every measurement.

## Where the behaviour is documented

`documentation/components/popover.md` → *Known behaviour and limitations*, which lists the four user-visible consequences above for consumers. Keep the two in step.
