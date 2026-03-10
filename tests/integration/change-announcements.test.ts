import nock from 'nock';
import * as fs from 'fs';
import * as path from 'path';
import { announceChanges } from '../../src/services/change-announcer';
import { CityGroup } from '../../src/types';

// Mock the GitHub client module
jest.mock('../../src/api/github', () => ({
  getCommit: jest.fn(),
  compareShas: jest.fn(),
  getPullRequest: jest.fn(),
  extractPRNumberFromCommitMessage: jest.requireActual('../../src/api/github').extractPRNumberFromCommitMessage,
}));

import { getCommit, compareShas, getPullRequest } from '../../src/api/github';

const mockedGetCommit = getCommit as jest.MockedFunction<typeof getCommit>;
const mockedCompareShas = compareShas as jest.MockedFunction<typeof compareShas>;
const mockedGetPullRequest = getPullRequest as jest.MockedFunction<typeof getPullRequest>;

const CHANGE_ENV_VARS = [
  'SLACK_CHANGE_WEBHOOK_CORE',
  'SLACK_CHANGE_WEBHOOK_TAMPERE_REGION',
  'SLACK_CHANGE_WEBHOOK_OULU',
  'SLACK_CHANGE_WEBHOOK_TURKU',
  'DRY_RUN',
];
const savedEnv: Record<string, string | undefined> = {};

const TEST_DATA_DIR = path.join(__dirname, '..', 'test-data-change');

const CORE_REPO = {
  owner: 'espoon-voltti',
  name: 'evaka',
  type: 'core' as const,
  submodulePath: null,
  defaultBranch: 'master',
};

const mockCityGroups: CityGroup[] = [
  {
    id: 'espoo',
    name: 'Espoo',
    repositories: [CORE_REPO],
    environments: [],
  },
  {
    id: 'tampere-region',
    name: 'Tampereen seutu',
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
    environments: [],
  },
];

beforeEach(() => {
  for (const key of CHANGE_ENV_VARS) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
  process.env.DRY_RUN = 'false';

  // Clean up test data dir
  fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
  try {
    fs.unlinkSync(path.join(TEST_DATA_DIR, 'repo-heads.json'));
  } catch {
    // File doesn't exist
  }

  jest.clearAllMocks();
});

