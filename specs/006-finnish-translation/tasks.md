# Tasks: Finnish Translation

**Input**: Design documents from `/specs/006-finnish-translation/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md

**Tests**: Existing E2E and integration tests will be updated to match Finnish strings. No new test suites.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: No setup tasks needed — this feature modifies existing files in-place with no new dependencies or project structure changes.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: No foundational tasks needed — there are no shared prerequisites blocking user stories. All three stories can proceed independently.

**Checkpoint**: User story implementation can begin immediately.

---

## Phase 3: User Story 1 - Finnish-speaking user views the dashboard (Priority: P1) MVP

**Goal**: All ~43 user-facing text strings in the dashboard display in Finnish. Date locales changed from `en-GB` to `fi`.

**Independent Test**: Open the dashboard locally (`npx serve site`), navigate through overview, city detail, and history views — all visible text should be in Finnish.

### Implementation for User Story 1

Refer to `specs/006-finnish-translation/data-model.md` for the complete translation mapping table for each file.

- [x] T001 [P] [US1] Translate site/index.html: set `lang="fi"`, translate `<title>`, `<h1>`, loading div text, and footer text
- [x] T002 [P] [US1] Translate site/js/app.js: replace "Last updated:" → "Päivitetty:", error messages, "Loading..." → "Ladataan...", "City not found" → "Kuntaa ei löytynyt", change date locale from `en-GB` to `fi`
- [x] T003 [P] [US1] Translate site/js/components/overview.js: replace empty state, environment labels (Production→Tuotanto, Staging→Testaus), version mismatch warning, section headers (Core→Ydin, Wrapper→Kuntaimplementaatio)
- [x] T004 [P] [US1] Translate site/js/components/city-tabs.js: replace "Overview" → "Yleiskatsaus"
- [x] T005 [P] [US1] Translate site/js/components/city-detail.js: replace environment labels, "Version mismatch detected", "Show dependency updates" → "Näytä riippuvuuspäivitykset", section headings (Recent Production Commits, Changes in Staging, Awaiting Deployment), "Deployment History" → "Käyttöönottohistoria"
- [x] T006 [P] [US1] Translate site/js/components/status-badge.js: replace status text mapping (No data→Ei tietoja, unavailable→ei saatavilla, auth error→tunnistautumisvirhe), change date locale from `en-GB` to `fi`
- [x] T007 [P] [US1] Translate site/js/components/pr-list.js: replace empty states, "bot" → "botti", status labels (merged→yhdistetty, staging→testauksessa, production→tuotannossa), change date locale from `en-GB` to `fi`
- [x] T008 [P] [US1] Translate site/js/components/history-view.js: replace navigation text, page title, empty state, environment labels, "initial" → "ensimmäinen", PR count text, "No PR details available", change date locale from `en-GB` to `fi`
- [x] T009 [US1] Update E2E test assertions in tests/e2e/production-prs.spec.ts to match new Finnish strings: "Viimeisimmät tuotantocommitit", "Muutokset testauksessa", "Odottaa käyttöönottoa", "Näytä riippuvuuspäivitykset"
- [x] T010 [US1] Run `npm test && npm run lint` and `npm run test:e2e` to verify all tests pass with Finnish translations

**Checkpoint**: Dashboard displays entirely in Finnish. All E2E tests pass.

---

## Phase 4: User Story 3 - Finnish Slack notifications (Priority: P2)

**Goal**: Slack deployment notifications display in Finnish with "ydin"/"Kuntaimplementaatio" for repo type labels.

**Independent Test**: Run `DRY_RUN=true npx ts-node --esm src/index.ts` and verify console output shows Finnish Slack message content.

### Implementation for User Story 3

Refer to `specs/006-finnish-translation/data-model.md` for the Slack translation mapping table.

- [x] T011 [US3] Translate user-facing strings in src/api/slack.ts: "Production deployed" → "Tuotantoon asennettu", "Staging updated" → "Testaus päivitetty", "Changes" → "Muutokset", "No PR details available..." fallback, "Version:" → "Versio:", "Detected:" → "Havaittu:", "View dashboard" → "Näytä hallintapaneeli". Add repoType display mapping: "core" → "ydin", "wrapper" → "Kuntaimplementaatio". Keep all console.log messages in English.
- [x] T012 [US3] Update Slack integration test assertions in tests/integration/slack-api.test.ts if any reference translated string content
- [x] T013 [US3] Run `npm test && npm run lint` to verify Slack tests pass

**Checkpoint**: Slack notifications are in Finnish. All tests pass.

---

## Phase 5: User Story 2 - Finnish README and screenshot (Priority: P2)

**Goal**: README.md fully translated to Finnish with "Kuntaimplementaatio" terminology. Screenshot of Tampere region view embedded in README.

**Independent Test**: Read README.md and verify all prose is in Finnish with technical terms preserved. View screenshot renders correctly.

### Implementation for User Story 2

- [x] T014 [P] [US2] Create screenshot script in scripts/screenshot.ts using Playwright: accept `--path` (hash route, default `#/city/tampere-region`), `--width` (default 750), `--height` (default 1300), and `--output` (default `site/images/screenshot.png`) as CLI parameters. Reuse E2E test infrastructure (test data generation, local server) to serve the dashboard with realistic data.
- [x] T015 [P] [US2] Add `screenshot` npm script to package.json that runs `ts-node --esm scripts/screenshot.ts` and passes through CLI arguments
- [x] T016 [US2] Run `npm run screenshot` to capture the Tampere region screenshot at 750x1300 and save to site/images/screenshot.png
- [x] T017 [US2] Translate README.md to Finnish: translate all prose, headings, and descriptions. Use "Kuntaimplementaatio" for wrapper repository references and "ydin" for core. Preserve all code blocks, commands, file paths, URLs, environment variable names, and repository names in English. Embed the screenshot image with a Finnish caption.
- [x] T018 [US2] Run `npm test && npm run lint` to verify no regressions

