# Tasks: Improve History View for Stakeholders

**Input**: Design documents from `/specs/010-improve-history-view/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md

**Tests**: E2E tests included per constitution requirement (E2E tests are first-class citizens).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Shared infrastructure changes that enable all user stories

- [x] T001 Export `formatTime` function from `site/js/components/status-badge.js` so history view can reuse the Finnish weekday timestamp format (per research.md R6, DRY principle)
- [x] T002 [P] Add CSS classes for environment-tinted history events and secondary SHA styling in `site/css/style.css`: `.history-event.production` (green: `#f0fdf4`, border `#86efac`), `.history-event.staging` (blue: `#eff6ff`, border `#93c5fd`), `.history-sha-transition` (small muted text) per research.md R4

**Checkpoint**: Foundation ready — history-view.js rewrite can begin

---

## Phase 2: User Story 1 — PR-Centric Event Display (Priority: P1) — MVP

**Goal**: Replace commit SHAs with prominent PR titles using the shared `renderPRList` component. PRs are visible without clicking to expand. Commit SHAs are demoted to secondary display.

**Independent Test**: Open any city's history page (`#/city/{id}/history`) and verify each event shows PR titles with label badges prominently, with SHAs in small muted text below.

### Implementation for User Story 1

- [x] T003 [US1] Rewrite `renderHistoryView` in `site/js/components/history-view.js`: import `renderPRList` from `./pr-list.js`, import `formatTime` from `./status-badge.js`, replace custom inline PR rendering with `renderPRList(event.includedPRs, { showBots: true })` for each event, show PRs prominently (not inside collapsed `<details>`), demote commit SHA transition (`previousCommit.shortSha → newCommit.shortSha`) to small muted text using `.history-sha-transition` class. Keep event header with environment label and timestamp. Remove the old `formatTimestamp` and `escapeHtml` functions (use imported `formatTime` and let `renderPRList` handle escaping). FR-001, FR-002, FR-003, FR-011, FR-012
- [x] T004 [US1] Update `handleCityHistory` in `site/js/app.js` to accept `queryParams` as second parameter (same pattern as `handleCityDetail` at line 51), extract `showBots = queryParams?.get('showBots') === 'true'`, pass it to `renderHistoryView(city, historyData, { showBots })`. Also import and call `bindHistoryViewEvents(city)` after render. FR-013

**Checkpoint**: History view shows PR titles with labels instead of commit SHAs. This is the MVP — independently functional and testable.

---

## Phase 3: User Story 2 — Bot/Dependency Event Filtering (Priority: P2)

**Goal**: Add a bot toggle button matching the city view pattern. Hide bot-only events by default. Persist toggle state via URL query parameter.

**Independent Test**: Load a history page, verify bot-only events are hidden. Click "Näytä riippuvuuspäivitykset" toggle, verify bot events appear. Reload page — toggle state should reset to default (hidden). Navigate to `#/city/{id}/history?showBots=true` — bot events should be visible.

### Implementation for User Story 2

- [x] T005 [US2] Add bot event filtering logic in `site/js/components/history-view.js`: accept `{ showBots = false }` options parameter in `renderHistoryView`, filter events array to hide events where ALL `includedPRs` have `isBot === true` when `showBots` is false (events with 0 PRs are always shown), pass `showBots` to `renderPRList` calls so bot PRs within mixed events are also filtered. FR-005
- [x] T006 [US2] Add bot toggle button and binding in `site/js/components/history-view.js`: render `<button class="bot-toggle" id="bot-toggle">Näytä riippuvuuspäivitykset</button>` (with `.active` class when showBots is true) before the event list, export `bindHistoryViewEvents(city)` function that binds toggle click to `setQueryParam('showBots', ...)` (import `getQueryParam`/`setQueryParam` from `../router.js`) and binds back-nav click to `navigate(/city/${city.id})`. FR-004, FR-013
- [x] T007 [US2] Add bot-filtered empty state in `site/js/components/history-view.js`: when all events are hidden by bot filter, show message "Vain automaattisia muutoksia. Näytä kaikki muutokset painamalla \"Näytä riippuvuuspäivitykset\"." instead of the regular empty state. Edge case from spec.

**Checkpoint**: Bot toggle works identically to city view. Bot-heavy timelines are dramatically cleaner by default.

---

## Phase 4: User Story 3 + User Story 4 — Visual Styling & Idiomatic Finnish (Priority: P3)

**Goal**: Color-code events by environment type and fix all Finnish language to be idiomatic.

**Independent Test**: Open history page. Production events should have green-tinted backgrounds, staging events blue-tinted. Repo labels should read "Ydin"/"Kuntaimplementaatio". All Finnish text should sound natural to a native speaker.

### Implementation for User Story 3 (Visual Styling)

