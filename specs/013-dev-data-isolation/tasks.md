# Tasks: Dev Data Isolation

**Input**: Design documents from `/specs/013-dev-data-isolation/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md

**Tests**: No test tasks explicitly requested. Existing E2E and unit tests must continue to pass.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Gitignore and documentation changes that support all user stories

- [x] T001 [P] Add `.data/` and `site/data` to `.gitignore`
  - Append `.data/` under a new `# Local dev data` comment section
  - Append `site/data` to prevent symlink target changes from creating diffs
  - File: `.gitignore`

- [x] T002 [P] Remove tracked `site/data` symlink from git index
  - Run `git rm --cached site/data` to stop tracking the symlink (keeps the file on disk)
  - The symlink file itself remains for local dev; it just won't be committed anymore
  - After this, `site/data` changes will be ignored by git

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core DATA_DIR resolution logic that all user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Update DATA_DIR resolution logic in `src/index.ts`
  - Replace the current line 28 (`const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.resolve('data');`) with a resolution chain:
    1. If `DATA_DIR` env var is set → use it (highest priority, preserves existing override)
    2. If `CI` env var is truthy → use `data/` (CI behavior unchanged)
    3. Otherwise → use `.data/` (local dev default)
  - The resolved path must still use `path.resolve()` for absolute path consistency
  - Existing `SITE_DIR` and `DIST_DIR` logic remains unchanged
  - File: `src/index.ts`

**Checkpoint**: Foundation ready — the pipeline now resolves the correct data directory based on environment

---

## Phase 3: User Story 1 — Local Development Without Git Conflicts (Priority: P1) 🎯 MVP

**Goal**: Running the pipeline locally writes to `.data/` (gitignored), eliminating merge conflicts on `data/` files

**Independent Test**: Run `npm start` locally, then `git status` — no tracked files should be modified. Open `site/index.html` — local data should be displayed.

### Implementation for User Story 1

- [x] T004 [US1] Update pipeline to create `.data/` directory on first local run in `src/index.ts`
  - The existing `fs.mkdirSync(DATA_DIR, { recursive: true })` on line 255 already handles this — verify it works for `.data/` path
  - No code change expected; just verify the existing `mkdirSync` call covers the new default
  - File: `src/index.ts`

- [x] T005 [US1] Update site symlink dynamically after data directory resolution in `src/index.ts`
  - After resolving `DATA_DIR`, update the `site/data` symlink to point to the resolved data directory
  - Use `fs.rmSync` + `fs.symlinkSync` to replace the symlink target with a relative path from `site/` to the resolved data dir
  - This ensures `site/index.html` loads data from whichever directory the pipeline used
  - Only update if the symlink target differs from the resolved path (avoid unnecessary writes)
  - Add this logic after the `DATA_DIR` resolution and before the pipeline runs (so the site is ready during and after the run)
  - File: `src/index.ts`

- [x] T006 [US1] Verify the `deploySite()` function works with `.data/` as `dataDir` input
  - `deploySite(SITE_DIR, DATA_DIR, DIST_DIR)` already receives `DATA_DIR` as a parameter — no changes needed
  - Verify by reading `src/services/site-deployer.ts` and confirming it copies from whatever `dataDir` path it receives
  - File: `src/services/site-deployer.ts` (read-only verification, likely no change needed)

**Checkpoint**: User Story 1 complete — local pipeline runs produce zero git diffs on tracked files

---

## Phase 4: User Story 2 — Zero-Configuration Local Setup (Priority: P2)

**Goal**: Local data isolation works automatically with no `.env` file or env var setup. CI continues using `data/`.

**Independent Test**: On a fresh clone with no `.env`, run `npm start` — data should go to `.data/`. Set `CI=true npm start` — data should go to `data/`.

### Implementation for User Story 2

- [x] T007 [US2] Verify CI environment detection works without configuration changes
  - The `CI` env var is set automatically by GitHub Actions — no workflow changes needed
  - Verify by reading `.github/workflows/monitor.yml` and confirming no `DATA_DIR` is set (so the resolution falls through to the `CI` check)
  - File: `.github/workflows/monitor.yml` (read-only verification, no change needed)

