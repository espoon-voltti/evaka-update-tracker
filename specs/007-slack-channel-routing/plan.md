# Implementation Plan: Per-City Slack Channel Routing

**Branch**: `007-slack-channel-routing` | **Date**: 2026-03-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/007-slack-channel-routing/spec.md`

## Summary

Route Slack deployment notifications to per-city-group channels using per-city webhook URLs configured via environment variables, with the existing `SLACK_WEBHOOK_URL` serving as the fallback default. Each city group (Espoo, Tampere region, Oulu, Turku) can have its own Slack Incoming Webhook pointing to a dedicated channel. The approach uses multiple Slack webhooks (one per channel) rather than a single bot token with channel routing, since Slack Incoming Webhooks are inherently channel-bound and this avoids adding OAuth/bot token complexity.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 20+
**Primary Dependencies**: axios (HTTP), dotenv (env loading), nock (test HTTP mocking)
**Storage**: JSON files (`data/current.json`, `data/history.json`, `data/previous.json`) — no changes needed
**Testing**: Jest (unit + integration), nock (HTTP mocking)
**Target Platform**: GitHub Actions (Linux runner), also local via `npx tsx`
**Project Type**: Scheduled data fetcher + static site (CLI/cron job)
**Performance Goals**: N/A — runs every 5 minutes, sends at most a handful of notifications per run
**Constraints**: No new dependencies; environment-variable-based configuration; backward compatible with existing single-webhook setup
**Scale/Scope**: 4 city groups, at most ~8 notifications per run (4 cities × 2 repo types)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality — Strict TS | PASS | All new code in TypeScript strict mode |
| I. Code Quality — Single responsibility | PASS | New `slack-routing` module has one job: resolve webhook URL for a city group |
| I. Code Quality — Explicit errors | PASS | Logs clear message when per-city webhook is missing, falls back to default |
| I. Code Quality — Lint/format | PASS | Existing ESLint + Prettier config applies |
| I. Code Quality — Minimal deps | PASS | No new dependencies |
| I. Code Quality — DRY | PASS | Routing logic centralized in one module; no duplicated URL resolution |
| II. Testing — Service tests | PASS | Unit tests for routing resolver; updated integration tests for Slack API |
| II. Testing — API integration tests | PASS | Existing nock-based Slack tests extended for per-city routing |
| III. UX Consistency | N/A | No frontend changes |
| CI/CD Gates | PASS | All gates already in place; no changes needed |

**Post-Phase 1 re-check**: PASS — no violations introduced by design.

## Project Structure

### Documentation (this feature)

```text
specs/007-slack-channel-routing/
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
│   └── slack.ts              # Existing — no signature changes needed
├── config/
│   ├── instances.ts          # Existing — unchanged
│   ├── staging.ts            # Existing — unchanged
│   └── slack-routing.ts      # NEW — resolves webhook URL per city group
├── services/
│   └── change-detector.ts    # Existing — unchanged
├── utils/
│   └── retry.ts              # Existing — unchanged
├── types.ts                  # Existing — unchanged
└── index.ts                  # Modified — use routing to resolve webhook per event

tests/
├── unit/
│   └── slack-routing.test.ts # NEW — unit tests for webhook URL resolution
└── integration/
    └── slack-api.test.ts     # Modified — add per-city routing test cases

.env.example                  # Modified — add per-city webhook URL placeholders
.github/workflows/monitor.yml # Modified — add per-city webhook secrets
```

**Structure Decision**: Follows existing single-project layout. New routing module goes in `src/config/` alongside other configuration modules (`instances.ts`, `staging.ts`). This is a natural home since it resolves configuration (which webhook URL to use) rather than performing an action.

## Complexity Tracking

> No constitution violations to justify.