- [x] T008 [US3] Add environment-type CSS class to history event cards in `site/js/components/history-view.js`: determine `production` or `staging` from `event.environmentId` (contains "prod" → production, otherwise → staging), add class to `.history-event` element. FR-006
- [x] T009 [US3] Replace raw English repo type labels in `site/js/components/history-view.js` event headers: map `event.repoType` from "core" → "Ydin", "wrapper" → "Kuntaimplementaatio" in the event header display. FR-007

### Implementation for User Story 4 (Idiomatic Finnish)

- [x] T010 [US4] Update Finnish text in `site/js/components/history-view.js` per research.md R5: change PR count from `${N} PR sisältyy` to `Sisältää ${N} muutosta`, change empty state from `Muutostapahtumia ei ole vielä tallennettu` to `Ei tallennettuja muutoksia`, change back-nav from `Takaisin: ${city.name}` to `← ${city.name}`. FR-008, FR-009, FR-010

**Checkpoint**: History view is visually consistent with city view and uses natural Finnish throughout.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: E2E tests and final validation

- [x] T011 Create E2E test file `tests/e2e/history-view.spec.ts` with Playwright tests: (1) history page loads and shows events with `.pr-title` elements visible (not inside collapsed details), (2) PR label badges (`.pr-label`) are visible on history events, (3) bot toggle (`#bot-toggle`) exists and hides/shows bot-only events, (4) production events have `.history-event.production` class, (5) staging events have `.history-event.staging` class, (6) back navigation (`← City Name`) navigates to city detail page, (7) environment labels show "Ydin"/"Kuntaimplementaatio" not "core"/"wrapper"
- [x] T012 Run `npm test && npm run lint` to verify no regressions in existing tests and no lint errors
- [x] T013 Run `npm run test:e2e` to verify all E2E tests pass (including new history view tests and existing overview/production-prs tests)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies — can start immediately
- **US1 (Phase 2)**: Depends on Phase 1 (needs exported `formatTime` and new CSS classes)
- **US2 (Phase 3)**: Depends on Phase 2 (builds on rewritten history-view.js)
- **US3+US4 (Phase 4)**: Depends on Phase 2 (builds on rewritten history-view.js). Can run in parallel with Phase 3 since they modify different aspects of the same file (styling/text vs filtering logic), but sequential execution is safer.
- **Polish (Phase 5)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Depends on Foundational only — no other story dependencies
- **US2 (P2)**: Depends on US1 (needs the rewritten history-view.js structure)
- **US3 (P3)**: Depends on US1 (needs CSS classes added in Phase 1 and event structure from US1)
- **US4 (P3)**: Depends on US1 (modifies text in rewritten history-view.js)

### Parallel Opportunities

- **Phase 1**: T001 and T002 can run in parallel (different files: status-badge.js vs style.css)
- **Phase 4**: T008/T009 (US3) and T010 (US4) modify different aspects of the same file — technically parallelizable but sequential is safer
- **Phase 5**: T011 can start as soon as all phases are complete; T012 and T013 are sequential (lint first, then E2E)

---

## Parallel Example: Phase 1

```bash
# These two tasks modify different files and can run simultaneously:
Task T001: "Export formatTime from site/js/components/status-badge.js"
Task T002: "Add CSS classes in site/css/style.css"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Foundational (T001, T002)
2. Complete Phase 2: User Story 1 (T003, T004)
3. **STOP and VALIDATE**: Open history page, verify PR titles with labels visible, SHAs demoted
4. This alone transforms the history view from developer-oriented to stakeholder-friendly

### Incremental Delivery

1. Phase 1 → Foundational ready
2. Phase 2 (US1) → PR titles visible, labels, dates → **MVP deployed**
3. Phase 3 (US2) → Bot filtering → Timeline dramatically cleaner
4. Phase 4 (US3+US4) → Color-coding + Finnish polish → Visually consistent with city view
5. Phase 5 → E2E tests + validation → Production-ready

### Files Modified (Summary)

| File | Phases | Change Type |
|------|--------|-------------|
| `site/js/components/status-badge.js` | Phase 1 | Add `export` to `formatTime` |
| `site/css/style.css` | Phase 1 | Add ~15 lines of CSS |
| `site/js/components/history-view.js` | Phase 2-4 | Rewrite (~100 lines) |
| `site/js/app.js` | Phase 2 | Modify ~10 lines |
| `tests/e2e/history-view.spec.ts` | Phase 5 | New file (~80 lines) |

---

## Notes

- This is a frontend-only feature: no backend, data pipeline, or data format changes
- The shared `renderPRList` component already supports all needed features (labels, bot filtering, repo labels, dates, authors)
- The `?showBots=true` query param pattern is already established by the city detail view
- Total: 13 tasks across 5 phases, touching 5 files (3 modified, 1 rewritten, 1 new)
