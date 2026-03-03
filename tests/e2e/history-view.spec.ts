/**
 * E2E tests for history view.
 * Verifies release-grouped display, bot filtering, environment sections,
 * Finnish language, and navigation.
 */

import { test, expect } from './fixtures.js';

test.describe('History View — Release-Grouped PR Display', () => {
  test('History page loads and shows releases with PR titles', async ({ page, baseUrl }) => {
    await page.goto(`${baseUrl}/#/city/espoo/history`);
    await page.waitForSelector('.city-detail');

    const events = page.locator('.history-event');
    const count = await events.count();
    expect(count).toBeGreaterThan(0);

    // PR titles should be visible
    const prTitles = page.locator('.history-event .pr-title');
    const titleCount = await prTitles.count();
    expect(titleCount).toBeGreaterThan(0);
  });

  test('Core PRs show label badges', async ({ page, baseUrl }) => {
    await page.goto(`${baseUrl}/#/city/espoo/history?showBots=true`);
    await page.waitForSelector('.city-detail');

    // Core PRs should have label badges
    const coreTrack = page.locator('.history-event .pr-track-header:has-text("Ydin")').first();
    await expect(coreTrack).toBeVisible();

    // Find labels within the same pr-track as a Ydin header
    const labels = page.locator('.history-event .pr-label');
    const labelCount = await labels.count();
    expect(labelCount).toBeGreaterThan(0);
  });

  test('Releases show Ydin sub-headers for core PRs', async ({ page, baseUrl }) => {
    await page.goto(`${baseUrl}/#/city/espoo/history?showBots=true`);
    await page.waitForSelector('.city-detail');

    const coreHeaders = page.locator('.pr-track-header:has-text("Ydin")');
    const count = await coreHeaders.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('History View — Production First', () => {
  test('Production section appears before staging section', async ({ page, baseUrl }) => {
    await page.goto(`${baseUrl}/#/city/espoo/history?showBots=true`);
    await page.waitForSelector('.city-detail');

    const sections = await page.evaluate(() => {
      const headings = document.querySelectorAll('.history-env-heading');
      return Array.from(headings).map(h => h.textContent?.trim());
    });

    const prodIdx = sections.indexOf('Tuotanto');
    const stagingIdx = sections.indexOf('Testaus');
    expect(prodIdx).toBeGreaterThanOrEqual(0);
    if (stagingIdx >= 0) {
      expect(prodIdx).toBeLessThan(stagingIdx);
    }
  });

  test('Production releases have production CSS class', async ({ page, baseUrl }) => {
    await page.goto(`${baseUrl}/#/city/espoo/history?showBots=true`);
    await page.waitForSelector('.city-detail');

    const prodEvents = page.locator('.history-event.production');
    const count = await prodEvents.count();
    expect(count).toBeGreaterThan(0);
  });

  test('Staging releases have staging CSS class', async ({ page, baseUrl }) => {
    await page.goto(`${baseUrl}/#/city/espoo/history?showBots=true`);
    await page.waitForSelector('.city-detail');

    const stagingEvents = page.locator('.history-event.staging');
    const count = await stagingEvents.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('History View — Bot Filtering', () => {
  test('Bot toggle button exists', async ({ page, baseUrl }) => {
    await page.goto(`${baseUrl}/#/city/espoo/history`);
    await page.waitForSelector('.city-detail');

    const botToggle = page.locator('#bot-toggle');
    await expect(botToggle).toBeVisible();
    await expect(botToggle).toHaveText('Näytä riippuvuuspäivitykset');
  });

  test('Clicking bot toggle adds showBots query param', async ({ page, baseUrl }) => {
    await page.goto(`${baseUrl}/#/city/espoo/history`);
    await page.waitForSelector('.city-detail');

    await page.locator('#bot-toggle').click();
    await page.waitForSelector('#bot-toggle.active');

    const url = page.url();
    expect(url).toContain('showBots=true');
  });

  test('Direct URL with showBots=true shows bot toggle active', async ({ page, baseUrl }) => {
    await page.goto(`${baseUrl}/#/city/espoo/history?showBots=true`);
    await page.waitForSelector('.city-detail');

    const toggle = page.locator('#bot-toggle.active');
    await expect(toggle).toBeVisible();
  });
});

test.describe('History View — Finnish Language & Navigation', () => {
  test('Back navigation uses arrow with city name', async ({ page, baseUrl }) => {
    await page.goto(`${baseUrl}/#/city/espoo/history`);
    await page.waitForSelector('.city-detail');

    const backLink = page.locator('[data-action="back-to-city"]');
    await expect(backLink).toBeVisible();
    const text = await backLink.textContent();
    expect(text).toMatch(/^← /);
    expect(text).toContain('Espoo');
  });

  test('Back navigation navigates to city detail', async ({ page, baseUrl }) => {
    await page.goto(`${baseUrl}/#/city/espoo/history`);
    await page.waitForSelector('.city-detail');

    await page.locator('[data-action="back-to-city"]').click();
    await page.waitForSelector('.city-detail');

    const url = page.url();
    expect(url).toContain('#/city/espoo');
    expect(url).not.toContain('/history');
  });

  test('Page heading includes Muutoshistoria', async ({ page, baseUrl }) => {
    await page.goto(`${baseUrl}/#/city/espoo/history`);
    await page.waitForSelector('.city-detail');

    await expect(page.locator('.city-detail h2')).toContainText('Muutoshistoria');
  });
});

test.describe('History View — Tampere (core + wrapper)', () => {
  test('Tampere releases show both Ydin and Kuntaimplementaatio sub-headers', async ({ page, baseUrl }) => {
    await page.goto(`${baseUrl}/#/city/tampere-region/history?showBots=true`);
    await page.waitForSelector('.city-detail');

    const coreHeaders = page.locator('.pr-track-header:has-text("Ydin")');
    const wrapperHeaders = page.locator('.pr-track-header:has-text("Kuntaimplementaatio")');

    const coreCount = await coreHeaders.count();
    const wrapperCount = await wrapperHeaders.count();
    expect(coreCount).toBeGreaterThan(0);
    expect(wrapperCount).toBeGreaterThan(0);
  });
});
