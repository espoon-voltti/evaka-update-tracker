import * as fs from 'fs';
import * as path from 'path';
import { config as loadEnv } from 'dotenv';
import { getCityGroups } from './config/instances.js';
import { initGitHubClient } from './api/github.js';
import { resolveEnvironment, ResolvedEnvironment } from './services/version-resolver.js';
import { collectPRsBetween, collectPendingPRs, buildPRTrack } from './services/pr-collector.js';
import { readPreviousData, detectChanges, buildUpdatedPrevious } from './services/change-detector.js';
import { deploySite } from './services/site-deployer.js';
import { sendSlackNotification } from './api/slack.js';
import { resolveWebhookUrl } from './config/slack-routing.js';
import { readHistory, appendEvents, pruneOldEvents, writeHistory } from './services/history-manager.js';
import {
  CityGroupData,
  CurrentData,
  DeploymentEvent,
  EnvironmentData,
  PreviousData,
  PullRequest,
  Repository,
} from './types.js';

loadEnv();

const DRY_RUN = process.env.DRY_RUN === 'true';
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.resolve('data');
const SITE_DIR = process.env.SITE_DIR ? path.resolve(process.env.SITE_DIR) : path.resolve('site');
const DIST_DIR = process.env.DIST_DIR ? path.resolve(process.env.DIST_DIR) : path.resolve('dist');

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

        const events = detectChanges(env.id, cityGroup.id, rep, prevEntry, changePRs);
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

  // Send Slack notifications for deployment events
  if (allEvents.length > 0) {
    console.log(`\n${allEvents.length} deployment event(s) detected.`);
    for (const event of allEvents) {
      const webhookUrl = resolveWebhookUrl(event.cityGroupId);
      await sendSlackNotification(webhookUrl, event);
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
