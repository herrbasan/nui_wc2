# Development Plan: AX Documentation

**Status:** Draft - Ready for implementation  
**Date:** 2026-04-11  
**Purpose:** Proof of concept for AI-First Design (AX over DX)

---

## The Thesis: AX vs DX

NUI explores a hypothesis: **AI Experience (AX) can and should diverge from Developer Experience (DX).**

Thirty-year-old software — kernels, databases, compilers — is often better structured and more optimized than what we build today. The "improvements" we made for human developers (abstractions, frameworks, visual tools) introduced complexity without proportional gains. The DX industry optimized for human cognitive limitations; in doing so, it created systems that are harder to reason about, harder to optimize, and harder to maintain.

**AX doesn't carry this baggage.** When the consumer is an LLM, we can:
- Skip the abstraction layers humans need
- Structure information for queryability, not readability
- Design APIs that expose intent directly
- Document philosophy and trade-offs explicitly (LLMs use this; humans ignore it)

This documentation system is a proof of concept. We're building for the future where AX is primary, DX secondary or obsolete.

---

## The Problem with Traditional Docs

When an LLM encounters conventional documentation:
- **Scattered sources** — README, examples, MDN, Stack Overflow
- **Surface-level examples** — "here's a button" without "here's when *not* to use it"
- **Missing context** — no design philosophy, no trade-off discussions
- **Human-oriented structure** — narrative flow, not queryable knowledge

The result is generic, inefficient code that misses the library's intent.

---

## The AX Approach

1. **Structured knowledge** — MCP tools query: *"Components with drag events"* or *"Form input philosophy"*
2. **Complete context** — Not just API, but *why*, *when*, and *how to think about it*
3. **No human-centric cruft** — Clean data structures, not narrative documentation
4. **Single source of truth** — Documentation generated from implementation, never drifting

### Who Benefits

| Consumer | Use |
|----------|-----|
| **LLMs (Primary)** | Structured data fed directly into context. Correct, idiomatic code on first try. |
| **Developers (Secondary)** | Same content, rendered for humans. Acceptable, not optimized. |
| **Tools** | `components.json` enables generators, IDE extensions, alternative implementations. |

---

## This Plan in One Sentence

> **Make Playground pages the canonical source of structured component knowledge, generating `components.json` as a machine-optimized data feed for LLM consumption.**

---

## What We're Building

### The Old Way (Everyone Else)
```
README.md → human reads → (hopefully) understands → writes code
     ↑
drifts over time
```

### The NUI Way (AX-First)
```
Playground/pages/*.html
├── JSON-LD metadata (structured, queryable)
├── LLM Guide (philosophy, trade-offs, anti-patterns)
└── Live examples (demonstration)
         ↓
    generator extracts
         ↓
components.json (machine-optimized)
         ↓
    MCP tool serves to LLM
         ↓
LLM has context to make correct design decisions
```

Same source, different optimization: humans get readable pages, LLMs get queryable knowledge.

---

## Why This Matters

Ask an LLM to "build a form with NUI" using README-only context, you get:
- Generic markup
- Missing inner elements
- Wrong component choices
- No understanding of Light DOM patterns

With structured AX documentation, you get:
- Correct component selection (with trade-off reasoning)
- Proper inner element structure
- Idiomatic patterns
- Contextual awareness of NUI's design philosophy

The difference is measurable in output quality.

---

## Success Criteria

1. **Measurable quality improvement** — LLMs with MCP access produce fewer incorrect patterns than those using README alone
2. **Zero documentation drift** — CI enforces that `components.json` matches source pages
3. **Correct first time** — Common mistakes (missing inner elements, wrong component choice) decrease in generated code
4. **Sustainable maintenance** — Adding JSON-LD to a page is trivial; keeping it updated is automatic

---

> **Revision Notes:** Updated based on feedback from Qwen 3.6-Plus and Claude Opus 3.6:
> - API data distributed across documentation pages (not centralized)
> - Added Phase 0 pilot for validation  
> - Added CI enforcement requirement
> - Added prominent warning about `<\/script>` escaping
> - Removed nui-create-app folder move (keep in root)

---

## Goals

