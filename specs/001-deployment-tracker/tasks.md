# Tasks: eVaka Deployment Tracker

**Input**: Design documents from `/specs/001-deployment-tracker/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Included — plan.md defines specific test files and the project constitution requires pragmatic testing (Jest + nock).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, dependency installation, and tooling configuration

- [x] T001 Create project directory structure per plan.md: `src/config/`, `src/api/`, `src/services/`, `src/utils/`, `site/css/`, `site/js/components/`, `data/`, `tests/unit/`, `tests/integration/`, `tests/fixtures/`, `.github/workflows/`
- [x] T002 Initialize Node.js project with package.json — install dependencies: typescript, ts-node, axios, jest, ts-jest, nock, @types/node, @types/jest, dotenv
- [x] T003 [P] Create tsconfig.json with strict mode, ES2022 target, Node module resolution, outDir `dist/`, include `src/**/*`
- [x] T004 [P] Create jest.config.ts with ts-jest preset, roots `['<rootDir>/tests']`, moduleFileExtensions for ts/js
- [x] T005 [P] Create .env.example documenting all environment variables: GH_TOKEN, SLACK_WEBHOOK_URL, OULU_STAGING_USER, OULU_STAGING_PASS, DRY_RUN
- [x] T006 [P] Configure ESLint and Prettier — add `lint` and `format` npm scripts to package.json; add `test` script running jest

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core types, configuration, utilities, and API clients that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T007 Define all TypeScript interfaces and types in src/types.ts — CityGroup, Repository, Environment, Instance, BasicAuth, VersionSnapshot, CommitInfo, PullRequest, DeploymentStatus, DeploymentEvent, CurrentData, HistoryData, PreviousData (per data-model.md entity definitions and contracts/data-files.md schemas)
- [x] T008 [P] Create instance configuration in src/config/instances.ts — define all 4 city groups (Espoo, Tampere region, Oulu, Turku), their repositories (core vs wrapper with submodulePath), and all 12 instances with domains and auth requirements (per spec.md Monitored Instances section)
- [x] T009 [P] Implement retry utility with exponential backoff in src/utils/retry.ts — configurable max retries, base delay, used by all API clients
- [x] T010 [P] Implement PR classifier in src/utils/pr-classifier.ts — detect bot PRs by commit message patterns ("Update dependency", "Bump evaka from") and author names (dependabot, renovate) per spec.md confirmed technical details
- [x] T011 Implement GitHub API client in src/api/github.ts — functions: getCommit(owner, repo, sha), getSubmoduleRef(owner, repo, path, ref) per research R7, compareShas(owner, repo, base, head) per research R1, getPullRequest(owner, repo, number), extractPRNumberFromCommitMessage(message) — use axios with GH_TOKEN auth header, ETag caching per research R2
- [x] T012 [P] Implement status API client in src/api/status.ts — fetchVersion(domain, auth?) function that GETs `https://{domain}/api/citizen/auth/status`, extracts apiVersion (commit SHA) from response, returns VersionSnapshot with status ok/unavailable/auth-error — support optional BasicAuth for Oulu staging
- [x] T013 Create HTML shell for dashboard SPA in site/index.html — semantic structure with city tab nav area, main content area, `<script type="module" src="js/app.js">`, link to css/style.css, `<meta charset>` and viewport
- [x] T014 [P] Create dashboard stylesheet in site/css/style.css — layout for city tabs, PR lists, status badges (ok=green, unavailable=red, auth-error=yellow), responsive grid for city groups, environment sections, history timeline
- [x] T015 Implement hash-based router in site/js/router.js — parse routes per url-routing.md contract: `#/` (overview), `#/city/{id}` (city detail), `#/city/{id}/history` (history view), query param extraction (showBots), hashchange listener, navigate() function, fallback to `#/` for unknown routes

**Checkpoint**: Foundation ready — user story implementation can now begin

---

## Phase 3: User Story 1 — View Current Deployment Status (Priority: P1) MVP

**Goal**: Developer opens the dashboard and immediately sees deployment status for all 4 city groups — deployed versions, environment status, and recent human-made PRs per track

