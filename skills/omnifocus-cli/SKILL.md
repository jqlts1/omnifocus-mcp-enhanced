---
name: omnifocus-cli
description: Use a generated local CLI for OmniFocus MCP operations (tasks, projects, folders, tags, notifications, perspectives, filtering and counting) to keep context usage low and avoid loading 35 full MCP tool schemas in chat. Trigger when the user asks for OmniFocus actions and local shell execution is available.
---

# OmniFocus CLI

## Overview

Use the local bundled CLI instead of direct MCP tool-calling for OmniFocus requests.
The MCP server exposes 35 tools; loading all their schemas into chat is expensive.
This CLI gives you the same capabilities as deterministic shell commands.

CLI location: `bin/omnifocus-enhanced.js` (relative to this skill directory).

## Flag Conventions

These matter — getting them wrong causes confusing errors:

- **Booleans need an explicit value**: `--flagged true` (NOT bare `--flagged`)
- **Arrays are comma-separated**: `--task-status Available,Next`
- **Empty string means "move to root"**: `--new-parent-folder-name ""`
- **Complex/nested args**: use `--raw '<json>'` to bypass flag parsing entirely
- **Output**: default text is best for user replies; add `-o json` only when post-processing

## Reading Tasks

```bash
# Perspectives
bin/omnifocus-enhanced.js get-inbox-tasks
bin/omnifocus-enhanced.js get-flagged-tasks
bin/omnifocus-enhanced.js get-forecast-tasks --days 7
bin/omnifocus-enhanced.js get-tasks-by-tag --tag-name "work"

# Custom perspectives (OmniFocus Pro) — these are user-defined views, NOT tags
bin/omnifocus-enhanced.js list-custom-perspectives
bin/omnifocus-enhanced.js get-custom-perspective-tasks --perspective-name "今日计划"

# Single task with attachment metadata
bin/omnifocus-enhanced.js get-task-by-id --task-id "<id>"

# Completed today
bin/omnifocus-enhanced.js get-today-completed-tasks
```

## Filtering and Counting

`filter-tasks` is the most powerful read tool. `count-tasks` takes the same
filters but returns only a total plus a status breakdown — **prefer it whenever
the user asks "how many"**, since it avoids pulling full task lists.

```bash
# Powerful filtering
bin/omnifocus-enhanced.js filter-tasks --task-status Available,Next --due-this-week true
bin/omnifocus-enhanced.js filter-tasks --estimate-max 30 --flagged true
bin/omnifocus-enhanced.js filter-tasks --planned-today true --sort-by plannedDate
bin/omnifocus-enhanced.js filter-tasks --project-filter "Website" --task-status Overdue

# Fast counts (low token cost)
bin/omnifocus-enhanced.js count-tasks --flagged true
bin/omnifocus-enhanced.js count-tasks --project-filter "Website Redesign"
bin/omnifocus-enhanced.js count-tasks --task-status Available,Next --due-this-week true
```

## Creating and Editing Tasks

```bash
# Create
bin/omnifocus-enhanced.js add-omnifocus-task --name "Review PR" --project-name "AICoding"
bin/omnifocus-enhanced.js add-omnifocus-task --name "Design page" --parent-task-name "Launch" --estimated-minutes 120

# Edit (prefer --id when names may be ambiguous)
bin/omnifocus-enhanced.js edit-item --item-type task --id "<id>" --new-name "Updated title"
bin/omnifocus-enhanced.js edit-item --item-type task --id "<id>" --new-status completed

# Move
bin/omnifocus-enhanced.js move-task --id "<id>" --target-project-name "Planning"
bin/omnifocus-enhanced.js move-task --id "<id>" --target-parent-task-id "<parent-id>"
bin/omnifocus-enhanced.js move-task --id "<id>" --target-inbox true

# Duplicate (template workflows; subtasks included by default)
bin/omnifocus-enhanced.js duplicate-task --task-name "Weekly Checklist" --new-name "Week 12"
bin/omnifocus-enhanced.js duplicate-task --task-id "<id>" --include-subtasks false

# Append to a note WITHOUT overwriting it
bin/omnifocus-enhanced.js append-to-note --item-type task --name "Write report" --text "Drafted section 1"

# Repeat rules
bin/omnifocus-enhanced.js set-repetition-rule --task-id "<id>" --rule "FREQ=WEEKLY" --schedule-type Regularly

# Delete
bin/omnifocus-enhanced.js remove-item --item-type task --id "<id>"
```

