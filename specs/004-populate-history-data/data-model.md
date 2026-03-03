# Data Model: Populate History Data & Fix History Display

## Existing Entities (no changes)

### DeploymentEvent
Already defined in `src/types.ts`. No schema changes needed.

| Field          | Type                | Description                                      |
|----------------|---------------------|--------------------------------------------------|
| id             | string              | Unique identifier: `{timestamp}_{envId}_{repoType}` |
| environmentId  | string              | Target environment (e.g., `tampere-prod`)        |
| cityGroupId    | string              | City group (e.g., `tampere-region`)              |
| detectedAt     | string (ISO 8601)   | When the deployment was detected/occurred        |
| previousCommit | CommitInfo \| null  | Previous version commit                          |
| newCommit      | CommitInfo          | New version commit                               |
| includedPRs    | PullRequest[]       | PRs merged between previous and new commits      |
| repoType       | `core` \| `wrapper` | Which repository this event tracks               |

### PullRequest
Already defined in `src/types.ts`. No schema changes needed.

| Field      | Type                | Description                               |
|------------|---------------------|-------------------------------------------|
| number     | number              | PR number                                 |
| title      | string              | PR title                                  |
| author     | string              | PR author login                           |
| mergedAt   | string (ISO 8601)   | Merge timestamp                           |
| repository | string              | `owner/name` format                       |
| repoType   | `core` \| `wrapper` | Which repository the PR belongs to        |
| isBot      | boolean             | Whether the PR was from a bot             |
| url        | string              | GitHub PR URL                             |

### CommitInfo
Already defined in `src/types.ts`. No schema changes needed.

| Field    | Type   | Description                |
|----------|--------|----------------------------|
| sha      | string | Full commit SHA            |
| shortSha | string | First 7 chars of SHA       |
| message  | string | First line of commit message |
| date     | string (ISO 8601) | Commit date     |
| author   | string | Commit author login/name   |

## New Entity: UpdateHistoryLogEntry

Input data from `update_history/*.json` files. Not persisted as a type — parsed at runtime.

| Field       | Type   | Description                                       |
|-------------|--------|---------------------------------------------------|
| @timestamp  | string | Log timestamp (format: `YYYY-MM-DD HH:mm:ss.SSS`) |
| message     | string | Always `"Evaka API Gateway listening on port 3000"` |
| appCommit   | string | Full commit SHA deployed to the environment        |

## New Entity: EnvironmentMapping

Configuration mapping from update_history filenames to environment identifiers. Defined as a constant in the backfill script.

| Field          | Type                | Description                               |
|----------------|---------------------|-------------------------------------------|
| fileName       | string              | Update history filename (e.g., `tre-prod`) |
| environmentId  | string              | Environment ID (e.g., `tampere-prod`)     |
| cityGroupId    | string              | City group ID (e.g., `tampere-region`)    |
| wrapperRepo    | Repository \| null  | Wrapper repo config (null for Espoo)      |
| coreRepo       | Repository          | Core repo config                          |

## Data Flow

```
update_history/*.json
    → Parse log entries (oldest first)
    → Group consecutive entries with different appCommit
    → For each change: resolve wrapper + core commits via GitHub API
    → For each change: collect PRs between old and new commits
    → Output: DeploymentEvent[] with populated includedPRs
    → Merge with existing history.json (deduplicate by env+repo+newSha)
    → Write updated history.json
```

## State Transitions

No state machines. Deployment events are immutable once created.

## Validation Rules

- Skip consecutive log entries with identical `appCommit` values (no actual change)
- `previousCommit` is null for the oldest log entry (first known deployment)
- `includedPRs` may be empty if GitHub API calls fail (graceful degradation)
- Event IDs must be unique (timestamp + environmentId + repoType)
