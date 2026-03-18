# Implementation Plan: Slack Staging Details

**Branch**: `023-slack-staging-details` | **Date**: 2026-03-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/023-slack-staging-details/spec.md`

## Summary

Enhance Slack notifications for staging/testing environment deployments to include (1) a count of how many additional changes exist compared to the production environment, and (2) more descriptive, city-name-aware link text for the update tracker dashboard. The implementation modifies `src/api/slack.ts` to accept optional staging context and adjusts the call site in `src/index.ts` to pass the `inStaging` PR count when sending staging notifications.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 20+
**Primary Dependencies**: axios (HTTP), nock (test mocking)
**Storage**: JSON files (`data/current.json`, `data/history.json`) — no changes needed
**Testing**: Jest with nock for HTTP mocking
**Target Platform**: Node.js CLI (runs in GitHub Actions)
**Project Type**: Data pipeline / CLI tool
**Performance Goals**: N/A (batch pipeline, not latency-sensitive)
**Constraints**: Finnish language for all user-facing Slack text
**Scale/Scope**: ~4 city groups, each with optional staging environments

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| Single responsibility per module | PASS | Changes confined to slack.ts (formatting) and index.ts (data passing) |
| No `any` types | PASS | New parameter uses typed interface |
| Error handling explicit | PASS | Graceful omission when data unavailable (FR-005) |
| DRY | PASS | Finnish text constants added alongside existing ones |
| Unit tests for services | PASS | Existing slack-api.test.ts extended with new scenarios |
| Integration tests for APIs | PASS | Nock-based Slack API tests updated |
| E2E tests | N/A | No frontend changes in this feature |
| Lint + type gate | PASS | No new patterns that would violate lint rules |
| Dependencies minimal | PASS | No new dependencies |
| Workflow YAML updates | N/A | No new environment variables or secrets |

## Project Structure

### Documentation (this feature)

```text
specs/023-slack-staging-details/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── api/
│   └── slack.ts              # Modified: new optional parameter, updated message building
├── services/
│   └── (no changes)
└── index.ts                  # Modified: pass staging context to sendSlackNotification

tests/
└── integration/
    └── slack-api.test.ts     # Modified: new test cases for staging context
```

**Structure Decision**: No new files needed. Changes are confined to existing `src/api/slack.ts` (message formatting), `src/index.ts` (call site), and `tests/integration/slack-api.test.ts` (test coverage). A new optional interface for staging context is added to `src/types.ts`.
