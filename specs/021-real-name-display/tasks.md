# Tasks: Real Name Display

**Input**: Design documents from `/specs/021-real-name-display/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md

**Tests**: Constitution requires unit tests for service modules and E2E tests for user-facing changes.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: No new project structure needed. This phase creates the empty cache file and initializes the data directory entry.

- [x] T001 Create empty name cache file at data/user-names.json with content `{}`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend infrastructure for name resolution that ALL user stories depend on. This also delivers User Story 3 (automatic name resolution from GitHub profiles).

**CRITICAL**: No user story work can begin until this phase is complete.

- [x] T002 Add `authorName: string | null` field to `PullRequest` interface in src/types.ts
- [x] T003 Add `getUser(username: string)` method to GitHub API client in src/api/github.ts that calls `GET /users/{username}` and returns the `name` field (string | null)
- [x] T004 Create name resolver service in src/services/name-resolver.ts with: `loadCache(path)` to read data/user-names.json, `saveCache(path)` to write it, `resolveNames(prs, getUser)` to look up uncached non-bot authors and populate `authorName` on each PR
- [x] T005 Integrate name resolution into PR collection in src/services/pr-collector.ts — after PRs are collected, call the name resolver to populate `authorName` on each PR before returning
- [x] T006 Add unit tests for name resolver in tests/unit/name-resolver.test.ts — test cache hit, cache miss with API lookup, null name on profile, bot author skipping, API failure fallback
- [x] T006b [P] Add integration test for getUser() in src/api/github.ts using nock — test successful name retrieval, null name, 404 for unknown user, network failure

**Checkpoint**: Name resolution pipeline works end-to-end. `data/current.json` contains `authorName` fields. User Story 3 acceptance criteria met.

---

## Phase 3: User Story 1 - Display Real Names in PR Lists (Priority: P1)

**Goal**: Show real names instead of GitHub usernames in all frontend PR list views.

**Independent Test**: View any city's deployment page and verify PR authors show real names with username fallback.

### Implementation for User Story 1

- [x] T007 [US1] Update PR rendering in site/js/components/pr-list.js to display `pr.authorName ?? pr.author` instead of `pr.author`
- [x] T008 [US1] Update E2E tests in tests/e2e/ to verify real names appear in PR lists across city detail, history, and overview views

**Checkpoint**: Frontend displays real names. User Story 1 acceptance criteria met.

---

## Phase 4: User Story 2 - Display Real Names in Slack Notifications (Priority: P2)

**Goal**: Slack deployment notifications show real names of PR authors.

**Independent Test**: Trigger a deployment notification and verify Slack message uses real names.

### Implementation for User Story 2

- [x] T009 [P] [US2] Update Slack message formatting in src/api/slack.ts to use `pr.authorName ?? pr.author` in PR lines
- [x] T010 [P] [US2] Update change announcement formatting in src/services/change-announcer.ts to use `pr.authorName ?? pr.author` in PR lines
- [x] T010b [US2] Update existing tests for src/api/slack.ts and src/services/change-announcer.ts to include authorName field in test PR fixtures

**Checkpoint**: Slack notifications display real names. User Story 2 acceptance criteria met.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Validation and cleanup across all stories.

- [ ] T011 Run full test suite (`npm test && npm run lint`) and fix any issues (requires Node.js)
- [ ] T012 Run E2E tests (`npm run test:e2e`) and fix any issues (requires Node.js)
- [x] T013 Verify data/user-names.json is included in .gitignore check — it should be committed (not ignored), same as other data/ files

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational completion
- **User Story 2 (Phase 4)**: Depends on Foundational completion — can run in parallel with US1
- **Polish (Phase 5)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Depends only on Foundational phase — no dependency on other stories
- **User Story 2 (P2)**: Depends only on Foundational phase — can run in parallel with US1
- **User Story 3 (P3)**: Delivered by Foundational phase (Phase 2) — no separate implementation needed

### Within Foundational Phase

- T002 (types) must complete before T004 and T005
- T003 (API method) must complete before T004
- T004 (name resolver) must complete before T005 (integration)
- T006 (tests) can start after T004

### Parallel Opportunities

- T009 and T010 (US2 Slack tasks) can run in parallel (different files)
- US1 (Phase 3) and US2 (Phase 4) can run in parallel after Foundational completes

---

## Parallel Example: User Story 2

```bash
# Launch both Slack display tasks together (different files):
Task: "T009 Update Slack message formatting in src/api/slack.ts"
Task: "T010 Update change announcement formatting in src/services/change-announcer.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002–T006)
3. Complete Phase 3: User Story 1 (T007–T008)
4. **STOP and VALIDATE**: View frontend, verify real names appear
5. Deploy if ready — Slack still shows usernames but frontend works

### Incremental Delivery

1. Setup + Foundational → Name resolution pipeline working (US3 done)
2. Add User Story 1 → Frontend shows real names → Deploy (MVP!)
3. Add User Story 2 → Slack shows real names → Deploy
4. Polish → Full validation → Complete

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- User Story 3 is fully delivered by the Foundational phase — the automatic GitHub profile lookup and caching IS the name resolution infrastructure
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
