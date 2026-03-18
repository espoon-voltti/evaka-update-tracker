/**
 * Overview component: renders all 4 city groups as cards.
 */

import { renderStatusBadge } from './status-badge.js';
import { navigate, getQueryParam, setQueryParam } from '../router.js';

export function renderOverview(data, historyEvents = []) {
  if (!data || !data.cityGroups) {
    return '<div class="empty-state">Muutostietoja ei saatavilla</div>';
  }

  const isFullscreen = getQueryParam('fullscreen') === 'true';
  const toggleLabel = isFullscreen ? 'Poistu koko näytöstä' : 'Koko näyttö';
  const toggleBtn = `<button class="fullscreen-toggle" id="fullscreen-toggle">${toggleLabel}</button>`;

  const cards = data.cityGroups.map((city) => renderCityCard(city, historyEvents));
  return `${toggleBtn}<div class="city-grid">${cards.join('')}</div>`;
}

function findEnvInfo(city, env, historyEvents) {
  const commitSha = env.version?.coreCommit?.sha || env.version?.wrapperCommit?.sha;

  if (env.type === 'production') {
    // Production: find detectedAt and PR title from history events
    const prodEnvIds = city.environments
      .filter((e) => e.type === 'production')
      .map((e) => e.id);
    const prodEvents = historyEvents
      .filter((e) => e.cityGroupId === city.id && prodEnvIds.includes(e.environmentId))
      .sort((a, b) => new Date(b.detectedAt) - new Date(a.detectedAt));

    // detectedAt: find the event that deployed this specific commit
    const commitEvent = commitSha
      ? prodEvents.find((e) => e.newCommit?.sha === commitSha)
      : null;
    const detectedAt = commitEvent?.detectedAt || null;

    // PR title: prefer core PRs
    let title = null;
    for (const event of prodEvents) {
      const corePR = (event.includedPRs || []).find((pr) => !pr.isHidden && pr.repoType === 'core');
      if (corePR) { title = corePR.title; break; }
    }
    if (!title) {
      for (const event of prodEvents) {
        const anyPR = (event.includedPRs || []).find((pr) => !pr.isHidden);
        if (anyPR) { title = anyPR.title; break; }
      }
    }
    return { latestPRTitle: title, detectedAt };
  }

  // Staging: detectedAt from history, PR title from current data
  const stagingEnvIds = city.environments
    .filter((e) => e.type === 'staging')
    .map((e) => e.id);
  const stagingEvent = commitSha
    ? historyEvents.find((e) => e.cityGroupId === city.id && stagingEnvIds.includes(e.environmentId) && e.newCommit?.sha === commitSha)
    : null;

  const coreInStaging = (city.prTracks?.core?.inStaging || []).find((pr) => !pr.isHidden);
  const wrapperInStaging = (city.prTracks?.wrapper?.inStaging || []).find((pr) => !pr.isHidden);
  let stagingTitle = (coreInStaging || wrapperInStaging)?.title || null;

  // Fall back to history events when inStaging is empty
  if (!stagingTitle) {
    const stagingEvents = historyEvents
      .filter((e) => e.cityGroupId === city.id && stagingEnvIds.includes(e.environmentId))
      .sort((a, b) => new Date(b.detectedAt) - new Date(a.detectedAt));
    for (const event of stagingEvents) {
      const corePR = (event.includedPRs || []).find((pr) => !pr.isHidden && pr.repoType === 'core');
      if (corePR) { stagingTitle = corePR.title; break; }
    }
    if (!stagingTitle) {
      for (const event of stagingEvents) {
        const anyPR = (event.includedPRs || []).find((pr) => !pr.isHidden);
        if (anyPR) { stagingTitle = anyPR.title; break; }
      }
    }
  }

  return {
    latestPRTitle: stagingTitle,
    detectedAt: stagingEvent?.detectedAt || null,
  };
}

function countNonBot(arr) {
  return (arr || []).filter((pr) => !pr.isHidden).length;
}

function computeChangeCounts(prTracks) {
  const stagingCount = countNonBot(prTracks?.core?.inStaging) + countNonBot(prTracks?.wrapper?.inStaging);
  const pendingCount = countNonBot(prTracks?.core?.pendingDeployment) + countNonBot(prTracks?.wrapper?.pendingDeployment);
  return { stagingCount, pendingCount };
}

function renderCityCard(city, historyEvents) {
  const envSections = city.environments.map((env) => {
    const label = env.type === 'production' ? 'Tuotanto' : 'Testaus';
    const { latestPRTitle, detectedAt } = findEnvInfo(city, env, historyEvents);
    const badge = renderStatusBadge(env.version, { latestPRTitle, detectedAt });
    const mismatch = env.versionMismatch
      ? '<div class="mismatch-warning">Versioero havaittu instanssien välillä</div>'
      : '';

    return `
      <div class="env-section">
        <div class="env-header">
          <span class="env-label">${label}</span>
          ${badge}
        </div>
        ${mismatch}
      </div>
    `;
  });

  const { stagingCount, pendingCount } = computeChangeCounts(city.prTracks);
  const countsHtml = `
    <div class="change-counts">
      <span class="count-badge staging"><span class="count-value">${stagingCount}</span> <span class="count-label">Testauksessa</span></span>
      <span class="count-badge pending"><span class="count-value">${pendingCount}</span> <span class="count-label">Julkaisematta</span></span>
    </div>
  `;

  return `
    <div class="city-card" data-city-id="${city.id}">
      <h2>${escapeHtml(city.name)}</h2>
      ${countsHtml}
      ${envSections.join('')}
    </div>
  `;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function bindOverviewEvents() {
  document.querySelectorAll('.city-card').forEach((card) => {
    card.addEventListener('click', () => {
      const cityId = card.dataset.cityId;
      if (cityId) navigate(`/city/${cityId}`);
    });
  });

  const toggle = document.getElementById('fullscreen-toggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      const isFullscreen = getQueryParam('fullscreen') === 'true';
      setQueryParam('fullscreen', isFullscreen ? null : 'true');
    });
  }

  document.addEventListener('keydown', handleFullscreenEsc);
}

function handleFullscreenEsc(e) {
  if (e.key === 'Escape' && getQueryParam('fullscreen') === 'true') {
    setQueryParam('fullscreen', null);
  }
}
