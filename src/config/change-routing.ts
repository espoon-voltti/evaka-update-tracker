/**
 * Resolves the Slack webhook URL for change announcements.
 *
 * Separate from deployment notification routing (slack-routing.ts).
 * Uses SLACK_CHANGE_WEBHOOK_CORE for core repo and
 * SLACK_CHANGE_WEBHOOK_<CITY_ID> for wrapper repos.
 */

export function resolveChangeWebhookUrl(
  repoType: 'core' | 'wrapper',
  cityGroupId?: string | null
): string {
  if (repoType === 'core') {
    return process.env.SLACK_CHANGE_WEBHOOK_CORE ?? '';
  }

  if (!cityGroupId) {
    return '';
  }

  const envVar = `SLACK_CHANGE_WEBHOOK_${cityGroupId.toUpperCase().replace(/-/g, '_')}`;
  return process.env[envVar] ?? '';
}
