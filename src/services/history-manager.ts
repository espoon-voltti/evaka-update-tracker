import * as fs from 'fs';
import { HistoryData, DeploymentEvent, PullRequest, Repository } from '../types.js';

const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

export function readHistory(filePath: string): HistoryData {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as HistoryData;
  } catch {
    return { events: [] };
  }
}

export function appendEvents(
  history: HistoryData,
  newEvents: DeploymentEvent[]
): HistoryData {
  return {
    events: [...newEvents, ...history.events],
  };
}

export function pruneOldEvents(history: HistoryData): HistoryData {
  const cutoff = new Date(Date.now() - ONE_MONTH_MS).toISOString();
  return {
    events: history.events.filter((e) => e.detectedAt >= cutoff),
  };
}

export function writeHistory(filePath: string, history: HistoryData): void {
  fs.writeFileSync(filePath, JSON.stringify(history, null, 2));
}

type BranchDetectionFn = (
  owner: string,
  repo: string,
  defaultBranch: string,
  commitSha: string
) => Promise<{ onDefaultBranch: boolean; branchName: string | null }>;

export async function backfillBranchInfo(
  history: HistoryData,
  detectBranch: BranchDetectionFn,
  repositories: Repository[]
): Promise<number> {
  let updated = 0;

  for (const event of history.events) {
    // Skip events that already have branch info
    if (event.isDefaultBranch !== undefined) continue;

    // Only backfill staging events (production is always default branch)
    if (event.environmentId.includes('prod')) {
      event.isDefaultBranch = true;
      updated++;
      continue;
    }

    // Find the matching repository for this event
    const repo = repositories.find((r) => r.type === event.repoType);
    if (!repo || !event.newCommit?.sha) continue;

    try {
      const result = await detectBranch(repo.owner, repo.name, repo.defaultBranch, event.newCommit.sha);
      event.isDefaultBranch = result.onDefaultBranch;
      if (result.branchName) {
        event.branch = result.branchName;
      }
      updated++;
    } catch {
      // Skip events where detection fails — leave them as undefined
    }
  }

  return updated;
}

/**
 * Backfill PRs for history events where staging transitioned from a branch
 * deployment back to the default branch with 0 PRs.
 *
 * When staging goes branch → default, the pipeline compared branch_sha...master_sha
 * which gave empty/misleading results. The correct comparison is
 * last_default_sha...current_default_sha (i.e. the last default-branch staging
 * event before the branch deployment).
 */
type CollectPRsFn = (
  repo: Repository,
  baseSha: string,
  headSha: string
) => Promise<PullRequest[]>;

export async function backfillBranchTransitionPRs(
  history: HistoryData,
  collectPRsBetween: CollectPRsFn,
  repositories: Repository[]
): Promise<number> {
  let updated = 0;

  // Group events by environmentId, preserving chronological order (newest first)
  const byEnv = new Map<string, DeploymentEvent[]>();
  for (const event of history.events) {
    const list = byEnv.get(event.environmentId) ?? [];
    list.push(event);
    byEnv.set(event.environmentId, list);
  }

  for (const [, events] of byEnv) {
    for (let i = 0; i < events.length; i++) {
      const event = events[i];

      // Look for: default-branch event with 0 PRs, preceded by a branch event
      if (
        event.isDefaultBranch !== true ||
        event.includedPRs.length > 0 ||
        !event.newCommit?.sha
      ) continue;

      // Check if the previous event (i+1, since newest first) was a branch deployment
      const prevEvent = events[i + 1];
      if (!prevEvent || prevEvent.isDefaultBranch !== false) continue;

      // Find the last default-branch event before the branch deployment
      let baseEvent: DeploymentEvent | undefined;
      for (let j = i + 2; j < events.length; j++) {
        if (events[j].isDefaultBranch === true && events[j].newCommit?.sha) {
          baseEvent = events[j];
          break;
        }
      }
      if (!baseEvent) continue;

      // Don't re-collect if base and head are the same
      if (baseEvent.newCommit.sha === event.newCommit.sha) continue;

      const repo = repositories.find((r) => r.type === event.repoType);
      if (!repo) continue;

      try {
        const prs = await collectPRsBetween(repo, baseEvent.newCommit.sha, event.newCommit.sha);
        if (prs.length > 0) {
          event.includedPRs = prs;
          updated++;
        }
      } catch {
        // Skip on error
      }
    }
  }

  return updated;
}
