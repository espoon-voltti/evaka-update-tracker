import {
  readPreviousData,
  detectChanges,
  buildUpdatedPrevious,
} from '../../src/services/change-detector';
import {
  VersionSnapshot,
  CommitInfo,
  PreviousData,
  PreviousVersionEntry,
  PullRequest,
} from '../../src/types';
import * as fs from 'fs';

jest.mock('fs');

const mockedReadFileSync = fs.readFileSync as jest.MockedFunction<typeof fs.readFileSync>;

function makeCommitInfo(sha: string): CommitInfo {
  return {
    sha,
    shortSha: sha.slice(0, 7),
    message: `commit ${sha.slice(0, 7)}`,
    date: '2026-03-01T12:00:00Z',
    author: 'testuser',
  };
}

function makeVersionSnapshot(overrides: Partial<VersionSnapshot> = {}): VersionSnapshot {
  return {
    instanceDomain: 'test.example.fi',
    checkedAt: '2026-03-01T12:00:00Z',
    status: 'ok',
    wrapperCommit: null,
    coreCommit: null,
    ...overrides,
  };
}

function makePR(number: number, repoType: 'core' | 'wrapper'): PullRequest {
  return {
    number,
    title: `PR #${number}`,
    author: 'developer',
    authorName: null,
    mergedAt: '2026-03-01T12:00:00Z',
    repository: 'owner/repo',
    repoType,
    isBot: false,
    isHidden: false,
    url: `https://github.com/owner/repo/pull/${number}`,
    labels: [],
  };
}

