# Task Tag Hierarchy Design

## Problem

Task reads currently expose only each assigned tag's leaf name and ID. A task tagged `守一` does not reveal that the tag belongs under `团队`, so AI clients lose the semantic context encoded in OmniFocus's tag hierarchy.

## Decision

All detailed task reads will expose the assigned tag's full path while preserving the assigned leaf tag as the stable identity:

```json
{
  "id": "tag-id",
  "name": "守一",
  "path": "团队 / 守一",
  "ancestorIds": ["team-tag-id"]
}
```

`id` and `name` continue to identify the tag actually assigned to the task. Ancestors provide context only and must not be represented as assigned tags.

## Scope

The shared task serializer will add hierarchy data to:

- `get_task_by_id`
- detailed `get_tasks` results
- detailed `filter_tasks` results
- expanded subtask nodes returned by those tools

Compact task reads will continue to omit tags entirely.

Human-readable detailed output will display full paths such as `团队 / 守一`. Multiple paths will remain comma-separated. Root tags will display their existing leaf name.

## Implementation

The shared OmniJS task serializer will resolve a tag's parent chain. Resolution will be cached by tag ID for the duration of one script execution so each hierarchy is traversed once per query.

The serialized tag shape remains backward compatible by retaining `id` and `name` and adding `path` and `ancestorIds`.

## Failure Handling

A missing or unreadable parent degrades to the successfully resolved suffix or leaf name instead of failing the task read. Parent traversal will track visited tag IDs and enforce a bounded depth so malformed cycles cannot loop indefinitely.

## Verification

Tests will cover:

- root tags;
- two-level and deeper paths;
- multiple assigned tags;
- assigned leaf identity remaining unchanged;
- malformed/cyclic parent chains degrading safely;
- detailed task formatting using full paths;
- compact output continuing to omit tags.