### Batch operations

Nested arrays are far more reliable via `--raw`:

```bash
bin/omnifocus-enhanced.js batch-add-items --raw '{
  "items": [
    { "type": "task", "name": "Parent A", "projectName": "My Project" },
    { "type": "task", "name": "Child A1", "parentTaskName": "Parent A" }
  ]
}'
```

**Subtask rule:** when passing `parentTaskName`/`parentTaskId`, do NOT also pass
`projectName` — subtasks inherit the project from their parent. Doing both fails by design.

## Projects

```bash
bin/omnifocus-enhanced.js add-project --name "New Project" --folder-name "Work"
bin/omnifocus-enhanced.js edit-item --item-type project --id "<id>" --new-project-status onHold
bin/omnifocus-enhanced.js append-to-note --item-type project --name "New Project" --text "Kickoff notes"
```

## Folders

```bash
bin/omnifocus-enhanced.js list-folders
bin/omnifocus-enhanced.js get-folder --name "Work"
bin/omnifocus-enhanced.js add-folder --name "Clients" --parent-folder-name "Work"
bin/omnifocus-enhanced.js edit-folder --name "Clients" --new-name "Key Clients"
bin/omnifocus-enhanced.js edit-folder --name "Key Clients" --new-parent-folder-name ""   # move to root
bin/omnifocus-enhanced.js remove-folder --name "Old Archive"
```

⚠️ **`remove-folder` also permanently deletes every project and task inside it.**
Always confirm with the user first, and mention the cascade counts it reports.

## Tags

```bash
bin/omnifocus-enhanced.js list-tags
bin/omnifocus-enhanced.js search-tags --query "work"
bin/omnifocus-enhanced.js add-tag --name "Deep Work"
bin/omnifocus-enhanced.js add-tag --name "Client A" --parent-tag-name "Clients"
bin/omnifocus-enhanced.js edit-tag --name "Deep Work" --new-name "Focus"
bin/omnifocus-enhanced.js edit-tag --name "Focus" --new-status onHold
bin/omnifocus-enhanced.js edit-tag --name "Client A" --new-parent-tag-name ""   # move to root
bin/omnifocus-enhanced.js remove-tag --name "Obsolete"
```

Removing a tag does not delete tasks — they just lose the tag. Child tags ARE deleted with the parent.

## Notifications (reminders)

```bash
bin/omnifocus-enhanced.js list-task-notifications --task-name "Submit report"

# Fixed time
bin/omnifocus-enhanced.js add-task-notification --task-name "Submit report" --absolute-date "2026-03-05T09:00:00"

# 30 minutes before the due date (task MUST have a due date)
bin/omnifocus-enhanced.js add-task-notification --task-name "Submit report" --relative-minutes -30

bin/omnifocus-enhanced.js remove-task-notification --task-name "Submit report" --index 0
bin/omnifocus-enhanced.js remove-task-notification --task-name "Submit report" --remove-all true
```

## Working Guidelines

- **Look before you change.** Read the relevant tasks first, then act.
- **Use IDs for mutations** when names could be ambiguous. Name lookups fail
  fast on duplicates and will tell you to use an ID — that is expected behavior.
- **Confirm before destructive calls**: `remove-item`, `batch-remove-items`,
  `remove-folder`, `remove-tag`.
- **Summarize long output.** Report counts, deadlines, and flagged items rather
  than dumping every row.
- **Tags vs custom perspectives are different things.** `@work` is a tag;
  "今日计划" is likely a custom perspective. Use the matching command.

## Maintenance

Regenerate the CLI after upgrading the MCP server (a stale CLI silently lacks
new commands — this is the most common failure mode):

```bash
npx -y mcporter@latest generate-cli \
  --server omnifocus-enhanced \
  --output bin/omnifocus-enhanced.ts \
  --bundle bin/omnifocus-enhanced.js
chmod +x bin/omnifocus-enhanced.js
```

Then verify the command count matches the server's tool count:

```bash
bin/omnifocus-enhanced.js --help | grep -cE "^\s+[a-z][a-z-]+"   # expect 38 (35 tools + built-ins)
```

If commands are missing, the mcporter config is likely pinned to a stale
package version. It must use `@latest`, otherwise npx serves a cached old build:

```bash
npx -y mcporter@latest config add omnifocus-enhanced \
  --command npx --arg -y --arg omnifocus-mcp-enhanced@latest --scope home
```
