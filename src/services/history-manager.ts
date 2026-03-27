import * as fs from 'fs';
import { HistoryData, DeploymentEvent, Repository } from '../types.js';

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
