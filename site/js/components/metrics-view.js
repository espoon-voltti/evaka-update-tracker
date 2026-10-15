/**
 * Operational metrics view (#/metrics?range=24h|7d|14d): one section per
 * municipality that has a read Lambda URL in settings. Sections load
 * independently, so one failing municipality does not hide the others.
 */

import { setQueryParam } from '../router.js';
import { escapeHtml, formatTime } from '../utils.js';
import { loadMetricsSettings } from '../metrics/client.js';
import { loadMetrics, peekMetrics } from '../metrics/cache.js';
import {
  RANGES,
  LOGIN_STRONG,
  LOGIN_WEAK,
  RDS_CPU,
  parseRange,
  bucketSizeForRange,
  floorTo,
  extractSeries,
  aggregateCounters,
  aggregateGaugeSummaries,
  localTicks,
  totalOf,
} from '../metrics/series.js';
import { renderStackedBarChart, renderBandChart } from './chart.js';
import { renderInvalidToken } from './city-metrics.js';

const POLL_INTERVAL = 60_000;
let pollTimer = null;

function isoOf(ms) {
  return new Date(ms).toISOString();
}

function fmt1(n) {
  return n.toFixed(1).replace('.', ',');
}

function renderLoginChart(slots, range, from, to) {
  const bucketMs = bucketSizeForRange(range);
  const strong = aggregateCounters(extractSeries(slots, LOGIN_STRONG, from, to), bucketMs);
  const weak = aggregateCounters(extractSeries(slots, LOGIN_WEAK, from, to), bucketMs);
  const points = strong.map((p, i) => ({ t: p.t, values: [p.value, weak[i].value] }));
  const chartFrom = floorTo(from, bucketMs);
  const gaps = points.filter((p) => p.values.every((v) => v === null)).length;

  const chart = renderStackedBarChart({
    points,
    series: [
      { label: 'Vahva', className: 'bar-strong' },
      { label: 'Heikko', className: 'bar-weak' },
    ],
    stepMs: bucketMs,
    from: chartFrom,
    to,
    ticks: localTicks(range, chartFrom, to),
    ariaLabel: `Kuntalaisten kirjautumiset, ${range.label}: vahva ${totalOf(strong)}, heikko ${totalOf(weak)}, puuttuvia jaksoja ${gaps}`,
    formatTooltip: (p) =>
      `${formatTime(isoOf(p.t))}: vahva ${p.values[0] ?? '-'}, heikko ${p.values[1] ?? '-'}`,
  });

  return `
    <div class="metrics-chart">
      <h3>Kuntalaisten kirjautumiset</h3>
      <ul class="chart-legend">
        <li><span class="legend-swatch bar-strong"></span>Vahva tunnistautuminen</li>
        <li><span class="legend-swatch bar-weak"></span>Heikko tunnistautuminen</li>
      </ul>
      ${chart}
    </div>
  `;
}

function renderCpuChart(slots, range, from, to) {
  const bucketMs = bucketSizeForRange(range);
  const points = aggregateGaugeSummaries(extractSeries(slots, RDS_CPU, from, to), bucketMs);
  const chartFrom = floorTo(from, bucketMs);
  const known = points.filter((p) => p.value !== null);
  const peak = known.length ? Math.max(...known.map((p) => p.value.max)) : null;
  const gaps = points.length - known.length;
  const summary = peak === null ? 'ei tietoja' : `suurin ${fmt1(peak)} %`;

  const chart = renderBandChart({
    points,
    stepMs: bucketMs,
    from: chartFrom,
    to,
    ticks: localTicks(range, chartFrom, to),
    yMax: 100,
    unit: ' %',
    ariaLabel: `Tietokannan suoritinkuorma, ${range.label}: ${summary}, puuttuvia jaksoja ${gaps}`,
    formatTooltip: (p) =>
      `${formatTime(isoOf(p.t))}: min ${fmt1(p.value.min)} %, ka ${fmt1(p.value.mean)} %, max ${fmt1(p.value.max)} %`,
  });

  return `
    <div class="metrics-chart">
      <h3>Tietokannan suoritinkuorma (RDS CPU)</h3>
      <ul class="chart-legend">
        <li><span class="legend-swatch band-range"></span>Vaihteluväli</li>
        <li><span class="legend-swatch band-mean"></span>Keskiarvo</li>
      </ul>
      ${chart}
    </div>
  `;
}

function renderData(data, range) {
  if (data.slots.length === 0) {
    return '<p class="metrics-note">Valitulta aikaväliltä ei ole tietoja.</p>';
  }
  return (
    renderLoginChart(data.slots, range, data.from, data.to) +
    renderCpuChart(data.slots, range, data.from, data.to)
  );
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

export function renderMetricsView(cityGroups, rangeKey) {
  const range = parseRange(rangeKey);
  const configured = configuredCities(cityGroups);
  const unconfigured = cityGroups.filter((c) => !configured.includes(c));

  const rangeButtons = Object.values(RANGES)
    .map(
      (r) =>
        `<button type="button" class="feature-filter-btn metrics-range-btn${r.key === range.key ? ' active' : ''}" data-range="${r.key}">${r.label}</button>`
    )
    .join('');

  const sections = configured.length
    ? configured
        .map(
          (city) => `
          <section class="metrics-section" data-city-id="${escapeHtml(city.id)}">
            <h2>${escapeHtml(city.name)}</h2>
            ${renderBody(city, range)}
          </section>`
        )
        .join('')
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
      <div class="feature-toolbar" role="group" aria-label="Aikaväli">${rangeButtons}</div>
      ${sections}
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

export function bindMetricsViewEvents(cityGroups, rangeKey) {
  const view = document.querySelector('.metrics-view');
  if (!view) return;
  const range = parseRange(rangeKey);
  const configured = configuredCities(cityGroups);

  view.querySelectorAll('.metrics-range-btn').forEach((button) => {
    button.addEventListener('click', () => setQueryParam('range', button.dataset.range));
  });

  configured.forEach((city) => load(city, range));

  if (pollTimer !== null) clearInterval(pollTimer);
  pollTimer = setInterval(() => {
    if (!document.querySelector('.metrics-view')) {
      clearInterval(pollTimer);
      pollTimer = null;
      return;
    }
    configured.forEach((city) => load(city, range));
  }, POLL_INTERVAL);
}
