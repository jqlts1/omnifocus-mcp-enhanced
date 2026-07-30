---
name: omnifocus-cli
description: Use a generated local CLI for OmniFocus MCP operations (tasks, project outlines, reviews, folders, tags, notifications, perspectives, filtering and counting) to keep context usage low and avoid loading 29 full MCP tool schemas in chat. Trigger when the user asks for OmniFocus actions and local shell execution is available.
---

# OmniFocus CLI

## Overview

Use the local bundled CLI instead of direct MCP tool-calling for OmniFocus requests.
The MCP server exposes 29 tools; loading all their schemas into chat is expensive.
This CLI gives you the same capabilities as deterministic shell commands.

CLI location: `bin/omnifocus-enhanced.cjs` (relative to this skill directory).

## Flag Conventions

These matter — getting them wrong causes confusing errors:

- **Booleans need an explicit value**: `--flagged true` (NOT bare `--flagged`)
- **Arrays are comma-separated**: `--task-status Available,Next`
- **Empty string means "move to root"**: `--new-parent-folder-name ""`
- **Complex/nested args**: use `--raw '<json>'` to bypass flag parsing entirely
- **Output**: default text is best for user replies; add `-o json` only when post-processing

## Reading Tasks

Use `get-tasks` with `--source` to select the view. All views support task-tree
aware output with `[N subtasks]` counts.

```bash
# Inbox, flagged, forecast
bin/omnifocus-enhanced.cjs get-tasks --source inbox
bin/omnifocus-enhanced.cjs get-tasks --source flagged
bin/omnifocus-enhanced.cjs get-tasks --source forecast --days 7

# By tag
bin/omnifocus-enhanced.cjs get-tasks --source tag --tag-name "work"

# Custom perspectives (OmniFocus Pro)
bin/omnifocus-enhanced.cjs get-tasks --source custom --perspective-name "今日计划"

# Subtask expansion
bin/omnifocus-enhanced.cjs get-tasks --source inbox --show-subtasks true
bin/omnifocus-enhanced.cjs get-tasks --source flagged --show-subtasks true --max-subtask-depth 1
bin/omnifocus-enhanced.cjs get-tasks --source forecast --days 7 --show-subtasks true --max-subtask-depth 2
bin/omnifocus-enhanced.cjs get-tasks --source tag --tag-name "work" --show-subtasks true

# Single task with attachment metadata
bin/omnifocus-enhanced.cjs get-task-by-id --task-id "<id>"
bin/omnifocus-enhanced.cjs get-task-by-id --task-id "<id>" --show-subtasks true

# Completed today
bin/omnifocus-enhanced.cjs get-today-completed-tasks
```

## Inbox Organization

When the user asks to clean up Inbox:

1. Read Inbox and inspect parent tasks before treating them as leaf actions.
2. Resolve destination projects or parent tasks to stable IDs.
3. Present one compact proposal grouped by destination.
4. Ask for explicit confirmation of that proposal.
5. Call `batch-move-tasks` once. Do not add tag/date/name edits to this batch.
6. Report verified moves and read Inbox again to show what remains.

`batch-move-tasks` is intentionally simple: no preview, verification, or
partial-success flags are needed. Proposal review happens before the call; the
server always preflights the complete batch, executes atomically, and verifies
the result.

## Confirmed Batch Removal

For destructive cleanup, resolve every task or project to a stable ID, show
the complete deletion set and contained-item counts, and ask for explicit
confirmation before calling `batch-remove-items`. Do not use names as a
fallback. The server preflights the complete set, rolls back completed
deletions through OmniFocus Undo if execution fails, and verifies every ID is
absent afterward.

## Filtering and Counting

`filter-tasks` is the most powerful read tool. `count-tasks` takes the same
filters but returns only a total plus a status breakdown — **prefer it whenever
the user asks "how many"**, since it avoids pulling full task lists.

