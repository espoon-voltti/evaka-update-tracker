# Feature Specification: Improve History View for Stakeholders

**Feature Branch**: `010-improve-history-view`
**Created**: 2026-03-04
**Status**: Draft
**Input**: User description: "Check out the history view from a eVaka's product manager, PO or stakeholder perspective. Is this view informative and usable? What needs to be changed there? Also compare it with the city view. How can we make the history view more in-line with the other views? Also review the language used there. Make it idiomatic Finnish."

## Analysis: Current History View Problems

The history view (`#/city/:id/history`) is significantly behind the city detail and overview views in terms of usability and visual design. From a stakeholder perspective:

1. **Commit SHAs are meaningless** — The view shows raw commit hashes (`3debd92 → 7c491d1`) as the main content of each event. A product owner gains nothing from this. The city view solved this by showing PR titles instead.
2. **No bot/dependency filtering** — Every dependency bump from Dependabot clutters the timeline. The city view offers a "Näytä riippuvuuspäivitykset" toggle.
3. **No PR labels** — The city view and overview use color-coded labels (Korjaus, Parannus, Tekninen, etc.) via the shared PR list component. The history view has its own inline PR rendering with no labels.
4. **Flat, unstyled event list** — The city view uses color-coded sections (green for production, blue for staging, yellow for pending). History events are plain white cards with no environment-based color distinction.
5. **Raw English terminology** — Repository types are shown as "core" and "wrapper" instead of the Finnish translations "Ydin" and "Kuntaimplementaatio" used everywhere else.
6. **Awkward Finnish** — Phrases like "PR sisältyy" (PR is included) and "Muutostapahtumia ei ole vielä tallennettu" are grammatically correct but not idiomatic or concise.
7. **PRs hidden by default** — The included PRs are inside a collapsed `<details>` element, making the most valuable information (what actually changed) invisible at first glance.
8. **No shared component reuse** — The view renders its own PR list instead of reusing the shared component, which means it misses label badges, author handling, date formatting, and repo labels.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - PR-Centric Event Display (Priority: P1)

A product owner opens the history view for their city and immediately sees what changed in each deployment — described as human-readable PR titles, not commit hashes. Each event shows the included PRs prominently (not hidden in a collapsed section), with the same label badges and formatting used in the city view.

**Why this priority**: The commit SHA display is the single biggest usability problem. Stakeholders visit history to understand what changed — PRs are the answer, not commits.

**Independent Test**: Can be tested by opening any city's history page and verifying that each event prominently displays PR titles with labels, not commit SHAs.

**Acceptance Scenarios**:

1. **Given** a history event with included PRs, **When** the page loads, **Then** the PR titles are displayed prominently (visible without clicking to expand)
2. **Given** a history event, **When** it is rendered, **Then** each PR shows the same label badges (Korjaus, Parannus, etc.) used in the city view
3. **Given** a history event, **When** it is rendered, **Then** the commit SHA transition (`abc1234 → def5678`) is available but secondary (smaller, less prominent)
4. **Given** a history event with no included PRs, **When** displayed, **Then** a message indicates no PR information is available

---

### User Story 2 - Bot/Dependency Event Filtering (Priority: P2)

A stakeholder can toggle dependency/bot events on or off, just like in the city view. By default, bot-only events (where all included PRs are from bots) are hidden to reduce noise. Events that contain a mix of bot and non-bot PRs show only the non-bot PRs by default.

**Why this priority**: Dependency bumps (Dependabot) dominate the history timeline and obscure meaningful changes. Filtering them brings the history view in line with the city view's toggle behavior.

**Independent Test**: Can be tested by loading a history page, verifying bot-only events are hidden by default, then clicking the toggle to show them.

**Acceptance Scenarios**:

1. **Given** a history page loads, **When** the default state is active, **Then** events where all PRs are bot-generated are hidden
2. **Given** a mixed event (bot + non-bot PRs), **When** displayed in default state, **Then** only non-bot PRs are shown within the event
3. **Given** the toggle button is clicked, **When** bot events become visible, **Then** all events and all PRs are shown
4. **Given** the toggle is in "show bots" state, **When** clicked again, **Then** bot events are hidden again

---

### User Story 3 - Environment-Based Visual Styling (Priority: P3)

Each history event is color-coded by environment type, matching the city view's visual language: green tint for production events, blue tint for staging/testing events. Repository types use Finnish translations ("Ydin" / "Kuntaimplementaatio") consistent with the city and overview views.

**Why this priority**: Visual consistency with the city view helps stakeholders build familiarity. Color-coding lets them scan the timeline and quickly distinguish production deployments from staging ones.

**Independent Test**: Can be tested by opening the history page and verifying events have colored backgrounds matching the city view sections, and repo labels are in Finnish.

**Acceptance Scenarios**:

