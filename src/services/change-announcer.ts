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

const FINNISH_WEEKDAYS = ['su', 'ma', 'ti', 'ke', 'to', 'pe', 'la'];
const DELAY_THRESHOLD_MS = 20 * 60 * 1000; // 20 minutes

/**
 * Formats a Date as a Finnish-locale timestamp in Europe/Helsinki timezone.
 * Example: "pe 6.3. klo 09.28"
 */
export function formatFinnishTimestamp(date: Date): string {
  const helsinkiDate = new Date(date.toLocaleString('en-US', { timeZone: 'Europe/Helsinki' }));
  const weekday = FINNISH_WEEKDAYS[helsinkiDate.getDay()];
  const day = helsinkiDate.getDate();
  const month = helsinkiDate.getMonth() + 1;
  const hour = String(helsinkiDate.getHours()).padStart(2, '0');
  const minute = String(helsinkiDate.getMinutes()).padStart(2, '0');

  return `${weekday} ${day}.${month}. klo ${hour}.${minute}`;
}

/**
 * Formats a list of PRs into a minimal Slack mrkdwn message.
 * One line per PR: <PR_URL|#NUMBER> TITLE — AUTHOR
 * PRs merged more than 20 minutes ago include a Finnish timestamp.
 */
export function buildChangeAnnouncement(prs: PullRequest[], now?: Date): string {
  const currentTime = now ?? new Date();
  return prs
    .map((pr) => {
      const mergedAt = new Date(pr.mergedAt);
      const ageMs = currentTime.getTime() - mergedAt.getTime();
      const base = `<${pr.url}|#${pr.number}> ${pr.title} \u2014 ${pr.author}`;
      if (ageMs > DELAY_THRESHOLD_MS) {
        return `${base} \u2014 ${formatFinnishTimestamp(mergedAt)}`;
      }
      return base;
    })
    .join('\n');
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

    const updateHead = () => {
      updatedHeads.repos[repoKey] = {
        sha: currentHead,
        branch: repo.defaultBranch,
      };
    };

    // First run for this repo: store HEAD without announcing
    if (!previousSha) {
      console.log(`[CHANGE] First run for ${repoKey}, storing HEAD ${currentHead.slice(0, 7)}`);
      updateHead();
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

    // Skip if no human PRs — update HEAD (nothing to announce)
    if (humanPRs.length === 0) {
      console.log(`[CHANGE] ${repoKey}: no human PRs to announce`);
      updateHead();
      continue;
    }

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

    // Send announcement — only update HEAD on success
    const text = buildChangeAnnouncement(humanPRs);
    const success = await sendChangeAnnouncement(webhookUrl, text);
    if (success) {
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
