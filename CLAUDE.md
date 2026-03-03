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
- 007-slack-channel-routing: Added TypeScript 5.x on Node.js 20+ + axios (HTTP), dotenv (env loading), nock (test HTTP mocking)
- 006-finnish-translation: Added Vanilla JavaScript ES modules (frontend); TypeScript 5.x on Node.js 20+ (backend/scripts) + Playwright (existing dev dependency, for screenshot script)
- 005-redesign-deployment-view: Added Vanilla JavaScript ES modules (frontend) + None (no framework, pure DOM)


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
