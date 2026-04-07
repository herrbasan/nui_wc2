Based on my analysis, here's the specification for extending `components.json` to eliminate the hardcoded REFERENCE:

---

## Spec: Extended Registry Schema for `components.json`

### New Top-Level Sections to Add

```json
{
  "components": [...],
  "guides": [...],
  
  "reference": {
    "setup": { "minimal": "...", "foucPrevention": "...", "addons": [...] },
    "api": {
      "root": [...],
      "components": [...],
      "utilities": [...]
    },
    "patterns": {
      "dataAction": { "syntax": "...", "description": "..." },
      "router": { "contract": "..." }
    },
    "events": [...]
  }
}
```

---

### 1. `reference.setup` - Setup Boilerplate

```json
"setup": {
  "minimal": {
    "description": "Minimal standalone setup",
    "code": "<link rel=\"stylesheet\" href=\"NUI/css/nui-theme.css\">\n<script type=\"module\" src=\"NUI/nui.js\"><\/script>",
    "lang": "html"
  },
  "foucPrevention": {
    "description": "FOUC Prevention (App Mode)",
    "code": "body { margin: 0; overflow: hidden; }\nnui-app:not(.nui-ready) { display: none; }\nnui-loading:not(.active) { display: none; }",
    "lang": "css"
  },
  "addons": [
    {
      "name": "nui-menu",
      "js": "NUI/lib/modules/nui-menu.js",
      "css": "NUI/css/modules/nui-menu.css"
    },
    {
      "name": "nui-list",
      "js": "NUI/lib/modules/nui-list.js",
      "css": "NUI/css/modules/nui-list.css"
    },
    {
      "name": "nui-markdown",
      "js": "NUI/lib/modules/nui-markdown.js",
      "css": null
    },
    {
      "name": "nui-syntax-highlight",
      "js": "NUI/lib/modules/nui-syntax-highlight.js",
      "css": null
    }
  ]
}
```

---

### 2. `reference.api.root` - Root API (`nui.*`)

```json
"root": [
  {
    "name": "init",
    "signature": "nui.init(options)",
    "description": "Auto-called; initializes library and registers custom elements",
    "params": ["options?"],
    "returns": null,
    "example": "nui.init({ iconSpritePath: '/icons.svg' })"
  },
  {
    "name": "configure",
    "signature": "nui.configure({ iconSpritePath, baseFontSize, animationDuration })",
    "description": "Update configuration after init",
    "params": ["config"],
    "returns": null
  },
  {
    "name": "version",
    "signature": "nui.version",
    "description": "Library version string",
    "type": "property"
  },
  {
    "name": "registerFeature",
    "signature": "nui.registerFeature(name, (container, params) => { ... })",
    "description": "Register a named feature for content routing",
    "params": ["name", "handler"],
    "returns": null
  },
  {
    "name": "registerType",
    "signature": "nui.registerType(type, (element, content) => { ... })",
    "description": "Register a content type handler",
    "params": ["type", "handler"],
    "returns": null
  },
  {
    "name": "createRouter",
    "signature": "nui.createRouter(container, { defaultPage, onNavigate })",
    "description": "Create a router instance for SPA navigation",
    "params": ["container", "options"],
    "returns": "Router"
  },
  {
    "name": "enableContentLoading",
    "signature": "nui.enableContentLoading({ container, navigation, basePath, defaultPage })",
    "description": "Enable hash-based content loading",
    "params": ["options"],
    "returns": null
  }
]
```

---

### 3. `reference.api.components` - Components API (`nui.components.*`)

