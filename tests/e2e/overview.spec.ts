/**
 * E2E tests for overview page.
 * Verifies city cards render with change counts, environment badges, and fullscreen mode.
 */

import { test, expect } from './fixtures.js';

test.describe('Overview — City cards', () => {
  test('All 4 city cards are rendered on overview page', async ({ page, baseUrl }) => {
    await page.goto(`${baseUrl}/#/`);
    await page.waitForSelector('.city-grid');

    const cityCards = page.locator('.city-card');
    await expect(cityCards).toHaveCount(4);
  });

  test('Each city card shows environment status badges', async ({ page, baseUrl }) => {
    await page.goto(`${baseUrl}/#/`);
    await page.waitForSelector('.city-grid');

    const cityCards = page.locator('.city-card');
    const count = await cityCards.count();

    for (let i = 0; i < count; i++) {
      const card = cityCards.nth(i);
      const envSections = card.locator('.env-section');
      const envCount = await envSections.count();
      expect(envCount).toBeGreaterThan(0);
    }
  });

  test('City cards do not show individual PR listings', async ({ page, baseUrl }) => {
    await page.goto(`${baseUrl}/#/`);
    await page.waitForSelector('.city-grid');

    const prTracks = page.locator('.city-card .pr-track');
    await expect(prTracks).toHaveCount(0);
  });

  test('Clicking a city card navigates to city detail page', async ({ page, baseUrl }) => {
    await page.goto(`${baseUrl}/#/`);
    await page.waitForSelector('.city-grid');

    const espooCard = page.locator('.city-card[data-city-id="espoo"]');
    await espooCard.click();

    await page.waitForSelector('.city-detail');
    await expect(page.locator('.city-detail h2')).toHaveText('Espoo');
  });
});

test.describe('Overview — Change count badges', () => {
  test('Each city card displays change count badges', async ({ page, baseUrl }) => {
    await page.goto(`${baseUrl}/#/`);
    await page.waitForSelector('.city-grid');

    const cityCards = page.locator('.city-card');
    const count = await cityCards.count();

    for (let i = 0; i < count; i++) {
      const card = cityCards.nth(i);
      const changeCounts = card.locator('.change-counts');
      await expect(changeCounts).toBeVisible();

      const badges = card.locator('.count-badge');
      await expect(badges).toHaveCount(2);
    }
  });

  test('Espoo card shows correct staging and pending counts', async ({ page, baseUrl }) => {
    await page.goto(`${baseUrl}/#/`);
    await page.waitForSelector('.city-grid');

    const espooCard = page.locator('.city-card[data-city-id="espoo"]');
    const stagingValue = espooCard.locator('.count-badge.staging .count-value');
    const pendingValue = espooCard.locator('.count-badge.pending .count-value');

    // Espoo: 3 core inStaging (no wrapper), 1 core pendingDeployment
    await expect(stagingValue).toHaveText('3');
    await expect(pendingValue).toHaveText('1');
  });

  test('Tampere card includes wrapper PRs in staging count', async ({ page, baseUrl }) => {
    await page.goto(`${baseUrl}/#/`);
    await page.waitForSelector('.city-grid');

    const tampereCard = page.locator('.city-card[data-city-id="tampere-region"]');
    const stagingValue = tampereCard.locator('.count-badge.staging .count-value');
    const pendingValue = tampereCard.locator('.count-badge.pending .count-value');

    // Tampere: 3 core + 1 wrapper inStaging = 4, 1 core pendingDeployment
    await expect(stagingValue).toHaveText('4');
    await expect(pendingValue).toHaveText('1');
  });
});

test.describe('Overview — Fullscreen mode', () => {
  test('Fullscreen toggle button is visible on overview page', async ({ page, baseUrl }) => {
    await page.goto(`${baseUrl}/#/`);
    await page.waitForSelector('.city-grid');

    const toggle = page.locator('#fullscreen-toggle');
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveText('Koko näyttö');
  });

  test('Clicking toggle activates fullscreen mode', async ({ page, baseUrl }) => {
    await page.goto(`${baseUrl}/#/`);
    await page.waitForSelector('.city-grid');

    await page.locator('#fullscreen-toggle').click();
    await page.waitForSelector('body.fullscreen');

    await expect(page.locator('body')).toHaveClass(/fullscreen/);
    await expect(page.locator('header')).not.toBeVisible();
  });

  test('Footer status bar remains visible in fullscreen mode', async ({ page, baseUrl }) => {
    await page.goto(`${baseUrl}/#/?fullscreen=true`);
    await page.waitForSelector('.city-grid');

    await expect(page.locator('body')).toHaveClass(/fullscreen/);
    await expect(page.locator('footer')).toBeVisible();
  });

  test('Clicking toggle again exits fullscreen mode', async ({ page, baseUrl }) => {
    await page.goto(`${baseUrl}/#/`);
    await page.waitForSelector('.city-grid');

    // Enter fullscreen
    await page.locator('#fullscreen-toggle').click();
    await page.waitForSelector('body.fullscreen');

    // Exit fullscreen
    await page.locator('#fullscreen-toggle').click();
    await page.waitForFunction(() => !document.body.classList.contains('fullscreen'));

    await expect(page.locator('header')).toBeVisible();
  });

  test('Esc key exits fullscreen mode', async ({ page, baseUrl }) => {
    await page.goto(`${baseUrl}/#/?fullscreen=true`);
    await page.waitForSelector('body.fullscreen');

    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.body.classList.contains('fullscreen'));

    await expect(page.locator('header')).toBeVisible();
  });

  test('Navigating to fullscreen URL activates fullscreen on load', async ({ page, baseUrl }) => {
    await page.goto(`${baseUrl}/#/?fullscreen=true`);
    await page.waitForSelector('.city-grid');

    await expect(page.locator('body')).toHaveClass(/fullscreen/);
    await expect(page.locator('header')).not.toBeVisible();
    await expect(page.locator('#fullscreen-toggle')).toHaveText('Poistu koko näytöstä');
  });
});
