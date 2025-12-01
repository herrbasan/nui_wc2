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
                            │  - Calls registered handler          │
                            │  - Handler returns DOM element       │
                            │  - Router shows element, hides rest  │
                            │  - Owns the content container        │
                            └─────────────────────────────────────┘
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    ▼                      ▼                      ▼
             ┌────────────┐        ┌─────────────┐        ┌─────────────┐
             │ 'page'     │        │ 'feature'   │        │ 'view'      │
             │ handler    │        │ handler     │        │ handler     │
             │ (fetches)  │        │ (app logic) │        │ (whatever)  │
             └────────────┘        └─────────────┘        └─────────────┘
```

### Core Principles

1. **URL is the single source of truth** - All state derives from `location.hash`
2. **Router manages visibility** - It shows one thing, hides everything else
3. **Handlers provide elements** - They return DOM elements, router doesn't care how
4. **Link-list is decoupled** - It just creates links; highlights based on URL match
5. **Everything is show/hide** - Once created, elements persist and are toggled

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

The router creates wrapper elements immediately and lets handlers populate them asynchronously. This ensures:
- Instant visual response (no blocking)
- No race conditions (each element is independent)
- Handlers control their own loading/progress/error states

```
Navigate to #page=intro
       │
       ▼
┌─────────────────────────────┐
│ Router creates wrapper      │ ← Immediate, synchronous
│ element, caches it, shows it│
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ Handler called with element │ ← Async, non-blocking
│ reference, populates it     │
└─────────────────────────────┘
```

### Registering Handlers

Handlers receive `(id, params, element)` and populate the element:

```javascript
// Lazy-loaded content fragments
router.handle('page', async (id, params, element) => {
    // Show loading state (handler's choice)
    element.innerHTML = '<div class="loading">Loading...</div>';
    
    try {
        const response = await fetch(`/pages/${id}.html`);
        const html = await response.text();
        element.innerHTML = html;
        // Execute scripts if needed
    } catch (error) {
        element.innerHTML = `<div class="error">Failed to load ${id}</div>`;
    }
});

// App features with progress tracking
router.handle('feature', async (id, params, element) => {
    element.innerHTML = '<progress-bar value="0"></progress-bar>';
    
    const data = await loadData(id, (progress) => {
        element.querySelector('progress-bar').value = progress;
    });
    
    renderFeature(element, data, params);
});

// Synchronous handler (no loading state needed)
router.handle('view', (id, params, element) => {
    element.innerHTML = generateView(id, params);
});
```

### Handler Responsibilities

The router handles:
- Creating wrapper elements
- Caching elements by route key
- Show/hide management
- Passing params to handlers
- Calling lifecycle hooks

Handlers handle:
- Loading UI (spinners, skeletons, progress bars)
- Fetching/generating content
- Error display
- Updating content when params change

### Element Lifecycle Hooks

Elements can optionally expose `show` and `hide` methods. The router calls these during navigation:

```javascript
element.show?.(params);   // Called when element becomes visible
element.hide?.();         // Called when element is hidden
```

**Example: Handler with lifecycle hooks**

```javascript
router.handle('dashboard', async (id, params, element) => {
    let refreshInterval = null;
    
    // Initial render
    element.innerHTML = '<div class="dashboard">Loading...</div>';
    await renderDashboard(element, params);
    
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

1. Parse hash into `{ type, id, params }`
2. Generate cache key: `${type}:${id}`
3. Check if element already exists (cached)
4. If not, call registered handler → handler returns element
5. Append element to container (if not already there)
6. Hide all children of container
7. Show the target element
8. If `params.id` exists, scroll to that element

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

## Content Types

The router doesn't enforce content types—handlers define them:

### Type 1: Lazy-Loaded Fragments

```javascript
router.handle('page', async (id, params) => {
    // Fetch HTML fragment, inject into wrapper, return wrapper
    const response = await fetch(`/pages/${id}.html`);
    const html = await response.text();
    
    const wrapper = document.createElement('div');
    wrapper.className = `content-page page-${id.replace(/\//g, '-')}`;
    wrapper.innerHTML = html;
    
    // Execute scripts in fragment
    executeScripts(wrapper);
    
    return wrapper;
});
```

### Type 2: App Features (Main.js Controlled)

```javascript
// In main.js - create feature elements once
const dashboardEl = createDashboard();
const settingsEl = createSettings();

router.handle('feature', (id, params) => {
    const features = {
        dashboard: dashboardEl,
        settings: settingsEl
    };
    return features[id];
});
```

### Type 3: Template-Based (Pre-loaded)

```html
<!-- In index.html -->
<template id="tmpl-about">
    <h1>About</h1>
    <p>Version 1.0</p>
</template>
```

```javascript
router.handle('info', (id, params) => {
    const template = document.getElementById(`tmpl-${id}`);
    if (!template) return null;
    
    const clone = template.content.cloneNode(true);
    const wrapper = document.createElement('div');
    wrapper.appendChild(clone);
    return wrapper;
});
```

### Type 4: Dynamically Generated

```javascript
router.handle('report', (id, params) => {
    const el = document.createElement('div');
    el.innerHTML = `<h1>Report: ${id}</h1>`;
    // Generate report content based on params
    return el;
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

## Fragment Script Patterns

When loading HTML fragments, scripts need to execute in the right context.

### Pattern A: External Module (Recommended for Complex Pages)

```html
<!-- fragment.html -->
<script type="module" src="/pages/my-page.js"></script>
<header>
    <h1>My Page</h1>
</header>
<section>...</section>
```

```javascript
// my-page.js
function initPage() {
    const el = document.getElementById('my-element');
    el.addEventListener('click', handleClick);
}

// Handle both initial load and dynamic injection
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPage);
} else {
    initPage();
}
```

### Pattern B: Inline Script (Simple Interactivity)

```html
<!-- fragment.html -->
<section>
    <button id="my-btn">Click Me</button>
</section>
<script>
// Script at end - elements already exist
// nui is available globally
document.getElementById('my-btn').addEventListener('click', () => {
    console.log('Clicked!');
});
</script>
```

### Script Execution

The content loader re-injects scripts to trigger execution:

```javascript
function executeScripts(container) {
    const scripts = container.querySelectorAll('script');
    for (const oldScript of scripts) {
        const newScript = document.createElement('script');
        
        // Copy attributes
        for (const attr of oldScript.attributes) {
            newScript.setAttribute(attr.name, attr.value);
        }
        
        // Copy content
        newScript.textContent = oldScript.textContent;
        
        // Replace to trigger execution
        oldScript.parentNode.replaceChild(newScript, oldScript);
    }
}
```

---

## Convenience: enableContentLoading

For the common case of "pages loaded from files + link-list navigation":

```javascript
nui.enableContentLoading({
    container: 'nui-content main',  // Selector or element
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
| **URL (hash)** | Single source of truth | - |
| **Router** | Parse URL, manage visibility | Owns container |
| **Handlers** | Create/return DOM elements | Registered with router |
| **Link-list** | Render links, highlight active | Watches URL only |
| **Content loader** | Fetch/cache HTML fragments | Used by handler |

**The URL drives everything.** Router and link-list both react to URL changes independently. Handlers are the extension point for different content types.

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
