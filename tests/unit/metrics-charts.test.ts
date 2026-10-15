import { renderMetricCharts } from '../../site/js/components/metrics-charts.js';
import { FIVE_MINUTES, RANGES, type Slot } from '../../site/js/metrics/series.js';

const TO = Date.parse('2026-10-06T12:00:00Z');
const H9 = Date.parse('2026-10-06T09:00:00Z');
const iso = (ms: number) => new Date(ms).toISOString().replace('.000Z', 'Z');
const ATTEMPTS = 'citizen.loginAttempt{auth=weak}';
const LOGINS = 'citizen.login{auth=weak}';

function render(rangeKey: '24h' | '14d', slots: Slot[]) {
  const range = RANGES[rangeKey];
  return renderMetricCharts({ from: TO - range.ms, to: TO, series: {}, slots }, range);
}

function chartHtml(html: string, id: string) {
  const start = html.indexOf(`data-chart="${id}"`);
  const end = html.indexOf('data-chart=', start + 1);
  return html.slice(start, end === -1 ? undefined : end);
}

describe('weak login failure estimate', () => {
  it('takes the range estimate from the range totals, not from the bars clamped at 0', () => {
    // An attempt at the end of one hour and its login at the start of the next.
    const chart = chartHtml(
      render('14d', [
        { t: iso(H9 - FIVE_MINUTES), [ATTEMPTS]: 1, [LOGINS]: 0 },
        { t: iso(H9), [ATTEMPTS]: 0, [LOGINS]: 1 },
      ]),
      'weak-login-failures'
    );
    expect(chart).toMatch(/aria-label="[^"]*, 14 vrk: epäonnistumisia 0, /);
  });

  it('subtracts the hourly sums for an hourly bar', () => {
    // Per 5-minute bucket, the clamped differences would be 2 and 0.
    const chart = chartHtml(
      render('14d', [
        { t: iso(H9), [ATTEMPTS]: 2, [LOGINS]: 0 },
        { t: iso(H9 + FIVE_MINUTES), [ATTEMPTS]: 0, [LOGINS]: 2 },
      ]),
      'weak-login-failures'
    );
    expect(chart).not.toContain('<rect class="bar');
  });
});

describe('async job type table', () => {
  it('says that no runs failed when the source has no failures', () => {
    const chart = chartHtml(
      render('24h', [{ t: iso(H9), 'service.asyncJob.failed': 0, 'service.asyncJob.permanentlyFailed': 0 }]),
      'async-job-types'
    );
    expect(chart).toContain('Ei epäonnistuneita ajoja.');
    expect(chart).not.toContain('<table');
  });
});
