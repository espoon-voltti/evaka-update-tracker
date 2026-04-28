# Municipality Label Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Core repo PRs labeled `turku`, `espoo`, `oulu`, or `seutu` are routed only to their matching city's listings (web UI PR tracks + history events) and sent to both the core change webhook and the city-specific webhook with a `[CityName]` prefix.

**Architecture:** A pure utility module (`src/utils/municipality-labels.ts`) holds the label→city mapping and filter predicates. Two `.filter()` calls in `src/index.ts` apply the predicate when building core PR tracks and deployment event PR lists. The change announcer loops over municipality labels to dispatch additional webhook calls with a prefix.

**Tech Stack:** TypeScript 5.x, Node.js 20+, Jest (unit/integration), nock (HTTP mocking)

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/utils/municipality-labels.ts` | Create | Label→city-group mapping and filter predicates |
| `tests/unit/municipality-labels.test.ts` | Create | Unit tests for the utility |
| `src/index.ts` | Modify | Filter core PR tracks + deployment `changePRs` per city |
| `src/services/change-announcer.ts` | Modify | Route municipality PRs to city webhook with prefix |
| `tests/integration/change-announcements.test.ts` | Modify | Add municipality routing integration tests |

---

## Task 1: Municipality labels utility

**Files:**
- Create: `src/utils/municipality-labels.ts`
- Create: `tests/unit/municipality-labels.test.ts`

- [ ] **Step 1.1: Write failing unit tests**

Create `tests/unit/municipality-labels.test.ts`:

```typescript
import {
  getMunicipalityCityGroups,
  prBelongsToCity,
  getMunicipalityNames,
} from '../../src/utils/municipality-labels';

describe('getMunicipalityCityGroups', () => {
  it('returns null for a PR with no labels', () => {
    expect(getMunicipalityCityGroups([])).toBeNull();
  });

  it('returns null for a PR with no municipality labels', () => {
    expect(getMunicipalityCityGroups(['bug', 'enhancement'])).toBeNull();
  });

  it('returns city group for turku label', () => {
    expect(getMunicipalityCityGroups(['turku'])).toEqual(['turku']);
  });

  it('returns city group for espoo label', () => {
    expect(getMunicipalityCityGroups(['espoo'])).toEqual(['espoo']);
  });

  it('returns city group for oulu label', () => {
    expect(getMunicipalityCityGroups(['oulu'])).toEqual(['oulu']);
  });

  it('returns tampere-region for seutu label', () => {
    expect(getMunicipalityCityGroups(['seutu'])).toEqual(['tampere-region']);
  });

  it('returns multiple city groups for multiple municipality labels', () => {
    const result = getMunicipalityCityGroups(['turku', 'oulu']);
    expect(result).toEqual(expect.arrayContaining(['turku', 'oulu']));
    expect(result).toHaveLength(2);
  });

  it('ignores non-municipality labels mixed in', () => {
    expect(getMunicipalityCityGroups(['bug', 'turku', 'enhancement'])).toEqual(['turku']);
  });
});

describe('prBelongsToCity', () => {
  it('returns true for a shared PR (no labels) in any city', () => {
    expect(prBelongsToCity([], 'turku')).toBe(true);
    expect(prBelongsToCity([], 'espoo')).toBe(true);
    expect(prBelongsToCity([], 'oulu')).toBe(true);
    expect(prBelongsToCity([], 'tampere-region')).toBe(true);
  });

  it('returns true for a PR with only non-municipality labels in any city', () => {
    expect(prBelongsToCity(['bug', 'enhancement'], 'turku')).toBe(true);
    expect(prBelongsToCity(['bug', 'enhancement'], 'espoo')).toBe(true);
  });

  it('returns true for a turku PR in turku city group', () => {
    expect(prBelongsToCity(['turku'], 'turku')).toBe(true);
  });

  it('returns false for a turku PR in espoo city group', () => {
    expect(prBelongsToCity(['turku'], 'espoo')).toBe(false);
  });

  it('returns false for a turku PR in oulu city group', () => {
    expect(prBelongsToCity(['turku'], 'oulu')).toBe(false);
  });

  it('returns false for a turku PR in tampere-region city group', () => {
    expect(prBelongsToCity(['turku'], 'tampere-region')).toBe(false);
  });

  it('returns true for a seutu PR in tampere-region city group', () => {
    expect(prBelongsToCity(['seutu'], 'tampere-region')).toBe(true);
  });

  it('returns false for a seutu PR in turku city group', () => {
    expect(prBelongsToCity(['seutu'], 'turku')).toBe(false);
  });

  it('returns true for a multi-label PR in one of the matching cities', () => {
    expect(prBelongsToCity(['turku', 'oulu'], 'turku')).toBe(true);
    expect(prBelongsToCity(['turku', 'oulu'], 'oulu')).toBe(true);
  });

  it('returns false for a multi-label PR in a non-matching city', () => {
    expect(prBelongsToCity(['turku', 'oulu'], 'espoo')).toBe(false);
    expect(prBelongsToCity(['turku', 'oulu'], 'tampere-region')).toBe(false);
  });
});

