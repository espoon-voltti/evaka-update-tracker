/**
 * E2E tests for the operational metrics view (#/metrics). The read Lambda and
 * S3 are mocked with page routes.
 */

import { test, expect } from './fixtures.js';
import {
  buildDayFile,
  buildDayFiles,
  dayKey,
  mockMetricsEndpoint,
  seedMetricsSettings,
} from './helpers/metrics-mock.js';

const NOW = new Date('2026-10-06T12:00:00Z');
const OCT_5 = Date.parse('2026-10-05T00:00:00Z');
const SEP_22 = Date.parse('2026-09-22T00:00:00Z');
const OCT_6 = Date.parse('2026-10-06T00:00:00Z');
const ESPOO_URL = 'https://espoo.lambda-url.eu-north-1.on.aws';
const OULU_URL = 'https://oulu.lambda-url.eu-north-1.on.aws';

test.use({ timezoneId: 'Europe/Helsinki' });

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(NOW);
});

test.describe('Metrics view', () => {
  test('without any Function URL points to settings, and settings enable a section', async ({ page, baseUrl }) => {
    await mockMetricsEndpoint(page, { functionUrl: ESPOO_URL, token: 'secret', files: {} });
    await page.goto(`${baseUrl}/#/metrics`);
    await expect(page.locator('.metrics-no-url')).toBeVisible();
    await expect(page.locator('.tab[data-city-id="metrics"]')).toHaveClass(/active/);

    await page.click('.metrics-no-url a');
    const row = page.locator('.settings-metrics-row[data-city-id="espoo"]');
    await row.locator('[name=url]').fill(ESPOO_URL);
    await row.locator('[name=token]').fill('secret');
    await page.click('.settings-metrics button[type=submit]');
    await expect(page.locator('.settings-metrics .settings-status')).toHaveText('Tallennettu');

    await page.click('.tab[data-city-id="metrics"]');
    await expect(page.locator('.metrics-section[data-city-id="espoo"] .metrics-body')).toHaveAttribute('data-state', 'ok');
    await expect(page.locator('.metrics-section')).toHaveCount(1);
    await expect(page.locator('.metrics-view')).toContainText('Ei asetettu: Tampereen seutu, Oulu, Turku.');
  });

  test('a municipality with a Function URL but no token links to settings', async ({ page, baseUrl }) => {
    await seedMetricsSettings(page, { espoo: { url: ESPOO_URL, token: '' } });
    await page.goto(`${baseUrl}/#/metrics`);

    const body = page.locator('.metrics-section[data-city-id="espoo"] .metrics-body');
    await expect(body).toHaveAttribute('data-state', 'no-token');
    await expect(body).toHaveText('Lisää kunnan tunniste asetuksissa.');

    await body.locator('a[href="#/settings"]').click();
    await expect(page).toHaveURL(/#\/settings$/);
    await expect(page.locator('.settings-metrics-row[data-city-id="espoo"] [name=url]')).toHaveValue(ESPOO_URL);
  });

  test('401 links to settings, where a new token loads the data', async ({ page, baseUrl }) => {
    await seedMetricsSettings(page, { espoo: { url: ESPOO_URL, token: 'old' } });
    await mockMetricsEndpoint(page, {
      functionUrl: ESPOO_URL,
      token: 'new',
      files: { [dayKey(OCT_5)]: buildDayFile(OCT_5) },
    });
    await page.goto(`${baseUrl}/#/metrics?range=24h`);

    const body = page.locator('.metrics-section[data-city-id="espoo"] .metrics-body');
    await expect(body).toHaveAttribute('data-state', 'unauthorized');
    const settingsLink = body.locator('a[href="#/settings"]');
    await expect(settingsLink).toHaveText('Mittarit: tunniste ei kelpaa');

    await settingsLink.click();
    await page.locator('.settings-metrics-row[data-city-id="espoo"] [name=token]').fill('new');
    await page.click('.settings-metrics button[type=submit]');
    await expect(page.locator('.settings-metrics .settings-status')).toHaveText('Tallennettu');

    await page.click('.tab[data-city-id="metrics"]');
    await expect(body).toHaveAttribute('data-state', 'ok');
    await expect(body.locator('[data-chart="citizen-logins"] svg.chart')).toBeVisible();
  });

  test('renders charts with gaps for missing slots and a missing day file', async ({ page, baseUrl }) => {
    await seedMetricsSettings(page, { espoo: { url: ESPOO_URL, token: 'secret' } });
    // Oct 5 has no slots 14:00-15:00 UTC; the Oct 6 file does not exist (404).
    const calls = await mockMetricsEndpoint(page, {
      functionUrl: ESPOO_URL,
      token: 'secret',
      files: { [dayKey(OCT_5)]: buildDayFile(OCT_5, { gapHours: [14, 15] }) },
    });
    await page.goto(`${baseUrl}/#/metrics?range=24h`);

    const section = page.locator('.metrics-section[data-city-id="espoo"]');
    await expect(section.locator('.metrics-body')).toHaveAttribute('data-state', 'ok');
    // 24 h has 288 buckets: 12 + 144 of them are gaps.
    await expect(section.locator('rect.bar-strong')).toHaveCount(132);
    await expect(section.locator('[data-chart="citizen-logins"] svg.chart')).toHaveAttribute(
      'aria-label',
      /puuttuvia jaksoja 156/
    );
    await expect(section.locator('polygon.band-range')).toHaveCount(2);
    // The window starts at 15.00 Helsinki time.
    await expect(section.locator('.chart-axis-x').first().locator('.chart-label').filter({ hasText: /\.00$/ }).first()).toHaveText('15.00');
    expect(calls.lambda).toBe(1);

    // Leaving and returning within the same refresh period uses the cache. The overview
    // fetches only the 6-hour range of its sparklines.
    await page.click('.tab[data-city-id=""]');
    await page.waitForSelector('.city-metrics[data-state="ok"]');
    expect(calls.lambda).toBe(2);
    await page.evaluate(() => (location.hash = '#/metrics?range=24h'));
    await expect(section.locator('rect.bar-strong')).toHaveCount(132);
    expect(calls.lambda).toBe(2);

    await page.click('.metrics-range-btn[data-range="7d"]');
    await expect(page).toHaveURL(/#\/metrics\?range=7d$/);
    await expect(page.locator('.metrics-range-btn.active')).toHaveText('7 vrk');
    // Hourly bars: all of Oct 5 UTC without the 14:00 hour.
    await expect(section.locator('rect.bar-strong')).toHaveCount(23);
  });

  test('one failing municipality does not hide the others', async ({ page, baseUrl }) => {
    await seedMetricsSettings(page, {
      espoo: { url: ESPOO_URL, token: 'secret' },
      oulu: { url: OULU_URL, token: 'secret' },
    });
    await mockMetricsEndpoint(page, { functionUrl: ESPOO_URL, token: 'secret', files: {}, failStatus: 503 });
    await mockMetricsEndpoint(page, {
      functionUrl: OULU_URL,
      token: 'secret',
      files: { [dayKey(OCT_5)]: buildDayFile(OCT_5) },
    });
    await page.goto(`${baseUrl}/#/metrics?range=24h`);

    const espoo = page.locator('.metrics-section[data-city-id="espoo"] .metrics-body');
    await expect(espoo).toHaveAttribute('data-state', 'error');
    await expect(espoo).toContainText('Mittaritiedot eivät ole saatavilla (HTTP 503)');
    await expect(espoo).toContainText('Yhtään hakua ei ole vielä onnistunut');

    const oulu = page.locator('.metrics-section[data-city-id="oulu"] .metrics-body');
    await expect(oulu).toHaveAttribute('data-state', 'ok');
    await expect(oulu.locator('[data-chart="citizen-logins"] svg.chart')).toBeVisible();
  });

  test('a slow response for the previous range does not replace the current one', async ({ page, baseUrl }) => {
    await seedMetricsSettings(page, { espoo: { url: ESPOO_URL, token: 'secret' } });
    await mockMetricsEndpoint(page, {
      functionUrl: ESPOO_URL,
      token: 'secret',
      files: { [dayKey(OCT_5)]: buildDayFile(OCT_5) },
    });
    let releaseSlow = () => {};
    const slowReleased = new Promise<void>((resolve) => (releaseSlow = resolve));
    let slowAnswered = false;
    await page.route(`${ESPOO_URL}/files**`, async (route) => {
      const from = Date.parse(new URL(route.request().url()).searchParams.get('from')!);
      if (NOW.getTime() - from > 2 * 24 * 60 * 60 * 1000) {
        await slowReleased;
        slowAnswered = true;
      }
      await route.fallback();
    });
    await page.goto(`${baseUrl}/#/metrics?range=14d`);

    const body = page.locator('.metrics-section[data-city-id="espoo"] .metrics-body');
    await expect(body).toHaveAttribute('data-state', 'loading');
    await page.click('.metrics-range-btn[data-range="24h"]');
    await expect(body.locator('svg.chart').first()).toHaveAttribute('aria-label', /, 24 h:/);

    releaseSlow();
    await expect.poll(() => slowAnswered).toBe(true);
    await page.waitForLoadState('networkidle');
    await expect(body.locator('svg.chart').first()).toHaveAttribute('aria-label', /, 24 h:/);
  });

  test('renders every section in order with the charts of all sources', async ({ page, baseUrl }) => {
    await seedMetricsSettings(page, { espoo: { url: ESPOO_URL, token: 'secret' } });
    await mockMetricsEndpoint(page, {
      functionUrl: ESPOO_URL,
      token: 'secret',
      files: { [dayKey(OCT_5)]: buildDayFile(OCT_5), [dayKey(OCT_6)]: buildDayFile(OCT_6) },
    });
    await page.goto(`${baseUrl}/#/metrics?range=24h`);

    const body = page.locator('.metrics-section[data-city-id="espoo"] .metrics-body');
    await expect(body).toHaveAttribute('data-state', 'ok');
    await expect(body.locator('.metrics-group > h3')).toHaveText([
      'Kuormitus ja virheet',
      'Kirjautumiset',
      'Taustatyöt',
      'Integraatiot',
      'Käyttö',
      'Tietokanta',
    ]);
    const chartIds = await body.locator('.metrics-chart').evaluateAll((charts) => charts.map((c) => c.getAttribute('data-chart')));
    expect(chartIds).toEqual([
      'service-5xx-rate',
      'service-response-time',
      'service-errors',
      'apigw-response-time',
      'apigw-errors',
      'proxy-errors',
      'citizen-logins',
      'employee-logins',
      'failed-logins',
      'weak-login-failures',
      'login-rate-limited',
      'async-job-failures',
      'async-job-types',
      'integration-failures',
      'vtj-requests',
      'messages-sent',
      'passkey-registrations',
      'push-subscriptions',
      'rds-cpu',
    ]);
    await expect(body.locator('.chart-empty')).toHaveCount(0);
    await expect(body.locator('svg.chart')).toHaveCount(18);
    const xAxes = await body.locator('.chart-axis-x').evaluateAll((axes) => axes.map((axis) => axis.innerHTML));
    expect(new Set(xAxes).size).toBe(1);

    await expect(body.locator('[data-chart="service-5xx-rate"] svg.chart')).toHaveAttribute(
      'aria-label',
      /^Palvelun 5xx-virheiden osuus, 24 h: koko jakson osuus \d+,\d\d %, puuttuvia jaksoja 0$/
    );
    await expect(body.locator('[data-chart="service-response-time"] svg.chart')).toHaveAttribute(
      'aria-label',
      /: koko jakson p50 \d+ ms, p95 \d+ ms,/
    );
    await expect(body.locator('[data-chart="service-response-time"] polyline.line')).toHaveCount(2);
    await expect(body.locator('[data-chart="apigw-response-time"] polyline.line')).toHaveCount(4);
    await expect(body.locator('[data-chart="weak-login-failures"] h4')).toHaveText(
      'Heikon tunnistautumisen epäonnistumiset (arvio)'
    );

    const rows = body.locator('[data-chart="async-job-types"] tbody tr');
    await expect(rows).toHaveCount(5);
    const failures = await rows.evaluateAll((trs) => trs.map((tr) => Number(tr.children[1].textContent)));
    expect(failures).toEqual([...failures].sort((a, b) => b - a));
    expect(failures.every((n) => n > 0)).toBe(true);
  });

  test('a municipality with only the service log group shows placeholders for apigw and proxy charts', async ({
    page,
    baseUrl,
  }) => {
    await seedMetricsSettings(page, { oulu: { url: OULU_URL, token: 'secret' } });
    await mockMetricsEndpoint(page, {
      functionUrl: OULU_URL,
      token: 'secret',
      files: {
        [dayKey(OCT_5)]: buildDayFile(OCT_5, { sources: ['service'] }),
        [dayKey(OCT_6)]: buildDayFile(OCT_6, { sources: ['service'] }),
      },
    });
    await page.goto(`${baseUrl}/#/metrics?range=24h`);

    const body = page.locator('.metrics-section[data-city-id="oulu"] .metrics-body');
    await expect(body).toHaveAttribute('data-state', 'ok');
    const placeholders = body.locator('.metrics-chart:has(.chart-empty)');
    await expect(placeholders.locator('.chart-empty')).toHaveText(Array(5).fill('Ei tietoa'));
    const emptyIds = await placeholders.evaluateAll((charts) => charts.map((c) => c.getAttribute('data-chart')));
    expect(emptyIds).toEqual([
      'apigw-response-time',
      'apigw-errors',
      'proxy-errors',
      'failed-logins',
      'login-rate-limited',
    ]);
    await expect(placeholders.locator('svg, .chart-legend')).toHaveCount(0);
    await expect(body.locator('svg.chart')).toHaveCount(13);
    await expect(body.locator('[data-chart="async-job-types"] tbody tr')).toHaveCount(5);
  });

  test('renders 5-minute buckets for 24 hours and hourly buckets for 14 days', async ({ page, baseUrl }) => {
    await seedMetricsSettings(page, { espoo: { url: ESPOO_URL, token: 'secret' } });
    // Every day has no slots 14:00-15:00 UTC.
    await mockMetricsEndpoint(page, {
      functionUrl: ESPOO_URL,
      token: 'secret',
      files: buildDayFiles(SEP_22, OCT_6, { gapHours: [14, 15] }),
    });
    await page.goto(`${baseUrl}/#/metrics?range=24h`);

    const body = page.locator('.metrics-section[data-city-id="espoo"] .metrics-body');
    const logins = body.locator('[data-chart="citizen-logins"]');
    const responseTime = body.locator('[data-chart="service-response-time"]');
    // 288 buckets, 12 of them in the gap.
    await expect(logins.locator('rect.bar-strong')).toHaveCount(276);
    await expect(responseTime.locator('rect.hover-target')).toHaveCount(276);
    await expect(responseTime.locator('svg.chart')).toHaveAttribute('aria-label', /, 24 h: .*puuttuvia jaksoja 12$/);

    await page.click('.metrics-range-btn[data-range="14d"]');
    // 336 hours from Sep 22 12:00 UTC, one gap hour on each of 14 days.
    await expect(logins.locator('rect.bar-strong')).toHaveCount(322);
    await expect(responseTime.locator('rect.hover-target')).toHaveCount(322);
    await expect(responseTime.locator('svg.chart')).toHaveAttribute('aria-label', /, 14 vrk: .*puuttuvia jaksoja 14$/);
    await expect(responseTime.locator('.chart-axis-x .chart-label').first()).toHaveText('24.9.');
    await expect(body.locator('.chart-empty')).toHaveCount(0);
  });
});
