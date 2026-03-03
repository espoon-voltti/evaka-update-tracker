# Contract: Static Data Files

The GH Action produces JSON data files that the static frontend reads. These files define the interface between the backend (data fetcher) and frontend (dashboard).

## current.json

Consumed by: frontend dashboard (status view, PR lists, city tabs)
Written by: GH Action on every run
Location: `data/current.json` (in repo) → deployed to `data/current.json` on Pages

```jsonc
{
  "generatedAt": "2026-03-02T12:00:00Z",
  "cityGroups": [
    {
      "id": "espoo",
      "name": "Espoo",
      "environments": [
        {
          "id": "espoo-prod",
          "type": "production",
          "version": {
            "instanceDomain": "espoonvarhaiskasvatus.fi",
            "checkedAt": "2026-03-02T12:00:00Z",
            "status": "ok",
            "wrapperCommit": null,
            "coreCommit": {
              "sha": "abc123def456...",
              "shortSha": "abc123d",
              "message": "Add new feature X",
              "date": "2026-03-01T15:30:00Z",
              "author": "developer1"
            }
          },
          "versionMismatch": false,
          "mismatchDetails": []
        }
        // ... staging environment
      ],
      "prTracks": {
        "wrapper": null,
        "core": {
          "repository": "espoon-voltti/evaka",
          "deployed": [
            // last 5 human PRs in production
            {
              "number": 8504,
              "title": "Add new feature X",
              "author": "developer1",
              "mergedAt": "2026-03-01T14:00:00Z",
              "repository": "espoon-voltti/evaka",
              "repoType": "core",
              "isBot": false,
              "url": "https://github.com/espoon-voltti/evaka/pull/8504"
            }
          ],
          "inStaging": [],
          "pendingDeployment": []
        }
      }
    }
    // ... other city groups
  ]
}
```

## history.json

Consumed by: frontend dashboard (history view)
Written by: GH Action (append new events, prune > 1 month)
Location: `data/history.json`

```jsonc
{
  "events": [
    {
      "id": "2026-03-02T12:00:00Z_espoo-prod_core",
      "environmentId": "espoo-prod",
      "cityGroupId": "espoo",
      "detectedAt": "2026-03-02T12:00:00Z",
      "previousCommit": {
        "sha": "oldsha...",
        "shortSha": "oldsha1",
        "message": "Previous deploy message",
        "date": "2026-02-28T10:00:00Z",
        "author": "developer2"
      },
      "newCommit": {
        "sha": "newsha...",
        "shortSha": "newsha1",
        "message": "Latest deploy message",
        "date": "2026-03-01T15:30:00Z",
        "author": "developer1"
      },
      "includedPRs": [
        {
          "number": 8504,
          "title": "Add new feature X",
          "author": "developer1",
          "mergedAt": "2026-03-01T14:00:00Z",
          "repository": "espoon-voltti/evaka",
          "repoType": "core",
          "isBot": false,
          "url": "https://github.com/espoon-voltti/evaka/pull/8504"
        }
      ],
      "repoType": "core"
    }
    // ... sorted by detectedAt descending
  ]
}
```

## previous.json

Consumed by: GH Action (change detection)
Written by: GH Action on every run
Location: `data/previous.json`
Not consumed by frontend.

```jsonc
{
  "checkedAt": "2026-03-02T12:00:00Z",
  "versions": {
    "espoo-prod": {
      "wrapperSha": null,
      "coreSha": "abc123def456..."
    },
    "espoo-staging": {
      "wrapperSha": null,
      "coreSha": "def789..."
    },
    "tampere-prod": {
      "wrapperSha": "wrapper123...",
      "coreSha": "core456..."
    }
    // ... all environment IDs
  }
}
```
