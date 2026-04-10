# NUI Router Assessment

**Date:** 2026-04-10  
**Status:** Functional, stable, documented. Polish/improvement opportunities identified but not urgent.

---

## Current State Overview

The router consists of two entry points:

| API | Purpose | Usage |
|-----|---------|-------|
| `nui.createRouter(container, options)` | Low-level router | Manual control, custom integrations |
| `nui.enableContentLoading(options)` | High-level SPA setup | Standard NUI app initialization |

### How It Works

1. **URL Parsing:** Hash changes (`#page=about`) trigger navigation
2. **Fragment Loading:** Fetches HTML from `basePath` (default: `/pages`)
3. **Caching:** Creates wrapper `<div>`, caches forever, calls `show()`/`hide()` on navigation
4. **Lifecycle:** Fragment pages use `<script type="nui/page">` with `init(element, params, nui)`
5. **Features:** JS-only pages use `nui.registerFeature(name, fn)`

---

## Scroll Restoration: ✅ CORRECT AS-IS

**Current Behavior:** Scroll position resets to 0 on every navigation.

**Why This Is Correct for NUI:**
- NUI apps typically use a fixed layout (`nui-app`, `nui-main`) where the main content area scrolls
- Fragment-based pages are independent content units - a user navigating from "Settings" to "Dashboard" expects to land at the top of Dashboard
- Deep-linking to `#id` within a page works via `handleDeepLink()` - scrolls to element if `params.id` exists, otherwise resets to 0

**No action required.** The current behavior is the correct default for fragment-based SPAs.

---

## Issues & Opportunities for Discussion

### 1. API Naming: `enableContentLoading`

**Current State:**
- `enableContentLoading` is descriptive but verbose
- It doesn't clearly communicate "this sets up routing"
- Alternative names discussed: `enableRouting`, `initSPA`, `startRouter`, `createSPA`

**Considerations:**
- **Backward compatibility:** If renamed, need to keep alias for existing code
- **Clarity vs. convention:** `enableContentLoading` accurately describes *what* it does (sets up fragment loading), but `initSPA` or `startRouter` describe *why* you'd use it
- **Documentation impact:** Playground and LLM Guides reference this function extensively

**Options:**
1. Keep current name (explicit, unambiguous)
2. Add alias (e.g., `nui.initSPA = nui.enableContentLoading`)
3. Rename with breaking change (update all docs)

**Recommendation:** Add `nui.initSPA` as an alias. Keeps backward compat, offers shorter alternative.

---

### 2. Page Script Lifecycle Visibility

**Current State:**
- The `init/show/hide` pattern is powerful but not immediately obvious
- LLM Guide in `architecture-patterns.html` explains it well now
- Developers might miss it if they don't read the architecture documentation

**Considerations:**
- **Discovery:** New users may not realize `element.show` and `element.hide` exist
- **Documentation:** The pattern is documented, but perhaps not prominent enough
- **API surface:** No way to enforce or validate lifecycle hooks

**Options:**
1. **Add JSDoc/TypeScript hints** for `element.show` and `element.hide` callbacks
2. **Create a dedicated "Lifecycle" demo page** in the Playground
3. **Console warning** if `init()` function is missing (too opinionated?)
4. **Keep as-is** - the LLM Guide explains it, and it's an advanced pattern

**Recommendation:** Option 1 (JSDoc/TS) + Option 2 (dedicated demo page). Low effort, high visibility.

---

### 3. Fragment Cache: No Eviction Policy

**Current State:**
```javascript
const cache = new Map();  // Forever growth
// ...
function uncache(type, id) {  // Manual eviction only
    const cacheKey = getCacheKey(type, id);
    const element = cache.get(cacheKey);
    if (element) {
        element.remove();
        cache.delete(cacheKey);
    }
}
```

- Pages are cached forever
- `uncache()` exists but must be called manually
- Long-running SPAs could accumulate DOM nodes

**Considerations:**
- **Memory vs. Performance:** Caching is fast; eviction requires policy decisions
- **State loss:** Evicting a page destroys its DOM state (form inputs, scroll, etc.)
- **Use case:** How many pages does a typical NUI app have? 10? 50? 1000?
- **Manual control:** Currently developers can call `router.uncache('page', 'name')` if needed

