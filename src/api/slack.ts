import axios from 'axios';
import { DeploymentEvent, StagingContext } from '../types.js';
import { withRetry } from '../utils/retry.js';
import { formatFinnishDateTime } from '../utils/date-format.js';
import { formatLabelTags } from '../config/label-map.js';

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

function buildVersionField(events: DeploymentEvent[], stagingContext?: StagingContext): string {
  const branchSuffix = stagingContext?.isBranchDeployment && stagingContext.branchName
    ? ` (haara: ${stagingContext.branchName})`
    : stagingContext?.isBranchDeployment
      ? ' (ei pääkehityshaarassa)'
      : '';

  if (events.length === 1) {
    const event = events[0];
    const commitUrl = getCommitUrl(event);
    return `*Versio:*\n<${commitUrl}|\`${event.newCommit.shortSha}\`>${branchSuffix}`;
  }

  const parts = events.map((event) => {
    const commitUrl = getCommitUrl(event);
    const label = getRepoTypeDisplay(event.repoType);
    return `${label}: <${commitUrl}|\`${event.newCommit.shortSha}\`>`;
  });
  return `*Versio:*\n${parts.join(', ')}${branchSuffix}`;
}

function buildChangesSection(
  event: DeploymentEvent,
  dashboardBaseUrl: string,
  cityGroupId: string,
  isBranchDeployment?: boolean
): { type: string; text: { type: string; text: string } } {
  const repoTypeDisplay = getRepoTypeDisplay(event.repoType);

  // For branch deployments, PR lists are misleading — show branch context instead
  if (isBranchDeployment || event.isDefaultBranch === false) {
    const changesText = `*${repoTypeDisplay}:*\nHaaran testaus \u2014 PR-muutokset eiv\u00e4t ole vertailukelpoisia`;
    return {
      type: 'section',
      text: { type: 'mrkdwn', text: changesText },
    };
  }

  const humanPRs = event.includedPRs.filter((pr) => !pr.isHidden);

  const prLines = humanPRs.slice(0, 50).map((pr) => {
    const tags = formatLabelTags(pr.labels);
    const tagPrefix = tags ? `${tags} ` : '';
    return `\u2022 <${pr.url}|#${pr.number}> ${tagPrefix}${pr.title} \u2014 _${pr.authorName ?? pr.author}_`;
  });

  let changesText: string;
  if (prLines.length > 0) {
    changesText = `*Muutokset (${repoTypeDisplay}):*\n${prLines.join('\n')}`;
    const remaining = humanPRs.length - 50;
    if (remaining > 0) {
      const historyUrl = `${dashboardBaseUrl}#/city/${cityGroupId}/history`;
      changesText += `\n_...ja <${historyUrl}|${remaining} muuta muutosta>_`;
    }
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

export function buildSlackMessage(events: DeploymentEvent[], dashboardBaseUrl: string, stagingContext?: StagingContext) {
  const firstEvent = events[0];
  const isProduction = firstEvent.environmentId.includes('prod');
  const isBranchDeployment = stagingContext?.isBranchDeployment === true;
  const emoji = isProduction ? '\ud83d\ude80' : isBranchDeployment ? '\ud83d\udd00' : '\ud83e\uddea';
  const envLabel = isProduction
    ? 'Tuotanto päivitetty'
    : isBranchDeployment
      ? 'Staging / haaran testaus'
      : 'Staging / testaus päivitetty';
  const cityName = firstEvent.cityGroupId.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  const detectedAt = formatFinnishDateTime(firstEvent.detectedAt);

  const changesSections = events.map((event) =>
    buildChangesSection(event, dashboardBaseUrl, firstEvent.cityGroupId, isBranchDeployment)
  );

  // Build context elements
  const contextElements: Array<{ type: string; text: string }> = [];
  if (!isProduction && !isBranchDeployment && stagingContext?.productionAvailable) {
    contextElements.push({
      type: 'mrkdwn',
      text: stagingContext.inStagingCount === 0
        ? 'Sama versio kuin tuotannossa'
        : stagingContext.inStagingCount === 1
          ? '+1 muutos verrattuna tuotantoon'
          : `+${stagingContext.inStagingCount} muutosta verrattuna tuotantoon`,
    });
  }
  if (isBranchDeployment) {
    contextElements.push({
      type: 'mrkdwn',
      text: 'Haaraa testataan staging-ympäristössä',
    });
  }
  contextElements.push({
    type: 'mrkdwn',
    text: isProduction
      ? `<${dashboardBaseUrl}#/city/${firstEvent.cityGroupId}|Ympäristöjen tiedot>`
      : `<${dashboardBaseUrl}#/city/${firstEvent.cityGroupId}|Katso ${cityName} ympäristöjen tilanne>`,
  });

  return {
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `${emoji} ${cityName} \u2014 ${envLabel}` },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: buildVersionField(events, stagingContext) },
          { type: 'mrkdwn', text: `*Havaittu:*\n${detectedAt}` },
        ],
      },
      ...changesSections,
      {
        type: 'context',
        elements: contextElements,
      },
    ],
  };
}

export async function sendSlackNotification(
  webhookUrl: string,
  events: DeploymentEvent | DeploymentEvent[],
  dashboardBaseUrl: string = 'https://espoon-voltti.github.io/evaka-update-tracker/',
  stagingContext?: StagingContext
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

  const message = buildSlackMessage(eventArray, dashboardBaseUrl, stagingContext);

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
