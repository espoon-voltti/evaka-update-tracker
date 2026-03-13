# Research: Real Name Display

**Feature**: 021-real-name-display | **Date**: 2026-03-13

## R1: GitHub Users API for Profile Name Lookup

**Decision**: Use `GET /users/{username}` endpoint to fetch the `name` field from GitHub user profiles.

**Rationale**: This is the simplest GitHub API endpoint for user data. It returns public profile information including the `name` field (display name set by the user). No special OAuth scopes are needed — the existing `GH_TOKEN` with repo access is sufficient. The endpoint returns a small JSON payload, making it efficient.

**Alternatives considered**:
- GraphQL API (`query { user(login: "...") { name } }`): More flexible but adds complexity; REST is already the project's pattern.
- Fetching name from PR response directly: The PR endpoint's `user` object only contains `login`, `id`, `avatar_url` — not the full profile `name`.

## R2: Name Caching Strategy

**Decision**: Persist a JSON cache file at `data/user-names.json` mapping GitHub usernames to resolved display names. Cache entries do not expire — names are re-fetched only when the cache file is missing an entry.

**Rationale**: The project already persists data as JSON files in the `data/` directory committed to git. A persistent cache avoids redundant API calls across the 5-minute scheduled runs. With ~30-50 unique contributors, the cache stays small. Since GitHub profile name changes are rare, a simple "fetch once" approach is sufficient. If a name needs updating, the cache entry can be manually deleted to trigger a re-fetch.

**Alternatives considered**:
- In-memory only cache (reset each run): Would cause unnecessary API calls every 5 minutes for the same ~30-50 users.
- TTL-based expiry: Over-engineering for this use case; profile names rarely change.
- Store names directly in current.json/history.json only: Would lose the cache between data refreshes and re-fetch names for every run.

## R3: Integration Point for Name Resolution

**Decision**: Resolve names in `pr-collector.ts` after PR data is fetched, before returning the `PullRequest` objects. Add an `authorName` field to the `PullRequest` interface.

**Rationale**: The PR collector is the single point where all PR data flows through. Enriching PR objects here means all downstream consumers (frontend, Slack, history) automatically get real names. Adding a separate `authorName` field (rather than overwriting `author`) preserves the original GitHub username for bot detection, linking, and debugging.

**Alternatives considered**:
- Resolve in frontend at display time: Would require the frontend to make API calls or load a separate mapping file — adds complexity and latency.
- Resolve in Slack notification code: Would only fix Slack, not the frontend.
- Overwrite `author` field with real name: Would break bot detection and lose the username for other uses.

## R4: GitHub API Rate Limiting

**Decision**: No special rate limiting logic needed. The existing `withRetry()` mechanism in `github.ts` handles transient failures. Cache minimizes total API calls.

**Rationale**: With ~30-50 unique authors and a persistent cache, name lookups only happen for new, uncached authors. Even in the worst case (cold cache), 50 API calls is negligible against the 5000/hour rate limit. The existing retry logic handles 403/429 responses.

**Alternatives considered**:
- Batch API calls: GitHub has no batch user endpoint; individual calls are the only option.
- Rate limit header tracking: Over-engineering given the low volume of calls.

## R5: Bot Account Handling

**Decision**: Skip name resolution for accounts identified as bots by the existing `isBotPR()` function. Bot authors retain their username as-is.

**Rationale**: Bot accounts (e.g., `dependabot[bot]`) don't have meaningful profile names. Skipping them avoids unnecessary API calls and potential 404 errors for `[bot]`-suffixed usernames.

**Alternatives considered**:
- Resolve all authors including bots: Wastes API calls and may return errors for bot accounts.
