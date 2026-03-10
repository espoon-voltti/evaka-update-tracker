import * as fs from 'fs';
import {
  getTrackedRepositories,
  readRepoHeads,
  buildChangeAnnouncement,
  formatFinnishTimestamp,
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

describe('formatFinnishTimestamp', () => {
  it('formats a Friday morning correctly', () => {
    // 2026-03-06 is a Friday. 09:28 Helsinki time = 07:28 UTC (EET = UTC+2 in March before DST)
    const date = new Date('2026-03-06T07:28:00Z');
    expect(formatFinnishTimestamp(date)).toBe('pe 6.3. klo 09.28');
  });

  it('formats a Monday afternoon correctly', () => {
    // 2026-03-09 is a Monday. 14:05 Helsinki time = 12:05 UTC
    const date = new Date('2026-03-09T12:05:00Z');
    expect(formatFinnishTimestamp(date)).toBe('ma 9.3. klo 14.05');
  });

  it('formats midnight correctly with zero-padded hours', () => {
    // 2026-03-10 is a Tuesday. 00:03 Helsinki time = 22:03 UTC on March 9
    const date = new Date('2026-03-09T22:03:00Z');
    expect(formatFinnishTimestamp(date)).toBe('ti 10.3. klo 00.03');
  });

  it('formats a Sunday correctly', () => {
    // 2026-03-08 is a Sunday. 16:30 Helsinki time = 14:30 UTC
    const date = new Date('2026-03-08T14:30:00Z');
    expect(formatFinnishTimestamp(date)).toBe('su 8.3. klo 16.30');
  });

  it('handles DST transition (last Sunday of March)', () => {
    // 2026-03-29 is a Sunday, DST starts. 15:00 Helsinki time (EEST = UTC+3) = 12:00 UTC
    const date = new Date('2026-03-29T12:00:00Z');
    expect(formatFinnishTimestamp(date)).toBe('su 29.3. klo 15.00');
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

  it('formats recent PRs without timestamp', () => {
    // "now" is 5 minutes after mergedAt
    const now = new Date('2026-03-08T10:05:00Z');
    const text = buildChangeAnnouncement([mockPRs[0]], now);
    expect(text).toBe(
      '<https://github.com/espoon-voltti/evaka/pull/8628|#8628> Testidatan refaktorointi - ei käytetä lateinit \u2014 Joosakur'
    );
  });

  it('formats old PRs with Finnish timestamp', () => {
    // "now" is 2 hours after mergedAt (well over 20 min)
    const now = new Date('2026-03-08T12:00:00Z');
    const text = buildChangeAnnouncement([mockPRs[0]], now);
    // 2026-03-08T10:00:00Z = 12:00 Helsinki time (EET +2), Sunday
    expect(text).toBe(
      '<https://github.com/espoon-voltti/evaka/pull/8628|#8628> Testidatan refaktorointi - ei käytetä lateinit \u2014 Joosakur \u2014 su 8.3. klo 12.00'
    );
  });

  it('does not include timestamp at exactly 20 minutes', () => {
    const now = new Date('2026-03-08T10:20:00Z');
    const text = buildChangeAnnouncement([mockPRs[0]], now);
    expect(text).not.toContain('klo');
  });

  it('includes timestamp at 21 minutes', () => {
    const now = new Date('2026-03-08T10:21:00Z');
    const text = buildChangeAnnouncement([mockPRs[0]], now);
    expect(text).toContain('klo');
  });

  it('handles mixed PRs — old with timestamp, recent without', () => {
    const prs: PullRequest[] = [
      { ...mockPRs[0], mergedAt: '2026-03-08T10:00:00Z' }, // old
      { ...mockPRs[1], mergedAt: '2026-03-08T11:55:00Z' }, // recent
    ];
    const now = new Date('2026-03-08T12:00:00Z');
    const text = buildChangeAnnouncement(prs, now);
    const lines = text.split('\n');
    expect(lines[0]).toContain('klo'); // old PR has timestamp
    expect(lines[1]).not.toContain('klo'); // recent PR does not
  });

  it('uses Slack mrkdwn link format for PR numbers', () => {
    const now = new Date('2026-03-08T10:05:00Z');
    const text = buildChangeAnnouncement([mockPRs[0]], now);
    expect(text).toContain('<https://github.com/espoon-voltti/evaka/pull/8628|#8628>');
  });

  it('uses em dash between title and author', () => {
    const now = new Date('2026-03-08T10:05:00Z');
    const text = buildChangeAnnouncement([mockPRs[0]], now);
    expect(text).toContain('\u2014 Joosakur');
  });

  it('returns single line for single PR', () => {
    const now = new Date('2026-03-08T10:05:00Z');
    const text = buildChangeAnnouncement([mockPRs[0]], now);
    expect(text.split('\n')).toHaveLength(1);
  });
});
