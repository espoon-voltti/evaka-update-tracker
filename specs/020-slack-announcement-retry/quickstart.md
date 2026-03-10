# Quickstart: Slack Announcement Retry

## What's changing

1. **`sendChangeAnnouncement`** returns `boolean` instead of `void` — `true` on HTTP 200, `false` on any failure
2. **`announceChanges`** only updates a repo's HEAD SHA when announcement succeeds (or when no announcement is needed)
3. **`buildChangeAnnouncement`** adds Finnish-locale timestamps to PR lines older than 20 minutes
4. **`repo-heads.json`** is reset to 2026-03-09 08:00 UTC SHAs for deployment testing

## Files to modify

- `src/services/change-announcer.ts` — core changes (3 functions)
- `tests/unit/change-announcer.test.ts` — new timestamp formatting tests
- `tests/integration/change-announcements.test.ts` — update existing failure tests, add retry scenario tests
- `data/repo-heads.json` — one-time SHA reset

## How to test

```bash
# Run all tests
npm test

# Run just change announcer tests
npx jest change-announcer
npx jest change-announcements

# Test with dry run
DRY_RUN=true npx tsx src/index.ts
```

## Key design decisions

- No new files or dependencies — all changes in existing modules
- No separate retry queue — the HEAD gap IS the queue
- Finnish timestamps use hardcoded weekday table, not Intl API
- Europe/Helsinki timezone for displayed timestamps
