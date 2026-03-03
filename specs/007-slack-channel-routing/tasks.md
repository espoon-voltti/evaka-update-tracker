# Tasks: Per-City Slack Channel Routing

**Input**: Design documents from `/specs/007-slack-channel-routing/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md

**Tests**: Included — constitution mandates unit tests for service modules and integration tests for API integrations.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: No project initialization needed — existing project structure, dependencies, linting, and formatting are already in place. Phase skipped.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create the webhook URL routing module that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T001 Create webhook URL resolver module in `src/config/slack-routing.ts`. Export a function `resolveWebhookUrl(cityGroupId: string): string` that implements the fallback chain: (1) check `SLACK_WEBHOOK_URL_<CITY_ID>` where city group ID is uppercased with hyphens replaced by underscores, (2) fall back to `SLACK_WEBHOOK_URL`, (3) return empty string if neither is set. See `data-model.md` Resolution Rules for the exact algorithm. Also export a helper `cityGroupIdToEnvVar(cityGroupId: string): string` for testability.
- [x] T002 [P] Create unit tests in `tests/unit/slack-routing.test.ts` for the routing resolver. Test cases: (1) returns per-city env var URL when `SLACK_WEBHOOK_URL_ESPOO` is set, (2) returns per-city URL for hyphenated ID (`tampere-region` → `SLACK_WEBHOOK_URL_TAMPERE_REGION`), (3) falls back to `SLACK_WEBHOOK_URL` when per-city var is not set, (4) returns empty string when neither var is set, (5) per-city var takes precedence over default when both are set, (6) `cityGroupIdToEnvVar` correctly converts all four city group IDs. Use `process.env` manipulation in beforeEach/afterEach for test isolation.

**Checkpoint**: Routing resolver ready — user story implementation can now begin

---

## Phase 3: User Story 1 — Route Deployment Notifications by City (Priority: P1) 🎯 MVP

**Goal**: Each city group's deployment notifications are delivered to that city group's dedicated Slack channel via per-city webhook URLs

**Independent Test**: Set per-city webhook env vars for all 4 city groups, trigger deployment changes, verify each notification arrives at the correct webhook URL

### Implementation for User Story 1

- [x] T003 [US1] Modify the notification loop in `src/index.ts` (lines 202–211) to resolve the webhook URL per event using `resolveWebhookUrl(event.cityGroupId)` from `src/config/slack-routing.ts` instead of reading `process.env.SLACK_WEBHOOK_URL` once. Import `resolveWebhookUrl` at the top. Replace `const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;` with per-event resolution inside the for loop: `const webhookUrl = resolveWebhookUrl(event.cityGroupId);`. Pass the resolved URL to `sendSlackNotification(webhookUrl, event)`.
- [x] T004 [US1] Add integration test case to `tests/integration/slack-api.test.ts` verifying per-city routing: set `SLACK_WEBHOOK_URL_ESPOO` and `SLACK_WEBHOOK_URL_OULU` to different nock-intercepted webhook URLs, send notifications for espoo and oulu events, and assert each notification hits the correct webhook URL (not the other city's URL).

**Checkpoint**: Per-city Slack channel routing is functional and tested. This is the MVP — deployable on its own.

---

## Phase 4: User Story 2 — Backwards-Compatible Default Behaviour (Priority: P2)

**Goal**: System continues working identically when only `SLACK_WEBHOOK_URL` is configured (no per-city env vars)

**Independent Test**: Set only `SLACK_WEBHOOK_URL` (no per-city vars), trigger deployment changes for multiple cities, verify all notifications go to the default webhook URL

### Implementation for User Story 2

- [x] T005 [US2] Add integration test case to `tests/integration/slack-api.test.ts` verifying backward compatibility: set only `SLACK_WEBHOOK_URL` (no per-city vars), send notifications for two different city group events (e.g., espoo and tampere-region), and assert both notifications hit the same default webhook URL.
- [x] T006 [US2] Add integration test case to `tests/integration/slack-api.test.ts` verifying partial configuration: set `SLACK_WEBHOOK_URL` as default and `SLACK_WEBHOOK_URL_ESPOO` for one city only. Send events for espoo and oulu. Assert espoo goes to the per-city URL and oulu falls back to the default URL.

**Checkpoint**: Backward compatibility verified — existing single-webhook setups work unchanged

---

## Phase 5: User Story 3 — Staging Notification Routing (Priority: P3)

**Goal**: Staging environment notifications follow the same routing as production for the same city group

**Independent Test**: Configure per-city webhook for a city group, trigger a staging environment change for that city, verify the staging notification goes to the same per-city webhook

### Implementation for User Story 3

- [x] T007 [US3] Add integration test case to `tests/integration/slack-api.test.ts` verifying staging routing: set `SLACK_WEBHOOK_URL_OULU` to a specific webhook URL, create a mock event with `environmentId: 'oulu-staging'` and `cityGroupId: 'oulu'`, send the notification, and assert it hits the oulu per-city webhook URL. This validates that the routing resolver uses `cityGroupId` (not `environmentId`) so both production and staging events for the same city go to the same channel.

**Checkpoint**: All user stories are independently functional and tested

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Configuration updates and final validation

- [x] T008 [P] Update `.env.example` to add per-city webhook URL placeholders after the existing `SLACK_WEBHOOK_URL` line. Add commented examples: `SLACK_WEBHOOK_URL_ESPOO=`, `SLACK_WEBHOOK_URL_TAMPERE_REGION=`, `SLACK_WEBHOOK_URL_OULU=`, `SLACK_WEBHOOK_URL_TURKU=` with a comment explaining that these are optional overrides for per-city channel routing.
- [x] T009 [P] Update `.github/workflows/monitor.yml` to pass per-city webhook secrets as environment variables to the monitor job step (lines 34–39). Add `SLACK_WEBHOOK_URL_ESPOO: ${{ secrets.SLACK_WEBHOOK_URL_ESPOO }}`, `SLACK_WEBHOOK_URL_TAMPERE_REGION: ${{ secrets.SLACK_WEBHOOK_URL_TAMPERE_REGION }}`, `SLACK_WEBHOOK_URL_OULU: ${{ secrets.SLACK_WEBHOOK_URL_OULU }}`, `SLACK_WEBHOOK_URL_TURKU: ${{ secrets.SLACK_WEBHOOK_URL_TURKU }}`.
- [x] T010 Run `npm test && npm run lint` to verify all tests pass and no lint errors exist

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 2)**: No dependencies — can start immediately. BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Phase 2 completion
- **User Story 2 (Phase 4)**: Depends on Phase 2 and Phase 3 (needs `src/index.ts` changes from T003)
- **User Story 3 (Phase 5)**: Depends on Phase 2 and Phase 3 (needs `src/index.ts` changes from T003)
- **Polish (Phase 6)**: Depends on Phase 3 completion. T008 and T009 can start as soon as Phase 3 is done.

### User Story Dependencies

- **User Story 1 (P1)**: Depends on Phase 2. No dependency on other stories.
- **User Story 2 (P2)**: Depends on Phase 2 + T003 (index.ts integration). Tests verify behavior, no new code needed beyond US1.
- **User Story 3 (P3)**: Depends on Phase 2 + T003 (index.ts integration). Tests verify behavior, no new code needed beyond US1.

### Within Each User Story

- US1: Integration (T003) before integration tests (T004)
- US2: Tests only (T005, T006) — can run in parallel with each other
- US3: Test only (T007)

### Parallel Opportunities

- T001 and T002 can run in parallel (different files)
- T005 and T006 can run in parallel (independent test cases in same file, but no code conflicts)
- T008 and T009 can run in parallel (different files)
- US2 and US3 can start in parallel once US1 is complete (both are test-only phases)

---

## Parallel Example: Phase 2 (Foundational)

```bash
# Launch both foundational tasks together:
Task T001: "Create webhook URL resolver in src/config/slack-routing.ts"
Task T002: "Create unit tests in tests/unit/slack-routing.test.ts"
```

## Parallel Example: Phase 6 (Polish)

```bash
# Launch both config tasks together:
Task T008: "Update .env.example with per-city webhook placeholders"
Task T009: "Update .github/workflows/monitor.yml with per-city secrets"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2: Foundational (T001, T002)
2. Complete Phase 3: User Story 1 (T003, T004)
3. **STOP and VALIDATE**: Run `npm test && npm run lint` — all tests pass
4. Deploy — per-city routing is functional

### Incremental Delivery

1. Phase 2 → Foundational ready
2. Phase 3 (US1) → Per-city routing works → Deploy (MVP!)
3. Phase 4 (US2) → Backward compat verified → Confidence for production
4. Phase 5 (US3) → Staging routing verified → Feature complete
5. Phase 6 → Config docs + CI updated → Ready for operators

---

## Notes

- The routing resolver (T001) is the only new source file. All other changes are modifications to existing files or new test cases.
- US2 and US3 require no new production code — they are verification that the routing resolver's fallback chain and cityGroupId-based routing naturally handle these scenarios. Their value is in the test coverage.
- The existing `sendSlackNotification` function signature does not change — it already accepts a `webhookUrl` parameter. The change is only in HOW the URL is determined (per-event resolution in `index.ts` instead of one global read).
- Error isolation (FR-006) is already handled by the existing try/catch in `sendSlackNotification` — no changes needed.
