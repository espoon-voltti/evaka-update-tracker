/**
 * History view: deployment events for a city, chronological (newest first).
 */

import { navigate } from '../router.js';

export function renderHistoryView(city, historyData) {
  const events = (historyData?.events || [])
    .filter((e) => e.cityGroupId === city.id)
    .sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime());

  const backLink = `<a class="nav-link" data-action="back-to-city">Back to ${escapeHtml(city.name)}</a>`;

  if (events.length === 0) {
    return `
      <div class="city-detail">
        <h2>${escapeHtml(city.name)} — Deployment History</h2>
        <div class="nav-links">${backLink}</div>
        <div class="empty-state">No deployment events recorded yet</div>
      </div>
    `;
  }

  const eventItems = events.map((event) => {
    const timestamp = formatTimestamp(event.detectedAt);
    const envLabel = event.environmentId.includes('prod') ? 'Production' : 'Staging';
    const repoLabel = event.repoType;

    const prevSha = event.previousCommit
      ? `<span class="history-version">${event.previousCommit.shortSha}</span>`
      : '<span class="history-version">initial</span>';
    const newSha = `<span class="history-version">${event.newCommit.shortSha}</span>`;

    const prList = event.includedPRs && event.includedPRs.length > 0
      ? `<details class="history-prs">
          <summary>${event.includedPRs.length} PR(s) included</summary>
          <ul class="pr-list">
            ${event.includedPRs.map((pr) => `
              <li class="pr-item">
                <a class="pr-number" href="${pr.url}" target="_blank" rel="noopener">#${pr.number}</a>
                <span class="pr-title">${escapeHtml(pr.title)}</span>
                <span class="pr-author">${escapeHtml(pr.author)}</span>
              </li>
            `).join('')}
          </ul>
        </details>`
      : '<div class="history-prs"><em>No PR details available</em></div>';

    return `
      <li class="history-event">
        <div class="history-event-header">
          <span class="env-label">${envLabel}</span>
          <span class="bot-label">${repoLabel}</span>
          <span class="history-timestamp">${timestamp}</span>
        </div>
        <div>
          ${prevSha}
          <span class="history-arrow">&rarr;</span>
          ${newSha}
        </div>
        ${prList}
      </li>
    `;
  });

  // Bind back link after render
  setTimeout(() => {
    document.querySelectorAll('[data-action="back-to-city"]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        navigate(`/city/${city.id}`);
      });
    });
  }, 0);

  return `
    <div class="city-detail">
      <h2>${escapeHtml(city.name)} — Deployment History</h2>
      <div class="nav-links">${backLink}</div>
      <ul class="history-list">${eventItems.join('')}</ul>
    </div>
  `;
}

function formatTimestamp(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleString('en-GB', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
    hour12: false,
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
