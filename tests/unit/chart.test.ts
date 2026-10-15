import { renderLineChart, renderStackedBarChart } from '../../site/js/components/chart.js';
import { FIVE_MINUTES } from '../../site/js/metrics/series.js';

const T0 = Date.parse('2026-10-06T06:00:00Z');
const at = (i: number) => T0 + i * FIVE_MINUTES;

function render(values: (number | null)[][], logScale = false) {
  const html = renderLineChart({
    points: values.map((v, i) => ({ t: at(i), values: v })),
    series: [
      { label: 'A', className: 'cat-1' },
      { label: 'B', className: 'cat-2' },
    ],
    stepMs: FIVE_MINUTES,
    from: at(0),
    to: at(values.length),
    ticks: [],
    unit: ' ms',
    logScale,
    ariaLabel: 'Vasteaika <p95>',
    formatTooltip: (p) => `tooltip ${p.t}`,
  });
  return html;
}

const count = (html: string, pattern: RegExp) => html.match(new RegExp(pattern, 'g'))?.length ?? 0;

function yLabels(html: string) {
  const yAxis = /chart-axis-y[^>]*>(.*?)<\/div>/.exec(html)![1];
  return [...yAxis.matchAll(/>([^<]+)</g)].map((m) => m[1]);
}

describe('renderLineChart', () => {
  // Series A: 1, 2, gap, 4. Series B: gap, 3, gap, gap.
  const html = render([
    [1, null],
    [2, 3],
    [null, null],
    [4, null],
  ]);

  it('breaks each line at gaps and draws a lone value as a flat line across its bucket', () => {
    expect(count(html, /<polyline class="line cat-1"/)).toBe(1);
    expect(count(html, /<polyline class="line cat-2"/)).toBe(0);
    expect(html).toContain('<line class="line cat-1" x1="750" x2="1000"');
    expect(html).toContain('<line class="line cat-2" x1="250" x2="500"');
  });

  it('scales to a round number above the largest value', () => {
    expect(yLabels(html)).toEqual(['0 ms', '2,5 ms', '5 ms']);
  });

  it('gives a tooltip to each bucket that has a value and an escaped label to the chart', () => {
    expect(count(html, /<rect class="hover-target"/)).toBe(3);
    expect(html).toContain('aria-label="Vasteaika &lt;p95&gt;"');
  });

  it('spans the powers of 10 around the values on a log scale', () => {
    expect(yLabels(render([[20, 3000]], true))).toEqual(['10 ms', '100 ms', '1000 ms', '10000 ms']);
    expect(yLabels(render([[1000, null]], true))).toEqual(['1000 ms', '10000 ms']);
  });

  it('draws a value at the bottom and at the top of a log scale', () => {
    expect(render([[10, 1000]], true)).toContain('<line class="line cat-1" x1="0" x2="1000" y1="200" y2="200"');
    expect(render([[10, 1000]], true)).toContain('<line class="line cat-2" x1="0" x2="1000" y1="0" y2="0"');
  });
});

describe('renderStackedBarChart', () => {
  function render(values: (number | null)[][]) {
    return renderStackedBarChart({
      points: values.map((v, i) => ({ t: at(i), values: v })),
      series: [
        { label: 'A', className: 'cat-1' },
        { label: 'B', className: 'cat-2' },
      ],
      stepMs: FIVE_MINUTES,
      from: at(0),
      to: at(values.length),
      ticks: [],
      ariaLabel: 'Kirjautumiset',
      formatTooltip: (p) => `tooltip ${p.t}`,
    });
  }

  it('has no gridline at a fraction of a count', () => {
    expect(yLabels(render([[1, 0]]))).toEqual(['0', '1']);
    expect(yLabels(render([[2, 2]]))).toEqual(['0', '5']);
    expect(yLabels(render([[10, 4]]))).toEqual(['0', '10', '20']);
  });
});
