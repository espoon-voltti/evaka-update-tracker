# Quickstart: Auto-Refresh Site Data

## Overview

Add a background polling module to the site that checks for data and code changes every 30 seconds. Data changes trigger seamless in-place re-rendering; code changes trigger a full page reload.

## Key Files to Modify

| File | Change |
|------|--------|
| `site/js/auto-refresh.js` | **NEW** - Polling module: fetch, compare, trigger updates |
| `site/js/app.js` | Import auto-refresh module; expose `refreshCurrentView()` function; refactor data caching |
| `site/index.html` | Add script import for auto-refresh module (if not handled by app.js) |
| `.github/workflows/*.yml` | Add step to generate `site/data/site-version.txt` during deploy |
| `tests/e2e/auto-refresh.spec.ts` | **NEW** - E2E tests for auto-refresh behavior |
| `tests/e2e/helpers/server.ts` | Support dynamic test data modification for refresh tests |

## Architecture

```
                    30s interval
                         │
                    ┌────▼────┐
                    │  Timer   │
                    └────┬────┘
                         │
                  ┌──────▼──────┐
                  │ Check Guard  │──── in-progress? → skip
                  └──────┬──────┘
                         │
              ┌──────────┼──────────┐
              ▼                     ▼
     Fetch data files        Fetch site-version.txt
     (cache-busting)         (cache-busting)
              │                     │
              ▼                     ▼
     Compare with cache      Compare with cached
              │                     │
         Changed?              Changed?
        ╱       ╲              ╱       ╲
      No        Yes          No        Yes
       │         │            │          │
       │    Re-render         │     location.reload()
       │    current view      │
       └─────────┴────────────┘
                 │
            Set inProgress=false
```

## Development Flow

1. Create `auto-refresh.js` module with polling logic
2. Refactor `app.js` to expose a `refreshCurrentView(data)` function
3. Add site-version.txt generation to CI
4. Write E2E tests with short poll interval override
5. Verify no visual blink during updates

## Testing Strategy

- **E2E tests use a configurable short interval** (500ms) to avoid adding 30s+ waits to the test suite
- The E2E test server can serve modified data files mid-test to simulate data changes
- Tests verify: data update renders, no-change is invisible, code change reloads
- Keep to 2-3 focused E2E test cases to minimize suite time impact
