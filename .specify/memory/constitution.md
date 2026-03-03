<!-- Sync Impact Report
  Version change: 1.2.0 → 1.3.0
  Modified sections:
    - Development Workflow: added screenshot maintenance requirement
      (new bullet with sub-bullets)
  Added sections: None
  Removed sections: None
  Templates requiring updates:
    - .specify/templates/plan-template.md ✅ no changes needed
    - .specify/templates/spec-template.md ✅ no changes needed
    - .specify/templates/tasks-template.md ⚠ pending — Polish phase
      should reference screenshot regeneration as a standard task
      when view changes are involved
    - CLAUDE.md ✅ no changes needed
  Follow-up TODOs: None
-->

# eVaka Update Tracker Constitution

## Core Principles

### I. Code Quality

All production code MUST be clear, maintainable, and consistent:

- TypeScript MUST use strict mode (`"strict": true` in tsconfig).
  No `any` types without an inline justification comment.
- Every module MUST have a single, clear responsibility.
  If a module's purpose cannot be described in one sentence, split it.
- Error handling MUST be explicit. Functions that can fail MUST
  document failure modes. Errors MUST NOT be silently swallowed.
- Linting (ESLint) and formatting (Prettier) MUST be configured
  and enforced. No code merges with linting errors.
- Dependencies MUST be minimal and justified. Each added package
  MUST solve a problem that cannot be reasonably solved with
  existing code or standard library features.
- **DRY (Don't Repeat Yourself)**: Logic that appears in more
  than one place MUST be extracted into a shared function or
  module. Configuration values, constants, and patterns (e.g.,
  instance URLs, bot-detection rules, API endpoints) MUST be
  defined once and referenced everywhere.
- **DRY exceptions**: Trivial duplication (2-3 similar lines) is
  acceptable when extracting would obscure intent or create a
  premature abstraction. When in doubt, prefer a small amount of
  duplication over a wrong abstraction. The test for extraction
  is: "Would changing this logic require updating multiple files?"
  If yes, extract.

### II. Pragmatic Testing

100% test coverage is NOT a goal. Meaningful coverage of each
system component IS required and MUST be enforced in CI:

- Every service module (`src/services/*`) MUST have unit tests
  covering its core behavior and edge cases.
- Every external API integration (`src/api/*`) MUST have
  integration tests using HTTP mocking (nock or equivalent).
- Utility functions with non-trivial logic MUST have unit tests.
- Tests MUST focus on behavior, not implementation details.
  Test what a function does, not how it does it.
- CI MUST run the full test suite on every push. A failing test
  MUST block merging.
- Test files MUST live alongside the code they test or in a
  mirrored `tests/` directory structure. Test naming MUST clearly
  indicate what is being tested.

**E2E tests are first-class citizens:**

- E2E tests (`tests/e2e/`) are the primary safety net validating
  that the application has not been broken by code changes. They
  MUST be treated with the same importance as unit tests.
- When frontend components, DOM structure, CSS classes, or page
  layout are modified, the corresponding E2E tests MUST be updated
  in the same change to stay in sync with the codebase.
- E2E tests MUST be run as part of every validation phase before
  a feature is considered complete. The validation command is
  `npm run test:e2e`.
- E2E test failures MUST block feature completion. A feature is
  NOT done until all E2E tests pass.
- New user-facing features SHOULD include new E2E test coverage
  for the added functionality.

### III. UX Consistency

The dashboard MUST provide a reliable, predictable experience:

- Every view MUST handle three states: loading, populated, and
  empty/error. No blank screens or unhandled states.
- Status indicators (deployed, in staging, unavailable) MUST use
  consistent visual patterns across all city groups and views.
- All navigable views MUST be deep-bookmarkable via URL.
  Sharing a URL MUST reproduce the same view for another user.
- Page load time MUST remain under 2 seconds for the full
  dashboard on a standard connection. Static assets MUST be
  minimal (no heavy frameworks).
- Semantic HTML MUST be used for structure. Interactive elements
  MUST be keyboard-accessible.

## CI/CD Quality Gates

These gates MUST pass before any code reaches the main branch:

1. **Lint gate**: Zero ESLint errors, zero Prettier violations.
2. **Type gate**: TypeScript compilation with zero errors
   (`tsc --noEmit`).
3. **Test gate**: All unit and integration tests pass. No skipped
   tests without a tracked issue reference.
4. **E2E gate**: All Playwright end-to-end tests pass
   (`npm run test:e2e`).
5. **Build gate**: The data fetcher compiles and the site
   generator produces valid output.

CI configuration MUST fail fast: lint and type checks run before
tests to provide quick feedback.

## Development Workflow

- Commits MUST be atomic and descriptive. One logical change per
  commit.
- The main branch MUST always be deployable. Broken builds on
  main are treated as P0 incidents.
- Feature work SHOULD happen on short-lived branches merged via
  pull request.
- Code review is RECOMMENDED but not mandatory for single-
  developer workflows. The CI gates serve as the minimum quality
  bar.
- When frontend views undergo major visual changes (layout
  redesign, new sections, restructured components), the README
  screenshot MUST be regenerated and committed in the same change.
  - The screenshot tool is `npm run screenshot` (Playwright-based,
    outputs to `site/images/screenshot.png`).
  - "Major visual changes" means changes that would make the
    existing screenshot inaccurate or misleading. Minor tweaks
    (color adjustments, small text changes) do NOT require a
    screenshot update.

## Governance

This constitution defines the quality standards for the eVaka
Update Tracker project. All contributions MUST comply with these
principles.

- Amendments MUST be documented with a version bump and rationale.
- Version follows semantic versioning: MAJOR for principle
  removals/redefinitions, MINOR for additions/expansions, PATCH
  for clarifications.
- If a principle is violated, the violation MUST be justified in
  the Complexity Tracking section of the implementation plan.

**Version**: 1.3.0 | **Ratified**: 2026-03-02 | **Last Amended**: 2026-03-04
