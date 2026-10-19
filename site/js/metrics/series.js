/**
 * Pure helpers that turn joined metric slots into chart-ready series.
 * Slot times are UTC; only the tick helpers deal with local time.
 */

import { formatDate } from '../utils.js';

export const FIVE_MINUTES = 5 * 60 * 1000;
export const HOUR = 60 * 60 * 1000;
export const DAY = 24 * HOUR;

export const RANGES = {
  '24h': { key: '24h', label: '24 h', ms: DAY },
  '7d': { key: '7d', label: '7 vrk', ms: 7 * DAY },
  '14d': { key: '14d', label: '14 vrk', ms: 14 * DAY },
};

const DEFAULT_RANGE = '14d';

// Kept out of RANGES so that the metrics view does not offer it.
export const RANGE_6H = { key: '6h', label: '6 h', ms: 6 * HOUR };

export const LOGIN_STRONG = 'citizen.login{auth=strong}';
export const LOGIN_WEAK = 'citizen.login{auth=weak}';
export const RDS_CPU = 'rds.cpu';

export function parseRange(value) {
  return RANGES[value] || RANGES[DEFAULT_RANGE];
}

export function rangeWindow(range, nowMs) {
  return { from: nowMs - range.ms, to: nowMs };
}

export function bucketSizeForRange(range) {
  return range.ms > 2 * DAY ? HOUR : FIVE_MINUTES;
}

export function floorTo(ms, stepMs) {
  return Math.floor(ms / stepMs) * stepMs;
}

// The metrics view extracts dozens of series from one slot list, and parsing
// every slot time again for each of them is the slow part. A slot list must
// not change after a series has been extracted from it.
const slotIndexes = new WeakMap();

function slotsByTime(slots) {
  let index = slotIndexes.get(slots);
  if (!index) {
    index = new Map(slots.map((slot) => [Date.parse(slot.t), slot]));
    slotIndexes.set(slots, index);
  }
  return index;
}

/**
 * One point per 5-minute bucket from the bucket containing `from` up to `to`.
 * A bucket with no slot, or a slot without the series key, has value null.
 */
export function extractSeries(slots, name, from, to) {
  const byTime = slotsByTime(slots);
  const points = [];
  for (let t = floorTo(from, FIVE_MINUTES); t < to; t += FIVE_MINUTES) {
    points.push({ t, value: byTime.get(t)?.[name] ?? null });
  }
  return points;
}

function groupByBucket(points, bucketMs, combine) {
  const groups = new Map();
  for (const point of points) {
    const start = floorTo(point.t, bucketMs);
    if (!groups.has(start)) groups.set(start, []);
    if (point.value !== null) groups.get(start).push(point.value);
  }
  return [...groups.entries()].map(([t, values]) => ({
    t,
    value: values.length > 0 ? combine(values) : null,
  }));
}

/** A bucket is a gap only when every 5-minute value in it is unknown. */
export function aggregateCounters(points, bucketMs) {
  return groupByBucket(points, bucketMs, (values) => values.reduce((a, b) => a + b, 0));
}

export function combineGaugeSummaries(summaries) {
  if (summaries.length === 0) return null;
  let min = Infinity;
  let max = -Infinity;
  let weightedSum = 0;
  let n = 0;
  for (const s of summaries) {
    min = Math.min(min, s.min);
    max = Math.max(max, s.max);
    weightedSum += s.mean * s.n;
    n += s.n;
  }
  const mean = n > 0 ? weightedSum / n : summaries.reduce((a, s) => a + s.mean, 0) / summaries.length;
  return { min, mean, max, n };
}

export function aggregateGaugeSummaries(points, bucketMs) {
  return groupByBucket(points, bucketMs, combineGaugeSummaries);
}

/** A gap adds nothing. */
export function totalOf(points) {
  return points.reduce((sum, p) => sum + (p.value ?? 0), 0);
}

/** Point lists must be aligned. A point is a gap only when it is a gap in every list. */
export function sumSeries(pointLists) {
  return pointLists[0].map((point, i) => {
    const values = pointLists.map((points) => points[i].value).filter((v) => v !== null);
    return { t: point.t, value: values.length > 0 ? values.reduce((a, b) => a + b, 0) : null };
  });
}

/** Null where either side is a gap or the denominator is 0. */
export function ratioSeries(numerator, denominator) {
  return numerator.map((point, i) => {
    const d = denominator[i].value;
    return { t: point.t, value: point.value === null || d === null || d === 0 ? null : point.value / d };
  });
}

/** Null when the denominator total is 0. */
export function ratioOfTotals(numerator, denominator) {
  const d = totalOf(denominator);
  return d === 0 ? null : totalOf(numerator) / d;
}

/** a - b, never below 0. Null where either side is a gap. */
export function differenceSeries(a, b) {
  return a.map((point, i) => {
    const other = b[i].value;
    return { t: point.t, value: point.value === null || other === null ? null : Math.max(0, point.value - other) };
  });
}

/** a - b over the points where neither side is a gap, clamped at 0 once for the whole range. */
export function differenceOfTotals(a, b) {
  let difference = 0;
  a.forEach((point, i) => {
    const other = b[i].value;
    if (point.value !== null && other !== null) difference += point.value - other;
  });
  return Math.max(0, difference);
}

