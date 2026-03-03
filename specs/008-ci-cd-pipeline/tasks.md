# Tasks: CI/CD Pipeline

**Input**: Design documents from `/specs/008-ci-cd-pipeline/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, quickstart.md

**Tests**: Not requested — no test tasks included.

**Organization**: All three user stories (PR checks, push checks, merge-to-main checks) are implemented by a single workflow file with multiple triggers. Tasks are organized by implementation dependency rather than per-story, since the stories share the same deliverable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Add the missing npm script required by the constitution's type check gate

- [x] T001 Add `"typecheck": "tsc --noEmit"` script to `package.json`

---

## Phase 2: User Stories 1, 2, 3 — CI Workflow (Priority: P1/P2/P3) 🎯 MVP

**Goal**: Create a GitHub Actions workflow that runs all quality gates (lint, typecheck, unit tests, E2E tests) on push to any branch and on pull request events. This single file satisfies all three user stories:
- **US1** (P1): PR triggers (`opened`, `synchronize`, `reopened`) → check results visible on PRs
- **US2** (P2): Push trigger (all branches) → feedback on every push
- **US3** (P3): Push to main (subset of push trigger) → validates merged code

**Independent Test**: Push this branch to GitHub and verify the workflow triggers. Open a PR and verify check results appear.

- [x] T002 [US1] [US2] [US3] Create CI workflow file at `.github/workflows/ci.yml` with the following configuration:
  - **Name**: `CI`
  - **Triggers**: `push` (all branches) + `pull_request` (types: `opened`, `synchronize`, `reopened`)
  - **Concurrency**: group `ci-${{ github.ref }}`, `cancel-in-progress: true`
  - **Job**: `ci` on `ubuntu-latest`
  - **Steps** (in fail-fast order per constitution):
    1. `actions/checkout@v4`
    2. `actions/setup-node@v4` with `node-version: '20'` and `cache: 'npm'`
    3. `npm ci`
    4. `npm run lint`
    5. `npm run typecheck`
    6. `npm test`
    7. `npx playwright install --with-deps chromium`
    8. `npm run test:e2e`

**Checkpoint**: CI workflow file exists and is syntactically valid. All three user stories are implemented.

---

## Phase 3: Verification

**Purpose**: Confirm the pipeline works end-to-end on GitHub

- [ ] T003 Push branch to GitHub and verify the CI workflow triggers on push and all steps pass
- [ ] T004 Open a pull request and verify check results (pass/fail) appear on the PR

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **CI Workflow (Phase 2)**: Depends on T001 (typecheck script must exist before workflow references it)
- **Verification (Phase 3)**: Depends on T002 (workflow must exist to verify)

### User Story Dependencies

All three user stories are implemented by a single task (T002) since they share the same workflow file. No cross-story dependencies exist — the workflow triggers are additive and independent.

### Parallel Opportunities

- T001 and T002 modify different files (`package.json` vs `.github/workflows/ci.yml`) and can technically be done in parallel, though T002 logically depends on T001.
- T003 and T004 are sequential (push must happen before PR can be opened on the branch).

---

## Implementation Strategy

### MVP (All Stories in One)

1. Complete T001: Add typecheck script
2. Complete T002: Create workflow file
3. **STOP and VALIDATE**: Push to GitHub (T003) and confirm workflow runs
4. Open PR (T004) to confirm status checks appear

This feature is small enough that all stories are delivered in a single increment. There is no meaningful MVP subset — the workflow file either exists with all triggers or it doesn't.

---

## Notes

- The entire feature is 2 files: one new (`ci.yml`), one modified (`package.json`)
- GitHub Actions natively handles `[skip ci]` — no additional configuration needed
- Concurrency cancellation is per-branch via `ci-${{ github.ref }}` grouping
- Playwright only installs Chromium (matching `playwright.config.ts`) to save CI time
- No secrets or environment variables are needed — tests use nock mocking and local fixtures
