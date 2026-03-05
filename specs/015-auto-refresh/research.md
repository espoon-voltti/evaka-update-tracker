# Research: Auto-Refresh Site Data

## R1: Change Detection Strategy for Static Site (GitHub Pages)

**Decision**: Use cache-busting fetch + JSON string comparison for data files; use a generated version identifier for code change detection.

**Rationale**: GitHub Pages does not reliably support ETags or configurable cache headers. The simplest reliable approach is:
- For data: Re-fetch data JSON files with `?t=<timestamp>` cache-busting. Compare the response text against the previously cached text. If different, parse and re-render.
- For code: Generate a `site/data/site-version.txt` file during the CI build step containing a content hash or build timestamp. Poll this small file every 30s. If it changes, trigger a full page reload.

**Alternatives considered**:
- **ETag/Last-Modified headers**: Not reliably controllable on GitHub Pages. Rejected.
- **Service Workers**: Overly complex for this use case. Would require registration, lifecycle management, and cache strategy. Rejected.
- **WebSocket/SSE**: No server-side capability on static hosting. Not applicable.
- **Fetch all files and hash client-side**: More bandwidth than needed. Comparing raw JSON text is sufficient and avoids hashing overhead.

## R2: Selective DOM Re-rendering Without Framework

**Decision**: Refactor the existing render/bind pattern so `app.js` can re-invoke the current route's render+bind cycle when data changes, targeting only the `#app` container.

**Rationale**: The site already uses a pattern where each route handler calls `renderX()` + `bindXEvents()`. The auto-refresh module can simply re-invoke the current route handler when data changes. Since the entire `#app` container is replaced (innerHTML), this is already how navigation works. The key insight is that this does NOT cause a visible "blink" because:
1. The browser only repaints once the new innerHTML is set (no intermediate blank state)
2. Scroll position on the outer document is preserved (the `#app` div changes but the page scroll stays)

**Alternatives considered**:
- **DOM diffing library (morphdom, etc.)**: Adds a dependency for marginal benefit. The existing innerHTML replacement is fast enough for this content size. Rejected per constitution (minimal dependencies).
- **Fine-grained section updates**: Would require significant refactoring of all components to support partial updates. Over-engineering for this use case. Rejected.

## R3: Preventing Visual "Blink" on Data Update

**Decision**: Only re-render when data has actually changed (string comparison gate). When re-rendering, use innerHTML replacement on the `#app` container which produces a single-frame update with no intermediate blank state.

**Rationale**: The "blink" users experience with full page reloads comes from the browser clearing the document and re-parsing HTML. With innerHTML replacement on a child element, the browser simply swaps the DOM subtree in a single paint frame. Scroll position on the document is preserved because the scroll container (body/viewport) is not destroyed.

## R4: E2E Testing Strategy for Polling Features

**Decision**: Make the polling interval configurable (exposed as a module-level constant or parameter). In E2E tests, override it to a short interval (500ms-1s) to avoid long waits. Keep auto-refresh E2E tests minimal and focused.

**Rationale**: Testing a 30-second polling interval in E2E would add unacceptable test duration. By making the interval configurable:
- Production uses 30s (the default)
- E2E tests use a short interval to verify behavior quickly
- Tests verify: (1) data change triggers re-render, (2) no-change causes no visible effect, (3) code change triggers reload

The E2E test server already serves test data from a separate directory. We can modify the test data files between assertions to simulate server-side changes.

**Alternatives considered**:
- **Mock timers in Playwright**: Playwright supports `page.clock` but it's fragile for network-dependent features. Rejected.
- **Skip E2E, unit test only**: Misses real integration behavior. The constitution requires E2E coverage for user-facing features.
- **Test with real 30s interval**: Would add minutes to the test suite. Rejected per user requirement.

## R5: Code Version File Generation

**Decision**: Add a `site-version.txt` generation step to the CI pipeline that writes a timestamp or git SHA to `site/data/site-version.txt`. The auto-refresh module fetches this file to detect code deployments.

**Rationale**: This is the lightest-weight approach to detect code changes without fetching and comparing entire JS/CSS/HTML files. A single small text file fetch per cycle is negligible overhead. The version only changes when the CI pipeline deploys new code.

**Alternatives considered**:
- **Hash all JS/CSS/HTML files**: Multiple fetches per cycle, more bandwidth. Rejected.
- **Embed version in HTML meta tag**: Would require fetching and parsing full HTML. Rejected.
- **Compare app.js file**: Fetching the entire JS file every 30s wastes bandwidth. Rejected.
