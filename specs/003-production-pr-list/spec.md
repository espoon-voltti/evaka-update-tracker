# Feature Specification: Production PR List

**Feature Branch**: `003-production-pr-list`
**Created**: 2026-03-03
**Status**: Draft
**Input**: User description: "I want the site to show 5 latest PRs that have reached the production environment. Currently only lists PRs awaiting deployment and those in staging. No info about what we already have in production except for the commit ID which links to GitHub."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Latest Production PRs on City Page (Priority: P1)

As a team member viewing a city's detail page, I want to see the 5 most recent pull requests that have been deployed to production, so that I can quickly understand what changes are currently live without leaving the tracker.

**Why this priority**: This is the core feature request. Currently, users can only see a production commit SHA with a link to GitHub — they have no visibility into which PRs are live. This single change delivers the main value.

**Independent Test**: Can be fully tested by navigating to any city detail page (e.g., Espoo) and verifying that up to 5 production PRs are listed with their number, title, author, and merge date.

**Acceptance Scenarios**:

1. **Given** a city has PRs deployed to production, **When** I view the city detail page, **Then** I see a "In Production" section listing up to 5 of the most recently deployed PRs with PR number (linked), title, author, and merge date.
2. **Given** a city has more than 5 PRs deployed to production, **When** I view the city detail page, **Then** only the 5 most recent are shown.
3. **Given** a city has no tracked production PRs yet (e.g., initial baseline), **When** I view the city detail page, **Then** the production PR section is either hidden or shows an appropriate empty state message.
4. **Given** dependency/bot PRs exist among the deployed PRs, **When** bot PRs are hidden (default), **Then** the production PR list only shows human-authored PRs. **When** the user toggles "Show dependency updates", **Then** bot PRs appear in the list as well.

---

### User Story 2 - View Production PRs on Overview Page (Priority: P2)

As a team member viewing the overview page, I want to see a summary of the latest production PRs for each city, so I can get a quick glance at what's live across all environments.

**Why this priority**: Extends the value to the overview page, giving a quick cross-city snapshot. Less critical than the city detail view since users can click through for details.

**Independent Test**: Can be tested by viewing the overview page and verifying that each city card shows recent production PRs alongside or in place of existing summary information.

**Acceptance Scenarios**:

1. **Given** multiple cities have production PRs, **When** I view the overview page, **Then** each city card includes the most recent production PRs (up to 5).
2. **Given** a city has no tracked production PRs, **When** I view the overview page, **Then** the city card handles the empty state gracefully.

---

### User Story 3 - Distinguish Production PRs from Other Categories (Priority: P2)

As a team member, I want the production PR list to be visually distinct from the "Awaiting Deployment" and "In Staging" sections, so I can quickly scan the page and understand what's where.

**Why this priority**: Without clear visual separation, adding another PR list could confuse users. This ensures the information hierarchy remains clear.

**Independent Test**: Can be tested by viewing the city detail page and verifying that the production section is visually identifiable and clearly labeled, separate from staging and pending sections.

**Acceptance Scenarios**:

1. **Given** the city detail page has all three sections (awaiting deployment, in staging, in production), **When** I view the page, **Then** each section has a clear heading and I can distinguish them at a glance.
2. **Given** PRs exist in both core and wrapper repositories, **When** I view production PRs, **Then** the repository type (core vs wrapper) is indicated, consistent with how staging PRs are currently displayed.

---

### Edge Cases

- What happens when the tracker has just started and has no previous production SHA to compare against? The production PR list should show an empty state rather than incorrect data.
- What happens when all 5 latest production PRs are bot/dependency PRs? The list should appear empty when the bot filter is active, and show all 5 when toggled on.
- What happens when a city's production environment is unavailable? The existing status indicator (unavailable badge) should remain visible; the production PR list should show the last known data or an appropriate message.
- What happens for cities with both core and wrapper repositories? Production PRs should be shown for each repository type separately, consistent with the existing staging display pattern.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The city detail page MUST display up to 5 of the most recently deployed human-authored pull requests in a "In Production" section.
- **FR-002**: Each production PR entry MUST show the PR number (linked to GitHub), title, author, and merge date.
- **FR-003**: The production PR list MUST respect the existing bot/dependency PR filter toggle — hiding bot PRs by default and showing them when the user enables "Show dependency updates".
- **FR-004**: The production PR section MUST appear on the city detail page in a logical position relative to the existing "Awaiting Deployment" and "In Staging" sections (below them, since production is the final stage).
- **FR-005**: The overview page MUST include production PRs for each city, consistent with how other PR categories are displayed.
- **FR-006**: For cities with both core and wrapper repositories, production PRs MUST be shown grouped by repository type, consistent with the existing staging PR display.
- **FR-007**: When no production PRs are available (e.g., initial tracker baseline), the section MUST either be hidden or display an informative empty state.

### Key Entities

- **Production PR**: A pull request that has been deployed to the production environment. Attributes: PR number, title, author, merge date, repository, repository type (core/wrapper), bot classification.
- **PR Track**: A categorization of PRs by deployment stage (pending, in-staging, deployed/in-production) for a given repository within a city group.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can identify the 5 most recent production PRs for any city within 5 seconds of loading the city detail page, without clicking any external links.
- **SC-002**: All city detail pages consistently show production PR information when data is available.
- **SC-003**: The production PR list displays the same PR information (number, title, author, date) as the existing staging and pending lists, maintaining visual consistency.
- **SC-004**: The overview page provides at-a-glance production PR information for all cities.

## Assumptions

- The data collection backend already tracks which PRs have been deployed to production (the `deployed` category in PR tracking). This feature primarily requires surfacing that data in the frontend.
- The existing bot/dependency PR filtering logic applies equally to production PRs.
- The limit of 5 PRs matches the existing pattern used for staging and pending categories.
- PR data availability depends on the tracker having observed at least one production deployment change (initial baseline may show no PRs).
