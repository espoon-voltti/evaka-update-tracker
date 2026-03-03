# Implementation Plan: Remove Staging/Testing URLs from Codebase

**Branch**: `002-remove-staging-urls` | **Date**: 2026-03-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-remove-staging-urls/spec.md`

## Summary

Remove all hardcoded staging/testing environment URLs from the codebase and replace them with a single `STAGING_INSTANCES` environment variable containing a JSON array. The runtime code parses this variable and merges staging environments into the existing city group configuration. Production URLs remain hardcoded. Documentation, test fixtures, and spec files are updated to remove direct staging URL references.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 20+
**Primary Dependencies**: axios, dotenv (existing)
**Storage**: JSON data files (existing, no change)
**Testing**: Jest with nock (existing)
**Target Platform**: GitHub Actions (data fetcher) + GitHub Pages (static frontend)
**Project Type**: Web service (scheduled data fetcher) + static site
**Performance Goals**: N/A (this is a config refactor, no performance impact)
**Constraints**: Single environment variable for all staging instances (user requirement)
**Scale/Scope**: 4 city groups, ~12 staging instances

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality — strict TS, single responsibility | PASS | New parsing module has single responsibility; strict types maintained |
| I. Code Quality — DRY | PASS | Staging config defined once (env var), referenced everywhere |
| I. Code Quality — minimal dependencies | PASS | No new dependencies; uses built-in JSON.parse |
| II. Pragmatic Testing | PASS | New parsing logic gets unit tests; existing integration tests updated |
| III. UX Consistency | PASS | No frontend changes needed; staging label logic unchanged |
| CI/CD Quality Gates | PASS | Lint, type, test, build gates unaffected |
| Development Workflow | PASS | Atomic commit; feature branch |

No violations. No entries needed in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/002-remove-staging-urls/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── config/
│   ├── instances.ts           # MODIFIED: Remove staging envs, keep production only
│   └── staging.ts             # NEW: Parse STAGING_INSTANCES env var, merge into city groups
├── types.ts                   # MODIFIED: Add StagingInstanceInput type (env var schema)

tests/
├── unit/
│   └── staging-config.test.ts # NEW: Tests for staging env var parsing
├── fixtures/
│   └── sample-data.ts         # MODIFIED: Replace real staging domain with placeholder

.env.example                   # MODIFIED: Add STAGING_INSTANCES, remove Oulu staging URL comment
.github/workflows/monitor.yml  # MODIFIED: Add STAGING_INSTANCES from secrets
README.md                      # MODIFIED: Remove staging URLs from table, document new env var
```

**Structure Decision**: Existing project structure preserved. One new source file (`src/config/staging.ts`) and one new test file. No structural changes.

## Design Decisions

### D1: Single Environment Variable with JSON Format

**Decision**: Use a single `STAGING_INSTANCES` environment variable containing a JSON array.

**Format**:
```json
[
  {
    "cityGroupId": "espoo",
    "envId": "espoo-staging",
    "instances": [
      { "name": "Espoo Staging", "domain": "staging.example.espoo.test" }
    ]
  },
  {
    "cityGroupId": "oulu",
    "envId": "oulu-staging",
    "instances": [
      { "name": "Oulu Staging", "domain": "staging.example.oulu.test", "authEnvPrefix": "OULU_STAGING" }
    ]
  }
]
```

**Rationale**: JSON is the natural choice for structured data with nesting (city groups → environments → instances). CSV cannot express the nested instance arrays. The user explicitly wanted a single env var, and JSON supports arbitrary complexity in one value.

**Auth handling**: Instances requiring HTTP basic auth specify an `authEnvPrefix` field. The runtime resolves credentials from `{prefix}_USER` and `{prefix}_PASS` env vars. This keeps actual credentials out of the JSON variable.

### D2: Merge Strategy — Production Hardcoded, Staging from Env

**Decision**: Production environments remain hardcoded in `src/config/instances.ts`. Staging environments come exclusively from the `STAGING_INSTANCES` env var at runtime.

**Rationale**: Production URLs are public and stable. Staging URLs are semi-private and should not appear in committed code. Separating concerns also makes it easy to run in production-only mode (without the env var set).

**Behavior when `STAGING_INSTANCES` is not set**: City groups contain only production environments. No error — this is a valid configuration for environments that don't need staging monitoring.

### D3: Export a Function Instead of a Const

**Decision**: Change `src/config/instances.ts` to export `getCityGroups()` function instead of `CITY_GROUPS` const, so staging environments can be merged at runtime after env vars are loaded.

**Rationale**: The current `CITY_GROUPS` const is evaluated at module import time, before `dotenv` loads `.env`. A function call allows lazy evaluation after env setup. This is the minimal change needed — callers update from `CITY_GROUPS` to `getCityGroups()`.

### D4: Test Fixtures Use Placeholder Domains

**Decision**: Replace real staging domains in test fixtures with synthetic domains (e.g., `staging.example.evaka.test`).

**Rationale**: Even in test files, real staging domains could be scraped. Using `.test` TLD (RFC 2606 reserved) makes it unambiguous that these are not real domains.

## Complexity Tracking

> No violations to justify. Plan is straightforward.
