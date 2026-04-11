# NUI Scripts

This folder contains build and maintenance scripts for the NUI library.

## `update-docs.js`

The documentation generator. Extracts JSON-LD metadata and LLM Guides from Playground pages to generate `docs/components.json` — the machine-readable source of truth for MCP tools.

### Usage

```bash
node scripts/update-docs.js
```

### What It Does

1. Scans `Playground/pages/components/*.html` for component metadata
2. Scans `Playground/pages/addons/*.html` for addon metadata  
3. Scans `Playground/pages/documentation/*.html` for reference data and API slices
4. Extracts:
   - JSON-LD metadata (`@context`, `@type`, `name`, `group`, etc.)
   - LLM Guide content from `<nui-markdown id="llm-guide">`
5. Merges distributed slices (`setup`, `api`, `patterns`) from documentation pages
6. Aggregates events from all components
7. Writes `docs/components.json`

### Output Format

```json
{
  "schemaVersion": 1,
  "generated": "2026-04-11T...",
  "core": [...],
  "addons": [...],
  "reference": [...],
  "setup": {...},
  "api": {...},
  "patterns": {...},
  "events": [...]
}
```

### CI Integration

Add to your CI pipeline to prevent documentation drift:

```yaml
- name: Verify documentation is up to date
  run: |
    node scripts/update-docs.js
    git diff --exit-code docs/components.json || (echo "Run 'node scripts/update-docs.js' and commit" && exit 1)
```

### Adding JSON-LD to Pages

Each page should include a JSON-LD block after the opening tag:

```html
<nui-page class="page-my-component">
  <script type="application/ld+json">
  {
    "@context": "nui",
    "@type": "Component",
    "name": "nui-my-component",
    "group": "forms",
    "description": "What this component does...",
    "events": ["nui-my-event"],
    "innerElement": "<input>",
    "imports": null
  }
  </script>
  
  <nui-markdown id="llm-guide">
    <script type="text/markdown">
# LLM Guide: nui-my-component

## Design Philosophy
...
    </script>
  </nui-markdown>
  
  <!-- Page content -->
</nui-page>
```

**Note:** Escape `</script>` as `<\/script>` inside the JSON-LD code values to prevent breaking the HTML parser.
