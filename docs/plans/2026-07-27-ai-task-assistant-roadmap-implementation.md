# AI Task Assistant Roadmap Implementation Plan

Date: 2026-07-27

Design reference:
`docs/plans/2026-07-27-ai-task-assistant-roadmap-design.md`

## Delivery Rules

- Implement one release at a time.
- Keep one public tool per new action workflow.
- Reuse internal preflight and verification functions, but do not create a
  public generic mutation protocol.
- Complete unit tests, live OmniFocus smoke tests, Prompt/Skill updates, and
  bilingual documentation before tagging each release.
- Do not begin the next release until the preceding version is published and
  its installed user journey is verified.

## Maintenance Gate

### Task 1: Remove MCP version drift

Files:

- Modify: `src/server.ts`
- Modify or add: server metadata test near `src/server.ts`

Work:

1. Read the package version at build/runtime from one source of truth.
2. Replace the hard-coded MCP version.
3. Add a test proving MCP metadata and `package.json` agree.
4. Run build and tests.

### Task 2: Verify the published Skill journey

Files:

- Verify: `skills/omnifocus-cli/install.sh`
- Verify: `skills/omnifocus-cli/SKILL.md`

Work:

1. Publish the maintenance version to npm.
2. Install the Skill into a temporary project from `@latest`.
3. Verify all expected commands.
4. Verify all six task-tree-aware commands expose both tree flags.
5. Run one live count and one live task-tree read.

## v1.14: Safe Inbox Organization

### Task 1: Define the narrow batch move schema

Files:

- Add: `src/tools/definitions/batchMoveTasks.ts`
- Add: schema tests beside the definition
- Modify: `src/server.ts`

Work:

1. Define `moves[]` with required `taskId`.
2. Enforce exactly one destination: `projectId`, `parentTaskId`, or
   `inbox: true`.
3. Reject empty batches, duplicate source IDs, and unknown fields.
4. Register `batch_move_tasks` with an intent-oriented description.

### Task 2: Extract shared move resolution and cycle validation

Files:

- Modify: `src/tools/primitives/moveTask.ts`
- Modify: relevant move/edit helpers
- Add: internal batch move primitive and unit tests

Work:

1. Reuse single-task destination semantics.
2. Resolve every source and destination by stable ID.
3. Detect self-moves and descendant cycles.
4. Return an internal execution plan without mutating OmniFocus.
5. Prove one invalid move prevents plan execution.

### Task 3: Implement atomic OmniFocus execution

Files:

- Add: OmniJS or AppleScript batch move implementation under
  `src/utils/omnifocusScripts/`
- Modify: script execution registration if needed
- Add: deterministic script tests

Work:

1. Perform complete preflight before the first move.
2. Execute the prepared moves in one automation request.
3. Return source IDs and expected destinations.
4. Avoid adding custom placement controls.

### Task 4: Add mandatory post-write verification

Files:

- Modify: batch move primitive
- Add: verification unit tests

Work:

1. Read every moved task after execution.
2. Compare actual project, parent, or Inbox location with the plan.
3. Return a concise per-task verified summary.
4. Treat any mismatch as an operation failure with clear recovery guidance.

### Task 5: Upgrade the Inbox cleanup workflow

Files:

- Modify: Inbox-related Prompt in `src/context/prompts.ts`
- Modify: `skills/omnifocus-cli/SKILL.md`
- Modify: `README.md`
- Modify: `README.zh.md`

Work:

1. Encode read, propose, confirm, execute, and report steps.
2. Include stable IDs in the proposal while keeping it readable.
3. Require explicit confirmation immediately before execution.
4. Show intentionally retained and unresolved Inbox tasks afterward.

### Task 6: v1.14 acceptance

1. Run complete tests and audit.
2. Run live project, parent-task, and Inbox destination moves.
3. Run an invalid-cycle test and verify no task moved.
4. Verify the generated Skill CLI includes `batch-move-tasks`.
5. Run package dry run and synchronize release documentation.

## v1.15: Weekly Review Completion

