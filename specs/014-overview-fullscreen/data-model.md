# Data Model: Overview Fullscreen & Change Counts

**Feature**: 014-overview-fullscreen
**Date**: 2026-03-05

## Entities

### City Card (enhanced — display-only)

No changes to the underlying data model. The city card is a UI-only entity derived from existing data.

**Existing source fields** (read-only from `current.json`):
- `city.id` — city group identifier
- `city.name` — display name
- `city.environments[]` — environment status (production, staging)
- `city.prTracks.core.inStaging[]` — PRs in staging (core repo)
- `city.prTracks.core.pendingDeployment[]` — undeployed PRs (core repo)
- `city.prTracks.wrapper.inStaging[]` — PRs in staging (wrapper repo, nullable)
- `city.prTracks.wrapper.pendingDeployment[]` — undeployed PRs (wrapper repo, nullable)

**Derived display values** (computed at render time):

| Field | Type | Derivation |
|-------|------|------------|
| `stagingCount` | number | Count of non-bot PRs in `core.inStaging` + `wrapper?.inStaging` |
| `pendingCount` | number | Count of non-bot PRs in `core.pendingDeployment` + `wrapper?.pendingDeployment` |

### PR (existing — no changes)

Each PR object in the arrays has:
- `number` — PR number
- `title` — PR title
- `author` — author username
- `isBot` — boolean, true for bot-authored PRs (used for count filtering)
- `mergedAt` — ISO datetime
- `repoType` — "core" or "wrapper"
- `labels` — array of label strings

## State

### Fullscreen Mode State

| State | Storage | Values |
|-------|---------|--------|
| Fullscreen active | URL query param `fullscreen` | `"true"` (active) or absent (inactive) |

No persistent storage needed. State is encoded in the URL hash, consistent with existing patterns (`showBots` param).

## Data Flow

```
current.json → loadCurrentData() → renderOverview()
                                      ├── computeCounts(city.prTracks) → { stagingCount, pendingCount }
                                      └── renderCityCard(city, counts)
                                            ├── existing env badges
                                            └── new count display elements

URL hash params → fullscreen=true → body.fullscreen CSS class → layout change
```