/** Bounds of a histogram series from its metadata, or null when the series is not a histogram. */
export function histogramBounds(seriesMeta, name) {
  const meta = seriesMeta?.[name];
  return meta?.type === 'histogram' && Array.isArray(meta.bounds) ? meta.bounds : null;
}

/** Element-wise sum of histogram count arrays; null for an empty list. */
function sumHistograms(histograms) {
  if (histograms.length === 0) return null;
  const length = Math.max(...histograms.map((h) => h.length));
  const sum = new Array(length).fill(0);
  for (const counts of histograms) {
    counts.forEach((count, i) => (sum[i] += count));
  }
  return sum;
}

/** A bucket is a gap only when every 5-minute histogram in it is unknown. */
export function aggregateHistograms(points, bucketMs) {
  return groupByBucket(points, bucketMs, sumHistograms);
}

/** The counts of all points added up; null when every point is a gap. */
export function totalHistogram(points) {
  return sumHistograms(points.filter((p) => p.value !== null).map((p) => p.value));
}

/**
 * The p-th percentile (0-100) of histogram counts, where count i holds values
 * v with bounds[i-1] <= v < bounds[i], count 0 starts from 0 and the last
 * count has no upper bound. Interpolates linearly inside the bucket. A
 * percentile in the last bucket is that bucket's lower bound, the last entry
 * of bounds. Null when every count is 0.
 */
export function histogramPercentile(counts, bounds, p) {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  const rank = (p / 100) * total;
  let below = 0;
  for (let i = 0; i < counts.length; i++) {
    if (counts[i] > 0 && below + counts[i] >= rank) {
      if (i >= bounds.length) break;
      const lower = i === 0 ? 0 : bounds[i - 1];
      return lower + ((rank - below) / counts[i]) * (bounds[i] - lower);
    }
    below += counts[i];
  }
  return bounds[bounds.length - 1];
}

/** Null for a gap and for a bucket with no values. */
export function percentileSeries(histogramPoints, bounds, p) {
  return histogramPoints.map((point) => ({
    t: point.t,
    value: point.value === null ? null : histogramPercentile(point.value, bounds, p),
  }));
}

/**
 * Keys such as family{type=x} of an open-ended breakdown of family, found in
 * any of the slots, sorted.
 */
export function breakdownKeys(slots, family) {
  const prefix = `${family}{`;
  const keys = new Set();
  for (const slot of slots) {
    for (const key of Object.keys(slot)) {
      if (key.startsWith(prefix)) keys.add(key);
    }
  }
  return [...keys].sort();
}

/** 'x' for a key with one label such as name{type=x}. */
export function labelValue(key) {
  const match = /\{[^=]*=(.*)\}$/.exec(key);
  return match ? match[1] : key;
}

/** Map from label value to the total of that key of the breakdown over [from, to). */
export function breakdownTotals(slots, family, from, to) {
  return new Map(
    breakdownKeys(slots, family).map((key) => [labelValue(key), totalOf(extractSeries(slots, key, from, to))])
  );
}

/**
 * The n entries of a Map with the largest positive totals, largest first;
 * equal totals are ordered by key.
 */
export function topEntries(totals, n) {
  return [...totals.entries()]
    .filter(([, total]) => total > 0)
    .sort(([keyA, a], [keyB, b]) => b - a || keyA.localeCompare(keyB))
    .slice(0, n);
}

export function lastKnownPoint(points) {
  for (let i = points.length - 1; i >= 0; i--) {
    if (points[i].value !== null) return points[i];
  }
  return null;
}

/** Splits points at gaps into runs of consecutive points that have a value. */
export function contiguousRuns(points) {
  const runs = [];
  let current = [];
  for (const point of points) {
    if (point.value === null) {
      if (current.length) runs.push(current);
      current = [];
    } else {
      current.push(point);
    }
  }
  if (current.length) runs.push(current);
  return runs;
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

/**
 * Axis ticks in local time: every 2 hours for 6 h, every 3 hours for 24 h,
 * local midnights for longer ranges (every other midnight for 14 days). Local
 * midnights are stepped with the Date constructor so DST days get 23 or 25 hours.
 */
export function localTicks(range, from, to) {
  const ticks = [];
  if (range.ms <= DAY) {
    const everyHours = range.ms <= RANGE_6H.ms ? 2 : 3;
    const d = new Date(from);
    d.setMinutes(0, 0, 0);
    for (; d.getTime() < to; d.setHours(d.getHours() + 1)) {
      if (d.getTime() >= from && d.getHours() % everyHours === 0) {
        ticks.push({ t: d.getTime(), label: `${pad2(d.getHours())}.00` });
      }
    }
    return ticks;
  }
  const everyNth = range.ms > 7 * DAY ? 2 : 1;
  const start = new Date(from);
  for (let i = 1; ; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    if (d.getTime() >= to) break;
    if (i % everyNth === 0) ticks.push({ t: d.getTime(), label: formatDate(d.toISOString()) });
  }
  return ticks;
}
