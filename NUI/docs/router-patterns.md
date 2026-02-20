# NUI Router: Usage Patterns & Best Practices

## Introduction

The NUI Router (`nui.createRouter` and `nui.enableContentLoading`) is a flexible, hash-based routing system. A common misconception—especially for AI assistants analyzing the codebase—is that the router *requires* every page to be a separate HTML file with its own isolated `<script type="nui/page">` block. 

While the NUI Playground uses this "Fragment-Based" pattern heavily for demonstrations, it is **not mandatory**. The router is fundamentally just a state coordinator that translates URL hashes into DOM visibility.

This guide outlines the three primary ways to architect an application using the NUI Router.

---

## Pattern 1: Centralized Application Logic (The "App" Pattern)

In this pattern, your application logic lives in a central JavaScript bundle. The router is simply used to toggle the visibility of different pre-rendered or dynamically generated DOM elements based on the URL state.

### How it works
- All HTML is either in the main `index.html` or generated dynamically by a central script.
- You register custom route handlers using `nui.registerFeature` or `nui.registerType`.
- No HTML fragments are fetched over the network.

### Example
```javascript
// main.js
import { nui } from './nui.js';

// Register a feature that generates its own UI
nui.registerFeature('dashboard', (element, params) => {
    element.innerHTML = `
        <header><h1>Dashboard</h1></header>
        <div class="stats">Loading stats...</div>
    `;
    
    // Centralized logic handles the data fetching
    appState.fetchStats().then(data => {
        element.querySelector('.stats').textContent = data;
    });
});

// Register another feature that just shows an existing DOM element
nui.registerFeature('settings', (element, params) => {
    // Clone a template from the main document
    const template = document.getElementById('settings-template');
    element.appendChild(template.content.cloneNode(true));
    
    // Bind centralized event listeners
    appSettings.bindForm(element.querySelector('form'));
});

// Start the router
const router = nui.createRouter(document.querySelector('nui-main'), {
    default: 'feature=dashboard'
});
router.start();
```

### When to use
- Complex, highly interactive applications (like dashboards or editors).
- Apps with shared state (e.g., a shopping cart) that needs to be accessed across different views.
- When you want to bundle all your JavaScript together for performance and immediate execution.

---

## Pattern 2: Fragment-Based Pages (The "Playground" Pattern)

This is the pattern used by the NUI Playground. The router fetches HTML files from the server and injects them into the DOM. Each fragment can contain its own scoped JavaScript.

### How it works
- You use `nui.enableContentLoading()` which automatically sets up a `page` route type.
- Navigating to `#page=about` fetches `/pages/about.html`.
- If the HTML contains `<script type="nui/page">`, it is extracted and executed once with a scoped `init(element, params)` function.

### Example
```html
<!-- pages/about.html -->
<h1>About Us</h1>
<button class="track-btn">Click Me</button>

<script type="nui/page">
function init(element, params) {
    // Logic is scoped entirely to this fragment
    const btn = element.querySelector('.track-btn');
    btn.addEventListener('click', () => console.log('Clicked on About page'));
    
    // Optional lifecycle hooks
    element.show = () => console.log('About page became visible');
}
</script>
```

### When to use
- Documentation sites, blogs, or content-heavy sites.
- Playgrounds and component libraries (where isolation is a feature).
- When you want to split code automatically without a complex bundler setup.

---

## Pattern 3: The Hybrid Approach

The NUI Router allows you to mix both patterns seamlessly. You can have a centralized app that handles complex features, while using the fragment loader for static content like help pages, documentation, or terms of service.

### How it works
- You use `nui.enableContentLoading()` to handle `#page=...` routes automatically.
- You use `nui.registerFeature()` to handle `#feature=...` routes with centralized logic.

### Example
```javascript
// main.js
import { nui } from './nui.js';

// 1. Centralized logic for the complex app feature
nui.registerFeature('editor', (element, params) => {
    element.innerHTML = '<div id="canvas"></div>';
    const editor = new ComplexEditor(element.querySelector('#canvas'));
    
    element.show = (params) => editor.loadDocument(params.docId);
});

// 2. Enable content loading for static pages (Help, About, etc.)
nui.enableContentLoading({
    container: 'nui-main',
    basePath: '/pages',
    defaultPage: 'home'
});

// Now the app responds to both:
// #feature=editor&docId=123 -> Runs centralized logic
// #page=help/shortcuts      -> Fetches /pages/help/shortcuts.html
```

### When to use
- Almost any real-world application.
- When you want to keep your main JavaScript bundle small by offloading static content to HTML fragments, while keeping core application logic centralized.

---

## Key Takeaways for AI Assistants & Developers

When generating code or architecting for NUI applications:

1. **Do not assume `<script type="nui/page">` is required.** If building an application, default to centralized logic (Pattern 1) unless fragment loading is specifically requested.
2. **The Router is just a visibility toggler.** It creates a wrapper `div`, caches it, and calls `element.show()` / `element.hide()`. How that `div` gets populated (fetch vs. JS generation) is entirely up to the architecture choice.
3. **State lives in the URL.** Regardless of the pattern chosen, the URL hash (`#type=id`) determines *what* is shown, and the search params (`?key=value`) provide the *data* for that view.