```bash
# Powerful filtering
bin/omnifocus-enhanced.cjs filter-tasks --task-status Available,Next --due-this-week true
bin/omnifocus-enhanced.cjs filter-tasks --estimate-max 30 --flagged true
bin/omnifocus-enhanced.cjs filter-tasks --planned-today true --sort-by plannedDate
bin/omnifocus-enhanced.cjs filter-tasks --project-filter "Website" --task-status Overdue
bin/omnifocus-enhanced.cjs filter-tasks --flagged true --show-subtasks true --max-subtask-depth 2

# Stale task detection — find tasks not updated recently
bin/omnifocus-enhanced.cjs filter-tasks --modified-before 2026-06-29
bin/omnifocus-enhanced.cjs filter-tasks --created-before 2026-01-01 --modified-before 2026-06-01
bin/omnifocus-enhanced.cjs count-tasks --modified-before 2026-06-29

# Fast counts (low token cost)
bin/omnifocus-enhanced.cjs count-tasks --flagged true
bin/omnifocus-enhanced.cjs count-tasks --project-filter "Website Redesign"
bin/omnifocus-enhanced.cjs count-tasks --task-status Available,Next --due-this-week true
```

## Daily Planning

Use a count-first workflow so broad planning does not load large notes or task
lists unnecessarily:

1. Count overdue, due-today, planned-today, and flagged remaining work.
2. Fetch bounded candidates with `filter-tasks --output-mode compact`.
3. Deduplicate candidates by stable task ID.
4. Select exactly three priorities when at least three eligible tasks exist.
5. Output `今日重点`, `可执行下一步`, `阻塞项`, and `容量/截止风险`.
6. Summarize proposed changes and ask once before applying them.

```bash
bin/omnifocus-enhanced.cjs count-tasks --overdue true
bin/omnifocus-enhanced.cjs count-tasks --due-today true
bin/omnifocus-enhanced.cjs count-tasks --planned-today true
bin/omnifocus-enhanced.cjs count-tasks --flagged true
bin/omnifocus-enhanced.cjs filter-tasks --due-today true --limit 30 --output-mode compact
bin/omnifocus-enhanced.cjs filter-tasks --planned-today true --limit 30 --output-mode compact
```

If the user gives available minutes, compare only known estimates against that
capacity and list missing estimates as uncertainty. Never assume missing
estimates are zero or assume an eight-hour day.

## Paginating Filtered Tasks

`filter-tasks` returns an opaque next cursor when more matches exist. Pass it
back unchanged with the same filters and sorting:

```bash
bin/omnifocus-enhanced.cjs filter-tasks --flagged true --limit 20 --sort-by dueDate --output-mode compact
bin/omnifocus-enhanced.cjs filter-tasks --flagged true --limit 20 --sort-by dueDate --output-mode compact --cursor '<next cursor>'
```

Changing filters or sorting invalidates the cursor. Page size, output mode, and
task-tree rendering may change between pages. Pagination reads current
OmniFocus state on every page, so it is best-effort rather than a snapshot.

## Creating and Editing Tasks

