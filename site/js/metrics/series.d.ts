export interface Range {
  key: '6h' | '24h' | '7d' | '14d';
  label: string;
  ms: number;
}

export interface GaugeSummary {
  min: number;
  mean: number;
  max: number;
  n: number;
}

export interface Slot {
  t: string;
  [series: string]: unknown;
}

export interface Point<T> {
  t: number;
  value: T | null;
}

export const FIVE_MINUTES: number;
export const HOUR: number;
export const DAY: number;
export const RANGES: Record<'24h' | '7d' | '14d', Range>;
export const RANGE_6H: Range;

export const LOGIN_STRONG: string;
export const LOGIN_WEAK: string;
export const RDS_CPU: string;

export function parseRange(value: string | null | undefined): Range;
export function rangeWindow(range: Range, nowMs: number): { from: number; to: number };
export function bucketSizeForRange(range: Range): number;
export function floorTo(ms: number, stepMs: number): number;
export function extractSeries<T = unknown>(
  slots: ReadonlyArray<Slot>,
  name: string,
  from: number,
  to: number
): Point<T>[];
export function aggregateCounters(points: ReadonlyArray<Point<number>>, bucketMs: number): Point<number>[];
export function combineGaugeSummaries(summaries: ReadonlyArray<GaugeSummary>): GaugeSummary | null;
export function aggregateGaugeSummaries(
  points: ReadonlyArray<Point<GaugeSummary>>,
  bucketMs: number
): Point<GaugeSummary>[];
export function totalOf(points: ReadonlyArray<Point<number>>): number;
export function lastKnownPoint<T>(points: ReadonlyArray<Point<T>>): { t: number; value: T } | null;
export function contiguousRuns<T>(points: ReadonlyArray<Point<T>>): { t: number; value: T }[][];
export function localTicks(range: Range, from: number, to: number): { t: number; label: string }[];
export function sumSeries(pointLists: ReadonlyArray<ReadonlyArray<Point<number>>>): Point<number>[];
export function ratioSeries(
  numerator: ReadonlyArray<Point<number>>,
  denominator: ReadonlyArray<Point<number>>
): Point<number>[];
export function ratioOfTotals(
  numerator: ReadonlyArray<Point<number>>,
  denominator: ReadonlyArray<Point<number>>
): number | null;
export function differenceSeries(a: ReadonlyArray<Point<number>>, b: ReadonlyArray<Point<number>>): Point<number>[];
export function differenceOfTotals(a: ReadonlyArray<Point<number>>, b: ReadonlyArray<Point<number>>): number;

export interface SeriesMeta {
  type: string;
  bounds?: number[];
}

export function histogramBounds(
  seriesMeta: Record<string, SeriesMeta> | null | undefined,
  name: string
): number[] | null;
export function aggregateHistograms(points: ReadonlyArray<Point<number[]>>, bucketMs: number): Point<number[]>[];
export function totalHistogram(points: ReadonlyArray<Point<number[]>>): number[] | null;
export function histogramPercentile(counts: ReadonlyArray<number>, bounds: ReadonlyArray<number>, p: number): number | null;
export function percentileSeries(
  histogramPoints: ReadonlyArray<Point<number[]>>,
  bounds: ReadonlyArray<number>,
  p: number
): Point<number>[];

export function breakdownKeys(slots: ReadonlyArray<Slot>, family: string): string[];
export function labelValue(key: string): string;
export function breakdownTotals(slots: ReadonlyArray<Slot>, family: string, from: number, to: number): Map<string, number>;
export function topEntries(totals: ReadonlyMap<string, number>, n: number): [string, number][];
