# Research: Improve History View

## R1: How to reuse `renderPRList` within history events

**Decision**: Call `renderPRList(event.includedPRs, { showBots, showRepoLabel: true })` directly within each history event card, replacing the custom inline PR rendering.

**Rationale**: The `renderPRList` component (in `site/js/components/pr-list.js`) already supports all needed features:
- `showBots` parameter for bot filtering (defaults to `false`)
- `showRepoLabel` parameter for `[core]`/`[wrapper]` badges
- Label badge rendering via `LABEL_MAP`
- Author display (hidden by default, shown on hover)
- Date formatting with Finnish locale
- PR title links to GitHub

The current history view renders its own PR list inline with a custom `<details>` + `<ul>` structure that lacks labels, bot filtering, and proper formatting. Replacing this with `renderPRList` eliminates ~20 lines of duplicate code and brings feature parity with city/overview views.

**Alternatives considered**:
- Creating a separate history-specific PR list component → Rejected: violates DRY, no unique history requirements
- Extending `renderPRList` with a "history mode" parameter → Rejected: unnecessary; existing parameters cover all needs

## R2: Bot event filtering strategy

**Decision**: Filter at two levels — event level and PR level:
1. **Event level**: If all PRs in an event are bots and `showBots` is false, hide the entire event
2. **PR level**: Pass `showBots` parameter to `renderPRList`, which already filters bot PRs

**Rationale**: This matches the city view behavior where the bot toggle affects PR visibility. Events with zero visible PRs after filtering would show an empty state, so hiding the entire event is cleaner.

**Edge case**: Events with 0 included PRs (data gap) should always be shown regardless of bot filter, with a "PR-tietoja ei saatavilla" message.

**Alternatives considered**:
- Only filter at PR level (keep events, show empty PR lists) → Rejected: shows pointless empty event cards
- Add a separate event-level toggle → Rejected: over-engineering; one toggle is sufficient

## R3: How to pass `showBots` state to history view

**Decision**: Follow the exact same pattern as the city detail view:
1. `app.js` `handleCityHistory` receives `queryParams` from the router (already supported by the router)
2. Extract `showBots = queryParams?.get('showBots') === 'true'`
3. Pass `showBots` to `renderHistoryView(city, historyData, { showBots })`
4. History view imports `getQueryParam`/`setQueryParam` from router for toggle binding

**Rationale**: The router already parses query parameters and passes them to route handlers. The city detail handler at `app.js:51` shows the exact pattern. Currently `handleCityHistory` at `app.js:75` does not accept `queryParams` — it needs to be updated to do so.

**Alternatives considered**: None — this is the established pattern.

## R4: Environment color-coding for history events

**Decision**: Add CSS classes for history event cards based on environment type:
- `.history-event.production` → green-tinted background (`#f0fdf4`, border `#86efac`) matching `.production-section`
- `.history-event.staging` → blue-tinted background (`#eff6ff`, border `#93c5fd`) matching `.staging-section`

**Rationale**: These are the exact same colors used by the city detail view's collapsible sections. Reusing CSS variables or direct color values ensures visual consistency.

**Alternatives considered**:
- Using CSS variables → The current codebase uses direct hex values for section backgrounds, not CSS variables. Following existing convention.
- Adding green/blue left border instead of background tint → Rejected: less visible, doesn't match city view pattern.

## R5: Finnish language improvements

**Decision**: Replace the following text:

| Current | New | Rationale |
|---------|-----|-----------|
| `{N} PR sisältyy` | `Sisältää {N} muutosta` | More natural Finnish; "sisältää" (contains) is active voice; "muutosta" (changes) is more stakeholder-friendly than "PR" |
| `Muutostapahtumia ei ole vielä tallennettu` | `Ei tallennettuja muutoksia` | Concise, natural |
| `Takaisin: {City}` | `← {City}` | Standard back navigation pattern; arrow is universally understood |
| `PR-tietoja ei saatavilla` | `PR-tietoja ei saatavilla` | Already acceptable, no change |
| `core` / `wrapper` (repo labels) | Handled by `renderPRList` → `[core]`/`[wrapper]` | The `renderPRList` component already renders these. Finnish translations "Ydin"/"Kuntaimplementaatio" are used as section headers in the city view, but inline repo labels use the technical short form — consistent with city view staging/pending sections |
| `Tuotanto` / `Testaus` | `Tuotanto` / `Testaus` | Already correct, no change |
| `Muutoshistoria` (page heading) | `Muutoshistoria` | Already correct, no change |

**New text for bot-filtered empty state**: `Vain automaattisia muutoksia. Näytä kaikki muutokset painamalla "Näytä riippuvuuspäivitykset".`

**Rationale**: Each change was evaluated for natural Finnish phrasing. Terms that are already idiomatic were preserved.

## R6: Timestamp formatting

**Decision**: Reuse the `formatTime` function from `status-badge.js` which produces format like "ti 4.3. klo 14.47" (weekday + date + time).

**Rationale**: This is the exact format used by the city view's environment status badges. The current history view uses `toLocaleString('fi')` which produces a different format without weekday names.

**Implementation**: Export `formatTime` from `status-badge.js` or duplicate the 6-line function in `history-view.js`. Given the DRY principle, exporting from status-badge is preferred.

**Alternatives considered**:
- Creating a shared `utils/format.js` module → Over-engineering for one function; can be done later if more formatting functions emerge
- Keeping `toLocaleString('fi')` and just prepending weekday → Inconsistent format with city view
