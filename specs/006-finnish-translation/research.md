# Research: Finnish Translation

## R1: In-place Translation vs i18n Framework

**Decision**: In-place string replacement (no i18n framework)
**Rationale**: The project is Finnish-only going forward. Adding an i18n library (e.g., i18next) would add unnecessary complexity, a new dependency, and runtime overhead for a single-language application. Direct string replacement is the simplest, most maintainable approach.
**Alternatives considered**: i18next, custom translation module with key-value lookup — both rejected as over-engineering for a single-language target.

## R2: Finnish Date Locale

**Decision**: Change all `toLocaleString('en-GB', ...)` calls to `toLocaleString('fi', ...)`
**Rationale**: The `fi` locale is natively supported by all modern JavaScript engines (V8, SpiderMonkey, JavaScriptCore). Finnish date formatting uses day.month.year order (e.g., "3.3.2026"), which is correct for Finnish users. No polyfill or library needed.
**Alternatives considered**: `fi-FI` locale code — both `fi` and `fi-FI` work identically in `Intl`, but `fi` is shorter and standard.

## R3: Slack repoType Display Mapping

**Decision**: Add a display-name mapping function in `slack.ts` that converts internal repoType values to Finnish for message display only
**Rationale**: The internal data model uses `"core"` and `"wrapper"` as repoType identifiers throughout the codebase (config, data files, API). Changing these would require widespread refactoring with no user benefit. Instead, map at the display layer: `"core"` → `"ydin"`, `"wrapper"` → `"Kuntaimplementaatio"`.
**Alternatives considered**: Changing repoType values globally — rejected due to high blast radius across config, data files, and all consumers.

## R4: Screenshot Tooling

**Decision**: Use Playwright (already a dev dependency) to create a parameterized screenshot script
**Rationale**: Playwright is already installed (`@playwright/test: ^1.58.2`), configured with Chromium, and has existing test infrastructure (server helpers, test data generation). Writing a screenshot script leverages this existing setup with zero new dependencies.
**Alternatives considered**: Puppeteer (would add a dependency), manual screenshot (not reproducible/automatable).

## R5: Screenshot Script Architecture

**Decision**: Create `scripts/screenshot.ts` as a standalone script, expose via `npm run screenshot -- --path "#/city/tampere-region" --width 750 --height 1300`
**Rationale**: The script needs to start a local server, generate test data, navigate Playwright to the route, wait for render, and save a screenshot. This mirrors the E2E test setup flow. Using command-line arguments makes it reusable for any route/resolution.
**Alternatives considered**: Integrating into the E2E test suite as a test — rejected because screenshots are a build artifact, not a test assertion.

## R6: Screenshot Image Location

**Decision**: Save screenshot to `site/images/screenshot.png` and reference from README.md
**Rationale**: Placing the image under `site/` ensures it's deployed to GitHub Pages alongside the dashboard. The README can reference it via a relative path for the repo view and an absolute GitHub Pages URL for rendered display.
**Alternatives considered**: Storing in repo root or `docs/` — `site/images/` is more conventional for web assets and allows the image to be served from GitHub Pages.

## R7: Test String Updates

**Decision**: Update all E2E test assertions to use Finnish strings
**Rationale**: The E2E tests in `tests/e2e/production-prs.spec.ts` assert on specific English text content (e.g., `toHaveText('Recent Production Commits')`). These must be updated to match the new Finnish text. The Slack integration tests (`tests/integration/slack-api.test.ts`) primarily test block structure rather than string content, but any string assertions must also be updated.
**Alternatives considered**: None — tests must match the actual output.
