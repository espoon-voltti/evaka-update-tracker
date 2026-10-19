/**
 * Operational metrics view (#/metrics?range=24h|7d|14d&city=<id>): one tab per
 * municipality that has a read Lambda URL in settings. Only the selected
 * municipality is fetched, by default the first one.
 */

import { setQueryParam } from '../router.js';
import { escapeHtml, formatTime, isoOf } from '../utils.js';
import { loadMetricsSettings } from '../metrics/client.js';
import { loadMetrics, peekMetrics } from '../metrics/cache.js';
import { RANGES, parseRange } from '../metrics/series.js';
import { renderMetricCharts } from './metrics-charts.js';
import { renderInvalidToken } from './city-metrics.js';

const POLL_INTERVAL = 60_000;
let pollTimer = null;

function renderData(data, range) {
  if (data.slots.length === 0) {
    return '<p class="metrics-note">Valitulta aikaväliltä ei ole tietoja.</p>';
  }
  return renderMetricCharts(data, range);
}

function renderBody(city, range) {
  const { token } = loadMetricsSettings(city.id);
  const state = peekMetrics(city.id, range);
  let stateName;
  let content;

  if (!token) {
    stateName = 'no-token';
    content = '<p class="metrics-note">Lisää kunnan tunniste <a href="#/settings">asetuksissa</a>.</p>';
  } else if (!state) {
    stateName = 'loading';
    content = '<div class="loading">Ladataan mittareita...</div>';
  } else if (state.error?.kind === 'unauthorized') {
    stateName = 'unauthorized';
    content = renderInvalidToken('metrics-error');
  } else if (state.error) {
    stateName = 'error';
    const last = state.lastSuccessAt
      ? `Viimeisin onnistunut haku ${formatTime(isoOf(state.lastSuccessAt))}.`
      : 'Yhtään hakua ei ole vielä onnistunut.';
    content = `<p class="metrics-error">Mittaritiedot eivät ole saatavilla (${escapeHtml(state.error.detail || state.error.message)}). ${last}</p>`;
    if (state.data) content += renderData(state.data, range);
  } else {
    stateName = 'ok';
    content = `<p class="metrics-fetched">Haettu ${formatTime(isoOf(state.lastSuccessAt))}</p>${renderData(state.data, range)}`;
  }

  return `<div class="metrics-body" data-state="${stateName}">${content}</div>`;
}

function configuredCities(cityGroups) {
  return cityGroups.filter((c) => loadMetricsSettings(c.id).url);
}

function selectedCity(configured, cityId) {
  return configured.find((c) => c.id === cityId) ?? configured[0];
}

export function renderMetricsView(cityGroups, rangeKey, cityId) {
  const range = parseRange(rangeKey);
  const configured = configuredCities(cityGroups);
  const unconfigured = cityGroups.filter((c) => !configured.includes(c));
  const selected = selectedCity(configured, cityId);

  const rangeButtons = Object.values(RANGES)
    .map(
      (r) =>
        `<button type="button" class="feature-filter-btn metrics-range-btn${r.key === range.key ? ' active' : ''}" data-range="${r.key}">${r.label}</button>`
    )
    .join('');

  const cityTabs = configured
    .map((city) => {
      const current = city === selected;
      const href = `#/metrics?range=${range.key}&city=${encodeURIComponent(city.id)}`;
      return `<a class="metrics-city-tab${current ? ' active' : ''}" href="${escapeHtml(href)}" data-city-id="${escapeHtml(city.id)}"${current ? ' aria-current="page"' : ''}>${escapeHtml(city.name)}</a>`;
    })
    .join('');

  const section = selected
    ? `<section class="metrics-section" data-city-id="${escapeHtml(selected.id)}" aria-label="${escapeHtml(selected.name)}">
         ${renderBody(selected, range)}
       </section>`
    : `<div class="empty-state metrics-no-url">
         Mittareiden osoitteita ei ole asetettu. Lisää kunnan funktion osoite ja tunniste
         <a href="#/settings">asetuksissa</a>.
       </div>`;

  const notConfigured =
    configured.length && unconfigured.length
      ? `<p class="metrics-note">Ei asetettu: ${unconfigured.map((c) => escapeHtml(c.name)).join(', ')}.</p>`
      : '';

  return `
    <div class="metrics-view" data-range="${range.key}">
      <h2>Operatiiviset mittarit</h2>
      ${selected ? `<nav class="metrics-city-tabs" aria-label="Kunta">${cityTabs}</nav>` : ''}
      <div class="feature-toolbar" role="group" aria-label="Aikaväli">${rangeButtons}</div>
      ${section}
      ${notConfigured}
    </div>
  `;
}

function refreshSection(city, range) {
  const section = document.querySelector(
    `.metrics-view[data-range="${range.key}"] .metrics-section[data-city-id="${CSS.escape(city.id)}"]`
  );
  if (!section) return;
  section.querySelector('.metrics-body').outerHTML = renderBody(city, range);
}

function load(city, range) {
  if (!loadMetricsSettings(city.id).token) return;
  const before = peekMetrics(city.id, range);
  loadMetrics(city.id, range).then((state) => {
    if (state !== before) refreshSection(city, range);
  });
}

export function bindMetricsViewEvents(cityGroups, rangeKey, cityId) {
  const view = document.querySelector('.metrics-view');
  if (!view) return;
  const range = parseRange(rangeKey);
  const city = selectedCity(configuredCities(cityGroups), cityId);

  view.querySelectorAll('.metrics-range-btn').forEach((button) => {
    button.addEventListener('click', () => setQueryParam('range', button.dataset.range));
  });

  if (pollTimer !== null) clearInterval(pollTimer);
  pollTimer = null;
  if (!city) return;
  load(city, range);
  pollTimer = setInterval(() => {
    if (!document.querySelector('.metrics-view')) {
      clearInterval(pollTimer);
      pollTimer = null;
      return;
    }
    load(city, range);
  }, POLL_INTERVAL);
}
