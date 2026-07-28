# Project Outline Creation Implementation Plan

Date: 2026-07-28
Target release: v1.19.0
Design: `docs/plans/2026-07-28-project-outline-creation-design.md`

## Task 1: Define the recursive public contract

Files:

- Add: `src/tools/definitions/createProjectFromOutline.ts`
- Add: `src/tools/definitions/createProjectFromOutline.test.ts`

Steps:

1. Define strict shared core fields for projects and tasks: name, note, tag IDs,
   dates, flag, estimate, and sequential mode.
2. Define a recursive task schema with `children` and a project schema with
   `folderId` and `tasks`.
3. Keep date values as ISO strings at the protocol boundary.
4. Enforce non-empty names, finite non-negative estimates, no unknown fields,
   at most 200 task nodes, and at most eight task levels.
5. Keep repetition, notifications, review metadata, status, placement, preview,
   atomicity, and verification switches out of the schema.
6. Add boundary tests for one valid tree, an empty name, unknown properties,
   201 nodes, nine levels, invalid dates, and invalid estimates.

## Task 2: Build a path-aware execution plan

Files:

- Add: `src/tools/primitives/createProjectFromOutline.ts`
- Add: `src/tools/primitives/createProjectFromOutline.test.ts`

Steps:

1. Define explicit input, flattened plan-node, successful item, error-code, and
   result types.
2. Convert the nested project into a deterministic depth-first plan without
   mutating the input.
3. Assign every node a readable escaped path and an internal parent plan index.
4. Deduplicate folder/tag lookup work while retaining each node's expected tag
   IDs.
5. Recheck node and depth bounds in the primitive so callers cannot bypass the
   public schema.
6. Return `INVALID_OUTLINE` with a precise path for malformed internal input.
7. Add tests for flattening order, parent links, duplicate tag references,
   path-specific errors, and schema-bypass boundaries.

## Task 3: Implement complete OmniFocus reference preflight

Files:

- Add: `src/utils/omnifocusScripts/createProjectFromOutline.js`
- Modify: `scripts/copy-files.mjs`
- Modify: `src/tools/primitives/createProjectFromOutline.test.ts`

Steps:

1. Resolve the optional folder by stable ID before creation.
2. Resolve every distinct tag by stable ID before creation and reject inactive,
   unavailable, or missing references according to OmniFocus semantics.
3. Validate date conversion and writable properties before the first object is
   created.
4. Build all resolved references into an in-memory plan.
5. Return `REFERENCE_NOT_FOUND` with the ID and every affected outline path.
6. Add VM-backed tests proving a missing folder or tag produces zero writes and
   proving repeated tag IDs are resolved once.
7. Add the script to the explicit copy list so test and production builds use
   the same source.

## Task 4: Create the complete project tree in one request

Files:

- Modify: `src/utils/omnifocusScripts/createProjectFromOutline.js`
- Modify: `src/tools/primitives/createProjectFromOutline.test.ts`

Steps:

1. Create the project at the database root or resolved folder only after full
   preflight.
2. Apply project core fields and tags.
3. Create tasks depth-first at the end of their resolved parent container.
4. Apply every supported task field and tag without name-based lookup or
   implicit tag creation.
5. Record each created stable ID, type, path, and expected parent ID.
6. Catch any write exception and enter the bounded rollback path.
7. Add fixtures for root/folder placement, empty task lists, three-level trees,
   sequential and parallel nodes, dates, tags, estimates, and a deterministic
   mid-tree exception.

## Task 5: Add bounded rollback with explicit recovery state

Files:

- Modify: `src/utils/omnifocusScripts/createProjectFromOutline.js`
- Modify: `src/tools/primitives/createProjectFromOutline.test.ts`

Steps:

1. Capture enough pre-creation Undo state to distinguish whether this request
   added an undoable transaction.
2. On execution or verification failure, call OmniFocus Undo only while the
   created project still exists and only within the request's bounded attempt
   count.
3. Stop immediately once the project is absent; never consume unrelated Undo
   history.
4. Return `CREATE_FAILED_ROLLED_BACK` or
   `VERIFICATION_FAILED_ROLLED_BACK` only after project absence is verified.
5. Return `ROLLBACK_UNCONFIRMED`, the residual project ID, and recovery guidance
   when cleanup cannot be proved.
6. Add tests for successful rollback, unavailable Undo, throwing Undo,
   insufficient Undo, and protection of a simulated unrelated older Undo entry.

## Task 6: Read back and verify every observable field

Files:

- Modify: `src/utils/omnifocusScripts/createProjectFromOutline.js`
- Modify: `src/tools/primitives/createProjectFromOutline.ts`
- Modify: `src/tools/primitives/createProjectFromOutline.test.ts`

Steps:

