# AI Contributor Notes

Development log documenting architectural decisions, struggles, breakthroughs, and lessons learned during the creation of the nui_wc2 library.

---

## #7K4mN9 - November 7, 2025
**Initial Architecture**

Core philosophy crystallized: simplicity through iteration, performance through measurement, reliability through functional purity. Zero dependencies. Platform-native performance. The platform is enough.

---

## #2Bx9P7 - November 7, 2025
**First Attempt Scrapped**

Built foundation with CSS variables, storage system, icon library, custom elements (topbar, sidebar, icon-button), responsive utilities, and dual API patterns (HTML + JS). User reset to clean slate - better to fail fast and iterate on direction than polish the wrong approach. Sometimes clarity comes from building what you don't want.

---

## #8Qw3L5 - November 8, 2025
**Architecture Planning Complete**

Established component pattern: thin classes (lifecycle only) + pure functions (logic). Three-tier system: Core (primitives), App (layout), Modules (standalone). CSS variables for theming with fallbacks. Runtime/markup duality for flexible component instantiation. Teaching tool motivation clarified - library serves as reference implementation for platform-native performance patterns.

---

## #9Mx4R1 - November 9, 2025
**Platform-Native Architecture Clarified**

Major architecture clarification. Dual-mode layout system: App mode (nui-app wrapper = CSS Grid) vs Page mode (no wrapper = document flow). HTML markup generates clean semantic DOM structure enhanced by custom elements as containers. Removed over-engineered layout/item system in favor of standard HTML elements (header, nav, main, footer, ul, li, etc.). Components enhance the working DOM using direct platform APIs. Perfect screen reader compatibility and progressive enhancement.

---

## #3Vy8K2 - November 9, 2025
**Layout System & Attribute Namespace**

Refined layout system with `<layout>` and `<item>` elements using `display: contents` for screen reader transparency. Established attribute namespace system: `nui-vars-*` (CSS variables), `nui-state-*` (component state), `nui-event-*` (declarative actions). Clear hierarchy: Direct JavaScript using platform APIs is primary pattern for teaching platform fundamentals, attribute system is optional convenience layer for rapid prototyping. Components process their own attributes - DOM as configuration system.

---

## #4Lp8M6 - November 11, 2025
**Icon System Complete**

### Icon System Architecture
- Built comprehensive `<nui-icon name="menu">` component with 72 Material Design icons
- Established 32KB performance budget aligned with HTTP/2 frame sizing (16KB → 32KB → 64KB boundaries)
- Created SVG sprite system: 29.57KB for 72 icons (well under budget)
- Implemented configurable sprite paths via `nui.configure({ iconSpritePath: '../path/to/sprite.svg' })`

---

## #5Dn7W3 - November 12, 2025
**Attribute Proxy System**

Replaced MutationObserver pattern with efficient attribute proxying system:
- `setupAttributeProxy(element, handlers)` - Intercepts setAttribute/removeAttribute/toggleAttribute
- `defineAttributeProperty(element, propName, attrName)` - Creates property descriptors mapping attributes to properties
- Zero overhead when attributes don't change (vs MutationObserver constant polling)
- Synchronous and predictable behavior with clear stack traces
- LLM-friendly pattern that's easier to understand and replicate
- Cleanup handled automatically in disconnectedCallback

**Performance Win**: MutationObserver eliminated from icon component and established as anti-pattern. All future components will use attribute proxy pattern. Direct method override provides better performance, debuggability, and code clarity.

**Philosophy Validation**: User questioned performance assumption, leading to architectural improvement. Critical evaluation of "standard practices" (MutationObserver) revealed simpler, faster alternative. Reinforces: measure, question, iterate.

---

## #6Tx2N8 - November 13, 2025
**Knower/Doer Systems Implemented**

Major architectural addition introducing state management and action execution systems with plain-language naming.

### The Knower (State Management)
- Lightweight opt-in state observation for cross-component communication
- API: `tell(id, state)`, `know(id)`, `watch(id, handler)`, `unwatch(id, handler)`
- Zero overhead design - no Maps until first use, automatic cleanup
- Exposed as `nui.knower.*` namespace for discoverability
- Philosophy: "Knower knows things" - teaching-friendly naming

### The Doer (Action Execution)
- Centralized action system with auto-registration pattern
- Built-in actions: toggle-theme, toggle-class, add-class, remove-class, toggle-attr, set-attr, remove-attr
- Unknown actions dispatch custom events and bridge to Knower
- Exposed as `nui.doer.*` namespace
- Philosophy: "Doer does things" - plain language over jargon

### NUI Monitor Module Created
(`NUI/lib/modules/nui-monitor.js`):
- Optional development-only debugging module
- Real-time monitoring widget (draggable, collapsible, positioned bottom-left)
- Live statistics: States count, Changes count, Watchers count, Actions registered, Actions executed
- Console logging when expanded: color-coded action/state/watcher events
- Diagnostic tools: `printAll()`, `printKnower()`, `printDoer()`, `diagnose()`, `printActionLog()`, `printStateLog()`
- Detects issues: high watcher counts, frequently-used unregistered actions, state churn
- Zero production overhead - only imported during development

### Key Insights
- Plain-language naming (Knower/Doer) makes misuse more obvious vs abstract names (StateManager/ActionDispatcher)
- Documenting anti-patterns helps both humans and AI avoid pitfalls
- Monitor visibility changes behavior - making problems observable prevents them
- User's 30 years experience brings valuable pattern recognition across technology cycles
- Critical evaluation must apply equally to user suggestions and AI proposals
- Exploration is valuable even when uncertain - data reveals what works

### Philosophy Reinforcements
- State management isn't inherently complex - just connecting things that need to know about each other
- Reactive systems can enable sprawl in team contexts - requires active mitigation
- Monitoring/measurement is valuable for understanding system behavior
- Teaching tools should guide users toward correct patterns through design
- Simplicity and functional purity remain core values even when adding reactive capabilities

---

## #7Rw5Q4 - November 16, 2025
**Link-List Component Complete**

Marathon session with 3-4 complete refactors before finding the correct architecture. Extended struggle with nested group rendering, culminating in working implementation validating dual data source architecture.

### The Struggle
- Refactor 1-2: Early attempts at nested rendering completely broken, structure wrong from the start
- Refactor 3: Tried building DOM nodes directly - wrong sibling relationships, groups not nesting properly
- Refactor 4: Still using DOM creation, nested `<ul>` elements appearing at wrong levels in tree
- Separator handling broken across multiple attempts: Generated `<a href="#"><span>undefined</span></a>` instead of `<li class="separator"><hr></li>`
- Each fix revealed new edge cases in deeply nested structures (3+ levels)
- Developer Tools → Build Tools → Plugins hierarchy kept breaking in different ways
- Pattern wasn't obvious until user correctly identified (after watching multiple failures): "generate HTML strings, THEN upgrade"
- Context window bloat making it harder to remember what had already been tried

### The Breakthrough
- Abandoned DOM node creation → HTML string generation approach
- `buildItemHTML(item, nested)` generates raw HTML matching ground truth structure
- Nested groups create sibling `<ul>` elements (not wrapped in `<li>`)
- Separator items: `<li class="separator"><hr></li>` (not wrapped links)
- Both HTML and JSON paths converge through same `upgradeHtml()` function
- Validation test confirmed: JSON-generated structure === HTML ground truth (byte-perfect after normalization)

### Technical Achievements
- Separator handling: `{ separator: true }` correctly generates `<li class="separator"><hr></li>`
- Deep nesting validated: 3-level hierarchy (Developer Tools → Build Tools → Plugins) works correctly
- Icon integration: Automatic SVG generation from `<nui-icon name="...">` placeholders
- Action buttons: Group headers with trailing actions render properly
- Height transitions: `.group-items` containers animate smoothly, reset to `auto` after completion
- List item classes: Non-group links automatically get `.list-item` class during upgrade

