export function escapeHtml(value: unknown): string;

export function formatDate(isoString: string | null | undefined): string;

export function formatTime(isoString: string | null | undefined): string;

export interface StagingBranchInfo {
  isBranch: true;
  branchName: string | null;
}

export interface StagingBranchCity {
  id: string;
  environments: ReadonlyArray<{ id: string; type: string }>;
}

export interface StagingBranchEvent {
  cityGroupId: string;
  environmentId: string;
  detectedAt: string;
  isDefaultBranch?: boolean;
  branch?: string | null;
}

export function findStagingBranchInfo(
  historyEvents: ReadonlyArray<StagingBranchEvent>,
  city: StagingBranchCity
): StagingBranchInfo | null;
