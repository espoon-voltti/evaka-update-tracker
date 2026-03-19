# Data Model: Capture Views Tool

## Entities

### ViewDefinition

Represents a single capturable view (dashboard route or Slack message).

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Unique identifier used for filename and filtering (e.g., `overview`, `city-tampere-region`, `slack-deployment-espoo`) |
| `type` | `'browser' \| 'slack-deployment' \| 'slack-change'` | Capture method |
| `route` | `string \| undefined` | Hash route for browser views (e.g., `#/city/tampere-region`); undefined for Slack views |
| `waitFor` | `string \| undefined` | CSS selector to wait for before extraction; undefined for Slack views |

### ViewRegistry

The complete list of views to capture, built dynamically.

| Source | Views Generated |
|--------|----------------|
| Fixed routes | `overview` (route: `#/`, waitFor: `.city-grid`), `features` (route: `#/features`, waitFor: `.feature-matrix`) |
| Per city from `current.json` | `city-{id}` (route: `#/city/{id}`, waitFor: `.city-detail`), `city-{id}-history` (route: `#/city/{id}/history`, waitFor: `.history-list`) |
| Per city from test data | `slack-deployment-{cityGroupId}` (type: `slack-deployment`) |
| Per repo type | `slack-change-announcement-core`, `slack-change-announcement-wrapper` (type: `slack-change`) |

### CaptureResult

Output of capturing a single view.

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | View name from ViewDefinition |
| `markdown` | `string` | Extracted Markdown content |
| `success` | `boolean` | Whether capture succeeded |
| `error` | `string \| undefined` | Error message if capture failed |

## Data Flow

```text
1. generateTestData()  →  test-data/current.json, history.json, feature-flags.json
2. Read current.json   →  Extract cityGroup IDs
3. Build ViewRegistry  →  Fixed routes + per-city routes + Slack message views
4. For browser views:
   startServer()  →  Playwright navigates to each route  →  DOM → Markdown
5. For Slack views:
   Build test DeploymentEvent/PR data  →  Call formatters  →  Block Kit/mrkdwn → Markdown
6. Write each CaptureResult.markdown  →  docs/snapshots/{name}.md
```

## Existing Types Used (not modified)

- `DeploymentEvent` — from `src/types.ts`, input to `buildSlackMessage()`
- `PullRequest` — from `src/types.ts`, input to `buildChangeAnnouncement()`
- `CommitInfo` — from `src/types.ts`, nested in `DeploymentEvent`
- `CityGroup` — from `src/types.ts`, used to derive city IDs from `current.json`
