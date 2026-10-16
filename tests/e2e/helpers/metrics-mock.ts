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

type LogSource = 'service' | 'apigw' | 'proxy';

interface DayFileOptions {
  /** UTC hours [start, end) that have no slots. */
  gapHours?: [number, number];
  /** Log groups that the collector read. Defaults to all; rds.cpu comes from CloudWatch metrics and is always there. */
  sources?: LogSource[];
}

/** Rounded bounds of three logarithmic buckets per decade, as the collector writes them. */
const RESPONSE_TIME_BOUNDS = [2.15, 4.64, 10, 21.54, 46.42, 100, 215.44, 464.16, 1000, 2154.43, 4641.59, 10000];

const APIGW_APPS = ['citizen', 'employee', 'mobile', 'other'] as const;
const CLASSES = ['2xx', '3xx', '4xx', '5xx'] as const;

/** Share of async job runs of each type that fail in a 5-minute slot. */
const JOB_FAILURE_RATES: Record<string, number> = {
  SendMessageNotificationEmail: 0.04,
  SendPushNotification: 0.06,
  VardaUpdateChild: 0.03,
  SendPendingDecisionEmail: 0.02,
  DvvModificationsRefresh: 0.01,
  GenerateFinanceDecision: 0.008,
  SendPatuReport: 0.004,
};

/** Share of a weekday peak, by UTC hour. */
const HOURLY_LOAD = [
  0.04, 0.03, 0.03, 0.05, 0.15, 0.55, 0.9, 1, 1, 0.95, 0.9, 1, 0.95, 0.8, 0.6, 0.5, 0.4, 0.3, 0.25, 0.2, 0.14, 0.1, 0.07,
  0.05,
];

/** Response time shape around 20-50 ms, as weights of the 13 buckets. */
const RESPONSE_TIME_SHAPE = [0.2, 1, 4, 14, 30, 26, 14, 6, 3, 1.2, 0.4, 0.15, 0.05];

/** A deterministic number in [0, 1) for a slot, so that snapshots stay stable. */
function noise(t: number, salt: number): number {
  let x = Math.imul(t / FIVE_MINUTES, 0x9e3779b1) ^ Math.imul(salt + 1, 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 15), 0x2c1b3c6d);
  x = Math.imul(x ^ (x >>> 12), 0x297a2d39);
  return ((x ^ (x >>> 15)) >>> 0) / 2 ** 32;
}

function occasional(t: number, salt: number, probability: number, max = 1): number {
  return noise(t, salt) < probability ? 1 + Math.floor(noise(t, salt + 1000) * max) : 0;
}

/**
 * Splits total into histogram counts. shift moves the shape towards slower
 * buckets, and slowTail adds that many requests to the buckets of 1 s and more.
 */
function responseTimes(total: number, t: number, salt: number, shift: number, slowTail = 0): number[] {
  const weights = RESPONSE_TIME_SHAPE.map((_, i) => {
    const w = RESPONSE_TIME_SHAPE[Math.min(12, Math.max(0, i - shift))];
    return w * (0.8 + 0.4 * noise(t, salt + i));
  });
  const sum = weights.reduce((a, b) => a + b, 0);
  const counts = weights.map((w) => Math.floor((total * w) / sum));
  const mode = weights.indexOf(Math.max(...weights));
  counts[mode] += total - counts.reduce((a, b) => a + b, 0);
  for (let i = 0; i < slowTail; i++) counts[9 + (i % 4)]++;
  return counts;
}

