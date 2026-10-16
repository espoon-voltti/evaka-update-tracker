import type { Slot } from './series.js';

export interface MetricsSettings {
  url: string;
  token: string;
}

export interface DayFile {
  series?: Record<string, { type: string }>;
  slots?: Slot[];
}

export interface JoinedRange {
  series: Record<string, { type: string }>;
  slots: Slot[];
}

export type MetricsErrorKind = 'unauthorized' | 'unavailable';

export class MetricsError extends Error {
  constructor(kind: MetricsErrorKind, detail: string);
  kind: MetricsErrorKind;
  detail: string;
}

export function settingsKey(cityId: string): string;
export function loadMetricsSettings(cityId: string): MetricsSettings;
export function saveMetricsSettings(cityId: string, settings: MetricsSettings): void;
export function lambdaError(status: number): MetricsError;
export function filesUrl(baseUrl: string, from: number, to: number): string;
export function joinDayFiles(files: ReadonlyArray<DayFile | null>, from: number, to: number): JoinedRange;
export function fetchFiles(cityId: string, from: number, to: number): Promise<Map<string, DayFile | null>>;
