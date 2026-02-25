# Publish omnifocus-mcp-pro to npm

**Date:** 2026-02-25
**Status:** Approved

## Goal

Publish the OmniFocus MCP Ultimate server as `omnifocus-mcp-pro` on npm so any agent can use it via `npx -y omnifocus-mcp-pro`.

## Changes

### package.json updates

- `name`: `omnifocus-mcp-enhanced` → `omnifocus-mcp-pro`
- `version`: `1.6.7` → `2.0.0`
- `description`: Updated to reflect merged capabilities
- `bin`: `omnifocus-mcp-enhanced` → `omnifocus-mcp-pro`
- `repository.url`: → `https://github.com/darrenyao/omnifocus-mcp-enhanced.git`
- `homepage`: → `https://github.com/darrenyao/omnifocus-mcp-enhanced`
- `author`: → darrenyao
- `files`: Add `["dist/", "cli.cjs"]` whitelist to ensure dist is published
- `keywords`: Updated to accurate terms

### Publish flow

1. `npm login`
2. Update `package.json`
3. `npm run build` (triggered automatically by `prepublishOnly`)
4. `npm publish`

### Usage

```json
{
  "mcpServers": {
    "omnifocus": {
      "command": "npx",
      "args": ["-y", "omnifocus-mcp-pro"]
    }
  }
}
```
