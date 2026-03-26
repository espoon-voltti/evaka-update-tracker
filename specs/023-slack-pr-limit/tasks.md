# Tasks: Increase Slack PR Limit with Overflow Link

**Input**: Design documents from `/specs/023-slack-pr-limit/`
**Prerequisites**: plan.md, spec.md, research.md, quickstart.md

**Tests**: Tests are included — existing test file `tests/integration/slack-api.test.ts` must be updated to cover new behavior.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Phase 1: Setup (Pre-Implementation)

**Purpose**: Capture current state before making changes

- [x] T001-MK Capture "before" mockups of Slack deployment notification message format. Write a manual mockup showing the current message structure (with 10 PR limit, no overflow) to `specs/023-slack-pr-limit/mockups-before.md`. This MUST happen before any implementation changes.

---

## Phase 2: User Story 1 - Show More Changes in Slack Messages (Priority: P1) 🎯 MVP

**Goal**: Increase the per-section PR display limit from 10 to 50 so all changes are visible in typical deployments.

**Independent Test**: Send a Slack notification for a deployment with 17 PRs and verify all 17 appear in the message.

### Implementation for User Story 1

- [x] T002 [US1] Change `buildChangesSection` in `src/api/slack.ts` to display up to 50 PRs instead of 10 (change `.slice(0, 10)` to `.slice(0, 50)` on line 44)
- [x] T003 [US1] Update existing tests in `tests/integration/slack-api.test.ts` that assert the 10 PR limit to assert 50 instead. Add a test case with 17 PRs verifying all are displayed.

**Checkpoint**: At this point, deployments with up to 50 changes display all of them. No overflow link yet — that's US2.

---

## Phase 3: User Story 2 - Show Overflow Link When Exceeding 50 Changes (Priority: P2)

**Goal**: When a section has more than 50 human-visible PRs, show the first 50 followed by a Finnish-language overflow link to the environment's history page.

**Independent Test**: Send a Slack notification for a deployment with 55 PRs for "tampere-region" and verify 50 are listed plus an overflow line linking to `https://espoon-voltti.github.io/evaka-update-tracker/#/city/tampere-region/history` with text "5 muuta muutosta".

### Implementation for User Story 2

- [x] T004 [US2] Extend `buildChangesSection` signature in `src/api/slack.ts` to accept `dashboardBaseUrl` and `cityGroupId` parameters (from `buildSlackMessage` which already has both values)
- [x] T005 [US2] Update `buildSlackMessage` in `src/api/slack.ts` to pass `dashboardBaseUrl` and `firstEvent.cityGroupId` to each `buildChangesSection` call (line 75)
- [x] T006 [US2] Add overflow logic in `buildChangesSection` in `src/api/slack.ts`: when `humanPRs.length > 50`, append `_...ja <${dashboardBaseUrl}#/city/${cityGroupId}/history|${remaining} muuta muutosta>_` after the PR list
- [x] T007 [US2] Add test in `tests/integration/slack-api.test.ts` for overflow: 55 PRs should show 50 listed + overflow line with correct count (5) and correct history URL
- [x] T008 [US2] Add test in `tests/integration/slack-api.test.ts` for boundary: exactly 50 PRs should show all 50 with no overflow line

**Checkpoint**: Both user stories complete — deployments show up to 50 PRs, with overflow link for any beyond 50.

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Validation and PR preparation

- [x] T009 Run full test suite (`npm test`) and fix any failures
- [x] T010 Run linter (`npm run lint`) and fix any issues
- [x] T011 Verify existing edge case behavior is preserved: 0 human PRs shows "Ei merkittäviä muutoksia", empty `includedPRs` shows "PR-tietoja ei saatavilla"
- [x] T012-MK Capture "after" mockups and assemble before/after comparison in `specs/023-slack-pr-limit/mockups.md` for inclusion in the PR description (see Constitution §Development Workflow)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — must complete before implementation
- **User Story 1 (Phase 2)**: Depends on Phase 1 (mockup capture)
- **User Story 2 (Phase 3)**: Depends on Phase 2 (US1 changes the limit; US2 builds on top with overflow)
- **Polish (Phase 4)**: Depends on Phases 2 and 3

### User Story Dependencies

- **User Story 1 (P1)**: Independent — changes only the slice limit
- **User Story 2 (P2)**: Builds on US1 — extends the same function with overflow logic

### Within Each User Story

- Implementation before tests (tests verify the new behavior)
- US1 must complete before US2 (US2 extends US1's changes)

### Parallel Opportunities

- T007 and T008 (overflow tests) can run in parallel [P] since they test independent scenarios
- T009 and T010 (test suite + lint) can run in parallel [P]

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Capture before mockups
2. Complete Phase 2: Change limit from 10 to 50 + update tests
3. **STOP and VALIDATE**: Run `npm test` — all tests pass with new limit
4. This alone fixes the original problem (17 PRs truncated to 10)

### Full Delivery

1. Complete MVP (US1)
2. Add US2: overflow link for >50 PRs
3. Polish: full validation, mockups, PR preparation

---

## Notes

- This is a minimal change: 1 source file (`src/api/slack.ts`) + 1 test file
- US2 depends on US1 because both modify the same function
- The `cityGroupId` and `dashboardBaseUrl` are already available in `buildSlackMessage` — no new data plumbing needed
- Commit after each user story for clean git history