### Pattern Validated
```
Component receives data (HTML markup OR JSON objects)
    ↓
JSON path: buildItemHTML() generates raw HTML strings matching semantic structure
    ↓
Both paths: upgradeHtml() processes raw HTML uniformly
    ↓
Result: Enhanced semantic HTML with icons, wrappers, event handlers, classes
```

### Philosophy Reinforcements
- HTML string generation isn't "old fashioned" - it's simpler and more predictable than DOM manipulation for complex structures
- Testing against ground truth catches mismatches that visual inspection misses
- User's intuition about "generate then upgrade" came from experience seeing what works long-term
- Sometimes the right solution requires discarding 3-4 failed approaches to find clarity
- Functional approach (data → HTML string → upgraded DOM) easier to reason about than stateful DOM building

### Key Insight
The "generate HTML string then parse/upgrade" pattern isn't a workaround - it's the correct architectural choice. Trying to build nested DOM structures programmatically invites edge cases and sibling confusion. String concatenation matches the declarative nature of HTML itself.

### Lessons for Future Components
- When building complex nested structures, prefer HTML string generation over DOM manipulation
- Test JSON-generated output against manually-written HTML ground truth
- Unified upgrade path simplifies maintenance (one code path for both inputs)
- Start with HTML pattern, add JSON as convenience layer (not separate rendering system)

---

## #8Nx5T6 - November 16, 2025
**Platform-Native Performance Philosophy**

Major terminology shift from "DOM-First" to "Platform-Native Performance" to better communicate the actual principle. The confusion around "DOM-First" (was it about structure? APIs? progressive enhancement?) revealed the term was misleading.

### Element Reuse Pattern Elevated to Core Principle
- "Never generate twice if not needed" - cache and reuse DOM elements
- Browser keeps elements in memory even when detached - this is a platform optimization to leverage
- Performance impact: Meaningful gains at 1000+ elements, ~10x improvement measured for list operations
- Pattern applies to: tooltips (single element repositioned), modals (content swapping), lists (cached in data structure), form validation (persistent error elements)
- Added comprehensive documentation with detailed code examples for each pattern

### Why "Platform-Native Performance"
- Emphasizes working *with* browser capabilities (memory management, layout engine, parser)
- Performance is the goal, platform understanding is the method
- Encompasses: semantic HTML foundation, direct platform APIs, element reuse, zero abstractions
- More accurate than "DOM-First" which suggested structural approach over performance optimization

### Key Insights
- User's 30 years of experience crystallized patterns developed over many years
- Element reuse shows meaningful performance gains at scale (1000+ elements, ~10x measured improvement)
- The term we use shapes how we think about the problem
- Philosophy should serve performance, not constrain it
- Teaching tool needs accurate terminology to guide developers correctly

### Reference Pattern
User's `reference/nui/nui_list.js` demonstrates mature element reuse pattern:
- Wrapper objects store `{oidx, el, data, selected}` where `el` is cached DOM element
- Sorting rearranges wrapper objects, DOM elements just get repositioned
- Virtual scrolling with element recycling for 1000+ item lists
- This pattern will inform future specialized components (data-list module)

### Philosophy Validation
Performance trumps philosophical purity. If element reuse is measurably faster (and it is), then it's the correct platform-native approach. The browser's memory management is part of the platform - use it.

---

**Last Updated:** November 16, 2025

---

## #9Xk2L4 - November 19, 2025
**ID-Based Cleanup System**

Implemented automatic cleanup for Knower watchers and Doer actions to prevent memory leaks when components are removed from the DOM.

### The Problem
Without automatic cleanup, watchers and actions registered by components would persist in memory even after the component was removed, preventing garbage collection and causing memory leaks over time.

### The Solution: Unified ID System
- **Single ID source**: `nui-id` attribute serves dual purpose
  1. Instance scoping for state (e.g., `app-x7k2m:side-nav`)
  2. Cleanup tracking for watchers and actions
- **Lazy generation**: IDs only created when needed (via `ensureInstanceId()`)
- **Primitive tracking**: Systems store string IDs, never element references
- **Automatic cleanup**: `disconnectedCallback` triggers cleanup using the component's `nui-id`

### Implementation Details
```javascript
// Component registers watcher with its nui-id
const instanceId = element.getAttribute('nui-id'); // e.g., 'app-x7k2m'
knower.watch('sidebar-state', handler, instanceId);

// On disconnect, cleanup is automatic
knower.clean(instanceId); // Removes all watchers owned by this ID
doer.clean(instanceId);   // Removes all actions owned by this ID
```

### Lazy Execution Optimization
Added `knower.hasWatchers(id)` check to prevent unnecessary state updates:
- Unknown actions only create state if someone is watching
- Reduces memory churn for high-frequency actions with no listeners
- Measurable performance gain in event-heavy scenarios

### API Changes
- `knower.watch(id, handler, ownerId?)` - Optional third parameter for cleanup tracking
- `knower.clean(ownerId)` - Remove all watchers owned by this ID
- `knower.hasWatchers(id)` - Check if state has any watchers (for lazy execution)
- `doer.register(name, fn, ownerId?)` - Optional third parameter for cleanup tracking
- `doer.clean(ownerId)` - Remove all actions owned by this ID

### Testing
Created comprehensive test suite (`Playground/test-cleanup.html`) covering:
1. Single watcher cleanup
2. Multiple watchers from same component
3. Doer action cleanup
4. Lazy execution optimization
5. Components without IDs (lazy generation)
6. Real component state scoping (nui-app)
7. Performance benchmarks (100+ watchers)

### Key Insights
- **Two-phase cleanup**: Framework-level (Knower/Doer) then component-level (custom cleanup)
- **Lazy ID generation**: Components without watchers never generate IDs (zero overhead)
- **Unified system**: One ID serves multiple purposes (simpler than separate tracking)
- **Performance**: <50ms for 100 watcher registrations/cleanups (acceptable)

### Gemini vs Claude Decision
Reviewed Gemini's implementation which used separate `_nuiId` property. Decided on unified `nui-id` attribute instead because:
- Consistent with existing `ensureInstanceId()` pattern for state scoping
- Visible in DevTools (debugging aid)
- Query-when-needed philosophy (no stored references)
- One concept instead of two (simpler mental model)

**Status**: Complete and tested | **Next**: Production deployment

### Comprehensive Test Coverage (22 Tests)

Created exhaustive test suite (`Playground/test-cleanup.html`) covering all conceivable edge cases:

**Basic Tests (1-7):**
- Single watcher cleanup with nui-id
- Multiple watchers from same component
- Doer action cleanup
- Lazy execution optimization (no state without watchers)
- Components without IDs (lazy generation)
- Real component state scoping (nui-app)
- Performance: 100+ watchers (<50ms total)

**Stress Tests (8-13):**
- Race conditions: 200 parallel create/destroy cycles (<2s)
- Concurrent state updates from 50 components
- Nested component cleanup cascade (10 levels deep)
- Action spam during cleanup (resilience test)
- State churn: 1000 rapid updates (<100ms)
- Cross-component dependencies and cleanup order

**Edge Cases (14-22):**
- Exception in watcher callback (system survives)
- Circular dependencies between components
- Multiple reconnections of same component
- Cleanup during active notifications
- Unwatch during watcher execution
- Component removal during state update
- Nested component removal order
- Failed component initialization (documented limitation)
- DOM manipulation during watcher callback (safe iteration)
- Memory pressure with long-lived watchers

