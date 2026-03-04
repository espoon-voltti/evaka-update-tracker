# Contract: data/feature-flags.json

**Feature**: 012-feature-flag-tracker | **Date**: 2026-03-04

## Overview

`data/feature-flags.json` is a generated data file produced by the data pipeline and consumed by the frontend. It contains the complete snapshot of feature flag values across all tracked cities.

**Producer**: `src/services/feature-flag-collector.ts` (pipeline)
**Consumer**: `site/js/components/feature-matrix.js` (frontend), `site/js/components/city-detail.js` (frontend)
**Refresh**: Every 5 minutes (same cycle as `data/current.json`)
**Committed by**: CI workflow (`monitor.yml`)

## Schema

```json
{
  "generatedAt": "2026-03-04T12:00:00.000Z",
  "cities": [
    {
      "id": "espoo",
      "name": "Espoo",
      "cityGroupId": "espoo",
      "error": null
    },
    {
      "id": "tampere",
      "name": "Tampere",
      "cityGroupId": "tampere-region",
      "error": null
    },
    {
      "id": "nokia",
      "name": "Nokia",
      "cityGroupId": "tampere-region",
      "error": null
    }
  ],
  "categories": [
    {
      "id": "frontend",
      "label": "Käyttöliittymäominaisuudet",
      "flags": [
        {
          "key": "citizenShiftCareAbsence",
          "label": "Vuorohoidon poissaolot kansalaisille",
          "type": "boolean",
          "values": {
            "espoo": true,
            "tampere": false,
            "nokia": false,
            "kangasala": false,
            "lempaala": false,
            "orivesi": false,
            "pirkkala": false,
            "vesilahti": false,
            "ylojarvi": false,
            "hameenkyro": false,
            "oulu": false,
            "turku": false
          }
        },
        {
          "key": "daycareApplication.dailyTimes",
          "label": "Päivähoitohakemuksen päivittäiset ajat",
          "type": "boolean",
          "values": {
            "espoo": true,
            "tampere": false,
            "oulu": true,
            "turku": false
          }
        }
      ]
    },
    {
      "id": "backend",
      "label": "Taustajärjestelmän asetukset",
      "flags": [
        {
          "key": "valueDecisionCapacityFactorEnabled",
          "label": "Kapasiteettikerroin arvopäätöksissä",
          "type": "boolean",
          "values": {
            "espoo": false,
            "tampere": true,
            "oulu": false,
            "turku": false
          }
        },
        {
          "key": "citizenReservationThresholdHours",
          "label": "Varausten lukitusraja (tuntia)",
          "type": "number",
          "values": {
            "espoo": 150,
            "tampere": 144,
            "oulu": 165,
            "turku": 156
          }
        }
      ]
    }
  ]
}
```

## Field Specifications

### Root

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `generatedAt` | string (ISO 8601) | yes | When the data was generated |
| `cities` | array | yes | All tracked cities |
| `categories` | array | yes | Feature flag categories with flags |

### City Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Unique city identifier (lowercase, ASCII) |
| `name` | string | yes | Display name in Finnish |
| `cityGroupId` | string | yes | Parent city group: `espoo`, `tampere-region`, `oulu`, `turku` |
| `error` | string \| null | yes | Error message if data could not be fetched/parsed, else `null` |

### Category Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `"frontend"` \| `"backend"` | yes | Category identifier |
| `label` | string | yes | Finnish display label |
| `flags` | array | yes | Feature flags in this category |

### Flag Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `key` | string | yes | Code identifier. Nested flags use dot notation: `daycareApplication.dailyTimes` |
| `label` | string | yes | Human-readable Finnish label |
| `type` | `"boolean"` \| `"number"` \| `"string"` \| `"enum"` | yes | Value type for display treatment |
| `values` | object | yes | Map of `cityId` → value. Missing keys mean city had an error. |

### Flag Values

| Value | Meaning | Display |
|-------|---------|---------|
| `true` | Flag is enabled | Green checkmark / "Kyllä" |
| `false` | Flag is disabled | Red X / "Ei" |
| `null` | Flag not configured (absent in city's code) | Gray dash / "Ei asetettu" |
| number | Numeric configuration value | The number |
| string | Enum or string configuration value | The string |

## Backward Compatibility

This is a new file — no backward compatibility constraints. The schema may evolve by adding new fields (additive changes). Removing fields or changing field types requires a major version bump in the spec.

## Size Estimate

~35 frontend flags × 12 cities + ~15 backend flags × 12 cities ≈ 600 values. Estimated JSON size: 15–25 KB (well within performance budget).