**Independent Test**: Load dashboard, verify all city groups display correct versions and last 5 human PRs per track (wrapper/core separated for wrapper cities)

### Implementation for User Story 1

#### Backend (Data Fetcher)

- [x] T016 [US1] Implement version resolver service in src/services/version-resolver.ts — for each instance: call status API to get deployed SHA, then call GitHub API getSubmoduleRef to resolve core eVaka commit for wrapper repos (null for Espoo), return VersionSnapshot; handle unavailable/auth-error status gracefully
- [x] T017 [US1] Implement PR collector service in src/services/pr-collector.ts — given two commit SHAs (previous and current) and a repository, use GitHub Compare API to get commits between them, extract PR numbers from merge commit messages (patterns: `Merge pull request #NNN` and `Title (#NNN)`), fetch full PR metadata, classify as bot/human using pr-classifier, return arrays: deployed (last 5 human in prod), inStaging (last 5 human in staging), pendingDeployment (merged to main but not deployed)
- [x] T018 [US1] Implement change detector service in src/services/change-detector.ts — read data/previous.json, compare each environment's stored SHA with freshly fetched SHA, emit DeploymentEvent array for any changes, return both events and the updated previous state
- [x] T019 [P] [US1] Implement site deployer service in src/services/site-deployer.ts — copy site/ directory and data/ directory into dist/ for GitHub Pages deployment; create dist/ if not exists
- [x] T020 [US1] Implement main pipeline orchestrator in src/index.ts — load config from instances.ts, load env vars (dotenv), run version-resolver for all instances, run pr-collector for each city group's repos, run change-detector against previous.json, write data/current.json (per contracts/data-files.md schema) and data/previous.json, run site-deployer; support DRY_RUN mode that prints output instead of writing files

#### Frontend (Dashboard)

- [x] T021 [P] [US1] Create status badge component in site/js/components/status-badge.js — render environment status indicator: green dot + "ok", red dot + "unavailable", yellow dot + "auth error"; accept VersionSnapshot, display shortSha with link to GitHub commit, checkedAt timestamp
- [x] T022 [P] [US1] Create PR list component in site/js/components/pr-list.js — render array of PullRequest objects: PR number as link to GitHub, title, author, mergedAt date, repoType label (core/wrapper); filter out isBot PRs by default; handle empty state ("No recent PRs")
- [x] T023 [US1] Create overview component in site/js/components/overview.js — render all 4 city groups as cards: city name, production and staging environment status (via status-badge), version mismatch warning if applicable, last 5 PRs per track (via pr-list); link each card to `#/city/{id}`
- [x] T024 [US1] Implement app initialization and data loading in site/js/app.js — fetch data/current.json on load, initialize router, register route handlers (overview for `#/`), render initial view based on current hash, handle fetch errors with stale-data message

### Tests for User Story 1

- [x] T025 [P] [US1] Write unit tests for version resolver in tests/unit/version-resolver.test.ts — test: successful version fetch, submodule resolution for wrapper repos, unavailable instance handling, auth-error handling
- [x] T026 [P] [US1] Write unit tests for PR collector in tests/unit/pr-collector.test.ts — test: PR extraction from compare response, merge commit message parsing (both patterns), bot filtering, limit to 5 PRs per track, empty compare result
- [x] T027 [P] [US1] Write unit tests for change detector in tests/unit/change-detector.test.ts — test: detect version change, no change emits no events, first run with no previous.json, multiple environments changing simultaneously
- [x] T028 [P] [US1] Write unit tests for PR classifier in tests/unit/pr-classifier.test.ts — test: detect Dependabot by author, detect Renovate by author, detect by commit message patterns, human PR correctly classified
- [x] T029 [P] [US1] Write integration tests for GitHub API client (nock) in tests/integration/github-api.test.ts — test: getCommit, getSubmoduleRef, compareShas, getPullRequest, ETag caching (304 response), rate limit handling
- [x] T030 [P] [US1] Write integration tests for status API client (nock) in tests/integration/status-api.test.ts — test: successful version fetch, basic auth header sent for Oulu staging, timeout/error → unavailable status, non-JSON response handling

