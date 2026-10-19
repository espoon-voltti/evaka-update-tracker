/**
 * Module-level cache of fetched metrics per municipality and range. Route
 * re-runs by auto-refresh read from here; unless forced, the read Lambda is
 * called at most once per refresh period per entry. After the first fetch
 * only the files of the current UTC day (and of the previous one when the day
 * has changed since the last fetch) are fetched again.
 */

import { fetchFiles as defaultFetchFiles, joinDayFiles } from './client.js';
import { DAY, FIVE_MINUTES, rangeWindow, floorTo } from './series.js';

// The metrics collector (ops-metrics module in evaka-infra-shared) runs every 5 minutes,
// at minute 1 by its default collector_schedule, and finishes in well under a minute.
// A refresh period starts at minute 2, when the data of the run is there.
export const REFRESH_INTERVAL = 5 * 60 * 1000;
const REFRESH_OFFSET = 2 * 60 * 1000;

/** The start of the refresh period that contains now. */
export function refreshPeriodStart(now) {
  return floorTo(now - REFRESH_OFFSET, REFRESH_INTERVAL) + REFRESH_OFFSET;
}

const entries = new Map();

function entryKey(cityId, range) {
  return `${cityId}|${range.key}`;
}

function dayOfKey(key) {
  const match = /(\d{4})\/(\d{2})\/(\d{2})\.json$/.exec(key);
  return match ? Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
}

/**
 * The latest state, or null before the first load: { data, error, lastSuccessAt }.
 * data is { from, to, series, slots } of the last successful fetch, where from
 * is the start of the 5-minute bucket that contains the start of the range.
 * A new object is created on each change.
 */
export function peekMetrics(cityId, range) {
  return entries.get(entryKey(cityId, range))?.state ?? null;
}

export function invalidateMetrics(cityId) {
  for (const key of [...entries.keys()]) {
    if (key.startsWith(`${cityId}|`)) entries.delete(key);
  }
}

/** force fetches even within the refresh period of the last fetch, but still joins a fetch in progress. */
export function loadMetrics(cityId, range, { now = Date.now(), fetchFiles = defaultFetchFiles, force = false } = {}) {
  const key = entryKey(cityId, range);
  let entry = entries.get(key);
  if (!entry) {
    entry = { files: null, fetchedAt: null, lastAttemptAt: null, promise: null, state: null };
    entries.set(key, entry);
  }
  if (entry.promise) return entry.promise;
  if (!force && entry.lastAttemptAt !== null && entry.lastAttemptAt >= refreshPeriodStart(now)) {
    return Promise.resolve(entry.state);
  }

  entry.lastAttemptAt = now;
  const from = entry.files ? floorTo(entry.fetchedAt, DAY) : now - range.ms;
  entry.promise = fetchFiles(cityId, from, now)
    .then((fetched) => {
      const window = rangeWindow(range, now);
      const from = floorTo(window.from, FIVE_MINUTES);
      const files = new Map([...(entry.files || []), ...fetched]);
      for (const fileKey of files.keys()) {
        const day = dayOfKey(fileKey);
        if (day !== null && day + DAY <= from) files.delete(fileKey);
      }
      entry.files = files;
      entry.fetchedAt = now;
      const data = { from, to: window.to, ...joinDayFiles([...files.values()], from, window.to) };
      entry.state = { data, error: null, lastSuccessAt: now };
    })
    .catch((error) => {
      entry.state = { data: entry.state?.data ?? null, error, lastSuccessAt: entry.state?.lastSuccessAt ?? null };
    })
    .then(() => {
      entry.promise = null;
      return entry.state;
    });
  return entry.promise;
}
