# Feature Specification: Increase Slack PR Limit with Overflow Link

**Feature Branch**: `023-slack-pr-limit`
**Created**: 2026-03-26
**Status**: Draft
**Input**: User description: "Change the Slack update messages to contain max 50 changes instead of 10. And if the limit is exceeded, there should be a link to the history page with a label showing how many more changes were in the release"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Show More Changes in Slack Messages (Priority: P1)

As a team member receiving Slack deployment notifications, I want to see up to 50 changes per repository section so that I don't miss important changes that were silently truncated.

Currently, Slack messages are limited to 10 changes per section. When a deployment includes more than 10 changes (e.g., 17 core PRs), the extra changes are silently dropped. This means team members are unaware of changes that were deployed.

**Why this priority**: This is the core problem. Changes are being silently omitted from notifications, causing team members to miss deployed changes.

**Independent Test**: Can be tested by triggering a Slack notification for a deployment with more than 10 but fewer than 50 changes and verifying all are listed.

**Acceptance Scenarios**:

1. **Given** a deployment with 17 changes in the core repository, **When** a Slack notification is sent, **Then** all 17 changes are listed in the message.
2. **Given** a deployment with exactly 50 changes, **When** a Slack notification is sent, **Then** all 50 changes are listed.
3. **Given** a deployment with 5 changes, **When** a Slack notification is sent, **Then** all 5 changes are listed (no change in behavior from current).

---

### User Story 2 - Show Overflow Link When Exceeding 50 Changes (Priority: P2)

As a team member receiving Slack deployment notifications, when a deployment contains more than 50 changes in a single repository section, I want to see the first 50 changes listed plus a link to the history page showing how many additional changes I can view there.

**Why this priority**: This handles the edge case where even 50 changes is not enough. While rare, it ensures no information is completely lost.

**Independent Test**: Can be tested by triggering a Slack notification for a deployment with more than 50 changes and verifying the overflow message with link appears.

**Acceptance Scenarios**:

1. **Given** a deployment with 55 changes in the core repository for environment "tampere-region", **When** a Slack notification is sent, **Then** the first 50 changes are listed followed by a link reading something like "...ja 5 muuta muutosta" (and 5 more changes) linking to the environment's history page.
2. **Given** a deployment with 51 changes, **When** a Slack notification is sent, **Then** the first 50 changes are listed followed by a link indicating 1 additional change.
3. **Given** a deployment with exactly 50 changes, **When** a Slack notification is sent, **Then** no overflow link is shown (all changes fit within the limit).

---

### Edge Cases

- What happens when a deployment has 0 human-visible changes (all bot PRs)? Existing behavior is preserved — show "Ei merkittavia muutoksia" message.
- What happens when PR information is unavailable (API failure)? Existing behavior is preserved — show "PR-tietoja ei saatavilla" message.
- What happens when the overflow link environment identifier contains special characters? The link must use the correct URL-safe environment slug as used elsewhere in the system.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display up to 50 changes per repository section in Slack deployment messages (increased from the current limit of 10).
- **FR-002**: When a repository section contains more than 50 changes, the system MUST show the first 50 changes followed by an overflow indicator.
- **FR-003**: The overflow indicator MUST include the count of remaining changes not shown (total minus 50).
- **FR-004**: The overflow indicator MUST include a clickable link to the environment's history page on the update tracker website.
- **FR-005**: The history page link MUST follow the pattern `https://espoon-voltti.github.io/evaka-update-tracker/#/city/{environment-slug}/history` using the correct environment identifier.
- **FR-006**: The overflow message MUST be in Finnish, consistent with the rest of the Slack message format (e.g., "...ja 5 muuta muutosta").
- **FR-007**: Existing behavior for zero human-visible changes and API failures MUST remain unchanged.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Deployments with up to 50 changes per repository section display all changes in the Slack notification without truncation.
- **SC-002**: Deployments exceeding 50 changes per repository section show the correct overflow count and a working link to the history page.
- **SC-003**: No existing Slack notification behavior is broken for deployments with 10 or fewer changes.

## Assumptions

- The environment slug used in history page URLs is already available in the system where Slack messages are constructed (e.g., "tampere-region", "espoo", etc.).
- 50 is a reasonable upper limit that balances message readability with completeness.
- The Finnish language "...ja N muuta muutosta" is appropriate for the overflow message, consistent with the existing Finnish-language notification format.
