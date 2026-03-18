# Quickstart: Slack Staging Details

**Feature**: 023-slack-staging-details
**Date**: 2026-03-18

## What This Feature Does

Enhances Slack notifications for staging/testing deployments to show:
1. How many additional PRs exist in staging compared to production
2. More descriptive link text for the dashboard (includes city name)

## Files to Modify

| File | Change |
|------|--------|
| `src/types.ts` | Add `StagingContext` interface |
| `src/api/slack.ts` | Accept optional `StagingContext`, add comparison text to context block, update link text for staging |
| `src/index.ts` | Compute `StagingContext` from `PRTrack` data and pass to `sendSlackNotification()` |
| `tests/integration/slack-api.test.ts` | Add tests for staging comparison count and descriptive link text |

## Key Implementation Notes

1. **`sendSlackNotification()` signature change**: Add optional 4th parameter `stagingContext?: StagingContext`. This is backward-compatible — existing callers don't need to change.

2. **Computing the count**: At the call site in `index.ts` (around line 255), when iterating `eventsByEnvironment`:
   - Check if the environment is staging (not production)
   - Look up the city group's `prTracks` from `cityGroupsData`
   - Sum `core.inStaging.length` + `(wrapper?.inStaging.length ?? 0)` filtering for non-bot PRs
   - Pass as `StagingContext { inStagingCount, productionAvailable: true }`

3. **Finnish text**: Use `muutos` (singular) vs `muutosta` (plural). Zero case: `Sama versio kuin tuotannossa`.

4. **Context block modification**: The existing context block has one element (dashboard link). For staging notifications, prepend a comparison text element and update the link text to include the city name.

## Running Tests

```bash
npm test                    # All tests
npx jest slack-api          # Just Slack API tests
npm run lint                # Lint check
```

## Verification

After implementation, verify with:
```bash
DRY_RUN=true npm start      # Check console output for staging notifications
npm test                     # All tests pass
npm run lint                 # No lint errors
```
