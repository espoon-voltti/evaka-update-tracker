# Data Model: Highlight Staging Branch Changes

## Modified Entities

### DeploymentEvent (extended)

Existing entity in `src/types.ts`. Two new optional fields added:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | yes | Existing: unique event identifier |
| environmentId | string | yes | Existing: environment reference |
| cityGroupId | string | yes | Existing: city group reference |
| detectedAt | string | yes | Existing: ISO 8601 timestamp |
| previousCommit | CommitInfo \| null | yes | Existing: previous deployed commit |
| newCommit | CommitInfo | yes | Existing: newly deployed commit |
| includedPRs | PullRequest[] | yes | Existing: PRs between commits |
| repoType | 'core' \| 'wrapper' | yes | Existing: repository type |
| **branch** | **string \| null** | **no** | **New: detected branch name, null if on default branch or unknown** |
| **isDefaultBranch** | **boolean** | **no** | **New: true if commit is on default branch, false if not, undefined for legacy events** |

**Validation rules**:
- `branch` is `null` when `isDefaultBranch` is `true` or `undefined`
- `branch` contains the branch name string when `isDefaultBranch` is `false` and branch was detected
- `branch` can be `null` even when `isDefaultBranch` is `false` (branch name couldn't be determined)
- Legacy events (before this feature) have both fields `undefined` — frontend treats as "unknown/no indicator"

### StagingContext (extended)

Existing entity in `src/types.ts`. One new optional field:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| inStagingCount | number | yes | Existing: PRs in staging but not production |
| productionAvailable | boolean | yes | Existing: whether city has production env |
| **isBranchDeployment** | **boolean** | **no** | **New: true if staging is running a non-default branch** |
| **branchName** | **string \| null** | **no** | **New: branch name if detected** |

## New API Function

### `isCommitOnDefaultBranch(owner, repo, defaultBranch, commitSha)`

Uses the existing compare endpoint to check if a commit is an ancestor of the default branch.

**Input**: repository owner, name, default branch name, commit SHA
**Output**: `{ onDefaultBranch: boolean, branchName: string | null }`

**Logic**:
1. Call `compare/{defaultBranch}...{commitSha}`
2. If response has 0 ahead commits → commit is on default branch
3. If response has >0 ahead commits → commit is NOT on default branch
4. If not on default branch, attempt branch name lookup via `commits/{sha}/branches-where-head`

## Frontend Data Access

The frontend reads `data/history.json` which contains `DeploymentEvent[]`. The new fields (`branch`, `isDefaultBranch`) are used in:

1. **History view**: Show branch badge and commit links
2. **City detail view**: Show branch indicator on staging status

No changes to `data/current.json` structure. Branch info is event-level, not environment-level.

## Backward Compatibility

- All new fields are optional (`?` in TypeScript)
- Existing `data/history.json` entries remain valid — `undefined` fields mean "legacy, no branch info"
- Frontend gracefully handles missing fields (no branch indicator shown)
- Backfill process adds the new fields to existing entries where possible
