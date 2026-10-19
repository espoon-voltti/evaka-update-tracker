import {
  FIVE_MINUTES,
  HOUR,
  RANGES,
  RANGE_6H,
  parseRange,
  rangeWindow,
  bucketSizeForRange,
  extractSeries,
  aggregateCounters,
  combineGaugeSummaries,
  aggregateGaugeSummaries,
  localTicks,
  totalOf,
  lastKnownPoint,
  contiguousRuns,
  sumSeries,
  ratioSeries,
  ratioOfTotals,
  differenceSeries,
  differenceOfTotals,
  histogramBounds,
  aggregateHistograms,
  totalHistogram,
  histogramPercentile,
  percentileSeries,
  breakdownKeys,
  labelValue,
  breakdownTotals,
  topEntries,
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

  it('does not offer the 6-hour range of the overview', () => {
    expect(parseRange('6h').key).toBe('14d');
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
  it('puts a tick every 2 local hours for 6 hours', () => {
    const from = new Date(2026, 9, 5, 7, 55).getTime();
    const ticks = localTicks(RANGE_6H, from, from + RANGE_6H.ms);
    expect(ticks.map((t) => t.label)).toEqual(['08.00', '10.00', '12.00']);
  });

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

describe('totalOf', () => {
  it('adds the known values and skips gaps', () => {
    const points = [
      { t: T0, value: 3 },
      { t: T0 + FIVE_MINUTES, value: null },
      { t: T0 + 2 * FIVE_MINUTES, value: 0 },
      { t: T0 + 3 * FIVE_MINUTES, value: 4 },
    ];
    expect(totalOf(points)).toBe(7);
  });

  it('is zero when every point is a gap', () => {
    expect(totalOf([{ t: T0, value: null }])).toBe(0);
  });
});

describe('lastKnownPoint', () => {
  it('skips trailing gaps', () => {
    const points = [
      { t: T0, value: 1 },
      { t: T0 + FIVE_MINUTES, value: 2 },
      { t: T0 + 2 * FIVE_MINUTES, value: null },
    ];
    expect(lastKnownPoint(points)).toEqual({ t: T0 + FIVE_MINUTES, value: 2 });
  });

  it('returns a zero value, not a gap', () => {
    expect(lastKnownPoint([{ t: T0, value: 0 }])).toEqual({ t: T0, value: 0 });
  });

  it('returns null when every point is a gap', () => {
    expect(lastKnownPoint([{ t: T0, value: null }])).toBeNull();
    expect(lastKnownPoint([])).toBeNull();
  });
});

describe('contiguousRuns', () => {
  it('splits at gaps and drops them', () => {
    const p = (i: number, value: number | null) => ({ t: T0 + i * FIVE_MINUTES, value });
    expect(contiguousRuns([p(0, null), p(1, 1), p(2, 2), p(3, null), p(4, null), p(5, 0)])).toEqual([
      [p(1, 1), p(2, 2)],
      [p(5, 0)],
    ]);
  });
});

const at = (i: number) => T0 + i * FIVE_MINUTES;
const pointsOf = <T>(values: (T | null)[]): Point<T>[] => values.map((value, i) => ({ t: at(i), value }));

describe('sumSeries', () => {
  it('adds aligned points and treats a gap in one list as nothing', () => {
    expect(sumSeries([pointsOf([1, null, null]), pointsOf([2, 3, null])])).toEqual(pointsOf([3, 3, null]));
  });
});

describe('ratioSeries and ratioOfTotals', () => {
  it('divides point by point', () => {
    expect(ratioSeries(pointsOf([1, 0]), pointsOf([4, 10]))).toEqual(pointsOf([0.25, 0]));
  });

  it('gives null for a zero denominator and for a gap', () => {
    expect(ratioSeries(pointsOf([0, 1, null]), pointsOf([0, null, 5]))).toEqual(pointsOf([null, null, null]));
  });

  it('divides the totals over the range, skipping gaps', () => {
    expect(ratioOfTotals(pointsOf([1, null, 2]), pointsOf([10, null, 20]))).toBe(0.1);
  });

  it('gives null when the denominator total is 0', () => {
    expect(ratioOfTotals(pointsOf([0, null]), pointsOf([0, null]))).toBeNull();
  });
});

describe('differenceSeries', () => {
  it('subtracts point by point, not below 0, and keeps gaps', () => {
    expect(differenceSeries(pointsOf([5, 1, null, 3]), pointsOf([2, 4, 1, null]))).toEqual(
      pointsOf([3, 0, null, null])
    );
  });
});

describe('differenceOfTotals', () => {
  it('subtracts the totals before it clamps at 0, skipping points where either side is a gap', () => {
    // Point by point, the clamped differences would add up to 3.
    expect(differenceOfTotals(pointsOf([3, 0, 9, null]), pointsOf([0, 2, null, 4]))).toBe(1);
  });

  it('is 0 when b is larger in total', () => {
    expect(differenceOfTotals(pointsOf([1, 0]), pointsOf([0, 5]))).toBe(0);
  });
});

describe('histogramBounds', () => {
  it('reads the bounds of a histogram from the series metadata', () => {
    const meta = { 'a.responseTime': { type: 'histogram', bounds: [1, 2, 4] }, 'a.count': { type: 'counter' } };
    expect(histogramBounds(meta, 'a.responseTime')).toEqual([1, 2, 4]);
  });

  it('gives null for another type or a missing series', () => {
    const meta = { 'a.count': { type: 'counter' } };
    expect(histogramBounds(meta, 'a.count')).toBeNull();
    expect(histogramBounds(meta, 'b')).toBeNull();
    expect(histogramBounds(undefined, 'b')).toBeNull();
  });
});

describe('aggregateHistograms and totalHistogram', () => {
  it('adds the counts of each hour', () => {
    const points = pointsOf([...Array(12).fill([1, 2, 0]), [0, 0, 5]]);
    expect(aggregateHistograms(points, HOUR)).toEqual([
      { t: T0, value: [12, 24, 0] },
      { t: T0 + HOUR, value: [0, 0, 5] },
    ]);
  });

  it('makes an hour a gap only when every histogram in it is unknown', () => {
    const points = pointsOf([...Array(12).fill(null), null, [0, 0, 0]]);
    expect(aggregateHistograms(points, HOUR)).toEqual([
      { t: T0, value: null },
      { t: T0 + HOUR, value: [0, 0, 0] },
    ]);
  });

  it('adds the counts of any range and skips gaps', () => {
    expect(totalHistogram(pointsOf([[1, 0, 2], null, [0, 3, 0]]))).toEqual([1, 3, 2]);
  });

  it('gives null when every point is a gap', () => {
    expect(totalHistogram(pointsOf([null, null]))).toBeNull();
  });
});

describe('histogramPercentile', () => {
  // Counts: [< 10, 10..100, 100..1000, >= 1000].
  const bounds = [10, 100, 1000];

  it('interpolates linearly inside the bucket', () => {
    expect(histogramPercentile([0, 10, 0, 0], bounds, 50)).toBe(55);
    // Rank 19 of 20 is the 9th of the 10 values in the second bucket.
    expect(histogramPercentile([10, 10, 0, 0], bounds, 95)).toBeCloseTo(91);
  });

  it('starts the first bucket from 0 when all counts are in it', () => {
    expect(histogramPercentile([4, 0, 0, 0], bounds, 50)).toBe(5);
    expect(histogramPercentile([4, 0, 0, 0], bounds, 95)).toBe(9.5);
  });

  it('gives the lower bound of the last bucket when all counts are in it', () => {
    expect(histogramPercentile([0, 0, 0, 7], bounds, 50)).toBe(1000);
    expect(histogramPercentile([0, 0, 0, 7], bounds, 95)).toBe(1000);
  });

  it('gives the lower bound of the last bucket when the percentile falls in it', () => {
    expect(histogramPercentile([90, 0, 0, 10], bounds, 95)).toBe(1000);
  });

  it('gives null for an empty histogram', () => {
    expect(histogramPercentile([0, 0, 0, 0], bounds, 50)).toBeNull();
    expect(histogramPercentile([], bounds, 50)).toBeNull();
  });

  it('uses the bounds it is given', () => {
    expect(histogramPercentile([0, 10, 0, 0], [2, 4, 8], 50)).toBe(3);
  });
});

describe('percentileSeries', () => {
  it('keeps gaps and gives null for a bucket without values', () => {
    expect(percentileSeries(pointsOf([[0, 2], null, [0, 0]]), [10], 50)).toEqual(pointsOf([10, null, null]));
  });
});

describe('open-ended breakdowns', () => {
  const FAMILY = 'job.failed';
  const A = 'job.failed{type=A}';
  const B = 'job.failed{type=B}';
  const slots = [
    { t: iso(at(0)), [FAMILY]: 3, [A]: 3 },
    { t: iso(at(1)), [FAMILY]: 2, [B]: 2 },
    // the slot exists but the source did not cover it: a gap
    { t: iso(at(2)), other: 1 },
    { t: iso(at(4)), [FAMILY]: 5, [A]: 1, [B]: 4 },
  ];

  it('finds the keys of the family', () => {
    expect(breakdownKeys([...slots, { t: iso(at(5)), 'job.failedOther{type=C}': 1 }], FAMILY)).toEqual([A, B]);
  });

  it('reads the label value', () => {
    expect(labelValue(A)).toBe('A');
    expect(labelValue('x{type=a=b}')).toBe('a=b');
  });

  it('adds up each key over the range', () => {
    expect(breakdownTotals(slots, FAMILY, at(1), at(5))).toEqual(
      new Map([
        ['A', 1],
        ['B', 6],
      ])
    );
  });
});

describe('topEntries', () => {
  const totals = new Map([
    ['c', 2],
    ['a', 5],
    ['b', 2],
    ['zero', 0],
    ['d', 1],
  ]);

  it('gives the largest totals first and orders equal totals by key', () => {
    expect(topEntries(totals, 3)).toEqual([
      ['a', 5],
      ['b', 2],
      ['c', 2],
    ]);
  });

  it('leaves out zero totals', () => {
    expect(topEntries(totals, 10).map(([key]) => key)).toEqual(['a', 'b', 'c', 'd']);
  });
});
