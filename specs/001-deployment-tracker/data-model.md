# Data Model: eVaka Deployment Tracker

**Date**: 2026-03-02 | **Branch**: `001-deployment-tracker`

## Entities

### CityGroup

Logical grouping of eVaka instances for display and filtering.

| Field          | Type              | Description                                                |
| -------------- | ----------------- | ---------------------------------------------------------- |
| id             | string            | URL-safe identifier (e.g., "espoo", "tampere-region")      |
| name           | string            | Display name (e.g., "Espoo", "Tampere region")             |
| repositories   | Repository[]      | Associated repos (1 for Espoo, 1 wrapper + 1 core for others) |
| environments   | Environment[]     | Production and staging/test environments                   |

### Repository

A GitHub repository being monitored.

| Field          | Type              | Description                                                |
| -------------- | ----------------- | ---------------------------------------------------------- |
| owner          | string            | GitHub org/user (e.g., "espoon-voltti")                    |
| name           | string            | Repository name (e.g., "evaka")                            |
| type           | "core" \| "wrapper" | Whether this is the core eVaka repo or a wrapper          |
| submodulePath  | string \| null    | Submodule name for core ref (e.g., "evaka"), null for core |
| defaultBranch  | string            | Main branch name (e.g., "main", "master")                  |

### Environment

A deployment target (production or staging/test).

| Field          | Type              | Description                                                |
| -------------- | ----------------- | ---------------------------------------------------------- |
| id             | string            | Unique identifier (e.g., "espoo-prod", "tampere-test")     |
| type           | "production" \| "staging" | Environment type                                   |
| instances      | Instance[]        | One or more instances in this environment                  |

### Instance

A specific running eVaka deployment at a URL.

| Field          | Type              | Description                                                |
| -------------- | ----------------- | ---------------------------------------------------------- |
| name           | string            | Display name (e.g., "Tampere", "Hameenkyro")               |
| domain         | string            | Base domain (e.g., "varhaiskasvatus.tampere.fi")            |
| auth           | BasicAuth \| null | HTTP basic auth credentials reference, if required          |

### BasicAuth

Authentication credentials for instances behind HTTP basic auth.

| Field          | Type              | Description                                                |
| -------------- | ----------------- | ---------------------------------------------------------- |
| username       | string            | From environment variable / secret                         |
| password       | string            | From environment variable / secret                         |

### VersionSnapshot

The resolved version information for an instance at a point in time.

| Field          | Type              | Description                                                |
| -------------- | ----------------- | ---------------------------------------------------------- |
| instanceDomain | string            | Domain that was checked                                    |
| checkedAt      | string (ISO 8601) | When the check was performed                               |
| status         | "ok" \| "unavailable" \| "auth-error" | Check result                        |
| wrapperCommit  | CommitInfo \| null | Deployed commit in the wrapper repo (null for core-only)  |
| coreCommit     | CommitInfo \| null | Deployed core eVaka commit (resolved via submodule for wrappers) |

### CommitInfo

Details about a specific git commit.

| Field          | Type              | Description                                                |
| -------------- | ----------------- | ---------------------------------------------------------- |
| sha            | string            | Full commit SHA                                            |
| shortSha       | string            | First 7 characters of SHA                                  |
| message        | string            | Cleaned commit message (first line)                        |
| date           | string (ISO 8601) | Commit date                                                |
| author         | string            | GitHub username or commit author name                      |

### PullRequest

A code change merged into a repository.

| Field          | Type              | Description                                                |
| -------------- | ----------------- | ---------------------------------------------------------- |
| number         | number            | PR number in the repository                                |
| title          | string            | PR title                                                   |
| author         | string            | PR author username                                         |
| mergedAt       | string (ISO 8601) | When the PR was merged                                     |
| repository     | string            | Full repo identifier (e.g., "espoon-voltti/evaka")         |
| repoType       | "core" \| "wrapper" | Which repository track                                   |
| isBot          | boolean           | Whether this is an automated dependency update PR          |
| url            | string            | GitHub PR URL                                              |

### DeploymentStatus

Derived status of a PR relative to environments.

| Field          | Type              | Description                                                |
| -------------- | ----------------- | ---------------------------------------------------------- |
| prNumber       | number            | PR number                                                  |
| repository     | string            | Full repo identifier                                       |
| status         | "merged" \| "in-staging" \| "in-production" | Deployment stage        |
| inEnvironments | string[]          | List of environment IDs where this PR is deployed          |

### DeploymentEvent

A detected version change in an environment.

| Field          | Type              | Description                                                |
| -------------- | ----------------- | ---------------------------------------------------------- |
| id             | string            | Unique event ID (e.g., timestamp + environment ID)         |
| environmentId  | string            | Which environment changed                                  |
| cityGroupId    | string            | Which city group                                           |
| detectedAt     | string (ISO 8601) | When the change was detected                               |
| previousCommit | CommitInfo \| null | Previous deployed commit (null for first detection)       |
| newCommit      | CommitInfo        | New deployed commit                                        |
| includedPRs    | PullRequest[]     | PRs between previous and new commit                        |
| repoType       | "core" \| "wrapper" | Which repo track changed                                 |

## Persisted Data Files

### data/current.json

Complete current deployment state. Regenerated on each run.

```
{
  generatedAt: ISO 8601,
  cityGroups: [
    {
      id, name,
      environments: [
        {
          id, type,
          version: VersionSnapshot,          // representative instance
          versionMismatch: boolean,          // true if instances differ
          mismatchDetails: VersionSnapshot[] // only if mismatch
        }
      ],
      prTracks: {
        wrapper: {
          repository: string,
          deployed: PullRequest[],           // last 5 in prod
          inStaging: PullRequest[],          // last 5 in staging
          pendingDeployment: PullRequest[]   // merged, not deployed
        } | null,                            // null for Espoo (no wrapper)
        core: {
          repository: "espoon-voltti/evaka",
          deployed: PullRequest[],
          inStaging: PullRequest[],
          pendingDeployment: PullRequest[]
        }
      }
    }
  ]
}
```

### data/history.json

Chronological deployment events. Appended on each run, pruned to 1 month.

```
{
  events: DeploymentEvent[]    // sorted by detectedAt descending
}
```

### data/previous.json

Minimal state for change detection. Contains only version SHAs from the last run.

```
{
  checkedAt: ISO 8601,
  versions: {
    [environmentId]: {
      wrapperSha: string | null,
      coreSha: string | null
    }
  }
}
```

## State Transitions

### PR Deployment Status Flow

```
PR merged to main
    → "merged" (not in any environment)
        → "in-staging" (deployed to staging/test, not prod)
            → "in-production" (deployed to production)
```

### Instance Check Status

```
Instance check
    → "ok" (endpoint reachable, version resolved)
    → "unavailable" (endpoint unreachable or error response)
    → "auth-error" (HTTP 401/403 for auth-protected instances)
```

## Relationships

- CityGroup 1:N Environment
- Environment 1:N Instance (Tampere region has multiple per env)
- CityGroup 1:N Repository (wrapper + core, or just core for Espoo)
- DeploymentEvent N:1 Environment
- DeploymentEvent N:M PullRequest (PRs included in a deployment)
- PullRequest N:1 Repository
