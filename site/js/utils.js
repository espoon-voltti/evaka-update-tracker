export function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Append a cache-busting `?t=<Date.now()>` query parameter to `url`.
 * Used for fetches that need to bypass the browser HTTP cache (e.g. polled
 * data files where stale responses would defeat auto-refresh).
 */
export function cacheBustUrl(url) {
  return `${url}?t=${Date.now()}`;
}

/**
 * Format an ISO date string as Finnish short date "D.M." (no zero padding).
 * Returns '' for nullish/empty input.
 */
export function formatDate(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return `${d.getDate()}.${d.getMonth() + 1}.`;
}

/**
 * Format an ISO date string as Finnish short weekday + date + time:
 * "pe 13.3. klo 14:30". Returns '' for nullish/empty input.
 */
export function formatTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  const weekday = d.toLocaleDateString('fi', { weekday: 'short' });
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const hours = d.toLocaleTimeString('fi', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${weekday} ${day}.${month}. klo ${hours}`;
}

/**
 * Find branch deployment info for the latest staging event of `city`.
 * Returns { isBranch: true, branchName } when the most recent staging
 * event for the city is a non-default-branch deployment; otherwise null.
 */
export function findStagingBranchInfo(historyEvents, city) {
  const stagingEnvIds = city.environments
    .filter((e) => e.type === 'staging')
    .map((e) => e.id);
  if (stagingEnvIds.length === 0) return null;

  const latestEvent = historyEvents
    .filter((e) => e.cityGroupId === city.id && stagingEnvIds.includes(e.environmentId))
    .sort((a, b) => new Date(b.detectedAt) - new Date(a.detectedAt))[0];

  if (latestEvent && latestEvent.isDefaultBranch === false) {
    return { isBranch: true, branchName: latestEvent.branch || null };
  }
  return null;
}

/**
 * Count how many of the most recent staging changes have no visible PR for
 * this city — i.e. how far staging has advanced past the last city-relevant
 * change. Walks the per-PR timeline (newest first) rather than deployment
 * events, so the result is independent of how commits were batched into poll
 * cycles. An event that recorded a commit move with no PRs counts as one
 * non-visible change.
 */
export function countNonVisibleStagingCommits(historyEvents, city) {
  const stagingEnvIds = city.environments
    .filter((e) => e.type === 'staging')
    .map((e) => e.id);
  if (stagingEnvIds.length === 0) return 0;

  // One timeline entry per PR, plus a synthetic entry for any event that
  // recorded a bare commit move (no PRs — e.g. a city-irrelevant commit).
  const entries = [];
  for (const event of historyEvents) {
    if (event.cityGroupId !== city.id || !stagingEnvIds.includes(event.environmentId)) {
      continue;
    }
    // Branch deployments are a separate concern (shown via the branch badge)
    // and their PR lists aren't comparable — never count them as non-visible.
    if (event.isDefaultBranch === false) continue;
    const prs = event.includedPRs || [];
    if (prs.length === 0) {
      entries.push({ ts: event.newCommit?.date || event.detectedAt, hidden: true });
    } else {
      for (const pr of prs) {
        entries.push({ ts: pr.mergedAt || event.detectedAt, hidden: !!pr.isHidden });
      }
    }
  }

  entries.sort((a, b) => new Date(b.ts) - new Date(a.ts));

  let count = 0;
  for (const entry of entries) {
    if (!entry.hidden) break;
    count++;
  }
  return count;
}
