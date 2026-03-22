# OmniFocus MCP Enhanced Roadmap

Date: 2026-02-25

## Vision
The long-term goal is not just to expose more OmniFocus actions.

The goal is to turn OmniFocus into an AI-native task system where users can say:

- "Plan my day."
- "Clean up my Inbox."
- "Turn these notes into a project."
- "Review what is blocked."
- "Reorganize this whole area safely."

This roadmap focuses on the highest-leverage upgrades that make those workflows feel natural, reliable, and worth using every day.

## Product Direction
We want the server to evolve across four layers:

1. Reliable execution
- Read, create, edit, move, delete, and batch-update tasks with predictable behavior.

2. Workflow acceleration
- Help users do common OmniFocus jobs faster: planning, Inbox cleanup, project setup, weekly review, and recurring maintenance.

3. AI-friendly structure
- Return data and errors in a way that makes large language models safer and more useful.

4. Automation confidence
- Make bulk actions previewable, partially recoverable, and easier to trust.

## What "Better" Looks Like
When this roadmap lands well, a user should be able to:

- paste meeting notes and get a clean project with subtasks
- ask for a weekly review summary and then mark projects reviewed
- reorganize dozens of tasks in one request without fragile manual steps
- create or update recurring tasks without opening OmniFocus UI
- let the AI suggest cleanup actions before making changes

## Roadmap Themes

### Phase A: Safer bulk organization
This phase turns the current single-item move foundation into practical high-volume task reorganization.

Primary focus:
- `batch_move_tasks`
- partial-success reporting
- better validation before execution
- clearer item-level error messages

Why it matters:
- users often want to clean up many tasks at once
- AI workflows become much more useful when one prompt can reorganize a whole list

### Phase B: Review and recurring work
This phase closes two major OmniFocus loops that AI assistants should handle well: weekly review and repeating commitments.

Primary focus:
- `repetitionRule` support
- `get_review_projects`
- `mark_project_reviewed`
- `set_review_interval`

Why it matters:
- recurring tasks are a core planning workflow
- review mode is one of the biggest missing pieces for full OmniFocus lifecycle support

### Phase C: Project shaping and refactoring
This phase makes it easier for AI to restructure work, not just create isolated tasks.

Primary focus:
- `duplicate_task`
- `convert_tasks_to_projects`
- better project templating flows

Why it matters:
- many real workflows start as rough task lists and later need to become structured projects
- AI becomes more helpful when it can reshape work instead of only adding new items

### Phase D: Trust, sync, and advanced metadata
This phase improves reliability after larger changes and brings the model closer to OmniFocus power-user workflows.

Primary focus:
- `sync_database`
- `save_document`
- tag group support
- stronger consistency tools after batch operations

Why it matters:
- advanced users care about predictability after large edits
- more metadata support means better parity with modern OmniFocus setups

## Priority Features

### 1. `batch_move_tasks`
Status: next major workflow upgrade

This is still the most important near-term addition because it unlocks real AI-assisted cleanup and reorganization.

Draft API:

```json
{
  "items": [
    {
      "id": "task-id-1",
      "targetProjectId": "project-id-1"
    },
    {
      "name": "Task B",
      "targetParentTaskId": "parent-id-2"
    },
    {
      "id": "task-id-3",
      "targetInbox": true
    }
  ]
}
```

Per item:
- source: `id` or `name`
- destination: exactly one of project / parent task / inbox

Expected result model:
- `total`
- `succeeded`
- `failed`
- `details[]` with per-item success or error

Error semantics should stay aligned with single-task move:
- not found
- ambiguous name (must use id)
- invalid destination selection
- invalid cycle move (self or descendant)

Non-goals for the first release:
- no position control (`before` / `after` / `start` / `end`)
- no path-based matching rules

## Example Future User Scenarios

### Scenario 1: Inbox cleanup
"Group these 25 Inbox items into the right projects, and move the remaining ones back to Inbox candidates for later review."

Needed roadmap pieces:
- batch move
- stronger validation
- partial-success reporting

### Scenario 2: Weekly review
"Show me projects due for review, summarize risk areas, then mark the reviewed ones complete for this cycle."

Needed roadmap pieces:
- review workflow tools
- better summary-oriented outputs

### Scenario 3: Recurring planning
"Create a repeating Friday admin checklist and make sure it shows up with the right repeat behavior."

Needed roadmap pieces:
- repetition rule read/write support

### Scenario 4: Turn notes into structure
"Take these brainstorm bullets, create a project, split them into parent tasks and subtasks, then flag the first next action."

Needed roadmap pieces:
- convert / duplicate / restructuring tools
- stable task hierarchy operations

## Recommended Sequencing

### Near term
- finish `batch_move_tasks`
- improve batch validation and item-level feedback

### After that
- add repetition rule support
- add review workflow tools

### Later
- add duplication / conversion workflows
- add sync / save / tag group support

## Guiding Principle
Every new feature should make the assistant feel less like a script runner and more like a real OmniFocus partner.

That means:
- fewer fragile multi-step prompts
- better support for whole workflows, not just isolated commands
- safer bulk changes
- more natural planning and review conversations
