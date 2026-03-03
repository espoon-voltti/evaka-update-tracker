# Feature Specification: Populate History Data & Fix History Display

**Feature Branch**: `004-populate-history-data`
**Created**: 2026-03-03
**Status**: Draft
**Input**: User description: "Fill data resources from update_history log exports, collect updates that went live in past deployments, and fix history view showing 'No PR details available' despite data existing."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Historical Deployment PRs (Priority: P1)

A deployment tracker user navigates to a city's deployment history page and sees the list of pull requests included in each past deployment. Each history entry shows the commit range, environment, repository type, and an expandable list of PRs that were part of that deployment.

**Why this priority**: This is the core value proposition of the history view. Without PR details, the history page provides minimal useful information beyond raw commit hashes. Users need to see what changes went live in each deployment to audit, debug, or communicate about releases.

**Independent Test**: Can be fully tested by navigating to any city's history page and verifying that deployment events display their included PRs with title, author, number, and link.

**Acceptance Scenarios**:

1. **Given** a deployment event with a known previous and new commit, **When** a user views the history page for that city, **Then** each deployment card shows the PRs merged between those two commits with PR number, title, author, and a link to the PR on GitHub.
2. **Given** a deployment event that is the first recorded deployment (no previous commit), **When** a user views the history page, **Then** the card shows just the initial commit information without PR details (since there is no commit range to compare).
3. **Given** a deployment event where the commit range contains only bot/dependency-update PRs, **When** a user views the history page, **Then** those bot PRs are still shown (since historical data should be comprehensive).

---

### User Story 2 - Populate History from Log Exports (Priority: P1)

An administrator has exported deployment logs from each environment (stored as JSON files in `update_history/`). The system processes these log exports to create a complete deployment history, converting sequential commit entries into deployment events with commit ranges (previous commit to new commit) and associating the correct PRs for each range by querying GitHub.

**Why this priority**: Without historical data population, the history view only contains events from the live tracker's runtime. The log exports represent weeks of real deployment data that should be backfilled to provide immediate value.

**Independent Test**: Can be tested by running the data population process against the update_history JSON files and verifying that `data/history.json` contains deployment events with populated `includedPRs` arrays.

**Acceptance Scenarios**:

1. **Given** update_history JSON files for 8 environments (4 prod, 4 test/staging), **When** the population process runs, **Then** `data/history.json` contains deployment events for all environments with commit ranges derived from consecutive log entries.
2. **Given** consecutive log entries with different commit hashes for the same environment, **When** events are created, **Then** each event has `previousCommit` set to the older entry's commit and `newCommit` set to the newer entry's commit.
3. **Given** a commit range in a deployment event, **When** the system queries GitHub for PRs between those commits, **Then** the `includedPRs` array is populated with the merged PRs in that range.

---

### User Story 3 - Fix Live Tracker PR Collection for History Events (Priority: P2)

When the live deployment tracker detects a version change and creates a new history event, the event's `includedPRs` field is populated with the PRs merged between the previous and new commits. This fixes the existing bug where the tracker collects PRs for the current status view but passes an empty array when creating history events.

**Why this priority**: While the backfill (Story 2) provides historical data, this fix ensures future deployments also have PR details recorded. Without it, every new event would still show "No PR details available."

**Independent Test**: Can be tested by running the live tracker when a version change occurs and verifying that the resulting history event in `data/history.json` has a non-empty `includedPRs` array.

**Acceptance Scenarios**:

1. **Given** the tracker detects a version change from commit A to commit B, **When** it creates a history event, **Then** the event's `includedPRs` contains the PRs merged between commit A and commit B.
2. **Given** a version change in a wrapper repository, **When** the history event is created, **Then** `includedPRs` contains only wrapper PRs (not core PRs).
3. **Given** a version change in the core repository, **When** the history event is created, **Then** `includedPRs` contains only core PRs (not wrapper PRs).

