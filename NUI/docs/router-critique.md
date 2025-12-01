# Router & Content Loading: Critical Analysis

A collection of potential issues, edge cases, and design concerns with the proposed router/content-loading architecture.

---

## 🪨 Rock #1: Hash-Based Routing is Legacy

**The Problem:** Using `location.hash` (`#page=intro`) when the modern standard is the History API (`/page/intro`).

```
Your approach:  https://myapp.com/#page=docs/intro
Modern SPA:     https://myapp.com/page/docs/intro
```

**Why it matters:**
- Hash URLs look amateurish/dated
- SEO is worse (crawlers historically ignore hash content)
- Server-side rendering is impossible (server never sees the hash)
- Can't do proper 404 handling
- Social media link previews won't work (Open Graph tags see same HTML for all routes)

**Potential counter:** "Hash routing works without server configuration."

**Challenge:** That's a crutch. Any real deployment needs server config anyway. Optimizing for demo at cost of production?

**Status:** [x] Addressed - Accepted design choice

---

## 🪨 Rock #4: No Type Safety or Validation

**The Problem:** Handlers receive arbitrary strings with no validation.

```javascript
router.handle('page', async (id, params) => {
    // id could be: '../../../etc/passwd', '<script>', '', null
    return await fetch(`/pages/${id}.html`);
});
```

**Security concerns:**
- Path traversal if `id` contains `../`
- XSS if `id` is reflected in error messages
- Empty `id` causes `/pages/.html` fetch

**Potential solutions:**
- Built-in sanitization in router
- Validation hooks
- Whitelist-based routing instead of pattern-based
- Documentation emphasizing developer responsibility

**Status:** [x] Addressed - Design improvement: sanitizeRoutes config (default on) added to router-content-loading.md

---

## 🪨 Rock #5: Handler Return Contract is Vague

**The Problem:** Handlers "return DOM elements." What if they don't?

```javascript
router.handle('page', async (id, params) => {
    if (notFound) return null;      // What happens?
    if (error) throw new Error();   // What happens?
    return undefined;               // What happens?
    return 'string';                // What happens?
    return [el1, el2];              // What happens?
});
```

**Current behavior unclear for:**
- `null` / `undefined` returns
- Thrown errors (sync and async)
- Non-element returns
- Array returns

**Potential solutions:**
- Define explicit contract with error handling
- Built-in error page rendering
- Loading state management
- Type definitions (TypeScript)

**Status:** [x] Addressed - Error elements are created and cached like any other element. Contract is simple: handler returns element or error element is generated. Cache is runtime-only (cleared on page reload).

---

## 🪨 Rock #6: Cache Key Ignores Params

**The Problem:** Elements cached by `${type}:${id}`, ignoring params.

```
#feature=report&date=2024-01  → cached as 'feature:report'
#feature=report&date=2024-02  → cache HIT, shows January data!
```

**Why it matters:**
- Params that affect content are silently ignored on revisit
- User sees stale data
- Debugging nightmare

**Potential solutions:**
- Include relevant params in cache key
- Let handler control cache key
- No caching by default, opt-in caching
- Cache invalidation API

**Status:** [x] Addressed - Design clarification: Hash = WHERE (routing, cached), Search = WHAT (data, always passed). Cache key uses hash only; search params passed to handler on every show.

---

## 🪨 Rock #7: No Loading States

**The Problem:** Async handlers take time. What does user see?

```javascript
router.handle('page', async (id, params) => {
    // 2 seconds on slow connection
    const html = await fetch(`/pages/${id}.html`);
    // User sees... previous page? Blank? Frozen UI?
});
```

**Missing:**
- Loading indicator integration
- Skeleton screens
- Timeout handling
- Retry on failure
- Cancel on rapid navigation (race conditions)

**Potential solutions:**
- Built-in loading state with customizable indicator
- Before/after navigation hooks
- AbortController integration for cancellation
- Configurable timeouts

**Status:** [x] Addressed - Design improvement: "Element First" pattern. Router creates wrapper immediately, handler populates async. Loading/progress/errors are handler's responsibility. No race conditions, no blocking.

---

## 🪨 Rock #8: Memory Leak by Design

**The Problem:** Elements cached forever.

```javascript
const elements = new Map();  // Never cleared
```

