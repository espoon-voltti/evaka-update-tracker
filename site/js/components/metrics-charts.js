/**
 * The chart groups of one municipality in the metrics view, rendered from
 * fetched metrics data. All charts share the x axis range of the data.
 */

import { escapeHtml, formatTime, isoOf } from '../utils.js';
import {
  LOGIN_STRONG,
  LOGIN_WEAK,
  RDS_CPU,
  bucketSizeForRange,
  floorTo,
  extractSeries,
  aggregateCounters,
  aggregateGaugeSummaries,
  aggregateHistograms,
  localTicks,
  totalOf,
  sumSeries,
  ratioSeries,
  ratioOfTotals,
  differenceSeries,
  differenceOfTotals,
  histogramBounds,
  totalHistogram,
  histogramPercentile,
  percentileSeries,
  breakdownTotals,
  topEntries,
} from '../metrics/series.js';
import { renderStackedBarChart, renderBandChart, renderLineChart } from './chart.js';

const REQUEST_CLASSES = ['2xx', '3xx', '4xx', '5xx'];
const APIGW_APPS = [
  { app: 'citizen', label: 'Kuntalaiset', short: 'kuntalaiset' },
  { app: 'employee', label: 'Henkilökunta', short: 'henkilökunta' },
  { app: 'mobile', label: 'Mobiili', short: 'mobiili' },
  { app: 'other', label: 'Muut', short: 'muut' },
];
const JOB_FAILED = 'service.asyncJob.failed';
const JOB_PERMANENTLY_FAILED = 'service.asyncJob.permanentlyFailed';
const TOP_JOB_TYPES = 5;

function fmt1(n) {
  return n.toFixed(1).replace('.', ',');
}

function fmtPercent(ratio) {
  return `${(ratio * 100).toFixed(2).replace('.', ',')} %`;
}

/** A value in the last, open-ended bucket is only known to be at least its lower bound. */
function fmtMs(ms, bounds) {
  return `${ms >= bounds[bounds.length - 1] ? '≥ ' : ''}${Math.round(ms)} ms`;
}

function context(data, range) {
  const bucketMs = bucketSizeForRange(range);
  const chartFrom = floorTo(data.from, bucketMs);
  // Formatting a time is slow, and every chart needs the same time for each bucket.
  const timeLabels = new Map();
  return {
    timeLabel: (t) => {
      if (!timeLabels.has(t)) timeLabels.set(t, formatTime(isoOf(t)));
      return timeLabels.get(t);
    },
    slots: data.slots,
    meta: data.series,
    range,
    bucketMs,
    from: data.from,
    to: data.to,
    chartFrom,
    ticks: localTicks(range, chartFrom, data.to),
  };
}

function counter(ctx, name) {
  return aggregateCounters(extractSeries(ctx.slots, name, ctx.from, ctx.to), ctx.bucketMs);
}

function histogram(ctx, name) {
  return aggregateHistograms(extractSeries(ctx.slots, name, ctx.from, ctx.to), ctx.bucketMs);
}

function stacked(seriesPoints) {
  return seriesPoints[0].map((p, i) => ({ t: p.t, values: seriesPoints.map((points) => points[i].value) }));
}

function isGap(point) {
  return point.values.every((v) => v === null);
}

function legend(series, swatchClass = '') {
  if (series.length < 2) return '';
  const items = series
    .map((s) => `<li><span class="legend-swatch ${s.className}${swatchClass}"></span>${escapeHtml(s.label)}</li>`)
    .join('');
  return `<ul class="chart-legend">${items}</ul>`;
}

/** body null means that the series of the chart are absent for the whole range. */
function chartBlock({ id, title, description, legendHtml = '', body }) {
  return `
    <div class="metrics-chart" data-chart="${id}">
      <h4>${escapeHtml(title)}</h4>
      <p class="chart-desc">${escapeHtml(description)}</p>
      ${body === null ? '<p class="chart-empty">Ei tietoa</p>' : `<div class="chart-body">${legendHtml}${body}</div>`}
    </div>`;
}

/**
 * series: [{ points, label, short, className, total }], where label is for
 * the legend and short for the summary and the tooltip. total replaces the
 * sum of points in the summary.
 */
