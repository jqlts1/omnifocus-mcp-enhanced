# Daily Planning Assistant Implementation Plan

Date: 2026-07-27
Target release: v1.16.0
Design: `docs/plans/2026-07-27-daily-planning-assistant-design.md`

## Task 1: Add compact filter output

Files:

- Modify: `src/tools/definitions/filterTasks.ts`
- Modify: `src/tools/primitives/filterTasks.ts`
- Modify: `src/tools/primitives/filterTasks.test.ts`
- Add or modify: formatter-focused tests as appropriate

Steps:

1. Add `outputMode: detailed | compact` to the schema and primitive options.
2. Preserve `detailed` as the default.
3. Implement one compact formatter that includes ID, name, status, project or
   Inbox, relevant dates, flag, estimate, and direct subtask count.
4. Omit notes and tags in compact mode, including expanded descendants.
5. Preserve filtering, sorting, limiting, matching counts, and task-tree
   semantics.
6. Add tests for required/omitted fields and default-output compatibility.

## Task 2: Add reusable count-first daily data collection

Files:

- Modify: `src/context/omnifocusData.ts`
- Add: `src/context/dailyPlanning.ts`
- Add: `src/context/dailyPlanning.test.ts`

Steps:

1. Create an internal daily planning data function; do not register a new MCP
   tool or Resource.
2. Run exact count queries for overdue, due today, planned today, and flagged.
3. Fail the function if any count query fails.
4. Fetch bounded candidate details for the same four categories.
5. Capture detail-source failures instead of failing the entire function.
6. Deduplicate candidates by stable ID and retain category signals.
7. Return only structured summary counts, candidates, and missing-source names.
8. Add deterministic tests for count failure, detail failure, limits, and
   deduplication.

## Task 3: Upgrade `daily_review`

Files:

- Modify: `src/context/prompts.ts`
- Add: `src/context/prompts.test.ts` or focused daily Prompt tests

Steps:

1. Add optional positive-integer `availableMinutes` Prompt input.
2. Replace the current three uncoordinated list reads with the internal daily
   planning data function.
3. Include exact category counts and bounded candidates in Prompt data.
4. Require exactly three priorities when enough eligible candidates exist.
5. Require `今日重点`, `可执行下一步`, `阻塞项`, and `容量/截止风险` sections.
6. Encode Completed/Dropped exclusion and Blocked-task handling.
7. Encode missing-estimate capacity semantics.
8. Gather proposed changes into one confirmation before existing write tools.
9. Add tests for Prompt schema, data shape, and required instruction contract.

## Task 4: Review the Today Resource

Files:

- Review and minimally modify: `src/context/resources.ts`
- Add tests only if behavior changes

Steps:

1. Keep `omnifocus://today` compatible.
2. Ensure its category queries stay bounded.
3. Optionally add planning-date summary metadata if it is cheap and does not
   duplicate Prompt orchestration.
4. Do not add a new Resource.

## Task 5: Update Skill and documentation

Files:

- Modify: `skills/omnifocus-cli/SKILL.md`
- Modify: `README.md`
- Modify: `README.zh.md`

Steps:

1. Document count-first daily planning.
2. Add compact filtering examples.
3. Document the optional `availableMinutes` Prompt behavior.
4. Document the four output sections and exactly-three-priority contract.
5. Reinforce one confirmation before applying proposed changes.
6. Keep tool count unchanged.

## Task 6: Add privacy-safe benchmark smoke

Files:

- Add: `scripts/benchmark-smoke.mjs`
- Add: `docs/benchmark-smoke.md`
- Modify: `package.json`

Steps:

1. Add `npm run benchmark:smoke`.
2. Measure count queries, compact filtering, Inbox, Forecast, and bounded task
   trees against the local database.
3. Record elapsed time, result count, response bytes, and error state.
4. Print numeric aggregate rows only.
5. Never write personal task content to disk.
6. Document that this is a regression baseline, not an SLA.

## Task 7: Live workflow validation

Steps:

1. Run the daily Prompt without capacity and inspect the four sections.
2. Run it with a realistic `availableMinutes` value.
3. Verify missing estimates are uncertainty, not zero minutes.
4. Confirm exactly three eligible priorities are selected when possible.
5. Confirm no write occurs before explicit approval.
6. Exercise one safe confirmed adjustment through an existing narrow tool and
   verify its result.
7. Run the benchmark smoke and inspect numeric-only output.

## Task 8: Release v1.16.0

Steps:

1. Update package and lockfile versions.
2. Synchronize release notes in both READMEs.
3. Run the complete test suite.
4. Run `npm audit --omit=dev`.
5. Run `npm pack --dry-run`.
6. Validate Skill installation from the release candidate/package.
7. Commit and push the release.
8. Create and push `v1.16.0`.
9. Publish the GitHub Release with test, live workflow, and benchmark evidence.
10. After npm publication, verify `@latest` and rerun the installed Skill
    journey.
