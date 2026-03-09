# Tasks: Slack Change Announcements

**Input**: Design documents from `/specs/018-slack-change-announcements/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are included as part of implementation tasks per constitution requirements (unit tests for services, integration tests for APIs).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup

**Purpose**: Add types and create empty module files

- [x] T001 Add RepoHeadsData, RepoHeadEntry, TrackedRepository, and ChangeAnnouncement types to src/types.ts per data-model.md

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 Create src/config/change-routing.ts with resolveChangeWebhookUrl(repoType, cityGroupId?) function that resolves SLACK_CHANGE_WEBHOOK_CORE for core and SLACK_CHANGE_WEBHOOK_<CITY_ID> (uppercase, dashes to underscores) for wrappers; return empty string if not configured
- [x] T003 [P] Create getTrackedRepositories(cityGroups) in src/services/change-announcer.ts that extracts unique repositories from city group config, deduplicating core (appears in all groups but tracked once), returning TrackedRepository[] with owner, name, type, defaultBranch, and cityGroupId
- [x] T004 [P] Create readRepoHeads(filePath) and writeRepoHeads(filePath, data) in src/services/change-announcer.ts for reading/writing data/repo-heads.json; readRepoHeads returns empty structure if file is missing
- [x] T005 [P] Create unit test for resolveChangeWebhookUrl in tests/unit/change-routing.test.ts covering: core webhook resolution, wrapper webhook resolution per city, missing env var returns empty string, city ID normalization (dashes to underscores, uppercase)

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Core repo change announced on Slack (Priority: P1) MVP

**Goal**: Detect new commits on core repo's default branch, collect merged human PRs, and post minimal Slack announcements to the core channel.

**Independent Test**: Configure SLACK_CHANGE_WEBHOOK_CORE, simulate a HEAD change on espoon-voltti/evaka, and verify the Slack message is posted with correct format: `#8628 Testidatan refaktorointi - ei käytetä lateinit — Joosakur`

### Implementation for User Story 1

- [x] T006 [US1] Implement detectRepoChanges(repos, previousHeads) in src/services/change-announcer.ts that fetches current HEAD SHA for each tracked repo via GitHub API (using existing getCommit or ref lookup from src/api/github.ts), compares with stored SHA, and returns list of changed repos with old/new SHAs
- [x] T007 [US1] Implement buildChangeAnnouncement(repo, prs) in src/services/change-announcer.ts that formats Slack mrkdwn text per contracts/slack-message.md: one line per PR as `<PR_URL|#NUMBER> TITLE — AUTHOR` with lines joined by newline
- [x] T008 [US1] Implement sendChangeAnnouncement(webhookUrl, text) in src/services/change-announcer.ts that POSTs plain text message to Slack webhook using axios; handle 404/410 with warning log, other errors with warning log, never throw
- [x] T009 [US1] Implement announceChanges(cityGroups, dataDir) orchestrator in src/services/change-announcer.ts: read repo-heads, get tracked repos, detect changes, for each changed repo collect PRs via existing collectPRsBetween from src/services/pr-collector.ts, filter human PRs via existing filterHumanPRs, build announcement text, resolve webhook via change-routing, send if webhook configured and human PRs exist, update repo-heads; on first run (no previous HEAD for a repo) store HEAD without announcing
- [x] T010 [US1] Add announceChanges() call in src/index.ts as an independent pipeline step wrapped in try/catch so failures are logged but don't block the pipeline
- [x] T011 [US1] Create unit tests in tests/unit/change-announcer.test.ts covering: getTrackedRepositories deduplication, readRepoHeads with missing file, detectRepoChanges with changed/unchanged repos, buildChangeAnnouncement message format, first-run behavior (no previous HEAD), announceChanges orchestration with mocked dependencies
- [x] T012 [US1] Create integration test in tests/integration/change-announcements.test.ts using nock to mock GitHub API (compare commits, fetch PRs) and Slack webhook POST; verify end-to-end flow: HEAD change detected → PRs collected → correct Slack message sent to core webhook

**Checkpoint**: Core repo change announcements work end-to-end. Human PRs merged to espoon-voltti/evaka are announced on the core Slack channel.

---

## Phase 4: User Story 2 - Wrapper repo changes announced on separate channels (Priority: P1)

**Goal**: Wrapper repo changes are announced on their dedicated city-specific Slack channels, separate from core.

