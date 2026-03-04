# Research: Feature Flag Tracker

**Feature**: 012-feature-flag-tracker | **Date**: 2026-03-04

## Research Topics

### 1. TypeScript featureFlags.tsx Parsing

**Context**: Each city has a `featureFlags.tsx` file containing feature flag values per environment (default, staging, prod). We need to extract the `prod` environment values.

**Two source patterns observed**:

**Pattern A** (Espoo — inline prod block):
```typescript
const features: Features = {
  default: { ... },
  staging: { ... },
  prod: {
    environmentLabel: null,
    citizenShiftCareAbsence: true,
    daycareApplication: { dailyTimes: true, serviceNeedOption: false },
    ...
  }
}
```

**Pattern B** (Tampere, Nokia, all trevaka cities — standalone prod const):
```typescript
const prod: FeatureFlags = {
  environmentLabel: null,
  citizenShiftCareAbsence: false,
  daycareApplication: { dailyTimes: false, serviceNeedOption: true },
  ...
}

const features: Features = {
  default: { ...prod, environmentLabel: 'Test' },
  staging: { ...prod, environmentLabel: 'Staging' },
  prod
}
```

**Decision**: Regex-based parser that handles both patterns.
- **Step 1**: Try to find `const prod: FeatureFlags = {` (Pattern B). If found, parse the block.
- **Step 2**: If not found, look for `prod: {` within the `features` object (Pattern A). Parse the block.
- **Step 3**: Parse key-value pairs within the prod block, handling:
  - Simple booleans: `key: true` / `key: false`
  - Nested objects: `key: { subkey: true, subkey2: false }` → flatten to `key.subkey`
  - `environmentLabel`: skip (not a feature flag)
  - Null values: `key: null` → skip

**Rationale**: Regex is sufficient because the file format is well-constrained TypeScript with only literal values (no computed expressions, variables, or function calls in prod blocks). Adding a TypeScript AST parser (e.g., `@typescript-eslint/parser` or `ts-morph`) would add significant dependencies for minimal gain.

**Alternatives considered**:
- Full TypeScript AST parsing: Rejected — adds heavy dependencies (`typescript`, `ts-morph`), overkill for simple key-value extraction from a known format.
- Evaluating the TypeScript via `eval()` or `vm`: Rejected — security risk, requires module resolution, brittle.

### 2. Kotlin FeatureConfig Parsing

**Context**: Each city has a Spring `@Configuration` class with a `@Bean fun featureConfig(): FeatureConfig = FeatureConfig(...)` method. We need to extract the named constructor parameters.

**Source pattern** (consistent across all cities):
```kotlin
@Bean
fun featureConfig(): FeatureConfig = FeatureConfig(
    valueDecisionCapacityFactorEnabled = true,
    citizenReservationThresholdHours = 150,
    postOffice = "ESPOO",
    archiveMetadataConfigs = { type, year -> ... },
    daycarePlacementPlanEndMonthDay = MonthDay.of(8, 15),
    placementToolApplicationStatus = ApplicationStatus.WAITING_DECISION,
)
```

**Decision**: Regex-based parser with bracket-depth tracking.
1. Find `FeatureConfig(` after `featureConfig()` function declaration
2. Track bracket depth `(` / `)` to find the matching closing paren
3. Split on top-level commas (depth 0) to get individual `key = value` pairs
4. Parse each value:
   - `true` / `false` → boolean
   - Numeric literal → number
   - `null` → null
   - Quoted string → string (these are operational strings, may be excluded per FR-009)
   - `MonthDay.of(m, d)` → string "MM-DD"
   - `ApplicationStatus.SENT` → string "SENT" (enum name extraction)
   - `QuestionnaireType.FIXED_PERIOD` → string "FIXED_PERIOD"
   - Lambda `{ ... }` (archiveMetadataConfigs) → skip entirely
5. Apply default values from the FeatureConfig data class definition for fields not explicitly set by a city