```json
"components": [
  {
    "namespace": "dialog",
    "type": "ephemeral",
    "description": "Modal and non-modal dialog wrapper, plus system dialog flows",
    "methods": [
      {
        "name": "alert",
        "signature": "await nui.components.dialog.alert(title, message, options?)",
        "description": "Show alert dialog",
        "async": true
      },
      {
        "name": "confirm",
        "signature": "await nui.components.dialog.confirm(title, message, options?)",
        "description": "Show confirmation dialog, returns boolean",
        "async": true,
        "returns": "boolean"
      },
      {
        "name": "prompt",
        "signature": "await nui.components.dialog.prompt(title, message, { fields: [{ id, label, type?, value? }] }, options?)",
        "description": "Show prompt dialog, returns object or null",
        "async": true,
        "returns": "object | null"
      },
      {
        "name": "page",
        "signature": "await nui.components.dialog.page(title, subtitle?, { contentScroll, buttons: [{ label, type, value }] })",
        "description": "Show custom page dialog",
        "async": true,
        "returns": "{ dialog, main }"
      }
    ],
    "options": {
      "placement": ["top", "center", "bottom"],
      "target": "Element",
      "modal": "boolean",
      "blocking": "boolean",
      "classes": "string[]"
    }
  },
  {
    "namespace": "banner",
    "type": "ephemeral",
    "description": "Edge-anchored notification surface",
    "methods": [
      {
        "name": "show",
        "signature": "nui.components.banner.show({ content, placement: 'top'|'bottom', priority: 'info'|'alert', autoClose: ms })",
        "returns": "controller"
      },
      {
        "name": "hide",
        "signature": "nui.components.banner.hide(controller)"
      },
      {
        "name": "hideAll",
        "signature": "nui.components.banner.hideAll()"
      }
    ]
  },
  {
    "namespace": "linkList",
    "type": "persistent",
    "description": "Hierarchical navigation list with fold and tree modes",
    "methods": [
      {
        "name": "create",
        "signature": "nui.components.linkList.create(data, { mode: 'fold'|'tree' })",
        "description": "Create navigation list from data",
        "returns": "Element",
        "dataFormat": "[{ label, icon?, href?, items?: [...] }, { separator: true }]"
      },
      {
        "name": "setActive",
        "signature": "nui.components.linkList.setActive(selector)"
      },
      {
        "name": "getActive",
        "signature": "nui.components.linkList.getActive()"
      },
      {
        "name": "clearActive",
        "signature": "nui.components.linkList.clearActive()"
      }
    ]
  },
  {
    "namespace": "mediaPlayer",
    "type": "persistent",
    "experimental": true,
    "description": "Video/audio player component",
    "methods": [
      {
        "name": "create",
        "signature": "nui.components.mediaPlayer.create(target, { url, type: 'video'|'audio', poster?, pauseOthers?, attributes?, playerAttributes? })"
      }
    ]
  }
]
```

---

### 4. `reference.api.utilities` - Utilities (`nui.util.*`)

```json
"utilities": [
  {
    "name": "createElement",
    "signature": "nui.util.createElement(tag, { class, attrs, data, events, content, target })",
    "category": "dom"
  },
  {
    "name": "createSvgElement",
    "signature": "nui.util.createSvgElement(tag, attrs, children)",
    "category": "dom"
  },
  {
    "name": "enableDrag",
    "signature": "nui.util.enableDrag(element, { onDragStart, onDrag, onDragEnd })",
    "description": "Returns cleanup function",
    "returns": "function"
  },
  {
    "name": "storage",
    "type": "namespace",
    "category": "storage",
    "methods": [
      {
        "name": "get",
        "signature": "nui.util.storage.get({ name })"
      },
      {
        "name": "set",
        "signature": "nui.util.storage.set({ name, value, ttl })",
        "note": "ttl: '30d', '7d', '1h'"
      },
      {
        "name": "remove",
        "signature": "nui.util.storage.remove({ name })"
      }
    ]
  },
  {
    "name": "sortByKey",
    "signature": "nui.util.sortByKey(array, propertyPath, numeric?)",
    "description": "Sort array by nested property path",
    "category": "array"
  },
  {
    "name": "filter",
    "signature": "nui.util.filter({ data, search, prop[] })",
    "category": "array"
  },
  {
    "name": "detectEnv",
    "signature": "nui.util.detectEnv()",
    "returns": "{ isTouch, isMac, isIOS, isSafari, isFF }",
    "category": "env"
  },
  {
    "name": "markdownToHtml",
    "signature": "nui.util.markdownToHtml(md)",
    "description": "Lightweight markdown to HTML string",
    "category": "text"
  }
]
```

---

### 5. `reference.patterns` - Patterns & Contracts

```json
"patterns": {
  "dataAction": {
    "syntax": "data-action=\"name[:param][@targetSelector]\"",
    "description": "Declarative action binding",
    "events": {
      "generic": "nui-action",
      "specific": "nui-action-${name}"
    },
    "detail": "{ name, param, target, originalEvent }",
    "bubbles": true
  },
  "router": {
    "hashFormat": ["#page=path/to/page", "#feature=featureName"],
    "caching": "Pages cached: init() runs ONCE, show()/hide() on navigation",
    "scopeRule": "Scope DOM to element (page wrapper), never document"
  }
}
```

---

### 6. `reference.events` - Component Events Table

