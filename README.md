# 🚀 OmniFocus MCP Enhanced

[![npm version](https://img.shields.io/npm/v/omnifocus-mcp-enhanced.svg)](https://www.npmjs.com/package/omnifocus-mcp-enhanced)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js CI](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![macOS](https://img.shields.io/badge/macOS-only-blue.svg)](https://www.apple.com/macos/)

> **🌟 NEW: Native Custom Perspective Access with Hierarchical Display!**

> **Transform OmniFocus into an AI-powered productivity powerhouse with custom perspective support**

<a href="https://glama.ai/mcp/servers/@jqlts1/omnifocus-mcp-enhanced">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@jqlts1/omnifocus-mcp-enhanced/badge" alt="OmniFocus Enhanced MCP server" />
</a>

Enhanced Model Context Protocol (MCP) server for OmniFocus featuring **native custom perspective access**, hierarchical task display, AI-optimized tool selection, and comprehensive task management.

In plain English: this lets your AI assistant read your OmniFocus data, create tasks/projects, organize subtasks, review perspectives, and help you plan work without you manually jumping between apps.

## 🌠 Why This Project Exists

OmniFocus is already powerful, but it is still mostly a tool you drive by hand.

The bigger idea behind this project is simple:

- less clicking, more conversation
- less manual cleanup, more AI-assisted planning
- less tool memorization, more natural task management

The goal is not just to expose more OmniFocus commands.
The goal is to let you work with OmniFocus like this:

```text
Plan my day.
Clean up my Inbox.
Turn these notes into a project.
Show me what is blocked.
Reorganize these tasks safely.
```

If that feels natural, this MCP server is doing its job.

Want to see where the project is heading next? See the [roadmap](docs/roadmap/2026-02-25-batch-move-tasks-plan.md).

## 🆕 Latest Release

- **v2.1.0** - Custom perspective rule management: the new `manage_perspectives` tool reads, explains, and edits the filter rules behind a custom perspective, replacing `list_custom_perspectives`. Rules are exposed as a readable, name-based document instead of raw primary keys, and edits are written in place so a perspective's identifier never changes. The rule vocabulary was verified against the running app rather than taken from Omni's documentation, which proved both incomplete and partly wrong: `actionHasPlannedDate` is undocumented, the documented `changed` date field is ignored by the filter engine, and an entire `actionHasDate*` family present in the binary is dead. OmniFocus performs no validation on rule writes — an invalid rule is stored intact and then silently makes the perspective match everything — so the server validates every rule before writing, preserves rules it does not recognize verbatim, refuses unknown or ambiguous tag and project names, rolls back on failure, and forces the display refresh that OmniFocus otherwise skips. Creating and deleting perspectives remain out of scope: OmniFocus exposes no automation API for either. The surface remains 25 tools, 5 prompts, and 3 resources.

  The skill installer also stops leaking latency. mcporter only keeps an MCP server process alive when its config entry asks for it, and its built-in defaults cover a handful of browser-automation servers and nothing else, so every CLI call was re-resolving `npx -y` and cold starting a server. The installer now registers the server with `lifecycle: "keep-alive"` and asserts the setting reached the generated bundle — measured at 2.1x faster per command (12.9s → 6.1s median, interleaved A/B). Note that `mcporter generate-cli --from <bundle>` drops `lifecycle` from its replay metadata, so refreshing the CLI that way silently reverts this; `install-skill` is the only supported refresh path. The generated CLI is also pinned to `--runtime node`, because mcporter otherwise picks the runtime from whatever is on `PATH` at generation time and emits a `#!/usr/bin/env bun` shebang that fails to exec from shells with a narrower `PATH`. A new test asserts the installer's verification checklist names exactly the tools the server registers, so a renamed tool can no longer ship an installer that aborts on a correctly installed package.

- **v2.0.0** - Consolidated the MCP surface from 41 specialized tools to 25 strict tools: task views now use `get_tasks`, project reads use `get_projects`, and Folder/Tag/notification CRUD use `manage_*` actions. Removed legacy tool names rather than keeping aliases. Detailed task reads now preserve each assigned leaf tag while exposing its full OmniFocus hierarchy through `path` and `ancestorIds` (for example, `团队 / 守一`); compact reads still omit tags. The bundled Skill and installer now generate and verify the 25-command surface.

- **v1.21.0** - Batch task completion: new `batch_complete_tasks` tool marks up to 100 tasks complete or incomplete by stable ID in one verified transaction. The tool preflights every ID, snapshots original completion states, applies each action, reads back to verify status and completion dates, and restores previous states on any failure. Repeating tasks generate new instances when completed; the tool reports `generatedTaskId` and `nextOccurrence`. Idempotent items are reported as `unchanged` rather than failing. The surface now includes 41 tools, 5 prompts, and 3 resources.

- **v1.20.0** - Repeating tasks completed: repetition is now readable and verified everywhere. `get_task_by_id` returns the rule string, schedule type, anchor date, catch-up behavior, and the next occurrence; list reads add only an `isRepeating` marker; `dump_database` reports real repetition instead of hard-coded nulls. `add_omnifocus_task` and every task node of `create_project_from_outline` accept a `repetition` object using ICS rule strings, and `set_repetition_rule` now snapshots the previous rule, verifies every written field, restores on failure, and reports an unconfirmed restore with the affected task ID. The surface remains 40 tools, 5 prompts, and 3 resources.

- **v1.19.0** - Project Shaping: added `create_project_from_outline` for turning one user-confirmed structured outline into a complete OmniFocus project tree. The tool accepts stable Folder/Tag IDs and core planning fields, enforces a 200-task/eight-level bound, preflights every reference before writing, creates the tree in one OmniJS request, reads every node and field back, and performs one bounded Undo if execution or verification fails. The new `project_shaping` Prompt and bundled Skill guide extract, disclose inferences, resolve IDs, confirm, create, and report. The surface is now 40 tools, 5 prompts, and 3 resources.

- **v1.18.0** - Reliability release: upgraded the MCP SDK to 1.30.0 and Zod to 3.25.76; migrated Resources to `registerResource` with bounded task snapshots that distinguish `totalCount`, `returnedCount`, and truncation; restored the user's original OmniFocus perspective after custom-perspective reads; removed the unused incomplete Perspective V2/debug implementation; and rebuilt `batch_remove_items` around stable IDs, complete preflight, undo-based rollback on execution failure, cascade reporting, and post-delete verification.

- **v1.17.1** - Maintenance release: migrated all 39 tools and 4 prompts to the current MCP registration APIs with read/additive/destructive annotations, restored mandatory strict TypeScript checking, raised the runtime baseline to Node.js 22, and reduced the npm tarball from about 2.27 MB to about 117 KB by publishing only runtime artifacts. The repository logo is now 512×341 and about 175 KB instead of 1.97 MB.

- **v1.17.0** - Filter pagination and query efficiency: `filter_tasks` now returns stateless opaque keyset cursors for real-time best-effort traversal, with stable ID tie-breaking and strict query/sort validation. Compact reads omit notes and tags inside OmniJS, normal list reads skip unused status aggregation, and later pages use cursor boundaries plus one-item lookahead. The privacy-safe benchmark now records first- and second-page metrics. The surface remains 39 tools, 4 prompts, and 3 resources.

- **v1.16.0** - Daily Planning Assistant: `daily_review` now uses exact count-first discovery and bounded, deduplicated candidates to produce three priorities plus next actions, blockers, and capacity/deadline risks. Its optional `availableMinutes` input compares only known estimates and preserves missing estimates as uncertainty. `filter_tasks` adds opt-in `compact` output for broad planning reads without notes or full tags, and a privacy-safe local benchmark provides numeric regression evidence. The surface remains 39 tools, 4 prompts, and 3 resources.

- **v1.15.0** - Weekly Review completion: added the narrow `mark_projects_reviewed` tool for marking a user-confirmed set of active or on-hold projects reviewed. The server validates every project and its review metadata before writing, uses one timestamp for the complete batch, restores prior review dates after execution or verification failures, and verifies `lastReviewDate`, the OmniFocus-generated `nextReviewDate`, and the unchanged review interval. The Weekly Review Prompt and Skill now guide discovery, discussion, confirmation, marking, and remaining-review reporting. Now 39 tools, 4 prompts, and 3 resources.
- **v1.14.0** - Safe Inbox organization: added the intentionally narrow `batch_move_tasks` tool for executing a user-confirmed move proposal using stable task and destination IDs. The server preflights the complete batch before changing anything, blocks invalid destinations and hierarchy cycles, rolls back completed moves after execution failures, and verifies every final destination. The `inbox_processing` Prompt and bundled Skill now guide AI clients through read, propose, confirm, execute, and report. Now 38 tools, 4 prompts, and 3 resources.
- **v1.13.1** - Maintenance release: MCP server metadata now reads its version from `package.json`, preventing the MCP handshake, CLI, NPM package, and GitHub release versions from drifting apart. The published Skill installation was also verified end to end with all 37 commands, all six task-tree flag pairs, and a live OmniFocus connection.
- **v1.13.0** - Task-tree-aware reads: `get_inbox_tasks`, `get_flagged_tasks`, `get_forecast_tasks`, `get_tasks_by_tag`, `filter_tasks`, and `get_task_by_id` now show visible direct subtask counts by default and support on-demand recursive expansion with `showSubtasks` and `maxSubtaskDepth`. Expanded lists suppress duplicate top-level descendants, inherit completion visibility rules, and enforce a 500-node safety cap with explicit truncation output. The bundled `omnifocus-cli` Skill documents the new workflow and verifies both generated CLI flags during installation.
- **v1.12.0** - Reliability release: rebuilt `filter_tasks` and `count_tasks` on one complete OmniJS predicate (due/defer/planned/completion dates, estimates, notes, tags, inbox, project, status, and combined filters now actually work); added low-overhead `countOnly` aggregation; added `get_projects` and `get_projects_due_for_review` with native OmniFocus review metadata; upgraded the MCP SDK to 1.29.0 and cleared all production audit findings; updated the Claude skill to 37 tools and changed its generated bundle to `.cjs` so project-local installs work inside ESM repositories.
- **v1.11.1** - Fixed skill installation scope for Claude Code: `install-skill` now installs into the **current project's** `.claude/skills/omnifocus-cli/` and writes a project-scoped mcporter config by default. Pass `--global` to opt into `~/.claude/skills/omnifocus-cli/` and the home mcporter config. `CLAUDE_SKILLS_DIR` can override the skill root.
- **v1.11.0** - Added a bundled **agent skill** (`omnifocus-cli`). One command (`npx omnifocus-mcp-enhanced install-skill`) generates a local CLI covering all 35 tools, so AI agents can drive OmniFocus through shell commands instead of loading 35 tool schemas into context. The CLI is generated on your machine from your installed server version, so it never drifts out of sync.
- **v1.10.0** - Major capability expansion: **Tag Management** (`add_tag`, `edit_tag`, `remove_tag`, `search_tags`), **Task Notifications** (`list_task_notifications`, `add_task_notification`, `remove_task_notification` — absolute or due-relative reminders), plus first-class MCP **Prompts** (4 guided review workflows) and **Resources** (3 live JSON snapshots). Now 35 tools, 4 prompts, and 3 resources.
- **v1.9.0** - Added 3 productivity tools: `append_to_note` (append text to a task/project note without overwriting), `count_tasks` (fast "how many" aggregate queries with a status breakdown, using the same filters as `filter_tasks`), and `duplicate_task` (clone a task with or without its subtasks, optionally renamed).
- **v1.8.0** - Added full **Folder Management** support: `add_folder`, `edit_folder`, `remove_folder`, `list_folders`, and `get_folder`. Create nested folder hierarchies, rename/move folders (with cycle protection), and inspect folder contents (child projects + subfolders). Note: removing a folder permanently deletes all projects and tasks it contains.
- **v1.7.0** - Added OmniFocus 4.7+ repeat rule support via `set_repetition_rule` (ICS rule strings, schedule type, anchor date, catch-up, end date, repetition count), mutually exclusive tag support via `exclusiveTags` on add/edit tools, and improved planned-date editing tests.
- **v1.6.10** - Fixed Inbox task completion via `edit_item`, fixed AppleScript special-character handling for apostrophes/backslashes, fixed JSON result escaping for special characters, and clarified `batch_add_items` / `mcporter` usage with working examples.
- **v1.6.9** - Added task attachment support: `get_task_by_id` now lists attachment metadata, `dump_database` exports attachment/link metadata, and new `read_task_attachment` returns image attachments as MCP image content when possible.
- **v1.6.8** - Added stable task move support via `move_task` and `edit_item` (`newProjectId/newProjectName/newParentTaskId/newParentTaskName/moveToInbox`) with duplicate-name protection and cycle-prevention checks.
- **v1.6.6** - Added full Planned Date support (create/edit/read/filter/sort/export), including `plannedDate`/`newPlannedDate` and updated task displays.

## ✨ Key Features

### 🌟 **NEW: Native Custom Perspective Access**

- **🎯 Direct Integration** - Native access to your OmniFocus custom perspectives via `Perspective.Custom` API
- **🌳 Hierarchical Display** - Tree-style task visualization with parent-child relationships
- **🧠 AI-Optimized** - Enhanced tool descriptions prevent AI confusion between perspectives and tags
- **⚡ Zero Setup** - Works with your existing custom perspectives instantly

### 🏗️ **Complete Task Management**

- **🏗️ Complete Subtask Support** - Create hierarchical tasks with parent-child relationships
- **🔍 Built-in Perspectives** - Access Inbox, Flagged, Forecast, and Tag-based views
- **🚀 Ultimate Task Filter** - Advanced filtering beyond OmniFocus native capabilities
- **🎯 Batch Operations** - Add/remove multiple tasks efficiently
- **📊 Smart Querying** - Find tasks by ID, name, or complex criteria
- **🔄 Full CRUD Operations** - Create, read, update, delete tasks and projects
- **📁 Folder Management** - Full CRUD for folders with nested hierarchy, move/rename, and content inspection
- **🏷️ Tag Management** - Full CRUD for tags with nesting, status control, and fuzzy search
- **🔔 Task Notifications** - List, add, and remove reminders (absolute time or relative to due date)
- **💬 MCP Prompts** - 5 guided workflows (daily, weekly, inbox processing, project planning, project shaping)
- **📡 MCP Resources** - 3 live JSON snapshots (inbox, today, active projects)
- **🛠️ Agent Skill** - One-command install of a local CLI covering all 25 consolidated tools, to keep AI context usage low
- **📅 Time Management** - Due, defer, planned dates, estimates, and scheduling
- **🏷️ Advanced Tagging** - Tag-based filtering with exact/partial matching
- **🚫 Mutually Exclusive Tags** - Automatically respects exclusive tag groups when applying tags
- **🔁 Repeat Rules** - Full OmniFocus 4.7+ repetition support (ICS rules, schedule type, anchor date, catch-up, end date, count)
- **🤖 AI Integration** - Seamless Claude AI integration for intelligent workflows
- **🖼️ Attachment-Aware Reads** - Surface note attachments and linked files before deciding whether AI should inspect them

## 📦 Installation

### Claude Code

#### Quick Install (recommended)

```bash
# One-line installation
claude mcp add omnifocus-enhanced -- npx -y omnifocus-mcp-enhanced
```

#### Alternative methods for Claude Code:

```bash
# Upgrade to latest
npm install -g omnifocus-mcp-enhanced@latest

# Global installation
npm install -g omnifocus-mcp-enhanced
claude mcp add omnifocus-enhanced -- omnifocus-mcp-enhanced

# Local project installation
git clone https://github.com/jqlts1/omnifocus-mcp-enhanced.git
cd omnifocus-mcp-enhanced
npm install && npm run build
claude mcp add omnifocus-enhanced -- node "/path/to/omnifocus-mcp-enhanced/dist/server.js"
```

### Claude Desktop / Cowork

Add the server to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "omnifocus-enhanced": {
      "command": "npx",
      "args": ["-y", "omnifocus-mcp-enhanced"]
    }
  }
}
```

For a local clone, use:

```json
{
  "mcpServers": {
    "omnifocus-enhanced": {
      "command": "node",
      "args": ["/path/to/omnifocus-mcp-enhanced/dist/server.js"]
    }
  }
}
```

Restart Claude Desktop after editing the config file.

### Using Both Claude Code and Claude Desktop / Cowork

Claude Code and Claude Desktop read separate configurations. If you want to use this MCP server from both, you need to install it in both places — run `claude mcp add` for Claude Code **and** add the entry to `claude_desktop_config.json` for Claude Desktop / Cowork.

## 📋 Requirements

- **macOS 10.15+** - OmniFocus is macOS-only
- **OmniFocus 3+** - The application must be installed and running
- **OmniFocus Pro** - Required for custom perspectives (new features in v1.6.0)
- **Node.js 18+** - For running the MCP server
- **Any MCP-capable client** - Claude Code, `mcporter`, or another MCP host

## 🚦 Start Here

If you only want the fastest way to understand this project, remember this:

1. Connect the MCP server to your AI client.
2. Talk to the AI naturally.
3. Let it read, plan, create, move, or update your OmniFocus tasks for you.

You do not need to memorize all tool names first.

## 🙋 What This Is Good For

- **Daily planning**: ask your AI what is due today, what is flagged, and what you can finish in 30 minutes.
- **Project setup**: give the AI a rough goal, then let it create a project and break it into subtasks.
- **Inbox cleanup**: ask it to review Inbox tasks and sort them into next actions, projects, or someday/later buckets.
- **Perspective reviews**: ask it to open one of your custom perspectives and summarize what matters.
- **Batch capture**: paste meeting notes or a brainstorm list and let the AI create multiple tasks at once.
- **Attachment-aware review**: let the AI inspect task attachments only when needed.

## 💬 Example AI Conversations

These work well in Claude Code or any MCP client that can call the same tools.

### 1. Daily Planning

Try saying:

```text
Check my Forecast and flagged tasks, then tell me the 3 most important things to do today.
Prefer tasks that take under 60 minutes first.
```

### 2. Inbox Cleanup

Try saying:

```text
Review my Inbox and group the tasks into:
1. do today
2. schedule later
3. turn into projects
Then help me clean up the obvious ones.
```

### 3. Turn an Idea Into a Project

Try saying:

```text
Create a project called "Launch spring newsletter".
Add the main subtasks, estimated minutes, and mark the most important step as flagged.
```

### 4. Use a Custom Perspective

Try saying:

```text
Open my custom perspective "今日工作安排" and summarize:
- what is due soon
- what looks blocked
- what I can finish quickly
```

### 5. Batch Add From Notes

Try saying:

```text
Turn these meeting notes into OmniFocus tasks under the project "Website Refresh".
Use subtasks where it makes sense and keep the task names short.
```

### 6. Review Attachments Only When Needed

Try saying:

```text
Find the task called "Review design draft".
Show me what attachments it has first.
Only open the image attachment if there is one.
```

## 🧭 Practical Usage Tips

- Ask the AI to **look first, then change things** if you want safer workflows.
- Use **task IDs** when you have duplicate task names.
- For **subtasks**, let the parent task determine the project. Do not also pass `projectName`.
- For `mcporter`, complex arrays are much more reliable with `--args '{...}'`.

## 🎯 Core Capabilities

### 1. 🏗️ Subtask Management

Create complex task hierarchies with ease:

```json
// Create subtask by parent task name
{
  "name": "Analyze competitor keywords",
  "parentTaskName": "SEO Strategy",
  "note": "Focus on top 10 competitors",
  "dueDate": "2025-01-15",
  "estimatedMinutes": 120,
  "tags": ["SEO", "Research"]
}

