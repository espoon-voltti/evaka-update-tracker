# Implementation Plan: Highlight Staging Branch Changes

**Branch**: `024-highlight-staging-branch-changes` | **Date**: 2026-03-27 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/024-highlight-staging-branch-changes/spec.md`

## Summary

Detect when staging environments run non-default branch commits and clearly communicate this in Slack notifications (replacing misleading PR lists with branch deployment context) and GH Pages history view (branch badges + commit ID links). Uses the existing GitHub compare API to determine if a deployed commit is on the default branch, with minimal data model additions (2 optional fields on `DeploymentEvent`). Includes a history backfill step that enriches existing entries without triggering Slack notifications.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 20+ (backend/data pipeline); vanilla JavaScript ES modules (frontend)
**Primary Dependencies**: axios (HTTP), nock (test mocking), Playwright (E2E tests) — no new dependencies
**Storage**: JSON files (`data/current.json`, `data/history.json`, `data/previous.json`)
**Testing**: Jest (unit/integration), Playwright (E2E), `npm test && npm run lint`
**Target Platform**: GitHub Actions (data pipeline), GitHub Pages (frontend)
**Project Type**: Web application (data pipeline + static dashboard)
**Performance Goals**: Branch detection adds 1 GitHub API call per changed staging environment per pipeline run — negligible impact
**Constraints**: Must not trigger extra Slack notifications for backfilled data; must maintain backward compatibility with existing history.json entries
**Scale/Scope**: ~6 city groups, ~12 environments, history pruned to 30 days

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| §I Code Quality — strict TS, single responsibility | PASS | New function `isCommitOnDefaultBranch` has clear single responsibility |
| §I Code Quality — DRY | PASS | Commit URL logic extracted/reused between Slack and frontend |
| §I Code Quality — minimal dependencies | PASS | No new dependencies added |
| §II Pragmatic Testing — service unit tests | PASS | change-detector, history-manager tests updated |
| §II Pragmatic Testing — API integration tests | PASS | slack-api, github-api tests updated |
| §II Pragmatic Testing — E2E tests | PASS | history-view E2E tests updated for new elements |
| §III UX Consistency — three states | PASS | History entries handle: has branch info, no branch info (legacy), error |
| §III UX Consistency — bookmarkable views | PASS | No new routes; existing URLs work unchanged |
| §CI/CD Gates — lint, type, test, e2e, build | PASS | All gates apply to changes |
| §Development Workflow — mockup capture | REQUIRED | "Before" mockups must be captured before implementation |
| §Development Workflow — workflow YAML | N/A | No new environment variables or secrets needed |

**View Mockup Capture**: This feature affects the GH Pages history view and Slack staging notifications. "Before" mockups MUST be captured before implementation begins using `npm run capture-views` or manual mockups saved to `specs/024-highlight-staging-branch-changes/mockups-before.md`.

### Post-Design Re-check

| Gate | Status | Notes |
|------|--------|-------|
| §I Code Quality — no `any` types | PASS | All new types are strongly typed |
| §I Code Quality — error handling | PASS | Branch detection gracefully falls back on API failure |
| §II Testing — edge cases | PASS | Legacy events, API failures, branch name unavailable all covered |
| §III UX — consistent patterns | PASS | Branch badge uses same visual system as existing labels |

## Project Structure

### Documentation (this feature)

```text
specs/024-highlight-staging-branch-changes/
├── spec.md
├── plan.md              # This file
├── research.md          # Phase 0: research decisions
├── data-model.md        # Phase 1: data model changes
├── quickstart.md        # Phase 1: development guide
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── types.ts                          # DeploymentEvent + StagingContext extensions
├── api/
│   ├── github.ts                     # New: isCommitOnDefaultBranch(), getBranchesWhereHead()
│   └── slack.ts                      # Modified: branch deployment message format
├── services/
│   ├── change-detector.ts            # Modified: populate branch fields
│   └── history-manager.ts            # New: backfill function
└── index.ts                          # Modified: branch detection flow, backfill orchestration

site/
├── js/
│   └── components/
│       └── history-view.js           # Modified: commit links, branch badges
└── css/
    └── style.css                     # Modified: branch badge styles

tests/
├── unit/
│   ├── change-detector.test.ts       # Modified: branch field tests
│   └── history-manager.test.ts       # Modified: backfill tests
├── integration/
│   ├── slack-api.test.ts             # Modified: branch deployment message tests
│   └── github-api.test.ts            # Modified: new API function tests
└── e2e/
    └── history-view.spec.ts          # Modified: commit links, branch badge tests
```

**Structure Decision**: Follows existing project layout. No new directories or modules — changes are additions to existing files. The feature touches the data pipeline (backend TypeScript), Slack notification formatting, and the frontend history view.

## Complexity Tracking

No constitution violations. All changes fit within existing patterns and architecture.
