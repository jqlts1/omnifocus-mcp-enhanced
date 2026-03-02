# OmniFocus MCP Enhanced (Fork)

Personal fork of [jqlts1/omnifocus-mcp-enhanced](https://github.com/jqlts1/omnifocus-mcp-enhanced) v1.6.8.

See the [upstream README](https://github.com/jqlts1/omnifocus-mcp-enhanced/blob/main/README.md) for full documentation, installation, tool reference, and examples.

## Fork Changes

- **Fix task completion for inbox and repeating tasks** — Upstream uses `set completed of foundItem to true` in AppleScript, which fails on inbox tasks and tasks in repeating projects. Changed to `mark complete` / `mark incomplete` commands which work for all task types. (Relates to upstream [#14](https://github.com/jqlts1/omnifocus-mcp-enhanced/issues/14))
- **Display task IDs in all output tools** — All task-listing tools (`filter_tasks`, `get_inbox_tasks`, `get_flagged_tasks`, `get_forecast_tasks`, `get_tasks_by_tag`, `get_today_completed_tasks`) now include the task ID in brackets after the task name (e.g., `Task Name [abc123]`), making it possible to reference tasks by ID for edits and completions.
- **Fix multiline notes breaking AppleScript** — Notes containing newlines caused AppleScript syntax errors when creating or editing tasks. Newlines are now converted to `" & return & "` concatenation so multiline notes work correctly in `add_omnifocus_task`, `edit_item`, and `add_project`.

## Original README

The full upstream v1.6.8 README is preserved in [README-v1.6.8-original.md](README-v1.6.8-original.md).