// Create subtask by parent task ID
{
  "name": "Write content outline",
  "parentTaskId": "loK2xEAY4H1",
  "flagged": true,
  "estimatedMinutes": 60
}
```

### 2. 🔍 Perspective Views

Access all major OmniFocus perspectives programmatically:

```bash
# Inbox perspective
get_tasks {"source": "inbox", "hideCompleted": true}

# Flagged tasks
get_tasks {"source": "flagged", "projectFilter": "SEO Project"}

# Forecast (next 7 days)
get_tasks {"source": "forecast", "days": 7, "hideCompleted": true}

# Tasks by tag
get_tasks {"source": "tag", "tagName": "AI", "exactMatch": false}

# Every result shows its direct subtask count; expand the task tree on demand
get_tasks {"source": "inbox", "showSubtasks": true, "maxSubtaskDepth": 2}
```

`showSubtasks` defaults to `false`. `maxSubtaskDepth` is a non-negative integer: `0` expands nothing, `1` shows direct children, and omitting it allows full recursion. List commands apply their completed-task visibility to descendants. Expanded descendants provide structure and do not need to match the top-level filter themselves.

Detailed task reads preserve the assigned leaf tag and show its full hierarchy path. For example, a task assigned `守一` under `团队` is rendered as `团队 / 守一`; structured results retain the leaf `id`/`name` and add `path` plus `ancestorIds`. Compact output continues to omit tags.

### 3. 🚀 Ultimate Task Filter

Create any perspective imaginable with advanced filtering:

```bash
# Time management view (30min tasks due this week)
filter_tasks {
  "taskStatus": ["Available", "Next"],
  "estimateMax": 30,
  "dueThisWeek": true
}

