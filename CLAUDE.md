# evaka-update-tracker Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-03-02

## Active Technologies
- TypeScript 5.x on Node.js 20+ + axios, dotenv (existing) (002-remove-staging-urls)
- JSON data files (existing, no change) (002-remove-staging-urls)
- TypeScript 5.x on Node.js 20+ (backend); vanilla JavaScript ES modules (frontend) + axios (HTTP), nock (test HTTP mocking), Playwright (E2E browser tests — new) (003-production-pr-list)
- JSON files (`data/current.json`, `data/history.json`) (003-production-pr-list)

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
- 003-production-pr-list: Added TypeScript 5.x on Node.js 20+ (backend); vanilla JavaScript ES modules (frontend) + axios (HTTP), nock (test HTTP mocking), Playwright (E2E browser tests — new)
- 002-remove-staging-urls: Added TypeScript 5.x on Node.js 20+ + axios, dotenv (existing)

- 001-deployment-tracker: Added TypeScript 5.x on Node.js 20+ (data fetcher); vanilla JavaScript ES modules (frontend) + axios (HTTP client), @octokit/rest or direct fetch (GitHub API) — minimal dependency se

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
