/**
 * Metric sparklines of the last 6 hours in the overview city cards, for the
 * municipalities that have a metrics URL and token in settings. Each card
 * loads on its own, so one failing municipality does not hide the others.
 */

import { escapeHtml } from '../utils.js';
import { parseHash } from '../router.js';
import { loadMetricsSettings } from '../metrics/client.js';
import { loadMetrics, peekMetrics, REFRESH_INTERVAL } from '../metrics/cache.js';
import {
  FIVE_MINUTES,
  RANGE_6H,
  LOGIN_STRONG,
  LOGIN_WEAK,
  RDS_CPU,
  floorTo,
  extractSeries,
  totalOf,
  lastKnownPoint,
} from '../metrics/series.js';
import { renderStackedBarSparkline, renderBandSparkline } from './sparkline.js';

const METRICS_VIEW_HREF = '#/metrics?range=24h';
const LOGINS_LABEL = `Kirjautumiset ${RANGE_6H.label}`;
const CPU_LABEL = 'Tietokanta CPU';
const NO_VALUE = '–';
const LOADING = '…';

// Must stay longer than the delay before the metrics collector (ops-metrics module in
// evaka-infra-shared) writes a closed bucket, or a normal delay hides the latest CPU value.
const CPU_VALUE_MAX_AGE = 30 * 60 * 1000;

let refreshTimer = null;

function hasSettings(cityId) {
  const { url, token } = loadMetricsSettings(cityId);
  return url !== '' && token !== '';
}

export function renderInvalidToken(className) {
  return `<p class="${className}"><a href="#/settings">Mittarit: tunniste ei kelpaa</a></p>`;
}

function clock(ms) {
  return new Date(ms).toLocaleTimeString('fi', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function metric(label, chart, value) {
  const chartCell = chart
    ? `<a class="city-metric-chart" href="${METRICS_VIEW_HREF}">${chart}</a>`
    : '<span class="city-metric-chart"></span>';
  return `
    <div class="city-metric">
      <span class="city-metric-label">${label}</span>
      ${chartCell}
      <span class="city-metric-value">${escapeHtml(value)}</span>
    </div>`;
}

function renderLogins(slots, from, to) {
  const strong = extractSeries(slots, LOGIN_STRONG, from, to);
  const weak = extractSeries(slots, LOGIN_WEAK, from, to);
  const points = strong.map((p, i) => ({ t: p.t, values: [p.value, weak[i].value] }));
  const gaps = points.filter((p) => p.values.every((v) => v === null)).length;
  if (gaps === points.length) return metric(LOGINS_LABEL, '', NO_VALUE);

  const chart = renderStackedBarSparkline({
    points,
    from,
    to,
    stepMs: FIVE_MINUTES,
    classNames: ['bar-strong', 'bar-weak'],
    title: `Kirjautumiset klo ${clock(from)}–${clock(to)}: vahva ${totalOf(strong)}, heikko ${totalOf(weak)}, puuttuvia jaksoja ${gaps}`,
  });
  return metric(LOGINS_LABEL, chart, String(totalOf(strong) + totalOf(weak)));
}

function renderCpu(slots, from, to) {
  const points = extractSeries(slots, RDS_CPU, from, to);
  const latest = lastKnownPoint(points);
  if (!latest) return metric(CPU_LABEL, '', NO_VALUE);

  const mean = Math.round(latest.value.mean);
  const gaps = points.filter((p) => p.value === null).length;
  const chart = renderBandSparkline({
    points,
    from,
    to,
    stepMs: FIVE_MINUTES,
    yMax: 100,
    title: `Tietokannan suoritinkuorma klo ${clock(from)}–${clock(to)}: viimeisin keskiarvo ${mean} % (klo ${clock(latest.t)}), puuttuvia jaksoja ${gaps}`,
  });
  return metric(CPU_LABEL, chart, latest.t >= to - CPU_VALUE_MAX_AGE ? `${mean}\u00a0%` : NO_VALUE);
}

function renderData(data) {
  const to = floorTo(data.to, FIVE_MINUTES);
  const from = to - RANGE_6H.ms;
  return renderLogins(data.slots, from, to) + renderCpu(data.slots, from, to);
}

/** Empty for a municipality without settings. Renders from the cache without fetching. */
export function renderCityMetrics(cityId) {
  if (!hasSettings(cityId)) return '';
  const state = peekMetrics(cityId, RANGE_6H);
  let stateName;
  let content;

  if (!state) {
    stateName = 'loading';
    content = metric(LOGINS_LABEL, '', LOADING) + metric(CPU_LABEL, '', LOADING);
  } else if (state.error?.kind === 'unauthorized') {
    stateName = 'unauthorized';
    content = renderInvalidToken('city-metrics-error');
  } else if (state.error) {
    stateName = 'error';
    content = '<p class="city-metrics-error">Mittarit eivät saatavilla</p>';
  } else {
    stateName = 'ok';
    content = renderData(state.data);
  }

  return `<div class="city-metrics" data-city-id="${escapeHtml(cityId)}" data-state="${stateName}">${content}</div>`;
}

function load(cityId, options) {
  const before = peekMetrics(cityId, RANGE_6H);
  loadMetrics(cityId, RANGE_6H, options).then((state) => {
    if (state === before) return;
    const block = document.querySelector(`.city-metrics[data-city-id="${CSS.escape(cityId)}"]`);
    if (block) block.outerHTML = renderCityMetrics(cityId);
  });
}

function renderedCityIds() {
  return [...document.querySelectorAll('.city-metrics')].map((block) => block.dataset.cityId);
}

function stopRefreshOnLeave() {
  if (parseHash().path === '/') return;
  clearInterval(refreshTimer);
  refreshTimer = null;
  window.removeEventListener('hashchange', stopRefreshOnLeave);
}

/**
 * Loads the rendered blocks and keeps refreshing them while the overview is
 * shown, also when no other data changes. A re-render keeps the running timer.
 */
export function bindCityMetrics() {
  const cityIds = renderedCityIds();
  cityIds.forEach((cityId) => load(cityId));
  if (cityIds.length === 0 || refreshTimer !== null) return;

  refreshTimer = setInterval(() => {
    // A tick can come a moment before REFRESH_INTERVAL has passed by Date.now(); unforced, it would fetch nothing.
    renderedCityIds().forEach((cityId) => load(cityId, { force: true }));
  }, REFRESH_INTERVAL);
  window.addEventListener('hashchange', stopRefreshOnLeave);
}
