# Research: Capture Views Tool

## Decision 1: Dashboard View Capture Approach

**Decision**: Reuse existing E2E infrastructure (`generateTestData()` + `startServer()`) with Playwright for DOM extraction, following the `scripts/screenshot.ts` pattern.

**Rationale**: The screenshot tool already demonstrates this exact pattern — generate test data via nock mocks, start the local server, launch Chromium, navigate to routes. The capture-views tool replaces screenshot capture with DOM-to-Markdown extraction.

**Alternatives considered**:
- Server-side rendering: Would require reimplementing the frontend in Node.js
- JSDOM: Would miss CSS-driven layout and dynamic imports; Playwright already available

## Decision 2: DOM-to-Markdown Extraction Strategy

**Decision**: Use Playwright's `page.evaluate()` to walk the DOM tree inside the browser, converting elements to Markdown based on tag type and CSS classes.

**Rationale**: The browser has the fully rendered DOM with all dynamic imports resolved. Walking the DOM tree allows mapping `<h2>` → `## heading`, `<table>` → Markdown table, `<ul>/<li>` → `- item`, etc. This preserves structure without relying on innerText (which loses hierarchy) or raw HTML (which is not diffable).

**Key DOM selectors per view**:
- Overview (`#/`): Wait for `.city-grid`, extract `.city-card` elements
- City Detail (`#/city/:id`): Wait for `.city-detail`, extract `.env-section` and PR lists
- City History (`#/city/:id/history`): Wait for `.history-list`, extract `.history-event` timeline
- Features (`#/features`): Wait for `.feature-matrix`, extract table rows

**Alternatives considered**:
- Turndown (HTML→MD library): Adds a dependency; generic conversion misses semantic structure
- Custom per-view extractors: More accurate but more maintenance; DOM walker is simpler

## Decision 3: Slack Message Capture — Formatting Function Access

**Decision**: Export `buildSlackMessage()` from `src/api/slack.ts` (currently private) and call it directly with test DeploymentEvent data. `buildChangeAnnouncement()` from `src/services/change-announcer.ts` is already exported.

**Rationale**: Direct function calls avoid needing a running Slack webhook or HTTP mocking. The change-announcer formatter is already exported. The deployment notification formatter needs a small refactor (export the private `buildSlackMessage` function).

**Alternatives considered**:
- Intercepting HTTP calls with nock: Adds complexity; the formatted payload is what we need
- Duplicating formatting logic: Violates DRY principle

## Decision 4: Block Kit / mrkdwn → Markdown Conversion

**Decision**: Create a small utility `src/utils/slack-to-markdown.ts` that converts:
1. **Block Kit blocks** (from deployment notifications) → Markdown sections (header → `# heading`, section with mrkdwn → paragraphs, context → footer)
2. **Slack mrkdwn text** (from change announcements) → standard Markdown (`<url|text>` → `[text](url)`, `*bold*` → `**bold**`, `_italic_` → `*italic*`)

**Rationale**: Slack mrkdwn uses different syntax than standard Markdown (e.g., `*bold*` vs `**bold**`, `<url|text>` vs `[text](url)`). A dedicated converter ensures clean, readable Markdown output. Block Kit is structured JSON that maps naturally to Markdown sections.

**Alternatives considered**:
- Saving raw Slack format: Not readable in GitHub diffs
- Using a third-party converter: No maintained library for Block Kit → Markdown; simple enough to implement

## Decision 5: Test Data for Slack Snapshots

**Decision**: Construct representative test `DeploymentEvent` and `PullRequest[]` data inline in the capture script, using patterns from `tests/e2e/fixtures/mock-api-responses.ts` and `tests/unit/change-announcer.test.ts`.

**Rationale**: The E2E test data generation (`generateTestData()`) produces `current.json` and `history.json` for the frontend, but does not produce `DeploymentEvent` objects directly — those are intermediate pipeline objects. Creating representative test data inline (one deployment notification per city, one change announcement per repo type) is simpler and more deterministic than extracting events from the pipeline.

**Alternatives considered**:
- Running the full pipeline and capturing events mid-flight: Complex, fragile, nondeterministic
- Storing fixture events as JSON files: Extra files to maintain; inline data is self-documenting

## Decision 6: View Registry — Dynamic City Discovery

**Decision**: After generating test data, read `current.json` from the test data directory to discover city IDs dynamically. Build the view registry from: fixed routes (`/`, `/features`) + per-city routes derived from the data.

**Rationale**: The spec requires that the city list is derived from test data, not hardcoded. The `current.json` file contains `cityGroups` with their IDs, which map directly to hash routes (`#/city/{id}` and `#/city/{id}/history`).

**Alternatives considered**:
- Hardcoding city list: Would break when cities are added/removed in test data
- Parsing frontend JavaScript for routes: Fragile and unnecessary when data is available
