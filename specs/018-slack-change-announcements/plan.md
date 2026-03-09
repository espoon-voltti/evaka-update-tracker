# Implementation Plan: Slack Change Announcements

**Branch**: `018-slack-change-announcements` | **Date**: 2026-03-09 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/018-slack-change-announcements/spec.md`

## Summary

Add a separate Slack notification system that announces newly merged PRs to monitored repositories. Core repo changes go to a dedicated core Slack channel, and each wrapper repo's changes go to its own channel. Messages are minimal (one line per PR with linked number, title, and author). Bot PRs are silently ignored. This runs independently from the existing deployment notification system.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 20+
**Primary Dependencies**: axios (HTTP), nock (test mocking)
**Storage**: JSON file (`data/repo-heads.json`)
**Testing**: Jest (unit + integration), nock (HTTP mocking)
**Target Platform**: Node.js CLI / GitHub Actions
**Project Type**: Data pipeline (extension of existing)
**Performance Goals**: N/A — runs every 5 minutes via cron
**Constraints**: Must not fail the pipeline on Slack errors; must reuse existing GitHub API client
**Scale/Scope**: 4 repositories (1 core + 3 wrappers), 4 Slack channels max

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| TypeScript strict mode | PASS | All new code follows strict mode |
| Single responsibility per module | PASS | `change-announcer.ts` (detection + messaging), `change-routing.ts` (webhook resolution) |
| Explicit error handling | PASS | Webhook failures logged, pipeline continues |
| ESLint + Prettier | PASS | Will be enforced |
| Minimal dependencies | PASS | No new dependencies — reuses axios, nock |
| DRY | PASS | Reuses existing `isBotPR()`, GitHub API client, `PullRequest` type |
| Unit tests for services | PASS | `change-announcer.test.ts` planned |
| Integration tests for APIs | PASS | `change-announcements.test.ts` with nock |
| E2E tests | N/A | Backend-only feature, no frontend changes |

**Post-Phase 1 re-check**: All gates still pass. No constitution violations.

## Project Structure

### Documentation (this feature)

```text
specs/018-slack-change-announcements/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 research decisions
├── data-model.md        # Data model documentation
├── quickstart.md        # Developer quickstart guide
├── contracts/
│   └── slack-message.md # Slack webhook message contract
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── services/
│   └── change-announcer.ts    # Core logic: detect changes, collect PRs, send announcements
├── config/
│   └── change-routing.ts      # Resolve webhook URLs for change announcements
├── types.ts                   # Extended with RepoHeadsData, RepoHeadEntry (if needed)

data/
└── repo-heads.json            # Persisted repo HEAD tracking state

tests/
├── unit/
│   └── change-announcer.test.ts
└── integration/
    └── change-announcements.test.ts
```

**Structure Decision**: Follows existing project structure. New service module in `src/services/`, new config module in `src/config/`, tests mirror source structure. No new directories needed beyond what exists.

## Design

### Component Overview

```
┌──────────────┐     ┌───────────────────┐     ┌──────────────────┐
│ instances.ts │────▶│ change-announcer  │────▶│ change-routing   │
│ (repo list)  │     │ .ts               │     │ .ts              │
└──────────────┘     │                   │     │ (webhook URL     │
                     │ 1. Read repo-heads│     │  resolution)     │
┌──────────────┐     │ 2. Fetch HEAD     │     └──────────────────┘
│ github.ts    │◀────│ 3. Compare SHAs   │              │
│ (API client) │     │ 4. Collect PRs    │              ▼
└──────────────┘     │ 5. Filter bots    │     ┌──────────────────┐
                     │ 6. Send Slack     │────▶│ Slack webhook    │
┌──────────────┐     │ 7. Update heads   │     │ (HTTP POST)      │
│ repo-heads   │◀───▶│                   │     └──────────────────┘
│ .json        │     └───────────────────┘
└──────────────┘
```

### Key Functions

**`src/services/change-announcer.ts`**:
- `getTrackedRepositories(cityGroups)` — extracts unique repos from config, deduplicating core
- `readRepoHeads(filePath)` — reads `repo-heads.json`, returns empty structure if missing
- `writeRepoHeads(filePath, data)` — persists updated HEAD state
- `detectRepoChanges(repos, previousHeads)` — fetches current HEADs, returns changed repos with old/new SHAs
- `buildChangeAnnouncement(repo, prs)` — formats Slack mrkdwn text from PR list
- `announceChanges(cityGroups, dataDir)` — orchestrates full flow (main entry point, called from `index.ts`)

**`src/config/change-routing.ts`**:
- `resolveChangeWebhookUrl(repoType, cityGroupId?)` — returns webhook URL from env vars
  - Core: `SLACK_CHANGE_WEBHOOK_CORE`
  - Wrapper: `SLACK_CHANGE_WEBHOOK_<CITY_ID>` (uppercase, dashes → underscores)

### Integration with Main Pipeline

In `src/index.ts`, add a call to `announceChanges()` as an independent step:

```typescript
// Existing: deployment detection, notifications, history...
// New: change announcements (independent from deployment flow)
await announceChanges(cityGroups, dataDir);
```

This runs after the existing pipeline steps. It reads/writes its own state file and uses its own webhook configuration. Failure is caught and logged without affecting the rest of the pipeline.

### Message Format

Slack plain text with mrkdwn links:

```
<https://github.com/espoon-voltti/evaka/pull/8628|#8628> Testidatan refaktorointi - ei käytetä lateinit — Joosakur
<https://github.com/espoon-voltti/evaka/pull/8629|#8629> Fix login redirect — developer2
```

### First Run Behavior

When `repo-heads.json` doesn't exist:
1. Fetch current HEAD for each tracked repo
2. Store HEADs in `repo-heads.json`
3. Don't send any announcements (no baseline to compare against)

This prevents a flood of announcements on first deployment.