**Independent Test**: Configure SLACK_CHANGE_WEBHOOK_TAMPERE, simulate a HEAD change on Tampere/trevaka, and verify the announcement goes to the Tampere webhook, not the core webhook.

### Implementation for User Story 2

- [x] T013 [US2] Add unit tests to tests/unit/change-announcer.test.ts verifying that wrapper repo changes use wrapper-specific webhook URLs via resolveChangeWebhookUrl('wrapper', cityGroupId), and that core and wrapper announcements are sent to different webhooks in the same pipeline run
- [x] T014 [US2] Add integration test to tests/integration/change-announcements.test.ts verifying end-to-end: both core and wrapper HEAD changes in same run → core announcement sent to SLACK_CHANGE_WEBHOOK_CORE webhook, wrapper announcement sent to SLACK_CHANGE_WEBHOOK_TAMPERE webhook, messages are independent

**Checkpoint**: Core and wrapper announcements route to separate channels. Both US1 and US2 are independently functional.

---

## Phase 5: User Story 3 - Bot PRs silently ignored (Priority: P2)

**Goal**: Bot-authored PRs (dependabot, renovate, submodule bumps) are excluded from announcements silently — no message if only bots.

**Independent Test**: Simulate a HEAD change where all collected PRs are bot-authored, verify zero Slack messages are sent.

### Implementation for User Story 3

- [x] T015 [US3] Add unit tests to tests/unit/change-announcer.test.ts verifying: mixed human+bot PRs → only human PRs in announcement text; all-bot PRs → no Slack message sent; bot filtering uses existing isBotPR/filterHumanPRs from src/utils/pr-classifier.ts
- [x] T016 [US3] Add integration test to tests/integration/change-announcements.test.ts verifying end-to-end: HEAD change with only bot PRs → no HTTP POST to Slack webhook; HEAD change with mix → only human PRs in posted message

**Checkpoint**: Bot filtering verified. All three user stories are complete.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Pipeline integration, edge cases, and validation

- [x] T017 Ensure data/repo-heads.json is handled correctly in CI: add to .gitignore if not already (it's generated data like previous.json), verify GitHub Actions workflow writes it to correct data directory
- [x] T018 Run full validation: npm test && npm run lint && npm run typecheck to ensure all tests pass and no lint/type errors

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup (T001) for types
- **User Story 1 (Phase 3)**: Depends on Foundational (Phase 2) completion
- **User Story 2 (Phase 4)**: Depends on US1 (Phase 3) — routing logic is built in US1, US2 adds wrapper-specific verification
- **User Story 3 (Phase 5)**: Depends on US1 (Phase 3) — bot filtering is wired in US1, US3 adds specific verification
- **Polish (Phase 6)**: Depends on all user stories being complete

### Within Each User Story

- Models/types before services
- Services before integration (index.ts)
- Unit tests alongside implementation
- Integration tests after implementation

### Parallel Opportunities

- T002, T003, T004, T005 can all run in parallel (different files, no dependencies on each other)
- T006, T007 can run in parallel (independent functions in same file)
- T013 and T015 can run in parallel (different test scenarios, no dependencies between US2 and US3)

---

## Parallel Example: Foundational Phase

```bash
# Launch all foundational tasks together:
Task: "Create change-routing.ts in src/config/change-routing.ts"
Task: "Create getTrackedRepositories in src/services/change-announcer.ts"
Task: "Create readRepoHeads/writeRepoHeads in src/services/change-announcer.ts"
Task: "Create unit test for change-routing in tests/unit/change-routing.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (types)
2. Complete Phase 2: Foundational (routing, repo heads I/O, repo extraction)
3. Complete Phase 3: User Story 1 (core announcements end-to-end)
4. **STOP and VALIDATE**: Test core announcements independently
5. Deploy if ready — core announcements provide immediate value

### Incremental Delivery

1. Setup + Foundational → Infrastructure ready
2. Add User Story 1 → Core announcements working → Deploy (MVP!)
3. Add User Story 2 → Wrapper routing verified → Deploy
4. Add User Story 3 → Bot filtering verified → Deploy
5. Polish → CI integration, full validation → Final deploy

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- US2 and US3 are largely verification phases — the core implementation in US1 already includes wrapper routing and bot filtering by design, but US2/US3 add dedicated tests to prove correctness
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
