# Feature Specification: Real Name Display

**Feature Branch**: `021-real-name-display`
**Created**: 2026-03-13
**Status**: Draft
**Input**: User description: "I want to show real names instead of github usernames"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Display Real Names in PR Lists (Priority: P1)

As a viewer of the deployment tracker, I want to see the real names of PR authors (e.g., "Petri Lehtinen") instead of their GitHub usernames (e.g., "akheron"), so that I can immediately identify who authored each change without having to mentally map usernames to people.

**Why this priority**: This is the core feature — showing real names is the primary user-facing change and delivers the most immediate value.

**Independent Test**: Can be fully tested by viewing any city's deployment page and verifying that PR authors are displayed as real names instead of GitHub usernames.

**Acceptance Scenarios**:

1. **Given** a PR list is displayed on any page, **When** the viewer looks at a PR entry, **Then** the author is shown as their real name (e.g., "Petri Lehtinen") instead of their GitHub username (e.g., "akheron")
2. **Given** a PR author has a resolved name from their GitHub profile, **When** the PR is displayed in any view (city detail, history, overview), **Then** the real name is consistently shown across all views
3. **Given** a PR author does NOT have a mapping to a real name, **When** the PR is displayed, **Then** the GitHub username is shown as a fallback

---

### User Story 2 - Display Real Names in Slack Notifications (Priority: P2)

As a Slack channel subscriber, I want deployment notifications to show real names of PR authors instead of GitHub usernames, so notifications are immediately understandable.

**Why this priority**: Slack notifications are a secondary display channel. The same name mapping should apply there for consistency.

**Independent Test**: Can be tested by triggering a deployment notification and verifying the Slack message shows real names for PR authors.

**Acceptance Scenarios**:

1. **Given** a deployment notification is sent to Slack, **When** the message includes PR authors, **Then** real names are shown instead of GitHub usernames
2. **Given** a PR author has no real name mapping, **When** the Slack notification is sent, **Then** the GitHub username is used as fallback

---

### User Story 3 - Automatic Name Resolution (Priority: P3)

As a project maintainer, I want names to be resolved automatically from GitHub profiles so that no manual maintenance is needed when team members join or leave.

**Why this priority**: Automation eliminates ongoing maintenance overhead, but the core display (P1) and Slack (P2) stories deliver value even before caching is optimized.

**Independent Test**: Can be tested by verifying that a newly encountered PR author's real name is automatically fetched from their GitHub profile without any manual intervention.

**Acceptance Scenarios**:

1. **Given** a new contributor submits a PR, **When** the system processes PR data, **Then** the contributor's real name is automatically fetched from their GitHub profile
2. **Given** a contributor changes their GitHub profile name, **When** their entry is removed from the cache and the system re-fetches their profile, **Then** the updated name is displayed

---

### Edge Cases

- What happens when a GitHub user has not set a name on their profile? The system falls back to displaying the GitHub username.
- What happens with bot accounts (e.g., "dependabot[bot]")? Bot usernames are displayed as-is since they don't have real names.
- What happens when the same person has multiple GitHub accounts? Each account is resolved independently via its own GitHub profile.
- What happens if the GitHub API is unreachable during name resolution? The system uses the GitHub username as fallback and retries on the next data collection run.
- What happens with historical PR data that was collected before this feature? Existing data retains usernames until the next data collection resolves names.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST resolve real names by looking up each PR author's GitHub profile
- **FR-002**: System MUST display real names instead of GitHub usernames in all frontend PR list views (city detail, history, overview)
- **FR-003**: System MUST display real names instead of GitHub usernames in Slack notification messages
- **FR-004**: System MUST fall back to displaying the GitHub username when no real name mapping exists for a given author
- **FR-005**: System MUST NOT attempt to map bot account usernames (accounts identified by the existing bot detection logic)
- **FR-006**: System MUST cache resolved names to avoid repeated API lookups for the same author

### Key Entities

- **Name Cache**: A cached relationship between a GitHub username (unique key) and the resolved display name (from the GitHub profile's `name` field). Serves as a lookup cache to avoid repeated API calls.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All PR authors whose GitHub profiles have a name set are displayed by their real names across every view in the tracker
- **SC-002**: PR authors whose GitHub profiles lack a name gracefully fall back to their GitHub username with no visual errors or blank fields
- **SC-003**: Slack notifications consistently use real names for authors with GitHub profile names
- **SC-004**: New contributors' real names are automatically resolved from GitHub without any manual intervention

## Clarifications

### Session 2026-03-13

- Q: Should names come from GitHub profile lookup only, or with manual overrides? → A: GitHub profile lookup only — no manual overrides
- Q: When should names be resolved — at data collection time or display time? → A: At data collection time — store resolved name alongside PR data

## Assumptions

- Real names are resolved automatically by looking up each PR author's GitHub profile (the `name` field from the GitHub Users API) at data collection time
- The resolved display name is stored alongside PR data so that no API calls are needed at display time
- GitHub's API `user.login` field is the primary identifier; the profile's `name` field provides the display name
- If a GitHub user has not set a name on their profile, the system falls back to displaying their username
- No manual name mapping file is maintained
