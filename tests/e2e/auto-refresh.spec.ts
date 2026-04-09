/**
 * E2E tests for auto-refresh functionality.
 * Uses a short polling interval (500ms) to keep tests fast.
 * Tests must run serially since they modify shared test data files.
 */

import { test, expect } from './fixtures.js';
import * as fs from 'fs';
import * as path from 'path';

const TEST_DATA_DIR = path.resolve('tests/e2e/test-data');

function readTestData(filename: string) {
  return JSON.parse(fs.readFileSync(path.join(TEST_DATA_DIR, filename), 'utf-8'));
}

function writeTestData(filename: string, data: object | string) {
  const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  fs.writeFileSync(path.join(TEST_DATA_DIR, filename), content, 'utf-8');
}

test.describe('Auto-refresh', () => {
  test.describe.configure({ mode: 'serial' });

  let originalCurrent: string;
  let originalVersion: string | null;

  test.beforeAll(() => {
    originalCurrent = fs.readFileSync(path.join(TEST_DATA_DIR, 'current.json'), 'utf-8');
    try {
      originalVersion = fs.readFileSync(path.join(TEST_DATA_DIR, 'site-version.txt'), 'utf-8');
    } catch {
      originalVersion = null;
    }
    // Ensure site-version.txt exists for tests
    writeTestData('site-version.txt', 'test-version-stable');
  });

  test.afterAll(() => {
    fs.writeFileSync(path.join(TEST_DATA_DIR, 'current.json'), originalCurrent, 'utf-8');
    if (originalVersion !== null) {
      writeTestData('site-version.txt', originalVersion);
    } else {
      try { fs.unlinkSync(path.join(TEST_DATA_DIR, 'site-version.txt')); } catch { /* ok */ }
    }
  });

  test('no-change cycles produce zero visual artifacts and preserve scroll', async ({ page, baseUrl }) => {
    await page.addInitScript(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__autoRefreshInterval = 500;
    });
    await page.goto(`${baseUrl}/#/`);
    await page.waitForSelector('.city-grid');

    // Snapshot the page text content
    const contentBefore = await page.locator('#app').textContent();

    // Scroll down
    await page.evaluate(() => window.scrollTo(0, 100));
    await page.waitForTimeout(100); // Let scroll settle
    const scrollBefore = await page.evaluate(() => window.scrollY);

    // Wait for 3+ polling cycles with no changes
    await page.waitForTimeout(2000);

    // Verify content is identical
    const contentAfter = await page.locator('#app').textContent();
    expect(contentAfter).toBe(contentBefore);

    // Verify scroll position preserved
    const scrollAfter = await page.evaluate(() => window.scrollY);
    expect(scrollAfter).toBe(scrollBefore);
  });

  test('data change triggers re-render without full page reload', async ({ page, baseUrl }) => {
    await page.addInitScript(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__autoRefreshInterval = 500;
    });
    await page.goto(`${baseUrl}/#/`);
    await page.waitForSelector('.city-grid');

    // Get original generated-at text
    const originalGeneratedAt = await page.locator('#generated-at').textContent();

    // Mark the DOM to detect full reload
    await page.evaluate(() => {
      document.body.setAttribute('data-no-reload', 'true');
    });

    // Modify the data: change the generatedAt timestamp
    const currentData = readTestData('current.json');
    currentData.generatedAt = new Date(Date.now() + 86400000).toISOString(); // Tomorrow
    writeTestData('current.json', currentData);

    // Wait for the timestamp to change (auto-refresh should detect the change)
    await page.waitForFunction(
      (origText) => {
        const el = document.getElementById('generated-at');
        return el && el.textContent !== origText && el.textContent !== '';
      },
      originalGeneratedAt,
      { timeout: 5000 }
    );

    // Verify NO full page reload happened — our marker should still be there
    const marker = await page.evaluate(() =>
      document.body.getAttribute('data-no-reload')
    );
    expect(marker).toBe('true');

    // Verify city cards are still rendered
    await expect(page.locator('.city-card')).toHaveCount(4);

    // Restore original data for next test
    fs.writeFileSync(path.join(TEST_DATA_DIR, 'current.json'), originalCurrent, 'utf-8');
  });

  test('fullscreen state is preserved when auto-refresh detects data changes', async ({ page, baseUrl }) => {
    await page.addInitScript(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__autoRefreshInterval = 500;
    });
    await page.goto(`${baseUrl}/#/?fullscreen=true`);
    await page.waitForSelector('body.fullscreen');

    // Mark the DOM to detect full reload
    await page.evaluate(() => {
      document.body.setAttribute('data-no-reload', 'true');
    });

    // Get original generated-at text
    const originalGeneratedAt = await page.locator('#generated-at').textContent();

    // Simulate what happens in production: a new deployment cycle where data
    // changes AND site-version.txt gets regenerated (currently the workflow
    // uses a timestamp, so site-version.txt changes every deploy even when
    // only data changed — the frontend should not treat this as a code change
    // that requires a full reload, because that loses the user's fullscreen
    // mode).
    const currentData = readTestData('current.json');
    currentData.generatedAt = new Date(Date.now() + 86400000).toISOString();
    writeTestData('current.json', currentData);

    // Simulate the deploy pipeline re-writing site-version.txt with a
    // fresh build timestamp even though the site code hash is unchanged.
    // (First line is the stable site-content hash; subsequent lines are
    // metadata such as build timestamps.)
    writeTestData(
      'site-version.txt',
      `test-version-stable\n${new Date().toISOString()}\n`
    );

    // Wait for the timestamp to change (auto-refresh should detect the change)
    await page.waitForFunction(
      (origText) => {
        const el = document.getElementById('generated-at');
        return el && el.textContent !== origText && el.textContent !== '';
      },
      originalGeneratedAt,
      { timeout: 5000 }
    );

    // Verify NO full page reload happened
    const marker = await page.evaluate(() =>
      document.body.getAttribute('data-no-reload')
    );
    expect(marker).toBe('true');

    // Verify fullscreen is still active
    await expect(page.locator('body')).toHaveClass(/fullscreen/);
    await expect(page.locator('header')).not.toBeVisible();

    // Restore original data for next test
    fs.writeFileSync(path.join(TEST_DATA_DIR, 'current.json'), originalCurrent, 'utf-8');
    writeTestData('site-version.txt', 'test-version-stable');
  });

  test('site-version.txt change triggers full page reload', async ({ page, baseUrl }) => {
    await page.addInitScript(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__autoRefreshInterval = 500;
    });
    await page.goto(`${baseUrl}/#/`);
    await page.waitForSelector('.city-grid');

    // Mark the page to detect reload
    await page.evaluate(() => {
      document.body.setAttribute('data-reload-marker', 'original');
    });

    // Change the site version
    writeTestData('site-version.txt', 'test-version-CHANGED');

    // Wait for reload — the marker should be gone after reload
    await page.waitForFunction(
      () => !document.body.hasAttribute('data-reload-marker'),
      { timeout: 5000 }
    );

    // Page reloaded — city grid should still render
    await page.waitForSelector('.city-grid');
    await expect(page.locator('.city-card')).toHaveCount(4);

    // Restore version
    writeTestData('site-version.txt', 'test-version-stable');
  });
});
