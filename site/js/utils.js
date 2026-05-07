export function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
