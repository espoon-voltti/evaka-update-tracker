import { BasicAuth, CityGroup, Environment, Instance, StagingEnvironmentInput } from '../types.js';

/**
 * Parse the STAGING_INSTANCES environment variable into staging environment definitions.
 * Returns an empty array if the variable is missing, empty, or invalid JSON.
 */
export function parseStagingInstances(envValue?: string): StagingEnvironmentInput[] {
  if (!envValue || envValue.trim() === '') {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(envValue);

    if (!Array.isArray(parsed)) {
      console.warn('STAGING_INSTANCES: expected a JSON array, got', typeof parsed);
      return [];
    }

    const results: StagingEnvironmentInput[] = [];
    for (const entry of parsed) {
      if (
        typeof entry !== 'object' ||
        entry === null ||
        typeof entry.cityGroupId !== 'string' ||
        typeof entry.envId !== 'string' ||
        !Array.isArray(entry.instances) ||
        entry.instances.length === 0
      ) {
        console.warn('STAGING_INSTANCES: skipping invalid entry', JSON.stringify(entry));
        continue;
      }

      const validInstances = entry.instances.filter(
        (inst: unknown) =>
          typeof inst === 'object' &&
          inst !== null &&
          typeof (inst as Record<string, unknown>).name === 'string' &&
          typeof (inst as Record<string, unknown>).domain === 'string' &&
          (inst as Record<string, unknown>).domain !== ''
      );

      if (validInstances.length === 0) {
        console.warn(`STAGING_INSTANCES: no valid instances in entry "${entry.envId}"`);
        continue;
      }

      results.push({
        cityGroupId: entry.cityGroupId,
        envId: entry.envId,
        instances: validInstances,
      });
    }

    return results;
  } catch {
    console.warn('STAGING_INSTANCES: invalid JSON:', envValue.slice(0, 100));
    return [];
  }
}

/**
 * Resolve an authEnvPrefix to BasicAuth credentials from environment variables.
 * Returns null if the prefix is not set or credentials are missing.
 */
function resolveAuth(authEnvPrefix?: string): BasicAuth | null {
  if (!authEnvPrefix) return null;

  const username = process.env[`${authEnvPrefix}_USER`] || '';
  const password = process.env[`${authEnvPrefix}_PASS`] || '';

  if (!username && !password) return null;

  return { username, password };
}

/**
 * Merge staging environments from the STAGING_INSTANCES env var into
 * production-only city groups. Returns a new array (does not mutate input).
 */
export function mergeStagingEnvironments(
  cityGroups: CityGroup[],
  stagingEnvs: StagingEnvironmentInput[]
): CityGroup[] {
  if (stagingEnvs.length === 0) return cityGroups;

  const cityGroupMap = new Map(cityGroups.map((cg) => [cg.id, cg]));

  const additions = new Map<string, Environment[]>();

  for (const stagingEnv of stagingEnvs) {
    if (!cityGroupMap.has(stagingEnv.cityGroupId)) {
      console.warn(
        `STAGING_INSTANCES: unknown cityGroupId "${stagingEnv.cityGroupId}", skipping`
      );
      continue;
    }

    const instances: Instance[] = stagingEnv.instances.map((inst) => ({
      name: inst.name,
      domain: inst.domain,
      auth: resolveAuth(inst.authEnvPrefix),
    }));

    const env: Environment = {
      id: stagingEnv.envId,
      type: 'staging',
      instances,
    };

    const existing = additions.get(stagingEnv.cityGroupId) ?? [];
    existing.push(env);
    additions.set(stagingEnv.cityGroupId, existing);
  }

  return cityGroups.map((cg) => {
    const extra = additions.get(cg.id);
    if (!extra) return cg;
    return {
      ...cg,
      environments: [...cg.environments, ...extra],
    };
  });
}
