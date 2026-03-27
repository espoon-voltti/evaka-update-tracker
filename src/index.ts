import * as fs from 'fs';
import * as path from 'path';
import { config as loadEnv } from 'dotenv';
import { getCityGroups } from './config/instances.js';
import { initGitHubClient, isCommitOnDefaultBranch } from './api/github.js';
import { resolveEnvironment, ResolvedEnvironment } from './services/version-resolver.js';
import { collectPRsBetween, collectPendingPRs, buildPRTrack } from './services/pr-collector.js';
import { readPreviousData, detectChanges, buildUpdatedPrevious, BranchInfo } from './services/change-detector.js';
import { deploySite } from './services/site-deployer.js';
import { sendSlackNotification } from './api/slack.js';
import { resolveWebhookUrl } from './config/slack-routing.js';
import { announceChanges } from './services/change-announcer.js';
import { loadNameCache, saveNameCache, resolveNames } from './services/name-resolver.js';
import { getUser } from './api/github.js';
import { readHistory, appendEvents, pruneOldEvents, writeHistory, backfillBranchInfo } from './services/history-manager.js';
import { collectFeatureFlags } from './services/feature-flag-collector.js';
import { FEATURE_FLAG_CITIES } from './config/feature-flag-cities.js';
import {
  CityGroupData,
  CurrentData,
  DeploymentEvent,
  EnvironmentData,
  PreviousData,
  PullRequest,
  Repository,
  StagingContext,
} from './types.js';

loadEnv();

const DRY_RUN = process.env.DRY_RUN === 'true';
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : process.env.CI
    ? path.resolve('data')
    : path.resolve('.data');
const SITE_DIR = process.env.SITE_DIR ? path.resolve(process.env.SITE_DIR) : path.resolve('site');
const DIST_DIR = process.env.DIST_DIR ? path.resolve(process.env.DIST_DIR) : path.resolve('dist');

// Update site/data symlink to point to the resolved data directory
const siteDataLink = path.join(SITE_DIR, 'data');
const symlinkTarget = path.relative(SITE_DIR, DATA_DIR);
try {
  const currentTarget = fs.readlinkSync(siteDataLink);
  if (currentTarget !== symlinkTarget) {
    fs.rmSync(siteDataLink, { force: true });
    fs.symlinkSync(symlinkTarget, siteDataLink);
  }
} catch {
  // Symlink doesn't exist or isn't a symlink — recreate it
  fs.rmSync(siteDataLink, { recursive: true, force: true });
  fs.symlinkSync(symlinkTarget, siteDataLink);
}

async function collectPRsForRepo(
  repo: Repository,
  prodSha: string | null,
  stagingSha: string | null,
  previousProdSha: string | null,
  _previousStagingSha: string | null
) {
  let deployed: PullRequest[] = [];
  let inStaging: PullRequest[] = [];
  let pendingDeployment: PullRequest[] = [];

  // PRs deployed to production (between previous prod and current prod)
  if (prodSha && previousProdSha && prodSha !== previousProdSha) {
    deployed = await collectPRsBetween(repo, previousProdSha, prodSha);
  }

  // PRs in staging but not in production
  if (stagingSha && prodSha && stagingSha !== prodSha) {
    inStaging = await collectPRsBetween(repo, prodSha, stagingSha);
  }

  // PRs pending deployment (on main but not deployed anywhere)
  const latestDeployedSha = stagingSha ?? prodSha;
  if (latestDeployedSha) {
    pendingDeployment = await collectPendingPRs(repo, latestDeployedSha);
  }

  return buildPRTrack(deployed, inStaging, pendingDeployment);
}

