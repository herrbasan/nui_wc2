# NUI - High-Performance, Accessible UI Component Library

**[Explore the Playground →](https://herrbasan.github.io/nui_wc2/)** — Interactive demos, API docs, and working examples for every component.

---

> **🤖 AI Assistants — Start Here:**
> 👉 **[`LLM-CHEATSHEET.md`](LLM-CHEATSHEET.md)** — Every component's exact HTML structure, all built-in `data-action` handlers, addon imports, and public API in one file. **Read this first.**
>
> For the core philosophy, AX principles, and architecture guide:
> 👉 **[`documentation/DOCUMENTATION.md`](documentation/DOCUMENTATION.md)**
>
> For the machine-readable component registry:
> 👉 **[`documentation/components.json`](documentation/components.json)**

---

## Quick Start

### 1. Use the Boilerplate (Recommended)
Copy the `nui-boilerplate` folder to your project. It contains a pre-configured shell, theme, and router.

### 2. Manual Installation
```html
<link rel="stylesheet" href="NUI/css/nui-theme.css">
<script type="module" src="NUI/nui.js"></script>

<nui-button>
    <button type="button">Click Me</button>
</nui-button>
```

---

## Documentation

| Resource | Description |
|----------|-------------|
| **[🤖 LLM Cheatsheet](LLM-CHEATSHEET.md)** | **AI-first:** exact HTML structures, all data-actions, addon imports, WRONG vs CORRECT. |
| **[Live Playground](https://herrbasan.github.io/nui_wc2/)** | Interactive demos for every component — the best way to explore NUI. |
| **[Architecture Guide](documentation/DOCUMENTATION.md)** | Core philosophy, navigation tree, and reading order for the full docs. |
| **[Component Registry](documentation/components.json)** | Machine-readable manifest of all components, events, imports, and doc paths. |
| **[Migration Guide](docs/MIGRATION.md)** | Upgrade instructions for breaking changes. |

---

## The Pulse: Updates & Breaking Changes

> ⚠️ **Early Development** — API may change.

> **Breaking Change (2026-05-19):** Added `nui.ready()` Promise for init-completion. Added console warnings for missing nui-app children, unregistered addons, and CSP eval blocking. See LLM-CHEATSHEET.md.
>
> **Breaking Change (2026-04-10):** Router API renamed: `nui.enableContentLoading()` → `nui.setupRouter()`.
>
> **Breaking Change (2026-04-08):** `nui-code` and `nui-markdown` are now core components.
>
> **Breaking Change (2026-04-08):** Sidebar API refactored. `sidenav-*` -> `sidebar-*`.

---

## License

MIT