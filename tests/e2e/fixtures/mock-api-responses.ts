/**
 * Realistic mock API responses for E2E testing.
 * Based on actual GitHub API responses from espoon-voltti/evaka (collected 2026-03-03).
 */

// --- Commit SHAs ---
// Production SHAs (current)
export const ESPOO_PROD_SHA = 'aa22da22851dbf376bf83b457ee646da5ddfd702';
export const TAMPERE_WRAPPER_PROD_SHA = 'bb33eb33962ecg487cg94c568ff757eb6eegf813';
export const OULU_WRAPPER_PROD_SHA = 'cc44fc44a73fah598dh05d679gg868fc7ffhg924';
export const TURKU_WRAPPER_PROD_SHA = 'dd55gd55b84gbi609ei16e78ahh979gd8ggih035';

// Staging SHAs (ahead of production)
export const ESPOO_STAGING_SHA = '5ff94c8cd104a2c4bd164c9f64f3c4455ac39370';
export const TAMPERE_WRAPPER_STAGING_SHA = 'ee66he66c95hcj710fj27f89bii080he9hhjia46';
export const OULU_WRAPPER_STAGING_SHA = 'ff77if77d06idk821gk38g90cjj191if0iikjb57';
export const TURKU_WRAPPER_STAGING_SHA = 'gg88jg88e17jel932hl49h01dkk202jg1jjlkc68';

// Previous production SHAs (what previous.json had — different from current, so deployed PRs are detected)
export const ESPOO_PREV_PROD_SHA = '1111111111111111111111111111111111111111';
export const TAMPERE_WRAPPER_PREV_PROD_SHA = '2222222222222222222222222222222222222222';
export const OULU_WRAPPER_PREV_PROD_SHA = '3333333333333333333333333333333333333333';
export const TURKU_WRAPPER_PREV_PROD_SHA = '4444444444444444444444444444444444444444';

// Core SHAs for wrapper cities (resolved via submodule)
export const TAMPERE_CORE_PROD_SHA = 'aa22da22851dbf376bf83b457ee646da5ddfd702'; // same as Espoo prod
export const OULU_CORE_PROD_SHA = 'aa22da22851dbf376bf83b457ee646da5ddfd702';
export const TURKU_CORE_PROD_SHA = 'aa22da22851dbf376bf83b457ee646da5ddfd702';
export const TAMPERE_CORE_STAGING_SHA = '5ff94c8cd104a2c4bd164c9f64f3c4455ac39370';
export const OULU_CORE_STAGING_SHA = '5ff94c8cd104a2c4bd164c9f64f3c4455ac39370';
export const TURKU_CORE_STAGING_SHA = '5ff94c8cd104a2c4bd164c9f64f3c4455ac39370';

// Previous core SHAs
export const PREV_CORE_PROD_SHA = '1111111111111111111111111111111111111111';
export const PREV_CORE_STAGING_SHA = '5555555555555555555555555555555555555555';

// --- Status API Responses ---
// Each city instance returns { apiVersion: "sha" }

export function statusResponse(sha: string) {
  return { apiVersion: sha };
}

// --- GitHub Commit Responses ---

export function commitResponse(sha: string, message: string, date: string, author: string) {
  return {
    sha,
    commit: {
      message,
      author: { date, name: author },
    },
    author: { login: author },
  };
}

export const coreCommitResponses: Record<string, ReturnType<typeof commitResponse>> = {
  [ESPOO_PROD_SHA]: commitResponse(
    ESPOO_PROD_SHA,
    'Merge pull request #8573 from espoon-voltti/fix-db-timestamp\n\nFix timestamp handling in DB',
    '2026-03-02T09:53:35Z',
    'terolaakso-reaktor'
  ),
  [ESPOO_STAGING_SHA]: commitResponse(
    ESPOO_STAGING_SHA,
    'Merge pull request #8629 from espoon-voltti/fix-minimatch-vulnerability\n\nFix minimatch vulnerability',
    '2026-03-02T13:41:42Z',
    'terolaakso-reaktor'
  ),
  [PREV_CORE_PROD_SHA]: commitResponse(
    PREV_CORE_PROD_SHA,
    'Merge pull request #8500 from espoon-voltti/old-feature\n\nOld feature',
    '2026-02-25T10:00:00Z',
    'developer1'
  ),
  [PREV_CORE_STAGING_SHA]: commitResponse(
    PREV_CORE_STAGING_SHA,
    'Merge pull request #8550 from espoon-voltti/staging-feature\n\nStaging feature',
    '2026-02-28T10:00:00Z',
    'developer1'
  ),
};

