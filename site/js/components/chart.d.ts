import type { GaugeSummary, Point } from '../metrics/series.js';

export interface ChartSeries {
  label: string;
  className: string;
}

export interface MultiPoint {
  t: number;
  values: (number | null)[];
}

interface ChartWindow {
  stepMs: number;
  from: number;
  to: number;
  ticks: { t: number; label: string }[];
  ariaLabel: string;
}

export function renderStackedBarChart(
  options: ChartWindow & {
    points: ReadonlyArray<MultiPoint>;
    series: ReadonlyArray<ChartSeries>;
    formatTooltip: (point: MultiPoint) => string;
  }
): string;

export function renderBandChart(
  options: ChartWindow & {
    points: ReadonlyArray<Point<GaugeSummary>>;
    yMax: number;
    unit: string;
    formatTooltip: (point: { t: number; value: GaugeSummary }) => string;
  }
): string;

export function renderLineChart(
  options: ChartWindow & {
    points: ReadonlyArray<MultiPoint>;
    series: ReadonlyArray<ChartSeries>;
    logScale?: boolean;
    unit?: string;
    formatTooltip: (point: MultiPoint) => string;
  }
): string;
