# Router & Content Loading Architecture

## Design Decisions

### Why Hash-Based Routing

NUI Router uses `location.hash` (`#page=intro`) rather than path-based routing (`/page/intro`) or search-based routing (`?page=intro`). This is an intentional design choice.

**The constraint:** NUI is a client-side library that must work without any server configuration.

| Approach | Server Config Required | Works on Static Hosts | SEO |
|----------|----------------------|----------------------|-----|
| Hash `#page=intro` | None | ✅ Yes | Poor |
| Search `?page=intro` | None* | ✅ Yes | Medium |
| Path `/page/intro` | Yes (rewrite rules) | ❌ No | Best |

*Search-based routing requires History API to prevent page reloads, offering no real advantage over hash routing.

**What hash routing enables:**
- Zero server configuration
- Works on any static host (GitHub Pages, S3, Netlify, local file://)
- Instant navigation (no network round-trips after initial load)
- Browser back/forward works automatically via `hashchange` event
- Bookmarkable deep links
- Offline-capable once loaded

**Trade-offs (accepted):**
- **SEO:** Search engines historically deprioritize or ignore hash content. Not suitable for SEO-critical sites.
- **Social previews:** Social media cards show generic content since servers never see the hash.
- **Appearance:** Hash URLs look "dated" to some. We consider this neutral—function over fashion.

**When this is the right choice:**
- Admin dashboards and internal tools
- Interactive applications
- Documentation sites and playgrounds
- Progressive Web Apps (PWAs)
- Apps behind authentication
- Any case where SEO is not a concern

**When to use a different approach:**
- Marketing sites (SEO critical)
- E-commerce product pages (SEO + social sharing)
- Content sites that need social media previews

For SEO-critical use cases, server-side rendering with hydration is the correct architecture—a fundamentally different pattern outside NUI's scope. NUI components can still be used in such setups, but the routing strategy would differ.

### Route Sanitization

Route IDs come from the URL, which users can manipulate. The router sanitizes route IDs by default to prevent common security issues.

**Enabled by default:**
```javascript
nui.configure({
    sanitizeRoutes: true  // Default
});
```

**What sanitization does:**
- Removes path traversal sequences (`..`)
- Strips potentially dangerous characters (`<`, `>`, `'`, `"`)
- Removes leading slashes
- Collapses multiple slashes

**Example:**
```
#page=../../../etc/passwd  →  sanitized to: etc/passwd
#page=<script>alert(1)     →  sanitized to: scriptalert(1
#page=docs/intro           →  unchanged: docs/intro
```

**Disabling (for advanced use cases):**
```javascript
nui.configure({
    sanitizeRoutes: false  // Raw input passed to handlers
});
```

When disabled, handlers receive raw input and are responsible for their own validation. Only disable if you have a specific need and understand the implications.

---

## Mental Model

The router is the **central coordinator** for what's visible in your application. It translates between URL state and DOM visibility.

```
┌─────────────────┐         ┌─────────────────────────────────────┐
│   Link List     │────────▶│  Browser URL (location.hash)        │
│   (just links)  │ clicks  │  Single source of truth             │
└─────────────────┘         └──────────────┬──────────────────────┘
                                           │ hashchange
                                           ▼
                            ┌─────────────────────────────────────┐
                            │           Router                     │
                            │  - Watches URL changes               │
                            │  - Parses hash into route            │
                            │  - Checks cache for element          │
                            │  - Cache miss: calls pageContent()   │
                            │  - Router shows element, hides rest  │
                            │  - Owns the content container        │
                            └─────────────────────────────────────┘
                                           │
                                           ▼
                            ┌─────────────────────────────────────┐
                            │        pageContent(type, id, params) │
                            │  - Dispatcher function               │
                            │  - Returns wrapper element immediately│
                            │  - Content injected asynchronously   │
                            └─────────────────────────────────────┘
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    ▼                      ▼                      ▼
             ┌────────────┐        ┌─────────────┐        ┌─────────────┐
             │ type='page'│        │type='feature│        │ (other)     │
             │ Content    │        │ Registered  │        │ Custom      │
             │ Loader     │        │ init fn     │        │ handlers    │
             └────────────┘        └─────────────┘        └─────────────┘
```

### Core Principles

1. **URL is the single source of truth** - All state derives from `location.hash`
2. **Router manages visibility** - It shows one thing, hides everything else
3. **Element First** - Wrapper element returned immediately, content injected async
4. **Unified dispatcher** - Single `pageContent(type, id, params)` function routes to appropriate handler
5. **Link-list is decoupled** - It just creates links; highlights based on URL match
6. **Everything is show/hide** - Once created, elements persist and are toggled

---

## URL Structure: Hash vs Search

The router uses both parts of the URL with distinct purposes:

```
https://myapp.com/?date=2024-01&tab=overview#feature=report
                  └─────── WHAT ──────────┘ └─── WHERE ───┘
```

| Part | Purpose | Affects Cache | Passed to Handler |
|------|---------|---------------|-------------------|
| **Hash** (`#`) | WHERE to go — routing | ✅ Yes (cache key) | Type + ID |
| **Search** (`?`) | WHAT to deliver — data | ❌ No | Always passed |

### Why This Distinction

**Hash (routing):**
- Determines which element to show
- Used as cache key: `type:id`
- Same hash = same cached element

**Search (data):**
- Parameters for the element
- Passed on every navigation, even to cached elements
- Element can update its content based on params

### Example Flow

```
URL: https://myapp.com/?date=2024-01#feature=report

1. Parse hash: type='feature', id='report'
2. Cache key: 'feature:report'
3. Cache miss? → Create element, cache it
4. Cache hit? → Reuse element
5. Either way: pass search params { date: '2024-01' } to handler/element
```

**Same element, different data:**
```
?date=2024-01#feature=report  → Report element shows January
?date=2024-02#feature=report  → Same element updates to February (no recreation)
```

This enables the element reuse pattern while supporting dynamic content.

---

## Hash Syntax

```
#<type>=<id>
```

### Structure

| Part | Description | Example |
|------|-------------|---------|
| `type` | Route type (user-defined) | `page`, `feature`, `view` |
| `id` | Route identifier (can include `/`) | `intro`, `docs/getting-started` |

### Examples

```
#page=intro
#page=docs/getting-started
#feature=dashboard
#feature=settings
#view=report
```

### Search Parameters

Search params (`?key=value`) are passed to handlers for element-specific data:

```
?tab=security#feature=settings     → Settings element receives { tab: 'security' }
?date=2024-01&format=pdf#view=report → Report element receives { date: '2024-01', format: 'pdf' }
?id=methods#page=docs/api          → Page element scrolls to #methods (reserved param)
```

**Reserved search param:** `id` = deep link (scroll to element with that ID within the page)

### Parsing Implementation

```javascript
function parseUrl() {
    // Hash: routing
    const hash = location.hash.slice(1);
    const hashParams = new URLSearchParams(hash);
    const entries = [...hashParams.entries()];
    
    if (entries.length === 0) return null;
    
    const [type, id] = entries[0];
    
    // Search: data for element
    const searchParams = Object.fromEntries(new URLSearchParams(location.search));
    
    return { type, id, params: searchParams };
}
```

---

## Router API

### Creation

```javascript
const router = nui.createRouter(container, {
    default: 'page=intro'  // Optional: default route when no hash
});
```

### The "Element First" Pattern

The `pageContent` dispatcher returns wrapper elements immediately and injects content asynchronously. This ensures:
- Instant visual response (no blocking)
- No race conditions (each element is independent)
- Handlers control their own loading/progress/error states

```
Navigate to #page=intro
       │
       ▼
┌─────────────────────────────┐
│ Router checks cache         │
│ Cache miss → calls          │
│ pageContent('page','intro') │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ pageContent returns wrapper │ ← Immediate, synchronous
│ element with loading state  │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ Router caches element,      │
│ shows it immediately        │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ Content injected async      │ ← Non-blocking
│ init() called when ready    │
└─────────────────────────────┘
```

### The pageContent Dispatcher

A single function dispatches to the appropriate handler based on route type:

```javascript
function pageContent(type, id, params) {
    // Create wrapper immediately
    const wrapper = document.createElement('div');
    wrapper.className = `content-${type}`;
    wrapper.innerHTML = '<div class="loading">Loading...</div>';
    
    if (type === 'page') {
        // Built-in content loader for HTML fragments
        loadFragment(`/pages/${id}.html`, wrapper, params);
    } else if (type === 'feature') {
        // Registered feature initializers
        const initFn = registeredFeatures[id];
        if (initFn) {
            initFn(wrapper, params);
        } else {
            wrapper.innerHTML = `<div class="error">Unknown feature: ${id}</div>`;
        }
    }
    
    return wrapper;  // Return immediately, content loads async
}
```

### Registering Features

App-specific features are registered with init functions:

```javascript
nui.registerFeature('dashboard', (element, params) => {
    // Build dashboard UI
    element.innerHTML = '<div class="dashboard">...</div>';
    
    // Attach lifecycle hooks
    element.show = (params) => {
        refreshDashboard(element, params);
    };
    
    element.hide = () => {
        pausePolling();
    };
});

nui.registerFeature('settings', (element, params) => {
    element.innerHTML = '<div class="settings">...</div>';
    setupSettings(element);
});
```

### Responsibility Split

**Router handles:**
- Watching URL changes
- Checking/managing element cache
- Calling `pageContent(type, id, params)`
- Show/hide management (including `inert` attribute)
- Calling lifecycle hooks (`element.show(params)`, `element.hide()`)
- Focus management on navigation

**pageContent handles:**
- Creating wrapper element immediately
- Dispatching to content loader (for `page` type) or registered features
- Returning wrapper synchronously

**Content loader handles:**
- Fetching HTML fragments
- Injecting content into wrapper
- Extracting and executing `<script type="nui/page">`
- Calling `init(element, params)` from fragment scripts

**Feature init functions handle:**
- Building feature UI
- Attaching lifecycle hooks if needed

### Element Lifecycle Hooks

Elements can optionally expose `show` and `hide` methods. The router calls these during navigation:

```javascript
element.show?.(params);   // Called when element becomes visible
element.hide?.();         // Called when element is hidden
```

**Example: Feature with lifecycle hooks**

```javascript
nui.registerFeature('dashboard', (element, params) => {
    let refreshInterval = null;
    
    // Initial render
    element.innerHTML = '<div class="dashboard">Loading...</div>';
    renderDashboard(element, params);
    
    // Lifecycle: called when shown (including re-shows with new params)
    element.show = (params) => {
        updateDashboard(element, params);
        refreshInterval = setInterval(() => refreshData(element), 30000);
    };
    
    // Lifecycle: called when hidden
    element.hide = () => {
        clearInterval(refreshInterval);  // Stop polling when not visible
        refreshInterval = null;
    };
});
```

**Use cases for lifecycle hooks:**
- **show():** Refresh data, resume animations, start timers, update based on new params
- **hide():** Pause animations, stop polling, cancel pending requests, save state

Note: Lifecycle hooks are optional. Simple static content doesn't need them.

### Starting the Router

```javascript
router.start();  // Begins watching hashchange, handles initial URL
```

### Programmatic Navigation

```javascript
router.go('page', 'docs/intro');
router.go('page', 'docs/intro', { id: 'section-2' });
router.go('feature', 'settings', { tab: 'security' });
```

### Current State

```javascript
router.current;  // { type: 'page', id: 'docs/intro', params: {}, element: <div> }
```

---

## Router Behavior

### On Hash Change

1. Parse hash into `{ type, id }`
2. Parse search into `params` object
3. Generate cache key: `${type}:${id}`
4. Check if element already exists (cached)
5. If cache miss:
   - Call `pageContent(type, id, params)`
   - `pageContent` returns wrapper element immediately
   - Cache the element
6. Call `element.hide()` on previously visible element (if any)
7. Set `inert` attribute on all other children
8. Remove `inert` from target element, show it
9. Call `element.show(params)` on target element
10. Move focus to target element
11. If `params.id` exists, scroll to that element within the page

### Element Caching

Elements are cached by `type:id`. Navigating back to a previously visited route shows the cached element without calling the handler again.

```
First visit to #page=docs/intro:
  → Handler called → Element created → Cached as 'page:docs/intro'

Second visit to #page=docs/intro:
  → Cache hit → Same element shown (no handler call)

Visit to #page=docs/intro&id=advanced:
  → Same cache key 'page:docs/intro' → Cached element shown → Scrolls to #advanced
```

---

## Content Handling

The unified `pageContent` dispatcher handles different content types:

### Built-in: Page Type (HTML Fragments)

When `type === 'page'`, the content loader fetches and injects HTML:

```javascript
// Automatic for #page=components/icon
// Fetches /pages/components/icon.html
// Injects content, executes <script type="nui/page">
```

### Registered: Feature Type

When `type === 'feature'`, calls a registered init function:

```javascript
nui.registerFeature('dashboard', (element, params) => {
    element.innerHTML = '<div class="dashboard">...</div>';
    initDashboard(element);
    
    element.show = (params) => refreshData(params);
    element.hide = () => stopPolling();
});

// Then #feature=dashboard triggers this init function
```

### Custom Types

Register additional type handlers for specialized needs:

```javascript
nui.registerType('report', (id, params, element) => {
    // Custom handling for #report=quarterly
    generateReport(element, id, params);
});
```

---

## Link List Integration

The link-list component is **decoupled** from the router. It:
- Renders navigation links with `href="#type=id"`
- Watches `location.hash` for changes
- Highlights the link matching current URL

### Active State Logic

```javascript
// Inside nui-link-list
function updateActiveFromURL() {
    const hash = location.hash;
    const links = this.querySelectorAll('a[href^="#"]');
    
    let match = null;
    for (const link of links) {
        const href = link.getAttribute('href');
        // Exact match preferred
        if (href === hash) {
            match = link;
            break;
        }
        // Partial match: #page=docs/intro matches #page=docs/intro&id=section
        if (hash.startsWith(href + '&') || hash === href) {
            match = link;
        }
    }
    
    this.setActive(match);
}

window.addEventListener('hashchange', () => updateActiveFromURL());
```

### No Router Dependency

The link-list doesn't know about the router. Both independently react to URL changes:

```
URL changes ──┬──▶ Router shows/hides content
              │
              └──▶ Link-list highlights active item
```

---

## Fragment Script Pattern

HTML fragments can include initialization logic via a special script type. This provides controlled execution without the problems of script re-injection (global pollution, redeclaration errors, no cleanup).

### The `<script type="nui/page">` Pattern

```html
<!-- pages/components/icon.html -->
<header>
    <h1>Icon Component</h1>
</header>
<section class="demo">
    <nui-icon name="settings"></nui-icon>
    <button class="demo-button">Toggle</button>
</section>

<script type="nui/page">
// This script is NOT executed by browser (unknown type)
// Content loader extracts and calls init() with controlled scope

function init(element, params) {
    // 'element' is the wrapper containing this content
    // 'params' are the search params from URL (?key=value)
    
    const btn = element.querySelector('.demo-button');
    btn.addEventListener('click', () => {
        element.querySelector('nui-icon').classList.toggle('spin');
    });
    
    // Optional: attach lifecycle hooks to element
    element.show = (params) => {
        console.log('Icon page shown with params:', params);
    };
    
    element.hide = () => {
        console.log('Icon page hidden');
    };
}
</script>
```

### How It Works

1. **Browser ignores `type="nui/page"`** — Unknown script types are not executed
2. **Content loader extracts the script** — Removes from DOM after reading
3. **Creates scoped function** — Script runs in function scope, not global
4. **Calls `init(element, params)`** — One-time initialization when content loads
5. **Lifecycle hooks persist** — `element.show()` / `element.hide()` called by router

### Script Execution Implementation

```javascript
function executePageScript(wrapper, params) {
    const scriptEl = wrapper.querySelector('script[type="nui/page"]');
    if (!scriptEl) return;
    
    // Remove from DOM (already read)
    scriptEl.remove();
    
    // Create function with controlled scope
    // Script must define init(element, params)
    const initFn = new Function(
        'element', 
        'params', 
        scriptEl.textContent + '\nif (typeof init === "function") init(element, params);'
    );
    
    // Execute initialization
    initFn(wrapper, params);
}
```

### Why This Pattern

| Old Pattern (re-injection) | New Pattern (`nui/page`) |
|---------------------------|-------------------------|
| Global scope pollution | Function scope (isolated) |
| `const`/`let` redeclaration errors on revisit | Fresh scope each time |
| No cleanup mechanism | `element.hide()` for cleanup |
| Browser executes, then we re-execute | Single controlled execution |
| Hard to debug (which execution?) | Clear: init runs once |

### Lifecycle Flow

```
First navigation to #page=components/icon:
  1. Content loader fetches HTML
  2. Injects into wrapper
  3. Extracts <script type="nui/page">
  4. Calls init(wrapper, params) — runs ONCE
  5. Router calls element.show(params)

Navigate away:
  6. Router calls element.hide()

Navigate back (cache hit):
  7. Router calls element.show(params) — init NOT called again
  8. Same element, same event listeners, just shown again
```

### External Modules (Complex Pages)

For pages with significant logic, use external modules instead:

```html
<!-- pages/dashboard.html -->
<script type="module" src="/pages/dashboard.js"></script>
<div class="dashboard">...</div>
```

```javascript
// pages/dashboard.js
// Standard ES module - full control over scope and lifecycle
export function init(element, params) {
    // Complex initialization
}
```

The content loader can detect and handle module scripts appropriately.

---

## Convenience: enableContentLoading

For the common case of "pages loaded from files + link-list navigation":

```javascript
nui.enableContentLoading({
    container: 'nui-content nui-main',  // Selector or element
    navigation: 'nui-side-nav',     // Link-list for active state
    basePath: '/pages',             // Where to fetch fragments
    defaultPage: 'intro'            // Default route
});
```

This sets up:
- Router with container
- `page` handler that fetches from `basePath`
- Default route to `#page=defaultPage`

For apps needing more control, use `createRouter` directly.

---

## Summary

| Component | Responsibility | Coupling |
|-----------|---------------|----------|
| **URL (hash)** | Single source of truth (WHERE) | - |
| **URL (search)** | Element-specific data (WHAT) | - |
| **Router** | Parse URL, manage cache, visibility, lifecycle | Owns container |
| **pageContent** | Dispatch to content loader or feature init | Called by router |
| **Content loader** | Fetch HTML, inject, execute `nui/page` scripts | Used by pageContent |
| **Feature init** | Build app features, attach lifecycle hooks | Registered with nui |
| **Link-list** | Render links, highlight active | Watches URL only |

**The URL drives everything.** Router and link-list both react to URL changes independently. The `pageContent` dispatcher routes to the appropriate handler based on type.

### Key Patterns

1. **Element First**: Wrapper returned immediately, content loads async
2. **Unified Dispatcher**: Single `pageContent` function for all route types
3. **Controlled Script Execution**: `<script type="nui/page">` with scoped `init(element, params)`
4. **Lifecycle Hooks**: `element.show(params)` and `element.hide()` for navigation events
5. **Accessibility**: `inert` attribute on hidden elements, focus management on navigation

---

## Design Philosophy: URL as Primary State

### Why URL Over Custom State Systems

The router architecture deliberately uses URL (`location.hash`) as the primary coordination mechanism rather than a custom reactive state system. This choice reflects core library principles:

| URL-Based State | Custom State (e.g., Knower) |
|-----------------|----------------------------|
| Visible in browser address bar | Hidden in memory |
| Copy/paste to share app state | Requires serialization |
| Browser back/forward works | Must implement history |
| DevTools network tab shows navigation | Requires custom debugging |
| Every developer understands URLs | New concept to learn |
| Components watch independently | Subscription management |

### The Decoupling Pattern

```
                    ┌─────────────────┐
                    │  location.hash  │
                    │  (Observable)   │
                    └────────┬────────┘
                             │
              hashchange event (standard)
                             │
           ┌─────────────────┼─────────────────┐
           ▼                 ▼                 ▼
      ┌─────────┐       ┌─────────┐       ┌─────────┐
      │ Router  │       │Link-list│       │Component│
      │         │       │         │       │   X     │
      └─────────┘       └─────────┘       └─────────┘
      
      No direct coupling between components.
      Each watches URL independently.
```

This is fundamentally different from pub/sub or reactive state:

```
      ┌─────────────────┐
      │  State Object   │
      │  (Knower)       │
      └────────┬────────┘
               │
    subscribe/watch (custom API)
               │
           ┌───┴───┐
           ▼       ▼
      ┌─────────┐ ┌─────────┐
      │Watcher A│ │Watcher B│  ← Must manage subscriptions
      └─────────┘ └─────────┘  ← Risk of memory leaks
                               ← Hidden dependencies
```

### When URL Is Appropriate

✅ **Use URL state for:**
- Navigation / what's visible
- Deep-linkable application state
- Anything users might want to bookmark or share
- Filter/sort/view settings
- Tab selections in multi-tab interfaces

### When URL Is NOT Appropriate

❌ **Don't use URL for:**
- Transient UI state (tooltip visible, dropdown open)
- Form input values before submission
- Animation state
- Sensitive data (passwords, tokens)
- High-frequency updates (drag position, scroll position)

### Relationship to Knower/Doer

NUI includes Knower (state observation) and Doer (action dispatch) for cases where URL-based state is inappropriate. However:

> **URL is the preferred mechanism for application-level coordination.**
> Knower/Doer exist for edge cases, not as the primary architecture.

This keeps the library aligned with "teach platform fundamentals"—URLs are universal web knowledge, while custom reactive systems are library-specific abstractions.

### Practical Implication

When designing a feature, ask:

1. **Should this state be in the URL?** → Use router
2. **Is it transient UI state?** → Use DOM attributes or local variables
3. **Do multiple unrelated components need to sync?** → Consider Knower (but question if URL would work)
4. **Is it a user action that could be declarative?** → Consider Doer with `nui-event-click`

Default to URL. Reach for Knower/Doer only when URL doesn't fit.
