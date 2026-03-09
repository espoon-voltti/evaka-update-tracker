# Tasks: Improve Slack Announcements

**Input**: Design documents from `/specs/017-improve-slack-announcements/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are included — the spec requires updating existing integration tests and adding unit tests for the new utility.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup

**Purpose**: Create the shared utility needed by multiple user stories

- [x] T001 [P] Create `formatFinnishDateTime(isoString: string): string` utility in `src/utils/date-format.ts` — uses `Intl.DateTimeFormat` with locale `'fi'` and `timeZone: 'Europe/Helsinki'` to produce format like "pe 6.3. klo 09.28" (Finnish weekday abbreviation, day.month., "klo", HH.MM with period separator, no leading zeros on day/month)
- [x] T002 [P] Create unit tests for `formatFinnishDateTime` in `tests/unit/date-format.test.ts` — test cases: winter time (EET, UTC+2), summer time (EEST, UTC+3), midnight UTC crossing to next day in Helsinki, all weekday abbreviations (ma/ti/ke/to/pe/la/su), single-digit vs double-digit day/month

**Checkpoint**: Finnish datetime utility ready and tested independently

---

## Phase 2: User Story 1 — Combined Release Announcement (Priority: P1) 🎯 MVP

**Goal**: Send one Slack message per environment containing both wrapper and core changes

**Independent Test**: Trigger a deployment where both wrapper and core SHAs change → verify exactly one Slack webhook call with both repo sections in the Block Kit payload

### Implementation for User Story 1

- [x] T003 [US1] Modify `sendSlackNotification` in `src/api/slack.ts` to accept `DeploymentEvent[]` instead of a single `DeploymentEvent`. Build one Block Kit message from all events in the array: single header block, single version/timestamp fields block (showing both SHAs labeled by repo type when multiple events, e.g., "Ydin: sha1, Kuntaimpl.: sha2"), one changes section per repo type, single context block with dashboard link
- [x] T004 [US1] Modify event sending loop in `src/index.ts` (lines ~224-230): group `allEvents` by `environmentId` into a `Map<string, DeploymentEvent[]>`, then for each group resolve webhook URL from the first event's `cityGroupId` and call `sendSlackNotification(webhookUrl, eventsForEnv)`
- [x] T005 [US1] Update integration tests in `tests/integration/slack-api.test.ts`: update existing `mockEvent` fixture and assertions for new `DeploymentEvent[]` signature; add test case with both wrapper and core events for same environment verifying single webhook call with 5 blocks (header, fields, core changes, wrapper changes, context); add test case with single repo change verifying 4 blocks; update retry/error/routing tests for new signature

**Checkpoint**: Combined messages working — each environment gets exactly one Slack notification

---

## Phase 3: User Story 2 — Hide Bot Auto-Update PRs (Priority: P1)

**Goal**: Filter out dependabot/renovate PRs from Slack notification PR lists

**Independent Test**: Create a deployment event with mixed bot and human PRs → verify only human PRs appear in the Slack message; create event with all bot PRs → verify fallback "Ei merkittäviä muutoksia" text appears

### Implementation for User Story 2

- [x] T006 [US2] In the message builder in `src/api/slack.ts`, filter `event.includedPRs` using `pr.isBot === false` before rendering the PR bullet list. When the filtered list is empty, show fallback text "Ei merkittäviä muutoksia" instead of the PR list
- [x] T007 [US2] Add test cases in `tests/integration/slack-api.test.ts`: test with mixed bot/human PRs verifying only human PRs in message text; test with all-bot PRs verifying "Ei merkittäviä muutoksia" fallback text; test with fixture including `isBot: true` PR matching dependabot pattern (e.g., "Bump evaka from bf2c392 to 9a4e61b — dependabot[bot]")

**Checkpoint**: Bot PRs silently excluded from all Slack notifications

---

## Phase 4: User Story 3 — Helsinki Timezone Timestamps (Priority: P2)

**Goal**: Display timestamps in Finnish web UI format with Helsinki timezone

**Independent Test**: Send notification with known UTC timestamp → verify Slack message contains correctly converted Helsinki time in "pe 6.3. klo 09.28" format

### Implementation for User Story 3

- [x] T008 [US3] In `src/api/slack.ts`, replace the current UTC timestamp formatting (`toISOString().replace('T', ' ').slice(0, 19) + ' UTC'`) with a call to `formatFinnishDateTime(event.detectedAt)` from `src/utils/date-format.ts`. Use the `detectedAt` from the first event in the array (all events in a group share the same detection timestamp)
- [x] T009 [US3] Update timestamp assertions in `tests/integration/slack-api.test.ts`: update the mock event's `detectedAt` to a known value and assert the Slack message field contains the correctly formatted Helsinki time string (e.g., given `detectedAt: '2026-03-06T07:28:00Z'` in winter, assert field contains "pe 6.3. klo 09.28")

**Checkpoint**: All timestamps in Slack notifications show Finnish Helsinki-timezone format

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup

- [x] T010 Run full test suite (`npm test`) and lint (`npm run lint`) — fix any failures
- [x] T011 Verify all acceptance scenarios from spec.md by reviewing test coverage: combined message (US1), bot filtering (US2), Helsinki timestamps (US3)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — T001 and T002 can run in parallel
- **User Story 1 (Phase 2)**: No dependency on Setup (does not use date-format yet)
- **User Story 2 (Phase 3)**: Can run in parallel with US1 (different code paths in slack.ts)
- **User Story 3 (Phase 4)**: Depends on Setup (T001/T002) for the date formatting utility
- **Polish (Phase 5)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Independent — can start immediately
- **US2 (P1)**: Independent — can start immediately, modifies different section of slack.ts message builder
- **US3 (P2)**: Depends on T001 (date-format utility) from Setup

### Parallel Opportunities

- T001 and T002 can run in parallel (different files)
- US1 and US2 can be implemented in parallel (different concerns in slack.ts)
- US3 depends on Setup but is independent of US1/US2

---

## Parallel Example: Setup Phase

```bash
# Launch both setup tasks together:
Task: "Create formatFinnishDateTime utility in src/utils/date-format.ts"
Task: "Create unit tests in tests/unit/date-format.test.ts"
```

## Parallel Example: User Stories 1 & 2

```bash
# These modify different parts of slack.ts and can be done in sequence or parallel:
Task: "Modify sendSlackNotification to accept DeploymentEvent[] in src/api/slack.ts"
Task: "Filter bot PRs in message builder in src/api/slack.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (date utility)
2. Complete Phase 2: User Story 1 (combined messages)
3. **STOP and VALIDATE**: Test combined messages independently
4. Deploy if ready — already reduces notification noise by 50%

### Incremental Delivery

1. Setup → date utility ready
2. US1 → combined messages → validate → biggest impact delivered
3. US2 → bot PR filtering → validate → cleaner messages
4. US3 → Helsinki timestamps → validate → complete feature
5. Polish → full validation

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- US1 and US2 are both P1 priority but US1 has higher structural impact (changes function signature)
- The `DeploymentEvent` type and change detector are NOT modified
- Existing bot classification (`isBot` flag) is reused — no new classification logic
- Commit after each task or logical group