```json
"events": [
  {
    "component": "nui-dialog",
    "events": [
      { "name": "nui-dialog-open", "detail": "{ returnValue }" },
      { "name": "nui-dialog-close", "detail": "{ returnValue }" },
      { "name": "nui-dialog-cancel", "detail": "{ returnValue }" }
    ]
  },
  {
    "component": "nui-tabs",
    "events": [
      { "name": "nui-tabs-change", "detail": "{ tab, panel }" }
    ]
  },
  {
    "component": "nui-select",
    "events": [
      { "name": "nui-select-change", "detail": "{ value }" }
    ]
  },
  {
    "component": "nui-sortable",
    "events": [
      { "name": "nui-sort-reorder", "detail": "{ from, to }" }
    ]
  },
  {
    "component": "nui-accordion",
    "events": [
      { "name": "toggle", "note": "native event" }
    ]
  },
  {
    "component": "nui-link-list",
    "events": [
      { "name": "nui-link-click", "detail": "{ href, label }" }
    ]
  }
]
```

---

## Agent Code Changes Needed

Once the registry has this data, the `nui_get_reference()` function becomes:

```javascript
export async function nui_get_reference() {
  const reg = loadRegistry();
  if (!reg?.reference) return errorResponse('Reference data not available in registry.');
  
  const lines = [];
  
  // 1. Setup
  lines.push('## Setup\n');
  lines.push(`### Minimal (${reg.reference.setup.minimal.description})`);
  lines.push('```' + reg.reference.setup.minimal.lang + '\n' + reg.reference.setup.minimal.code + '\n```\n');
  
  // 2. FOUC Prevention
  lines.push(`### ${reg.reference.setup.foucPrevention.description}`);
  lines.push('```' + reg.reference.setup.foucPrevention.lang + '\n' + reg.reference.setup.foucPrevention.code + '\n```\n');
  
  // 3. Addons table
  lines.push('### Addon Imports');
  lines.push('| Addon | JS | CSS |');
  lines.push('|-------|----|-----|');
  for (const addon of reg.reference.setup.addons) {
    lines.push(`| ${addon.name} | ${addon.js || '—'} | ${addon.css || '—'} |`);
  }
  lines.push('');
  
  // 4. Root API
  lines.push('## Root API (`nui.*`)\n```js');
  for (const item of reg.reference.api.root) {
    lines.push(item.signature + (item.description ? ` // ${item.description}` : ''));
  }
  lines.push('```\n');
  
  // 5. Components API
  lines.push('## Components API (`nui.components.*`)');
  for (const comp of reg.reference.api.components) {
    lines.push(`\n### ${comp.namespace} (${comp.type}${comp.experimental ? ', experimental' : ''})`);
    lines.push(comp.description);
    lines.push('```js');
    for (const method of comp.methods) {
      lines.push(method.signature + (method.async ? ' // async' : ''));
    }
    lines.push('```');
  }
  
  // 6. Utilities
  lines.push('\n## Utilities (`nui.util.*`)\n```js');
  for (const util of reg.reference.api.utilities) {
    if (util.type === 'namespace') {
      for (const method of util.methods) {
        lines.push(method.signature + (method.note ? ` // ${method.note}` : ''));
      }
    } else {
      lines.push(util.signature);
    }
  }
  lines.push('```\n');
  
  // 7. Patterns
  lines.push('## data-action Syntax');
  lines.push('```');
  lines.push(reg.reference.patterns.dataAction.syntax);
  lines.push('```');
  lines.push(reg.reference.patterns.dataAction.description);
  lines.push(`Dispatches: \`${reg.reference.patterns.dataAction.events.generic}\` (generic) + \`${reg.reference.patterns.dataAction.events.specific}\` (specific)`);
  lines.push(`detail: ${JSON.stringify(reg.reference.patterns.dataAction.detail)}`);
  lines.push(`bubbles: ${reg.reference.patterns.dataAction.bubbles}\n`);
  
  lines.push('## Router Contract');
  for (const rule of reg.reference.patterns.router.rules || [reg.reference.patterns.router.caching, reg.reference.patterns.router.scopeRule]) {
    lines.push(`- ${rule}`);
  }
  lines.push('');
  
  // 8. Events table
  lines.push('## Key Component Events\n');
  lines.push('| Component | Events | Detail |');
  lines.push('|-----------|--------|--------|');
  for (const item of reg.reference.events) {
    const events = item.events.map(e => e.name).join(', ');
    const detail = item.events[0].detail || item.events[0].note || '';
    lines.push(`| ${item.component} | ${events} | ${detail} |`);
  }
  
  return textResponse(lines.join('\n'));
}
```

---

## Summary

| Current Hardcoded | New Registry Section |
|-------------------|----------------------|
| Setup boilerplate | `reference.setup` |
| Root API | `reference.api.root` |
| Components API | `reference.api.components` |
| Utilities | `reference.api.utilities` |
| data-action syntax | `reference.patterns.dataAction` |
| Router contract | `reference.patterns.router` |
| Events table | `reference.events` |

The agent code becomes ~20 lines of formatting logic instead of 100+ lines of hardcoded markdown. All data lives in the library's `components.json`, keeping everything in sync.