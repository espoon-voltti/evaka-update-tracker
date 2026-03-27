/**
 * E2E test data generator.
 * Sets up nock mocks for all external HTTP calls, then runs the backend
 * to produce realistic current.json and history.json with populated deployed arrays.
 */

import * as fs from 'fs';
import * as path from 'path';
import nock from 'nock';
import {
  ESPOO_PROD_SHA,
  ESPOO_STAGING_SHA,
  TAMPERE_WRAPPER_PROD_SHA,
  TAMPERE_WRAPPER_STAGING_SHA,
  TAMPERE_CORE_PROD_SHA,
  TAMPERE_CORE_STAGING_SHA,
  OULU_WRAPPER_PROD_SHA,
  OULU_WRAPPER_STAGING_SHA,
  OULU_CORE_PROD_SHA,
  OULU_CORE_STAGING_SHA,
  TURKU_WRAPPER_PROD_SHA,
  TURKU_WRAPPER_STAGING_SHA,
  TURKU_CORE_PROD_SHA,
  TURKU_CORE_STAGING_SHA,
  PREV_CORE_PROD_SHA,
  PREV_CORE_STAGING_SHA,
  TAMPERE_WRAPPER_PREV_PROD_SHA,
  OULU_WRAPPER_PREV_PROD_SHA,
  TURKU_WRAPPER_PREV_PROD_SHA,
  statusResponse,
  coreCommitResponses,
  wrapperCommitResponses,
  coreDeployedCompareResponse,
  coreStagingCompareResponse,
  corePendingCompareResponse,
  wrapperDeployedCompareResponse,
  wrapperStagingCompareResponse,
  emptyCompareResponse,
  prResponses,
  submoduleResponse,
  previousJsonFixture,
  STAGING_INSTANCES_ENV,
} from '../fixtures/mock-api-responses.js';

const TEST_DATA_DIR = path.resolve('tests/e2e/test-data');

function setupStatusMocks() {
  // Espoo production
  nock('https://espoonvarhaiskasvatus.fi')
    .get('/api/citizen/auth/status')
    .reply(200, statusResponse(ESPOO_PROD_SHA));

  // Espoo staging
  nock('https://staging.espoonvarhaiskasvatus.fi')
    .get('/api/citizen/auth/status')
    .reply(200, statusResponse(ESPOO_STAGING_SHA));

  // Tampereen seutu production (9 instances, all return same SHA)
  const tampereInstances = [
    'varhaiskasvatus.tampere.fi',
    'evaka.hameenkyro.fi',
    'evaka.kangasala.fi',
    'evaka.lempaala.fi',
    'evaka.nokiankaupunki.fi',
    'evaka.orivesi.fi',
    'evaka.pirkkala.fi',
    'evaka.vesilahti.fi',
    'evaka.ylojarvi.fi',
  ];
  for (const domain of tampereInstances) {
    nock(`https://${domain}`)
      .get('/api/citizen/auth/status')
      .reply(200, statusResponse(TAMPERE_WRAPPER_PROD_SHA));
  }

  // Tampere staging
  nock('https://test-varhaiskasvatus.tampere.fi')
    .get('/api/citizen/auth/status')
    .reply(200, statusResponse(TAMPERE_WRAPPER_STAGING_SHA));

  // Oulu production
  nock('https://varhaiskasvatus.ouka.fi')
    .get('/api/citizen/auth/status')
    .reply(200, statusResponse(OULU_WRAPPER_PROD_SHA));

  // Oulu staging
  nock('https://staging-varhaiskasvatus.ouka.fi')
    .get('/api/citizen/auth/status')
    .reply(200, statusResponse(OULU_WRAPPER_STAGING_SHA));

  // Turku production
  nock('https://evaka.turku.fi')
    .get('/api/citizen/auth/status')
    .reply(200, statusResponse(TURKU_WRAPPER_PROD_SHA));

  // Turku staging
  nock('https://staging-evaka.turku.fi')
    .get('/api/citizen/auth/status')
    .reply(200, statusResponse(TURKU_WRAPPER_STAGING_SHA));
}

