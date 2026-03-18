# Feature Specification: Slack Staging Details

**Feature Branch**: `023-slack-staging-details`
**Created**: 2026-03-18
**Status**: Draft
**Input**: User description: "Improve the slack announcements of staging / testing environment. The messages should have info how many other changes there are compared to the production environment and have more descriptive text on the link to the update tracker web UI"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Production Comparison Count in Staging Notifications (Priority: P1)

When a staging or testing environment is updated, the Slack notification should show how many additional changes (merged pull requests) exist in that environment compared to the current production environment for the same city group. This gives recipients immediate context about how far ahead staging is from production.

**Why this priority**: This is the core value of the feature — without the comparison count, recipients have no quick way to understand how much unreleased work is sitting in staging relative to production.

**Independent Test**: Can be fully tested by triggering a staging deployment notification for a city group that has known differences between staging and production, and verifying the message includes the correct count of additional changes.

**Acceptance Scenarios**:

1. **Given** a staging environment has 5 PRs deployed that are not yet in production, **When** a staging deployment notification is sent, **Then** the message includes text indicating there are 5 additional changes compared to production (e.g., "+5 muutosta verrattuna tuotantoon").
2. **Given** a staging environment has the same version as production (0 additional changes), **When** a staging deployment notification is sent, **Then** the message indicates staging is in sync with production (e.g., "Sama versio kuin tuotannossa").
3. **Given** a staging environment has 1 additional PR compared to production, **When** a staging deployment notification is sent, **Then** the message uses singular form (e.g., "+1 muutos verrattuna tuotantoon").

---

### User Story 2 - Descriptive Dashboard Link Text (Priority: P2)

The link to the update tracker web UI in Slack notifications for staging/testing environments should use more descriptive text than the current generic label, so that recipients understand what they will see when clicking the link.

**Why this priority**: Improves usability and click-through by making the link purpose clearer, but is secondary to the comparison count which provides new information.

**Independent Test**: Can be tested by triggering any staging deployment notification and verifying the link text in the Slack message is more descriptive than the current "Ympäristöjen tiedot" label.

**Acceptance Scenarios**:

1. **Given** a staging deployment notification is sent for a city group, **When** the message is displayed in Slack, **Then** the dashboard link text includes the city name and indicates it leads to a detailed deployment view (e.g., "Katso Espoon ympäristöjen tilanne" or similar contextual text).
2. **Given** a staging deployment notification includes a comparison count, **When** the message is displayed in Slack, **Then** the dashboard link and comparison information are presented together in a readable format.

---

### Edge Cases

- What happens when production environment data is unavailable for comparison? The message should omit the comparison count rather than show an error or zero.
- What happens when there are changes in production that are not in staging (e.g., hotfix deployed directly to production)? The comparison should only count changes that are in staging but not in production, not the reverse.
- What happens when a city group has no production environment configured? The staging notification should be sent without the comparison section.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST include the count of additional changes (PRs) in staging compared to production in every staging/testing environment Slack notification.
- **FR-002**: System MUST calculate the comparison by counting PRs that are deployed to staging but not yet deployed to production for the same city group.
- **FR-003**: System MUST handle singular and plural forms correctly in Finnish for the comparison text (1 muutos vs. N muutosta).
- **FR-004**: System MUST use descriptive, context-aware link text for the dashboard URL in staging/testing notifications that includes the city group name.
- **FR-005**: System MUST gracefully omit the comparison section when production data is unavailable for a city group.
- **FR-006**: System MUST only modify staging/testing environment notifications — production notification format remains unchanged.

### Key Entities

- **Staging Notification**: A Slack message sent when a staging/testing environment is updated, now enriched with production comparison data.
- **Production Comparison Count**: The number of PRs present in staging but absent from production for a given city group and repository.
- **Dashboard Link**: A clickable link in the Slack message pointing to the update tracker web UI for the relevant city group.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every staging/testing Slack notification includes a visible count of additional changes compared to production (or an appropriate message when in sync).
- **SC-002**: Recipients can determine at a glance how far ahead staging is from production without clicking through to the dashboard.
- **SC-003**: The dashboard link text clearly communicates the destination and context (city name and purpose) rather than using a generic label.
- **SC-004**: Production environment notifications remain completely unaffected by these changes.

## Assumptions

- The existing `PRTrack.inStaging` data (PRs in staging but not production) is the appropriate source for the comparison count.
- Finnish language is used for all user-facing text in Slack notifications, consistent with existing messages.
- The comparison count covers both core and wrapper repository changes.
- The feature applies to all staging/testing environment notifications across all city groups.