**Options:**
1. **Keep as-is** - Most SPAs have < 50 pages; memory impact is negligible
2. **Add `maxCacheSize` option** - LRU eviction when limit exceeded
3. **Add `cacheTimeout` option** - Evict after N minutes of inactivity
4. **Add memory pressure listener** - Evict when `memorypressure` event fires (experimental)

**Trade-offs:**
| Option | Pros | Cons |
|--------|------|------|
| Keep as-is | Simple, predictable, fast | Unbounded growth in theory |
| maxCacheSize | Bounded memory, automatic | Complex policy (LRU? FIFO?), state loss surprises |
| cacheTimeout | Predictable cleanup | Race conditions, arbitrary timeout choice |
| Memory pressure | Responsive to real conditions | API not widely supported, unpredictable timing |

**Recommendation:** Option 1 (Keep as-is) for now. Document `uncache()` as escape hatch. Revisit if real memory issues reported.

---

### 4. Error Handling: Failed Fragment Fetches

**Current State:**
```javascript
async function navigate(route) {
    // ...
    if (element.nuiLoaded) {
        try {
            await element.nuiLoaded;
        } catch (e) {
            // Empty catch - silent failure
        }
    }
    // ...
}
```

- Failed fetches (404s, network errors) fail silently
- No user-facing feedback
- Router just... stops

**Considerations:**
- **User experience:** Blank page vs. error message vs. fallback
- **Developer experience:** Silent failures are hard to debug
- **Error types:** 404 (not found), 500 (server error), network timeout, CORS, parse error

**Options:**
1. **Keep as-is** - Let the developer handle it (add global error listener)
2. **Console error** - At least log the failure clearly
3. **Error event** - Dispatch `nui-route-error` event with details
4. **Fallback content** - Show "Page not found" UI in the container
5. **Error boundary element** - Allow registering `<nui-error-boundary>` or similar

**Detailed Proposal for Option 3+4:**
```javascript
// In navigate()
try {
    await element.nuiLoaded;
} catch (error) {
    container.dispatchEvent(new CustomEvent('nui-route-error', {
        bubbles: true,
        detail: { route, error, status: error.status }
    }));
    
    // Optionally show fallback content
    element.innerHTML = options.errorTemplate 
        ? options.errorTemplate(error)
        : `<div class="nui-route-error">Failed to load page</div>`;
    return; // Don't proceed with show()
}
```

**Recommendation:** Implement Option 3 (`nui-route-error` event) as minimum. This allows developers to handle errors their way (toast, redirect, custom UI).

---

## Summary Table

| Issue | Priority | Current | Suggested | Breaking Change? |
|-------|----------|---------|-----------|------------------|
| Scroll restoration | ✅ Done | Resets to 0 | No change | No |
| API naming | Low | `enableContentLoading` | Add `initSPA` alias | No |
| Lifecycle visibility | Low | Documented | Add JSDoc + demo page | No |
| Cache eviction | Very Low | Unlimited | Keep as-is, document `uncache()` | No |
| Error handling | Medium | Silent fail | Dispatch `nui-route-error` | No |

---

## Recommended Next Steps

1. **Error handling** - Implement `nui-route-error` event (highest value, lowest risk)
2. **API alias** - Add `nui.initSPA = nui.enableContentLoading` if desired
3. **Documentation** - Add JSDoc for lifecycle hooks, create lifecycle demo page
4. **Cache eviction** - Wait for real-world issues before adding complexity

---

## Open Questions for Discussion

1. **Naming:** Is `initSPA` or `startRouter` significantly better than `enableContentLoading`?
2. **Cache limits:** Do we have any evidence of memory issues in real NUI apps?
3. **Error UI:** Should NUI provide a default "Page not found" template, or leave entirely to apps?
4. **Lifecycle enforcement:** Should we validate/warn if `init()` doesn't exist, or keep it optional?
5. **Prefetching:** Should we add `router.prefetch('page/name')` for faster navigation?
