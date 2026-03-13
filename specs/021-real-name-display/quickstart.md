# Quickstart: Real Name Display

**Feature**: 021-real-name-display | **Date**: 2026-03-13

## What This Feature Does

Replaces GitHub usernames (e.g., "akheron") with real names (e.g., "Petri Lehtinen") across the deployment tracker frontend and Slack notifications. Names are fetched from GitHub user profiles during data collection and cached persistently.

## Key Files to Modify

1. **`src/types.ts`** — Add `authorName: string | null` to `PullRequest` interface
2. **`src/api/github.ts`** — Add `getUser(username)` method to fetch GitHub profile
3. **`src/services/name-resolver.ts`** (new) — Cache management + name resolution orchestration
4. **`src/services/pr-collector.ts`** — Call name resolver after collecting PRs
5. **`site/js/components/pr-list.js`** — Display `authorName ?? author`
6. **`src/api/slack.ts`** & **`src/services/change-announcer.ts`** — Use `authorName ?? author` in messages

## Key Design Decisions

- **`authorName` is a new field** — `author` (username) is preserved for bot detection, URL construction, debugging
- **Names resolved at collection time** — No API calls at display time; name stored in data files
- **Persistent cache** — `data/user-names.json` avoids re-fetching known authors every 5 minutes
- **`null` in cache means "no name on profile"** — Prevents re-fetching users who haven't set a name
- **Bots are skipped** — No API call for bot authors; they keep their username

## How to Test Locally

```bash
# Run unit tests
npm test

# Run E2E tests
npm run test:e2e

# Manual verification: run the data pipeline locally
cp .env.example .env  # ensure GH_TOKEN is set
npm run build && node dist/index.js
# Check data/current.json for authorName fields
# Check data/user-names.json for cached names
```

## API Reference

GitHub Users API endpoint used:
```
GET /users/{username}
Response: { "login": "akheron", "name": "Petri Lehtinen", ... }
```
- No special scopes needed beyond existing `GH_TOKEN`
- Rate limit: 5000 req/hr (authenticated)
