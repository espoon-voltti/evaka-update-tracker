# Implementation Plan: Update Finnish Feature Labels

**Branch**: `019-update-feature-labels` | **Date**: 2026-03-09 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/019-update-feature-labels/spec.md`

## Summary

Update Finnish labels in `src/config/feature-labels.ts` to match terminology used in evaka's UI (i18n files) and wiki documentation. Primary fix: replace "kansalainen" with "kuntalainen". Secondary: align other labels with evaka's actual Finnish phrasing.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 20+
**Primary Dependencies**: None (standalone string constants file)
**Storage**: N/A
**Testing**: `npm test && npm run lint` (existing test suite)
**Target Platform**: Node.js (data pipeline) + browser (frontend display)
**Project Type**: Web application (deployment tracker)
**Performance Goals**: N/A (no runtime impact — static string constants)
**Constraints**: None
**Scale/Scope**: Single file edit (~70 lines), ~20 label value changes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| I. Code Quality | PASS | Single-file edit, no logic changes, no new dependencies |
| II. Pragmatic Testing | PASS | Existing tests cover label lookup; no new logic to test |
| III. UX Consistency | PASS | Labels displayed in tracker will better match evaka UI |
| CI/CD Quality Gates | PASS | Lint + type + test gates apply; no structural changes |
| Development Workflow | PASS | Atomic commit, no visual layout changes (no screenshot needed) |

No violations. Complexity Tracking section not needed.

## Project Structure

### Documentation (this feature)

```text
specs/019-update-feature-labels/
├── plan.md              # This file
├── research.md          # Phase 0 output — label comparison table
├── spec.md              # Feature specification
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code (repository root)

```text
src/config/
└── feature-labels.ts    # Only file modified
```

**Structure Decision**: No new files or directories. This feature modifies only the `FEATURE_LABELS` record values in a single existing file.
