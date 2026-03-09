# Feature Specification: Improve Slack Announcements

**Feature Branch**: `017-improve-slack-announcements`
**Created**: 2026-03-09
**Status**: Draft
**Input**: User description: "Improve the Slack announcements: There should be only one announcement per release that contains both wrapper repo changes and core changes in one message. The dependabot and renovate auto updates should be hidden. Timestamps should be in Helsinki timezone."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Combined Release Announcement (Priority: P1)

As a team member monitoring Slack, I want to see a single announcement per environment release that includes both wrapper repository changes and core (evaka) changes, so I get one complete picture of what changed instead of two separate messages.

**Why this priority**: Currently two messages are sent when both wrapper and core change simultaneously, fragmenting release information. Combining them is the primary improvement that reduces notification noise and improves readability.

**Independent Test**: Can be tested by triggering a deployment where both wrapper and core SHAs change and verifying only one Slack message is sent containing both sections.

**Acceptance Scenarios**:

1. **Given** a deployment where both wrapper and core SHAs change, **When** the notification is sent, **Then** a single Slack message is posted containing a wrapper changes section and a core changes section.
2. **Given** a deployment where only the wrapper SHA changes, **When** the notification is sent, **Then** a single Slack message is posted containing only the wrapper changes section.
3. **Given** a deployment where only the core SHA changes, **When** the notification is sent, **Then** a single Slack message is posted containing only the core changes section.
4. **Given** a deployment where both repos change but one has no PRs to show (all filtered as bot PRs), **When** the notification is sent, **Then** the message still shows both sections, with the empty section indicating no notable changes.

---

### User Story 2 - Hide Bot Auto-Update PRs (Priority: P1)

As a team member reading Slack announcements, I want dependabot and renovate auto-update PRs to be excluded from the notification, so I only see meaningful human-authored changes.

**Why this priority**: Bot PRs like "Bump evaka from bf2c392 to 9a4e61b" add noise and obscure the actual changes. The classification logic already exists but is not applied to Slack notifications.

**Independent Test**: Can be tested by triggering a deployment that includes bot PRs and verifying they do not appear in the Slack message.

**Acceptance Scenarios**:

1. **Given** a deployment includes PRs authored by dependabot[bot], **When** the notification is sent, **Then** those PRs are not listed in the message.
2. **Given** a deployment includes PRs authored by renovate[bot], **When** the notification is sent, **Then** those PRs are not listed in the message.
3. **Given** a deployment where all included PRs are bot-authored, **When** the notification is sent, **Then** the changes section indicates no notable changes (e.g., "Ei merkittäviä muutoksia") rather than showing an empty list.
4. **Given** a deployment includes a mix of bot and human PRs, **When** the notification is sent, **Then** only human-authored PRs are listed.

---

### User Story 3 - Helsinki Timezone Timestamps (Priority: P2)

As a Finnish team member reading Slack announcements, I want timestamps displayed in Helsinki timezone (Europe/Helsinki, EET/EEST) instead of UTC, so I can immediately understand when a deployment was detected in local time.

**Why this priority**: The tracker serves Finnish municipalities, so Helsinki time is the natural reference. Currently timestamps show UTC which requires mental conversion.

**Independent Test**: Can be tested by triggering a deployment and verifying the timestamp in the Slack message shows Helsinki time with appropriate timezone label.

**Acceptance Scenarios**:

1. **Given** a deployment is detected on Friday 2026-03-06 at 07:28 UTC (winter, EET = UTC+2), **When** the notification is sent, **Then** the timestamp shows "pe 6.3. klo 09.28".
2. **Given** a deployment is detected on Monday 2026-06-15 at 06:28 UTC (summer, EEST = UTC+3), **When** the notification is sent, **Then** the timestamp shows "ma 15.6. klo 09.28".
3. **Given** a deployment is detected near midnight UTC, **When** the notification is sent, **Then** the timestamp correctly shows the next day's date and weekday if applicable in Helsinki time.

---

### Edge Cases

- What happens when a deployment has zero PRs for both wrapper and core (e.g., a revert or force push)? The message should still be sent with a note indicating no PR changes were found.
- What happens when a PR author name matches bot patterns but is actually a human? The existing bot classification logic handles this; the spec relies on the current classification.
- What happens when the same PR appears in both wrapper and core lists? This cannot occur since PRs are repo-specific.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST send exactly one Slack message per environment per detection cycle, regardless of whether wrapper changes, core changes, or both are detected.
- **FR-002**: When both wrapper and core changes exist, the combined message MUST display changes grouped by repository type (wrapper and core as separate sections within the same message).
- **FR-003**: System MUST silently exclude PRs classified as bot-authored (dependabot, renovate, and other patterns matching existing bot classification) from the Slack notification PR list, with no indication of how many were hidden.
- **FR-004**: When all PRs in a repository section are bot-authored, the section MUST display a fallback message indicating no notable changes rather than being empty or omitted.
- **FR-005**: All timestamps in Slack notifications MUST be displayed in Europe/Helsinki timezone.
- **FR-006**: The timestamp format MUST match the web UI Finnish format: Finnish weekday abbreviation + day.month. + "klo" + HH.MM (e.g., "pe 6.3. klo 09.28").
- **FR-007**: The combined message MUST preserve the existing Block Kit structure (header, fields, changes, context) while accommodating multiple repository sections.
- **FR-009**: When both wrapper and core change, the version fields MUST display both SHAs labeled by repo type (e.g., "Ydin: abc1234, Kuntaimpl.: def5678"). When only one repo changes, show that repo's SHA only.
- **FR-008**: The per-city webhook routing MUST continue to function unchanged.

### Key Entities

- **DeploymentEvent**: One per repo type change (unchanged). Events are grouped by environment ID at notification time only.
- **Slack Message**: Block Kit formatted message; will expand to include multiple changes sections.
- **Bot PR**: A pull request classified as automated (dependabot, renovate) via existing classification logic.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Each environment deployment produces exactly one Slack notification (down from potentially two).
- **SC-002**: Zero bot-authored PRs appear in Slack notifications.
- **SC-003**: All timestamps in notifications display Helsinki local time in Finnish web UI format (e.g., "pe 6.3. klo 09.28").
- **SC-004**: Existing notification functionality (city routing, PR listing, dashboard links) continues to work without regression.

## Clarifications

### Session 2026-03-09

- Q: Where should events be combined into a single notification — at the change detector or notification layer? → A: Group events by environment at notification time. The change detector continues producing separate events per repo type.
- Q: Should the message indicate how many bot PRs were hidden? → A: Silently omit bot PRs with no mention of hidden count.
- Q: How should version SHAs be displayed in the combined message? → A: Show both SHAs labeled by repo type (e.g., "Ydin: abc1234, Kuntaimpl.: def5678").
- Q: What timestamp format should Slack notifications use? → A: Finnish web UI format matching the dashboard: "pe 6.3. klo 09.28" (weekday abbreviation + day.month. + klo + HH.MM in Helsinki timezone).

## Assumptions

- The existing bot PR classification logic correctly identifies all dependabot and renovate PRs. No changes to classification rules are needed.
- The Europe/Helsinki timezone is the correct timezone for all users of this system, since it serves Finnish municipalities.
- The Node.js Intl API is available for timezone conversion (Node.js 20+ supports this natively).
- The existing PR limit of 10 per message section remains appropriate for the combined message format.
