# Quickstart: Configuring Staging Instances

## Overview

Staging/testing environment URLs are configured via a single `STAGING_INSTANCES` environment variable containing a JSON array. This keeps semi-private staging URLs out of the committed codebase.

## Local Development

Add the `STAGING_INSTANCES` variable to your `.env` file:

```bash
# Staging instances (JSON array)
# Each entry specifies a city group, environment ID, and instance list
STAGING_INSTANCES='[{"cityGroupId":"espoo","envId":"espoo-staging","instances":[{"name":"Espoo Staging","domain":"your-staging-domain-here"}]}]'
```

For instances requiring HTTP basic auth, add `authEnvPrefix` and the corresponding credential env vars:

```bash
STAGING_INSTANCES='[{"cityGroupId":"oulu","envId":"oulu-staging","instances":[{"name":"Oulu Staging","domain":"your-staging-domain-here","authEnvPrefix":"OULU_STAGING"}]}]'
OULU_STAGING_USER=your-username
OULU_STAGING_PASS=your-password
```

## GitHub Actions Setup

1. Go to **Repository Settings → Secrets and variables → Actions**
2. Add `STAGING_INSTANCES` as a repository **secret** (since URLs are semi-private)
3. The workflow automatically passes it to the data fetcher

## JSON Format Reference

```json
[
  {
    "cityGroupId": "espoo",
    "envId": "espoo-staging",
    "instances": [
      { "name": "Espoo Staging", "domain": "staging-domain-here" }
    ]
  },
  {
    "cityGroupId": "tampere-region",
    "envId": "tampere-test",
    "instances": [
      { "name": "Tampere Test", "domain": "test-domain-here" },
      { "name": "Hämeenkyrö Test", "domain": "test-domain-here" }
    ]
  },
  {
    "cityGroupId": "oulu",
    "envId": "oulu-staging",
    "instances": [
      { "name": "Oulu Staging", "domain": "staging-domain-here", "authEnvPrefix": "OULU_STAGING" }
    ]
  }
]
```

### Fields

| Field | Required | Description |
|-------|----------|-------------|
| `cityGroupId` | Yes | Must match a known city group ID (`espoo`, `tampere-region`, `oulu`, `turku`) |
| `envId` | Yes | Unique identifier for this staging environment |
| `instances[].name` | Yes | Display name shown in the dashboard |
| `instances[].domain` | Yes | Domain name (without `https://` prefix) |
| `instances[].authEnvPrefix` | No | If set, looks up `{PREFIX}_USER` and `{PREFIX}_PASS` env vars for HTTP basic auth |

## Running Without Staging

If `STAGING_INSTANCES` is not set or is empty, the tracker monitors only production instances. This is a valid configuration for environments where staging monitoring is not needed.