**Scenario:**
1. User visits 50 documentation pages
2. Each has complex interactive demos with event listeners
3. All 50 stay in memory, all listeners active
4. Tab uses 500MB+ RAM

**Why it matters:**
- "Element reuse" becomes "element hoarding"
- No eviction strategy
- No developer-accessible cache clearing
- Long-running apps (dashboards) will bloat

**Potential solutions:**
- LRU cache with configurable max size
- Manual cache clearing API
- Weak references where possible
- Page lifecycle hooks for cleanup

**Status:** [x] Dismissed - Non-issue. SPA element caching is a feature, not a bug. Equivalent or better than browser's natural caching of full page loads. Developer can manually uncache heavy elements if needed.

---

## 🪨 Rock #9: Script Re-injection is Hacky

**The Problem:** Script execution via DOM replacement.

```javascript
const newScript = document.createElement('script');
newScript.textContent = oldScript.textContent;
oldScript.parentNode.replaceChild(newScript, oldScript);
```

**Issues:**
- Inline scripts run in global scope (namespace pollution)
- `const` and `let` declarations collide on re-navigation to same page
- Module scripts behavior unclear on revisit
- No cleanup when navigating away
- Error in one script might break page silently
- Encourages bad habits (globals, no cleanup)

**Potential solutions:**
- Document recommended patterns clearly
- Provide page lifecycle hooks
- Recommend module pattern exclusively
- Consider `eval` alternatives (probably worse)

**Status:** [x] Partially addressed, rest out of scope. Lifecycle hooks (show/hide) provide cleanup mechanism. Script scoping, globals, and module behavior are standard JavaScript—not library concerns. Document recommended patterns, developer decides.

---

## 🪨 Rock #10: Link-List Matching is Naive

**The Problem:** Partial matching by string prefix.

```javascript
if (hash.startsWith(href + '&') || hash === href) {
    match = link;
}
```

**Edge case with multiple matches:**
```html
<a href="#page=settings">Settings</a>
<a href="#page=settings&tab=profile">Profile Tab</a>
```

URL: `#page=settings&tab=profile&other=param`

Both links could match. Which wins? Last one? First one? Undefined?

**Potential solutions:**
- Exact match only
- Most specific match wins (longest href)
- Explicit `data-match-exact` attribute
- Hierarchical matching logic

**Status:** [x] Dismissed - Non-issue with hash/search distinction. Hash matching is exact. Search params are for element data, not routing. Link-list matches hash portion only.

---

## 🪨 Rock #11: No Scroll Restoration

**The Problem:** Browser back button restores URL but not scroll position.

1. User scrolls down on Page A
2. Navigates to Page B
3. Clicks browser back
4. Page A shows, scroll at top

**Why it matters:**
- Native browser handles this for real navigations
- SPAs need manual implementation
- Poor UX for content-heavy pages