**FeatureConfig fields and defaults** (from `FeatureConfig.kt`):
| Field | Type | Default |
|-------|------|---------|
| `valueDecisionCapacityFactorEnabled` | Boolean | (required) |
| `citizenReservationThresholdHours` | Long | (required) |
| `freeAbsenceGivesADailyRefund` | Boolean | (required) |
| `alwaysUseDaycareFinanceDecisionHandler` | Boolean | (required) |
| `paymentNumberSeriesStart` | Long? | (required) |
| `unplannedAbsencesAreContractSurplusDays` | Boolean | (required) |
| `maxContractDaySurplusThreshold` | Int? | (required) |
| `useContractDaysAsDailyFeeDivisor` | Boolean | (required) |
| `requestedStartUpperLimit` | Int | (required) |
| `postOffice` | String | (required) — excluded per FR-009 |
| `municipalMessageAccountName` | String | (required) — excluded per FR-009 |
| `serviceWorkerMessageAccountName` | String | (required) — excluded per FR-009 |
| `financeMessageAccountName` | String | (required) — excluded per FR-009 |
| `applyPlacementUnitFromDecision` | Boolean | (required) |
| `preferredStartRelativeApplicationDueDate` | Boolean | (required) |
| `fiveYearsOldDaycareEnabled` | Boolean | (required) |
| `temporaryDaycarePartDayAbsenceGivesADailyRefund` | Boolean | `true` |
| `archiveMetadataOrganization` | String | (required) — excluded per FR-009 |
| `archiveMetadataConfigs` | Function | (required) — excluded (function) |
| `freeJulyStartOnSeptember` | Boolean | `false` |
| `daycarePlacementPlanEndMonthDay` | MonthDay | `MonthDay.of(7, 31)` |
| `placementToolApplicationStatus` | ApplicationStatus | `ApplicationStatus.SENT` |
| `holidayQuestionnaireType` | QuestionnaireType | `QuestionnaireType.FIXED_PERIOD` |
| `minimumInvoiceAmount` | Int | `0` |
| `skipGuardianPreschoolDecisionApproval` | Boolean | `false` |

**Excluded fields** (per FR-009 and spec scope):
- Operational strings: `postOffice`, `municipalMessageAccountName`, `serviceWorkerMessageAccountName`, `financeMessageAccountName`, `archiveMetadataOrganization`
- Function fields: `archiveMetadataConfigs`

**Rationale**: Same as TypeScript — regex is sufficient for the well-constrained constructor call format. Kotlin AST parsing would require a Kotlin compiler or third-party parser, adding massive complexity.

**Alternatives considered**:
- Kotlin PSI/ANTLR parser: Rejected — enormous dependency, overkill.
- Running Kotlin code to serialize FeatureConfig: Rejected — requires Kotlin runtime + Spring context.

### 3. GitHub API File Content Fetching

**Context**: Need to fetch raw file content from GitHub repositories for parsing.

**Decision**: Add `getFileContent(owner, repo, path, ref?)` to `src/api/github.ts`.
- Uses existing GitHub contents endpoint: `GET /repos/{owner}/{repo}/contents/{path}?ref={ref}`
- Response includes base64-encoded `content` field for files < 1MB
- Decode with `Buffer.from(content, 'base64').toString('utf-8')`
- Leverage existing ETag caching and retry logic via `ghGet()` and `withRetry()`
- When `ref` is omitted, GitHub defaults to the repository's default branch

**Rationale**: The contents endpoint is the simplest approach and the files are small (< 50KB). The existing `ghGet()` with ETag caching means repeated fetches of unchanged files cost zero API quota. Using the default branch (not deployed SHA) is acceptable because feature flags only change when code is merged, and the pipeline runs every 5 minutes.

**Alternatives considered**:
- Raw content endpoint (`GET /repos/{owner}/{repo}/raw/{path}`): Rejected — no ETag caching support in existing client.
- Git blob API: Rejected — requires knowing the tree SHA first, more API calls.
- Fetching deployed SHA first: Rejected — adds complexity and coupling to version resolver. Feature flag data is already near-real-time via 5-minute refresh.

### 4. Feature Flag File Paths

**Decision**: Hardcode paths in city configuration alongside existing repository config.