---

### Edge Cases

- What happens when the GitHub API rate limit is exceeded during bulk history population? The system should handle rate limiting gracefully, either by waiting or by recording events with empty `includedPRs` and logging a warning.
- What happens when a commit SHA from the logs no longer exists in the repository (e.g., force-pushed)? The system should record the event with available information and empty `includedPRs`.
- What happens when two consecutive log entries have the same commit hash? No deployment event should be created since no actual change occurred.
- How are the update_history log files mapped to environments? Each file is named `{city}-{env}.json` (e.g., `tre-prod.json` maps to `tampere-prod`, `oulu-test.json` maps to `oulu-staging`).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST process update_history JSON files to generate deployment history events, converting consecutive log entries into events with previous/new commit pairs.
- **FR-002**: System MUST query the GitHub API to collect PRs merged between the previous and new commit SHAs for each deployment event.
- **FR-003**: System MUST populate `data/history.json` with deployment events from all 8 environments (espoo-prod, espoo-staging, tampere-prod, tampere-test, oulu-prod, oulu-test, turku-prod, turku-test).
- **FR-004**: System MUST map update_history file names to the correct environment and city group identifiers (e.g., `tre-prod.json` -> environment `tampere-prod`, city group `tampere-region`).
- **FR-005**: System MUST fix the live tracker so that new history events include collected PRs instead of an empty array.
- **FR-006**: System MUST correctly assign `repoType` to events. Update_history logs represent wrapper repository commits (since they come from environment-specific wrapper deployments). Core repository commits should be resolved from the wrapper's evaka submodule reference where possible.
- **FR-007**: The history view in the frontend MUST display PR details (number, title, author, link) for events that have populated `includedPRs`.
- **FR-008**: System MUST sort history events by detection timestamp in descending order (newest first).
- **FR-009**: System MUST handle GitHub API failures gracefully by recording events with empty `includedPRs` and not failing the entire process.
- **FR-010**: System MUST skip consecutive log entries with identical commit hashes (no actual deployment change).

### Key Entities

- **Update History Log Entry**: A JSON object from environment logs containing `@timestamp`, `message`, and `appCommit` fields. Represents a point in time when an environment was running a specific commit.
- **Deployment Event**: An entry in `data/history.json` representing a version change, with `previousCommit`, `newCommit`, `includedPRs`, `environmentId`, `cityGroupId`, `repoType`, and `detectedAt`.
- **Pull Request**: A merged PR with `number`, `title`, `author`, `mergedAt`, `repository`, `repoType`, `isBot`, and `url`.
- **Environment Mapping**: The relationship between update_history filenames and environment/city group identifiers (e.g., `tre-prod` -> `tampere-prod` / `tampere-region`).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 8 update_history environment files are processed and their deployment events appear in `data/history.json`.
- **SC-002**: At least 80% of deployment events with valid commit ranges have non-empty `includedPRs` arrays after population.
- **SC-003**: The history view for each city shows PR details (title, number, author) for events that have `includedPRs` data, instead of "No PR details available."
- **SC-004**: Future deployments detected by the live tracker produce history events with populated `includedPRs` (fixing the existing bug).
- **SC-005**: The history population process completes successfully without manual intervention, handling API errors gracefully.

## Assumptions

- The update_history JSON files each contain wrapper repository commit hashes (since they come from the API Gateway startup logs in each city's deployment environment).
- The environment name mapping follows a known convention: `tre` -> `tampere`, `espoo` -> `espoo`, `oulu` -> `oulu`, `turku` -> `turku`; and `prod` -> production, `test`/`staging` -> staging.
- The GitHub API is accessible and the existing authentication/token configuration is sufficient for querying commit comparisons and PR details.
- The existing `pr-collector.ts` service can be reused for collecting PRs between commit SHAs.
- History events from the log backfill should be merged with any existing events in `data/history.json` without creating duplicates.
