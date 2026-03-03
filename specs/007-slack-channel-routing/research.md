# Research: Per-City Slack Channel Routing

## R1: Configuration Approach — Per-City Env Vars vs JSON Map vs Code Config

**Decision**: Individual environment variables per city group (`SLACK_WEBHOOK_URL_<CITY_ID>`)

**Rationale**:
- GitHub Actions secrets are individual — each city's webhook is a separate secret, allowing granular updates without touching other cities
- Self-documenting naming: `SLACK_WEBHOOK_URL_ESPOO`, `SLACK_WEBHOOK_URL_TAMPERE_REGION`, etc.
- Backward compatible: existing `SLACK_WEBHOOK_URL` remains the default fallback
- Simple to parse: no JSON parsing or error handling needed, just `process.env[key]`
- Convention: city group ID `tampere-region` maps to env var suffix `TAMPERE_REGION` (uppercase, hyphens to underscores)

**Alternatives considered**:
1. **JSON map env var** (`SLACK_WEBHOOK_URLS={"espoo":"url1",...}`): Consistent with `STAGING_INSTANCES` pattern, but puts all URLs in one secret. Any change requires updating the entire JSON blob. More error-prone for operators.
2. **Code config** (mapping in `instances.ts`): Type-safe but requires redeployment for any channel change. Violates FR-007 (no redeployment for config changes).
3. **Slack Bot Token + `chat.postMessage` API**: Would allow channel routing from a single token, but requires OAuth app setup, `chat:write` scope, and introduces a new dependency (`@slack/web-api` or manual API calls). Over-engineered for this use case.

## R2: Slack Incoming Webhooks — Channel Binding Behaviour

**Decision**: Use one Slack Incoming Webhook per target channel (standard Slack behaviour)

**Rationale**:
- Slack Incoming Webhooks are inherently bound to a specific channel at creation time
- There is no way to override the destination channel via the webhook payload (this was possible in legacy webhooks but removed in modern Slack apps)
- Therefore, routing to different channels requires different webhook URLs
- This aligns naturally with the per-city env var approach: one URL = one channel

**Implications**:
- The Slack app admin creates one Incoming Webhook per city channel in the Slack app configuration
- Each webhook URL is then stored as a separate GitHub Actions secret
- If a city changes channels, only that city's webhook needs to be recreated

## R3: Webhook URL Resolution Logic

**Decision**: Simple fallback chain — per-city env var → default env var → skip notification

**Rationale**:
- Resolution order for a given city group ID (e.g., `tampere-region`):
  1. Check `SLACK_WEBHOOK_URL_TAMPERE_REGION` → use if set
  2. Check `SLACK_WEBHOOK_URL` → use if set (default fallback)
  3. Neither set → skip notification with log message
- This ensures backward compatibility: if no per-city vars are set, the system behaves identically to today
- Partial configuration is supported: some cities can have dedicated channels while others fall back to the default

**Alternatives considered**:
- Requiring all cities to be explicitly configured (no fallback): Breaks existing setups and adds operational burden
- Separate "default channel" env var: Unnecessary — `SLACK_WEBHOOK_URL` already serves this purpose

## R4: Error Isolation Between City Groups

**Decision**: Existing error handling in `sendSlackNotification` already provides fault isolation

**Rationale**:
- The current `sendSlackNotification` function catches errors per-call and logs them without throwing
- Since notifications are sent in a loop per event, a failure for one city group's webhook does not prevent others from being sent
- No changes needed to the error handling logic — it already satisfies FR-006
- The 404/410 handling (webhook disabled) also works per-URL, so a revoked webhook for one city doesn't affect others

## R5: Naming Convention for Env Vars

**Decision**: `SLACK_WEBHOOK_URL_<UPPERCASE_CITY_ID>` where hyphens become underscores

**Rationale**:
- City group IDs: `espoo`, `tampere-region`, `oulu`, `turku`
- Mapped env vars: `SLACK_WEBHOOK_URL_ESPOO`, `SLACK_WEBHOOK_URL_TAMPERE_REGION`, `SLACK_WEBHOOK_URL_OULU`, `SLACK_WEBHOOK_URL_TURKU`
- Convention follows standard env var naming (UPPER_SNAKE_CASE)
- The conversion function is simple: `id.toUpperCase().replace(/-/g, '_')`
- This pattern is deterministic and reversible

## R6: Testing Strategy

**Decision**: Unit test the routing resolver; extend existing integration tests for multi-webhook scenarios

**Rationale**:
- New unit test file `tests/unit/slack-routing.test.ts` to cover:
  - Per-city env var takes precedence over default
  - Falls back to default when per-city not set
  - Returns empty string when neither is set
  - Correct env var name generation from city group ID
- Extend `tests/integration/slack-api.test.ts` to cover:
  - Different webhook URLs for different events (verifying correct URL per city)
- No changes needed to change-detector tests (change detection is unchanged)