# Deep work view (60+ minute tasks with notes)
filter_tasks {
  "estimateMin": 60,
  "hasNote": true,
  "taskStatus": ["Available"]
}

# Planned work view (tasks planned for today)
filter_tasks {
  "plannedToday": true,
  "sortBy": "plannedDate"
}

# Project overdue tasks
filter_tasks {
  "projectFilter": "Website Redesign",
  "taskStatus": ["Overdue", "DueSoon"]
}

# Keep the same matching rules, but include two levels of task structure
filter_tasks {
  "flagged": true,
  "showSubtasks": true,
  "maxSubtaskDepth": 2
}

# Compact broad discovery for planning (omits notes and full tags)
filter_tasks {
  "plannedToday": true,
  "limit": 30,
  "outputMode": "compact"
}
```

`daily_review` is the one-step daily-planning Prompt. Optionally provide `availableMinutes`; when omitted, it does not assume an eight-hour day. It starts with exact counts, reads bounded candidates, selects exactly three priorities when possible, and returns `今日重点`, `可执行下一步`, `阻塞项`, and `容量/截止风险`. Any proposed OmniFocus changes are grouped into one confirmation request.

When a filtered result has more tasks, `filter_tasks` returns an opaque next cursor. Pass it back with the same filters and sorting:

```json
{
  "flagged": true,
  "limit": 30,
  "sortBy": "dueDate",
  "outputMode": "compact",
  "cursor": "<next cursor>"
}
```

Changing filters or sorting invalidates the cursor. `limit`, `outputMode`, and task-tree rendering may change between pages. Each page reads current OmniFocus state, so pagination is real-time best effort rather than a snapshot.

### 4. 🌟 **NEW: Native Custom Perspective Access**

Access your OmniFocus custom perspectives with hierarchical task display:

```bash
# List all your custom perspectives
manage_perspectives {"action": "list"}

