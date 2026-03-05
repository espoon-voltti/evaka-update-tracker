# Implementation Plan: Overview Fullscreen & Change Counts

**Branch**: `014-overview-fullscreen` | **Date**: 2026-03-05 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/014-overview-fullscreen/spec.md`

## Summary

Enhance the overview (yleiskatsaus) page with two improvements: (1) display counts of non-bot PRs in staging/test and pending deployment on each city card, and (2) add a fullscreen mode that hides the title/navigation and scales cards to fill the viewport for wall-mounted displays. Both features use existing data from `current.json` and require no backend changes — only frontend JS, CSS, and E2E test updates.

## Technical Context

**Language/Version**: Vanilla JavaScript ES modules (frontend); TypeScript 5.x on Node.js 20+ (E2E tests)
**Primary Dependencies**: None new — existing Playwright for E2E tests
**Storage**: JSON files (`data/current.json`) — read-only, no changes
**Testing**: Playwright E2E tests (`tests/e2e/overview.spec.ts`), ESLint + Prettier
**Target Platform**: Modern web browsers (Chrome, Firefox, Safari, Edge)
**Project Type**: Static web dashboard (no server-side rendering)
**Performance Goals**: Page load under 2 seconds (constitution requirement)
**Constraints**: No heavy frameworks (constitution III), keyboard-accessible interactive elements
**Scale/Scope**: 4 city cards on overview, single-page view modification

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality — strict TS, single responsibility | PASS | Frontend JS follows existing patterns; no new TS modules |
| I. Code Quality — DRY | PASS | Count computation extracted as shared helper function |
| I. Code Quality — minimal dependencies | PASS | No new dependencies added |
| II. Testing — E2E first-class | PASS | E2E tests updated for new DOM structure and new features |
| II. Testing — E2E sync with DOM changes | PASS | Existing overview tests updated alongside card restructuring |
| III. UX — loading/populated/empty states | PASS | Counts show "0" for empty states; fullscreen handles all states |
| III. UX — deep-bookmarkable | PASS | Fullscreen state stored in URL query param (`fullscreen=true`) |
| III. UX — page load under 2s | PASS | No additional data fetches; counts computed from existing data |
| III. UX — keyboard-accessible | PASS | Fullscreen toggle is a focusable button |
| Development Workflow — screenshot | REVIEW | Major visual change to overview — screenshot regeneration needed |

**Post-Phase 1 Re-check**: All gates still pass. Screenshot regeneration added as implementation task.

## Project Structure

### Documentation (this feature)

```text
specs/014-overview-fullscreen/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code (repository root)

```text
site/
├── css/
│   └── style.css              # Modified: count badge styles + fullscreen mode styles
├── js/
│   ├── app.js                 # Modified: fullscreen state management on overview route
│   └── components/
│       └── overview.js        # Modified: count computation, count display, fullscreen toggle
└── index.html                 # No changes needed

tests/
└── e2e/
    └── overview.spec.ts       # Modified: updated + new test cases
```

**Structure Decision**: No new files needed. All changes modify existing files in the established project structure.
