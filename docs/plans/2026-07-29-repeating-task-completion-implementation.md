# Repeating Task Completion Implementation Plan

Date: 2026-07-29
Target release: v1.20.0
Design: `docs/plans/2026-07-29-repeating-task-completion-design.md`

## Task 1: Extract a shared repetition core

Files:

- Modify: `src/tools/primitives/setRepetitionRule.ts`
- Add: `src/tools/primitives/repetitionRule.ts`
- Add: `src/tools/primitives/repetitionRule.test.ts`
- Modify: `src/types.ts`

Steps:

1. Define one `RepetitionInput` shape (`ruleString`, `scheduleType`,
   `anchorDateKey`, `catchUpAutomatically`) and one `RepetitionSnapshot` shape
   that also carries `nextOccurrence`.
2. Move rule-string normalization out of `setRepetitionRule.ts`: strip a leading
   `RRULE:`, trim, and require `FREQ=`.
3. Add enum validation for schedule type and anchor date key.
4. Add a field-by-field comparison used by every verification path.
5. Keep `buildRepetitionRuleString` behavior for the existing `endDate`/`count`
   inputs and reuse the shared normalizer inside it.
6. Add tests for normalization, missing `FREQ=`, enum rejection, comparison
   equality and each single-field mismatch.

## Task 2: Serialize repetition in OmniJS reads

Files:

- Modify: `src/utils/omnifocusScripts/taskTreeHelpers.js`
- Modify: `src/utils/omnifocusScripts/getTaskById.js`
- Modify: `src/utils/taskTreeHelpers.test.ts`
- Add or modify: script-level tests beside `getTaskById`

Steps:

1. Add one OmniJS helper that converts `task.repetitionRule` into the public
   object, mapping `Task.RepetitionScheduleType` and `Task.AnchorDateKey` to
   their string names.
2. Compute `nextOccurrence` with `firstDateAfterDate(new Date())`, guarded so a
   throwing or absent implementation yields `null`.
3. Add `isRepeating` to the shared serializer for both detailed and compact
   output.
4. Return the complete `repetition` object only from `getTaskById.js`.
5. Add fixture tests proving list nodes carry only `isRepeating`, compact output
   contains no repetition object, and a non-repeating task reports
   `repetition: null`.

## Task 3: Expose repetition through task reads

Files:

- Modify: `src/tools/primitives/getTaskById.ts`
- Modify: `src/tools/definitions/getTaskById.ts`
- Modify: `src/tools/definitions/getTaskById.test.ts`
- Modify: `src/tools/primitives/taskTreeFormatter.ts` if the marker needs
  rendering

Steps:

1. Add typed `repetition` to `TaskInfo` and the raw script result.
2. Render a concise repetition line in `get_task_by_id` output, including the
   next occurrence when present.
3. Keep list formatting unchanged apart from the existing marker conventions.
4. Add tests for the rendered detail line and for the `null` case.

## Task 4: Replace hard-coded repetition in dump_database

Files:

- Modify: `src/utils/omnifocusScripts/omnifocusDump.js`
- Modify: `src/tools/dumpDatabase.ts`
- Modify: `src/tools/dumpDatabase.test.ts`

Steps:

1. Export the real rule string, schedule type, and repeating flag from the dump
   script.
2. Map `repetitionMethod` to the reported schedule type and stop emitting the
   deprecated method.
3. Remove the hard-coded `null`/`false` values in the TypeScript mapper.
4. Add tests proving repeating and non-repeating tasks serialize correctly.

## Task 5: Verify and restore in set_repetition_rule

Files:

- Modify: `src/utils/omnifocusScripts/setRepetitionRule.js`
- Modify: `src/tools/primitives/setRepetitionRule.ts`
- Modify: `src/tools/definitions/setRepetitionRule.ts`
- Add: `src/tools/primitives/setRepetitionRule.script.test.ts`

Steps:

