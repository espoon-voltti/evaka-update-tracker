# Feature Specification: Capture Views Tool

**Feature Branch**: `022-capture-views`
**Created**: 2026-03-18
**Status**: Draft
**Input**: User description: "implement the tool npm run capture-views that's mentioned in e.g. .specify/templates/plan-template.md"

## Clarifications

### Session 2026-03-18

- Q: What format should the "Markdown snapshot" of each view be? → A: Markdown files containing text-based DOM content extraction (no images, text-only representation). Each view's rendered content is extracted as structured text and saved as a `.md` file committed to the repo.
- Q: How much DOM structure should be preserved in the text extraction? → A: Structured text with Markdown formatting (headings, lists, tables) extracted from DOM hierarchy — not plain innerText or raw HTML.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Batch Capture All Dashboard Views (Priority: P1)

A developer or CI pipeline runs `npm run capture-views` to automatically generate text-based Markdown snapshots of every major dashboard view. The tool visits each route (overview, city detail pages, history pages, feature matrix) using test data, extracts the rendered DOM content as structured text, and saves each as a `.md` file committed to the repository. These snapshots serve as a baseline record of each view's state, making it easy to reference the "before" when writing PR descriptions.

**Why this priority**: This is the core purpose of the tool — providing a committed, diffable text record of all dashboard views that can be used to show what changed in a PR.

**Independent Test**: Can be tested by running `npm run capture-views` and verifying that Markdown snapshot files are created for each expected view with meaningful text content.

**Acceptance Scenarios**:

1. **Given** the project has test data generation and a local server available, **When** the user runs `npm run capture-views`, **Then** Markdown snapshot files are generated for all major dashboard routes and saved to the output directory.
2. **Given** the tool is run with default settings, **When** it completes, **Then** each output file is named descriptively (e.g., `overview.md`, `city-tampere-region.md`, `city-tampere-region-history.md`, `features.md`).
3. **Given** the output directory does not exist, **When** the tool runs, **Then** it creates the directory automatically.
4. **Given** the tool has run and snapshots are committed, **When** a developer opens a PR that changes the frontend, **Then** the diff of the snapshot files shows what text content changed in each view.

---

### User Story 2 - Selective View Capture (Priority: P2)

