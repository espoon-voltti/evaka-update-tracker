# Duplication Cleanup Plan

Tracks progress on the duplication findings from the 2026-05-07 code review.

**Ground rule for every item:** before doing any functional refactor, confirm the affected behavior is covered by tests. If coverage is missing, write the tests first and land them as a separate commit. Only then perform the extraction/consolidation. Re-run the full test suite (`npm test && npm run lint`) and any relevant E2E specs after the refactor.

Status legend: `[ ]` not started · `[~]` in progress · `[x]` done

---

## High severity

### 1. [x] Consolidate `escapeHtml` into a shared frontend module
- Sites: `site/js/components/{overview,city-detail,history-view,feature-matrix,pr-list,city-tabs,status-badge}.js`
- Action: moved to `site/js/utils.js` with a `.d.ts` declaration; all 7 components now import from it. Local copies deleted.
- Canonical implementation now escapes `& < > "` (unifies the 5 three-char copies and the 2 four-char copies; `"` escaping is strictly safer for attribute interpolation contexts that already existed in some callers).
- **Test gate done:** added `tests/unit/escape-html.test.ts` (12 cases: nullish handling, each entity, ampersand-first ordering, script/attribute injection payloads). Required jest config tweaks: a custom `tests/jest-js-transformer.cjs` (uses the existing `typescript` devDep) so jest can load ESM `.js` from `site/`. Full suite: 295 unit tests + 63 E2E tests passing; lint clean.

### 2. [x] Extract shared `findStagingBranchInfo`
- Sites: `site/js/components/overview.js`, `site/js/components/city-detail.js`
- Action: moved to `site/js/utils.js`; both components now import it. Local copies deleted.
- **Test gate done:** added `tests/unit/find-staging-branch-info.test.ts` (10 cases: no staging envs, no matching events, default-branch, undefined `isDefaultBranch`, branch-with-name, null branch field, latest-wins ordering, cross-city isolation, production-event isolation). E2E coverage already existed: `status-badge.spec.ts` exercises the side effect (no newer-commit pill on branch deployment) on both overview and city detail; `history-view.spec.ts` asserts `feature/test-branch` rendering; the test data generator injects a branch deployment fixture. Full suite: 305 unit + 63 E2E passing.

### 3. [ ] Define named retry profiles
- Sites: `src/utils/retry.ts`, `src/api/{github,slack,status}.ts`
- Action: export `RETRY_GITHUB`, `RETRY_WEBHOOK`, `RETRY_STATUS_PROBE` (or similar) from `src/utils/retry.ts`; replace inline option objects.
- **Test gate:** unit-test `withRetry` with each profile (retry counts, delays, terminal failure). Confirm `tests/unit/retry*.test.ts` (or add one) asserts the expected `maxRetries` and `baseDelayMs` per call site before changing values.

### 4. [ ] Extract env-var save/restore helper for tests
- Sites: `tests/unit/slack-routing.test.ts:3-28`, `tests/unit/change-routing.test.ts:3-28`
- Action: add `tests/helpers/env-setup.ts` exporting `setupEnvCleanup(vars: string[])`; replace duplicated blocks.
- **Test gate:** the existing test files already cover the behavior; just confirm both suites still pass after the helper extraction.

### 5. [ ] Consolidate date formatters
- Sites: `site/js/components/pr-list.js:83` (`formatDate`), `site/js/components/status-badge.js:74` (`formatTime`, already exported), `site/js/components/feature-matrix.js:303` (`formatFinnishDate`)
- Action: pick canonical functions in `status-badge.js` (or `utils.js`); have callers import; delete the duplicates.
- **Test gate:** add unit tests for each formatter (boundary cases: midnight, year boundary, locale-specific formatting). The frontend currently has minimal direct unit coverage — at minimum, ensure E2E specs assert the rendered date strings on PR list, status badge, and feature matrix.

---

## Medium severity