function setupGitHubMocks() {
  const gh = nock('https://api.github.com').persist();

  // --- Commit detail responses ---

  // Core commits
  for (const [sha, response] of Object.entries(coreCommitResponses)) {
    gh.get(`/repos/espoon-voltti/evaka/commits/${sha}`).reply(200, response);
  }

  // Wrapper commits (all wrapper repos)
  for (const [sha, response] of Object.entries(wrapperCommitResponses)) {
    // Tampere
    gh.get(`/repos/Tampere/trevaka/commits/${sha}`).reply(200, response);
    // Oulu
    gh.get(`/repos/Oulunkaupunki/evakaoulu/commits/${sha}`).reply(200, response);
    // Turku
    gh.get(`/repos/City-of-Turku/evakaturku/commits/${sha}`).reply(200, response);
  }

  // --- Submodule references (wrapper → core SHA) ---

  // Tampere submodule at production SHA
  gh.get(`/repos/Tampere/trevaka/contents/evaka?ref=${TAMPERE_WRAPPER_PROD_SHA}`)
    .reply(200, submoduleResponse(TAMPERE_CORE_PROD_SHA));
  gh.get(`/repos/Tampere/trevaka/contents/evaka?ref=${TAMPERE_WRAPPER_STAGING_SHA}`)
    .reply(200, submoduleResponse(TAMPERE_CORE_STAGING_SHA));

  // Oulu submodule
  gh.get(`/repos/Oulunkaupunki/evakaoulu/contents/evaka?ref=${OULU_WRAPPER_PROD_SHA}`)
    .reply(200, submoduleResponse(OULU_CORE_PROD_SHA));
  gh.get(`/repos/Oulunkaupunki/evakaoulu/contents/evaka?ref=${OULU_WRAPPER_STAGING_SHA}`)
    .reply(200, submoduleResponse(OULU_CORE_STAGING_SHA));

  // Turku submodule
  gh.get(`/repos/City-of-Turku/evakaturku/contents/evaka?ref=${TURKU_WRAPPER_PROD_SHA}`)
    .reply(200, submoduleResponse(TURKU_CORE_PROD_SHA));
  gh.get(`/repos/City-of-Turku/evakaturku/contents/evaka?ref=${TURKU_WRAPPER_STAGING_SHA}`)
    .reply(200, submoduleResponse(TURKU_CORE_STAGING_SHA));

  // --- Compare responses (for PR extraction) ---

  // Core: deployed PRs (prev prod → current prod)
  gh.get(`/repos/espoon-voltti/evaka/compare/${PREV_CORE_PROD_SHA}...${ESPOO_PROD_SHA}`)
    .reply(200, coreDeployedCompareResponse);

  // Core: staging PRs (prod → staging)
  gh.get(`/repos/espoon-voltti/evaka/compare/${ESPOO_PROD_SHA}...${ESPOO_STAGING_SHA}`)
    .reply(200, coreStagingCompareResponse);

  // Core: staging change detection (prev staging → current staging)
  gh.get(`/repos/espoon-voltti/evaka/compare/${PREV_CORE_STAGING_SHA}...${ESPOO_STAGING_SHA}`)
    .reply(200, coreStagingCompareResponse);

  // Core: pending PRs (staging → master)
  gh.get(`/repos/espoon-voltti/evaka/compare/${ESPOO_STAGING_SHA}...master`)
    .reply(200, corePendingCompareResponse);

  // Tampere wrapper: deployed
  gh.get(`/repos/Tampere/trevaka/compare/${TAMPERE_WRAPPER_PREV_PROD_SHA}...${TAMPERE_WRAPPER_PROD_SHA}`)
    .reply(200, wrapperDeployedCompareResponse);

  // Tampere wrapper: staging
  gh.get(`/repos/Tampere/trevaka/compare/${TAMPERE_WRAPPER_PROD_SHA}...${TAMPERE_WRAPPER_STAGING_SHA}`)
    .reply(200, wrapperStagingCompareResponse);

  // Tampere wrapper: pending (staging → main)
  gh.get(`/repos/Tampere/trevaka/compare/${TAMPERE_WRAPPER_STAGING_SHA}...main`)
    .reply(200, emptyCompareResponse);

  // Oulu wrapper: deployed
  gh.get(`/repos/Oulunkaupunki/evakaoulu/compare/${OULU_WRAPPER_PREV_PROD_SHA}...${OULU_WRAPPER_PROD_SHA}`)
    .reply(200, emptyCompareResponse);

  // Oulu wrapper: staging
  gh.get(`/repos/Oulunkaupunki/evakaoulu/compare/${OULU_WRAPPER_PROD_SHA}...${OULU_WRAPPER_STAGING_SHA}`)
    .reply(200, emptyCompareResponse);

  // Oulu wrapper: pending
  gh.get(`/repos/Oulunkaupunki/evakaoulu/compare/${OULU_WRAPPER_STAGING_SHA}...main`)
    .reply(200, emptyCompareResponse);

  // Turku wrapper: deployed
  gh.get(`/repos/City-of-Turku/evakaturku/compare/${TURKU_WRAPPER_PREV_PROD_SHA}...${TURKU_WRAPPER_PROD_SHA}`)
    .reply(200, emptyCompareResponse);

  // Turku wrapper: staging
  gh.get(`/repos/City-of-Turku/evakaturku/compare/${TURKU_WRAPPER_PROD_SHA}...${TURKU_WRAPPER_STAGING_SHA}`)
    .reply(200, emptyCompareResponse);

  // Turku wrapper: pending
  gh.get(`/repos/City-of-Turku/evakaturku/compare/${TURKU_WRAPPER_STAGING_SHA}...main`)
    .reply(200, emptyCompareResponse);

  // --- Branch detection responses (for staging environments) ---
  // Espoo staging: commit is on default branch (0 ahead commits)
  gh.get(`/repos/espoon-voltti/evaka/compare/master...${ESPOO_STAGING_SHA}`)
    .reply(200, emptyCompareResponse);

  // Tampere staging: wrapper and core on default branch
  gh.get(`/repos/Tampere/trevaka/compare/main...${TAMPERE_WRAPPER_STAGING_SHA}`)
    .reply(200, emptyCompareResponse);
  gh.get(`/repos/espoon-voltti/evaka/compare/master...${TAMPERE_CORE_STAGING_SHA}`)
    .reply(200, emptyCompareResponse);

  // Oulu staging: wrapper and core on default branch
  gh.get(`/repos/Oulunkaupunki/evakaoulu/compare/main...${OULU_WRAPPER_STAGING_SHA}`)
    .reply(200, emptyCompareResponse);
  gh.get(`/repos/espoon-voltti/evaka/compare/master...${OULU_CORE_STAGING_SHA}`)
    .reply(200, emptyCompareResponse);

  // Turku staging: wrapper and core on default branch
  gh.get(`/repos/City-of-Turku/evakaturku/compare/main...${TURKU_WRAPPER_STAGING_SHA}`)
    .reply(200, emptyCompareResponse);
  gh.get(`/repos/espoon-voltti/evaka/compare/master...${TURKU_CORE_STAGING_SHA}`)
    .reply(200, emptyCompareResponse);

  // --- User profile responses (for name resolution) ---
  gh.get('/users/terolaakso-reaktor').reply(200, { login: 'terolaakso-reaktor', name: 'Tero Laakso' });
  gh.get('/users/Joosakur').reply(200, { login: 'Joosakur', name: 'Joosa Kurvinen' });
  gh.get('/users/tomuli').reply(200, { login: 'tomuli', name: 'Tomi Mulari' });
  gh.get('/users/tampere-dev').reply(200, { login: 'tampere-dev', name: 'Tampere Developer' });
  gh.get('/users/oulu-dev').reply(200, { login: 'oulu-dev', name: 'Oulu Developer' });
  gh.get('/users/turku-dev').reply(200, { login: 'turku-dev', name: 'Turku Developer' });
  gh.get('/users/developer1').reply(200, { login: 'developer1', name: 'Developer One' });

  // --- Feature flag file content (return 404 to trigger graceful error handling) ---
  // The actual feature-flags.json is generated as a static fixture above.
  // These mocks prevent the feature flag collector from crashing the pipeline.
  gh.get(/\/repos\/.*\/contents\/frontend\/.*featureFlags\.tsx/).reply(404, { message: 'Not Found' });
  gh.get(/\/repos\/.*\/contents\/service\/.*Config\.kt/).reply(404, { message: 'Not Found' });

  // --- PR detail responses ---

  for (const [number, response] of Object.entries(prResponses)) {
    const num = parseInt(number, 10);
    // Core PRs
    gh.get(`/repos/espoon-voltti/evaka/pulls/${num}`).reply(200, response);
    // Wrapper PRs (respond on all wrapper repos)
    gh.get(`/repos/Tampere/trevaka/pulls/${num}`).reply(200, response);
    gh.get(`/repos/Oulunkaupunki/evakaoulu/pulls/${num}`).reply(200, response);
    gh.get(`/repos/City-of-Turku/evakaturku/pulls/${num}`).reply(200, response);
  }
}

