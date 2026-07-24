# Maintenance Releases Design

## Goal

Resolve the repository's open security and correctness issues before adding new query tools. Ship the work in two releases so existing npm users receive urgent fixes without waiting for larger feature work.

## Release 1.6.11

The patch release contains:

- Verified fixes for the private security advisory, without publishing exploit details before a patched package is available.
- Correct local-calendar handling for Forecast dates in UTC-offset time zones and across daylight-saving transitions.
- Correct forwarding of all documented Forecast options.
- The `addedDate` feature from PR #35 after its tests are made deterministic and executable through the standard test command.
- A real automated test command and GitHub Actions checks for build and unit tests.
- The dump reliability fixes already present on `main` but absent from npm 1.6.10.

Release acceptance requires a clean install, build, automated tests, package dry run, and a focused OmniFocus smoke test. After npm and GitHub releases are verified, the related issues and private advisory can be updated or closed.

## Release 1.7.0

The feature release contains:

- A lightweight `list_tags` tool returning tag IDs, names, parent IDs, and active state without loading task data. Inactive tags are included by default because they remain useful assignment targets.
- Project review tools only if PR #31 is revised to provide an accurate Omni Automation contract, bounded output, explicit partial-failure reporting, shared serialization, and automated tests. Otherwise the PR will be closed with actionable feedback and the feature will be reimplemented separately.
- Issue #27 remains conditional on adding a network transport. API-key authentication is not added to the current local stdio transport.

Release acceptance uses the same clean build, test, package, and OmniFocus smoke-test gates as 1.6.11.

## Compatibility And Safety

- Keep stdio as the only transport and do not introduce authentication without a remote-transport design.
- Prefer argument-based process execution over shell command construction.
- Treat linked attachment access as an explicit local-file capability with a defined policy and clear errors.
- Keep calendar dates as calendar values instead of round-tripping them through UTC timestamps.
- Preserve contributor attribution when incorporating an existing pull request.

## GitHub Workflow

- Use private vulnerability reporting for sensitive findings and remediation details until a fixed package is public.
- Request changes on pull requests that do not satisfy the release contract; do not merge solely because GitHub reports them as mergeable.
- Close issues only after the corresponding behavior is verified in the published npm package.
- Publish matching npm and GitHub versions with concise release notes and verify installation through `npx`.
