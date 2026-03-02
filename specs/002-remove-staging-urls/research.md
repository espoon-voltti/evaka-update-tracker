# Research: Remove Staging/Testing URLs from Codebase

## R1: Environment Variable Format for Structured Instance Data

**Decision**: JSON array in a single `STAGING_INSTANCES` environment variable

**Rationale**: The staging instance data is inherently nested — each city group can have one or more staging environments, each with one or more instances (e.g., Tampere region has 9 test instances in one environment). JSON handles this naturally. CSV would require awkward delimiters and couldn't express the nesting without a custom parser.

**Alternatives considered**:
- **CSV** (`cityGroupId,envId,name,domain` per line): Cannot express the grouping of multiple instances into one environment without additional convention. Also makes the `authEnvPrefix` field awkward.
- **YAML**: Not natively parseable in Node.js without a dependency (violates minimal-dependency principle).
- **Multiple env vars** (one per city group): User explicitly rejected this — "I don't want to maintain more than one env variable."
- **External config file**: Would work but adds file management overhead and is harder to manage in GitHub Actions (env vars/secrets are the standard mechanism).

## R2: Auth Credential Resolution Pattern

**Decision**: Use `authEnvPrefix` field in the JSON to reference env var pairs (`{prefix}_USER`, `{prefix}_PASS`)

**Rationale**: Actual credentials must not be stored in the `STAGING_INSTANCES` variable (which may be a repository variable, not a secret). The `authEnvPrefix` pattern keeps the JSON declarative while credentials remain in separate secrets.

**Alternatives considered**:
- **Inline credentials in JSON**: Would require `STAGING_INSTANCES` to be a secret, making it harder to inspect/edit. Also mixes concerns.
- **Separate auth config**: Would require a second env var, violating the single-variable constraint.
- **Convention-based** (always check `{CITYID}_STAGING_USER`): Too implicit; the `authEnvPrefix` makes the relationship explicit and flexible.

## R3: Graceful Handling of Missing/Invalid STAGING_INSTANCES

**Decision**: If `STAGING_INSTANCES` is unset or empty, proceed with production-only monitoring. If set but invalid JSON, log a warning and proceed with production-only.

**Rationale**: The data fetcher should not crash if staging config is missing. Local development and CI test runs may not have staging instances configured. A warning on invalid JSON helps catch typos without blocking production monitoring.

## R4: Impact on Existing Tests

**Decision**: Minimal test changes needed.

**Analysis of current test files**:
- `tests/integration/status-api.test.ts` — Uses `espoo.evaka.fi` (synthetic, not a real staging URL). No change needed.
- `tests/unit/version-resolver.test.ts` — Uses `varhaiskasvatus.tampere.fi`, `espoonvarhaiskasvatus.fi`, `evaka.kangasala.fi` (all production domains). No change needed.
- `tests/fixtures/sample-data.ts` — Contains a real staging URL (line 35). Replace with `staging.example.evaka.test`.

**New tests needed**:
- `tests/unit/staging-config.test.ts` — Parse valid JSON, handle missing env var, handle invalid JSON, handle auth resolution, handle unknown city group IDs.

## R5: Files Requiring Staging URL Removal

| File | Staging URLs | Action |
|------|-------------|--------|
| `src/config/instances.ts` | 12 staging instance domains | Remove staging environment blocks; keep production |
| `README.md` | 4 staging domains in table | Replace with generic "configured via env" note |
| `.env.example` | Oulu staging URL in comment | Remove URL, add `STAGING_INSTANCES` example |
| `tests/fixtures/sample-data.ts` | Real staging domain | Replace with `staging.example.evaka.test` |
| `specs/001-deployment-tracker/spec.md` | ~15 staging URLs in Monitored Instances | Remove specific domains, keep generic descriptions |
| `specs/001-deployment-tracker/quickstart.md` | No URLs (only env var names) | No change needed |
| `site/js/components/city-detail.js` | No URLs (only "Staging / Test" label) | No change needed |
