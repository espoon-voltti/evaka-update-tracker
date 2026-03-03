# Research: CI/CD Pipeline

**Feature**: 008-ci-cd-pipeline
**Date**: 2026-03-03

## R-001: CI/CD Quality Gates from Constitution

**Decision**: The CI workflow must implement all four quality gates defined in the project constitution (v1.1.0), in fail-fast order.

**Rationale**: The constitution (§ CI/CD Quality Gates) explicitly mandates:
1. **Lint gate**: Zero ESLint errors, zero Prettier violations
2. **Type gate**: TypeScript compilation with zero errors (`tsc --noEmit`)
3. **Test gate**: All tests pass
4. **Build gate**: Data fetcher compiles, site generator produces valid output

The constitution also states: "CI configuration MUST fail fast: lint and type checks run before tests to provide quick feedback."

**Impact on spec**: The spec covers lint (FR-002), unit tests (FR-001), and E2E tests (FR-003) but does not mention the type check gate or build gate. The plan must add these to satisfy the constitution.

**Alternatives considered**: None — these are mandated, not optional.

## R-002: Workflow File Strategy

**Decision**: Create a single new workflow file `.github/workflows/ci.yml` separate from the existing `monitor.yml`.

**Rationale**: The monitor workflow serves a completely different purpose (scheduled data fetching + deployment). Mixing CI checks into it would create coupling and trigger unwanted test runs on the every-5-minute schedule. A separate file keeps concerns clean.

**Alternatives considered**:
- Merging into `monitor.yml` — rejected because it would trigger tests on every scheduled run and complicate the existing workflow.
- Multiple workflow files (one per gate) — rejected as over-engineering for this project size.

## R-003: Missing `typecheck` Script

**Decision**: Add a `typecheck` npm script (`tsc --noEmit`) to `package.json`.

**Rationale**: The constitution requires a type gate (`tsc --noEmit`). No such script currently exists in package.json. Adding it provides a consistent interface for both CI and local development.

**Alternatives considered**:
- Running `npx tsc --noEmit` directly in the workflow without a script — rejected because having a named script is more discoverable and consistent with how other checks are invoked.

## R-004: Playwright Browser Installation in CI

**Decision**: Use `npx playwright install --with-deps chromium` as a CI step before E2E tests.

**Rationale**: The Playwright config (`playwright.config.ts`) only uses Chromium. The `--with-deps` flag installs OS-level dependencies needed on Ubuntu runners. Installing only chromium (not all browsers) saves CI time.

**Alternatives considered**:
- Caching Playwright browsers between runs — adds complexity; chromium install is fast enough (~30s) for this project's scale.
- Using a Playwright Docker container — over-engineering for a single-browser config.

## R-005: Concurrency and Skip-CI Behavior

**Decision**: Use GitHub Actions' built-in `concurrency` group keyed on branch/PR ref, with `cancel-in-progress: true`. Rely on GitHub's native `[skip ci]` support.

**Rationale**: GitHub Actions natively skips workflows when `[skip ci]` appears in the commit message. The `concurrency` setting with branch-based grouping automatically cancels stale runs when new commits arrive.

**Alternatives considered**: None — these are standard GitHub Actions patterns.

## R-006: Job Structure

**Decision**: Use a single job with sequential steps ordered for fail-fast behavior: install → lint → typecheck → unit tests → E2E tests.

**Rationale**: The constitution requires fail-fast ordering (lint/type before tests). A single job avoids the overhead of multiple job setups (checkout, node install, npm ci) and keeps the workflow simple. For this project's size, parallelization provides negligible benefit — the entire suite runs in under 2 minutes.

**Alternatives considered**:
- Separate jobs for lint, typecheck, and tests — rejected because each job pays ~30s overhead for checkout + npm ci. Total wall time would increase despite parallelism.
- Matrix strategy across Node versions — rejected because the project targets only Node 20.