**Potential solutions:**
- Store scroll position per route
- Use `history.scrollRestoration` API
- Restore on back navigation
- Optional (some apps don't want this)

**Status:** [x] Addressed - Built-in scroll reset to 0 on navigation (expected UX). Elements can opt-out via `data-preserve-scroll` attribute.

---

## 🪨 Rock #12: Accessibility Gaps

**The Problem:** SPA navigation needs accessibility handling.

**Missing:**
- **Focus management:** Where does focus go after navigation? Currently nowhere.
- **Live region announcements:** Screen readers need "Page loaded: Introduction"
- **Skip links:** Do they work in SPA context?
- **Find in page:** Only searches currently visible content

**Potential solutions:**
- Move focus to main content heading after navigation
- ARIA live region for page change announcements
- Document skip link patterns
- Accept find-in-page limitation (platform constraint)

**Status:** [x] Addressed - Hidden elements use `inert` attribute (removes from tab order + screen reader). Visible element receives focus on navigation. Tab order works naturally like any page with `<main>`.

---

## 🪨 Rock #13: Testing Story is Missing

**The Problem:** How do you test router-based applications?

**Questions:**
- Unit test a handler? Mock what?
- Integration test navigation? Need browser?
- Test loading states? Mock fetch timing?
- Test error states? Mock failures?

**Missing:**
- Testing guidance
- Testable interfaces
- Dependency injection points
- Example test patterns

**Potential solutions:**
- Document testing patterns
- Provide mock utilities
- Design for testability (inject fetch, etc.)
- Example test suite

**Status:** [x] Dismissed - Navigation is visually obvious; failures are instantly apparent. Unit testing router logic has low value. Handlers are testable functions if business logic needs testing.

---

## 🪨 Rock #14: "Convenience Wrapper" Does Too Much

**The Problem:** `enableContentLoading` described as "convenience" but it:

- Creates router
- Creates content loader
- Registers `page` handler
- Wires up navigation
- Sets default route

**Why it matters:**
- Not a convenience wrapper, it's an opinionated framework
- User has little control over individual pieces
- Hard to customize one aspect without losing others
- Debugging requires understanding all pieces

**Potential solutions:**
- Make it truly composable
- Expose intermediate objects for customization
- Document as "quick start" not "convenience"
- Provide escape hatches

**Status:** [x] Dismissed - Weak critique. The wrapper is 5 lines with 3 config options. Far less opinionated than alternatives. Full escape hatch via createRouter. All pieces are optional and composable.

---

## 🪨 Rock #15: This Already Exists

**The Problem:** Reinventing existing solutions.

**Existing micro-routers:**
- [page.js](https://github.com/visionmedia/page.js) (~3KB)
- [Navigo](https://github.com/krasimir/navigo)
- [vanilla-router](https://github.com/nicholaswmin/vanilla-router)

**Question:** What's the unique value proposition that justifies maintenance burden?

**Potential justifications:**
- Tighter integration with NUI components
- Teaching tool (understanding > dependency)
- Specific design choices (hash-based simplicity)
- Zero-dependency philosophy

**Status:** [x] Dismissed - Zero dependencies is a core principle. Purpose-built router will be smaller and perfectly integrated. "Don't reinvent the wheel" stops progress; we wouldn't have rubber tires otherwise.

---

## Summary: Questions to Answer

1. **Why hash routing in 2024+?**
2. **How do you prevent param-order bugs?**
3. **How do you handle cache invalidation for parameterized routes?**
4. **What's the loading/error UX?**
5. **How do you prevent memory bloat?**
6. **What's the accessibility story?**
7. **How do you test it?**
8. **Why not use an existing micro-router?**

---

## Resolution Tracking

| Rock | Status | Resolution |
|------|--------|------------|
| #1 Hash routing | ✅ Resolved | Accepted design choice - documented in router-content-loading.md |
| #2 Param order | ✅ Dismissed | Not a real problem - same as any API convention |
| #3 Type/param collision | ✅ Dismissed | Not a real problem - params work as expected |
| #4 No validation | ✅ Resolved | Design improvement: sanitizeRoutes config (default on) |
| #5 Vague return contract | ✅ Resolved | Error elements cached like any element; cache is runtime-only |
| #6 Cache ignores params | ✅ Resolved | Hash = WHERE (cached), Search = WHAT (passed on every show) |
| #7 No loading states | ✅ Resolved | "Element First" pattern - handler manages loading/progress/errors |
| #8 Memory leak | ✅ Dismissed | SPA caching is a feature; equivalent or better than full page loads |
| #9 Script re-injection | ✅ Resolved | Lifecycle hooks for cleanup; JS scoping is out of scope |
| #10 Link matching | ✅ Dismissed | Hash matching is exact; search params are data, not routing |
| #11 Scroll restoration | ✅ Resolved | Built-in scroll reset to 0; opt-out via data-preserve-scroll |
| #12 Accessibility | ✅ Resolved | Hidden elements use `inert`; focus moves to visible content |
| #13 Testing | ✅ Dismissed | Navigation failures are visually obvious; low-value tests |
| #14 Convenience wrapper | ✅ Dismissed | Minimal (5 lines, 3 options); far less opinionated than alternatives |
| #15 Already exists | ✅ Dismissed | Zero dependencies principle; purpose-built is smaller and integrated |
| #4 No validation | | |
| #5 Vague return contract | | |
| #6 Cache ignores params | | |
| #7 No loading states | | |
| #8 Memory leak | | |
| #9 Script re-injection | | |
| #10 Link matching | | |
| #11 Scroll restoration | | |
| #12 Accessibility | | |
| #13 Testing | | |
| #14 Convenience wrapper | | |
| #15 Already exists | | |
