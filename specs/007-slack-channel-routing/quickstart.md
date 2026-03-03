# Quickstart: Per-City Slack Channel Routing

## Overview

This feature routes deployment notifications to different Slack channels based on which city group detected the change. Each city group can have its own Slack Incoming Webhook pointing to a dedicated channel.

## Configuration

### Step 1: Create Slack Webhooks

In your Slack workspace, create one Incoming Webhook per city channel:

1. Go to your Slack App configuration → **Incoming Webhooks**
2. Click **Add New Webhook to Workspace**
3. Select the target channel (e.g., `#evaka-espoo-deployments`)
4. Copy the generated webhook URL
5. Repeat for each city that needs its own channel

### Step 2: Set Environment Variables

Add per-city webhook URLs to your environment:

```bash
# Default fallback (existing — used for any city without a specific webhook)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T.../B.../default...

# Per-city overrides (optional — only set for cities that need a dedicated channel)
SLACK_WEBHOOK_URL_ESPOO=https://hooks.slack.com/services/T.../B.../espoo...
SLACK_WEBHOOK_URL_TAMPERE_REGION=https://hooks.slack.com/services/T.../B.../tampere...
SLACK_WEBHOOK_URL_OULU=https://hooks.slack.com/services/T.../B.../oulu...
SLACK_WEBHOOK_URL_TURKU=https://hooks.slack.com/services/T.../B.../turku...
```

### Step 3: Update GitHub Actions Secrets

For the automated monitor, add each webhook URL as a repository secret:

1. Go to **Settings → Secrets and variables → Actions**
2. Add secrets: `SLACK_WEBHOOK_URL_ESPOO`, `SLACK_WEBHOOK_URL_TAMPERE_REGION`, `SLACK_WEBHOOK_URL_OULU`, `SLACK_WEBHOOK_URL_TURKU`
3. The existing `SLACK_WEBHOOK_URL` secret remains as the default fallback

## How It Works

When a deployment change is detected for a city group:

1. The system looks for `SLACK_WEBHOOK_URL_<CITY_ID>` (e.g., `SLACK_WEBHOOK_URL_ESPOO` for Espoo)
2. If found, the notification goes to that city's dedicated channel
3. If not found, the notification goes to the default `SLACK_WEBHOOK_URL` channel
4. If neither is set, the notification is skipped (with a log message)

## Common Scenarios

### All cities to one channel (current behaviour)

Only set `SLACK_WEBHOOK_URL`. No per-city variables needed — everything works as before.

### Each city to its own channel

Set all per-city variables. The default `SLACK_WEBHOOK_URL` is optional but recommended as a safety net.

### Some cities to dedicated channels, rest to default

Set per-city variables for the cities that need dedicated channels. All others fall back to `SLACK_WEBHOOK_URL`.

### Disable notifications for a specific city

Set the per-city variable to an empty string to skip that city's notifications while others continue.

## Verification

After configuring, trigger a test run:

```bash
# Local test with dry run
DRY_RUN=true npx tsx src/index.ts

# Or trigger the GitHub Actions workflow manually via workflow_dispatch
```

Check the logs for `[SLACK]` messages indicating which webhook URL was used for each notification.