afterEach(() => {
  nock.cleanAll();
  for (const key of CHANGE_ENV_VARS) {
    if (savedEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = savedEnv[key];
    }
  }

  // Clean up test data
  try {
    fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
});

describe('announceChanges - end-to-end', () => {
  it('stores HEAD on first run without sending announcements', async () => {
    process.env.SLACK_CHANGE_WEBHOOK_CORE = 'https://hooks.slack.com/services/T00/CORE/XXX';

    const currentCoreSha = 'aaa1111111111111111111111111111111111111';
    const currentWrapperSha = 'bbb2222222222222222222222222222222222222';

    mockedGetCommit.mockImplementation(async (_owner, repo) => ({
      sha: repo === 'evaka' ? currentCoreSha : currentWrapperSha,
      shortSha: (repo === 'evaka' ? currentCoreSha : currentWrapperSha).slice(0, 7),
      message: 'commit',
      date: '2026-03-09T10:00:00Z',
      author: 'dev',
    }));

    await announceChanges(mockCityGroups, TEST_DATA_DIR);

    // Should have stored heads
    const heads = JSON.parse(fs.readFileSync(path.join(TEST_DATA_DIR, 'repo-heads.json'), 'utf-8'));
    expect(heads.repos['espoon-voltti/evaka'].sha).toBe(currentCoreSha);
    expect(heads.repos['Tampere/trevaka'].sha).toBe(currentWrapperSha);

    // No Slack calls should have been made
    expect(nock.pendingMocks()).toHaveLength(0);
  });

  it('sends core announcement when core HEAD changes', async () => {
    const oldCoreSha = 'old1111111111111111111111111111111111111';
    const newCoreSha = 'new2222222222222222222222222222222222222';

    // Pre-populate repo-heads.json with old SHA
    fs.writeFileSync(
      path.join(TEST_DATA_DIR, 'repo-heads.json'),
      JSON.stringify({
        checkedAt: '2026-03-09T09:00:00Z',
        repos: {
          'espoon-voltti/evaka': { sha: oldCoreSha, branch: 'master' },
          'Tampere/trevaka': { sha: 'wrapper_sha_unchanged', branch: 'main' },
        },
      })
    );

    process.env.SLACK_CHANGE_WEBHOOK_CORE = 'https://hooks.slack.com/services/T00/CORE/XXX';

    // Mock GitHub: core HEAD changed, wrapper unchanged
    mockedGetCommit.mockImplementation(async (_owner, repo) => ({
      sha: repo === 'evaka' ? newCoreSha : 'wrapper_sha_unchanged',
      shortSha: (repo === 'evaka' ? newCoreSha : 'wrapper_sha_unchanged').slice(0, 7),
      message: 'commit',
      date: '2026-03-09T10:00:00Z',
      author: 'dev',
    }));

    // Mock compare: returns commits with PR references
    mockedCompareShas.mockResolvedValue([
      {
        sha: 'commit1',
        commit: {
          message: 'Testidatan refaktorointi (#8628)',
          author: { date: '2026-03-09T09:30:00Z', name: 'Joosakur' },
        },
        author: { login: 'Joosakur' },
      },
    ]);

    // Mock PR fetch
    mockedGetPullRequest.mockResolvedValue({
      number: 8628,
      title: 'Testidatan refaktorointi - ei käytetä lateinit',
      user: { login: 'Joosakur' },
      merged_at: '2026-03-09T09:30:00Z',
      html_url: 'https://github.com/espoon-voltti/evaka/pull/8628',
      labels: [],
    });

    // Expect Slack webhook call
    const slackScope = nock('https://hooks.slack.com')
      .post('/services/T00/CORE/XXX', (body: { text: string }) => {
        expect(body.text).toContain('#8628');
        expect(body.text).toContain('Testidatan refaktorointi');
        expect(body.text).toContain('Joosakur');
        return true;
      })
      .reply(200, 'ok');

    await announceChanges(mockCityGroups, TEST_DATA_DIR);

    expect(slackScope.isDone()).toBe(true);

    // Verify HEAD was updated
    const heads = JSON.parse(fs.readFileSync(path.join(TEST_DATA_DIR, 'repo-heads.json'), 'utf-8'));
    expect(heads.repos['espoon-voltti/evaka'].sha).toBe(newCoreSha);
  });

  it('sends wrapper announcement to wrapper-specific channel', async () => {
    const oldWrapperSha = 'old_wrapper_sha_11111111111111111111111';
    const newWrapperSha = 'new_wrapper_sha_22222222222222222222222';

    fs.writeFileSync(
      path.join(TEST_DATA_DIR, 'repo-heads.json'),
      JSON.stringify({
        checkedAt: '2026-03-09T09:00:00Z',
        repos: {
          'espoon-voltti/evaka': { sha: 'core_sha_unchanged', branch: 'master' },
          'Tampere/trevaka': { sha: oldWrapperSha, branch: 'main' },
        },
      })
    );

    process.env.SLACK_CHANGE_WEBHOOK_CORE = 'https://hooks.slack.com/services/T00/CORE/XXX';
    process.env.SLACK_CHANGE_WEBHOOK_TAMPERE_REGION = 'https://hooks.slack.com/services/T00/TAMPERE/XXX';

    mockedGetCommit.mockImplementation(async (_owner, repo) => ({
      sha: repo === 'trevaka' ? newWrapperSha : 'core_sha_unchanged',
      shortSha: (repo === 'trevaka' ? newWrapperSha : 'core_sha_unchanged').slice(0, 7),
      message: 'commit',
      date: '2026-03-09T10:00:00Z',
      author: 'dev',
    }));

    mockedCompareShas.mockResolvedValue([
      {
        sha: 'commit1',
        commit: {
          message: 'Update Tampere config (#42)',
          author: { date: '2026-03-09T09:30:00Z', name: 'dev1' },
        },
        author: { login: 'dev1' },
      },
    ]);

    mockedGetPullRequest.mockResolvedValue({
      number: 42,
      title: 'Update Tampere config',
      user: { login: 'dev1' },
      merged_at: '2026-03-09T09:30:00Z',
      html_url: 'https://github.com/Tampere/trevaka/pull/42',
      labels: [],
    });

    // Wrapper announcement goes to Tampere channel, NOT core
    const tampereScope = nock('https://hooks.slack.com')
      .post('/services/T00/TAMPERE/XXX', (body: { text: string }) => {
        expect(body.text).toContain('#42');
        expect(body.text).toContain('Update Tampere config');
        return true;
      })
      .reply(200, 'ok');

    await announceChanges(mockCityGroups, TEST_DATA_DIR);

    expect(tampereScope.isDone()).toBe(true);
  });

  it('sends core and wrapper to different channels in same run', async () => {
    const oldCoreSha = 'old_core_sha_111111111111111111111111';
    const newCoreSha = 'new_core_sha_222222222222222222222222';
    const oldWrapperSha = 'old_wrapper_sha_11111111111111111111';
    const newWrapperSha = 'new_wrapper_sha_22222222222222222222';

    fs.writeFileSync(
      path.join(TEST_DATA_DIR, 'repo-heads.json'),
      JSON.stringify({
        checkedAt: '2026-03-09T09:00:00Z',
        repos: {
          'espoon-voltti/evaka': { sha: oldCoreSha, branch: 'master' },
          'Tampere/trevaka': { sha: oldWrapperSha, branch: 'main' },
        },
      })
    );

    process.env.SLACK_CHANGE_WEBHOOK_CORE = 'https://hooks.slack.com/services/T00/CORE/XXX';
    process.env.SLACK_CHANGE_WEBHOOK_TAMPERE_REGION = 'https://hooks.slack.com/services/T00/TAMPERE/XXX';

    mockedGetCommit.mockImplementation(async (_owner, repo) => ({
      sha: repo === 'evaka' ? newCoreSha : newWrapperSha,
      shortSha: (repo === 'evaka' ? newCoreSha : newWrapperSha).slice(0, 7),
      message: 'commit',
      date: '2026-03-09T10:00:00Z',
      author: 'dev',
    }));

    mockedCompareShas.mockResolvedValue([
      {
        sha: 'commit1',
        commit: {
          message: 'Some change (#100)',
          author: { date: '2026-03-09T09:30:00Z', name: 'dev1' },
        },
        author: { login: 'dev1' },
      },
    ]);

    mockedGetPullRequest.mockResolvedValue({
      number: 100,
      title: 'Some change',
      user: { login: 'dev1' },
      merged_at: '2026-03-09T09:30:00Z',
      html_url: 'https://github.com/test/repo/pull/100',
      labels: [],
    });

    const coreScope = nock('https://hooks.slack.com')
      .post('/services/T00/CORE/XXX')
      .reply(200, 'ok');

    const tampereScope = nock('https://hooks.slack.com')
      .post('/services/T00/TAMPERE/XXX')
      .reply(200, 'ok');

    await announceChanges(mockCityGroups, TEST_DATA_DIR);

    expect(coreScope.isDone()).toBe(true);
    expect(tampereScope.isDone()).toBe(true);
  });

  it('does not send announcement when only bot PRs are found', async () => {
    const oldCoreSha = 'old_core_sha_111111111111111111111111';
    const newCoreSha = 'new_core_sha_222222222222222222222222';

    fs.writeFileSync(
      path.join(TEST_DATA_DIR, 'repo-heads.json'),
      JSON.stringify({
        checkedAt: '2026-03-09T09:00:00Z',
        repos: {
          'espoon-voltti/evaka': { sha: oldCoreSha, branch: 'master' },
          'Tampere/trevaka': { sha: 'wrapper_unchanged', branch: 'main' },
        },
      })
    );

    process.env.SLACK_CHANGE_WEBHOOK_CORE = 'https://hooks.slack.com/services/T00/CORE/XXX';

    mockedGetCommit.mockImplementation(async (_owner, repo) => ({
      sha: repo === 'evaka' ? newCoreSha : 'wrapper_unchanged',
      shortSha: (repo === 'evaka' ? newCoreSha : 'wrapper_unchanged').slice(0, 7),
      message: 'commit',
      date: '2026-03-09T10:00:00Z',
      author: 'dev',
    }));

    mockedCompareShas.mockResolvedValue([
      {
        sha: 'commit1',
        commit: {
          message: 'Bump lodash from 4.17.19 to 4.17.20 (#999)',
          author: { date: '2026-03-09T09:30:00Z', name: 'dependabot[bot]' },
        },
        author: { login: 'dependabot[bot]' },
      },
    ]);

    mockedGetPullRequest.mockResolvedValue({
      number: 999,
      title: 'Bump lodash from 4.17.19 to 4.17.20',
      user: { login: 'dependabot[bot]' },
      merged_at: '2026-03-09T09:30:00Z',
      html_url: 'https://github.com/espoon-voltti/evaka/pull/999',
      labels: [],
    });

    // No Slack call should be made
    const slackScope = nock('https://hooks.slack.com')
      .post('/services/T00/CORE/XXX')
      .reply(200, 'ok');

    await announceChanges(mockCityGroups, TEST_DATA_DIR);

    expect(slackScope.isDone()).toBe(false);
    nock.cleanAll();

    // But HEAD should still be updated
    const heads = JSON.parse(fs.readFileSync(path.join(TEST_DATA_DIR, 'repo-heads.json'), 'utf-8'));
    expect(heads.repos['espoon-voltti/evaka'].sha).toBe(newCoreSha);
  });

  it('filters bot PRs from mixed results, only announces human PRs', async () => {
    const oldCoreSha = 'old_core_sha_111111111111111111111111';
    const newCoreSha = 'new_core_sha_222222222222222222222222';

    fs.writeFileSync(
      path.join(TEST_DATA_DIR, 'repo-heads.json'),
      JSON.stringify({
        checkedAt: '2026-03-09T09:00:00Z',
        repos: {
          'espoon-voltti/evaka': { sha: oldCoreSha, branch: 'master' },
          'Tampere/trevaka': { sha: 'wrapper_unchanged', branch: 'main' },
        },
      })
    );

    process.env.SLACK_CHANGE_WEBHOOK_CORE = 'https://hooks.slack.com/services/T00/CORE/XXX';

    mockedGetCommit.mockImplementation(async (_owner, repo) => ({
      sha: repo === 'evaka' ? newCoreSha : 'wrapper_unchanged',
      shortSha: (repo === 'evaka' ? newCoreSha : 'wrapper_unchanged').slice(0, 7),
      message: 'commit',
      date: '2026-03-09T10:00:00Z',
      author: 'dev',
    }));

    mockedCompareShas.mockResolvedValue([
      {
        sha: 'commit1',
        commit: {
          message: 'Real feature (#100)',
          author: { date: '2026-03-09T09:30:00Z', name: 'dev1' },
        },
        author: { login: 'dev1' },
      },
      {
        sha: 'commit2',
        commit: {
          message: 'Bump lodash from 4.17.19 to 4.17.20 (#999)',
          author: { date: '2026-03-09T09:31:00Z', name: 'dependabot[bot]' },
        },
        author: { login: 'dependabot[bot]' },
      },
    ]);

    mockedGetPullRequest.mockImplementation(async (_owner, _repo, number) => {
      if (number === 100) {
        return {
          number: 100,
          title: 'Real feature',
          user: { login: 'dev1' },
          merged_at: '2026-03-09T09:30:00Z',
          html_url: 'https://github.com/espoon-voltti/evaka/pull/100',
          labels: [],
        };
      }
      return {
        number: 999,
        title: 'Bump lodash from 4.17.19 to 4.17.20',
        user: { login: 'dependabot[bot]' },
        merged_at: '2026-03-09T09:31:00Z',
        html_url: 'https://github.com/espoon-voltti/evaka/pull/999',
        labels: [],
      };
    });

    const slackScope = nock('https://hooks.slack.com')
      .post('/services/T00/CORE/XXX', (body: { text: string }) => {
        expect(body.text).toContain('#100');
        expect(body.text).toContain('Real feature');
        expect(body.text).not.toContain('#999');
        expect(body.text).not.toContain('dependabot');
        expect(body.text).not.toContain('Bump lodash');
        return true;
      })
      .reply(200, 'ok');

    await announceChanges(mockCityGroups, TEST_DATA_DIR);

    expect(slackScope.isDone()).toBe(true);
  });

  it('does not update HEAD when Slack webhook fails (500), enabling retry on next run', async () => {
    const oldCoreSha = 'old_core_sha_111111111111111111111111';
    const newCoreSha = 'new_core_sha_222222222222222222222222';

    fs.writeFileSync(
      path.join(TEST_DATA_DIR, 'repo-heads.json'),
      JSON.stringify({
        checkedAt: '2026-03-09T09:00:00Z',
        repos: {
          'espoon-voltti/evaka': { sha: oldCoreSha, branch: 'master' },
          'Tampere/trevaka': { sha: 'wrapper_unchanged', branch: 'main' },
        },
      })
    );

    process.env.SLACK_CHANGE_WEBHOOK_CORE = 'https://hooks.slack.com/services/T00/CORE/XXX';

    mockedGetCommit.mockImplementation(async (_owner, repo) => ({
      sha: repo === 'evaka' ? newCoreSha : 'wrapper_unchanged',
      shortSha: (repo === 'evaka' ? newCoreSha : 'wrapper_unchanged').slice(0, 7),
      message: 'commit',
      date: '2026-03-09T10:00:00Z',
      author: 'dev',
    }));

    mockedCompareShas.mockResolvedValue([
      {
        sha: 'commit1',
        commit: {
          message: 'Feature (#100)',
          author: { date: '2026-03-09T09:30:00Z', name: 'dev1' },
        },
        author: { login: 'dev1' },
      },
    ]);

    mockedGetPullRequest.mockResolvedValue({
      number: 100,
      title: 'Feature',
      user: { login: 'dev1' },
      merged_at: '2026-03-09T09:30:00Z',
      html_url: 'https://github.com/espoon-voltti/evaka/pull/100',
      labels: [],
    });

    // Slack returns 500
    nock('https://hooks.slack.com')
      .post('/services/T00/CORE/XXX')
      .reply(500, 'Internal Server Error');

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

    // Should not throw
    await announceChanges(mockCityGroups, TEST_DATA_DIR);

    warnSpy.mockRestore();

    // HEAD should NOT be updated — will retry on next run
    const heads = JSON.parse(fs.readFileSync(path.join(TEST_DATA_DIR, 'repo-heads.json'), 'utf-8'));
    expect(heads.repos['espoon-voltti/evaka'].sha).toBe(oldCoreSha);
  });

  it('does not update HEAD when Slack webhook returns 404', async () => {
    const oldCoreSha = 'old_core_sha_111111111111111111111111';
    const newCoreSha = 'new_core_sha_222222222222222222222222';

    fs.writeFileSync(
      path.join(TEST_DATA_DIR, 'repo-heads.json'),
      JSON.stringify({
        checkedAt: '2026-03-09T09:00:00Z',
        repos: {
          'espoon-voltti/evaka': { sha: oldCoreSha, branch: 'master' },
          'Tampere/trevaka': { sha: 'wrapper_unchanged', branch: 'main' },
        },
      })
    );

    process.env.SLACK_CHANGE_WEBHOOK_CORE = 'https://hooks.slack.com/services/T00/CORE/XXX';

    mockedGetCommit.mockImplementation(async (_owner, repo) => ({
      sha: repo === 'evaka' ? newCoreSha : 'wrapper_unchanged',
      shortSha: (repo === 'evaka' ? newCoreSha : 'wrapper_unchanged').slice(0, 7),
      message: 'commit',
      date: '2026-03-09T10:00:00Z',
      author: 'dev',
    }));

    mockedCompareShas.mockResolvedValue([
      {
        sha: 'commit1',
        commit: {
          message: 'Feature (#100)',
          author: { date: '2026-03-09T09:30:00Z', name: 'dev1' },
        },
        author: { login: 'dev1' },
      },
    ]);

    mockedGetPullRequest.mockResolvedValue({
      number: 100,
      title: 'Feature',
      user: { login: 'dev1' },
      merged_at: '2026-03-09T09:30:00Z',
      html_url: 'https://github.com/espoon-voltti/evaka/pull/100',
      labels: [],
    });

    nock('https://hooks.slack.com')
      .post('/services/T00/CORE/XXX')
      .reply(404, 'Not Found');

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    await announceChanges(mockCityGroups, TEST_DATA_DIR);
    warnSpy.mockRestore();

    const heads = JSON.parse(fs.readFileSync(path.join(TEST_DATA_DIR, 'repo-heads.json'), 'utf-8'));
    expect(heads.repos['espoon-voltti/evaka'].sha).toBe(oldCoreSha);
  });

  it('retries announcement on next run after previous failure', async () => {
    const oldCoreSha = 'old_core_sha_111111111111111111111111';
    const newCoreSha = 'new_core_sha_222222222222222222222222';

    fs.writeFileSync(
      path.join(TEST_DATA_DIR, 'repo-heads.json'),
      JSON.stringify({
        checkedAt: '2026-03-09T09:00:00Z',
        repos: {
          'espoon-voltti/evaka': { sha: oldCoreSha, branch: 'master' },
          'Tampere/trevaka': { sha: 'wrapper_unchanged', branch: 'main' },
        },
      })
    );

    process.env.SLACK_CHANGE_WEBHOOK_CORE = 'https://hooks.slack.com/services/T00/CORE/XXX';

    mockedGetCommit.mockImplementation(async (_owner, repo) => ({
      sha: repo === 'evaka' ? newCoreSha : 'wrapper_unchanged',
      shortSha: (repo === 'evaka' ? newCoreSha : 'wrapper_unchanged').slice(0, 7),
      message: 'commit',
      date: '2026-03-09T10:00:00Z',
      author: 'dev',
    }));

    mockedCompareShas.mockResolvedValue([
      {
        sha: 'commit1',
        commit: {
          message: 'Feature (#100)',
          author: { date: '2026-03-09T09:30:00Z', name: 'dev1' },
        },
        author: { login: 'dev1' },
      },
    ]);

    mockedGetPullRequest.mockResolvedValue({
      number: 100,
      title: 'Feature',
      user: { login: 'dev1' },
      merged_at: '2026-03-09T09:30:00Z',
      html_url: 'https://github.com/espoon-voltti/evaka/pull/100',
      labels: [],
    });

    // First run: Slack fails
    nock('https://hooks.slack.com')
      .post('/services/T00/CORE/XXX')
      .reply(500, 'Internal Server Error');

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    await announceChanges(mockCityGroups, TEST_DATA_DIR);
    warnSpy.mockRestore();

    // HEAD should not be updated
    let heads = JSON.parse(fs.readFileSync(path.join(TEST_DATA_DIR, 'repo-heads.json'), 'utf-8'));
    expect(heads.repos['espoon-voltti/evaka'].sha).toBe(oldCoreSha);

    // Second run: Slack succeeds
    const slackScope = nock('https://hooks.slack.com')
      .post('/services/T00/CORE/XXX', (body: { text: string }) => {
        expect(body.text).toContain('#100');
        return true;
      })
      .reply(200, 'ok');

    await announceChanges(mockCityGroups, TEST_DATA_DIR);

    expect(slackScope.isDone()).toBe(true);

    // NOW HEAD should be updated
    heads = JSON.parse(fs.readFileSync(path.join(TEST_DATA_DIR, 'repo-heads.json'), 'utf-8'));
    expect(heads.repos['espoon-voltti/evaka'].sha).toBe(newCoreSha);
  });

  it('updates HEAD independently per-repo when one fails and another succeeds', async () => {
    const oldCoreSha = 'old_core_sha_111111111111111111111111';
    const newCoreSha = 'new_core_sha_222222222222222222222222';
    const oldWrapperSha = 'old_wrapper_sha_11111111111111111111';
    const newWrapperSha = 'new_wrapper_sha_22222222222222222222';

    fs.writeFileSync(
      path.join(TEST_DATA_DIR, 'repo-heads.json'),
      JSON.stringify({
        checkedAt: '2026-03-09T09:00:00Z',
        repos: {
          'espoon-voltti/evaka': { sha: oldCoreSha, branch: 'master' },
          'Tampere/trevaka': { sha: oldWrapperSha, branch: 'main' },
        },
      })
    );

    process.env.SLACK_CHANGE_WEBHOOK_CORE = 'https://hooks.slack.com/services/T00/CORE/XXX';
    process.env.SLACK_CHANGE_WEBHOOK_TAMPERE_REGION = 'https://hooks.slack.com/services/T00/TAMPERE/XXX';

    mockedGetCommit.mockImplementation(async (_owner, repo) => ({
      sha: repo === 'evaka' ? newCoreSha : newWrapperSha,
      shortSha: (repo === 'evaka' ? newCoreSha : newWrapperSha).slice(0, 7),
      message: 'commit',
      date: '2026-03-09T10:00:00Z',
      author: 'dev',
    }));

    mockedCompareShas.mockResolvedValue([
      {
        sha: 'commit1',
        commit: {
          message: 'Some change (#100)',
          author: { date: '2026-03-09T09:30:00Z', name: 'dev1' },
        },
        author: { login: 'dev1' },
      },
    ]);

    mockedGetPullRequest.mockResolvedValue({
      number: 100,
      title: 'Some change',
      user: { login: 'dev1' },
      merged_at: '2026-03-09T09:30:00Z',
      html_url: 'https://github.com/test/repo/pull/100',
      labels: [],
    });

    // Core Slack fails, Tampere Slack succeeds
    nock('https://hooks.slack.com')
      .post('/services/T00/CORE/XXX')
      .reply(500, 'Internal Server Error');

    nock('https://hooks.slack.com')
      .post('/services/T00/TAMPERE/XXX')
      .reply(200, 'ok');

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    await announceChanges(mockCityGroups, TEST_DATA_DIR);
    warnSpy.mockRestore();

    const heads = JSON.parse(fs.readFileSync(path.join(TEST_DATA_DIR, 'repo-heads.json'), 'utf-8'));
    // Core HEAD should NOT be updated (Slack failed)
    expect(heads.repos['espoon-voltti/evaka'].sha).toBe(oldCoreSha);
    // Wrapper HEAD SHOULD be updated (Slack succeeded)
    expect(heads.repos['Tampere/trevaka'].sha).toBe(newWrapperSha);
  });
});
