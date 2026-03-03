# Implementation Plan: Production PR List

**Branch**: `003-production-pr-list` | **Date**: 2026-03-03 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/003-production-pr-list/spec.md`

## Summary

Display the 5 latest PRs deployed to production on city detail and overview pages. The backend already collects this data in `PRTrack.deployed` — the work is relabeling the frontend sections from "Deployed" to "In Production" and building an E2E test infrastructure with Playwright that runs the full backend data pipeline against mocked GitHub API responses.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 20+ (backend); vanilla JavaScript ES modules (frontend)
**Primary Dependencies**: axios (HTTP), nock (test HTTP mocking), Playwright (E2E browser tests — new)
**Storage**: JSON files (`data/current.json`, `data/history.json`)
**Testing**: Jest + nock (unit/integration, existing); Playwright (E2E, new)
**Target Platform**: Web dashboard (static HTML/JS served from files)
**Project Type**: Web application (data fetcher + static frontend)
**Performance Goals**: Page load under 2 seconds (per constitution)
**Constraints**: Minimal dependencies, no heavy frameworks
**Scale/Scope**: 4 city groups, ~10 PR items per page

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| I. Code Quality — strict TS, single responsibility | PASS | No backend code changes. Frontend JS follows existing patterns. |
| I. Code Quality — DRY | PASS | Reuses existing `renderPRList` component. No new duplication. |
| I. Code Quality — minimal dependencies | PASS | Playwright is justified (user-requested, serves E2E testing need not covered by existing tools). |
| II. Pragmatic Testing — service unit tests | PASS | No new service modules. |
| II. Pragmatic Testing — API integration tests | PASS | No API changes. |
| II. Pragmatic Testing — CI test suite | PASS | E2E tests will be added to CI. |
| III. UX Consistency — loading/populated/empty states | PASS | Production PR section handles empty state (hidden or "No recent PRs"). |
| III. UX Consistency — consistent visual patterns | PASS | "In Production" section uses same `renderPRList` as staging/pending. |
| III. UX Consistency — deep-bookmarkable URLs | PASS | No URL changes. |
| CI/CD Gates — lint, type, test, build | PASS | No new TS code. Playwright tests get own script. |

**Post-Phase 1 re-check**: PASS — No constitution violations in final design.

## Project Structure

### Documentation (this feature)

```text
specs/003-production-pr-list/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
site/
├── js/
│   ├── components/
│   │   ├── city-detail.js    # MODIFY: Relabel "Deployed" → "In Production"
│   │   └── overview.js       # MODIFY: Relabel PR section headers
│   └── app.js                # No changes
└── css/
    └── style.css             # ADD: .production-section styling

tests/
├── e2e/
│   ├── fixtures/
│   │   └── mock-api-responses.ts   # NEW: Realistic GitHub API mock responses
│   ├── helpers/
│   │   ├── generate-test-data.ts   # NEW: Runs backend with mocked APIs
│   │   └── server.ts               # NEW: HTTP server for site + data
│   ├── production-prs.spec.ts      # NEW: E2E test for production PR display
│   └── overview.spec.ts            # NEW: E2E test for overview page
├── unit/                            # Existing, unchanged
├── integration/                     # Existing, unchanged
└── fixtures/                        # Existing, unchanged

playwright.config.ts                 # NEW: Playwright configuration
```

**Structure Decision**: Follows the existing project structure. Frontend changes are in `site/js/components/`. E2E tests follow the mirrored `tests/` directory structure per constitution, with a new `tests/e2e/` subdirectory for Playwright tests.

## Detailed Design

### Part 1: Frontend Relabeling

**city-detail.js changes** (lines 59-87):
- Rename `"Core — Deployed"` → `"Core — In Production"`
- Rename `"Wrapper — Deployed"` → `"Wrapper — In Production"`
- Wrap the production sections in a `<div class="production-section">` for visual distinction (similar to how pending PRs have `.pending-section`)
- Move production section rendering AFTER the staging sections (already the case)

**overview.js changes** (lines 37-53):
- Rename `"Core PRs"` → `"Core — In Production"` for consistency with city detail page
- Rename `"Wrapper PRs"` → `"Wrapper — In Production"`

**style.css additions**:
- Add `.production-section` styling: subtle green background (`#f0fdf4`) and green border to visually distinguish from staging, mirroring the yellow `.pending-section` pattern

### Part 2: E2E Test Infrastructure

**Step 1 — Mock API responses** (`tests/e2e/fixtures/mock-api-responses.ts`):
Create nock interceptors for all GitHub API calls made by the backend, returning realistic data based on real API responses collected from `espoon-voltti/evaka`. The mock data must include:
- Status API responses for each city instance (returning commit SHAs)
- GitHub commit detail responses
- GitHub compare responses (with merge commit messages containing PR numbers)
- GitHub PR detail responses (with titles, authors, merge dates)
- A `previous.json` fixture with "old" production SHAs (so the tracker detects a SHA change and populates the `deployed` array)

**Step 2 — Test data generation** (`tests/e2e/helpers/generate-test-data.ts`):
A script that:
1. Sets up nock interceptors for all external HTTP calls
2. Provides a `previous.json` with stale production SHAs (so the backend sees a "deployment")
3. Runs the backend `run()` logic (or imports and calls it)
4. Captures the generated `current.json` and `history.json` output
5. Writes them to a test-specific data directory

**Step 3 — Static server** (`tests/e2e/helpers/server.ts`):
A minimal HTTP server (Node.js `http` module, no extra dependency) that:
1. Serves `site/` directory for HTML/JS/CSS
2. Serves the generated test data from `data/`
3. Starts on a random available port
4. Returns the URL for Playwright to use

**Step 4 — Playwright tests**:
- `production-prs.spec.ts`: Navigate to each city detail page, assert "In Production" section is visible with correct PR data
- `overview.spec.ts`: Navigate to overview, assert city cards show production PRs
- Both test bot toggle behavior
- Both test empty state handling

**Playwright configuration** (`playwright.config.ts`):
- Single project (Chromium only for speed in CI)
- `webServer` block to start the HTTP server via global setup
- Test directory: `tests/e2e/`
- No `baseURL` — tests get URL from global setup

### Part 3: npm Scripts

Add to `package.json`:
- `"test:e2e:generate"` — runs the mock data generation step
- `"test:e2e"` — runs Playwright tests (which trigger data generation in global setup)

## Complexity Tracking

No constitution violations. No complexity tracking needed.
