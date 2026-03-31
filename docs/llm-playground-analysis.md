# NUI Playground & API: LLM-Friendliness Analysis

**Date:** March 30, 2026  
**Status:** Analysis & Recommendations

## Current Strengths

The Playground is already one of the better-documented component libraries for LLM consumption:

- **LLM Orientation Guide** (`Playground/README.md`) explicitly tells agents the reading order (Agents.md → architecture-patterns → api-structure → declarative-actions) and highlights the two usage modes (standalone vs SPA) and two component patterns (declarative HTML-first vs data-driven JS factories).
- **Clear API tiers**: `nui.*` (core), `nui.components.*` (factories), `nui.util.*` (helpers including `createElement`).
- **Consistent demo page contract** with `<script type="nui/page">`, `init()`/`show()`/`hide()` lifecycle, and `data-action` delegation.
- **"Documentation by Example"** — every component page is both a live demo and specification.
- Strong emphasis on zero custom CSS (only CSS variables from `nui-theme.css`), semantic HTML, and the thin custom-element + pure-function pattern.

## Observed Friction Points

Despite the good foundation, the following issues frequently appear when LLMs work with NUI:

1. **Pattern Invention**: Component pages show only the exact HTML pattern. LLMs extrapolate incorrectly (extra wrappers, invented attributes, wrong child elements).
2. **Styling Violations**: Demos do not repeatedly enforce "do not add any `<style>` or inline styles". Agents frequently introduce custom colors/spacing.
3. **Declarative vs Programmatic Confusion**: The distinction between declarative markup (`data-action`, `data-tab`, etc.) and programmatic APIs (`nui.components.*`, `nui.util.createElement`, `nui.registerFeature`) is explained but not presented as a clear decision tree.
4. **Under-use of Utilities**: `nui.util.createElement` is documented in `utilities.html` but rarely demonstrated in individual component pages. LLMs default to raw `document.createElement`.
5. **Router/Page Script Subtleties**: The "fragments are cached, `init()` runs once" contract is easy to miss. Agents often attach global listeners instead of scoping to the page wrapper.
6. **Scattered Guidance**: LLM-specific advice lives across `Playground/README.md`, `Agents.md`, `docs/playground-component-quickstart.md`, and various HTML fragments.

## Recommendations

### 1. Structural Improvements to Playground
- **Consolidate into a single LLM Guide per page** (replaces quickstart sections and redundant docs to avoid context bloat for <256K models). Use a small trigger button in the header that opens an `nui-overlay`. The guide contains the authoritative patterns, rules, and examples.
  - Keep the main page HTML lean.
  - Clearly label for LLMs (`data-llm-guide="true"`).
  - The same structured content feeds both the overlay and MCP tools.
  ```html
  <header>
    <h1>Component Name</h1>
    <button data-action="show-llm-guide" style="float:right">🤖 LLM Guide</button>
  </header>

  <nui-overlay id="llm-guide-overlay">
    <div id="llm-guide" data-llm-guide="true">
      <!-- Concise structured guidance here -->
    </div>
  </nui-overlay>
  ```
- Create a **"Patterns Catalog"** page (`pages/documentation/patterns.html`) with copy-paste templates for the 10 most common tasks (shared with guides).
- Add a visual decision tree (Mermaid or ASCII) in `architecture-patterns.html` and `api-structure.html`.

### 2. API & Code Improvements
- Make `nui.util.createElement` more prominent (consider a convenience alias on the root while keeping the full path).
- Expand JS factory coverage for more components.
- Add more explicit "LLM-preferred pattern" comments in `NUI/nui.js` using the existing section markers.

### 3. Documentation Enhancements
- **Parsable LLM Guides in Markdown**: Replace HTML-based LLM sections with structured Markdown. Use `<script type="text/markdown" id="llm-guide" data-component="component-name">` at the top of each component page source (first content LLMs see). The `data-component` attribute is strictly required so that it can be parsed by automated scripts or MCP tools. Render this using `nui.util.markdownToHtml(md)` into a collapsible details block.
- Standard structure for all guides:
  - `# LLM Guide: ComponentName`
  - `> **Global Note:** See Playground/README.md for global constraints (no custom CSS, use provided utilities).` *(Keeps a reference to global rules without bloating context).*
  - `## Strict DOM Structure` *(Crucial to stop LLMs from inventing tag names or omitting structural wrappers like `<nui-button>`). Explain exactly what the parent/child structure MUST look like.*
  - `## Critical Rules` (must-follow list)
  - `## Usage Modes` (declarative vs programmatic)
  - `## Examples` (with code blocks)
  - `## API / Common Operations`
  - `## Anti-Patterns` *(Explicitly list typical LLM mistakes, e.g., "Do not use a raw `<button>` here without `<nui-button>` wrapper".)*
