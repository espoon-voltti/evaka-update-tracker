# Research: Overview Fullscreen & Change Counts

**Feature**: 014-overview-fullscreen
**Date**: 2026-03-05

## R-001: Change Count Data Sources

**Decision**: Use existing `prTracks.core` and `prTracks.wrapper` data from `current.json` to derive counts.

**Rationale**: The data model already provides exactly what's needed:
- `inStaging` arrays contain PRs in staging/test state
- `pendingDeployment` arrays contain undeployed PRs
- Each PR has an `isBot` boolean for filtering
- Both core and wrapper tracks follow the same structure

**Count calculation**:
```
stagingCount = nonBotCount(prTracks.core?.inStaging) + nonBotCount(prTracks.wrapper?.inStaging)
pendingCount = nonBotCount(prTracks.core?.pendingDeployment) + nonBotCount(prTracks.wrapper?.pendingDeployment)
```

Where `nonBotCount(arr)` = `(arr || []).filter(pr => !pr.isBot).length`

**Edge cases**:
- Espoo has `prTracks.wrapper: null` — handled by optional chaining
- Some cities have empty arrays for wrapper tracks — handled naturally (count = 0)

**Alternatives considered**: None — the existing data model is a perfect fit.

## R-002: Fullscreen Mode Implementation Approach

**Decision**: Use a CSS class toggle on `<body>` (e.g., `body.fullscreen`) combined with CSS to hide header/footer and scale card content using viewport units.

**Rationale**:
- The browser Fullscreen API requires user gesture and shows browser-level UI (escape prompts) — not suitable for a dashboard that should "just work" on a wall display
- A CSS-only approach is simpler, more reliable, and doesn't need browser permissions
- Adding a class to `<body>` allows CSS to hide `header`, `footer`, and restyle `.city-grid` and `.city-card` in one place
- Viewport units (`vh`, `vw`, `vmin`) allow font sizes and card dimensions to scale with screen size

**Scaling strategy**:
- In fullscreen mode, `.city-grid` uses a fixed 2×2 grid (4 cities = 2 columns × 2 rows) filling 100vh × 100vw
- Card height: ~48vh (with gaps), card width: ~48vw
- Font sizes use `vmin` units so they scale proportionally
- City name: ~4vmin, count values: ~5vmin, labels: ~2.5vmin

**Alternatives considered**:
1. Browser Fullscreen API (`element.requestFullscreen()`) — rejected because it requires user gesture each time, shows browser escape UI, and is less suitable for kiosk/wall displays
2. CSS `zoom` property — rejected because it's not consistently supported and doesn't adapt to viewport size
3. CSS `transform: scale()` — rejected because it doesn't reflow content, causing overflow issues

## R-003: Fullscreen Toggle State Management

**Decision**: Use a query parameter `fullscreen=true` in the hash URL to persist fullscreen state.

**Rationale**:
- Consistent with existing patterns (e.g., `showBots=true` query param)
- Deep-linkable: a user can share a fullscreen URL for wall displays
- Survives page refresh
- The router already supports query params via `getQueryParam`/`setQueryParam`

**URL example**: `#/?fullscreen=true`

**Alternatives considered**:
1. In-memory variable — rejected because it doesn't survive refresh and isn't bookmarkable (violates constitution III: deep-bookmarkable)
2. localStorage — rejected because query params are simpler and already the established pattern

## R-004: Fullscreen Toggle Button Placement

**Decision**: Place the fullscreen toggle button within the `.city-grid` area (above or beside cards), ensuring it remains accessible in fullscreen mode.

**Rationale**:
- The header is hidden in fullscreen mode, so the toggle cannot be in the header
- A small, unobtrusive button within the main content area works in both modes
- In fullscreen mode, the button should be minimal (e.g., a small icon in a corner) to not distract from the dashboard content

## R-005: E2E Test Updates

**Decision**: Update existing overview E2E tests and add new test cases for change counts and fullscreen mode.

**Rationale**:
- Constitution requires E2E tests to be updated when DOM structure changes
- Existing tests check for `.pr-track-header` text on overview cards — these may need updating if the card structure changes
- New tests needed for: count display correctness, fullscreen toggle behavior, fullscreen layout

**Test data**: The existing test data in `tests/e2e/test-dist/` provides cities with known PR track data, allowing deterministic count assertions.
