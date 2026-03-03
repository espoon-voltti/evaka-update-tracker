import * as fs from 'fs';
import { readHistory, appendEvents, pruneOldEvents, writeHistory } from '../../src/services/history-manager';
import { DeploymentEvent, HistoryData } from '../../src/types';

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
