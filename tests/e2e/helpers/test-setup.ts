/**
 * Shared test setup for E2E tests.
 * Generates test data and starts the server once, shared across all test files.
 */

import { generateTestData } from './generate-test-data.js';
import { startServer } from './server.js';

let serverInfo: { url: string; close: () => void } | null = null;
let setupDone = false;

export async function ensureSetup(): Promise<string> {
  if (setupDone && serverInfo) {
    return serverInfo.url;
  }

  // Generate test data (runs backend with mocked APIs)
  console.log('[E2E] Generating test data...');
  await generateTestData();
  console.log('[E2E] Test data generated.');

  // Start HTTP server
  serverInfo = await startServer();
  setupDone = true;

  return serverInfo.url;
}

export function teardown() {
  if (serverInfo) {
    serverInfo.close();
    serverInfo = null;
    setupDone = false;
  }
}
