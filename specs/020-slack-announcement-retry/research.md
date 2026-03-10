# Research: Slack Announcement Retry

## R1: How to make sendChangeAnnouncement report success/failure

**Decision**: Change return type from `Promise<void>` to `Promise<boolean>`, returning `true` on HTTP 200 and `false` on any error.

**Rationale**: Minimal change to existing function. The caller (`announceChanges`) needs to know success/failure to decide whether to update HEAD. A boolean is sufficient — no need for error details since warnings are already logged internally.

**Alternatives considered**:
- Throwing on failure: Would require try/catch at every call site, more disruptive
- Return an enum (success/transient-failure/permanent-failure): Over-engineering — all failures should be retried since even 404/410 may be temporary misconfigurations

## R2: Per-repo HEAD update strategy

**Decision**: Build `updatedHeads` incrementally — only set a repo's HEAD when its announcement succeeds (or when no announcement is needed). Write at the end as before.

**Rationale**: Current code sets all HEADs in the loop then writes once at the end. The change is to conditionally add to `updatedHeads` based on announcement result. This preserves the single-write pattern while enabling per-repo retry.

**Alternatives considered**:
- Write after each repo: More I/O, risk of partial writes on crash. Single write at end is safer.
- Separate "pending" queue file: Unnecessary complexity — the HEAD gap itself serves as the implicit queue.

## R3: Finnish timestamp formatting

**Decision**: Implement a pure function `formatFinnishTimestamp(date: Date): string` using hardcoded Finnish weekday abbreviations and manual formatting.

**Rationale**: Node.js `Intl.DateTimeFormat` with `fi-FI` locale doesn't produce the exact format needed ("pe 6.3. klo 09.28"). The format is simple enough to build manually: weekday lookup table + `date.getDate()` + `(month+1)` + hours/minutes with period separator.

**Finnish weekday abbreviations**: `['su', 'ma', 'ti', 'ke', 'to', 'pe', 'la']` (Sunday=0)

**Alternatives considered**:
- `Intl.DateTimeFormat`: Doesn't produce "klo" or period-separated time natively
- date-fns with fi locale: New dependency, violates constitution principle of minimal dependencies

## R4: Where to apply the 20-minute threshold

**Decision**: Apply in `buildChangeAnnouncement()` by passing a `now` timestamp and comparing each PR's `mergedAt` against it. If `(now - mergedAt) > 20 minutes`, append the formatted timestamp to the PR line.

**Rationale**: `buildChangeAnnouncement` already formats each PR line. Adding the conditional timestamp there keeps formatting logic in one place. Passing `now` as a parameter makes it testable without time mocking.

## R5: Timezone for Finnish timestamps

**Decision**: Use Europe/Helsinki timezone for formatting the timestamp displayed to users.

**Rationale**: The target audience is Finnish users. PR merge times from GitHub are in UTC (ISO 8601). The displayed timestamp should match the reader's local time. Finland is UTC+2 (EET) or UTC+3 (EEST during DST).

## R6: HEAD reset approach for repo-heads.json

**Decision**: Use the GitHub API to look up each repo's commit at 2026-03-09T08:00:00Z, then hardcode those SHAs into `repo-heads.json` as a one-time data change.

**Rationale**: The SHAs must be real commits that existed at that time. Using `git log --before` via the GitHub API (or the commits API with `until` parameter) gives the correct SHA for each repo.
