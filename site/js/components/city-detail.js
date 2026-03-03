/**
 * City detail view: single city group with full PR tracks and environment details.
 */

import { renderStatusBadge } from './status-badge.js';
import { renderPRList } from './pr-list.js';
import { navigate, getQueryParam, setQueryParam } from '../router.js';

/**
 * Merge PRs from core and wrapper repos into a single chronological list.
 * Filters bots if showBots is false. Sorts by mergedAt descending (newest first).
 */
function mergeAndSortPRs(corePRs, wrapperPRs, { showBots = false } = {}) {
  const merged = [...corePRs, ...wrapperPRs];
  const filtered = showBots ? merged : merged.filter((pr) => !pr.isBot);
  return filtered.sort((a, b) => new Date(b.mergedAt) - new Date(a.mergedAt));
}

/**
 * Find the detection timestamp for a specific commit in a given environment.
 * Returns the detectedAt ISO string if found, null otherwise.
 */
function findDetectedAt(events, environmentId, commitSha) {
  if (!events || !commitSha) return null;
  const event = events.find(
    (e) => e.environmentId === environmentId && e.newCommit?.sha === commitSha
  );
  return event ? event.detectedAt : null;
}

/**
 * Collect recent production PRs from history events for a given city.
 * Returns { core: PR[], wrapper: PR[] } from the most recent production deployment events.
 */
function getRecentProductionPRs(events, city) {
  if (!events || events.length === 0) return { core: [], wrapper: [] };

  const prodEnvIds = city.environments
    .filter((e) => e.type === 'production')
    .map((e) => e.id);

  const prodEvents = events
    .filter((e) => e.cityGroupId === city.id && prodEnvIds.includes(e.environmentId))
    .sort((a, b) => new Date(b.detectedAt) - new Date(a.detectedAt));

  const result = { core: [], wrapper: [] };
  const seen = { core: new Set(), wrapper: new Set() };

  for (const event of prodEvents) {
    const type = event.repoType;
    if (!type || !result[type]) continue;
    for (const pr of (event.includedPRs || [])) {
      if (!seen[type].has(pr.number)) {
        seen[type].add(pr.number);
        result[type].push(pr);
      }
    }
  }

  return result;
}

export function renderCityDetail(city, { showBots = false } = {}, historyEvents = []) {
  // Environment status badges
  const envSections = city.environments.map((env) => {
    const label = env.type === 'production' ? 'Tuotanto' : 'Testaus / Testi';
    const commitSha = env.version?.coreCommit?.sha || env.version?.wrapperCommit?.sha;
    const detectedAt = findDetectedAt(historyEvents, env.id, commitSha);
    const badge = renderStatusBadge(env.version, { detectedAt });

    // Instance list for multi-instance environments (Tampere region)
    let instanceList = '';
    if (env.versionMismatch && env.mismatchDetails && env.mismatchDetails.length > 0) {
      const chips = env.mismatchDetails.map((v) => {
        const sha = v.coreCommit?.shortSha || v.wrapperCommit?.shortSha || '?';
        const dotClass = v.status;
        return `<span class="instance-chip"><span class="status-dot ${dotClass}"></span>${escapeHtml(v.instanceDomain.split('.')[0])} (${sha})</span>`;
      });
      instanceList = `
        <div class="mismatch-warning">Versioero havaittu</div>
        <div class="instance-list">${chips.join('')}</div>
      `;
    }

    return `
      <div class="env-section">
        <div class="env-header">
          <span class="env-label">${label}</span>
          ${badge}
        </div>
        ${instanceList}
      </div>
    `;
  });

  // Bot toggle
  const toggleActive = showBots ? ' active' : '';
  const botToggle = `<button class="bot-toggle${toggleActive}" id="bot-toggle">Näytä riippuvuuspäivitykset</button>`;

  // Production section: last 5 per repo with sub-headers (sourced from history events)
  const { core: coreDeployed, wrapper: wrapperDeployed } = getRecentProductionPRs(historyEvents, city);
  let productionSection = '';
  const wrapperProdList = wrapperDeployed.length > 0
    ? `<div class="pr-track"><div class="pr-track-header">Kuntaimplementaatio</div>${renderPRList(wrapperDeployed, { showBots, limit: 5 })}</div>`
    : '';
  const coreProdList = coreDeployed.length > 0
    ? `<div class="pr-track"><div class="pr-track-header">Ydin</div>${renderPRList(coreDeployed, { showBots, limit: 5 })}</div>`
    : '';
  if (wrapperProdList || coreProdList) {
    productionSection = `
      <div class="production-section">
        <h4>Viimeisimmät muutokset tuotantoympäristössä</h4>
        ${wrapperProdList}
        ${coreProdList}
      </div>
    `;
  }

  // Staging section: unified chronological list with repo labels
  const coreStaging = city.prTracks?.core?.inStaging || [];
  const wrapperStaging = city.prTracks?.wrapper?.inStaging || [];
  const mergedStaging = mergeAndSortPRs(coreStaging, wrapperStaging, { showBots });
  let stagingSection = '';
  if (mergedStaging.length > 0) {
    stagingSection = `
      <div class="staging-section">
        <h4>Muutokset testauksessa</h4>
        ${renderPRList(mergedStaging, { showBots: true, showRepoLabel: true })}
      </div>
    `;
  }

  // Awaiting deployment section: unified chronological list with repo labels
  const corePending = city.prTracks?.core?.pendingDeployment || [];
  const wrapperPending = city.prTracks?.wrapper?.pendingDeployment || [];
  const mergedPending = mergeAndSortPRs(corePending, wrapperPending, { showBots });
  let pendingSection = '';
  if (mergedPending.length > 0) {
    pendingSection = `
      <div class="pending-section">
        <h4>Odottaa julkaisua</h4>
        ${renderPRList(mergedPending, { showBots: true, showRepoLabel: true })}
      </div>
    `;
  }

  // Layout order per FR-015: env badges → toggle → production → staging → awaiting
  return `
    <div class="city-detail">
      <h2>${escapeHtml(city.name)}</h2>
      <div class="nav-links">
        <a class="nav-link" data-action="history">Muutoshistoria</a>
      </div>
      ${envSections.join('')}
      ${botToggle}
      ${productionSection}
      ${stagingSection}
      ${pendingSection}
    </div>
  `;
}

export function bindCityDetailEvents(city) {
  // History link
  document.querySelectorAll('[data-action="history"]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(`/city/${city.id}/history`);
    });
  });

  // Bot toggle
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
