# Batch Move Tasks Plan (Roadmap)

Date: 2026-02-25

## Background
The current release focuses on stable single-task move support (`edit_item` + `move_task`).
Bulk move is intentionally deferred to keep V1 predictable and low-risk.

## Goal
Add a future `batch_move_tasks` tool for high-frequency task reorganization with partial-success reporting.

## API Draft
```json
{
  "items": [
    {
      "id": "task-id-1",
      "targetProjectId": "project-id-1"
    },
    {
      "name": "Task B",
      "targetParentTaskId": "parent-id-2"
    },
    {
      "id": "task-id-3",
      "targetInbox": true
    }
  ]
}
```

Per item:
- source: `id` or `name`
- destination: exactly one of project / parent task / inbox

## Failure Model
Batch execution should return a summary with partial success:
- `total`
- `succeeded`
- `failed`
- `details[]` (per-item success/error)

Errors should keep the same semantics as single move:
- not found
- ambiguous name (must use id)
- invalid destination selection
- invalid cycle move (self/descendant)

## Milestones
- V1 (done in this phase): stable single-task move.
- V2 (future): `batch_move_tasks` with per-item result aggregation.

## Non-Goals (for V2 first cut)
- No position control (`before/after/start/end`) in initial batch release.
- No complex path-based matching rules.
