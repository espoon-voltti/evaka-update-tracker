/**
 * E2E tests for the metric sparklines in the overview city cards. The read
 * Lambda and S3 are mocked with page routes.
 */

import type { Page } from '@playwright/test';
import { test, expect } from './fixtures.js';
import { STRONG, buildDayFile, dayKey, mockMetricsEndpoint, seedMetricsSettings } from './helpers/metrics-mock.js';

const NOW = new Date('2026-10-06T12:00:00Z');
const OCT_6 = Date.parse('2026-10-06T00:00:00Z');
const MINUTE = 60 * 1000;
const ESPOO_URL = 'https://espoo.lambda-url.eu-north-1.on.aws';
const OULU_URL = 'https://oulu.lambda-url.eu-north-1.on.aws';
const TAMPERE_URL = 'https://tampere.lambda-url.eu-north-1.on.aws';
const TURKU_URL = 'https://turku.lambda-url.eu-north-1.on.aws';

test.use({ timezoneId: 'Europe/Helsinki' });

function cityMetrics(page: Page, cityId: string) {
  return page.locator(`.city-card[data-city-id="${cityId}"] .city-metrics`);
}

/** Time stands still at NOW until the test moves it. */
async function pauseClockAtNow(page: Page) {
  await page.clock.install({ time: NOW.getTime() - 1000 });
  await page.clock.pauseAt(NOW);
  // Keeps the data file polling from firing while the test moves the clock.
  await page.addInitScript(() => {
    (window as unknown as { __autoRefreshInterval: number }).__autoRefreshInterval = 24 * 60 * 60 * 1000;
  });
}

/** Leaves time for a request sent by a timer tick to reach the mock before a test checks that none came. */
async function settle(page: Page) {
  await page.waitForTimeout(500);
}

