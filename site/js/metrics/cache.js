/**
 * Module-level cache of fetched metrics per municipality and range. Route
 * re-runs by auto-refresh read from here; the read Lambda is called at most
 * once per REFRESH_INTERVAL per entry, and after the first fetch only the
 * files of the current UTC day (and of the previous one when the day has
 * changed since the last fetch) are fetched again.
 */

import { fetchFiles as defaultFetchFiles, joinDayFiles } from './client.js';
import { DAY, rangeWindow, floorTo } from './series.js';

export const REFRESH_INTERVAL = 5 * 60 * 1000;

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
 * data is { from, to, series, slots } of the last successful fetch.
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

export function loadMetrics(cityId, range, { now = Date.now(), fetchFiles = defaultFetchFiles } = {}) {
  const key = entryKey(cityId, range);
  let entry = entries.get(key);
  if (!entry) {
    entry = { files: null, fetchedAt: null, lastAttemptAt: null, promise: null, state: null };
    entries.set(key, entry);
  }
  if (entry.promise) return entry.promise;
  if (entry.lastAttemptAt !== null && now - entry.lastAttemptAt < REFRESH_INTERVAL) {
    return Promise.resolve(entry.state);
  }

  entry.lastAttemptAt = now;
  const from = entry.files ? floorTo(entry.fetchedAt, DAY) : now - range.ms;
  entry.promise = fetchFiles(cityId, from, now)
    .then((fetched) => {
      const window = rangeWindow(range, now);
      const files = new Map([...(entry.files || []), ...fetched]);
      for (const fileKey of files.keys()) {
        const day = dayOfKey(fileKey);
        if (day !== null && day + DAY <= window.from) files.delete(fileKey);
      }
      entry.files = files;
      entry.fetchedAt = now;
      const data = { ...window, ...joinDayFiles([...files.values()], window.from, window.to) };
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
