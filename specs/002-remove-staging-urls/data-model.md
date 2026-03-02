# Data Model: Remove Staging/Testing URLs from Codebase

## New Types

### StagingInstanceInput

Represents a single instance entry within the `STAGING_INSTANCES` JSON array.

```
StagingInstanceInput
├── name: string              # Display name (e.g., "Espoo Staging")
├── domain: string            # Domain name (e.g., "staging.example.espoo.test")
└── authEnvPrefix?: string    # Optional prefix for auth env vars (e.g., "OULU_STAGING")
```

### StagingEnvironmentInput

Represents a staging environment entry in the `STAGING_INSTANCES` JSON array.

```
StagingEnvironmentInput
├── cityGroupId: string                # Must match a known city group ID
├── envId: string                      # Environment identifier (e.g., "espoo-staging")
└── instances: StagingInstanceInput[]   # One or more instances in this environment
```

## Modified Types

### No changes to existing types

The existing `Instance`, `Environment`, and `CityGroup` types remain unchanged. The new `StagingEnvironmentInput` types are only used for parsing the env var — they are converted to the existing `Environment` / `Instance` types before being merged into city groups.

## Data Flow

```
STAGING_INSTANCES env var (JSON string)
    │
    ▼
parseStagingInstances() → StagingEnvironmentInput[]
    │
    ▼
mergeStagingEnvironments(cityGroups, stagingEnvs) → CityGroup[]
    │  - For each staging env, find matching cityGroupId
    │  - Convert StagingInstanceInput → Instance (resolve auth from env vars)
    │  - Append as Environment { type: 'staging' } to the city group
    │
    ▼
CityGroup[] (production + staging combined)
```

## Environment Variable Schema

**Variable name**: `STAGING_INSTANCES`
**Type**: JSON string
**Required**: No (if missing, only production environments are monitored)

**Schema** (JSON array):
```
[
  {
    "cityGroupId": string,     // Required. Must match a CityGroup.id
    "envId": string,           // Required. Unique environment identifier
    "instances": [             // Required. At least one instance
      {
        "name": string,        // Required. Display name
        "domain": string,      // Required. Domain name (no protocol)
        "authEnvPrefix": string // Optional. Prefix for {PREFIX}_USER / {PREFIX}_PASS env vars
      }
    ]
  }
]
```

## Validation Rules

- `cityGroupId` must match an existing city group ID. Unknown IDs are logged as warnings and skipped.
- `envId` must be unique across all environments (production + staging).
- `domain` must be a non-empty string (no `https://` prefix).
- `instances` array must have at least one entry.
- If `authEnvPrefix` is provided, the runtime looks up `{prefix}_USER` and `{prefix}_PASS`. If either is missing/empty, auth is set to `null` (no auth header sent).
