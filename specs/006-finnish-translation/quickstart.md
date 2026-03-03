# Quickstart: Finnish Translation

## What This Feature Does

Translates all user-facing text in the eVaka Deployment Tracker from English to Finnish. Adds a screenshot capture npm script and embeds a screenshot in the README.

## Files to Modify

### Dashboard UI (8 files)
1. `site/index.html` — lang attribute, title, heading, loading text, footer
2. `site/js/app.js` — timestamp prefix, error messages, loading states, date locale
3. `site/js/components/overview.js` — environment labels, section headers, empty state
4. `site/js/components/city-tabs.js` — "Overview" tab label
5. `site/js/components/city-detail.js` — section headings, env labels, button text, history link
6. `site/js/components/status-badge.js` — status text mapping, date locale
7. `site/js/components/pr-list.js` — empty states, status labels, date locale
8. `site/js/components/history-view.js` — nav, titles, env labels, PR count, date locale

### Slack (1 file)
9. `src/api/slack.ts` — message headers, field labels, link text, repoType display mapping

### Documentation (1 file)
10. `README.md` — full prose translation to Finnish

### New Files (1 file)
11. `scripts/screenshot.ts` — Playwright screenshot script

### Tests (1-2 files)
12. `tests/e2e/production-prs.spec.ts` — update string assertions
13. `tests/integration/slack-api.test.ts` — update assertions if needed

## How to Verify

```bash
# 1. Run all tests (unit + integration)
npm test

# 2. Run E2E tests
npm run test:e2e

# 3. Preview dashboard locally
ln -sf ../data site/data
npx serve site
# Open http://localhost:3000 — all text should be in Finnish

# 4. Capture screenshot
npm run screenshot -- --path "#/city/tampere-region" --width 750 --height 1300

# 5. Check Slack notification (dry run)
DRY_RUN=true npx ts-node --esm src/index.ts
# Console output for Slack message content should show Finnish text
```

## Key Terminology

| English | Finnish |
|---------|---------|
| wrapper | Kuntaimplementaatio |
| core | ydin |
| Production | Tuotanto |
| Staging | Testaus |
| Deployment History | Käyttöönottohistoria |
| Overview | Yleiskatsaus |
