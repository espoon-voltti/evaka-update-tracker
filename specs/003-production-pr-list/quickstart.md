# Quickstart: Production PR List

## Prerequisites

- Node.js 20+
- npm

## Setup

```bash
git checkout 003-production-pr-list
npm install
npx playwright install chromium
```

## Development

### Frontend changes only (no backend)

Edit files in `site/js/components/`. To preview, serve the site locally:

```bash
npx http-server site -p 8080
```

Then open `http://localhost:8080`. Note: you need `data/current.json` with populated `deployed` arrays to see production PRs. The live data may have empty arrays if no production deployment has been observed yet.

### Running existing tests

```bash
npm test          # Jest unit + integration tests
npm run lint      # ESLint
```

### Running E2E tests

```bash
npm run test:e2e  # Generates mock data, serves site, runs Playwright
```

## Key files to modify

| File | Change |
|------|--------|
| `site/js/components/city-detail.js` | Relabel "Deployed" → "In Production", add section wrapper |
| `site/js/components/overview.js` | Relabel PR headers |
| `site/css/style.css` | Add `.production-section` styling |

## Key files to create

| File | Purpose |
|------|---------|
| `playwright.config.ts` | Playwright configuration |
| `tests/e2e/fixtures/mock-api-responses.ts` | Realistic GitHub API mock data |
| `tests/e2e/helpers/generate-test-data.ts` | Runs backend with mocked APIs |
| `tests/e2e/helpers/server.ts` | HTTP server for test site |
| `tests/e2e/production-prs.spec.ts` | E2E test for production PR display |
| `tests/e2e/overview.spec.ts` | E2E test for overview page |
