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

### 3. [x] Define named retry profiles
- Sites: `src/utils/retry.ts`, `src/api/{github,slack,status}.ts`
- Action: exported `RETRY_GITHUB`, `RETRY_WEBHOOK`, `RETRY_STATUS_PROBE` from `src/utils/retry.ts`. All 11 call sites (8 in github.ts, 2 in status.ts, 1 in slack.ts) now pass the named profile. No inline option objects remain in `src/api/*.ts`.
- **Test gate done:** added `tests/unit/retry.test.ts` (10 cases) — first asserts each profile's concrete shape against the values previously inlined at the call sites (so any future drift trips the test), then exercises `withRetry` semantics: first-try success, eventual success after retries, terminal failure after `maxRetries+1` attempts per profile, default options behavior, non-Error throwable wrapping. 315 unit + 63 E2E passing; lint + typecheck clean.

### 4. [x] Extract env-var save/restore helper for tests
- Sites: `tests/unit/slack-routing.test.ts:3-28`, `tests/unit/change-routing.test.ts:3-28`
- Action: added `tests/helpers/env-setup.ts` exporting `setupEnvCleanup(vars: readonly string[])` which wires `beforeEach`/`afterEach` from jest globals. Both test files now call it instead of defining the same 26-line block. ~46 lines of duplicated boilerplate removed.
- **Test gate done:** both suites' 16 cases still pass; full suite remains green (315 tests / 26 suites). Lint clean.

### 5. [x] Consolidate date formatters
- Sites: `site/js/components/pr-list.js` (`formatDate`), `site/js/components/feature-matrix.js` (`formatFinnishDate` — was byte-identical to `formatDate`), `site/js/components/status-badge.js` (`formatTime`)
- Action: moved `formatDate` and `formatTime` to `site/js/utils.js`. `formatFinnishDate` was a duplicate of `formatDate` and is now collapsed into a single function. `pr-list.js`, `feature-matrix.js`, `status-badge.js`, and `history-view.js` (which previously imported `formatTime` from `status-badge.js`) all import from `utils.js`.
- **Test gate done:** added `tests/unit/date-formatters.test.ts` (14 cases) — covers nullish input, single/double-digit day & month, year boundaries (Dec 31, Jan 1) for `formatDate`; weekday + date + 24-hour time, midnight, padding rules for `formatTime`. Tests construct dates from local-time components (`new Date(y, m, d, ...)`) so they're stable across runner timezones. **Documented behavior surprise:** the Finnish locale uses `.` (not `:`) as the time separator — so `formatTime` produces `"klo 14.30"`, not `"klo 14:30"`. This was the existing production behavior; my initial test expectations were wrong and exposed it. 329 unit + 63 E2E passing; lint clean.

---

## Medium severity

### 6. [x] Centralize short-SHA truncation
- Sites: `src/api/github.ts:57`, `src/services/change-announcer.ts:135,145`, `src/services/change-detector.ts:50,69`
- Action: added `src/utils/sha.ts` exporting `SHORT_SHA_LENGTH = 7` and `toShortSha(sha)`. All 5 inline `sha.slice(0, 7)` call sites in `src/` now use `toShortSha()`. `tests/` keeps its own `sha.slice(0, 7)` calls — those are fixture/expected-value construction, not production logic, so the helper isn't needed there.
- **Test gate done:** added `tests/unit/sha.test.ts` (5 cases: truncation, length constant, exact 7-char output, short-input passthrough, exact-length passthrough). Added two new assertions to existing `change-detector.test.ts` (`previousCommit?.shortSha` for both core and wrapper synthesized commits) — these passed against the pre-refactor code, locking in the truncation value before the change. github.ts:57 was already covered by `tests/integration/github-api.test.ts:46`. 334 unit + 63 E2E passing; lint clean.

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