### 6. [ ] Centralize short-SHA truncation
- Sites: `src/api/github.ts:57`, `src/services/change-announcer.ts:135,145`, `src/services/change-detector.ts:50,69`
- Action: rely on `CommitInfo.shortSha` everywhere, or extract `toShortSha(sha)` in `src/utils/`.
- **Test gate:** unit-test that `change-detector` and `change-announcer` produce the expected short-SHA strings for known inputs (existing `change-detector.test.ts` likely covers part of this — verify before refactoring).

### 7. [ ] Move `cacheBustUrl` to a shared module
- Sites: `site/js/app.js:13`, `site/js/auto-refresh.js:44`
- Action: export from a shared `utils.js`; import in both.
- **Test gate:** confirm `tests/e2e/auto-refresh.spec.ts` exercises the cache-busted fetch path; if not, add an assertion that the fetched URL contains a `?t=` query parameter.

### 8. [ ] Extract `writeJsonFile` helper
- Sites: `src/services/change-announcer.ts:54`, `src/services/history-manager.ts:32`, `src/services/name-resolver.ts:16`
- Action: add `src/utils/json-io.ts` with `writeJsonFile(path, data)`; standardize formatting.
- **Test gate:** make sure unit tests for `history-manager`, `change-announcer`, and `name-resolver` cover their write paths (check generated JSON content). Add coverage if missing before swapping the call.

### 9. [ ] Replace ad-hoc `pr.repoType` filters with a partition helper
- Sites: `src/services/change-detector.ts:53,72`, `src/index.ts:240`
- Action: add `partitionByRepoType(prs)` returning `{ wrapper, core }` in `src/utils/` or `src/services/pr-collector.ts`.
- **Test gate:** `tests/unit/change-detector.test.ts` should already exercise wrapper/core separation. Verify the test asserts the right PRs land on the right side; extend if not.

### 10. [ ] Replace `!pr.isHidden` checks with `getVisiblePRs`
- Sites: `src/services/pr-collector.ts:93`, `src/api/slack.ts:63`, `src/index.ts:364-365`, `src/services/name-resolver.ts:33`
- Action: add a single `getVisiblePRs(prs)` (or `isVisiblePR(pr)`) helper; route all callers through it.
- **Test gate:** verify `tests/unit/pr-collector.test.ts` covers the visibility filter for both bot PRs and `no-changelog` labelled PRs. Add a Slack-side test asserting hidden PRs do not appear in messages.

---

## Low severity

### 11. [ ] Extract `buildPRRecord` factory
- Sites: `src/services/pr-collector.ts:39-51`, `src/index.ts:113-125`
- Action: factor a shared `buildPRRecord(ghPR, repoType, repo)` and call it from both.
- **Test gate:** ensure unit tests cover both call sites' PR construction (label extraction, `isBot`/`isHidden` derivation, author normalization). Snapshot or explicit field assertions are fine.

### 12. [ ] Extract `renderEmptyState(message)` helper
- Sites: ~8 occurrences across `site/js/components/{pr-list,city-detail,history-view}.js`
- Action: add to shared frontend utils.
- **Test gate:** confirm existing E2E specs assert empty-state copy on at least one view; add a missing assertion if all empty paths are silent.

### 13. [ ] Extract `bindToggleButton(elementId, paramName, onChange)`
- Sites: `site/js/components/{city-detail,history-view,overview,feature-matrix}.js` toggle handlers
- Action: single helper that wires a button to a query parameter and triggers a re-render.
- **Test gate:** E2E coverage for each toggle (bots, fullscreen, differences-only, show-values) must exist and assert URL changes plus re-render. Strengthen `tests/e2e/feature-matrix.spec.ts` and the city/history specs first if any toggle is uncovered.

---

## Suggested order of execution

1. #1 (sets up shared `utils.js` for #2, #5, #7, #12, #13)
2. #3 (real correctness improvement, not just style)
3. #2, #5
4. #9, #10, #6
5. #4, #8 opportunistically when next editing those files
6. #11, #12, #13 as cleanup passes
