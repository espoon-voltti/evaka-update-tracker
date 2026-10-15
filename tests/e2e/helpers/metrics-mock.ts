/**
 * Mocks of the ops-metrics read Lambda (Function URL) and the presigned S3
 * URLs it returns, for E2E tests and view snapshots.
 */

import type { Page } from '@playwright/test';

const FIVE_MINUTES = 5 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;

export const STRONG = 'citizen.login{auth=strong}';
const WEAK = 'citizen.login{auth=weak}';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization',
  'Access-Control-Allow-Methods': 'GET',
};

interface DayFileOptions {
  /** UTC hours [start, end) that have no slots. */
  gapHours?: [number, number];
}

export function dayKey(dayStartMs: number): string {
  const d = new Date(dayStartMs);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `5min/${d.getUTCFullYear()}/${pad(d.getUTCMonth() + 1)}/${pad(d.getUTCDate())}.json`;
}

/** A synthetic day file: strong logins are always at least 1 per slot. */
export function buildDayFile(dayStartMs: number, options: DayFileOptions = {}) {
  const slots = [];
  for (let t = dayStartMs; t < dayStartMs + DAY; t += FIVE_MINUTES) {
    const hour = new Date(t).getUTCHours();
    if (options.gapHours && hour >= options.gapHours[0] && hour < options.gapHours[1]) continue;
    const daytime = hour >= 5 && hour < 17;
    slots.push({
      t: new Date(t).toISOString().replace('.000Z', 'Z'),
      [STRONG]: daytime ? 10 + (hour % 4) : 1,
      [WEAK]: daytime ? 3 : 0,
      'rds.cpu': { min: 4, mean: daytime ? 20 : 8, max: daytime ? 45 : 15, n: 5 },
    });
  }
  return {
    series: {
      [STRONG]: { type: 'counter' },
      [WEAK]: { type: 'counter' },
      'rds.cpu': { type: 'gaugeSummary' },
    },
    slots,
  };
}

interface MetricsEndpoint {
  functionUrl: string;
  /** Token the Lambda accepts. */
  token: string;
  /** Day files by S3 key; a key that is not here gives 404. */
  files: Record<string, unknown>;
  /** When set, the Lambda answers with this status instead. */
  failStatus?: number;
}

/** Installs page routes for one Function URL; returns the Lambda call count. */
export async function mockMetricsEndpoint(page: Page, endpoint: MetricsEndpoint) {
  const calls = { lambda: 0 };
  const s3Base = `${endpoint.functionUrl.replace('https://', 'https://s3.')}/`;

  await page.route(`${endpoint.functionUrl}/files**`, async (route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: CORS_HEADERS });
      return;
    }
    calls.lambda++;
    const json = (status: number, body: unknown) =>
      route.fulfill({ status, headers: CORS_HEADERS, contentType: 'application/json', body: JSON.stringify(body) });
    if (endpoint.failStatus) return json(endpoint.failStatus, { error: 'failure' });
    if (request.headers()['authorization'] !== `Bearer ${endpoint.token}`) {
      return json(401, { error: 'unauthorized' });
    }
    const params = new URL(request.url()).searchParams;
    const from = Date.parse(params.get('from')!);
    const to = Date.parse(params.get('to')!);
    const files = [];
    for (let day = Math.floor(from / DAY) * DAY; day < to; day += DAY) {
      const key = dayKey(day);
      files.push({ key, url: `${s3Base}${key}?X-Amz-Signature=test` });
    }
    return json(200, { resolution: '5min', files, expiresAt: new Date(to + 15 * 60 * 1000).toISOString() });
  });

  await page.route(`${s3Base}**`, async (route) => {
    const key = new URL(route.request().url()).pathname.slice(1);
    const file = endpoint.files[key];
    if (!file) {
      await route.fulfill({ status: 404, headers: CORS_HEADERS, body: 'NoSuchKey' });
      return;
    }
    await route.fulfill({ status: 200, headers: CORS_HEADERS, contentType: 'application/json', body: JSON.stringify(file) });
  });

  return calls;
}

/** Stores the Function URL and token of a municipality before the page loads. */
export async function seedMetricsSettings(page: Page, settings: Record<string, { url: string; token: string }>) {
  await page.addInitScript((entries) => {
    for (const [cityId, value] of Object.entries(entries)) {
      localStorage.setItem(`evaka-tracker.metrics.${cityId}`, JSON.stringify(value));
    }
  }, settings);
}
