# Research: Production PR List

## R1: Current State of "Deployed" PRs in Data and Frontend

**Decision**: The backend and frontend already support displaying deployed (production) PRs. The `PRTrack.deployed` array exists and the frontend renders it. The arrays are currently empty because the tracker hasn't observed a production SHA change yet (requires two consecutive runs with a deployment between them).

**Findings**:
- `src/index.ts` line 41: `if (prodSha && previousProdSha && prodSha !== previousProdSha)` — deployed PRs only populate when production SHA changes between runs
- `city-detail.js` renders "Core — Deployed" and "Wrapper — Deployed" sections (lines 59-87) but they're hidden when empty
- `overview.js` renders deployed PRs as "Core PRs" and "Wrapper PRs" (lines 37-53) — also hidden when empty
- All `deployed` arrays in `data/current.json` are currently `[]`

**Required Changes**:
1. Relabel "Deployed" → "In Production" in frontend for clarity
2. Ensure production PR sections remain visible/meaningful when populated
3. No backend changes needed — data pipeline is already correct

**Alternatives considered**:
- Populating deployed PRs on initial run (comparing current prod vs some baseline): Rejected — would require arbitrary baseline selection and could show misleading data
- Adding a separate `productionPRs` field: Rejected — the existing `deployed` field already serves this purpose

## R2: E2E Test Infrastructure with Playwright

**Decision**: Use Playwright for browser-based E2E tests. The test flow is: run backend with mocked HTTP responses → generate test data files → serve static site → run Playwright browser tests.

**Rationale**:
- User explicitly requested Playwright for browser interaction
- User wants E2E tests that run backend data fetching with mocked API responses
- Existing test infrastructure uses Jest + nock (HTTP mocking) — can reuse for backend mocking
- Frontend is static HTML/JS served from files — can be served via simple HTTP server

**Architecture**:
1. **Mock data generation**: Create a test runner that executes `src/index.ts` with nock interceptors providing realistic GitHub API responses → produces `data/current.json` and `data/history.json` with populated PR arrays
2. **Static site serving**: Serve `site/` + generated `data/` via a lightweight HTTP server during tests
3. **Browser tests**: Playwright tests navigate the served site and assert UI content

**Alternatives considered**:
- MSW (Mock Service Worker) for browser-level mocking: Rejected — the mocking needs to happen at the backend level (Node.js HTTP calls), not browser fetch
- Pre-generating static test fixture files: Could work as a simpler approach, but user specifically wants "first run the data fetching with mocked responses"
- Cypress: Rejected — user explicitly requested Playwright

## R3: Realistic Mock Data from GitHub API

**Decision**: Use real GitHub API response structures from `espoon-voltti/evaka` repository to build mock fixtures.

**Sample data collected** (from live API, 2026-03-03):

Recent merged PRs:
- #8630 "Tekninen: Poista käyttämätön @types/webpack-riippuvuus" by terolaakso-reaktor (2026-03-03)
- #8629 "Tekninen: minimatch-kirjaston haavoittuvuuspäivitys" by terolaakso-reaktor (2026-03-02)
- #8594 "Aikaleimasarakkeiden yhdenmukaistaminen - osa 1" by Joosakur (2026-03-02)
- #8626 "Bump minimatch in /dummy-idp" by dependabot[bot] (2026-03-02) — bot PR
- #8602 "Johtajalle näkyviin muut toimet -historia" by tomuli (2026-03-02)

Recent commits:
- 540c11a "Merge pull request #8630 from espoon-voltti/remove-types-webpack"
- 5ff94c8 "Merge pull request #8629 from espoon-voltti/fix-minimatch-vulnerability"
- 36942ad "Merge pull request #8594 from espoon-voltti/fix-db-conventions-part-1"

**Usage**: These real values will be used to construct nock interceptors that return realistic GitHub API responses, ensuring the E2E test data looks authentic.

## R4: Playwright Integration with Existing Project

**Decision**: Add Playwright as a devDependency. Configure separately from Jest (Playwright has its own test runner). Place E2E tests in `tests/e2e/`.

**Rationale**:
- Playwright includes its own test runner (`@playwright/test`) — no need for Jest integration
- Separate `playwright.config.ts` at project root
- E2E tests are independent from unit/integration tests
- Add `test:e2e` script to package.json alongside existing `test` (Jest)

**Key considerations**:
- Constitution says "Dependencies MUST be minimal and justified" — Playwright is justified as the user's explicit choice for browser E2E testing
- Constitution says "Frontend components do NOT require automated tests unless they contain complex logic" — E2E tests serve a different purpose (integration verification), explicitly requested by user
- Constitution says "Test files MUST live alongside the code they test or in a mirrored tests/ directory structure" — `tests/e2e/` follows mirrored structure
