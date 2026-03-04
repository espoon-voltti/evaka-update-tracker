# Data Model: Feature Flag Tracker

**Feature**: 012-feature-flag-tracker | **Date**: 2026-03-04

## Entities

### FeatureFlagValue

A single feature flag's value for a specific city.

| Field | Type | Description |
|-------|------|-------------|
| `value` | `boolean \| number \| string \| null` | The flag's effective value. `null` means not configured/absent. |

### FeatureFlag

A feature flag definition with its value across all cities.

| Field | Type | Description |
|-------|------|-------------|
| `key` | `string` | Code identifier (e.g., `citizenShiftCareAbsence`, `daycareApplication.dailyTimes`) |
| `label` | `string` | Human-readable Finnish label (from `feature-labels.ts`) |
| `type` | `'boolean' \| 'number' \| 'string' \| 'enum'` | Value type for display treatment |
| `values` | `Record<string, FeatureFlagValue>` | Map of cityId → value. Keys match `FeatureFlagCity.id`. |

### FeatureFlagCategory

A group of related feature flags.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `'frontend' \| 'backend'` | Category identifier |
| `label` | `string` | Display label (Finnish): "Käyttöliittymäominaisuudet" / "Taustajärjestelmän asetukset" |
| `flags` | `FeatureFlag[]` | Ordered list of flags in this category |

### FeatureFlagCity

A city/municipality represented in the comparison matrix.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique identifier (e.g., `espoo`, `tampere`, `nokia`) |
| `name` | `string` | Display name (e.g., "Espoo", "Tampere", "Nokia") |
| `cityGroupId` | `string` | Parent city group (e.g., `espoo`, `tampere-region`, `oulu`, `turku`) |
| `error` | `string \| null` | Error message if parsing/fetching failed for this city |

### FeatureFlagData

The top-level data structure persisted in `data/feature-flags.json`.

| Field | Type | Description |
|-------|------|-------------|
| `generatedAt` | `string` (ISO 8601) | Timestamp of data generation |
| `cities` | `FeatureFlagCity[]` | All tracked cities with metadata |
| `categories` | `FeatureFlagCategory[]` | Feature flag categories with all flags and values |

## Relationships

```
FeatureFlagData
├── cities: FeatureFlagCity[]          (12 cities)
└── categories: FeatureFlagCategory[]  (2 categories: frontend, backend)
    └── flags: FeatureFlag[]           (~35 frontend, ~15 backend)
        └── values: Record<cityId, FeatureFlagValue>
```

## Validation Rules

- `FeatureFlag.key` must be unique within a category
- `FeatureFlag.values` keys must match `FeatureFlagCity.id` values
- Boolean flags in `values` must be `true`, `false`, or `null` (not configured)
- A city with `error` set may have empty/partial values — frontend must handle gracefully

## State Transitions

This is a snapshot model — no state transitions. The entire `FeatureFlagData` is regenerated on each pipeline run (every 5 minutes). The previous snapshot is fully replaced.

## TypeScript Type Definitions

```typescript
// Added to src/types.ts

export type FeatureFlagValue = boolean | number | string | null;

export interface FeatureFlag {
  key: string;
  label: string;
  type: 'boolean' | 'number' | 'string' | 'enum';
  values: Record<string, FeatureFlagValue>;
}

export interface FeatureFlagCategory {
  id: 'frontend' | 'backend';
  label: string;
  flags: FeatureFlag[];
}

export interface FeatureFlagCity {
  id: string;
  name: string;
  cityGroupId: string;
  error: string | null;
}

export interface FeatureFlagData {
  generatedAt: string;
  cities: FeatureFlagCity[];
  categories: FeatureFlagCategory[];
}
```
