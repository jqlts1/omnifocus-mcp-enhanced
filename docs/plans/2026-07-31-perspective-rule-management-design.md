# Custom Perspective Rule Management Design

## Problem

AI clients can read the tasks a custom perspective produces but cannot read or
change why it produces them. `list_custom_perspectives` returns only names and
identifiers, so a user asking "why is this perspective empty?" or "make this
perspective also include deferred work" has no path forward except editing the
perspective by hand in OmniFocus.

The underlying filter rules are both readable and writable, but they are stored
in a form no AI client can safely manipulate directly:

- rules nest arbitrarily through `aggregateRules` / `aggregateType`;
- rules the user toggled off in the UI are preserved wrapped in `disabledRule`;
- tag, project, and folder references use primary keys, not names;
- the published Omni Automation documentation is incomplete. Rules observed in
  real databases (`actionHasPlannedDate`, `actionDateField: "planned"`) do not
  appear in it.

A naive read-modify-write against this structure silently reactivates disabled
rules, drops rules the client did not recognize, and writes tag names into
fields that require primary keys.

## Verified Capabilities

Confirmed by live experiment against OmniFocus 4.8.12 (build 185.17). Every
probe was reverted and the database returned to its original 16 perspectives.

| Capability | Result | Channel |
| --- | --- | --- |
| Read rules and aggregation | works | OmniJS `archivedFilterRules` |
| Write rules | works, persists | OmniJS assignment |
| Write aggregation | works, persists | OmniJS assignment |
| Rename | works, persists | OmniJS `name` (documented read-only; is not) |
| Create | no API | only via `.ofocus-perspective` bundle import |
| Delete | no OmniJS API | only via AppleScript `delete` |

`Perspective.Custom` exposes only `all`, `byName`, and `byIdentifier`. It is not
a constructor, and neither the class nor the instance prototype offers add or
remove. Creation and deletion are therefore out of scope by capability as well
as by choice.

Writes do not refresh a displayed perspective. Assigning a contradictory rule
set to the perspective shown in the front window left its content tree
unchanged; switching the window to another perspective and back applied the
change. Forcing that toggle after a write is required, not cosmetic.

## Decision

A single `manage_perspectives` tool exposes `list`, `get`, and `update` for
custom perspectives. All writes are in-place OmniJS assignments, so perspective
identifiers remain stable and no perspective is ever recreated.

Editable properties are limited to name, filter rules, top-level aggregation,
and icon color. View options such as grouping, sorting, and column visibility
are excluded: they live only in the perspective's property list and can be
changed solely by deleting and reimporting the perspective, which would change
its identifier.

`list_custom_perspectives` is removed. Its behavior becomes
`manage_perspectives` with `action: "list"`, matching how `manage_folders` and
`manage_tags` already consolidate their operations.

## Rule Representation

Reads and writes use one symmetric, name-based shape. The same document
returned by `get` is accepted by `update`.

```json
{
  "match": "all",
  "rules": [
    { "type": "tagged-any", "refs": [{ "name": "深度工作" }], "enabled": false },
    {
      "match": "any",
      "rules": [
        { "type": "availability", "value": "available" },
        {
          "match": "all",
          "rules": [
            { "type": "date", "field": "defer", "when": "today" },
            { "type": "availability", "value": "remaining" }
          ]
        }
      ]
    }
  ]
}
```

Mapping to the native archive:

- `match` maps to `aggregateType`; the outermost `match` maps to
  `archivedTopLevelFilterAggregation`.
- `rules` maps to `aggregateRules` for nested groups.
- `enabled: false` maps to the `disabledRule` wrapper. Absent means enabled.
- References carry both an `id` and a `name`. Reads populate both; writes use
  the `id` when present and otherwise resolve the `name`.

A date window models each bound independently, because OmniFocus stores an
unbounded side as an empty spec and ignores the rule entirely unless both bound
keys are written:

```json
{ "type": "date", "field": "defer",
  "when": { "between": { "after": "tomorrow", "before": null } } }
```

Any native rule the translator does not recognize round-trips through an opaque
node:

```json
{ "type": "raw", "native": { "someFutureRule": true } }
```

This is the central safety property. Because the documented rule vocabulary is
known to be incomplete, an unrecognized rule must survive a read-modify-write
cycle untouched rather than be dropped.

## Write Protocol

