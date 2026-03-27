# Research: Highlight Staging Branch Changes

## R1: How to detect if a deployed commit is on the default branch

**Decision**: Use GitHub's compare API (`/repos/{owner}/{repo}/compare/{defaultBranch}...{deployedSha}`) and check if there are commits ahead. If `commits.length > 0`, the deployed SHA contains commits not on the default branch → branch deployment. If `commits.length === 0`, the commit is an ancestor of the default branch → normal deployment.

**Rationale**: The existing `compareShas()` function in `src/api/github.ts` already wraps this endpoint. It returns the list of commits reachable from `head` but not from `base`. This is the cheapest single-API-call approach that reliably detects divergence. No new GitHub API methods are needed.

**Alternatives considered**:
- `GET /repos/{owner}/{repo}/commits/{sha}/branches-where-head` — only returns branches where the commit is HEAD, not useful for older commits
- `GET /repos/{owner}/{repo}/branches` + iterate — too many API calls
- Compare response `status` field ("identical", "ahead", "behind", "diverged") — would require extending `compareShas()` to return the full response, not just commits; but checking `commits.length` achieves the same result more simply

**Implementation note**: The compare response actually has `status` and `ahead_by`/`behind_by` fields. We should extend `compareShas` or add a new function that returns at least `status` and `ahead_by` to detect non-main branch deployments without fetching the full commit list.

## R2: How to determine the branch name of a deployed commit

**Decision**: Use GitHub's `GET /repos/{owner}/{repo}/commits/{sha}/branches-where-head` as a best-effort lookup. If the SHA is the HEAD of exactly one non-default branch, use that name. Otherwise, fall back to "ei pääkehityshaarassa" ("not on default branch") without a specific branch name.

**Rationale**: In practice, when someone deploys a feature branch to staging, the deployed commit is typically the HEAD of that branch. This endpoint is lightweight (single API call) and covers the common case. The fallback handles edge cases gracefully.

**Alternatives considered**:
- Requiring the deployer to tag or annotate the deployment — too much process overhead
- Using `GET /repos/{owner}/{repo}/branches?contains={sha}` — not a real GitHub API endpoint
- Storing branch info at deployment time — not feasible since we detect deployments from instance version endpoints, not from deployment triggers

## R3: Where to store branch information in the data model

**Decision**: Add an optional `branch` field to `DeploymentEvent`:
```
branch?: string | null  // null = on default branch or unknown
```

And extend the compare response to also return the status. Add a new `isDefaultBranch` boolean field to `DeploymentEvent`:
```
isDefaultBranch?: boolean  // undefined for legacy events, true/false for new
```

**Rationale**: Minimal data model change. The `branch` field stores the detected branch name (if available). The `isDefaultBranch` field explicitly records the detection result. Both are optional for backward compatibility with existing history entries. Frontend handles `undefined` as "unknown/legacy" (no indicator shown).

**Alternatives considered**:
- Storing in a separate data file — unnecessary complexity for per-event data
- Using a flag in `StagingContext` only — wouldn't persist in history

## R4: How to prevent Slack notifications for backfilled entries

**Decision**: Separate the backfill logic from the normal event detection pipeline. Backfill runs after Slack notifications are sent and only modifies existing history entries in-place (adding branch/commit info). Since Slack notifications are triggered by `allEvents` (newly detected events), enriching existing entries doesn't create new events and thus can't trigger notifications.

**Rationale**: The current architecture already separates event detection (which triggers Slack) from history storage. Backfill operates only on the history file, not on the event detection pipeline.

## R5: How to build commit links in the frontend history view

**Decision**: Derive commit URLs from existing `newCommit.sha` data combined with the repository information available in each event's `includedPRs[0].repository` field. For core events without PRs, use the hardcoded core repo path (`espoon-voltti/evaka`). For wrapper events, derive from the city group context.

**Rationale**: The `newCommit` data (including `sha` and `shortSha`) is already present in all history events. The repository path is needed to construct the GitHub URL. This is consistent with how `getCommitUrl()` works in `src/api/slack.ts`.

**Alternatives considered**:
- Adding a `repository` field to `DeploymentEvent` — cleaner but requires data migration for existing events
- Adding `commitUrl` directly to events — couples data to presentation

## R6: Slack message format for branch deployments

**Decision**: For non-default-branch staging deployments:
1. Change the header emoji and label to indicate branch testing (e.g., "🔀 City — Staging / haaran testaus")
2. Show the branch name in the version field
3. Replace the PR changes section with a note that this is a branch deployment (since PRs between the previous commit and a feature branch commit are misleading)
4. Keep the staging context but note that comparison to production may not be meaningful

**Rationale**: The core problem is that current Slack messages show misleading PR lists when a feature branch is deployed. Replacing the PR list with clear branch deployment messaging directly addresses this.