# Read a perspective's filter rules, explained in plain language
manage_perspectives {"action": "get", "name": "今日工作安排"}

# 🌳 NEW: Project tree view (default)
get_tasks {
  "source": "custom",
  "perspectiveName": "今日工作安排",  # Your custom perspective name
  "displayMode": "project_tree",    # project_tree | task_tree | flat
  "hideCompleted": true
}

# Global task tree (legacy showHierarchy=true equivalent)
get_tasks {
  "source": "custom",
  "perspectiveName": "Today Review",
  "displayMode": "task_tree"
}

# Flat list (legacy groupByProject=false equivalent)
get_tasks {
  "source": "custom",
  "perspectiveName": "Weekly Planning",
  "displayMode": "flat"
}
```

**Why This Is Powerful:**

- ✅ **Native Integration** - Uses OmniFocus `Perspective.Custom` API directly
- ✅ **Tree Structure** - Visual parent-child task relationships with ├─, └─ symbols
- ✅ **Project-First Grouping** - Project header first, then nested subtasks
- ✅ **Readable Metadata** - Detailed task reads show full notes and hierarchical tag paths such as `#Team / Member`; compact reads still omit tags
- ✅ **AI-Friendly** - Enhanced descriptions prevent tool selection confusion
- ✅ **Professional Output** - Clean, readable task hierarchies

