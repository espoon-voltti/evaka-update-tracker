# Feature Specification: Highlight Staging Branch Changes

**Feature Branch**: `024-highlight-staging-branch-changes`
**Created**: 2026-03-27
**Status**: Draft
**Input**: User description: "We use the staging environments sometimes to test changes which are not yet in master/main branch. Update Slack notifications and the GH Pages views to highlight when there are non-master/main branch changes in the environment. Add commit ID short versions into the history log and make them link to GH commits. The GH pages change should add the missing info to existing no-info log entries, but make sure we don't send any extra Slack messages once this change is applied."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Staging Branch Detection in Slack (Priority: P1)

As a team member monitoring Slack, I want to clearly see when a staging environment is running a non-main branch (e.g. a feature branch) so I understand that the listed changes may be misleading or not applicable.

Currently, when someone deploys a feature branch to staging, the Slack notification shows PRs between the previous commit and the new commit as if they are "changes," but those PRs may have nothing to do with the feature branch being tested. This is misleading. Instead, the message should clearly indicate that a non-main/master branch is deployed and adjust the change information accordingly.

**Why this priority**: Misleading Slack messages are the core problem. Developers currently receive confusing notifications that suggest wrong changes are deployed, leading to misunderstandings about what's actually running in staging.

**Independent Test**: Can be tested by deploying a non-main branch to staging and verifying the Slack message clearly indicates it's a branch deployment with appropriate context.

**Acceptance Scenarios**:

1. **Given** a staging environment is updated with a commit from the main/master branch, **When** a Slack notification is sent, **Then** the notification looks and behaves exactly as it does today (no change to existing behavior).
2. **Given** a staging environment is updated with a commit from a non-main branch (e.g. `feature/my-change`), **When** a Slack notification is sent, **Then** the notification clearly indicates the branch name and that this is a branch deployment (not a normal main-branch update).
3. **Given** a staging environment switches from a non-main branch back to a main/master branch commit, **When** a Slack notification is sent, **Then** the notification returns to the standard format showing normal PR-based changes.

---

### User Story 2 - Commit IDs with Links in History View (Priority: P2)

As a team member browsing the GH Pages history view, I want to see short commit IDs (linked to the actual GitHub commits) in each history log entry so I can quickly identify which exact commit is deployed and navigate to it.

Currently, the history view shows release entries grouped by timestamp with PR lists, but does not display the commit SHA that was deployed. Adding short commit IDs (e.g. `438b2c8`) as clickable links to the GitHub commit page provides a quick reference point.

**Why this priority**: Commit IDs provide crucial context for understanding deployments, especially when branch deployments happen and PR lists may not be meaningful.

**Independent Test**: Can be tested by viewing the history page and verifying each release entry shows linked short commit SHAs for all repo types involved.

**Acceptance Scenarios**:

1. **Given** a history entry exists with commit information, **When** viewing the history page, **Then** the entry displays the short commit ID (7 characters) as a clickable link to the GitHub commit page.
2. **Given** a history entry involves both core and wrapper repos, **When** viewing the history page, **Then** both commit IDs are shown with their repo type labels (e.g. "ydin: 438b2c8, Kuntaimplementaatio: fb8cd9a").
3. **Given** existing history entries that already have commit data stored, **When** the history page loads, **Then** commit links are derived from the existing `newCommit` data without requiring a data migration.

---

### User Story 3 - Branch Highlighting in GH Pages History (Priority: P2)

As a team member browsing the GH Pages history view, I want to see when a staging deployment was from a non-main branch so I understand the context of that deployment.

**Why this priority**: Complements the Slack notification change by providing the same branch awareness in the persistent web view.

**Independent Test**: Can be tested by viewing history entries for branch deployments and verifying the branch name is displayed as a visual indicator.

**Acceptance Scenarios**:

1. **Given** a history entry records a deployment from a non-main branch, **When** viewing the history page, **Then** the branch name is visually highlighted (e.g. a badge or label) alongside the release entry.
2. **Given** a history entry records a normal main/master branch deployment, **When** viewing the history page, **Then** no branch indicator is shown (to avoid visual noise).
3. **Given** existing history entries without branch information, **When** viewing the history page, **Then** they display normally without any branch indicator (graceful degradation).

