/**
 * History view: deployment releases for a city, grouped by detection time.
 * Events with the same detectedAt form a single release (core + wrapper).
 * Production releases shown first, then staging.
 */

import { renderPRList } from './pr-list.js';
import { formatTime } from './status-badge.js';
import { navigate, getQueryParam, setQueryParam } from '../router.js';

/**
 * Group events into releases: events sharing the same detectedAt + env type
 * represent a single deployment (core + wrapper deployed together).
 */
function groupIntoReleases(events) {
  const map = new Map();
  for (const event of events) {
    const isProd = event.environmentId.includes('prod');
    const key = event.detectedAt + '|' + (isProd ? 'production' : 'staging');
    if (!map.has(key)) {
      map.set(key, {
        detectedAt: event.detectedAt,
        envType: isProd ? 'production' : 'staging',
        events: [],
      });
    }
    map.get(key).events.push(event);
  }
  return [...map.values()];
}

/**
 * Check if a release has any non-bot PRs across all its events.
 */
function releaseHasNonBotPRs(release) {
  return release.events.some((e) =>
    (e.includedPRs || []).some((pr) => !pr.isHidden)
  );
}

/**
 * Check if a release has any PRs at all.
 */
function releaseHasPRs(release) {
  return release.events.some((e) => e.includedPRs && e.includedPRs.length > 0);
}

/**
 * Derive a GitHub commit URL from a deployment event.
 * Mirrors the logic in src/api/slack.ts getCommitUrl().
 */
function getCommitUrl(event) {
  if (event.repoType === 'core') {
    return `https://github.com/espoon-voltti/evaka/commit/${event.newCommit.sha}`;
  }
  const wrapperPR = (event.includedPRs || []).find((pr) => pr.repoType === 'wrapper');
  const repoPath = wrapperPR?.repository ?? `${event.cityGroupId}/evaka-wrapper`;
  return `https://github.com/${repoPath}/commit/${event.newCommit.sha}`;
}

const repoTypeLabels = { core: 'ydin', wrapper: 'Kuntaimplementaatio' };

export function renderHistoryView(city, historyData, { showBots = false } = {}) {
  const allEvents = (historyData?.events || [])
    .filter((e) => e.cityGroupId === city.id)
    .sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime());

  const allReleases = groupIntoReleases(allEvents);

  // Bot filtering: hide releases where ALL PRs are bot-generated (releases with 0 PRs always shown)
  const releases = showBots
    ? allReleases
    : allReleases.filter((r) => !releaseHasPRs(r) || releaseHasNonBotPRs(r));

  const backLink = `<a class="nav-link" data-action="back-to-city">&larr; ${escapeHtml(city.name)}</a>`;
  const toggleActive = showBots ? ' active' : '';
  const botToggle = `<button class="bot-toggle${toggleActive}" id="bot-toggle">Näytä riippuvuuspäivitykset</button>`;

  if (allReleases.length === 0) {
    return `
      <div class="city-detail">
        <h2>${escapeHtml(city.name)} — Muutoshistoria</h2>
        <div class="nav-links">${backLink}</div>
        <div class="empty-state">Ei tallennettuja muutoksia</div>
      </div>
    `;
  }

  if (releases.length === 0) {
    return `
      <div class="city-detail">
        <h2>${escapeHtml(city.name)} — Muutoshistoria</h2>
        <div class="nav-links">${backLink}</div>
        ${botToggle}
        <div class="empty-state">Vain automaattisia muutoksia. Näytä kaikki muutokset painamalla "Näytä riippuvuuspäivitykset".</div>
      </div>
    `;
  }

  // Split into production and staging, each sorted newest first
  const prodReleases = releases
    .filter((r) => r.envType === 'production')
    .sort((a, b) => new Date(b.detectedAt) - new Date(a.detectedAt));
  const stagingReleases = releases
    .filter((r) => r.envType === 'staging')
    .sort((a, b) => new Date(b.detectedAt) - new Date(a.detectedAt));

  let sections = '';
  if (prodReleases.length > 0) {
    sections += renderEnvSection('Tuotanto', prodReleases, showBots);
  }
  if (stagingReleases.length > 0) {
    sections += renderEnvSection('Testaus', stagingReleases, showBots);
  }

  return `
    <div class="city-detail">
      <h2>${escapeHtml(city.name)} — Muutoshistoria</h2>
      <div class="nav-links">${backLink}</div>
      ${botToggle}
      ${sections}
    </div>
  `;
}

