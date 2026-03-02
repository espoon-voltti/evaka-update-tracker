# eVaka Deployment Tracker

A monitoring dashboard that tracks which Pull Requests are deployed across eVaka instances in multiple Finnish cities. A scheduled GitHub Action fetches deployed versions, resolves PRs via the GitHub API, detects changes, sends Slack notifications, and generates a static dashboard served on GitHub Pages.

## Monitored Cities

| City | Repository | Production | Staging |
|------|-----------|------------|---------|
| **Espoo** | [espoon-voltti/evaka](https://github.com/espoon-voltti/evaka) (core) | espoonvarhaiskasvatus.fi | via `STAGING_INSTANCES` env var |
| **Tampere region** | [Tampere/trevaka](https://github.com/Tampere/trevaka) (wrapper) | varhaiskasvatus.tampere.fi + 8 municipalities | via `STAGING_INSTANCES` env var |
| **Oulu** | [Oulunkaupunki/evakaoulu](https://github.com/Oulunkaupunki/evakaoulu) (wrapper) | varhaiskasvatus.ouka.fi | via `STAGING_INSTANCES` env var |
| **Turku** | [City-of-Turku/evakaturku](https://github.com/City-of-Turku/evakaturku) (wrapper) | evaka.turku.fi | via `STAGING_INSTANCES` env var |

4 city groups with production instances hardcoded and staging/test instances configured via environment variable. Wrapper cities track both wrapper-specific and core eVaka PRs separately.

## How It Works

1. **Every 5 minutes**, a GitHub Action queries each instance's `/api/citizen/auth/status` endpoint to get the deployed commit SHA
2. For wrapper repos, the core eVaka version is resolved via the git submodule reference
3. PRs between the previous and current deployed versions are collected using the GitHub Compare API
4. Version changes trigger Slack notifications with Block Kit messages
5. Results are written as JSON files (`data/current.json`, `data/history.json`, `data/previous.json`) and committed to the repo
6. A static dashboard (`site/`) is deployed to GitHub Pages alongside the data files

## Dashboard Features

- **Overview** — all cities at a glance with production/staging versions and recent PRs
- **City detail** — per-city view with environment status, wrapper/core PR tracks, and instance details
- **PR status tracking** — see if a PR is merged, in staging, or in production
- **Deployment history** — chronological log of deployments with included changes
- **Bot PR toggle** — filter to show/hide Dependabot and Renovate PRs
- **Deep linking** — hash-based URLs for bookmarking (`#/city/espoo`, `#/city/tampere-region/history`)

## Prerequisites

- Node.js 20+
- A GitHub PAT with `public_repo` scope (5,000 req/hr rate limit)

## Setup

```bash
npm install

cp .env.example .env
# Edit .env and set GH_TOKEN (required), plus optional SLACK_WEBHOOK_URL, STAGING_INSTANCES, and Oulu staging credentials
```

## Development

```bash
# Run the data fetcher in dry-run mode (prints output, doesn't write files or send Slack)
DRY_RUN=true npx ts-node --esm src/index.ts

# Run the full pipeline (writes data files, sends Slack notifications)
npx ts-node --esm src/index.ts

# Preview the dashboard locally
ln -sf ../data site/data
npx serve site
# Open http://localhost:3000

# Run tests
npm test

# Type-check
npx tsc --noEmit
```

## Project Structure

```
src/                              # Data fetcher (TypeScript)
├── config/instances.ts           # City groups, repos, environments, instances
├── api/
│   ├── github.ts                 # GitHub REST API client with ETag caching
│   ├── status.ts                 # Instance version fetcher
│   └── slack.ts                  # Slack webhook client (Block Kit)
├── services/
│   ├── version-resolver.ts       # Resolve deployed version + submodule
│   ├── pr-collector.ts           # Collect PRs via Compare API
│   ├── change-detector.ts        # Detect version changes
│   ├── history-manager.ts        # Read/write/prune deployment history
│   └── site-deployer.ts          # Copy site + data to dist/
├── utils/
│   ├── retry.ts                  # Retry with exponential backoff
│   └── pr-classifier.ts          # Classify PRs as human vs bot
├── types.ts                      # Shared TypeScript interfaces
└── index.ts                      # Pipeline orchestrator

site/                             # Static frontend (vanilla JS, zero dependencies)
├── index.html
├── css/style.css
└── js/
    ├── app.js                    # Initialization, data loading, routing
    ├── router.js                 # Hash-based router
    └── components/
        ├── overview.js           # All-cities overview grid
        ├── city-tabs.js          # City tab navigation
        ├── city-detail.js        # Single city detail view
        ├── pr-list.js            # PR listing with status badges
        ├── status-badge.js       # Environment status indicators
        └── history-view.js       # Deployment history timeline

data/                             # Persisted state (committed by GH Action)
├── current.json                  # Full deployment snapshot
├── history.json                  # Deployment events (1-month rolling window)
└── previous.json                 # Previous run SHAs for change detection

tests/
├── unit/                         # Unit tests (Jest)
├── integration/                  # Integration tests (nock)
└── fixtures/                     # Sample API responses and data files

.github/workflows/monitor.yml     # Scheduled workflow (every 5 min)
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GH_TOKEN` | Yes | GitHub PAT for API access (5,000 req/hr) |
| `SLACK_WEBHOOK_URL` | No | Slack incoming webhook for deployment notifications |
| `STAGING_INSTANCES` | No | JSON array defining staging/test instances to monitor (see `.env.example`) |
| `OULU_STAGING_USER` | No | HTTP basic auth username for Oulu staging |
| `OULU_STAGING_PASS` | No | HTTP basic auth password for Oulu staging |
| `DRY_RUN` | No | Set to `true` to skip file writes and Slack sends |

## Deployment

The GitHub Actions workflow (`.github/workflows/monitor.yml`) runs automatically:

1. Fetches versions from all configured instances
2. Resolves PRs and detects changes
3. Sends Slack notifications for any deployments
4. Commits updated data files
5. Deploys dashboard to GitHub Pages

**Required setup:** Repository Settings → Pages → Source: "GitHub Actions". Add secrets for `GH_TOKEN` and optionally `SLACK_WEBHOOK_URL`, `STAGING_INSTANCES`, `OULU_STAGING_USER`, `OULU_STAGING_PASS`.

## Tests

```bash
npm test        # 69 tests across 8 suites
```

- **Unit tests** — version resolver, PR collector, change detector, PR classifier, history manager
- **Integration tests** — GitHub API, status API, Slack API (all using nock for HTTP mocking)
