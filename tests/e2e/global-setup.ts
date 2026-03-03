/**
 * Playwright global setup: generates test data and starts HTTP server.
 * Writes the server URL to a file so tests can read it.
 */

import * as fs from 'fs';
import * as path from 'path';
import { generateTestData } from './helpers/generate-test-data.js';
import { startServer } from './helpers/server.js';

const SERVER_INFO_PATH = path.resolve('tests/e2e/test-data/.server-info.json');

export default async function globalSetup() {
  console.log('[E2E Global Setup] Generating test data...');
  await generateTestData();
  console.log('[E2E Global Setup] Starting HTTP server...');

  const server = await startServer();

  // Store server info for tests to read
  fs.writeFileSync(SERVER_INFO_PATH, JSON.stringify({ url: server.url, pid: process.pid }));

  // Store close function for teardown
  (globalThis as Record<string, unknown>).__e2eServer = server;

  console.log(`[E2E Global Setup] Server ready at ${server.url}`);
}
