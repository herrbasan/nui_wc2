# NUI Current Tasks & Progress

## Session: 2026-04-08

### Completed

#### 1. Extraction-Based Boilerplate Generator (`nui-create-app.js`)

Completely rewrote the generator to extract working examples from the Playground:

```bash
node nui-create-app.js my-app --with-dialog --with-select
```

**Key improvements:**
- App shell extracted directly from `Playground/index.html` — always current
- Component pages copied from `Playground/pages/components/` with LLM guides intact
- Auto-copies NUI library if available
- Generates navigation based on selected components
- Web UI available via `--ui` flag

**Files modified:**
- `nui-create-app.js` - Complete rewrite

#### 2. Core Component Additions

**Moved to core (`NUI/nui.js`):**
- `nui-markdown` - Markdown rendering component with streaming support
- `nui-code` - Already in core, confirmed working

**Files modified:**
- `NUI/nui.js` - Added `markdownToHtml()` and `NuiMarkdown` class

**Archived:**
- `NUI/lib/modules/nui-markdown.js` → `_Archive/nui-markdown.js`

#### 3. Playground Navigation Restructure

Reorganized component sections for better balance:

| Section | Items |
|---------|-------|
| Layout & Structure | 4 |
| Forms & Inputs | 6 |
| Content & Code | 6 (Badge, Card, Code, Icon, Markdown, Table) |
| Structure & Navigation | 4 (Link List, Tabs, Accordion, Sortable) |
| Overlays & Feedback | 5 (Dialog, Overlay, Banner, Progress, Tooltip) |

**Moves:**
- `nui-markdown`: Addons → Content & Code
- `nui-code`: Addons → Content & Code  
- `nui-icon`: Elements → Content & Code
- `nui-link-list`: Navigation alone → merged with Tabs/Accordion/Sortable
- Storage utility: Component page removed, integrated into Documentation/Utilities

**Files modified:**
- `Playground/js/main.js` - Navigation restructure
- `Playground/pages/documentation/utilities.html` - Added storage documentation
- `Playground/pages/components/markdown.html` - Moved from addons
- `Playground/pages/components/code.html` - Moved from addons
- `_Archive/storage-component.html` - Old component page archived

#### 4. Declarative Actions Enhancement

Added `nui.registerAction()` API for programmatic action registration:

```javascript
nui.registerAction('save', (target, element, event, param) => {
    target.classList.add('saving');
    return true; // Stop propagation
});
```

**Files modified:**
- `NUI/nui.js` - Added `registeredActions` Map and `registerAction()` method
- `Playground/pages/documentation/declarative-actions.html` - Added section on programmatic registration

#### 5. Documentation Updates

- Updated `Playground/pages/addons/markdown.html` - LLM guide reflects core status
- Updated `docs/nui_mcp_tools.md` - Marked nui-markdown as core
- Updated `README.md` - Added generator quick start
- Updated `README.md` - Added concise "Why NUI?" intro explaining AX concept, followed by Core Principles table
- Updated `AGENTS.md` and `Playground/pages/documentation/introduction.html` - Simplified AX description

#### 6. Component Registry — Single Source of Truth (`docs/components.json`)

> **This is now the canonical reference for all NUI tooling.** Both MCP tools and the boilerplate generator consume this file. When components change, update the JSON — everything else follows.

Extended `components.json` with comprehensive metadata:

**`components` array:** All components with name, category, description, page path, innerElement, events, and imports

**`guides` array:** Documentation pages and their descriptions

**New `reference` section:**
- `setup` - Minimal setup code, FOUC prevention CSS, addon import table
- `api` - Root API (`nui.*`), Components API (`nui.components.*`), Utilities (`nui.util.*`)
- `patterns` - data-action syntax and events, router contract rules
- `events` - Component events reference table

**Updated boilerplate script (`nui-create-app.js`):**
- Loads all component data from `components.json` at runtime
- Dynamically derives available components from registry
- Generates addon import sections in README based on selected components
- Future-proof: adding/removing components in JSON automatically updates the generator

**Documentation updates:**
- Added prominent references to `components.json` in:
  - `AGENTS.md` (Core Components section)
  - `README.md` (Components section)
  - `Playground/pages/documentation/getting-started.html` (Project Structure section)

**Files modified:**
- `docs/components.json` - Added comprehensive reference section
- `nui-create-app.js` - Now consumes registry data instead of hardcoded arrays
- `AGENTS.md`, `README.md`, `getting-started.html` - Added registry references

**Bug fixes:**
- Fixed right sidebar toggle in generated apps: changed `toggleRightSidebar()` to `toggleSideNav('right')`
- Fixed right sidebar breakpoint: changed `nui-vars-sidebar-right_force-breakpoint="none"` to `"75rem"` so it can actually be toggled
- Fixed action handler: the `name` in event detail doesn't include the param (split by ':'), so consolidated toggle-sidebar cases and pass `param` to toggleSideNav

---

## Deferred / Pinned

### Wizard Component
Multi-step form/dialog pattern with:
- Next/prev navigation
- Step indicator ("1 of 3")
- Busy state per step
- Mode: `required` (sequential) vs free navigation

**Note:** Pin this for later. Would be perfect for the generator web UI.

### State Machine Enhancements
Extend declarative actions with optional state tracking while keeping current simplicity as default.

**Note:** User sees opportunity but wants to pin for now.

---

## Active Considerations

### Suggested Documentation Improvements

1. **Design Philosophy Section** - Capture reasoning behind patterns explicitly
2. **Router naming** - `enableContentLoading` could be clearer
3. **Visual cheatsheet** - All icons, CSS variables, common patterns

See `docs/notes.md` for full list of future ideas.

---

## Key Insights from Session

1. **The Playground IS the documentation** — Copying it keeps the generator current automatically
2. **Component organization matters** — Balanced sections (4-6 items each) feel better than one crowded section
3. **State lives in the HTML** — The declarative action pattern embodies this perfectly
4. **Simplicity scales down** — As cognitive load increases, simple patterns protect you

---

## Original Context

This document evolved from `docs/nui_feedback.md` which captured initial impressions and philosophy. The "Follow-up: What We Built" section from that document has been incorporated above.

**Archived feedback document:** Available in git history as `docs/nui_feedback.md`
