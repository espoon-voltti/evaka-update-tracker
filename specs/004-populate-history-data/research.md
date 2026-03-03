# Research: Populate History Data & Fix History Display

## R-001: Root Cause of "No PR details available"

**Decision**: The bug is in `src/index.ts` line 108 where `detectChanges()` is called with an empty array `[]` for the `includedPRs` parameter, even though PRs are collected later in the same loop iteration for `current.json`.

**Rationale**: The `detectChanges()` function correctly filters PRs by `repoType` (lines 46, 62 of `change-detector.ts`), but it receives `[]` so filtering yields nothing. The PR collection via `collectPRsForRepo()` happens at lines 134-159 of `index.ts`, _after_ event detection at line 108.

**Fix**: Restructure the main loop to collect PRs _before_ creating events, then pass them to `detectChanges()`. Alternatively, collect PRs per-environment (not just per-city-group) to correctly associate them with the right environment events.

**Alternatives considered**:
- Post-processing: Enrich events after PR collection — rejected because it requires matching events back to PRs by commit range, duplicating logic already in `detectChanges()`.
- Reorder the loop: Move PR collection before event detection — chosen, simplest approach.

## R-002: Update History File Structure & Environment Mapping

**Decision**: Each file in `update_history/` contains an array of log entries sorted newest-first, with `@timestamp`, `message`, and `appCommit` fields. The `appCommit` is the wrapper repository commit for cities with wrappers (Tampere, Oulu, Turku) and the core repository commit for Espoo (which has no wrapper).

**File-to-environment mapping**:

| File              | Environment ID   | City Group ID    | Has Wrapper |
|-------------------|------------------|------------------|-------------|
| espoo-prod.json   | espoo-prod       | espoo            | No          |
| espoo-staging.json| espoo-staging    | espoo            | No          |
| tre-prod.json     | tampere-prod     | tampere-region   | Yes         |
| tre-test.json     | tampere-test     | tampere-region   | Yes         |
| oulu-prod.json    | oulu-prod        | oulu             | Yes         |
| oulu-test.json    | oulu-staging     | oulu             | Yes         |
| turku-prod.json   | turku-prod       | turku            | Yes         |
| turku-test.json   | turku-staging    | turku            | Yes         |

**Rationale**: Mapping derived from `src/config/instances.ts` which defines the hardcoded city groups and their environment IDs. The `tre-` prefix maps to `tampere-` environments, and `test` environments map to `staging` type.

## R-003: Backfill Strategy for Converting Log Entries to Deployment Events

**Decision**: Process each update_history file chronologically (oldest first). Consecutive entries with different `appCommit` values become a deployment event where the older entry's commit is `previousCommit` and the newer entry's commit is `newCommit`. The `detectedAt` timestamp uses the newer entry's `@timestamp`.

**Rationale**: The logs represent successive deployments. Each commit change represents a new version being deployed to the environment.

**Event creation per log entry pair**:
1. For wrapper cities: the `appCommit` is the wrapper SHA. Use `getSubmoduleRef()` to resolve the core SHA from the wrapper repo at that commit. Create one event with `repoType: 'wrapper'` (the wrapper commit). If the resolved core SHA also changed from the previous entry, create a second event with `repoType: 'core'`.
2. For Espoo (core-only): the `appCommit` is the core SHA directly. Create one event with `repoType: 'core'`.

**PR collection per event**: Use `collectPRsBetween()` to get PRs between the previous and new commits for the appropriate repository.

**Alternatives considered**:
- Only create wrapper events for wrapper cities — rejected because users want to see core PRs too (the actual code changes).
- Create a single combined event — rejected because the existing data model separates wrapper and core events.

## R-004: GitHub API Rate Limiting Considerations

**Decision**: Use existing retry logic (`withRetry` in `src/utils/retry.ts`) and handle failures gracefully by creating events with empty `includedPRs` when API calls fail.

**Rationale**: With ~80 log entries across 8 files, generating roughly 60-70 deployment events, each needing 1-2 compare API calls plus PR detail fetches, the total API calls could be 200-400. GitHub's authenticated rate limit is 5,000/hour, so this is well within limits.

**Risk mitigation**: The `withRetry` utility already has exponential backoff (1s, 2s, 4s base with max 10s). The `compareShas` and `getPullRequest` functions already wrap calls in `withRetry`. Failures will be caught and result in empty PR arrays.

## R-005: Deduplication of Backfilled vs. Existing Events

**Decision**: Filter out events from `data/history.json` that would overlap with backfilled events. Use a combination of `environmentId + repoType + newCommit.sha` as a uniqueness key.

**Rationale**: The existing `history.json` already has events from the live tracker (with empty `includedPRs`). Backfilled events for the same deployments will have populated `includedPRs`. The backfilled versions should replace existing ones.

## R-006: Frontend Already Handles PR Display Correctly

**Decision**: No frontend changes needed for PR display. The `history-view.js` component already renders PR details when `includedPRs.length > 0`.

**Rationale**: Lines 34-47 of `site/js/components/history-view.js` check `event.includedPRs && event.includedPRs.length > 0` and render a `<details>` element with PR list when true. The "No PR details available" message only shows for empty arrays.
