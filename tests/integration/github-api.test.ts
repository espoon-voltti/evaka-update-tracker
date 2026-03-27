import nock from 'nock';
import {
  initGitHubClient,
  getCommit,
  getSubmoduleRef,
  compareShas,
  getPullRequest,
  getUser,
  extractPRNumberFromCommitMessage,
  isCommitOnDefaultBranch,
  getBranchesWhereHead,
} from '../../src/api/github.js';


const GITHUB_API = 'https://api.github.com';
const OWNER = 'espoon-voltti';
const REPO = 'evaka';
const TEST_TOKEN = 'ghp_test_token_123';

beforeAll(() => {
  initGitHubClient(TEST_TOKEN);
});

afterEach(() => {
  nock.cleanAll();
});

describe('getCommit', () => {
  it('fetches a commit by sha', async () => {
    const sha = 'abc1234567890abcdef1234567890abcdef123456';
    const scope = nock(GITHUB_API)
      .get(`/repos/${OWNER}/${REPO}/commits/${sha}`)
      .reply(200, {
        sha,
        commit: {
          message: 'Fix login page bug\n\nDetailed description here',
          author: { date: '2026-02-28T10:00:00Z', name: 'Test Author' },
        },
        author: { login: 'testuser' },
      });

    const result = await getCommit(OWNER, REPO, sha);

    expect(result).toEqual({
      sha,
      shortSha: sha.slice(0, 7),
      message: 'Fix login page bug',
      date: '2026-02-28T10:00:00Z',
      author: 'testuser',
    });
    scope.done();
  });

  it('falls back to commit author name when GitHub login is missing', async () => {
    const sha = 'def4567890abcdef1234567890abcdef12345678';
    const scope = nock(GITHUB_API)
      .get(`/repos/${OWNER}/${REPO}/commits/${sha}`)
      .reply(200, {
        sha,
        commit: {
          message: 'Update dependencies',
          author: { date: '2026-02-27T09:00:00Z', name: 'Bot User' },
        },
        // no author field
      });

    const result = await getCommit(OWNER, REPO, sha);

    expect(result.author).toBe('Bot User');
    scope.done();
  });
});

describe('getSubmoduleRef', () => {
  it('resolves a submodule sha at a given ref', async () => {
    const ref = 'abc123';
    const submoduleSha = 'sub9876543210abcdef9876543210abcdef987654';
    const submodulePath = 'evaka';

    const scope = nock(GITHUB_API)
      .get(`/repos/${OWNER}/${REPO}/contents/${submodulePath}`)
      .query({ ref })
      .reply(200, {
        type: 'submodule',
        sha: submoduleSha,
      });

    const result = await getSubmoduleRef(OWNER, REPO, submodulePath, ref);

    expect(result).toBe(submoduleSha);
    scope.done();
  });

  it('throws when the path is not a submodule', async () => {
    const ref = 'abc123';
    const submodulePath = 'src/main.ts';

    // withRetry defaults to maxRetries: 3, so 4 total attempts
    nock(GITHUB_API)
      .get(`/repos/${OWNER}/${REPO}/contents/${submodulePath}`)
      .query({ ref })
      .times(4)
      .reply(200, {
        type: 'file',
        sha: 'someSha',
      });

    await expect(
      getSubmoduleRef(OWNER, REPO, submodulePath, ref)
    ).rejects.toThrow(`Expected submodule at ${submodulePath}, got file`);
  });
});

describe('compareShas', () => {
  it('returns commits between two shas', async () => {
    const base = 'aaa111';
    const head = 'bbb222';

    const mockCommits = [
      {
        sha: 'commit1sha000000000000000000000000000000',
        commit: {
          message: 'First commit',
          author: { date: '2026-02-25T08:00:00Z', name: 'Dev A' },
        },
        author: { login: 'deva' },
      },
      {
        sha: 'commit2sha000000000000000000000000000000',
        commit: {
          message: 'Second commit',
          author: { date: '2026-02-26T09:00:00Z', name: 'Dev B' },
        },
        author: { login: 'devb' },
      },
    ];

    const scope = nock(GITHUB_API)
      .get(`/repos/${OWNER}/${REPO}/compare/${base}...${head}`)
      .reply(200, { commits: mockCommits });

    const result = await compareShas(OWNER, REPO, base, head);

    expect(result).toHaveLength(2);
    expect(result[0].sha).toBe('commit1sha000000000000000000000000000000');
    expect(result[1].commit.message).toBe('Second commit');
    scope.done();
  });
});

