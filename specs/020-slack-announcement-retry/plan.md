# Implementation Plan: Slack Announcement Retry

**Branch**: `020-slack-announcement-retry` | **Date**: 2026-03-10 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/020-slack-announcement-retry/spec.md`

## Summary

Make Slack change announcements reliable by only updating stored HEAD SHAs after successful delivery. Failed announcements are implicitly retried on the next run because the HEAD gap persists. Add Finnish-locale timestamps to delayed announcements (>20 min old) so readers understand the timing context.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 20+
**Primary Dependencies**: axios (HTTP), nock (test mocking) — no new dependencies
**Storage**: JSON file (`data/repo-heads.json`)
**Testing**: Jest (unit + integration)
**Target Platform**: GitHub Actions (Linux runner)
**Project Type**: Data pipeline / scheduled task
**Constraints**: Runs every 5 minutes via cron; must complete within that window

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| Strict TypeScript, no `any` | PASS | No new types needed, existing types sufficient |
| Single responsibility per module | PASS | All changes within existing change-announcer module |
| Explicit error handling | PASS | `sendChangeAnnouncement` now returns success/failure explicitly |
| Minimal dependencies | PASS | No new dependencies |
| DRY | PASS | Finnish timestamp formatting is a single new function |
| Unit tests for services | PASS | New tests for timestamp formatting + updated retry behavior |
| Integration tests for APIs | PASS | Updated Slack failure tests to verify HEAD not updated |
| Tests focus on behavior | PASS | Tests verify retry semantics, not implementation details |

No violations. No complexity tracking needed.

## Project Structure

### Documentation (this feature)

```text
specs/020-slack-announcement-retry/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (changes only)

```text
src/
└── services/
    └── change-announcer.ts    # Core changes: retry logic, timestamps

tests/
├── unit/
│   └── change-announcer.test.ts      # Timestamp formatting tests
└── integration/
    └── change-announcements.test.ts  # Retry behavior tests

data/
└── repo-heads.json                   # One-time SHA reset
```

**Structure Decision**: All changes within existing files. No new files or modules needed. The change-announcer module already owns announcement formatting, sending, and HEAD persistence — adding retry semantics and timestamp formatting fits its existing responsibility.

## Implementation Details

### Change 1: `sendChangeAnnouncement` returns success/failure

**File**: `src/services/change-announcer.ts` (lines 68-84)

Change return type from `Promise<void>` to `Promise<boolean>`. Return `true` when axios gets HTTP 200 (no error thrown). Return `false` on any caught error (including 404/410). Keep existing warning logs.

### Change 2: Conditional HEAD updates in `announceChanges`

**File**: `src/services/change-announcer.ts` (lines 89-170)

Current flow sets HEAD for every repo unconditionally (line 119-122), then writes all at end (line 168).

New flow:
- Do NOT set HEAD at line 119-122 (remove early unconditional update)
- After successful announcement (or when no announcement needed): set HEAD in `updatedHeads`
- Cases where HEAD should be updated (no retry needed):
  - First run for repo (no previous SHA) — store HEAD
  - No change detected — keep existing HEAD
  - No human PRs to announce — update HEAD
  - No webhook configured — update HEAD
  - DRY_RUN mode — do NOT update HEAD (existing behavior)
- Cases where HEAD should NOT be updated (retry on next run):
  - `sendChangeAnnouncement` returns `false`
- Write `updatedHeads` at end as before

### Change 3: Finnish timestamps in `buildChangeAnnouncement`

**File**: `src/services/change-announcer.ts` (lines 58-62)

Add a new exported function `formatFinnishTimestamp(date: Date): string`:
- Finnish weekday abbreviations: `['su', 'ma', 'ti', 'ke', 'to', 'pe', 'la']`
- Format: `{weekday} {day}.{month}. klo {HH}.{MM}`
- Use `Europe/Helsinki` timezone via `toLocaleString('en-US', { timeZone: 'Europe/Helsinki' })` to get correct local hour/minute, then format manually
- Example: `pe 6.3. klo 09.28`

Update `buildChangeAnnouncement` signature to accept `now?: Date` (defaults to `new Date()`):
- For each PR, compare `now - new Date(pr.mergedAt)` against 20 minutes (1,200,000 ms)
- If older than 20 minutes, append ` — {timestamp}` after the author
- New line format: `<PR_URL|#NUMBER> TITLE — AUTHOR — pe 6.3. klo 09.28` (or without timestamp if recent)

### Change 4: Reset repo-heads.json

**File**: `data/repo-heads.json`

Look up each repo's HEAD at 2026-03-09T08:00:00Z using GitHub API, then update the file with those SHAs. This is a one-time data change committed with the feature.

## Verification

1. Run `npm test` — all existing + new tests pass
2. Run `npm run lint` — no lint errors
3. Run `npx tsc --noEmit` — no type errors
4. Manual verification with `DRY_RUN=true npx tsx src/index.ts` — confirm delayed PRs show timestamps in console output
5. After deployment: verify Slack announcements appear for PRs merged since 2026-03-09 08:00 UTC
