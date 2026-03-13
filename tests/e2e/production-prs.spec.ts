/**
 * E2E tests for city detail page layout.
 * Verifies production, staging, and awaiting sections, bot toggle, and section ordering.
 */

import { test, expect } from './fixtures.js';

test.describe('City Detail — Viimeisimmät muutokset tuotantoympäristössä', () => {
  test('Espoo city detail shows production heading with PRs', async ({ page, baseUrl }) => {
    await page.goto(`${baseUrl}/#/city/espoo`);
    await page.waitForSelector('.city-detail');

    // Production heading inside <summary>
    const productionSummary = page.locator('.production-section summary');
    await expect(productionSummary).toHaveText('Viimeisimmät muutokset tuotantoympäristössä');

    // Expand collapsed production section
    await productionSummary.click();

    const coreHeader = page.locator('.production-section .pr-track-header', { hasText: 'Ydin' });
    await expect(coreHeader).toBeVisible();

    const prItems = page.locator('.production-section .pr-item');
    const count = await prItems.count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(5);

    // PR items have title link, author (real name), and date
    const firstPR = prItems.first();
    await expect(firstPR.locator('.pr-title')).toBeVisible();
    await expect(firstPR.locator('.pr-date')).toBeVisible();

    // Author should show real name (resolved from GitHub profile), not GitHub username
    const authorEl = firstPR.locator('.pr-author');
    const authorText = await authorEl.textContent();
    // The real names from mock data don't contain hyphens like GitHub usernames do
    expect(authorText).toBeTruthy();
    expect(authorText).not.toContain('terolaakso-reaktor');
  });

  test('Tampere shows both Core and Wrapper production sub-headers', async ({ page, baseUrl }) => {
    await page.goto(`${baseUrl}/#/city/tampere-region`);
    await page.waitForSelector('.city-detail');

    const productionSection = page.locator('.production-section');
    await expect(productionSection).toBeVisible();
    await productionSection.locator('summary').click();

    await expect(productionSection.locator('.pr-track-header', { hasText: 'Ydin' })).toBeVisible();
    await expect(productionSection.locator('.pr-track-header', { hasText: 'Kuntaimplementaatio' })).toBeVisible();
  });

  test('PR title links point to GitHub', async ({ page, baseUrl }) => {
    await page.goto(`${baseUrl}/#/city/espoo`);
    await page.waitForSelector('.city-detail');
    await page.locator('.production-section summary').click();

    const prLinks = page.locator('.production-section a.pr-title');
    const count = await prLinks.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const href = await prLinks.nth(i).getAttribute('href');
      expect(href).toMatch(/^https:\/\/github\.com\/.+\/pull\/\d+$/);
    }
  });

  test('Production section limited to 5 non-bot PRs per repo', async ({ page, baseUrl }) => {
    await page.goto(`${baseUrl}/#/city/espoo`);
    await page.waitForSelector('.city-detail');
    await page.locator('.production-section summary').click();

    const coreTrack = page.locator('.production-section .pr-track').first();
    const prItems = coreTrack.locator('.pr-item');
    const count = await prItems.count();
    expect(count).toBeLessThanOrEqual(5);
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('City Detail — Staging Section', () => {
  test('Staging section shows unified list with repo labels', async ({ page, baseUrl }) => {
    await page.goto(`${baseUrl}/#/city/espoo`);
    await page.waitForSelector('.city-detail');

    const stagingSection = page.locator('.staging-section');
    await expect(stagingSection).toBeVisible();

    const heading = stagingSection.locator('summary');
    await expect(heading).toHaveText('Muutokset testauksessa');

    const repoLabels = stagingSection.locator('.repo-label');
    const labelCount = await repoLabels.count();
    expect(labelCount).toBeGreaterThan(0);
  });

  test('Staging PRs show [core] or [wrapper] labels', async ({ page, baseUrl }) => {
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
  test('Awaiting deployment section shows unified list with repo labels', async ({ page, baseUrl }) => {
    await page.goto(`${baseUrl}/#/city/espoo`);
    await page.waitForSelector('.city-detail');

    const pendingSection = page.locator('.pending-section');
    if (await pendingSection.isVisible()) {
      const heading = pendingSection.locator('summary');
      await expect(heading).toHaveText('Odottaa julkaisua');

      const repoLabels = pendingSection.locator('.repo-label');
      const labelCount = await repoLabels.count();
      expect(labelCount).toBeGreaterThan(0);
    }
  });
});

test.describe('City Detail — Bot Toggle', () => {
  test('Bot toggle button exists and can be toggled', async ({ page, baseUrl }) => {
    await page.goto(`${baseUrl}/#/city/espoo`);
    await page.waitForSelector('.city-detail');

    const botToggle = page.locator('#bot-toggle');
    await expect(botToggle).toBeVisible();
    await expect(botToggle).toHaveText('Näytä riippuvuuspäivitykset');

    await botToggle.click();
    await page.waitForSelector('#bot-toggle.active');
    await expect(page.locator('#bot-toggle.active')).toBeVisible();
  });

  test('Bot toggle affects all sections', async ({ page, baseUrl }) => {
    await page.goto(`${baseUrl}/#/city/espoo`);
    await page.waitForSelector('.city-detail');

    // Expand production section
    await page.locator('.production-section summary').click();
    const prodCountBefore = await page.locator('.production-section .pr-item').count();

    // Toggle bots on
    await page.locator('#bot-toggle').click();
    await page.waitForSelector('#bot-toggle.active');

    // Re-expand (page re-renders)
    await page.locator('.production-section summary').click();
    const prodCountAfter = await page.locator('.production-section .pr-item').count();
    expect(prodCountAfter).toBeGreaterThanOrEqual(prodCountBefore);
  });
});

test.describe('City Detail — Section Ordering (FR-015)', () => {
  test('Sections appear in correct order: production, staging, awaiting', async ({ page, baseUrl }) => {
    await page.goto(`${baseUrl}/#/city/espoo`);
    await page.waitForSelector('.city-detail');

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

    const productionIdx = sectionOrder.indexOf('production');
    const stagingIdx = sectionOrder.indexOf('staging');
    const pendingIdx = sectionOrder.indexOf('pending');

    expect(productionIdx).toBeGreaterThanOrEqual(0);
    if (stagingIdx >= 0) expect(productionIdx).toBeLessThan(stagingIdx);
    if (pendingIdx >= 0 && stagingIdx >= 0) expect(stagingIdx).toBeLessThan(pendingIdx);
    if (pendingIdx >= 0) expect(productionIdx).toBeLessThan(pendingIdx);
  });

  test('Production section has the CSS class and correct heading', async ({ page, baseUrl }) => {
    await page.goto(`${baseUrl}/#/city/espoo`);
    await page.waitForSelector('.city-detail');

    await expect(page.locator('.production-section')).toBeVisible();
    await expect(page.locator('.production-section summary')).toHaveText('Viimeisimmät muutokset tuotantoympäristössä');
  });
});
