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

/**
 * One point per 5-minute bucket from the bucket containing `from` up to `to`.
 * A bucket with no slot, or a slot without the series key, has value null.
 */
export function extractSeries(slots, name, from, to) {
  const byTime = new Map();
  for (const slot of slots) {
    if (slot[name] !== undefined && slot[name] !== null) {
      byTime.set(Date.parse(slot.t), slot[name]);
    }
  }
  const points = [];
  for (let t = floorTo(from, FIVE_MINUTES); t < to; t += FIVE_MINUTES) {
    points.push({ t, value: byTime.has(t) ? byTime.get(t) : null });
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

function pad2(n) {
  return String(n).padStart(2, '0');
}

/**
 * Axis ticks in local time: every 3 hours for 24 h, local midnights for
 * longer ranges (every other midnight for 14 days). Local midnights are
 * stepped with the Date constructor so DST days get 23 or 25 hours.
 */
export function localTicks(range, from, to) {
  const ticks = [];
  if (range.ms <= DAY) {
    const d = new Date(from);
    d.setMinutes(0, 0, 0);
    for (; d.getTime() < to; d.setHours(d.getHours() + 1)) {
      if (d.getTime() >= from && d.getHours() % 3 === 0) {
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
