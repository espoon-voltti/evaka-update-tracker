# Research: Slack Staging Details

**Feature**: 023-slack-staging-details
**Date**: 2026-03-18

## R1: How to pass staging PR count to Slack notification

**Decision**: Add an optional `stagingContext` parameter to `sendSlackNotification()` and `buildSlackMessage()` containing the count of PRs in staging but not in production.

**Rationale**: The current function signature receives only `DeploymentEvent[]` which contains `includedPRs` (PRs in the current deployment change), not the cumulative `inStaging` count. Rather than changing the `DeploymentEvent` type (which would affect serialization and other consumers), a separate optional parameter cleanly extends the function without breaking existing callers.

**Alternatives considered**:
- Embedding `inStaging` count in `DeploymentEvent`: Rejected because `DeploymentEvent` represents a single change detection, not cumulative state. Adding staging comparison data would conflate concerns.
- Reading `current.json` from within `slack.ts`: Rejected because it creates a file system dependency in an API module and the data may not be written yet at notification time.

## R2: Where the inStaging data is available at notification time

**Decision**: Compute the staging PR count at the call site in `src/index.ts` from the `PRTrack` data that is already collected per city group (lines 175-219), then pass it to `sendSlackNotification()`.

**Rationale**: The `PRTrack.inStaging` arrays for both core and wrapper repos are computed before Slack notifications are sent (line 247+). The `cityGroupsData` array contains this data indexed by city group ID. When iterating deployment events grouped by environment (line 255), we can look up the corresponding city group's `prTracks` to compute the total `inStaging` count.

**Alternatives considered**:
- Re-computing inStaging at notification time via GitHub API: Rejected as redundant — data is already available in memory.

## R3: Finnish text for staging comparison

**Decision**: Use the following Finnish text patterns:
- Plural (N > 1): `+N muutosta verrattuna tuotantoon` ("+N changes compared to production")
- Singular (N = 1): `+1 muutos verrattuna tuotantoon` ("+1 change compared to production")
- Zero/in sync: `Sama versio kuin tuotannossa` ("Same version as production")

**Rationale**: Follows existing Finnish language patterns in the codebase (e.g., "Tuotanto päivitetty", "Ei merkittäviä muutoksia"). Finnish requires different suffix for singular ("muutos") vs plural ("muutosta").

**Alternatives considered**:
- English text: Rejected — all existing Slack text is in Finnish.

## R4: Descriptive dashboard link text

**Decision**: Change the context block link text from the generic `Ympäristöjen tiedot` to `Katso {cityName} ympäristöjen tilanne` ("View {cityName} environment status") for staging notifications. Production notifications keep the existing generic text.

**Rationale**: The city name is already computed in `buildSlackMessage()` (line 68). Using it in the link text provides clearer context. The verb "Katso" (View/See) adds an action-oriented call to action.

**Alternatives considered**:
- Using the same descriptive link for both production and staging: Rejected per FR-006 — production notification format must remain unchanged.
- Including staging comparison count in the link text: Rejected as it would make the link text too long and cluttered.

## R5: Slack Block Kit placement of comparison info

**Decision**: Add the staging comparison text as a new `context` block element placed just before the dashboard link in the existing context block, so both appear together at the bottom of the message.

**Rationale**: The comparison count is supplementary context, not a primary content element. Placing it in the context block alongside the link keeps the main message body focused on the actual deployment changes. Slack's context block supports multiple elements, so both the comparison text and the link can coexist cleanly.

**Alternatives considered**:
- Adding a separate section block: Rejected as it would make the message taller and more cluttered for relatively minor context info.
- Adding to the version/timestamp fields section: Rejected as fields have limited width and the comparison text is conceptually different from version info.