describe('getPullRequest', () => {
  it('fetches a pull request by number', async () => {
    const prNumber = 4567;
    const mockPR = {
      number: prNumber,
      title: 'Add daycare fee calculation',
      user: { login: 'contributor1' },
      merged_at: '2026-02-20T14:30:00Z',
      html_url: `https://github.com/${OWNER}/${REPO}/pull/${prNumber}`,
    };

    const scope = nock(GITHUB_API)
      .get(`/repos/${OWNER}/${REPO}/pulls/${prNumber}`)
      .reply(200, mockPR);

    const result = await getPullRequest(OWNER, REPO, prNumber);

    expect(result).toEqual(mockPR);
    scope.done();
  });
});

describe('extractPRNumberFromCommitMessage', () => {
  it('extracts PR number from a merge commit message', () => {
    const message =
      'Merge pull request #1234 from feature/branch\n\nSome description';
    expect(extractPRNumberFromCommitMessage(message)).toBe(1234);
  });

  it('extracts PR number from a squash merge commit message', () => {
    const message = 'Add new feature for invoicing (#567)';
    expect(extractPRNumberFromCommitMessage(message)).toBe(567);
  });

  it('returns null when no PR number is found', () => {
    const message = 'Regular commit without PR reference';
    expect(extractPRNumberFromCommitMessage(message)).toBeNull();
  });

  it('uses only the first line for matching', () => {
    const message = 'Regular commit\nMerge pull request #999 from branch';
    expect(extractPRNumberFromCommitMessage(message)).toBeNull();
  });

  it('prefers merge commit pattern over squash pattern', () => {
    const message = 'Merge pull request #100 from branch (#200)';
    expect(extractPRNumberFromCommitMessage(message)).toBe(100);
  });
});

describe('getUser', () => {
  it('returns the name field from a user profile', async () => {
    const scope = nock(GITHUB_API)
      .get('/users/akheron')
      .reply(200, {
        login: 'akheron',
        name: 'Petri Lehtinen',
      });

    const result = await getUser('akheron');

    expect(result).toBe('Petri Lehtinen');
    scope.done();
  });

  it('returns null when user has no name set', async () => {
    const scope = nock(GITHUB_API)
      .get('/users/noname')
      .reply(200, {
        login: 'noname',
        name: null,
      });

    const result = await getUser('noname');

    expect(result).toBeNull();
    scope.done();
  });

});

describe('getBranchesWhereHead', () => {
  it('returns branch names where the commit is HEAD', async () => {
    const sha = 'branchhead123456789012345678901234567890';
    const scope = nock(GITHUB_API)
      .get(`/repos/${OWNER}/${REPO}/commits/${sha}/branches-where-head`)
      .reply(200, [
        { name: 'feature/my-branch', commit: { sha }, protected: false },
        { name: 'master', commit: { sha }, protected: true },
      ]);

    const result = await getBranchesWhereHead(OWNER, REPO, sha);

    expect(result).toEqual(['feature/my-branch', 'master']);
    scope.done();
  });

  it('returns empty array when no branches have this commit as HEAD', async () => {
    const sha = 'nobranch12345678901234567890123456789012';
    const scope = nock(GITHUB_API)
      .get(`/repos/${OWNER}/${REPO}/commits/${sha}/branches-where-head`)
      .reply(200, []);

    const result = await getBranchesWhereHead(OWNER, REPO, sha);

    expect(result).toEqual([]);
    scope.done();
  });
});

