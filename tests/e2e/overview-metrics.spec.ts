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
    // The window is 05:55-11:55 UTC; 08:00-09:00 has no slots.
    await mockMetricsEndpoint(page, {
      functionUrl: ESPOO_URL,
      token: 'secret',
      files: { [dayKey(OCT_6)]: buildDayFile(OCT_6, { gapHours: [8, 9] }) },
    });
    await page.goto(`${baseUrl}/#/`);

    const espoo = cityMetrics(page, 'espoo');
    await expect(espoo).toHaveAttribute('data-state', 'ok');
    await expect(page.locator('.city-metrics')).toHaveCount(1);
    await expect(espoo.locator('.city-metric-label')).toHaveText(['Kuntalaisten kirjautumiset', 'Tietokanta CPU']);
    await expect(espoo.locator('.city-metric-legend li')).toHaveText(['vahva', 'kevyt']);
    await expect(espoo.locator('.city-metric-axis').first().locator('.city-metric-tick')).toHaveText([
      '10.00',
      '12.00',
      '14.00',
    ]);
    // 60 slots: strong 11 at 05:55, then 12 + 13 + 11 + 12 per hour slot and 13 in the 11 slots of 11:00-11:55; weak 3 each.
    // The 11:50 slot has 13 + 3.
    await expect(espoo.locator('.city-metric-value')).toHaveText(['16', /^20\s%$/]);
    await expect(espoo.locator('.city-metric-detail')).toHaveText(['yht. 910', /^max 45\s%$/]);

    const logins = espoo.locator('svg.sparkline').first();
    await expect(logins.locator('title')).toHaveText(
      'Kuntalaisten kirjautumiset klo 08.55–14.55: vahva 730, kevyt 180, viimeisin 5 min 16 (klo 14.50), puuttuvia jaksoja 12'
    );
    await expect(logins.locator('rect.bar-strong')).toHaveCount(60);
    await expect(logins.locator('line.sparkline-baseline')).toHaveCount(2);

    const cpu = espoo.locator('svg.sparkline').nth(1);
    await expect(cpu.locator('title')).toContainText('klo 08.55–14.55: viimeisin keskiarvo 20 % (klo 14.50), suurin 45 %');
    await expect(cpu.locator('polygon.band-range')).toHaveCount(2);

    await logins.click();
    await expect(page).toHaveURL(/#\/metrics\?range=24h$/);
  });

  test('the window leaves out the 5-minute bucket that closed last, as the collector has not written it yet', async ({
    page,
    baseUrl,
  }) => {
    await page.clock.setFixedTime(NOW.getTime() + 3 * MINUTE);
    await seedMetricsSettings(page, { espoo: { url: ESPOO_URL, token: 'secret' } });
    await mockMetricsEndpoint(page, {
      functionUrl: ESPOO_URL,
      token: 'secret',
      files: { [dayKey(OCT_6)]: buildDayFile(OCT_6, { gapHours: [8, 9] }) },
    });
    await page.goto(`${baseUrl}/#/`);

    // The same 05:55-11:55 UTC window as at 12:00, although the file has the 11:55 and 12:00 slots.
    const espoo = cityMetrics(page, 'espoo');
    await expect(espoo.locator('.city-metric-value')).toHaveText(['16', /^20\s%$/]);
    await expect(espoo.locator('svg.sparkline').first().locator('title')).toHaveText(
      'Kuntalaisten kirjautumiset klo 08.55–14.55: vahva 730, kevyt 180, viimeisin 5 min 16 (klo 14.50), puuttuvia jaksoja 12'
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

    // 19:55-01:55 UTC is night: 1 strong login per slot, 49 slots on Oct 5 and 23 on Oct 6.
    const espoo = cityMetrics(page, 'espoo');
    await expect(espoo.locator('.city-metric-value')).toHaveText(['1', /^8\s%$/]);
    await expect(espoo.locator('.city-metric-detail')).toHaveText(['yht. 72', /^max 15\s%$/]);
    await expect(espoo.locator('svg.sparkline').first().locator('title')).toHaveText(
      'Kuntalaisten kirjautumiset klo 22.55–04.55: vahva 72, kevyt 0, viimeisin 5 min 1 (klo 04.50), puuttuvia jaksoja 0'
    );
  });

  test('a value older than the collection delay shows as a dash', async ({ page, baseUrl }) => {
    await seedMetricsSettings(page, { espoo: { url: ESPOO_URL, token: 'secret' } });
    // The collector has written nothing from 12:00 UTC on.
    await mockMetricsEndpoint(page, {
      functionUrl: ESPOO_URL,
      token: 'secret',
      files: { [dayKey(OCT_6)]: buildDayFile(OCT_6, { gapHours: [12, 24] }) },
    });
    const espoo = cityMetrics(page, 'espoo');
    const values = espoo.locator('.city-metric-value');

    // At 12:14 the window ends at 12:05, and its last bucket at 12:00 is missing, as it is when the
    // collector is a few minutes late. The values come from the 11:55 bucket.
    await page.clock.setFixedTime(NOW.getTime() + 14 * MINUTE);
    await page.goto(`${baseUrl}/#/`);
    await expect(values).toHaveText(['16', /^20\s%$/]);

    await page.clock.setFixedTime(NOW.getTime() + 40 * MINUTE);
    await page.reload();
    await expect(values).toHaveText(['–', '–']);
    await expect(espoo.locator('.city-metric-detail')).toHaveText([/^yht\. \d+$/, /^max 45\s%$/]);
    await expect(espoo.locator('svg.sparkline').first().locator('title')).toContainText('viimeisin 5 min 16 (klo 14.55)');
    await expect(espoo.locator('svg.sparkline').nth(1).locator('title')).toContainText(
      'viimeisin keskiarvo 20 % (klo 14.55)'
    );
  });

  test('a time label near an end of the window stays inside the chart', async ({ page, baseUrl }) => {
    await seedMetricsSettings(page, { espoo: { url: ESPOO_URL, token: 'secret' } });
    await mockMetricsEndpoint(page, {
      functionUrl: ESPOO_URL,
      token: 'secret',
      files: { [dayKey(OCT_6)]: buildDayFile(OCT_6) },
    });
    const espoo = cityMetrics(page, 'espoo');
    const chart = espoo.locator('.city-metric-chart').first();
    const ticks = espoo.locator('.city-metric-axis').first().locator('.city-metric-tick');

    // The window is 07.55-13.55 in Helsinki, so 08.00 is 5 minutes from the start.
    await page.clock.setFixedTime(NOW.getTime() - 60 * MINUTE);
    await page.goto(`${baseUrl}/#/`);
    await expect(ticks).toHaveText(['08.00', '10.00', '12.00']);
    const first = (await ticks.first().boundingBox())!;
    expect(first.x).toBeGreaterThanOrEqual((await chart.boundingBox())!.x);

    // The window is 08.05-14.05 in Helsinki, so 14.00 is 5 minutes from the end.
    await page.clock.setFixedTime(NOW.getTime() - 50 * MINUTE);
    await page.reload();
    await expect(ticks).toHaveText(['10.00', '12.00', '14.00']);
    const last = (await ticks.last().boundingBox())!;
    const box = (await chart.boundingBox())!;
    expect(last.x + last.width).toBeLessThanOrEqual(box.x + box.width);
  });

  test('a value in a day file is shown as text, not as markup', async ({ page, baseUrl }) => {
    await page.clock.setFixedTime(NOW);
    await seedMetricsSettings(page, { espoo: { url: ESPOO_URL, token: 'secret' } });
    const file = buildDayFile(OCT_6);
    const slotAt1150 = file.slots[11 * 12 + 10] as Record<string, unknown>;
    slotAt1150[STRONG] = '<b>9</b>';
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
    await expect(oulu.locator('.city-metric-value')).toHaveText(['16', /^20\s%$/]);
    await expect(oulu.locator('.city-metric-detail')).toHaveText(['yht. 1066', /^max 45\s%$/]);

    const turku = cityMetrics(page, 'turku');
    await expect(turku).toHaveAttribute('data-state', 'error');
    await expect(turku).toHaveText('Mittarit eivät saatavilla');

    const tampere = cityMetrics(page, 'tampere-region');
    await expect(tampere).toHaveAttribute('data-state', 'ok');
    await expect(tampere.locator('.city-metric-value')).toHaveText(['–', '–']);
    await expect(tampere.locator('.city-metric-detail')).toHaveCount(0);
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
    const logins = cityMetrics(page, 'espoo').locator('.city-metric-detail').first();
    await expect(logins).toHaveText('yht. 1066');
    expect(calls.lambda).toBe(1);

    await page.clock.runFor(MINUTE);
    await page.click('#fullscreen-toggle');
    await expect(page.locator('body')).toHaveClass(/fullscreen/);
    await expect(logins).toHaveText('yht. 1066');
    expect(calls.lambda).toBe(1);

    // The window moves on: the 05:55 slot (11 + 3) drops out, the 11:55 slot (13 + 3) comes in.
    await page.clock.runFor(4 * MINUTE);
    await expect(logins).toHaveText('yht. 1068');
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
