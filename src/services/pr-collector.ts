import { PullRequest, Repository } from '../types.js';
import {
  compareShas,
  extractPRNumberFromCommitMessage,
  getPullRequest,
} from '../api/github.js';
import { isBotPR } from '../utils/pr-classifier.js';

const MAX_PRS_PER_TRACK = 5;

export interface PRCollectionResult {
  deployed: PullRequest[];
  inStaging: PullRequest[];
  pendingDeployment: PullRequest[];
}

async function extractPRsFromCommits(
  repo: Repository,
  commits: Array<{
    sha: string;
    commit: { message: string; author: { date: string; name: string } };
    author?: { login: string };
  }>
): Promise<PullRequest[]> {
  const prNumbers = new Set<number>();
  const prs: PullRequest[] = [];

  for (const commit of commits) {
    const prNumber = extractPRNumberFromCommitMessage(commit.commit.message);
    if (prNumber === null || prNumbers.has(prNumber)) continue;
    prNumbers.add(prNumber);

    try {
      const ghPR = await getPullRequest(repo.owner, repo.name, prNumber);
      if (!ghPR.merged_at) continue;

      prs.push({
        number: ghPR.number,
        title: ghPR.title,
        author: ghPR.user.login,
        authorName: null,
        mergedAt: ghPR.merged_at,
        repository: `${repo.owner}/${repo.name}`,
        repoType: repo.type,
        isBot: isBotPR(ghPR.user.login, ghPR.title),
        url: ghPR.html_url,
        labels: (ghPR.labels || []).map((l) => l.name),
      });
    } catch {
      // Skip PRs that can't be fetched
    }
  }

  // Sort by merge date descending
  prs.sort((a, b) => new Date(b.mergedAt).getTime() - new Date(a.mergedAt).getTime());
  return prs;
}

export async function collectPRsBetween(
  repo: Repository,
  baseSha: string,
  headSha: string
): Promise<PullRequest[]> {
  try {
    const commits = await compareShas(repo.owner, repo.name, baseSha, headSha);
    return extractPRsFromCommits(repo, commits);
  } catch {
    return [];
  }
}

export async function collectPendingPRs(
  repo: Repository,
  deployedSha: string
): Promise<PullRequest[]> {
  try {
    const commits = await compareShas(
      repo.owner,
      repo.name,
      deployedSha,
      repo.defaultBranch
    );
    return extractPRsFromCommits(repo, commits);
  } catch {
    return [];
  }
}

export function filterHumanPRs(prs: PullRequest[], limit: number = MAX_PRS_PER_TRACK): PullRequest[] {
  return prs.filter((pr) => !pr.isBot).slice(0, limit);
}

export function buildPRTrack(
  allDeployed: PullRequest[],
  allInStaging: PullRequest[],
  allPending: PullRequest[]
): PRCollectionResult {
  return {
    deployed: filterHumanPRs(allDeployed),
    inStaging: filterHumanPRs(allInStaging),
    pendingDeployment: filterHumanPRs(allPending),
  };
}
