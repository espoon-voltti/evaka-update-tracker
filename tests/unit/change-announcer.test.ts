import * as fs from 'fs';
import {
  getTrackedRepositories,
  readRepoHeads,
  formatPRLine,
} from '../../src/services/change-announcer';
import { CityGroup, PullRequest } from '../../src/types';

jest.mock('fs');
const mockedReadFileSync = fs.readFileSync as jest.MockedFunction<typeof fs.readFileSync>;

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
    environments: [],
  },
];

describe('getTrackedRepositories', () => {
  it('deduplicates core repo appearing in multiple city groups', () => {
    const repos = getTrackedRepositories(mockCityGroups);
    const coreRepos = repos.filter((r) => r.type === 'core');
    expect(coreRepos).toHaveLength(1);
    expect(coreRepos[0].owner).toBe('espoon-voltti');
    expect(coreRepos[0].name).toBe('evaka');
  });

  it('includes all unique wrapper repos', () => {
    const repos = getTrackedRepositories(mockCityGroups);
    const wrapperRepos = repos.filter((r) => r.type === 'wrapper');
    expect(wrapperRepos).toHaveLength(2);
    expect(wrapperRepos.map((r) => `${r.owner}/${r.name}`)).toEqual([
      'Tampere/trevaka',
      'Oulunkaupunki/evakaoulu',
    ]);
  });

  it('sets cityGroupId to null for core repos', () => {
    const repos = getTrackedRepositories(mockCityGroups);
    const coreRepo = repos.find((r) => r.type === 'core')!;
    expect(coreRepo.cityGroupId).toBeNull();
  });

  it('sets cityGroupId for wrapper repos', () => {
    const repos = getTrackedRepositories(mockCityGroups);
    const tampereWrapper = repos.find((r) => r.name === 'trevaka')!;
    expect(tampereWrapper.cityGroupId).toBe('tampere-region');
  });

  it('preserves default branch info', () => {
    const repos = getTrackedRepositories(mockCityGroups);
    const coreRepo = repos.find((r) => r.type === 'core')!;
    expect(coreRepo.defaultBranch).toBe('master');

    const wrapperRepo = repos.find((r) => r.name === 'trevaka')!;
    expect(wrapperRepo.defaultBranch).toBe('main');
  });

  it('returns total of 3 repos (1 core + 2 wrappers)', () => {
    const repos = getTrackedRepositories(mockCityGroups);
    expect(repos).toHaveLength(3);
  });
});

describe('readRepoHeads', () => {
  it('returns empty structure when file does not exist', () => {
    mockedReadFileSync.mockImplementation(() => {
      throw new Error('ENOENT');
    });

    const result = readRepoHeads('/nonexistent/path.json');
    expect(result).toEqual({ checkedAt: '', repos: {} });
  });

  it('parses existing repo-heads.json', () => {
    const data = {
      checkedAt: '2026-03-09T10:00:00.000Z',
      repos: {
        'espoon-voltti/evaka': { sha: 'abc123', branch: 'master' },
      },
    };
    mockedReadFileSync.mockReturnValue(JSON.stringify(data));

    const result = readRepoHeads('/some/path.json');
    expect(result.checkedAt).toBe('2026-03-09T10:00:00.000Z');
    expect(result.repos['espoon-voltti/evaka'].sha).toBe('abc123');
  });
});

describe('formatPRLine', () => {
  const basePR: PullRequest = {
    number: 8628,
    title: 'Testidatan refaktorointi - ei käytetä lateinit',
    author: 'Joosakur',
    authorName: 'Joosa Kurvinen',
    mergedAt: '2026-03-08T10:00:00Z',
    repository: 'espoon-voltti/evaka',
    repoType: 'core',
    isBot: false,
    isHidden: false,
    url: 'https://github.com/espoon-voltti/evaka/pull/8628',
    labels: [],
  };

  it('formats PR with real name', () => {
    const text = formatPRLine(basePR);
    expect(text).toBe(
      '<https://github.com/espoon-voltti/evaka/pull/8628|#8628> Testidatan refaktorointi - ei käytetä lateinit \u2014 Joosa Kurvinen'
    );
  });

  it('falls back to GitHub username when authorName is null', () => {
    const pr: PullRequest = { ...basePR, authorName: null };
    const text = formatPRLine(pr);
    expect(text).toContain('\u2014 Joosakur');
  });

  it('uses Slack mrkdwn link format for PR numbers', () => {
    const text = formatPRLine(basePR);
    expect(text).toContain('<https://github.com/espoon-voltti/evaka/pull/8628|#8628>');
  });

  it('uses em dash between title and author', () => {
    const text = formatPRLine(basePR);
    expect(text).toContain('\u2014 Joosa Kurvinen');
  });

  it('includes label tags for PRs with a single label', () => {
    const pr: PullRequest = { ...basePR, labels: ['bug'] };
    const text = formatPRLine(pr);
    expect(text).toContain('[Korjaus]');
    expect(text).toContain('#8628> [Korjaus] Testidatan');
  });

  it('includes multiple label tags for PRs with multiple labels', () => {
    const pr: PullRequest = { ...basePR, labels: ['enhancement', 'frontend'] };
    const text = formatPRLine(pr);
    expect(text).toContain('[Parannus] [Käyttöliittymä]');
  });

  it('shows no tags for PRs without labels', () => {
    const text = formatPRLine(basePR);
    expect(text).not.toMatch(/\[.*\]/);
  });

  it('ignores unmapped labels', () => {
    const pr: PullRequest = { ...basePR, labels: ['wontfix'] };
    const text = formatPRLine(pr);
    expect(text).not.toMatch(/\[.*\]/);
  });
});
