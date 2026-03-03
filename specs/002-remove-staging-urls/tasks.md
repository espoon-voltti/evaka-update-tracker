# Tasks: Remove Staging/Testing URLs from Codebase

**Input**: Design documents from `/specs/002-remove-staging-urls/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md

**Tests**: Unit tests are included for the new staging config parsing module per constitution requirement (II. Pragmatic Testing — every service module must have unit tests).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Add new types needed by the staging config module

- [x] T001 Add `StagingInstanceInput` and `StagingEnvironmentInput` interfaces to `src/types.ts` per data-model.md schema

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create the staging config parsing and merging module that all user stories depend on

**⚠️ CRITICAL**: US1 source code changes depend on this phase being complete

- [x] T002 Create `src/config/staging.ts` with `parseStagingInstances()` function that parses the `STAGING_INSTANCES` env var JSON string into `StagingEnvironmentInput[]`, returning empty array on missing/empty/invalid input (log warning on invalid JSON)
- [x] T003 Add `mergeStagingEnvironments()` function to `src/config/staging.ts` that takes production-only `CityGroup[]` and `StagingEnvironmentInput[]`, resolves `authEnvPrefix` to `BasicAuth` objects from env vars, and returns `CityGroup[]` with staging environments appended to matching city groups (skip unknown `cityGroupId` with warning)
- [x] T004 Create `tests/unit/staging-config.test.ts` with tests for: valid JSON parsing, empty/missing env var, invalid JSON (warning logged), `authEnvPrefix` resolution to `BasicAuth`, unknown `cityGroupId` handling, empty instances array validation

**Checkpoint**: Staging config parsing module is ready and tested — user story implementation can begin

---

## Phase 3: User Story 1 — Remove Staging URLs from Source Code (Priority: P1) 🎯 MVP

**Goal**: Remove all hardcoded staging/test domain URLs from application source code and replace with runtime configuration via `STAGING_INSTANCES` env var

**Independent Test**: Search all `src/` files for known staging/test domain patterns and confirm zero matches. Run `npm test` and confirm all tests pass. Run the data fetcher with `DRY_RUN=true` and confirm production monitoring works without `STAGING_INSTANCES` set.

### Implementation for User Story 1

- [x] T005 [US1] Modify `src/config/instances.ts`: remove all staging environment blocks from `CITY_GROUPS` (keep only production environments), change export from `const CITY_GROUPS` to a `getCityGroups()` function that calls `parseStagingInstances()` and `mergeStagingEnvironments()` to merge staging environments at runtime
- [x] T006 [US1] Update `src/index.ts`: replace `import { CITY_GROUPS }` with `import { getCityGroups }` and call `const cityGroups = getCityGroups()` after `loadEnv()`, update the `for` loop to use the local variable
- [x] T007 [P] [US1] Update `.env.example`: remove the Oulu staging URL from the comment, add `STAGING_INSTANCES` variable with a placeholder JSON example (no real domains)
- [x] T008 [P] [US1] Update `.github/workflows/monitor.yml`: add `STAGING_INSTANCES: ${{ secrets.STAGING_INSTANCES }}` to the `env` block of the "Run deployment monitor" step

**Checkpoint**: Source code contains zero staging URLs. Production monitoring works. Staging monitoring works when `STAGING_INSTANCES` is provided via env var.

---

## Phase 4: User Story 2 — Remove Staging URLs from Documentation (Priority: P2)

**Goal**: Remove direct staging/test domain URLs from all documentation files while preserving the information that staging environments exist

**Independent Test**: Search all `.md` files for staging domain patterns and confirm zero direct URL matches. Confirm README and spec files still describe the staging monitoring capability generically.

### Implementation for User Story 2

- [x] T009 [P] [US2] Update `README.md`: replace staging domain columns in the Monitored Cities table with "via `STAGING_INSTANCES` env var", update the Environment Variables table to add `STAGING_INSTANCES`, update instance count text, remove Oulu staging URL reference from the Required setup note
- [x] T010 [P] [US2] Update `specs/001-deployment-tracker/spec.md`: in the Monitored Instances section (lines 148-177), remove all specific staging/test domain names while keeping the structure (e.g., "Staging: configured via environment variable"), remove the HTTP basic auth URL reference on line 172

**Checkpoint**: Documentation describes staging monitoring generically without any direct URLs

---

## Phase 5: User Story 3 — Remove Staging URLs from Test Fixtures (Priority: P2)

**Goal**: Replace real staging domain names in test fixtures with synthetic placeholder domains

**Independent Test**: Search `tests/` directory for staging domain patterns and confirm only synthetic `.test` TLD domains are used. Run `npm test` and confirm all 69+ tests pass.

### Implementation for User Story 3

- [x] T011 [US3] Update `tests/fixtures/sample-data.ts`: replace real staging domain (line 35) with `staging.example.evaka.test` and update the corresponding environment ID reference `espoo-staging` to use the placeholder domain consistently
- [x] T012 [US3] Update any test files that import from `src/config/instances.ts` to use `getCityGroups()` instead of `CITY_GROUPS` if applicable, verify no test file references real staging domains

**Checkpoint**: All tests pass with synthetic domains. No real staging URLs in test files.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup across all changes

- [x] T013 Run full validation: `npm test && npm run lint` — confirm all tests pass and zero lint errors (4 pre-existing lint errors in files not modified by this feature)
- [x] T014 Search entire codebase for remaining staging URL patterns: grep for known staging/test domain patterns — confirm zero matches in source, tests, and documentation
- [x] T015 Verify the data fetcher compiles with `tsc --noEmit` and project structure supports `DRY_RUN=true` production-only mode

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (types) — BLOCKS US1
- **US1 (Phase 3)**: Depends on Phase 2 (staging module) — the core change
- **US2 (Phase 4)**: No code dependencies — can start after Phase 1 or in parallel with US1
- **US3 (Phase 5)**: Depends on US1 (needs `getCityGroups()` export change)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Depends on Foundational (Phase 2). This is the MVP — source code free of staging URLs.
- **User Story 2 (P2)**: Independent of other stories — documentation changes only. Can run in parallel with US1.
- **User Story 3 (P2)**: Depends on US1 (test fixtures may import from modified `instances.ts`).

### Within Each User Story

- T005 before T006 (instances.ts export change before index.ts import change)
- T007 and T008 are parallel with each other and with T005/T006

### Parallel Opportunities

- T007 and T008 can run in parallel (different files, no dependencies)
- T009 and T010 can run in parallel (different documentation files)
- US2 (Phase 4) can run in parallel with US1 (Phase 3) — documentation vs source code

---

## Parallel Example: User Story 1

```
# These can run in parallel (different files):
T007: Update .env.example
T008: Update .github/workflows/monitor.yml

