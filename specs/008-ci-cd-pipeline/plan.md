# Implementation Plan: CI/CD Pipeline

**Branch**: `008-ci-cd-pipeline` | **Date**: 2026-03-03 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/008-ci-cd-pipeline/spec.md`

## Summary

Add a GitHub Actions CI workflow that automatically runs lint, type checking, unit tests, and E2E tests on every push and pull request. This implements the CI/CD quality gates defined in the project constitution and gives developers fast, automated feedback on code changes.

## Technical Context

**Language/Version**: GitHub Actions YAML; TypeScript 5.x on Node.js 20 (existing)
**Primary Dependencies**: GitHub Actions (`actions/checkout@v4`, `actions/setup-node@v4`); Playwright (existing dev dependency)
**Storage**: N/A
**Testing**: Jest (unit/integration), Playwright (E2E), ESLint (lint), `tsc --noEmit` (type check)
**Target Platform**: GitHub-hosted Ubuntu runners
**Project Type**: CI/CD configuration (workflow definition)
**Performance Goals**: Full CI pipeline completes within 5 minutes
**Constraints**: No secrets required for test runs; tests use nock mocking and local fixtures
**Scale/Scope**: Single workflow file, one npm script addition

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| I. Code Quality — strict TS, single responsibility, explicit errors, lint/format enforced, minimal deps, DRY | PASS | No new production code. Workflow YAML is declarative. Adding `typecheck` script is one line in package.json. |
| II. Pragmatic Testing — CI MUST run full test suite on every push, failing test MUST block merging | PASS | This feature *implements* that requirement. Workflow runs all test suites. |
| III. UX Consistency | N/A | No UI changes. |
| CI/CD Quality Gates — lint, type, test, build gates; fail-fast ordering | PASS | Workflow implements all four gates in constitution-mandated order: lint → typecheck → test → e2e. |
| Development Workflow — main always deployable, feature branches via PR | PASS | CI validates every push and PR. |

**Pre-design assessment**: No violations. All constitution principles are satisfied or not applicable.

**Post-design re-check**: No changes — the design adds a single workflow file and one npm script. No new dependencies, no new abstractions, no complexity violations.

## Project Structure

### Documentation (this feature)

```text
specs/008-ci-cd-pipeline/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
.github/
└── workflows/
    ├── monitor.yml      # Existing — scheduled data fetcher + pages deploy (unchanged)
    └── ci.yml           # NEW — CI pipeline for push/PR validation

package.json             # MODIFIED — add "typecheck" script
```

**Structure Decision**: This feature only touches CI infrastructure. No changes to `src/`, `tests/`, `site/`, or `data/`. The new `ci.yml` file lives alongside the existing `monitor.yml` in `.github/workflows/`.

## Implementation Details

### Workflow File: `.github/workflows/ci.yml`

**Triggers**:
- `push` to any branch
- `pull_request` with types `opened`, `synchronize`, `reopened`

**Concurrency**: Group by `ci-${{ github.ref }}` with `cancel-in-progress: true` to cancel stale runs on the same branch.

**Single job** with sequential steps in fail-fast order (per constitution):

1. **Checkout** — `actions/checkout@v4`
2. **Setup Node.js 20** — `actions/setup-node@v4` with npm cache
3. **Install dependencies** — `npm ci`
4. **Lint** — `npm run lint` (ESLint on `src/` and `tests/`)
5. **Type check** — `npm run typecheck` (`tsc --noEmit`)
6. **Unit & integration tests** — `npm test` (Jest)
7. **Install Playwright browsers** — `npx playwright install --with-deps chromium`
8. **E2E tests** — `npm run test:e2e` (Playwright with Chromium)

### package.json Change

Add `"typecheck": "tsc --noEmit"` to the `scripts` section.

## Complexity Tracking

> No violations to justify. The implementation consists of one new YAML file and one npm script addition.
