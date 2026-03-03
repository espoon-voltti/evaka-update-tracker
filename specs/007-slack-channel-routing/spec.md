# Feature Specification: Per-City Slack Channel Routing

**Feature Branch**: `007-slack-channel-routing`
**Created**: 2026-03-03
**Status**: Draft
**Input**: User description: "I need the different city's instances slack notifications to go to different channels in slack. Tampere region to one combined channel and same for the remaining cities. The current webhook system only sends to one channel. Ideally configure channel destinations via environment or code, but multiple webhooks in Slack app integration is also acceptable if more streamlined."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Route Deployment Notifications by City (Priority: P1)

As the system administrator, I want each city group's deployment notifications to be delivered to a dedicated Slack channel so that the teams responsible for each city only see the updates relevant to them instead of all cities' notifications mixed into one channel.

Currently, all four city groups (Espoo, Tampere region, Oulu, Turku) send their deployment notifications to the same single Slack channel. After this feature, each city group's notifications go to the channel designated for that city group.

**Why this priority**: This is the core purpose of the feature — without per-city routing, notifications remain in a single noisy channel and teams cannot filter by relevance.

**Independent Test**: Can be fully tested by triggering a deployment change for each city group and verifying the notification arrives in the correct designated channel (not in other city channels).

**Acceptance Scenarios**:

1. **Given** deployment notifications are configured with separate channel destinations for each city group, **When** a version change is detected for Tampere region, **Then** the notification is delivered only to the Tampere region's designated channel.
2. **Given** deployment notifications are configured with separate channel destinations for each city group, **When** a version change is detected for Espoo, **Then** the notification is delivered only to Espoo's designated channel.
3. **Given** deployment notifications are configured with separate channel destinations for each city group, **When** version changes are detected simultaneously for multiple city groups, **Then** each notification goes to its respective city group's channel.

---

### User Story 2 - Backwards-Compatible Default Behaviour (Priority: P2)

As the system administrator, I want the system to continue working with a single notification destination if per-city routing is not configured, so that existing setups do not break after this change is deployed.

**Why this priority**: Ensuring backward compatibility prevents disruption to the current working setup and allows gradual migration to per-city routing.

**Independent Test**: Can be tested by running the system with only the existing single-destination configuration and verifying all notifications still arrive in that channel as before.

**Acceptance Scenarios**:

1. **Given** only a single notification destination is configured (no per-city routing), **When** a deployment change is detected for any city group, **Then** the notification is sent to that single destination (existing behaviour preserved).
2. **Given** per-city routing is configured for some city groups but not all, **When** a deployment change is detected for a city group without a specific destination, **Then** the notification is sent to the default destination.

---

### User Story 3 - Staging Notification Routing (Priority: P3)

As the system administrator, I want staging environment notifications to follow the same routing rules as production notifications for the same city group, so that staging alerts also land in the relevant team's channel.

**Why this priority**: Staging notifications are secondary to production but should also be routed correctly for completeness. This naturally extends the production routing logic.

**Independent Test**: Can be tested by triggering a staging version change for a city group and verifying the notification arrives in that city group's designated channel.

**Acceptance Scenarios**:

1. **Given** per-city routing is configured, **When** a version change is detected in a staging environment for Oulu, **Then** the staging notification is delivered to Oulu's designated channel.

---

### Edge Cases

- What happens when a city group's specific channel destination is removed from configuration after previously being set? The system should fall back to the default destination.
- What happens when the notification destination for a particular city group becomes unreachable (e.g., channel deleted, webhook revoked)? The system should log an error and continue processing other city groups' notifications without failing the entire run.
- What happens when a new city group is added to the tracker but no channel destination is configured for it? The system should send notifications to the default destination.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support assigning a separate notification destination for each city group (Espoo, Tampere region, Oulu, Turku).
- **FR-002**: System MUST deliver deployment notifications for a city group only to that city group's designated channel destination.
- **FR-003**: System MUST support a default notification destination that is used when a city group has no specific destination configured.
- **FR-004**: System MUST continue to deliver notifications correctly when only a default destination is configured (no per-city routing) — backward compatibility with the current single-channel setup.
- **FR-005**: System MUST route both production and staging notifications for a city group to the same destination.
- **FR-006**: System MUST log a clear message when a city group's notification cannot be delivered (e.g., unreachable destination) and continue processing remaining city groups.
- **FR-007**: System MUST allow the administrator to configure notification destinations without redeploying the application (e.g., via environment configuration).

### Key Entities

- **City Group**: A tracked municipality or region (Espoo, Tampere region, Oulu, Turku). Each city group may have one or more environments (production, staging). This is the routing key for notifications.
- **Notification Destination**: The target channel where a city group's deployment notifications are delivered. Each city group maps to at most one destination; a default destination serves as the fallback.
- **Deployment Event**: A detected version change (wrapper or core) in a city group's environment. Each event triggers a notification to the city group's designated destination.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of deployment notifications for a city group are delivered to that city group's designated channel (zero cross-routing).
- **SC-002**: Existing single-channel setups continue to work with zero configuration changes required.
- **SC-003**: Adding or changing a city group's notification destination takes under 5 minutes and requires no application redeployment.
- **SC-004**: A notification delivery failure for one city group does not prevent other city groups' notifications from being delivered (fault isolation).

## Assumptions

- The Tampere region (comprising Tampere, Hämeenkyrö, Kangasala, Lempäälä, Nokia, Orivesi, Pirkkala, Vesilahti, and Ylöjärvi) is treated as a single city group for notification routing purposes — all nine municipalities share one destination.
- The four current production city groups are: Espoo, Tampere region, Oulu, and Turku.
- The notification message format and content remain unchanged — only the destination channel changes.
- The system runs as an automated scheduled job; there is no interactive user interface for configuring destinations. Configuration is done via environment settings.
