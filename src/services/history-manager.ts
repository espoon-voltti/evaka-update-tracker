import * as fs from 'fs';
import { HistoryData, DeploymentEvent } from '../types.js';

const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

export function readHistory(filePath: string): HistoryData {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as HistoryData;
  } catch {
    return { events: [] };
  }
}

export function appendEvents(
  history: HistoryData,
  newEvents: DeploymentEvent[]
): HistoryData {
  return {
    events: [...newEvents, ...history.events],
  };
}

export function pruneOldEvents(history: HistoryData): HistoryData {
  const cutoff = new Date(Date.now() - ONE_MONTH_MS).toISOString();
  return {
    events: history.events.filter((e) => e.detectedAt >= cutoff),
  };
}

export function writeHistory(filePath: string, history: HistoryData): void {
  fs.writeFileSync(filePath, JSON.stringify(history, null, 2));
}
