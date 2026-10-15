import {
  FIVE_MINUTES,
  HOUR,
  RANGES,
  parseRange,
  rangeWindow,
  bucketSizeForRange,
  extractSeries,
  aggregateCounters,
  combineGaugeSummaries,
  aggregateGaugeSummaries,
  localTicks,
  type GaugeSummary,
  type Point,
} from '../../site/js/metrics/series.js';

const T0 = Date.parse('2026-10-06T00:00:00Z');
const iso = (ms: number) => new Date(ms).toISOString().replace('.000Z', 'Z');

describe('parseRange', () => {
  it('accepts the known ranges', () => {
    expect(parseRange('24h').key).toBe('24h');
    expect(parseRange('7d').key).toBe('7d');
    expect(parseRange('14d').key).toBe('14d');
  });

  it('falls back to 14 days for a missing or unknown value', () => {
    expect(parseRange(null).key).toBe('14d');
    expect(parseRange('3y').key).toBe('14d');
  });
});

describe('rangeWindow and bucketSizeForRange', () => {
  it('ends the window at now', () => {
    expect(rangeWindow(RANGES['24h'], T0)).toEqual({ from: T0 - 24 * HOUR, to: T0 });
  });

  it('uses 5-minute buckets up to 2 days and hourly buckets above that', () => {
    expect(bucketSizeForRange(RANGES['24h'])).toBe(FIVE_MINUTES);
    expect(bucketSizeForRange(RANGES['7d'])).toBe(HOUR);
  });
});

describe('extractSeries', () => {
  const slots = [
    { t: iso(T0), a: 1 },
    // slot exists but lacks the key: a gap in series a
    { t: iso(T0 + FIVE_MINUTES), b: 7 },
    { t: iso(T0 + 3 * FIVE_MINUTES), a: 0 },
  ];

  it('returns one point per 5-minute bucket with null for gaps', () => {
    expect(extractSeries(slots, 'a', T0, T0 + 4 * FIVE_MINUTES)).toEqual([
      { t: T0, value: 1 },
      { t: T0 + FIVE_MINUTES, value: null },
      { t: T0 + 2 * FIVE_MINUTES, value: null },
      { t: T0 + 3 * FIVE_MINUTES, value: 0 },
    ]);
  });

  it('starts from the bucket that contains from', () => {
    const points = extractSeries(slots, 'a', T0 + 60_000, T0 + 2 * FIVE_MINUTES);
    expect(points.map((p) => p.t)).toEqual([T0, T0 + FIVE_MINUTES]);
  });
});

describe('aggregateCounters', () => {
  const pointsFor = (values: (number | null)[]): Point<number>[] =>
    values.map((value, i) => ({ t: T0 + i * FIVE_MINUTES, value }));

  it('adds the values of each hour', () => {
    const points = pointsFor([...Array(12).fill(2), 5]);
    expect(aggregateCounters(points, HOUR)).toEqual([
      { t: T0, value: 24 },
      { t: T0 + HOUR, value: 5 },
    ]);
  });

  it('keeps a zero hour as zero, not as a gap', () => {
    expect(aggregateCounters(pointsFor(Array(12).fill(0)), HOUR)).toEqual([{ t: T0, value: 0 }]);
  });

  it('makes an hour a gap only when every bucket in it is unknown', () => {
    const points = pointsFor([...Array(12).fill(null), null, 3]);
    expect(aggregateCounters(points, HOUR)).toEqual([
      { t: T0, value: null },
      { t: T0 + HOUR, value: 3 },
    ]);
  });
});

describe('combineGaugeSummaries', () => {
  it('takes min of mins, max of maxes and the mean weighted by n', () => {
    expect(
      combineGaugeSummaries([
        { min: 5, mean: 10, max: 20, n: 1 },
        { min: 2, mean: 40, max: 60, n: 3 },
      ])
    ).toEqual({ min: 2, mean: 32.5, max: 60, n: 4 });
  });

  it('returns null for no summaries', () => {
    expect(combineGaugeSummaries([])).toBeNull();
  });

  it('falls back to a plain mean when no summary has samples', () => {
    expect(
      combineGaugeSummaries([
        { min: 1, mean: 2, max: 3, n: 0 },
        { min: 1, mean: 4, max: 5, n: 0 },
      ])?.mean
    ).toBe(3);
  });
});

describe('aggregateGaugeSummaries', () => {
  it('skips gaps inside the hour', () => {
    const s: GaugeSummary = { min: 1, mean: 2, max: 3, n: 5 };
    const points: Point<GaugeSummary>[] = [
      { t: T0, value: s },
      { t: T0 + FIVE_MINUTES, value: null },
      { t: T0 + HOUR, value: null },
    ];
    expect(aggregateGaugeSummaries(points, HOUR)).toEqual([
      { t: T0, value: s },
      { t: T0 + HOUR, value: null },
    ]);
  });
});

describe('localTicks', () => {
  // Local-time constructors keep these stable in any host timezone.
  it('puts a tick every 3 local hours for 24 hours', () => {
    const from = new Date(2026, 9, 5, 13, 20).getTime();
    const ticks = localTicks(RANGES['24h'], from, from + 24 * HOUR);
    expect(ticks.map((t) => t.label)).toEqual([
      '15.00', '18.00', '21.00', '00.00', '03.00', '06.00', '09.00', '12.00',
    ]);
    expect(new Date(ticks[0].t).getHours()).toBe(15);
  });

  it('puts a tick at each local midnight for 7 days', () => {
    const from = new Date(2026, 9, 1, 13, 0).getTime();
    const ticks = localTicks(RANGES['7d'], from, from + RANGES['7d'].ms);
    expect(ticks.map((t) => t.label)).toEqual(['2.10.', '3.10.', '4.10.', '5.10.', '6.10.', '7.10.', '8.10.']);
    expect(ticks.every((t) => new Date(t.t).getHours() === 0)).toBe(true);
  });

  it('puts a tick at every other local midnight for 14 days', () => {
    const from = new Date(2026, 9, 1, 13, 0).getTime();
    const ticks = localTicks(RANGES['14d'], from, from + RANGES['14d'].ms);
    expect(ticks.map((t) => t.label)).toEqual(['3.10.', '5.10.', '7.10.', '9.10.', '11.10.', '13.10.', '15.10.']);
  });
});
