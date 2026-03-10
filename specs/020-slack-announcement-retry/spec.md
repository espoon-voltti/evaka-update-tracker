# Feature Specification: Slack Announcement Retry

**Feature Branch**: `020-slack-announcement-retry`
**Created**: 2026-03-10
**Status**: Draft
**Input**: User description: "Add retry/queue mechanism to Slack change announcements with conditional timestamps and HEAD reset for testing"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reliable Change Announcements (Priority: P1)

When a PR is merged into a tracked repository, the system detects the HEAD change and announces it on Slack. If the Slack webhook call fails (network error, timeout, non-200 response), the system must NOT update the stored HEAD SHA — so the same changes will be retried on the next scheduled run.

**Why this priority**: This is the core reliability improvement. Without it, failed announcements are silently lost forever.

**Independent Test**: Simulate a Slack webhook failure, verify HEAD is not updated, then run again with Slack available and verify the announcement is sent and HEAD is updated.

**Acceptance Scenarios**:

1. **Given** a HEAD change is detected and Slack returns HTTP 200, **When** the announcement cycle completes, **Then** the HEAD is updated to the new SHA
2. **Given** a HEAD change is detected and Slack returns HTTP 500, **When** the announcement cycle completes, **Then** the HEAD remains at the previous SHA
3. **Given** a HEAD change is detected and the network times out, **When** the announcement cycle completes, **Then** the HEAD remains at the previous SHA
4. **Given** a HEAD change is detected and Slack returns 404 or 410 (webhook disabled), **When** the announcement cycle completes, **Then** the HEAD remains at the previous SHA
5. **Given** a HEAD change is detected and the webhook URL is not configured (empty), **When** the announcement cycle completes, **Then** the HEAD is still updated (no webhook = nothing to retry)
6. **Given** a previous run failed and HEAD was not updated, **When** the next run succeeds, **Then** all PRs between the stored HEAD and current HEAD are announced (covering the full gap)

---

### User Story 2 - Timestamps for Delayed Announcements (Priority: P2)

When announcing PRs that were merged more than 20 minutes ago, the announcement message includes a Finnish-locale timestamp showing when the PR was merged. This helps readers understand that the announcement is delayed (e.g., due to a previous failure or system downtime).

**Why this priority**: Adds context to delayed announcements so readers aren't confused about timing. Depends on the retry mechanism from P1.

**Independent Test**: Announce a PR merged 2 hours ago and verify the timestamp appears. Announce a PR merged 5 minutes ago and verify no timestamp is shown.

**Acceptance Scenarios**:

1. **Given** a PR was merged 2 hours ago, **When** it is announced, **Then** the message includes the merge timestamp in format "pe 6.3. klo 09.28" (Finnish weekday abbreviation, day.month., klo HH.MM)
2. **Given** a PR was merged 5 minutes ago, **When** it is announced, **Then** no timestamp is included in the message
3. **Given** a PR was merged exactly 20 minutes ago, **When** it is announced, **Then** no timestamp is included (threshold is "older than 20 minutes")
4. **Given** multiple PRs are announced at once with mixed ages, **When** the announcement is sent, **Then** each PR line individually shows or omits the timestamp based on its own merge time

---

### User Story 3 - HEAD Reset for Testing (Priority: P3)

As part of this change, the stored HEAD SHAs in `repo-heads.json` are reset to yesterday (2026-03-09) at 08:00 UTC. This ensures that upon the first deployment of the new version, the system will detect HEAD changes and announce the PRs merged since yesterday morning — providing immediate visible feedback that the feature works.

**Why this priority**: One-time convenience for deployment verification. No ongoing value.

**Independent Test**: Verify the committed `repo-heads.json` file contains SHAs corresponding to each repo's state at 2026-03-09T08:00:00Z.

**Acceptance Scenarios**:

1. **Given** the feature is deployed, **When** the first monitor run executes, **Then** it detects HEAD changes and sends Slack announcements for PRs merged since yesterday 08:00 UTC
2. **Given** the HEAD reset data is committed, **When** inspecting `repo-heads.json`, **Then** each repo entry contains the commit SHA that was HEAD at 2026-03-09T08:00:00Z

---

### Edge Cases

- What happens when the GitHub API fails to fetch the current HEAD? The repo is skipped entirely (existing behavior), HEAD is not updated for that repo
- What happens when there are no human PRs between old and new HEAD? HEAD is updated (no announcement needed, nothing to retry)
- What happens when DRY_RUN mode is active? HEAD is not updated (existing behavior), no Slack calls made
- What happens when multiple repos fail — one Slack call succeeds and another fails? Each repo's HEAD is updated independently based on its own announcement success

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST only update a repo's stored HEAD SHA after a successful Slack announcement (HTTP 200) for that repo
- **FR-002**: System MUST update HEAD when there are no human PRs to announce (no retry needed for empty announcements)
- **FR-003**: System MUST update HEAD when no webhook URL is configured for the repo (nothing to retry)
- **FR-004**: System MUST include a Finnish-locale timestamp on each PR line when the PR was merged more than 20 minutes before the announcement time
- **FR-005**: System MUST format timestamps as Finnish weekday abbreviation + day.month. + "klo" + HH.MM (e.g., "pe 6.3. klo 09.28")
- **FR-006**: System MUST omit the timestamp when the PR was merged 20 minutes ago or less
- **FR-007**: System MUST use each PR's individual merge time to determine whether to show a timestamp
- **FR-008**: System MUST track HEAD updates per-repo independently — a failure for one repo must not prevent HEAD updates for other repos that succeeded
- **FR-009**: The committed `repo-heads.json` MUST contain SHAs corresponding to each repo's state at 2026-03-09T08:00:00Z

### Key Entities

- **RepoHeadsData**: Stores the last successfully-announced HEAD SHA per tracked repository, along with a `checkedAt` timestamp. HEAD is only advanced after confirmed Slack delivery.
- **Change Announcement Message**: A Slack mrkdwn message with one line per PR. Each line optionally includes a Finnish-locale timestamp if the PR merge is older than 20 minutes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero change announcements are lost due to transient Slack failures — failed announcements are retried on subsequent runs until successful
- **SC-002**: Delayed announcements (older than 20 minutes) include a visible timestamp so readers can distinguish them from real-time notifications
- **SC-003**: All existing unit and integration tests continue to pass with the updated behavior
- **SC-004**: Upon first deployment, Slack announcements are sent for PRs merged since 2026-03-09 08:00 UTC, confirming end-to-end functionality

## Assumptions

- Finnish weekday abbreviations follow standard Finnish locale: ma, ti, ke, to, pe, la, su
- The 20-minute threshold is compared against the PR's merge timestamp from the GitHub API (`merged_at` field)
- The timestamp format uses periods as time separators (09.28) per Finnish convention, not colons
- Slack HTTP 200 is the only response code that indicates success. Any other status code (including 3xx redirects) is treated as a failure
