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
  const filtered = showBots ? merged : merged.filter((pr) => !pr.isHidden);
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

/**
 * Find the title of the latest non-bot PR for a given environment type.
 */
function findLatestNonBotPRFromEvents(historyEvents, city, envType) {
  const envIds = city.environments
    .filter((e) => e.type === envType)
    .map((e) => e.id);
  const events = historyEvents
    .filter((e) => e.cityGroupId === city.id && envIds.includes(e.environmentId))
    .sort((a, b) => new Date(b.detectedAt) - new Date(a.detectedAt));
  // Prefer core PRs
  for (const event of events) {
    const corePR = (event.includedPRs || []).find((pr) => !pr.isHidden && pr.repoType === 'core');
    if (corePR) return corePR.title;
  }
  for (const event of events) {
    const anyPR = (event.includedPRs || []).find((pr) => !pr.isHidden);
    if (anyPR) return anyPR.title;
  }
  return null;
}

function findLatestPRTitle(city, envType, historyEvents) {
  if (envType === 'production') {
    const { core, wrapper } = getRecentProductionPRs(historyEvents, city);
    const firstCore = core.find((pr) => !pr.isHidden);
    const firstWrapper = wrapper.find((pr) => !pr.isHidden);
    return (firstCore || firstWrapper)?.title || null;
  }
  // Staging: try inStaging track data first, fall back to history events
  const coreInStaging = (city.prTracks?.core?.inStaging || []).find((pr) => !pr.isHidden);
  const wrapperInStaging = (city.prTracks?.wrapper?.inStaging || []).find((pr) => !pr.isHidden);
  return (coreInStaging || wrapperInStaging)?.title
    || findLatestNonBotPRFromEvents(historyEvents, city, 'staging');
}

export function renderCityDetail(city, { showBots = false } = {}, historyEvents = [], featureData = null) {
  // Environment status badges
  const envSections = city.environments.map((env) => {
    const label = env.type === 'production' ? 'Tuotanto' : 'Staging / Testi';
    const commitSha = env.version?.coreCommit?.sha || env.version?.wrapperCommit?.sha;
    const detectedAt = findDetectedAt(historyEvents, env.id, commitSha);
    const latestPRTitle = findLatestPRTitle(city, env.type, historyEvents);
    const badge = renderStatusBadge(env.version, { detectedAt, latestPRTitle });

    // Instance list for multi-instance environments (Tampereen seutu)
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
  const wrapperProdList = wrapperDeployed.length > 0
    ? `<div class="pr-track"><div class="pr-track-header">Kuntaimplementaatio</div>${renderPRList(wrapperDeployed, { showBots, limit: 5 })}</div>`
    : '';
  const coreProdList = coreDeployed.length > 0
    ? `<div class="pr-track"><div class="pr-track-header">Ydin</div>${renderPRList(coreDeployed, { showBots, limit: 5 })}</div>`
    : '';
  const productionContent = (wrapperProdList || coreProdList)
    ? `${wrapperProdList}${coreProdList}`
    : '<div class="empty-state">Ei viimeaikaisia tuotantomuutoksia</div>';
  const productionSection = `
    <div class="production-section">
      <details>
        <summary>Viimeisimmät muutokset tuotantoympäristössä</summary>
        ${productionContent}
      </details>
    </div>
  `;

  // Staging section: unified chronological list with repo labels
  const coreStaging = city.prTracks?.core?.inStaging || [];
  const wrapperStaging = city.prTracks?.wrapper?.inStaging || [];
  const mergedStaging = mergeAndSortPRs(coreStaging, wrapperStaging, { showBots });
  const stagingContent = mergedStaging.length > 0
    ? renderPRList(mergedStaging, { showBots: true, showRepoLabel: true })
    : '<div class="empty-state">Ei muutoksia testauksessa</div>';
  const stagingSection = `
    <div class="staging-section">
      <details open>
        <summary>Muutokset testauksessa</summary>
        ${stagingContent}
      </details>
    </div>
  `;

  // Awaiting deployment section: unified chronological list with repo labels
  const corePending = city.prTracks?.core?.pendingDeployment || [];
  const wrapperPending = city.prTracks?.wrapper?.pendingDeployment || [];
  const mergedPending = mergeAndSortPRs(corePending, wrapperPending, { showBots });
  const pendingContent = mergedPending.length > 0
    ? renderPRList(mergedPending, { showBots: true, showRepoLabel: true })
    : '<div class="empty-state">Ei odottavia muutoksia</div>';
  const pendingSection = `
    <div class="pending-section">
      <details open>
        <summary>Odottaa julkaisua</summary>
        ${pendingContent}
      </details>
    </div>
  `;

  // Feature flag summary
  const featureSummary = renderFeatureSummary(city, featureData);

  // Layout order per FR-015: env badges → toggle → production → staging → awaiting → features
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
      ${featureSummary}
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

function renderFeatureSummary(city, featureData) {
  if (!featureData || !featureData.categories) return '';

  // Determine which city IDs to look up
  // For tampere-region cities, find the specific city ID
  const cityId = city.id;
  const featureCity = featureData.cities?.find(
    (c) => c.cityGroupId === cityId || c.id === cityId
  );

  // Find all cities belonging to this city group
  const citiesInGroup = featureData.cities?.filter((c) => c.cityGroupId === cityId) || [];
  const cityIds = citiesInGroup.length > 0
    ? citiesInGroup.map((c) => c.id)
    : featureData.cities?.filter((c) => c.id === cityId).map((c) => c.id) || [];

  if (cityIds.length === 0) return '';

  let categoriesHtml = '';
  for (const category of featureData.categories) {
    const booleanFlags = category.flags.filter((f) => f.type === 'boolean');
    if (booleanFlags.length === 0) continue;

    const items = booleanFlags.map((flag) => {
      // For multi-city groups, use the first city's value as representative
      const val = flag.values[cityIds[0]];
      let indicator;
      if (val === true) indicator = '<span class="flag-true">✓</span>';
      else if (val === false) indicator = '<span class="flag-false">✗</span>';
      else indicator = '<span class="flag-unset">—</span>';

      return `<li class="feature-summary-item">${indicator} ${escapeHtml(flag.label)}</li>`;
    }).join('');

    categoriesHtml += `
      <div class="feature-summary-category">
        <div class="feature-summary-category-header">${escapeHtml(category.label)}</div>
        <ul class="feature-summary-list">${items}</ul>
      </div>
    `;
  }

  if (!categoriesHtml) return '';

  return `
    <div class="feature-summary-section">
      <details>
        <summary>Ominaisuudet</summary>
        ${categoriesHtml}
      </details>
    </div>
  `;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