function barChart(ctx, { id, title, description, ariaTitle, series }) {
  const points = stacked(series.map((s) => s.points));
  if (points.every(isGap)) return chartBlock({ id, title, description, body: null });

  const gaps = points.filter(isGap).length;
  const totals = series.map((s) => `${s.short} ${s.total ?? totalOf(s.points)}`).join(', ');
  const body = renderStackedBarChart({
    points,
    series,
    stepMs: ctx.bucketMs,
    from: ctx.chartFrom,
    to: ctx.to,
    ticks: ctx.ticks,
    ariaLabel: `${ariaTitle}, ${ctx.range.label}: ${totals}, puuttuvia jaksoja ${gaps}`,
    formatTooltip: (p) =>
      `${ctx.timeLabel(p.t)}: ${series.map((s, i) => `${s.short} ${p.values[i] ?? '-'}`).join(', ')}`,
  });
  return chartBlock({ id, title, description, legendHtml: legend(series), body });
}

/**
 * series: [{ points, label, short, className, format }], where format turns a
 * value into tooltip text. A bucket is a gap when every point list in sources
 * has no value in it; a series can still have no value in a bucket that is
 * not a gap, such as a rate when there were no requests.
 */
function lineChart(ctx, { id, title, description, ariaTitle, series, sources, unit, logScale = false, summary }) {
  const known = sources[0].map((_, i) => sources.some((points) => points[i].value !== null));
  if (!known.includes(true)) return chartBlock({ id, title, description, body: null });

  const gaps = known.filter((k) => !k).length;
  const body = renderLineChart({
    points: stacked(series.map((s) => s.points)),
    series,
    stepMs: ctx.bucketMs,
    from: ctx.chartFrom,
    to: ctx.to,
    ticks: ctx.ticks,
    unit,
    logScale,
    ariaLabel: `${ariaTitle}, ${ctx.range.label}: ${summary}, puuttuvia jaksoja ${gaps}`,
    formatTooltip: (p) =>
      `${ctx.timeLabel(p.t)}: ${series.map((s, i) => `${s.short} ${p.values[i] === null ? '-' : s.format(p.values[i])}`).join(', ')}`,
  });
  return chartBlock({ id, title, description, legendHtml: legend(series, ' swatch-line'), body });
}

function renderServiceErrorRate(ctx) {
  const byClass = REQUEST_CLASSES.map((c) => counter(ctx, `service.requests{class=${c}}`));
  const errors = byClass[REQUEST_CLASSES.indexOf('5xx')];
  const all = sumSeries(byClass);
  const total = ratioOfTotals(errors, all);
  return lineChart(ctx, {
    id: 'service-5xx-rate',
    title: 'Palvelun 5xx-virheiden osuus',
    description: 'Osuus palvelun (service) vastauksista, joiden tilakoodi on 5xx.',
    ariaTitle: 'Palvelun 5xx-virheiden osuus',
    series: [
      {
        points: ratioSeries(errors, all).map((p) => ({ t: p.t, value: p.value === null ? null : p.value * 100 })),
        label: '5xx-osuus',
        short: 'osuus',
        className: 'cat-1',
        format: (percent) => fmtPercent(percent / 100),
      },
    ],
    sources: [all],
    unit: ' %',
    summary: total === null ? 'ei pyyntöjä' : `koko jakson osuus ${fmtPercent(total)}`,
  });
}

function renderServiceResponseTime(ctx) {
  const name = 'service.responseTime';
  const id = 'service-response-time';
  const title = 'Palvelun vasteaika (ms)';
  const description =
    'Mediaani (p50) ja 95. persentiili (p95) palvelun käsittelemien pyyntöjen vasteajoista. Logaritminen asteikko.';
  const bounds = histogramBounds(ctx.meta, name);
  if (!bounds) return chartBlock({ id, title, description, body: null });

  const points = histogram(ctx, name);
  const total = totalHistogram(points);
  const p50 = total && histogramPercentile(total, bounds, 50);
  const p95 = total && histogramPercentile(total, bounds, 95);
  const format = (ms) => fmtMs(ms, bounds);
  return lineChart(ctx, {
    id,
    title,
    description,
    ariaTitle: 'Palvelun vasteaika',
    series: [
      { points: percentileSeries(points, bounds, 50), label: 'Mediaani (p50)', short: 'p50', className: 'cat-1', format },
      { points: percentileSeries(points, bounds, 95), label: '95. persentiili (p95)', short: 'p95', className: 'cat-2', format },
    ],
    sources: [points],
    unit: '',
    logScale: true,
    summary: p50 === null || p95 === null ? 'ei pyyntöjä' : `koko jakson p50 ${fmtMs(p50, bounds)}, p95 ${fmtMs(p95, bounds)}`,
  });
}

