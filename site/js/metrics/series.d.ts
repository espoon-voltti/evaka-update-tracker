export interface Range {
  key: '24h' | '7d' | '14d';
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
export const RANGES: Record<Range['key'], Range>;

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
export function localTicks(range: Range, from: number, to: number): { t: number; label: string }[];
