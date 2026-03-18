import axios from 'axios';
import { DeploymentEvent } from '../types.js';
import { withRetry } from '../utils/retry.js';
import { formatFinnishDateTime } from '../utils/date-format.js';

const repoTypeDisplayNames: Record<string, string> = {
  core: 'ydin',
  wrapper: 'Kuntaimplementaatio',
};

function getRepoTypeDisplay(repoType: string): string {
  return repoTypeDisplayNames[repoType] || repoType;
}

function getCommitUrl(event: DeploymentEvent): string {
  if (event.repoType === 'core') {
    return `https://github.com/espoon-voltti/evaka/commit/${event.newCommit.shortSha}`;
  }
  const wrapperPR = event.includedPRs.find((pr) => pr.repoType === 'wrapper');
  const repoPath = wrapperPR?.repository ?? `${event.cityGroupId}/evaka-wrapper`;
  return `https://github.com/${repoPath}/commit/${event.newCommit.shortSha}`;
}

function buildVersionField(events: DeploymentEvent[]): string {
  if (events.length === 1) {
    const event = events[0];
    const commitUrl = getCommitUrl(event);
    return `*Versio:*\n<${commitUrl}|\`${event.newCommit.shortSha}\`>`;
  }

  const parts = events.map((event) => {
    const commitUrl = getCommitUrl(event);
    const label = getRepoTypeDisplay(event.repoType);
    return `${label}: <${commitUrl}|\`${event.newCommit.shortSha}\`>`;
  });
  return `*Versio:*\n${parts.join(', ')}`;
}

function buildChangesSection(event: DeploymentEvent): { type: string; text: { type: string; text: string } } {
  const repoTypeDisplay = getRepoTypeDisplay(event.repoType);
  const humanPRs = event.includedPRs.filter((pr) => !pr.isBot);

  const prLines = humanPRs.slice(0, 10).map((pr) =>
    `\u2022 <${pr.url}|#${pr.number}> ${pr.title} \u2014 _${pr.authorName ?? pr.author}_`
  );

  let changesText: string;
  if (prLines.length > 0) {
    changesText = `*Muutokset (${repoTypeDisplay}):*\n${prLines.join('\n')}`;
  } else if (event.includedPRs.length > 0) {
    // Had PRs but all were bot-authored
    changesText = `*Muutokset (${repoTypeDisplay}):*\nEi merkittäviä muutoksia`;
  } else {
    changesText = `*PR-tietoja ei saatavilla tälle ${repoTypeDisplay}-päivitykselle*`;
  }

  return {
    type: 'section',
    text: { type: 'mrkdwn', text: changesText },
  };
}

export function buildSlackMessage(events: DeploymentEvent[], dashboardBaseUrl: string) {
  const firstEvent = events[0];
  const isProduction = firstEvent.environmentId.includes('prod');
  const emoji = isProduction ? '\ud83d\ude80' : '\ud83e\uddea';
  const envLabel = isProduction ? 'Tuotanto päivitetty' : 'Staging / testaus päivitetty';
  const cityName = firstEvent.cityGroupId.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  const detectedAt = formatFinnishDateTime(firstEvent.detectedAt);

  const changesSections = events.map(buildChangesSection);

  return {
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `${emoji} ${cityName} \u2014 ${envLabel}` },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: buildVersionField(events) },
          { type: 'mrkdwn', text: `*Havaittu:*\n${detectedAt}` },
        ],
      },
      ...changesSections,
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `<${dashboardBaseUrl}#/city/${firstEvent.cityGroupId}|Ympäristöjen tiedot>`,
          },
        ],
      },
    ],
  };
}

export async function sendSlackNotification(
  webhookUrl: string,
  events: DeploymentEvent | DeploymentEvent[],
  dashboardBaseUrl: string = 'https://espoon-voltti.github.io/evaka-update-tracker/'
): Promise<void> {
  const eventArray = Array.isArray(events) ? events : [events];
  const firstEvent = eventArray[0];

  if (process.env.DRY_RUN === 'true') {
    const descriptions = eventArray.map((e) => `${e.repoType} ${e.newCommit.shortSha}`).join(', ');
    console.log(`[DRY RUN] Slack notification for ${firstEvent.environmentId}: ${descriptions}`);
    return;
  }

  if (!webhookUrl) {
    console.log(`[SKIP] No SLACK_WEBHOOK_URL configured`);
    return;
  }

  const message = buildSlackMessage(eventArray, dashboardBaseUrl);

  try {
    await withRetry(
      () => axios.post(webhookUrl, message, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
      }),
      { maxRetries: 3, baseDelayMs: 1000 }
    );
    const repoTypes = eventArray.map((e) => e.repoType).join('+');
    console.log(`[SLACK] Sent notification for ${firstEvent.environmentId} (${repoTypes})`);
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
