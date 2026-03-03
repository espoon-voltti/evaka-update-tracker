/**
 * Playwright global teardown: stops the HTTP server.
 */

export default async function globalTeardown() {
  const server = (globalThis as Record<string, unknown>).__e2eServer as
    | { close: () => void }
    | undefined;

  if (server) {
    server.close();
    console.log('[E2E Global Teardown] Server stopped.');
  }
}
