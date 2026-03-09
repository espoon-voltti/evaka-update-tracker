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
 * Formats a list of PRs into a minimal Slack mrkdwn message.
 * One line per PR: <PR_URL|#NUMBER> TITLE — AUTHOR
 */
export function buildChangeAnnouncement(prs: PullRequest[]): string {
  return prs
    .map((pr) => `<${pr.url}|#${pr.number}> ${pr.title} \u2014 ${pr.author}`)
    .join('\n');
}

/**
 * Sends a plain-text change announcement to a Slack webhook.
 * Never throws — logs warnings on failure.
 */
async function sendChangeAnnouncement(webhookUrl: string, text: string): Promise<void> {
  try {
    await axios.post(webhookUrl, { text }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 404 || status === 410) {
        console.warn(`[CHANGE] Webhook appears disabled (${status}). Skipping.`);
        return;
      }
    }
    console.warn('[CHANGE] Failed to send announcement:', error);
  }
}

/**
 * Main orchestrator: detects repo HEAD changes, collects PRs, sends announcements.
 */
export async function announceChanges(
  cityGroups: CityGroup[],
  dataDir: string
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

    // Update HEAD regardless of whether we announce
    updatedHeads.repos[repoKey] = {
      sha: currentHead,
      branch: repo.defaultBranch,
    };

    // First run for this repo: store HEAD without announcing
    if (!previousSha) {
      console.log(`[CHANGE] First run for ${repoKey}, storing HEAD ${currentHead.slice(0, 7)}`);
      continue;
    }

    // No change
    if (currentHead === previousSha) {
      continue;
    }

    console.log(`[CHANGE] ${repoKey}: ${previousSha.slice(0, 7)} → ${currentHead.slice(0, 7)}`);

    // Collect PRs between old and new HEAD
    const repoConfig = { owner: repo.owner, name: repo.name, type: repo.type, submodulePath: null, defaultBranch: repo.defaultBranch };
    const allPRs = await collectPRsBetween(repoConfig, previousSha, currentHead);
    const humanPRs = filterHumanPRs(allPRs, Infinity);

    // Skip if no human PRs
    if (humanPRs.length === 0) {
      console.log(`[CHANGE] ${repoKey}: no human PRs to announce`);
      continue;
    }

    // Resolve webhook URL
    const webhookUrl = resolveChangeWebhookUrl(repo.type, repo.cityGroupId);
    if (!webhookUrl) {
      console.log(`[CHANGE] No webhook configured for ${repoKey}, skipping`);
      continue;
    }

    if (process.env.DRY_RUN === 'true') {
      console.log(`[DRY RUN] Change announcement for ${repoKey}: ${humanPRs.length} PR(s)`);
      continue;
    }

    // Send announcement
    const text = buildChangeAnnouncement(humanPRs);
    await sendChangeAnnouncement(webhookUrl, text);
    console.log(`[CHANGE] Announced ${humanPRs.length} PR(s) for ${repoKey}`);
  }

  // Persist updated heads
  if (process.env.DRY_RUN !== 'true') {
    writeRepoHeads(headsPath, updatedHeads);
  }
}
