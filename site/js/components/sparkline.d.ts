import type { GaugeSummary, Point } from '../metrics/series.js';

export const WIDTH: number;
export const HEIGHT: number;

export interface StackedPoint {
  t: number;
  values: (number | null)[];
}

export interface Window {
  from: number;
  to: number;
  stepMs: number;
}

export interface Bar {
  series: number;
  x: number;
  width: number;
  y: number;
  height: number;
}

export function stackedBarGeometry(
  points: ReadonlyArray<StackedPoint>,
  window: Window
): { bars: Bar[]; baselines: { x1: number; x2: number }[] };

export function bandGeometry(
  points: ReadonlyArray<Point<GaugeSummary>>,
  window: Window & { yMax: number }
): { band: [number, number][]; mean: [number, number][] }[];

export function renderStackedBarSparkline(
  options: Window & { points: ReadonlyArray<StackedPoint>; classNames: string[]; title: string }
): string;

export function renderBandSparkline(
  options: Window & { points: ReadonlyArray<Point<GaugeSummary>>; yMax: number; title: string }
): string;
