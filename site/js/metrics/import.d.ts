import type { MetricsSettings } from './client.js';

export class ImportError extends Error {
  constructor(message: string);
}

export interface ImportedCity extends MetricsSettings {
  id: string;
}

export interface ParsedImport {
  env: string;
  /** Cities in knownCityIds. */
  cities: ImportedCity[];
  /** Ids of valid cities that are not in knownCityIds. */
  unknown: string[];
}

export function parseImport(text: string, knownCityIds: readonly string[]): ParsedImport | ImportError;
export function maskToken(token: string): string;
