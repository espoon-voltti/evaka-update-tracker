/**
 * E2E tests for User Story 2: Production PRs on overview page.
 * Verifies all city cards show "In Production" labeled PR sections.
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SERVER_INFO_PATH = path.resolve('tests/e2e/test-data/.server-info.json');

function getBaseUrl(): string {
  const info = JSON.parse(fs.readFileSync(SERVER_INFO_PATH, 'utf-8'));
  return info.url;
}

test.describe('Overview — In Production sections', () => {
  test('All 4 city cards are rendered on overview page', async ({ page }) => {
    const baseUrl = getBaseUrl();
    await page.goto(`${baseUrl}/#/`);
    await page.waitForSelector('.city-grid');

    const cityCards = page.locator('.city-card');
    await expect(cityCards).toHaveCount(4);
  });

  test('Each city card shows "Core — In Production" header with PR items', async ({ page }) => {
    const baseUrl = getBaseUrl();
    await page.goto(`${baseUrl}/#/`);
    await page.waitForSelector('.city-grid');

    const cityCards = page.locator('.city-card');
    const count = await cityCards.count();

    for (let i = 0; i < count; i++) {
      const card = cityCards.nth(i);
      const coreHeader = card.locator('.pr-track-header', { hasText: 'Ydin — Tuotannossa' });
      await expect(coreHeader).toBeVisible();

      // Each card should have at least one PR item
      const prItems = card.locator('.pr-item');
      const prCount = await prItems.count();
      expect(prCount).toBeGreaterThan(0);
    }
  });

  test('Tampere card shows "Wrapper — In Production" header', async ({ page }) => {
    const baseUrl = getBaseUrl();
    await page.goto(`${baseUrl}/#/`);
    await page.waitForSelector('.city-grid');

    // Tampere card has data-city-id="tampere-region"
    const tampereCard = page.locator('.city-card[data-city-id="tampere-region"]');
    await expect(tampereCard).toBeVisible();

    const wrapperHeader = tampereCard.locator('.pr-track-header', { hasText: 'Kuntaimplementaatio — Tuotannossa' });
    await expect(wrapperHeader).toBeVisible();
  });

  test('Clicking a city card navigates to city detail page', async ({ page }) => {
    const baseUrl = getBaseUrl();
    await page.goto(`${baseUrl}/#/`);
    await page.waitForSelector('.city-grid');

    // Click Espoo card
    const espooCard = page.locator('.city-card[data-city-id="espoo"]');
    await espooCard.click();

    // Should navigate to city detail
    await page.waitForSelector('.city-detail');
    await expect(page.locator('.city-detail h2')).toHaveText('Espoo');
  });
});