| City | Repository | Frontend Path | Backend Path |
|------|-----------|---------------|-------------|
| Espoo | `espoon-voltti/evaka` | `frontend/src/lib-customizations/espoo/featureFlags.tsx` | `service/src/main/kotlin/fi/espoo/evaka/EspooConfig.kt` |
| Tampere | `Tampere/trevaka` | `frontend/tampere/featureFlags.tsx` | `service/src/main/kotlin/fi/tampere/trevaka/TampereConfig.kt` |
| Nokia | `Tampere/trevaka` | `frontend/nokia/featureFlags.tsx` | `service/src/main/kotlin/fi/nokiankaupunki/evaka/NokiaConfig.kt` |
| Kangasala | `Tampere/trevaka` | `frontend/kangasala/featureFlags.tsx` | `service/src/main/kotlin/fi/kangasala/evaka/KangasalaConfig.kt` |
| Lempäälä | `Tampere/trevaka` | `frontend/lempaala/featureFlags.tsx` | `service/src/main/kotlin/fi/lempaala/evaka/LempaalaConfig.kt` |
| Orivesi | `Tampere/trevaka` | `frontend/orivesi/featureFlags.tsx` | `service/src/main/kotlin/fi/orivesi/evaka/OrivesiConfig.kt` |
| Pirkkala | `Tampere/trevaka` | `frontend/pirkkala/featureFlags.tsx` | `service/src/main/kotlin/fi/pirkkala/evaka/PirkkalaConfig.kt` |
| Vesilahti | `Tampere/trevaka` | `frontend/vesilahti/featureFlags.tsx` | `service/src/main/kotlin/fi/vesilahti/evaka/VesilahtiConfig.kt` |
| Ylöjärvi | `Tampere/trevaka` | `frontend/ylojarvi/featureFlags.tsx` | `service/src/main/kotlin/fi/ylojarvi/evaka/YlojarviConfig.kt` |
| Hämeenkyrö | `Tampere/trevaka` | `frontend/hameenkyro/featureFlags.tsx` | `service/src/main/kotlin/fi/hameenkyro/evaka/HameenkyroConfig.kt` |
| Oulu | `Oulunkaupunki/evakaoulu` | `frontend/oulu/featureFlags.tsx` | `service/src/main/kotlin/fi/ouka/evakaoulu/EVakaOuluConfig.kt` |
| Turku | `City-of-Turku/evakaturku` | `frontend/turku/featureFlags.tsx` | `service/src/main/kotlin/fi/turku/evakaturku/EVakaTurkuConfig.kt` |

**Type definition files** (fetched once from core repo for flag discovery):
- Frontend: `espoon-voltti/evaka` → `frontend/src/lib-customizations/types.d.ts`
- Backend: `espoon-voltti/evaka` → `service/src/main/kotlin/fi/espoo/evaka/shared/FeatureConfig.kt`

### 5. Finnish Label Mapping

**Decision**: Static mapping file `src/config/feature-labels.ts` with manually curated Finnish labels.

Label source: JSDoc comments in `types.d.ts` (frontend) and `FeatureConfig.kt` (backend), translated to Finnish and made human-readable.

The mapping covers all currently known flags. New flags added to eVaka will appear with their code identifier as fallback label, making the system self-updating (FR spec: "pick up automatically on next data refresh").

**Label structure**:
```typescript
export const FEATURE_LABELS: Record<string, string> = {
  // Frontend flags
  'citizenShiftCareAbsence': 'Vuorohoidon poissaolot kansalaisille',
  'assistanceActionOther': 'Tukitoimi: muu',
  ...
  // Backend flags
  'valueDecisionCapacityFactorEnabled': 'Kapasiteettikerroin arvopäätöksissä',
  ...
};
```

### 6. Tampereen seutu Aggregation

**Decision**: The data file stores individual municipality values. The frontend handles grouping and aggregation for display.

**Aggregation logic**:
- For each flag, check if all Tampere-region municipalities have the same value
- If identical: show the shared value in the "Tampereen seutu" column
- If divergent: show the majority/shared value with a visual divergence indicator (e.g., asterisk or icon)
- On expand: show individual municipality values for flags that differ

This keeps the data pipeline simple (just collects per-municipality data) and moves presentation logic to the frontend where it belongs.
