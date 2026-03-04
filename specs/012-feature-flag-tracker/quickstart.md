# Quickstart: Feature Flag Tracker

**Feature**: 012-feature-flag-tracker | **Date**: 2026-03-04

## Prerequisites

- Node.js 20+
- `GH_TOKEN` environment variable with GitHub API access to:
  - `espoon-voltti/evaka`
  - `Tampere/trevaka`
  - `Oulunkaupunki/evakaoulu`
  - `City-of-Turku/evakaturku`

## Run the Data Pipeline

```bash
# Full pipeline (deployment tracking + feature flags)
npm start

# Output: data/feature-flags.json (+ existing data/current.json, etc.)
```

## Run Tests

```bash
# All unit + integration tests
npm test

# TypeScript parser tests only
npx jest tests/unit/typescript-flags.test.ts

# Kotlin parser tests only
npx jest tests/unit/kotlin-config.test.ts

# Feature flag collector tests
npx jest tests/unit/feature-flag-collector.test.ts

# GitHub API integration tests
npx jest tests/integration/feature-flag-api.test.ts

# E2E tests (requires built site)
npm run test:e2e

# Feature matrix E2E only
npx playwright test tests/e2e/feature-matrix.spec.ts
```

## View the Frontend

```bash
# Serve the site locally (after running pipeline)
npx serve dist

# Navigate to: http://localhost:3000/#/features
```

## Key Files

| File | Purpose |
|------|---------|
| `src/services/parsers/typescript-flags.ts` | Parse featureFlags.tsx to extract prod flag values |
| `src/services/parsers/kotlin-config.ts` | Parse Kotlin FeatureConfig bean to extract config values |
| `src/services/feature-flag-collector.ts` | Orchestrate fetching + parsing for all cities |
| `src/config/feature-labels.ts` | Finnish label mapping for all feature flags |
| `site/js/components/feature-matrix.js` | Frontend comparison matrix component |
| `data/feature-flags.json` | Generated output consumed by frontend |

## Architecture Overview

```
GitHub API (file contents)
    ↓
feature-flag-collector.ts
    ├── typescript-flags.ts (parse .tsx → flag values)
    └── kotlin-config.ts (parse .kt → config values)
    ↓
data/feature-flags.json
    ↓
Frontend (feature-matrix.js)
    ├── Comparison matrix (#/features)
    └── City detail summary (#/city/:id)
```
