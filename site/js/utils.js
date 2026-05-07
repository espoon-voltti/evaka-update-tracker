export function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