### Task 1: Define `mark_projects_reviewed`

Files:

- Add: `src/tools/definitions/markProjectsReviewed.ts`
- Add: schema tests
- Modify: `src/server.ts`

Work:

1. Accept a non-empty unique array of project IDs.
2. Reject names and mixed edit payloads.
3. Keep the schema free of timestamp, verification, and output-control fields.

### Task 2: Implement review preflight

Files:

- Add: project review primitive and tests
- Reuse: project serializer used by project review reads

Work:

1. Resolve every project.
2. Validate eligible status and usable review metadata.
3. Capture existing review intervals.
4. Build the complete plan before mutation.

### Task 3: Execute and verify review timestamps

Files:

- Add or modify: OmniJS project review script
- Add: deterministic and live tests

Work:

1. Use one request-level timestamp.
2. Mark all projects reviewed only after complete preflight.
3. Re-read `lastReviewDate`, `nextReviewDate`, and review interval.
4. Verify the interval did not change and OmniFocus generated a valid next
   review date.

### Task 4: Upgrade Weekly Review Prompt and Skill

Files:

- Modify: `src/context/prompts.ts`
- Modify: weekly-review resource if useful and bounded
- Modify: `skills/omnifocus-cli/SKILL.md`
- Modify: bilingual READMEs

Work:

1. Guide project risk review before marking.
2. Separate discussion from explicit confirmation.
3. Report projects still due for review after execution.

### Task 5: v1.15 acceptance

1. Verify an eligible multi-project batch.
2. Verify one ineligible project prevents every timestamp change.
3. Compare results with OmniFocus UI review state.
4. Run standard release gates and installed Skill checks.

## v1.16: Daily Planning Assistant

### Task 1: Specify compact task output

Files:

- Modify: `src/tools/definitions/filterTasks.ts`
- Modify: `src/tools/primitives/filterTasks.ts`
- Add: output mode tests

Work:

1. Add one small output-mode enum with backward-compatible default behavior.
2. Keep stable ID, planning dates, status, project, flag, estimate, and direct
   subtask count.
3. Omit notes and full tag detail in compact mode.
4. Keep counts and filter semantics identical across modes.

### Task 2: Upgrade Daily Planning Prompt

Files:

- Modify: `src/context/prompts.ts`
- Modify: relevant resources in `src/context/resources.ts`
- Add: prompt/resource tests where practical

Work:

1. Start with `count_tasks` to choose bounded detail queries.
2. Pull Forecast, Flagged, perspective, and tree data only as needed.
3. Require four output sections: priorities, available actions, blocked work,
   and capacity risks.
4. Ask before applying any proposed changes.

### Task 3: Update Skill guidance

Files:

- Modify: `skills/omnifocus-cli/SKILL.md`
- Modify: bilingual READMEs

Work:

1. Document count-first planning.
2. Prefer compact filtering for broad discovery.
3. Escalate to detailed task reads only for selected items.

### Task 4: Add a large-database smoke benchmark

Files:

- Add: benchmark script under `scripts/`
- Add: benchmark documentation under `docs/`
- Optionally modify: `package.json` scripts

Work:

1. Measure elapsed time, item count, response bytes, and errors.
2. Cover counts, compact filters, Inbox, Forecast, and bounded task trees.
3. Keep results local and exclude personal task content from committed
   artifacts.
4. Establish a baseline rather than an unsupported public SLA.

### Task 5: v1.16 acceptance

1. Run Daily Planning through a real MCP client.
2. Confirm count-first behavior and bounded detailed reads.
3. Confirm all four planning sections are useful with a real database.
4. Run benchmark smoke, tests, audit, package, docs, and Skill gates.

## Deferred Work

The following remain valuable but are intentionally outside these releases:

- arbitrary fields and cursor pagination;
- generic preview/verify public parameters;
- task-to-project conversion and project templates;
- full repetition-rule readback and creation-time support;
- explicit sync/save tools;
- an optional persistent OmniJS bridge;
- a Swift rewrite;
- additional CRUD tools without a complete user workflow.