// --- GitHub Compare Responses (for PR extraction) ---
// Between previous prod SHA and current prod SHA → these are the "deployed" PRs

export const coreDeployedCompareResponse = {
  commits: [
    {
      sha: 'deploy1sha',
      commit: {
        message: 'Merge pull request #8573 from espoon-voltti/fix-db-timestamp',
        author: { date: '2026-03-02T09:53:35Z', name: 'terolaakso-reaktor' },
      },
      author: { login: 'terolaakso-reaktor' },
    },
    {
      sha: 'deploy2sha',
      commit: {
        message: 'Merge pull request #8560 from espoon-voltti/improve-search',
        author: { date: '2026-03-01T14:20:00Z', name: 'Joosakur' },
      },
      author: { login: 'Joosakur' },
    },
    {
      sha: 'deploy3sha',
      commit: {
        message: 'Merge pull request #8555 from espoon-voltti/update-translations',
        author: { date: '2026-03-01T11:00:00Z', name: 'tomuli' },
      },
      author: { login: 'tomuli' },
    },
    {
      sha: 'deploy4sha',
      commit: {
        message: 'Bump webpack from 5.90.0 to 5.91.0 (#8551)',
        author: { date: '2026-02-28T16:00:00Z', name: 'dependabot[bot]' },
      },
      author: { login: 'dependabot[bot]' },
    },
    {
      sha: 'deploy5sha',
      commit: {
        message: 'Merge pull request #8545 from espoon-voltti/fix-unit-tests',
        author: { date: '2026-02-28T10:30:00Z', name: 'terolaakso-reaktor' },
      },
      author: { login: 'terolaakso-reaktor' },
    },
  ],
};

// Between prod SHA and staging SHA → these are "in staging" PRs
export const coreStagingCompareResponse = {
  commits: [
    {
      sha: 'staging1sha',
      commit: {
        message: 'Merge pull request #8629 from espoon-voltti/fix-minimatch-vulnerability',
        author: { date: '2026-03-02T13:41:42Z', name: 'terolaakso-reaktor' },
      },
      author: { login: 'terolaakso-reaktor' },
    },
    {
      sha: 'staging2sha',
      commit: {
        message: 'Merge pull request #8594 from espoon-voltti/fix-db-conventions-part-1',
        author: { date: '2026-03-02T12:29:22Z', name: 'Joosakur' },
      },
      author: { login: 'Joosakur' },
    },
    {
      sha: 'staging3sha',
      commit: {
        message: 'Merge pull request #8602 from espoon-voltti/show-other-actions-history',
        author: { date: '2026-03-02T10:54:11Z', name: 'tomuli' },
      },
      author: { login: 'tomuli' },
    },
  ],
};

// Between staging SHA and master → these are "pending deployment" PRs
export const corePendingCompareResponse = {
  commits: [
    {
      sha: 'pending1sha',
      commit: {
        message: 'Merge pull request #8630 from espoon-voltti/remove-types-webpack',
        author: { date: '2026-03-03T06:47:56Z', name: 'terolaakso-reaktor' },
      },
      author: { login: 'terolaakso-reaktor' },
    },
  ],
};

// Wrapper deployed compare (Tampere example)
export const wrapperDeployedCompareResponse = {
  commits: [
    {
      sha: 'wdeploy1sha',
      commit: {
        message: 'Merge pull request #412 from Tampere/update-config',
        author: { date: '2026-03-01T08:00:00Z', name: 'tampere-dev' },
      },
      author: { login: 'tampere-dev' },
    },
  ],
};

// Wrapper staging compare
export const wrapperStagingCompareResponse = {
  commits: [
    {
      sha: 'wstaging1sha',
      commit: {
        message: 'Merge pull request #415 from Tampere/fix-tampere-layout',
        author: { date: '2026-03-02T15:00:00Z', name: 'tampere-dev' },
      },
      author: { login: 'tampere-dev' },
    },
  ],
};

// Empty compare (no pending wrapper PRs)
export const emptyCompareResponse = { commits: [] };

// --- GitHub PR Detail Responses ---

