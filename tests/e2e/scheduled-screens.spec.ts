/**
 * E2E tests for scheduled screens: overlays configured in #/settings
 * (stored in localStorage) that show external pages during a weekly time window.
 */

import { test, expect } from './fixtures.js';

// Monday 2026-09-28, local time
const monday = (h: number, m: number) => new Date(2026, 8, 28, h, m);

test.describe('Scheduled screens', () => {
  test('Screen configured in settings is shown only during its window', async ({ page, baseUrl }) => {
    await page.clock.install({ time: monday(10, 39) });
    await page.goto(`${baseUrl}/#/settings`);
    await page.click('button[data-action="add"]');

    const form = page.locator('.settings-screen').first();
    await form.locator('[name=name]').fill('Lounas');
    await form.locator('[name="days"][value="5"]').uncheck();
    await form.locator('[name=start]').fill('10:40');
    await form.locator('[name=end]').fill('11:20');
    await form.locator('.settings-panel-name').fill('Nykytila');
    await form.locator('.settings-panel-url').fill(`${baseUrl}/data/current.json`);
    await form.locator('button[data-action="add-panel"]').click();
    await form.locator('.settings-panel-url').nth(1).fill(`${baseUrl}/data/history.json`);
    await form.locator('button[type=submit]').click();
    await expect(form.locator('.settings-status')).toHaveText('Tallennettu');

    await page.goto(`${baseUrl}/#/`);
    await page.waitForSelector('.city-grid');
    await expect(page.locator('#scheduled-screen')).toHaveCount(0);

    await page.clock.runFor(60_000);
    await expect(page.locator('#scheduled-screen iframe')).toHaveCount(2);
    await expect(page.locator('.scheduled-screen-name')).toHaveText('Lounas');
    await expect(page.locator('.scheduled-screen-panel-name')).toHaveText(['Nykytila']);

    await page.clock.runFor(40 * 60_000);
    await expect(page.locator('#scheduled-screen')).toHaveCount(0);
  });

  test('Closing hides the screen for the rest of the day', async ({ page, baseUrl }) => {
    await page.clock.install({ time: monday(10, 45) });
    await page.addInitScript(() => {
      localStorage.setItem(
        'evaka-tracker.scheduledScreens',
        JSON.stringify([
          {
            id: 'lunch',
            name: 'Lounas',
            days: [1],
            start: '10:40',
            end: '11:20',
            panels: [
              { name: 'Blanko', url: `${location.origin}/data/current.json`, offsets: { 1: 500 }, cropLeft: 0, cropWidth: 1200 },
            ],
            pageWidth: 1200,
            enabled: true,
          },
        ])
      );
    });
    await page.goto(`${baseUrl}/#/`);
    await expect(page.locator('#scheduled-screen')).toHaveCount(1);

    await page.click('.scheduled-screen-close');
    await expect(page.locator('#scheduled-screen')).toHaveCount(0);
    await page.clock.runFor(60_000);
    await expect(page.locator('#scheduled-screen')).toHaveCount(0);
  });

  test('?now= fakes the clock for local testing', async ({ page, baseUrl }) => {
    // Real clock is a Friday evening, outside the window
    await page.clock.install({ time: new Date(2026, 9, 2, 18, 0) });
    await page.addInitScript(() => {
      localStorage.setItem(
        'evaka-tracker.scheduledScreens',
        JSON.stringify([
          {
            id: 'lunch',
            name: 'Lounas',
            days: [1, 2, 3, 4],
            start: '10:40',
            end: '11:20',
            panels: [
              { name: 'Blanko', url: `${location.origin}/data/current.json`, offsets: { 1: 500 }, cropLeft: 0, cropWidth: 1200 },
            ],
            pageWidth: 1200,
            enabled: true,
          },
        ])
      );
    });
    await page.goto(`${baseUrl}/#/`);
    await expect(page.locator('#scheduled-screen')).toHaveCount(0);

    await page.goto(`${baseUrl}/?now=2026-10-01T10:45#/`);
    await expect(page.locator('#scheduled-screen')).toHaveCount(1);
    await expect(page.locator('.scheduled-screen-bar')).toContainText('testiaika');
  });

  test("Iframe is shifted by the day's offset, adjustable with the wheel in preview", async ({ page, baseUrl }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.clock.install({ time: monday(9, 0) });
    await page.goto(`${baseUrl}/#/settings`);
    await page.click('button[data-action="add"]');
    const form = page.locator('.settings-screen').first();
    await form.locator('[name=name]').fill('Lounas');
    await form.locator('[data-crop="cropLeft"]').fill('300');
    await form.locator('[data-crop="cropWidth"]').fill('600');
    await form.locator('.settings-panel-url').fill(`${baseUrl}/data/current.json`);
    await form.locator('[data-offset-day="1"]').fill('400');
    await form.locator('[name=previewDay]').selectOption('1');
    await form.locator('button[data-action="preview"]').click();

    // 1200px page, strip 300–900 shown in a 1920px-wide panel → scale 3.2
    const iframe = page.locator('#scheduled-screen iframe');
    await expect(iframe).toHaveAttribute('style', /translateX\(-960px\) scale\(3\.2\) translateY\(-400px\)/);

    await page.mouse.move(900, 600);
    await page.mouse.wheel(0, 320);
    await expect(iframe).toHaveAttribute('style', /translateY\(-500px\)/);
    await expect(page.locator('.scheduled-screen-offset')).toHaveText('ma: 500 px');
    await expect(form.locator('[data-offset-day="1"]')).toHaveValue('500');
  });

  test('Non-http URLs are rejected', async ({ page, baseUrl }) => {
    await page.goto(`${baseUrl}/#/settings`);
    await page.click('button[data-action="add"]');
    const form = page.locator('.settings-screen').first();
    await form.locator('[name=name]').fill('Paha');
    await form.locator('.settings-panel-url').fill('javascript:alert(1)');
    await form.locator('button[type=submit]').click();
    await expect(form.locator('.settings-errors')).toContainText('Virheellinen osoite');
    expect(await page.evaluate(() => localStorage.getItem('evaka-tracker.scheduledScreens'))).toBeNull();
  });
});
