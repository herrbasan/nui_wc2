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
    - Create `documentation/components/[name].md` (or `addons/`).
    - **Read ALL Context:** Read the existing LLM Guide from the `<script type="text/markdown">` block in `Playground/pages/.../[name].html`. **CRUCIALLY**, you must also locate and read the component's actual source code (e.g., `NUI/nui.js` or `NUI/lib/modules/...`) and styles (`NUI/css/...`).
    - **Document the API:** You must document the methods, properties, and events the component exposes. Never assume the existing guide is complete. Look at the source code to find all programmatic capabilities.
    - **Document Patterns:** Clearly document both **declarative patterns** (HTML usage, attributes, `data-action`) and **programmatic patterns** (JavaScript instantiation, method calls, event listeners).
    - Synthesize all of this into a single, comprehensive Markdown document that serves as the total ground truth for the component (philosophy, API, accessibility, variants, and code examples).
2. **Setup the Markdown Fetcher:**
    - At the top of the `[name].html` page, add: `<nui-markdown src="../documentation/components/[name].md"></nui-markdown>` to render the docs for human users. *(Note: The path is relative to `Playground/index.html`, so it is `../documentation/`, not `../../`)*
3. **Refine the HTML Demo Page:**
    - **Goal:** The HTML file's primary purpose is to be an excellent interactive sandbox. Put a full-featured, interactive example of the component front and center at the top of the page.
    - Remove the old `<script type="text/markdown">` block and its `<details>` wrapper, as its contents are now in the dedicated `.md` file.
    - It is perfectly fine (and encouraged) to keep `<p>`, `<h2>`, and `<nui-code>` elements if they provide context for the live demos. The goal isn't to ruthlessly strip HTML, but to ensure the page flows beautifully as a functional showcase.
    - **CRITICAL:** Keep the `<script type="application/ld+json">` metadata block at the top of the HTML file so `update-docs.js` can still find the component's registry data.
    - **CRITICAL:** For Meta-Docs (General Guides), you must also keep the HTML shell in `Playground/pages/documentation/` to hold the JSON-LD API definitions, using `<nui-markdown src="...">` to render the prose.

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
- [ ] Architecture / DOM First (`documentation/guides/architecture.md`)
- [ ] Accessibility (`documentation/guides/accessibility.md`)
- [ ] Routing & SPA (`documentation/guides/routing.md`)
- [ ] Utilities & Styling (`documentation/guides/styling.md`)

## Phase 3: Components Migration
*(Track progress here across sessions)*
- [x] accordion
- [x] app-header
- [ ] badge
- [ ] banner
- [ ] button
- [ ] checkbox
- [ ] code
- [ ] context-menu
- [ ] dialog
- [ ] grid
- [ ] icon
- [ ] input
- [ ] input-group
- [ ] markdown
- [ ] popover
- [ ] radio
- [ ] select
- [ ] tabs

## Phase 4: Addons Migration
- [ ] code-editor
- [ ] lightbox
- [ ] list
- [ ] media-player
- [ ] monitor
- [ ] rich-text
- [ ] wizard
