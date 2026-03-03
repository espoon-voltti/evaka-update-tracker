# Quickstart: Improve History View

## What This Feature Changes

3 existing files modified, 1 new file created. All changes are frontend-only.

## Files to Modify

### 1. `site/js/app.js` — Pass query params to history route handler

**What**: Update `handleCityHistory` to accept and use `queryParams` (same pattern as `handleCityDetail`).

**Key change**: The function signature changes from `handleCityHistory({ id })` to `handleCityHistory({ id }, queryParams)`, and `showBots` is extracted and passed to `renderHistoryView`.

### 2. `site/js/components/history-view.js` — Rewrite the history view

**What**: Rewrite the component to use `renderPRList`, add bot filtering, environment color-coding, and improved Finnish text.

**Key changes**:
- Import `renderPRList` from `./pr-list.js`
- Import `getQueryParam`, `setQueryParam` from `../router.js`
- Accept `{ showBots }` options parameter
- Filter events: hide bot-only events when `showBots` is false
- Render each event with:
  - Environment-colored card (green/blue based on `environmentId`)
  - Finnish environment label ("Tuotanto" / "Testaus") and repo label
  - Finnish weekday timestamp (reuse or replicate `formatTime` pattern from `status-badge.js`)
  - `renderPRList(event.includedPRs, { showBots, showRepoLabel: false })` — repo type is shown in event header, not per-PR
  - Secondary: commit SHA transition in muted, small text
- Add bot toggle button (same `#bot-toggle` pattern as city-detail)
- Bind toggle to `setQueryParam('showBots', ...)`
- Update Finnish text per research.md R5
- Export a `bindHistoryViewEvents` function for toggle and back-nav binding

### 3. `site/css/style.css` — Add environment-tinted history event styles

**What**: Add CSS for color-coded history events and demoted SHA display.

**Key additions**:
- `.history-event.production` — green background (#f0fdf4), green border (#86efac)
- `.history-event.staging` — blue background (#eff6ff), blue border (#93c5fd)
- `.history-sha-transition` — small, muted text for the commit SHA line

### 4. `tests/e2e/history-view.spec.ts` — NEW: E2E tests for history view

**What**: Playwright tests covering key history view scenarios.

**Key test cases**:
- History page loads and shows events with PR titles (not SHAs as primary content)
- PR label badges are visible on history events
- Bot toggle hides/shows bot-only events
- Production events have green-tinted background
- Staging events have blue-tinted background
- Back navigation works (← City Name)
- Bot-filtered empty state shows prompt to enable bots

## Implementation Order

1. `style.css` — Add new CSS classes (no breakage)
2. `history-view.js` — Rewrite the component
3. `app.js` — Wire up query params and new function signature
4. `history-view.spec.ts` — Add E2E tests
5. Run `npm test && npm run lint` and `npm run test:e2e` to validate

## What NOT to Change

- `pr-list.js` — Already has all needed features
- `city-detail.js` — Not affected by this feature
- `overview.js` — Not affected by this feature
- `router.js` — Already supports query params
- `status-badge.js` — Only need to replicate 6-line `formatTime` pattern (or export it)
- `data/history.json` — Data format unchanged