function renderApigwResponseTime(ctx) {
  const apps = APIGW_APPS.map((a, i) => {
    const name = `apigw.responseTime{app=${a.app}}`;
    const bounds = histogramBounds(ctx.meta, name);
    const points = bounds ? histogram(ctx, name) : [];
    return { ...a, bounds, points, className: `cat-${i + 1}`, format: (ms) => fmtMs(ms, bounds) };
  }).filter((a) => a.bounds);
  const id = 'apigw-response-time';
  const title = 'API-yhdyskäytävän vasteaika, p95 (ms)';
  const description = '95. persentiili API-yhdyskäytävän (apigw) vasteajoista sovelluksittain. Logaritminen asteikko.';
  if (apps.length === 0) return chartBlock({ id, title, description, body: null });

  const totals = apps.map((a) => {
    const total = totalHistogram(a.points);
    const p95 = total && histogramPercentile(total, a.bounds, 95);
    return `${a.short} ${p95 === null ? '-' : fmtMs(p95, a.bounds)}`;
  });
  return lineChart(ctx, {
    id,
    title,
    description,
    ariaTitle: 'API-yhdyskäytävän vasteaika p95',
    series: apps.map((a) => ({ ...a, points: percentileSeries(a.points, a.bounds, 95) })),
    sources: apps.map((a) => a.points),
    unit: '',
    logScale: true,
    summary: `koko jakson p95: ${totals.join(', ')}`,
  });
}

function sumOverApps(ctx, nameOf) {
  return sumSeries(APIGW_APPS.map((a) => counter(ctx, nameOf(a.app))));
}

function renderLoadGroup(ctx) {
  return [
    renderServiceErrorRate(ctx),
    renderServiceResponseTime(ctx),
    barChart(ctx, {
      id: 'service-errors',
      title: 'Palvelun virherivit',
      description: 'ERROR-tason rivit palvelun sovelluslokissa.',
      ariaTitle: 'Palvelun virherivit',
      series: [{ points: counter(ctx, 'service.errors'), label: 'Virherivit', short: 'rivejä', className: 'cat-1' }],
    }),
    renderApigwResponseTime(ctx),
    barChart(ctx, {
      id: 'apigw-errors',
      title: 'API-yhdyskäytävän virhevastaukset',
      description: 'API-yhdyskäytävän vastaukset tilakoodin mukaan, kaikki sovellukset yhteensä.',
      ariaTitle: 'API-yhdyskäytävän virhevastaukset',
      series: [
        {
          points: sumOverApps(ctx, (app) => `apigw.requests{app=${app},class=5xx}`),
          label: '5xx (palvelinvirhe)',
          short: '5xx',
          className: 'cat-1',
        },
        {
          points: sumOverApps(ctx, (app) => `apigw.status401{app=${app}}`),
          label: '401 (ei kirjautunut)',
          short: '401',
          className: 'cat-2',
        },
        {
          points: sumOverApps(ctx, (app) => `apigw.status429{app=${app}}`),
          label: '429 (liikaa pyyntöjä)',
          short: '429',
          className: 'cat-3',
        },
      ],
    }),
    barChart(ctx, {
      id: 'proxy-errors',
      title: 'Välityspalvelimen 502- ja 504-vastaukset',
      description: 'Pyynnöt, joihin välityspalvelin (proxy) ei saanut taustapalvelulta vastausta (502) tai ei saanut sitä ajoissa (504).',
      ariaTitle: 'Välityspalvelimen 502- ja 504-vastaukset',
      series: [
        { points: counter(ctx, 'proxy.status502'), label: '502 Bad Gateway', short: '502', className: 'cat-1' },
        { points: counter(ctx, 'proxy.status504'), label: '504 Gateway Timeout', short: '504', className: 'cat-2' },
      ],
    }),
  ];
}

