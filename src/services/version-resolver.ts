import { CityGroup, Environment, VersionSnapshot, CommitInfo } from '../types.js';
import { fetchDeployedSha } from '../api/status.js';
import { getCommit, getSubmoduleRef } from '../api/github.js';

export interface ResolvedEnvironment {
  environmentId: string;
  type: 'production' | 'staging';
  versions: VersionSnapshot[];
  representative: VersionSnapshot;
  versionMismatch: boolean;
}

export async function resolveEnvironment(
  cityGroup: CityGroup,
  environment: Environment
): Promise<ResolvedEnvironment> {
  const versions: VersionSnapshot[] = [];
  const wrapperRepo = cityGroup.repositories.find((r) => r.type === 'wrapper');
  const coreRepo = cityGroup.repositories.find((r) => r.type === 'core')!;

  for (const instance of environment.instances) {
    const checkedAt = new Date().toISOString();
    const { sha, status } = await fetchDeployedSha(instance.domain, instance.auth);

    if (!sha || status !== 'ok') {
      versions.push({
        instanceDomain: instance.domain,
        checkedAt,
        status,
        wrapperCommit: null,
        coreCommit: null,
      });
      continue;
    }

    try {
      let wrapperCommit: CommitInfo | null = null;
      let coreCommit: CommitInfo | null = null;

      if (wrapperRepo) {
        // Wrapper city: SHA is from the wrapper repo
        wrapperCommit = await getCommit(wrapperRepo.owner, wrapperRepo.name, sha);

        // Resolve core eVaka commit via submodule
        if (wrapperRepo.submodulePath) {
          try {
            const coreSha = await getSubmoduleRef(
              wrapperRepo.owner,
              wrapperRepo.name,
              wrapperRepo.submodulePath,
              sha
            );
            coreCommit = await getCommit(coreRepo.owner, coreRepo.name, coreSha);
          } catch {
            // Submodule resolution failed — flag core as unknown
            coreCommit = null;
          }
        }
      } else {
        // Core-only city (Espoo): SHA is from the core repo
        coreCommit = await getCommit(coreRepo.owner, coreRepo.name, sha);
      }

      versions.push({
        instanceDomain: instance.domain,
        checkedAt,
        status: 'ok',
        wrapperCommit,
        coreCommit,
      });
    } catch {
      versions.push({
        instanceDomain: instance.domain,
        checkedAt,
        status: 'unavailable',
        wrapperCommit: null,
        coreCommit: null,
      });
    }
  }

  const representative = versions[0] ?? {
    instanceDomain: environment.instances[0]?.domain ?? 'unknown',
    checkedAt: new Date().toISOString(),
    status: 'unavailable' as const,
    wrapperCommit: null,
    coreCommit: null,
  };

  // Check for version mismatches among instances
  const okVersions = versions.filter((v) => v.status === 'ok');
  const uniqueShas = new Set(
    okVersions.map((v) => v.wrapperCommit?.sha ?? v.coreCommit?.sha ?? '')
  );
  const versionMismatch = uniqueShas.size > 1;

  return {
    environmentId: environment.id,
    type: environment.type,
    versions,
    representative,
    versionMismatch,
  };
}