```bash
# Create
bin/omnifocus-enhanced.cjs add-omnifocus-task --name "Review PR" --project-name "AICoding"
bin/omnifocus-enhanced.cjs add-omnifocus-task --name "Design page" --parent-task-name "Launch" --estimated-minutes 120

# Edit (prefer --id when names may be ambiguous)
bin/omnifocus-enhanced.cjs edit-item --item-type task --id "<id>" --new-name "Updated title"
bin/omnifocus-enhanced.cjs edit-item --item-type task --id "<id>" --new-status completed

# Move
bin/omnifocus-enhanced.cjs move-task --id "<id>" --target-project-name "Planning"
bin/omnifocus-enhanced.cjs move-task --id "<id>" --target-parent-task-id "<parent-id>"
bin/omnifocus-enhanced.cjs move-task --id "<id>" --target-inbox true

# Move a user-confirmed Inbox organization plan atomically. Use stable IDs.
# The server validates the complete batch and verifies every destination.
bin/omnifocus-enhanced.cjs batch-move-tasks --raw '{
  "moves": [
    { "taskId": "<task-1>", "projectId": "<project-1>" },
    { "taskId": "<task-2>", "parentTaskId": "<parent-task>" }
  ]
}'

# Duplicate (template workflows; subtasks included by default)
bin/omnifocus-enhanced.cjs duplicate-task --task-name "Weekly Checklist" --new-name "Week 12"
bin/omnifocus-enhanced.cjs duplicate-task --task-id "<id>" --include-subtasks false

# Append to a note WITHOUT overwriting it
bin/omnifocus-enhanced.cjs append-to-note --item-type task --name "Write report" --text "Drafted section 1"

# Repeat rules
bin/omnifocus-enhanced.cjs set-repetition-rule --task-id "<id>" --rule "FREQ=WEEKLY" --schedule-type Regularly

# Delete
bin/omnifocus-enhanced.cjs remove-item --item-type task --id "<id>"
```

### Batch operations

Nested arrays are far more reliable via `--raw`:

```bash
bin/omnifocus-enhanced.cjs batch-add-items --raw '{
  "items": [
    { "type": "task", "name": "Parent A", "projectName": "My Project" },
    { "type": "task", "name": "Child A1", "parentTaskName": "Parent A" }
  ]
}'
```

**Subtask rule:** when passing `parentTaskName`/`parentTaskId`, do NOT also pass
`projectName` — subtasks inherit the project from their parent. Doing both fails by design.

### Batch completion

Mark up to 100 tasks complete or incomplete by stable ID in one verified transaction:

```bash
bin/omnifocus-enhanced.cjs batch-complete-tasks --raw '{
  "items": [
    {"taskId": "<id-1>", "action": "complete"},
    {"taskId": "<id-2>", "action": "complete", "completionDate": "2026-07-28T18:00:00+08:00"},
    {"taskId": "<id-3>", "action": "incomplete"}
  ]
}'
```

- `action` ∈ `complete | incomplete`
- `completionDate` only valid with `action=complete`; omitted uses now
- Preflights every ID, verifies every result, restores on failure
- Repeating tasks generate new instances when completed; the tool reports `generatedTaskId` and `nextOccurrence`
- Idempotent items are reported as `unchanged` rather than failing

## Project Shaping

To turn meeting notes, brainstorming, or a task list into a new project:

1. Extract a readable project tree and clearly label every inferred date, tag,
   estimate, note, folder, flag, or sequential setting.
2. Resolve folders and tags with `manage-folders --action list` and `manage-tags --action list`. Use their
   stable IDs only; never guess by name or ask the action tool to create them.
3. Show the complete final tree and ask for explicit confirmation immediately
   before creation. An earlier draft approval is not confirmation.
4. Call `create-project-from-outline` once with reviewed structured fields, not
   raw meeting notes or conversational instructions.
5. Report the verified project ID and every returned path-to-ID mapping. If the
   result is `ROLLBACK_UNCONFIRMED`, show the residual project ID and recovery
   instruction before retrying.

The request supports at most 200 tasks and eight task levels. Tasks may carry a
`repetition` object using an ICS `ruleString` (encode `UNTIL`/`COUNT` there) plus
optional `scheduleType`, `anchorDateKey`, and `catchUpAutomatically`. Projects
themselves cannot repeat through this tool. For nested input, use `--raw`:

```bash
bin/omnifocus-enhanced.cjs create-project-from-outline --raw '{
  "project": {
    "name": "Website launch",
    "folderId": "<folder-id>",
    "tagIds": ["<tag-id>"],
    "sequential": true,
    "tasks": [
      {
        "name": "Confirm information architecture",
        "estimatedMinutes": 60,
        "children": [{"name": "Review navigation"}]
      },
      {
        "name": "Weekly launch check-in",
        "repetition": {
          "ruleString": "FREQ=WEEKLY;BYDAY=FR",
          "scheduleType": "Regularly",
          "anchorDateKey": "DueDate"
        }
      }
    ]
  }
}'
```

