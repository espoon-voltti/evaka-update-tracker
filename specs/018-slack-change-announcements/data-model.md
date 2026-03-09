# Data Model: Slack Change Announcements

## Entities

### RepoHeadsData

Persisted state tracking the last-known HEAD SHA for each monitored repository.

**File**: `data/repo-heads.json`

**Fields**:
- `checkedAt` (string, ISO 8601) — timestamp of last check
- `repos` (Record<string, RepoHeadEntry>) — keyed by repo identifier (`owner/name`)

### RepoHeadEntry

**Fields**:
- `sha` (string) — last-known HEAD commit SHA on the default branch
- `branch` (string) — default branch name (`master` or `main`)

**Example**:
```json
{
  "checkedAt": "2026-03-09T10:00:00.000Z",
  "repos": {
    "espoon-voltti/evaka": {
      "sha": "c1c5b3c7d0238c06e05f91a68df1bc9400ad3c64",
      "branch": "master"
    },
    "Tampere/trevaka": {
      "sha": "2a33a649c8e1cb8f8f621f2ab376ac382655f2ff",
      "branch": "main"
    },
    "Oulunkaupunki/evakaoulu": {
      "sha": "abc123...",
      "branch": "main"
    },
    "City-of-Turku/evakaturku": {
      "sha": "def456...",
      "branch": "main"
    }
  }
}
```

### TrackedRepository

Runtime entity extracted from existing city group configuration. Not persisted separately.

**Fields**:
- `owner` (string) — GitHub organization/user
- `name` (string) — repository name
- `type` (`'core' | 'wrapper'`) — repo type for channel routing
- `defaultBranch` (string) — branch to monitor
- `cityGroupId` (string | null) — associated city group (null for core, since it's shared)

### ChangeAnnouncement

Runtime entity representing a set of PRs to announce for one repository.

**Fields**:
- `repository` (string) — `owner/name`
- `repoType` (`'core' | 'wrapper'`) — determines which channel to post to
- `cityGroupId` (string | null) — for wrapper channel routing
- `prs` (PullRequest[]) — human PRs to announce (reuses existing `PullRequest` type)

## Relationships

```
CityGroup (existing)
  └── Repository[] (existing)
        └── TrackedRepository (derived, deduplicated)
              └── RepoHeadEntry (persisted in repo-heads.json)
              └── ChangeAnnouncement (runtime, per pipeline run)
                    └── PullRequest[] (reuses existing type, filtered to human-only)
```

## State Transitions

### repo-heads.json Lifecycle

1. **First run (file missing)**: Create empty structure. Fetch current HEAD for each repo. Store HEADs but don't announce anything (no baseline to compare against).
2. **Subsequent runs (file exists)**: Read stored HEADs. Fetch current HEADs. For any repo where HEAD changed, collect PRs between old and new SHA, filter bots, send announcement, update stored HEAD.
3. **New repo added**: If a repo appears in config but not in `repo-heads.json`, treat as first run for that repo (store HEAD, don't announce).
4. **Repo removed from config**: Ignored — stale entries in `repo-heads.json` are harmless.

## Validation Rules

- `sha` must be a 40-character hex string
- `branch` must be a non-empty string
- `checkedAt` must be a valid ISO 8601 timestamp
- `repos` keys must be in `owner/name` format
