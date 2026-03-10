# Tasks: Slack Announcement Retry

**Input**: Design documents from `/specs/020-slack-announcement-retry/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: User Story 1 - Reliable Change Announcements (Priority: P1)

**Goal**: Only update stored HEAD SHAs after successful Slack delivery. Failed announcements retry on next run.

**Independent Test**: Simulate Slack failure, verify HEAD not updated, run again with Slack available, verify announcement sent and HEAD updated.

### Implementation for User Story 1

- [x] T001 [US1] Change `sendChangeAnnouncement` return type from `Promise<void>` to `Promise<boolean>` — return `true` on success, `false` on any error — in `src/services/change-announcer.ts`
- [x] T002 [US1] Refactor `announceChanges` to conditionally update HEAD per-repo based on announcement result — remove early unconditional HEAD update, only set HEAD when announcement succeeds or no announcement needed (no human PRs, no webhook configured, first run, no change) — in `src/services/change-announcer.ts`
- [x] T003 [US1] Update existing integration tests to verify HEAD is NOT updated when Slack returns non-200 (500, 404, 410, timeout) — in `tests/integration/change-announcements.test.ts`
- [x] T004 [US1] Add integration test: retry scenario — first run fails (Slack 500), HEAD stays, second run succeeds, all PRs announced and HEAD updated — in `tests/integration/change-announcements.test.ts`
- [x] T005 [US1] Add integration test: per-repo independence — one repo's Slack fails while another succeeds, verify only the successful repo's HEAD is updated — in `tests/integration/change-announcements.test.ts`

**Checkpoint**: Retry mechanism works. Failed announcements are retried on next run.

---

## Phase 2: User Story 2 - Timestamps for Delayed Announcements (Priority: P2)

**Goal**: Add Finnish-locale timestamps to PR lines when the PR was merged more than 20 minutes ago.

**Independent Test**: Announce a PR merged 2 hours ago — timestamp appears. Announce a PR merged 5 minutes ago — no timestamp.

### Implementation for User Story 2

- [x] T006 [US2] Add exported function `formatFinnishTimestamp(date: Date): string` using hardcoded Finnish weekday abbreviations and Europe/Helsinki timezone — in `src/services/change-announcer.ts`
- [x] T007 [US2] Update `buildChangeAnnouncement` to accept optional `now` parameter, compare each PR's `mergedAt` against 20-minute threshold, and append Finnish timestamp if older — in `src/services/change-announcer.ts`
- [x] T008 [US2] Add unit tests for `formatFinnishTimestamp`: various weekdays, months, times, timezone edge cases (DST transitions) — in `tests/unit/change-announcer.test.ts`
- [x] T009 [US2] Add unit tests for `buildChangeAnnouncement` with timestamps: PR older than 20 min shows timestamp, PR within 20 min has no timestamp, exactly 20 min has no timestamp, mixed PRs — in `tests/unit/change-announcer.test.ts`

**Checkpoint**: Delayed announcements show Finnish timestamps. Recent announcements don't.

---

## Phase 3: User Story 3 - HEAD Reset for Testing (Priority: P3)

**Goal**: Reset `repo-heads.json` to 2026-03-09 08:00 UTC SHAs so first deployment triggers visible announcements.

- [x] T010 [US3] Look up each tracked repo's HEAD commit SHA at 2026-03-09T08:00:00Z via GitHub API and update `data/repo-heads.json` with those SHAs

**Checkpoint**: `repo-heads.json` contains historical SHAs. First deployment will announce recent PRs.

---

## Phase 4: Polish & Cross-Cutting Concerns

- [x] T011 Run `npm test` and verify all tests pass
- [x] T012 Run `npm run lint` and fix any lint errors
- [x] T013 Run `npx tsc --noEmit` and fix any type errors

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (US1)**: No dependencies — can start immediately
- **Phase 2 (US2)**: Depends on Phase 1 (both modify `change-announcer.ts`)
- **Phase 3 (US3)**: No code dependencies — can run in parallel with Phase 1/2
- **Phase 4 (Polish)**: Depends on all phases complete

### Within Each Phase

- T001 before T002 (T002 uses the boolean return from T001)
- T002 before T003-T005 (tests verify the new behavior)
- T006 before T007 (T007 uses the function from T006)
- T007 before T008-T009 (tests verify the new behavior)

### Parallel Opportunities

- T003, T004, T005 can run in parallel (different test cases, same file but independent)
- T008, T009 can run in parallel (different test cases)
- T010 (US3) can run in parallel with any Phase 1/2 task (different file)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete T001-T002: Core retry logic
2. Complete T003-T005: Verify retry behavior
3. **STOP and VALIDATE**: Run tests, confirm retry works

### Incremental Delivery

1. US1 (retry) → Test → Working retry mechanism
2. US2 (timestamps) → Test → Delayed announcements show context
3. US3 (HEAD reset) → Commit → Ready for deployment verification
4. Polish → All tests pass, lint clean, types clean

---

## Summary

- **Total tasks**: 13
- **US1 (Retry)**: 5 tasks
- **US2 (Timestamps)**: 4 tasks
- **US3 (HEAD reset)**: 1 task
- **Polish**: 3 tasks
