/**
 * Capture a screenshot of the dashboard using Playwright.
 * Reuses E2E test infrastructure (test data generation + local server).
 *
 * Usage:
 *   npm run screenshot -- --path "#/city/tampere-region" --width 750 --height 1300
 *   npm run screenshot -- --output site/images/custom.png
 */

import { chromium } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { generateTestData } from '../tests/e2e/helpers/generate-test-data.js';
import { startServer } from '../tests/e2e/helpers/server.js';

function parseArgs(args: string[]): {
  path: string;
  width: number;
  height: number;
  output: string;
} {
  const defaults = {
    path: '#/city/tampere-region',
    width: 750,
    height: 1300,
    output: 'site/images/screenshot.png',
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--path':
        defaults.path = args[++i];
        break;
      case '--width':
        defaults.width = parseInt(args[++i], 10);
        break;
      case '--height':
        defaults.height = parseInt(args[++i], 10);
        break;
      case '--output':
        defaults.output = args[++i];
        break;
    }
  }

  return defaults;
}

async function main() {
  const config = parseArgs(process.argv.slice(2));

  console.log(`[Screenshot] Generating test data...`);
  await generateTestData();

  console.log(`[Screenshot] Starting local server...`);
  const server = await startServer();

  const outputDir = path.dirname(config.output);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  try {
    console.log(`[Screenshot] Launching browser (${config.width}x${config.height})...`);
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      viewport: { width: config.width, height: config.height },
    });

    const url = `${server.url}/${config.path}`;
    console.log(`[Screenshot] Navigating to ${url}`);
    await page.goto(url);

    // Wait for data to load and render
    await page.waitForSelector('.city-detail, .city-grid', { timeout: 10000 });
    // Small delay for any async rendering
    await page.waitForTimeout(500);

    await page.screenshot({ path: config.output });
    console.log(`[Screenshot] Saved to ${config.output}`);

    await browser.close();
  } finally {
    server.close();
  }
}

main().catch((err) => {
  console.error('[Screenshot] Failed:', err);
  process.exit(1);
});