## Repeating Tasks

Repetition is readable and writable:

- `get-task-by-id` reports the rule, schedule type, anchor date, catch-up
  behavior, and the next occurrence. List reads only mark a task as repeating.
- `add-omnifocus-task --raw` accepts the same `repetition` object at creation.
  If verification fails, the created task is removed again.
- `set-repetition-rule` updates or clears an existing rule. It verifies the
  saved rule and restores the previous one on failure; a
  `REPETITION_RESTORE_UNCONFIRMED` result names the task needing manual review.

```bash
bin/omnifocus-enhanced.cjs add-omnifocus-task --raw '{
  "name": "Weekly admin checklist",
  "repetition": {"ruleString": "FREQ=WEEKLY;BYDAY=FR", "anchorDateKey": "DueDate"}
}'
bin/omnifocus-enhanced.cjs set-repetition-rule --task-id "<id>" --rule-string "FREQ=MONTHLY" --schedule-type FromCompletion
bin/omnifocus-enhanced.cjs set-repetition-rule --task-id "<id>" --clear true
bin/omnifocus-enhanced.cjs get-task-by-id --task-id "<id>"
```

## Projects

For a weekly review, first read projects due for review and discuss their
outcomes, next actions, and risks. Discussion is not confirmation. Present the
final project IDs and call `mark-projects-reviewed` only after the user
explicitly confirms that set. The server preflights the whole set and verifies
the saved review dates automatically.

```bash
bin/omnifocus-enhanced.cjs get-projects --status Active
bin/omnifocus-enhanced.cjs get-projects --status Active,OnHold --folder-name "Work"
bin/omnifocus-enhanced.cjs get-projects-due-for-review
bin/omnifocus-enhanced.cjs get-projects-due-for-review --include-on-hold true
bin/omnifocus-enhanced.cjs mark-projects-reviewed --project-ids "<project-1>,<project-2>"
bin/omnifocus-enhanced.cjs add-project --name "New Project" --folder-name "Work"
bin/omnifocus-enhanced.cjs edit-item --item-type project --id "<id>" --new-project-status onHold
bin/omnifocus-enhanced.cjs append-to-note --item-type project --name "New Project" --text "Kickoff notes"
```

## Folders

Use `manage-folders` with `--action` to select the operation.

```bash
bin/omnifocus-enhanced.cjs manage-folders --action list
bin/omnifocus-enhanced.cjs manage-folders --action get --name "Work"
bin/omnifocus-enhanced.cjs manage-folders --action add --name "Clients" --parent-folder-name "Work"
bin/omnifocus-enhanced.cjs manage-folders --action edit --name "Clients" --new-name "Key Clients"
bin/omnifocus-enhanced.cjs manage-folders --action edit --name "Key Clients" --parent-folder-name ""   # move to root
bin/omnifocus-enhanced.cjs manage-folders --action remove --name "Old Archive"
```

⚠️ **`manage-folders --action remove` also permanently deletes every project and task inside it.**
Always confirm with the user first, and mention the cascade counts it reports.

## Tags

Use `manage-tags` with `--action` to select the operation.

```bash
bin/omnifocus-enhanced.cjs manage-tags --action list
bin/omnifocus-enhanced.cjs manage-tags --action search --query "work"
bin/omnifocus-enhanced.cjs manage-tags --action add --name "Deep Work"
bin/omnifocus-enhanced.cjs manage-tags --action add --name "Client A" --parent-tag-name "Clients"
bin/omnifocus-enhanced.cjs manage-tags --action edit --name "Deep Work" --new-name "Focus"
bin/omnifocus-enhanced.cjs manage-tags --action edit --name "Focus" --new-status onHold
bin/omnifocus-enhanced.cjs manage-tags --action edit --name "Client A" --parent-tag-name ""   # move to root
bin/omnifocus-enhanced.cjs manage-tags --action remove --name "Obsolete"
```

