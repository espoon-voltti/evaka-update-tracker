/**
 * Generoi data/permissions.json eVakan lähdekoodista.
 * Käyttö: GH_TOKEN=... npx tsx scripts/generate-permissions.ts
 */
import { config as loadEnv } from 'dotenv';
import * as path from 'path';
import { initGitHubClient } from '../src/api/github.js';
import { collectPermissions } from '../src/services/permissions-collector.js';
import { writeJsonFile } from '../src/utils/json-io.js';

loadEnv();

async function main() {
  const token = process.env.GH_TOKEN;
  if (!token) {
    console.error('GH_TOKEN puuttuu (.env tai env).');
    process.exit(1);
  }
  initGitHubClient(token);

  const start = Date.now();
  const data = await collectPermissions();
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  const outPath = path.resolve('site/data/permissions.json');
  writeJsonFile(outPath, data);
  const total = data.categories.reduce((s, c) => s + c.actions.length, 0);
  console.log(`Kirjoitettu ${outPath}`);
  console.log(`Kategoriat: ${data.categories.length}, Actions: ${total}, Kunnat: ${data.cities.length}`);
  console.log(`Kesto: ${elapsed}s`);
  const errors = data.cities.filter((c) => c.error);
  if (errors.length) {
    console.log('Virheet:');
    for (const c of errors) console.log(`  ${c.name}: ${c.error}`);
  }
}

main().catch((err) => {
  console.error('Virhe:', err);
  process.exit(1);
});
