/**
 * E2E tests for the feature matrix view (#/features).
 */

import { test, expect } from './fixtures.js';

test.describe('Feature matrix view', () => {
  test('navigates to #/features and shows matrix', async ({ page, baseUrl }) => {
    await page.goto(`${baseUrl}/#/features`);
    await page.waitForSelector('.feature-view');

    const heading = page.locator('.feature-view h2');
    await expect(heading).toHaveText('Ominaisuusvertailu');
  });

  test('"Ominaisuudet" tab is active on features page', async ({ page, baseUrl }) => {
    await page.goto(`${baseUrl}/#/features`);
    await page.waitForSelector('.feature-view');

    const featuresTab = page.locator('.tab[data-city-id="features"]');
    await expect(featuresTab).toHaveClass(/active/);
    await expect(featuresTab).toHaveText('Ominaisuudet');
  });

  test('renders boolean indicators (checkmark and X)', async ({ page, baseUrl }) => {
    await page.goto(`${baseUrl}/#/features`);
    await page.waitForSelector('.feature-matrix');

    const trueIndicators = page.locator('.flag-true');
    const falseIndicators = page.locator('.flag-false');

    expect(await trueIndicators.count()).toBeGreaterThan(0);
    expect(await falseIndicators.count()).toBeGreaterThan(0);
  });

  test('shows category sections', async ({ page, baseUrl }) => {
    await page.goto(`${baseUrl}/#/features`);
    await page.waitForSelector('.feature-view');

    const frontendCategory = page.locator('.category-header.frontend');
    const backendCategory = page.locator('.category-header.backend');

    await expect(frontendCategory).toBeVisible();
    await expect(backendCategory).toBeVisible();
    await expect(frontendCategory).toContainText('Käyttöliittymäominaisuudet');
    await expect(backendCategory).toContainText('Taustajärjestelmän asetukset');
  });

  test('highlights rows where values differ across cities', async ({ page, baseUrl }) => {
    await page.goto(`${baseUrl}/#/features`);
    await page.waitForSelector('.feature-matrix');

    const diffRows = page.locator('.flag-row.flag-differs');
    expect(await diffRows.count()).toBeGreaterThan(0);
  });

  test('differences-only filter works', async ({ page, baseUrl }) => {
    await page.goto(`${baseUrl}/#/features`);
    await page.waitForSelector('.feature-matrix');

    const totalRowsBefore = await page.locator('.flag-row').count();

    // Click the differences-only toggle
    await page.click('#differences-toggle');
    await page.waitForSelector('.feature-matrix');

    const totalRowsAfter = await page.locator('.flag-row').count();
    expect(totalRowsAfter).toBeLessThan(totalRowsBefore);

    // Verify URL param is set
    const url = page.url();
    expect(url).toContain('differencesOnly=true');

    // Toggle off — all rows return
    await page.click('#differences-toggle');
    await page.waitForSelector('.feature-matrix');

    const totalRowsRestored = await page.locator('.flag-row').count();
    expect(totalRowsRestored).toBe(totalRowsBefore);
  });

  test('non-boolean values toggle works', async ({ page, baseUrl }) => {
    await page.goto(`${baseUrl}/#/features`);
    await page.waitForSelector('.feature-matrix');

    // Initially, non-boolean flags should be hidden
    const rowsBefore = await page.locator('.flag-row').count();

    // Click show values toggle
    await page.click('#values-toggle');
    await page.waitForSelector('.feature-matrix');

    const rowsAfter = await page.locator('.flag-row').count();
    expect(rowsAfter).toBeGreaterThan(rowsBefore);

    // Verify URL param is set
    const url = page.url();
    expect(url).toContain('showValues=true');
  });

  test('Tampereen seutu divergent cells have expand indicator', async ({ page, baseUrl }) => {
    await page.goto(`${baseUrl}/#/features`);
    await page.waitForSelector('.feature-matrix');

    // Check for divergent markers (some Tampere-region values differ, e.g. Nokia has different threshold)
    await page.click('#values-toggle');
    await page.waitForSelector('.feature-matrix');

    const divergentCells = page.locator('.tampere-divergent');
    // Nokia has different freeAbsenceGivesADailyRefund and citizenReservationThresholdHours
    expect(await divergentCells.count()).toBeGreaterThan(0);
  });

  test('clicking Ominaisuudet tab navigates to features view', async ({ page, baseUrl }) => {
    await page.goto(`${baseUrl}/#/`);
    await page.waitForSelector('.city-grid');

    // Click the features tab
    const featuresTab = page.locator('.tab[data-city-id="features"]');
    await featuresTab.click();
    await page.waitForSelector('.feature-view');

    await expect(page.locator('.feature-view h2')).toHaveText('Ominaisuusvertailu');
  });

  test('city detail page shows feature summary section', async ({ page, baseUrl }) => {
    await page.goto(`${baseUrl}/#/city/espoo`);
    await page.waitForSelector('.city-detail');

    const featureSummary = page.locator('.feature-summary-section');
    await expect(featureSummary).toBeVisible();

    // Click to expand
    await page.click('.feature-summary-section summary');
    const flagItems = page.locator('.feature-summary-item');
    expect(await flagItems.count()).toBeGreaterThan(0);
  });
});