export async function run() {
  const ghToken = process.env.GH_TOKEN;
  if (!ghToken) {
    console.error('GH_TOKEN is required. Set it in .env or as an environment variable.');
    process.exit(1);
  }

  initGitHubClient(ghToken);

  console.log(`Starting eVaka Deployment Tracker${DRY_RUN ? ' (DRY RUN)' : ''}...`);

  const cityGroups = getCityGroups();
  const previousData = readPreviousData(path.join(DATA_DIR, 'previous.json'));
  let updatedPrevious: PreviousData = { ...previousData };
  const allEvents: DeploymentEvent[] = [];
  const cityGroupsData: CityGroupData[] = [];

  for (const cityGroup of cityGroups) {
    console.log(`\nProcessing ${cityGroup.name}...`);

    const environmentsData: EnvironmentData[] = [];
    let prodSha: Record<string, string | null> = {};
    let stagingSha: Record<string, string | null> = {};

    for (const env of cityGroup.environments) {
      const resolved: ResolvedEnvironment = await resolveEnvironment(cityGroup, env);

      environmentsData.push({
        id: resolved.environmentId,
        type: resolved.type,
        version: resolved.representative,
        versionMismatch: resolved.versionMismatch,
        mismatchDetails: resolved.versionMismatch ? resolved.versions : [],
      });

      // Track SHAs for PR collection
      const rep = resolved.representative;
      if (rep.status === 'ok') {
        const wrapperSha = rep.wrapperCommit?.sha ?? null;
        const coreSha = rep.coreCommit?.sha ?? null;

        if (env.type === 'production') {
          prodSha = { wrapper: wrapperSha, core: coreSha };
        } else {
          stagingSha = { wrapper: wrapperSha, core: coreSha };
        }

        // Collect PRs for any detected changes, then detect changes with PR data
        const prevEntry = previousData.versions[env.id];
        const prevWrapperSha = prevEntry?.wrapperSha ?? null;
        const prevCoreSha = prevEntry?.coreSha ?? null;

        const wrapperRepo = cityGroup.repositories.find((r) => r.type === 'wrapper');
        const coreRepo = cityGroup.repositories.find((r) => r.type === 'core')!;
        const changePRs: PullRequest[] = [];

        if (wrapperRepo && wrapperSha && prevWrapperSha && wrapperSha !== prevWrapperSha) {
          const wrapperPRs = await collectPRsBetween(wrapperRepo, prevWrapperSha, wrapperSha);
          changePRs.push(...wrapperPRs);
        }
        if (coreSha && prevCoreSha && coreSha !== prevCoreSha) {
          const corePRs = await collectPRsBetween(coreRepo, prevCoreSha, coreSha);
          changePRs.push(...corePRs);
        }

        // Detect branch info for staging environments
        let branchInfoByRepoType: Record<string, BranchInfo> | undefined;
        if (env.type === 'staging') {
          branchInfoByRepoType = {};
          if (coreSha && coreSha !== prevCoreSha) {
            const result = await isCommitOnDefaultBranch(coreRepo.owner, coreRepo.name, coreRepo.defaultBranch, coreSha);
            branchInfoByRepoType['core'] = {
              isDefaultBranch: result.onDefaultBranch,
              branch: result.branchName,
            };
          }
          if (wrapperRepo && wrapperSha && wrapperSha !== prevWrapperSha) {
            const result = await isCommitOnDefaultBranch(wrapperRepo.owner, wrapperRepo.name, wrapperRepo.defaultBranch, wrapperSha);
            branchInfoByRepoType['wrapper'] = {
              isDefaultBranch: result.onDefaultBranch,
              branch: result.branchName,
            };
          }
        }

        const events = detectChanges(env.id, cityGroup.id, rep, prevEntry, changePRs, branchInfoByRepoType);
        allEvents.push(...events);

        updatedPrevious = buildUpdatedPrevious(updatedPrevious, env.id, rep);
      }

      console.log(
        `  ${env.id}: ${rep.status}${rep.status === 'ok' ? ` (${rep.coreCommit?.shortSha ?? rep.wrapperCommit?.shortSha ?? '?'})` : ''}`
      );
    }

    // Collect PRs for each repository track
    const wrapperRepo = cityGroup.repositories.find((r) => r.type === 'wrapper');
    const coreRepo = cityGroup.repositories.find((r) => r.type === 'core')!;

    const prevVersions = previousData.versions;

    const coreProdSha = prodSha['core'] ?? null;
    const coreStagingSha = stagingSha['core'] ?? null;
    const prevCoreProd = cityGroup.environments.find((e) => e.type === 'production')
      ? prevVersions[cityGroup.environments.find((e) => e.type === 'production')!.id]?.coreSha ?? null
      : null;
    const prevCoreStaging = cityGroup.environments.find((e) => e.type === 'staging')
      ? prevVersions[cityGroup.environments.find((e) => e.type === 'staging')!.id]?.coreSha ?? null
      : null;

    const coreTrack = await collectPRsForRepo(
      coreRepo,
      coreProdSha,
      coreStagingSha,
      prevCoreProd,
      prevCoreStaging
    );

    let wrapperTrack = null;
    if (wrapperRepo) {
      const wrapperProdSha = prodSha['wrapper'] ?? null;
      const wrapperStagingSha = stagingSha['wrapper'] ?? null;
      const prevWrapperProd = cityGroup.environments.find((e) => e.type === 'production')
        ? prevVersions[cityGroup.environments.find((e) => e.type === 'production')!.id]?.wrapperSha ?? null
        : null;
      const prevWrapperStaging = cityGroup.environments.find((e) => e.type === 'staging')
        ? prevVersions[cityGroup.environments.find((e) => e.type === 'staging')!.id]?.wrapperSha ?? null
        : null;

      const wrapperResult = await collectPRsForRepo(
        wrapperRepo,
        wrapperProdSha,
        wrapperStagingSha,
        prevWrapperProd,
        prevWrapperStaging
      );

      wrapperTrack = {
        repository: `${wrapperRepo.owner}/${wrapperRepo.name}`,
        ...wrapperResult,
      };
    }

    cityGroupsData.push({
      id: cityGroup.id,
      name: cityGroup.name,
      environments: environmentsData,
      prTracks: {
        wrapper: wrapperTrack,
        core: {
          repository: `${coreRepo.owner}/${coreRepo.name}`,
          ...coreTrack,
        },
      },
    });
  }

  const currentData: CurrentData = {
    generatedAt: new Date().toISOString(),
    cityGroups: cityGroupsData,
  };

  // Resolve author display names from GitHub profiles
  const nameCachePath = path.join(DATA_DIR, 'user-names.json');
  const nameCache = loadNameCache(nameCachePath);
  const allPRs: PullRequest[] = [];
  for (const cg of cityGroupsData) {
    for (const track of [cg.prTracks.core, cg.prTracks.wrapper]) {
      if (track) {
        allPRs.push(...track.deployed, ...track.inStaging, ...track.pendingDeployment);
      }
    }
  }
  for (const event of allEvents) {
    allPRs.push(...event.includedPRs);
  }
  await resolveNames(allPRs, nameCache, getUser);

  // Send Slack notifications for deployment events (grouped by environment)
  if (allEvents.length > 0) {
    console.log(`\n${allEvents.length} deployment event(s) detected.`);
    const eventsByEnvironment = new Map<string, DeploymentEvent[]>();
    for (const event of allEvents) {
      const existing = eventsByEnvironment.get(event.environmentId) ?? [];
      existing.push(event);
      eventsByEnvironment.set(event.environmentId, existing);
    }
    for (const [, envEvents] of eventsByEnvironment) {
      const firstEvent = envEvents[0];
      const webhookUrl = resolveWebhookUrl(firstEvent.cityGroupId);
      const isProduction = firstEvent.environmentId.includes('prod');

      let stagingContext: StagingContext | undefined;
      if (!isProduction) {
        const cityGroup = cityGroupsData.find((cg) => cg.id === firstEvent.cityGroupId);
        if (cityGroup) {
          const hasProduction = cityGroup.environments.some((e) => e.type === 'production');
          const coreInStaging = cityGroup.prTracks.core.inStaging.filter((pr) => !pr.isHidden);
          const wrapperInStaging = cityGroup.prTracks.wrapper?.inStaging.filter((pr) => !pr.isHidden) ?? [];

          // Check if any event in this environment is a branch deployment
          const branchEvent = envEvents.find((e) => e.isDefaultBranch === false);
          const isBranchDeployment = branchEvent !== undefined;
          const branchName = branchEvent?.branch ?? null;

          stagingContext = {
            inStagingCount: coreInStaging.length + wrapperInStaging.length,
            productionAvailable: hasProduction,
            ...(isBranchDeployment ? { isBranchDeployment: true, branchName } : {}),
          };
        }
      }

      await sendSlackNotification(webhookUrl, envEvents, undefined, stagingContext);
    }
  } else {
    console.log('\nNo deployment changes detected.');
  }

  // Update history
  const historyPath = path.join(DATA_DIR, 'history.json');
  let history = readHistory(historyPath);
  if (allEvents.length > 0) {
    history = appendEvents(history, allEvents);
  }
  history = pruneOldEvents(history);

  // Backfill branch info for existing events (AFTER Slack notifications — no extra messages)
  const allRepos = cityGroups.flatMap((cg) => cg.repositories);
  const backfillCount = await backfillBranchInfo(history, isCommitOnDefaultBranch, allRepos);
  if (backfillCount > 0) {
    console.log(`[BACKFILL] Enriched ${backfillCount} history event(s) with branch info.`);
  }

  // Announce changes to repo default branches (independent from deployment notifications)
  try {
    await announceChanges(cityGroups, DATA_DIR, nameCache, getUser);
  } catch (err) {
    console.warn('Change announcements failed (non-fatal):', err);
  }

  // Save name cache after all name resolution (deployment + change announcements)
  if (!DRY_RUN) {
    saveNameCache(nameCachePath, nameCache);
  }

  // Collect feature flags (non-blocking — errors don't fail the pipeline)
  try {
    console.log('\nCollecting feature flags...');
    const featureFlagData = await collectFeatureFlags(FEATURE_FLAG_CITIES);
    const citiesWithErrors = featureFlagData.cities.filter((c) => c.error);
    if (citiesWithErrors.length > 0) {
      console.warn(
        `Feature flag collection had errors for: ${citiesWithErrors.map((c) => c.name).join(', ')}`
      );
    }
    const totalFlags =
      featureFlagData.categories.reduce((sum, cat) => sum + cat.flags.length, 0);
    console.log(
      `Feature flags collected: ${totalFlags} flags across ${featureFlagData.cities.length} cities`
    );

    if (!DRY_RUN) {
      fs.writeFileSync(
        path.join(DATA_DIR, 'feature-flags.json'),
        JSON.stringify(featureFlagData, null, 2)
      );
    }
  } catch (err) {
    console.warn('Feature flag collection failed (non-fatal):', err);
  }

  if (DRY_RUN) {
    console.log('\n--- DRY RUN: current.json ---');
    console.log(JSON.stringify(currentData, null, 2));
  } else {
    // Write data files
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(DATA_DIR, 'current.json'),
      JSON.stringify(currentData, null, 2)
    );
    fs.writeFileSync(
      path.join(DATA_DIR, 'previous.json'),
      JSON.stringify(updatedPrevious, null, 2)
    );
    writeHistory(historyPath, history);
    console.log('\nData files written.');

    // Deploy site
    deploySite(SITE_DIR, DATA_DIR, DIST_DIR);
    console.log('Site deployed to dist/.');
  }

  console.log('\nDone.');
}

// Only auto-run when executed directly (not when imported)
const isMainModule =
  process.argv[1] &&
  import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').replace(/.*\//, ''));

if (isMainModule) {
  run().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
