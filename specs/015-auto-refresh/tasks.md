# Tasks: Auto-Refresh Site Data

**Input**: Design documents from `/specs/015-auto-refresh/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Generate the site version file and prepare the E2E test infrastructure for auto-refresh testing

- [x] T001 Add site-version.txt generation step to deploy job in `.github/workflows/monitor.yml` — after "Prepare site" step, write a build timestamp to `dist/data/site-version.txt`
- [x] T002 Create a placeholder `site/data/site-version.txt` with a static value for local development

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Refactor `app.js` to support re-rendering the current view from outside, which all user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Refactor `site/js/app.js` to extract route handler dispatch into an exported `refreshCurrentView()` function that re-invokes the current route's fetch+render+bind cycle using the existing router state. The function must: (1) determine the current route from `location.hash`, (2) re-fetch data files relevant to that route with cache-busting `?t=<timestamp>` query params, (3) call the appropriate render+bind functions, (4) update the `generatedAt` footer timestamp if `current.json` changed. Existing `init()` flow and route registration must continue working unchanged.
- [x] T004 Extend `tests/e2e/helpers/server.ts` to support dynamic test data updates — add an exported `updateTestData(filename: string, data: object)` function that writes to the test-data directory so E2E tests can simulate data changes mid-test. Also add a `serveText` handler for `.txt` files (MIME type `text/plain; charset=utf-8`).

**Checkpoint**: `app.js` exposes `refreshCurrentView()` and existing E2E tests still pass (`npm run test:e2e`)

---

## Phase 3: User Story 1 - Automatic Data Updates (Priority: P1) MVP

**Goal**: Data file changes are detected every 30 seconds and the current view re-renders seamlessly without page reload

**Independent Test**: Open the site, modify a data file on the server, observe the page content updates within one polling cycle without any visible page reload

### Implementation for User Story 1

- [x] T005 [US1] Create `site/js/auto-refresh.js` — implement the polling module with: (1) configurable interval (default 30s, exported for test override), (2) `startAutoRefresh(refreshFn)` that calls `setInterval`, (3) overlap guard (`inProgress` flag), (4) cache-busting fetch of data files (`data/current.json`, `data/history.json`, `data/feature-flags.json`) comparing response text with cached versions, (5) call `refreshFn()` only when at least one data file has changed, (6) silent error handling (catch network errors, log to console, continue polling), (7) `stopAutoRefresh()` for cleanup
- [x] T006 [US1] Integrate auto-refresh into `site/js/app.js` — import `startAutoRefresh` from `auto-refresh.js` and call it in `init()` after `startRouter()`, passing `refreshCurrentView` as the callback. Cache initial data file texts during first load for comparison baseline.
- [x] T007 [US1] Write E2E test for data auto-refresh in `tests/e2e/auto-refresh.spec.ts` — test that: (1) page loads with initial data, (2) test data file is modified via `updateTestData()`, (3) after waiting for one short polling cycle, the page content reflects the new data without a full page reload (verify by checking that a persistent DOM element like the header remains and page didn't navigate). Use a short polling interval (500ms) configured via a query param or global override to keep the test fast.

**Checkpoint**: Data changes auto-render on the overview route. Run `npm run test:e2e` — all tests pass including new auto-refresh test.

---

## Phase 4: User Story 2 - Front-End Code Change Detection (Priority: P2)

**Goal**: When `site-version.txt` changes on the server, the page performs a full reload

**Independent Test**: Modify `site-version.txt` on the test server and observe the page reloads within one polling cycle

### Implementation for User Story 2

- [x] T008 [US2] Extend `site/js/auto-refresh.js` to fetch `data/site-version.txt` on each polling cycle with cache-busting. Compare with cached version. If changed, call `location.reload()` instead of the data refresh callback. Code change detection takes precedence over data changes (check version first).
- [x] T009 [US2] Write E2E test for code change reload in `tests/e2e/auto-refresh.spec.ts` — test that: (1) page loads normally, (2) `site-version.txt` is modified on the test server, (3) after one polling cycle the page reloads (verify by checking that page navigation occurred or a marker element was reset). Keep this test focused and fast with the short polling interval.

**Checkpoint**: Code version changes trigger full reload. Run `npm run test:e2e` — all tests pass.

---

## Phase 5: User Story 3 - Seamless Background Operation (Priority: P3)

**Goal**: Polling is invisible to the user — no blinks, flashes, or layout shifts when nothing has changed

**Independent Test**: Watch the page for multiple polling cycles with no data changes and verify zero visual artifacts

### Implementation for User Story 3

- [x] T010 [US3] Write E2E test for no-change visual stability in `tests/e2e/auto-refresh.spec.ts` — test that: (1) page loads with data, (2) wait for 3+ polling cycles with no data changes, (3) verify page content is identical (snapshot text content before and after), (4) verify scroll position is preserved by scrolling to a specific position before the wait. Use the short polling interval to keep this fast.
- [x] T011 [US3] Ensure `site/js/auto-refresh.js` does NOT call the refresh callback when no data files have changed — verify the string comparison gate is working (the check cycle completes but refreshFn is not invoked). If any edge case is found where unchanged data triggers re-render, fix it.

**Checkpoint**: Multiple poll cycles with no changes produce zero visual artifacts. Run `npm run test:e2e` — all tests pass.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Ensure all routes work with auto-refresh, handle edge cases, and validate overall quality

- [x] T012 Verify auto-refresh works on all routes — manually test or add brief E2E assertions that auto-refresh operates correctly on: `#/`, `#/city/:id`, `#/city/:id/history`, and `#/features`. If `refreshCurrentView()` needs route-specific data file lists, adjust accordingly in `site/js/app.js`.
- [x] T013 Run full validation: `npm test && npm run lint` and `npm run test:e2e` — fix any issues found
- [x] T014 Verify `site-version.txt` generation works in CI by checking `.github/workflows/monitor.yml` deploys the file correctly (can verify by inspecting the `dist/` output or testing the deployed site)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on T002 (site-version.txt placeholder) for local testing
- **User Story 1 (Phase 3)**: Depends on Phase 2 (T003 refactor, T004 test server)
- **User Story 2 (Phase 4)**: Depends on T005 (auto-refresh module exists), T001 (version file in CI)
- **User Story 3 (Phase 5)**: Depends on T005 (auto-refresh module exists)
- **Polish (Phase 6)**: Depends on all user stories complete

