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
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function scales(from, to, yMax) {
  return {
    x: (t) => ((t - from) / (to - from)) * WIDTH,
    y: (v) => HEIGHT - (v / yMax) * HEIGHT,
  };
}

function percent(n) {
  return `${Math.round(n * 1000) / 1000}%`;
}

/**
 * The SVG stretches to fill its frame (preserveAspectRatio none), so the axis
 * labels are HTML next to it to keep their font size readable at any width.
 */
function frame({ x, y }, { ticks, yMax, unit, ariaLabel }, body) {
  const yValues = [0, yMax / 2, yMax];
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
  const yMax = niceCeil(Math.max(0, ...totals));
  const s = scales(from, to, yMax);
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

  return frame(s, { ticks, yMax, unit: '', ariaLabel }, bars);
}

/**
 * points: [{ t, value: { min, mean, max } | null }]. Shades min to max and
 * draws the mean as a line; each run of known values is drawn separately so
 * gaps stay empty.
 */
export function renderBandChart({ points, stepMs, from, to, ticks, yMax, unit, ariaLabel, formatTooltip }) {
  const s = scales(from, to, yMax);
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

  const slotW = (stepMs / (to - from)) * WIDTH;
  const hoverTargets = points
    .filter((p) => p.value !== null)
    .map(
      (p) =>
        `<rect class="hover-target" x="${s.x(p.t)}" y="0" width="${slotW}" height="${HEIGHT}"><title>${escapeHtml(formatTooltip(p))}</title></rect>`
    )
    .join('');

  return frame(s, { ticks, yMax, unit, ariaLabel }, shapes + hoverTargets);
}
