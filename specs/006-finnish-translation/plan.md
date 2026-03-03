# Implementation Plan: Finnish Translation

**Branch**: `006-finnish-translation` | **Date**: 2026-03-03 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/006-finnish-translation/spec.md`

## Summary

Translate all user-facing text in the eVaka Deployment Tracker from English to Finnish. This is a direct in-place string replacement across the dashboard UI (~43 strings in 8 files), Slack notification messages (~6 strings + dynamic repoType mapping in 1 file), and README.md. Additionally, create a parameterized npm screenshot script using Playwright, and include a screenshot of the Tampere region view in the README. The term "Kuntaimplementaatio" replaces "wrapper" and "ydin" replaces "core" throughout. Date locales change from `en-GB` to `fi`. No i18n framework — strings are changed directly in source files.

## Technical Context

**Language/Version**: Vanilla JavaScript ES modules (frontend); TypeScript 5.x on Node.js 20+ (backend/scripts)
**Primary Dependencies**: Playwright (existing dev dependency, for screenshot script)
**Storage**: JSON data files (read-only from frontend) — no changes needed
**Testing**: Jest (unit/integration), Playwright (E2E) — existing test assertions need updating for Finnish strings
**Target Platform**: Static site on GitHub Pages + Node.js GitHub Actions runner
**Project Type**: Web dashboard + data pipeline
**Performance Goals**: N/A (no performance impact from string changes)
**Constraints**: In-place translation only, no i18n framework, no multilingual support
**Scale/Scope**: ~43 UI strings, ~6 Slack strings, 1 README file, 1 new npm script

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality — strict mode, single responsibility | PASS | No new modules; editing existing strings in-place |
| I. Code Quality — DRY | PASS | Repeated environment labels ("Tuotanto"/"Testaus") appear in multiple components but are display strings tightly coupled to their rendering context, not extractable logic. No DRY violation per the "trivial duplication" exception. |
| I. Code Quality — minimal dependencies | PASS | No new dependencies; Playwright already installed |
| II. Pragmatic Testing | PASS | Existing E2E and integration tests will be updated to assert Finnish strings |
| III. UX Consistency — loading/error/empty states | PASS | All three states translated in each component |
| III. UX Consistency — deep linking | PASS | No URL changes, hash routes unchanged |
| III. UX Consistency — semantic HTML, keyboard accessibility | PASS | No structural HTML changes |
| CI/CD Quality Gates | PASS | Lint, type-check, tests will all pass after updates |

No violations. Complexity Tracking section not needed.

## Project Structure

### Documentation (this feature)

```text
specs/006-finnish-translation/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (translation mapping)
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (files modified by this feature)

```text
site/                                 # Frontend — translate all user-facing strings
├── index.html                        # Page title, heading, loading text, footer (lang="en" → "fi")
└── js/
    ├── app.js                        # "Last updated:", error messages, loading states, date locale
    └── components/
        ├── overview.js               # Environment labels, section headers, empty state
        ├── city-tabs.js              # "Overview" tab label
        ├── city-detail.js            # Section headings, environment labels, bot toggle, history link
        ├── status-badge.js           # Status text mapping, date locale
        ├── pr-list.js                # Empty states, status labels, bot label, date locale
        └── history-view.js           # Navigation, page title, environment labels, PR count, date locale

src/api/slack.ts                      # Slack notification — translate message content + repoType display

scripts/
└── screenshot.ts                     # NEW: Playwright screenshot script (npm run screenshot)

README.md                             # Full prose translation to Finnish + embedded screenshot

tests/
├── e2e/production-prs.spec.ts        # Update string assertions to Finnish
└── integration/slack-api.test.ts     # Update Slack message assertions if any
```

**Structure Decision**: No new directories or modules. All changes are in-place edits to existing files, plus one new script file (`scripts/screenshot.ts`) and one new screenshot image (`site/images/screenshot.png` or similar).

## Implementation Approach

### Phase 1: Dashboard UI Translation

Translate all hardcoded English strings directly in each frontend JS component and index.html. Change all `toLocaleString('en-GB', ...)` / `toLocaleDateString('en-GB', ...)` calls to use `'fi'` locale. Set `lang="fi"` on the HTML element.

**Key translation mapping** (see data-model.md for complete list):

| English | Finnish |
|---------|---------|
| Production | Tuotanto |
| Staging | Testaus |
| Staging / Test | Testaus / Testi |
| Overview | Yleiskatsaus |
| Deployment History | Käyttöönottohistoria |
| wrapper / Wrapper | Kuntaimplementaatio |
| core / Core | Ydin |
| Loading... | Ladataan... |
| No data | Ei tietoja |

### Phase 2: Slack Message Translation

Translate static strings in `src/api/slack.ts`. For dynamic `repoType` display, add a mapping function that converts `"core"` → `"ydin"` and `"wrapper"` → `"Kuntaimplementaatio"` for display in Slack messages. Internal `repoType` values remain unchanged in data structures — only the display text changes.

### Phase 3: README Translation

Rewrite all prose content in README.md to Finnish. Preserve code blocks, commands, file paths, URLs, environment variable names, and repository names verbatim. Use "Kuntaimplementaatio" for wrapper repository references. Include a screenshot image of the Tampere region view.

### Phase 4: Screenshot Script

Create `scripts/screenshot.ts` using Playwright to capture a screenshot of the dashboard. Expose as `npm run screenshot` with parameters for the route path and viewport resolution. Default: `#/city/tampere-region` at 750x1300. The script will:
1. Start the test server (or connect to a running instance)
2. Navigate to the specified hash route
3. Wait for data to load
4. Capture a full-page screenshot
5. Save to a configurable output path

### Phase 5: Test Updates

Update E2E test assertions in `tests/e2e/production-prs.spec.ts` to match the new Finnish strings. Update any Slack integration test assertions if they reference message content.