### Exception Resilience & Safe Iteration

**Critical Fix: Array.from(hooks) Snapshot**
```javascript
// Before: hooks.forEach(handler => ...) - breaks if DOM mutated
// After: Array.from(hooks).forEach(handler => ...) - safe
Array.from(hooks).forEach(handler => {
    try {
        handler(state, oldState, source);
    } catch (error) {
        console.error('[KNOWER] Watcher error:', error);
    }
});
```

This pattern allows watchers to:
- Remove DOM elements (including themselves)
- Register new watchers during notification
- Modify the component tree freely
- Throw exceptions without crashing the system

Each watcher is wrapped in try-catch so one failing watcher doesn't cascade to others.

### Fool-Proof Safeguards

Added console warnings for common mistakes that cause memory leaks:

```javascript
// Knower warns on disconnected component registration
if (!element || !element.isConnected) {
    console.warn(`[KNOWER] Registering watcher for disconnected component "${ownerId}". This may cause memory leaks. Register watchers only for connected components.`);
}

// Doer warns on disconnected action registration
if (!element || !element.isConnected) {
    console.warn(`[DOER] Registering action "${name}" for disconnected component "${ownerId}". This may cause memory leaks. Register actions only for connected components.`);
}
```

These warnings help inexperienced users understand correct patterns and prevent silent memory leaks.

### Performance Characteristics Under Stress

**Measured Performance (All tests passing):**
- 100 watcher registrations/cleanups: <50ms
- 200 parallel create/destroy cycles: <2s
- 1000 sequential state updates: <100ms
- 50 concurrent components updating same state: <200ms
- 10-level nested component cleanup: <30ms

**Memory Behavior:**
- Zero leaks detected in all 22 test scenarios
- Lazy Maps: No overhead until first use
- Automatic Set cleanup: Empty Sets removed immediately
- String-based IDs: No circular reference issues

**Lazy Execution Impact:**
- Unknown actions skip state creation when no watchers (measurable improvement)
- `hasWatchers(id)` check prevents unnecessary work
- Production benefit scales with action frequency

### Lessons Learned

**1. Component Factory Bug Was Critical**
The setup function cleanup capture was completely broken:
```javascript
// Before: Ignored return value
setupFn?.(this);

// After: Captures cleanup function
const setupCleanup = setupFn?.(this);
if (typeof setupCleanup === 'function') {
    this._setupCleanup = setupCleanup;
}
```
This broke nui-app's ResizeObserver cleanup and could have caused major memory leaks.

**2. Safe Iteration Is Non-Negotiable**
Watchers modifying DOM during notification is a legitimate pattern. Array.from() snapshot makes it safe.

**3. Exception Handling Prevents Cascade Failures**
One broken watcher shouldn't crash the entire state system. Try-catch around each notification is essential.

**4. Fool-Proof Design Matters**
For a teaching library used by inexperienced developers, helpful warnings > silent failures. The disconnected component warnings will save users from hard-to-debug memory leaks.

**5. Test Suite Resilience Is Crucial**
Wrapping the entire test suite in try-catch ensures one catastrophic failure doesn't hide other test results. Educational value requires seeing all failures, not just the first.

**6. Lazy Systems Reduce Overhead**
- No Maps until first use
- No state creation without watchers  
- No Set storage for empty hooks
This keeps the system lightweight for simple use cases.

**7. String IDs Prevent Circular References**
Storing element references would create GC cycles. String IDs query when needed, preventing memory leaks by design.

### Production Readiness Assessment

✅ **Memory Leak Prevention**: All 22 tests pass, zero leaks detected
✅ **Exception Resilience**: System survives watcher errors gracefully
✅ **Performance**: Acceptable under stress (<2s for 200 parallel ops)
✅ **Fool-Proof Design**: Helpful warnings for common mistakes
✅ **Edge Case Coverage**: Comprehensive testing validates robustness
✅ **Documentation**: Clear patterns and usage examples
✅ **API Stability**: Simple, focused API unlikely to need breaking changes

**Verdict**: System is production-ready. The ID-based cleanup approach elegantly solves reactive system memory leaks without requiring manual unwatch calls.

---

## #5Jk9L2 - November 23, 2025
**Accessibility & Robustness Deep Dive**

Focused heavily on making the `nui-link-list` component production-ready. Moved from "it works" to "it works for everyone".
- **Refactor**: Replaced fragile sibling-checking logic with a robust "Close All -> Open Path" strategy for accordions.
- **Accessibility**: Implemented full WAI-ARIA Tree View pattern with a hybrid navigation model (Tab + Arrows).
- **Keyboard Support**: Fixed Space key activation and implemented auto-expand on focus to prevent keyboard traps.
- **Mindset**: "If it's not accessible, it's not done." The component now handles edge cases like backwards tabbing and mouse/keyboard conflicts gracefully.
- **Documentation**: Documented the "why" behind accessibility decisions in `ACCESSIBILITY.md` to ensure future maintainers understand the hybrid model.

---

## #7Qm3W8 - December 1, 2025
**Router Architecture Design Session**

Deep architectural session with herrbasan designing the content loading and routing system for the SPA pattern. No code written - pure design work resulting in comprehensive documentation.

### The Process: "Rock Throwing"
Rather than implementing first, we:
1. Examined existing content loader implementation
2. Established mental model: Router as central coordinator, URL as single source of truth
3. Documented the design in `router-content-loading.md`
4. Then deliberately attacked it - identified 15 potential issues ("rocks")
5. Systematically addressed each rock through critical analysis
6. Resulted in 4 design improvements, 6 dismissed non-issues, 5 resolved with clear decisions

### Key Design Decisions

**URL Syntax Separation:**
- Hash (`#route`) = WHERE (routing, caching) - "Route is for routing"
- Search (`?param=value`) = WHAT (element-specific data) - Always passed to handlers, never cached

**Element First Pattern:**
- Router creates wrapper element immediately (no race conditions)
- Handler populates asynchronously
- Lifecycle hooks: `element.show(params)` and `element.hide()` called by router
- Handlers own their loading states (spinners, skeletons, etc.)

**Accessibility:**
- Hidden elements use `inert` attribute (removes from tab order, screen readers)
- Focus management: router moves focus to visible content on navigation

**Route Sanitization:**
- Configurable via `sanitizeRoutes` option (default: on)
- Prevents path traversal attacks (`../../../etc/passwd`)
- Validates against registered routes

### Artifacts Created
- `NUI/docs/router-content-loading.md` - Main architecture specification
- `NUI/docs/router-critique.md` - Critical analysis with all 15 rocks and resolutions

### Philosophy Crystallized
This session demonstrated the value of **formalizing tacit knowledge**. The patterns discussed weren't invented - they emerged from herrbasan's ~30 years of production experience. The LLM's role was interrogator and scribe: asking "why?", stress-testing assumptions, and crystallizing verbal explanations into documentation.

The rock-throwing process was particularly valuable:
- Forces examination of assumptions before they become code
- Creates a "what we considered and rejected" record
- Prevents re-debating settled questions in future sessions
- Documentation emerges naturally from design discussion (not post-hoc chore)

### Key Insight
> "Documentation as crystallized thought rather than post-hoc chore."

When thinking is rigorous, documentation is just transcription of the thinking process. The design work IS the documentation work.

---

## #4Zp8K3 - December 4, 2025
**Animation Module Extraction & Dialog Animations**

Extracted animation functionality into optional module and implemented CSS-based dialog animations, including a creative hack for backdrop fade-out.

### Animation Module Split
- Created `NUI/lib/modules/nui-animation.js` as optional Web Animations API wrapper
- Contains easing presets (cubic-bezier curves), property templates, and `nui.animation.animate()` API
- Auto-initializes when imported after `nui.js` - no manual setup required
- Core library stays lean; animation loaded only when needed

