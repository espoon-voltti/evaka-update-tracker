/**
 * E2E tests for importing metrics settings in #/settings from a link that
 * scripts/metrics-import-link.sh prints.
 */

import type { Page } from '@playwright/test';
import { test, expect } from './fixtures.js';
import { mockMetricsEndpoint, seedMetricsSettings } from './helpers/metrics-mock.js';

const ESPOO_URL = 'https://espoo.lambda-url.eu-north-1.on.aws';
const OULU_URL = 'https://oulu.lambda-url.eu-west-1.on.aws';
const TURKU_URL = 'https://turku.lambda-url.eu-west-1.on.aws';
const ESPOO_TOKEN = 'espoo-token-5678';
const OULU_TOKEN = 'oulu-token-9012';

function importCode(cities: Record<string, { url: string; token: string }>) {
  return Buffer.from(JSON.stringify({ v: 1, env: 'staging', cities })).toString('base64url');
}

function importLink(baseUrl: string, code: string) {
  return `${baseUrl}/#/settings?import=${code}`;
}

async function storedMetricsSettings(page: Page) {
  return page.evaluate(() =>
    Object.fromEntries(
      Object.keys(localStorage)
        .filter((key) => key.startsWith('evaka-tracker.metrics.'))
        .map((key) => [key.slice('evaka-tracker.metrics.'.length), JSON.parse(localStorage.getItem(key)!)])
    )
  );
}

/** Collects console output so that a test can check that no token was logged. */
function captureConsole(page: Page) {
  const lines: string[] = [];
  page.on('console', (message) => lines.push(message.text()));
  page.on('pageerror', (error) => lines.push(String(error)));
  return lines;
}