- Consolidate other LLM advice into `Playground/README.md` and per-page guides.
- Include "Bad vs Good" examples in every component page.
- Update `docs/playground-component-quickstart.md` to be more prescriptive.

### 4. Long-term Ideas
- **MCP Orchestrator Tools** (your suggestion): Expose structured tools such as `mcp_nui_components_list` and `mcp_nui_component_docs:{component}`. 

  The content returned by the MCP tools should be **the same source of truth** used for the LLM Guide overlays on the Playground pages. This ensures consistency between human docs and agent tools.

  **Example structure** (shared between page guides and MCP):

  ```js
  {
    tag: "nui-input",
    preferredPattern: "Declarative: <nui-input><input ...></nui-input>",
    forbidden: ["custom <style>", "document.createElement", "global listeners"],
    usageNotes: "Use nui.util.createElement for dynamic fields. Scope to page wrapper.",
    exampleMarkup: "...",
    decisionTree: "..."
  }
  ```

  A central `llm-patterns.js` or JSON manifest can feed both the page overlays and the MCP responses.

- "NUI Agent Mode" — optional script that logs common violations (extra styles, wrong element creation, global listeners).
- Standardized component template with heavy LLM-targeted comments.
- Improve `nui.d.ts` with usage-pattern JSDoc.

## Summary

The foundation is strong and already more LLM-aware than most libraries. The primary gap is **repetitive, loud, opinionated guardrails** that appear on *every* page rather than only in the orientation guide.

Making the correct patterns unavoidable — even when an agent only reads a single component file — will significantly reduce friction.

**Priority Components for LLM Guides & MCP Tools**
Focus first on the most crucial pieces for real apps (nui-list is the star — it is often the main view, handling huge datasets with virtual scrolling, filters, sort, and search):

- `nui-list` (virtualized, high-performance list — top priority)
- App structure (`nui-app`, `nui-app-header`, `nui-sidebar`, `nui-content`, `nui-main`, `nui-layout`)
- `nui-select`
- `nui-dialog` (especially `mode="page"` for complex modals)

**Next Steps (optional):**
- Implement the triggerable LLM Guide overlay on the priority component pages above.
- Create shared `llm-patterns.js` / manifest that feeds both the overlays and MCP tools.
- Create the Patterns Catalog page.
- Add decision trees and bad/good examples.

## Progress Tracking: LLM Guides

### ✅ Components with LLM Guides Added:
1. `accordion.html` (`nui-accordion`)
2. `app-header.html` (`nui-app-header`)
3. `app-layout.html` (`nui-app`, `nui-sidebar`, `nui-content`)
4. `badge.html` (`nui-badge`, `data-badge`)
5. `banner.html` (`nui-banner`)
6. `button.html` (`nui-button`, `nui-button-container`)
7. `card.html` (`nui-card`)
8. `dialog.html` (`nui-dialog`)
9. `icon.html` (`nui-icon`)
10. `inputs.html` (`nui-input`, `nui-input-group`, `nui-textarea`, `nui-checkbox`, `nui-radio`)
11. `layout.html` (`nui-layout`)
12. `link-list.html` (`nui-link-list`)
13. `list.html` (`nui-list`)
14. `select.html` (`nui-select`)
15. `tabs.html` (`nui-tabs`)
16. `table.html` (`nui-table`)
17. `slider.html` (`nui-slider`)
18. `tag-input.html` (`nui-tag-input`)
19. `tooltip.html` (`nui-tooltip`)
20. `overlay.html` (`nui-overlay`)
21. `progress.html` (`nui-progress`)
22. `skip-links.html` (`nui-skip-links`)
23. `sortable.html` (`nui-sortable`)
24. `code.html` (`nui-code`)
25. `storage.html` (`nui.util.storage`)
26. `menu.html` (`nui-menu`)

### ✅ All major components now have LLM Guides (including lightbox, rich-text, media-player, code-editor).

**Status:** LLM-specific guidance added across the entire component set to prevent pattern hallucination from other libraries.

This file is located at `docs/llm-playground-analysis.md`.