### User Story Dependencies

- **User Story 1 (P1)**: Depends on Foundational phase — no cross-story dependencies
- **User Story 2 (P2)**: Depends on US1's auto-refresh module (T005) — extends it with version checking
- **User Story 3 (P3)**: Depends on US1's auto-refresh module (T005) — validates its no-change behavior

### Within Each User Story

- Implementation before E2E test (tests validate the implementation)
- Core module before integration (T005 before T006)

### Parallel Opportunities

- T001 and T002 can run in parallel (different files)
- T003 and T004 can run in parallel (different files)
- US2 (T008-T009) and US3 (T010-T011) can run in parallel after US1 is complete

---

## Parallel Example: Setup Phase

```bash
# These can run in parallel (different files):
Task T001: "Add site-version.txt generation to .github/workflows/monitor.yml"
Task T002: "Create placeholder site/data/site-version.txt"
```

## Parallel Example: Foundational Phase

```bash
# These can run in parallel (different files):
Task T003: "Refactor site/js/app.js — extract refreshCurrentView()"
Task T004: "Extend tests/e2e/helpers/server.ts — add updateTestData()"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T002)
2. Complete Phase 2: Foundational (T003-T004)
3. Complete Phase 3: User Story 1 (T005-T007)
4. **STOP and VALIDATE**: Test data auto-refresh on the overview page
5. This alone delivers the core value — data stays current without manual refresh

### Incremental Delivery

1. Setup + Foundational → Infrastructure ready
2. Add US1 → Data auto-refresh works → MVP
3. Add US2 → Code changes trigger reload → Full feature
4. Add US3 → Visual stability verified → Polished experience
5. Polish → All routes validated, CI verified → Release ready

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- The auto-refresh polling interval MUST be configurable for E2E tests (500ms) vs production (30s)
- E2E tests for this feature should add no more than ~5-10 seconds to the total test suite runtime
- All E2E tests in `auto-refresh.spec.ts` share the short polling interval to stay fast
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