### AX (Primary)
1. **Structured knowledge graph** — Queryable, complete, no narrative fluff
2. **Context over API** — Philosophy, trade-offs, anti-patterns; not just signatures
3. **Machine-optimized delivery** — `components.json` designed for MCP consumption
4. **Proof of concept** — Demonstrate that AX-first design produces better systems

### Practical
5. **Single source of truth** — Pages are canonical; JSON is generated
6. **No drift** — CI enforcement ensures docs match implementation
7. **Backward compatible** — Existing tools continue working

---

## Content Strategy: What LLMs Need

LLMs don't need inspiration. They need **context** to make correct decisions.

### LLM Guide Structure

**1. Design Philosophy**
Explain *why* the component exists, not just what it does.

```markdown
## Design Philosophy

`nui-button` wraps native `<button>` rather than creating a synthetic element.
This preserves: keyboard focus, form submission, disabled states (true disabled, 
not pointer-events), and accessibility announcements.

Trade-off: Less visual control than a div-based button, but correct behavior 
in all contexts.
```

**2. Usage Guidelines**
Explicit rules, not examples.

```markdown
## When to Use

- Use `nui-select` for: search, multi-select, async data, custom rendering
- Use native `<select>` for: simple 3-5 options, no styling needed, forms

Default to native unless requirements specifically need enhancement.
```

**3. Anti-Patterns**
Explicit wrong patterns with corrections.

```markdown
## Common Mistakes

❌ Omitting inner element:
<nui-button>Click</nui-button>
→ Event handling, accessibility, form integration fail.

✅ Correct structure:
<nui-button><button type="button">Click</button></nui-button>
→ All native capabilities preserved.
```

**4. Decision Logic**
Flowcharts for component selection.

```markdown
## Choosing a Dialog Type

Need system decision (OK/Cancel)? → `nui.components.dialog.confirm()`
Need custom content + buttons? → `nui-dialog` with `nui-dialog-alert` class
Need full control (media, complex forms)? → `nui-overlay` (unstyled)
```

### The Result

