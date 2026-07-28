# Repeating Task Completion Design

Date: 2026-07-29
Target release: v1.20.0

## Product Outcome

A user can ask the assistant to create a repeating task or a checklist whose
items repeat, and can later ask what a task's repetition means and when it fires
next. Every repetition write is verified, and a failed write never leaves a rule
that contradicts the user's intent.

## Problem

`set_repetition_rule` already writes ICS rule strings, schedule types, anchor
dates, catch-up behavior, and clearing. Four gaps remain, all confirmed in the
current code:

1. Repetition is invisible to reads. `get_task_by_id` and the shared task
   serializer in `taskTreeHelpers.js` never return it. `dump_database`
   hard-codes `repetitionRule`, `repetitionMethod`, and `isRepeating` to `null`
   and `false`. Only `getCustomPerspectiveTasks.js` returns an unparsed
   `toString()` value.
2. `setRepetitionRule.js` returns whatever OmniFocus reports after writing. It
   never compares the result against the request, never fails on mismatch, and
   never restores the previous rule. Every other mutating tool since v1.14
   guarantees preflight, verification, and restoration.
3. Repetition cannot be set at creation time, so a repeating task always needs a
   second call and can exist briefly without its intended recurrence.
4. Projects cannot be given a repetition rule even though OmniFocus supports it.

## Official API Semantics

From `omni-automation.com/omnifocus/task-repeat.html`:

- `Task.RepetitionRule` exposes read-only `ruleString`, `scheduleType`,
  `anchorDateKey`, `catchUpAutomatically`, and a deprecated `method`.
- `firstDateAfterDate(date)` returns the next date described by the rule.
- The constructor throws on an invalid rule string, and also throws when the
  deprecated `method` is combined with `scheduleType`/`anchorDateKey`.
- Assigning `null` disables repetition.

The constructor is therefore the authority on rule validity. This design does
not reimplement RRULE parsing.

## Considered Approaches

### Complete the loop across reads, creation, and verification (selected)

Make repetition a first-class field of the existing tools: readable where task
detail is already returned, writable at creation time, and always verified.

Advantages:

- matches the recorded roadmap;
- removes the two-call creation gap;
- brings the last unverified mutating path up to the project-wide contract;
- adds no new public tool.

Trade-off: touches several serializers and two creation paths in one release.

### Reads only

Expose repetition in reads and leave writes unchanged. Ships sooner, but leaves
an unverified write path and the two-call creation gap.

### Add a separate repetition workflow tool

A dedicated tool duplicates `set_repetition_rule` and pushes AI clients toward
more calls rather than fewer.

## Public Contract

No new tool.

### Reads

`get_task_by_id` returns a `repetition` object, or `null` when the task does not
repeat:

```json
{
  "repetition": {
    "ruleString": "FREQ=WEEKLY;BYDAY=FR",
    "scheduleType": "Regularly",
    "anchorDateKey": "DueDate",
    "catchUpAutomatically": true,
    "nextOccurrence": "2026-08-07T10:00:00.000Z"
  }
}
```

- `nextOccurrence` comes from `firstDateAfterDate(now)` and is `null` when
  OmniFocus cannot compute it.
- List reads (`filter_tasks`, Inbox, Flagged, Forecast, Tag, and expanded
  descendants) add only `isRepeating`. Both detailed and compact output keep this
  single boolean so responses do not grow.
- `dump_database` replaces its hard-coded values with real ones and reports
  `scheduleType` in place of the deprecated `method`.

### Writes

`add_omnifocus_task` and every task node of `create_project_from_outline` accept
one optional `repetition` object:

```json
{
  "repetition": {
    "ruleString": "FREQ=WEEKLY;BYDAY=FR",
    "scheduleType": "Regularly",
    "anchorDateKey": "DueDate",
    "catchUpAutomatically": true
  }
}
```

- Only an ICS `ruleString` is accepted. `UNTIL` and `COUNT` belong inside that
  string, so the schema does not introduce a second date/count syntax.
- `scheduleType` is `Regularly` or `FromCompletion`; `anchorDateKey` is
  `DueDate`, `DeferDate`, or `PlannedDate`. Omitted values use OmniFocus
  defaults.
