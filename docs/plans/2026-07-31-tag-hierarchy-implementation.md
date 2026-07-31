# Task Tag Hierarchy Implementation Plan

## Goal

Expose the full OmniFocus tag path on every detailed task read while retaining the assigned leaf tag's ID and name. Compact reads remain unchanged.

## Changes

1. Extend the shared task tag type in `src/tools/primitives/taskTreeFormatter.ts` and task-detail raw/result types in `src/tools/primitives/getTaskById.ts` with optional `path` and `ancestorIds` fields.
2. Add a bounded, cycle-safe tag hierarchy serializer and per-script tag-ID cache to `src/utils/omnifocusScripts/taskTreeHelpers.js`.
3. Use the hierarchy serializer for every non-compact task node, including expanded descendants.
4. Update detailed task text formatters to prefer `tag.path` and fall back to `tag.name`:
   - `src/tools/primitives/taskTreeFormatter.ts`
   - `src/tools/primitives/filterTasks.ts`
   - `src/tools/definitions/getTaskById.ts`
5. Add observable tests for root, nested, multi-level, multiple, cyclic, and compact tag behavior. Update existing formatting fixtures with hierarchy fields where needed.
6. Update current English/Chinese and Skill documentation to state that detailed reads render full tag paths.

## Verification

- Run focused task serializer and formatter tests.
- Run `npm test`.
- Build the production server.
- Call a detailed read against a controlled script fixture and verify `id`, `name`, `path`, and `ancestorIds`; verify compact output contains no tag data.
