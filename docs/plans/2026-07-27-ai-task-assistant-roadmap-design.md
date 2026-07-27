# AI Task Assistant Roadmap Design

Date: 2026-07-27

## Product Position

OmniFocus MCP Enhanced is an AI task management assistant, not a complete
public wrapper around every OmniFocus API.

The product should help users express outcomes in natural language while the
assistant handles discovery, validation, execution, and verification. New
public tools are justified only when they complete a clear user workflow that
existing tools cannot complete safely.

## Design Principles

1. Prefer complete workflows over isolated capabilities.
2. Keep each public tool narrow and easy for an AI model to select correctly.
3. Put preflight checks, atomicity, and read-back verification inside the
   implementation instead of exposing infrastructure switches to users.
4. Use safe, useful defaults. Avoid arbitrary field selectors, execution-mode
   matrices, and protocol-level controls unless a demonstrated workflow needs
   them.
5. Require one human confirmation before consequential bulk changes.
6. Return enough context for the assistant's next decision without returning
   the full OmniFocus database.
7. Measure success through user journeys: Inbox cleanup, weekly review, and
   daily planning.

## Considered Approaches

### Workflow-first delivery (selected)

Each release completes one recognizable task-management workflow and adds only
the minimum internal infrastructure needed for it.

Advantages:

- user value arrives in every release;
- tool complexity remains bounded;
- safety work is validated against concrete actions;
- Prompts and the CLI Skill evolve together with MCP tools.

Trade-off:

- shared infrastructure grows incrementally rather than through one broad
  platform rewrite.

### Platform-first delivery

Build a generic mutation framework, arbitrary field selection, pagination,
and verification before adding workflows.

This offers architectural uniformity but delays user value and risks exposing
too many implementation concepts in public schemas.

### Mixed feature expansion

Add several workflows and infrastructure features in every release.

This increases coverage quickly but creates larger releases, harder validation,
and more opportunities for AI tool-selection errors.

## Shared Internal Architecture

The three releases use a small internal execution pattern without turning it
into a universal public tool:

```text
Prompt or Skill workflow
  -> focused read tools
  -> human-readable proposal
  -> one user confirmation
  -> narrow action tool
  -> resolve and preflight every target
  -> execute one atomic change
  -> read affected objects back
  -> return verified summary
```

The shared mutation code should provide internal functions for:

- stable-ID resolution;
- destination and eligibility validation;
- cycle prevention;
- all-target preflight before the first write;
- post-write read-back;
- concise per-item success or failure reporting.

These are implementation guarantees, not optional public arguments.

## v1.14: Safe Inbox Organization

### User outcome

The user can ask the assistant to clean up the Inbox, review one proposed plan,
confirm once, and receive a verified result.

### Public surface

Add one tool: `batch_move_tasks`.

Its input contains only a list of task IDs and destinations. Each destination
is exactly one of:

- project ID;
- parent task ID;
- Inbox.

The tool does not expose `executionMode`, `previewOnly`, `verify`, or
`returnFields`. Proposal review happens conversationally before invocation;
execution is always atomic and verification is always enabled.

Example shape:

```json
{
  "moves": [
    { "taskId": "task-1", "projectId": "project-1" },
    { "taskId": "task-2", "parentTaskId": "task-3" },
    { "taskId": "task-4", "inbox": true }
  ]
}
```

### Workflow

1. Read Inbox tasks, including subtask counts.
2. Read candidate projects or parent tasks only when needed.
3. Present a compact move proposal grouped by destination.
4. Ask for one confirmation.
5. Call `batch_move_tasks` with stable IDs.
6. Re-read moved tasks and report verified destinations.
7. Show unresolved or intentionally retained Inbox items.

### Failure behavior

- Duplicate task IDs, missing tasks, ambiguous destinations, invalid
  destinations, self-moves, and descendant cycles fail during preflight.
- If any move is invalid, no move is executed.
- A verification mismatch makes the operation result a failure, even if the
  automation call itself returned successfully.
- Errors identify the affected task and the corrective action without exposing
  OmniJS implementation details.

### Non-goals

- automatic classification without presenting a proposal;
- deletion;
- changing tags, dates, flags, or names in the same batch;
- custom task positioning;
- best-effort partial execution.

### Assistant integration

Upgrade the Inbox cleanup Prompt and `omnifocus-cli` Skill to encode the
read-propose-confirm-execute-report sequence. The workflow should prefer IDs,
avoid moving parent and child independently when one structural move is
sufficient, and never infer user confirmation from an earlier unrelated
message.

## v1.15: Weekly Review Completion

### User outcome

The assistant can identify projects due for review, summarize risks, conduct a
review conversation, and mark the confirmed projects reviewed.

### Public surface

Add one tool: `mark_projects_reviewed`.