export const prResponses: Record<number, {
  number: number;
  title: string;
  user: { login: string };
  merged_at: string;
  html_url: string;
}> = {
  // Core deployed PRs
  8573: {
    number: 8573,
    title: 'Aikaleiman käsittelyn korjaus tietokannassa',
    user: { login: 'terolaakso-reaktor' },
    merged_at: '2026-03-02T09:53:35Z',
    html_url: 'https://github.com/espoon-voltti/evaka/pull/8573',
  },
  8560: {
    number: 8560,
    title: 'Hakutoiminnon parannukset',
    user: { login: 'Joosakur' },
    merged_at: '2026-03-01T14:20:00Z',
    html_url: 'https://github.com/espoon-voltti/evaka/pull/8560',
  },
  8555: {
    number: 8555,
    title: 'Käännösten päivitys',
    user: { login: 'tomuli' },
    merged_at: '2026-03-01T11:00:00Z',
    html_url: 'https://github.com/espoon-voltti/evaka/pull/8555',
  },
  8551: {
    number: 8551,
    title: 'Bump webpack from 5.90.0 to 5.91.0',
    user: { login: 'dependabot[bot]' },
    merged_at: '2026-02-28T16:00:00Z',
    html_url: 'https://github.com/espoon-voltti/evaka/pull/8551',
  },
  8545: {
    number: 8545,
    title: 'Yksikkötestien korjaus',
    user: { login: 'terolaakso-reaktor' },
    merged_at: '2026-02-28T10:30:00Z',
    html_url: 'https://github.com/espoon-voltti/evaka/pull/8545',
  },
  // Core staging PRs
  8629: {
    number: 8629,
    title: 'Tekninen: minimatch-kirjaston haavoittuvuuspäivitys',
    user: { login: 'terolaakso-reaktor' },
    merged_at: '2026-03-02T13:41:42Z',
    html_url: 'https://github.com/espoon-voltti/evaka/pull/8629',
  },
  8594: {
    number: 8594,
    title: 'Aikaleimasarakkeiden yhdenmukaistaminen - osa 1',
    user: { login: 'Joosakur' },
    merged_at: '2026-03-02T12:29:22Z',
    html_url: 'https://github.com/espoon-voltti/evaka/pull/8594',
  },
  8602: {
    number: 8602,
    title: 'Johtajalle näkyviin muut toimet -historia',
    user: { login: 'tomuli' },
    merged_at: '2026-03-02T10:54:11Z',
    html_url: 'https://github.com/espoon-voltti/evaka/pull/8602',
  },
  // Core pending PRs
  8630: {
    number: 8630,
    title: 'Tekninen: Poista käyttämätön @types/webpack-riippuvuus',
    user: { login: 'terolaakso-reaktor' },
    merged_at: '2026-03-03T06:47:56Z',
    html_url: 'https://github.com/espoon-voltti/evaka/pull/8630',
  },
  // Wrapper PRs (Tampere)
  412: {
    number: 412,
    title: 'Tampere-konfiguraation päivitys',
    user: { login: 'tampere-dev' },
    merged_at: '2026-03-01T08:00:00Z',
    html_url: 'https://github.com/Tampere/trevaka/pull/412',
  },
  415: {
    number: 415,
    title: 'Tampere-asettelun korjaus',
    user: { login: 'tampere-dev' },
    merged_at: '2026-03-02T15:00:00Z',
    html_url: 'https://github.com/Tampere/trevaka/pull/415',
  },
};

// --- Submodule Responses ---

export function submoduleResponse(coreSha: string) {
  return {
    type: 'submodule',
    sha: coreSha,
    name: 'evaka',
    path: 'evaka',
    submodule_git_url: 'https://github.com/espoon-voltti/evaka.git',
  };
}

// --- Wrapper Commit Responses ---

