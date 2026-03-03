/**
 * Render environment status indicator.
 * Accepts a VersionSnapshot object.
 */

export function renderStatusBadge(version, { detectedAt = null } = {}) {
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

  const repoPath = version.wrapperCommit
    ? guessRepoPath(version.instanceDomain, 'wrapper')
    : 'espoon-voltti/evaka';

  const commitUrl = `https://github.com/${repoPath}/commit/${commit.sha}`;
  const displayTime = formatTime(detectedAt || version.checkedAt);

  return `
    <span class="status-badge">
      ${dot}
      <a class="commit-link" href="${commitUrl}" target="_blank" rel="noopener">${commit.shortSha}</a>
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

function formatTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleString('fi', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
    hour12: false,
  });
}
