# Tasks: Populate History Data & Fix History Display

**Input**: Design documents from `/specs/004-populate-history-data/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md

**Tests**: Unit tests included per constitution requirement (Pragmatic Testing: every service module must have unit tests).

**Organization**: Tasks grouped by user story. US2 (backfill) is implemented first since it produces the data that US1 (display) verifies. US3 (live tracker fix) is independent.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: No new dependencies or project structure changes needed. Existing project already has all required dependencies (axios, nock, jest, ts-node/tsx).

- [x] T001 Create `src/scripts/` directory for backfill script

---

## Phase 2: User Story 2 — Populate History from Log Exports (Priority: P1) 🎯 MVP

**Goal**: Create a one-time backfill script that reads `update_history/*.json` log exports, converts consecutive entries into deployment events, fetches PR details from GitHub API, and writes enriched events to `data/history.json`.

**Independent Test**: Run `npx tsx src/scripts/backfill-history.ts` and verify `data/history.json` contains events with non-empty `includedPRs` arrays for all 8 environments.

### Tests for User Story 2

- [x] T002 [P] [US2] Create unit tests for log entry parsing and environment mapping in `tests/unit/backfill-history.test.ts`
  - Test: parse update_history JSON entries sorted chronologically (oldest first)
  - Test: environment mapping correctness (`tre-prod` → `tampere-prod`/`tampere-region`, etc.)
  - Test: skip consecutive entries with identical `appCommit` (no actual change)
  - Test: first entry produces event with `previousCommit: null`
  - Test: consecutive entries with different commits produce correct event pairs
  - Test: deduplication removes existing events that conflict with backfilled events (same environmentId + repoType + newCommit.sha)

### Implementation for User Story 2

- [x] T003 [US2] Define environment mapping constant in `src/scripts/backfill-history.ts`
  - Map all 8 update_history filenames to environment IDs, city group IDs, and repository configs per research.md R-002 table
  - Include wrapper repo config (owner, name, type, submodulePath, defaultBranch) for Tampere/Oulu/Turku; null for Espoo
  - Include core repo config (espoon-voltti/evaka) for all environments

- [x] T004 [US2] Implement log entry parser in `src/scripts/backfill-history.ts`
  - Read each `update_history/*.json` file
  - Parse JSON array of `{ @timestamp, message, appCommit }` entries
  - Sort entries chronologically (oldest first — the files are sorted newest-first)
  - Filter out consecutive entries with identical `appCommit` values (FR-010)
  - Return pairs of (previousEntry, newEntry) representing deployment changes

- [x] T005 [US2] Implement event builder in `src/scripts/backfill-history.ts`
  - For each (previousEntry, newEntry) pair and its environment mapping:
    - For wrapper cities: call `getCommit()` on wrapper repo for both SHAs to get CommitInfo
    - For wrapper cities: call `getSubmoduleRef()` to resolve core SHA from wrapper at newEntry commit
    - For wrapper cities: call `getSubmoduleRef()` to resolve core SHA from wrapper at previousEntry commit (if it exists)
    - For Espoo (core-only): call `getCommit()` on core repo for both SHAs
    - Create wrapper DeploymentEvent if wrapper commit changed (wrapper cities only)
    - Create core DeploymentEvent if core commit changed
    - Use `collectPRsBetween()` to fetch PRs for each event's commit range (do NOT filter bots — include all PRs for historical completeness)
    - Handle GitHub API failures gracefully: catch errors, create event with empty `includedPRs`, log warning (FR-009)
    - Set `detectedAt` to the newEntry's `@timestamp` converted to ISO 8601

- [x] T006 [US2] Implement deduplication and merge logic in `src/scripts/backfill-history.ts`
  - Read existing `data/history.json` using `readHistory()` from history-manager
  - Build uniqueness key set from backfilled events: `environmentId + repoType + newCommit.sha`
  - Filter out existing events that have matching keys (backfilled versions replace existing empty-PR events)
  - Merge remaining existing events with backfilled events
  - Sort all events by `detectedAt` descending (FR-008)
  - Write merged history using `writeHistory()` from history-manager

- [x] T007 [US2] Implement main entry point in `src/scripts/backfill-history.ts`
  - Load `.env` for `GH_TOKEN`
  - Call `initGitHubClient()` with token
  - Iterate over all environment mapping entries
  - Call log parser, then event builder for each file
  - Call dedup/merge at the end
  - Add progress logging (which file is being processed, how many events created, how many API calls)
  - Add npm script `"backfill"` to `package.json`: `"npx tsx src/scripts/backfill-history.ts"`

**Checkpoint**: Backfill script is complete. Run it to populate `data/history.json` with enriched deployment events.

---

## Phase 3: User Story 3 — Fix Live Tracker PR Collection (Priority: P2)

**Goal**: Fix the bug in `src/index.ts` where `detectChanges()` is called with an empty array `[]` for `includedPRs`, so future deployment events have PR details.

**Independent Test**: Run the live tracker when a version change occurs and verify the new history event has non-empty `includedPRs`.

### Implementation for User Story 3

- [x] T008 [US3] Fix `detectChanges()` call in `src/index.ts` to pass collected PRs instead of empty array
  - In the inner environment loop (around line 108), when a version change is detected:
    - Determine which repos changed (wrapper SHA changed, core SHA changed, or both)
    - For changed wrapper repo: call `collectPRsBetween(wrapperRepo, prevWrapperSha, currentWrapperSha)`
    - For changed core repo: call `collectPRsBetween(coreRepo, prevCoreSha, currentCoreSha)`
    - Combine wrapper and core PRs into a single array
    - Pass the combined array to `detectChanges()` (which already filters by repoType internally)
  - Import `collectPRsBetween` if not already imported (it is already imported)
  - Ensure the fix only collects PRs when there is actually a change (both previous and current SHAs exist and differ)

- [x] T009 [US3] Add/update unit test verifying PRs are passed through in `tests/unit/change-detector.test.ts`
  - The existing tests already verify PR filtering in `detectChanges()` — confirm they still pass
  - Add an integration-level note or comment confirming the bug fix in `src/index.ts`

**Checkpoint**: Live tracker now produces history events with populated `includedPRs` for detected version changes.

---

## Phase 4: User Story 1 — Verify History Display (Priority: P1)

**Goal**: Confirm that the history view in the site correctly displays PR details for events with populated `includedPRs` arrays.

**Independent Test**: Navigate to any city's history page and verify deployment cards show expandable PR lists with number, title, author, and link.

### Verification for User Story 1

- [x] T010 [US1] Run backfill script and verify `data/history.json` output
  - Execute `npx tsx src/scripts/backfill-history.ts`
  - Verify events exist for all 8 environments
  - Verify at least 80% of events with commit ranges have non-empty `includedPRs` (SC-002)
  - Spot-check a few events: PR numbers, titles, authors, and URLs are correct

- [x] T011 [US1] Rebuild site and verify history view displays PR details
  - Run `npm start` (or just the site deployer) to copy data to dist
  - Serve the site locally and navigate to each city's history page
  - Verify: events with `includedPRs` show expandable "N PR(s) included" summary
  - Verify: clicking summary expands to show PR number, title, author, and GitHub link
  - Verify: events without PRs (first deployments, API failures) still show "No PR details available"
  - Verify: bot PRs are visible in historical events (per US1 acceptance scenario 3)

**Checkpoint**: All user stories verified. History view shows PR details for all cities.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final quality checks

- [x] T012 Run full test suite: `npm test && npm run lint`
- [x] T013 Run TypeScript type check: `npx tsc --noEmit`
- [x] T014 Verify no regressions in existing E2E tests: `npm run test:e2e`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — trivial directory creation
- **Phase 2 (US2 — Backfill)**: Depends on Phase 1 — main implementation work
- **Phase 3 (US3 — Bug Fix)**: No dependency on Phase 2 — can run in parallel
- **Phase 4 (US1 — Verify)**: Depends on Phase 2 completion (needs backfilled data)
- **Phase 5 (Polish)**: Depends on Phases 2 and 3

### User Story Dependencies

- **US2 (Backfill)**: Independent — can start immediately after setup
- **US3 (Bug Fix)**: Independent — can start immediately after setup, parallel with US2
- **US1 (Verify Display)**: Depends on US2 (needs populated data to verify)

### Within User Story 2

```
T002 (tests) ──┐
T003 (mapping) ─┤
                ├──→ T004 (parser) → T005 (event builder) → T006 (dedup) → T007 (main entry)
```

### Parallel Opportunities

- **T002 and T003** can run in parallel (tests vs. mapping constant — different concerns)
- **Phase 2 (US2) and Phase 3 (US3)** can run in parallel (different files, no dependency)
- **T012, T013, T014** in Polish phase can run in parallel

---

## Parallel Example: User Story 2

```bash
# These can run in parallel (different files, no dependencies):
Task T002: "Unit tests for backfill in tests/unit/backfill-history.test.ts"
Task T003: "Environment mapping constant in src/scripts/backfill-history.ts"

# Then sequentially:
Task T004: "Log entry parser" (depends on T003 mapping)
Task T005: "Event builder" (depends on T004 parser)
Task T006: "Dedup/merge" (depends on T005 events)
Task T007: "Main entry point" (depends on all above)
```

---

## Implementation Strategy

### MVP First (User Story 2 Only)

1. Complete Phase 1: Setup (trivial)
2. Complete Phase 2: US2 — Backfill script
3. Run backfill to populate `data/history.json`
4. **STOP and VALIDATE**: Check history view shows PR details
5. If successful, proceed to US3 bug fix

### Incremental Delivery

1. Phase 1 → Setup ready
2. Phase 2 (US2) → Backfill data available → Verify display (US1) → Deploy
3. Phase 3 (US3) → Future events also have PRs → Deploy
4. Phase 5 → Final quality checks

---

## Notes

- The frontend (`site/js/components/history-view.js`) requires NO changes — it already renders PR details when `includedPRs` is populated (R-006)
- The backfill script uses existing services (`collectPRsBetween`, `getCommit`, `getSubmoduleRef`, `readHistory`, `writeHistory`) — DRY principle (constitution I)
- Bot PRs are included in historical events (no `filterHumanPRs` call) for completeness — only the live tracker's current.json view filters bots
- Expect ~200-400 GitHub API calls for full backfill — well within 5,000/hour rate limit (R-004)
