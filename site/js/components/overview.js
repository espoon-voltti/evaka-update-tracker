/**
 * Overview component: renders all 4 city groups as cards.
 */

import { renderStatusBadge } from './status-badge.js';
import { renderPRList } from './pr-list.js';
import { navigate } from '../router.js';

export function renderOverview(data) {
  if (!data || !data.cityGroups) {
    return '<div class="empty-state">Muutostietoja ei saatavilla</div>';
  }

  const cards = data.cityGroups.map((city) => renderCityCard(city));
  return `<div class="city-grid">${cards.join('')}</div>`;
}

function renderCityCard(city) {
  const envSections = city.environments.map((env) => {
    const label = env.type === 'production' ? 'Tuotanto' : 'Testaus';
    const badge = renderStatusBadge(env.version);
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

  // Show core PRs (last 5 deployed to production)
  const corePRs = city.prTracks?.core?.deployed || [];
  const coreSection = corePRs.length > 0
    ? `<div class="pr-track">
        <div class="pr-track-header">Ydin — Tuotannossa</div>
        ${renderPRList(corePRs)}
      </div>`
    : '';

  // Show wrapper PRs if applicable
  const wrapperPRs = city.prTracks?.wrapper?.deployed || [];
  const wrapperSection = wrapperPRs.length > 0
    ? `<div class="pr-track">
        <div class="pr-track-header">Kuntaimplementaatio — Tuotannossa</div>
        ${renderPRList(wrapperPRs)}
      </div>`
    : '';

  return `
    <div class="city-card" data-city-id="${city.id}">
      <h2>${escapeHtml(city.name)}</h2>
      ${envSections.join('')}
      ${wrapperSection}
      ${coreSection}
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
}
