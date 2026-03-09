# Research: Improve Slack Announcements

## R1: Event Grouping Strategy

**Decision**: Group DeploymentEvents by `environmentId` at notification time in `index.ts`, before calling the Slack API.

**Rationale**: The change detector's job is to detect atomic changes (one per repo type). Grouping is a presentation concern. This keeps the detector simple and its existing tests valid.

**Alternatives considered**:
- Modify change detector to emit combined events → rejected: mixes detection and presentation concerns, requires changing the DeploymentEvent type and all downstream consumers.

**Implementation**: In `index.ts`, replace the per-event loop with:
1. Group `allEvents` by `environmentId` using a Map
2. For each environment group, call a new `sendCombinedSlackNotification(webhookUrl, events)` function

## R2: Finnish DateTime Formatting in Node.js

**Decision**: Use Node.js `Intl.DateTimeFormat` with `'fi'` locale and `timeZone: 'Europe/Helsinki'` to replicate the frontend's `formatTime()` pattern.

**Rationale**: The frontend already uses `toLocaleDateString('fi', ...)` and `toLocaleTimeString('fi', ...)`. Node.js 20+ ships full ICU data by default, so the same locale/timezone works server-side without dependencies.

**Alternatives considered**:
- `date-fns` or `luxon` library → rejected: unnecessary dependency for simple formatting
- Manual UTC offset calculation → rejected: fragile, DST-prone

**Implementation**: Create `src/utils/date-format.ts` with a `formatFinnishDateTime(isoString: string): string` function that returns format like "pe 6.3. klo 09.28". Note: Finnish locale uses periods in time (09.28) not colons, matching the spec example.

## R3: Bot PR Filtering in Slack Messages

**Decision**: Filter `includedPRs` using the existing `isBot` flag when building Slack message blocks.

**Rationale**: The `isBot` flag is already set during PR collection via `pr-classifier.ts`. No new classification logic needed — just apply the existing flag as a filter in the message builder.

**Alternatives considered**:
- Filter at event creation time → rejected: loses bot PR data for history/analytics
- New filtering logic in slack.ts → rejected: duplicates existing classifier

**Implementation**: In the message builder, filter `event.includedPRs.filter(pr => !pr.isBot)` before rendering the PR list.

## R4: Combined Message Block Kit Structure

**Decision**: The combined message will have a variable number of blocks depending on how many repo types changed:
- Header block (1): environment name + emoji
- Version fields block (1): shows SHAs for changed repos
- Timestamp field (1): Finnish datetime
- Changes section(s) (1-2): one per repo type that changed, each with its own "*Muutokset (type):*" heading
- Context block (1): dashboard link

**Rationale**: Slack Block Kit supports up to 50 blocks. Adding one extra section block for a second repo type is well within limits. The header and context blocks are shared.

**Implementation**: Modify `buildSlackMessage()` to accept an array of events (grouped by environment) and produce sections for each repo type present.

## R5: Slack API Function Signature Change

**Decision**: Change `sendSlackNotification` to accept `DeploymentEvent[]` instead of a single event. The function will build one combined Block Kit message from all events in the array.

**Rationale**: Simpler than creating a separate grouping/combining function. The caller (index.ts) groups events and passes the array.

**Alternatives considered**:
- Keep single-event function + new combining wrapper → rejected: adds unnecessary indirection
- New function name → rejected: existing function name is clear, just broadening its input
