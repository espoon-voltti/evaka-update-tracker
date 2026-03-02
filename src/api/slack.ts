import axios from 'axios';
import { DeploymentEvent } from '../types.js';
import { withRetry } from '../utils/retry.js';

const DRY_RUN = process.env.DRY_RUN === 'true';

function buildSlackMessage(event: DeploymentEvent, dashboardBaseUrl: string) {
  const isProduction = event.environmentId.includes('prod');
  const emoji = isProduction ? '\ud83d\ude80' : '\ud83e\uddea';
  const envLabel = isProduction ? 'Production deployed' : 'Staging updated';
  const cityName = event.cityGroupId.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  const commitUrl = event.repoType === 'core'
    ? `https://github.com/espoon-voltti/evaka/commit/${event.newCommit.shortSha}`
    : `https://github.com/${event.cityGroupId}/commit/${event.newCommit.shortSha}`;

  const detectedAt = new Date(event.detectedAt).toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

  const prLines = event.includedPRs.slice(0, 10).map((pr) =>
    `\u2022 <${pr.url}|#${pr.number}> ${pr.title} \u2014 _${pr.author}_`
  );

  const changesText = prLines.length > 0
    ? `*Changes (${event.repoType}):*\n${prLines.join('\n')}`
    : `*No PR details available for this ${event.repoType} update*`;

  return {
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `${emoji} ${cityName} \u2014 ${envLabel}` },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Version:*\n<${commitUrl}|\`${event.newCommit.shortSha}\`>` },
          { type: 'mrkdwn', text: `*Detected:*\n${detectedAt}` },
        ],
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: changesText },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `<${dashboardBaseUrl}#/city/${event.cityGroupId}|View dashboard>`,
          },
        ],
      },
    ],
  };
}

export async function sendSlackNotification(
  webhookUrl: string,
  event: DeploymentEvent,
  dashboardBaseUrl: string = ''
): Promise<void> {
  if (DRY_RUN) {
    console.log(`[DRY RUN] Slack notification for ${event.environmentId}: ${event.repoType} ${event.newCommit.shortSha}`);
    return;
  }

  if (!webhookUrl) {
    console.log(`[SKIP] No SLACK_WEBHOOK_URL configured`);
    return;
  }

  const message = buildSlackMessage(event, dashboardBaseUrl);

  try {
    await withRetry(
      () => axios.post(webhookUrl, message, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
      }),
      { maxRetries: 3, baseDelayMs: 1000 }
    );
    console.log(`[SLACK] Sent notification for ${event.environmentId} (${event.repoType})`);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 404 || status === 410) {
        console.warn(`[SLACK] Webhook appears disabled (${status}). Skipping.`);
        return;
      }
    }
    console.error(`[SLACK] Failed to send notification:`, error);
  }
}
