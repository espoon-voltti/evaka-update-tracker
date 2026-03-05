# Quickstart: Overview Fullscreen & Change Counts

**Feature**: 014-overview-fullscreen

## Prerequisites

- Node.js 20+
- npm dependencies installed (`npm install`)

## Development

```bash
# Run all tests (unit + lint)
npm test && npm run lint

# Run E2E tests
npm run test:e2e

# Build and serve the site locally
npm run build:site
npx serve dist
```

## Key Files to Modify

| File | Change |
|------|--------|
| `site/js/components/overview.js` | Add change count computation and display to city cards; add fullscreen toggle button and event binding |
| `site/css/style.css` | Add styles for count badges on cards; add `body.fullscreen` mode styles with viewport-scaled cards |
| `site/js/app.js` | Read `fullscreen` query param and apply/remove body class on overview route |
| `tests/e2e/overview.spec.ts` | Update existing tests, add tests for count display and fullscreen mode |

## Architecture Notes

- **No backend changes** — all data already exists in `current.json`
- **No new dependencies** — pure CSS + vanilla JS
- **URL state** — fullscreen mode uses `#/?fullscreen=true` query param (same pattern as `showBots`)
- **Scaling approach** — CSS `body.fullscreen` class triggers viewport-unit based sizing for cards and text
