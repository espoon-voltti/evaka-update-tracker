import {
  WIDTH,
  HEIGHT,
  stackedBarGeometry,
  bandGeometry,
  renderStackedBarSparkline,
  renderBandSparkline,
} from '../../site/js/components/sparkline.js';
import { FIVE_MINUTES } from '../../site/js/metrics/series.js';

const T0 = Date.parse('2026-10-06T06:00:00Z');
const at = (i: number) => T0 + i * FIVE_MINUTES;
const windowOf = (buckets: number) => ({ from: T0, to: at(buckets), stepMs: FIVE_MINUTES });

describe('stackedBarGeometry', () => {
  // Four buckets, 72 units wide each; the largest total (4) fills the height.
  const points = [
    { t: at(0), values: [2, 1] },
    { t: at(1), values: [null, null] },
    { t: at(2), values: [0, 0] },
    { t: at(3), values: [4, null] },
  ];

  it('stacks the values from the bottom and scales to the largest total', () => {
    expect(stackedBarGeometry(points, windowOf(4)).bars).toEqual([
      { series: 0, x: 0, width: 72, y: 20, height: 20 },
      { series: 1, x: 0, width: 72, y: 10, height: 10 },
      { series: 0, x: 216, width: 72, y: 0, height: HEIGHT },
    ]);
  });

  it('breaks the baseline at a gap but not at a bucket of zeros', () => {
    expect(stackedBarGeometry(points, windowOf(4)).baselines).toEqual([
      { x1: 0, x2: 72 },
      { x1: 144, x2: WIDTH },
    ]);
  });

  it('draws no bars and a full baseline when every count is zero', () => {
    const zeros = [0, 1, 2].map((i) => ({ t: at(i), values: [0, 0] }));
    expect(stackedBarGeometry(zeros, windowOf(3))).toEqual({ bars: [], baselines: [{ x1: 0, x2: WIDTH }] });
  });

  it('draws nothing when every bucket is a gap', () => {
    const gaps = [{ t: at(0), values: [null, null] }];
    expect(stackedBarGeometry(gaps, windowOf(1))).toEqual({ bars: [], baselines: [] });
  });
});

describe('bandGeometry', () => {
  const summary = (min: number, mean: number, max: number) => ({ min, mean, max, n: 5 });

  it('splits at gaps and spans a single bucket from edge to edge', () => {
    // Three buckets, 96 units wide each, on a 0 to 100 scale (40 units high).
    const points = [
      { t: at(0), value: summary(10, 20, 30) },
      { t: at(1), value: null },
      { t: at(2), value: summary(0, 50, 100) },
    ];
    const runs = bandGeometry(points, { ...windowOf(3), yMax: 100 });
    expect(runs).toHaveLength(2);
    expect(runs[0].mean).toEqual([
      [0, 32],
      [48, 32],
      [96, 32],
    ]);
    expect(runs[0].band).toEqual([
      [0, 28],
      [48, 28],
      [96, 28],
      [96, 36],
      [48, 36],
      [0, 36],
    ]);
    expect(runs[1].mean.map(([x]) => x)).toEqual([192, 240, WIDTH]);
    expect(runs[1].band.map(([, y]) => y)).toEqual([0, 0, 0, HEIGHT, HEIGHT, HEIGHT]);
  });

  it('puts the mean line through the bucket middles of a longer run', () => {
    const points = [0, 1, 2, 3].map((i) => ({ t: at(i), value: summary(0, i * 10, 100) }));
    const [run] = bandGeometry(points, { ...windowOf(4), yMax: 100 });
    expect(run.mean).toEqual([
      [0, 40],
      [36, 40],
      [108, 36],
      [180, 32],
      [252, 28],
      [288, 28],
    ]);
  });
});

describe('sparkline rendering', () => {
  it('gives the SVG an escaped title as its name', () => {
    const svg = renderStackedBarSparkline({
      points: [{ t: at(0), values: [1, 1] }],
      ...windowOf(1),
      classNames: ['bar-strong', 'bar-weak'],
      title: 'a < b',
    });
    expect(svg).toMatch(/^<svg class="sparkline" [^>]*role="img"><title>a &lt; b<\/title>/);
    expect(svg.match(/<rect class="bar-strong"/g)).toHaveLength(1);
    expect(svg.match(/<rect class="bar-weak"/g)).toHaveLength(1);
  });

  it('draws a band and a mean line for each run', () => {
    const svg = renderBandSparkline({
      points: [
        { t: at(0), value: { min: 1, mean: 2, max: 3, n: 1 } },
        { t: at(1), value: null },
        { t: at(2), value: { min: 1, mean: 2, max: 3, n: 1 } },
      ],
      ...windowOf(3),
      yMax: 100,
      title: 'cpu',
    });
    expect(svg.match(/<polygon class="band-range"/g)).toHaveLength(2);
    expect(svg.match(/<polyline class="band-mean"/g)).toHaveLength(2);
  });
});
