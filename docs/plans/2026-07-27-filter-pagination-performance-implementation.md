# Filter Pagination and Performance Implementation Plan

Date: 2026-07-27
Target release: v1.17.0
Design: `docs/plans/2026-07-27-filter-pagination-performance-design.md`

## Task 1: Define and validate opaque cursors

Files:

- Add: `src/tools/primitives/filterTasksCursor.ts`
- Add: `src/tools/primitives/filterTasksCursor.test.ts`
- Modify: `src/tools/definitions/filterTasks.ts`
- Modify: `src/tools/definitions/plannedDateSchemas.test.ts`

Steps:

1. Add optional `cursor` string input to the public schema and primitive
   options.
2. Define a versioned internal cursor payload with query fingerprint, sort
   metadata, normalized last value, and stable task ID.
3. Canonicalize all membership and ordering inputs while excluding page size
   and rendering controls.
4. Encode and decode URL-safe Base64 JSON without task content.
5. Enforce a fixed cursor byte limit and strict field/type validation.
6. Reject malformed, incomplete, unknown-version, and query-mismatched cursors.
7. Add tests for defaults, order-insensitive arrays, output-mode changes, limit
   changes, and every rejection boundary.

## Task 2: Make OmniJS ordering cursor-stable

Files:

- Modify: `src/utils/omnifocusScripts/filterTasks.js`
- Modify: `src/tools/primitives/filterTasks.test.ts`

Steps:

1. Centralize normalization and tuple comparison for every supported sort
   field.
2. Preserve the current null-last behavior in ascending and descending modes.
3. Add stable task ID as the secondary key for every sort.
4. Accept validated continuation metadata from TypeScript.
5. Apply one continuation predicate that uses the same comparator as sorting.
6. Keep the full filtered count based on membership before cursor filtering.
7. Add fixture tests for ties, null values, case normalization, both directions,
   and all sort fields.

## Task 3: Return page lookahead metadata

Files:

- Modify: `src/utils/omnifocusScripts/filterTasks.js`
- Modify: `src/tools/primitives/filterTasks.ts`
- Modify: `src/tools/primitives/filterTasks.test.ts`
- Add or modify: formatter-focused pagination tests

Steps:

1. Take at most `limit + 1` tasks after continuation filtering.
2. Serialize only the first `limit` tasks.
3. Return `hasMore` and the last returned task's normalized sort tuple.
4. Build `nextCursor` in TypeScript only when `hasMore` is true.
5. Add page count, more-results state, and next cursor to formatted output.
6. Keep the final page free of a next cursor.
7. Ensure expanded descendants do not consume page slots or define the cursor.
8. Add static multi-page traversal tests proving no duplicate or omitted IDs.

## Task 4: Reduce compact serialization cost

Files:

- Modify: `src/utils/omnifocusScripts/taskTreeHelpers.js`
- Modify: `src/utils/omnifocusScripts/filterTasks.js`
- Modify: `src/tools/primitives/filterTasksOutput.test.ts`
- Modify: `src/utils/taskTreeHelpers.test.ts`

Steps:

1. Pass compact serialization intent into the shared task-tree serializer.
2. Omit `note` and `tags` properties in compact mode for roots and descendants.
3. Preserve all fields required by compact formatting.
4. Keep detailed serialization byte-for-byte compatible where practical.
5. Add script-level and formatter tests proving private fields are not produced
   in compact mode.

## Task 5: Skip unused status aggregation

Files:

- Modify: `src/utils/omnifocusScripts/filterTasks.js`
- Modify: `src/tools/primitives/countTasks.test.ts` or focused existing tests
- Modify: `src/tools/primitives/filterTasks.test.ts`

Steps:

1. Compute `byStatus` only when `countOnly` is true.
2. Preserve exact `count_tasks.total` and `count_tasks.byStatus` behavior.
3. Remove normal list-response dependence on `byStatus`.
4. Add tests proving list and count membership remain identical.

## Task 6: Document pagination and Skill usage

Files:

- Modify: `README.md`
- Modify: `README.zh.md`
- Modify: `skills/omnifocus-cli/SKILL.md`
- Modify: `skills/omnifocus-cli/install.sh`

Steps:

1. Document first-page and next-page `filter_tasks` examples.
2. Explain opaque cursor handling and real-time best-effort semantics.
3. Explain that changing filters or sorting invalidates a cursor.
4. Document that output mode and page size may change between pages.
5. Add installer verification for the generated `--cursor` flag.
6. Keep documented public counts at 39 tools, 4 Prompts, and 3 Resources.

## Task 7: Extend privacy-safe benchmarks

Files:

- Modify: `scripts/benchmark-smoke.mjs`
- Modify: `docs/benchmark-smoke.md`

Steps:

1. Add compact first-page and second-page measurements.
2. Add a detailed first-page comparison.
3. Record full match count, page count, next-page state, elapsed time, bytes,
   and errors.
4. Use a small page size or broad safe filter to exercise a second page when
   possible.
5. Never print or persist cursors, task content, IDs, dates, tags, or notes.
6. Preserve existing Inbox, Forecast, count, and bounded-tree rows.

## Task 8: Validate live traversal and compatibility

Steps:

1. Run an unpaginated `filter_tasks` call and compare its first page with the
   new no-cursor behavior.
2. Traverse at least two compact pages against live OmniFocus data.
3. Verify page boundaries contain no duplicate IDs while data is unchanged.
4. Change output mode and page size while retaining the cursor.
5. Confirm a changed filter or sort produces a clear mismatch error.
6. Confirm compact output contains no notes or tags.
7. Run the numeric-only benchmark and inspect first/next-page evidence.

## Task 9: Release v1.17.0

Steps:

1. Update package and lockfile versions.
2. Add synchronized English and Chinese release notes.
3. Run the complete test suite.
4. Run `npm audit --omit=dev`.
5. Run `npm pack --dry-run`.
6. Install the release-candidate Skill and verify all 39 tools, task-tree flags,
   compact output, and cursor support.
7. Commit and push the release.
8. Create and push `v1.17.0`.
9. Publish the GitHub Release with tests, live traversal, and benchmark evidence.
10. After npm publication, verify `@latest` and repeat the installed Skill
    journey.
