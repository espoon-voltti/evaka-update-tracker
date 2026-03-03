# Feature Specification: eVaka Deployment Tracker

**Feature Branch**: `001-deployment-tracker`
**Created**: 2026-03-02
**Status**: Draft
**Input**: User description: "A monitoring tool that tracks which Pull Requests (features/changes) of eVaka are deployed in each instance of eVaka across multiple cities and environments."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Current Deployment Status (Priority: P1)

A developer opens the tracker dashboard and immediately sees the current deployment status for all monitored eVaka cities. For each city group (Espoo, Tampere region, Oulu, Turku), they can see what version is running in production and staging/test, along with the most recent human-made pull requests included in each environment. This gives the developer a clear at-a-glance understanding of where each city stands.

**Why this priority**: This is the core value proposition of the tool. Without knowing what's currently deployed, the team cannot make informed deployment decisions.

**Independent Test**: Can be fully tested by loading the dashboard page and verifying that each city group displays the correct deployed version and associated PRs, delivering immediate visibility into deployment status.

**Acceptance Scenarios**:

1. **Given** the tracker dashboard is loaded, **When** a developer views the page, **Then** they see all four city groups (Espoo, Tampere region, Oulu, Turku) with their production and staging/test versions displayed.
2. **Given** a city group has both production and staging environments, **When** viewing that city's section, **Then** the developer sees the deployed version for each environment and can compare them.
3. **Given** the deployed version is known, **When** viewing a city's section, **Then** the last 5 human-made pull requests per repository track (wrapper and core shown separately for wrapper cities) are listed with their title, author, and merge date.
4. **Given** pull requests have been merged but not yet deployed to any environment, **When** viewing a city's section, **Then** those PRs are shown separately with their current status (e.g., "merged, not yet deployed" or "in staging, not yet in production").

---

### User Story 2 - Filter by City (Priority: P1)

A developer wants to focus on a specific city's deployment status. They use tabs or filters to view only one city group at a time, reducing noise from other cities and letting them concentrate on the deployments relevant to their current work.

**Why this priority**: With 4 city groups and multiple environments, filtering is essential for usability and is tightly coupled with the core status view.

**Independent Test**: Can be tested by switching between city tabs/filters and verifying only the selected city's data is displayed.

**Acceptance Scenarios**:

1. **Given** the dashboard is loaded, **When** a developer selects the "Tampere region" tab/filter, **Then** only Tampere region deployment data is shown.
2. **Given** a city filter is active, **When** the developer selects a different city, **Then** the view updates to show only that city's data.
3. **Given** no filter is selected, **When** the dashboard loads, **Then** all city groups are visible (overview mode).

---

### User Story 3 - Track PR Deployment Progress (Priority: P1)

A developer wants to know the deployment status of a specific pull request across environments. The tracker shows whether a PR has been merged, deployed to staging/test, or deployed to production. This helps the team understand which changes are ready for testing, which are validated, and which are live.

**Why this priority**: Tracking individual PR status is essential for coordinating releases and validating that changes reach the correct environments.

**Independent Test**: Can be tested by locating a known merged PR and verifying its status is accurately reflected across all relevant environments.

**Acceptance Scenarios**:

1. **Given** a PR has been merged to the main branch but not deployed anywhere, **When** viewing the tracker, **Then** the PR appears with a "merged, awaiting deployment" status.
2. **Given** a PR has been deployed to staging but not production, **When** viewing the tracker, **Then** the PR appears with a "in staging" status indicator.
3. **Given** a PR has been deployed to both staging and production, **When** viewing the tracker, **Then** the PR appears with a "deployed" status and is part of the "last 5 PRs" list.
4. **Given** the tracker is showing PRs for a wrapper repository (Tampere, Oulu, Turku), **When** viewing the PR list, **Then** both wrapper-specific PRs and core eVaka PRs are tracked and displayed with clear indication of which repository they belong to.

---

### User Story 4 - Receive Slack Notifications on Deployment (Priority: P2)

When a new version is detected in any environment, the team receives a Slack notification announcing what changed. This keeps the team informed without requiring them to actively check the dashboard.

**Why this priority**: Notifications are a passive monitoring mechanism that adds significant value, but the dashboard must work first before notifications can be meaningful.

**Independent Test**: Can be tested by deploying a new version to any environment and verifying a Slack message is sent with the correct details.

**Acceptance Scenarios**:

1. **Given** the tracker detects a version change in a production environment, **When** the change is confirmed, **Then** a Slack notification is sent with the city name, environment, new version, and a summary of the included changes.
2. **Given** the tracker detects a version change in a staging/test environment, **When** the change is confirmed, **Then** a Slack notification is sent with appropriate details.
3. **Given** no version change is detected during a check cycle, **When** the check completes, **Then** no Slack notification is sent.

---

### User Story 5 - View Deployment History (Priority: P2)

A developer wants to review when specific features were deployed to an environment and what changes were included in each deployment. The deployment history shows a chronological log of deployments per instance, including the date/time and the list of changes in each deployment.

