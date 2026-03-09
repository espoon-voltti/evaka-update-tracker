# Quickstart: Improve Slack Announcements

## Files to Modify

| File | Change |
|------|--------|
| `src/api/slack.ts` | Rewrite `buildSlackMessage` to accept `DeploymentEvent[]`, filter bot PRs, format Helsinki timestamps, show combined version fields |
| `src/index.ts` | Group events by `environmentId` before sending; pass event array to notification function |
| `src/utils/date-format.ts` | NEW: `formatFinnishDateTime()` utility |
| `tests/unit/date-format.test.ts` | NEW: Tests for Finnish datetime formatting |
| `tests/integration/slack-api.test.ts` | Update to test combined messages, bot filtering, timestamp format |

## Implementation Order

1. **date-format.ts** — New utility with tests (no dependencies on other changes)
2. **slack.ts** — Modify message builder to accept event array, filter bot PRs, use new timestamp formatter
3. **slack-api.test.ts** — Update test fixtures and assertions for combined messages
4. **index.ts** — Group events by environment before calling notification function

## Key Decisions

- DeploymentEvent type is **unchanged** — grouping happens at notification time only
- Bot PRs filtered using existing `isBot` flag — no new classification logic
- Finnish datetime via Node.js `Intl` API — no new dependencies
- Combined message: 4-5 blocks (header, version/timestamp fields, 1-2 change sections, context)

## Validation

```bash
npm test          # Unit + integration tests
npm run lint      # ESLint + Prettier
```
