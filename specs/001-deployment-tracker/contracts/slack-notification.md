# Contract: Slack Notification

Deployment change notifications sent via Slack Incoming Webhook.

## Trigger

A Slack message is sent when the GH Action detects a version change in any monitored environment (the SHA in `data/previous.json` differs from the freshly fetched SHA).

## Webhook

- Method: `POST`
- URL: From `SLACK_WEBHOOK_URL` secret
- Content-Type: `application/json`
- Rate limit: 1 message/second (Slack limit; no concern for deployment frequency)

## Message Format (Block Kit)

```jsonc
{
  "blocks": [
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": "🚀 Espoo — Production deployed"  // or "🧪 ... — Staging updated"
      }
    },
    {
      "type": "section",
      "fields": [
        {
          "type": "mrkdwn",
          "text": "*Version:*\n<https://github.com/espoon-voltti/evaka/commit/abc123d|`abc123d`>"
        },
        {
          "type": "mrkdwn",
          "text": "*Detected:*\n2026-03-02 12:00 UTC"
        }
      ]
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Changes (core):*\n• <https://github.com/espoon-voltti/evaka/pull/8504|#8504> Add new feature X — _developer1_\n• <https://github.com/espoon-voltti/evaka/pull/8503|#8503> Fix login issue — _developer2_"
      }
    },
    {
      "type": "context",
      "elements": [
        {
          "type": "mrkdwn",
          "text": "<https://your-org.github.io/evaka-update-tracker/#/city/espoo|View dashboard>"
        }
      ]
    }
  ]
}
```

## Behavior

- One message per deployment event (per environment + repo track that changed)
- If both wrapper and core change simultaneously, send one combined message
- If multiple city environments change in the same run, send separate messages per environment
- No message sent when no version change detected
- On Slack API error (429, 5xx), retry with exponential backoff (max 3 retries)
- On permanent error (404, 410 — webhook disabled), log warning and continue
