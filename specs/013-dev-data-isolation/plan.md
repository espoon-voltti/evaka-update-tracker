# Implementation Plan: Dev Data Isolation

**Branch**: `013-dev-data-isolation` | **Date**: 2026-03-04 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/013-dev-data-isolation/spec.md`

## Summary

Eliminate git merge conflicts on `data/` files by making the pipeline write to `.data/` (gitignored) when run locally, while preserving the current `data/` behavior in CI. The `CI` environment variable distinguishes environments; `DATA_DIR` env var remains the highest-priority override. The `site/data` symlink is updated dynamically and gitignored.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 20+
**Primary Dependencies**: dotenv (env loading) — no new dependencies
**Storage**: JSON files (`current.json`, `history.json`, `previous.json`, `feature-flags.json`)
**Testing**: Jest (unit), Playwright (E2E)
**Target Platform**: Node.js CLI (data pipeline), static site (GitHub Pages)
**Project Type**: Data pipeline + static site generator
**Performance Goals**: N/A (pipeline runs every 5 minutes in CI; local runs are ad-hoc)
**Constraints**: Zero additional configuration for developers; CI behavior must not change
**Scale/Scope**: 4 JSON files, ~5 files modified

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| I. Code Quality — strict mode, no `any` | PASS | Change is in existing strict TS codebase |
| I. Code Quality — single responsibility | PASS | Data dir resolution is a single concern added to existing config logic |
| I. Code Quality — DRY | PASS | Resolution logic defined once in `src/index.ts` |
| I. Code Quality — minimal dependencies | PASS | No new dependencies |
| II. Pragmatic Testing — unit tests | PASS | Data dir resolution logic should have unit tests |
| II. Pragmatic Testing — E2E | PASS | Existing E2E tests unaffected (they set `DATA_DIR` explicitly) |
| III. UX Consistency | N/A | No frontend changes |
| CI/CD Quality Gates | PASS | No CI workflow logic changes; only `.gitignore` and default path |
| Development Workflow — atomic commits | PASS | Small, focused change |

**Post-Phase 1 re-check**: All gates still pass. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/013-dev-data-isolation/
├── plan.md              # This file
├── research.md          # Phase 0: CI detection, dir naming, symlink strategy
├── data-model.md        # Phase 1: Resolution priority chain, file structure
├── quickstart.md        # Phase 1: Developer usage guide
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
└── index.ts             # MODIFY: DATA_DIR resolution logic (line 28)

site/
└── data                 # MODIFY: symlink gitignored, updated by pipeline

.gitignore               # MODIFY: add .data/ and site/data
.env.example             # MODIFY: document DATA_DIR variable
```

**Structure Decision**: This is a minimal configuration change within the existing single-project structure. Only `src/index.ts` has logic changes; the rest are config/gitignore updates.

## Complexity Tracking

No constitution violations. Table not needed.