describe('change-detector', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('readPreviousData', () => {
    it('should parse valid JSON from file', () => {
      const data: PreviousData = {
        checkedAt: '2026-03-01T10:00:00Z',
        versions: {
          'espoo-prod': { wrapperSha: null, coreSha: 'abc123' },
        },
      };
      mockedReadFileSync.mockReturnValue(JSON.stringify(data));

      const result = readPreviousData('/path/to/previous.json');

      expect(result).toEqual(data);
      expect(mockedReadFileSync).toHaveBeenCalledWith('/path/to/previous.json', 'utf-8');
    });

    it('should return empty data when file does not exist', () => {
      mockedReadFileSync.mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });

      const result = readPreviousData('/nonexistent.json');

      expect(result.versions).toEqual({});
      expect(result.checkedAt).toBeDefined();
    });
  });

  describe('detectChanges', () => {
    it('should detect version change when SHA differs from previous', () => {
      const newCoreSha = 'aabbccdd11223344556677889900aabbccddeeff';
      const prevCoreSha = '1122334455667788990011223344556677889900';

      const version = makeVersionSnapshot({
        coreCommit: makeCommitInfo(newCoreSha),
      });

      const previous: PreviousVersionEntry = {
        wrapperSha: null,
        coreSha: prevCoreSha,
      };

      const prs = [makePR(42, 'core')];

      const events = detectChanges('espoo-prod', 'espoo', version, previous, prs);

      expect(events).toHaveLength(1);
      expect(events[0].repoType).toBe('core');
      expect(events[0].environmentId).toBe('espoo-prod');
      expect(events[0].cityGroupId).toBe('espoo');
      expect(events[0].newCommit.sha).toBe(newCoreSha);
      expect(events[0].previousCommit?.sha).toBe(prevCoreSha);
      expect(events[0].includedPRs).toHaveLength(1);
      expect(events[0].includedPRs[0].number).toBe(42);
    });

    it('should emit no events when SHA is the same (no change)', () => {
      const sha = 'aabbccdd11223344556677889900aabbccddeeff';

      const version = makeVersionSnapshot({
        coreCommit: makeCommitInfo(sha),
      });

      const previous: PreviousVersionEntry = {
        wrapperSha: null,
        coreSha: sha,
      };

      const events = detectChanges('espoo-prod', 'espoo', version, previous, []);

      expect(events).toHaveLength(0);
    });

    it('should detect change on first run when previous is undefined', () => {
      const sha = 'aabbccdd11223344556677889900aabbccddeeff';

      const version = makeVersionSnapshot({
        coreCommit: makeCommitInfo(sha),
      });

      const events = detectChanges('espoo-prod', 'espoo', version, undefined, []);

      expect(events).toHaveLength(1);
      expect(events[0].repoType).toBe('core');
      expect(events[0].previousCommit).toBeNull();
      expect(events[0].newCommit.sha).toBe(sha);
    });

    it('should detect changes in both wrapper and core simultaneously', () => {
      const newWrapperSha = 'aaaa000000000000000000000000000000000000';
      const newCoreSha = 'bbbb000000000000000000000000000000000000';
      const prevWrapperSha = 'cccc000000000000000000000000000000000000';
      const prevCoreSha = 'dddd000000000000000000000000000000000000';

      const version = makeVersionSnapshot({
        wrapperCommit: makeCommitInfo(newWrapperSha),
        coreCommit: makeCommitInfo(newCoreSha),
      });

      const previous: PreviousVersionEntry = {
        wrapperSha: prevWrapperSha,
        coreSha: prevCoreSha,
      };

      const prs = [makePR(10, 'wrapper'), makePR(20, 'core')];

      const events = detectChanges('tampere-prod', 'tampere-region', version, previous, prs);

      expect(events).toHaveLength(2);

      const wrapperEvent = events.find((e) => e.repoType === 'wrapper');
      const coreEvent = events.find((e) => e.repoType === 'core');

      expect(wrapperEvent).toBeDefined();
      expect(wrapperEvent!.newCommit.sha).toBe(newWrapperSha);
      expect(wrapperEvent!.previousCommit?.sha).toBe(prevWrapperSha);
      expect(wrapperEvent!.includedPRs).toHaveLength(1);
      expect(wrapperEvent!.includedPRs[0].number).toBe(10);

      expect(coreEvent).toBeDefined();
      expect(coreEvent!.newCommit.sha).toBe(newCoreSha);
      expect(coreEvent!.previousCommit?.sha).toBe(prevCoreSha);
      expect(coreEvent!.includedPRs).toHaveLength(1);
      expect(coreEvent!.includedPRs[0].number).toBe(20);
    });

    it('should produce no events when status is unavailable', () => {
      const version = makeVersionSnapshot({
        status: 'unavailable',
        coreCommit: null,
      });

      const previous: PreviousVersionEntry = {
        wrapperSha: null,
        coreSha: 'aabbccdd11223344556677889900aabbccddeeff',
      };

      const events = detectChanges('espoo-prod', 'espoo', version, previous, []);

      expect(events).toHaveLength(0);
    });

    it('should include branch info when branchInfoByRepoType is provided', () => {
      const newCoreSha = 'aabbccdd11223344556677889900aabbccddeeff';
      const prevCoreSha = '1122334455667788990011223344556677889900';

      const version = makeVersionSnapshot({
        coreCommit: makeCommitInfo(newCoreSha),
      });

      const previous: PreviousVersionEntry = {
        wrapperSha: null,
        coreSha: prevCoreSha,
      };

      const events = detectChanges('espoo-staging', 'espoo', version, previous, [], {
        core: { isDefaultBranch: false, branch: 'feature/test' },
      });

      expect(events).toHaveLength(1);
      expect(events[0].isDefaultBranch).toBe(false);
      expect(events[0].branch).toBe('feature/test');
    });

    it('should not include branch fields when branchInfoByRepoType is not provided', () => {
      const newCoreSha = 'aabbccdd11223344556677889900aabbccddeeff';
      const prevCoreSha = '1122334455667788990011223344556677889900';

      const version = makeVersionSnapshot({
        coreCommit: makeCommitInfo(newCoreSha),
      });

      const previous: PreviousVersionEntry = {
        wrapperSha: null,
        coreSha: prevCoreSha,
      };

      const events = detectChanges('espoo-prod', 'espoo', version, previous, []);

      expect(events).toHaveLength(1);
      expect(events[0].isDefaultBranch).toBeUndefined();
      expect(events[0].branch).toBeUndefined();
    });

    it('should include branch info for both wrapper and core when provided', () => {
      const newWrapperSha = 'aaaa000000000000000000000000000000000000';
      const newCoreSha = 'bbbb000000000000000000000000000000000000';
      const prevWrapperSha = 'cccc000000000000000000000000000000000000';
      const prevCoreSha = 'dddd000000000000000000000000000000000000';

      const version = makeVersionSnapshot({
        wrapperCommit: makeCommitInfo(newWrapperSha),
        coreCommit: makeCommitInfo(newCoreSha),
      });

      const previous: PreviousVersionEntry = {
        wrapperSha: prevWrapperSha,
        coreSha: prevCoreSha,
      };

      const events = detectChanges('tampere-staging', 'tampere-region', version, previous, [], {
        core: { isDefaultBranch: false, branch: 'feature/core-test' },
        wrapper: { isDefaultBranch: true },
      });

      expect(events).toHaveLength(2);

      const wrapperEvent = events.find((e) => e.repoType === 'wrapper');
      expect(wrapperEvent!.isDefaultBranch).toBe(true);
      expect(wrapperEvent!.branch).toBeUndefined();

      const coreEvent = events.find((e) => e.repoType === 'core');
      expect(coreEvent!.isDefaultBranch).toBe(false);
      expect(coreEvent!.branch).toBe('feature/core-test');
    });
  });

  describe('buildUpdatedPrevious', () => {
    it('should correctly update entries with new version data', () => {
      const previous: PreviousData = {
        checkedAt: '2026-03-01T10:00:00Z',
        versions: {
          'espoo-prod': { wrapperSha: null, coreSha: 'old-sha' },
        },
      };

      const newCoreSha = 'new-core-sha-00000000000000000000000000';
      const newWrapperSha = 'new-wrapper-sha-000000000000000000000000';

      const version = makeVersionSnapshot({
        status: 'ok',
        wrapperCommit: makeCommitInfo(newWrapperSha),
        coreCommit: makeCommitInfo(newCoreSha),
      });

      const result = buildUpdatedPrevious(previous, 'tampere-prod', version);

      expect(result.versions['espoo-prod']).toEqual({ wrapperSha: null, coreSha: 'old-sha' });
      expect(result.versions['tampere-prod']).toEqual({
        wrapperSha: newWrapperSha,
        coreSha: newCoreSha,
      });
    });

    it('should not update previous data when version status is not ok', () => {
      const previous: PreviousData = {
        checkedAt: '2026-03-01T10:00:00Z',
        versions: {
          'espoo-prod': { wrapperSha: null, coreSha: 'existing-sha' },
        },
      };

      const version = makeVersionSnapshot({
        status: 'unavailable',
        coreCommit: null,
      });

      const result = buildUpdatedPrevious(previous, 'espoo-prod', version);

      expect(result).toBe(previous); // Returns the same object reference
    });
  });
});
