# Implementation Plan: Improve History View for Stakeholders

**Branch**: `010-improve-history-view` | **Date**: 2026-03-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/010-improve-history-view/spec.md`

## Summary

Redesign the history view to match the city detail and overview views in usability, visual design, and Finnish language quality. The core changes are: (1) replace commit SHAs with prominent PR titles using the shared `renderPRList` component, (2) add bot/dependency filtering with the same toggle and URL query parameter used by the city view, (3) color-code events by environment type (green for production, blue for staging), (4) translate all English terminology to Finnish, and (5) fix awkward Finnish phrasing throughout.

## Technical Context

**Language/Version**: Vanilla JavaScript ES modules (frontend); TypeScript 5.x on Node.js 20+ (E2E tests)
**Primary Dependencies**: Playwright (E2E tests) — no new dependencies needed
**Storage**: JSON files (`data/history.json`) — read-only from frontend, no changes to data format
**Testing**: Playwright (E2E); manual visual review
**Target Platform**: Static site served via GitHub Pages
**Project Type**: Web dashboard (static frontend)
**Performance Goals**: Page load < 2 seconds (no change from current)
**Constraints**: No new runtime dependencies; frontend-only changes; must maintain deep-bookmarkable URLs

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality — strict TS, single responsibility, DRY | PASS | Eliminates duplicate PR rendering by reusing shared `renderPRList` component (DRY improvement). History view remains single-responsibility: rendering deployment events. |
| I. Code Quality — minimal dependencies | PASS | No new dependencies. All changes use existing components and native HTML/CSS. |
| II. Pragmatic Testing — E2E tests are first-class citizens | PASS | New E2E test file for history view covering key scenarios. Existing E2E tests unaffected (no city-detail or overview changes). |
| III. UX Consistency — loading/populated/empty states | PASS | Empty state text updated. Loading state unchanged. Bot-filtered empty state added. |
| III. UX Consistency — deep-bookmarkable via URL | PASS | Bot toggle persisted via `?showBots=true` query parameter, matching city view pattern. |
| III. UX Consistency — page load < 2s, minimal assets | PASS | No new JS libraries. Reusing existing CSS color variables. |
| III. UX Consistency — keyboard-accessible | PASS | Bot toggle is a `<button>` (already keyboard-accessible). No collapsed `<details>` for PRs (they are now always visible). |
| CI/CD Quality Gates — lint, type, test, E2E, build | PASS | All changes go through existing CI pipeline. New E2E tests added. |

**Pre-design gate: PASSED** — no constitution violations.

**Post-design re-check: PASSED** — design uses existing patterns and shared components; DRY principle actively improved.

## Project Structure

### Documentation (this feature)

```text
specs/010-improve-history-view/
├── plan.md              # This file
├── research.md          # Phase 0: research decisions
├── data-model.md        # Phase 1: data model (no changes needed)
├── quickstart.md        # Phase 1: implementation quickstart
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
site/
├── css/
│   └── style.css                     # Add: environment-tinted event cards, secondary SHA styles
└── js/
    ├── app.js                        # Pass queryParams to handleCityHistory; pass showBots to renderHistoryView
    └── components/
        ├── history-view.js           # REWRITE: use renderPRList, bot filtering, color-coded events, Finnish text
        └── pr-list.js                # (no changes — already supports all needed features)

tests/
└── e2e/
    └── history-view.spec.ts          # NEW: E2E tests for redesigned history view
```

**Structure Decision**: This is a frontend-only change touching 3 existing files and adding 1 new E2E test file. No backend, data pipeline, or data format changes. The shared `renderPRList` component already supports labels, repo labels, bot filtering, and date formatting — the history view simply needs to use it.

## Complexity Tracking

No constitution violations — this section is intentionally empty.
