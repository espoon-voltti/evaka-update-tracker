import * as fs from 'fs';

/**
 * Write `data` to `filePath` as 2-space-indented JSON.
 * Standardizes the formatting used across the data pipeline.
 */
export function writeJsonFile<T>(filePath: string, data: T): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}