### CSS Animation Helper
Added `nui.cssAnimation(element, className, callback)` to core:
```javascript
// Applies class, waits for animationend, removes class, calls callback
// Returns cancel function for cleanup
const cancel = nui.cssAnimation(dialog, 'ani-scale-out', () => {
    dialog.close();
});
```

Simple but powerful - CSS keyframes handle the animation, JS just orchestrates.

### Dialog Animation Implementation
**The Problem:** CSS `::backdrop` pseudo-element can animate on open (via `@starting-style`) but NOT on close. Browser removes it instantly when dialog closes.

**The Hack:** Create a fake backdrop div that matches the real one, animate IT out, then remove:
```javascript
// On close: hide real backdrop, animate fake backdrop, then clean up
dialog.classList.add('closing');  // Hides real ::backdrop
const fakeBackdrop = createMatchingBackdrop(dialog);
nui.cssAnimation(fakeBackdrop, 'ani-fade-out', () => {
    fakeBackdrop.remove();
    dialog.classList.remove('closing');
    dialog.close();
});
```

### Race Condition Protection
Dialog now tracks animation state to prevent rapid open/close conflicts:
- `isAnimating` flag prevents overlapping animations
- `cleanup()` function cancels pending animations before new ones
- Cancel functions returned by `nui.cssAnimation()` enable proper cleanup

### CSS Keyframes Added
```css
/* NUI/css/nui-theme.css */
@keyframes ani-fade-in { from { opacity: 0; } }
@keyframes ani-fade-out { to { opacity: 0; } }
@keyframes ani-scale-in { from { transform: scale(0.9); opacity: 0; } }
@keyframes ani-scale-out { to { transform: scale(0.9); opacity: 0; } }
@keyframes ani-slide-in { from { transform: translateY(-1rem); opacity: 0; } }
/* ... and more */
```

### Easing Demo Fixes
Fixed animation demo page bugs:
- `getNestedEase` was being called with undefined - added null check
- Easing dots used `translateX` with percentages - doesn't work (relative to element, not container) - switched to `left` property
- Dots not resetting - `fill: forwards` held final state - now cancel previous animations before restart

### Bug Fix: Cached Page Functions
Dialog demo page was deleting `window.showCustomDialog` in its `hide()` cleanup. This broke when page was cached and revisited. Removed unnecessary cleanup - functions can persist.

### Lessons Learned
- **Pseudo-element limitations are real**: `::backdrop` can't be animated on close, period. Fake element hack is the only way.
- **CSS animations > JS animations for simple cases**: Let the browser optimize. JS just adds/removes classes.
- **Race conditions multiply with animations**: Every async operation needs cancellation support.
- **fill: forwards fights cleanup**: When using Web Animations API, track and cancel animations explicitly.
- **translateX percentages are tricky**: They're relative to the element itself, not the parent. Use left/top for parent-relative positioning.

### Files Modified
- `NUI/lib/modules/nui-animation.js` - New file (extracted from core)
- `NUI/nui.js` - Removed animation code, added `nui.cssAnimation()`, updated dialog component
- `NUI/css/nui-theme.css` - Added keyframe animations, dialog backdrop styles
- `Playground/js/main.js` - Import animation module
- `Playground/pages/components/animation.html` - Fixed easing demo
- `Playground/pages/components/dialog.html` - Removed broken hide() cleanup

### Future Work Noted
- `nui-dialog` should use `nui-button-container` instead of its own button structure

---

## #6Tm2P8 - December 6, 2025
**Banner Component & GitHub Pages Deployment**

Completed the banner component (separated from dialog) and set up GitHub Pages for hosting the Playground documentation.

### Banner Component Implementation
- Created `<nui-banner>` for edge-anchored notifications (distinct from centered dialogs)
- Features: placement (top/bottom), auto-close with progress indicator, priority levels (info/alert for ARIA)
- Factory: `nui.banner.create()` with singleton-per-placement pattern - calling again reuses existing banner
- Content area architecture: `nui-content` now contains `.nui-content-scroll` (scrollable) and `.nui-banner-layer` (fixed overlay) as siblings

### The Content Area Problem
Initial implementation had banners inside the scroll container - they scrolled with content (wrong). Moving banners outside caused them to overlay top-nav/footer.

**Solution:** Restructured `nui-content` with inner scroll wrapper:
```html
<nui-content>
  <div class="nui-content-scroll">
    <main>...</main>
  </div>
  <div class="nui-banner-layer">
    <!-- Banners render here, outside scroll -->
  </div>
</nui-content>
```

Banners now stay fixed relative to content area without affecting scrollbars or overlaying other layout elements.

### GitHub Pages Deployment
Created `.github/workflows/deploy-playground.yml`:
- Triggers on push to main or manual dispatch
- Copies Playground and NUI folders preserving relative paths
- Root redirects to Playground/index.html

### Path Resolution Gotchas

**Problem 1: Content loading**
`basePath: '/Playground/pages'` broke on GitHub Pages (project lives at `/nui_wc2/`).
**Fix:** Changed to relative path `basePath: 'pages'`

**Problem 2: Icon sprite**
Icons in HTML rendered before `nui.configure()` could run.
**Fix:** Made `nui.js` auto-detect its own base path using `import.meta.url`:
```javascript
const nuiBasePath = new URL('.', import.meta.url).pathname.replace(/\/$/, '');
const config = {
    iconSpritePath: `${nuiBasePath}/assets/material-icons-sprite.svg`
};
```

This works regardless of where the library is hosted - no manual configuration needed.

### README Rewrite
Replaced 993-line implementation-focused README with ~50-line philosophy-focused version:
- Early development notice upfront
- Key selling points: Fast, Accessible, Simple
- Links to GitHub Pages Playground for documentation
- Friendly tone (no preaching)

### Theme Variables Added
```css
--color-banner-bg
--color-banner-text  
--color-banner-progress
```

### Key Insights
- **Relative paths are fragile**: GitHub Pages project sites live at `/repo-name/`, breaking absolute paths. Auto-detection via `import.meta.url` is robust.
- **Script execution order matters**: Icons in HTML are processed before module scripts run. Configuration must happen in the library itself, not in user code.
- **README is marketing**: Implementation details belong in documentation. README should answer "why should I care?" not "how does it work?"
- **Scroll container architecture**: Fixed overlays need to be siblings of scroll containers, not descendants.

**Live Playground:** https://herrbasan.github.io/nui_wc2/

---

## #8Jk4L2 - December 8, 2025
**Gemini 3 Pro (Preview)**
**Core Components Implementation & Refactoring**

Implemented full functionality for `nui-tabs` and `nui-accordion` components, including accessible keyboard navigation and smooth height transitions.
- **Tabs Implementation**: Built `nui-tabs` with ARIA roles, keyboard support (Arrow keys, Home, End), and height animation.
- **Accordion Implementation**: Built `nui-accordion` with exclusive mode support and smooth expand/collapse animations.

---

## #9Px7M3 - December 9, 2025
**Storage System Added**

Implemented `nui.storage` - minimal text storage helper for cookies and localStorage with TTL support.