---

### User Story 4 - Backfill Missing Info in History Entries (Priority: P3)

As a team member, I want the system to enrich existing history log entries that are missing commit or branch information so the history view becomes more complete over time, but without triggering any extra Slack notifications.

**Why this priority**: Improves the quality of historical data, but existing entries are lower priority than getting new entries correct.

**Independent Test**: Can be tested by running the data pipeline with existing no-info entries and verifying they get enriched without any Slack messages being sent.

**Acceptance Scenarios**:

1. **Given** existing history entries with missing commit or branch information, **When** the data pipeline runs, **Then** missing information is backfilled from available data (e.g. matching environment versions).
2. **Given** a backfill operation enriches existing entries, **When** the pipeline processes these entries, **Then** no Slack notifications are triggered for backfilled data.
3. **Given** an existing entry that cannot be enriched (data no longer available), **When** the pipeline runs, **Then** the entry remains unchanged and displays gracefully.

---

### Edge Cases

- What happens when the staging environment returns to a main/master branch commit after a branch deployment? The system should treat this as a normal update and show standard PR changes.
- What happens when the branch name cannot be determined (e.g. API failure)? The system should fall back to the current behavior without branch indicators.
- What happens when a staging deployment uses a commit that exists on both a feature branch and main? The system should check whether the commit is reachable from the default branch HEAD to determine if it's a "branch deployment."
- What happens to history entries created before this feature existed? They should display normally without branch info, and the backfill process should attempt to enrich them where possible.
- What happens when multiple staging environments simultaneously run different branches? Each environment's notifications and history entries should independently reflect their respective branch state.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST detect when a staging environment's deployed commit is not on the repository's default branch (main/master).
- **FR-002**: System MUST include the branch name in Slack notifications for staging deployments from non-main branches.
- **FR-003**: Slack notifications for non-main branch staging deployments MUST clearly differentiate themselves from normal staging updates (e.g. different wording, visual indicators).
- **FR-004**: Slack notifications for non-main branch staging deployments SHOULD adjust or omit the PR change list, since PRs between commits on different branches may be misleading.
- **FR-005**: System MUST store branch information in deployment event data so it persists in history.
- **FR-006**: The GH Pages history view MUST display short commit IDs (7 characters) for each deployment event, linked to the GitHub commit page.
- **FR-007**: The GH Pages history view MUST visually indicate when a staging deployment was from a non-main branch, showing the branch name.
- **FR-008**: The system MUST attempt to backfill missing commit/branch information in existing history entries during data pipeline runs.
- **FR-009**: Backfill operations MUST NOT trigger any Slack notifications.
- **FR-010**: Normal main/master branch deployments (both production and staging) MUST continue to work exactly as they do today.

### Key Entities

- **Deployment Event**: Extended with optional branch information — the branch name the deployed commit belongs to, and whether that branch is the default (main/master) branch.
- **Staging Context**: Extended with branch awareness — indicates if the staging environment is running a non-default branch, making the "N changes vs production" comparison potentially misleading.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of non-main branch staging deployments produce Slack messages that clearly identify the branch name and distinguish themselves from normal staging updates.
- **SC-002**: 100% of history view entries display clickable short commit IDs linking to the correct GitHub commit page.
- **SC-003**: Non-main branch staging deployments are visually distinct in both Slack and GH Pages history view within 1 data pipeline run of the deployment.
- **SC-004**: Zero extra Slack notifications are sent as a result of backfilling existing history entries.
- **SC-005**: Existing history entries without branch data continue to display correctly (graceful degradation).

## Assumptions

- The system can determine whether a commit is on the default branch by checking if it's an ancestor of the default branch HEAD (using the GitHub API's compare endpoint or similar).
- The deployed commit SHA is already available from environment version checks; no additional infrastructure is needed to obtain it.
- Branch information for the deployed commit can be determined via the GitHub API (e.g. comparing the commit against the default branch).
- "Non-main branch" means any branch other than the repository's configured default branch (typically `main` or `master`).
- The `newCommit` data already present in history.json entries contains enough information (SHA) to derive commit links without data migration.
