# Quickstart: Increase Slack PR Limit with Overflow Link

## What Changed

The Slack deployment notification was silently truncating PR lists to 10 items per repository section. This change:

1. Increases the limit to 50 PRs per section
2. Adds an overflow message with a link to the history page when >50 PRs exist

## Files Modified

- `src/api/slack.ts` — `buildChangesSection()` function: limit change + overflow link
- `tests/integration/slack-api.test.ts` — Updated tests for new limit and overflow behavior

## Key Design Decision

The `buildChangesSection` function signature is extended to accept `dashboardBaseUrl` and `cityGroupId` so it can construct the overflow link URL. These values are already available in the calling function `buildSlackMessage`.

## How to Verify

```bash
npm test                    # Run all tests
npm run test:e2e           # Run E2E tests (no changes expected)
```

## Overflow Message Format

When a section has more than 50 human-visible PRs, the message includes:

```
*Muutokset (ydin):*
• #1234 [Tag] PR title — Author
• #1235 [Tag] PR title — Author
... (50 items)
_...ja <https://espoon-voltti.github.io/evaka-update-tracker/#/city/tampere-region/history|5 muuta muutosta>_
```