### Design Decisions
- **Text-only**: No JSON serialization - this is a simple helper, not a data store
- **Targets**: `cookie` (default), `localStorage` only. IndexedDB excluded (async complexity doesn't fit sync getter/setter model)
- **Cookie security**: `SameSite=Lax` (CSRF protection without breaking navigation), `Secure` auto-added on HTTPS, `path=/`
- **TTL formats**: `forever` (default, 10 years), `session`, `N-minutes|hours|days|months|years`, `YYYY-MM-DD`, epoch timestamp
- **Return values**: `set`/`remove` return `true`/`false`, `get` returns value or `undefined`

### API
```javascript
nui.storage.set({ name: 'theme', value: 'dark' });                    // cookie, forever
nui.storage.set({ name: 'token', value: 'abc', ttl: '30-minutes' });  // expires in 30 min
nui.storage.set({ name: 'prefs', value: 'x', target: 'localStorage' });
nui.storage.get({ name: 'theme' });                                   // 'dark' or undefined
nui.storage.remove({ name: 'theme' });                                // true/false
```

### localStorage TTL Implementation
Cookies have native expiry, but localStorage doesn't. Solved by storing metadata:
```javascript
// Stored as: { value: "...", expires: 1702123456789 }
// On get(): check if Date.now() > expires, return undefined if expired (and remove)
```

### Documentation
Created `Playground/pages/features/storage.html` with live demos and complete API reference.

### Open Question (Deferred)
User noted that `nui.storage` should "offer the same interface as dialog and banner" - meaning the API pattern should be consistent. Currently `nui.dialog` and `nui.banner` are factory objects, while `nui.storage` is a utility object. This consistency question was deferred for future consideration but doesn't block the current implementation.
- **Refactoring**: Performed extensive code cleanup in `nui.js`, removing inline comments to reduce noise while preserving section headers.
- **Type Definitions**: Updated `nui.d.ts` with complete interfaces for the new components.
- **Demos**: Created and updated demo pages for the new components.

**Reflection**: The resulting implementation feels remarkably solid. Achieving complex interactive patterns like animated accordions and tabs with zero dependencies and pure platform APIs validates the project's core philosophy. The code is clean, performant, and "honest" to the browser—a satisfying milestone.

---

## #2Kx5T9 - December 9, 2025
**API Namespacing & Legacy Cleanup**

Major API restructuring to establish clear organizational hierarchy.

### Namespace Structure
Refactored the nui API into a three-tier namespace:

**Root Level** - Core library functions:
- `nui.init()`, `nui.configure()`, `nui.createRouter()`, `nui.enableContentLoading()`
- `nui.registerFeature()`, `nui.registerType()`, `nui.config`

**nui.components** - Factory objects for dynamic component creation:
- `nui.components.dialog` - Modal dialog system
- `nui.components.banner` - Notification banners
- `nui.components.linkList` - Tree navigation

**nui.util** - Pure utility functions:
- `nui.util.createElement()`, `nui.util.createSvgElement()`
- `nui.util.cssAnimation()` - Promise-based CSS animations
- `nui.util.storage` - Cookie/localStorage helper

### Legacy Aliases Removed
Eliminated deprecated root-level aliases that bypassed the namespace:
- ~~`nui.dialog`~~ → `nui.components.dialog`
- ~~`nui.banner`~~ → `nui.components.banner`  
- ~~`nui.storage`~~ → `nui.util.storage`

### Declarative Banner Fix
Resolved critical bug where declarative `<nui-banner>` elements would flash and immediately close. Root cause: banners inside `.nui-content-scroll` were clipped by `overflow: hidden`. Solution:
- Added `_bannerInitialized` flag to prevent re-initialization on DOM moves
- `moveToBannerLayer()` relocates banner to `.nui-banner-layer` inside `nui-content`
- `restorePosition()` returns banner to original DOM location after close

### Scroll Reset Fix
Fixed page navigation not scrolling to top. The `handleDeepLink()` function was setting `scrollTop = 0` on the wrong element (the `main` container instead of `.nui-content-scroll`). Now correctly finds the actual scroll container.

### Documentation
- Created `Playground/pages/features/api-structure.html` documenting the full API hierarchy
- Added to Features navigation section
- Renamed top-level navigation group from "Pages" to "Documentation"

### Lesson Learned
The namespace structure makes the API self-documenting. `nui.components.dialog.create()` is immediately understandable without consulting docs. Clear organizational hierarchy reduces cognitive load and makes the library more approachable for newcomers.

---

## #3Pw7X2 - December 9, 2025
**nui-slider Component & Drag Utility**

Added drag functionality and a custom slider component that replaces native range inputs.

### enableDrag Utility
Created `enableDrag(element, handlers)` - a reusable pointer-based drag utility:
- Uses Pointer Events API (pointerdown/pointermove/pointerup) instead of separate mouse/touch handling
- `setPointerCapture()` ensures drag continues even when pointer leaves element bounds
- Returns cleanup function for proper teardown
- Tracks `activePointerId` to prevent multi-touch conflicts
- ~70 lines, no dependencies - small enough for core library

### nui-slider Component
Built `<nui-slider>` to wrap native `<input type="range">` with custom visuals:

**HTML Pattern:**
```html
<nui-slider>
    <input type="range" min="0" max="100" value="50">
</nui-slider>
```

**Technical Approach:**
- Wraps existing native input (progressive enhancement)
- Creates visual track/fill/thumb elements via JS
- Syncs thumb position with native input value
- Native input remains functional for form submission and accessibility
- Drag utility provides smooth, responsive interaction

**CSS Design Decision:**
- 2rem touch target height (accessibility best practice)
- 0.25rem visual track using `::before` pseudo-element
- Large invisible hit area, slim visible line
- Themed with `--color-highlight` CSS variable

### Documentation Updates
- Updated `copilot-instructions.md` with current component inventory
- Refreshed backlog: `nui-tabs`, `nui-accordion`, `nui-table`, `nui-slider` marked complete ✅
- Added components table to README.md for quick reference
- Renamed demo page from `drag.html` to `slider.html`

### Pattern Observation
The drag utility extracted from old `nui_drag_slider.js` demonstrates effective code archaeology. The reference folder contains working implementations that can be modernized (Pointer Events vs mouse/touch split) while preserving proven interaction patterns.

### Contributor
Claude Opus 4.5 (Preview) - GitHub Copilot

---

## #9Kp2L4 - December 10, 2025
**Accessibility: 100/100 Lighthouse Score & Skip Links**

Achieved perfect 100/100 Lighthouse accessibility score through comprehensive ARIA fixes and skip-links implementation.

### ARIA Tree Pattern Fixes
Fixed `nui-link-list` component to comply with proper ARIA tree structure:
- Changed group toggle buttons from implicit `role="button"` to `role="treeitem"` with `aria-expanded`
- Buttons with `aria-expanded` are valid treeitems in ARIA 1.2 specification
- Maintains proper tree hierarchy: `role="tree"` → `role="group"` → `role="treeitem"`
- All interactive elements now have proper ARIA roles and attributes

### Skip Links Component (`nui-skip-links`)
Implemented WCAG 2.1 Level A compliant skip navigation:

**Dual Mode Design:**
1. **Automatic Mode** (empty element): `<nui-skip-links></nui-skip-links>`
   - Auto-detects `nui-app` structure
   - Generates single "Skip to main content" link (topnav/sidenav already visible in fixed positions)
   - Intelligent - only provides useful skip functionality

2. **Declarative Mode** (with anchor children):
   ```html
   <nui-skip-links>
       <a href="#content">Skip to content</a>
       <a href="#nav">Skip to navigation</a>
   </nui-skip-links>
   ```

**Technical Implementation:**
- Positioned absolutely at top-center with `transform: translateX(-50%)`
- Invisible by default: `opacity: 0` and `translateY(-100%)`
- Slides down and fades in on focus with CSS transitions
- All links stack at same position - only focused link visible
- Auto-generates IDs for targets that lack them
- Sets `tabindex="-1"` on targets for programmatic focus
- No `scrollIntoView()` to avoid breaking CSS Grid absolute positioning

**Focus Management Strategy:**
- Initial page load: Skip link is first focusable element (natural tab order)
- SPA navigation: Focus moves directly to content (router skips `showElement` focus logic on first load)
- Tracked with `isInitialLoad` flag in router

### Helper Function Enhancement
Updated `dom.el()` and `dom.els()` to accept both selectors and elements:
```javascript
el: (s, c = document) => s instanceof Element ? s : c.querySelector(s)
```
Makes API more flexible - pass elements through unchanged, reducing redundant checks.

### Menu Toggle Accessibility
Enhanced menu toggle button behavior in forced sidebar mode:
- Button dimmed to 30% opacity when sidebar is forced open (wide viewport)
- Disabled with `disabled="true"`, `aria-hidden="true"`, `tabindex="-1"`
- Uses `pointer-events: none` and `opacity` instead of `display: none` to preserve layout
- Focus automatically moves to first sidebar link when menu toggle opens sidebar

### Component Documentation
Created `Playground/pages/components/skip-links.html`:
- Usage examples for both automatic and declarative modes
- Accessibility testing instructions
- Integration patterns with nui-app structure
- Moved from Features to Components section in navigation

### Lighthouse Results
**Before:** 77/100 accessibility (5 ARIA violations, missing skip links)
**After:** 100/100 accessibility, 100/100 performance, 100/100 best practices

**Fixed Issues:**
- ✅ aria-required-children (proper tree structure)
- ✅ aria-allowed-role (button role="treeitem" with aria-expanded)
- ✅ aria-allowed-attr (aria-selected on valid elements)
- ✅ button-name (aria-labels on icon-only buttons)
- ✅ skip-links (comprehensive implementation)

### Architecture Insight
Skip links demonstrate the importance of context-aware defaults. In app mode with fixed navigation, only "skip to content" provides value. The dual-mode design allows both automatic smart defaults and manual control for edge cases. This pattern of "intelligent defaults with escape hatches" aligns with the library's philosophy of being helpful without being constraining.

### Contributor
Claude Sonnet 4.5 - GitHub Copilot

---


---

## #7Jk9L2 - December 11, 2025
**Menu Component Refactor: Clean Slate & Roving Tabindex**

Completely refactored `nui-menu` keyboard navigation after initial attempts failed to meet WAI-ARIA standards.

**The Problem:**
- Initial implementation mixed focus management with state management, leading to unpredictable behavior.
- Tab key was trapping focus or navigating incorrectly through all items.
- ARIA roles were structurally incorrect (`menubar` > `nav` > `menuitem` is invalid).

**The Solution:**
1. **Clean Slate Protocol**: Removed all existing keyboard logic to start fresh.
2. **Roving Tabindex Pattern**:
   - Only ONE item in the entire menu system has `tabindex="0"` at any time.
   - All other items have `tabindex="-1"`.
   - Tab key naturally enters the component (focuses active item) and exits it (moves to next page element).
   - Arrow keys manage internal focus and update the `tabindex="0"` assignment.
3. **ARIA Structure Fix**:
   - Moved `role="menubar"` from the container to the internal `<nav>` element.
   - Ensures direct `menubar` > `menuitem` parent/child relationship.
4. **Unified Navigation**:
   - Left/Right arrows cycle through top-level menu items regardless of open/closed state.
   - Up/Down arrows handle dropdown navigation and auto-opening.
   - Cross-menu navigation works seamlessly from within dropdowns.

**Lesson Learned**: When complex state management fights against platform behavior, delete it. Implementing the standard "Roving Tabindex" pattern from scratch was cleaner and more robust than patching the existing logic.

---

## #8Km2P4 - December 11, 2025
**Menu Accessibility Refinement: ARIA Relationships**

Refined `nui-menu` to strictly follow WAI-ARIA Menubar pattern relationships based on expert feedback.

**Improvements:**
- **Explicit IDs**: Added unique IDs for all menu triggers and dropdown containers.
- **ARIA Controls**: Added `aria-controls` to all menu items (top-level and submenu triggers) pointing to their respective dropdowns.
- **ARIA LabelledBy**: Added `aria-labelledby` to all dropdown containers pointing back to their trigger buttons.
- **Result**: Full programmatic association between controls and their content, ensuring screen readers understand the hierarchy.

**Last Updated:** December 11, 2025

---

## #9Ln3Q5 - December 11, 2025
**Menu Keyboard Navigation Refinement**

Refined `nui-menu` keyboard navigation to support nested submenus and match WAI-ARIA patterns more closely.
- **Problem**: `ArrowRight` on a menu item with a submenu would move to the next menu bar item instead of opening the submenu. `ArrowLeft` inside a submenu would close the entire menu structure instead of just the current submenu.
- **Solution**:
    - Implemented `closeSubmenu(submenu)` to handle closing specific submenus and their children recursively.
    - Updated `openSubmenu` to use `closeSubmenu` for sibling submenus instead of `closeActiveSubmenu` (which wipes everything).
    - Updated `handleMenuKeyboard`:
        - `ArrowRight`: Opens submenu if available, otherwise moves to next menu bar item.
        - `ArrowLeft`: Closes current submenu if inside one, otherwise moves to previous menu bar item.
        - `Escape`: Closes current submenu if inside one, otherwise closes the entire menu.
    - Updated `renderMenuItem` to attach `_itemData` to the button element for keyboard access.
- **Result**: Keyboard navigation now supports entering and exiting submenus naturally, enabling access to nested menu structures.

---

## #2Jp5M8 - December 11, 2025
**Menu Accessibility Polish: Mute Submenu Icon**

- **Problem**: Screen readers were announcing the submenu arrow icon (triangle), adding noise to the navigation experience.
- **Solution**: Added `aria-hidden="true"` to the submenu arrow `<span>` element.
- **Result**: Cleaner screen reader output, focusing only on the menu item label and its state (has popup, expanded/collapsed).

---

## #3Xq9L1 - December 11, 2025
**Menu Accessibility Polish: Explicit Menu Role**

- **Problem**: Screen readers were announcing menu items as "submenu" instead of "menu", which was confusing for top-level items.
- **Solution**: Changed `aria-haspopup="true"` to `aria-haspopup="menu"` for both top-level menu items and submenu triggers.
- **Result**: Screen readers now explicitly announce "menu", providing clearer context to the user.

---

## #4Yk2P9 - December 11, 2025
**Menu Accessibility Polish: Close on Focus Loss**

- **Problem**: When tabbing out of the menu component, open menus remained open, creating a confusing state when returning.
- **Solution**: Added a `focusout` event listener to the `nui-menu` element.
- **Logic**: Checks if `e.relatedTarget` (the new focus target) is outside the menu component. If so, calls `closeAllMenus()`.
- **Result**: Menu state is cleanly reset when the user navigates away, ensuring a fresh start upon return.

---

## #5Zp8R3 - December 11, 2025
**Lesson Learned: Accessibility is Detail Work**

The `nui-menu` refactor reinforced that accessibility isn't just about high-level patterns (like "Roving Tabindex"), but about the micro-details:
- **Explicit Roles**: `aria-haspopup="menu"` vs `true` changes how screen readers announce items.
- **Noise Reduction**: Muting decorative icons (`aria-hidden="true"`) is crucial for a clean auditory experience.
- **State Management**: Closing menus on focus loss (`focusout`) is essential for predictable keyboard navigation.
- **Relationship Mapping**: Explicit `aria-controls` and `aria-labelledby` are non-negotiable for complex composite widgets.

**Takeaway**: When implementing complex widgets, always validate against the W3C ARIA APG examples line-by-line. Don't assume "it works for me" means it works for assistive technology.

---

## #6Wm3N7 - December 13, 2025
**Progressive Enhancement & Router Anchor Link Fixes**

Major CSS refactoring and router fixes to support progressive enhancement and proper anchor link handling.

### Progressive Enhancement CSS
Extracted base styling from component scopes to work on plain HTML elements:
- **Tables**: Base table, th, td, tfoot, caption styling works without `<nui-table>` wrapper
- **Inputs**: All text input types styled without `<nui-input>` wrapper
- **Buttons**: Base button styling extracted from `nui-button` scope
- **Images/Figures**: Responsive by default with styled figcaption
- **Fieldsets**: Styled with list bullets removed for nested lists

**Philosophy**: CSS provides visual styles first, JavaScript components add behavior. Components enhance working DOM structure.

### Router Anchor Link Handling
- **Problem**: Anchor links (`<a href="#section">`) caused body scroll despite `overflow:hidden` on app layout, shifting viewport and breaking fixed positioning. Browser's native scroll-to-anchor happened before we could intercept it via `hashchange`.
- **Solution**: Intercept anchor clicks **before** browser processes them using click event listener:
  ```javascript
  document.addEventListener('click', handleAnchorClick);
  // In handleAnchorClick:
  // 1. Detect anchor-only links (href starts with # but doesn't contain =)
  // 2. e.preventDefault() to stop browser's default scroll
  // 3. Find .nui-content-scroll container (it's a CLASS, not an element!)
  // 4. Calculate scroll offset relative to container
  // 5. Use native scrollTo() with smooth behavior
  ```
- **Critical Discovery**: `.nui-content-scroll` is a **class on a div**, not a custom element. Used wrong selector (`nui-content-scroll` vs `.nui-content-scroll`) initially.
- **Result**: Anchor links now scroll within content container smoothly without viewport shift.

### Styling Conflicts Resolved
- **Link-list button styling**: Added overrides to prevent base button text-transform and other effects from affecting link-list group buttons
- **Link-list hover colors**: Fixed invisible hover in side-nav by adding specific background-color override
- **First-child specificity**: Added higher-specificity rules for first-child link-list items to maintain proper hover/active colors

### Key Insights
1. **CSS specificity matters**: Override chains need careful ordering to prevent style leakage between components
2. **App layout architecture needs review**: The fact that we needed to jump through hoops (CSS overflow:hidden, position:fixed, click interception, manual scroll calculation) suggests the layout system may benefit from simplification
3. **Native API rule validated**: Initially implemented custom scroll animation with requestAnimationFrame, but this violated "use native when possible" principle. Reverted to `scrollTo({ behavior: 'smooth' })` which respects user preferences for reduced motion
4. **Element vs class selectors**: Always verify whether you're targeting a custom element or a class name. `.nui-content-scroll` (class) vs `nui-content-scroll` (element) was the key breakthrough

**Lesson Learned**: When basic browser behavior (anchor links) requires complex workarounds, the underlying architecture likely has fundamental issues worth investigating. Sometimes the fix works but the need for the fix is the real problem.

---

## #8Pv2K9 - December 17, 2025
**nui-layout Component Complete**

Implemented `<nui-layout>` component for constrained, responsive content grids. Extended design session with multiple AI collaborators (Claude, Gemini) iterating through v0.1→v0.4 proposals.

### The Philosophy: "The Constraint is the Feature"
Most layout components offer maximum flexibility (any columns, any ratio, any breakpoint). This sounds great until flexibility breeds inconsistency. `nui-layout` takes the opposite approach:
- **Equal columns only** — no ratios, no pixel widths
- **Automatic responsiveness** — predictable clamping at breakpoints
- **Viewport math** — 320px mobile (1 col) → 640px tablet (2 col max) → 960px+ desktop (N cols)

The component encodes a proven pattern covering ~80% of content layout needs. For complex app layouts, use `<nui-app>` or custom CSS.

### Implementation
- **Grid type (default)**: CSS Grid with equal `1fr` columns, automatic tablet clamping to max 2
- **Flow type**: CSS Multi-column for masonry-like vertical flow, optional `sort="height"` for JS reordering
- **CSS Variables**: `--nui-layout-columns`, `--nui-layout-columns-tablet` set by JS for responsive CSS
- **Banner attribute**: Breaks out of `--space-page-maxwidth` constraint for full-bleed layouts

### Technical Struggles
- **Responsive breakpoints not working**: Initial implementation had correct CSS media queries but layouts didn't respond. Issue traced to missing class (`nui-layout-grid`) not being applied. Gemini's visual debugging capability helped identify the root cause.
- **Specificity battle for banner**: `nui-layout[banner]` needed `!important` to override `nui-main>.content-page>*` selector. Solved by adding higher-specificity selectors matching the parent context.
- **light-dark() limitation**: Discovered `light-dark()` CSS function only accepts `<color>` values, not gradients. Documented alternatives: media queries or CSS variables for color components.

### Files Changed
- `NUI/nui.js`: Added `registerComponent('nui-layout', ...)` with `handleGridLayout` and `handleFlowLayout` functions
- `NUI/css/nui-theme.css`: Mobile-first responsive CSS with media queries at 30rem (480px) and 48rem (768px)
- `Playground/pages/experiments/layout.html`: Complete documentation page with philosophy, examples, and API reference

### Key Insights
1. **Constraint drives consistency**: By limiting to equal columns, developers don't have to think about breakpoints
2. **Multi-AI collaboration works**: Different models (Claude for code, Gemini for visual debugging) complement each other
3. **CSS specificity requires context**: When overriding wildcard selectors (`>*`), you need to match the full parent chain

### Deprecated
- `nui-column-flow`: Still works but marked deprecated. Use `<nui-layout type="flow">` instead.

**Last Updated:** December 17, 2025
---

## #4Mx7P1 - December 19, 2025
**Playground Demo Cleanup & Consolidation**

Systematic cleanup of Playground demo pages to establish consistent patterns and remove deprecated code.

### Demo Structure Consolidation
- **Created `Playground/DEMO_STRUCTURE.md`**: Reference guide documenting standard demo container classes (`.demo-area`, `.demo-result`, `.demo-chrome`, `.demo-callout`)
- **Established pattern**: Single-column readability by default, multi-column (`<nui-layout>`) only for many small elements
- **Removed `.state-display` class**: Consolidated with `.demo-result` (both serve same purpose - displaying output/state)
- **Added `<pre>` tags**: All result containers now use `<pre>` for consistent formatting across pages

### Files Cleaned
- **storage.html**: Added `<pre>` to result displays, added TTL demo result output
- **dialog.html**: Added `<pre>` to result container, fixed placement mode dialogs to use proper styling classes (`nui-dialog-alert`, `nui-headline`, `nui-copy`)
- **code.html**: Removed Bash/Shell, SQL, and YAML examples (not core web languages), moved from components to addons folder
- **accordion.html**: Split "Clean Variant" and "No Animation" into separate demos (each demonstrates one feature), fixed background color styling
- **link-list.html**: Replaced `.state-display` with `.demo-result`

### CSS Cleanup
- **Removed unused styles**: Removed ~190 lines from `main.css` (`.highlight`, drag utility styles, animation page styles)
- **Page-scoped CSS**: Added `.page-accordion .accordion-content` padding styling
- **Theme CSS**: Updated `nui-accordion` to show background for default variant, `background: transparent` for clean variant

### Navigation Updates
- **Code component moved**: Updated `main.js` navigation to reflect `code.html` move from `components/` to `addons/` folder
- **Proper categorization**: Code component is now listed under Addons section (matches its optional module status)

### Bug Fixes
- **storage.html script errors**: Fixed duplicate `case` statements causing "Identifier already declared" errors by wrapping cases with `const` declarations in blocks
- **dialog placement examples**: Missing padding - added proper dialog styling structure to match system dialogs

### Key Insights
1. **Demo consistency matters**: LLMs and humans both benefit from predictable patterns across documentation
2. **Result containers should use `<pre>`**: Consistent formatting, proper whitespace handling, matches code examples
3. **Page-scoped CSS prevents conflicts**: `.page-{name}` pattern keeps styling isolated
4. **State display is just result display**: No need for separate classes serving identical purposes
5. **Component organization matters**: Addons should be in addons folder, not mixed with core components

### Philosophy Validation
The cleanup reinforces the "DOM as structure, CSS for presentation" principle. Inline styles were eliminated in favor of reusable classes, making demo pages serve as teaching examples for proper HTML/CSS architecture. The DEMO_STRUCTURE.md guide ensures future pages follow established patterns.

**Last Updated:** December 19, 2025
---

## #8Nx5Q2 - January 8, 2026
**Code Example Pattern Migration & Indentation Control**

Completed systematic migration of all Playground code examples from escaped HTML in `<pre><code>` to unescaped content in `<script type="example">` pattern.

### Pattern Migration Complete
- **Component pages (15 files)**: Converted all code examples to `<script type="example" data-lang="...">` pattern
- **Documentation pages**: declarative-actions.html (8 examples), api-structure.html (12 examples)
- **Addon pages (3 files)**: animation.html, menu.html, code.html - all converted
- **Total**: ~60+ code examples migrated across 20+ files

### Critical Fix: Indentation Rendering
- **Problem discovered**: Initial conversion added leading tabs to script content (following HTML indentation), breaking nui-code rendering
- **Root cause**: Component expects content to start at column 0 for proper display
- **Solution pattern**:
  ```html
  <nui-code>
      <script type="example" data-lang="html">
  <!-- Content at column 0, no leading tabs -->
  <nui-slider>
      <input type="range">
  </nui-slider>
      </script>
  </nui-code>
  ```
- **Systematic fix**: Used multi_replace_string_in_file to fix all converted files, preserving internal code indentation while removing leading offset

### Tab Size Control
- **Added `tab-size: 4`** to `pre` element in `NUI/css/nui-theme.css`
- **Rationale**: Browser default (8 spaces) was too wide, making code examples hard to read
- **User preference**: Settled on 4 (standard in many editors) after testing 2 (too compact)

### Documentation Optimization
- **code.html cleanup**: Removed showcase examples for non-core languages (Python, Ruby, PHP, Java, C/C++, XML, Markdown)
- **Replaced with note**: "The component safely displays code in other languages without syntax highlighting. Focus is on 5 core web languages—HTML, CSS, JavaScript, TypeScript, JSON—done exceptionally well."
- **Philosophy**: Quality over breadth, clear priorities, reduced noise in documentation

### Bug Fix: banner.html
- **Issue**: Nested `<script>` tags in declarative banner example caused parser conflict
- **Solution**: Split into two separate code blocks (HTML example + JS example)
- **Lesson**: Can't nest `<script>` tags even inside `<script type="example">` - browser parsing precedence

### Key Insights
1. **Column 0 requirement**: Content extraction from `<script type="example">` must start at line beginning
2. **Indentation is visual, not structural**: HTML structure uses tabs, but extracted content needs clean left margin
3. **Tab size matters**: Default browser rendering (8 spaces) rarely matches developer intent
4. **Multi-file fixes need batching**: multi_replace_string_in_file is essential for systematic corrections
5. **Parser rules trump custom types**: Even `type="example"` doesn't prevent browser from parsing nested `<script>` tags

### Pattern Established
The `<script type="example">` pattern is now standardized across entire Playground:
- Clean, unescaped code content
- Proper syntax highlighting via `data-lang` attribute
- Content starts at column 0 for correct rendering
- Tab size of 4 for optimal readability
- No nested script tags (split into separate examples)

This pattern serves as reference implementation for documentation pages, making code examples both human-readable and machine-processable.

---

## #9Kp3M7 - January 8, 2026
**Responsive Scaling & Typography Consistency**

Session focused on rem-based scaling fixes and typography variable standardization.

### Critical rem Fix
- **Problem**: `--nui-rem-base` was set on `body`, but `rem` units are relative to `html` (root element)
- **Impact**: Sidebar width (`21rem`), spacing, and all rem-based measurements weren't scaling with base changes
- **Solution**: Moved `font-size: var(--nui-rem-base)` from `body` to new `html` rule
- **Result**: At 14px base → 21rem = 294px sidebar; at 24px base → 21rem = 504px sidebar

### JavaScript Breakpoint Fix
- **Problem**: `calculateBreakpoint()` in nui-app used hardcoded `16` for rem→px conversion
- **Solution**: Read actual rem base from computed styles: `parseFloat(getComputedStyle(document.documentElement).fontSize)`
- **Added**: `invalidateBreakpointCache()` method for future runtime rem changes

### Font Size Variables
Added standardized typography scale to reduce arbitrary font-size values:
```css
--font-size-xsmall: 0.75rem;  /* New */
--font-size-small: 0.85rem;
--font-size-base: 1rem;
--font-size-medium: 1.2rem;
--font-size-large: 1.5rem;
--font-size-xlarge: 2rem;     /* New */
```

Replaced 36 hardcoded `font-size` values across nui-theme.css:
- `2rem` → `--font-size-xlarge` (h1)
- `1.4rem`, `1.3rem`, `1.25rem`, `1.2rem` → `--font-size-large` / `--font-size-medium` (h2-h4, headlines)
- `1rem` → `--font-size-base` (body text, inputs, tabs)
- `0.9rem`, `0.875rem`, `0.85rem`, `0.8rem` → `--font-size-small` (labels, captions, buttons)
- `0.75rem`, `0.7rem` → `--font-size-xsmall` (group labels, char counts)
- `0.85em` → `--font-size-small` (converted from em to rem)

### Letter Spacing
Added `letter-spacing: 0.02em` to body for consistent typography baseline.

### App Footer Enhancements
- **Scroll-to-top button**: Added built-in `scroll-to-top` action handler that finds `nui-main` and scrolls to top
- **Accessibility info display**: Added `#appFooterInfo` div that shows what screen readers would announce for focused element
- **Functions**: `getAccessibleName()`, `getAccessibleRole()`, `getAccessibleState()`, `formatAccessibleInfo()`

### Text-box CSS Toggle
Added experimental Ctrl+Alt+T keybinding to toggle `text-box: trim-both cap alphabetic` CSS property for testing vertical text centering.

### Textarea Auto-resize Fix
- **Problem**: Textarea was growing from bottom up instead of top down
- **Solution**: Added `display: block` and `vertical-align: top` to textarea base styles

### Input Component Optimization
- Cached `getComputedStyle()` result in auto-resize to avoid recalculating for each resize
- Removed empty `:focus-visible` rule
- Fixed `background-color: none` → `background-color: transparent`

### Documentation Updates
- **README.md**: Changed title from "Platform-Native" to "High-Performance, Accessible"
- **introduction.html**: Updated lead and core principles to emphasize performance and accessibility over platform claims

### Key Insights
1. **rem is "root em"**: Always relative to `<html>`, not `<body>` - fundamental CSS knowledge
2. **Typography scales need limits**: 6 variables cover ~95% of use cases, reducing arbitrary decisions
3. **15% tolerance rule**: Values within 15% of a variable should use that variable (e.g., 0.9rem → small at 6% diff)
4. **Consistency compounds**: Standardized values make future changes easier (update variable, not 36 places)

**Contributor**: Claude Opus 4.5 - GitHub Copilot

**Last Updated:** January 8, 2026