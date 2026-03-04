# Feature Specification: Feature Flag Tracker

**Feature Branch**: `012-feature-flag-tracker`
**Created**: 2026-03-04
**Status**: Draft
**Input**: User description: "Add feature flag tracker feature to the app. Source code for each tracked implementation/city is available locally. There are both backend and front-end features that can be toggled via the codebase. Environment variable activated features are out of scope. Display which features are on in each city, useful for product owners, product managers and stakeholders."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Compare Feature Availability Across Cities (Priority: P1)

As a product owner or stakeholder, I want to see a side-by-side comparison of which features are enabled or disabled across all eVaka cities, so I can quickly understand feature parity and identify gaps between implementations.

**Why this priority**: This is the core value proposition. Without the comparison view, the feature has no purpose. Every other story builds on this foundation.

**Independent Test**: Can be fully tested by navigating to the feature flags view and verifying that a matrix of cities × features is displayed with correct on/off states. Delivers immediate value by answering "which city has which feature?"

**Acceptance Scenarios**:

1. **Given** the feature flags view is loaded, **When** the user views the page, **Then** they see a comparison matrix showing all tracked cities as columns and feature flags as rows, with clear on/off indicators for each cell.
2. **Given** the comparison matrix is displayed, **When** a feature is enabled in some cities but not others, **Then** the difference is visually prominent (not just text — uses color, icons, or similar visual treatment).
3. **Given** the comparison matrix is displayed, **When** the user scans the matrix, **Then** they can identify within seconds which features differ between cities without reading every cell individually.

---

### User Story 2 - Distinguish Frontend and Backend Feature Categories (Priority: P2)

As a product manager, I want to see features organized by category (frontend UI features vs backend business logic features), so I can understand the full picture of how each city's system is configured without needing to know the codebase.

**Why this priority**: Without categorization, the raw list of 40+ flags is overwhelming. Grouping makes the data actionable for non-technical stakeholders.

**Independent Test**: Can be tested by verifying that features are grouped into clear categories and that each category can be viewed independently.

**Acceptance Scenarios**:

1. **Given** the feature flags view is loaded, **When** the user views the matrix, **Then** features are organized into at least two distinct categories: frontend features and backend configuration features.
2. **Given** the categories are displayed, **When** the user looks at a category, **Then** each feature has a human-readable label (not raw code identifiers like `citizenShiftCareAbsence`).

---

### User Story 3 - View City-Specific Feature Summary (Priority: P3)

As a city stakeholder, I want to see a summary for my specific city showing which features are enabled and which are not, so I can understand my city's capabilities without comparing to others.

**Why this priority**: Complements the comparison view. City stakeholders often care only about their own city. A per-city summary is a natural entry point from the existing city detail pages.

**Independent Test**: Can be tested by navigating to a city's detail view and verifying the feature flag summary is present, showing enabled and disabled features for that city.

**Acceptance Scenarios**:

1. **Given** the user navigates to a city detail page, **When** the page loads, **Then** a feature flag summary section is visible showing the city's feature configuration.
2. **Given** the feature flag summary is displayed, **When** the user views it, **Then** enabled features are clearly distinguished from disabled features.

---

### User Story 4 - Filter and Focus the Feature Matrix (Priority: P3)

As a product owner comparing many cities, I want to filter the feature matrix to show only features that differ between cities, so I can focus on the meaningful differences without scrolling through dozens of identical rows.

**Why this priority**: With 12 cities and 40+ features, the full matrix is large. Filtering to "differences only" is the most impactful way to reduce noise for the primary use case: understanding divergence.

**Independent Test**: Can be tested by toggling a "show differences only" filter and verifying that rows where all cities have the same value are hidden.

**Acceptance Scenarios**:

1. **Given** the comparison matrix is displayed, **When** the user activates a "differences only" filter, **Then** only features that have different values across cities are shown.
2. **Given** the "differences only" filter is active, **When** all features have the same value, **Then** a message indicates no differences exist.
3. **Given** the filter is active, **When** the user deactivates it, **Then** all features are shown again.

---

### Edge Cases

