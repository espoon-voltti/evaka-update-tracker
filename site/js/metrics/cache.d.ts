import type { DayFile, JoinedRange, MetricsError } from './client.js';
import type { Range } from './series.js';

export const REFRESH_INTERVAL: number;
export function refreshPeriodStart(now: number): number;

export interface MetricsState {
  data: (JoinedRange & { from: number; to: number }) | null;
  error: MetricsError | Error | null;
  lastSuccessAt: number | null;
}

export function peekMetrics(cityId: string, range: Range): MetricsState | null;
export function invalidateMetrics(cityId: string): void;
export function loadMetrics(
  cityId: string,
  range: Range,
  options?: {
    now?: number;
    fetchFiles?: (cityId: string, from: number, to: number) => Promise<Map<string, DayFile | null>>;
    force?: boolean;
  }
): Promise<MetricsState>;