1. **Given** a production deployment event, **When** displayed, **Then** it has a green-tinted background consistent with the city view's production section
2. **Given** a staging/testing deployment event, **When** displayed, **Then** it has a blue-tinted background consistent with the city view's staging section
3. **Given** an event for the "core" repository, **When** displayed, **Then** the repo label reads "Ydin" (not "core")
4. **Given** an event for the "wrapper" repository, **When** displayed, **Then** the repo label reads "Kuntaimplementaatio" (not "wrapper")

---

### User Story 4 - Idiomatic Finnish Language (Priority: P3)

All Finnish text in the history view uses natural, idiomatic phrasing that feels native to Finnish speakers. Awkward or overly literal translations are replaced.

**Why this priority**: This is a Finnish-language tool for Finnish stakeholders. The language should feel natural, not machine-translated.

**Independent Test**: Can be tested by having a Finnish speaker review all UI text on the history page.

**Acceptance Scenarios**:

1. **Given** an event with N included PRs, **When** displayed, **Then** the PR count text uses idiomatic Finnish (e.g., "Sisältää 3 muutosta" instead of "3 PR sisältyy")
2. **Given** an empty history, **When** the page loads, **Then** the empty state message reads "Ei tallennettuja muutoksia" (concise, idiomatic)
3. **Given** an event with no PR data, **When** displayed, **Then** the message reads "PR-tietoja ei saatavilla" (unchanged, already acceptable)
4. **Given** the back navigation link, **When** displayed, **Then** it reads as "← [City Name]" (e.g., "← Tampereen seutu") following standard Finnish UI patterns
5. **Given** timestamp displays, **When** rendered, **Then** they include the Finnish weekday name consistent with the city view date formatting

---

### Edge Cases

- What happens when a city has hundreds of history events? The view should remain performant with scroll-based browsing. No pagination is needed at current data volumes.
- What happens when a history event has 0 PRs and the bot filter is on? The event should still be shown (it represents a real deployment) with a note that no PR details are available.
- What happens when all events for a city are bot-only and the filter is active? An empty state message should indicate that only automated changes have been recorded, with a prompt to show automated changes.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: History events MUST display included PR titles prominently (visible without user interaction), using the same shared PR list component used by the city and overview views
- **FR-002**: History events MUST show PR label badges (Korjaus, Parannus, Tekninen, etc.) for each included PR, consistent with the city view
- **FR-003**: Commit SHA transitions MUST still be visible but displayed as secondary information (smaller font, muted color)
- **FR-004**: A bot/dependency toggle button MUST be present, matching the city view's "Näytä riippuvuuspäivitykset" behavior and label
- **FR-005**: Events where all included PRs are bot-generated MUST be hidden by default (when bot toggle is off)
- **FR-006**: Production events MUST have a green-tinted background, staging events MUST have a blue-tinted background, consistent with city view sections
- **FR-007**: Repository type labels MUST use Finnish translations: "Ydin" for core, "Kuntaimplementaatio" for wrapper
- **FR-008**: The PR counter text MUST use idiomatic Finnish (e.g., "Sisältää N muutosta" or equivalent natural phrasing)
- **FR-009**: The empty state message MUST read "Ei tallennettuja muutoksia"
- **FR-010**: The back navigation MUST use a left arrow with the city name (e.g., "← Tampereen seutu")
- **FR-011**: Timestamps MUST include Finnish weekday names, consistent with the city view's date formatting
- **FR-012**: The history view MUST reuse the shared PR list component for displaying PRs within events
- **FR-013**: The bot toggle state MUST be persisted via URL query parameter (`?showBots=true`) consistent with the city view

### Key Entities

- **Deployment Event**: A detected version change in an environment, containing timestamps, commit transitions, and included PRs. Events are the primary display unit in the history view.
- **Pull Request**: A code change with title, author, labels, repo type, and bot status. PRs are the most meaningful information for stakeholders.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A stakeholder can identify what changed in a deployment within 3 seconds of viewing a history event (PR titles visible without clicking)
- **SC-002**: Automated dependency updates are hidden by default, reducing visual noise — at least 50% of typical events are bot-only and will be filtered
- **SC-003**: All visible text on the history page passes review by a Finnish speaker as natural and idiomatic
- **SC-004**: The history view uses the same visual language (colors, labels, component patterns) as the city detail view — a stakeholder moving between views experiences no visual inconsistency
- **SC-005**: The shared PR list component is reused, eliminating duplicate rendering code in the history view

## Assumptions

- The existing shared PR list component can be reused within history events without modification (or with minor parameter additions)
- The `showBots` query parameter convention from the city view will be applied identically in the history view
- No pagination is needed at this stage — the current data volume is manageable with scroll-based browsing
- The existing history data structure (events with includedPRs) provides all necessary information; no backend/pipeline changes are required
- Finnish weekday formatting will follow the same pattern established in the city view (feature 009)