**Checkpoint**: Dashboard loads and displays current deployment status for all cities with recent PRs. MVP is functional and independently testable.

---

## Phase 4: User Story 2 — Filter by City (Priority: P1)

**Goal**: Developer can focus on a single city group via tabs, reducing noise from other cities

**Independent Test**: Click each city tab, verify only that city's data is shown; verify overview shows all cities; verify URL updates to `#/city/{id}`

### Implementation for User Story 2

- [x] T031 [P] [US2] Create city tabs navigation component in site/js/components/city-tabs.js — render tab for each city group (Espoo, Tampere region, Oulu, Turku) plus "Overview" tab; highlight active tab based on current route; navigate to `#/city/{id}` on click; navigate to `#/` for overview
- [x] T032 [US2] Create city detail view component in site/js/components/city-detail.js — render single city group: environment versions (via status-badge), wrapper PR track and core PR track shown separately (via pr-list), instance list for Tampere region (show all municipalities), version mismatch details if detected
- [x] T033 [US2] Integrate city tabs and detail view with router in site/js/app.js — add route handler for `#/city/{id}`, render city-tabs in nav area on all views, render city-detail when city route is active, preserve tab state during navigation

**Checkpoint**: City filtering works. Tabs navigate between overview and individual city views with correct URLs.

---

## Phase 5: User Story 3 — Track PR Deployment Progress (Priority: P1)

**Goal**: Developer can see where a specific PR is in the deployment pipeline — merged, in staging, or in production

**Independent Test**: Locate a known merged PR and verify its status badge correctly reflects its deployment stage across environments

### Implementation for User Story 3

- [x] T034 [US3] Enhance PR list component with deployment status badges in site/js/components/pr-list.js — add visual status indicators: "merged" (gray), "in staging" (blue), "in production" (green) per DeploymentStatus; show status inline with each PR entry
- [x] T035 [US3] Add pending deployment section to city detail view in site/js/components/city-detail.js — display PRs from pendingDeployment arrays (merged to main but not deployed), separate section above deployed PRs, label as "Awaiting deployment"
- [x] T036 [US3] Ensure PR collector handles pending deployment correctly in src/services/pr-collector.ts — use Compare API: `compare/{deployed_sha}...{main_branch}` per research R1 to find PRs merged to main that are ahead of the deployed version; populate pendingDeployment arrays in current.json prTracks

**Checkpoint**: PR deployment progress is visible. Each PR shows its deployment stage, and pending PRs are clearly separated.

---

## Phase 6: User Story 4 — Receive Slack Notifications on Deployment (Priority: P2)

**Goal**: Team receives Slack notification when a version change is detected in any environment, without actively checking the dashboard

**Independent Test**: Trigger a version change (or simulate with different previous.json); verify Slack message is sent with correct city, environment, version, and PR summary

### Implementation for User Story 4

- [x] T037 [P] [US4] Implement Slack webhook client in src/api/slack.ts — POST Block Kit message per contracts/slack-notification.md: header (city + environment), section (version link + detection time), section (PR summary list), context (dashboard link); retry with exponential backoff on 429/5xx (max 3 retries); skip on DRY_RUN; log warning on 404/410
- [x] T038 [US4] Integrate Slack notifications into pipeline in src/index.ts — after change detector identifies deployment events, format and send one Slack message per event; skip if SLACK_WEBHOOK_URL is not configured; log sent/skipped notifications
- [x] T039 [P] [US4] Write integration tests for Slack API client (nock) in tests/integration/slack-api.test.ts — test: successful message send, retry on 429, skip on missing webhook URL, Block Kit payload structure matches contract

**Checkpoint**: Slack notifications fire on deployment changes. No notification when no changes detected.

---

## Phase 7: User Story 5 — View Deployment History (Priority: P2)

**Goal**: Developer can review past deployments per city/environment — when changes were deployed and what was included

**Independent Test**: View history for a city, verify chronological deployment events with timestamps and included PR lists

### Implementation for User Story 5