# These must be sequential:
T005: Modify src/config/instances.ts (export change)
T006: Update src/index.ts (import change, depends on T005)
```

## Parallel Example: User Story 2

```
# These can run in parallel (different files):
T009: Update README.md
T010: Update specs/001-deployment-tracker/spec.md
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Add types to `src/types.ts`
2. Complete Phase 2: Create `src/config/staging.ts` + tests
3. Complete Phase 3: Modify `instances.ts`, `index.ts`, `.env.example`, workflow
4. **STOP and VALIDATE**: Run `npm test`, search for staging URLs in `src/`, run `DRY_RUN=true`
5. Core goal achieved — source code is clean

### Incremental Delivery

1. Setup + Foundational → Staging parsing module ready
2. Add US1 → Source code clean → Validate independently (MVP!)
3. Add US2 → Documentation clean → Validate independently
4. Add US3 → Test fixtures clean → Validate independently
5. Polish → Full validation sweep

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Total tasks: 15
- US1 tasks: 4 (T005-T008)
- US2 tasks: 2 (T009-T010)
- US3 tasks: 2 (T011-T012)
- Setup/Foundational tasks: 4 (T001-T004)
- Polish tasks: 3 (T013-T015)
- Commit after each phase or logical group
- Stop at any checkpoint to validate story independently
