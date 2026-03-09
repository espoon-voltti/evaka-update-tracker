# Quickstart: Slack Change Announcements

## Prerequisites

- Node.js 20+
- `GH_TOKEN` environment variable set (GitHub API access)
- Slack incoming webhook URLs for target channels

## Environment Variables

```bash
# Required — at least one must be set for announcements to work
SLACK_CHANGE_WEBHOOK_CORE=https://hooks.slack.com/services/T.../B.../...

# Optional — per-wrapper channels
SLACK_CHANGE_WEBHOOK_TAMPERE=https://hooks.slack.com/services/T.../B.../...
SLACK_CHANGE_WEBHOOK_OULU=https://hooks.slack.com/services/T.../B.../...
SLACK_CHANGE_WEBHOOK_TURKU=https://hooks.slack.com/services/T.../B.../...
```

## How It Works

1. Pipeline reads `data/repo-heads.json` to get last-known branch HEADs
2. Fetches current HEAD for each tracked repo from GitHub API
3. For changed repos: collects PRs between old and new HEAD
4. Filters out bot PRs (dependabot, renovate, etc.)
5. Posts minimal announcements to configured Slack channels
6. Updates `data/repo-heads.json` with new HEADs

## Message Format

Each announcement is a plain-text Slack message with one line per PR:

```
#8628 Testidatan refaktorointi - ei käytetä lateinit — Joosakur
#8629 Fix login redirect — developer2
```

PR numbers are clickable links to the GitHub PR page.

## Testing

```bash
# Run unit + integration tests
npm test

# Type check
npm run typecheck

# Lint
npm run lint
```

## File Structure

```
src/
├── services/
│   └── change-announcer.ts    # Core announcement logic
├── config/
│   └── change-routing.ts      # Webhook URL resolution for announcements
data/
└── repo-heads.json            # Persisted repo HEAD tracking
tests/
├── unit/
│   └── change-announcer.test.ts
└── integration/
    └── change-announcements.test.ts
```
