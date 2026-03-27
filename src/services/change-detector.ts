import * as fs from 'fs';
import { DeploymentEvent, PreviousData, PreviousVersionEntry, VersionSnapshot, PullRequest } from '../types.js';

export interface DetectionResult {
  events: DeploymentEvent[];
  updatedPrevious: PreviousData;
}

export function readPreviousData(filePath: string): PreviousData {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as PreviousData;
  } catch {
    return { checkedAt: new Date().toISOString(), versions: {} };
  }
}

export interface BranchInfo {
  branch?: string | null;
  isDefaultBranch?: boolean;
}

export function detectChanges(
  environmentId: string,
  cityGroupId: string,
  version: VersionSnapshot,
  previous: PreviousVersionEntry | undefined,
  includedPRs: PullRequest[],
  branchInfoByRepoType?: Record<string, BranchInfo>
): DeploymentEvent[] {
  const events: DeploymentEvent[] = [];
  const now = new Date().toISOString();

  if (version.status !== 'ok') return events;

  const currentWrapperSha = version.wrapperCommit?.sha ?? null;
  const currentCoreSha = version.coreCommit?.sha ?? null;
  const prevWrapperSha = previous?.wrapperSha ?? null;
  const prevCoreSha = previous?.coreSha ?? null;

  // Check wrapper change
  if (currentWrapperSha && currentWrapperSha !== prevWrapperSha) {
    const wrapperBranch = branchInfoByRepoType?.['wrapper'];
    events.push({
      id: `${now}_${environmentId}_wrapper`,
      environmentId,
      cityGroupId,
      detectedAt: now,
      previousCommit: prevWrapperSha
        ? { sha: prevWrapperSha, shortSha: prevWrapperSha.slice(0, 7), message: '', date: '', author: '' }
        : null,
      newCommit: version.wrapperCommit!,
      includedPRs: includedPRs.filter((pr) => pr.repoType === 'wrapper'),
      repoType: 'wrapper',
      ...(wrapperBranch?.isDefaultBranch !== undefined ? { isDefaultBranch: wrapperBranch.isDefaultBranch } : {}),
      ...(wrapperBranch?.branch !== undefined ? { branch: wrapperBranch.branch } : {}),
    });
  }

  // Check core change
  if (currentCoreSha && currentCoreSha !== prevCoreSha) {
    const coreBranch = branchInfoByRepoType?.['core'];
    events.push({
      id: `${now}_${environmentId}_core`,
      environmentId,
      cityGroupId,
      detectedAt: now,
      previousCommit: prevCoreSha
        ? { sha: prevCoreSha, shortSha: prevCoreSha.slice(0, 7), message: '', date: '', author: '' }
        : null,
      newCommit: version.coreCommit!,
      includedPRs: includedPRs.filter((pr) => pr.repoType === 'core'),
      repoType: 'core',
      ...(coreBranch?.isDefaultBranch !== undefined ? { isDefaultBranch: coreBranch.isDefaultBranch } : {}),
      ...(coreBranch?.branch !== undefined ? { branch: coreBranch.branch } : {}),
    });
  }

  return events;
}

export function buildUpdatedPrevious(
  previous: PreviousData,
  environmentId: string,
  version: VersionSnapshot
): PreviousData {
  if (version.status !== 'ok') return previous;

  return {
    checkedAt: new Date().toISOString(),
    versions: {
      ...previous.versions,
      [environmentId]: {
        wrapperSha: version.wrapperCommit?.sha ?? null,
        coreSha: version.coreCommit?.sha ?? null,
      },
    },
  };
}
