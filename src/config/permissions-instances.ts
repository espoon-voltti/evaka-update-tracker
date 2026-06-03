/**
 * Per-city configuration for the permissions matrix collector.
 *
 * Every instance:
 *   - listattu yhdestä `espoon-voltti/evaka` repon master-branchista
 *   - ottaa pohjaksi Action.kt:n defaultRules (jaettu kaikille)
 *   - applikoi `mappingPaths`-listan tiedostojen yliajot järjestyksessä;
 *     myöhempi voittaa, jos sama action määritellään useamman kerran.
 *
 * Tampereen seudun (trevaka-pohjaiset) kunnat:
 *   - TrevakaActionRuleMapping muodostaa yhteisen perustason
 *   - per-kunta-mapping (esim. TampereActionRuleMapping) lisää omia haaroja
 *     joiden else-haara delegoituu Trevakaan; ne ovat siis järjestyksessä
 *     Trevaka ENSIN, per-kunta SITTEN.
 */

export interface PermissionsRepository {
  owner: string;
  name: string;
  /** Default branch to fetch — usually 'master'. */
  ref: string;
}

export interface PermissionsInstance {
  id: string;
  name: string;
  cityGroupId: string;
  /** Repository owning the mapping files. */
  repository: PermissionsRepository;
  /**
   * Polut ActionRuleMapping-tiedostoihin. Sovellus järjestyksessä:
   * defaultRules → mapping1 → mapping2 → ...
   */
  mappingPaths: string[];
}

const EVAKA_REPO: PermissionsRepository = {
  owner: 'espoon-voltti',
  name: 'evaka',
  ref: 'master',
};

/** Path to the shared Action.kt source — same for every instance. */
export const ACTION_KT_PATH = 'service/src/main/kotlin/evaka/core/shared/security/Action.kt';

const TREVAKA_BASE = 'service/src/main/kotlin/evaka/trevaka/security/TrevakaActionRuleMapping.kt';

export const PERMISSIONS_INSTANCES: PermissionsInstance[] = [
  {
    id: 'espoo',
    name: 'Espoo',
    cityGroupId: 'espoo',
    repository: EVAKA_REPO,
    mappingPaths: [
      'service/src/main/kotlin/evaka/instance/espoo/EspooActionRuleMapping.kt',
    ],
  },
  {
    id: 'tampere',
    name: 'Tampere',
    cityGroupId: 'tampere-region',
    repository: EVAKA_REPO,
    mappingPaths: [
      TREVAKA_BASE,
      'service/src/main/kotlin/evaka/instance/tampere/security/TampereActionRuleMapping.kt',
    ],
  },
  {
    id: 'nokia',
    name: 'Nokia',
    cityGroupId: 'tampere-region',
    repository: EVAKA_REPO,
    mappingPaths: [
      TREVAKA_BASE,
      'service/src/main/kotlin/evaka/instance/nokia/security/NokiaActionRuleMapping.kt',
    ],
  },
  {
    id: 'kangasala',
    name: 'Kangasala',
    cityGroupId: 'tampere-region',
    repository: EVAKA_REPO,
    mappingPaths: [
      TREVAKA_BASE,
      'service/src/main/kotlin/evaka/instance/kangasala/security/KangasalaActionRuleMapping.kt',
    ],
  },
  {
    id: 'lempaala',
    name: 'Lempäälä',
    cityGroupId: 'tampere-region',
    repository: EVAKA_REPO,
    mappingPaths: [
      TREVAKA_BASE,
      'service/src/main/kotlin/evaka/instance/lempaala/security/LempaalaActionRuleMapping.kt',
    ],
  },
  {
    id: 'orivesi',
    name: 'Orivesi',
    cityGroupId: 'tampere-region',
    repository: EVAKA_REPO,
    mappingPaths: [
      TREVAKA_BASE,
      'service/src/main/kotlin/evaka/instance/orivesi/security/OrivesiActionRuleMapping.kt',
    ],
  },
  {
    id: 'pirkkala',
    name: 'Pirkkala',
    cityGroupId: 'tampere-region',
    repository: EVAKA_REPO,
    mappingPaths: [
      TREVAKA_BASE,
      'service/src/main/kotlin/evaka/instance/pirkkala/security/PirkkalaActionRuleMapping.kt',
    ],
  },
  {
    id: 'vesilahti',
    name: 'Vesilahti',
    cityGroupId: 'tampere-region',
    repository: EVAKA_REPO,
    mappingPaths: [
      TREVAKA_BASE,
      'service/src/main/kotlin/evaka/instance/vesilahti/security/VesilahtiActionRuleMapping.kt',
    ],
  },
  {
    id: 'ylojarvi',
    name: 'Ylöjärvi',
    cityGroupId: 'tampere-region',
    repository: EVAKA_REPO,
    mappingPaths: [
      TREVAKA_BASE,
      'service/src/main/kotlin/evaka/instance/ylojarvi/security/YlojarviActionRuleMapping.kt',
    ],
  },
  {
    id: 'hameenkyro',
    name: 'Hämeenkyrö',
    cityGroupId: 'tampere-region',
    repository: EVAKA_REPO,
    mappingPaths: [
      TREVAKA_BASE,
      'service/src/main/kotlin/evaka/instance/hameenkyro/security/HameenkyroActionRuleMapping.kt',
    ],
  },
  {
    id: 'oulu',
    name: 'Oulu',
    cityGroupId: 'oulu',
    repository: EVAKA_REPO,
    mappingPaths: [
      'service/src/main/kotlin/evaka/instance/oulu/security/OuluActionRuleMapping.kt',
    ],
  },
  {
    id: 'turku',
    name: 'Turku',
    cityGroupId: 'turku',
    repository: EVAKA_REPO,
    mappingPaths: [
      'service/src/main/kotlin/evaka/instance/turku/security/TurkuActionRuleMapping.kt',
    ],
  },
];

export const PERMISSIONS_CITY_GROUPS = [
  { id: 'espoo', label: 'Espoo', cities: ['espoo'] },
  {
    id: 'tampere-region',
    label: 'Tampereen seutu',
    cities: [
      'tampere', 'nokia', 'kangasala', 'lempaala', 'orivesi',
      'pirkkala', 'vesilahti', 'ylojarvi', 'hameenkyro',
    ],
  },
  { id: 'oulu', label: 'Oulu', cities: ['oulu'] },
  { id: 'turku', label: 'Turku', cities: ['turku'] },
];

export const PERMISSIONS_ROLES = [
  'ADMIN',
  'SERVICE_WORKER',
  'FINANCE_ADMIN',
  'FINANCE_STAFF',
  'DIRECTOR',
  'REPORT_VIEWER',
  'UNIT_SUPERVISOR',
  'STAFF',
  'SPECIAL_EDUCATION_TEACHER',
  'EARLY_CHILDHOOD_EDUCATION_SECRETARY',
  'MESSAGING',
];

export const PERMISSIONS_ROLE_LABELS: Record<string, string> = {
  STAFF: 'Henkilökunta',
  UNIT_SUPERVISOR: 'Yksikön johtaja',
  SPECIAL_EDUCATION_TEACHER: 'VEO',
  EARLY_CHILDHOOD_EDUCATION_SECRETARY: 'Varhaiskasvatussihteeri',
  ADMIN: 'Pääkäyttäjä',
  SERVICE_WORKER: 'Palveluohjaus',
  FINANCE_ADMIN: 'Talous',
  FINANCE_STAFF: 'Talouden työntekijä (ulkoinen)',
  REPORT_VIEWER: 'Raportointi',
  DIRECTOR: 'Hallinto',
  MESSAGING: 'Viestintä',
};
