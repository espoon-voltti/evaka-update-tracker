/**
 * Capture Markdown snapshots of all dashboard views and Slack messages.
 * Reuses E2E test infrastructure (test data generation + local server).
 *
 * Usage:
 *   npm run capture-views
 *   npm run capture-views -- --filter overview
 *   npm run capture-views -- --output-dir ./my-snapshots
 */

import { chromium } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { generateTestData } from '../tests/e2e/helpers/generate-test-data.js';
import { startServer } from '../tests/e2e/helpers/server.js';
import { buildSlackMessage } from '../src/api/slack.js';
import { buildChangeAnnouncement } from '../src/services/change-announcer.js';
import { blockKitToMarkdown, slackMrkdwnToMarkdown } from '../src/utils/slack-to-markdown.js';
import { DeploymentEvent, PullRequest, CurrentData } from '../src/types.js';

// --- Types ---

interface ViewDefinition {
  name: string;
  type: 'browser' | 'slack-deployment' | 'slack-change';
  route?: string;
  waitFor?: string;
}

interface CaptureResult {
  name: string;
  markdown: string;
  success: boolean;
  error?: string;
}

// --- Argument Parsing ---

function parseArgs(args: string[]): { filter: string | null; outputDir: string } {
  const result = { filter: null as string | null, outputDir: 'docs/snapshots' };
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--filter':
        result.filter = args[++i];
        break;
      case '--output-dir':
        result.outputDir = args[++i];
        break;
    }
  }
  return result;
}

// --- View Registry ---

function buildViewRegistry(currentData: CurrentData): ViewDefinition[] {
  const views: ViewDefinition[] = [];

  // Fixed browser routes
  views.push({ name: 'overview', type: 'browser', route: '#/', waitFor: '.city-grid' });
  views.push({ name: 'features', type: 'browser', route: '#/features', waitFor: '.feature-matrix' });

  // Per-city browser routes
  for (const cityGroup of currentData.cityGroups) {
    const id = cityGroup.id;
    views.push({ name: `city-${id}`, type: 'browser', route: `#/city/${id}`, waitFor: '.city-detail' });
    views.push({ name: `city-${id}-history`, type: 'browser', route: `#/city/${id}/history`, waitFor: '.history-list' });
  }

  // Slack deployment notifications (one per city)
  for (const cityGroup of currentData.cityGroups) {
    views.push({ name: `slack-deployment-${cityGroup.id}`, type: 'slack-deployment' });
  }

  // Slack change announcements (one per repo type)
  views.push({ name: 'slack-change-announcement-core', type: 'slack-change' });
  views.push({ name: 'slack-change-announcement-wrapper', type: 'slack-change' });

  return views;
}

// --- DOM-to-Markdown Extraction ---

async function extractDomToMarkdown(page: import('@playwright/test').Page): Promise<string> {
  return page.evaluate(() => {
    function escapeTableCell(text: string): string {
      return text.replace(/\|/g, '\\|').replace(/\n/g, ' ');
    }

    function walkNode(node: Node): string {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent?.trim() || '';
      }

      if (node.nodeType !== Node.ELEMENT_NODE) return '';

      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();

      // Skip hidden elements
      if (el.style.display === 'none' || el.hidden) return '';

      // Skip script, style
      if (tag === 'script' || tag === 'style') return '';

      // Headings
      if (/^h[1-6]$/.test(tag)) {
        const level = parseInt(tag[1]);
        const text = el.textContent?.trim() || '';
        return `${'#'.repeat(level)} ${text}\n\n`;
      }

      // Tables
      if (tag === 'table') {
        return convertTable(el as HTMLTableElement);
      }

      // Lists
      if (tag === 'ul' || tag === 'ol') {
        return convertList(el, tag === 'ol');
      }

      // Skip li processing here — handled by convertList
      if (tag === 'li') {
        return walkChildren(node);
      }

      // Links
      if (tag === 'a') {
        const href = (el as HTMLAnchorElement).href;
        const text = el.textContent?.trim() || '';
        if (href && text) return `[${text}](${href})`;
        return text;
      }

      // Details/summary
      if (tag === 'details') {
        const summary = el.querySelector('summary');
        const summaryText = summary?.textContent?.trim() || '';
        const childContent: string[] = [];
        for (const child of el.childNodes) {
          if (child === summary) continue;
          const text = walkNode(child);
          if (text) childContent.push(text);
        }
        return `### ${summaryText}\n\n${childContent.join('\n')}\n\n`;
      }
      if (tag === 'summary') return '';

      // Paragraphs and divs
      if (tag === 'p') {
        const text = walkChildren(node);
        return text ? `${text}\n\n` : '';
      }

      // Span with specific classes
      if (tag === 'span') {
        const cls = el.className;
        if (cls.includes('flag-true')) return '\u2713';
        if (cls.includes('flag-false')) return '\u2717';
        if (cls.includes('flag-unset')) return '\u2014';
        if (cls.includes('flag-value')) return el.textContent?.trim() || '';
        if (cls.includes('divergent-marker')) return el.textContent?.trim() || '';
        if (cls.includes('count-badge')) {
          const value = el.querySelector('.count-value')?.textContent?.trim() || '';
          const label = el.querySelector('.count-label')?.textContent?.trim() || '';
          return value && label ? `${label}: ${value}` : '';
        }
      }

      // Button (skip interactive elements in snapshot)
      if (tag === 'button') return '';

      // Default: walk children
      return walkChildren(node);
    }

    function walkChildren(node: Node): string {
      const parts: string[] = [];
      for (const child of node.childNodes) {
        const text = walkNode(child);
        if (text) parts.push(text);
      }
      return parts.join(' ').replace(/ +/g, ' ').trim();
    }

    function convertTable(table: HTMLTableElement): string {
      const rows: string[][] = [];
      for (const row of table.rows) {
        const cells: string[] = [];
        for (const cell of row.cells) {
          cells.push(escapeTableCell(cell.textContent?.trim() || ''));
        }
        rows.push(cells);
      }
      if (rows.length === 0) return '';

      const header = rows[0];
      const separator = header.map(() => '---');
      const lines = [
        `| ${header.join(' | ')} |`,
        `| ${separator.join(' | ')} |`,
        ...rows.slice(1).map((row) => `| ${row.join(' | ')} |`),
      ];
      return lines.join('\n') + '\n\n';
    }

    function convertList(el: HTMLElement, ordered: boolean): string {
      const items: string[] = [];
      let index = 1;
      for (const child of el.children) {
        if (child.tagName.toLowerCase() === 'li') {
          const text = walkNode(child);
          if (text) {
            const prefix = ordered ? `${index++}.` : '-';
            items.push(`${prefix} ${text}`);
          }
        }
      }
      return items.join('\n') + '\n\n';
    }

    // Find main content container
    const mainContent =
      document.querySelector('.city-grid') ||
      document.querySelector('.city-detail') ||
      document.querySelector('.feature-view') ||
      document.querySelector('#app') ||
      document.body;

    return walkNode(mainContent);
  });
}

