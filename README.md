# NUI - High-Performance, Accessible UI Component Library

> **🤖 Ground Truth for AI Assistants:**
> For the core philosophy, AX principles, and architecture guide, please read:
> 👉 **[`documentation/DOCUMENTATION.md`](documentation/DOCUMENTATION.md)**
>
> For the machine-readable component registry and usage guides, see:
> 👉 **[`documentation/components.json`](documentation/components.json)**

---

## The Pulse: Updates & Breaking Changes

> ⚠️ **Early Development** — API may change.

### Latest Changes

> **Breaking Change (2026-04-10):** Router API renamed: `nui.enableContentLoading()` → `nui.setupRouter()`.
>
> **Breaking Change (2026-04-08):** `nui-code` and `nui-markdown` are now core components.
>
> **Breaking Change (2026-04-08):** Sidebar API refactored. `sidenav-*` -> `sidebar-*`.
>
> 📋 **[Migration Guide](./docs/MIGRATION.md)** — Detailed upgrade instructions.

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

- **[📖 Live Playground & Interactive Docs](https://herrbasan.github.io/nui_wc2/)**
- **[Architectural Ground Truth](documentation/DOCUMENTATION.md)**
- **[Component Registry (JSON)](documentation/components.json)**

---

## License

MIT