A developer wants to capture only specific views (e.g., just the overview, or just one city's detail page) without running the full batch. They pass a filter argument to capture only matching views.

**Why this priority**: Saves time during iterative development when only one view has changed.

**Independent Test**: Can be tested by running `npm run capture-views -- --filter overview` and verifying only the overview snapshot is generated.

**Acceptance Scenarios**:

1. **Given** the user passes `--filter overview`, **When** the tool runs, **Then** only the overview snapshot is generated.
2. **Given** the user passes `--filter city-tampere-region`, **When** the tool runs, **Then** only the Tampere region city detail snapshot is generated.
3. **Given** the user passes an invalid filter that matches no views, **When** the tool runs, **Then** it exits with a clear error message listing available view names.

---

### User Story 3 - CI Freshness Check (Priority: P2)

A CI pipeline runs `npm run capture-views` and compares the output against committed snapshots. If any snapshot differs, the build fails, alerting the team that view snapshots need updating.

**Why this priority**: Ensures the repo always contains accurate, up-to-date view snapshots — the core value proposition for PR before/after comparisons.

**Independent Test**: Can be tested by modifying a frontend component, running CI, and verifying the build fails until snapshots are regenerated and committed.

**Acceptance Scenarios**:

1. **Given** committed snapshots match the current view output, **When** CI runs the freshness check, **Then** the check passes.
2. **Given** a frontend change causes a view to render differently, **When** CI runs the freshness check, **Then** the check fails with a clear message identifying which snapshots are stale.
3. **Given** a new city is added to the test data, **When** CI runs the freshness check, **Then** the check fails because the new city's snapshot is missing.

---

### User Story 4 - Custom Output Directory (Priority: P3)

A developer specifies a custom output directory for the captured snapshots, e.g., for local comparison or temporary use.

**Why this priority**: Flexibility for local workflows without affecting committed snapshots.

**Independent Test**: Can be tested by running `npm run capture-views -- --output-dir ./my-snapshots` and verifying files appear in that directory.

**Acceptance Scenarios**:

1. **Given** the user passes `--output-dir ./custom-path`, **When** the tool runs, **Then** all snapshots are saved to `./custom-path/`.
2. **Given** no output directory is specified, **When** the tool runs, **Then** snapshots are saved to the default committed directory.

---

### Edge Cases

- What happens when the local server fails to start? The tool exits with a clear error message.
- What happens when a view fails to render (e.g., missing data)? The tool logs a warning for that view and continues capturing remaining views, then exits with a non-zero code.
- What happens when Playwright/Chromium is not installed? The tool exits with a clear error suggesting `npx playwright install chromium`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST capture text-based Markdown snapshots of all major dashboard routes: overview (`/`), features (`/features`), city detail (`/city/:id` for each city in test data), and city history (`/city/:id/history` for each city).
- **FR-002**: System MUST generate test data and start a local server before capturing (reusing existing E2E test fixtures).
- **FR-003**: System MUST save each snapshot as a Markdown file with a descriptive filename (e.g., `overview.md`, `features.md`, `city-tampere-region.md`, `city-tampere-region-history.md`).
- **FR-004**: System MUST extract the rendered DOM content of each view as structured Markdown — preserving headings, lists, and tables from the DOM hierarchy — not plain innerText or raw HTML.
- **FR-005**: System MUST support a `--filter` argument to capture only views whose names match the given pattern.
- **FR-006**: System MUST support an `--output-dir` argument to specify where snapshots are saved, with a sensible default directory that is committed to the repo.
- **FR-007**: System MUST log progress as it captures each view (view name and output path).
- **FR-008**: System MUST exit with a non-zero code if any view fails to render, after attempting all remaining views.
- **FR-009**: System MUST be invocable via `npm run capture-views`.
- **FR-010**: The snapshot output directory and its contents MUST be committed to the repository so that diffs are visible in pull requests.
- **FR-011**: A CI step MUST run `npm run capture-views` and fail the build if the generated snapshots differ from the committed versions, ensuring snapshots stay up-to-date.

### Key Entities

- **View**: A named dashboard route with a hash path and a wait-for selector to ensure content is loaded before extraction (e.g., `.city-grid` for overview, `.city-detail` for city pages).
- **View Registry**: The list of all views to capture, derived from the dashboard's routes and the cities present in the test data.
- **Snapshot**: A Markdown file containing the extracted text content of a rendered view, committed to the repository as a baseline.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Running `npm run capture-views` produces a Markdown snapshot file for every major dashboard view (at least 4 categories: overview, features, city detail, city history).
- **SC-002**: The tool completes the full capture process in under 60 seconds for a typical set of test data.
- **SC-003**: Developers can selectively capture a single view in under 10 seconds using the `--filter` option.
- **SC-004**: The tool reuses existing E2E test fixtures (test data generation, local server) without duplication.
- **SC-005**: CI detects stale snapshots within the normal build pipeline and fails with an actionable error message.
- **SC-006**: Snapshot diffs in pull requests clearly show what text content changed in each view.

## Assumptions

- The existing E2E test fixtures (test data generation, local server) will be reused.
- The list of cities to capture is derived dynamically from the generated test data (not hardcoded).
- The tool is intended for developer and CI use, not for end users.
- Playwright and Chromium are expected to be installed (the tool does not install them automatically).
- Snapshots are deterministic given the same test data — no timestamps, random IDs, or other non-deterministic content in the output.
- The CI freshness check uses a simple regenerate-and-diff approach (run the tool, compare output to committed files).