// --- Slack Snapshot Helpers ---

function buildTestDeploymentEvent(cityGroupId: string, cityName: string): DeploymentEvent {
  return {
    id: `test-deploy-${cityGroupId}`,
    environmentId: `${cityGroupId}-prod`,
    cityGroupId,
    detectedAt: '2026-03-02T09:53:35.000Z',
    previousCommit: {
      sha: '1111111111111111111111111111111111111111',
      shortSha: '1111111',
      message: 'Previous commit',
      date: '2026-02-25T10:00:00Z',
      author: 'developer1',
    },
    newCommit: {
      sha: 'aa22da22851dbf376bf83b457ee646da5ddfd702',
      shortSha: 'aa22da2',
      message: 'Merge pull request #8573 from espoon-voltti/fix-db-timestamp',
      date: '2026-03-02T09:53:35Z',
      author: 'terolaakso-reaktor',
    },
    includedPRs: [
      {
        number: 8573,
        title: 'Aikaleiman käsittelyn korjaus tietokannassa',
        author: 'terolaakso-reaktor',
        authorName: 'Tero Laakso',
        mergedAt: '2026-03-02T09:53:35Z',
        repository: 'espoon-voltti/evaka',
        repoType: 'core',
        isBot: false,
        url: 'https://github.com/espoon-voltti/evaka/pull/8573',
        labels: ['bug'],
      },
      {
        number: 8560,
        title: 'Hakutoiminnon parannukset',
        author: 'Joosakur',
        authorName: 'Joosa Kurvinen',
        mergedAt: '2026-03-01T14:20:00Z',
        repository: 'espoon-voltti/evaka',
        repoType: 'core',
        isBot: false,
        url: 'https://github.com/espoon-voltti/evaka/pull/8560',
        labels: ['enhancement'],
      },
    ],
    repoType: 'core',
  };
}

function buildTestPRs(repoType: 'core' | 'wrapper'): PullRequest[] {
  if (repoType === 'core') {
    return [
      {
        number: 8630,
        title: 'Tekninen: Poista käyttämätön @types/webpack-riippuvuus',
        author: 'terolaakso-reaktor',
        authorName: 'Tero Laakso',
        mergedAt: '2026-03-03T06:47:56Z',
        repository: 'espoon-voltti/evaka',
        repoType: 'core',
        isBot: false,
        url: 'https://github.com/espoon-voltti/evaka/pull/8630',
        labels: ['tech'],
      },
      {
        number: 8629,
        title: 'Tekninen: minimatch-kirjaston haavoittuvuuspäivitys',
        author: 'terolaakso-reaktor',
        authorName: 'Tero Laakso',
        mergedAt: '2026-03-02T13:41:42Z',
        repository: 'espoon-voltti/evaka',
        repoType: 'core',
        isBot: false,
        url: 'https://github.com/espoon-voltti/evaka/pull/8629',
        labels: ['tech'],
      },
    ];
  }

  return [
    {
      number: 412,
      title: 'Tampere-konfiguraation päivitys',
      author: 'tampere-dev',
      authorName: 'Tampere Developer',
      mergedAt: '2026-03-01T08:00:00Z',
      repository: 'Tampere/trevaka',
      repoType: 'wrapper',
      isBot: false,
      url: 'https://github.com/Tampere/trevaka/pull/412',
      labels: ['enhancement'],
    },
  ];
}