**Checkpoint**: README is fully in Finnish with embedded screenshot. All tests pass.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation across all translated surfaces

- [x] T019 Visually verify the complete dashboard by serving locally (`npx serve site`): check overview, each city detail page, and history views for any remaining English text
- [x] T020 Run full test suite: `npm test && npm run lint && npm run test:e2e`
- [x] T021 Run quickstart.md validation steps from specs/006-finnish-translation/quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Skipped — no setup needed
- **Foundational (Phase 2)**: Skipped — no blocking prerequisites
- **User Story 1 (Phase 3)**: Can start immediately — MVP
- **User Story 3 (Phase 4)**: Can start immediately, independent of US1
- **User Story 2 (Phase 5)**: T014-T015 can start immediately. T016 depends on T001-T008 (screenshot must capture Finnish UI). T017 can start immediately.
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: No dependencies — can start immediately
- **User Story 3 (P2)**: No dependencies — can start immediately, fully independent of US1
- **User Story 2 (P2)**: Screenshot task (T016) depends on US1 completion (UI must be in Finnish before capture). README translation (T017) and script creation (T014-T015) have no dependencies.

### Within Each User Story

- US1: All 8 file translation tasks (T001-T008) are parallelizable. Test updates (T009) depend on translations. Verification (T010) is last.
- US3: Sequential — translate → update tests → verify.
- US2: Script creation (T014-T015) parallel. Screenshot capture (T016) after US1. README (T017) can be done anytime. Verify (T018) is last.

### Parallel Opportunities

- T001-T008: All 8 dashboard file translations can run in parallel (different files)
- T014 and T015: Screenshot script and npm script can be created in parallel
- US1 and US3: Can be worked on simultaneously (different codebases: frontend vs backend)
- T014-T015 and T017: Script creation and README translation can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all 8 file translations in parallel:
Task: "Translate site/index.html"
Task: "Translate site/js/app.js"
Task: "Translate site/js/components/overview.js"
Task: "Translate site/js/components/city-tabs.js"
Task: "Translate site/js/components/city-detail.js"
Task: "Translate site/js/components/status-badge.js"
Task: "Translate site/js/components/pr-list.js"
Task: "Translate site/js/components/history-view.js"

# Then sequentially:
Task: "Update E2E test assertions"
Task: "Run tests to verify"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 3: User Story 1 (all 8 files + test updates)
2. **STOP and VALIDATE**: Serve dashboard locally, verify Finnish UI
3. All E2E tests pass

### Incremental Delivery

1. US1: Dashboard in Finnish → Verify → Checkpoint (MVP!)
2. US3: Slack in Finnish → Verify → Checkpoint
3. US2: Screenshot script + README in Finnish → Capture screenshot → Checkpoint
4. Polish: Full cross-cutting validation

### Parallel Team Strategy

With multiple developers:
1. Developer A: User Story 1 (dashboard translation)
2. Developer B: User Story 3 (Slack translation) + T014-T015 (screenshot script)
3. After US1 complete: Run T016 (capture screenshot), then T017 (README)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Commit after each task or logical group
- All translations sourced from data-model.md mapping tables
- Console/debug messages stay in English per FR-013