function serviceValues(t: number, load: number, daytime: boolean) {
  const values: Record<string, unknown> = {};
  const requests = Math.round(1500 * load * (0.9 + 0.2 * noise(t, 1)));
  const errorBurst = occasional(t, 2, 0.006, 40);
  const r5xx = (daytime ? occasional(t, 3, 0.3, 2) : 0) + errorBurst;
  const r4xx = Math.round(requests * 0.03);
  const r3xx = Math.round(requests * 0.02);
  values['service.requests{class=2xx}'] = Math.max(0, requests - r3xx - r4xx - r5xx);
  values['service.requests{class=3xx}'] = r3xx;
  values['service.requests{class=4xx}'] = r4xx;
  values['service.requests{class=5xx}'] = r5xx;
  values['service.responseTime'] = responseTimes(requests, t, 10, load < 0.2 ? -1 : 0, errorBurst);
  values['service.errors'] = r5xx + occasional(t, 4, 0.2 * load, 2);

  let failed = 0;
  let permanentlyFailed = 0;
  Object.entries(JOB_FAILURE_RATES).forEach(([type, rate], i) => {
    const count = occasional(t, 20 + i, rate, 2);
    const permanent = occasional(t, 40 + i, rate / 8);
    if (count) values[`service.asyncJob.failed{type=${type}}`] = count;
    if (permanent) values[`service.asyncJob.permanentlyFailed{type=${type}}`] = permanent;
    failed += count;
    permanentlyFailed += permanent;
  });
  values['service.asyncJob.failed'] = failed;
  values['service.asyncJob.permanentlyFailed'] = permanentlyFailed;

  values['employee.login{method=ad}'] = Math.round(6 * load * noise(t, 5));
  values['employee.login{method=sfi}'] = occasional(t, 6, 0.15 * load);
  values['employee.login{method=pin}'] = Math.round(3 * load * noise(t, 7));
  values['citizen.loginAttempt{auth=weak}'] = (daytime ? 3 : 0) + weakLoginFailures(t, load);
  values['message.sent{by=employee}'] = Math.round(6 * load * noise(t, 8));
  values['message.sent{by=citizen}'] = Math.round(4 * load * noise(t, 9));
  values['message.sent{by=reply}'] = Math.round(8 * load * noise(t, 11));
  values['passkey.registered'] = occasional(t, 12, 0.05 * load);
  values['push.subscribed{app=citizen}'] = occasional(t, 13, 0.12 * load);
  values['push.subscribed{app=employee}'] = occasional(t, 14, 0.04 * load);
  const hour = new Date(t).getUTCHours();
  values['integration.failed{system=email}'] = occasional(t, 15, 0.02);
  values['integration.failed{system=webpush}'] = occasional(t, 16, 0.08 * load, 3);
  values['integration.failed{system=varda}'] = hour >= 9 && hour < 11 ? occasional(t, 17, 0.7, 4) : 0;
  values['integration.failed{system=dvv}'] = occasional(t, 18, 0.004);
  values['vtj.requests{result=ok}'] = Math.round(8 * load * (0.5 + noise(t, 19)));
  values['vtj.requests{result=error}'] = occasional(t, 30, 0.02);
  values['sanityCheck.failed'] = hour === 3 && new Date(t).getUTCMinutes() === 0 ? 1 : 0;
  return values;
}

function weakLoginFailures(t: number, load: number): number {
  return occasional(t, 31, 0.3 * load, 2);
}

function apigwValues(t: number, load: number, service: Record<string, unknown>) {
  const values: Record<string, unknown> = {};
  const serviceRequests = CLASSES.reduce((sum, c) => sum + (service[`service.requests{class=${c}}`] as number), 0);
  const service5xx = service['service.requests{class=5xx}'] as number;
  const shares = { citizen: 0.4, employee: 0.48, mobile: 0.1, other: 0.02 };
  APIGW_APPS.forEach((app, i) => {
    const requests = Math.round(serviceRequests * shares[app] * (0.9 + 0.2 * noise(t, 50 + i)));
    const s401 = Math.round(requests * 0.015 * noise(t, 55 + i));
    const s429 = app === 'citizen' ? occasional(t, 60, 0.01, 6) : 0;
    const r5xx = Math.round(service5xx * shares[app]);
    const r4xx = Math.round(requests * 0.01) + s401 + s429;
    const r3xx = Math.round(requests * 0.01);
    values[`apigw.requests{app=${app},class=2xx}`] = Math.max(0, requests - r3xx - r4xx - r5xx);
    values[`apigw.requests{app=${app},class=3xx}`] = r3xx;
    values[`apigw.requests{app=${app},class=4xx}`] = r4xx;
    values[`apigw.requests{app=${app},class=5xx}`] = r5xx;
    values[`apigw.status401{app=${app}}`] = s401;
    values[`apigw.status429{app=${app}}`] = s429;
    values[`apigw.responseTime{app=${app}}`] = responseTimes(requests, t, 70 + 13 * i, app === 'mobile' ? 2 : 1);
  });
  values['login.failed{method=sfi}'] = occasional(t, 61, 0.05 * load);
  values['login.failed{method=ad}'] = occasional(t, 62, 0.08 * load);
  values['login.failed{method=weak}'] = weakLoginFailures(t, load);
  values['login.failed{method=passkey}'] = occasional(t, 63, 0.02 * load);
  values['login.rateLimited'] = occasional(t, 64, 0.004, 10);
  return values;
}