describe('isCommitOnDefaultBranch', () => {
  it('returns onDefaultBranch=true when commit is on default branch (0 ahead commits)', async () => {
    const sha = 'ondefault1234567890123456789012345678901';
    const scope = nock(GITHUB_API)
      .get(`/repos/${OWNER}/${REPO}/compare/master...${sha}`)
      .reply(200, { commits: [] });

    const result = await isCommitOnDefaultBranch(OWNER, REPO, 'master', sha);

    expect(result).toEqual({ onDefaultBranch: true, branchName: null });
    scope.done();
  });

  it('returns onDefaultBranch=false with branch name when commit is off default branch', async () => {
    const sha = 'offdefault123456789012345678901234567890';
    const compareScope = nock(GITHUB_API)
      .get(`/repos/${OWNER}/${REPO}/compare/master...${sha}`)
      .reply(200, {
        commits: [{ sha, commit: { message: 'feat', author: { date: '', name: '' } } }],
      });
    const branchScope = nock(GITHUB_API)
      .get(`/repos/${OWNER}/${REPO}/commits/${sha}/branches-where-head`)
      .reply(200, [
        { name: 'feature/test-branch', commit: { sha }, protected: false },
      ]);

    const result = await isCommitOnDefaultBranch(OWNER, REPO, 'master', sha);

    expect(result).toEqual({ onDefaultBranch: false, branchName: 'feature/test-branch' });
    compareScope.done();
    branchScope.done();
  });

  it('returns onDefaultBranch=false with null branchName when branch lookup fails', async () => {
    const sha = 'nolookup12345678901234567890123456789012';
    const compareScope = nock(GITHUB_API)
      .get(`/repos/${OWNER}/${REPO}/compare/master...${sha}`)
      .reply(200, {
        commits: [{ sha, commit: { message: 'feat', author: { date: '', name: '' } } }],
      });
    const branchScope = nock(GITHUB_API)
      .get(`/repos/${OWNER}/${REPO}/commits/${sha}/branches-where-head`)
      .reply(500, 'Internal Server Error');

    const result = await isCommitOnDefaultBranch(OWNER, REPO, 'master', sha);

    expect(result).toEqual({ onDefaultBranch: false, branchName: null });
    compareScope.done();
    branchScope.done();
  });

  it('returns safe fallback (onDefaultBranch=true) when compare API fails', async () => {
    const sha = 'apifail123456789012345678901234567890123';
    const scope = nock(GITHUB_API)
      .get(`/repos/${OWNER}/${REPO}/compare/master...${sha}`)
      .reply(500, 'Internal Server Error');

    const result = await isCommitOnDefaultBranch(OWNER, REPO, 'master', sha);

    expect(result).toEqual({ onDefaultBranch: true, branchName: null });
    scope.done();
  });

  it('excludes default branch name when finding branch name', async () => {
    const sha = 'multibrch12345678901234567890123456789012';
    const compareScope = nock(GITHUB_API)
      .get(`/repos/${OWNER}/${REPO}/compare/master...${sha}`)
      .reply(200, {
        commits: [{ sha, commit: { message: 'feat', author: { date: '', name: '' } } }],
      });
    const branchScope = nock(GITHUB_API)
      .get(`/repos/${OWNER}/${REPO}/commits/${sha}/branches-where-head`)
      .reply(200, [
        { name: 'master', commit: { sha }, protected: true },
        { name: 'feature/my-feature', commit: { sha }, protected: false },
      ]);

    const result = await isCommitOnDefaultBranch(OWNER, REPO, 'master', sha);

    expect(result).toEqual({ onDefaultBranch: false, branchName: 'feature/my-feature' });
    compareScope.done();
    branchScope.done();
  });
});

describe('ETag caching', () => {
  it('sends If-None-Match on second request and uses cached data on 304', async () => {
    const sha = 'etag_test_sha_0000000000000000000000000000';
    const commitData = {
      sha,
      commit: {
        message: 'Cached commit',
        author: { date: '2026-03-01T12:00:00Z', name: 'Cache Tester' },
      },
      author: { login: 'cachetester' },
    };
    const etagValue = '"abc123etag"';

    // First request: returns 200 with ETag
    const scope1 = nock(GITHUB_API)
      .get(`/repos/${OWNER}/${REPO}/commits/${sha}`)
      .reply(200, commitData, { ETag: etagValue });

    const result1 = await getCommit(OWNER, REPO, sha);
    expect(result1.sha).toBe(sha);
    expect(result1.message).toBe('Cached commit');
    scope1.done();

    // Second request: sends If-None-Match, gets 304
    const scope2 = nock(GITHUB_API)
      .get(`/repos/${OWNER}/${REPO}/commits/${sha}`)
      .matchHeader('If-None-Match', etagValue)
      .reply(304);

    const result2 = await getCommit(OWNER, REPO, sha);
    expect(result2.sha).toBe(sha);
    expect(result2.message).toBe('Cached commit');
    expect(result2).toEqual(result1);
    scope2.done();
  });
});
