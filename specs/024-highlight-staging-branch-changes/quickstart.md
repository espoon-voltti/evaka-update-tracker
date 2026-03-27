# Quickstart: Highlight Staging Branch Changes

## Overview

This feature detects when staging environments are running non-default branch commits and highlights this in both Slack notifications and the GH Pages history view. It also adds commit ID links to the history view.

## Key Files to Modify

### Backend (TypeScript)

| File | Change |
|------|--------|
| `src/types.ts` | Add `branch?` and `isDefaultBranch?` to `DeploymentEvent`; add `isBranchDeployment?` and `branchName?` to `StagingContext` |
| `src/api/github.ts` | Add `isCommitOnDefaultBranch()` function using compare API; add `getBranchesWhereHead()` for branch name lookup |
| `src/services/change-detector.ts` | Populate new fields on `DeploymentEvent` during detection |
| `src/index.ts` | Call branch detection during event creation; pass branch info to staging context; add backfill step for existing history entries |
| `src/api/slack.ts` | Modify `buildSlackMessage()` to handle branch deployments differently — change header, version field, and changes section |
| `src/services/history-manager.ts` | Add backfill function to enrich existing events with branch info |

### Frontend (JavaScript)

| File | Change |
|------|--------|
| `site/js/components/history-view.js` | Show commit links in release entries; show branch badge for non-default branch deployments |
| `site/js/components/status-badge.js` | Minor: ensure commit URL logic is consistent with new data |
| `site/css/style.css` | Add styles for branch badge and commit link in history entries |

### Tests

| File | Change |
|------|--------|
| `tests/unit/change-detector.test.ts` | Test new branch fields in detection |
| `tests/integration/slack-api.test.ts` | Test branch deployment message format |
| `tests/unit/history-manager.test.ts` | Test backfill logic |
| `tests/e2e/history-view.spec.ts` | Test commit links and branch badges in rendered view |

## Development Setup

```bash
npm install          # Install dependencies
npm test             # Run unit/integration tests
npm run test:e2e     # Run Playwright E2E tests
npm run typecheck    # TypeScript type checking
npm run lint         # ESLint
```

## Architecture Notes

- Branch detection happens during the event creation phase in `src/index.ts`, before Slack notifications
- Backfill runs after notifications (on the history file directly) to avoid triggering extra Slack messages
- Frontend handles `undefined` branch fields gracefully (backward compatibility with existing history data)
- The compare API call for branch detection adds 1 API call per changed staging environment per run — minimal rate limit impact
