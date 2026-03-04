# Tasks: Feature Flag Tracker

**Input**: Design documents from `/specs/012-feature-flag-tracker/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Included — mandated by project constitution (II. Pragmatic Testing).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Add types, extend GitHub API, configure feature flag source file paths per city

- [X] T001 Add FeatureFlagData types (FeatureFlag, FeatureFlagCategory, FeatureFlagCity, FeatureFlagData) to `src/types.ts` per data-model.md TypeScript definitions
- [X] T002 [P] Add `getFileContent(owner, repo, path, ref?)` function to `src/api/github.ts` — uses existing `ghGet()` and `withRetry()`, fetches `/repos/{owner}/{repo}/contents/{path}?ref={ref}`, decodes base64 content to UTF-8 string
- [X] T003 [P] Add feature flag city configuration to `src/config/instances.ts` — define `FeatureFlagCityConfig` type and `FEATURE_FLAG_CITIES` array with all 12 cities, each specifying: id, name, cityGroupId, repository (owner/name), frontendPath (featureFlags.tsx), backendPath (Config.kt). Use paths from research.md §4

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement parsers, labels, collector service, and pipeline integration. All user stories depend on the data pipeline producing `data/feature-flags.json`.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 [P] Implement TypeScript featureFlags.tsx parser in `src/services/parsers/typescript-flags.ts` — export `parseTypeScriptFeatureFlags(source: string): Record<string, boolean | null>`. Handle Pattern A (inline `prod:` block in `features` object) and Pattern B (standalone `const prod: FeatureFlags = {}`). Parse boolean key-value pairs, flatten nested objects with dot notation (e.g., `daycareApplication.dailyTimes`), skip `environmentLabel`. See research.md §1
- [X] T005 [P] Implement Kotlin FeatureConfig parser in `src/services/parsers/kotlin-config.ts` — export `parseKotlinFeatureConfig(source: string): Record<string, boolean | number | string | null>`. Find `FeatureConfig(` constructor call, track bracket depth, split on top-level commas, parse each `key = value` pair. Handle booleans, numbers, null, `MonthDay.of()` → "MM-DD", enum references → extract name. Skip lambda fields (`archiveMetadataConfigs`). Exclude operational strings per FR-009. Apply FeatureConfig defaults for unset fields. See research.md §2
- [X] T006 [P] Create Finnish label mapping in `src/config/feature-labels.ts` — export `FEATURE_LABELS: Record<string, string>` covering all ~35 frontend flags and ~15 backend config fields. Labels derived from JSDoc comments in `types.d.ts` and `FeatureConfig.kt`, translated to Finnish. Include fallback logic: `getLabel(key: string): string` returns Finnish label or the raw key as fallback. See research.md §5
- [X] T007 [P] Write unit tests for TypeScript parser in `tests/unit/typescript-flags.test.ts` — test both Pattern A (Espoo-style inline prod) and Pattern B (trevaka-style standalone const prod) using fixture strings. Test: simple booleans, nested objects flattened to dot notation, environmentLabel skipped, optional flags present/absent, all flags parsed correctly
- [X] T008 [P] Write unit tests for Kotlin parser in `tests/unit/kotlin-config.test.ts` — test with fixture strings resembling real Config.kt files. Test: boolean parsing, number parsing, null values, MonthDay.of() → "MM-DD", enum references → name extraction, lambda skip, excluded operational strings, default values applied for unset fields, inline comments ignored
- [X] T009 Implement feature flag collector in `src/services/feature-flag-collector.ts` — export `collectFeatureFlags(cities: FeatureFlagCityConfig[]): Promise<FeatureFlagData>`. For each city: fetch frontend and backend files via `getFileContent()`, parse with respective parsers, apply labels, build FeatureFlagCategory arrays. Handle per-city errors gracefully (set `error` field, continue with other cities). Return complete FeatureFlagData per contracts/feature-flags-schema.md
- [X] T010 Write unit tests for collector in `tests/unit/feature-flag-collector.test.ts` — mock `getFileContent()`, test: successful collection from multiple cities, per-city error handling (one city fails, others succeed), correct category/flag structure in output, labels applied correctly
- [X] T011 [P] Write integration test for GitHub file content API in `tests/integration/feature-flag-api.test.ts` — use nock to mock GitHub contents endpoint, test: successful base64 content decode, ETag caching (304 response), error handling (404, 500), retry behavior
- [X] T012 Integrate feature flag collection into data pipeline in `src/index.ts` — call `collectFeatureFlags()` after existing deployment data collection, write result to `data/feature-flags.json`, include in `deploySite()` copy. Feature flag collection should not block or fail the existing pipeline (catch errors, log warnings)
- [X] T013 Update CI workflow to commit `data/feature-flags.json` in `.github/workflows/monitor.yml` — add `data/feature-flags.json` to the git add command alongside existing data files

**Checkpoint**: Pipeline produces valid `data/feature-flags.json` — user story implementation can now begin

---

## Phase 3: User Story 1 — Compare Feature Availability Across Cities (Priority: P1) 🎯 MVP

**Goal**: Display a side-by-side comparison matrix showing which features are enabled/disabled across all cities, with clear visual indicators

**Independent Test**: Navigate to `#/features`, verify a matrix with cities as columns and features as rows is displayed. Boolean values show distinct on/off/unset indicators. Differences are visually prominent.

- [X] T014 [US1] Add `#/features` route in `site/js/app.js` — register route handler that loads `data/feature-flags.json` via fetch, dynamically imports `feature-matrix.js`, renders the matrix view, and calls `updateTabs('features')`. Handle loading and error states
- [X] T015 [P] [US1] Extend tab bar to include "Ominaisuudet" tab in `site/js/components/city-tabs.js` — add a tab after the city tabs that navigates to `#/features`. Support `activeCityId === 'features'` for active state styling
- [X] T016 [US1] Create comparison matrix component in `site/js/components/feature-matrix.js` — export `renderFeatureMatrix(data: FeatureFlagData, options)` and `bindFeatureMatrixEvents()`. Render an HTML table with: 4 default city group columns (Espoo, Tampereen seutu, Oulu, Turku) per FR-010, feature flags as rows, boolean values as colored indicators (green checkmark for true, red X for false, gray dash for null/unset per FR-004). Rows where values differ across cities should have subtle background highlight for quick scanning
- [X] T017 [P] [US1] Add feature matrix CSS styles in `site/css/style.css` — styles for: `.feature-matrix` table layout, `.flag-true` / `.flag-false` / `.flag-unset` indicator colors, `.flag-differs` row highlight, sticky column headers, responsive horizontal scrolling, `.tab.active` support for features tab
- [X] T018 [US1] Implement Tampereen seutu column aggregation in `site/js/components/feature-matrix.js` — for each flag, check if all 8 Tampere-region cities have the same value. If identical: show shared value. If divergent: show majority value with a visual divergence indicator (e.g., asterisk or split icon). Add click/expand action on divergent cells to reveal individual municipality values per FR-010

**Checkpoint**: US1 complete — users can see a comparison matrix at `#/features` and identify differences between cities within seconds

---

## Phase 4: User Story 2 — Distinguish Frontend and Backend Feature Categories (Priority: P2)

**Goal**: Organize features by category with human-readable Finnish labels so non-technical stakeholders can understand the configuration

**Independent Test**: Verify the matrix shows two visually distinct sections (frontend/backend) with Finnish labels instead of code identifiers. Non-boolean values are hidden by default with a toggle to reveal them.

- [X] T019 [US2] Add category section headers and visual grouping in `site/js/components/feature-matrix.js` — render each category (`Käyttöliittymäominaisuudet`, `Taustajärjestelmän asetukset`) as a collapsible section with a header row spanning all columns. Category headers should be visually distinct from flag rows
- [X] T020 [US2] Add non-boolean values toggle per FR-009 in `site/js/components/feature-matrix.js` — boolean backend flags shown by default. Non-boolean flags (type `number`, `enum`) hidden by default. Add a toggle button "Näytä asetusarvot" that reveals non-boolean rows. When shown, display actual values (numbers, enum names) instead of on/off indicators. Persist toggle state in URL query param `?showValues=true`

**Checkpoint**: US2 complete — features are organized by category with Finnish labels, non-boolean toggle works

---

## Phase 5: User Story 3 — View City-Specific Feature Summary (Priority: P3)

**Goal**: Show a feature flag summary on individual city detail pages so city stakeholders can see their configuration without the comparison view

**Independent Test**: Navigate to `#/city/espoo`, verify a feature flag summary section is visible showing enabled/disabled features for Espoo.

- [X] T021 [US3] Add feature flag summary section to city detail view in `site/js/components/city-detail.js` — load `data/feature-flags.json` in the city detail route handler (`site/js/app.js`), pass feature data to `renderCityDetail()`. Render a collapsible "Ominaisuudet" section at the bottom of the city detail page showing the city's flags grouped by category. For `tampere-region` cities, show the aggregated Tampereen seutu values. Display enabled flags with green indicator, disabled with red, unset with gray

**Checkpoint**: US3 complete — each city detail page shows its own feature flag summary

---

## Phase 6: User Story 4 — Filter and Focus the Feature Matrix (Priority: P3)

**Goal**: Allow users to filter the matrix to show only features that differ between displayed cities, reducing noise

**Independent Test**: Toggle "differences only" filter, verify rows where all cities have identical values are hidden. Toggle off, verify all rows return. When no differences exist, show informative message.

- [X] T022 [US4] Add "differences only" filter in `site/js/components/feature-matrix.js` — add a toggle button "Näytä vain erot" above the matrix. When active: hide rows where all displayed city group columns have the same value. When no differences exist after filtering, show message "Ei eroja kaupunkien välillä". Persist state in URL query param `?differencesOnly=true`. Toggle off restores all rows per FR-007

**Checkpoint**: US4 complete — users can focus on divergent features across cities

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: E2E tests, CI integration, screenshot, final validation

- [X] T023 Write E2E tests for feature matrix view in `tests/e2e/feature-matrix.spec.ts` — test: navigation to #/features shows matrix, "Ominaisuudet" tab is active, boolean indicators render correctly, Tampereen seutu expand works, category sections visible, differences-only filter works, non-boolean toggle works, city detail feature summary visible
- [X] T024 Regenerate screenshot via `npm run screenshot` — the new "Ominaisuudet" tab is a major visual change per constitution §Development Workflow
- [X] T025 Run full validation: `npm test && npm run lint && npm run test:e2e` — all 5 CI gates must pass (lint, type, test, E2E, build)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — BLOCKS all user stories
- **User Stories (Phase 3–6)**: All depend on Phase 2 completion
  - US1 (P1): Can start immediately after Phase 2
  - US2 (P2): Can start after US1 (builds on feature-matrix.js)
  - US3 (P3): Can start after Phase 2 — independent of US1/US2 (different files)
  - US4 (P3): Can start after US1 (adds filter to feature-matrix.js)
- **Polish (Phase 7)**: Depends on all user stories being complete

### Within Phase 2 (Parallel Opportunities)

- T004, T005, T006 can all run in parallel (different files, no dependencies)
- T007 depends on T004; T008 depends on T005 (test their respective parsers)
- T007, T008, T011 can run in parallel with each other
- T009 depends on T004, T005, T006 (uses all three)
- T010 depends on T009
- T012 depends on T009
- T013 can run in parallel with T012

### Within Phase 3 (US1)

- T014 and T015 can start in parallel (different files)
- T016 depends on T014 (route must exist to render into)
- T017 can run in parallel with T016 (CSS vs JS)
- T018 depends on T016 (extends the matrix component)

### Cross-Story Parallelism

- US3 (T021) can run in parallel with US1/US2/US4 (touches city-detail.js, not feature-matrix.js)
- US2 and US4 both modify feature-matrix.js — run sequentially (US2 → US4)

---

## Parallel Example: Phase 2

```
# Launch all three foundational modules in parallel:
Task T004: "TypeScript parser in src/services/parsers/typescript-flags.ts"
Task T005: "Kotlin parser in src/services/parsers/kotlin-config.ts"
Task T006: "Finnish labels in src/config/feature-labels.ts"

# After parsers complete, launch tests in parallel:
Task T007: "TS parser tests in tests/unit/typescript-flags.test.ts"
Task T008: "Kotlin parser tests in tests/unit/kotlin-config.test.ts"
Task T011: "API integration tests in tests/integration/feature-flag-api.test.ts"

# Then: collector → collector tests → pipeline integration
```

## Parallel Example: User Stories

```
# After Phase 2 completes, US1 and US3 can start in parallel:
Task T014+T016: "Feature matrix route + component (US1)"
Task T021: "City detail feature summary (US3)"

# After US1 completes, US2 and US4 run sequentially:
Task T019+T020: "Categories and non-boolean toggle (US2)"
Task T022: "Differences-only filter (US4)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T003)
2. Complete Phase 2: Foundational (T004–T013) — pipeline produces `data/feature-flags.json`
3. Complete Phase 3: User Story 1 (T014–T018) — comparison matrix visible at `#/features`
4. **STOP and VALIDATE**: Navigate to `#/features`, verify matrix displays with correct data
5. Deploy if ready — MVP delivers immediate value

### Incremental Delivery

1. Setup + Foundational → Pipeline ready
2. Add US1 → Comparison matrix → Deploy (MVP!)
3. Add US2 → Categories + labels + non-boolean toggle → Deploy
4. Add US3 → City detail summaries → Deploy
5. Add US4 → Differences filter → Deploy
6. Polish → E2E tests, screenshot, full validation → Deploy

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Parser fixtures should use actual source code samples from the eVaka repositories at /Volumes/evaka/
