export interface FeatureFlagCityConfig {
  id: string;
  name: string;
  cityGroupId: string;
  repository: { owner: string; name: string };
  frontendPath: string;
  backendPath: string;
}

export const FEATURE_FLAG_CITIES: FeatureFlagCityConfig[] = [
  {
    id: 'espoo',
    name: 'Espoo',
    cityGroupId: 'espoo',
    repository: { owner: 'espoon-voltti', name: 'evaka' },
    frontendPath: 'frontend/src/lib-customizations/espoo/featureFlags.tsx',
    backendPath: 'service/src/main/kotlin/fi/espoo/evaka/espoo/EspooConfig.kt',
  },
  {
    id: 'tampere',
    name: 'Tampere',
    cityGroupId: 'tampere-region',
    repository: { owner: 'espoon-voltti', name: 'evaka' },
    frontendPath: 'frontend/src/lib-customizations/tampere/featureFlags.tsx',
    backendPath: 'service/src/main/kotlin/evaka/instance/tampere/TampereConfig.kt',
  },
  {
    id: 'nokia',
    name: 'Nokia',
    cityGroupId: 'tampere-region',
    repository: { owner: 'espoon-voltti', name: 'evaka' },
    frontendPath: 'frontend/src/lib-customizations/nokia/featureFlags.tsx',
    backendPath: 'service/src/main/kotlin/evaka/instance/nokia/NokiaConfig.kt',
  },
  {
    id: 'kangasala',
    name: 'Kangasala',
    cityGroupId: 'tampere-region',
    repository: { owner: 'espoon-voltti', name: 'evaka' },
    frontendPath: 'frontend/src/lib-customizations/kangasala/featureFlags.tsx',
    backendPath: 'service/src/main/kotlin/evaka/instance/kangasala/KangasalaConfig.kt',
  },
  {
    id: 'lempaala',
    name: 'Lempäälä',
    cityGroupId: 'tampere-region',
    repository: { owner: 'espoon-voltti', name: 'evaka' },
    frontendPath: 'frontend/src/lib-customizations/lempaala/featureFlags.tsx',
    backendPath: 'service/src/main/kotlin/evaka/instance/lempaala/LempaalaConfig.kt',
  },
  {
    id: 'orivesi',
    name: 'Orivesi',
    cityGroupId: 'tampere-region',
    repository: { owner: 'espoon-voltti', name: 'evaka' },
    frontendPath: 'frontend/src/lib-customizations/orivesi/featureFlags.tsx',
    backendPath: 'service/src/main/kotlin/evaka/instance/orivesi/OrivesiConfig.kt',
  },
  {
    id: 'pirkkala',
    name: 'Pirkkala',
    cityGroupId: 'tampere-region',
    repository: { owner: 'espoon-voltti', name: 'evaka' },
    frontendPath: 'frontend/src/lib-customizations/pirkkala/featureFlags.tsx',
    backendPath: 'service/src/main/kotlin/evaka/instance/pirkkala/PirkkalaConfig.kt',
  },
  {
    id: 'vesilahti',
    name: 'Vesilahti',
    cityGroupId: 'tampere-region',
    repository: { owner: 'espoon-voltti', name: 'evaka' },
    frontendPath: 'frontend/src/lib-customizations/vesilahti/featureFlags.tsx',
    backendPath: 'service/src/main/kotlin/evaka/instance/vesilahti/VesilahtiConfig.kt',
  },
  {
    id: 'ylojarvi',
    name: 'Ylöjärvi',
    cityGroupId: 'tampere-region',
    repository: { owner: 'espoon-voltti', name: 'evaka' },
    frontendPath: 'frontend/src/lib-customizations/ylojarvi/featureFlags.tsx',
    backendPath: 'service/src/main/kotlin/evaka/instance/ylojarvi/YlojarviConfig.kt',
  },
  {
    id: 'hameenkyro',
    name: 'Hämeenkyrö',
    cityGroupId: 'tampere-region',
    repository: { owner: 'espoon-voltti', name: 'evaka' },
    frontendPath: 'frontend/src/lib-customizations/hameenkyro/featureFlags.tsx',
    backendPath: 'service/src/main/kotlin/evaka/instance/hameenkyro/HameenkyroConfig.kt',
  },
  {
    id: 'oulu',
    name: 'Oulu',
    cityGroupId: 'oulu',
    repository: { owner: 'espoon-voltti', name: 'evaka' },
    frontendPath: 'frontend/src/lib-customizations/oulu/featureFlags.tsx',
    backendPath: 'service/src/main/kotlin/fi/espoo/evaka/oulu/OuluConfig.kt',
  },
  {
    id: 'turku',
    name: 'Turku',
    cityGroupId: 'turku',
    repository: { owner: 'espoon-voltti', name: 'evaka' },
    frontendPath: 'frontend/src/lib-customizations/turku/featureFlags.tsx',
    backendPath: 'service/src/main/kotlin/fi/espoo/evaka/turku/TurkuConfig.kt',
  },
];
