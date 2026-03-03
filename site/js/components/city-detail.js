/**
 * City detail view: single city group with full PR tracks and environment details.
 */

import { renderStatusBadge } from './status-badge.js';
import { renderPRList } from './pr-list.js';
import { navigate, getQueryParam, setQueryParam } from '../router.js';

export function renderCityDetail(city, { showBots = false } = {}) {
  const envSections = city.environments.map((env) => {
    const label = env.type === 'production' ? 'Production' : 'Staging / Test';
    const badge = renderStatusBadge(env.version);

    // Instance list for multi-instance environments (Tampere region)
    let instanceList = '';
    if (env.versionMismatch && env.mismatchDetails && env.mismatchDetails.length > 0) {
      const chips = env.mismatchDetails.map((v) => {
        const sha = v.coreCommit?.shortSha || v.wrapperCommit?.shortSha || '?';
        const dotClass = v.status;
        return `<span class="instance-chip"><span class="status-dot ${dotClass}"></span>${escapeHtml(v.instanceDomain.split('.')[0])} (${sha})</span>`;
      });
      instanceList = `
        <div class="mismatch-warning">Version mismatch detected</div>
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

  // Pending deployment section
  const pendingCore = city.prTracks?.core?.pendingDeployment || [];
  const pendingWrapper = city.prTracks?.wrapper?.pendingDeployment || [];
  let pendingSection = '';
  if (pendingCore.length > 0 || pendingWrapper.length > 0) {
    const corePending = pendingCore.length > 0
      ? `<div class="pr-track"><div class="pr-track-header">Core</div>${renderPRList(pendingCore, { showBots })}</div>`
      : '';
    const wrapperPending = pendingWrapper.length > 0
      ? `<div class="pr-track"><div class="pr-track-header">Wrapper</div>${renderPRList(pendingWrapper, { showBots })}</div>`
      : '';
    pendingSection = `
      <div class="pending-section">
        <h4>Awaiting deployment</h4>
        ${wrapperPending}
        ${corePending}
      </div>
    `;
  }

  // PR tracks: wrapper (if exists) then core
  const wrapperTrack = city.prTracks?.wrapper;
  const coreTrack = city.prTracks?.core;

  let wrapperSection = '';
  if (wrapperTrack) {
    const deployed = wrapperTrack.deployed || [];
    const inStaging = wrapperTrack.inStaging || [];
    const stagingSection = inStaging.length > 0
      ? `<div class="pr-track"><div class="pr-track-header">Wrapper — In Staging</div>${renderPRList(inStaging, { showBots })}</div>`
      : '';
    const deployedSection = deployed.length > 0
      ? `<div class="pr-track"><div class="pr-track-header">Wrapper — Deployed</div>${renderPRList(deployed, { showBots })}</div>`
      : '';
    wrapperSection = stagingSection + deployedSection;
  }

  let coreSection = '';
  if (coreTrack) {
    const deployed = coreTrack.deployed || [];
    const inStaging = coreTrack.inStaging || [];
    const stagingSection = inStaging.length > 0
      ? `<div class="pr-track"><div class="pr-track-header">Core — In Staging</div>${renderPRList(inStaging, { showBots })}</div>`
      : '';
    const deployedSection = deployed.length > 0
      ? `<div class="pr-track"><div class="pr-track-header">Core — Deployed</div>${renderPRList(deployed, { showBots })}</div>`
      : '';
    coreSection = stagingSection + deployedSection;
  }

  // Bot toggle
  const toggleActive = showBots ? ' active' : '';
  const botToggle = `<button class="bot-toggle${toggleActive}" id="bot-toggle">Show dependency updates</button>`;

  return `
    <div class="city-detail">
      <h2>${escapeHtml(city.name)}</h2>
      <div class="nav-links">
        <a class="nav-link" data-action="history">Deployment History</a>
      </div>
      ${envSections.join('')}
      ${botToggle}
      ${pendingSection}
      ${wrapperSection}
      ${coreSection}
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
