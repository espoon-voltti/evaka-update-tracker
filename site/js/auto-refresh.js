/**
 * Auto-refresh module: polls for data and code changes every REFRESH_INTERVAL ms.
 *
 * - Data changes: re-invokes the provided refresh callback to re-render the current view.
 * - Code changes: triggers a full page reload via site-version.txt comparison.
 * - Silent on errors: logs to console, skips the cycle, retries next interval.
 * - Overlap guard: skips a cycle if the previous check is still in flight.
 */

/** Polling interval in milliseconds. Override via window.__autoRefreshInterval for testing. */
export const DEFAULT_INTERVAL = 30_000;

const DATA_FILES = [
  'data/current.json',
  'data/history.json',
  'data/feature-flags.json',
];

const VERSION_FILE = 'data/site-version.txt';

/** Cached response texts for change comparison. */
const cachedTexts = new Map();

/** Cached site version string. */
let cachedVersion = null;

let intervalId = null;
let inProgress = false;

function cacheBustUrl(url) {
  return `${url}?t=${Date.now()}`;
}

/**
 * Initialize the cache with the current data file contents.
 * Called once during startup so the first poll has a baseline.
 */
export async function initCache() {
  const fetches = DATA_FILES.map(async (file) => {
    try {
      const resp = await fetch(cacheBustUrl(file));
      if (resp.ok) {
        cachedTexts.set(file, await resp.text());
      }
    } catch {
      // Ignore — file may not exist yet
    }
  });
  // Also cache the site version
  fetches.push(
    (async () => {
      try {
        const resp = await fetch(cacheBustUrl(VERSION_FILE));
        if (resp.ok) {
          cachedVersion = (await resp.text()).trim();
        }
      } catch {
        // Ignore
      }
    })()
  );
  await Promise.all(fetches);
}

/**
 * Perform a single refresh check cycle.
 * Returns true if data changed (and refreshFn was called), false otherwise.
 */
async function checkForChanges(refreshFn) {
  // Check code version first (takes precedence)
  try {
    const versionResp = await fetch(cacheBustUrl(VERSION_FILE));
    if (versionResp.ok) {
      const newVersion = (await versionResp.text()).trim();
      if (cachedVersion !== null && newVersion !== cachedVersion) {
        // Code changed — full reload
        window.location.reload();
        return false;
      }
      cachedVersion = newVersion;
    }
  } catch {
    // Version file not available — skip code change detection this cycle
  }

  // Check data files for changes
  let dataChanged = false;
  for (const file of DATA_FILES) {
    try {
      const resp = await fetch(cacheBustUrl(file));
      if (!resp.ok) continue;
      const text = await resp.text();
      const prev = cachedTexts.get(file);
      if (prev !== undefined && text !== prev) {
        dataChanged = true;
      }
      cachedTexts.set(file, text);
    } catch {
      // Skip this file this cycle
    }
  }

  if (dataChanged) {
    await refreshFn();
  }

  return dataChanged;
}

/**
 * Start the auto-refresh polling loop.
 * @param {Function} refreshFn - Called when data changes are detected (e.g., refreshCurrentView)
 */
export function startAutoRefresh(refreshFn) {
  if (intervalId !== null) return; // Already running

  const interval = window.__autoRefreshInterval || DEFAULT_INTERVAL;

  intervalId = setInterval(async () => {
    if (inProgress) return; // Overlap guard
    inProgress = true;
    try {
      await checkForChanges(refreshFn);
    } catch (err) {
      console.error('[auto-refresh] Unexpected error during check:', err);
    } finally {
      inProgress = false;
    }
  }, interval);
}

/**
 * Stop the auto-refresh polling loop.
 */
export function stopAutoRefresh() {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
  inProgress = false;
}
