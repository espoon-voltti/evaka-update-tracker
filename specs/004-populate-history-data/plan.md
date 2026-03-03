# Implementation Plan: Populate History Data & Fix History Display

**Branch**: `004-populate-history-data` | **Date**: 2026-03-03 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/004-populate-history-data/spec.md`

## Summary

Backfill deployment history from environment log exports (`update_history/*.json`) and fix the live tracker bug where `includedPRs` is always empty in history events. The update_history files contain timestamped commit SHAs from each environment's API Gateway logs. These are converted into deployment events by comparing consecutive entries, then enriched with PR details from the GitHub API. The frontend already displays PR details correctly — the issue is purely that the backend never populates the `includedPRs` field.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 20+
**Primary Dependencies**: axios (HTTP), existing GitHub API client (`src/api/github.ts`), existing PR collector (`src/services/pr-collector.ts`)
**Storage**: JSON files (`data/history.json`, `update_history/*.json`)
**Testing**: Jest (unit), nock (HTTP mocking), Playwright (E2E)
**Target Platform**: Node.js CLI (backfill script) + static site (frontend)
**Project Type**: Web application (data fetcher backend + static frontend)
**Performance Goals**: Backfill completes within GitHub API rate limits (5,000 requests/hour authenticated)
**Constraints**: ~200-400 GitHub API calls for full backfill across 8 environments
**Scale/Scope**: 8 environment files, ~60-70 deployment events to create

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality - Strict TypeScript | PASS | All new code uses strict mode, no `any` types |
| I. Code Quality - Single responsibility | PASS | Backfill script is a separate module; bug fix is a targeted change |
| I. Code Quality - Error handling explicit | PASS | API failures handled gracefully with empty `includedPRs` |
| I. Code Quality - DRY | PASS | Reuses existing `collectPRsBetween`, `getCommit`, `getSubmoduleRef`, `readHistory`/`writeHistory` |
| I. Code Quality - Minimal dependencies | PASS | No new dependencies needed |
| II. Pragmatic Testing | PASS | Unit tests for backfill logic, existing tests updated for bug fix |
| III. UX Consistency | PASS | No frontend changes — existing history-view.js already handles PR display |
| CI/CD Quality Gates | PASS | Lint, type check, tests all apply |

**Post-design re-check**: PASS — No violations introduced.

## Project Structure

### Documentation (this feature)

```text
specs/004-populate-history-data/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── api/
│   └── github.ts              # Existing — no changes needed
├── config/
│   └── instances.ts           # Existing — reference for env mapping
├── services/
│   ├── change-detector.ts     # Existing — no changes needed
│   ├── pr-collector.ts        # Existing — reused by backfill
│   └── history-manager.ts     # Existing — reused by backfill
├── scripts/
│   └── backfill-history.ts    # NEW — one-time backfill script
├── utils/
│   └── retry.ts               # Existing — reused for API calls
└── index.ts                   # MODIFY — fix line 108 to pass PRs

site/
└── js/
    └── components/
        └── history-view.js    # Existing — no changes needed (already correct)

tests/
├── unit/
│   ├── backfill-history.test.ts  # NEW — unit tests for backfill logic
│   └── change-detector.test.ts   # Existing — tests already cover PR passing
└── integration/
    └── github-api.test.ts        # Existing — no changes needed

update_history/                    # INPUT — log exports (8 JSON files)
data/
└── history.json                   # OUTPUT — populated deployment history
```

**Structure Decision**: Follows existing project layout. New backfill script goes in `src/scripts/` as a one-time utility. The main `src/index.ts` gets a targeted bug fix.

## Implementation Approach

### Task 1: Create Backfill Script (`src/scripts/backfill-history.ts`)

A standalone script that:

1. **Reads update_history files** — Parses each JSON file and maps to environment config.

2. **Environment mapping** — Hardcoded constant mapping filenames to environment/city-group IDs and repository configs:
   ```
   tre-prod    → tampere-prod   / tampere-region / wrapper: Tampere/trevaka
   tre-test    → tampere-test   / tampere-region / wrapper: Tampere/trevaka
   espoo-prod  → espoo-prod     / espoo          / core-only
   espoo-staging → espoo-staging / espoo          / core-only
   oulu-prod   → oulu-prod      / oulu           / wrapper: Oulunkaupunki/evakaoulu
   oulu-test   → oulu-staging   / oulu           / wrapper: Oulunkaupunki/evakaoulu
   turku-prod  → turku-prod     / turku          / wrapper: City-of-Turku/evakaturku
   turku-test  → turku-staging  / turku          / wrapper: City-of-Turku/evakaturku
   ```

3. **Converts log entries to deployment events** — For each file, sort entries chronologically (oldest first). For each consecutive pair with different `appCommit`:
   - Resolve commit info via `getCommit()` for the wrapper repo (or core repo for Espoo)
   - For wrapper cities: resolve core commit via `getSubmoduleRef()` at wrapper commit
   - Create wrapper event if wrapper commit changed
   - Create core event if core commit changed
   - Collect PRs between previous and new commits for each repo using `collectPRsBetween()`
   - Do NOT filter out bot PRs for history (include all PRs — historical completeness)

4. **Deduplication** — Before writing, filter existing `history.json` events that would conflict (same environmentId + repoType + newCommit.sha).

5. **Writes merged history** — Combines backfilled events with existing non-conflicting events, sorts by `detectedAt` descending, writes to `data/history.json`.

### Task 2: Fix Live Tracker Bug (`src/index.ts`)

Change line 108 to pass collected PRs to `detectChanges()` instead of `[]`.

**Approach**: The current code structure collects PRs per-city-group (lines 119-178) after the per-environment loop (lines 83-117). To fix this, we need to collect PRs for each environment change _at detection time_.

When a change is detected (current SHA differs from previous SHA), immediately call `collectPRsBetween()` for the changed repo with the previous and new SHAs. Pass the resulting PRs to `detectChanges()`.

This is a focused change in the inner environment loop:
- After detecting that `currentWrapperSha !== prevWrapperSha` or `currentCoreSha !== prevCoreSha`, collect PRs for the changed repos
- Pass collected PRs to `detectChanges()`

### Task 3: Unit Tests for Backfill (`tests/unit/backfill-history.test.ts`)

Test the pure logic functions:
- Parsing update_history entries and converting to event pairs
- Environment mapping correctness
- Deduplication logic
- Handling of same-commit consecutive entries (skip)
- Handling of first entry (null previousCommit)

### Task 4: Verify Frontend Display

No code changes needed. Verify manually or via E2E test that:
- History view shows expandable PR lists after backfill
- PR details include number, title, author, and link
- Events without PRs still show "No PR details available"

## Complexity Tracking

No constitution violations — no entries needed.
