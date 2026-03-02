/**
 * Render a list of PullRequest objects.
 * Filters out bot PRs by default (showBots=false).
 */

export function renderPRList(prs, { showBots = false, showStatus = false } = {}) {
  if (!prs || prs.length === 0) {
    return '<div class="empty-state">No recent PRs</div>';
  }

  const filtered = showBots ? prs : prs.filter((pr) => !pr.isBot);
  if (filtered.length === 0) {
    return '<div class="empty-state">No recent human PRs</div>';
  }

  const items = filtered.map((pr) => {
    const botClass = pr.isBot ? ' bot' : '';
    const botLabel = pr.isBot ? '<span class="bot-label">bot</span>' : '';
    const statusBadge = showStatus ? renderDeployBadge(pr._status) : '';
    const date = formatDate(pr.mergedAt);

    return `
      <li class="pr-item${botClass}">
        <a class="pr-number" href="${pr.url}" target="_blank" rel="noopener">#${pr.number}</a>
        <span class="pr-title">${escapeHtml(pr.title)}</span>
        ${botLabel}
        ${statusBadge}
        <span class="pr-author">${escapeHtml(pr.author)}</span>
        <span class="pr-date">${date}</span>
      </li>
    `;
  });

  return `<ul class="pr-list">${items.join('')}</ul>`;
}

function renderDeployBadge(status) {
  if (!status) return '';
  const labels = {
    'merged': 'merged',
    'in-staging': 'staging',
    'in-production': 'production',
  };
  return `<span class="deploy-badge ${status}">${labels[status] || status}</span>`;
}

function formatDate(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
