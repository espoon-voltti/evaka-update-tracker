# evaka-update-tracker Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-03-02

## Active Technologies
- TypeScript 5.x on Node.js 20+ + axios, dotenv (existing) (002-remove-staging-urls)
- JSON data files (existing, no change) (002-remove-staging-urls)
- TypeScript 5.x on Node.js 20+ (backend); vanilla JavaScript ES modules (frontend) + axios (HTTP), nock (test HTTP mocking), Playwright (E2E browser tests — new) (003-production-pr-list)
- JSON files (`data/current.json`, `data/history.json`) (003-production-pr-list)
- TypeScript 5.x on Node.js 20+ + axios (HTTP), existing GitHub API client (`src/api/github.ts`), existing PR collector (`src/services/pr-collector.ts`) (004-populate-history-data)
- JSON files (`data/history.json`) (004-populate-history-data)
- Vanilla JavaScript ES modules (frontend) + None (no framework, pure DOM) (005-redesign-deployment-view)
- JSON data files (`data/current.json`, `data/history.json`) — read-only from frontend (005-redesign-deployment-view)
- Vanilla JavaScript ES modules (frontend); TypeScript 5.x on Node.js 20+ (backend/scripts) + Playwright (existing dev dependency, for screenshot script) (006-finnish-translation)
- JSON data files (read-only from frontend) — no changes needed (006-finnish-translation)
- TypeScript 5.x on Node.js 20+ + axios (HTTP), dotenv (env loading), nock (test HTTP mocking) (007-slack-channel-routing)
- JSON files (`data/current.json`, `data/history.json`, `data/previous.json`) — no changes needed (007-slack-channel-routing)
- GitHub Actions YAML; TypeScript 5.x on Node.js 20 (existing) + GitHub Actions (`actions/checkout@v4`, `actions/setup-node@v4`); Playwright (existing dev dependency) (008-ci-cd-pipeline)
- TypeScript 5.x on Node.js 20+ (data pipeline & scripts); vanilla JavaScript ES modules (frontend) + axios (HTTP), nock (test mocking), Playwright (E2E) (009-streamline-city-view)
- Vanilla JavaScript ES modules (frontend); TypeScript 5.x on Node.js 20+ (E2E tests) + Playwright (E2E tests) — no new dependencies needed (010-improve-history-view)
- JSON files (`data/history.json`) — read-only from frontend, no changes to data forma (010-improve-history-view)
- TypeScript 5.x on Node.js 20+ (data pipeline); vanilla JavaScript ES modules (frontend) + axios (HTTP), existing GitHub API client (`src/api/github.ts`) — no new dependencies (012-feature-flag-tracker)
- JSON file (`data/feature-flags.json`) — new file alongside existing `data/current.json` (012-feature-flag-tracker)
- TypeScript 5.x on Node.js 20+ + dotenv (env loading) — no new dependencies (013-dev-data-isolation)
- JSON files (`current.json`, `history.json`, `previous.json`, `feature-flags.json`) (013-dev-data-isolation)
- Vanilla JavaScript ES modules (frontend) + None (pure DOM, no framework) (014-show-empty-sections)
- JSON data files (read-only from frontend) -- no changes needed (014-show-empty-sections)
- Vanilla JavaScript ES modules (frontend); TypeScript 5.x on Node.js 20+ (build scripts, E2E tests) + None (pure DOM, no framework) -- no new dependencies added (015-auto-refresh)
- JSON data files (`data/current.json`, `data/history.json`, `data/feature-flags.json`) -- read-only from frontend, no changes to data forma (015-auto-refresh)
- Vanilla JavaScript ES modules (frontend); TypeScript 5.x on Node.js 20+ (E2E tests) + None new — existing Playwright for E2E tests (014-overview-fullscreen)
- JSON files (`data/current.json`) — read-only, no changes (014-overview-fullscreen)
- TypeScript 5.x on Node.js 20+ + axios (HTTP), nock (test mocking) (017-improve-slack-announcements)
- JSON files (data/current.json, data/history.json) — no changes needed (017-improve-slack-announcements)
- JSON file (`data/repo-heads.json`) (018-slack-change-announcements)

- TypeScript 5.x on Node.js 20+ (data fetcher); vanilla JavaScript ES modules (frontend) + axios (HTTP client), @octokit/rest or direct fetch (GitHub API) — minimal dependency se (001-deployment-tracker)

## Project Structure

```text
backend/
frontend/
tests/
```

## Commands

npm test && npm run lint

## Code Style

TypeScript 5.x on Node.js 20+ (data fetcher); vanilla JavaScript ES modules (frontend): Follow standard conventions

## Recent Changes
- 018-slack-change-announcements: Added TypeScript 5.x on Node.js 20+ + axios (HTTP), nock (test mocking)
- 017-improve-slack-announcements: Added TypeScript 5.x on Node.js 20+ + axios (HTTP), nock (test mocking)
- 015-auto-refresh: Added Vanilla JavaScript ES modules (frontend); TypeScript 5.x on Node.js 20+ (build scripts, E2E tests) + None (pure DOM, no framework) -- no new dependencies added


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
