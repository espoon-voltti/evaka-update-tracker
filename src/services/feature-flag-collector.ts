import { getFileContent } from '../api/github.js';
import { FeatureFlagCityConfig } from '../config/feature-flag-cities.js';
import { getLabel } from '../config/feature-labels.js';
import { parseTypeScriptFeatureFlags } from './parsers/typescript-flags.js';
import { parseKotlinFeatureConfig } from './parsers/kotlin-config.js';
import {
  FeatureFlagData,
  FeatureFlagCity,
  FeatureFlagCategory,
  FeatureFlag,
  FeatureFlagValue,
} from '../types.js';

interface CityParsedFlags {
  cityId: string;
  frontend: Record<string, boolean | null>;
  backend: Record<string, FeatureFlagValue>;
}

export async function collectFeatureFlags(
  cities: FeatureFlagCityConfig[]
): Promise<FeatureFlagData> {
  const cityMeta: FeatureFlagCity[] = [];
  const parsed: CityParsedFlags[] = [];

  for (const city of cities) {
    let frontend: Record<string, boolean | null> = {};
    let backend: Record<string, FeatureFlagValue> = {};
    let error: string | null = null;

    try {
      const [frontendSource, backendSource] = await Promise.all([
        getFileContent(city.repository.owner, city.repository.name, city.frontendPath),
        getFileContent(city.repository.owner, city.repository.name, city.backendPath),
      ]);

      frontend = parseTypeScriptFeatureFlags(frontendSource);
      backend = parseKotlinFeatureConfig(backendSource);
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      console.warn(`Failed to collect feature flags for ${city.name}: ${error}`);
    }

    cityMeta.push({
      id: city.id,
      name: city.name,
      cityGroupId: city.cityGroupId,
      error,
    });

    parsed.push({ cityId: city.id, frontend, backend });
  }

  // Build categories by aggregating flags across all cities
  const frontendCategory = buildCategory(
    'frontend',
    'Käyttöliittymäominaisuudet',
    parsed.map((p) => ({ cityId: p.cityId, flags: p.frontend }))
  );

  const backendCategory = buildCategory(
    'backend',
    'Taustajärjestelmän asetukset',
    parsed.map((p) => ({ cityId: p.cityId, flags: p.backend }))
  );

  return {
    generatedAt: new Date().toISOString(),
    cities: cityMeta,
    categories: [frontendCategory, backendCategory],
  };
}

function buildCategory(
  id: 'frontend' | 'backend',
  label: string,
  cityFlags: Array<{ cityId: string; flags: Record<string, FeatureFlagValue> }>
): FeatureFlagCategory {
  // Collect all unique keys across all cities
  const allKeys = new Set<string>();
  for (const { flags } of cityFlags) {
    for (const key of Object.keys(flags)) {
      allKeys.add(key);
    }
  }

  // Build flag objects
  const flags: FeatureFlag[] = Array.from(allKeys)
    .sort()
    .map((key) => {
      const values: Record<string, FeatureFlagValue> = {};
      let flagType: FeatureFlag['type'] = 'boolean';

      for (const { cityId, flags: cityFlagMap } of cityFlags) {
        const val = cityFlagMap[key];
        if (val !== undefined) {
          values[cityId] = val;
          // Determine type from first non-null value
          if (val !== null && flagType === 'boolean') {
            if (typeof val === 'number') flagType = 'number';
            else if (typeof val === 'string') {
              // Check if it looks like an enum (ALL_CAPS_WITH_UNDERSCORES)
              flagType = /^[A-Z_]+$/.test(val) ? 'enum' : 'string';
            }
          }
        } else {
          values[cityId] = null;
        }
      }

      return {
        key,
        label: getLabel(key),
        type: flagType,
        values,
      };
    });

  return { id, label, flags };
}
