# Project Outline Creation Design

Date: 2026-07-28
Target release: v1.19.0

## Product Outcome

A user can give the assistant meeting notes, brainstorming output, or a task
list; review one proposed project tree; confirm it once; and receive a complete,
verified OmniFocus project with stable IDs for every created node.

The MCP server does not parse natural language or run an embedded model. The
Prompt or client converts the user's text into a human-readable proposal and,
after explicit confirmation, submits a structured outline.

## Problem

`batch_add_items` is intended for independent, best-effort additions. It invokes
single-item creation sequentially, cannot reference a parent created earlier in
the same request without an external round trip, and can leave a partial result.
Extending it with client references and transaction flags would turn a simple
bulk tool into a generic mutation protocol.

Project shaping needs a narrow workflow contract with complete preflight,
single-request creation, mandatory read-back verification, and bounded rollback.

## Considered Approaches

### Dedicated workflow tool (selected)

Add `create_project_from_outline`. It accepts one nested project tree and owns
preflight, creation, verification, and rollback.

Advantages:

- matches the user's intended outcome;
- represents parent-child relationships directly;
- keeps safety guarantees internal and mandatory;
- leaves `batch_add_items` backward compatible and easy to select.

Trade-off: one additional public tool.

### Extend `batch_add_items`

Add `clientRef` and `parentRef` plus transactional behavior. This is more
general, but expands the public schema into a reference language and makes tool
selection and compatibility harder.

### Compose existing tools in the client

Create a project and tasks through multiple calls. This adds no public tool, but
creates avoidable round trips and can leave a half-created project after a
failure.

## Public Contract

Add one tool: `create_project_from_outline`.

Illustrative input:

```json
{
  "project": {
    "name": "Launch the new website",
    "note": "Source: July product meeting",
    "folderId": "folder-id",
    "tagIds": ["tag-id"],
    "dueDate": "2026-08-30T18:00:00+08:00",
    "plannedDate": "2026-08-01",
    "sequential": true,
    "tasks": [
      {
        "name": "Confirm information architecture",
        "estimatedMinutes": 60,
        "sequential": true,
        "children": [
          { "name": "Inventory current pages" },
          { "name": "Review the new navigation" }
        ]
      }
    ]
  }
}
```

Project and task nodes support:

- `name`;
- `note`;
- `tagIds`;
- `dueDate`;
- `deferDate`;
- `plannedDate`;
- `flagged`;
- `estimatedMinutes`;
- `sequential`.

The project additionally supports `folderId` and `tasks`. Task nodes use
`children` for hierarchy.

All object references use stable IDs. The tool never guesses by name and never
creates missing folders or tags. Unknown fields are rejected. An outline may
contain at most 200 task nodes and may be at most eight task levels deep.

The first release excludes repetition rules, notifications, review intervals,
completion/status mutation, custom placement, preview flags, and caller-controlled
atomicity or verification.

`batch_add_items` remains unchanged for independent best-effort additions.

## Assistant Workflow

1. Accept meeting notes, brainstorming output, or a task list.
2. Produce a readable project tree and clearly identify inferred metadata.
3. Resolve proposed folders and tags to stable IDs with existing read tools.
4. Present the complete final proposal and ask for explicit confirmation.
5. Call `create_project_from_outline` once with the confirmed structure.
6. Report the verified project ID and task path-to-ID mapping.
7. If creation fails, report whether rollback was confirmed and expose any
   residual project ID requiring manual recovery.

Raw natural-language input is never passed to the action tool.

## Validation and Preflight

Before the first write, the implementation:

- enforces the node and depth bounds;
- rejects blank names and malformed nesting;
- validates strict schemas and ISO date inputs;
- requires finite, non-negative estimates;
- resolves `folderId` and every distinct `tagId`;
- rejects missing or unusable references;
- assigns each node an internal path such as
  `Launch the new website/Confirm information architecture/Review the new navigation`.

Every failure names the exact field or path. A preflight failure performs no
mutation.

## Execution and Rollback

The structured plan is executed in one OmniJS request:

1. capture the relevant pre-creation Undo state;
2. create the project in the resolved folder or database root;
3. set project metadata and tags;
4. create the task tree depth-first and set each node's metadata and tags;
5. retain stable IDs and expected parent IDs for verification.

Any execution exception triggers bounded OmniFocus Undo. The implementation
must stop once the new project no longer exists; it must not consume unrelated
Undo history. If cleanup cannot be confirmed, the result returns the residual
project ID and never claims atomic success.

## Mandatory Read-Back Verification

Success requires verification by stable ID of:

- the project and every task exist;
- the total node count;
- every direct parent-child relationship;
- project folder placement;
- names and supported core fields;
- assigned tags;
- sequential mode.

A mismatch triggers the same bounded rollback path as an execution exception.
The successful response returns a flat `items` array rather than repeating the
large input tree. Each item contains `id`, `type`, `path`, `parentId`, and
`verified`.

## Error Model

The primitive returns a structured code and readable message:

- `INVALID_OUTLINE`: invalid shape, field, date, bound, or value;
- `REFERENCE_NOT_FOUND`: a folder or tag cannot be resolved;
- `CREATE_FAILED_ROLLED_BACK`: execution failed and project removal was verified;
- `VERIFICATION_FAILED_ROLLED_BACK`: read-back failed and project removal was verified;
- `ROLLBACK_UNCONFIRMED`: cleanup could not be confirmed and a residual project
  ID is returned.

The MCP handler renders these details without exposing OmniJS stack traces.

## Integration

- Register `create_project_from_outline` with additive annotations and a
  description that restricts it to a user-confirmed outline.
- Add a project-shaping Prompt that implements extract, propose, confirm,
  create, and report.
- Update the bundled CLI Skill with the same confirmation and stable-reference
  rules.
- Add synchronized English and Chinese documentation and examples.
- Include the OmniJS script in the explicit runtime copy list and package gate.

## Acceptance Criteria

### Deterministic tests

- accept valid nested outlines and reject unknown fields;
- reject empty projects, 201 task nodes, and nine task levels;
- reject invalid dates, estimates, and references;
- prove every reference is resolved before creation;
- prove a preflight failure writes nothing;
- prove a mid-creation exception removes the new project;
- prove parent, field, folder, or tag verification mismatch removes the project;
- prove rollback stops when the created project is absent;
- prove `ROLLBACK_UNCONFIRMED` includes the residual project ID;
- verify Prompt and Skill confirmation language and tool registration.

### Live smoke test

Through an MCP client, create one disposable three-level project using a folder,
tag, date, estimate, and sequential mode. Compare the returned mapping with an
independent OmniFocus read and the UI, delete the project by stable ID, and
confirm it no longer exists.

### Release gates

- complete test suite and strict typecheck;
- production dependency audit;
- dry-run package includes the creation script and excludes test sources;
- installed CLI Skill exposes and documents the new command;
- English and Chinese release notes agree;
- GitHub and npm installed journeys are verified after publication.

## Subsequent Releases

- v1.20: repetition-rule readback in `get_task_by_id`, creation-time repetition,
  and mandatory read-back verification.
- v1.21: investigate official sync/save semantics, then add narrow synchronization
  and persistence workflows with clear consistency reporting.
- v1.22 candidate: promote existing tasks to projects or add project-template
  workflows, selected from v1.19 usage evidence rather than a generic template
  platform.