- [x] T008 [US2] Document `DATA_DIR` override in `.env.example`
  - Add a `DATA_DIR` entry with a comment explaining the resolution order
  - Document that it defaults to `.data/` locally and `data/` in CI
  - Mention `DATA_DIR=data` as the way to force the old behavior
  - File: `.env.example`

**Checkpoint**: User Story 2 complete — zero configuration required for local dev; CI behavior preserved

---

## Phase 5: User Story 3 — Committed Data Remains Available (Priority: P3)

**Goal**: The tracked `data/` directory and its CI-committed files remain in the repository, unchanged.

**Independent Test**: After all changes, confirm `data/*.json` files are still tracked by git and the CI workflow still commits to `data/`.

### Implementation for User Story 3

- [x] T009 [US3] Verify `data/` directory files remain tracked and unmodified
  - Run `git ls-files data/` to confirm all JSON files are still tracked
  - Confirm `.gitignore` does NOT include `data/` (only `.data/`)
  - No code changes — this is a verification task
  - File: `data/` (read-only verification)

- [x] T010 [US3] Verify CI workflow `git add data/` still works correctly
  - The monitor workflow (`.github/workflows/monitor.yml` line 50) runs `git add data/` — this remains correct because CI uses `DATA_DIR=data/` via the `CI` env var detection
  - No workflow changes needed
  - File: `.github/workflows/monitor.yml` (read-only verification)

**Checkpoint**: User Story 3 complete — committed data preserved, CI deploy pipeline unchanged

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validation and cleanup across all stories

- [x] T011 Run existing test suite (`npm test && npm run lint`) and verify all tests pass
  - Existing unit tests and linting must still pass with the DATA_DIR resolution change
  - E2E tests set `DATA_DIR` explicitly, so they bypass the new logic entirely

- [x] T012 Run E2E tests (`npm run test:e2e`) and verify they pass
  - E2E tests use `process.env.DATA_DIR = TEST_DATA_DIR` which takes highest priority
  - The new CI detection logic should have zero impact on E2E tests

- [x] T013 Validate quickstart.md scenarios manually
  - Run `npm start` locally → confirm data written to `.data/`
  - Run `DATA_DIR=data npm start` → confirm data written to `data/`
  - Open `site/index.html` → confirm local data is displayed

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Can start immediately (independent of Phase 1)
- **User Story 1 (Phase 3)**: Depends on Phase 2 (T003)
- **User Story 2 (Phase 4)**: Depends on Phase 2 (T003); can run in parallel with US1
- **User Story 3 (Phase 5)**: Depends on Phase 1 + Phase 2; can run in parallel with US1/US2
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Depends on T003 (foundational). No dependencies on other stories.
- **User Story 2 (P2)**: Depends on T003 (foundational). Independent of US1.
- **User Story 3 (P3)**: Depends on T001 (gitignore) + T002 (untrack symlink) + T003 (resolution logic). Purely verification — independent of US1/US2.

### Parallel Opportunities

- T001 and T002 can run in parallel (Phase 1)
- T001/T002 and T003 can run in parallel (Phase 1 and Phase 2 are independent)
- US1, US2, and US3 can all start in parallel once T003 completes
- T007 and T008 can run in parallel (Phase 4)

---

## Parallel Example: Phase 1 + Phase 2

```bash
# These can all run simultaneously:
Task T001: "Add .data/ and site/data to .gitignore"
Task T002: "Remove tracked site/data symlink from git index"
Task T003: "Update DATA_DIR resolution logic in src/index.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001, T002) — gitignore + untrack symlink
2. Complete Phase 2: Foundational (T003) — DATA_DIR resolution logic
3. Complete Phase 3: User Story 1 (T004, T005, T006) — local pipeline uses `.data/`
4. **STOP and VALIDATE**: Run pipeline, check `git status`, open site
5. If clean: MVP is done

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → MVP!
3. Add User Story 2 → Add docs, verify CI detection
4. Add User Story 3 → Verify committed data untouched
5. Polish → Run full test suite, validate quickstart

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- T006, T007, T009, T010 are verification tasks (read-only) — they may result in "no change needed"
- The core implementation is just T003 (resolution logic) and T005 (symlink update) — everything else is config or verification
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