Input:

```json
{
  "projectIds": ["project-1", "project-2"]
}
```

The tool accepts stable IDs only. It always performs complete preflight,
atomic execution, and post-write verification.

Review interval changes remain available through `edit_item`; no separate
`set_review_interval` tool is added in this release.

### Workflow

1. Call `get_projects_due_for_review`.
2. Summarize each project's status, next actions, blocked work, and stale or
   missing structure.
3. Let the user discuss or adjust the project before marking it reviewed.
4. Present the final project set and ask for one confirmation.
5. Call `mark_projects_reviewed`.
6. Verify `lastReviewDate` and OmniFocus-generated `nextReviewDate`.
7. Report projects still due for review.

### Failure behavior

- Every project must exist and be eligible before any review timestamp changes.
- Completed or dropped projects and projects without usable review metadata
  fail preflight with a clear reason.
- One request timestamp is used for the complete batch.
- The existing review interval must remain unchanged.
- A missing or unexpected next review date is a verification failure.

### Non-goals

- redesigning project status APIs;
- combining review marking with arbitrary project edits;
- adding a generic project mutation tool;
- automatically marking projects reviewed merely because they were displayed.

### Assistant integration

Upgrade the Weekly Review Prompt and Skill guidance from a read-only report to
a guided completion loop. The assistant must distinguish "we discussed this
project" from explicit confirmation to mark it reviewed.

## v1.16: Daily Planning Assistant

### User outcome

The assistant can produce a focused daily plan from OmniFocus without loading
large unbounded task lists or asking the user to understand query parameters.

### Public surface

No new CRUD tool is planned.

Add one optional, bounded output choice to `filter_tasks`, such as:

```json
{
  "outputMode": "compact"
}
```

The exact name should follow existing conventions after implementation review.
It should be a small enum, not an arbitrary list of fields. Existing output
remains the default for compatibility.

### Workflow

1. Use `count_tasks` to estimate workload before loading task details.
2. Read Forecast, Flagged, relevant custom perspectives, and task trees only
   where needed.
3. Produce four sections:
   - today's priorities;
   - concrete available next actions;
   - blocked work requiring attention;
   - capacity or deadline risks.
4. Ask the user whether to adjust flags, dates, estimates, or task placement.
5. Use existing narrow write tools for confirmed changes.
6. Return the final plan and any unresolved risks.

### Compact output contract

Compact task output should retain only the fields normally needed for planning:

- stable ID;
- name;
- status;
- project;
- due, defer, and planned date markers when present;
- flagged state;
- estimate when present;
- direct subtask count.

Notes and full tag details should remain in detailed output or a focused
follow-up read.

### Performance evidence

Add a repeatable large-database smoke benchmark covering:

- `count_tasks`;
- compact `filter_tasks`;
- Inbox and Forecast reads;
- task-tree expansion at bounded depth;
- response byte size and elapsed time.

The benchmark is a regression signal, not a public performance promise.

### Non-goals

- arbitrary field-selection schemas;
- cursor pagination before a concrete workflow requires a second page;
- ranking tasks with an opaque scoring algorithm;
- automatic edits without confirmation;
- rewriting the server in Swift or requiring an OmniFocus plugin.

## Testing Strategy

Every release requires:

- schema tests for the narrow public surface;
- deterministic unit tests for preflight and validation boundaries;
- all-or-nothing tests proving no mutation occurs after any preflight failure;
- post-write verification mismatch tests;
- real OmniFocus smoke tests for the complete user journey;
- updated Prompt, Skill, English README, and Chinese README examples;
- build, complete automated test suite, production dependency audit, and
  package dry run.

Release-specific acceptance:

- v1.14: multiple tasks move to project, parent, and Inbox destinations in one
  verified batch; an invalid cycle leaves every item unchanged.
- v1.15: multiple eligible projects receive one review timestamp and valid next
  review dates; one ineligible project leaves every timestamp unchanged.
- v1.16: the Daily Planning workflow starts with counts, keeps detailed reads
  bounded, and produces the four required planning sections.

## Immediate Maintenance Gate

Before v1.14 feature implementation, correct release-version drift so MCP
server metadata comes from the package version rather than a hand-maintained
literal. After npm publication, rerun the installed Skill journey and verify
all commands and task-tree flags against the published package.

This is release hygiene, not a separate product-workflow milestone.

## Success Measures

The roadmap succeeds when:

- users can complete each workflow with one proposal confirmation;
- bulk operations never partially execute after a preflight failure;
- successful write responses reflect verified OmniFocus state;
- no release adds more than one narrow action tool unless a newly discovered
  hard requirement makes it unavoidable;
- Prompt and Skill instructions let AI clients perform the workflow without
  exposing internal execution controls to users;
- routine planning reads remain bounded and understandable.
