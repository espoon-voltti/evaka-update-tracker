/**
 * Fetches metric day files of one municipality: the read Lambda returns
 * presigned S3 URLs for a time range, and the files come from S3.
 */

const STORAGE_PREFIX = 'evaka-tracker.metrics.';
const LAMBDA_TIMEOUT_MS = 10_000;
const FILE_TIMEOUT_MS = 30_000;

export function settingsKey(cityId) {
  return `${STORAGE_PREFIX}${cityId}`;
}

export function loadMetricsSettings(cityId) {
  try {
    const parsed = JSON.parse(localStorage.getItem(settingsKey(cityId)) || '{}');
    return { url: String(parsed.url || ''), token: String(parsed.token || '') };
  } catch {
    return { url: '', token: '' };
  }
}

export function saveMetricsSettings(cityId, { url, token }) {
  const value = { url: url.trim(), token: token.trim() };
  if (!value.url && !value.token) {
    localStorage.removeItem(settingsKey(cityId));
  } else {
    localStorage.setItem(settingsKey(cityId), JSON.stringify(value));
  }
}

/**
 * kind is 'unauthorized' (the Lambda refused the token) or 'unavailable'
 * (timeout, network error, 5xx or another unexpected response).
 */
export class MetricsError extends Error {
  constructor(kind, detail) {
    super(`${kind}: ${detail}`);
    this.name = 'MetricsError';
    this.kind = kind;
    this.detail = detail;
  }
}

export function lambdaError(status) {
  if (status === 401) return new MetricsError('unauthorized', 'HTTP 401');
  return new MetricsError('unavailable', `HTTP ${status}`);
}

export function filesUrl(baseUrl, from, to) {
  const params = new URLSearchParams({
    from: new Date(from).toISOString(),
    to: new Date(to).toISOString(),
  });
  return `${baseUrl.replace(/\/+$/, '')}/files?${params}`;
}

/**
 * Joins day files into one slot list sorted by t, keeping slots in [from, to).
 * A null entry is a file that does not exist; its period stays a gap.
 */
export function joinDayFiles(files, from, to) {
  const series = {};
  const slots = [];
  for (const file of files) {
    if (!file) continue;
    Object.assign(series, file.series);
    for (const slot of file.slots || []) {
      const t = Date.parse(slot.t);
      if (t >= from && t < to) slots.push(slot);
    }
  }
  slots.sort((a, b) => Date.parse(a.t) - Date.parse(b.t));
  return { series, slots };
}

async function fetchWithTimeout(url, init, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    const detail = err?.name === 'AbortError' ? 'aikakatkaisu' : 'verkkovirhe';
    throw new MetricsError('unavailable', detail);
  } finally {
    clearTimeout(timer);
  }
}

async function requestFileUrls({ url, token }, from, to) {
  const response = await fetchWithTimeout(
    filesUrl(url, from, to),
    { headers: { Authorization: `Bearer ${token}` } },
    LAMBDA_TIMEOUT_MS
  );
  if (!response.ok) throw lambdaError(response.status);
  const body = await response.json();
  return body.files || [];
}

const FORBIDDEN = Symbol('forbidden');

/** Returns the parsed file, null for a missing file, or FORBIDDEN. */
async function fetchDayFile(url) {
  const response = await fetchWithTimeout(url, {}, FILE_TIMEOUT_MS);
  if (response.status === 404) return null;
  if (response.status === 403) return FORBIDDEN;
  if (!response.ok) throw new MetricsError('unavailable', `S3 HTTP ${response.status}`);
  return response.json();
}

async function fetchDayFiles(urls) {
  const results = await Promise.all(urls.map((f) => fetchDayFile(f.url)));
  return new Map(urls.map((f, i) => [f.key, results[i]]));
}

/**
 * Fetches the day files that cover [from, to) as a Map from S3 key to file
 * content (null for a missing file). URLs refused with 403 (expired) are
 * requested again once. Throws MetricsError.
 */
export async function fetchFiles(cityId, from, to) {
  const settings = loadMetricsSettings(cityId);
  const files = await fetchDayFiles(await requestFileUrls(settings, from, to));
  const forbiddenKeys = [...files.keys()].filter((key) => files.get(key) === FORBIDDEN);
  if (forbiddenKeys.length === 0) return files;

  const fresh = await requestFileUrls(settings, from, to);
  const retried = await fetchDayFiles(fresh.filter((f) => forbiddenKeys.includes(f.key)));
  for (const [key, value] of retried) files.set(key, value);
  if ([...files.values()].includes(FORBIDDEN)) {
    throw new MetricsError('unavailable', 'S3 HTTP 403');
  }
  return files;
}
