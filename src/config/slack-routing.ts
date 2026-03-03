/**
 * Resolves the Slack webhook URL for a given city group.
 *
 * Fallback chain:
 * 1. Per-city env var (SLACK_WEBHOOK_URL_<CITY_ID>) → use if set
 * 2. Default env var (SLACK_WEBHOOK_URL) → use if set
 * 3. Neither set → return empty string (notification will be skipped)
 */

export function cityGroupIdToEnvVar(cityGroupId: string): string {
  return `SLACK_WEBHOOK_URL_${cityGroupId.toUpperCase().replace(/-/g, '_')}`;
}

export function resolveWebhookUrl(cityGroupId: string): string {
  const perCityVar = cityGroupIdToEnvVar(cityGroupId);
  const perCityUrl = process.env[perCityVar];
  if (perCityUrl) {
    return perCityUrl;
  }

  const defaultUrl = process.env.SLACK_WEBHOOK_URL;
  if (defaultUrl) {
    return defaultUrl;
  }

  return '';
}
