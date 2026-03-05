# Tasks: Overview Fullscreen & Change Counts

**Input**: Design documents from `/specs/014-overview-fullscreen/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md

**Tests**: E2E test updates included — constitution requires E2E sync when DOM structure changes.

**Organization**: Tasks grouped by user story. No setup or foundational phases needed — this feature modifies existing files in an established project with no new dependencies.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Exact file paths included in descriptions

---

## Phase 1: User Story 1 - Change Counts on Overview Cards (Priority: P1) MVP

**Goal**: Each city card on the overview page displays the count of non-bot PRs in staging/test and pending deployment (undeployed), combining core and wrapper repositories.

**Independent Test**: Load overview page with known data → verify each city card shows correct staging and undeployed counts matching the underlying prTracks data.

### Implementation for User Story 1

- [x] T001 [P] [US1] Add CSS styles for change count badges (`.change-counts`, `.count-badge`, `.count-value`, `.count-label`) in `site/css/style.css`. Staging count uses `--color-staging` (#3b82f6), pending count uses a warm/amber color. Badges should be compact pill-shaped elements within the city card, visually distinct from each other with clear Finnish labels ("Testauksessa", "Julkaisematta").

- [x] T002 [US1] Add count computation and display to city cards in `site/js/components/overview.js`. Add a helper function `computeChangeCounts(prTracks)` that returns `{ stagingCount, pendingCount }` by counting non-bot PRs (`!pr.isBot`) across `core.inStaging` + `wrapper?.inStaging` and `core.pendingDeployment` + `wrapper?.pendingDeployment`. Handle null wrapper gracefully with optional chaining. Update `renderCityCard()` to call this helper and render the counts as badge elements between the city name and environment sections. Always show counts (including "0").

- [x] T003 [US1] Update existing E2E tests and add count verification in `tests/e2e/overview.spec.ts`. Update any selectors that break due to the new DOM elements in city cards. Add test cases: (a) verify each city card contains `.change-counts` element with two `.count-badge` children, (b) verify count values match the expected non-bot PR counts from the test data in `tests/e2e/test-dist/data/current.json`.

**Checkpoint**: Overview page shows accurate change counts on all city cards. Counts match detail page data. All E2E tests pass.

---

## Phase 2: User Story 2 - Fullscreen Mode (Priority: P2)

**Goal**: A toggle button activates fullscreen mode that hides the page title and navigation and scales city cards and text to fill the entire viewport for wall-mounted displays.

**Independent Test**: Click fullscreen toggle → title and nav disappear, cards scale to fill viewport. Click again → layout restores. Reload with `#/?fullscreen=true` → fullscreen mode active on load.

**Depends on**: Phase 1 (US1) — fullscreen mode displays the enhanced cards with counts.

### Implementation for User Story 2

- [x] T004 [P] [US2] Add fullscreen mode CSS styles in `site/css/style.css`. Define `body.fullscreen` rules: hide `header` and `footer` (`display: none`), make `main` fill viewport (`width: 100vw; height: 100vh; padding: 0; margin: 0; overflow: hidden`). Override `.city-grid` to use fixed `grid-template-columns: repeat(2, 1fr)` and `grid-template-rows: repeat(2, 1fr)` filling `100vh`/`100vw` with small gaps. Override `.city-card` to use viewport-unit font sizes: city name ~4vmin, count values ~5vmin, count labels ~2.5vmin, env labels ~2vmin. Ensure `.fullscreen-toggle` button is styled as a small, unobtrusive control in normal mode and a subtle corner button in fullscreen mode (position: fixed, top-right, semi-transparent).

- [x] T005 [US2] Add fullscreen toggle button and state management in `site/js/components/overview.js`. Update `renderOverview()` to include a fullscreen toggle button (Finnish label: "Koko näyttö" / "Poistu koko näytöstä") before the city grid. Update `bindOverviewEvents()` to bind the toggle click, which calls `setQueryParam('fullscreen', ...)` to toggle the `fullscreen` query param. Import `getQueryParam` and `setQueryParam` from `../router.js`.

- [x] T006 [US2] Add fullscreen class management in `site/js/app.js`. In `handleOverview()`, after rendering, read `fullscreen` query param via the URL params. If `fullscreen=true`, add `fullscreen` class to `document.body`; otherwise remove it. Also ensure that when navigating away from the overview (in `handleCityDetail`, `handleCityHistory`, `handleFeatures`), `document.body.classList.remove('fullscreen')` is called to exit fullscreen mode.

- [x] T007 [US2] Add E2E tests for fullscreen mode in `tests/e2e/overview.spec.ts`. Test cases: (a) fullscreen toggle button is visible on overview page, (b) clicking toggle adds `fullscreen` class to body and hides header, (c) clicking toggle again removes `fullscreen` class and restores header, (d) navigating to `#/?fullscreen=true` directly activates fullscreen mode on load.

**Checkpoint**: Fullscreen mode works end-to-end. Toggle persists via URL. Navigation away exits fullscreen. All E2E tests pass.

---

## Phase 3: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, screenshot update, and cleanup.

- [x] T008 Run full validation: `npm test && npm run lint` — fix any linting or type errors introduced by changes.
- [x] T009 Run E2E test suite: `npm run test:e2e` — confirm all existing and new tests pass.
- [x] T010 Regenerate README screenshot per constitution (major visual change to overview): `npm run screenshot` — commit updated `site/images/screenshot.png`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (US1)**: No dependencies — can start immediately
- **Phase 2 (US2)**: Depends on Phase 1 completion (fullscreen displays enhanced cards)
- **Phase 3 (Polish)**: Depends on Phase 1 and Phase 2 completion

### Within Each Phase

- **Phase 1**: T001 (CSS) and T002 (JS) can run in parallel [P]. T003 (E2E) depends on T001+T002.
- **Phase 2**: T004 (CSS) and T005 (JS) can run in parallel [P]. T006 (app.js) depends on T005. T007 (E2E) depends on T004+T005+T006.
- **Phase 3**: T008 → T009 → T010 sequential.

### Parallel Opportunities

```text
# Phase 1 parallel:
T001 (CSS count styles)  ─┐
T002 (JS count logic)    ─┤→ T003 (E2E count tests)
                           │
# Phase 2 parallel:        │
T004 (CSS fullscreen)    ─┐│
T005 (JS toggle)         ─┤→ T006 (app.js state) → T007 (E2E fullscreen tests)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Change counts on city cards (T001-T003)
2. **STOP and VALIDATE**: `npm test && npm run lint && npm run test:e2e`
3. The overview page now shows useful count information — deployable as-is

### Full Feature

1. Complete Phase 1 (US1) → validate
2. Complete Phase 2 (US2) → validate
3. Complete Phase 3 (Polish) → final validation + screenshot
4. Feature complete

---

## Notes

- All changes are frontend-only (JS + CSS) — no backend or data model changes
- No new files created — all modifications to existing files
- Finnish UI labels used throughout (consistent with existing codebase)
- Bot PR filtering uses existing `isBot` field on PR objects
- Fullscreen state via URL query param follows established `showBots` pattern