1. Snapshot the existing rule, including the `null` case, before writing.
2. Write the rule and re-read it.
3. Compare every supported field with the shared comparator.
4. On exception or mismatch, restore the snapshot and return
   `REPETITION_WRITE_FAILED_RESTORED` or
   `REPETITION_VERIFICATION_FAILED_RESTORED`.
5. When restoration cannot be confirmed, return
   `REPETITION_RESTORE_UNCONFIRMED` with the task ID and recovery guidance.
6. Verify `clear: true` results in `repetitionRule === null`.
7. Render structured codes and recovery text in the tool handler without leaking
   OmniJS internals.
8. Add VM tests for success, write failure, each field mismatch, clear
   verification, and unconfirmed restoration.

## Task 6: Accept repetition when creating a single task

Files:

- Modify: `src/tools/definitions/addOmniFocusTask.ts`
- Modify: `src/tools/primitives/addOmniFocusTask.ts`
- Modify: `src/tools/definitions/plannedDateSchemas.test.ts` or a focused schema
  test
- Modify: `src/tools/primitives/addOmniFocusTask.test.ts`

Steps:

1. Add the optional strict `repetition` object to the public schema.
2. After the task is created and its ID is known, apply the rule through the
   shared primitive.
3. Verify the applied rule; on failure delete the created task and return the
   structured error.
4. Report the verified rule in the success message.
5. Add tests for schema acceptance, rejection of unsupported fields, and the
   delete-on-verification-failure path.

## Task 7: Accept repetition inside project outlines

Files:

- Modify: `src/tools/definitions/createProjectFromOutline.ts`
- Modify: `src/tools/primitives/createProjectFromOutline.ts`
- Modify: `src/utils/omnifocusScripts/createProjectFromOutline.js`
- Modify: `src/tools/definitions/createProjectFromOutline.test.ts`
- Modify: `src/tools/primitives/createProjectFromOutline.test.ts`

Steps:

1. Add the same optional `repetition` object to task nodes only.
2. Carry it through the flattened execution plan without changing node or depth
   bounds.
3. Apply the rule during the single creation transaction.
4. Verify it in the existing read-back phase using the shared comparator.
5. Roll back through the existing bounded Undo path on mismatch.
6. Add tests for schema rejection at the project level, successful creation with
   repetition, and rollback when the applied rule disagrees.

## Task 8: Update assistant workflows and documentation

Files:

- Modify: `src/context/prompts.ts`
- Modify: `src/context/prompts.test.ts`
- Modify: `skills/omnifocus-cli/SKILL.md`
- Modify: `skills/omnifocus-cli/install.sh`
- Modify: `README.md`
- Modify: `README.zh.md`

Steps:

1. State in `project_shaping` that repetition uses ICS rule strings and that the
   verified rule and next occurrence must be reported after creation.
2. Document the repetition read fields and the creation-time input in the Skill,
   including a `--raw` example.
3. Extend installer verification to assert the repetition input exists on the
   generated create command.
4. Add synchronized bilingual sections and keep the documented surface at 40
   tools, 5 prompts, and 3 resources.

## Task 9: Run deterministic and live acceptance

Steps:

1. Run strict typecheck and the complete test suite.
2. Create a weekly repeating task with `add_omnifocus_task` and verify the rule
   and next occurrence through an independent read.
3. Create a project tree containing a repeating task and read it back.
4. Change the schedule type and anchor date with `set_repetition_rule` and
   verify.
5. Clear the rule and confirm `repetition` is `null`.
6. Delete every disposable object by stable ID and confirm absence.
7. Run the installed Skill workflow against the release candidate.

## Task 10: Release v1.20.0

Files:

- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `README.md`
- Modify: `README.zh.md`

Steps:

1. Update package and lockfile versions to 1.20.0.
2. Add synchronized English and Chinese release notes.
3. Run tests, production audit, and package dry run.
4. Confirm the package contains the updated runtime scripts and no test files.
5. Commit and push, create and push `v1.20.0`, and publish the GitHub Release
   with deterministic and live evidence.
6. Publish to npm, then verify `@latest`, a fresh Skill install, and one live
   repeating-task journey.
