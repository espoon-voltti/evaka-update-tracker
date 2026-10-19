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
  sumSeries,
  lastKnownPoint,
  localTicks,
} from '../metrics/series.js';
import { renderStackedBarSparkline, renderBandSparkline } from './sparkline.js';

const METRICS_VIEW_HREF = '#/metrics?range=24h';
const LOGINS_LABEL = 'Kuntalaisten kirjautumiset';
const LOGINS_LEGEND = `
  <ul class="city-metric-legend">
    <li><span class="legend-swatch bar-strong"></span>vahva</li>
    <li><span class="legend-swatch bar-weak"></span>kevyt</li>
  </ul>`;
const CPU_LABEL = 'Tietokanta CPU';
const NO_VALUE = '–';
const LOADING = '…';

// The window can end two buckets before the bucket in progress, so the fetch starts
// two buckets earlier to keep the window 6 hours long.
const FETCH_RANGE = { ...RANGE_6H, ms: RANGE_6H.ms + 2 * FIVE_MINUTES };

// A latest value from a bucket that starts more than this before the window end shows
// as a dash, because the collector has then not written several buckets.
const VALUE_MAX_AGE = 30 * 60 * 1000;

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

function metric({ label, legend = '', chart = '', axis = '', value, detail = '' }) {
  const chartCell = chart
    ? `<a class="city-metric-chart" href="${METRICS_VIEW_HREF}">${chart}</a>`
    : '<span class="city-metric-chart"></span>';
  const detailLine = detail ? `<span class="city-metric-detail">${escapeHtml(detail)}</span>` : '';
  return `
    <div class="city-metric">
      <div class="city-metric-head"><span class="city-metric-label">${label}</span>${legend}</div>
      ${chartCell}
      <div class="city-metric-figures"><span class="city-metric-value">${escapeHtml(value)}</span>${detailLine}</div>
      <div class="city-metric-axis" aria-hidden="true">${axis}</div>
    </div>`;
}

function renderLogins(slots, from, to, axis) {
  const strong = extractSeries(slots, LOGIN_STRONG, from, to);
  const weak = extractSeries(slots, LOGIN_WEAK, from, to);
  const totals = sumSeries([strong, weak]);
  const latest = lastKnownPoint(totals);
  if (!latest) return metric({ label: LOGINS_LABEL, legend: LOGINS_LEGEND, value: NO_VALUE });

  const gaps = totals.filter((p) => p.value === null).length;
  const chart = renderStackedBarSparkline({
    points: strong.map((p, i) => ({ t: p.t, values: [p.value, weak[i].value] })),
    from,
    to,
    stepMs: FIVE_MINUTES,
    classNames: ['bar-strong', 'bar-weak'],
    title: `Kuntalaisten kirjautumiset klo ${clock(from)}–${clock(to)}: vahva ${totalOf(strong)}, kevyt ${totalOf(weak)}, viimeisin 5 min ${latest.value} (klo ${clock(latest.t)}), puuttuvia jaksoja ${gaps}`,
  });
  return metric({
    label: LOGINS_LABEL,
    legend: LOGINS_LEGEND,
    chart,
    axis,
    value: latest.t >= to - VALUE_MAX_AGE ? String(latest.value) : NO_VALUE,
    detail: `yht. ${totalOf(totals)}`,
  });
}

function renderCpu(slots, from, to, axis) {
  const points = extractSeries(slots, RDS_CPU, from, to);
  const latest = lastKnownPoint(points);
  if (!latest) return metric({ label: CPU_LABEL, value: NO_VALUE });

  const mean = Math.round(latest.value.mean);
  const known = points.filter((p) => p.value !== null);
  const max = Math.round(Math.max(...known.map((p) => p.value.max)));
  const gaps = points.length - known.length;
  const chart = renderBandSparkline({
    points,
    from,
    to,
    stepMs: FIVE_MINUTES,
    yMax: 100,
    title: `Tietokannan suoritinkuorma klo ${clock(from)}–${clock(to)}: viimeisin keskiarvo ${mean} % (klo ${clock(latest.t)}), suurin ${max} %, puuttuvia jaksoja ${gaps}`,
  });
  return metric({
    label: CPU_LABEL,
    chart,
    axis,
    value: latest.t >= to - VALUE_MAX_AGE ? `${mean}\u00a0%` : NO_VALUE,
    detail: `max ${max}\u00a0%`,
  });
}

function renderData(data) {
  // The metrics collector (ops-metrics module in evaka-infra-shared) writes a bucket no
  // earlier than ingestion_delay_seconds after it closes, so with the default delay of
  // 300 s the bucket that closed last is never in the data. The bucket before it comes in
  // the next collector run, a minute or two after the bucket in progress starts. Until
  // then the window ends before that bucket too. A longer delay shows as a gap.
  const end = floorTo(data.to, FIVE_MINUTES) - FIVE_MINUTES;
  const lastBucket = end - FIVE_MINUTES;
  const to = data.slots.some((slot) => Date.parse(slot.t) === lastBucket) ? end : lastBucket;
  const from = to - RANGE_6H.ms;
  const axis = localTicks(RANGE_6H, from, to)
    .map((tick) => {
      const position = ((tick.t - from) / (to - from)) * 100;
      // A label centered on a tick near an end would stick out of the chart.
      const end = position < 8 ? ' tick-start' : position > 92 ? ' tick-end' : '';
      return `<span class="city-metric-tick${end}" style="left: ${position.toFixed(3)}%">${tick.label}</span>`;
    })
    .join('');
  return renderLogins(data.slots, from, to, axis) + renderCpu(data.slots, from, to, axis);
}

/** Empty for a municipality without settings. Renders from the cache without fetching. */
export function renderCityMetrics(cityId) {
  if (!hasSettings(cityId)) return '';
  const state = peekMetrics(cityId, FETCH_RANGE);
  let stateName;
  let content;

  if (!state) {
    stateName = 'loading';
    content =
      metric({ label: LOGINS_LABEL, legend: LOGINS_LEGEND, value: LOADING }) + metric({ label: CPU_LABEL, value: LOADING });
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
  const before = peekMetrics(cityId, FETCH_RANGE);
  loadMetrics(cityId, FETCH_RANGE, options).then((state) => {
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
