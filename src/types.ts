// --- Configuration Entities ---

export interface BasicAuth {
  username: string;
  password: string;
}

export interface Instance {
  name: string;
  domain: string;
  auth: BasicAuth | null;
}

// --- Staging Instance Configuration (parsed from STAGING_INSTANCES env var) ---

export interface StagingInstanceInput {
  name: string;
  domain: string;
  authEnvPrefix?: string;
}

export interface StagingEnvironmentInput {
  cityGroupId: string;
  envId: string;
  instances: StagingInstanceInput[];
}

export interface Repository {
  owner: string;
  name: string;
  type: 'core' | 'wrapper';
  submodulePath: string | null;
  defaultBranch: string;
}

export interface Environment {
  id: string;
  type: 'production' | 'staging';
  instances: Instance[];
}

export interface CityGroup {
  id: string;
  name: string;
  repositories: Repository[];
  environments: Environment[];
}

// --- Version & Commit Data ---

export interface CommitInfo {
  sha: string;
  shortSha: string;
  message: string;
  date: string; // ISO 8601
  author: string;
}

export type InstanceStatus = 'ok' | 'unavailable' | 'auth-error';

export interface VersionSnapshot {
  instanceDomain: string;
  checkedAt: string; // ISO 8601
  status: InstanceStatus;
  wrapperCommit: CommitInfo | null;
  coreCommit: CommitInfo | null;
}

// --- Pull Request Data ---

export interface PullRequest {
  number: number;
  title: string;
  author: string;
  authorName: string | null;
  mergedAt: string; // ISO 8601
  repository: string; // e.g., "espoon-voltti/evaka"
  repoType: 'core' | 'wrapper';
  isBot: boolean;
  isHidden: boolean;
  url: string;
  labels: string[];
}

export type DeploymentStage = 'merged' | 'in-staging' | 'in-production';

export interface DeploymentStatus {
  prNumber: number;
  repository: string;
  status: DeploymentStage;
  inEnvironments: string[];
}

// --- Deployment Events ---

export interface DeploymentEvent {
  id: string;
  environmentId: string;
  cityGroupId: string;
  detectedAt: string; // ISO 8601
  previousCommit: CommitInfo | null;
  newCommit: CommitInfo;
  includedPRs: PullRequest[];
  repoType: 'core' | 'wrapper';
  branch?: string | null; // Detected branch name, null if on default branch or unknown
  isDefaultBranch?: boolean; // true if commit is on default branch, undefined for legacy events
}

// --- Slack Notification Context ---

export interface StagingContext {
  inStagingCount: number;
  productionAvailable: boolean;
  isBranchDeployment?: boolean; // true if staging is running a non-default branch
  branchName?: string | null; // Branch name if detected
}

// --- Data File Schemas (contracts/data-files.md) ---

export interface PRTrack {
  repository: string;
  deployed: PullRequest[];
  inStaging: PullRequest[];
  pendingDeployment: PullRequest[];
}

export interface EnvironmentData {
  id: string;
  type: 'production' | 'staging';
  version: VersionSnapshot;
  versionMismatch: boolean;
  mismatchDetails: VersionSnapshot[];
}

export interface CityGroupData {
  id: string;
  name: string;
  environments: EnvironmentData[];
  prTracks: {
    wrapper: PRTrack | null;
    core: PRTrack;
  };
}

export interface CurrentData {
  generatedAt: string; // ISO 8601
  cityGroups: CityGroupData[];
}

export interface HistoryData {
  events: DeploymentEvent[];
}

export interface PreviousVersionEntry {
  wrapperSha: string | null;
  coreSha: string | null;
}

export interface PreviousData {
  checkedAt: string; // ISO 8601
  versions: Record<string, PreviousVersionEntry>;
}

// --- Change Announcement Data ---

export interface RepoHeadEntry {
  sha: string;
  branch: string;
}

export interface RepoHeadsData {
  checkedAt: string; // ISO 8601
  repos: Record<string, RepoHeadEntry>;
}

export interface TrackedRepository {
  owner: string;
  name: string;
  type: 'core' | 'wrapper';
  defaultBranch: string;
  cityGroupId: string | null;
}

export interface ChangeAnnouncement {
  repository: string; // "owner/name"
  repoType: 'core' | 'wrapper';
  cityGroupId: string | null;
  prs: PullRequest[];
}

// --- Feature Flag Data ---

export type FeatureFlagValue = boolean | number | string | null;

export interface FeatureFlag {
  key: string;
  label: string;
  type: 'boolean' | 'number' | 'string' | 'enum';
  values: Record<string, FeatureFlagValue>;
}

export interface FeatureFlagCategory {
  id: 'frontend' | 'backend';
  label: string;
  flags: FeatureFlag[];
}

export interface FeatureFlagCity {
  id: string;
  name: string;
  cityGroupId: string;
  error: string | null;
}

export interface FeatureFlagData {
  generatedAt: string;
  errorFallbackDate?: string | null;
  cities: FeatureFlagCity[];
  categories: FeatureFlagCategory[];
}