### 5. 🎯 Batch Operations

Efficiently manage multiple tasks:

```json
{
  "items": [
    {
      "type": "task",
      "name": "Website Technical SEO",
      "projectName": "SEO Project",
      "note": "Optimize technical aspects"
    },
    {
      "type": "task",
      "name": "Page Speed Optimization",
      "parentTaskName": "Website Technical SEO",
      "estimatedMinutes": 180,
      "flagged": true
    },
    {
      "type": "task",
      "name": "Mobile Responsiveness",
      "parentTaskName": "Website Technical SEO",
      "estimatedMinutes": 90
    }
  ]
}
```

CLI tip for `mcporter`:

```bash
# Prefer explicit JSON args for complex arrays / nested objects
mcporter call omnifocus.batch_add_items --args '{
  "items": [
    {
      "type": "task",
      "name": "Website Technical SEO",
      "projectName": "SEO Project"
    }
  ]
}'
```

If you pass a subtask with `parentTaskId` or `parentTaskName`, do not also pass `projectName`. Subtasks inherit the project from their parent task.

Working `mcporter` examples:

```bash
# 1) Batch-create top-level tasks in a project
mcporter call omnifocus.batch_add_items --args '{
  "items": [
    {
      "type": "task",
      "name": "Parent: Category A",
      "projectName": "OmniFocus MCP Batch Test"
    },
    {
      "type": "task",
      "name": "Parent: Category B",
      "projectName": "OmniFocus MCP Batch Test"
    }
  ]
}'
```

```bash
# 2) Create parent + child in one batch
mcporter call omnifocus.batch_add_items --args '{
  "items": [
    {
      "type": "task",
      "name": "Parent: Category A",
      "projectName": "OmniFocus MCP Batch Test"
    },
    {
      "type": "task",
      "name": "Child: A1",
      "parentTaskName": "Parent: Category A"
    }
  ]
}'
```

```bash
# 3) Safer two-step flow when adding many subtasks to existing parents
mcporter call omnifocus.batch_add_items --args '{
  "items": [
    {
      "type": "task",
      "name": "Child: A1",
      "parentTaskName": "Parent: Category A"
    },
    {
      "type": "task",
      "name": "Child: A2",
      "parentTaskName": "Parent: Category A"
    },
    {
      "type": "task",
      "name": "Child: B1",
      "parentTaskName": "Parent: Category B"
    }
  ]
}'
```

This will fail, by design:

```bash
mcporter call omnifocus.batch_add_items --args '{
  "items": [
    {
      "type": "task",
      "name": "Child: A1",
      "projectName": "OmniFocus MCP Batch Test",
      "parentTaskName": "Parent: Category A"
    }
  ]
}'
```

Because a subtask must inherit its project from the parent task.

### 6. Project Shaping

Use `project_shaping` to turn meeting notes, brainstorming, or a task list into a readable project tree. The assistant labels inferred metadata, resolves Folder and Tag stable IDs, and asks for explicit confirmation of the final tree before calling `create_project_from_outline` once.

```json
{
  "project": {
    "name": "Website launch",
    "folderId": "folder-id",
    "tagIds": ["tag-id"],
    "sequential": true,
    "tasks": [
      {
        "name": "Confirm information architecture",
        "estimatedMinutes": 60,
        "children": [{ "name": "Review navigation" }]
      }
    ]
  }
}
```

