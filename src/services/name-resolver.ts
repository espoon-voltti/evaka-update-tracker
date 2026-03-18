import * as fs from 'fs';
import { PullRequest } from '../types.js';

export type UserNameCache = Record<string, string | null>;

export function loadNameCache(filePath: string): UserNameCache {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as UserNameCache;
  } catch {
    return {};
  }
}

export function saveNameCache(filePath: string, cache: UserNameCache): void {
  fs.writeFileSync(filePath, JSON.stringify(cache, null, 2));
}

/**
 * Resolves authorName for each PR using the cache and a getUser lookup function.
 * - Bot PRs are skipped (authorName stays null).
 * - Cached entries (including null = "no profile name") are reused.
 * - Uncached authors trigger a getUser() call; results are stored in the cache.
 * - On lookup failure, authorName is left null and no cache entry is written
 *   (so the lookup is retried on the next run).
 */
export async function resolveNames(
  prs: PullRequest[],
  cache: UserNameCache,
  getUser: (username: string) => Promise<string | null>
): Promise<void> {
  for (const pr of prs) {
    if (pr.isHidden) {
      continue;
    }

    if (pr.author in cache) {
      pr.authorName = cache[pr.author];
      continue;
    }

    try {
      const name = await getUser(pr.author);
      cache[pr.author] = name;
      pr.authorName = name;
    } catch (error) {
      console.warn(`[NAME] Failed to resolve name for ${pr.author}:`, error);
    }
  }
}