OmniFocus performs no validation whatsoever on `archivedFilterRules`. An
invented key is stored verbatim and then ignored by the filter engine, which
makes the perspective match everything. This was confirmed by writing a
deliberately bogus key and observing it stored intact and silently ignored. The
consequence shapes the whole protocol: reading a value back proves only that
storage succeeded, never that the rule is meaningful, so client-side validation
is the sole line of defence and runs before anything is written.

`update` performs each step in order and aborts the whole operation on failure:

1. Validate the rule tree against the verified vocabulary, reject rule keys the
   engine is known to ignore, and enforce a bounded nesting depth. This happens
   before OmniFocus is touched.
2. Resolve tag, project, and folder names to primary keys. An unknown or
   ambiguous name fails the request and names the offending reference; it is
   never silently skipped.
3. Capture the current rules, aggregation, and name as a rollback point.
4. Write name, rules, aggregation, and icon color through OmniJS.
5. Read back and deep-compare against the intended native archive. On mismatch,
   restore the rollback point and report the write as failed.
6. If the edited perspective is displayed in any window, toggle that window to
   another perspective and back to force a refresh.

Any exception after step 3 restores the rollback point before the error is
returned.

`dryRun: true` stops after step 2 and returns the resulting native archive and
a diff, writing nothing.

Successful writes return a rule-level diff naming what was added, removed,
enabled, disabled, or changed, so the client can report the edit precisely
rather than claiming an unverified success.

## Optimization

Optimization is a prompt composing existing tools, not new machinery. It reads
the rule tree, explains it in plain language, reports how many items the
perspective currently matches using the existing custom-perspective read, flags
structural faults, and proposes an edit the user must approve before it is
applied through `update`.

The faults worth detecting are the ones that make a perspective silently
useless: an `all` group combining mutually exclusive `actionAvailability`
values, an `all` group whose tag requirements cannot co-occur, and a
perspective whose rules match nothing at all.

## Failure Handling

- Unknown or ambiguous tag, project, or folder names fail the request.
- Unknown rule types in client input fail the request; unknown rule types read
  from OmniFocus round-trip as `raw` nodes.
- A read-back mismatch restores the backup and reports failure.
- A perspective that disappears between read and write fails the request rather
  than recreating it, since creation is out of scope.
- Rename to a name already used by another custom perspective is rejected;
  OmniFocus permits duplicate names, and duplicates make name-based lookup
  ambiguous for every later call.

## Verification

The translator is a pure function pair and carries the bulk of the tests:

- nested groups at multiple depths;
- `disabledRule` preserved across a read-modify-write cycle;
- unrecognized native rules preserved through `raw` nodes;
- name-to-key resolution, including unknown and ambiguous names;
- nesting depth bound enforced.

A round-trip property test asserts that native to friendly to native is an
identity transform. Its fixtures are the rule archives of the 16 real
perspectives captured during this investigation, which already cover nested
aggregation, disabled rules, focus references, dynamic date specifications, and
the undocumented planned-date rules.

Live verification drives the tool against a real perspective and confirms
persistence, read-back agreement, refusal of unknown references, rollback after
a refused write, and full restoration afterwards. A second live check displays
the perspective being edited and asserts the on-screen result actually changes
without a manual toggle.

## Files

New:

- `src/utils/omnifocusScripts/perspectiveRuleHelpers.js`
- `src/utils/omnifocusScripts/getPerspectiveRules.js`
- `src/utils/omnifocusScripts/updatePerspectiveRules.js`
- `src/tools/primitives/perspectiveRuleDsl.ts`
- `src/tools/primitives/perspectiveRuleFixtures.ts`
- `src/tools/primitives/managePerspectives.ts`
- `src/tools/definitions/managePerspectives.ts`
- `scripts/perspective-smoke.mjs`, `scripts/perspective-refresh-smoke.mjs`

Changed:

- `src/tools/registerTools.ts` registers the tool.
- `src/utils/scriptExecution.ts` replaces the task-tree-only helper injection
  with one script-to-helper table so the perspective scripts share their
  reference resolution.
- `scripts/copy-files.mjs` copies the new OmniJS scripts.
- `README.md`, `README.zh.md`, and the `omnifocus-cli` skill drop
  `list_custom_perspectives` and document `manage_perspectives`.

Removed:

- `src/tools/definitions/listCustomPerspectives.ts`
- `src/tools/primitives/listCustomPerspectives.ts`
- `src/utils/omnifocusScripts/listCustomPerspectives.js`
