# Research: Slack Change Announcements

## Decision 1: Change Detection Mechanism

**Decision**: Track each repository's default branch HEAD separately from deployment versions, using a new `data/repo-heads.json` file.

**Rationale**: The existing pipeline tracks *deployed* SHAs per environment. This feature needs to detect merges to repo main branches, which happen before deployment. A separate HEAD tracking file decouples change announcements from deployment state.

**Alternatives considered**:
- Reuse existing `previous.json` — rejected because it tracks deployed versions per environment, not repo branch HEADs. A PR merged to main may not appear in any deployment for days.
- Track announced PRs in a separate file — rejected as unnecessary. If we track repo HEADs and update them after processing, we know exactly which PRs are new (between old and new HEAD). No separate "already announced" tracker needed.

## Decision 2: Duplicate Prevention Strategy

**Decision**: Update `repo-heads.json` after processing each repo, regardless of Slack success/failure.

**Rationale**: Consistent with existing fault-isolation pattern. If Slack is down, we log a warning but move on. This means a Slack outage could cause missed announcements, but this is acceptable for a notification system — the alternative (re-processing on next run) could cause repeated failures and message floods when Slack recovers.

**Alternatives considered**:
- Only update HEAD after successful Slack delivery — rejected because a persistent Slack failure would cause re-processing and potential message duplication when it recovers.
- Separate announced-PRs tracking file — rejected as over-engineering; HEAD tracking provides the same guarantee more simply.

## Decision 3: Channel Configuration

**Decision**: Use new environment variables with a `SLACK_CHANGE_WEBHOOK_` prefix, separate from existing `SLACK_WEBHOOK_URL_` deployment notification webhooks.

**Rationale**: This is a completely independent notification system. Using a different prefix avoids confusion and allows independent configuration (different channels, different webhooks).

**Env var naming**:
- `SLACK_CHANGE_WEBHOOK_CORE` — core repo (`espoon-voltti/evaka`)
- `SLACK_CHANGE_WEBHOOK_TAMPERE` — Tampere wrapper (`Tampere/trevaka`)
- `SLACK_CHANGE_WEBHOOK_OULU` — Oulu wrapper (`Oulunkaupunki/evakaoulu`)
- `SLACK_CHANGE_WEBHOOK_TURKU` — Turku wrapper (`City-of-Turku/evakaturku`)

**Alternatives considered**:
- Reuse `SLACK_WEBHOOK_URL_<CITY>` — rejected because change announcements should go to different channels than deployment notifications.
- Per-repo env vars using repo name — rejected because city-based naming is more consistent with existing patterns.

## Decision 4: Message Format

**Decision**: Group multiple PRs from the same repo into a single Slack message, one line per PR, using Slack mrkdwn format.

**Format**: Each line is `<PR_URL|#NUMBER> TITLE — AUTHOR`

**Example**:
```
<https://github.com/espoon-voltti/evaka/pull/8628|#8628> Testidatan refaktorointi - ei käytetä lateinit — Joosakur
<https://github.com/espoon-voltti/evaka/pull/8629|#8629> Fix login redirect — developer2
```

**Rationale**: Minimal format as requested. Grouping avoids message spam when many PRs merge between pipeline runs. Slack mrkdwn link format makes PR numbers clickable.

**Alternatives considered**:
- One message per PR — rejected as noisy when multiple PRs merge between runs.
- Block Kit with sections — rejected as over-designed for "minimal" announcements.

## Decision 5: Integration Point

**Decision**: Add change announcement logic as a new step in the main pipeline (`src/index.ts`), running independently from deployment detection and notifications.

**Rationale**: The new feature operates on repo branch HEADs, not deployment events. Running it as a separate step keeps concerns cleanly separated.

**Flow**: After version resolution but independent of deployment events — can run in parallel or sequentially. Reads/writes its own state file (`repo-heads.json`).

## Decision 6: Fetching Current Branch HEAD

**Decision**: Use the existing GitHub API client to fetch the latest commit on each repo's default branch via `getCommit()` or a lightweight ref lookup.

**Rationale**: Reuses existing authenticated GitHub client and ETag caching. No new dependencies needed.

## Decision 7: Repos to Track

**Decision**: Extract the unique set of repositories from the existing city group configuration (`instances.ts`). Core repo appears in all city groups but is tracked once. Each wrapper repo is tracked once.

**Repositories**:
- Core: `espoon-voltti/evaka` (branch: `master`)
- Wrapper: `Tampere/trevaka` (branch: `main`)
- Wrapper: `Oulunkaupunki/evakaoulu` (branch: `main`)
- Wrapper: `City-of-Turku/evakaturku` (branch: `main`)

**Note**: Espoo uses core directly (no wrapper), so no wrapper announcements for Espoo.