test.describe('Metrics settings import', () => {
  test('a pasted Slack message previews the import, and Tallenna saves it for the metrics view', async ({
    page,
    baseUrl,
  }) => {
    const consoleLines = captureConsole(page);
    // AWS gives the Function URL with a trailing slash.
    const code = importCode({ espoo: { url: `${ESPOO_URL}/`, token: ESPOO_TOKEN } });
    await mockMetricsEndpoint(page, { functionUrl: ESPOO_URL, token: ESPOO_TOKEN, files: {} });
    await page.goto(`${baseUrl}/#/settings`);

    await page.fill('.settings-import-text', `Uudet asetukset: <${importLink(baseUrl, code)}|tuontilinkki> kiitos!`);
    const preview = page.locator('.settings-import-preview');
    await expect(preview.locator('.settings-import-env')).toHaveText('staging');
    await expect(preview.locator('tbody tr')).toHaveCount(1);
    await expect(preview.locator('tr[data-city-id="espoo"] td')).toHaveText([
      'Espoo',
      'espoo.lambda-url.eu-north-1.on.aws',
      '••••5678',
    ]);
    await expect(preview.locator('.settings-import-skipped')).toHaveCount(0);
    await expect(page.getByRole('textbox', { name: 'Liitä linkki tai tuontikoodi' })).toHaveAccessibleDescription(
      /Ympäristö: staging.*Espoo/
    );
    expect(await page.content()).not.toContain(ESPOO_TOKEN);
    expect(await storedMetricsSettings(page)).toEqual({});

    await preview.locator('button[type=submit]').click();
    await expect(page.locator('.settings-import .settings-status')).toHaveText('Tallennettu: Espoo');
    await expect(page.locator('.settings-import-text')).toHaveValue('');
    await expect(preview).toBeEmpty();
    const espooRow = page.locator('.settings-metrics-row[data-city-id="espoo"]');
    await expect(espooRow.locator('[name=url]')).toHaveValue(`${ESPOO_URL}/`);
    await expect(espooRow.locator('[name=token]')).toHaveValue(ESPOO_TOKEN);
    expect(await storedMetricsSettings(page)).toEqual({ espoo: { url: `${ESPOO_URL}/`, token: ESPOO_TOKEN } });
    expect(await page.content()).not.toContain(ESPOO_TOKEN);

    await page.click('.tab[data-city-id="metrics"]');
    await expect(page.locator('.metrics-section[data-city-id="espoo"] .metrics-body')).toHaveAttribute('data-state', 'ok');
    expect(consoleLines.filter((line) => line.includes(ESPOO_TOKEN))).toEqual([]);
  });

  test('an import link prefills the box, leaves the history, and saves only after Tallenna', async ({
    page,
    baseUrl,
  }) => {
    const consoleLines = captureConsole(page);
    const code = importCode({
      espoo: { url: `${ESPOO_URL}/`, token: ESPOO_TOKEN },
      oulu: { url: `${OULU_URL}/`, token: OULU_TOKEN },
      vantaa: { url: 'https://vantaa.lambda-url.eu-north-1.on.aws/', token: 'vantaa-token' },
    });
    await page.goto(importLink(baseUrl, code));

    await expect(page.locator('.settings-import-text')).toHaveValue(code);
    const preview = page.locator('.settings-import-preview');
    await expect(preview.locator('tbody tr')).toHaveCount(2);
    await expect(preview.locator('tr[data-city-id="oulu"] td').first()).toHaveText('Oulu');
    await expect(preview.locator('.settings-import-skipped')).toHaveText('Ohitetaan tuntemattomat kunnat: vantaa');
    expect(await page.evaluate(() => location.hash)).toBe('#/settings');
    expect(await storedMetricsSettings(page)).toEqual({});

    // The same path as auto-refresh after a data change.
    await page.evaluate(async () => (await import('./js/app.js')).refreshCurrentView());
    await expect(page.locator('.settings-import-text')).toHaveValue(code);
    await expect(preview.locator('tbody tr')).toHaveCount(2);
    expect(await storedMetricsSettings(page)).toEqual({});

    await preview.locator('button[type=submit]').click();
    await expect(page.locator('.settings-import .settings-status')).toHaveText('Tallennettu: Espoo, Oulu');
    expect(await storedMetricsSettings(page)).toEqual({
      espoo: { url: `${ESPOO_URL}/`, token: ESPOO_TOKEN },
      oulu: { url: `${OULU_URL}/`, token: OULU_TOKEN },
    });
    expect(consoleLines.filter((line) => line.includes(ESPOO_TOKEN) || line.includes(OULU_TOKEN))).toEqual([]);
  });

  test('an import link opened from another view leaves no code in the session history', async ({ page, baseUrl }) => {
    await page.goto(`${baseUrl}/#/`);
    await page.waitForSelector('.city-grid');
    const historyLength = await page.evaluate(() => history.length);
    await page.goto(importLink(baseUrl, importCode({ espoo: { url: `${ESPOO_URL}/`, token: ESPOO_TOKEN } })));
    await expect(page.locator('.settings-import-preview tbody tr')).toHaveCount(1);
    expect(await page.evaluate(() => [history.length, location.hash])).toEqual([historyLength + 1, '#/settings']);

    await page.goBack();
    await expect(page).toHaveURL(`${baseUrl}/#/`);
    await page.waitForSelector('.city-grid');
    await page.goForward();
    await expect(page).toHaveURL(`${baseUrl}/#/settings`);
    // Coming back to settings shows an empty import box.
    await expect(page.locator('.settings-import-text')).toHaveValue('');
    await expect(page.locator('.settings-import-preview')).toBeEmpty();
  });

  test('invalid input shows the error without a save button and saves nothing', async ({ page, baseUrl }) => {
    await page.goto(importLink(baseUrl, 'eyJ2IjoxLCJlbnYi'));
    const form = page.locator('.settings-import');
    await expect(form.locator('.settings-errors')).toContainText('Tuontikoodi on virheellinen');
    await expect(form.locator('.settings-import-preview')).toHaveAttribute('aria-live', 'polite');
    await expect(page.getByRole('textbox', { name: 'Liitä linkki tai tuontikoodi' })).toHaveAccessibleDescription(
      /Tuontikoodi on virheellinen/
    );
    await expect(form.locator('button[type=submit]')).toHaveCount(0);
    expect(await page.evaluate(() => location.hash)).toBe('#/settings');

    // One invalid city rejects the whole import.
    await page.fill(
      '.settings-import-text',
      importCode({
        espoo: { url: `${ESPOO_URL}/`, token: ESPOO_TOKEN },
        oulu: { url: 'https://oulu.example.com/', token: OULU_TOKEN },
      })
    );
    await expect(form.locator('.settings-errors')).toHaveText('Kunnan oulu osoite ei ole Lambda-funktion https-osoite.');
    await expect(form.locator('button[type=submit]')).toHaveCount(0);

    await form.locator('[data-action="cancel-import"]').click();
    await expect(form.locator('.settings-import-text')).toHaveValue('');
    await expect(form.locator('.settings-import-preview')).toBeEmpty();
    await expect(form.locator('.settings-import-preview')).not.toHaveCSS('display', 'none');
    expect(await storedMetricsSettings(page)).toEqual({});
  });

  test('saving an import leaves the settings of other cities unchanged', async ({ page, baseUrl }) => {
    await seedMetricsSettings(page, {
      espoo: { url: 'https://old.lambda-url.eu-north-1.on.aws', token: 'old' },
      turku: { url: TURKU_URL, token: 'turku-token' },
    });
    await page.goto(importLink(baseUrl, importCode({ espoo: { url: `${ESPOO_URL}/`, token: ESPOO_TOKEN } })));
    await page.click('.settings-import button[type=submit]');
    await expect(page.locator('.settings-import .settings-status')).toHaveText('Tallennettu: Espoo');

    expect(await storedMetricsSettings(page)).toEqual({
      espoo: { url: `${ESPOO_URL}/`, token: ESPOO_TOKEN },
      turku: { url: TURKU_URL, token: 'turku-token' },
    });
    const turkuRow = page.locator('.settings-metrics-row[data-city-id="turku"]');
    await expect(turkuRow.locator('[name=url]')).toHaveValue(TURKU_URL);
    await expect(turkuRow.locator('[name=token]')).toHaveValue('turku-token');
  });
});
