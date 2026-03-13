# Implementation Plan: Real Name Display

**Branch**: `021-real-name-display` | **Date**: 2026-03-13 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/021-real-name-display/spec.md`

## Summary

Replace GitHub usernames with real names across the deployment tracker by adding a GitHub Users API lookup during PR data collection. Names are resolved at collection time, cached in a persistent JSON file, and stored alongside PR data. The frontend and Slack notifications display the resolved name with a fallback to the username.

## Technical Context

**Language/Version**: TypeScript 5.9 on Node.js 20 (backend/data pipeline); vanilla JavaScript ES modules (frontend)
**Primary Dependencies**: axios (HTTP), nock (test mocking), jest (testing) — no new dependencies
**Storage**: JSON files (`data/current.json`, `data/history.json`, `data/user-names.json` — new cache file)
**Testing**: jest + ts-jest (unit/integration), nock (HTTP mocking), Playwright (E2E)
**Target Platform**: GitHub Actions (scheduled every 5 minutes), static site served via GitHub Pages
**Project Type**: Web application (data pipeline + static frontend)
**Performance Goals**: Name resolution must not significantly increase the 5-minute pipeline run time
**Constraints**: Must stay within GitHub API rate limits (5000 req/hr with token auth); cache must minimize API calls
**Scale/Scope**: ~30-50 unique PR authors; pipeline runs every 5 minutes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality — strict TS, single responsibility, DRY | PASS | New `getUser()` method in existing API client; name resolution logic in pr-collector; cache in dedicated utility |
| I. Code Quality — minimal dependencies | PASS | No new dependencies needed |
| II. Pragmatic Testing — unit tests for services | PASS | Name resolution logic will have unit tests with nock mocking |
| II. Pragmatic Testing — E2E tests | PASS | E2E tests will verify real names appear in frontend views |
| III. UX Consistency — handle states | PASS | Fallback to username ensures no blank/error states |
| III. UX Consistency — page load time | PASS | No runtime API calls; names pre-resolved in data files |
| CI/CD Quality Gates | PASS | All gates apply; no new env vars needed (GH_TOKEN already available) |
| Development Workflow — GitHub Actions env vars | PASS | GH_TOKEN already configured in monitor.yml |

No violations. Gate passes.

## Project Structure

### Documentation (this feature)

```text
specs/021-real-name-display/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── api/
│   └── github.ts           # MODIFY: add getUser() method
├── services/
│   ├── pr-collector.ts      # MODIFY: resolve author names during collection
│   └── name-resolver.ts     # NEW: name cache read/write + resolution logic
├── types.ts                 # MODIFY: add authorName field to PullRequest
└── utils/
    └── pr-classifier.ts     # NO CHANGE (bot detection used as-is)

site/
└── js/
    └── components/
        └── pr-list.js       # MODIFY: display authorName with fallback

data/
└── user-names.json          # NEW: persistent name cache file

tests/
├── unit/
│   └── name-resolver.test.ts  # NEW: unit tests for name resolution
└── e2e/
    └── *.spec.ts              # MODIFY: verify real names in views
```

**Structure Decision**: Follows the existing web application layout. One new service module (`name-resolver.ts`) handles cache persistence and resolution orchestration. One new data file (`data/user-names.json`) stores the persistent name cache.

## Complexity Tracking

No constitution violations to justify.
