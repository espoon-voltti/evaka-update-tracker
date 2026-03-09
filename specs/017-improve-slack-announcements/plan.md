# Implementation Plan: Improve Slack Announcements

**Branch**: `017-improve-slack-announcements` | **Date**: 2026-03-09 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/017-improve-slack-announcements/spec.md`

## Summary

Improve Slack deployment notifications by: (1) combining wrapper and core changes into a single message per environment, (2) filtering out bot-authored PRs (dependabot/renovate), and (3) using Finnish Helsinki-timezone timestamps matching the web UI format ("pe 6.3. klo 09.28"). Changes are scoped to the notification layer — the change detector and data model remain unchanged.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 20+
**Primary Dependencies**: axios (HTTP), nock (test mocking)
**Storage**: JSON files (data/current.json, data/history.json) — no changes needed
**Testing**: Vitest (unit + integration), Playwright (E2E)
**Target Platform**: Node.js 20+ (GitHub Actions CI)
**Project Type**: Data pipeline + static site
**Performance Goals**: N/A (batch notification sending)
**Constraints**: No new dependencies. Node.js Intl API for timezone conversion.
**Scale/Scope**: ~10 environments, ~2-5 events per run max

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality — strict TS, single responsibility | PASS | Changes scoped to slack.ts and index.ts notification loop |
| I. Code Quality — DRY | PASS | Finnish datetime formatting will be extracted as shared utility (used by both frontend and backend) |
| I. Code Quality — no new dependencies | PASS | Using Node.js Intl API, no packages added |
| II. Pragmatic Testing — unit tests for services | PASS | Will update slack-api.test.ts with combined message assertions |
| II. Pragmatic Testing — integration tests with nock | PASS | Existing nock-based tests will be updated |
| II. Pragmatic Testing — E2E tests | N/A | No frontend changes |
| III. UX Consistency | N/A | No dashboard changes |
| CI/CD Quality Gates | PASS | All gates continue to apply |

No violations. No complexity tracking needed.

## Project Structure

### Documentation (this feature)

```text
specs/017-improve-slack-announcements/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── slack-notification.md
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── api/
│   └── slack.ts              # MODIFY: combined message builder, bot filtering, Helsinki timestamps
├── services/
│   └── change-detector.ts    # NO CHANGE: continues producing separate events
├── utils/
│   ├── pr-classifier.ts      # NO CHANGE: bot classification already exists
│   └── date-format.ts        # NEW: Finnish datetime formatting utility
├── config/
│   └── slack-routing.ts      # NO CHANGE
├── types.ts                  # NO CHANGE: DeploymentEvent type unchanged
└── index.ts                  # MODIFY: group events by environment before sending

tests/
├── integration/
│   └── slack-api.test.ts     # MODIFY: update assertions for combined messages, bot filtering, timestamps
└── unit/
    └── date-format.test.ts   # NEW: Finnish datetime formatting tests
```

**Structure Decision**: Existing single-project structure. Only modifying 2 source files (slack.ts, index.ts), adding 1 utility (date-format.ts), and updating 1 test file.
