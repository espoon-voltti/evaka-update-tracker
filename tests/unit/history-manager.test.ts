import * as fs from 'fs';
import { readHistory, appendEvents, pruneOldEvents, writeHistory, backfillBranchInfo } from '../../src/services/history-manager';
import { DeploymentEvent, HistoryData, Repository } from '../../src/types';

jest.mock('fs');

const mockedFs = jest.mocked(fs);

const makeEvent = (id: string, detectedAt: string): DeploymentEvent => ({
  id,
  environmentId: 'espoo-prod',
  cityGroupId: 'espoo',
  detectedAt,
  previousCommit: null,
  newCommit: {
    sha: 'abc123def',
    shortSha: 'abc123d',
    message: 'Test commit',
    date: detectedAt,
    author: 'dev1',
  },
  includedPRs: [],
  repoType: 'core',
});

describe('readHistory', () => {
  it('parses valid history JSON', () => {
    const data: HistoryData = { events: [makeEvent('e1', '2026-03-01T00:00:00Z')] };
    mockedFs.readFileSync.mockReturnValue(JSON.stringify(data));

    const result = readHistory('/data/history.json');
    expect(result.events).toHaveLength(1);
    expect(result.events[0].id).toBe('e1');
  });

  it('returns empty history when file does not exist', () => {
    mockedFs.readFileSync.mockImplementation(() => {
      throw new Error('ENOENT');
    });

    const result = readHistory('/data/history.json');
    expect(result.events).toHaveLength(0);
  });
});

describe('appendEvents', () => {
  it('prepends new events to existing history', () => {
    const existing: HistoryData = {
      events: [makeEvent('e1', '2026-03-01T00:00:00Z')],
    };
    const newEvents = [makeEvent('e2', '2026-03-02T00:00:00Z')];

    const result = appendEvents(existing, newEvents);
    expect(result.events).toHaveLength(2);
    expect(result.events[0].id).toBe('e2'); // new event first
    expect(result.events[1].id).toBe('e1');
  });

  it('appends to empty history', () => {
    const existing: HistoryData = { events: [] };
    const newEvents = [makeEvent('e1', '2026-03-02T00:00:00Z')];

    const result = appendEvents(existing, newEvents);
    expect(result.events).toHaveLength(1);
  });
});

describe('pruneOldEvents', () => {
  it('removes events older than 1 month', () => {
    const now = Date.now();
    const recentDate = new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(); // 5 days ago
    const oldDate = new Date(now - 45 * 24 * 60 * 60 * 1000).toISOString(); // 45 days ago

    const history: HistoryData = {
      events: [
        makeEvent('recent', recentDate),
        makeEvent('old', oldDate),
      ],
    };

    const result = pruneOldEvents(history);
    expect(result.events).toHaveLength(1);
    expect(result.events[0].id).toBe('recent');
  });

  it('preserves events within 1 month', () => {
    const now = Date.now();
    const date1 = new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString();
    const date2 = new Date(now - 20 * 24 * 60 * 60 * 1000).toISOString();

    const history: HistoryData = {
      events: [makeEvent('e1', date1), makeEvent('e2', date2)],
    };

    const result = pruneOldEvents(history);
    expect(result.events).toHaveLength(2);
  });
});

describe('writeHistory', () => {
  it('writes JSON to file', () => {
    const history: HistoryData = {
      events: [makeEvent('e1', '2026-03-01T00:00:00Z')],
    };

    writeHistory('/data/history.json', history);
    expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
      '/data/history.json',
      expect.stringContaining('"events"')
    );
  });
});

describe('backfillBranchInfo', () => {
  const testRepo: Repository = {
    owner: 'espoon-voltti',
    name: 'evaka',
    type: 'core',
    submodulePath: null,
    defaultBranch: 'master',
  };

  const makeStagingEvent = (id: string, detectedAt: string, overrides: Partial<DeploymentEvent> = {}): DeploymentEvent => ({
    ...makeEvent(id, detectedAt),
    environmentId: 'espoo-staging',
    ...overrides,
  });

  it('enriches events with undefined isDefaultBranch', async () => {
    const event = makeStagingEvent('s1', '2026-03-01T00:00:00Z');
    const history: HistoryData = { events: [event] };

    const mockDetect = jest.fn().mockResolvedValue({ onDefaultBranch: true, branchName: null });

    const count = await backfillBranchInfo(history, mockDetect, [testRepo]);

    expect(count).toBe(1);
    expect(event.isDefaultBranch).toBe(true);
    expect(mockDetect).toHaveBeenCalledWith('espoon-voltti', 'evaka', 'master', 'abc123def');
  });

  it('skips events that already have isDefaultBranch', async () => {
    const event = makeStagingEvent('s1', '2026-03-01T00:00:00Z', { isDefaultBranch: false, branch: 'feature/x' });
    const history: HistoryData = { events: [event] };

    const mockDetect = jest.fn();

    const count = await backfillBranchInfo(history, mockDetect, [testRepo]);

    expect(count).toBe(0);
    expect(mockDetect).not.toHaveBeenCalled();
  });

  it('sets isDefaultBranch=true for production events without calling API', async () => {
    const event = makeEvent('p1', '2026-03-01T00:00:00Z'); // environmentId: 'espoo-prod'
    const history: HistoryData = { events: [event] };

    const mockDetect = jest.fn();

    const count = await backfillBranchInfo(history, mockDetect, [testRepo]);

    expect(count).toBe(1);
    expect(event.isDefaultBranch).toBe(true);
    expect(mockDetect).not.toHaveBeenCalled();
  });

  it('sets branch name when detection finds a non-default branch', async () => {
    const event = makeStagingEvent('s1', '2026-03-01T00:00:00Z');
    const history: HistoryData = { events: [event] };

    const mockDetect = jest.fn().mockResolvedValue({ onDefaultBranch: false, branchName: 'feature/test' });

    await backfillBranchInfo(history, mockDetect, [testRepo]);

    expect(event.isDefaultBranch).toBe(false);
    expect(event.branch).toBe('feature/test');
  });

  it('leaves event unchanged when detection throws', async () => {
    const event = makeStagingEvent('s1', '2026-03-01T00:00:00Z');
    const history: HistoryData = { events: [event] };

    const mockDetect = jest.fn().mockRejectedValue(new Error('API failure'));

    const count = await backfillBranchInfo(history, mockDetect, [testRepo]);

    expect(count).toBe(0);
    expect(event.isDefaultBranch).toBeUndefined();
  });

  it('returns correct count of updated events', async () => {
    const events = [
      makeStagingEvent('s1', '2026-03-01T00:00:00Z'),
      makeStagingEvent('s2', '2026-03-02T00:00:00Z', { isDefaultBranch: true }), // already has info
      makeEvent('p1', '2026-03-03T00:00:00Z'), // production event
    ];
    const history: HistoryData = { events };

    const mockDetect = jest.fn().mockResolvedValue({ onDefaultBranch: true, branchName: null });

    const count = await backfillBranchInfo(history, mockDetect, [testRepo]);

    expect(count).toBe(2); // s1 + p1 updated, s2 skipped
    expect(mockDetect).toHaveBeenCalledTimes(1); // Only s1 calls API, p1 is production (no API call)
  });
});
