/**
 * One-time script to re-check branch detection for history events and
 * backfill PRs for branch→default transitions.
 *
 * Run: npx tsx scripts/backfill-history.ts
 *
 * This uses the improved isCommitOnDefaultBranch detection that checks
 * whether a commit is the actual merge/squash commit on master, or a
 * feature branch commit that became reachable after merge.
 *
 * Timeout: stops after 60 seconds and writes whatever was fixed so far.
 */

import * as fs from 'fs';
import * as path from 'path';
import { config as loadEnv } from 'dotenv';
import { initGitHubClient, isCommitOnDefaultBranch, getPullRequestsForCommit, getPullRequest } from '../src/api/github.js';
import { collectPRsBetween } from '../src/services/pr-collector.js';
import { isBotPR } from '../src/utils/pr-classifier.js';
import { getCityGroups } from '../src/config/instances.js';
import { backfillBranchTransitionPRs } from '../src/services/history-manager.js';
import { HistoryData, DeploymentEvent, Repository } from '../src/types.js';

loadEnv();

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve('data');

const TIMEOUT_MS = 60_000;

async function enrichBranchEventWithPR(event: DeploymentEvent, repo: Repository): Promise<boolean> {
  const associatedPRs = await getPullRequestsForCommit(repo.owner, repo.name, event.newCommit.sha);
  if (associatedPRs.length === 0) return false;

  const pr = associatedPRs[0];
  if (event.includedPRs.some((p) => p.number === pr.number && p.repository === `${repo.owner}/${repo.name}`)) {
    return false;
  }

  const ghPR = await getPullRequest(repo.owner, repo.name, pr.number);
  const labels = (ghPR.labels || []).map((l: { name: string }) => l.name);
  // The branch's own PR is always visible — it's the reason the branch was deployed
  event.includedPRs.unshift({
    number: ghPR.number,
    title: ghPR.title,
    author: ghPR.user.login,
    authorName: null,
    mergedAt: ghPR.merged_at ?? '',
    repository: `${repo.owner}/${repo.name}`,
    repoType: repo.type,
    isBot: false,
    isHidden: false,
    url: ghPR.html_url,
    labels,
  });
  return true;
}

async function main() {
  const ghToken = process.env.GH_TOKEN;
  if (!ghToken) {
    console.error('GH_TOKEN is required');
    process.exit(1);
  }

  initGitHubClient(ghToken);

  const historyPath = path.join(DATA_DIR, 'history.json');
  const history: HistoryData = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
  const cityGroups = getCityGroups();
  const allRepos = cityGroups.flatMap((cg) => cg.repositories);

  console.log(`Loaded ${history.events.length} history events`);

  const startTime = Date.now();
  const isTimedOut = () => Date.now() - startTime > TIMEOUT_MS;

  // Phase 1: Re-check branch detection for staging events marked as isDefaultBranch: true
  const TWO_WEEKS_AGO = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  let branchFixed = 0;
  const stagingEvents = history.events.filter(
    (e) => !e.environmentId.includes('prod') && e.isDefaultBranch === true && e.newCommit?.sha
      && e.detectedAt >= TWO_WEEKS_AGO
  );

  const SKIP_PHASE_1 = process.env.SKIP_PHASE_1 === '1';
  if (SKIP_PHASE_1) {
    console.log('\nPhase 1: SKIPPED (SKIP_PHASE_1=1)');
  } else {
    console.log(`\nPhase 1: Re-checking ${stagingEvents.length} staging events marked as default branch...`);

    for (const event of stagingEvents) {
      if (isTimedOut()) { console.log('  Timeout reached, stopping phase 1'); break; }
      const repo = allRepos.find((r) => r.type === event.repoType);
      if (!repo) continue;

      try {
        const result = await isCommitOnDefaultBranch(repo.owner, repo.name, repo.defaultBranch, event.newCommit.sha);
        if (!result.onDefaultBranch) {
          console.log(
            `  Fixed: ${event.environmentId} ${event.newCommit.shortSha} ` +
            `"${event.newCommit.message?.substring(0, 60)}" → branch: ${result.branchName}`
          );
          event.isDefaultBranch = false;
          event.branch = result.branchName;
          branchFixed++;
        }
      } catch {
        console.warn(`  Skip: ${event.newCommit.shortSha} — API error`);
      }
    }

    console.log(`Phase 1 complete: fixed ${branchFixed} event(s)`);
  }

  // Phase 2: Backfill PRs for branch→default transitions with 0 PRs
  if (!isTimedOut()) {
    console.log('\nPhase 2: Backfilling PRs for branch→default transitions...');
    const prBackfillCount = await backfillBranchTransitionPRs(history, collectPRsBetween, allRepos);
    console.log(`Phase 2 complete: backfilled PRs for ${prBackfillCount} event(s)`);
  }

  // Phase 3: Enrich branch events with their branch's own PR
  if (!isTimedOut()) {
    console.log('\nPhase 3: Enriching branch events with branch PR info...');
    let enriched = 0;
    const branchEvents = history.events.filter(
      (e) => e.isDefaultBranch === false && e.newCommit?.sha && e.detectedAt >= TWO_WEEKS_AGO
    );

    for (const event of branchEvents) {
      if (isTimedOut()) { console.log('  Timeout reached, stopping phase 3'); break; }
      const repo = allRepos.find((r) => r.type === event.repoType);
      if (!repo) continue;

      try {
        if (await enrichBranchEventWithPR(event, repo)) {
          console.log(
            `  Enriched: ${event.environmentId} ${event.newCommit.shortSha} ` +
            `+ "${event.includedPRs[0].title?.substring(0, 60)}"`
          );
          enriched++;
        }
      } catch {
        console.warn(`  Skip: ${event.newCommit.shortSha} — API error`);
      }
    }

    console.log(`Phase 3 complete: enriched ${enriched} event(s)`);
  }

  // Write updated history
  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
  console.log(`\nHistory written to ${historyPath} (${((Date.now() - startTime) / 1000).toFixed(1)}s)`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
