import * as path from 'path';
import { startServer } from '../tests/e2e/helpers/server.js';

// Must match the localhost origin in ops_metrics_allowed_origins in the staging
// variables of evaka-infra, or the browser blocks the metrics requests.
const PORT = 3578;

await startServer({ port: PORT, dataDir: path.resolve('data') });
console.log(`Open http://localhost:${PORT} (not 127.0.0.1, which CORS does not allow)`);
