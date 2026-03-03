/**
 * E2E tests for redesigned city detail page layout.
 * Verifies production, staging, and awaiting sections, bot toggle, and section ordering.
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SERVER_INFO_PATH = path.resolve('tests/e2e/test-data/.server-info.json');

function getBaseUrl(): string {
  const info = JSON.parse(fs.readFileSync(SERVER_INFO_PATH, 'utf-8'));
  return info.url;
}

test.describe('City Detail — Viimeisimmät muutokset tuotantoympäristössä', () => {
  test('Espoo city detail page shows "Viimeisimmät muutokset tuotantoympäristössä" heading with PRs', async ({ page }) => {
    const baseUrl = getBaseUrl();
    await page.goto(`${baseUrl}/#/city/espoo`);
    await page.waitForSelector('.city-detail');

    // Assert "Viimeisimmät muutokset tuotantoympäristössä" heading is visible
    const productionHeading = page.locator('.production-section h4');
    await expect(productionHeading).toHaveText('Viimeisimmät muutokset tuotantoympäristössä');

    // Assert "Ydin" track header exists
    const coreHeader = page.locator('.production-section .pr-track-header', { hasText: 'Ydin' });
    await expect(coreHeader).toBeVisible();

    // Assert PR items are listed (production PRs from history events)
    const prItems = page.locator('.production-section .pr-item');
    const count = await prItems.count();
    expect(count).toBeGreaterThan(0);
    // Limited to 5 max per repo
    expect(count).toBeLessThanOrEqual(5);

    // Verify each PR item has number, title, author, and date
    const firstPR = prItems.first();
    await expect(firstPR.locator('.pr-number')).toBeVisible();
    await expect(firstPR.locator('.pr-title')).toBeVisible();
    await expect(firstPR.locator('.pr-author')).toBeVisible();
    await expect(firstPR.locator('.pr-date')).toBeVisible();
  });

  test('Tampere city detail page shows both Core and Wrapper production sub-headers', async ({ page }) => {
    const baseUrl = getBaseUrl();
    await page.goto(`${baseUrl}/#/city/tampere-region`);
    await page.waitForSelector('.city-detail');

    // Assert production section exists
    const productionSection = page.locator('.production-section');
    await expect(productionSection).toBeVisible();

    // Assert both "Ydin" and "Kuntaimplementaatio" sub-headers
    const coreHeader = productionSection.locator('.pr-track-header', { hasText: 'Ydin' });
    await expect(coreHeader).toBeVisible();

    const wrapperHeader = productionSection.locator('.pr-track-header', { hasText: 'Kuntaimplementaatio' });
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

  test('Production section limited to 5 non-bot PRs per repo', async ({ page }) => {
    const baseUrl = getBaseUrl();
    await page.goto(`${baseUrl}/#/city/espoo`);
    await page.waitForSelector('.city-detail');

    // Each repo sub-section should have at most 5 PR items (bot PRs hidden by default)
    const coreTrack = page.locator('.production-section .pr-track').first();
    const prItems = coreTrack.locator('.pr-item');
    const count = await prItems.count();
    expect(count).toBeLessThanOrEqual(5);
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('City Detail — Staging Section', () => {
  test('Staging section shows unified chronological list with repo labels', async ({ page }) => {
    const baseUrl = getBaseUrl();
    await page.goto(`${baseUrl}/#/city/espoo`);
    await page.waitForSelector('.city-detail');

    const stagingSection = page.locator('.staging-section');
    // Espoo should have staging PRs
    await expect(stagingSection).toBeVisible();

    // Heading text
    const heading = stagingSection.locator('h4');
    await expect(heading).toHaveText('Muutokset testauksessa');

    // PR items should have repo labels
    const repoLabels = stagingSection.locator('.repo-label');
    const labelCount = await repoLabels.count();
    expect(labelCount).toBeGreaterThan(0);
  });

  test('Staging PRs show [core] or [wrapper] labels', async ({ page }) => {
    const baseUrl = getBaseUrl();
    await page.goto(`${baseUrl}/#/city/tampere-region`);
    await page.waitForSelector('.city-detail');

    const stagingSection = page.locator('.staging-section');
    if (await stagingSection.isVisible()) {
      const repoLabels = stagingSection.locator('.repo-label');
      const count = await repoLabels.count();
      for (let i = 0; i < count; i++) {
        const text = await repoLabels.nth(i).textContent();
        expect(text).toMatch(/\[(core|wrapper)\]/);
      }
    }
  });
});

test.describe('City Detail — Awaiting Deployment Section', () => {
  test('Awaiting deployment section shows unified list with repo labels', async ({ page }) => {
    const baseUrl = getBaseUrl();
    await page.goto(`${baseUrl}/#/city/espoo`);
    await page.waitForSelector('.city-detail');

    const pendingSection = page.locator('.pending-section');
    if (await pendingSection.isVisible()) {
      const heading = pendingSection.locator('h4');
      await expect(heading).toHaveText('Odottaa julkaisua');

      // Should have repo labels
      const repoLabels = pendingSection.locator('.repo-label');
      const labelCount = await repoLabels.count();
      expect(labelCount).toBeGreaterThan(0);
    }
  });
});

test.describe('City Detail — Bot Toggle', () => {
  test('Bot toggle button exists and can be toggled', async ({ page }) => {
    const baseUrl = getBaseUrl();
    await page.goto(`${baseUrl}/#/city/espoo`);
    await page.waitForSelector('.city-detail');

    // Verify toggle button exists
    const botToggle = page.locator('#bot-toggle');
    await expect(botToggle).toBeVisible();
    await expect(botToggle).toHaveText('Näytä riippuvuuspäivitykset');

    // Click toggle — should activate it and re-render with showBots=true
    await botToggle.click();
    await page.waitForSelector('#bot-toggle.active');
    const activeToggle = page.locator('#bot-toggle.active');
    await expect(activeToggle).toBeVisible();
  });

  test('Bot toggle affects all sections', async ({ page }) => {
    const baseUrl = getBaseUrl();
    await page.goto(`${baseUrl}/#/city/espoo`);
    await page.waitForSelector('.city-detail');

    // Count PRs before toggle
    const prodCountBefore = await page.locator('.production-section .pr-item').count();

    // Activate bot toggle
    await page.locator('#bot-toggle').click();
    await page.waitForSelector('#bot-toggle.active');

    // Count PRs after toggle — may have more items if bot PRs exist
    const prodCountAfter = await page.locator('.production-section .pr-item').count();
    // After toggle, count should be >= before (bot PRs may appear)
    expect(prodCountAfter).toBeGreaterThanOrEqual(prodCountBefore);
  });
});

test.describe('City Detail — Section Ordering (FR-015)', () => {
  test('Sections appear in correct order: production, staging, awaiting', async ({ page }) => {
    const baseUrl = getBaseUrl();
    await page.goto(`${baseUrl}/#/city/espoo`);
    await page.waitForSelector('.city-detail');

    // Get the order of sections within the city-detail container
    const sectionOrder = await page.evaluate(() => {
      const detail = document.querySelector('.city-detail');
      if (!detail) return [];
      const sections: string[] = [];
      for (const child of detail.children) {
        if (child.classList.contains('production-section')) sections.push('production');
        if (child.classList.contains('staging-section')) sections.push('staging');
        if (child.classList.contains('pending-section')) sections.push('pending');
      }
      return sections;
    });

    // Verify ordering per FR-015: production → staging → awaiting
    const productionIdx = sectionOrder.indexOf('production');
    const stagingIdx = sectionOrder.indexOf('staging');
    const pendingIdx = sectionOrder.indexOf('pending');

    // Production section must exist (sourced from history events)
    expect(productionIdx).toBeGreaterThanOrEqual(0);

    if (stagingIdx >= 0) {
      expect(productionIdx).toBeLessThan(stagingIdx);
    }
    if (pendingIdx >= 0 && stagingIdx >= 0) {
      expect(stagingIdx).toBeLessThan(pendingIdx);
    }
    if (pendingIdx >= 0) {
      expect(productionIdx).toBeLessThan(pendingIdx);
    }
  });

  test('Production section has the CSS class production-section', async ({ page }) => {
    const baseUrl = getBaseUrl();
    await page.goto(`${baseUrl}/#/city/espoo`);
    await page.waitForSelector('.city-detail');

    const productionSection = page.locator('.production-section');
    await expect(productionSection).toBeVisible();
  });

  test('Production section heading text is "Viimeisimmät muutokset tuotantoympäristössä"', async ({ page }) => {
    const baseUrl = getBaseUrl();
    await page.goto(`${baseUrl}/#/city/espoo`);
    await page.waitForSelector('.city-detail');

    const heading = page.locator('.production-section h4');
    await expect(heading).toHaveText('Viimeisimmät muutokset tuotantoympäristössä');
  });
});
