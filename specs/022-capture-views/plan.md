# Implementation Plan: Capture Views Tool

**Branch**: `022-capture-views` | **Date**: 2026-03-18 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/022-capture-views/spec.md`

## Summary

Build `npm run capture-views` — a TypeScript script that generates Markdown snapshots of all dashboard views and Slack messages. Dashboard views are captured via Playwright (DOM extraction), while Slack messages are captured by calling formatting functions directly with test data and converting Block Kit / mrkdwn to standard Markdown. All snapshots are saved to `docs/snapshots/` and committed to the repo for PR diffing.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 20+ (script); vanilla JavaScript ES modules (frontend)
**Primary Dependencies**: Playwright (existing dev dependency), existing E2E test infrastructure (`generateTestData`, `startServer`)
**Storage**: Markdown files in `docs/snapshots/`
**Testing**: Jest (unit tests for conversion logic), Playwright E2E (existing)
**Target Platform**: Node.js CLI tool (developer/CI use)
**Project Type**: CLI script (added to existing project)
**Performance Goals**: Full capture in under 60 seconds; single view in under 10 seconds
**Constraints**: Deterministic output (no timestamps/random content); reuse existing E2E fixtures
**Scale/Scope**: ~10-15 snapshot files (4 view types × cities + Slack messages)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| I. Code Quality — strict TS, single responsibility | PASS | New script follows existing patterns (screenshot.ts) |
| I. Code Quality — DRY | PASS | Reuses E2E infrastructure; Slack formatters called directly |
| I. Code Quality — minimal dependencies | PASS | No new dependencies — Playwright already installed |
| II. Pragmatic Testing — unit tests for services | PASS | Unit tests for mrkdwn→MD conversion; E2E freshness check |
| II. E2E tests | PASS | CI freshness check validates snapshot correctness |
| III. UX Consistency | N/A | Tool has no UI |
| CI/CD Quality Gates | PASS | Snapshot freshness check added as CI step |
| Dev Workflow — screenshot regen | PASS | This tool extends the screenshot pattern |
| Dev Workflow — workflow YAML | PASS | No new env vars needed |

No violations. Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/022-capture-views/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
scripts/
└── capture-views.ts          # Main capture script (new)

src/
├── api/
│   └── slack.ts              # Export buildSlackMessage (modify)
└── utils/
    └── slack-to-markdown.ts   # Block Kit / mrkdwn → Markdown converter (new)

tests/
└── unit/
    └── slack-to-markdown.test.ts  # Unit tests for converter (new)

docs/
└── snapshots/                # Output directory (new, committed)
    ├── overview.md
    ├── features.md
    ├── city-{id}.md
    ├── city-{id}-history.md
    ├── slack-deployment-{city}.md
    └── slack-change-announcement-{repo}.md
```

**Structure Decision**: Follows existing single-project structure. New script in `scripts/` alongside `screenshot.ts`. Conversion utility in `src/utils/`. Snapshots in `docs/snapshots/`.
