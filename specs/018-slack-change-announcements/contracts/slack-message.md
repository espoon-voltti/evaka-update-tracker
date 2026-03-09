# Contract: Slack Change Announcement Message

## Outbound Slack Webhook

**Method**: POST
**URL**: Configured webhook URL (per `SLACK_CHANGE_WEBHOOK_*` env vars)
**Content-Type**: `application/json`

### Request Body

Plain text message using Slack mrkdwn formatting:

```json
{
  "text": "<https://github.com/espoon-voltti/evaka/pull/8628|#8628> Testidatan refaktorointi - ei käytetä lateinit — Joosakur\n<https://github.com/espoon-voltti/evaka/pull/8629|#8629> Fix login redirect — developer2"
}
```

### Format Rules

- One line per PR: `<PR_URL|#NUMBER> TITLE — AUTHOR`
- PR URL format: `https://github.com/{owner}/{repo}/pull/{number}`
- Lines separated by `\n`
- No header, no footer, no Block Kit — plain text only
- Em dash (`—`) between title and author

### Filtering Rules

- Only human PRs (bot PRs excluded via existing `isBotPR()` classifier)
- No message sent if all PRs are bot-authored
- No message sent if webhook URL is not configured

### Error Handling

- HTTP 200: Success
- HTTP 404/410: Log warning, skip (webhook deleted/disabled)
- Other errors: Log warning, continue pipeline
- Network errors: Log warning, continue pipeline