**Why this priority**: History is valuable for debugging and auditing but is secondary to knowing the current state and receiving notifications.

**Independent Test**: Can be tested by viewing the deployment history for a city/environment and verifying it shows past deployments with their timestamps and included changes.

**Acceptance Scenarios**:

1. **Given** a developer selects a city's deployment history view, **When** the history loads, **Then** they see a chronological list of past deployments for that city's environments.
2. **Given** a deployment entry in the history, **When** a developer expands or views it, **Then** they see the list of PRs/changes included in that deployment, along with the deployment date and time.
3. **Given** multiple deployments have occurred for an environment, **When** viewing the history, **Then** it is clear which changes were introduced in each specific deployment (differential view).

---

### User Story 6 - Toggle Dependency Update PRs (Priority: P3)

A developer occasionally needs to see automated dependency update PRs (from Dependabot/Renovate) alongside human-made PRs. By default, these are hidden to keep focus on meaningful feature and fix PRs, but a filter or toggle allows including them when needed.

**Why this priority**: This is a convenience feature for edge cases; the default behavior of filtering out automated PRs addresses the primary need.

**Independent Test**: Can be tested by toggling the filter and verifying that dependency update PRs appear or disappear accordingly.

**Acceptance Scenarios**:

1. **Given** the dashboard is displaying PRs, **When** the default view is shown, **Then** Dependabot and Renovate PRs are excluded from the listing.
2. **Given** the developer enables the "show dependency updates" filter/toggle, **When** the listing refreshes, **Then** automated dependency update PRs are included alongside human-made PRs.
3. **Given** dependency update PRs are shown, **When** viewing the listing, **Then** they are visually distinguishable from human-made PRs.

---

### Edge Cases

- What happens when an instance's public endpoint is unreachable or returns an error? The tracker should display "unavailable" status for that instance and continue monitoring other instances normally.
- What happens when the Oulu staging instance requires HTTP basic authentication and the credentials are invalid or expired? The tracker should indicate an authentication failure for that specific instance.
- What happens when a wrapper repository's submodule reference cannot be resolved? The tracker should display the wrapper version but flag that the core eVaka version could not be determined.
- What happens when a city group (e.g., Tampere region) has instances on different versions (rare but possible)? The tracker should display the version mismatch and highlight the discrepancy.
- What happens when there are no human-made PRs to display (e.g., only dependency updates have been merged recently)? The tracker should show an appropriate empty state message.
- What happens when the GitHub API rate limit is reached? The tracker should use cached data and indicate that the data may be stale, along with when the next refresh will be available.
- What happens when the data refreshes while a user is viewing the page? The static page should reflect the latest data upon page load or manual refresh.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display the currently deployed version for each monitored eVaka instance by querying each instance's public version endpoint.
- **FR-002**: System MUST resolve the core eVaka version for wrapper repositories (Tampere, Oulu, Turku) by reading the submodule reference from the wrapper repository.
- **FR-003**: System MUST display the last 5 human-made pull requests per repository track per environment per city group. For wrapper cities (Tampere, Oulu, Turku), this means up to 5 wrapper PRs and 5 core eVaka PRs shown separately, ensuring lower-volume wrapper changes remain visible alongside the higher-volume core stream. For Espoo (core-only), this means 5 core PRs.
- **FR-004**: System MUST display pull requests that have been merged to the main branch but are not yet deployed to any environment, showing their current deployment status.
- **FR-005**: System MUST filter out Dependabot and Renovate automated dependency update PRs from the default listing.
- **FR-006**: System MUST provide a toggle or filter to optionally include automated dependency update PRs in the listing.
- **FR-007**: System MUST provide filtering or tabs to view deployment data per city group (Espoo, Tampere region, Oulu, Turku).
- **FR-008**: System MUST group all Tampere region instances (Tampere, Hameenkyro, Kangasala, Lempaala, Nokia, Orivesi, Pirkkala, Vesilahti, Ylojarvi) as a single city group since they share the same wrapper repository and are typically updated together.
- **FR-009**: System MUST send a Slack notification when a version change is detected in any monitored environment, including the city name, environment type, and a summary of changes.
- **FR-010**: System MUST support authenticated access for instances that require HTTP basic authentication (e.g., Oulu staging).
- **FR-011**: System MUST track PRs from both wrapper repositories and the core eVaka repository, clearly indicating which repository each PR belongs to.
- **FR-012**: System MUST maintain a deployment history for each instance, recording which changes were released in each deployment along with the deployment date and time. History is persisted as data files committed to the tracker repository, with entries older than 1 month automatically pruned on each run.
- **FR-013**: System MUST refresh deployment data regularly (at least every 5 minutes) to provide near-real-time status.
- **FR-014**: System MUST be accessible as a publicly hosted web page that team members can access without authentication.
- **FR-015**: System MUST display PR details including title, author, and merge date for each listed pull request.
- **FR-016**: System MUST handle unreachable instances gracefully, displaying an appropriate status indicator and continuing to monitor other instances.

