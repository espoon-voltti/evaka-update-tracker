# Data Model: Slack Staging Details

**Feature**: 023-slack-staging-details
**Date**: 2026-03-18

## New Type: StagingContext

A lightweight context object passed to Slack notification functions when the notification is for a staging/testing environment.

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `inStagingCount` | `number` | Total count of PRs deployed to staging but not yet in production (sum of core + wrapper inStaging PRs, human-authored only) |
| `productionAvailable` | `boolean` | Whether production data was available for comparison. When `false`, the comparison section is omitted from the message. |

### Relationships

- Derived from existing `PRTrack.inStaging` arrays in `CityGroupData.prTracks`
- Consumed by `buildSlackMessage()` in `src/api/slack.ts`
- Passed as optional 4th parameter to `sendSlackNotification()`

### Validation Rules

- `inStagingCount` must be >= 0
- When `productionAvailable` is `false`, `inStagingCount` is ignored

## Existing Types (no changes)

The following existing types are referenced but not modified:

- **`DeploymentEvent`**: Unchanged. Contains `includedPRs` for the current change, but not cumulative staging data.
- **`PRTrack`**: Unchanged. Its `inStaging: PullRequest[]` field is the source for computing `inStagingCount`.
- **`CityGroupData`**: Unchanged. Contains `prTracks` with both core and wrapper tracks.

## Data Flow

```
CityGroupData.prTracks.core.inStaging    ─┐
                                           ├─► StagingContext.inStagingCount
CityGroupData.prTracks.wrapper.inStaging  ─┘         │
                                                      ▼
                                            sendSlackNotification()
                                                      │
                                                      ▼
                                            buildSlackMessage()
                                                      │
                                                      ▼
                                            Slack Block Kit message
                                            (context block with count)
```
