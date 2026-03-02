# OmniFocus MCP Enhanced (Fork)

Personal fork of [jqlts1/omnifocus-mcp-enhanced](https://github.com/jqlts1/omnifocus-mcp-enhanced) v1.6.8.

See the [upstream README](https://github.com/jqlts1/omnifocus-mcp-enhanced/blob/main/README.md) for full documentation, installation, tool reference, and examples.

## Fork Changes

- **Fix task completion for inbox and repeating tasks** — Upstream uses `set completed of foundItem to true` in AppleScript, which fails on inbox tasks and tasks in repeating projects. Changed to `mark complete` / `mark incomplete` commands which work for all task types. (Relates to upstream [#14](https://github.com/jqlts1/omnifocus-mcp-enhanced/issues/14))
- **Display task IDs in all output tools** — All task-listing tools (`filter_tasks`, `get_inbox_tasks`, `get_flagged_tasks`, `get_forecast_tasks`, `get_tasks_by_tag`, `get_today_completed_tasks`) now include the task ID in brackets after the task name (e.g., `Task Name [abc123]`), making it possible to reference tasks by ID for edits and completions.
- **Fix multiline notes breaking AppleScript** — Notes containing newlines caused AppleScript syntax errors when creating or editing tasks. Newlines are now converted to `" & return & "` concatenation so multiline notes work correctly in `add_omnifocus_task`, `edit_item`, and `add_project`.
- **Require full ISO 8601 dates with timezone** — All date parameter descriptions now explicitly require format like `2026-03-05T09:00:00-06:00` and warn that bare `YYYY-MM-DD` dates resolve to UTC midnight (displaying as the wrong day in local timezone). Affects `add_omnifocus_task`, `add_project`, `edit_item`, and `filter_tasks`.
- **Fix JSON escaping in AppleScript error/success returns** — User input (task names, project names, IDs) embedded in JSON return strings is now double-escaped so quotes survive AppleScript interpretation into valid JSON. Previously a `"` in a name would break JSON parsing of the MCP response.
- **Handle carriage returns in notes** — Note processing now handles `\r\n` (Windows), `\r` (old Mac), and `\n` (Unix) line endings, not just `\n`. Prevents broken AppleScript from clipboard-pasted or API-sourced text.
- **Fix getTodayCompletedTasks output** — Literal `\n` characters in template strings replaced with actual newlines. Chinese UI strings and locale replaced with English.
- **Expand edit_item tool description** — Description now lists all capabilities (rename, dates, flags, status, tags, move, etc.) so the LLM knows what the tool can do without guessing.
- **Fix all due-date filters being silently ignored** — `dueToday`, `dueThisWeek`, `dueThisMonth`, `overdue`, `dueBefore`, and `dueAfter` were never wired up. The OmniJS script didn't extract them, and the TypeScript client-side filter layer didn't include them. All six filters now work via client-side filtering. Tested: `dueToday: true` correctly returns all tasks due today (previously returned unfiltered results).

## Original README

The full upstream v1.6.8 README is preserved in [README-v1.6.8-original.md](README-v1.6.8-original.md).