Removing a tag does not delete tasks — they just lose the tag. Child tags ARE deleted with the parent.

## Notifications (reminders)

```bash
bin/omnifocus-enhanced.cjs list-task-notifications --task-name "Submit report"

# Fixed time
bin/omnifocus-enhanced.cjs add-task-notification --task-name "Submit report" --absolute-date "2026-03-05T09:00:00"

# 30 minutes before the due date (task MUST have a due date)
bin/omnifocus-enhanced.cjs add-task-notification --task-name "Submit report" --relative-minutes -30

bin/omnifocus-enhanced.cjs remove-task-notification --task-name "Submit report" --index 0
bin/omnifocus-enhanced.cjs remove-task-notification --task-name "Submit report" --remove-all true
```

## Task Health Scan

Use a count-first workflow to surface unhealthy tasks without loading full lists:

1. Count overdue, stale (not modified recently), and no-estimate tasks.
2. Fetch bounded candidates with `filter-tasks --output-mode compact`.
3. Categorize into: overdue, stale, missing estimate, missing project, flagged-but-no-date.
4. Report counts per category, then show the top offenders.
5. Suggest cleanup actions and ask before applying.

```bash
# Step 1: quick counts
bin/omnifocus-enhanced.cjs count-tasks --overdue true
bin/omnifocus-enhanced.cjs count-tasks --modified-before 2026-06-29
bin/omnifocus-enhanced.cjs count-tasks --has-estimate false --task-status Available,Next

# Step 2: fetch stale tasks (not modified in 30+ days)
bin/omnifocus-enhanced.cjs filter-tasks --modified-before 2026-06-29 --limit 30 --output-mode compact

# Step 3: fetch tasks without estimates
bin/omnifocus-enhanced.cjs filter-tasks --has-estimate false --task-status Available,Next --limit 30 --output-mode compact

# Step 4: fetch overdue tasks
bin/omnifocus-enhanced.cjs filter-tasks --overdue true --limit 30 --output-mode compact
```

Report format:
- 🔴 **Overdue**: count + top 5 with due dates
- 🟡 **Stale** (no update in 30+ days): count + top 5 with last modified dates
- ⚪ **No estimate**: count + top 5 actionable tasks
- 🚩 **Flagged but undated**: count + suggestions
- 📊 **Summary**: total health score and recommended cleanup batch size

## Working Guidelines

- **Look before you change.** Read the relevant tasks first, then act.
- **Use IDs for mutations** when names could be ambiguous. Name lookups fail
  fast on duplicates and will tell you to use an ID — that is expected behavior.
- **Confirm before destructive calls**: `remove-item`, `batch-remove-items`,
  `manage-folders --action remove`, `manage-tags --action remove`.
- **Summarize long output.** Report counts, deadlines, and flagged items rather
  than dumping every row.
- **Tags vs custom perspectives are different things.** `@work` is a tag — use `manage-tags`; "今日计划" is a custom perspective — use `get-tasks --source custom`.

## Maintenance

Regenerate the CLI after upgrading the MCP server (a stale CLI silently lacks
new commands — this is the most common failure mode). Run this from the project
where the skill is installed:

```bash
npx -y omnifocus-mcp-enhanced@latest install-skill
```

For a globally installed skill, preserve that scope when refreshing:

```bash
npx -y omnifocus-mcp-enhanced@latest install-skill --global
```

The installer pins the MCP server to the exact package version that shipped the
skill (and mcporter to `@latest`), regenerates the
CLI, verifies all 29 commands, and checks the live OmniFocus connection. To
inspect the generated command count manually:

```bash
bin/omnifocus-enhanced.cjs --help | grep -cE "^\s+[a-z][a-z-]+"   # expect 32 (29 tools + built-ins)
```
