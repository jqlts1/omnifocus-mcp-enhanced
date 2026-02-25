# OmniFocus MCP Pro

[![npm version](https://img.shields.io/npm/v/omnifocus-mcp-pro.svg)](https://www.npmjs.com/package/omnifocus-mcp-pro)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![macOS](https://img.shields.io/badge/macOS-only-blue.svg)](https://www.apple.com/macos/)

Pro MCP server for OmniFocus on macOS — 19 tools, unified query engine, MCP Resources, text search, and full GTD workflow support. Merged from [omnifocus-mcp](https://github.com/themotionmachine/OmniFocus-MCP) and [omnifocus-mcp-enhanced](https://github.com/jqlts1/omnifocus-mcp-enhanced).

## Installation

### Claude Code (Recommended)

```bash
claude mcp add omnifocus -- npx -y omnifocus-mcp-pro
```

### Other AI Agents (Cursor, Cline, Claude Desktop, etc.)

Add to your MCP config file:

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

| Agent | Config File |
|-------|-------------|
| Claude Code | `~/.claude.json` or `.mcp.json` |
| Claude Desktop | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Cursor | `.cursor/mcp.json` |
| Cline (VS Code) | `.vscode/cline_mcp_settings.json` |

### Local Development

```bash
git clone https://github.com/darrenyao/omnifocus-mcp-enhanced.git
cd omnifocus-mcp-enhanced
npm install && npm run build
claude mcp add omnifocus -- node "$(pwd)/dist/server.js"
```

## Requirements

- **macOS 10.15+** — OmniFocus is macOS-only
- **OmniFocus 3+** — must be installed and running
- **OmniFocus Pro** — required for custom perspectives
- **Node.js 18+**

## Tools (19)

### Query & Search

| Tool | Description |
|------|-------------|
| `query_omnifocus` | Unified query engine — filter tasks/projects/folders by name, note, status, tags, dates, and more |
| `get_task_by_id` | Get a specific task by ID or exact name |
| `dump_database` | Full database snapshot (use `query_omnifocus` for targeted queries) |

`query_omnifocus` is the primary query tool. It replaces the need for separate inbox/flagged/forecast/tag query tools with a single, composable filter interface.

**Filter examples:**

```jsonc
// Find tasks by name (case-insensitive partial match)
{ "entity": "tasks", "filters": { "nameContains": "compression" } }

// Full-text search across name + note
{ "entity": "tasks", "filters": { "keyword": "review" } }

// Combine filters: flagged tasks due within 7 days
{ "entity": "tasks", "filters": { "flagged": true, "dueWithin": 7 } }

// Available tasks in a specific project
{ "entity": "tasks", "filters": { "projectName": "Website", "status": ["Available"] } }

// Search project notes
{ "entity": "projects", "filters": { "noteContains": "deadline" } }
```

**Available filters:** `nameContains`, `noteContains`, `keyword`, `projectName`, `projectId`, `tags`, `status`, `flagged`, `dueWithin`, `dueOn`, `deferredUntil`, `deferOn`, `plannedWithin`, `plannedOn`, `hasNote`, `inbox`, `folderId`

**Additional params:** `fields` (select specific fields), `sortBy`, `sortOrder`, `limit`, `includeCompleted`, `summary` (count only)

### Perspectives

| Tool | Description |
|------|-------------|
| `get_custom_perspective_tasks` | View tasks from a custom perspective with tree display |
| `list_custom_perspectives` | List all custom perspectives |
| `list_perspectives` | List all perspectives (built-in + custom) |
| `get_perspective_view` | View any named perspective |

```jsonc
// Tree view of a custom perspective
{ "perspectiveName": "Today Review", "displayMode": "project_tree" }

// Flat list
{ "perspectiveName": "Weekly Planning", "displayMode": "flat" }
```

### Task & Project CRUD

| Tool | Description |
|------|-------------|
| `add_omnifocus_task` | Create a task (supports subtasks via `parentTaskName`/`parentTaskId`) |
| `add_project` | Create a project |
| `edit_item` | Edit task or project properties |
| `remove_item` | Delete a task or project |
| `batch_add_items` | Bulk create tasks and projects |
| `batch_remove_items` | Bulk delete |

### Organization

| Tool | Description |
|------|-------------|
| `list_tags` | Browse tag hierarchy |
| `delete_folder` | Delete a folder |
| `rename_folder` | Rename a folder |
| `synchronize` | Trigger OmniFocus sync |

### GTD Review

| Tool | Description |
|------|-------------|
| `get_completed_tasks_in_range` | Tasks completed in last N days — ideal for weekly review |
| `get_today_completed_tasks` | Today's accomplishments |

```jsonc
// Weekly review: what did I complete in the last 7 days?
{ "daysBack": 7, "limit": 50 }
```

## MCP Resources

Pre-loadable data endpoints — agents can read these without calling tools:

| Resource | URI | Description |
|----------|-----|-------------|
| Inbox | `omnifocus://inbox` | Current inbox items |
| Today | `omnifocus://today` | Due, planned, and overdue tasks |
| Flagged | `omnifocus://flagged` | All flagged items |
| Stats | `omnifocus://stats` | Database statistics |
| Project | `omnifocus://project/{name}` | Tasks in a specific project |
| Perspective | `omnifocus://perspective/{name}` | Items in a named perspective |

## GTD Workflow Mapping

| GTD Phase | Tools |
|-----------|-------|
| **Capture** | `add_omnifocus_task`, `batch_add_items` |
| **Clarify** | `query_omnifocus` (inbox), `get_task_by_id`, `edit_item` |
| **Organize** | `add_project`, `edit_item`, `list_tags`, `delete_folder`, `rename_folder` |
| **Reflect** | `get_completed_tasks_in_range`, `get_today_completed_tasks`, `get_perspective_view`, `query_omnifocus` (projects) |
| **Engage** | `query_omnifocus` (status: Next/Available), `edit_item` (complete), `synchronize` |

## Server Instructions

The server includes built-in instructions that guide AI agents on tool selection:

- Prefer `query_omnifocus` over `dump_database` for targeted lookups (85-95% context savings)
- Use `fields` parameter to request only needed data
- Use `summary: true` for quick counts
- Prefer batch operations over repeated single calls

## Architecture

Forked from [omnifocus-mcp-enhanced](https://github.com/jqlts1/omnifocus-mcp-enhanced), with all exclusive features from [omnifocus-mcp](https://github.com/themotionmachine/OmniFocus-MCP) migrated in:

- **Unified query engine** (`query_omnifocus`) replaces 5 specialized query tools
- **Text search** (`nameContains`, `noteContains`, `keyword`) — case-insensitive partial matching
- **MCP Resources** — 4 fixed + 2 template resources with autocomplete
- **Server Instructions** — built-in guidance for AI tool selection
- **Logger** — MCP protocol-level structured logging
- **CacheManager** — TTL-based cache with database checksum validation
- **GTD tools** — `get_completed_tasks_in_range` for weekly review, `synchronize`, `delete_folder`, `rename_folder`

## Links

- **npm**: https://www.npmjs.com/package/omnifocus-mcp-pro
- **GitHub**: https://github.com/darrenyao/omnifocus-mcp-enhanced
- **OmniFocus**: https://www.omnigroup.com/omnifocus/
- **MCP Spec**: https://modelcontextprotocol.io/

## Acknowledgments

Built on [omnifocus-mcp](https://github.com/themotionmachine/OmniFocus-MCP) by themotionmachine and [omnifocus-mcp-enhanced](https://github.com/jqlts1/omnifocus-mcp-enhanced) by jqlts1.

## License

MIT
