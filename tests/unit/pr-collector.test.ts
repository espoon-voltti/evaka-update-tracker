import {
  collectPRsBetween,
  collectPendingPRs,
  filterHumanPRs,
  buildPRTrack,
} from '../../src/services/pr-collector';
import {
  compareShas,
  extractPRNumberFromCommitMessage,
  getPullRequest,
} from '../../src/api/github';
import { isBotPR } from '../../src/utils/pr-classifier';
import { PullRequest, Repository } from '../../src/types';

jest.mock('../../src/api/github');
jest.mock('../../src/utils/pr-classifier');

const mockedCompareShas = compareShas as jest.MockedFunction<typeof compareShas>;
const mockedExtractPRNumberFromCommitMessage =
  extractPRNumberFromCommitMessage as jest.MockedFunction<typeof extractPRNumberFromCommitMessage>;
const mockedGetPullRequest = getPullRequest as jest.MockedFunction<typeof getPullRequest>;
const mockedIsBotPR = isBotPR as jest.MockedFunction<typeof isBotPR>;

const testRepo: Repository = {
  owner: 'Tampere',
  name: 'trevaka',
  type: 'wrapper',
  submodulePath: 'evaka',
  defaultBranch: 'main',
};

function makeGitHubPR(number: number, title: string, author: string, mergedAt: string) {
  return {
    number,
    title,
    user: { login: author },
    merged_at: mergedAt,
    html_url: `https://github.com/${testRepo.owner}/${testRepo.name}/pull/${number}`,
    labels: [],
  };
}

function makeCommit(sha: string, message: string, author: string = 'dev') {
  return {
    sha,
    commit: {
      message,
      author: { date: '2026-03-01T12:00:00Z', name: author },
    },
    author: { login: author },
  };
}

describe('pr-collector', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    // Default: extractPRNumberFromCommitMessage uses real implementation
    // We mock it to control PR number extraction
  });

  describe('collectPRsBetween - PR extraction from compare response', () => {
    it('should extract PRs from compare commit list', async () => {
      const commits = [
        makeCommit('aaa111', 'Merge pull request #42 from feature-branch'),
        makeCommit('bbb222', 'Fix something (#55)'),
      ];

      mockedCompareShas.mockResolvedValue(commits);
      mockedExtractPRNumberFromCommitMessage
        .mockReturnValueOnce(42)
        .mockReturnValueOnce(55);

      const pr42 = makeGitHubPR(42, 'Add feature', 'dev1', '2026-03-01T10:00:00Z');
      const pr55 = makeGitHubPR(55, 'Fix bug', 'dev2', '2026-03-01T11:00:00Z');

      mockedGetPullRequest
        .mockResolvedValueOnce(pr42)
        .mockResolvedValueOnce(pr55);
      mockedIsBotPR.mockReturnValue(false);

      const result = await collectPRsBetween(testRepo, 'base123', 'head456');

      expect(result).toHaveLength(2);
      expect(result[0].number).toBe(55); // sorted by mergedAt desc
      expect(result[1].number).toBe(42);
      expect(mockedCompareShas).toHaveBeenCalledWith('Tampere', 'trevaka', 'base123', 'head456');
    });
  });

  describe('extractPRNumberFromCommitMessage patterns', () => {
    it('should parse merge commit message: "Merge pull request #123 from ..."', () => {
      const github = jest.requireActual<{ extractPRNumberFromCommitMessage: (msg: string) => number | null }>(
        '../../src/api/github'
      );

      expect(github.extractPRNumberFromCommitMessage('Merge pull request #123 from feature/branch')).toBe(123);
    });

    it('should parse squash merge message: "Title (#123)"', () => {
      const github = jest.requireActual<{ extractPRNumberFromCommitMessage: (msg: string) => number | null }>(
        '../../src/api/github'
      );

      expect(github.extractPRNumberFromCommitMessage('Fix the login page (#456)')).toBe(456);
    });
  });

  describe('filterHumanPRs', () => {
    function makePR(number: number, isBot: boolean): PullRequest {
      return {
        number,
        title: `PR #${number}`,
        author: isBot ? 'dependabot[bot]' : 'developer',
        authorName: null,
        mergedAt: '2026-03-01T12:00:00Z',
        repository: 'Tampere/trevaka',
        repoType: 'wrapper',
        isBot,
        url: `https://github.com/Tampere/trevaka/pull/${number}`,
        labels: [],
      };
    }

    it('should filter out bot PRs (isBot=true)', () => {
      const prs: PullRequest[] = [
        makePR(1, false),
        makePR(2, true),
        makePR(3, false),
        makePR(4, true),
      ];

      const result = filterHumanPRs(prs);

      expect(result).toHaveLength(2);
      expect(result.every((pr) => !pr.isBot)).toBe(true);
      expect(result[0].number).toBe(1);
      expect(result[1].number).toBe(3);
    });

    it('should limit to 5 PRs per track', () => {
      const prs: PullRequest[] = Array.from({ length: 10 }, (_, i) => makePR(i + 1, false));

      const result = filterHumanPRs(prs);

      expect(result).toHaveLength(5);
      expect(result[0].number).toBe(1);
      expect(result[4].number).toBe(5);
    });
  });

  describe('empty compare result', () => {
    it('should return empty array when compare returns no commits', async () => {
      mockedCompareShas.mockResolvedValue([]);

      const result = await collectPRsBetween(testRepo, 'base123', 'head456');

      expect(result).toEqual([]);
    });

    it('should return empty array when compare throws an error', async () => {
      mockedCompareShas.mockRejectedValue(new Error('Not Found'));

      const result = await collectPRsBetween(testRepo, 'base123', 'head456');

      expect(result).toEqual([]);
    });
  });

  describe('collectPendingPRs', () => {
    it('should compare deployed SHA against default branch', async () => {
      mockedCompareShas.mockResolvedValue([]);

      await collectPendingPRs(testRepo, 'deployed123');

      expect(mockedCompareShas).toHaveBeenCalledWith(
        'Tampere',
        'trevaka',
        'deployed123',
        'main'
      );
    });
  });

  describe('buildPRTrack', () => {
    function makePR(number: number, isBot: boolean): PullRequest {
      return {
        number,
        title: `PR #${number}`,
        author: isBot ? 'renovate[bot]' : 'developer',
        authorName: null,
        mergedAt: '2026-03-01T12:00:00Z',
        repository: 'Tampere/trevaka',
        repoType: 'wrapper',
        isBot,
        url: `https://github.com/Tampere/trevaka/pull/${number}`,
        labels: [],
      };
    }

    it('should filter bots and limit each track', () => {
      const deployed = [makePR(1, false), makePR(2, true), makePR(3, false)];
      const inStaging = [makePR(4, false)];
      const pending = [makePR(5, true), makePR(6, false)];

      const result = buildPRTrack(deployed, inStaging, pending);

      expect(result.deployed).toHaveLength(2);
      expect(result.deployed.every((pr) => !pr.isBot)).toBe(true);
      expect(result.inStaging).toHaveLength(1);
      expect(result.pendingDeployment).toHaveLength(1);
      expect(result.pendingDeployment[0].number).toBe(6);
    });
  });
});
