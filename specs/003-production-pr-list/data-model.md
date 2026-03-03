# Data Model: Production PR List

No data model changes required. The existing `PRTrack.deployed` array already models production PRs correctly.

## Existing Entities (unchanged)

### PRTrack
Categorizes PRs by deployment stage for a single repository within a city group.

| Field              | Type            | Description                                     |
|--------------------|-----------------|------------------------------------------------|
| repository         | string          | Repository identifier (e.g., "espoon-voltti/evaka") |
| deployed           | PullRequest[]   | Up to 5 human-authored PRs deployed to production |
| inStaging          | PullRequest[]   | Up to 5 human-authored PRs in staging, not yet in production |
| pendingDeployment  | PullRequest[]   | Up to 5 human-authored PRs merged but not deployed anywhere |

### PullRequest
Individual pull request with deployment context.

| Field      | Type                  | Description                          |
|------------|-----------------------|--------------------------------------|
| number     | number                | PR number                            |
| title      | string                | PR title                             |
| author     | string                | GitHub username of PR author         |
| mergedAt   | string (ISO 8601)     | When the PR was merged               |
| repository | string                | Repository identifier                |
| repoType   | 'core' \| 'wrapper'   | Repository type                      |
| isBot      | boolean               | Whether this is a bot/dependency PR  |
| url        | string                | URL to the PR on GitHub              |

## Data Flow (unchanged)

```
GitHub API (compare SHAs) → extractPRsFromCommits() → filterHumanPRs(limit=5) → PRTrack.deployed
```

The `deployed` array is populated when `previousProdSha !== currentProdSha` — i.e., when a production deployment is detected between tracker runs.
