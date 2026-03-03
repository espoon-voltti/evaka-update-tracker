# Implementation Plan: eVaka Deployment Tracker

**Branch**: `001-deployment-tracker` | **Date**: 2026-03-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-deployment-tracker/spec.md`

## Summary

A GitHub Pages dashboard that tracks which PRs are deployed across 12 eVaka instances in 4 city groups (Espoo, Tampere region, Oulu, Turku). A scheduled GitHub Action (every 5 minutes) fetches deployed versions from each instance's `/api/citizen/auth/status` endpoint, resolves commit and PR metadata via the GitHub API (including submodule resolution for wrapper repos), detects version changes, sends Slack notifications, and generates static JSON data files. A zero-dependency vanilla JS frontend renders the dashboard with city tabs, PR lists (separated by wrapper/core tracks), deployment history, and deep-bookmarkable hash-based URLs.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 20+ (data fetcher); vanilla JavaScript ES modules (frontend)
**Primary Dependencies**: axios (HTTP client), @octokit/rest or direct fetch (GitHub API) — minimal dependency set
**Storage**: JSON files committed to repository (`data/current.json`, `data/history.json`, `data/previous.json`)
**Testing**: Jest with ts-jest, nock for HTTP mocking
**Target Platform**: GitHub Actions (data fetcher); GitHub Pages (frontend, any modern browser)
**Project Type**: Scheduled data pipeline + static web dashboard
**Performance Goals**: Data refresh within 5-minute cycle; dashboard page load under 2 seconds
**Constraints**: GitHub API rate limit ~5,000 req/hr with PAT; ETag caching to minimize consumption; 250-commit limit on Compare API (sufficient for typical deployment intervals)
**Scale/Scope**: 12 instances, 4 city groups, 5 repositories, ~50 PRs tracked at any time

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
| --- | --- | --- |
| I. Code Quality | PASS | TypeScript strict mode planned; ESLint + Prettier in setup; minimal dependencies (axios + nock only); single-responsibility modules |
| II. Pragmatic Testing | PASS | Jest + nock for services and API integrations; test gate in CI workflow; frontend components exempt (no complex logic) |
| III. UX Consistency | PASS | Three-state handling in all components; consistent status badges; hash-based deep-bookmarking; semantic HTML; <2s page load target |
| CI/CD Quality Gates | PASS | Lint, type, test, and build gates planned for monitor.yml workflow |

No violations. No complexity tracking entries required.

## Project Structure

### Documentation (this feature)

```text
specs/001-deployment-tracker/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0: technology research
├── data-model.md        # Phase 1: entity definitions
├── quickstart.md        # Phase 1: development quickstart
├── contracts/           # Phase 1: interface contracts
│   ├── data-files.md    # JSON data file schemas
│   ├── slack-notification.md  # Slack message format
│   └── url-routing.md   # Frontend URL scheme
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
src/                              # Data fetcher (TypeScript, runs in GH Action)
├── config/
│   └── instances.ts              # City groups, repos, environments, instance definitions
├── api/
│   ├── github.ts                 # GitHub REST API client (commits, PRs, submodules, compare)
│   ├── status.ts                 # Instance version fetcher (GET /api/citizen/auth/status)
│   └── slack.ts                  # Slack incoming webhook client
├── services/
│   ├── version-resolver.ts       # Resolve deployed version + submodule for each instance
│   ├── pr-collector.ts           # Collect PRs between two commits via Compare API
│   ├── change-detector.ts        # Compare current vs previous state, emit deployment events
│   ├── history-manager.ts        # Read/write/prune history.json (1-month retention)
│   └── site-deployer.ts          # Copy site/ + data/ into dist/ for Pages deployment
├── utils/
│   ├── retry.ts                  # Retry with exponential backoff
│   └── pr-classifier.ts          # Classify PRs as human vs bot (message patterns + author)
├── types.ts                      # Shared TypeScript interfaces
└── index.ts                      # Entry point: orchestrates full pipeline

site/                             # Static frontend (vanilla JS, zero dependencies)
├── index.html                    # Single-page app shell
├── css/
│   └── style.css                 # Dashboard styles
└── js/
    ├── app.js                    # Initialization, data loading, render orchestration
    ├── router.js                 # Hash-based routing with query param support
    └── components/
        ├── city-tabs.js          # City group tab navigation
        ├── overview.js           # Overview page (all cities summary)
        ├── city-detail.js        # Single city detail view (PR tracks, environment status)
        ├── pr-list.js            # PR listing component (with bot filter toggle)
        ├── status-badge.js       # Environment status indicators
        └── history-view.js       # Deployment history timeline

data/                             # Persisted state (committed by GH Action, served by Pages)
├── current.json                  # Full current deployment snapshot
├── history.json                  # Deployment events (1-month rolling window)
└── previous.json                 # Previous run's SHAs for change detection

tests/
├── unit/                         # Unit tests for services and utilities
│   ├── pr-collector.test.ts
│   ├── pr-classifier.test.ts
│   ├── change-detector.test.ts
│   ├── history-manager.test.ts
│   └── version-resolver.test.ts
├── integration/                  # Tests with mocked HTTP (nock)
│   ├── github-api.test.ts
│   ├── status-api.test.ts
│   └── slack-api.test.ts
└── fixtures/                     # Test data

.github/
└── workflows/
    └── monitor.yml               # Scheduled workflow (cron: */5 * * * *)

.env.example                      # Environment variable template
tsconfig.json
jest.config.ts
package.json
```

**Structure Decision**: Flat single-project layout with `src/` for the TypeScript data fetcher and `site/` for the static frontend. No framework build step for the frontend — vanilla JS with ES modules served directly. The `data/` directory at the root serves as the contract boundary between the two: the fetcher writes JSON, the frontend reads it.

## Complexity Tracking

No constitution violations to justify. The architecture is deliberately simple: a scheduled script that writes JSON files, and a static HTML page that reads them. No databases, no server-side rendering, no framework dependencies on the frontend.
