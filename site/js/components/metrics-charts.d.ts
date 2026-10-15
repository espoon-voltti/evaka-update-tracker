import type { Range, SeriesMeta, Slot } from '../metrics/series.js';

export function renderMetricCharts(
  data: { from: number; to: number; series: Record<string, SeriesMeta>; slots: ReadonlyArray<Slot> },
  range: Range
): string;
