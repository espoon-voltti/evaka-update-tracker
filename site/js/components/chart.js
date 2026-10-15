/**
 * Hand-built inline SVG charts. Times are epoch milliseconds; a point with
 * value null is a gap and gets no mark.
 */

import { escapeHtml } from '../utils.js';
import { contiguousRuns } from '../metrics/series.js';

const WIDTH = 1000;
const HEIGHT = 200;

function niceCeil(value) {
  if (!(value > 0)) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 2, 5, 10]) {
    if (value <= step * magnitude) return step * magnitude;
  }
  return 10 * magnitude;
}

function fmt(n) {
  return Number.isInteger(n) ? String(n) : String(Number(n.toPrecision(3))).replace('.', ',');
}

/** wholeNumbers leaves out a gridline at a fraction, which would be misleading for counts. */
function linearAxis(yMax, { wholeNumbers = false } = {}) {
  const yValues = [0, yMax / 2, yMax].filter((v) => !wholeNumbers || Number.isInteger(v));
  return { yValues, y: (v) => HEIGHT - (v / yMax) * HEIGHT };
}

/**
 * A gridline at each power of 10 from the one at or below the smallest
 * positive value up to the one at or above the largest, at least two
 * gridlines. A value below the lowest gridline is drawn on it.
 */
function logAxis(values) {
  const positive = values.filter((v) => v > 0);
  const low = positive.length ? Math.floor(Math.log10(Math.min(...positive))) : 0;
  const high = Math.max(low + 1, positive.length ? Math.ceil(Math.log10(Math.max(...positive))) : 0);
  const yValues = [];
  for (let e = low; e <= high; e++) yValues.push(10 ** e);
  return {
    yValues,
    y: (v) => HEIGHT - ((Math.log10(Math.max(v, 10 ** low)) - low) / (high - low)) * HEIGHT,
  };
}

function scales(from, to, axis) {
  return { x: (t) => ((t - from) / (to - from)) * WIDTH, ...axis };
}

function percent(n) {
  return `${Math.round(n * 1000) / 1000}%`;
}

/**
 * The SVG stretches to fill its frame (preserveAspectRatio none), so the axis
 * labels are HTML next to it to keep their font size readable at any width.
 */
function frame({ x, y, yValues }, { ticks, unit, ariaLabel }, body) {
  const grid = yValues
    .map((v) => `<line class="chart-grid" x1="0" x2="${WIDTH}" y1="${y(v)}" y2="${y(v)}"></line>`)
    .join('');
  const tickMarks = ticks
    .map((tick) => `<line class="chart-tick" x1="${x(tick.t)}" x2="${x(tick.t)}" y1="${HEIGHT}" y2="${HEIGHT + 6}"></line>`)
    .join('');
  const yLabels = yValues
    .map((v) => `<span class="chart-label" style="top: ${percent((y(v) / HEIGHT) * 100)}">${escapeHtml(fmt(v) + unit)}</span>`)
    .join('');
  const xLabels = ticks
    .map((tick) => `<span class="chart-label" style="left: ${percent((x(tick.t) / WIDTH) * 100)}">${escapeHtml(tick.label)}</span>`)
    .join('');

  return `
    <div class="chart-frame">
      <div class="chart-axis chart-axis-y" aria-hidden="true">${yLabels}</div>
      <svg class="chart" viewBox="0 0 ${WIDTH} ${HEIGHT}" preserveAspectRatio="none" role="img" aria-label="${escapeHtml(ariaLabel)}">${grid}${tickMarks}${body}</svg>
      <div class="chart-axis chart-axis-x" aria-hidden="true">${xLabels}</div>
    </div>`;
}

/**
 * points: [{ t, values: [number|null, ...] }], one value per entry in series.
 * series: [{ label, className }]. A bucket where every value is null is a gap.
 */
