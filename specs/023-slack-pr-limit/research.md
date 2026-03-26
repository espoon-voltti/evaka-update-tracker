# Research: Increase Slack PR Limit with Overflow Link

## R1: Slack Block Kit Text Size Limits

**Decision**: Use 50 as the PR limit per section.

**Rationale**: Slack Block Kit `section` blocks with `mrkdwn` text have a 3000-character limit. Each PR line is approximately 60-80 characters (bullet + link + tags + title + author). At 50 PRs, worst case is ~4000 characters which could exceed the limit. However, this is an extremely rare edge case (50+ PRs in a single deployment), and the overflow mechanism handles it gracefully by capping at 50 and linking to the full list.

**Alternatives considered**:
- No limit: Risks hitting Slack's block text limit on very large deployments
- 25 limit: More conservative but would still truncate some deployments unnecessarily
- Dynamic limit based on character count: Over-engineered for this use case

## R2: Overflow Link URL Construction

**Decision**: Reuse `dashboardBaseUrl` and `cityGroupId` already available in `buildSlackMessage` to construct the history URL.

**Rationale**: The `buildSlackMessage` function already constructs a dashboard link at line 96 using `${dashboardBaseUrl}#/city/${firstEvent.cityGroupId}`. The history page URL follows the same pattern with `/history` appended. The `cityGroupId` is available on every `DeploymentEvent` object.

**Alternatives considered**:
- Pass a pre-constructed history URL: Unnecessary coupling; the base URL and slug are already available
- Add a new config field: Over-engineering for a simple URL construction

## R3: Function Signature Change

**Decision**: Extend `buildChangesSection` to accept `dashboardBaseUrl` and `cityGroupId` as additional parameters, passed from `buildSlackMessage`.

**Rationale**: `buildChangesSection` currently only receives a `DeploymentEvent`. To build the overflow link, it also needs the dashboard base URL and city group ID. Since `buildSlackMessage` already has both values, passing them through is the minimal change.

**Alternatives considered**:
- Return overflow info from `buildChangesSection` and assemble in `buildSlackMessage`: Splits the formatting logic across two functions unnecessarily
- Add dashboard URL to `DeploymentEvent` type: Pollutes the data model with presentation concerns

## R4: Overflow Message Wording

**Decision**: Use `...ja N muuta muutosta` with a Slack link to the history page.

**Rationale**: Consistent with existing Finnish-language Slack message format. The link text clearly communicates how many additional changes exist and where to find them. Format: `_...ja <${historyUrl}|N muuta muutosta>_`

**Alternatives considered**:
- English message: Inconsistent with rest of Finnish notification
- Just a count without link: Misses the opportunity to direct users to full details