describe('getMunicipalityNames', () => {
  it('returns empty array for no labels', () => {
    expect(getMunicipalityNames([])).toEqual([]);
  });

  it('returns empty array for non-municipality labels', () => {
    expect(getMunicipalityNames(['bug', 'enhancement'])).toEqual([]);
  });

  it('returns display name for turku', () => {
    expect(getMunicipalityNames(['turku'])).toEqual(['Turku']);
  });

  it('returns display name for espoo', () => {
    expect(getMunicipalityNames(['espoo'])).toEqual(['Espoo']);
  });

  it('returns display name for oulu', () => {
    expect(getMunicipalityNames(['oulu'])).toEqual(['Oulu']);
  });

  it('returns display name for seutu', () => {
    expect(getMunicipalityNames(['seutu'])).toEqual(['Tampereen seutu']);
  });

  it('returns multiple display names for multiple municipality labels', () => {
    expect(getMunicipalityNames(['turku', 'oulu'])).toEqual(['Turku', 'Oulu']);
  });

  it('ignores non-municipality labels', () => {
    expect(getMunicipalityNames(['bug', 'turku'])).toEqual(['Turku']);
  });
});
```

- [ ] **Step 1.2: Run tests to confirm they fail**

```bash
npx jest tests/unit/municipality-labels.test.ts --no-coverage
```

Expected: `FAIL` with "Cannot find module '../../src/utils/municipality-labels'"

- [ ] **Step 1.3: Create the utility module**

Create `src/utils/municipality-labels.ts`:

```typescript
const MUNICIPALITY_LABEL_TO_CITY_GROUP: Record<string, string> = {
  turku: 'turku',
  espoo: 'espoo',
  oulu: 'oulu',
  seutu: 'tampere-region',
};

const MUNICIPALITY_LABEL_NAMES: Record<string, string> = {
  turku: 'Turku',
  espoo: 'Espoo',
  oulu: 'Oulu',
  seutu: 'Tampereen seutu',
};

export function getMunicipalityCityGroups(labels: string[]): string[] | null {
  const groups = labels
    .map((l) => MUNICIPALITY_LABEL_TO_CITY_GROUP[l])
    .filter((g): g is string => g !== undefined);
  return groups.length > 0 ? groups : null;
}

export function prBelongsToCity(labels: string[], cityGroupId: string): boolean {
  const groups = getMunicipalityCityGroups(labels);
  return groups === null || groups.includes(cityGroupId);
}

export function getMunicipalityNames(labels: string[]): string[] {
  return labels
    .map((l) => MUNICIPALITY_LABEL_NAMES[l])
    .filter((n): n is string => n !== undefined);
}
```

- [ ] **Step 1.4: Run tests to confirm they pass**

```bash
npx jest tests/unit/municipality-labels.test.ts --no-coverage
```

Expected: `PASS` — all tests green.

- [ ] **Step 1.5: Commit**

```bash
git add src/utils/municipality-labels.ts tests/unit/municipality-labels.test.ts
git commit -m "Add municipality label routing utility"
```

---

## Task 2: Filter core PR tracks in index.ts

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 2.1: Add import to index.ts**

At the top of `src/index.ts`, add to the existing import block. After the last import line (currently `import { mergeFeatureFlagFallback } from './services/feature-flag-collector.js';`), add:

```typescript
import { prBelongsToCity } from './utils/municipality-labels.js';
```

- [ ] **Step 2.2: Filter changePRs before detectChanges**

In `src/index.ts`, find the line (around line 231):

```typescript
        const events = detectChanges(env.id, cityGroup.id, rep, prevEntry, changePRs, branchInfoByRepoType);
```

Replace it with:

```typescript
        const filteredChangePRs = changePRs.filter(
          (pr) => pr.repoType !== 'core' || prBelongsToCity(pr.labels, cityGroup.id)
        );
        const events = detectChanges(env.id, cityGroup.id, rep, prevEntry, filteredChangePRs, branchInfoByRepoType);