- What happens when a feature flag exists in some city implementations but not others? Display as "not set" or equivalent, visually distinct from both enabled and disabled states.
- What happens when the source data cannot be parsed from a repository? Display the city with an error/unavailable indicator for the affected category, while still showing data from other cities and categories.
- What happens when new feature flags are added to the eVaka core? The system should pick them up automatically on the next data refresh without manual intervention, since flags are read from source code.
- How are the Tampere-region sub-municipalities (Nokia, Pirkkala, Kangasala, etc.) handled? They share the same deployment (trevaka) but have independent feature flag configurations. Shown as a single "Tampereen seutu" column by default, with divergence indicators and expandable detail for differing flags.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST extract frontend feature flag values from each city's source code repository (the production feature flag configuration).
- **FR-002**: System MUST extract backend feature configuration values from each city's source code repository (the city-specific configuration class).
- **FR-003**: System MUST display a comparison matrix with cities as columns and features as rows, showing on/off/value state for each combination.
- **FR-004**: System MUST distinguish between three states for boolean flags: enabled (true), disabled (false), and not configured (absent/undefined).
- **FR-005**: System MUST use human-readable Finnish labels for feature names rather than raw code identifiers.
- **FR-006**: System MUST organize features into categories (at minimum: frontend features and backend configuration).
- **FR-007**: System MUST support a "show differences only" filter that hides features with identical values across all displayed cities.
- **FR-008**: System MUST display feature flag information on individual city detail pages.
- **FR-009**: System MUST hide non-boolean backend configuration values (numeric thresholds, enum choices) by default, but provide a toggle to reveal them. When shown, the actual values are displayed rather than on/off. Purely operational string values (message account names, post office strings, archive metadata) are excluded entirely.
- **FR-010**: System MUST default to showing 4 city group columns (Espoo, Tampereen seutu, Oulu, Turku). For Tampereen seutu, the column shows the shared/majority value. When sub-municipalities within Tampereen seutu differ on a flag, the cell MUST visually indicate the divergence. An expand action MUST reveal the individual municipality values for differing flags.
- **FR-011**: System MUST persist extracted feature flag data so the frontend can load it without accessing source repositories directly.
- **FR-012**: System MUST update feature flag data as part of the regular data refresh cycle.
- **FR-013**: System MUST provide navigation to the feature flags comparison view as a top-level tab ("Ominaisuudet") in the main tab bar, alongside Yleiskatsaus and the city tabs.

### Scope Exclusions

- Environment variable activated features (from infra repositories) are explicitly out of scope.
- Per-unit pilot features (database-stored per daycare unit toggles) are out of scope — these are runtime database state, not source code configuration.
- Staging environment feature flags are out of scope — only production configurations are tracked.

### Key Entities

- **Feature Flag**: A configurable setting that controls whether a capability is active. Has a name, human-readable label, category (frontend/backend), and a value per city. Boolean flags have true/false/unset states. Configuration flags have string/numeric values.
- **City Implementation**: A municipality's eVaka deployment with its own feature configuration. Identified by name. Maps to a source code repository (or subdirectory within a shared repository like trevaka).
- **Feature Category**: A grouping of related feature flags. At minimum: "Frontend Features" (from the frontend feature flags type) and "Backend Configuration" (from the backend feature config class).
- **Feature Flag Dataset**: The collected snapshot of all feature flag values across all cities, generated by the data pipeline and consumed by the frontend.

## Assumptions

- Feature flag source files have fixed, known paths within each repository. These paths can be hardcoded and are assumed to remain stable. Only these specific files need to be fetched — no repository cloning or broad file scanning required.
- The data pipeline fetches these specific files via GitHub API (file content endpoint) on each scheduled run, alongside the existing deployment data collection.
- The production feature flag values in each city's frontend configuration can be reliably identified by parsing the production environment block.
- Backend feature configuration values can be reliably extracted from each city's configuration class.
- The existing data pipeline refresh cycle (every 5 minutes) is an appropriate frequency for feature flag updates. Feature flags change infrequently (only on new deployments), so this frequency is more than sufficient.
- Finnish labels for feature flags will be manually curated based on the feature's purpose in the eVaka system. The initial label mapping will cover all currently known flags.
- The Tampere-region municipalities share a repository but each has a separate configuration directory, allowing individual extraction.
- Non-boolean configuration values that are purely operational (message account names, post office strings, archive metadata) may be excluded from display as they are not meaningful "features" for stakeholders. Only behaviorally significant configuration values are shown.

## Clarifications

### Session 2026-03-04

- Q: How should the feature flags view integrate into the app navigation? → A: New top-level tab "Ominaisuudet" alongside Yleiskatsaus and city tabs.
- Q: Which backend FeatureConfig fields should be shown? → A: Boolean flags shown by default. Non-boolean policy values (numeric thresholds, enum choices) hidden by default with a UI toggle to reveal them. Purely operational strings excluded entirely.
- Q: How should the 12 cities be organized as columns? → A: Default to 4 city group columns (Espoo, Tampereen seutu, Oulu, Turku). Tampereen seutu shows shared/majority value with visual indicator when sub-municipalities differ, expandable to show the individual differences.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can determine whether a specific feature is enabled in a specific city within 5 seconds of loading the feature flags view.
- **SC-002**: Users can identify all features that differ between any two cities within 15 seconds using the differences-only filter.
- **SC-003**: All 12 tracked city implementations are represented with their complete set of frontend and backend feature flags.
- **SC-004**: Feature flag data reflects the current state of each city's source code, updated within the regular refresh cycle.
- **SC-005**: Non-technical stakeholders can understand the feature comparison without knowledge of the codebase, through human-readable labels and clear visual indicators.
- **SC-006**: The feature flags view loads and displays the full comparison matrix within 2 seconds on a standard connection.
