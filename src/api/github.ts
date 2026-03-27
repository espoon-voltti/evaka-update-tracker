import axios, { AxiosInstance } from 'axios';
import { CommitInfo } from '../types.js';
import { withRetry } from '../utils/retry.js';

// ETag cache: url -> { etag, data }
const etagCache = new Map<string, { etag: string; data: unknown }>();

let client: AxiosInstance;

export function initGitHubClient(token: string) {
  client = axios.create({
    baseURL: 'https://api.github.com',
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
    timeout: 15000,
  });
}

async function ghGet<T>(url: string): Promise<T> {
  const cached = etagCache.get(url);
  const headers: Record<string, string> = {};
  if (cached) {
    headers['If-None-Match'] = cached.etag;
  }

  try {
    const response = await client.get<T>(url, { headers });
    const etag = response.headers['etag'];
    if (etag) {
      etagCache.set(url, { etag, data: response.data });
    }
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 304 && cached) {
      return cached.data as T;
    }
    throw error;
  }
}

export async function getCommit(
  owner: string,
  repo: string,
  sha: string
): Promise<CommitInfo> {
  return withRetry(async () => {
    const data = await ghGet<{
      sha: string;
      commit: { message: string; author: { date: string; name: string } };
      author?: { login: string };
    }>(`/repos/${owner}/${repo}/commits/${sha}`);

    return {
      sha: data.sha,
      shortSha: data.sha.slice(0, 7),
      message: data.commit.message.split('\n')[0],
      date: data.commit.author.date,
      author: data.author?.login ?? data.commit.author.name,
    };
  });
}

export async function getSubmoduleRef(
  owner: string,
  repo: string,
  path: string,
  ref: string
): Promise<string> {
  return withRetry(async () => {
    const data = await ghGet<{ type: string; sha: string }>(
      `/repos/${owner}/${repo}/contents/${path}?ref=${ref}`
    );
    if (data.type !== 'submodule') {
      throw new Error(`Expected submodule at ${path}, got ${data.type}`);
    }
    return data.sha;
  });
}

interface CompareResponse {
  commits: Array<{
    sha: string;
    commit: {
      message: string;
      author: { date: string; name: string };
    };
    author?: { login: string };
  }>;
}

export async function compareShas(
  owner: string,
  repo: string,
  base: string,
  head: string
): Promise<CompareResponse['commits']> {
  return withRetry(async () => {
    const data = await ghGet<CompareResponse>(
      `/repos/${owner}/${repo}/compare/${base}...${head}`
    );
    return data.commits;
  });
}

interface GitHubPR {
  number: number;
  title: string;
  user: { login: string };
  merged_at: string | null;
  html_url: string;
  labels: Array<{ name: string }>;
}

export async function getPullRequest(
  owner: string,
  repo: string,
  number: number
): Promise<GitHubPR> {
  return withRetry(async () => {
    return ghGet<GitHubPR>(`/repos/${owner}/${repo}/pulls/${number}`);
  });
}

export async function getFileContent(
  owner: string,
  repo: string,
  path: string,
  ref?: string
): Promise<string> {
  return withRetry(async () => {
    const url = ref
      ? `/repos/${owner}/${repo}/contents/${path}?ref=${ref}`
      : `/repos/${owner}/${repo}/contents/${path}`;
    const data = await ghGet<{ content: string; encoding: string }>(url);
    return Buffer.from(data.content, 'base64').toString('utf-8');
  });
}

interface GitHubUser {
  login: string;
  name: string | null;
}

export async function getUser(username: string): Promise<string | null> {
  return withRetry(async () => {
    const data = await ghGet<GitHubUser>(`/users/${username}`);
    return data.name;
  });
}

interface BranchWhereHead {
  name: string;
  commit: { sha: string };
  protected: boolean;
}

export async function getBranchesWhereHead(
  owner: string,
  repo: string,
  sha: string
): Promise<string[]> {
  return withRetry(async () => {
    const data = await ghGet<BranchWhereHead[]>(
      `/repos/${owner}/${repo}/commits/${sha}/branches-where-head`
    );
    return data.map((b) => b.name);
  });
}

export async function isCommitOnDefaultBranch(
  owner: string,
  repo: string,
  defaultBranch: string,
  commitSha: string
): Promise<{ onDefaultBranch: boolean; branchName: string | null }> {
  try {
    // Compare default branch against the deployed commit.
    // If there are commits in commitSha not in defaultBranch, the commit is off the default branch.
    const aheadCommits = await compareShas(owner, repo, defaultBranch, commitSha);
    if (aheadCommits.length === 0) {
      return { onDefaultBranch: true, branchName: null };
    }

    // Commit is not on default branch — try to find the branch name
    let branchName: string | null = null;
    try {
      const branches = await getBranchesWhereHead(owner, repo, commitSha);
      const nonDefault = branches.filter((b) => b !== defaultBranch);
      if (nonDefault.length === 1) {
        branchName = nonDefault[0];
      } else if (nonDefault.length > 1) {
        branchName = nonDefault[0]; // Use first non-default branch
      }
    } catch {
      // Branch name lookup failed — proceed without it
    }

    return { onDefaultBranch: false, branchName };
  } catch {
    // On API error, assume default branch (safe fallback — no false positives)
    return { onDefaultBranch: true, branchName: null };
  }
}

// Patterns: "Merge pull request #123 from ..." or "Title (#123)"
const MERGE_PR_PATTERN = /Merge pull request #(\d+) from/;
const SQUASH_PR_PATTERN = /\(#(\d+)\)$/;

export function extractPRNumberFromCommitMessage(message: string): number | null {
  const firstLine = message.split('\n')[0];
  const mergeMatch = firstLine.match(MERGE_PR_PATTERN);
  if (mergeMatch) return parseInt(mergeMatch[1], 10);

  const squashMatch = firstLine.match(SQUASH_PR_PATTERN);
  if (squashMatch) return parseInt(squashMatch[1], 10);

  return null;
}
