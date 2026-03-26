# Implementation Plan: Increase Slack PR Limit with Overflow Link

**Branch**: `023-slack-pr-limit` | **Date**: 2026-03-26 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/023-slack-pr-limit/spec.md`

## Summary

Increase the per-section PR display limit in Slack deployment notifications from 10 to 50. When a section exceeds 50 PRs, append an overflow line with the count of remaining changes and a link to the environment's history page. The change is isolated to `src/api/slack.ts` (`buildChangesSection` function) with corresponding test updates.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 20+
**Primary Dependencies**: axios (HTTP), nock (test mocking)
**Storage**: N/A (no data changes)
**Testing**: Jest (unit/integration), existing test suite in `tests/integration/slack-api.test.ts`
**Target Platform**: GitHub Actions (Node.js runtime)
**Project Type**: Data pipeline / notification service
**Performance Goals**: N/A (no performance-sensitive changes)
**Constraints**: Slack Block Kit text block limit (~3000 chars). 50 short PR lines should fit.
**Scale/Scope**: Single function change + tests

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| Code Quality (§I) | PASS | Single responsibility maintained; no new dependencies |
| Pragmatic Testing (§II) | PASS | Existing integration tests will be updated to cover new limit and overflow |
| UX Consistency (§III) | N/A | No frontend changes |
| CI/CD Quality Gates (§CI/CD) | PASS | All gates already apply; no new gates needed |
| Development Workflow | PASS | Slack message is a user-facing view; before/after mockups required in PR |

**View Mockup Capture**: This feature affects Slack messages (user-facing output). "Before" mockups MUST be captured before implementation begins. Since this is a Slack message (not a web view), mockups will be written manually showing the current vs. proposed message structure in `specs/023-slack-pr-limit/mockups-before.md`.

## Project Structure

### Documentation (this feature)

```text
specs/023-slack-pr-limit/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output
├── quickstart.md        # Phase 1 output
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code (repository root)

```text
src/
└── api/
    └── slack.ts         # buildChangesSection() — primary change location

tests/
└── integration/
    └── slack-api.test.ts  # Slack message building tests
```

**Structure Decision**: This is a minimal change to one existing file (`src/api/slack.ts`). No new files, modules, or structural changes needed. The `buildChangesSection` function signature will be extended to accept the `dashboardBaseUrl` and `cityGroupId` needed to construct the overflow link.
