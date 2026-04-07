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
    repository: { owner: 'Tampere', name: 'trevaka' },
    frontendPath: 'frontend/tampere/featureFlags.tsx',
    backendPath: 'service/src/main/kotlin/fi/tampere/trevaka/TampereConfig.kt',
  },
  {
    id: 'nokia',
    name: 'Nokia',
    cityGroupId: 'tampere-region',
    repository: { owner: 'Tampere', name: 'trevaka' },
    frontendPath: 'frontend/nokia/featureFlags.tsx',
    backendPath: 'service/src/main/kotlin/fi/nokiankaupunki/evaka/NokiaConfig.kt',
  },
  {
    id: 'kangasala',
    name: 'Kangasala',
    cityGroupId: 'tampere-region',
    repository: { owner: 'Tampere', name: 'trevaka' },
    frontendPath: 'frontend/kangasala/featureFlags.tsx',
    backendPath: 'service/src/main/kotlin/fi/kangasala/evaka/KangasalaConfig.kt',
  },
  {
    id: 'lempaala',
    name: 'Lempäälä',
    cityGroupId: 'tampere-region',
    repository: { owner: 'Tampere', name: 'trevaka' },
    frontendPath: 'frontend/lempaala/featureFlags.tsx',
    backendPath: 'service/src/main/kotlin/fi/lempaala/evaka/LempaalaConfig.kt',
  },
  {
    id: 'orivesi',
    name: 'Orivesi',
    cityGroupId: 'tampere-region',
    repository: { owner: 'Tampere', name: 'trevaka' },
    frontendPath: 'frontend/orivesi/featureFlags.tsx',
    backendPath: 'service/src/main/kotlin/fi/orivesi/evaka/OrivesiConfig.kt',
  },
  {
    id: 'pirkkala',
    name: 'Pirkkala',
    cityGroupId: 'tampere-region',
    repository: { owner: 'Tampere', name: 'trevaka' },
    frontendPath: 'frontend/pirkkala/featureFlags.tsx',
    backendPath: 'service/src/main/kotlin/fi/pirkkala/evaka/PirkkalaConfig.kt',
  },
  {
    id: 'vesilahti',
    name: 'Vesilahti',
    cityGroupId: 'tampere-region',
    repository: { owner: 'Tampere', name: 'trevaka' },
    frontendPath: 'frontend/vesilahti/featureFlags.tsx',
    backendPath: 'service/src/main/kotlin/fi/vesilahti/evaka/VesilahtiConfig.kt',
  },
  {
    id: 'ylojarvi',
    name: 'Ylöjärvi',
    cityGroupId: 'tampere-region',
    repository: { owner: 'Tampere', name: 'trevaka' },
    frontendPath: 'frontend/ylojarvi/featureFlags.tsx',
    backendPath: 'service/src/main/kotlin/fi/ylojarvi/evaka/YlojarviConfig.kt',
  },
  {
    id: 'hameenkyro',
    name: 'Hämeenkyrö',
    cityGroupId: 'tampere-region',
    repository: { owner: 'Tampere', name: 'trevaka' },
    frontendPath: 'frontend/hameenkyro/featureFlags.tsx',
    backendPath: 'service/src/main/kotlin/fi/hameenkyro/evaka/HameenkyroConfig.kt',
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