The action accepts structured, reviewed fields—not raw meeting notes. It supports at most 200 tasks and eight task levels. Missing references cause zero writes. Execution or read-back failure triggers one bounded OmniFocus Undo; if cleanup cannot be confirmed, the error includes the residual project ID.

### 7. Repeating Tasks

Repetition is a first-class field. Create it, read it, change it, and clear it—all verified.

```json
{
  "name": "Weekly admin checklist",
  "repetition": {
    "ruleString": "FREQ=WEEKLY;BYDAY=FR",
    "scheduleType": "Regularly",
    "anchorDateKey": "DueDate",
    "catchUpAutomatically": true
  }
}
```

- `add_omnifocus_task` and task nodes of `create_project_from_outline` accept the same object. `UNTIL` and `COUNT` belong inside `ruleString`; the deprecated `method` parameter is never exposed.
- `get_task_by_id` reports the stored rule plus the next occurrence. List reads add only `isRepeating`, so broad queries stay small.
- `set_repetition_rule` verifies the saved rule field by field. A failed write or mismatch restores the previous rule; if restoration cannot be confirmed, the error names the task that needs manual review.
- A verification failure during creation removes the task, or rolls back the whole project tree, so no item keeps a recurrence the user did not confirm.

### 8. 🖼️ Attachment Inspection

Discover images and linked files on a task first, then read only the attachment you need:

```bash
# List task details plus attachment metadata
get_task_by_id {
  "taskId": "abc123"
}

# Open an attachment returned by get_task_by_id
read_task_attachment {
  "taskId": "abc123",
  "attachmentId": "embedded-1"
}
```

`get_task_by_id` now reports attachment IDs, names, MIME guesses, source (`embedded` vs `linked`), and sizes when available. `read_task_attachment` returns images as MCP image content when possible, so AI clients can inspect the image directly instead of parsing base64 from plain text.

## 🛠️ Complete Tool Reference — 25 Tools

### Task and project operations

1. **dump_database** - Export the OmniFocus database
2. **add_omnifocus_task** - Create one task, including subtasks and repetition
3. **add_project** - Create one project
4. **remove_item** - Delete a task or project
5. **edit_item** - Edit or reposition a task or project
6. **move_task** - Move one task
7. **batch_move_tasks** - Atomically move a confirmed task set
8. **batch_complete_tasks** - Atomically complete or reopen up to 100 tasks
9. **batch_add_items** - Add multiple tasks or projects
10. **batch_remove_items** - Atomically delete a confirmed item set
11. **create_project_from_outline** - Create and verify one complete project tree
12. **get_task_by_id** - Read one task and its attachment metadata
13. **read_task_attachment** - Read one reported task attachment
14. **get_tasks** - Read inbox, flagged, forecast, tag, or custom-perspective tasks via `source`
15. **filter_tasks** - Filter tasks by status, dates, project, tags, text, and more; use `{ "completedToday": true }` for today's completed work
16. **get_projects** - Read all projects or use `view=due_for_review` for projects due for review
17. **mark_projects_reviewed** - Atomically mark confirmed projects reviewed
18. **set_repetition_rule** - Set, update, or clear a task repeat rule

### Organization and productivity

19. **manage_perspectives** - `list`, `get`, or `update` custom perspectives and their filter rules
20. **manage_folders** - `list`, `get`, `add`, `edit`, or `remove` folders
21. **manage_tags** - `list`, `search`, `add`, `edit`, or `remove` tags
22. **manage_task_notifications** - `list`, `add`, or `remove` task reminders
23. **append_to_note** - Append without overwriting a task/project note
24. **count_tasks** - Count tasks using the filter engine
25. **duplicate_task** - Duplicate a task, optionally with subtasks

The four `manage_*` tools mix reads and writes, so their MCP annotations are deliberately conservative and destructive. `list`/`get`/`search` actions do not mutate; remove actions require the same confirmation discipline as dedicated deletion tools. `manage_perspectives` never creates or deletes a perspective — OmniFocus exposes no automation API for either — so its only write is an in-place edit.

## 💬 MCP Prompts (NEW in v1.10.0)

Guided review workflows that pull live OmniFocus data and hand the AI a structured plan of attack. In clients like Claude Desktop these appear as selectable prompts.

| Prompt               | Arguments | What it does                                                                                         |
| -------------------- | --------- | ---------------------------------------------------------------------------------------------------- |
| **daily_review**     | –         | Pulls overdue, due-soon, and flagged tasks; produces today's top 3 priorities                        |
| **weekly_review**    | –         | GTD weekly review: classifies active projects as on track / at risk / stalled, proposes next actions |
| **inbox_processing** | –         | Walks inbox items one by one through GTD clarification (delete/defer/delegate/keep)                  |
| **project_planning** | `project` | Breaks a project into sequenced, estimated next actions (fuzzy-matches the project name)             |
| **project_shaping**  | –         | Turns conversation text into one reviewed, confirmed, verified project tree                          |

## 📡 MCP Resources (NEW in v1.10.0)

Live JSON snapshots your AI client can read without calling a tool.

| Resource URI           | Contents                                               |
| ---------------------- | ------------------------------------------------------ |
| `omnifocus://inbox`    | Current inbox tasks                                    |
| `omnifocus://today`    | Overdue + due today + flagged, grouped                 |
| `omnifocus://projects` | Active projects with task counts and stalled detection |

## 🛠️ Agent Skill (NEW in v1.11.0)

With 25 consolidated tools, loading every MCP schema still costs context. The bundled **`omnifocus-cli` skill** generates a local CLI so agents can drive OmniFocus through compact shell commands instead.