function renderLoginGroup(ctx) {
  const weakLogins = counter(ctx, LOGIN_WEAK);
  const weakAttempts = counter(ctx, 'citizen.loginAttempt{auth=weak}');
  return [
    barChart(ctx, {
      id: 'citizen-logins',
      title: 'Kuntalaisten kirjautumiset',
      description: 'Onnistuneet kirjautumiset kuntalaisen sovellukseen.',
      ariaTitle: 'Kuntalaisten kirjautumiset',
      series: [
        { points: counter(ctx, LOGIN_STRONG), label: 'Vahva tunnistautuminen', short: 'vahva', className: 'bar-strong' },
        { points: weakLogins, label: 'Heikko tunnistautuminen', short: 'heikko', className: 'bar-weak' },
      ],
    }),
    barChart(ctx, {
      id: 'employee-logins',
      title: 'Henkilökunnan kirjautumiset',
      description: 'Onnistuneet kirjautumiset tavan mukaan.',
      ariaTitle: 'Henkilökunnan kirjautumiset',
      series: [
        { points: counter(ctx, 'employee.login{method=ad}'), label: 'AD', short: 'AD', className: 'cat-1' },
        { points: counter(ctx, 'employee.login{method=sfi}'), label: 'Suomi.fi', short: 'Suomi.fi', className: 'cat-2' },
        { points: counter(ctx, 'employee.login{method=pin}'), label: 'PIN-koodi', short: 'PIN', className: 'cat-3' },
      ],
    }),
    barChart(ctx, {
      id: 'failed-logins',
      title: 'Epäonnistuneet kirjautumiset',
      description: 'API-yhdyskäytävän kirjaamat epäonnistuneet kirjautumiset tavan mukaan.',
      ariaTitle: 'Epäonnistuneet kirjautumiset',
      series: [
        { points: counter(ctx, 'login.failed{method=ad}'), label: 'AD', short: 'AD', className: 'cat-1' },
        { points: counter(ctx, 'login.failed{method=sfi}'), label: 'Suomi.fi', short: 'Suomi.fi', className: 'cat-2' },
        { points: counter(ctx, 'login.failed{method=weak}'), label: 'Heikko', short: 'heikko', className: 'cat-3' },
        { points: counter(ctx, 'login.failed{method=passkey}'), label: 'Pääsyavain', short: 'pääsyavain', className: 'cat-4' },
      ],
    }),
    barChart(ctx, {
      id: 'weak-login-failures',
      title: 'Heikon tunnistautumisen epäonnistumiset (arvio)',
      description: 'Arvio: heikon tunnistautumisen ja pääsyavaimen kirjautumisyritykset, joista ei seurannut kirjautumista.',
      ariaTitle: 'Heikon tunnistautumisen epäonnistumiset, arvio',
      series: [
        {
          points: differenceSeries(weakAttempts, weakLogins),
          // The bars are clamped at 0 one by one, so their sum would overstate the estimate.
          total: differenceOfTotals(weakAttempts, weakLogins),
          label: 'Arvio',
          short: 'epäonnistumisia',
          className: 'cat-1',
        },
      ],
    }),
    barChart(ctx, {
      id: 'login-rate-limited',
      title: 'Kirjautumisten nopeusrajoitus',
      description:
        'Heikon tunnistautumisen kirjautumispyynnöt (käyttäjätunnus ja salasana), jotka API-yhdyskäytävä hylkäsi nopeusrajoituksen takia.',
      ariaTitle: 'Kirjautumisten nopeusrajoitus',
      series: [{ points: counter(ctx, 'login.rateLimited'), label: 'Pyynnöt', short: 'pyyntöjä', className: 'cat-1' }],
    }),
  ];
}

/** Lets a long CamelCase name such as a job type wrap between its words. */
function breakableName(name) {
  return escapeHtml(name).replace(/([a-z0-9])([A-Z])/g, '$1<wbr>$2');
}