function proxyValues(t: number, load: number, apigw: Record<string, unknown>) {
  const apigwClass = (c: string) =>
    APIGW_APPS.reduce((sum, app) => sum + (apigw[`apigw.requests{app=${app},class=${c}}`] as number), 0);
  const assets = Math.round(800 * load * (0.8 + 0.4 * noise(t, 80)));
  const s502 = occasional(t, 81, 0.004, 20);
  const s504 = occasional(t, 82, 0.003, 5);
  return {
    'proxy.requests{class=2xx}': apigwClass('2xx') + assets,
    'proxy.requests{class=3xx}': apigwClass('3xx') + Math.round(assets * 0.3),
    'proxy.requests{class=4xx}': apigwClass('4xx'),
    'proxy.requests{class=5xx}': apigwClass('5xx') + s502 + s504,
    'proxy.status502': s502,
    'proxy.status504': s504,
  };
}

function seriesMeta(name: string) {
  if (name.includes('responseTime')) return { type: 'histogram', bounds: RESPONSE_TIME_BOUNDS };
  if (name === 'rds.cpu') return { type: 'gaugeSummary' };
  return { type: 'counter' };
}

export function dayKey(dayStartMs: number): string {
  const d = new Date(dayStartMs);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `5min/${d.getUTCFullYear()}/${pad(d.getUTCMonth() + 1)}/${pad(d.getUTCDate())}.json`;
}

/**
 * A synthetic day file with every series of the collector contract. Strong
 * logins are always at least 1 per slot. Load follows the time of day and is
 * lower on weekends.
 */
export function buildDayFile(dayStartMs: number, options: DayFileOptions = {}) {
  const sources = options.sources ?? ['service', 'apigw', 'proxy'];
  const slots = [];
  for (let t = dayStartMs; t < dayStartMs + DAY; t += FIVE_MINUTES) {
    const date = new Date(t);
    const hour = date.getUTCHours();
    if (options.gapHours && hour >= options.gapHours[0] && hour < options.gapHours[1]) continue;
    const daytime = hour >= 5 && hour < 17;
    const weekend = date.getUTCDay() === 0 || date.getUTCDay() === 6;
    const load = HOURLY_LOAD[hour] * (weekend ? 0.3 : 1);
    const service = serviceValues(t, load, daytime);
    const apigw = apigwValues(t, load, service);
    slots.push({
      t: date.toISOString().replace('.000Z', 'Z'),
      [STRONG]: daytime ? 10 + (hour % 4) : 1,
      [WEAK]: daytime ? 3 : 0,
      'rds.cpu': { min: 4, mean: daytime ? 20 : 8, max: daytime ? 45 : 15, n: 5 },
      ...(sources.includes('service') ? service : {}),
      ...(sources.includes('apigw') ? apigw : {}),
      ...(sources.includes('proxy') ? proxyValues(t, load, apigw) : {}),
    });
  }
  const names = [...new Set(slots.flatMap((slot) => Object.keys(slot)))].filter((name) => name !== 't');
  return {
    series: Object.fromEntries(names.map((name) => [name, seriesMeta(name)])),
    slots,
  };
}

/** Day files by S3 key for each UTC day from firstDayMs to lastDayMs. */
export function buildDayFiles(firstDayMs: number, lastDayMs: number, options: DayFileOptions = {}) {
  const files: Record<string, unknown> = {};
  for (let day = firstDayMs; day <= lastDayMs; day += DAY) files[dayKey(day)] = buildDayFile(day, options);
  return files;
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