### Install

```bash
npx -y omnifocus-mcp-enhanced@latest install-skill
```

By default, this installs **only in the current project**:

```text
your-project/
├── .claude/skills/omnifocus-cli/
│   ├── SKILL.md
│   └── bin/omnifocus-enhanced.cjs
└── config/mcporter.json
```

Use `--global` only when you intentionally want the skill available in every
project:

```bash
npx -y omnifocus-mcp-enhanced@latest install-skill --global
```

The global skill is installed in `~/.claude/skills/omnifocus-cli/`, and its MCP
server registration is written to the home mcporter configuration.

That single command:

1. Registers the MCP server with [mcporter](https://github.com/openclaw/mcporter), pinned to the exact package version that shipped the installer, with `lifecycle: "keep-alive"` so repeat calls reuse one warm server instead of cold starting one each time
2. Generates a standalone CLI from the server's live tool schemas (~20s), pinned to the Node runtime so the CLI stays runnable from any shell
3. Installs `SKILL.md` + the CLI into the current project's `.claude/skills/omnifocus-cli/` (or `~/.claude/skills/omnifocus-cli/` with `--global`)
4. Verifies all 25 tools are present, that keep-alive reached the generated bundle, and that OmniFocus is reachable

Install elsewhere with `CLAUDE_SKILLS_DIR=/custom/path npx -y omnifocus-mcp-enhanced@latest install-skill` (`AGENT_SKILLS_DIR` remains available as a legacy alias).

### Why generate the CLI locally?

The CLI is **not** shipped pre-built. It is generated on your machine from the server version you actually have installed, which means it can never silently lack the newest commands — the most common failure mode for this kind of tooling.

### Usage

```bash
CLI=.claude/skills/omnifocus-cli/bin/omnifocus-enhanced.cjs

$CLI get-tasks --source inbox
$CLI count-tasks --flagged true
$CLI filter-tasks --task-status Available,Next --due-this-week true
$CLI manage-folders --action add --name "Clients" --parent-folder-name "Work"
```

Flag conventions: booleans need explicit values (`--flagged true`), arrays are comma-separated (`--task-status Available,Next`), and `--raw '<json>'` bypasses flag parsing for complex nested arguments.

### Keeping it current

Re-run the installer after upgrading the server — a stale CLI will silently miss new tools:

```bash
npm install -g omnifocus-mcp-enhanced@latest
npx -y omnifocus-mcp-enhanced@latest install-skill
```

`install-skill` is the only supported refresh path. Do **not** use `mcporter
generate-cli --from <bundle>`, even though `mcporter inspect-cli` suggests it:
the replay metadata drops the server's `lifecycle`, so regenerating that way
silently disables keep-alive and roughly doubles the latency of every command.

The keep-alive daemon runs against the generated CLI's own config, so a plain
`mcporter daemon status` reads the wrong file and always reports "not running".
Inspect the real one with:

```bash
npx -y mcporter@latest --config $(ls -t ~/.mcporter/generated/*.json | head -1) daemon status
```

Batch move feature roadmap (future): [docs/roadmap/2026-02-25-batch-move-tasks-plan.md](docs/roadmap/2026-02-25-batch-move-tasks-plan.md)

## 🚀 Quick Start Examples

### Basic Task Creation

```bash
# Simple task
add_omnifocus_task {
  "name": "Review quarterly goals",
  "projectName": "Planning",
  "dueDate": "2025-01-31",
  "plannedDate": "2025-01-28"
}
```

### Advanced Task Management

```bash
# Create parent task
add_omnifocus_task {
  "name": "Launch Product Campaign",
  "projectName": "Marketing",
  "dueDate": "2025-02-15",
  "tags": ["Campaign", "Priority"]
}

# Add subtasks
add_omnifocus_task {
  "name": "Design landing page",
  "parentTaskName": "Launch Product Campaign",
  "estimatedMinutes": 240,
  "flagged": true
}
```

### Task Move Operations

```bash
# Move task to a project
move_task {
  "id": "task-id-123",
  "targetProjectName": "Planning"
}

# Move task under another task
move_task {
  "id": "task-id-123",
  "targetParentTaskId": "parent-task-id-456"
}

# Move task back to inbox
move_task {
  "id": "task-id-123",
  "targetInbox": true
}

# Execute a user-confirmed organization plan as one atomic batch
batch_move_tasks {
  "moves": [
    { "taskId": "task-1", "projectId": "project-1" },
    { "taskId": "task-2", "parentTaskId": "parent-task-1" }
  ]
}
```

Task move safety rules:

- Name lookups fail fast on duplicates and ask you to use IDs.
- Destination must be exactly one type: project OR parent task OR inbox.
- Moving a task into itself/its descendants is blocked to prevent cycles.
- `batch_move_tasks` accepts stable IDs only, validates the complete plan before changing anything, and verifies every final destination.
- If batch preflight fails, no task is moved. Call it only after the user confirms the displayed organization proposal.

You can also move with `edit_item` and combine move + field updates:

```bash
edit_item {
  "itemType": "task",
  "id": "task-id-123",
  "newProjectName": "Planning",
  "newName": "Review tmux workflow",
  "newFlagged": true
}
```

### Smart Task Discovery

```bash
# Find high-priority work
filter_tasks {
  "flagged": true,
  "taskStatus": ["Available"],
  "estimateMax": 120,
  "hasEstimate": true
}

# Today's completed work
filter_tasks {
  "completedToday": true,
  "taskStatus": ["Completed"],
  "sortBy": "project"
}
```

### 🌟 Custom Perspective Usage

```bash
# List your custom perspectives
manage_perspectives {"action": "list"}

# Access a custom perspective with project tree
get_tasks {
  "source": "custom",
  "perspectiveName": "Today Review",
  "displayMode": "project_tree",
  "hideCompleted": true
}

# Quick flat view of weekly planning
get_tasks {
  "source": "custom",
  "perspectiveName": "Weekly Planning",
  "displayMode": "flat"
}
```

### 📁 Folder Management

```bash
# List all folders with project counts
manage_folders {"action": "list", "includeDropped": false}

# Create a top-level folder
manage_folders {"action": "add", "name": "Work"}

# Create a nested folder
manage_folders {"action": "add", "name": "Clients", "parentFolderName": "Work"}

# Inspect a folder's projects and subfolders
manage_folders {"action": "get", "name": "Work"}

# Rename or move a folder (empty string moves to root)
manage_folders {"action": "edit", "name": "Clients", "newName": "Key Clients"}
manage_folders {"action": "edit", "name": "Key Clients", "newParentFolderName": ""}

# Delete a folder (⚠️ also deletes all contained projects and tasks)
manage_folders {"action": "remove", "name": "Old Archive"}
```

### ⚡ Productivity Tools

```bash
# Append a progress note without overwriting the existing note
append_to_note {
  "itemType": "task",
  "name": "Write report",
  "text": "Drafted section 1 today"
}

# Fast count: how many flagged tasks are still actionable?
count_tasks {
  "flagged": true,
  "taskStatus": ["Available", "Next", "DueSoon", "Overdue"]
}

# How many tasks remain in a project (by status breakdown)
count_tasks {"projectFilter": "Website Redesign"}

# Duplicate a task template with its subtasks
duplicate_task {
  "name": "Weekly Review Checklist",
  "newName": "Weekly Review - 2026-03-02"
}

# Duplicate without subtasks
duplicate_task {"taskId": "abc123", "includeSubtasks": false}
```

### 🏷️ Tag Management

```bash
# Search and list tags
manage_tags {"action": "search", "query": "work"}
manage_tags {"action": "list", "includeInactive": false}

# Create a tag, optionally nested
manage_tags {"action": "add", "name": "Deep Work"}
manage_tags {"action": "add", "name": "Client A", "parentTagName": "Clients"}

# Rename, pause, or move a tag ("" moves to root)
manage_tags {"action": "edit", "name": "Deep Work", "newName": "Focus"}
manage_tags {"action": "edit", "name": "Focus", "newStatus": "onHold"}
manage_tags {"action": "edit", "name": "Client A", "newParentTagName": ""}

# Delete a tag (tasks are kept, they just lose the tag)
manage_tags {"action": "remove", "name": "Obsolete"}
```

### 🔔 Task Notifications

```bash
# See what reminders a task has
manage_task_notifications {"action": "list", "taskName": "Submit report"}

# Remind at a fixed time
manage_task_notifications {
  "action": "add",
  "taskName": "Submit report",
  "absoluteDate": "2026-03-05T09:00:00"
}

# Remind 30 minutes before the due date (requires a due date)
manage_task_notifications {
  "action": "add",
  "taskName": "Submit report",
  "relativeMinutes": -30
}

# Remove one by index, or clear them all
manage_task_notifications {"action": "remove", "taskName": "Submit report", "index": 0}
manage_task_notifications {"action": "remove", "taskName": "Submit report", "removeAll": true}
```

## 🔧 Configuration

### Claude Code

Verify the server is registered:

```bash
# Check MCP status
claude mcp list

# Test basic connection
get_tasks {"source": "inbox"}

# Test custom perspective access
manage_perspectives {"action": "list"}
```

### Claude Desktop / Cowork

Open `~/Library/Application Support/Claude/claude_desktop_config.json` and confirm the `omnifocus-enhanced` entry is present under `mcpServers`. Restart the app after any changes. Once running, you can test by asking the assistant to list your inbox tasks or custom perspectives.

### Troubleshooting

- Ensure OmniFocus 3+ is installed and running
- Verify Node.js 18+ is installed
- For Claude Code: run `claude mcp list` to confirm the server is registered
- For Claude Desktop / Cowork: verify `claude_desktop_config.json` is valid JSON and restart the app
- Enable accessibility permissions for terminal apps if needed

## 🎯 Use Cases

- **Project Management** - Create detailed project hierarchies with subtasks
- **GTD Workflow** - Leverage perspectives for Getting Things Done methodology
- **Time Blocking** - Filter by estimated time for schedule planning
- **Review Process** - Use custom perspectives for weekly/monthly reviews
- **Team Coordination** - Batch operations for team task assignment
- **AI-Powered Planning** - Let Claude analyze and organize your tasks

## 📈 Performance

- **Fast Filtering** - Native AppleScript performance
- **Batch Efficiency** - Single operation for multiple tasks
- **Memory Optimized** - Minimal resource usage
- **Scalable** - Handles large task databases efficiently

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 Links

- **NPM Package**: https://www.npmjs.com/package/omnifocus-mcp-enhanced
- **GitHub Repository**: https://github.com/jqlts1/omnifocus-mcp-enhanced
- **OmniFocus**: https://www.omnigroup.com/omnifocus/
- **Model Context Protocol**: https://modelcontextprotocol.io/
- **Claude Code**: https://docs.anthropic.com/en/docs/claude-code

## 🙏 Acknowledgments

Based on the original OmniFocus MCP server by [themotionmachine](https://github.com/themotionmachine/OmniFocus-MCP). Enhanced with perspective views, advanced filtering, and complete subtask support.

---

**⭐ Star this repo if it helps boost your productivity!**
