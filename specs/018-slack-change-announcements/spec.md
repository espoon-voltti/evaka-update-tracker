# Feature Specification: Slack Change Announcements

**Feature Branch**: `018-slack-change-announcements`
**Created**: 2026-03-09
**Status**: Draft
**Input**: User description: "Add another separate Slack integration feature to the app: Whenever we notice new changes are pushed to core or wrapper repos, announce them on Slack channels: core features on one channel and wrapper features on separate channels. These announcements should be minimal, e.g. just this row with links: #8628 Testidatan refaktorointi - ei käytetä lateinit — Joosakur. Bot updates should be silently ignored."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Core repo change announced on Slack (Priority: P1)

A developer merges a PR to the core eVaka repository. During the next data pipeline run, the system detects the new commit(s), identifies the included human PRs, and posts a minimal one-line announcement per PR to the configured core Slack channel.

**Why this priority**: The core repository is shared across all cities, making core change visibility the highest-value notification.

**Independent Test**: Can be fully tested by merging a human PR to core, running the pipeline, and verifying the Slack message appears in the core channel with the correct format.

**Acceptance Scenarios**:

1. **Given** a human PR was merged to the core repo since the last pipeline run, **When** the pipeline detects the new commit, **Then** a minimal Slack message is posted to the core channel in the format: `#8628 Testidatan refaktorointi - ei käytetä lateinit — Joosakur` where the PR number is a clickable link to the PR on GitHub.
2. **Given** multiple human PRs were merged to core since the last run, **When** the pipeline detects the changes, **Then** one line per PR is posted (either as separate messages or grouped into a single message with one line per PR).
3. **Given** only bot PRs (e.g., dependabot, renovate) were merged to core, **When** the pipeline detects the changes, **Then** no announcement is posted to Slack.

---

### User Story 2 - Wrapper repo changes announced on separate channels (Priority: P1)

A developer merges a PR to a city-specific wrapper repository (e.g., trevaka, evakaoulu). The system detects the change and posts the announcement to that wrapper's dedicated Slack channel, separate from the core channel.

**Why this priority**: Each city team needs visibility into their own wrapper changes without noise from other cities or core.

**Independent Test**: Can be tested by merging a human PR to a wrapper repo, running the pipeline, and verifying the message appears only on that wrapper's Slack channel.

**Acceptance Scenarios**:

1. **Given** a human PR was merged to a wrapper repo, **When** the pipeline detects the change, **Then** the announcement is posted to the Slack channel configured for that specific wrapper, not the core channel.
2. **Given** changes occur in both core and a wrapper repo in the same pipeline run, **When** announcements are sent, **Then** core changes go to the core channel and wrapper changes go to the wrapper's channel independently.

---

### User Story 3 - Bot PRs silently ignored (Priority: P2)

Bot-generated PRs (dependabot, renovate, automated submodule bumps, etc.) are silently excluded from change announcements. No message is sent and no "no changes" placeholder appears.

**Why this priority**: Bot PRs create noise and are not interesting to developers tracking feature work.

**Independent Test**: Can be tested by having only bot PRs merged, running the pipeline, and confirming zero Slack messages are sent.

**Acceptance Scenarios**:

1. **Given** a mix of human and bot PRs were merged, **When** announcements are sent, **Then** only human PRs appear in the messages.
2. **Given** only bot PRs were merged since the last run, **When** the pipeline runs, **Then** no Slack message is sent for that repo.

---

### Edge Cases

- What happens when the configured Slack webhook for a channel is invalid or returns an error? The system should log a warning and continue without failing the pipeline (consistent with existing fault-isolation behavior).
- What happens when no webhook is configured for a particular repo type? That repo's changes are skipped silently with a log message.
- What happens when a PR has no title? The system should still post a line using the PR number and author.
- What happens when the same PR appears in multiple pipeline runs (e.g., due to re-processing)? The system should track which PRs have already been announced and avoid duplicates.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST detect newly merged human PRs in the core repository during each pipeline run.
- **FR-002**: System MUST detect newly merged human PRs in each wrapper repository during each pipeline run.
- **FR-003**: System MUST post a minimal Slack announcement for each detected human PR, formatted as: `#<number> <title> — <author>` where the PR number is a clickable link to the GitHub PR.
- **FR-004**: System MUST route core repo announcements to a dedicated core Slack channel (configured via environment variable).
- **FR-005**: System MUST route each wrapper repo's announcements to a separate, dedicated Slack channel (configured via environment variables per wrapper).
- **FR-006**: System MUST silently exclude bot PRs from announcements (using the existing bot classification logic).
- **FR-007**: System MUST NOT send any Slack message when only bot PRs are detected for a given repo.
- **FR-008**: System MUST NOT fail the pipeline if a Slack webhook is unavailable or returns an error.
- **FR-009**: System MUST avoid re-announcing PRs that were already announced in a previous pipeline run.

### Key Entities

- **Change Announcement**: A minimal Slack message line representing a single merged PR — includes PR number (linked), title, and author.
- **Announcement Channel**: A Slack channel destination determined by the repository type (core vs. wrapper) and configured via environment variables.
- **Announced PR Tracker**: A record of which PRs have already been announced, used to prevent duplicate announcements across pipeline runs.

## Assumptions

- The existing change detection mechanism (comparing commit SHAs between pipeline runs via `previous.json`) already identifies which PRs were merged. This feature builds on top of that detection.
- The existing bot classification logic (`pr-classifier.ts`) is sufficient for filtering bot PRs.
- Channel configuration will follow the existing pattern of environment variables (similar to `SLACK_WEBHOOK_URL_<ID>`), extended with new variables for change announcement channels.
- This feature is independent from the existing deployment notification system — it runs alongside it without replacing or modifying deployment notifications.
- Multiple PRs detected in a single pipeline run for the same repo can be grouped into one Slack message with one line per PR.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every human PR merged to a tracked repository is announced on the correct Slack channel within one pipeline cycle of being detected.
- **SC-002**: Zero bot PRs appear in Slack change announcements.
- **SC-003**: Core and wrapper announcements are never mixed — each goes to its designated channel.
- **SC-004**: No duplicate announcements for the same PR across multiple pipeline runs.
- **SC-005**: A Slack webhook failure for one channel does not prevent announcements on other channels or block the pipeline.
