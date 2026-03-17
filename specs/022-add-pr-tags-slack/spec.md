# Feature Specification: Add PR Tags to Slack Announcements

**Feature Branch**: `022-add-pr-tags-slack`
**Created**: 2026-03-17
**Status**: Draft
**Input**: User description: "add PR tags to the Slack announcements as e.g. [Tekninen] or [Korjaus]"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - PR Tags in Deployment Notifications (Priority: P1)

As a team member receiving Slack deployment notifications, I want to see PR category tags (e.g. [Tekninen], [Korjaus]) next to each PR in the notification so I can quickly understand the nature of changes included in a deployment without clicking through to GitHub.

**Why this priority**: This is the core value of the feature — giving at-a-glance categorization of changes in the primary Slack notification channel.

**Independent Test**: Can be fully tested by triggering a deployment notification for PRs with known labels and verifying tags appear in the Slack message.

**Acceptance Scenarios**:

1. **Given** a deployment notification is sent containing a PR with the GitHub label "bug", **When** the Slack message is posted, **Then** the PR line includes the tag `[Korjaus]` before or after the PR title.
2. **Given** a deployment notification contains a PR with the GitHub label "tech", **When** the Slack message is posted, **Then** the PR line includes the tag `[Tekninen]`.
3. **Given** a deployment notification contains a PR with multiple known labels (e.g. "bug" and "frontend"), **When** the Slack message is posted, **Then** all corresponding tags are displayed (e.g. `[Korjaus] [Käyttöliittymä]`).
4. **Given** a deployment notification contains a PR with no labels, **When** the Slack message is posted, **Then** no tag is shown and the line renders cleanly without extra spaces or brackets.
5. **Given** a deployment notification contains a PR with an unknown/unmapped label, **When** the Slack message is posted, **Then** that label is not displayed as a tag (only labels with Finnish translations are shown).

---

### User Story 2 - PR Tags in Change Announcements (Priority: P2)

As a team member receiving Slack change announcements, I want to see PR category tags in those messages as well, so I have consistent categorization across all Slack notifications.

**Why this priority**: Extends the same value to the secondary notification channel for consistency.

**Independent Test**: Can be tested by triggering a change announcement for PRs with labels and verifying tags appear.

**Acceptance Scenarios**:

1. **Given** a change announcement is sent for a PR with the GitHub label "enhancement", **When** the message is posted, **Then** the PR line includes the tag `[Parannus]`.
2. **Given** a change announcement contains a PR with no labels, **When** the message is posted, **Then** no tag is shown.

---

### Edge Cases

- What happens when a PR has labels that are not in the mapping (e.g. a custom GitHub label like "wontfix")? They are silently ignored — only mapped labels produce tags.
- What happens when a PR has many labels (e.g. 5+)? All mapped labels are shown. Since Slack messages have character limits, an excessive number of tags per PR is unlikely given the current label set.
- What happens when label data is missing from older PRs (pre-backfill data)? PRs without a `labels` field are treated as having no labels — no tags are displayed.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display Finnish-translated tags (e.g. `[Tekninen]`, `[Korjaus]`) in Slack deployment notification messages for each PR that has known GitHub labels.
- **FR-002**: System MUST display Finnish-translated tags in Slack change announcement messages for each PR that has known GitHub labels.
- **FR-003**: System MUST use the same GitHub-label-to-Finnish-name mapping that the frontend dashboard already uses (bug → Korjaus, enhancement → Parannus, tech → Tekninen, breaking → Päivitystoimia, dependencies → Riippuvuus, frontend → Käyttöliittymä, java → Java, javascript → JavaScript, service → Palvelu, submodules → Alimoduuli, apigw → API-yhdyskäytävä).
- **FR-004**: System MUST gracefully handle PRs with no labels (no tags displayed, no extra whitespace).
- **FR-005**: System MUST gracefully handle PRs with unmapped labels (unknown labels are not displayed).
- **FR-006**: Tags MUST appear as bracketed text (e.g. `[Korjaus]`) to be visually distinct from the PR title and author.

### Key Entities

- **PR Label Mapping**: A shared mapping from GitHub label names to Finnish display names, used by both the frontend dashboard and the Slack message formatters.
- **Slack Message Line**: A formatted line in a Slack notification representing a single PR, now extended to include label tags.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of Slack deployment notifications include Finnish tags for all PRs that have mapped GitHub labels.
- **SC-002**: 100% of Slack change announcements include Finnish tags for all PRs that have mapped GitHub labels.
- **SC-003**: The label-to-Finnish mapping used in Slack messages is identical to the one used on the frontend dashboard, with no drift between the two.
- **SC-004**: PRs without labels or with only unmapped labels display cleanly in Slack messages with no empty brackets, extra spaces, or formatting artifacts.

## Assumptions

- The existing `labels` field on PR data (populated by the PR collector and backfill script) provides the necessary label data — no new data collection is needed.
- The current set of 11 mapped labels (bug, enhancement, tech, breaking, dependencies, frontend, java, javascript, service, submodules, apigw) is the complete set to support. New labels can be added in the future by extending the shared mapping.
- Tags are displayed inline with each PR line in the Slack message, not as a separate section or summary.

## Out of Scope

- Adding new GitHub labels or changing existing label names.
- Changing the frontend dashboard label display.
- Adding label-based filtering or routing of Slack notifications (e.g. sending tech-only changes to a specific channel).
- Adding color or emoji to tags in Slack messages (Slack mrkdwn does not support colored text; bold bracketed text is sufficient).
