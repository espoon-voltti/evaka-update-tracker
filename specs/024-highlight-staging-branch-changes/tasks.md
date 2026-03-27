# Tasks: Highlight Staging Branch Changes

**Input**: Design documents from `/specs/024-highlight-staging-branch-changes/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md

**Tests**: Tests are included per Constitution §II (Pragmatic Testing) — every service module and API integration requires tests.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Capture mockups and extend data model types before any implementation

- [x] T001-MK Capture "before" mockups of the GH Pages history view and Slack staging notifications. Run `npm run capture-views` or manually create mockups. Save to `specs/024-highlight-staging-branch-changes/mockups-before.md`. This MUST happen before any implementation changes.
- [x] T002 [P] Add `branch?: string | null` and `isDefaultBranch?: boolean` optional fields to `DeploymentEvent` interface in `src/types.ts`
- [x] T003 [P] Add `isBranchDeployment?: boolean` and `branchName?: string | null` optional fields to `StagingContext` interface in `src/types.ts`

---

## Phase 2: Foundational (Branch Detection API)

**Purpose**: Core branch detection infrastructure that all user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Add `isCommitOnDefaultBranch(owner, repo, defaultBranch, commitSha)` function to `src/api/github.ts` — uses existing `compareShas()` to call `compare/{defaultBranch}...{commitSha}`, returns `{ onDefaultBranch: boolean, branchName: string | null }`. If compare returns >0 commits, commit is not on default branch. On API error, return `{ onDefaultBranch: true, branchName: null }` as safe fallback.
- [x] T005 Add `getBranchesWhereHead(owner, repo, sha)` helper to `src/api/github.ts` — calls `GET /repos/{owner}/{repo}/commits/{sha}/branches-where-head`, returns branch names. Used by `isCommitOnDefaultBranch` when commit is off default branch to find the branch name.
- [x] T006 Add integration tests for `isCommitOnDefaultBranch()` and `getBranchesWhereHead()` in `tests/integration/github-api.test.ts` — mock compare API responses (0 commits = on default, >0 = off default) and branches-where-head responses. Test API error fallback behavior.
- [x] T007 Wire branch detection into the event creation flow in `src/index.ts` — after detecting a staging environment change, call `isCommitOnDefaultBranch()` for each repo type (core/wrapper) and populate the `branch` and `isDefaultBranch` fields on the `DeploymentEvent` before sending Slack notifications
- [x] T008 Update `detectChanges()` in `src/services/change-detector.ts` to accept and pass through optional `branch` and `isDefaultBranch` parameters when creating `DeploymentEvent` objects
- [x] T009 Update unit tests in `tests/unit/change-detector.test.ts` — add test cases verifying that `branch` and `isDefaultBranch` fields are correctly included in events when provided, and absent/undefined when not provided

**Checkpoint**: Branch detection works end-to-end — new deployment events include branch info for staging environments

---

## Phase 3: User Story 1 - Staging Branch Detection in Slack (Priority: P1) MVP

**Goal**: Slack notifications clearly indicate when a staging environment runs a non-default branch, replacing misleading PR lists with branch context

**Independent Test**: Deploy a non-main branch to staging → verify Slack message shows branch name, different header, and no misleading PR list

### Implementation for User Story 1

- [x] T010 [US1] Populate `StagingContext.isBranchDeployment` and `StagingContext.branchName` in `src/index.ts` — set based on whether any event for the staging environment has `isDefaultBranch === false`, derive branch name from event's `branch` field
- [x] T011 [US1] Modify `buildSlackMessage()` in `src/api/slack.ts` to handle branch deployments — when `stagingContext?.isBranchDeployment` is true: change header emoji to 🔀, change env label to "Staging / haaran testaus", show branch name in version field, replace PR changes section with a note explaining this is a branch deployment
- [x] T012 [US1] Modify `buildVersionField()` in `src/api/slack.ts` to include branch name when `stagingContext?.branchName` is available — e.g. "Versio: `438b2c8` (haara: feature/my-change)"
- [x] T013 [US1] Modify `buildChangesSection()` in `src/api/slack.ts` to show "Haaran testaus — PR-muutokset eivät ole vertailukelpoisia" instead of the normal PR list when the event has `isDefaultBranch === false`
- [x] T014 [US1] Update Slack staging context section in `buildSlackMessage()` in `src/api/slack.ts` — when `isBranchDeployment` is true, replace the "+N changes vs production" text with branch-aware messaging (e.g. "Haaraa testataan staging-ympäristössä")
- [x] T015 [US1] Add/update integration tests in `tests/integration/slack-api.test.ts` — test `buildSlackMessage()` with branch deployment context: verify header, version field with branch name, changes section replacement, and context section. Also test that normal staging messages are unchanged when `isBranchDeployment` is false/undefined
- [x] T016 [US1] Verify existing Slack tests still pass for normal (non-branch) staging and production deployments — ensure no regressions in `tests/integration/slack-api.test.ts`

**Checkpoint**: Slack notifications correctly differentiate branch deployments from normal staging updates. Run `npm test` to verify.

---

## Phase 4: User Story 2 - Commit IDs with Links in History View (Priority: P2)

**Goal**: History view entries show short commit IDs as clickable links to GitHub commit pages

**Independent Test**: View the history page → each release entry shows linked short commit SHAs with repo type labels

### Implementation for User Story 2

- [x] T017 [P] [US2] Add a `getCommitUrl(event)` helper function in `site/js/components/history-view.js` — derive GitHub commit URL from `event.newCommit.sha`, `event.repoType`, and `event.includedPRs[0]?.repository`. For core events use `espoon-voltti/evaka`, for wrapper events derive from PR repository or city group. Consistent with `getCommitUrl()` logic in `src/api/slack.ts`.
- [x] T018 [P] [US2] Add CSS styles for commit links in history entries to `site/css/style.css` — style `.history-commit-link` as a small monospace link (similar to existing `.commit-link` in status badges), positioned in the release header area next to the timestamp
- [x] T019 [US2] Modify `renderRelease()` in `site/js/components/history-view.js` to display short commit IDs as links in the release header — for each event in the release, show `<a href="{commitUrl}" class="history-commit-link">{shortSha}</a>` with repo type label if multiple repos (e.g. "ydin: 438b2c8, Kuntaimplementaatio: fb8cd9a"). Use `event.newCommit.shortSha` and `getCommitUrl(event)`.
- [x] T020 [US2] Update E2E tests in `tests/e2e/history-view.spec.ts` — add test that history entries display commit links with correct URLs and short SHAs. Test both single-repo and multi-repo (core + wrapper) entries. Verify links open to correct GitHub commit pages.
- [x] T021 [US2] Verify existing history view E2E tests still pass — ensure commit link additions don't break existing PR list rendering or release grouping

**Checkpoint**: History view shows commit links on all entries. Run `npm run test:e2e` to verify.

---

## Phase 5: User Story 3 - Branch Highlighting in GH Pages History (Priority: P2)

**Goal**: History view visually indicates when a staging deployment was from a non-main branch

**Independent Test**: View history entries with `isDefaultBranch: false` → branch badge is visible. View entries without branch info → no badge shown.

### Implementation for User Story 3

- [x] T022 [P] [US3] Add CSS styles for branch badge to `site/css/style.css` — style `.branch-badge` as a visually distinct indicator (e.g. orange/amber background with branch icon or text, similar to existing label badges). Should be noticeable but not overpowering.
- [x] T023 [US3] Modify `renderRelease()` in `site/js/components/history-view.js` to show a branch badge when any event in the release has `isDefaultBranch === false` — display the branch name from `event.branch` if available, otherwise show "ei pääkehityshaarassa". Only show for staging releases. Skip badge entirely when `isDefaultBranch` is `undefined` (legacy entries) or `true`.
- [x] T024 [US3] Update E2E tests in `tests/e2e/history-view.spec.ts` — add test data with `isDefaultBranch: false` and `branch: "feature/test"` fields. Verify branch badge renders with correct text. Verify no badge appears for normal deployments or legacy entries without the field.
- [x] T025 [US3] Update E2E test data generator in `tests/e2e/helpers/generate-test-data.ts` to include sample events with branch deployment fields (`branch`, `isDefaultBranch`) for both branch and non-branch staging scenarios

**Checkpoint**: Branch badges appear correctly in history view. Run `npm run test:e2e` to verify.

---

## Phase 6: User Story 4 - Backfill Missing Info in History Entries (Priority: P3)

**Goal**: Existing history entries get enriched with branch information without triggering Slack notifications

**Independent Test**: Run the data pipeline with existing history entries missing branch info → entries get enriched, zero extra Slack messages sent

### Implementation for User Story 4

- [x] T026 [US4] Add `backfillBranchInfo(history, isCommitOnDefaultBranchFn, repositories)` function to `src/services/history-manager.ts` — iterate over history events that have `isDefaultBranch === undefined`, call branch detection for each, and update the events in-place with `branch` and `isDefaultBranch` fields. Return count of updated entries for logging. Accept the branch detection function as a parameter for testability.
- [x] T027 [US4] Wire backfill into the main pipeline in `src/index.ts` — call `backfillBranchInfo()` AFTER Slack notifications are sent and AFTER `appendEvents()`, but BEFORE writing history to disk. Pass the repository configuration needed to map events to their GitHub repos. Log the count of backfilled entries.
- [x] T028 [US4] Add unit tests for `backfillBranchInfo()` in `tests/unit/history-manager.test.ts` — test that: events with `undefined` isDefaultBranch get enriched, events already having the field are skipped, API errors leave events unchanged, the function returns correct update count
- [x] T029 [US4] Add integration test verifying backfill doesn't trigger Slack — in `tests/integration/slack-api.test.ts` or a dedicated test, simulate a pipeline run where only backfill occurs (no new events), verify zero Slack webhook calls are made

**Checkpoint**: Backfill enriches existing entries correctly with no side effects. Run `npm test` to verify.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, cleanup, and mockup assembly

- [x] T030 Run full test suite (`npm test && npm run lint && npm run typecheck`) and fix any issues
- [x] T031 Run E2E tests (`npm run test:e2e`) and fix any issues
- [x] T032 Verify backward compatibility — load existing `data/history.json` with the updated frontend and confirm all entries render correctly (no errors for entries missing `branch`/`isDefaultBranch` fields)
- [x] T033 Capture "after" mockups and assemble before/after comparison in `specs/024-highlight-staging-branch-changes/mockups.md` for inclusion in the PR description (see Constitution §Development Workflow)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (T002, T003 for types) — BLOCKS all user stories
- **US1 Slack (Phase 3)**: Depends on Phase 2 completion
- **US2 Commit Links (Phase 4)**: Depends on Phase 1 only (frontend-only, no backend dependency)
- **US3 Branch Badges (Phase 5)**: Depends on Phase 2 (needs `isDefaultBranch` field populated in data)
- **US4 Backfill (Phase 6)**: Depends on Phase 2 (needs branch detection API)
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: Requires foundational branch detection. Can start after Phase 2.
- **US2 (P2)**: Frontend-only using existing `newCommit` data. Can start after Phase 1 (T002/T003). Independent of US1.
- **US3 (P2)**: Frontend reading new `branch`/`isDefaultBranch` fields. Can start after Phase 2. Independent of US1/US2 (though naturally complements US2).
- **US4 (P3)**: Backend backfill using branch detection. Can start after Phase 2. Independent of US1/US2/US3.

### Within Each User Story

- Types/models before services
- Services before integration points
- Core implementation before tests that depend on it
- All tests pass before checkpoint

### Parallel Opportunities

- T002 and T003 can run in parallel (different interfaces in same file)
- T017 and T018 can run in parallel (different files: JS and CSS)
- T022 can run in parallel with T017/T018 (CSS only, different class)
- US2 (commit links) can start in parallel with Phase 2 (no backend dependency)
- US1 and US4 can proceed in parallel after Phase 2
- US3 can proceed in parallel with US1 and US4 after Phase 2

---

## Parallel Example: After Phase 2 Completes

```text
# These can all start simultaneously:
Stream A (US1 - Slack): T010 → T011 → T012 → T013 → T014 → T015 → T016
Stream B (US2 - Commit Links): T017 + T018 (parallel) → T019 → T020 → T021
Stream C (US3 - Branch Badges): T022 (parallel with T017/T018) → T023 → T024 → T025
Stream D (US4 - Backfill): T026 → T027 → T028 → T029
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup + mockup capture
2. Complete Phase 2: Branch detection API
3. Complete Phase 3: Slack branch notifications (US1)
4. **STOP and VALIDATE**: Test with a branch deployment to staging
5. Deploy if ready — solves the core misleading-messages problem

### Incremental Delivery

1. Setup + Foundational → Branch detection works
2. US1 (Slack) → Misleading messages fixed (MVP!)
3. US2 (Commit links) → History view enriched with commit SHAs
4. US3 (Branch badges) → History view shows branch context
5. US4 (Backfill) → Historical data enriched retroactively
6. Polish → Final validation, mockups, cleanup

### Parallel Team Strategy

With multiple developers after Phase 2:

- Developer A: US1 (Slack — P1, most critical)
- Developer B: US2 + US3 (frontend — P2, related changes)
- Developer C: US4 (backfill — P3, independent backend)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- US2 (commit links) can start even before Phase 2 since it only reads existing `newCommit` data