1. Re-resolve the project and tasks by the stable IDs returned by creation.
2. Verify project folder, exact node count, and direct parent relationships.
3. Verify names, notes, dates, flags, estimates, sequential mode, and tag ID
   sets using normalized OmniFocus values.
4. Treat missing, extra, or moved nodes and any supported-field mismatch as a
   verification failure.
5. Roll back on the first verification phase failure while retaining a concise
   list of all discovered mismatches.
6. Normalize the successful result into a flat `items` array with `id`, `type`,
   `path`, `parentId`, and `verified`.
7. Add fault-injection tests for parent, folder, tag, name, date, estimate, and
   node-count mismatches.

## Task 7: Expose and register the MCP tool

Files:

- Modify: `src/tools/definitions/createProjectFromOutline.ts`
- Modify: `src/tools/registerTools.ts`
- Modify: `src/tools/registerTools.test.ts`

Steps:

1. Call the primitive from the definition handler and render success with the
   project ID plus a compact path-to-ID list.
2. Render structured error codes, affected paths, residual project ID, and
   recovery guidance without exposing script internals.
3. Import and register `create_project_from_outline` with `ADDITIVE_TOOL`
   annotations.
4. Describe it as creating one user-confirmed project outline with mandatory
   preflight and verification.
5. Add registration tests for the name, annotations, schema, and handler error
   mapping.
6. Confirm the public tool count increases by exactly one.

## Task 8: Add the project-shaping Prompt

Files:

- Modify: `src/context/prompts.ts`
- Modify: `src/context/prompts.test.ts`

Steps:

1. Register a fifth Prompt, `project_shaping`, with an optional text context
   argument only if it fits existing MCP client behavior; otherwise instruct
   the client to use the active conversation text.
2. Encode extract, clarify only when blocked, propose a readable tree, expose
   inferred metadata, resolve stable folder/tag IDs, and request one explicit
   confirmation.
3. Forbid calling the action tool before confirmation and forbid forwarding raw
   untrusted text as tool arguments.
4. Require one `create_project_from_outline` call after confirmation and a
   verified ID/path report afterward.
5. Add tests for confirmation wording, stable-ID resolution, inference
   disclosure, raw-text separation, tool name, and recovery reporting.

## Task 9: Update the generated CLI Skill

Files:

- Modify: `skills/omnifocus-cli/SKILL.md`
- Modify: `skills/omnifocus-cli/install.sh`
- Modify: relevant installer tests if present

Steps:

1. Document the text-to-project workflow and strict confirmation boundary.
2. Add a CLI example using nested JSON without embedding personal data.
3. Require `list-folders` and `list-tags` stable-ID resolution before creation
   when references are used.
4. Explain the 200-node/eight-level bounds and error recovery contract.
5. Ensure the generated CLI exposes `create-project-from-outline` and the
   recursive schema renders usable help/input behavior.
6. Extend installer verification to assert the command is present.

## Task 10: Synchronize bilingual product documentation

Files:

- Modify: `README.md`
- Modify: `README.zh.md`

Steps:

1. Add a text-to-project user journey with propose, confirm, create, verify, and
   recover stages.
2. Document the stable folder/tag ID requirement and supported fields.
3. Document bounds and the fact that raw natural language is processed by the
   assistant, not the action tool.
4. Add `create_project_from_outline` to the complete tool reference and update
   tool/Prompt counts.
5. Keep English and Chinese examples and safety claims semantically identical.

## Task 11: Run deterministic and live acceptance

Steps:

1. Run strict typecheck and the complete test suite.
2. Run focused VM tests that prove zero writes on preflight failure, project
   absence after rollback, and explicit residual IDs when rollback is
   unconfirmed.
3. Through a real MCP client, create one disposable three-level project with a
   folder, tag, date, estimate, and sequential mode.
4. Independently read the project/task hierarchy and compare it with every
   returned ID and path; inspect the OmniFocus UI.
5. Delete the disposable project using its stable ID and confirm it is absent.
6. Run the installed Skill workflow and verify the new command and confirmation
   language.

## Task 12: Release v1.19.0

Files:

- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `README.md`
- Modify: `README.zh.md`

Steps:

1. Update package and lockfile versions to 1.19.0.
2. Add synchronized English and Chinese release notes.
3. Run the complete tests, production dependency audit, and package dry run.
4. Confirm the package includes `createProjectFromOutline.js`, excludes test
   files, and contains no obsolete sources.
5. Install the release candidate Skill and repeat the command/help checks.
6. Commit and push the release, create and push `v1.19.0`, and publish the
   GitHub Release with deterministic and live verification evidence.
7. Publish to npm with the authorized account and verify `@latest`, package
   provenance/metadata, and a fresh installed Skill journey.
