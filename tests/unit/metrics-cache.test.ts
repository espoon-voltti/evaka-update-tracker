import { loadMetrics, peekMetrics, invalidateMetrics, REFRESH_INTERVAL } from '../../site/js/metrics/cache.js';
import { MetricsError, type DayFile } from '../../site/js/metrics/client.js';
import { RANGES } from '../../site/js/metrics/series.js';

const NOW = Date.parse('2026-10-06T12:00:00Z');
const range = RANGES['24h'];

function fakeFetch(files: Record<string, DayFile | null>) {
  const calls: { from: number; to: number }[] = [];
  const fn = async (_cityId: string, from: number, to: number) => {
    calls.push({ from, to });
    return new Map(Object.entries(files));
  };
  return { fn, calls };
}

describe('loadMetrics', () => {
  beforeEach(() => invalidateMetrics('espoo'));

  it('fetches the full range first, then nothing within the refresh interval', async () => {
    const { fn, calls } = fakeFetch({
      '5min/2026/10/06.json': { series: {}, slots: [{ t: '2026-10-06T11:00:00Z', x: 1 }] },
    });
    const first = await loadMetrics('espoo', range, { now: NOW, fetchFiles: fn });
    expect(calls).toEqual([{ from: NOW - range.ms, to: NOW }]);
    expect(first.data?.slots).toHaveLength(1);

    const second = await loadMetrics('espoo', range, { now: NOW + REFRESH_INTERVAL - 1, fetchFiles: fn });
    expect(calls).toHaveLength(1);
    expect(second).toBe(first);
    expect(peekMetrics('espoo', range)).toBe(first);
  });

  it('refetches only the current UTC day after the interval', async () => {
    const { fn, calls } = fakeFetch({});
    await loadMetrics('espoo', range, { now: NOW, fetchFiles: fn });
    await loadMetrics('espoo', range, { now: NOW + REFRESH_INTERVAL, fetchFiles: fn });
    expect(calls[1]).toEqual({ from: Date.parse('2026-10-06T00:00:00Z'), to: NOW + REFRESH_INTERVAL });
  });

  it('refetches the previous day too when the UTC day has changed', async () => {
    const { fn, calls } = fakeFetch({});
    const lateEvening = Date.parse('2026-10-06T23:58:00Z');
    await loadMetrics('espoo', range, { now: lateEvening, fetchFiles: fn });
    await loadMetrics('espoo', range, { now: lateEvening + REFRESH_INTERVAL, fetchFiles: fn });
    expect(calls[1].from).toBe(Date.parse('2026-10-06T00:00:00Z'));
  });

  it('keeps the last data and success time when a refresh fails', async () => {
    const { fn } = fakeFetch({ '5min/2026/10/06.json': { slots: [{ t: '2026-10-06T11:00:00Z' }] } });
    await loadMetrics('espoo', range, { now: NOW, fetchFiles: fn });
    const failing = async () => {
      throw new MetricsError('unavailable', 'HTTP 503');
    };
    const state = await loadMetrics('espoo', range, { now: NOW + REFRESH_INTERVAL, fetchFiles: failing });
    expect(state.error).toMatchObject({ kind: 'unavailable' });
    expect(state.lastSuccessAt).toBe(NOW);
    expect(state.data?.slots).toHaveLength(1);
  });

  it('fetches again at once after invalidation', async () => {
    const { fn, calls } = fakeFetch({});
    await loadMetrics('espoo', range, { now: NOW, fetchFiles: fn });
    invalidateMetrics('espoo');
    expect(peekMetrics('espoo', range)).toBeNull();
    await loadMetrics('espoo', range, { now: NOW + 1, fetchFiles: fn });
    expect(calls).toHaveLength(2);
  });
});