### Key Entities

- **City Group**: A logical grouping of eVaka instances for a city or region (Espoo, Tampere region, Oulu, Turku). Each has a name, associated repositories, and one or more environments.
- **Environment**: A deployment target within a city group (production or staging/test). Each has a URL, environment type, and optionally authentication requirements.
- **Instance**: A specific running eVaka deployment at a URL. Has a currently deployed version, last checked timestamp, and availability status.
- **Pull Request**: A code change merged into a repository. Has a title, author, merge date, repository source (wrapper or core), type (human-made or automated dependency update), and deployment status across environments.
- **Deployment Event**: A detected version change in an environment. Records the timestamp, previous version, new version, and the set of PRs included in the change.
- **Repository**: A GitHub repository being monitored. Can be either the core eVaka repo or a wrapper repo. Wrapper repos contain a submodule reference to the core eVaka repo.

## Monitored Instances

### Espoo
- **Repository**: espoon-voltti/evaka (core repository, no wrapper)
- **Production**: espoonvarhaiskasvatus.fi
- **Staging**: configured via `STAGING_INSTANCES` environment variable

### Tampere Region (grouped)
- **Repository**: Tampere/trevaka (wrapper), core eVaka as submodule 'evaka'
- **Production**: varhaiskasvatus.tampere.fi + 8 region municipalities
- **Test**: configured via `STAGING_INSTANCES` environment variable

### Oulu
- **Repository**: Oulunkaupunki/evakaoulu (wrapper), core eVaka as submodule 'evaka'
- **Production**: varhaiskasvatus.ouka.fi
- **Staging**: configured via `STAGING_INSTANCES` environment variable (requires HTTP basic authentication)

### Turku
- **Repository**: City-of-Turku/evakaturku (wrapper), core eVaka as submodule 'evaka'
- **Production**: evaka.turku.fi
- **Staging**: configured via `STAGING_INSTANCES` environment variable

## Confirmed Technical Details

- Each instance exposes a `/api/citizen/auth/status` endpoint that returns a JSON response with an `apiVersion` field containing the deployed **git commit SHA** (e.g., `{ "apiVersion": "a1b2c3d..." }`). This commit SHA is used to correlate deployed versions with repository commits.
- All monitored repositories (espoon-voltti/evaka, Tampere/trevaka, Oulunkaupunki/evakaoulu, City-of-Turku/evakaturku) are public GitHub repositories accessible via the GitHub API.
- For wrapper repositories, the core eVaka version is resolved by reading the git submodule named `evaka` at the deployed commit SHA.
- All 12 instances (including each Tampere region municipality) are checked individually to detect rare version mismatches. Results are grouped by city for display, with mismatches flagged when detected.
- Automated dependency update PRs are identified by commit message patterns (e.g., "Update dependency...", "Bump evaka from...") as well as by PR author (Dependabot, Renovate bot accounts).
- PR titles for merge commits are resolved by extracting the PR number from the merge commit message pattern (`Merge pull request #NNN from ...`) and looking up the PR title via the GitHub API.

## Clarifications

### Session 2026-03-02

- Q: How should deployment history data be persisted between static site generation runs? → A: JSON data files committed to the tracker repository, with a 1-month retention window. Entries older than 1 month are automatically pruned on each run.
- Q: For wrapper cities, should PR listing show 5 combined or 5 per repository track (wrapper + core)? → A: Separate tracks — up to 5 wrapper PRs + 5 core PRs per city per environment. Most changes happen in core, so wrapper PRs would get lost in noise if combined.

## Assumptions

- The Slack webhook URL and Oulu staging HTTP basic auth credentials are provided as configuration secrets.
- The "main branch" for each repository is the branch into which PRs are merged (typically `main` or `master`).
- The dashboard is a statically generated page that is regenerated with fresh data on each scheduled run; the page itself does not fetch live data at view time.
- The data collection and site generation process runs as a scheduled automated job (at least every 5 minutes) and can also be triggered via webhook.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Team members can determine the current deployment status of any city group within 10 seconds of loading the dashboard.
- **SC-002**: Deployment data is refreshed at least every 5 minutes, ensuring information is no more than 5 minutes stale.
- **SC-003**: The team receives Slack notifications within 10 minutes of a deployment change being detected in any monitored environment.
- **SC-004**: 100% of human-made merged PRs are accurately reflected with their correct deployment status (merged / in staging / in production).
- **SC-005**: Automated dependency update PRs are excluded from the default view, reducing listing noise so developers can focus on feature and fix PRs.
- **SC-006**: Deployment history for each city group is available, covering the last 1 month of deployment events with their associated changes. Older entries are automatically removed.
- **SC-007**: The tracker correctly resolves both wrapper repository PRs and core eVaka PRs for all cities that use wrapper repositories, giving complete change visibility.
- **SC-008**: All 4 city groups and their environments are monitored without manual intervention after initial setup.