```

- [ ] **Step 2.3: Filter core PR track lists**

In `src/index.ts`, find (around line 268):

```typescript
    const coreTrack = await collectPRsForRepo(
      coreRepo,
      coreProdSha,
      coreStagingSha,
      prevCoreProd,
      prevCoreStaging
    );
```

Replace it with:

```typescript
    const rawCoreTrack = await collectPRsForRepo(
      coreRepo,
      coreProdSha,
      coreStagingSha,
      prevCoreProd,
      prevCoreStaging
    );
    const coreTrack = {
      deployed: rawCoreTrack.deployed.filter((pr) => prBelongsToCity(pr.labels, cityGroup.id)),
      inStaging: rawCoreTrack.inStaging.filter((pr) => prBelongsToCity(pr.labels, cityGroup.id)),
      pendingDeployment: rawCoreTrack.pendingDeployment.filter((pr) => prBelongsToCity(pr.labels, cityGroup.id)),
    };
```

- [ ] **Step 2.4: Run the full test suite to verify no regressions**

```bash
npm test -- --testPathIgnorePatterns=tests/e2e
```

Expected: all unit and integration tests pass.

- [ ] **Step 2.5: Commit**

```bash
git add src/index.ts
git commit -m "Filter municipality-specific core PRs per city group in pipeline"
```

---

## Task 3: Municipality routing in change announcer

**Files:**
- Modify: `src/services/change-announcer.ts`
- Modify: `tests/integration/change-announcements.test.ts`

- [ ] **Step 3.1: Write failing integration tests**

In `tests/integration/change-announcements.test.ts`, add `SLACK_CHANGE_WEBHOOK_ESPOO` to the `CHANGE_ENV_VARS` array:

```typescript
const CHANGE_ENV_VARS = [
  'SLACK_CHANGE_WEBHOOK_CORE',
  'SLACK_CHANGE_WEBHOOK_TAMPERE_REGION',
  'SLACK_CHANGE_WEBHOOK_OULU',
  'SLACK_CHANGE_WEBHOOK_TURKU',
  'SLACK_CHANGE_WEBHOOK_ESPOO',
  'DRY_RUN',
];
```

Then add a new `describe` block at the end of the file (before the final closing brace):

```typescript
describe('announceChanges - municipality label routing', () => {
  const OLD_CORE_SHA = 'old_core_sha_111111111111111111111111';
  const NEW_CORE_SHA = 'new_core_sha_222222222222222222222222';

  const municipalityCityGroups: CityGroup[] = [
    {
      id: 'espoo',
      name: 'Espoo',
      repositories: [CORE_REPO],
      environments: [],
    },
    {
      id: 'turku',
      name: 'Turku',
      repositories: [CORE_REPO],
      environments: [],
    },
    {
      id: 'oulu',
      name: 'Oulu',
      repositories: [CORE_REPO],
      environments: [],
    },
  ];

  function writeOldHead() {
    fs.writeFileSync(
      path.join(TEST_DATA_DIR, 'repo-heads.json'),
      JSON.stringify({
        checkedAt: '2026-03-09T09:00:00Z',
        repos: {
          'espoon-voltti/evaka': { sha: OLD_CORE_SHA, branch: 'master' },
        },
      })
    );
  }

  function mockCoreHeadChanged() {
    mockedGetCommit.mockResolvedValue({
      sha: NEW_CORE_SHA,
      shortSha: NEW_CORE_SHA.slice(0, 7),
      message: 'commit',
      date: '2026-03-09T10:00:00Z',
      author: 'dev',
    });
  }

  it('sends shared PR only to core webhook, no prefix', async () => {
    writeOldHead();
    mockCoreHeadChanged();

    process.env.SLACK_CHANGE_WEBHOOK_CORE = 'https://hooks.slack.com/services/T00/CORE/XXX';

    mockedCompareShas.mockResolvedValue([
      {
        sha: 'commit1',
        commit: {
          message: 'Shared feature (#200)',
          author: { date: '2026-03-09T09:30:00Z', name: 'dev1' },
        },
        author: { login: 'dev1' },
      },
    ]);

    mockedGetPullRequest.mockResolvedValue({
      number: 200,
      title: 'Shared feature',
      user: { login: 'dev1' },
      merged_at: '2026-03-09T09:30:00Z',
      html_url: 'https://github.com/espoon-voltti/evaka/pull/200',
      labels: [],
    });

    const coreScope = nock('https://hooks.slack.com')
      .post('/services/T00/CORE/XXX', (body: { text: string }) => {
        expect(body.text).toContain('#200');
        expect(body.text).toContain('Shared feature');
        expect(body.text).not.toMatch(/^\[/);
        return true;
      })
      .reply(200, 'ok');

    await announceChanges(municipalityCityGroups, TEST_DATA_DIR, {}, async () => null);

    expect(coreScope.isDone()).toBe(true);
    expect(nock.activeMocks()).toHaveLength(0);
  });

  it('sends turku PR to core webhook with [Turku] prefix AND to turku webhook with [Turku] prefix', async () => {
    writeOldHead();
    mockCoreHeadChanged();

    process.env.SLACK_CHANGE_WEBHOOK_CORE = 'https://hooks.slack.com/services/T00/CORE/XXX';
    process.env.SLACK_CHANGE_WEBHOOK_TURKU = 'https://hooks.slack.com/services/T00/TURKU/XXX';

    mockedCompareShas.mockResolvedValue([
      {
        sha: 'commit1',
        commit: {
          message: 'Turku specific fix (#300)',
          author: { date: '2026-03-09T09:30:00Z', name: 'dev1' },
        },
        author: { login: 'dev1' },
      },
    ]);

    mockedGetPullRequest.mockResolvedValue({
      number: 300,
      title: 'Turku specific fix',
      user: { login: 'dev1' },
      merged_at: '2026-03-09T09:30:00Z',
      html_url: 'https://github.com/espoon-voltti/evaka/pull/300',
      labels: ['turku'],
    });

    const coreScope = nock('https://hooks.slack.com')
      .post('/services/T00/CORE/XXX', (body: { text: string }) => {
        expect(body.text).toContain('[Turku]');
        expect(body.text).toContain('#300');
        expect(body.text).toContain('Turku specific fix');
        return true;
      })
      .reply(200, 'ok');

    const turkuScope = nock('https://hooks.slack.com')
      .post('/services/T00/TURKU/XXX', (body: { text: string }) => {
        expect(body.text).toContain('[Turku]');
        expect(body.text).toContain('#300');
        expect(body.text).toContain('Turku specific fix');
        return true;
      })
      .reply(200, 'ok');

    await announceChanges(municipalityCityGroups, TEST_DATA_DIR, {}, async () => null);

    expect(coreScope.isDone()).toBe(true);
    expect(turkuScope.isDone()).toBe(true);
  });

  it('sends multi-label PR to core, turku, and oulu webhooks with combined prefix', async () => {
    writeOldHead();
    mockCoreHeadChanged();

    process.env.SLACK_CHANGE_WEBHOOK_CORE = 'https://hooks.slack.com/services/T00/CORE/XXX';
    process.env.SLACK_CHANGE_WEBHOOK_TURKU = 'https://hooks.slack.com/services/T00/TURKU/XXX';
    process.env.SLACK_CHANGE_WEBHOOK_OULU = 'https://hooks.slack.com/services/T00/OULU/XXX';

    mockedCompareShas.mockResolvedValue([
      {
        sha: 'commit1',
        commit: {
          message: 'Turku and Oulu fix (#400)',
          author: { date: '2026-03-09T09:30:00Z', name: 'dev1' },
        },
        author: { login: 'dev1' },
      },
    ]);

    mockedGetPullRequest.mockResolvedValue({
      number: 400,
      title: 'Turku and Oulu fix',
      user: { login: 'dev1' },
      merged_at: '2026-03-09T09:30:00Z',
      html_url: 'https://github.com/espoon-voltti/evaka/pull/400',
      labels: ['turku', 'oulu'],
    });

    const coreScope = nock('https://hooks.slack.com')
      .post('/services/T00/CORE/XXX', (body: { text: string }) => {
        expect(body.text).toContain('[Turku]');
        expect(body.text).toContain('[Oulu]');
        expect(body.text).toContain('#400');
        return true;
      })
      .reply(200, 'ok');

    const turkuScope = nock('https://hooks.slack.com')
      .post('/services/T00/TURKU/XXX', (body: { text: string }) => {
        expect(body.text).toContain('[Turku]');
        expect(body.text).toContain('[Oulu]');
        expect(body.text).toContain('#400');
        return true;
      })
      .reply(200, 'ok');

    const ouluScope = nock('https://hooks.slack.com')
      .post('/services/T00/OULU/XXX', (body: { text: string }) => {
        expect(body.text).toContain('[Turku]');
        expect(body.text).toContain('[Oulu]');
        expect(body.text).toContain('#400');
        return true;
      })
      .reply(200, 'ok');

    await announceChanges(municipalityCityGroups, TEST_DATA_DIR, {}, async () => null);

    expect(coreScope.isDone()).toBe(true);
    expect(turkuScope.isDone()).toBe(true);
    expect(ouluScope.isDone()).toBe(true);
  });

  it('does not send to city webhook when it is not configured', async () => {
    writeOldHead();
    mockCoreHeadChanged();

    process.env.SLACK_CHANGE_WEBHOOK_CORE = 'https://hooks.slack.com/services/T00/CORE/XXX';
    // SLACK_CHANGE_WEBHOOK_TURKU intentionally not set

    mockedCompareShas.mockResolvedValue([
      {
        sha: 'commit1',
        commit: {
          message: 'Turku fix (#500)',
          author: { date: '2026-03-09T09:30:00Z', name: 'dev1' },
        },
        author: { login: 'dev1' },
      },
    ]);

    mockedGetPullRequest.mockResolvedValue({
      number: 500,
      title: 'Turku fix',
      user: { login: 'dev1' },
      merged_at: '2026-03-09T09:30:00Z',
      html_url: 'https://github.com/espoon-voltti/evaka/pull/500',
      labels: ['turku'],
    });

    const coreScope = nock('https://hooks.slack.com')
      .post('/services/T00/CORE/XXX', (body: { text: string }) => {
        expect(body.text).toContain('[Turku]');
        expect(body.text).toContain('#500');
        return true;
      })
      .reply(200, 'ok');

    await announceChanges(municipalityCityGroups, TEST_DATA_DIR, {}, async () => null);

    expect(coreScope.isDone()).toBe(true);
    // No other nock interceptors pending (city webhook was not called)
    expect(nock.activeMocks()).toHaveLength(0);
  });
});
```

- [ ] **Step 3.2: Run new tests to confirm they fail**

```bash
npx jest tests/integration/change-announcements.test.ts --no-coverage -t "municipality label routing"
```

Expected: `FAIL` — tests fail because the current announcer doesn't apply a prefix or send to city webhooks.

- [ ] **Step 3.3: Add import to change-announcer.ts**

In `src/services/change-announcer.ts`, add to the imports after the `formatLabelTags` import line:

```typescript
import { getMunicipalityCityGroups, getMunicipalityNames } from '../utils/municipality-labels.js';
```

- [ ] **Step 3.4: Update announcement loop in change-announcer.ts**

In `src/services/change-announcer.ts`, find the block (lines ~174–188):

```typescript
    // Send one message per PR — only update HEAD if all succeed
    let allSuccess = true;
    for (const pr of humanPRs) {
      const text = formatPRLine(pr);
      const success = await sendChangeAnnouncement(webhookUrl, text);
      if (!success) {
        allSuccess = false;
        break;
      }
    }
```

Replace it with:

```typescript
    // Send one message per PR — only update HEAD if all succeed
    let allSuccess = true;
    for (const pr of humanPRs) {
      const municipalityNames = getMunicipalityNames(pr.labels);
      const prefix = municipalityNames.length > 0
        ? municipalityNames.map((n) => `[${n}]`).join(' ') + ' '
        : '';
      const text = prefix + formatPRLine(pr);

      const coreSuccess = await sendChangeAnnouncement(webhookUrl, text);
      if (!coreSuccess) {
        allSuccess = false;
        break;
      }

      if (municipalityNames.length > 0) {
        const cityGroupIds = getMunicipalityCityGroups(pr.labels) ?? [];
        for (const cityGroupId of cityGroupIds) {
          const cityWebhookUrl = resolveChangeWebhookUrl('wrapper', cityGroupId);
          if (!cityWebhookUrl) continue;
          const citySuccess = await sendChangeAnnouncement(cityWebhookUrl, text);
          if (!citySuccess) {
            allSuccess = false;
            break;
          }
        }
        if (!allSuccess) break;
      }
    }
```

- [ ] **Step 3.5: Run new tests to confirm they pass**

```bash
npx jest tests/integration/change-announcements.test.ts --no-coverage -t "municipality label routing"
```

Expected: `PASS` — all 4 new tests green.

- [ ] **Step 3.6: Run full test suite to verify no regressions**

```bash
npm test -- --testPathIgnorePatterns=tests/e2e
```

Expected: all tests pass.

- [ ] **Step 3.7: Commit**

```bash
git add src/services/change-announcer.ts tests/integration/change-announcements.test.ts
git commit -m "Route municipality-labeled core PRs to city Slack webhooks with prefix"
```
