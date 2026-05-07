import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import {
  CityGroup,
  PullRequest,
  RepoHeadsData,
  TrackedRepository,
} from '../types.js';
import { getCommit } from '../api/github.js';
import { collectPRsBetween, filterHumanPRs } from '../services/pr-collector.js';
import { resolveChangeWebhookUrl } from '../config/change-routing.js';
import { formatLabelTags } from '../config/label-map.js';
import { getMunicipalityCityGroups, getMunicipalityNames } from '../utils/municipality-labels.js';
import { UserNameCache, resolveNames } from '../services/name-resolver.js';
import { toShortSha } from '../utils/sha.js';

/**
 * Extracts unique repositories from city group configuration.
 * Core repo (appears in all groups) is deduplicated and tracked once.
 */
export function getTrackedRepositories(cityGroups: CityGroup[]): TrackedRepository[] {
  const seen = new Set<string>();
  const repos: TrackedRepository[] = [];

  for (const group of cityGroups) {
    for (const repo of group.repositories) {
      const key = `${repo.owner}/${repo.name}`;
      if (seen.has(key)) continue;
      seen.add(key);

      repos.push({
        owner: repo.owner,
        name: repo.name,
        type: repo.type,
        defaultBranch: repo.defaultBranch,
        cityGroupId: repo.type === 'wrapper' ? group.id : null,
      });
    }
  }

  return repos;
}

export function readRepoHeads(filePath: string): RepoHeadsData {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as RepoHeadsData;
  } catch {
    return { checkedAt: '', repos: {} };
  }
}

export function writeRepoHeads(filePath: string, data: RepoHeadsData): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

/**
 * Formats a single PR into a Slack mrkdwn line.
 * Format: <PR_URL|#NUMBER> [TAGS] TITLE — AUTHOR
 */
export function formatPRLine(pr: PullRequest): string {
  const tags = formatLabelTags(pr.labels);
  const tagPrefix = tags ? `${tags} ` : '';
  return `<${pr.url}|#${pr.number}> ${tagPrefix}${pr.title} \u2014 ${pr.authorName ?? pr.author}`;
}

/**
 * Sends a plain-text change announcement to a Slack webhook.
 * Returns true on success (HTTP 200), false on any failure.
 * Never throws — logs warnings on failure.
 */
export async function sendChangeAnnouncement(webhookUrl: string, text: string): Promise<boolean> {
  try {
    await axios.post(webhookUrl, { text }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    });
    return true;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 404 || status === 410) {
        console.warn(`[CHANGE] Webhook appears disabled (${status}). Skipping.`);
        return false;
      }
    }
    console.warn('[CHANGE] Failed to send announcement:', error);
    return false;
  }
}

/**
 * Main orchestrator: detects repo HEAD changes, collects PRs, sends announcements.
 */
export async function announceChanges(
  cityGroups: CityGroup[],
  dataDir: string,
  nameCache: UserNameCache,
  lookupUser: (username: string) => Promise<string | null>
): Promise<void> {
  const headsPath = path.join(dataDir, 'repo-heads.json');
  const previousHeads = readRepoHeads(headsPath);
  const trackedRepos = getTrackedRepositories(cityGroups);

  const updatedHeads: RepoHeadsData = {
    checkedAt: new Date().toISOString(),
    repos: { ...previousHeads.repos },
  };

  for (const repo of trackedRepos) {
    const repoKey = `${repo.owner}/${repo.name}`;

    // Fetch current HEAD of the default branch
    let currentHead: string;
    try {
      const commitInfo = await getCommit(repo.owner, repo.name, repo.defaultBranch);
      currentHead = commitInfo.sha;
    } catch (error) {
      console.warn(`[CHANGE] Failed to fetch HEAD for ${repoKey}:`, error);
      continue;
    }

    const previousEntry = previousHeads.repos[repoKey];
    const previousSha = previousEntry?.sha;

    const updateHead = () => {
      updatedHeads.repos[repoKey] = {
        sha: currentHead,
        branch: repo.defaultBranch,
      };
    };

    // First run for this repo: store HEAD without announcing
    if (!previousSha) {
      console.log(`[CHANGE] First run for ${repoKey}, storing HEAD ${toShortSha(currentHead)}`);
      updateHead();
      continue;
    }

    // No change
    if (currentHead === previousSha) {
      continue;
    }

    console.log(`[CHANGE] ${repoKey}: ${toShortSha(previousSha)} → ${toShortSha(currentHead)}`);

    // Collect PRs between old and new HEAD
    const repoConfig = { owner: repo.owner, name: repo.name, type: repo.type, submodulePath: null, defaultBranch: repo.defaultBranch };
    const allPRs = await collectPRsBetween(repoConfig, previousSha, currentHead);
    const humanPRs = filterHumanPRs(allPRs, Infinity);

    // Skip if no human PRs — update HEAD (nothing to announce)
    if (humanPRs.length === 0) {
      console.log(`[CHANGE] ${repoKey}: no human PRs to announce`);
      updateHead();
      continue;
    }

    // Resolve author display names
    await resolveNames(humanPRs, nameCache, lookupUser);

    // Resolve webhook URL
    const webhookUrl = resolveChangeWebhookUrl(repo.type, repo.cityGroupId);
    if (!webhookUrl) {
      console.log(`[CHANGE] No webhook configured for ${repoKey}, skipping`);
      updateHead();
      continue;
    }

    if (process.env.DRY_RUN === 'true') {
      console.log(`[DRY RUN] Change announcement for ${repoKey}: ${humanPRs.length} PR(s)`);
      continue;
    }

    // Send one message per PR — only update HEAD if all succeed
    let allSuccess = true;
    for (const pr of humanPRs) {
      const municipalityNames = getMunicipalityNames(pr.labels);
      const prefix = municipalityNames.length > 0
        ? municipalityNames.map((n) => `[${n}]`).join(' ') + ' '
        : '';
      const text = prefix + formatPRLine(pr);

      const coreSuccess = await sendChangeAnnouncement(webhookUrl, text);
      if (!coreSuccess) {
        allSuccess = false;
        break;
      }

      if (municipalityNames.length > 0) {
        const cityGroupIds = getMunicipalityCityGroups(pr.labels) ?? [];
        for (const cityGroupId of cityGroupIds) {
          const cityWebhookUrl = resolveChangeWebhookUrl('wrapper', cityGroupId);
          if (!cityWebhookUrl) continue;
          const citySuccess = await sendChangeAnnouncement(cityWebhookUrl, text);
          if (!citySuccess) {
            allSuccess = false;
            break;
          }
        }
        if (!allSuccess) break;
      }
    }
    if (allSuccess) {
      console.log(`[CHANGE] Announced ${humanPRs.length} PR(s) for ${repoKey}`);
      updateHead();
    } else {
      console.warn(`[CHANGE] Failed to announce ${repoKey}, will retry on next run`);
    }
  }

  // Persist updated heads
  if (process.env.DRY_RUN !== 'true') {
    writeRepoHeads(headsPath, updatedHeads);
  }
}
