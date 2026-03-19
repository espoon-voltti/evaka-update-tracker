# Implementation Plan: Slack Staging Details

**Branch**: `023-slack-staging-details` | **Date**: 2026-03-18 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/023-slack-staging-details/spec.md`

## Summary

Enhance Slack notifications for staging/testing deployments to show a production comparison count (how many PRs are in staging but not production) and use descriptive, city-name-aware link text for the dashboard URL. Production notifications remain unchanged.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 20+
**Primary Dependencies**: axios (HTTP), nock (test HTTP mocking) — no new dependencies
**Storage**: JSON files (`data/current.json`, `data/history.json`) — no changes needed
**Testing**: Jest with nock for integration tests (`tests/integration/slack-api.test.ts`)
**Target Platform**: GitHub Actions (Linux runner)
**Project Type**: Data pipeline + static site generator
**Performance Goals**: N/A — Slack API calls are already async with retry
**Constraints**: Finnish language for all user-facing text; must not alter production notification format
**Scale/Scope**: ~4 files modified, ~100 lines added

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality — strict TS, single responsibility | ✅ Pass | New `StagingContext` type is a clean, focused interface. `buildSlackMessage` already handles staging vs production branching; adding one more conditional block is within its responsibility. |
| I. Code Quality — DRY | ✅ Pass | Finnish text patterns are used once in `buildSlackMessage`. No duplication introduced. |
| I. Code Quality — minimal dependencies | ✅ Pass | No new dependencies. |
| II. Pragmatic Testing — API integration tests | ✅ Pass | New tests added to existing `tests/integration/slack-api.test.ts` using nock. |
| II. Pragmatic Testing — E2E tests | ✅ N/A | This feature affects Slack messages (not web dashboard), so E2E tests are not applicable. |
| III. UX Consistency | ✅ N/A | No web UI changes. |
| CI/CD Gates — lint, type, test, build | ✅ Pass | All gates will be verified in the polish phase. |
| Development Workflow — env vars in workflow YAML | ✅ Pass | No new env vars or secrets introduced. |
| Development Workflow — PR mockups | ✅ Required | This feature modifies Slack message output — PR must include before/after mockups of the staging notification. |

**View Mockup Capture**: This feature affects Slack messages. Before/after mockups of the staging notification MUST be included in the PR description. Capture "before" mockup before implementation begins.

**Before mockup (staging notification — current)**:
```
🧪 Espoo — Staging / testaus päivitetty
─────────────────────────────────────────
Versio:           Havaittu:
`abc1234`         pe 14.3. klo 09.28

Muutokset (ydin):
• #5678 [Korjaus] Fix login redirect — Developer Two
• #5679 Add new feature — Developer Three

Ympäristöjen tiedot
```

**After mockup (staging notification — proposed)**:
```
🧪 Espoo — Staging / testaus päivitetty
─────────────────────────────────────────
Versio:           Havaittu:
`abc1234`         pe 14.3. klo 09.28

Muutokset (ydin):
• #5678 [Korjaus] Fix login redirect — Developer Two
• #5679 Add new feature — Developer Three

+5 muutosta verrattuna tuotantoon · Katso Espoo ympäristöjen tilanne
```

## Project Structure

### Documentation (this feature)

```text
specs/023-slack-staging-details/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output — research decisions
├── data-model.md        # Phase 1 output — StagingContext type
├── quickstart.md        # Phase 1 output — implementation guide
└── tasks.md             # Phase 2 output — task breakdown
```

### Source Code (repository root)

```text
src/
├── types.ts             # Add StagingContext interface
├── api/
│   └── slack.ts         # Modify buildSlackMessage() and sendSlackNotification()
└── index.ts             # Compute StagingContext at notification call site

tests/
└── integration/
    └── slack-api.test.ts  # Add staging context test scenarios
```

**Structure Decision**: All changes fit within the existing project structure. No new files or directories needed — only modifications to 4 existing files.

## Complexity Tracking

No constitution violations. All changes are minimal and follow existing patterns.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| *None* | — | — |
