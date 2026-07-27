# Filter Pagination and Performance Design

Date: 2026-07-27
Target release: v1.17.0

## Goal

Add safe, stable pagination to `filter_tasks` and reduce per-page query and
response overhead without adding a new MCP tool or requiring server-side
session state.

The first release covers only `filter_tasks`. Other task views, projects, tags,
and folders remain unchanged until a concrete workflow needs pagination.

## Current Behavior

`filter_tasks` currently starts a new `osascript` process for every call. Its
OmniJS script scans `flattenedTasks`, applies all predicates, computes status
aggregates, sorts the complete matching set, serializes the requested prefix,
and returns it to TypeScript for Markdown formatting.

The existing `limit` bounds output, but there is no way to retrieve the next
set. Compact mode reduces the final MCP response, but OmniJS still serializes
notes and tags before TypeScript discards them. Normal list reads also compute
`byStatus`, although only `count_tasks` needs the aggregate.

The local benchmark confirms that process startup and OmniFocus evaluation are
material costs. Pagination alone cannot eliminate those costs, so v1.17
optimizes avoidable work and establishes repeatable first-page and next-page
evidence rather than promising a fixed latency SLA.

## Chosen Approach

Use a stateless, opaque keyset cursor.

The first request supplies the existing filters, sorting, output controls, and
page size through `limit`. When more matching tasks exist, the response returns
a `nextCursor`. The next request sends the same query and the cursor.

Example first request:

```json
{
  "flagged": true,
  "limit": 30,
  "sortBy": "dueDate",
  "sortOrder": "asc",
  "outputMode": "compact"
}
```

Example next request:

```json
{
  "flagged": true,
  "limit": 30,
  "sortBy": "dueDate",
  "sortOrder": "asc",
  "outputMode": "compact",
  "cursor": "<opaque cursor from the prior response>"
}
```

This design was selected over offset pagination because keyset continuation is
less likely to duplicate tasks when work is added before the current page. It
was selected over server-side snapshots because it survives MCP restarts,
requires no cache lifecycle, and matches the chosen real-time best-effort
semantics.

## Public Contract

Add one optional `cursor` string to `filter_tasks`.

`limit` remains the maximum number of top-level matching tasks returned on the
current page. Existing calls without `cursor` keep their current behavior and
default detailed output.

When more results exist, the formatted response includes:

```text
Page: 30 tasks
More results available.
Next cursor: <opaque value>
```

The last page does not contain a next cursor. The response continues to report
the complete current matching count so clients can explain overall workload.

Clients must treat the cursor as opaque and return it unchanged.

## Cursor Contents

The encoded cursor contains only pagination metadata:

- cursor format version;
- canonical query fingerprint;
- sorting field and direction;
- the last task's normalized primary sort value;
- the last task's stable ID.

It never contains task names, notes, tags, project names, or other personal
content.

The cursor uses URL-safe Base64 encoding of a small validated JSON payload. It
is opaque rather than secret: no security decision relies on hiding its
contents. Strict validation protects the parser and query contract.

The server rejects:

- malformed encoding or JSON;
- unknown cursor versions;
- missing or incorrectly typed fields;
- cursors above a small fixed byte limit;
- sort metadata inconsistent with the request;
- query fingerprints inconsistent with the request.

An invalid cursor never falls back silently to the first page.

## Query Fingerprint

The fingerprint covers every input that changes membership or ordering:

- task status and perspective;
- project, tag, exact-tag, and search filters;
- due, defer, planned, and completion filters;
- flag, estimate, note, and Inbox filters;
- sort field and direction.

Array values use canonical ordering only where their semantics are
order-insensitive. Absent values and defaults normalize to one representation.

The following output-only controls are excluded from the fingerprint:

- `limit`;
- `outputMode`;
- `showSubtasks`;
- `maxSubtaskDepth`.

This lets clients change page size or rendering detail while continuing the
same top-level result sequence.

## Stable Ordering

Every supported sort becomes a total order:

```text
normalized primary sort value
then stable task ID
```

Supported primary fields remain:

- `name`;
- `dueDate`;
- `deferDate`;
- `plannedDate`;
- `completedDate`;
- `flagged`;
- `project`.

Null values continue to sort after non-null values for both directions, matching
the existing contract. Task ID resolves ties among equal and null values.

The continuation predicate compares the same normalized tuple used by sorting.
This is essential: cursor filtering and sorting must not implement subtly
different null, case, date, or direction rules.

## Real-Time Best-Effort Semantics

Pagination does not create a database snapshot. Each page queries current
OmniFocus state.

