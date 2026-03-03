# Data Model: Improve History View

## No Data Model Changes Required

This feature is a **frontend-only redesign**. The existing data structures in `history.json` and `current.json` already contain all the information needed:

### Existing: Deployment Event (from `history.json`)

| Field | Type | Used By History View |
|-------|------|---------------------|
| `id` | string | Internal identifier |
| `environmentId` | string | Determines color-coding (contains "prod" → production, otherwise → staging) |
| `cityGroupId` | string | Filters events for the selected city |
| `detectedAt` | ISO timestamp | Display timestamp (reformatted with Finnish weekday) |
| `previousCommit` | CommitInfo | Secondary display (SHA transition, demoted to small text) |
| `newCommit` | CommitInfo | Secondary display (SHA transition, demoted to small text) |
| `includedPRs` | PullRequest[] | **Primary display** — rendered via shared `renderPRList` component |
| `repoType` | "core" \| "wrapper" | Environment label in event header |

### Existing: PullRequest (within event.includedPRs)

| Field | Type | Used By |
|-------|------|---------|
| `number` | number | Not directly displayed (part of PR link) |
| `title` | string | Primary display text |
| `author` | string | Shown on hover (via `renderPRList`) |
| `mergedAt` | ISO timestamp | Date column (via `renderPRList`) |
| `repository` | string | Not directly displayed |
| `repoType` | "core" \| "wrapper" | Repo label badge `[core]`/`[wrapper]` (via `renderPRList`) |
| `isBot` | boolean | Bot filtering (event-level + PR-level) |
| `url` | string | PR title link target |
| `labels` | string[] | Label badges (via `renderPRList` `LABEL_MAP`) |

### Key Observation

The `labels` field was added to PR objects by feature 009 (backfill-labels script). All history events in `history.json` should already have labels populated. The shared `renderPRList` component renders these labels automatically — the history view just needs to call it.
