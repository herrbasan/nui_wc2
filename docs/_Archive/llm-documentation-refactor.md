# LLM-First Documentation Refactor Plan

## Goal
Transition from "living documentation" (where LLM guides and API docs are embedded in Playground HTML via script tags) to a traditional, LLM-native Markdown structure. 

The `/documentation/` folder will become the absolute Ground Truth API contract for AI agents. The `Playground/` will become pure interactive execution environments, rendering the markdown for humans via `<nui-markdown src="...">` while hosting the live DOM examples.

## Why?
1. **LLM Native Readiness:** AI agents parse pure Markdown flawlessly. Embedding Markdown inside custom HTML `<script>` tags creates escaping nightmares (like the `<\/script>` bug) and wastes context tokens on DOM structural overhead.
2. **Defeating "Statistical Gravity" (The AX Vision):** LLMs are trained on billions of lines of React, Vue, and Shadow DOM. Their statistical default is to invent state managers and treat components as black boxes. By moving the pure API contracts into dense, JSON-indexed Markdown (`/documentation/`), we inject the *Agent Experience (AX)* rules (Light DOM, declarative Vanilla JS, native event bubbling) directly into the context window, aggressively overriding the LLM's framework biases.
3. **Separation of Concerns:** Playground HTML should just be execution/demo sandboxes. `documentation/*.md` should be the pure API definition.
4. **Token Efficiency:** Pure Markdown is dense, semantic, and exactly what LLMs are trained to consume.

## Target Structure
```text
nui_wc2/
├── documentation/
│   ├── components.json          # Index mapping for AI router (built by script)
│   ├── README.md                # Entry point
│   ├── guides/                  # Meta documentation concepts
│   │   ├── getting-started.md
│   │   ├── architecture.md
│   │   ├── accessibility.md
│   │   └── ...
│   ├── components/              # Core NUI elements
│   │   ├── accordion.md
│   │   ├── button.md
│   │   └── ...
│   └── addons/                  # Complex modules
│       ├── wizard.md
│       ├── code-editor.md
│       └── ...
└── Playground/
    └── pages/                   # Pure HTML interactive demos
        ├── components/
        └── addons/
```

## The Role of `components.json`
Currently, `components.json` holds all the metadata *and* the massive `llmGuide` string for every component. 

In this refactor, `components.json` becomes a lightweight **Index/Manifest** for the LLM. It ties the whole system together without bloating the context window.
- The LLM gets instructed (via `Agents.md`) to read `components.json` as the source of truth for the library's registry.
- `components.json` lists every component, its metadata (events, imports), and **paths** to its documentation and demo.
- Example entry:
  ```json
  {
    "name": "nui-wizard",
    "group": "addons",
    "docPath": "documentation/addons/wizard.md",
    "demoPath": "Playground/pages/addons/wizard.html",
    "events": ["nui-wizard-before-next", "..."],
    "imports": { "js": "NUI/lib/modules/nui-wizard.js" }
  }
  ```
The LLM searches this JSON, finds the `docPath` for the component it needs, and then reads that specific `.md` file for the deep-dive API contract.

## Playbook: How to migrate a single component (For AI Agents)
When a new AI session picks up a component to migrate, follow this exact sequence:

1. **Extract & Synthesize:**
    - **Extract & Synthesize:** Create `documentation/components/[name].md` (or `addons/`).
    - **Read ALL Context:** Read the existing LLM Guide from the `<script type="text/markdown">` block in `Playground/pages/.../[name].html`. **CRUCIALLY**, you must also locate and read the component's actual source code (e.g., `NUI/nui.js` or `NUI/lib/modules/...`) and styles (`NUI/css/...`).
    - **Structure the Documentation:** Model your markdown strictly on the structure and formatting of `accordion.md`. Your file should predictably contain sections for Design Philosophy, Declarative Usage, Attributes, Class Variants, and Programmatic Usage (Methods, Action Delegates, Events).
    - **Document the API:** You must document the methods, attributes, properties, and events the component exposes in explicit markdown tables. Look at the source code to find all capabilities.
    - **Document Patterns & Styling:** Clearly document declarative patterns (HTML usage, attributes, `data-action`), programmatic patterns (JavaScript instantiation, method calls), and critical styling variants.
    - Synthesize all of this into a single, comprehensive Markdown document that serves as the total ground truth for the component.
2. **Setup the Markdown Fetcher:**
    - Place `<nui-markdown src="../documentation/components/[name].md"></nui-markdown>` inside a `<details>` block.
    - **CRITICAL PLACEMENT**: The `<details class="collapsible-section collapsible-section--spaced">...<nui-markdown>...</details>` block MUST be placed exactly between the `<script type="application/ld+json">` metadata block and the `<header>` element at the top of the HTML file.
3. **Refine the HTML Demo Page:**
    - **Goal:** The HTML file's primary purpose is to be an excellent interactive sandbox. Place a full-featured, interactive "hero" example of the component front and center.
    - Remove the old `<script type="text/markdown">` bloat.
    - **CRITICAL:** Keep the `<script type="application/ld+json">` metadata block at the very top of the HTML file, followed directly by the `<details>` block for the LLM guide, and then the `<header>`.

---

## Phase 1: Foundation Setup (Next Steps)
*(To be completed first before migrating content)*
- [x] **Create Folders**: Create `documentation/guides`, `documentation/components`, `documentation/addons`.
- [x] **NuiMarkdown Fix**: Ensure `<nui-markdown>` component in `NUI/nui.js` safely fetches and renders external `.md` files via `src` attribute. *(Check if previous async fetch code is intact).*
- [x] **Doc Generator Script**: Refactor `scripts/update-docs.js`. Instead of scraping `<nui-markdown id="llm-guide">` from the HTML, make it read the metadata and output a lightweight `components.json` that replaces the raw `llmGuide` string with `docPath` pointing to the new `.md` files. This keeps the index small and fast for LLMs to search.
- [x] **MCP Server Sync**: Ensure any local MCP servers (like `_Archive/mcp-server.js` or global tools) are updated to read the `docPath` from `components.json` instead of scraping HTML for `<script type="text/markdown">`.
- [x] **Update Agents.md**: Remove the confusing rules about escaping `</script>` tags, and instruct the LLM to use the `.md` files in `/documentation` as the ground truth.

## Phase 2: Meta-Docs Migration
*(General concepts that apply to the whole library)*
- [x] Getting Started (`documentation/guides/getting-started.md`)
- [x] Architecture / DOM First (`documentation/guides/architecture-patterns.md`)
- [x] Accessibility (`documentation/guides/accessibility.md`)
- [x] Routing & SPA (`documentation/guides/api-structure.md` and `declarative-actions.md`)
- [x] Utilities & Styling (`documentation/guides/utilities.md`)

## Phase 3: Components Migration
*(Track progress here across sessions)*
- [x] accordion
- [x] app-header
- [x] app-layout
- [x] badge
- [x] banner
- [x] button
- [x] card
- [x] code
- [x] dialog
- [x] dropzone
- [x] icon
- [x] input
- [x] layout
- [x] link-list
- [x] markdown
- [x] overlay
- [x] progress
- [x] select
- [x] skip-links
- [x] slider
- [x] sortable
- [x] table
- [x] tabs
- [x] tag-input
- [x] tooltip

## Phase 4: Addons Migration
- [x] app-window
- [x] code-editor
- [x] context-menu
- [x] lightbox
- [x] list
- [x] media-player
- [x] menu
- [x] rich-text
- [x] wizard