- A new task appears only if its current sort tuple is after the cursor.
- A deleted task naturally disappears.
- A task moved before the cursor is not returned again.
- A task whose sort value moves after the cursor may appear on a later page,
  even if it appeared previously.
- Exact no-duplicate/no-omission guarantees apply only while relevant task data
  remains unchanged.

Documentation and response wording must call this real-time best-effort
pagination, not snapshot pagination.

## Performance Changes

Implement four bounded optimizations alongside pagination.

### Compact Serialization

When `outputMode` is `compact`, OmniJS omits notes and tags from serialized task
nodes, including expanded descendants. TypeScript continues to format the same
compact public fields.

Detailed mode remains unchanged.

### Aggregate Work

Only `count_tasks` requests and computes `byStatus`. Normal `filter_tasks` reads
still return the complete matching count but skip the status aggregation pass.

### Cursor Boundary

After applying membership filters, a continuation request removes tasks at or
before the cursor tuple before sorting the remaining set. This reduces sorting
and serialization work on later pages while preserving the current full match
count.

The membership scan remains necessary because predicates can reference any
task field and the current implementation uses `flattenedTasks`.

### Lookahead

Each page takes at most `limit + 1` tasks after cursor filtering. The extra task
only determines whether another page exists and is not serialized into the
response.

## Task Trees

Pagination boundaries apply to top-level matched tasks before optional subtask
expansion. Descendants rendered under a matched task do not consume page slots
and do not advance the cursor.

Existing expanded-tree deduplication remains in place. The next cursor is based
on the final matched task before tree formatting, not the last rendered
descendant.

The existing 500-node expansion safety cap remains unchanged.

## Error Handling

Cursor validation errors return a clear `filter_tasks` failure and do not query
OmniFocus when validation can be completed in TypeScript.

OmniJS independently validates the decoded continuation values it receives.
Unexpected cursor types or unsupported sort fields fail closed rather than
returning an incorrect page.

If OmniFocus changes between pages, the server follows the documented
best-effort semantics and does not classify ordinary data changes as errors.

## Benchmark Evidence

Extend `npm run benchmark:smoke` with numeric-only rows for:

- compact first page;
- compact second page when available;
- detailed first page;
- static count query;
- existing Inbox, Forecast, and bounded tree checks.

Record:

- elapsed milliseconds;
- current full match count;
- returned page count;
- whether a next page exists;
- UTF-8 response bytes;
- success or error state.

Never print or persist cursor values or personal task content. Compare results
on the same machine and database. The benchmark is a regression baseline, not
a public SLA.

## Compatibility

- No new MCP tool, Prompt, or Resource.
- `filter_tasks` without a cursor behaves as before.
- `detailed` remains the default output mode.
- Existing filter, sorting, count, limit, and task-tree semantics remain.
- `count_tasks` keeps exact totals and status aggregates.
- Cursor support is limited to `filter_tasks` in v1.17.

## Testing

Deterministic tests must cover:

- static multi-page traversal with no duplicate or omitted IDs;
- equal primary values resolved by stable task ID;
- ascending and descending traversal;
- null dates and other nullable sort values;
- every supported sort field;
- invalid, oversized, incomplete, and unknown-version cursors;
- cursor/query and cursor/sort mismatches;
- page size and output mode changes across pages;
- task insertion, deletion, and sort-value movement under best-effort semantics;
- compact OmniJS serialization omitting notes and tags at every depth;
- unchanged detailed serialization;
- unchanged `count_tasks` totals and `byStatus`;
- default no-cursor compatibility;
- top-level cursor boundaries with expanded task trees;
- numeric-only first-page and second-page benchmark output.

Live validation should traverse at least two pages when the local database has
enough matching tasks. If it does not, use a broader safe filter or smaller page
size. No OmniFocus mutations are required for release acceptance.

## Non-Goals

- pagination for Inbox, Flagged, Forecast, projects, tags, or folders;
- snapshot consistency;
- server-side cursor caches;
- arbitrary field selection;
- a persistent OmniJS bridge;
- a Swift rewrite;
- a fixed public latency guarantee;
- changing or adding write tools.

## Success Criteria

v1.17 succeeds when:

- clients can traverse a stable `filter_tasks` result set through opaque
  cursors without duplicates or omissions while the data remains unchanged;
- query or sort changes cannot silently reuse an incompatible cursor;
- compact mode avoids serializing notes and tags in OmniJS;
- normal list reads avoid unused status aggregation;
- benchmark output proves bounded pages and captures first/next-page costs
  without leaking OmniFocus content;
- the public surface remains 39 tools, 4 Prompts, and 3 Resources.