test.describe('Overview metric sparklines', () => {
  test('without settings the overview has no sparklines and sends nothing outside the site', async ({ page, baseUrl }) => {
    await page.clock.setFixedTime(NOW);
    const outside: string[] = [];
    page.on('request', (request) => {
      if (!request.url().startsWith(baseUrl)) outside.push(request.url());
    });
    await page.goto(`${baseUrl}/#/`);
    await expect(page.locator('.city-card')).toHaveCount(4);
    await settle(page);

    await expect(page.locator('.city-metrics')).toHaveCount(0);
    expect(outside).toEqual([]);
  });

  test('settings for one city show 6-hour sparklines only in its card', async ({ page, baseUrl }) => {
    await page.clock.setFixedTime(NOW);
    // Oulu has a URL but no token, so it is not logged in.
    await seedMetricsSettings(page, {
      espoo: { url: ESPOO_URL, token: 'secret' },
      oulu: { url: OULU_URL, token: '' },
    });
    // The window is 06:00-12:00 UTC; 08:00-09:00 has no slots.
    await mockMetricsEndpoint(page, {
      functionUrl: ESPOO_URL,
      token: 'secret',
      files: { [dayKey(OCT_6)]: buildDayFile(OCT_6, { gapHours: [8, 9] }) },
    });
    await page.goto(`${baseUrl}/#/`);

    const espoo = cityMetrics(page, 'espoo');
    await expect(espoo).toHaveAttribute('data-state', 'ok');
    await expect(page.locator('.city-metrics')).toHaveCount(1);
    // 60 slots: strong 12 + 13 + 11 + 12 + 13 per hour slot, weak 3 each.
    await expect(espoo.locator('.city-metric-value')).toHaveText(['912', /^20\s%$/]);

    const logins = espoo.locator('svg.sparkline').first();
    await expect(logins.locator('title')).toHaveText(
      'Kirjautumiset klo 09.00–15.00: vahva 732, heikko 180, puuttuvia jaksoja 12'
    );
    await expect(logins.locator('rect.bar-strong')).toHaveCount(60);
    await expect(logins.locator('line.sparkline-baseline')).toHaveCount(2);

    const cpu = espoo.locator('svg.sparkline').nth(1);
    await expect(cpu.locator('title')).toContainText('klo 09.00–15.00: viimeisin keskiarvo 20 % (klo 14.55)');
    await expect(cpu.locator('polygon.band-range')).toHaveCount(2);

    await logins.click();
    await expect(page).toHaveURL(/#\/metrics\?range=24h$/);
  });

  test('the window ends where the 5-minute bucket in progress starts', async ({ page, baseUrl }) => {
    await page.clock.setFixedTime(NOW.getTime() + 3 * MINUTE);
    await seedMetricsSettings(page, { espoo: { url: ESPOO_URL, token: 'secret' } });
    await mockMetricsEndpoint(page, {
      functionUrl: ESPOO_URL,
      token: 'secret',
      files: { [dayKey(OCT_6)]: buildDayFile(OCT_6, { gapHours: [8, 9] }) },
    });
    await page.goto(`${baseUrl}/#/`);

    // The same 06:00-12:00 UTC window as at 12:00: the 12:00 slot of the file is not closed yet.
    const espoo = cityMetrics(page, 'espoo');
    await expect(espoo.locator('.city-metric-value')).toHaveText(['912', /^20\s%$/]);
    await expect(espoo.locator('svg.sparkline').first().locator('title')).toHaveText(
      'Kirjautumiset klo 09.00–15.00: vahva 732, heikko 180, puuttuvia jaksoja 12'
    );
  });

  test('a window across UTC midnight joins the files of both days', async ({ page, baseUrl }) => {
    const oct5 = OCT_6 - 24 * 60 * MINUTE;
    await page.clock.setFixedTime(OCT_6 + 2 * 60 * MINUTE);
    await seedMetricsSettings(page, { espoo: { url: ESPOO_URL, token: 'secret' } });
    await mockMetricsEndpoint(page, {
      functionUrl: ESPOO_URL,
      token: 'secret',
      files: { [dayKey(oct5)]: buildDayFile(oct5), [dayKey(OCT_6)]: buildDayFile(OCT_6) },
    });
    await page.goto(`${baseUrl}/#/`);

    // 20:00-02:00 UTC is night: 1 strong login per slot, 48 slots on Oct 5 and 24 on Oct 6.
    const espoo = cityMetrics(page, 'espoo');
    await expect(espoo.locator('.city-metric-value')).toHaveText(['72', /^8\s%$/]);
    await expect(espoo.locator('svg.sparkline').first().locator('title')).toHaveText(
      'Kirjautumiset klo 23.00–05.00: vahva 72, heikko 0, puuttuvia jaksoja 0'
    );
  });

  test('a CPU value older than the collection delay shows as a dash', async ({ page, baseUrl }) => {
    await seedMetricsSettings(page, { espoo: { url: ESPOO_URL, token: 'secret' } });
    // The collector has written nothing from 12:00 UTC on.
    await mockMetricsEndpoint(page, {
      functionUrl: ESPOO_URL,
      token: 'secret',
      files: { [dayKey(OCT_6)]: buildDayFile(OCT_6, { gapHours: [12, 24] }) },
    });
    const espoo = cityMetrics(page, 'espoo');
    const cpu = espoo.locator('.city-metric-value').nth(1);

    // At 12:14 the 12:00 and 12:05 buckets are missing, as they are before the collector writes them.
    await page.clock.setFixedTime(NOW.getTime() + 14 * MINUTE);
    await page.goto(`${baseUrl}/#/`);
    await expect(cpu).toHaveText(/^20\s%$/);

    await page.clock.setFixedTime(NOW.getTime() + 40 * MINUTE);
    await page.reload();
    await expect(cpu).toHaveText('–');
    await expect(espoo.locator('svg.sparkline').nth(1).locator('title')).toContainText(
      'viimeisin keskiarvo 20 % (klo 14.55)'
    );
  });

  test('a value in a day file is shown as text, not as markup', async ({ page, baseUrl }) => {
    await page.clock.setFixedTime(NOW);
    await seedMetricsSettings(page, { espoo: { url: ESPOO_URL, token: 'secret' } });
    const file = buildDayFile(OCT_6);
    const slotAt1155 = file.slots[11 * 12 + 11] as Record<string, unknown>;
    slotAt1155[STRONG] = '<b>9</b>';
    await mockMetricsEndpoint(page, { functionUrl: ESPOO_URL, token: 'secret', files: { [dayKey(OCT_6)]: file } });
    await page.goto(`${baseUrl}/#/`);

    const logins = cityMetrics(page, 'espoo').locator('.city-metric-value').first();
    await expect(logins).toContainText('<b>9</b>');
    await expect(logins.locator('b')).toHaveCount(0);
  });

  test('a refused token, a failing Lambda or no data stays small inside its own card', async ({ page, baseUrl }) => {
    await page.clock.setFixedTime(NOW);
    await seedMetricsSettings(page, {
      espoo: { url: ESPOO_URL, token: 'old' },
      oulu: { url: OULU_URL, token: 'secret' },
      'tampere-region': { url: TAMPERE_URL, token: 'secret' },
      turku: { url: TURKU_URL, token: 'secret' },
    });
    await mockMetricsEndpoint(page, { functionUrl: ESPOO_URL, token: 'new', files: {} });
    await mockMetricsEndpoint(page, {
      functionUrl: OULU_URL,
      token: 'secret',
      files: { [dayKey(OCT_6)]: buildDayFile(OCT_6) },
    });
    await mockMetricsEndpoint(page, { functionUrl: TAMPERE_URL, token: 'secret', files: {} });
    await mockMetricsEndpoint(page, { functionUrl: TURKU_URL, token: 'secret', files: {}, failStatus: 503 });
    await page.goto(`${baseUrl}/#/`);

    const oulu = cityMetrics(page, 'oulu');
    await expect(oulu).toHaveAttribute('data-state', 'ok');
    await expect(oulu.locator('svg.sparkline')).toHaveCount(2);
    await expect(oulu.locator('.city-metric-value')).toHaveText(['1068', /^20\s%$/]);

    const turku = cityMetrics(page, 'turku');
    await expect(turku).toHaveAttribute('data-state', 'error');
    await expect(turku).toHaveText('Mittarit eivät saatavilla');

    const tampere = cityMetrics(page, 'tampere-region');
    await expect(tampere).toHaveAttribute('data-state', 'ok');
    await expect(tampere.locator('.city-metric-value')).toHaveText(['–', '–']);
    await expect(tampere.locator('svg')).toHaveCount(0);

    const espoo = cityMetrics(page, 'espoo');
    await expect(espoo).toHaveAttribute('data-state', 'unauthorized');
    await expect(espoo).toHaveText('Mittarit: tunniste ei kelpaa');
    await expect(page.locator('.city-card[data-city-id="espoo"] .count-badge')).toHaveCount(2);
    await espoo.locator('a').click();
    await expect(page).toHaveURL(/#\/settings$/);
  });

  test('refreshes every 5 minutes, and a re-render does not start a second timer', async ({ page, baseUrl }) => {
    await pauseClockAtNow(page);
    await seedMetricsSettings(page, { espoo: { url: ESPOO_URL, token: 'secret' } });
    const calls = await mockMetricsEndpoint(page, {
      functionUrl: ESPOO_URL,
      token: 'secret',
      files: { [dayKey(OCT_6)]: buildDayFile(OCT_6) },
    });
    await page.goto(`${baseUrl}/#/`);
    const logins = cityMetrics(page, 'espoo').locator('.city-metric-value').first();
    await expect(logins).toHaveText('1068');
    expect(calls.lambda).toBe(1);

    await page.clock.runFor(MINUTE);
    await page.click('#fullscreen-toggle');
    await expect(page.locator('body')).toHaveClass(/fullscreen/);
    await expect(logins).toHaveText('1068');
    expect(calls.lambda).toBe(1);

    // The window moves on: the 06:00 slot (12 + 3) drops out, the 12:00 slot (10 + 3) comes in.
    await page.clock.runFor(4 * MINUTE);
    await expect(logins).toHaveText('1066');
    expect(calls.lambda).toBe(2);

    // A timer started by the re-render at 1 minute would fire at 6 minutes.
    await page.clock.runFor(MINUTE);
    await settle(page);
    expect(calls.lambda).toBe(2);
  });

  test('leaving the overview stops the refresh timer', async ({ page, baseUrl }) => {
    await pauseClockAtNow(page);
    await seedMetricsSettings(page, { espoo: { url: ESPOO_URL, token: 'secret' } });
    const calls = await mockMetricsEndpoint(page, {
      functionUrl: ESPOO_URL,
      token: 'secret',
      files: { [dayKey(OCT_6)]: buildDayFile(OCT_6) },
    });
    await page.goto(`${baseUrl}/#/`);
    await expect(cityMetrics(page, 'espoo')).toHaveAttribute('data-state', 'ok');
    expect(calls.lambda).toBe(1);

    await page.evaluate(() => (location.hash = '#/features'));
    await page.waitForSelector('.feature-matrix');
    await page.clock.runFor(11 * MINUTE);
    await settle(page);
    expect(calls.lambda).toBe(1);

    // Back at 11 minutes, the cache is old enough to fetch at once and a new timer starts.
    await page.evaluate(() => (location.hash = '#/'));
    await expect.poll(() => calls.lambda).toBe(2);
    // The first timer, had it kept running, would fire at 15 minutes; the new one fires at 16.
    await page.clock.runFor(4 * MINUTE);
    await settle(page);
    expect(calls.lambda).toBe(2);
    await page.clock.runFor(MINUTE);
    await expect.poll(() => calls.lambda).toBe(3);
  });
});