function setupSlackMock() {
  // Mock Slack webhook to prevent real notifications
  nock('https://hooks.slack.com').post(/.*/).reply(200, 'ok').persist();
  nock('http://localhost').post('/slack-mock').reply(200, 'ok').persist();
}

function featureFlagsFixture() {
  const cities = [
    { id: 'espoo', name: 'Espoo', cityGroupId: 'espoo', error: null },
    { id: 'tampere', name: 'Tampere', cityGroupId: 'tampere-region', error: null },
    { id: 'nokia', name: 'Nokia', cityGroupId: 'tampere-region', error: null },
    { id: 'kangasala', name: 'Kangasala', cityGroupId: 'tampere-region', error: null },
    { id: 'lempaala', name: 'Lempäälä', cityGroupId: 'tampere-region', error: null },
    { id: 'orivesi', name: 'Orivesi', cityGroupId: 'tampere-region', error: null },
    { id: 'pirkkala', name: 'Pirkkala', cityGroupId: 'tampere-region', error: null },
    { id: 'vesilahti', name: 'Vesilahti', cityGroupId: 'tampere-region', error: null },
    { id: 'ylojarvi', name: 'Ylöjärvi', cityGroupId: 'tampere-region', error: null },
    { id: 'hameenkyro', name: 'Hämeenkyrö', cityGroupId: 'tampere-region', error: null },
    { id: 'oulu', name: 'Oulu', cityGroupId: 'oulu', error: null },
    { id: 'turku', name: 'Turku', cityGroupId: 'turku', error: null },
  ];

  const allIds = cities.map((c) => c.id);
  const makeValues = (defaultVal: boolean, overrides: Record<string, boolean | null> = {}) => {
    const values: Record<string, boolean | null> = {};
    for (const id of allIds) values[id] = defaultVal;
    Object.assign(values, overrides);
    return values;
  };

  return {
    generatedAt: new Date().toISOString(),
    cities,
    categories: [
      {
        id: 'frontend',
        label: 'Käyttöliittymäominaisuudet',
        flags: [
          { key: 'citizenShiftCareAbsence', label: 'Vuorohoidon poissaolot kansalaisille', type: 'boolean', values: makeValues(false, { espoo: true }) },
          { key: 'assistanceActionOther', label: 'Tukitoimi: muu', type: 'boolean', values: makeValues(false, { espoo: true }) },
          { key: 'daycareApplication.dailyTimes', label: 'Päivähoitohakemus: päivittäiset ajat', type: 'boolean', values: makeValues(false, { espoo: true, oulu: true }) },
          { key: 'decisionDraftMultipleUnits', label: 'Sijoitushahmotelma: erilliset yksiköt', type: 'boolean', values: makeValues(true, { espoo: false }) },
          { key: 'preschool', label: 'Esiopetuksen tuki', type: 'boolean', values: makeValues(true) },
          { key: 'preparatory', label: 'Valmistava opetus', type: 'boolean', values: makeValues(false, { espoo: true }) },
          { key: 'placementGuarantee', label: 'Paikkavakuus', type: 'boolean', values: makeValues(true) },
          { key: 'voucherUnitPayments', label: 'Palvelusetelimaksatus', type: 'boolean', values: makeValues(true, { espoo: false }) },
          { key: 'discussionReservations', label: 'Keskusteluvaraukset', type: 'boolean', values: makeValues(true) },
        ],
      },
      {
        id: 'backend',
        label: 'Taustajärjestelmän asetukset',
        flags: [
          { key: 'valueDecisionCapacityFactorEnabled', label: 'Kapasiteettikerroin arvopäätöksissä', type: 'boolean', values: makeValues(true, { espoo: false, oulu: false, turku: false }) },
          { key: 'citizenReservationThresholdHours', label: 'Varausten lukitusraja (tuntia)', type: 'number',
            values: { espoo: 150, tampere: 144, nokia: 159, kangasala: 144, lempaala: 144, orivesi: 144, pirkkala: 144, vesilahti: 144, ylojarvi: 144, hameenkyro: 144, oulu: 165, turku: 156 } },
          { key: 'freeAbsenceGivesADailyRefund', label: 'Vapaan poissaolon päiväkorvaus', type: 'boolean', values: makeValues(false, { espoo: true, nokia: true }) },
          { key: 'daycarePlacementPlanEndMonthDay', label: 'Sijoitussuunnitelman päättymispäivä', type: 'string',
            values: { espoo: '07-31', tampere: '08-15', nokia: '08-15', kangasala: '08-15', lempaala: '08-15', orivesi: '08-15', pirkkala: '08-15', vesilahti: '08-15', ylojarvi: '08-15', hameenkyro: '08-15', oulu: '07-31', turku: '07-31' } },
          { key: 'holidayQuestionnaireType', label: 'Lomakyselyn tyyppi', type: 'enum',
            values: { espoo: 'FIXED_PERIOD', tampere: 'FIXED_PERIOD', nokia: 'FIXED_PERIOD', kangasala: 'FIXED_PERIOD', lempaala: 'FIXED_PERIOD', orivesi: 'FIXED_PERIOD', pirkkala: 'FIXED_PERIOD', vesilahti: 'FIXED_PERIOD', ylojarvi: 'FIXED_PERIOD', hameenkyro: 'FIXED_PERIOD', oulu: 'OPEN_RANGES', turku: 'FIXED_PERIOD' } },
        ],
      },
    ],
  };
}

