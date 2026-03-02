# Quickstart: eVaka Deployment Tracker

## Prerequisites

- Node.js 20+
- npm
- A GitHub PAT with `public_repo` scope (for GitHub API access to public repos)

## Setup

```bash
# Install dependencies
npm install

# Create .env file for local development
cp .env.example .env
# Edit .env and set:
#   GH_TOKEN=ghp_your_personal_access_token
#   SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...  (optional for local dev)
#   OULU_STAGING_USER=...  (optional)
#   OULU_STAGING_PASS=...  (optional)
```

## Development

### Run the data fetcher locally

```bash
# Dry run (prints to console instead of committing data / sending Slack)
DRY_RUN=true npx ts-node src/index.ts

# Full run (writes data/ files, sends Slack if configured)
npx ts-node src/index.ts
```

### Preview the frontend locally

```bash
# Serve the site directory (any static server works)
npx serve site
# Open http://localhost:3000
```

The frontend reads from `site/data/` — copy or symlink `data/` into `site/data/` for local preview:
```bash
ln -s ../data site/data
```

### Run tests

```bash
npm test              # All tests
npm test -- --watch   # Watch mode
```

## Project Layout

```
src/                  # Data fetcher (TypeScript, runs in GH Action)
site/                 # Static frontend (vanilla JS, served by GH Pages)
data/                 # Persisted state (JSON, committed by GH Action)
tests/                # Test suite
.github/workflows/    # GH Action workflow
```

## Environment Variables

| Variable             | Required | Description                                        |
| -------------------- | -------- | -------------------------------------------------- |
| `GH_TOKEN`           | Yes      | GitHub PAT for API access (5,000 req/hr)           |
| `SLACK_WEBHOOK_URL`  | No       | Slack incoming webhook URL for notifications       |
| `OULU_STAGING_USER`  | No       | HTTP basic auth username for Oulu staging          |
| `OULU_STAGING_PASS`  | No       | HTTP basic auth password for Oulu staging          |
| `DRY_RUN`            | No       | Set to `true` to skip data commit and Slack send   |

## Deployment

The site is deployed automatically by the GitHub Actions workflow:

1. Workflow runs on schedule (every 5 minutes) or manual trigger
2. Fetches current versions from all instances
3. Updates `data/*.json` files and commits changes
4. Deploys `site/` + `data/` to GitHub Pages via `actions/deploy-pages`