export function renderStackedBarChart({ points, series, stepMs, from, to, ticks, ariaLabel, formatTooltip }) {
  const totals = points.map((p) => p.values.reduce((a, v) => a + (v ?? 0), 0));
  const s = scales(from, to, linearAxis(niceCeil(Math.max(0, ...totals)), { wholeNumbers: true }));
  const slotW = (stepMs / (to - from)) * WIDTH;
  const gap = slotW > 4 ? 1 : 0;

  const bars = points
    .map((point) => {
      if (point.values.every((v) => v === null)) return '';
      const x0 = s.x(point.t) + gap / 2;
      let base = 0;
      const rects = point.values
        .map((value, i) => {
          if (!value) return '';
          const top = base + value;
          const rect = `<rect class="bar ${series[i].className}" x="${x0}" y="${s.y(top)}" width="${slotW - gap}" height="${s.y(base) - s.y(top)}"></rect>`;
          base = top;
          return rect;
        })
        .join('');
      return `<g class="bar-group"><title>${escapeHtml(formatTooltip(point))}</title>${rects}</g>`;
    })
    .join('');

  return frame(s, { ticks, unit: '', ariaLabel }, bars);
}

/**
 * points: [{ t, value: { min, mean, max } | null }]. Shades min to max and
 * draws the mean as a line; each run of known values is drawn separately so
 * gaps stay empty.
 */
export function renderBandChart({ points, stepMs, from, to, ticks, yMax, unit, ariaLabel, formatTooltip }) {
  const s = scales(from, to, linearAxis(yMax));
  const mid = (t) => s.x(t + stepMs / 2);
  const runs = contiguousRuns(points);

  const shapes = runs
    .map((run) => {
      const upper = run.map((p) => `${mid(p.t)},${s.y(p.value.max)}`);
      const lower = run.map((p) => `${mid(p.t)},${s.y(p.value.min)}`).reverse();
      const mean = run.map((p) => `${mid(p.t)},${s.y(p.value.mean)}`).join(' ');
      if (run.length === 1) {
        const p = run[0];
        return `<line class="band-single" x1="${mid(p.t)}" x2="${mid(p.t)}" y1="${s.y(p.value.max)}" y2="${s.y(p.value.min)}"></line>
          <line class="band-mean" x1="${s.x(p.t)}" x2="${s.x(p.t + stepMs)}" y1="${s.y(p.value.mean)}" y2="${s.y(p.value.mean)}"></line>`;
      }
      return `<polygon class="band-range" points="${[...upper, ...lower].join(' ')}"></polygon>
        <polyline class="band-mean" points="${mean}"></polyline>`;
    })
    .join('');

  const targets = hoverTargets(s, { points: points.filter((p) => p.value !== null), stepMs, from, to, formatTooltip });
  return frame(s, { ticks, unit, ariaLabel }, shapes + targets);
}

/**
 * points: [{ t, values: [number|null, ...] }], one value per entry in series.
 * series: [{ label, className }]. Each series is a line through the bucket
 * midpoints that a null value breaks; a value with gaps on both sides is a
 * flat line across its bucket. The y axis starts from 0 and ends at a round
 * number at or above the largest value, or with logScale, spans the powers of
 * 10 around the values.
 */
export function renderLineChart({ points, series, stepMs, from, to, ticks, logScale = false, unit = '', ariaLabel, formatTooltip }) {
  const known = points.filter((p) => p.values.some((v) => v !== null));
  const values = known.flatMap((p) => p.values.filter((v) => v !== null));
  const s = scales(from, to, logScale ? logAxis(values) : linearAxis(niceCeil(Math.max(0, ...values))));
  const mid = (t) => s.x(t + stepMs / 2);

  const lines = series
    .map((entry, i) =>
      contiguousRuns(points.map((p) => ({ t: p.t, value: p.values[i] })))
        .map((run) => {
          if (run.length === 1) {
            const { t, value } = run[0];
            return `<line class="line ${entry.className}" x1="${s.x(t)}" x2="${s.x(t + stepMs)}" y1="${s.y(value)}" y2="${s.y(value)}"></line>`;
          }
          return `<polyline class="line ${entry.className}" points="${run.map((p) => `${mid(p.t)},${s.y(p.value)}`).join(' ')}"></polyline>`;
        })
        .join('')
    )
    .join('');

  const targets = hoverTargets(s, { points: known, stepMs, from, to, formatTooltip });
  return frame(s, { ticks, unit, ariaLabel }, lines + targets);
}

function hoverTargets(s, { points, stepMs, from, to, formatTooltip }) {
  const slotW = (stepMs / (to - from)) * WIDTH;
  return points
    .map(
      (p) =>
        `<rect class="hover-target" x="${s.x(p.t)}" y="0" width="${slotW}" height="${HEIGHT}"><title>${escapeHtml(formatTooltip(p))}</title></rect>`
    )
    .join('');
}
