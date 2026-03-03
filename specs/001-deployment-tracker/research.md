# Research: eVaka Deployment Tracker

**Date**: 2026-03-02 | **Branch**: `001-deployment-tracker`

## R1: PR Tracking Between Deployed Versions

**Decision**: Use GitHub Compare API + commit message parsing for PR extraction.

**Rationale**: The Compare API (`GET /repos/{owner}/{repo}/compare/{base}...{head}`) returns up to 250 commits between two SHAs, which is sufficient for the eVaka deployment cadence. PR numbers are extracted from commit messages using the pattern `Merge pull request #NNN from ...` (for merge commits) and `Title (#NNN)` (for squash merges). Full PR metadata is then fetched via `GET /repos/{owner}/{repo}/pulls/{number}`.

For "not yet deployed" PRs: use `GET /repos/{owner}/{repo}/compare/{deployed_sha}...{main_branch}` to get commits on `main` that are ahead of the deployed version.

**Alternatives considered**:
- Walking commits list API: More API calls, no commit limit, but unnecessary for typical deployment intervals.
- Listing closed PRs and filtering: Inefficient, no `sort=merged` option, requires matching merge_commit_sha.

## R2: GitHub API Rate Limits

**Decision**: Use a dedicated GitHub PAT (stored as a secret) instead of the automatic `GITHUB_TOKEN`, plus ETag-based caching.

**Rationale**: `GITHUB_TOKEN` in Actions provides 1,000 requests/hour per repository. With 12 instances checked every 5 minutes (~144 calls/cycle, ~1,728/hour), this is too tight. A PAT provides 5,000 requests/hour. With ETag caching (304 responses don't count against the limit) and only fetching PR details when versions actually change, real consumption drops to ~300-500/hour.

**Alternatives considered**:
- GitHub App installation token (5,000/hour): More setup complexity, same rate limit as PAT.
- Reducing check frequency to 15 minutes: Conflicts with the 5-minute freshness requirement.

## R3: GitHub Pages Deployment

**Decision**: Use `actions/upload-pages-artifact@v3` + `actions/deploy-pages@v4` (modern artifact-based approach).

**Rationale**: This is the officially recommended approach. It creates proper deployment environments in the GitHub UI, doesn't clutter commit history with build artifacts, and avoids race conditions from pushing to a `gh-pages` branch.

**Requirements**: Repository Settings > Pages > Source must be set to "GitHub Actions". Workflow needs `pages: write` and `id-token: write` permissions.

**Alternatives considered**:
- Pushing to `gh-pages` branch: Older pattern, clutters history, no deployment environment tracking.

## R4: Slack Notifications

**Decision**: Use Slack Incoming Webhooks with Block Kit format.

**Rationale**: Block Kit is the modern, recommended approach for rich Slack messages. Incoming webhooks are simple (POST JSON to URL, no OAuth setup). Rate limit is 1 message/second, which is more than sufficient for deployment notifications (a few per day at most).

**Message structure**: Header block (city + environment), Section block (version + PR summary), Context block (timestamp). Color-coded attachment border for prod vs staging.

**Alternatives considered**:
- Legacy attachments format: Still works but not recommended.
- Slack Bot API (chat.postMessage): More powerful but requires OAuth app setup, unnecessary for one-way notifications.

## R5: Frontend Architecture

**Decision**: Vanilla JavaScript with ES modules and hash-based routing. Zero external dependencies.

**Rationale**: The dashboard has a focused scope (4 city tabs, PR lists, history views, a toggle). This doesn't warrant a framework. Modern browsers support ES modules natively (`<script type="module">`), allowing well-organized code without a build step. Hash-based routing (`window.location.hash`, `hashchange` event) provides deep-bookmarking with zero configuration on GitHub Pages.

**Deep-linking scheme**: `#/city/{name}` for city view, `#/city/{name}/history` for history, query params for filters (e.g., `#/city/espoo?showBots=true`).

**Alternatives considered**:
- Preact (~5KB): Excellent capability/size ratio but adds a build step, which conflicts with "minimal dependencies" goal.
- Lit (~5KB): Web Components-based, but steeper learning curve and router is in labs.
- Alpine.js (~15KB): Largest option, no built-in routing.

## R6: Data Persistence Strategy

**Decision**: JSON files committed to the repository's `data/` directory. Pruned to 1-month retention on each run.

**Rationale**: Per clarification session. Self-contained, git-auditable, and the GH Action already has write access to its own repo. Three files:
- `data/current.json` — full current deployment snapshot (all cities, environments, PRs)
- `data/history.json` — chronological deployment events (1-month window)
- `data/previous.json` — previous run's version SHAs (for change detection)

The GH Action commits data changes, then separately deploys the site + data as a Pages artifact.

## R7: Submodule Resolution

**Decision**: Use GitHub Contents API (`GET /repos/{owner}/{repo}/contents/evaka?ref={sha}`) — confirmed working.

**Rationale**: Returns `type: "submodule"` with `sha` field pointing to the core eVaka commit. This is the same approach used in the existing evaka-version-tracker and is reliable for all wrapper repositories.
