# Feature Specification: Overview Fullscreen & Change Counts

**Feature Branch**: `014-overview-fullscreen`
**Created**: 2026-03-05
**Status**: Draft
**Input**: User description: "Improve the information display on the yleiskatsaus view and add a fullscreen feature to that page. The city cards on that page should display the count of changes waiting in staging / test and in undeployed state. The fullscreen mode should hide the title and the main navigation. The fullscreen mode should scale the cards and the used font size so that the whole screen is filled with big cards."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Change Counts on Overview Cards (Priority: P1)

As a deployment manager viewing the overview page, I want to see at a glance how many changes each city has waiting in staging/test and in undeployed state, so I can quickly identify which cities need attention without navigating into each city's detail page.

Each city card on the overview page displays two numeric counts: the number of non-bot PRs currently in staging/test, and the number of non-bot PRs awaiting deployment (undeployed). These counts combine both core and wrapper repository PRs. If a count is zero, it is still shown (as "0") so the user can confirm there are no pending changes.

**Why this priority**: This is the core information improvement — it adds immediate situational awareness to the overview without requiring any interaction. It delivers value even without the fullscreen feature.

**Independent Test**: Can be fully tested by loading the overview page with known data and verifying that each city card shows the correct staging and undeployed counts matching the underlying data.

**Acceptance Scenarios**:

1. **Given** a city has 3 core PRs and 1 wrapper PR in staging (non-bot), **When** the overview loads, **Then** the city card shows "4" as the staging/test count.
2. **Given** a city has 5 non-bot PRs pending deployment, **When** the overview loads, **Then** the city card shows "5" as the undeployed count.
3. **Given** a city has 0 PRs in staging and 0 pending deployment, **When** the overview loads, **Then** the city card shows "0" for both counts.
4. **Given** a city has bot PRs in staging but no non-bot PRs, **When** the overview loads, **Then** the staging count shows "0" (bot PRs are excluded from counts).

---

### User Story 2 - Fullscreen Mode (Priority: P2)

As a deployment manager who displays the overview on a wall-mounted monitor or during a stand-up meeting, I want a fullscreen mode that hides the page title and main navigation and scales the city cards and text to fill the entire screen, so the deployment status is readable from a distance.

The user activates fullscreen mode via a toggle button on the overview page. In fullscreen mode, the page title (`<h1>`) and the main navigation (`<nav>`) are hidden. The city cards and all text within them scale up to fill the available viewport, making them large and readable. Exiting fullscreen restores the normal layout.

**Why this priority**: Fullscreen mode builds on the improved cards from P1 and provides a presentation/dashboard display capability. It is independently valuable but depends on the cards having useful information to display.

**Independent Test**: Can be tested by activating fullscreen mode and verifying that the title and navigation disappear, and that the cards scale to fill the viewport.

**Acceptance Scenarios**:

1. **Given** the overview page is displayed in normal mode, **When** the user activates fullscreen mode, **Then** the page title and main navigation are hidden.
2. **Given** fullscreen mode is active, **When** the user views the page, **Then** the city cards and their text scale to fill the entire viewport area with large, readable cards.
3. **Given** fullscreen mode is active, **When** the user deactivates fullscreen mode, **Then** the title and navigation reappear and cards return to their normal size.
4. **Given** the browser window is resized while in fullscreen mode, **When** the layout recalculates, **Then** the cards and text rescale to fill the new viewport size.

---

### Edge Cases

- What happens when a city has no PR tracks data at all (prTracks is null)? Both counts should show "0".
- What happens when the user navigates away from the overview and returns? Fullscreen mode state should be preserved within the session (if still on the overview route).
- What happens when the user enters fullscreen mode and then navigates to a city detail page? Fullscreen mode should be exited, and normal navigation should be restored when navigating back.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Each city card on the overview page MUST display the count of non-bot PRs currently in staging/test (combining core and wrapper repositories).
- **FR-002**: Each city card on the overview page MUST display the count of non-bot PRs awaiting deployment / undeployed (combining core and wrapper repositories).
- **FR-003**: The change counts MUST exclude bot-authored PRs from the totals.
- **FR-004**: The change counts MUST be visually distinct from each other, with clear labels indicating which count is staging/test and which is undeployed.
- **FR-005**: The overview page MUST provide a toggle to enter and exit fullscreen mode.
- **FR-006**: In fullscreen mode, the page title and main navigation MUST be hidden.
- **FR-007**: In fullscreen mode, the city cards and all text within them MUST scale to fill the available viewport with large, readable content.
- **FR-008**: Exiting fullscreen mode MUST restore the original layout with title, navigation, and normal card sizing.
- **FR-009**: The fullscreen toggle MUST remain accessible while in fullscreen mode so the user can exit.

### Key Entities

- **City Card**: A summary card for a city group, now enhanced with staging count and undeployed count. Existing fields (city name, environment status badges) are retained.
- **Change Count**: A derived numeric value representing the number of non-bot pull requests in a given state (staging or pending deployment), aggregated across core and wrapper repositories for a city.

## Assumptions

- "Staging / test" maps to the existing `inStaging` PR track data in the current data model.
- "Undeployed" maps to the existing `pendingDeployment` PR track data in the current data model.
- Bot PRs are identified by the existing `isBot` field on PR objects.
- The fullscreen mode is a page-level CSS/layout toggle (not browser Fullscreen API), allowing the content to fill the viewport without requiring browser permission prompts.
- The fullscreen scaling uses responsive techniques (e.g., viewport units, CSS grid auto-fit) to adapt card size and font size to the available space.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can determine the number of staging and undeployed changes for any city within 2 seconds of viewing the overview page, without clicking into individual city pages.
- **SC-002**: In fullscreen mode, all city card text is readable from at least 3 meters away on a standard monitor (achieved by scaling cards and font sizes to fill the viewport).
- **SC-003**: The fullscreen toggle can be activated and deactivated in a single click/tap, with the layout change occurring immediately (under 0.5 seconds).
- **SC-004**: Change counts shown on the overview match the actual number of non-bot PRs visible on each city's detail page for the corresponding category.
