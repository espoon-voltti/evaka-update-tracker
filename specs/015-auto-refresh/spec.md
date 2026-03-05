# Feature Specification: Auto-Refresh Site Data

**Feature Branch**: `015-auto-refresh`
**Created**: 2026-03-05
**Status**: Draft
**Input**: User description: "Make the site auto refresh its data and front-end every 30 seconds. But make the detection happen without a full page reload. If only data changes, only the relevant sections should be re-populated / rendered. If front-end code changes, then a page reload is fine. But I don't want the browser to 'blink' every 30 seconds."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Automatic Data Updates (Priority: P1)

A user has the deployment tracker site open in their browser. Every 30 seconds, the site checks for new data in the background. When the underlying data files have changed (e.g., new deployments, updated PR lists), the affected sections of the page update seamlessly without any visible page reload or "blink." The user's scroll position and any interactive state are preserved.

**Why this priority**: This is the core value of the feature -- keeping displayed information current without requiring the user to manually refresh the page.

**Independent Test**: Can be fully tested by opening the site, modifying a data file on the server, and observing that the page content updates within 30 seconds without any visible page reload.

**Acceptance Scenarios**:

1. **Given** the site is open and data has not changed, **When** 30 seconds elapse, **Then** no visible change occurs on the page (no blink, no scroll reset, no flash).
2. **Given** the site is open and a data file has changed on the server, **When** the next 30-second check occurs, **Then** the affected sections re-render with the new data while the rest of the page remains untouched.
3. **Given** the user has scrolled to a specific position, **When** data updates occur, **Then** the scroll position is preserved.

---

### User Story 2 - Front-End Code Change Detection (Priority: P2)

When the site's front-end code (JavaScript, CSS, or HTML) changes on the server, the site detects this and performs a full page reload to pick up the new code. This is acceptable because code changes are infrequent and a full reload ensures the user always runs the latest version.

**Why this priority**: Important for keeping the site functional after deployments, but less frequent than data changes, so slightly lower priority.

**Independent Test**: Can be tested by modifying a front-end file on the server and observing that the page reloads within 30 seconds.

**Acceptance Scenarios**:

1. **Given** the site is open and a front-end code file has changed, **When** the next 30-second check occurs, **Then** the page performs a full reload to pick up the new code.
2. **Given** the site is open and no code files have changed, **When** 30 seconds elapse, **Then** no page reload occurs.

---

### User Story 3 - Seamless Background Operation (Priority: P3)

The auto-refresh mechanism operates silently in the background. There are no loading spinners, progress bars, or visual indicators during routine checks. The user should not be aware that polling is happening unless content actually changes.

**Why this priority**: Polish and user experience -- ensures the feature feels invisible when nothing has changed.

**Independent Test**: Can be tested by monitoring the page visually over several refresh cycles with no data changes and confirming zero visual artifacts.

**Acceptance Scenarios**:

1. **Given** the site is open with no changes on the server, **When** multiple 30-second cycles pass, **Then** the page remains visually identical with no flicker, blink, or layout shift.
2. **Given** data has changed, **When** the update renders, **Then** only the changed section updates with no flash or full-page re-render.

---

### Edge Cases

- What happens when the server is temporarily unreachable during a refresh check? The site should silently skip that cycle and retry on the next interval.
- What happens if both data and code change simultaneously? A full page reload should occur (code change takes precedence).
- What happens if the user navigates to a different view/route between checks? The refresh should fetch data appropriate to the current view.
- What happens if a refresh is in progress when the next 30-second interval fires? The overlapping check should be skipped to avoid duplicate requests.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The site MUST check for changes every 30 seconds without user interaction.
- **FR-002**: The site MUST detect data file changes by comparing a lightweight indicator (e.g., ETag, Last-Modified header, or content hash) rather than re-downloading and comparing full file contents on every cycle.
- **FR-003**: When only data files have changed, the site MUST update only the affected page sections without a full page reload.
- **FR-004**: When front-end code files (JavaScript, CSS, HTML) have changed, the site MUST perform a full page reload.
- **FR-005**: The site MUST preserve the user's scroll position when performing data-only updates.
- **FR-006**: The site MUST NOT produce any visible "blink," flash, or layout shift during routine checks when nothing has changed.
- **FR-007**: The site MUST gracefully handle network errors during refresh checks by silently skipping the failed cycle.
- **FR-008**: The site MUST prevent overlapping refresh requests (if a check is still in progress when the next interval fires, the new check is skipped).
- **FR-009**: The site MUST work correctly regardless of which view/route the user is currently on.

### Key Entities

- **Refresh Check**: A periodic background operation that determines whether data or code has changed on the server.
- **Change Indicator**: A lightweight value (hash, timestamp, or version identifier) used to detect whether a file has changed without downloading its full contents.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Data changes appear on the page within 35 seconds of being published to the server (30-second interval + up to 5 seconds for fetch and render).
- **SC-002**: Zero visible page blinks or flashes occur during refresh cycles when no changes are detected, as verified by visual inspection over a 5-minute period.
- **SC-003**: Front-end code changes trigger a full page reload within 35 seconds of being deployed.
- **SC-004**: The user's scroll position is preserved across all data-only updates.
- **SC-005**: Network errors during refresh do not cause user-visible errors or break subsequent refresh cycles.

## Assumptions

- The site is served from a static file server (GitHub Pages or similar) that supports standard HTTP caching headers or allows fetching files with cache-busting query parameters.
- Data files and front-end code files are distinct and can be differentiated by path or file type.
- The 30-second interval is acceptable even though it means changes may take up to 30 seconds to appear.
- No WebSocket or server-push mechanism is available; polling is the appropriate approach.
