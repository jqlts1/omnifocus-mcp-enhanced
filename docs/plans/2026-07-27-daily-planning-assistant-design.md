# Daily Planning Assistant Design

Date: 2026-07-27
Target release: v1.16.0

## Goal

Turn `daily_review` into the primary one-step entry point for planning a day
from OmniFocus. A user should be able to ask for a daily plan without knowing
which filters or perspectives to query, while retaining one explicit
confirmation before any suggested changes are applied.

This release improves an AI task-management workflow. It does not add a
general planning API or another CRUD tool.

## Selected Approach

Use a Prompt-first design:

- `daily_review` gathers bounded, count-first data and gives the model an
  explicit planning contract;
- `filter_tasks` gains one small `outputMode` enum for compact discovery;
- existing narrow write tools apply user-confirmed changes;
- the Skill documents the same workflow for shell-capable agents;
- a local benchmark records query time and response size without task content.

## Alternatives Considered

### Agent-orchestrated planning

Keep the Prompt light and rely on Skill instructions to make several calls.
This is flexible, but results vary more across MCP clients and models. It does
not provide the one-step Prompt experience selected for v1.16.

### Aggregated daily-planning Resource

Create a new Resource containing every daily candidate. This is reusable but
risks eagerly loading too much data and duplicates Prompt-specific planning
logic in a persistent read surface.

### New `daily_plan` tool

Return planning data from a dedicated tool. This would increase the tool
catalog and blur the line between deterministic task operations and model-led
planning. The current Prompt and existing read tools are sufficient.

## Public Surface

### `daily_review` Prompt

Add one optional argument:

```text
availableMinutes?: positive integer
```

When omitted, the assistant does not assume an eight-hour day or any other
fixed capacity. It still reports qualitative capacity risks.

### `filter_tasks.outputMode`

Add a two-value enum:

```text
detailed | compact
```

`detailed` remains the default and preserves existing output. `compact` is for
broad discovery and planning. Arbitrary field lists are intentionally not
supported.

No new MCP tool or Resource is added.

## Data Flow

The Prompt performs two bounded phases.

### Phase 1: exact counts

Use the same OmniJS predicate as `count_tasks` to obtain four counts:

- overdue remaining tasks;
- tasks due today;
- tasks planned today;
- flagged remaining tasks.

Counts are the workload overview and determine whether detailed candidate
lists need to be broad or narrow. Count failure is fatal: the Prompt must not
produce a plausible-looking plan from incomplete workload totals.

### Phase 2: bounded candidates

Fetch bounded task details for:

- overdue tasks;
- tasks due today;
- tasks planned today;
- flagged Available, Next, DueSoon, Overdue, and Blocked tasks.

Each category has a fixed response cap. Merge categories by stable task ID so
the same task appears once with all relevant signals. Do not fetch complete
notes, attachments, or unbounded task trees for initial planning. A focused
follow-up read may inspect a selected task when needed.

If one detail category fails after all counts succeeded, continue with the
remaining categories but record the missing source in the capacity/risk
section. The model must not imply complete coverage.

## Candidate Model

Each compact candidate retains:

- stable task ID;
- name;
- task status;
- project name or Inbox state;
- due date when present;
- defer date when present;
- planned date when present;
- flagged state;
- estimate when present;
- visible direct subtask count.

Compact mode omits notes and full tag details. This keeps discovery responses
bounded while preserving fields needed for planning and focused follow-up.

## Planning Contract

The model automatically chooses exactly three daily priorities. Selection must
be grounded in:

- deadline urgency;
- planned date;
- flagged intent;
- availability and task status;
- dependency or blocker impact;
- user-provided capacity;
- known estimates and missing-estimate uncertainty.

Completed and Dropped tasks cannot be selected. Blocked tasks belong in the
blocked section unless resolving the blocker is itself the most important
outcome for today.

The response always has four sections:

1. `今日重点`
2. `可执行下一步`
3. `阻塞项`
4. `容量/截止风险`

Each priority includes its stable ID and a concise rationale. The model should
avoid fabricating schedule precision when estimates are absent.

## Capacity Semantics

When `availableMinutes` is supplied:

- sum estimates only for selected priorities that have estimates;
- compare that known total with available capacity;
- list selected tasks with missing estimates as uncertainty;
- never treat missing estimates as zero;
- identify obvious over-capacity plans and suggest what to defer.

When `availableMinutes` is omitted:

- do not invent a daily capacity;
- report qualitative deadline clustering, large estimates, and missing
  estimates;
- ask for available time only when it would materially change the plan.

## Applying Changes

After presenting the complete plan, gather proposed changes into one readable
confirmation request. Examples include flag changes, planned/defer date
adjustments, estimates, and task placement.

Only after explicit confirmation should the assistant call existing narrow
tools such as `edit_item`, `move_task`, or `batch_move_tasks`. The daily Prompt
does not auto-flag selected priorities and does not introduce a generic update
operation.

## Error Handling

- Any count failure stops planning with a clear source error.
- A detail-source failure is disclosed in `容量/截止风险`.
- Empty candidate sets produce an explicit low-workload plan rather than
  invented priorities.
- Duplicate candidates are merged by stable ID.
- Invalid `availableMinutes` is rejected by Prompt schema validation.
- Output-mode changes do not alter filtering, sorting, limiting, or counts.

## Resources

Keep the existing `omnifocus://today` Resource for compatibility. Update its
description or payload only if the implementation can add bounded summary
metadata without duplicating the Prompt's candidate orchestration. A new daily
planning Resource is out of scope.

## Skill Workflow

The `omnifocus-cli` Skill should teach count-first planning for agents that do
not invoke MCP Prompts directly:

1. count overdue, due-today, planned-today, and flagged work;
2. use compact filtering with bounded limits;
3. inspect selected tasks in detail only when necessary;
4. produce the same four planning sections and exactly three priorities;
5. request one confirmation before applying the proposed changes.

## Testing

Automated tests cover:

- `outputMode` schema acceptance and rejection;
- detailed output backward compatibility;
- compact output includes every required planning field;
- compact output omits notes and tag details;
- output mode does not change count/filter semantics;
- Prompt accepts and validates `availableMinutes`;
- Prompt data includes exact category counts and bounded deduplicated
  candidates;
- Prompt instructions require the four output sections and exactly three
  priorities;
- missing estimate and partial detail-source rules are explicit.

Live validation covers:

- daily Prompt generation against a real database;
- useful priority selection with and without `availableMinutes`;
- bounded response size;
- one confirmed change flow through an existing write tool when safe.

## Benchmark

Add a local smoke benchmark that measures:

- `count_tasks`-equivalent queries;
- compact `filter_tasks` queries;
- Inbox and Forecast reads;
- bounded-depth task-tree reads;
- elapsed milliseconds;
- result counts;
- UTF-8 response bytes;
- errors.

The benchmark prints or saves only numeric summaries. It must not persist task
names, notes, IDs, tags, or other personal OmniFocus content. Results establish
a regression baseline, not a public service-level promise.

## Acceptance Criteria

- A user can invoke `daily_review` with no arguments and receive a grounded,
  bounded daily plan.
- `availableMinutes` changes capacity analysis without inventing estimates.
- The plan always contains the four required sections and exactly three
  priorities when at least three eligible candidates exist.
- Broad discovery uses compact output; focused details remain available.
- No new MCP tool or Resource is introduced.
- No write occurs before one explicit confirmation.
- Tests, live Prompt validation, benchmark smoke, audit, package dry run, Skill,
  and bilingual documentation checks pass.
