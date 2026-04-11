# MCP Server Handover: nui_docs Agent

## Architecture

The NUI documentation MCP tools now read **dynamically** from the NUI repo's `docs/components.json`. No more hardcoded strings.

```
mcp_server/
└── src/agents/nui_docs/
    ├── index.js          ← THIS FILE (wrapper, reads from submodule)
    ├── config.json       ← Tool definitions (unchanged)
    └── nui_wc2/          ← git submodule → nui_wc2 repo
        ├── docs/components.json   ← Source of truth (auto-generated)
        ├── Playground/pages/      ← HTML documentation pages
        ├── NUI/css/nui-theme.css  ← CSS variables
        └── NUI/assets/material-icons-sprite.svg  ← Icons
```

## How It Works

1. `index.js` reads `nui_wc2/docs/components.json` at runtime
2. When a tool is called, it reads the relevant HTML page from `nui_wc2/Playground/pages/`
3. Extracts LLM Guides, code examples, and text content from the HTML
4. Returns formatted markdown to the LLM client

**Zero hardcoded data.** Everything comes from the submodule.

## Integration Steps

### Initial Setup (one-time)

```bash
# In mcp_server repo
cd src/agents/nui_docs/

# Ensure submodule is initialized
git submodule update --init nui_wc2

# Copy the wrapper from the NUI repo
# (path relative to nui_wc2 root)
cp nui_wc2/scripts/mcp-server-mcp-wrapper.js src/agents/nui_docs/index.js
```

### Updating (when NUI repo changes)

```bash
# 1. Pull latest submodule
cd src/agents/nui_docs/nui_wc2
git pull origin main
cd ../../../..

# 2. Regenerate components.json (in NUI repo)
cd src/agents/nui_docs/nui_wc2
node scripts/update-docs.js
cd ../../../..

# 3. Copy updated wrapper
cp src/agents/nui_docs/nui_wc2/scripts/mcp-server-mcp-wrapper.js src/agents/nui_docs/index.js

# 4. Restart mcp_server
```

### Or: Use the standalone MCP server instead

The NUI repo also ships a standalone MCP server that doesn't need copying:

```json
{
  "mcpServers": {
    "nui-docs": {
      "command": "node",
      "args": ["path/to/nui_wc2/scripts/mcp-server.js"]
    }
  }
}
```

This is the **preferred** approach if you don't want to maintain a copy. Just point to the NUI repo's `scripts/mcp-server.js`.

## Tool Functions (6 total)

All exported as ESM named functions. The `config.json` defines the MCP tool schemas — it hasn't changed.

| Function | Reads From | Returns |
|----------|-----------|---------|
| `nui_list_components()` | `components.json` (components + addons + reference arrays) | List of all components, addons, reference pages |
| `nui_get_component({component})` | `components.json` → page HTML | LLM Guide + code examples + metadata |
| `nui_get_guide({topic})` | `components.json` → reference page HTML | Guide content + code examples |
| `nui_get_reference()` | `components.json` (setup, api, patterns, events) | Full API reference cheat sheet |
| `nui_get_css_variables()` | `NUI/css/nui-theme.css` | Categorized CSS variables |
| `nui_get_icons()` | `NUI/assets/material-icons-sprite.svg` | Icon names list |

## Key Schema Change

The registry key was renamed: **`core` → `components`**.

If you see `reg.components` in the code, that's the 25 core NUI components. `reg.addons` is the 8 optional modules. `reg.reference` is the 8 documentation pages.

## File Locations

| File | In NUI Repo | In mcp_server Repo |
|------|-------------|-------------------|
| Standalone MCP server | `scripts/mcp-server.js` | — |
| Wrapper (copy target) | `scripts/mcp-server-mcp-wrapper.js` | `src/agents/nui_docs/index.js` |
| Component registry | `docs/components.json` | `src/agents/nui_docs/nui_wc2/docs/components.json` |
| Tool config | — | `src/agents/nui_docs/config.json` |

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| "Failed to load component registry" | Submodule not initialized or `components.json` missing | `git submodule update --init nui_wc2` then `node scripts/update-docs.js` |
| "Documentation page not found" | Stale submodule | `git pull` in submodule directory |
| Tool returns empty/old data | `components.json` out of sync | Run `node scripts/update-docs.js` in NUI repo |
| CSS variables/icons empty | NUI submodule missing assets | Ensure submodule is at correct commit |