function captureSlackDeployment(cityGroupId: string, cityName: string): CaptureResult {
  try {
    const event = buildTestDeploymentEvent(cityGroupId, cityName);
    const message = buildSlackMessage([event], 'https://espoon-voltti.github.io/evaka-update-tracker/');
    const markdown = blockKitToMarkdown(message.blocks);
    return { name: `slack-deployment-${cityGroupId}`, markdown, success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { name: `slack-deployment-${cityGroupId}`, markdown: '', success: false, error: msg };
  }
}

function captureSlackChangeAnnouncement(repoType: 'core' | 'wrapper'): CaptureResult {
  const name = `slack-change-announcement-${repoType}`;
  try {
    const prs = buildTestPRs(repoType);
    // Use a fixed "now" far in the future so no timestamps are appended
    const mrkdwnText = buildChangeAnnouncement(prs, new Date('2026-03-03T07:00:00Z'));
    const markdown = slackMrkdwnToMarkdown(mrkdwnText);
    return { name, markdown, success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { name, markdown: '', success: false, error: msg };
  }
}

// --- Main ---

async function main() {
  const config = parseArgs(process.argv.slice(2));

  console.log('[Capture] Generating test data...');
  const testDataDir = await generateTestData();

  // Read current.json to discover cities
  const currentPath = path.join(testDataDir, 'current.json');
  const currentData: CurrentData = JSON.parse(fs.readFileSync(currentPath, 'utf-8'));

  // Build view registry
  const allViews = buildViewRegistry(currentData);

  // Apply filter
  let views = allViews;
  if (config.filter) {
    views = allViews.filter((v) => v.name.includes(config.filter!));
    if (views.length === 0) {
      console.error(`[Capture] No views match filter "${config.filter}". Available views:`);
      for (const v of allViews) {
        console.error(`  - ${v.name}`);
      }
      process.exit(1);
    }
    console.log(`[Capture] Filter "${config.filter}" matched ${views.length} view(s)`);
  }

  // Ensure output directory exists
  if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true });
  }

  const results: CaptureResult[] = [];
  let hasFailures = false;

  // Capture browser views
  const browserViews = views.filter((v) => v.type === 'browser');
  if (browserViews.length > 0) {
    console.log('[Capture] Starting local server...');
    const server = await startServer();

    try {
      console.log('[Capture] Launching browser...');
      const browser = await chromium.launch({ headless: true });
      const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });

      for (const view of browserViews) {
        try {
          const url = `${server.url}/${view.route}`;
          console.log(`[Capture] ${view.name} → ${url}`);
          await page.goto(url);
          await page.waitForSelector(view.waitFor!, { timeout: 10000 });
          await page.waitForTimeout(300);

          const markdown = await extractDomToMarkdown(page);
          results.push({ name: view.name, markdown, success: true });
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          console.warn(`[Capture] FAILED: ${view.name} — ${msg}`);
          results.push({ name: view.name, markdown: '', success: false, error: msg });
          hasFailures = true;
        }
      }

      await browser.close();
    } finally {
      server.close();
    }
  }

  // Capture Slack views
  const slackDeploymentViews = views.filter((v) => v.type === 'slack-deployment');
  for (const view of slackDeploymentViews) {
    const cityGroupId = view.name.replace('slack-deployment-', '');
    const cityGroup = currentData.cityGroups.find((cg) => cg.id === cityGroupId);
    const cityName = cityGroup?.id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || cityGroupId;
    console.log(`[Capture] ${view.name}`);
    const result = captureSlackDeployment(cityGroupId, cityName);
    results.push(result);
    if (!result.success) hasFailures = true;
  }

  const slackChangeViews = views.filter((v) => v.type === 'slack-change');
  for (const view of slackChangeViews) {
    const repoType = view.name.replace('slack-change-announcement-', '') as 'core' | 'wrapper';
    console.log(`[Capture] ${view.name}`);
    const result = captureSlackChangeAnnouncement(repoType);
    results.push(result);
    if (!result.success) hasFailures = true;
  }

  // Write results
  let written = 0;
  for (const result of results) {
    if (result.success && result.markdown) {
      const outputPath = path.join(config.outputDir, `${result.name}.md`);
      fs.writeFileSync(outputPath, result.markdown + '\n');
      console.log(`[Capture] Wrote ${outputPath}`);
      written++;
    }
  }

  console.log(`[Capture] Done. ${written}/${results.length} snapshots written to ${config.outputDir}/`);

  if (hasFailures) {
    const failed = results.filter((r) => !r.success);
    console.error('[Capture] Failed views:');
    for (const f of failed) {
      console.error(`  - ${f.name}: ${f.error}`);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[Capture] Fatal error:', err);
  process.exit(1);
});
