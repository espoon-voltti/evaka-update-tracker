# Data Model: Per-City Slack Channel Routing

## Entities

### Webhook Route (runtime, not persisted)

Resolved at runtime from environment variables. Not stored in any data file.

| Field | Type | Description |
|-------|------|-------------|
| cityGroupId | string | City group identifier (e.g., `espoo`, `tampere-region`) |
| webhookUrl | string | Resolved Slack Incoming Webhook URL for this city group |
| source | `'per-city'` \| `'default'` \| `'none'` | How the URL was resolved |

### Resolution Rules

```
For a given cityGroupId:
  1. envVarName = "SLACK_WEBHOOK_URL_" + cityGroupId.toUpperCase().replaceAll("-", "_")
  2. If process.env[envVarName] is set and non-empty → use it (source: 'per-city')
  3. Else if process.env.SLACK_WEBHOOK_URL is set and non-empty → use it (source: 'default')
  4. Else → webhookUrl = "" (source: 'none')
```

### Existing Entities (unchanged)

- **DeploymentEvent**: Already contains `cityGroupId` — this is the routing key. No changes needed.
- **CityGroup**: Already contains `id` — used to derive the env var name. No changes needed.
- **Data files** (`current.json`, `history.json`, `previous.json`): No schema changes.

## Environment Variable Mapping

| City Group ID | Env Var Name |
|---------------|-------------|
| `espoo` | `SLACK_WEBHOOK_URL_ESPOO` |
| `tampere-region` | `SLACK_WEBHOOK_URL_TAMPERE_REGION` |
| `oulu` | `SLACK_WEBHOOK_URL_OULU` |
| `turku` | `SLACK_WEBHOOK_URL_TURKU` |

Default fallback: `SLACK_WEBHOOK_URL` (existing)
