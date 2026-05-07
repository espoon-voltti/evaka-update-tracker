/**
 * Render environment status indicator.
 * Accepts a VersionSnapshot object.
 */

import { escapeHtml } from '../utils.js';

export function renderStatusBadge(version, { detectedAt = null, latestPRTitle = null, nonVisibleCommitCount = 0 } = {}) {
  if (!version) {
    return '<span class="status-badge"><span class="status-dot unavailable"></span>Ei tietoja</span>';
  }

  const dot = `<span class="status-dot ${version.status}"></span>`;
  const statusText = {
    ok: 'ok',
    unavailable: 'ei saatavilla',
    'auth-error': 'tunnistautumisvirhe',
  }[version.status] || version.status;

  if (version.status !== 'ok') {
    return `<span class="status-badge">${dot} ${statusText}</span>`;
  }

  const commit = version.coreCommit || version.wrapperCommit;
  if (!commit) {
    return `<span class="status-badge">${dot} ${statusText}</span>`;
  }

  const repoPath = version.coreCommit
    ? 'espoon-voltti/evaka'
    : guessRepoPath(version.instanceDomain, 'wrapper');

  const commitUrl = `https://github.com/${repoPath}/commit/${commit.sha}`;
  const displayTime = formatTime(detectedAt || version.checkedAt);

  const linkText = latestPRTitle
    ? `<span class="pr-description">${escapeHtml(latestPRTitle)}</span>`
    : commit.shortSha;

  const newerBadge = nonVisibleCommitCount > 0
    ? `<span class="newer-commit-sha" title="Uudempi versio, ei näkyviä muutoksia tälle kaupungille">+${nonVisibleCommitCount}</span>`
    : '';

  return `
    <span class="status-badge">
      ${dot}
      <a class="commit-link" href="${commitUrl}" target="_blank" rel="noopener">${linkText}</a>
      ${newerBadge}
      <span class="checked-at">${displayTime}</span>
    </span>
  `;
}

function guessRepoPath(domain, type) {
  if (domain.includes('tampere') || domain.includes('hameenkyro') ||
      domain.includes('kangasala') || domain.includes('lempaala') ||
      domain.includes('nokia') || domain.includes('orivesi') ||
      domain.includes('pirkkala') || domain.includes('vesilahti') ||
      domain.includes('ylojarvi')) {
    return type === 'wrapper' ? 'Tampere/trevaka' : 'espoon-voltti/evaka';
  }
  if (domain.includes('ouka')) {
    return type === 'wrapper' ? 'Oulunkaupunki/evakaoulu' : 'espoon-voltti/evaka';
  }
  if (domain.includes('turku')) {
    return type === 'wrapper' ? 'City-of-Turku/evakaturku' : 'espoon-voltti/evaka';
  }
  return 'espoon-voltti/evaka';
}

export function formatTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  const weekday = d.toLocaleDateString('fi', { weekday: 'short' });
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const hours = d.toLocaleTimeString('fi', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${weekday} ${day}.${month}. klo ${hours}`;
}