- [x] T040 [US5] Implement history manager service in src/services/history-manager.ts — readHistory(filePath): load data/history.json (or empty if first run), appendEvents(events): add new DeploymentEvent array, pruneOldEvents(): remove entries older than 1 month, writeHistory(filePath): save back to data/history.json; per contracts/data-files.md history.json schema
- [x] T041 [US5] Integrate history manager into main pipeline in src/index.ts — after change detector emits events, append to history, prune old entries, write history.json
- [x] T042 [US5] Create history view component in site/js/components/history-view.js — render deployment events filtered by cityGroupId: chronological list (newest first), each event shows: detectedAt timestamp, environment type, previous → new version (shortSha links), repoType label, included PRs list (expandable); handle empty history state
- [x] T043 [US5] Integrate history view with router in site/js/app.js — add route handler for `#/city/{id}/history`, fetch data/history.json, render history-view filtered to selected city; add "History" link/tab in city detail view
- [x] T044 [P] [US5] Write unit tests for history manager in tests/unit/history-manager.test.ts — test: append events to empty history, append to existing history, prune events older than 1 month, preserve events within 1 month, write correct JSON structure

**Checkpoint**: Deployment history is browsable per city. Past deployments show timestamps and included changes.

---

## Phase 8: User Story 6 — Toggle Dependency Update PRs (Priority: P3)

**Goal**: Developer can optionally show automated dependency update PRs (Dependabot/Renovate) that are hidden by default

**Independent Test**: Toggle filter on, verify bot PRs appear; toggle off, verify they disappear; verify visual distinction between human and bot PRs

### Implementation for User Story 6

- [x] T045 [US6] Add bot PR filter toggle to PR list component in site/js/components/pr-list.js — add toggle button "Show dependency updates", when enabled show all PRs including isBot=true, visually distinguish bot PRs (muted style, bot icon/label); default state: hidden
- [x] T046 [US6] Integrate showBots query parameter with router in site/js/router.js and site/js/app.js — read `showBots=true` from URL hash query params, pass to PR list components, update URL when toggle is clicked so filter state is bookmarkable per url-routing.md contract

**Checkpoint**: Bot PR toggle works. Default view hides bots; toggling shows them with visual distinction. Filter state persists in URL.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: CI/CD pipeline, edge case handling, and final validation

- [x] T047 Create GitHub Actions workflow in .github/workflows/monitor.yml — schedule: `cron: '*/5 * * * *'`, workflow_dispatch for manual trigger; jobs: checkout, setup Node 20, install deps, run `npx ts-node src/index.ts`, commit data/ changes (if any), deploy to GitHub Pages via actions/upload-pages-artifact@v3 + actions/deploy-pages@v4; permissions: contents write, pages write, id-token write; secrets: GH_TOKEN, SLACK_WEBHOOK_URL, OULU_STAGING_USER, OULU_STAGING_PASS
- [x] T048 [P] Add edge case handling across codebase — unreachable instance → "unavailable" status badge + continue monitoring others; auth failure → "auth-error" for that instance; submodule resolution failure → show wrapper version + flag core as unknown; version mismatch within Tampere region → highlight discrepancy in city detail; empty PR list → appropriate empty state message; GitHub rate limit → use cached data + stale indicator with next refresh time
- [x] T049 [P] Create test fixtures in tests/fixtures/ — sample API responses: GitHub compare response, GitHub PR response, GitHub submodule contents response, instance /api/citizen/auth/status response, Slack webhook response; sample data files: current.json, history.json, previous.json with realistic data for all 4 city groups
- [x] T050 Run full validation per quickstart.md — verify: `npm install` succeeds, `DRY_RUN=true npx ts-node src/index.ts` runs without errors, `npx serve site` serves dashboard, `npm test` passes all tests, `npm run lint` passes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundational — delivers MVP
- **US2 (Phase 4)**: Depends on US1 (needs working overview and data loading)
- **US3 (Phase 5)**: Depends on US1 (needs PR list component and data pipeline)
- **US4 (Phase 6)**: Depends on Foundational + change detector from US1 (T018)
- **US5 (Phase 7)**: Depends on US1 (needs pipeline and frontend foundation)
- **US6 (Phase 8)**: Depends on US1 (needs PR list component with isBot data)
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: After Foundational — No dependencies on other stories
- **US2 (P1)**: After US1 — Uses overview component and data loading from US1
- **US3 (P1)**: After US1 — Enhances PR list and data pipeline from US1
- **US4 (P2)**: After US1 — Uses change detector; backend-only, can parallel with US2/US3/US5
- **US5 (P2)**: After US1 — Adds history pipeline and view; can parallel with US4
- **US6 (P3)**: After US1 — Adds toggle to existing PR list component