function renderJobTypes(ctx, failedPoints) {
  const id = 'async-job-types';
  const title = 'Eniten epäonnistuneet taustatyöt';
  const description = `Tyypit, joiden ajoja epäonnistui eniten valitulla aikavälillä, enintään ${TOP_JOB_TYPES}. Pysyvästi: ajot, joita ei enää yritetä uudelleen.`;
  if (failedPoints.every((p) => p.value === null)) return chartBlock({ id, title, description, body: null });

  const failed = breakdownTotals(ctx.slots, JOB_FAILED, ctx.from, ctx.to);
  const permanent = breakdownTotals(ctx.slots, JOB_PERMANENTLY_FAILED, ctx.from, ctx.to);
  const types = new Set([...failed.keys(), ...permanent.keys()]);
  const totals = new Map([...types].map((type) => [type, (failed.get(type) ?? 0) + (permanent.get(type) ?? 0)]));
  const top = topEntries(totals, TOP_JOB_TYPES);
  if (top.length === 0) {
    return chartBlock({ id, title, description, body: '<p class="metrics-note">Ei epäonnistuneita ajoja.</p>' });
  }

  const rows = top
    .map(
      ([type, total]) =>
        `<tr><td>${breakableName(type)}</td><td>${total}</td><td>${permanent.get(type) ?? 0}</td></tr>`
    )
    .join('');
  return chartBlock({
    id,
    title,
    description,
    body: `
      <table class="metrics-table">
        <thead><tr><th scope="col">Tyyppi</th><th scope="col">Epäonnistui</th><th scope="col">Pysyvästi</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`,
  });
}

function renderJobGroup(ctx) {
  const failed = counter(ctx, JOB_FAILED);
  return [
    barChart(ctx, {
      id: 'async-job-failures',
      title: 'Epäonnistuneet taustatyöt',
      description: 'Taustatöiden epäonnistuneet ajot: uusi yritys tulossa tai yritykset loppuneet.',
      ariaTitle: 'Epäonnistuneet taustatyöt',
      series: [
        { points: failed, label: 'Uusi yritys tulossa', short: 'uusitaan', className: 'cat-1' },
        { points: counter(ctx, JOB_PERMANENTLY_FAILED), label: 'Epäonnistui pysyvästi', short: 'pysyvästi', className: 'cat-2' },
      ],
    }),
    renderJobTypes(ctx, failed),
  ];
}

function renderIntegrationGroup(ctx) {
  return [
    barChart(ctx, {
      id: 'integration-failures',
      title: 'Integraatioiden virheet',
      description: 'Epäonnistuneet lähetykset ja kyselyt ulkoisiin järjestelmiin.',
      ariaTitle: 'Integraatioiden virheet',
      series: [
        { points: counter(ctx, 'integration.failed{system=email}'), label: 'Sähköposti', short: 'sähköposti', className: 'cat-1' },
        { points: counter(ctx, 'integration.failed{system=webpush}'), label: 'Web push', short: 'web push', className: 'cat-2' },
        { points: counter(ctx, 'integration.failed{system=varda}'), label: 'Varda', short: 'Varda', className: 'cat-3' },
        { points: counter(ctx, 'integration.failed{system=dvv}'), label: 'DVV', short: 'DVV', className: 'cat-4' },
      ],
    }),
    barChart(ctx, {
      id: 'vtj-requests',
      title: 'VTJ-kyselyt',
      description: 'Väestötietojärjestelmän kyselyt: vastaus saatu tai kysely epäonnistui.',
      ariaTitle: 'VTJ-kyselyt',
      series: [
        { points: counter(ctx, 'vtj.requests{result=ok}'), label: 'Vastaus saatu', short: 'ok', className: 'cat-1' },
        { points: counter(ctx, 'vtj.requests{result=error}'), label: 'Virhe', short: 'virhe', className: 'cat-2' },
      ],
    }),
  ];
}

