# Quickstart: Populate History Data & Fix History Display

## Prerequisites

- Node.js 20+
- `GH_TOKEN` environment variable set (GitHub personal access token)
- `npm install` completed

## Running the Backfill

```bash
# Set GitHub token
export GH_TOKEN=your_github_token

# Run the backfill script
npx tsx src/scripts/backfill-history.ts

# Verify output
cat data/history.json | jq '.events | length'
cat data/history.json | jq '.events[] | select(.includedPRs | length > 0) | .id' | head -5
```

## Running the Live Tracker (with bug fix)

```bash
# Normal run (will now populate includedPRs in new events)
npm start
```

## Running Tests

```bash
# All tests
npm test

# Specific test for backfill
npx jest tests/unit/backfill-history.test.ts

# E2E tests (requires Playwright)
npm run test:e2e
```

## Viewing the Site

```bash
# Serve the site locally
cd dist && python3 -m http.server 8080
# Navigate to http://localhost:8080/#/city/tampere-region/history
```

## Key Files

| File | Purpose |
|------|---------|
| `src/scripts/backfill-history.ts` | One-time backfill script (new) |
| `src/index.ts` | Live tracker main loop (bug fix at line 108) |
| `src/services/change-detector.ts` | Detects deployment changes |
| `src/services/pr-collector.ts` | Collects PRs between commits |
| `site/js/components/history-view.js` | Frontend history display |
| `update_history/*.json` | Input log exports |
| `data/history.json` | Output deployment history |
