/**
 * E2E tests for User Story 1 & 3: Production PRs on city detail page.
 * Verifies "In Production" section, PR links, bot toggle, and visual distinction.
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SERVER_INFO_PATH = path.resolve('tests/e2e/test-data/.server-info.json');

function getBaseUrl(): string {
  const info = JSON.parse(fs.readFileSync(SERVER_INFO_PATH, 'utf-8'));
  return info.url;
}

test.describe('City Detail — In Production section', () => {
  test('Espoo city detail page shows "In Production" heading with deployed PRs', async ({ page }) => {
    const baseUrl = getBaseUrl();
    await page.goto(`${baseUrl}/#/city/espoo`);
    await page.waitForSelector('.city-detail');

    // Assert "In Production" heading is visible
    const productionHeading = page.locator('.production-section h4');
    await expect(productionHeading).toHaveText('In Production');

    // Assert "Core — In Production" track header
    const coreHeader = page.locator('.production-section .pr-track-header', { hasText: 'Core — In Production' });
    await expect(coreHeader).toBeVisible();

    // Assert PR items are listed (Espoo has 4 deployed human PRs)
    const prItems = page.locator('.production-section .pr-item');
    await expect(prItems).toHaveCount(4);

    // Verify each PR item has number, title, author, and date
    const firstPR = prItems.first();
    await expect(firstPR.locator('.pr-number')).toBeVisible();
    await expect(firstPR.locator('.pr-title')).toBeVisible();
    await expect(firstPR.locator('.pr-author')).toBeVisible();
    await expect(firstPR.locator('.pr-date')).toBeVisible();
  });

  test('Tampere city detail page shows both Core and Wrapper production sections', async ({ page }) => {
    const baseUrl = getBaseUrl();
    await page.goto(`${baseUrl}/#/city/tampere-region`);
    await page.waitForSelector('.city-detail');

    // Assert both "Core — In Production" and "Wrapper — In Production" sections
    const coreHeader = page.locator('.production-section .pr-track-header', { hasText: 'Core — In Production' });
    await expect(coreHeader).toBeVisible();

    const wrapperHeader = page.locator('.production-section .pr-track-header', { hasText: 'Wrapper — In Production' });
    await expect(wrapperHeader).toBeVisible();
  });

  test('PR number links point to correct GitHub URLs', async ({ page }) => {
    const baseUrl = getBaseUrl();
    await page.goto(`${baseUrl}/#/city/espoo`);
    await page.waitForSelector('.city-detail');

    // Check that PR links point to espoon-voltti/evaka
    const prLinks = page.locator('.production-section .pr-number');
    const count = await prLinks.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const href = await prLinks.nth(i).getAttribute('href');
      expect(href).toMatch(/^https:\/\/github\.com\/espoon-voltti\/evaka\/pull\/\d+$/);
    }
  });

  test('Bot toggle button exists and can be toggled', async ({ page }) => {
    const baseUrl = getBaseUrl();
    await page.goto(`${baseUrl}/#/city/espoo`);
    await page.waitForSelector('.city-detail');

    // Verify toggle button exists
    const botToggle = page.locator('#bot-toggle');
    await expect(botToggle).toBeVisible();
    await expect(botToggle).toHaveText('Show dependency updates');

    // Click toggle — should activate it
    await botToggle.click();
    await page.waitForSelector('#bot-toggle.active');
    const activeToggle = page.locator('#bot-toggle.active');
    await expect(activeToggle).toBeVisible();
  });

  test('Production section appears after pending and staging sections in DOM order', async ({ page }) => {
    const baseUrl = getBaseUrl();
    await page.goto(`${baseUrl}/#/city/espoo`);
    await page.waitForSelector('.city-detail');

    // Get the order of sections within the city-detail container
    const sectionOrder = await page.evaluate(() => {
      const detail = document.querySelector('.city-detail');
      if (!detail) return [];
      const sections: string[] = [];
      for (const child of detail.children) {
        if (child.classList.contains('pending-section')) sections.push('pending');
        if (child.querySelector('.pr-track-header')?.textContent?.includes('In Staging')) sections.push('staging');
        if (child.classList.contains('production-section')) sections.push('production');
      }
      return sections;
    });

    // Verify ordering: pending before staging, staging before production
    const pendingIdx = sectionOrder.indexOf('pending');
    const stagingIdx = sectionOrder.indexOf('staging');
    const productionIdx = sectionOrder.indexOf('production');

    if (pendingIdx >= 0 && stagingIdx >= 0) {
      expect(pendingIdx).toBeLessThan(stagingIdx);
    }
    if (stagingIdx >= 0 && productionIdx >= 0) {
      expect(stagingIdx).toBeLessThan(productionIdx);
    }
    if (pendingIdx >= 0 && productionIdx >= 0) {
      expect(pendingIdx).toBeLessThan(productionIdx);
    }
    // Production section must exist
    expect(productionIdx).toBeGreaterThanOrEqual(0);
  });
});

test.describe('City Detail — Visual Distinction (US3)', () => {
  test('Production section has the CSS class production-section', async ({ page }) => {
    const baseUrl = getBaseUrl();
    await page.goto(`${baseUrl}/#/city/espoo`);
    await page.waitForSelector('.city-detail');

    const productionSection = page.locator('.production-section');
    await expect(productionSection).toBeVisible();
  });

  test('Production section h4 heading text is "In Production"', async ({ page }) => {
    const baseUrl = getBaseUrl();
    await page.goto(`${baseUrl}/#/city/espoo`);
    await page.waitForSelector('.city-detail');

    const heading = page.locator('.production-section h4');
    await expect(heading).toHaveText('In Production');
  });

  test('Pending section has the CSS class pending-section', async ({ page }) => {
    const baseUrl = getBaseUrl();
    await page.goto(`${baseUrl}/#/city/espoo`);
    await page.waitForSelector('.city-detail');

    const pendingSection = page.locator('.pending-section');
    // Espoo has pending PRs in test data
    await expect(pendingSection).toBeVisible();
  });

  test('Sections appear in correct DOM order: pending, staging, production', async ({ page }) => {
    const baseUrl = getBaseUrl();
    await page.goto(`${baseUrl}/#/city/espoo`);
    await page.waitForSelector('.city-detail');

    // Get bounding boxes to verify visual ordering
    const pendingBox = await page.locator('.pending-section').boundingBox();
    const productionBox = await page.locator('.production-section').boundingBox();

    expect(pendingBox).not.toBeNull();
    expect(productionBox).not.toBeNull();

    // Pending must appear above production (smaller y coordinate)
    expect(pendingBox!.y).toBeLessThan(productionBox!.y);
  });
});
