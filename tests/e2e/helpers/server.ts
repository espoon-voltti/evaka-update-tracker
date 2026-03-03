/**
 * Minimal HTTP server for E2E tests.
 * Serves the site/ directory and test data from tests/e2e/test-data/.
 */

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

const SITE_DIR = path.resolve('site');
const TEST_DATA_DIR = path.resolve('tests/e2e/test-data');

function serveFile(res: http.ServerResponse, filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}

export function startServer(): Promise<{ url: string; close: () => void }> {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = req.url || '/';
      const cleanUrl = url.split('?')[0];

      // Serve data/ from test-data directory
      if (cleanUrl.startsWith('/data/')) {
        const dataPath = path.join(TEST_DATA_DIR, cleanUrl.replace('/data/', ''));
        serveFile(res, dataPath);
        return;
      }

      // Serve site files
      let filePath = path.join(SITE_DIR, cleanUrl);
      if (cleanUrl === '/' || cleanUrl === '') {
        filePath = path.join(SITE_DIR, 'index.html');
      }

      serveFile(res, filePath);
    });

    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (typeof addr === 'object' && addr) {
        const url = `http://127.0.0.1:${addr.port}`;
        console.log(`[E2E Server] Listening on ${url}`);
        resolve({
          url,
          close: () => server.close(),
        });
      }
    });
  });
}