function renderEnvSection(label, releases, showBots) {
  const cssClass = label === 'Tuotanto' ? 'production' : 'staging';
  const items = releases.map((release) => renderRelease(release, showBots)).join('');
  return `
    <div class="history-env-section">
      <details open>
        <summary class="history-env-heading ${cssClass}">${label}</summary>
        <ul class="history-list">${items}</ul>
      </details>
    </div>
  `;
}

function renderRelease(release, showBots) {
  const timestamp = formatTime(release.detectedAt);
  const envClass = release.envType;

  // Build commit links from all events in this release
  let commitInfo = '';
  if (release.events.length > 0) {
    const commitParts = release.events.map((event) => {
      const url = getCommitUrl(event);
      const shortSha = event.newCommit?.shortSha ?? event.newCommit?.sha?.slice(0, 7);
      if (!shortSha) return '';
      const link = `<a href="${escapeHtml(url)}" class="history-commit-link" target="_blank" rel="noopener">${escapeHtml(shortSha)}</a>`;
      if (release.events.length > 1) {
        const label = repoTypeLabels[event.repoType] || event.repoType;
        return `${escapeHtml(label)}: ${link}`;
      }
      return link;
    }).filter(Boolean);
    if (commitParts.length > 0) {
      commitInfo = `<span class="history-commit-info">${commitParts.join(', ')}</span>`;
    }
  }

  // Branch badge for non-default branch staging deployments
  let branchBadge = '';
  if (release.envType === 'staging') {
    const branchEvent = release.events.find((e) => e.isDefaultBranch === false);
    if (branchEvent) {
      const branchText = branchEvent.branch
        ? escapeHtml(branchEvent.branch)
        : 'ei pääkehityshaarassa';
      branchBadge = `<span class="branch-badge">${branchText}</span>`;
    }
  }

  // Collect PRs by repo type across all events in this release
  const corePRs = [];
  const wrapperPRs = [];
  for (const event of release.events) {
    for (const pr of (event.includedPRs || [])) {
      if (pr.repoType === 'wrapper') {
        wrapperPRs.push(pr);
      } else {
        corePRs.push(pr);
      }
    }
  }

  // Render PR sub-sections: core with labels, wrapper without
  let prSections = '';
  if (corePRs.length > 0) {
    prSections += `
      <div class="pr-track">
        <div class="pr-track-header">Ydin</div>
        ${renderPRList(corePRs, { showBots })}
      </div>
    `;
  }
  if (wrapperPRs.length > 0) {
    prSections += `
      <div class="pr-track">
        <div class="pr-track-header">Kuntaimplementaatio</div>
        ${renderPRList(wrapperPRs, { showBots, showLabels: false })}
      </div>
    `;
  }
  if (!prSections) {
    // Show commit message as fallback when no PR data is available
    const commitDescs = release.events
      .filter((e) => e.newCommit?.message)
      .map((e) => {
        const msg = e.newCommit.message;
        const label = release.events.length > 1 ? (repoTypeLabels[e.repoType] || e.repoType) + ': ' : '';
        return `<div class="history-commit-desc">${escapeHtml(label)}${escapeHtml(msg)}</div>`;
      });
    prSections = commitDescs.length > 0
      ? commitDescs.join('')
      : '<div class="empty-state">PR-tietoja ei saatavilla</div>';
  }

  return `
    <li class="history-event ${envClass}">
      <div class="history-event-header">
        <span class="history-timestamp">${timestamp}</span>
        ${commitInfo}
        ${branchBadge}
      </div>
      ${prSections}
    </li>
  `;
}

export function bindHistoryViewEvents(city) {
  document.querySelectorAll('[data-action="back-to-city"]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(`/city/${city.id}`);
    });
  });

  const toggle = document.getElementById('bot-toggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      const current = getQueryParam('showBots') === 'true';
      setQueryParam('showBots', current ? null : 'true');
    });
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
