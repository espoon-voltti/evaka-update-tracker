import { CityGroup } from '../types.js';
import { parseStagingInstances, mergeStagingEnvironments } from './staging.js';

const CORE_REPO = {
  owner: 'espoon-voltti',
  name: 'evaka',
  type: 'core' as const,
  submodulePath: null,
  defaultBranch: 'master',
};

const PRODUCTION_CITY_GROUPS: CityGroup[] = [
  {
    id: 'espoo',
    name: 'Espoo',
    repositories: [CORE_REPO],
    environments: [
      {
        id: 'espoo-prod',
        type: 'production',
        instances: [{ name: 'Espoo', domain: 'espoonvarhaiskasvatus.fi', auth: null }],
      },
    ],
  },
  {
    id: 'tampere-region',
    name: 'Tampere region',
    repositories: [
      {
        owner: 'Tampere',
        name: 'trevaka',
        type: 'wrapper',
        submodulePath: 'evaka',
        defaultBranch: 'main',
      },
      CORE_REPO,
    ],
    environments: [
      {
        id: 'tampere-prod',
        type: 'production',
        instances: [
          { name: 'Tampere', domain: 'varhaiskasvatus.tampere.fi', auth: null },
          { name: 'Hämeenkyrö', domain: 'evaka.hameenkyro.fi', auth: null },
          { name: 'Kangasala', domain: 'evaka.kangasala.fi', auth: null },
          { name: 'Lempäälä', domain: 'evaka.lempaala.fi', auth: null },
          { name: 'Nokia', domain: 'evaka.nokiankaupunki.fi', auth: null },
          { name: 'Orivesi', domain: 'evaka.orivesi.fi', auth: null },
          { name: 'Pirkkala', domain: 'evaka.pirkkala.fi', auth: null },
          { name: 'Vesilahti', domain: 'evaka.vesilahti.fi', auth: null },
          { name: 'Ylöjärvi', domain: 'evaka.ylojarvi.fi', auth: null },
        ],
      },
    ],
  },
  {
    id: 'oulu',
    name: 'Oulu',
    repositories: [
      {
        owner: 'Oulunkaupunki',
        name: 'evakaoulu',
        type: 'wrapper',
        submodulePath: 'evaka',
        defaultBranch: 'main',
      },
      CORE_REPO,
    ],
    environments: [
      {
        id: 'oulu-prod',
        type: 'production',
        instances: [{ name: 'Oulu', domain: 'varhaiskasvatus.ouka.fi', auth: null }],
      },
    ],
  },
  {
    id: 'turku',
    name: 'Turku',
    repositories: [
      {
        owner: 'City-of-Turku',
        name: 'evakaturku',
        type: 'wrapper',
        submodulePath: 'evaka',
        defaultBranch: 'main',
      },
      CORE_REPO,
    ],
    environments: [
      {
        id: 'turku-prod',
        type: 'production',
        instances: [{ name: 'Turku', domain: 'evaka.turku.fi', auth: null }],
      },
    ],
  },
];

/**
 * Get city groups with production environments (hardcoded) and staging
 * environments (from STAGING_INSTANCES env var, if set).
 */
export function getCityGroups(): CityGroup[] {
  const stagingEnvs = parseStagingInstances(process.env.STAGING_INSTANCES);
  return mergeStagingEnvironments(PRODUCTION_CITY_GROUPS, stagingEnvs);
}
