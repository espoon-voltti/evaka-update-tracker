# Tasks: Production PR List

**Input**: Design documents from `/specs/003-production-pr-list/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md

**Tests**: E2E tests with Playwright are explicitly requested. Tests are included in each user story phase.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install Playwright, configure E2E test infrastructure, add npm scripts

- [x] T001 Install Playwright as devDependency: run `npm install -D @playwright/test` and `npx playwright install chromium` in project root
- [x] T002 Create Playwright configuration in `playwright.config.ts` at project root: single Chromium project, `testDir: 'tests/e2e'`, `webServer` block that starts the test HTTP server, timeout 30s
- [x] T003 [P] Add npm scripts to `package.json`: `"test:e2e": "playwright test"`, `"test:e2e:generate": "npx ts-node --esm tests/e2e/helpers/generate-test-data.ts"`
- [x] T004 [P] Create test directory structure: `tests/e2e/fixtures/`, `tests/e2e/helpers/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create mock API fixtures, test data generator, and HTTP server that ALL E2E tests depend on

**CRITICAL**: No E2E test can run until this phase is complete

- [x] T005 Create realistic GitHub API mock response fixtures in `tests/e2e/fixtures/mock-api-responses.ts`. Must include: (a) status API responses for each city instance (espoonvarhaiskasvatus.fi, varhaiskasvatus.tampere.fi, varhaiskasvatus.ouka.fi, evaka.turku.fi + staging variants) returning commit SHAs, (b) GitHub commit detail responses for those SHAs, (c) GitHub compare responses with merge commit messages containing PR numbers (e.g., "Merge pull request #8573 from ..."), (d) GitHub PR detail responses with realistic titles/authors/dates from espoon-voltti/evaka (use data from research.md: PRs #8630, #8629, #8594, #8626, #8602), (e) a `previous.json` fixture with "old" production SHAs different from current SHAs so the backend detects deployments. Include both human and bot PRs (dependabot) for bot toggle testing. Include wrapper repo responses for Tampere/Oulu/Turku. Also mock Slack webhook to prevent real notifications.
- [x] T006 Create test data generator in `tests/e2e/helpers/generate-test-data.ts`. This script must: (1) import nock and set up interceptors using fixtures from T005, (2) set environment variables: `GH_TOKEN=test-token`, `DRY_RUN=false`, `SLACK_WEBHOOK_URL=http://localhost/slack-mock`, (3) write the `previous.json` fixture to a temp data directory, (4) run the backend main logic (import and call the `run()` function from `src/index.ts`, or spawn it as a subprocess with overridden DATA_DIR pointing to the temp directory), (5) verify `current.json` and `history.json` were written with populated `deployed` arrays, (6) copy generated data to `site/data/` (or a test-specific location the HTTP server will serve). Handle the fact that `src/index.ts` exports `run()` — if it doesn't, use a subprocess approach with environment variable overrides.
- [x] T007 Create minimal HTTP server in `tests/e2e/helpers/server.ts`. Must: (1) use Node.js built-in `http` module (no new dependencies), (2) serve `site/` directory for HTML/JS/CSS files, (3) serve generated test data from `data/` directory, (4) listen on port 0 (random available port), (5) export `startServer()` returning `{ url: string, close: () => void }`. Handle MIME types for `.html`, `.js`, `.css`, `.json`.
- [x] T008 Create Playwright global setup in `tests/e2e/global-setup.ts` that: (1) runs the test data generator from T006, (2) starts the HTTP server from T007, (3) stores the server URL in a file or environment variable for tests to read, (4) creates a global teardown that stops the server

**Checkpoint**: E2E infrastructure ready — test data is generated from mocked backend run, site is served. User story E2E tests can now begin.

---

## Phase 3: User Story 1 — View Latest Production PRs on City Page (Priority: P1) — MVP

**Goal**: City detail page displays "In Production" section with up to 5 latest deployed PRs, with PR number (linked), title, author, and merge date. Respects bot toggle.

**Independent Test**: Navigate to any city detail page and verify "In Production" section is visible with correct PR data.

### E2E Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T009 [US1] Create E2E test file `tests/e2e/production-prs.spec.ts` with the following test cases: (1) Navigate to Espoo city detail page (`#/city/espoo`), assert "In Production" heading is visible, assert up to 5 PR items are listed with PR numbers as links, titles, authors, and dates. (2) Navigate to Tampere city detail page (`#/city/tampere`), assert both "Core — In Production" and "Wrapper — In Production" sections appear (Tampere has wrapper repo). (3) Verify PR number links point to correct GitHub URLs (e.g., `https://github.com/espoon-voltti/evaka/pull/NNNN`). (4) Verify bot PRs are hidden by default. (5) Click "Show dependency updates" toggle, verify bot PRs appear in the production section. (6) Verify production PR section appears AFTER staging sections in DOM order.

### Implementation for User Story 1

- [x] T010 [US1] Modify `site/js/components/city-detail.js`: Rename `"Core — Deployed"` to `"Core — In Production"` (line ~84) and `"Wrapper — Deployed"` to `"Wrapper — In Production"` (line ~71). Change the variable names `deployedSection` to `productionSection` for clarity (in both wrapper and core blocks, lines 65-87). Wrap both production sections in a container: extract the combined wrapper+core production HTML into a new `productionSection` variable and wrap in `<div class="production-section"><h4>In Production</h4>...</div>`, consistent with how `pendingSection` wraps "Awaiting deployment".

**Checkpoint**: User Story 1 complete. City detail page shows "In Production" section with production PRs. E2E tests from T009 should now pass.

---

## Phase 4: User Story 2 — View Production PRs on Overview Page (Priority: P2)

**Goal**: Overview page city cards show production PRs with clear "In Production" labeling for each city.

**Independent Test**: Navigate to overview page and verify each city card shows production PRs.

### E2E Tests for User Story 2

- [x] T011 [US2] Create E2E test file `tests/e2e/overview.spec.ts` with the following test cases: (1) Navigate to overview page (`#/`), verify all 4 city cards are rendered (Espoo, Tampere region, Oulu, Turku). (2) For each city card, assert "Core — In Production" header is visible and production PR items are listed. (3) For Tampere card, also assert "Wrapper — In Production" header and wrapper PRs. (4) Click on a city card (e.g., Espoo), verify navigation to city detail page (`#/city/espoo`). (5) Verify empty state: if a city has no production PRs, the section handles it gracefully (no crash, shows "No recent PRs" or is hidden).

### Implementation for User Story 2

- [x] T012 [US2] Modify `site/js/components/overview.js`: Rename `"Core PRs"` header to `"Core — In Production"` (line ~41) and `"Wrapper PRs"` header to `"Wrapper — In Production"` (line ~50) for consistency with city detail page labels.

**Checkpoint**: User Story 2 complete. Overview page shows "In Production" labeled PR sections per city card. E2E tests from T011 should now pass.

---

## Phase 5: User Story 3 — Distinguish Production PRs from Other Categories (Priority: P2)

**Goal**: Production PR section is visually distinct from "Awaiting Deployment" and "In Staging" sections with clear heading and styling.

**Independent Test**: View city detail page with all three sections populated, verify production section has distinct visual styling.

### E2E Tests for User Story 3

- [x] T013 [US3] Add visual distinction test cases to `tests/e2e/production-prs.spec.ts` (extend existing file): (1) Navigate to a city with all 3 sections (pending, staging, production), assert the production section container has the CSS class `production-section`. (2) Assert the production section `h4` heading text is "In Production". (3) Assert the "Awaiting deployment" section has the CSS class `pending-section` (existing). (4) Assert the 3 sections (pending, staging, production) appear in that DOM order.

### Implementation for User Story 3

- [x] T014 [US3] Add `.production-section` CSS styles to `site/css/style.css`: Add rules after the existing `.pending-section` block (~line 261). Style: `background: #f0fdf4` (light green), `border: 1px solid #86efac` (green border), `border-radius: 0.375rem`, `padding: 0.75rem`, `margin-bottom: 1rem`. Add `.production-section h4` rules: `font-size: 0.8125rem`, `font-weight: 600`, `color: #166534` (dark green), `margin-bottom: 0.5rem`. This mirrors the `.pending-section` pattern (yellow background + yellow border) but uses green to signify production.

**Checkpoint**: All 3 user stories complete. Production PRs are displayed, labeled, and visually distinct on both city detail and overview pages.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verify no regressions, ensure code quality, validate all tests pass

- [x] T015 Run existing Jest tests (`npm test`) to verify no regressions from frontend changes
- [x] T016 Run ESLint (`npm run lint`) to verify no linting errors in modified/new files
- [x] T017 Run full E2E suite (`npm run test:e2e`) end-to-end: verify data generation, site serving, and all Playwright tests pass
- [x] T018 Manual smoke test: serve site locally with real data (`npx http-server site -p 8080`) and verify the production section displays correctly when `deployed` arrays are populated (if available) or is hidden gracefully when empty

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup (T001, T002) — BLOCKS all E2E tests
- **User Story 1 (Phase 3)**: E2E tests depend on Phase 2. Implementation (T010) has no blocking dependencies — can start immediately in parallel with Phase 2 if desired.
- **User Story 2 (Phase 4)**: E2E tests depend on Phase 2. Implementation (T012) has no blocking dependencies — can start immediately.
- **User Story 3 (Phase 5)**: Depends on US1 implementation (T010) since it extends the `.production-section` wrapper created there. E2E tests depend on Phase 2.
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Independent. Can start after Phase 2 for tests, or immediately for implementation.
- **User Story 2 (P2)**: Independent of US1. Can start after Phase 2 for tests, or immediately for implementation.
- **User Story 3 (P2)**: Depends on US1 (T010) for the `.production-section` wrapper div. CSS (T014) can be written in parallel with T010 since it's a different file.

### Within Each User Story

- E2E tests MUST be written and FAIL before implementation
- Implementation changes existing files (minimal, focused edits)
- Verify E2E tests pass after implementation

### Parallel Opportunities

**Phase 1**: T003 and T004 can run in parallel (different files, no dependencies)

**Phase 2**: T005 must be done first. Then T006, T007, T008 can proceed (T006 and T007 in parallel, T008 depends on both)

**Across Stories** (implementation tasks only):
- T010 (city-detail.js), T012 (overview.js), T014 (style.css) all touch different files — can run in parallel
- E2E tests (T009, T011, T013) can be written in parallel since they're separate test files

---

## Parallel Example: All Implementation Tasks

```bash
# These 3 tasks touch different files and can run in parallel:
Task T010: "Modify city-detail.js — relabel Deployed to In Production"
Task T012: "Modify overview.js — relabel PR section headers"
Task T014: "Add .production-section CSS to style.css"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (install Playwright, configure)
2. Complete Phase 2: Foundational (mock fixtures, data generator, server)
3. Complete Phase 3: User Story 1 (city detail "In Production")
4. **STOP and VALIDATE**: Run E2E tests, verify city detail shows production PRs
5. This alone delivers the core feature value

### Incremental Delivery

1. Complete Setup + Foundational → E2E infrastructure ready
2. Add User Story 1 → City detail shows production PRs (MVP!)
3. Add User Story 2 → Overview page shows production PRs
4. Add User Story 3 → Visual distinction with green styling
5. Polish → Lint, test, validate

### Fastest Path (Parallel)

Since all 3 implementation tasks touch different files:
1. Complete Phases 1-2 (setup + foundational)
2. Write all E2E tests in parallel (T009, T011, T013) — they all fail
3. Implement all 3 frontend changes in parallel (T010, T012, T014)
4. Run all E2E tests — they all pass
5. Polish

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- No backend changes needed — `PRTrack.deployed` already contains production PR data
- Frontend changes are relabeling + styling only (no new logic)
- The bulk of the work is in Phase 2 (E2E test infrastructure)
- Commit after each phase or logical group
- Stop at any checkpoint to validate story independently
