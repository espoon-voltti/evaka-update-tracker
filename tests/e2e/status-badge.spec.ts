/**
 * E2E tests for the +N newer-commit pill in status badges.
 * When staging has advanced past the last city-visible change, a small "+N"
 * pill appears next to the PR title to indicate how many newer commits exist
 * without visible changes for that city.
 *
 * Test data setup (generate-test-data.ts):
 * - Oulu: 2 non-visible staging events injected after the last visible one → pill shows +2
 * - Espoo: branch deployment → pill suppressed (branchInfo path)
 * - Tampere: visible PRs in most recent staging event → pill not shown (count = 0)
 */

import { test, expect } from './fixtures.js';

test.describe('Status badge — newer-commit pill on overview', () => {
  test('Oulu city card staging badge shows +2 pill', async ({ page, baseUrl }) => {
    await page.goto(`${baseUrl}/#/`);
    await page.waitForSelector('.city-grid');

    const ouluCard = page.locator('.city-card[data-city-id="oulu"]');
    const stagingBadge = ouluCard.locator('.env-section', { hasText: 'Testaus' }).locator('.status-badge');
    await expect(stagingBadge).toBeVisible();

    const pill = stagingBadge.locator('.newer-commit-sha');
    await expect(pill).toBeVisible();
    await expect(pill).toHaveText('+2');
  });

  test('Oulu pill has tooltip describing newer commits', async ({ page, baseUrl }) => {
    await page.goto(`${baseUrl}/#/`);
    await page.waitForSelector('.city-grid');

    const ouluCard = page.locator('.city-card[data-city-id="oulu"]');
    const pill = ouluCard.locator('.newer-commit-sha');
    const title = await pill.getAttribute('title');
    expect(title).toBeTruthy();
  });

  test('Espoo city card staging badge has no newer-commit pill (branch deployment)', async ({ page, baseUrl }) => {
    await page.goto(`${baseUrl}/#/`);
    await page.waitForSelector('.city-grid');

    const espooCard = page.locator('.city-card[data-city-id="espoo"]');
    const stagingSection = espooCard.locator('.env-section', { hasText: 'Testaus' });
    const pill = stagingSection.locator('.newer-commit-sha');
    await expect(pill).toHaveCount(0);
  });

  test('Tampere city card staging badge has no newer-commit pill (visible PRs most recent)', async ({ page, baseUrl }) => {
    await page.goto(`${baseUrl}/#/`);
    await page.waitForSelector('.city-grid');

    const tampereCard = page.locator('.city-card[data-city-id="tampere-region"]');
    const stagingSection = tampereCard.locator('.env-section', { hasText: 'Testaus' });
    const pill = stagingSection.locator('.newer-commit-sha');
    await expect(pill).toHaveCount(0);
  });

  test('Production badges never show newer-commit pill', async ({ page, baseUrl }) => {
    await page.goto(`${baseUrl}/#/`);
    await page.waitForSelector('.city-grid');

    const cityCards = page.locator('.city-card');
    const count = await cityCards.count();
    for (let i = 0; i < count; i++) {
      const prodSection = cityCards.nth(i).locator('.env-section', { hasText: 'Tuotanto' });
      const pill = prodSection.locator('.newer-commit-sha');
      await expect(pill).toHaveCount(0);
    }
  });
});

test.describe('Status badge — newer-commit pill on city detail', () => {
  test('Oulu city detail staging badge shows +2 pill', async ({ page, baseUrl }) => {
    await page.goto(`${baseUrl}/#/city/oulu`);
    await page.waitForSelector('.city-detail');

    const stagingEnvSection = page.locator('.env-section', { hasText: 'Staging / Testi' });
    await expect(stagingEnvSection).toBeVisible();

    const pill = stagingEnvSection.locator('.newer-commit-sha');
    await expect(pill).toBeVisible();
    await expect(pill).toHaveText('+2');
  });

  test('Espoo city detail staging badge has no newer-commit pill (branch deployment)', async ({ page, baseUrl }) => {
    await page.goto(`${baseUrl}/#/city/espoo`);
    await page.waitForSelector('.city-detail');

    const stagingEnvSection = page.locator('.env-section', { hasText: 'Staging / Testi' });
    await expect(stagingEnvSection).toBeVisible();

    const pill = stagingEnvSection.locator('.newer-commit-sha');
    await expect(pill).toHaveCount(0);
  });

  test('Tampere city detail staging badge has no newer-commit pill', async ({ page, baseUrl }) => {
    await page.goto(`${baseUrl}/#/city/tampere-region`);
    await page.waitForSelector('.city-detail');

    const stagingEnvSection = page.locator('.env-section', { hasText: 'Staging / Testi' });
    await expect(stagingEnvSection).toBeVisible();

    const pill = stagingEnvSection.locator('.newer-commit-sha');
    await expect(pill).toHaveCount(0);
  });
});
