# Data Model: Real Name Display

**Feature**: 021-real-name-display | **Date**: 2026-03-13

## Entities

### PullRequest (modified)

Existing entity with one new field.

| Field | Type | Description | Change |
|-------|------|-------------|--------|
| number | number | PR number | existing |
| title | string | PR title | existing |
| author | string | GitHub username (login) | existing, unchanged |
| **authorName** | **string \| null** | **Resolved display name from GitHub profile** | **NEW** |
| mergedAt | string | ISO 8601 timestamp | existing |
| repository | string | Full repo name (e.g., "espoon-voltti/evaka") | existing |
| repoType | 'core' \| 'wrapper' | Repository classification | existing |
| isBot | boolean | Whether author is a bot | existing |
| url | string | PR URL | existing |
| labels | string[] | PR labels | existing |

**Rules**:
- `authorName` is `null` when: the author is a bot, the GitHub profile has no name set, or the API call failed
- When `authorName` is `null`, display code falls back to `author`
- `author` (GitHub username) is always preserved and never overwritten

### UserNameCache (new)

Persistent cache stored at `data/user-names.json`.

| Field | Type | Description |
|-------|------|-------------|
| (key) | string | GitHub username (login) — serves as unique key |
| (value) | string \| null | Resolved display name, or `null` if profile has no name |

**Structure**: Simple key-value object `{ "username": "Real Name", "username2": null }`

**Rules**:
- Entries with `null` values indicate the user has no profile name — prevents re-fetching
- New usernames not in the cache trigger a GitHub API lookup
- Cache is committed to git alongside other data files
- To force a re-fetch for a user, delete their entry from the cache file

## Data Flow

```
GitHub API (PR list)
    │
    ▼
pr-collector.ts ──► extractPRsFromCommits()
    │                    │
    │                    ▼
    │              PullRequest { author: "username" }
    │                    │
    │                    ▼
    │              name-resolver.ts
    │                    │
    │         ┌──────────┼──────────┐
    │         ▼          ▼          ▼
    │     Is bot?    In cache?   Fetch profile
    │      (skip)    (use it)   GET /users/{username}
    │         │          │          │
    │         ▼          ▼          ▼
    │              authorName resolved
    │                    │
    │                    ▼
    │              PullRequest { author, authorName }
    │                    │
    ├────────────────────┤
    ▼                    ▼
data/current.json   data/user-names.json
site (frontend)     (cache updated)
Slack notifications
```