function renderUsageGroup(ctx) {
  return [
    barChart(ctx, {
      id: 'messages-sent',
      title: 'Lähetetyt viestit',
      description: 'Uudet viestit lähettäjän mukaan ja vastaukset viestiketjuihin.',
      ariaTitle: 'Lähetetyt viestit',
      series: [
        { points: counter(ctx, 'message.sent{by=employee}'), label: 'Henkilökunta', short: 'henkilökunta', className: 'cat-1' },
        { points: counter(ctx, 'message.sent{by=citizen}'), label: 'Kuntalaiset', short: 'kuntalaiset', className: 'cat-2' },
        { points: counter(ctx, 'message.sent{by=reply}'), label: 'Vastaukset', short: 'vastaukset', className: 'cat-3' },
      ],
    }),
    barChart(ctx, {
      id: 'passkey-registrations',
      title: 'Pääsyavainten rekisteröinnit',
      description: 'Kuntalaisten uudet pääsyavaimet.',
      ariaTitle: 'Pääsyavainten rekisteröinnit',
      series: [{ points: counter(ctx, 'passkey.registered'), label: 'Rekisteröinnit', short: 'rekisteröintejä', className: 'cat-1' }],
    }),
    barChart(ctx, {
      id: 'push-subscriptions',
      title: 'Push-ilmoitusten tilaukset',
      description:
        'Kuntalaisten uudet tilaukset ja henkilökunnan mobiilisovelluksen tilausten tallennukset. Mobiilisovellus tallentaa tilauksensa uudelleen aina käynnistyessään, joten sen määrä ei kerro uusista tilauksista.',
      ariaTitle: 'Push-ilmoitusten tilaukset',
      series: [
        { points: counter(ctx, 'push.subscribed{app=citizen}'), label: 'Kuntalaiset, uudet', short: 'kuntalaiset', className: 'cat-1' },
        { points: counter(ctx, 'push.subscribed{app=employee}'), label: 'Mobiili, tallennukset', short: 'mobiili', className: 'cat-2' },
      ],
    }),
  ];
}

function renderCpuChart(ctx) {
  const id = 'rds-cpu';
  const title = 'Tietokannan suoritinkuorma (RDS CPU)';
  const description = 'Tietokantapalvelimen suoritinkäyttö prosentteina.';
  const points = aggregateGaugeSummaries(extractSeries(ctx.slots, RDS_CPU, ctx.from, ctx.to), ctx.bucketMs);
  const known = points.filter((p) => p.value !== null);
  if (known.length === 0) return chartBlock({ id, title, description, body: null });

  const peak = Math.max(...known.map((p) => p.value.max));
  const gaps = points.length - known.length;
  const body = renderBandChart({
    points,
    stepMs: ctx.bucketMs,
    from: ctx.chartFrom,
    to: ctx.to,
    ticks: ctx.ticks,
    yMax: 100,
    unit: ' %',
    ariaLabel: `Tietokannan suoritinkuorma, ${ctx.range.label}: suurin ${fmt1(peak)} %, puuttuvia jaksoja ${gaps}`,
    formatTooltip: (p) =>
      `${ctx.timeLabel(p.t)}: min ${fmt1(p.value.min)} %, ka ${fmt1(p.value.mean)} %, max ${fmt1(p.value.max)} %`,
  });
  const legendHtml = `
    <ul class="chart-legend">
      <li><span class="legend-swatch band-range"></span>Vaihteluväli</li>
      <li><span class="legend-swatch band-mean"></span>Keskiarvo</li>
    </ul>`;
  return chartBlock({ id, title, description, legendHtml, body });
}

const GROUPS = [
  { id: 'load', title: 'Kuormitus ja virheet', render: renderLoadGroup },
  { id: 'logins', title: 'Kirjautumiset', render: renderLoginGroup },
  { id: 'jobs', title: 'Taustatyöt', render: renderJobGroup },
  { id: 'integrations', title: 'Integraatiot', render: renderIntegrationGroup },
  { id: 'usage', title: 'Käyttö', render: renderUsageGroup },
  { id: 'database', title: 'Tietokanta', render: (ctx) => [renderCpuChart(ctx)] },
];

/** data: { from, to, series, slots } as the metrics cache keeps it. */
export function renderMetricCharts(data, range) {
  const ctx = context(data, range);
  return GROUPS.map(
    (group) => `
      <section class="metrics-group" data-group="${group.id}">
        <h3>${group.title}</h3>
        <div class="metrics-grid">${group.render(ctx).join('')}</div>
      </section>`
  ).join('');
}