export async function generateTestData(): Promise<string> {
  // Clean and create test data directory
  if (fs.existsSync(TEST_DATA_DIR)) {
    fs.rmSync(TEST_DATA_DIR, { recursive: true });
  }
  fs.mkdirSync(TEST_DATA_DIR, { recursive: true });

  // Write previous.json so the backend detects production deployments
  fs.writeFileSync(
    path.join(TEST_DATA_DIR, 'previous.json'),
    JSON.stringify(previousJsonFixture, null, 2)
  );

  // Write empty history.json
  fs.writeFileSync(
    path.join(TEST_DATA_DIR, 'history.json'),
    JSON.stringify({ events: [] })
  );

  // Write empty user-names.json (name cache)
  fs.writeFileSync(
    path.join(TEST_DATA_DIR, 'user-names.json'),
    '{}'
  );

  // Set environment variables
  process.env.NODE_ENV = 'test';
  process.env.GH_TOKEN = 'test-token-for-e2e';
  process.env.DRY_RUN = 'false';
  process.env.SLACK_WEBHOOK_URL = 'http://localhost/slack-mock';
  process.env.DATA_DIR = TEST_DATA_DIR;
  process.env.DIST_DIR = path.join(TEST_DATA_DIR, '..', 'test-dist');
  process.env.STAGING_INSTANCES = STAGING_INSTANCES_ENV;

  // When running in a proxied environment (e.g. Claude Code web sessions),
  // proxy env vars break nock HTTP interception. Set CLEAR_PROXY_FOR_TESTS=1
  // to clear them before running the test data generator.
  const clearProxy = process.env.CLEAR_PROXY_FOR_TESTS === '1';
  const proxyVars = ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy', 'ALL_PROXY', 'all_proxy', 'GLOBAL_AGENT_HTTP_PROXY', 'GLOBAL_AGENT_HTTPS_PROXY', 'NO_PROXY', 'no_proxy'];
  const savedProxy: Record<string, string | undefined> = {};
  if (clearProxy) {
    for (const key of proxyVars) {
      savedProxy[key] = process.env[key];
      delete process.env[key];
    }
    process.env.NO_PROXY = '*';
    process.env.no_proxy = '*';
  }

  // Disable all real HTTP and set up mocks
  nock.disableNetConnect();
  setupStatusMocks();
  setupGitHubMocks();
  setupSlackMock();

  try {
    // Import and run the backend
    const { run } = await import('../../../src/index.js');
    await run();

    // Verify generated data
    const currentPath = path.join(TEST_DATA_DIR, 'current.json');
    if (!fs.existsSync(currentPath)) {
      throw new Error('current.json was not generated');
    }

    const current = JSON.parse(fs.readFileSync(currentPath, 'utf-8'));
    const espooDeployed = current.cityGroups?.find(
      (cg: { id: string }) => cg.id === 'espoo'
    )?.prTracks?.core?.deployed;

    // Inject a branch deployment event into history for E2E testing of branch badges
    const historyPath = path.join(TEST_DATA_DIR, 'history.json');
    const history = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
    history.events.unshift({
      id: '2026-03-27T08:00:00Z_espoo-staging_core_branch',
      environmentId: 'espoo-staging',
      cityGroupId: 'espoo',
      detectedAt: '2026-03-27T08:00:00Z',
      previousCommit: { sha: 'aaa0000000000000000000000000000000000000', shortSha: 'aaa0000', message: '', date: '', author: '' },
      newCommit: { sha: 'bbb1111111111111111111111111111111111111', shortSha: 'bbb1111', message: 'Test branch commit', date: '2026-03-27T07:00:00Z', author: 'developer1' },
      includedPRs: [],
      repoType: 'core',
      isDefaultBranch: false,
      branch: 'feature/test-branch',
    });
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));

    // Write feature-flags.json AFTER pipeline (overwrite the empty one from failed collection)
    fs.writeFileSync(
      path.join(TEST_DATA_DIR, 'feature-flags.json'),
      JSON.stringify(featureFlagsFixture(), null, 2)
    );

    console.log(`[E2E] Test data generated. Espoo deployed PRs: ${espooDeployed?.length ?? 0}`);

    return TEST_DATA_DIR;
  } finally {
    nock.cleanAll();
    nock.enableNetConnect();
    // Clean up env vars
    delete process.env.NODE_ENV;
    delete process.env.DATA_DIR;
    delete process.env.DIST_DIR;
    delete process.env.STAGING_INSTANCES;
    // Restore proxy env vars
    if (clearProxy) {
      for (const key of proxyVars) {
        if (savedProxy[key] !== undefined) {
          process.env[key] = savedProxy[key];
        }
      }
    }
  }
}

// Allow running directly
const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').replace(/.*\//, ''));
if (isMain) {
  generateTestData()
    .then((dir) => console.log(`Test data written to: ${dir}`))
    .catch((err) => {
      console.error('Failed to generate test data:', err);
      process.exit(1);
    });
}
