# Municipality Label Routing

**Date:** 2026-04-28

## Problem

All municipality deployments now use the shared core repo (`espoon-voltti/evaka`). Wrapper repos no longer carry meaningful city-specific changes. As a result, core PRs appear in every city's change listings — even PRs that are only relevant to one city.

The core repo already uses GitHub labels to mark city-specific PRs (`turku`, `espoo`, `oulu`, `seutu`). This design routes those PRs to the correct city and hides them from others.

## Label → City Group Mapping

| GitHub label | City group ID   | Display name    |
|--------------|-----------------|-----------------|
| `turku`      | `turku`         | Turku           |
| `espoo`      | `espoo`         | Espoo           |
| `oulu`       | `oulu`          | Oulu            |
| `seutu`      | `tampere-region`| Tampereen seutu |

A PR with no municipality label is **shared** — it appears in all cities. A PR with one or more municipality labels is **city-specific** — it appears only in the matching cities.

## Components

### 1. `src/utils/municipality-labels.ts` (new)

Pure utility module — no side effects, no imports from the rest of the codebase.

- `MUNICIPALITY_LABEL_TO_CITY_GROUP: Record<string, string>` — the mapping table above
- `MUNICIPALITY_LABEL_NAMES: Record<string, string>` — label → Finnish/Swedish display name for Slack prefixes
- `getMunicipalityCityGroups(labels: string[]): string[] | null` — returns matching city group IDs, or `null` if none (shared PR)
- `prBelongsToCity(labels: string[], cityGroupId: string): boolean` — true if the PR is shared or matches this city
- `getMunicipalityNames(labels: string[]): string[]` — returns display names for any municipality labels (used for Slack prefix)

### 2. PR track filtering (`src/index.ts`)

After `collectPRsForRepo` for the core repo, filter each list (`deployed`, `inStaging`, `pendingDeployment`) before passing to `buildPRTrack`:

```
prs.filter(pr => prBelongsToCity(pr.labels, cityGroup.id))
```

Only core PRs need filtering. Wrapper PRs already belong to their city by definition.

### 3. Deployment event filtering (`src/index.ts`)

Before calling `detectChanges`, filter `changePRs` for core repos:

```
changePRs.filter(pr => pr.repoType !== 'core' || prBelongsToCity(pr.labels, cityGroup.id))
```

This controls which PRs are stored in `history.json` deployment events going forward, and consequently which PRs appear in Slack deployment notifications.

### 4. Change announcer routing (`src/services/change-announcer.ts`)

When announcing new core repo commits, split `humanPRs` by municipality:

- **Shared PRs** (no municipality label): sent to `SLACK_CHANGE_WEBHOOK_CORE` unchanged.
- **Municipality PRs**: sent to `SLACK_CHANGE_WEBHOOK_CORE` with a `[CityName]` prefix, AND sent to the matching city webhook (`SLACK_CHANGE_WEBHOOK_TURKU`, `SLACK_CHANGE_WEBHOOK_ESPOO`, etc.) also with the `[CityName]` prefix.

The city webhook is resolved via the existing `resolveChangeWebhookUrl('wrapper', cityGroupId)` — no new env var convention needed.

For a PR with multiple municipality labels (e.g. `turku` + `oulu`), the prefix is `[Turku] [Oulu]` and the PR is sent to both city webhooks.

The `[CityName]` prefix is prepended to the existing formatted PR line produced by `formatPRLine`.

## Scope

- **Applies going forward only.** Existing `history.json` data is not retroactively filtered.
- **No data format changes.** `PullRequest.labels` already exists; no new fields added to `types.ts`.
- **No frontend changes.** The web UI renders what it receives from `current.json` and `history.json`. Filtering at collection time is sufficient.
- **No label-map changes.** Municipality labels are routing-only and are not added to `SLACK_LABEL_MAP` or the frontend `LABEL_MAP`.

## Testing

### Unit: `municipality-labels.ts`
- Shared PR (no labels) → `prBelongsToCity` returns true for all city groups
- Single municipality label → returns true only for the matching city group
- Multiple municipality labels → returns true for each matching city group
- Unknown label → treated as shared (not a municipality label)

### Unit: change announcer routing
Using `nock`, verify:
- Shared PR → one request to core webhook, no city webhooks
- `turku`-labeled PR → request to core webhook (with `[Turku]` prefix) + request to Turku webhook (with `[Turku]` prefix)
- Multi-label PR (`turku` + `oulu`) → core webhook with `[Turku] [Oulu]` prefix + Turku webhook + Oulu webhook

### No new E2E tests
Frontend rendering is unchanged; filtering is covered by the unit tests above.