### Within Each User Story

- Backend services before frontend components (data must exist to display)
- Services depend on types (T007) and API clients (T011, T012)
- Frontend components depend on HTML shell (T013) and router (T015)
- Tests can run in parallel with each other after implementation

### Parallel Opportunities

- Phase 1: T003, T004, T005, T006 all in parallel after T001/T002
- Phase 2: T008, T009, T010, T012, T014 all in parallel after T007; T011 needs T009 (retry)
- Phase 3: T019 parallel with T016-T018 chain; T021, T022 parallel; all tests (T025-T030) parallel
- Phase 4: T031 parallel with other work
- Phase 6: T037 parallel with T039; both independent of frontend work
- Phase 7: T044 parallel with T042/T043
- Phase 9: T048, T049 parallel

---

## Parallel Example: User Story 1

```bash
# Backend services (sequential chain):
Task T016: "Implement version resolver in src/services/version-resolver.ts"
Task T017: "Implement PR collector in src/services/pr-collector.ts"
  ↓ (depends on T016 for version data)
Task T018: "Implement change detector in src/services/change-detector.ts" (parallel with T017)
Task T019: "Implement site deployer in src/services/site-deployer.ts" (parallel with T016-T018)
  ↓
Task T020: "Implement main pipeline in src/index.ts" (depends on T016-T019)

# Frontend components (partially parallel):
Task T021: "Status badge component in site/js/components/status-badge.js" (parallel)
Task T022: "PR list component in site/js/components/pr-list.js" (parallel)
  ↓
Task T023: "Overview component in site/js/components/overview.js" (depends on T021, T022)
Task T024: "App init in site/js/app.js" (depends on T023)

# All tests in parallel after implementation:
Task T025-T030: All parallel (different test files, no dependencies)
```

---

## Parallel Example: User Stories 4 + 5 (after US1)

```bash
# US4 and US5 can run in parallel since they touch different files:

# US4 (Slack):
Task T037: "Slack client in src/api/slack.ts"
Task T038: "Integrate Slack into pipeline in src/index.ts"
Task T039: "Slack integration tests" (parallel with T037)

# US5 (History) — simultaneously:
Task T040: "History manager in src/services/history-manager.ts"
Task T041: "Integrate history into pipeline in src/index.ts"  ← Note: T038 and T041 both modify src/index.ts; coordinate if truly parallel
Task T042: "History view component in site/js/components/history-view.js"
Task T043: "History route in site/js/app.js"
Task T044: "History manager tests" (parallel with T040)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T006)
2. Complete Phase 2: Foundational (T007-T015) — CRITICAL, blocks all stories
3. Complete Phase 3: User Story 1 (T016-T030)
4. **STOP and VALIDATE**: Run `DRY_RUN=true npx ts-node src/index.ts` to verify data pipeline; open site/index.html to verify dashboard renders; run `npm test` for all tests
5. Deploy/demo if ready — the tracker already shows deployment status for all cities

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 → Test independently → Deploy (MVP! Core dashboard works)
3. Add US2 → Test independently → Deploy (City filtering adds focus)
4. Add US3 → Test independently → Deploy (PR status tracking completes P1 stories)
5. Add US4 → Test independently → Deploy (Slack notifications for passive monitoring)
6. Add US5 → Test independently → Deploy (History for auditing)
7. Add US6 → Test independently → Deploy (Bot toggle for completeness)
8. Polish → Final validation → Production-ready

### Suggested MVP Scope

**User Story 1 alone** delivers the core value: a dashboard showing what's deployed where, with recent PRs. This is immediately useful without filtering, notifications, history, or bot toggles.

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- The frontend reads static JSON — no live API calls at view time
- The data fetcher (backend) and dashboard (frontend) communicate only through data/*.json files
