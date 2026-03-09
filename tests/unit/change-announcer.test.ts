import * as fs from 'fs';
import {
  getTrackedRepositories,
  readRepoHeads,
  buildChangeAnnouncement,
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

describe('buildChangeAnnouncement', () => {
  const mockPRs: PullRequest[] = [
    {
      number: 8628,
      title: 'Testidatan refaktorointi - ei käytetä lateinit',
      author: 'Joosakur',
      mergedAt: '2026-03-08T10:00:00Z',
      repository: 'espoon-voltti/evaka',
      repoType: 'core',
      isBot: false,
      url: 'https://github.com/espoon-voltti/evaka/pull/8628',
      labels: [],
    },
    {
      number: 8629,
      title: 'Fix login redirect',
      author: 'developer2',
      mergedAt: '2026-03-08T11:00:00Z',
      repository: 'espoon-voltti/evaka',
      repoType: 'core',
      isBot: false,
      url: 'https://github.com/espoon-voltti/evaka/pull/8629',
      labels: [],
    },
  ];

  it('formats PRs as one line each with linked number, title, and author', () => {
    const text = buildChangeAnnouncement(mockPRs);
    const lines = text.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe(
      '<https://github.com/espoon-voltti/evaka/pull/8628|#8628> Testidatan refaktorointi - ei käytetä lateinit \u2014 Joosakur'
    );
    expect(lines[1]).toBe(
      '<https://github.com/espoon-voltti/evaka/pull/8629|#8629> Fix login redirect \u2014 developer2'
    );
  });

  it('uses Slack mrkdwn link format for PR numbers', () => {
    const text = buildChangeAnnouncement([mockPRs[0]]);
    expect(text).toContain('<https://github.com/espoon-voltti/evaka/pull/8628|#8628>');
  });

  it('uses em dash between title and author', () => {
    const text = buildChangeAnnouncement([mockPRs[0]]);
    expect(text).toContain('\u2014 Joosakur');
  });

  it('returns single line for single PR', () => {
    const text = buildChangeAnnouncement([mockPRs[0]]);
    expect(text.split('\n')).toHaveLength(1);
  });
});