export const wrapperCommitResponses: Record<string, ReturnType<typeof commitResponse>> = {
  [TAMPERE_WRAPPER_PROD_SHA]: commitResponse(
    TAMPERE_WRAPPER_PROD_SHA,
    'Merge pull request #412 from Tampere/update-config',
    '2026-03-01T08:00:00Z',
    'tampere-dev'
  ),
  [TAMPERE_WRAPPER_STAGING_SHA]: commitResponse(
    TAMPERE_WRAPPER_STAGING_SHA,
    'Merge pull request #415 from Tampere/fix-tampere-layout',
    '2026-03-02T15:00:00Z',
    'tampere-dev'
  ),
  [TAMPERE_WRAPPER_PREV_PROD_SHA]: commitResponse(
    TAMPERE_WRAPPER_PREV_PROD_SHA,
    'Previous wrapper commit',
    '2026-02-25T08:00:00Z',
    'tampere-dev'
  ),
  [OULU_WRAPPER_PROD_SHA]: commitResponse(
    OULU_WRAPPER_PROD_SHA,
    'Merge pull request #200 from Oulunkaupunki/update-oulu',
    '2026-03-01T09:00:00Z',
    'oulu-dev'
  ),
  [OULU_WRAPPER_STAGING_SHA]: commitResponse(
    OULU_WRAPPER_STAGING_SHA,
    'Merge pull request #205 from Oulunkaupunki/fix-oulu',
    '2026-03-02T16:00:00Z',
    'oulu-dev'
  ),
  [OULU_WRAPPER_PREV_PROD_SHA]: commitResponse(
    OULU_WRAPPER_PREV_PROD_SHA,
    'Previous Oulu wrapper commit',
    '2026-02-25T09:00:00Z',
    'oulu-dev'
  ),
  [TURKU_WRAPPER_PROD_SHA]: commitResponse(
    TURKU_WRAPPER_PROD_SHA,
    'Merge pull request #300 from City-of-Turku/update-turku',
    '2026-03-01T10:00:00Z',
    'turku-dev'
  ),
  [TURKU_WRAPPER_STAGING_SHA]: commitResponse(
    TURKU_WRAPPER_STAGING_SHA,
    'Merge pull request #305 from City-of-Turku/fix-turku',
    '2026-03-02T17:00:00Z',
    'turku-dev'
  ),
  [TURKU_WRAPPER_PREV_PROD_SHA]: commitResponse(
    TURKU_WRAPPER_PREV_PROD_SHA,
    'Previous Turku wrapper commit',
    '2026-02-25T10:00:00Z',
    'turku-dev'
  ),
};

// --- Previous.json fixture ---

export const previousJsonFixture = {
  checkedAt: '2026-03-02T07:00:00.000Z',
  versions: {
    'espoo-prod': {
      wrapperSha: null,
      coreSha: PREV_CORE_PROD_SHA,
    },
    'espoo-staging': {
      wrapperSha: null,
      coreSha: PREV_CORE_STAGING_SHA,
    },
    'tampere-prod': {
      wrapperSha: TAMPERE_WRAPPER_PREV_PROD_SHA,
      coreSha: PREV_CORE_PROD_SHA,
    },
    'tampere-staging': {
      wrapperSha: TAMPERE_WRAPPER_STAGING_SHA,
      coreSha: PREV_CORE_STAGING_SHA,
    },
    'oulu-prod': {
      wrapperSha: OULU_WRAPPER_PREV_PROD_SHA,
      coreSha: PREV_CORE_PROD_SHA,
    },
    'oulu-staging': {
      wrapperSha: OULU_WRAPPER_STAGING_SHA,
      coreSha: PREV_CORE_STAGING_SHA,
    },
    'turku-prod': {
      wrapperSha: TURKU_WRAPPER_PREV_PROD_SHA,
      coreSha: PREV_CORE_PROD_SHA,
    },
    'turku-staging': {
      wrapperSha: TURKU_WRAPPER_STAGING_SHA,
      coreSha: PREV_CORE_STAGING_SHA,
    },
  },
};

// --- Staging instances env var ---
// Defines staging environments for all cities

export const STAGING_INSTANCES_ENV = JSON.stringify([
  {
    cityGroupId: 'espoo',
    envId: 'espoo-staging',
    instances: [{ name: 'Espoo Staging', domain: 'staging.espoonvarhaiskasvatus.fi' }],
  },
  {
    cityGroupId: 'tampere-region',
    envId: 'tampere-staging',
    instances: [{ name: 'Tampere Staging', domain: 'test-varhaiskasvatus.tampere.fi' }],
  },
  {
    cityGroupId: 'oulu',
    envId: 'oulu-staging',
    instances: [{ name: 'Oulu Staging', domain: 'staging-varhaiskasvatus.ouka.fi' }],
  },
  {
    cityGroupId: 'turku',
    envId: 'turku-staging',
    instances: [{ name: 'Turku Staging', domain: 'staging-evaka.turku.fi' }],
  },
]);
