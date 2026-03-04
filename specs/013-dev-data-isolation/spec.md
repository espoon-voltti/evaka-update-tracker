# Feature Specification: Dev Data Isolation

**Feature Branch**: `013-dev-data-isolation`
**Created**: 2026-03-04
**Status**: Draft
**Input**: User description: "Getting constant conflicts about resources in data/ as the GH actions are updating it while also locally testing with real data. Reduce conflicts while keeping data in the repo."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Local Development Without Git Conflicts (Priority: P1)

As a developer, I want to run the data pipeline locally for testing without creating git conflicts with the CI-committed data files, so that I can pull upstream changes cleanly and focus on development instead of resolving merge conflicts.

**Why this priority**: This is the core problem. Every local test run modifies tracked files in `data/`, which then conflict with the CI workflow's automated commits to the same files. Eliminating this friction is the primary goal.

**Independent Test**: Can be fully tested by running the data pipeline locally, then running `git status` and confirming no tracked files were modified. Pulling the latest remote changes should produce no merge conflicts.

**Acceptance Scenarios**:

1. **Given** a developer clones the repo and runs the data pipeline locally, **When** the pipeline completes, **Then** the output data files are written to an untracked location and no tracked files in `data/` are modified.
2. **Given** a developer has run the pipeline locally producing local data, **When** they pull upstream changes that include CI-updated `data/` files, **Then** the pull succeeds with no merge conflicts.
3. **Given** a developer runs the pipeline locally, **When** they open the site in a browser for testing, **Then** the site displays the locally-generated data (not the stale committed data).

---

### User Story 2 - Zero-Configuration Local Setup (Priority: P2)

As a developer, I want local data isolation to work automatically without manual configuration steps, so that I don't need to remember special environment variables or setup procedures.

**Why this priority**: If isolation requires manual env var setup, developers will forget and end up with the same conflict problem. The default local behavior should "just work."

**Independent Test**: Can be tested by cloning the repo fresh, running `npm install`, running the pipeline, and confirming data goes to the untracked location without any `.env` file or env var set.

**Acceptance Scenarios**:

1. **Given** a fresh clone of the repository with no `.env` file, **When** a developer runs the data pipeline locally, **Then** the output goes to the untracked data location automatically.
2. **Given** CI runs the data pipeline, **When** the pipeline completes, **Then** the output goes to the tracked `data/` directory as it does today (no change to CI behavior).

---

### User Story 3 - Committed Data Remains Available (Priority: P3)

As a developer, I want the CI-committed data to remain in the repository as a fallback and for deployment, so that the site can still be built and deployed from the repo without running the pipeline first.

**Why this priority**: The user explicitly wants data kept in the repo. The committed data serves as the deployment source and provides a working baseline for anyone who doesn't need to run the pipeline locally.

**Independent Test**: Can be tested by checking out the repo and confirming `data/` still contains the latest CI-committed JSON files, and that the site build/deploy process still works from committed data.

**Acceptance Scenarios**:

1. **Given** the repository is cloned, **When** a user opens the site without running the pipeline, **Then** the site displays the committed data from `data/`.
2. **Given** CI runs the monitor workflow, **When** the pipeline completes, **Then** the updated data files are committed to `data/` as they are today.

---

### Edge Cases

- What happens when a developer explicitly wants to update the committed `data/` files locally (e.g., to test the exact CI flow)? They should be able to override back to the tracked location via an environment variable.
- What happens when the local data directory doesn't exist yet on first run? The pipeline should create it automatically.
- What happens if the site symlink (`site/data`) points to committed data but the developer wants to preview local data? The site serving mechanism must resolve this correctly.
- What happens if a developer switches between local and CI data directories? Stale data in the inactive directory should not cause confusion — the active directory is always determined at pipeline startup.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The data pipeline MUST write output to an untracked directory by default when run outside of CI.
- **FR-002**: The data pipeline MUST write output to the tracked `data/` directory when run in CI (preserving current behavior).
- **FR-003**: The local development site preview MUST serve data from the local untracked data directory when it exists.
- **FR-004**: The local untracked data directory MUST be excluded from version control via `.gitignore`.
- **FR-005**: Developers MUST be able to override the data output location via an environment variable to restore the original behavior or use a custom path.
- **FR-006**: The untracked local data directory MUST support the same file structure as the tracked `data/` directory (same filenames, same JSON format).
- **FR-007**: The system MUST detect whether it is running in CI or locally without requiring developer configuration.

### Key Entities

- **Data Directory**: The output location for pipeline-generated JSON files (`current.json`, `history.json`, `previous.json`, `feature-flags.json`). Has two variants: tracked (for CI/deployment) and untracked (for local development).
- **CI Environment**: The GitHub Actions context where the pipeline runs, commits data, and deploys the site. Distinguished from local development by environment signals.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Developers experience zero merge conflicts on `data/` files when pulling upstream changes after local pipeline runs.
- **SC-002**: Local development setup requires zero additional configuration steps beyond what exists today (`npm install`).
- **SC-003**: CI pipeline behavior is unchanged — data files are still committed and deployed exactly as before.
- **SC-004**: Developers can preview locally-generated data in the site within the existing development workflow (no new tools or steps required).

## Assumptions

- The `CI` environment variable (set automatically by GitHub Actions) is a reliable signal to distinguish CI from local environments.
- The existing `DATA_DIR` environment variable override will serve as the explicit override mechanism (FR-005).
- A conventional untracked directory name (e.g., `.data/` or `data-local/`) will be used, added to `.gitignore`.
- The existing symlink at `site/data` will need to be updated or replaced to support serving from the local data directory during development.