- The deprecated `method` parameter is never exposed.
- `create_project_from_outline` applies repetition to tasks only. Project-level
  repetition is deferred.
- `batch_add_items` is unchanged; it remains the non-atomic, best-effort tool.

`set_repetition_rule` keeps its current input, including `endDate` and `count`
encoding, and gains the missing verification guarantees.

## Validation and Preflight

Before any write:

- reject an empty rule string, strip a leading `RRULE:`, and require `FREQ=`;
- validate the schedule type and anchor date enums;
- require a boolean `catchUpAutomatically`;
- let the OmniFocus constructor make the final validity decision and translate
  its error into a structured failure.

A preflight failure performs no mutation.

## Verification and Failure Semantics

`set_repetition_rule`:

1. capture a snapshot of the existing rule, including the `null` case;
2. write the new rule;
3. re-read and compare the normalized `ruleString`, `scheduleType`,
   `anchorDateKey`, and `catchUpAutomatically`;
4. on a write exception or any field mismatch, restore the snapshot and fail;
5. when restoration cannot be confirmed, report the residual state and the
   affected stable ID instead of claiming success;
6. for `clear: true`, verify that `repetitionRule` actually became `null`.

Creation paths:

- `add_omnifocus_task` applies and verifies the rule after creating the task. A
  verification failure deletes the newly created task so no task survives with a
  recurrence the user did not ask for.
- `create_project_from_outline` treats repetition as one more verified field
  inside the existing single-transaction, full read-back, bounded-Undo path. No
  new switches are added.

Structured error codes:

- `INVALID_REPETITION`: schema, enum, or ICS rule rejected;
- `REPETITION_WRITE_FAILED_RESTORED`: the write failed and the previous rule was
  restored;
- `REPETITION_VERIFICATION_FAILED_RESTORED`: read-back disagreed and the previous
  rule was restored;
- `REPETITION_RESTORE_UNCONFIRMED`: restoration could not be confirmed; the
  affected stable ID is returned.

## Integration

- Add a shared internal repetition module for normalization, enum mapping,
  snapshots, and field comparison, reused by reads, `set_repetition_rule`, and
  both creation paths. It is not a public tool.
- Update the `project_shaping` Prompt and the bundled CLI Skill to require ICS
  rule strings and to report the verified rule plus the next occurrence.
- Synchronize bilingual documentation. The public surface stays at 40 tools,
  5 prompts, and 3 resources.

## Acceptance Criteria

### Deterministic tests

- accept valid ICS strings with every supported enum combination;
- reject empty rules, rules without `FREQ=`, invalid enums, and any attempt to
  pass the deprecated `method`;
- prove a preflight failure writes nothing;
- prove a write exception restores the previous rule, including restoring `null`
  when the task previously did not repeat;
- prove each of `ruleString`, `scheduleType`, `anchorDateKey`, and
  `catchUpAutomatically` triggers restoration on mismatch;
- prove `clear` verifies the rule became `null`;
- prove `REPETITION_RESTORE_UNCONFIRMED` includes the affected stable ID;
- prove list reads add only `isRepeating` and compact output carries no
  repetition object;
- prove `get_task_by_id` reports `nextOccurrence`, and `null` when it cannot be
  computed.

### Live smoke test

1. Create a weekly repeating task with `add_omnifocus_task` and verify the
   returned rule and next occurrence.
2. Create a project tree containing a repeating task with
   `create_project_from_outline` and read it back independently.
3. Change `scheduleType` and `anchorDateKey` with `set_repetition_rule` and
   verify the result.
4. Clear the rule and confirm `repetition` is `null`.
5. Delete every disposable object by stable ID and confirm absence.

### Release gates

- complete test suite and strict typecheck;
- production dependency audit;
- dry-run package includes runtime scripts and excludes test sources;
- installed CLI Skill exposes the repetition input and documents the workflow;
- English and Chinese release notes agree;
- npm and GitHub installed journeys verified after publication.

## Subsequent Releases

- v1.21: project-level repetition rules plus explicit synchronization and
  persistence workflows.
- v1.22 candidate: promoting existing tasks to projects, or project templates,
  selected from real v1.19 and v1.20 usage evidence.