LLMs generate code that respects the library's design intent — not because they're "inspired" but because they have the information required to make correct choices.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  SOURCE (Ground Truth)                                      │
│  ─────────────────────                                      │
│                                                             │
│  Playground/pages/                                          │
│  ├── components/                                            │
│  │   ├── button.html    ──┐                                 │
│  │   ├── dialog.html    ──┼──┐                              │
│  │   └── ...              │  │                              │
│  ├── addons/               │  │                              │
│  │   ├── menu.html    ────┼──┤                              │
│  │   └── ...              │  │                              │
│  ├── documentation/         │  │                              │
│  │   ├── getting-started.html ─┤  JSON-LD + LLM Guide        │
│  │   ├── api-structure.html ──┤  extraction, distributed    │
│  │   └── ...                 │  │  API slices merged         │
│  │                           │  │  (no central page)         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  GENERATOR                                                  │
│  ─────────                                                  │
│                                                             │
│  scripts/update-docs.js                                     │
│  • Scans all HTML pages                                     │
│  • Extracts JSON-LD metadata                                │
│  • Extracts LLM Guide markdown                              │
│  • Merges distributed API slices from doc pages             │
│  • Aggregates events from components                        │
│  • Outputs JSON files                                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  GENERATED (Cached/Optimized)                               │
│  ────────────────────────────                               │
│                                                             │
│  components.json                                            │
│  {                                                          │
│    "generated": "2026-04-11T...",                           │
│    "source": "Playground/pages/**",                         │
│    "core": [...],        ← from components/*.html           │
│    "addons": [...],      ← from addons/*.html               │
│    "reference": [...],   ← from documentation/*.html        │
│    "api": {...},         ← merged from doc page slices      │
│    "patterns": {...}     ← merged from doc page slices      │
│    "events": [...]       ← aggregated from components       │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  CONSUMERS                                                  │
│  ─────────                                                  │
│                                                             │
│  • MCP tools (search, get_file_info)                        │
│  • nui-create-app (project generator)                       │
│  • IDEs (autocomplete, hover info)                          │
└─────────────────────────────────────────────────────────────┘
```

---

## JSON-LD Schema for Pages

### Component Pages

```html
<nui-page class="page-button">
  <script type="application/ld+json">
  {
    "@context": "nui",
    "@type": "Component",
    "name": "nui-button",
    "group": "forms",
    "description": "Styled wrapper around native buttons...",
    "events": ["nui-click"],
    "innerElement": "<button> or <a>",
    "imports": null
  }
  </script>
  
  <nui-markdown id="llm-guide">
    <script type="text/markdown">
# LLM Guide: nui-button

## Design Philosophy
`nui-button` wraps native `<button>` rather than creating synthetic elements...

## When to Use
- Use for styled buttons with icon support
- Use variants (primary, outline, ghost) for visual hierarchy

## Common Mistakes
❌ Omitting inner element
✅ Correct: `<nui-button><button>Click</button></nui-button>`
<\/script>  <!-- Note: escaped closing tag -->
    </script>
  </nui-markdown>
  
  <!-- Page content follows -->
  
  <!-- Page content -->
</nui-page>
```

### Addon Pages

Same as Component, but with `imports`:

```json
{
  "@type": "Component",
  "name": "nui-menu",
  "group": "navigation",
  "description": "Application-style menubar...",
  "events": [],
  "innerElement": null,
  "imports": {
    "js": "NUI/lib/modules/nui-menu.js",
    "css": "NUI/css/modules/nui-menu.css"
  }
}
```

### Documentation/Reference Pages

```html
<nui-page class="page-getting-started">
  <script type="application/ld+json">
  {
    "@context": "nui",
    "@type": "Reference",
    "name": "getting-started",
    "group": "documentation",
    "description": "Setup, layout modes, SPA wiring..."
  }
  </script>
  
  <nui-markdown id="llm-guide">
    <script type="text/markdown">
# LLM Guide: Getting Started
...
    </script>
  </nui-markdown>
  
  <!-- Page content -->
</nui-page>
```

### Distributed Reference Data (No Central Page)

API and pattern documentation is distributed across relevant documentation pages. Each page owns what it documents:

**`getting-started.html`** — Setup configuration:
```html
<script type="application/ld+json">
{
  "@context": "nui",
  "@type": "Reference",
  "name": "getting-started",
  "group": "documentation",
  "description": "Setup, layout modes, SPA wiring...",
  "setup": {
    "minimal": {
      "description": "Minimal standalone setup",
      "code": "<link rel=\"stylesheet\" href=\"NUI/css/nui-theme.css\">\n<script type=\"module\" src=\"NUI/nui.js\"><\/script>",
      "lang": "html"
    },
    "foucPrevention": {
      "description": "FOUC Prevention (App Mode)",
      "code": "body { margin: 0; overflow: hidden; }\nnui-app:not(.nui-ready) { display: none; }",
      "lang": "css"
    }
  }
}
</script>
```

**`api-structure.html`** — API namespace documentation:
```html
<script type="application/ld+json">
{
  "@context": "nui",
  "@type": "Reference",
  "name": "api-structure",
  "group": "documentation",
  "description": "Three-tier namespace design...",
  "api": {
    "root": [
      {
        "name": "configure",
        "signature": "nui.configure({ iconSpritePath, baseFontSize, animationDuration })",
        "description": "Update configuration after init",
        "params": ["config"],
        "returns": null
      }
    ],
    "utilities": [
      {
        "name": "createElement",
        "signature": "nui.util.createElement(tag, { class, attrs, data, events, content, target })",
        "category": "dom"
      }
    ]
  }
}
</script>
```

**`declarative-actions.html`** — Pattern documentation:
```html
<script type="application/ld+json">
{
  "@context": "nui",
  "@type": "Reference",
  "name": "declarative-actions",
  "group": "documentation",
  "description": "Event delegation pattern...",
  "patterns": {
    "dataAction": {
      "syntax": "data-action=\"name[:param][@targetSelector]\"",
      "events": { "generic": "nui-action", "specific": "nui-action-${name}" },
      "detail": "{ name, param, target, originalEvent }",
      "bubbles": true
    }
  }
}
</script>
```

**Generator merges slices:** The `update-docs.js` script collects `setup`, `api`, and `patterns` from all documentation pages and merges them into the final output.

---

## Generated Output Format

### components.json

```json
{
  "schemaVersion": 1,
  "generated": "2026-04-11T06:56:26Z",
  "source": "Playground/pages/**",
  "core": [
    {
      "name": "nui-button",
      "group": "forms",
      "description": "Styled wrapper around native buttons...",
      "page": "components/button",
      "innerElement": "<button> or <a>",
      "events": ["nui-click"],
      "imports": null,
      "llmGuide": "# LLM Guide: nui-button\n\n## Design Philosophy..."
    }
  ],
  "addons": [
    {
      "name": "nui-menu",
      "group": "navigation",
      "description": "Application-style menubar...",
      "page": "addons/menu",
      "innerElement": null,
      "events": [],
      "imports": { "js": "...", "css": "..." },
      "llmGuide": "# LLM Guide: nui-menu\n\n## Design Philosophy..."
    }
  ],
  "reference": [
    {
      "name": "getting-started",
      "group": "documentation",
      "description": "Setup, layout modes, SPA wiring...",
      "page": "documentation/getting-started",
      "llmGuide": "# LLM Guide: Getting Started\n\nNUI is built on..."
    },
    {
      "name": "api-structure",
      "group": "documentation",
      "description": "Three-tier namespace design...",
      "page": "documentation/api-structure",
      "llmGuide": "# LLM Guide: API Structure\n\nNUI exposes..."
    }
  ],
  "setup": {
    "minimal": { "description": "...", "code": "...", "lang": "html" },
    "foucPrevention": { "description": "...", "code": "...", "lang": "css" }
  },
  "api": {
    "root": [...],
    "components": [...],
    "utilities": [...]
  },
  "patterns": {
    "dataAction": {...},
    "router": {...}
  },
  "events": [
    { "component": "nui-button", "events": ["nui-click"] },
    { "component": "nui-dialog", "events": ["nui-dialog-open", "nui-dialog-close", "nui-dialog-cancel"] },
    { "component": "nui-tabs", "events": ["nui-tabs-change"] }
  ]
}
```

---

## File Structure Changes

```
project-root/
├── scripts/                          # NEW FOLDER
│   ├── update-docs.js               # NEW - Documentation generator
│   └── README.md                    # NEW - Script usage docs
│
├── nui-create-app/                  # UNCHANGED (stays in root)
│   ├── index.js
│   ├── lib/
│   │   ├── file-utils.js
│   │   ├── project-generator.js
│   │   └── web-ui.js
│   └── templates/
│       └── web-ui.html
│
├── Playground/pages/
│   ├── components/                  # ADD JSON-LD to each
│   │   ├── button.html
│   │   ├── dialog.html
│   │   └── ...
│   ├── addons/                      # ADD JSON-LD to each
│   │   ├── menu.html
│   │   └── ...
│   └── documentation/               # ADD JSON-LD (distributed)
│       ├── getting-started.html     # owns setup: {...}
│       ├── api-structure.html       # owns api: {...}
│       ├── declarative-actions.html # owns patterns.dataAction: {...}
│       └── ...
│
├── docs/
│   ├── components.json              # GENERATED (was manual)
│   ├── dev-plan-source-of-truth.md  # THIS DOCUMENT
│   └── ...
│
└── nui-create-app.js                # UNCHANGED
```

---

## Migration Steps (Phased)

### Phase 0: Pilot (3 Pages)
**Goal:** Validate the approach before full rollout.

Select 3 representative pages:
1. **One component:** `Playground/pages/components/button.html`
2. **One addon:** `Playground/pages/addons/menu.html`
3. **One documentation:** `Playground/pages/documentation/getting-started.html`

For each:
1. Add `<script type="application/ld+json">` with metadata
2. Ensure LLM Guide has `id="llm-guide"`
3. Add appropriate slice (e.g., `getting-started` gets `setup`)

### Phase 1: Generator Skeleton
1. Create `scripts/` folder
2. Create `scripts/update-docs.js` skeleton
3. Implement pilot extraction (3 pages only)
4. Validate output matches current `components.json` for pilot pages

### Phase 2: Roll Out to All Pages
Add JSON-LD to remaining pages:
- `Playground/pages/components/*.html` (remaining)
- `Playground/pages/addons/*.html` (remaining)
- `Playground/pages/documentation/*.html` (remaining, distributed API slices)

### Phase 3: Full Generator Implementation
Complete `scripts/update-docs.js`:
1. Glob scan all `Playground/pages/**/*.html`
2. Extract and merge distributed slices (`setup`, `api`, `patterns`)
3. Aggregate events from component pages
4. Write `docs/components.json`

### Phase 4: CI Enforcement
Add automated checks to prevent drift:
```yaml
# .github/workflows/docs-sync.yml
- name: Check components.json is up to date
  run: |
    node scripts/update-docs.js
    git diff --exit-code docs/components.json || (echo "Run 'node scripts/update-docs.js' and commit" && exit 1)
```

### Phase 5: Validation & Evaluation
1. Run full generator, compare with current `components.json`
2. Verify MCP tools still work
3. Verify `nui-create-app` still works
4. **Before/after evaluation** — Test LLM code generation quality:
   - Select 5 common tasks (e.g., "build a form", "create a dialog", "implement drag-and-drop")
   - Generate code with README-only context vs. MCP context
   - Measure: correctness, idiomatic patterns, proper inner elements, trade-off awareness
   - Document results to validate AX hypothesis
5. Update AGENTS.md and README.md with new workflow

---

## Decisions (Reviewed)

Based on external feedback, the following decisions have been made:

| Question | Decision | Rationale |
|----------|----------|-----------|
| **Q1: Events Aggregation** | ✅ **Auto-aggregate** | Generator collects `events` from each component page into top-level `events` array. Removes duplication, single source of truth. |
| **Q2: File Splitting** | ✅ **Single file** | Keep `components.json` as one file (~150KB). Splitting adds complexity without clear benefit for consumers. |
| **Q3: Validation** | ✅ **Warn on missing** | Validate JSON-LD structure, warn for missing required fields, but don't fail. Option B strikes the right balance. |
| **Q4: Watch Mode** | 🔄 **Future enhancement** | Useful but not critical for initial implementation. Add `--watch` flag later if needed. |

### Additional Implementation Note

**⚠️ CRITICAL: `<\/script>` Escaping**

Per `AGENTS.md`, any `</script>` inside LLM Guide markdown MUST be escaped as `<\/script>` to prevent breaking the HTML parser:

```html
<!-- WRONG - breaks page -->
<script type="text/markdown">
```html
<script>
  console.log('hi');
</script>
```
</script>

<!-- CORRECT -->
<script type="text/markdown">
```html
<script>
  console.log('hi');
<\/script>  <!-- note the backslash -->
```
</script>
```

**Generator handling:** The `update-docs.js` must unescape during extraction:
```javascript
llmGuide = extractedContent.replace(/<\\\/script>/g, '</script>');
```

**Validation:** Add a test case that verifies the unescaping works correctly for nested code examples.

---

## Open Questions for Review

*All resolved — see Decisions table above.*

---

## Backward Compatibility

### Preserved
- `docs/components.json` location unchanged
- `nui-create-app.js` and `nui-create-app/` folder unchanged
- MCP tools read same file, same structure
- All existing CLI commands work identically

### Breaking
_None. This is a purely additive change — new JSON-LD blocks in pages, new generator script, same outputs._

---

## Benefits Summary

| Before | After |
|--------|-------|
| Edit `components.json` AND page | Edit page only |
| Descriptions can drift | Single source of truth |
| LLM Guides scattered in pages | LLM Guides extracted and queryable |
| API docs in JSON only | Distributed across relevant doc pages |
| Manual maintenance | Automated CI-enforced sync |

---

## Appendix: Extraction Algorithm Sketch

```javascript
// Pseudo-code for update-docs.js

function extractPageData(htmlPath) {
  const html = fs.readFileSync(htmlPath, 'utf-8');
  
  // Extract JSON-LD
  const jsonLdMatch = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
  if (!jsonLdMatch) {
    console.warn(`[update-docs] No JSON-LD found in ${htmlPath}`);
    return null;
  }
  const metadata = JSON.parse(jsonLdMatch[1]);
  
  // Validate required fields
  if (!metadata.name) {
    console.warn(`[update-docs] Missing 'name' in ${htmlPath}`);
  }
  
  // Extract LLM Guide from <script type="text/markdown"> inside <nui-markdown id="llm-guide">
  // Note: The id is on the nui-markdown wrapper, not the script tag itself
  const llmWrapperMatch = html.match(/<nui-markdown[^>]*id="llm-guide"[^>]*>[\s\S]*?<script type="text\/markdown">([\s\S]*?)<\/script>/);
  let llmGuide = null;
  if (llmWrapperMatch) {
    // Unescape the script tag sequence for consumers
    // The literal characters in the file are: < \/script>
    // The backslash is NOT an escape - it's literally in the HTML source
    llmGuide = llmWrapperMatch[1].replace(/<\\\/script>/g, '</script>').trim();
  }
  
  return { ...metadata, llmGuide };
}

function generateComponentsJson() {
  const result = {
    schemaVersion: 1,  // For future breaking changes
    generated: new Date().toISOString(),
    source: 'Playground/pages/**',
    core: [],
    addons: [],
    reference: [],
    setup: {},
    api: {},
    patterns: {},
    events: []  // Auto-aggregated from component pages
  };
  
  // Track seen API entries to detect duplicates
  const seenApi = { root: new Set(), components: new Set(), utilities: new Set() };
  
  function checkDuplicates(apiSection, sectionName, filePath) {
    if (!apiSection) return;
    for (const entry of (apiSection.root || [])) {
      if (seenApi.root.has(entry.name)) {
        console.warn(`[update-docs] Duplicate API entry '${entry.name}' in ${sectionName} (from ${filePath})`);
      }
      seenApi.root.add(entry.name);
    }
    // Similar checks for components and utilities...
  }
  
  // Process components
  for (const file of glob('Playground/pages/components/*.html')) {
    const data = extractPageData(file);
    if (!data) continue;
    
    result.core.push({ ...data, page: pathToPage(file) });
    
    // Aggregate events
    if (data.events && data.events.length > 0) {
      result.events.push({
        component: data.name,
        events: data.events.map(e => typeof e === 'string' ? { name: e } : e)
      });
    }
  }
  
  // Process addons
  for (const file of glob('Playground/pages/addons/*.html')) {
    const data = extractPageData(file);
    if (!data) continue;
    
    result.addons.push({ ...data, page: pathToPage(file) });
    
    if (data.events && data.events.length > 0) {
      result.events.push({
        component: data.name,
        events: data.events.map(e => typeof e === 'string' ? { name: e } : e)
      });
    }
  }
  
  // Process documentation (distributed slices with duplicate detection)
  for (const file of glob('Playground/pages/documentation/*.html')) {
    const data = extractPageData(file);
    if (!data) continue;
    
    result.reference.push({
      name: data.name,
      group: data.group,
      description: data.description,
      page: pathToPage(file),
      llmGuide: data.llmGuide
    });
    
    // Merge slices with conflict detection
    if (data.setup) {
      for (const [key, value] of Object.entries(data.setup)) {
        if (result.setup[key]) {
          console.warn(`[update-docs] Duplicate setup key '${key}' in ${file}`);
        }
        result.setup[key] = value;
      }
    }
    if (data.api) {
      checkDuplicates(data.api, data.name, file);
      if (data.api.root) result.api.root = [...(result.api.root || []), ...data.api.root];
      if (data.api.components) result.api.components = [...(result.api.components || []), ...data.api.components];
      if (data.api.utilities) result.api.utilities = [...(result.api.utilities || []), ...data.api.utilities];
    }
    if (data.patterns) {
      for (const [key, value] of Object.entries(data.patterns)) {
        if (result.patterns[key]) {
          console.warn(`[update-docs] Overwriting pattern '${key}' from ${file}`);
        }
        result.patterns[key] = value;
      }
    }
  }
  
  fs.writeFileSync('docs/components.json', JSON.stringify(result, null, '\t'));
}
```

---

## Feedback Request

Please review and comment on:
1. Overall architecture
2. JSON-LD schema design
3. Open questions (Q1-Q4)
4. Migration approach
5. Any concerns about MCP tool impact

---

*Document version: 1.0-Draft*
