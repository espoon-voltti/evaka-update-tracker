/**
 * Render a list of PullRequest objects.
 * Filters out bot PRs by default (showBots=false).
 */

export function renderPRList(prs, { showBots = false, showStatus = false, showRepoLabel = false, limit = 0 } = {}) {
  if (!prs || prs.length === 0) {
    return '<div class="empty-state">Ei viimeaikaisia PR:iä</div>';
  }

  let filtered = showBots ? prs : prs.filter((pr) => !pr.isBot);
  if (filtered.length === 0) {
    return '<div class="empty-state">Ei viimeaikaisia manuaalisia PR:iä</div>';
  }

  if (limit > 0) {
    filtered = filtered.slice(0, limit);
  }

  const items = filtered.map((pr) => {
    const botClass = pr.isBot ? ' bot' : '';
    const botLabel = pr.isBot ? '<span class="bot-label">automaatio</span>' : '';
    const repoLabel = showRepoLabel && pr.repoType
      ? `<span class="repo-label">[${pr.repoType}]</span>`
      : '';
    const statusBadge = showStatus ? renderDeployBadge(pr._status) : '';
    const date = formatDate(pr.mergedAt);

    return `
      <li class="pr-item${botClass}">
        <a class="pr-number" href="${pr.url}" target="_blank" rel="noopener">#${pr.number}</a>
        ${repoLabel}
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
    'merged': 'yhdistetty',
    'in-staging': 'testauksessa',
    'in-production': 'tuotannossa',
  };
  return `<span class="deploy-badge ${status}">${labels[status] || status}</span>`;
}

function formatDate(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleDateString('fi', { month: 'short', day: 'numeric' });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
