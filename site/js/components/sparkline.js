/**
 * Inline SVG sparklines without axes. The SVG stretches to fill its box, so
 * geometry is in viewBox units. A point is { t, value } where t is the start
 * of a bucket that lasts stepMs and value null is a gap that gets no mark.
 * The x scale spans [from, to).
 */

import { escapeHtml } from '../utils.js';
import { contiguousRuns } from '../metrics/series.js';

export const WIDTH = 288;
export const HEIGHT = 40;

function round(n) {
  return Math.round(n * 100) / 100;
}

function scales(from, to, yMax) {
  return {
    x: (t) => round(((t - from) / (to - from)) * WIDTH),
    y: (v) => round(HEIGHT - (v / yMax) * HEIGHT),
  };
}

/**
 * points: [{ t, values: [number | null, ...] }], stacked from the bottom in
 * order and scaled to the largest total. A bucket where every value is null
 * is a gap. Each run of buckets that are not gaps gets a baseline, so a gap
 * looks different from a bucket of zeros.
 */
export function stackedBarGeometry(points, { from, to, stepMs }) {
  const totals = points.map((p) => ({
    t: p.t,
    value: p.values.every((v) => v === null) ? null : p.values.reduce((a, v) => a + (v ?? 0), 0),
  }));
  const { x, y } = scales(from, to, Math.max(1, ...totals.map((p) => p.value ?? 0)));

  const bars = [];
  for (const point of points) {
    let base = 0;
    point.values.forEach((value, series) => {
      if (!value) return;
      const top = base + value;
      bars.push({
        series,
        x: x(point.t),
        width: round(x(point.t + stepMs) - x(point.t)),
        y: y(top),
        height: round(y(base) - y(top)),
      });
      base = top;
    });
  }

  const baselines = contiguousRuns(totals).map((run) => ({
    x1: x(run[0].t),
    x2: x(run[run.length - 1].t + stepMs),
  }));
  return { bars, baselines };
}

/**
 * points: [{ t, value: { min, mean, max } | null }] on a scale from 0 to
 * yMax. Each run of known values gives a min to max band and a mean line,
 * both from the left edge of the first bucket to the right edge of the last,
 * so that a run of one bucket is still visible.
 */
export function bandGeometry(points, { from, to, stepMs, yMax }) {
  const { x, y } = scales(from, to, yMax);
  return contiguousRuns(points).map((run) => {
    const first = run[0];
    const last = run[run.length - 1];
    const along = (pick) => [
      [x(first.t), y(pick(first.value))],
      ...run.map((p) => [x(p.t + stepMs / 2), y(pick(p.value))]),
      [x(last.t + stepMs), y(pick(last.value))],
    ];
    return {
      band: [...along((v) => v.max), ...along((v) => v.min).reverse()],
      mean: along((v) => v.mean),
    };
  });
}

function pointList(pairs) {
  return pairs.map(([px, py]) => `${px},${py}`).join(' ');
}

function svg(title, body) {
  return `<svg class="sparkline" viewBox="0 0 ${WIDTH} ${HEIGHT}" preserveAspectRatio="none" role="img"><title>${escapeHtml(title)}</title>${body}</svg>`;
}

/** classNames: one CSS class per entry in point.values. */
export function renderStackedBarSparkline({ points, from, to, stepMs, classNames, title }) {
  const { bars, baselines } = stackedBarGeometry(points, { from, to, stepMs });
  const rects = bars
    .map((b) => `<rect class="${classNames[b.series]}" x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}"></rect>`)
    .join('');
  const lines = baselines
    .map((b) => `<line class="sparkline-baseline" x1="${b.x1}" x2="${b.x2}" y1="${HEIGHT}" y2="${HEIGHT}"></line>`)
    .join('');
  return svg(title, rects + lines);
}

export function renderBandSparkline({ points, from, to, stepMs, yMax, title }) {
  const shapes = bandGeometry(points, { from, to, stepMs, yMax })
    .map(
      (run) =>
        `<polygon class="band-range" points="${pointList(run.band)}"></polygon><polyline class="band-mean" points="${pointList(run.mean)}"></polyline>`
    )
    .join('');
  return svg(title, shapes);
}
