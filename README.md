# OmniFocus MCP Enhanced (Fork)

Fork of [jqlts1/omnifocus-mcp-enhanced](https://github.com/jqlts1/omnifocus-mcp-enhanced) with bug fixes for date handling, task completion, AppleScript escaping, and due-date filtering. All Chinese comments translated to English.

See the [upstream README](https://github.com/jqlts1/omnifocus-mcp-enhanced/blob/main/README.md) for full tool reference and examples.

## Installation

Requires macOS with OmniFocus 4 and Node.js 18+.

```bash
git clone https://github.com/psufka/omnifocus-mcp-enhanced-fork.git
cd omnifocus-mcp-enhanced-fork
npm install && npm run build
npm test  # all tests should pass
claude mcp add omnifocus -- node "$(pwd)/dist/server.js"
```

Restart Claude Code to pick up the new server.

## Fork Changes

### Bug Fixes

- **Fix task completion for inbox and repeating tasks** — Upstream uses `set completed of foundItem to true` in AppleScript, which fails on inbox tasks and tasks in repeating projects. Changed to `mark complete` / `mark incomplete` commands which work for all task types. (Relates to upstream [#14](https://github.com/jqlts1/omnifocus-mcp-enhanced/issues/14))
- **Fix all due-date filters being silently ignored** — `dueToday`, `dueThisWeek`, `dueThisMonth`, `overdue`, `dueBefore`, and `dueAfter` were never wired up. The OmniJS script didn't extract them, and the TypeScript client-side filter layer didn't include them. All six filters now work via client-side filtering.
- **Fix dateFormatter discarding time components** — `appleScriptDateCode()` was hardcoding hours/minutes/seconds to 0, so all due dates landed at midnight regardless of the time in the ISO string. Now parses and preserves the `T` time component.
- **Fix multiline notes breaking AppleScript** — Notes containing newlines caused AppleScript syntax errors. Newlines are now converted to `" & return & "` concatenation. Handles `\r\n`, `\r`, and `\n` line endings.
- **Fix JSON escaping in AppleScript return strings** — User input (task names, project names) embedded in JSON return strings is now double-escaped so quotes survive AppleScript interpretation into valid JSON.
- **Fix single-quote escaping inserting unwanted backslashes** — The AppleScript sanitization regex incorrectly escaped `'` characters (apostrophes), producing `\'` in task names. Removed — AppleScript double-quoted strings don't require single-quote escaping.
- **Fix `isDateInCurrentWeek` using Monday-start weeks** — Changed to Sunday-start (Sun-Sat) to match standard US week convention.

### Enhancements

- **Display task IDs in all output tools** — All task-listing tools now include the task ID in brackets (e.g., `Task Name [abc123]`), enabling ID-based edits and completions.
- **Duplicate-name protection on `removeItem`** — When removing by name, if multiple tasks share the same name, returns an "Ambiguous" error instead of silently deleting the first match. Matches `editItem` behavior.
- **Require full ISO 8601 dates with timezone** — All date parameters now require format like `2026-03-05T09:00:00-06:00`. Bare `YYYY-MM-DD` dates resolve to UTC midnight and display as the wrong day in local timezone.
- **Expand `edit_item` tool description** — Lists all capabilities (rename, dates, flags, status, tags, move, etc.) so the LLM knows what the tool can do without guessing.
- **Move task to project/parent/inbox** — `edit_item` supports `newProjectName`, `newProjectId`, `newParentTaskName`, `newParentTaskId`, and `moveToInbox`. Includes cycle detection (prevents moving a task under itself or descendants). Also available as standalone `move_task` tool.

### Code Quality

- **All Chinese comments translated to English** — Comments, log messages, UI strings, and error messages across 22+ source files translated from Chinese to English.
- **Test suite wired up** — `npm test` now runs 57 unit tests via `tsx`. Previously just echoed "passed".
- **Regression tests for time preservation** — 3 new tests covering the dateFormatter fix (full ISO, non-zero minutes/seconds, date-only defaults to midnight).
- **Temp file paths quoted in exec calls** — `osascript` invocations now quote the temp file path, preventing potential issues with spaces in paths.
- **Version synced** — `server.ts` version now matches `package.json`.
- **Repository URL updated** — Points to this fork.

## Known Limitations

- **JSON injection in AppleScript return strings** — If a task name contains `"` or `\`, the JSON return from AppleScript may be malformed. The error path handles this gracefully (returns raw output as error message). Multi-layer escaping (TypeScript → AppleScript → JSON) makes a clean fix impractical.
- **`appleScriptDateCode` ignores timezone offset** — Extracts the time component but not the timezone. Works correctly when the machine's local timezone matches the offset in the ISO string (e.g., Central time). Not portable to different timezones.
- **Parameter injection in `executeOmniFocusScript` is fragile** — Uses regex `.replace()` chains to inject parameters into JXA scripts by matching hardcoded string patterns. If upstream scripts change variable declarations, injection silently fails.

## Original README

The full upstream v1.6.8 README is preserved in [README-v1.6.8-original.md](README-v1.6.8-original.md).
