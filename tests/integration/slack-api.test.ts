import nock from 'nock';
import { sendSlackNotification } from '../../src/api/slack';
import { resolveWebhookUrl } from '../../src/config/slack-routing';
import { DeploymentEvent, StagingContext } from '../../src/types';

// Override DRY_RUN for tests
const originalEnv = process.env.DRY_RUN;

const ROUTING_ENV_VARS = [
  'SLACK_WEBHOOK_URL',
  'SLACK_WEBHOOK_URL_ESPOO',
  'SLACK_WEBHOOK_URL_TAMPERE_REGION',
  'SLACK_WEBHOOK_URL_OULU',
  'SLACK_WEBHOOK_URL_TURKU',
];
const savedRoutingEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  process.env.DRY_RUN = 'false';
  for (const key of ROUTING_ENV_VARS) {
    savedRoutingEnv[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  nock.cleanAll();
  process.env.DRY_RUN = originalEnv;
  for (const key of ROUTING_ENV_VARS) {
    if (savedRoutingEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = savedRoutingEnv[key];
    }
  }
});

const mockCoreEvent: DeploymentEvent = {
  id: '2026-03-06T07:28:00Z_espoo-prod_core',
  environmentId: 'espoo-prod',
  cityGroupId: 'espoo',
  detectedAt: '2026-03-06T07:28:00Z',
  previousCommit: {
    sha: 'oldsha1234567890',
    shortSha: 'oldsha1',
    message: 'Previous commit',
    date: '2026-02-28T10:00:00Z',
    author: 'dev1',
  },
  newCommit: {
    sha: 'newsha1234567890',
    shortSha: 'newsha1',
    message: 'New commit',
    date: '2026-03-06T06:00:00Z',
    author: 'dev2',
  },
  includedPRs: [
    {
      number: 123,
      title: 'Add feature X',
      author: 'dev2',
      authorName: 'Developer Two',
      mergedAt: '2026-03-01T14:00:00Z',
      repository: 'espoon-voltti/evaka',
      repoType: 'core',
      isBot: false,
      isHidden: false,
      url: 'https://github.com/espoon-voltti/evaka/pull/123',
      labels: [],
    },
  ],
  repoType: 'core',
};

const mockStagingEvent: DeploymentEvent = {
  id: '2026-03-06T07:28:00Z_espoo-staging_core',
  environmentId: 'espoo-staging',
  cityGroupId: 'espoo',
  detectedAt: '2026-03-06T07:28:00Z',
  previousCommit: {
    sha: 'oldsha1234567890',
    shortSha: 'oldsha1',
    message: 'Previous commit',
    date: '2026-02-28T10:00:00Z',
    author: 'dev1',
  },
  newCommit: {
    sha: 'newsha1234567890',
    shortSha: 'newsha1',
    message: 'New commit',
    date: '2026-03-06T06:00:00Z',
    author: 'dev2',
  },
  includedPRs: [
    {
      number: 123,
      title: 'Add feature X',
      author: 'dev2',
      authorName: 'Developer Two',
      mergedAt: '2026-03-01T14:00:00Z',
      repository: 'espoon-voltti/evaka',
      repoType: 'core',
      isBot: false,
      isHidden: false,
      url: 'https://github.com/espoon-voltti/evaka/pull/123',
      labels: [],
    },
  ],
  repoType: 'core',
};

const mockWrapperEvent: DeploymentEvent = {
  id: '2026-03-06T07:28:00Z_espoo-prod_wrapper',
  environmentId: 'espoo-prod',
  cityGroupId: 'espoo',
  detectedAt: '2026-03-06T07:28:00Z',
  previousCommit: {
    sha: 'oldwrap1234567890',
    shortSha: 'oldwrap1',
    message: 'Previous wrapper commit',
    date: '2026-02-28T09:00:00Z',
    author: 'dev1',
  },
  newCommit: {
    sha: 'newwrap1234567890',
    shortSha: 'newwrap1',
    message: 'New wrapper commit',
    date: '2026-03-06T05:00:00Z',
    author: 'dev3',
  },
  includedPRs: [
    {
      number: 456,
      title: 'Update config',
      author: 'dev3',
      authorName: 'Developer Three',
      mergedAt: '2026-03-05T10:00:00Z',
      repository: 'espoo/evaka-wrapper',
      repoType: 'wrapper',
      isBot: false,
      isHidden: false,
      url: 'https://github.com/espoo/evaka-wrapper/pull/456',
      labels: [],
    },
  ],
  repoType: 'wrapper',
};

describe('sendSlackNotification', () => {
  it('sends a Block Kit message with 4 blocks for a single event', async () => {
    const scope = nock('https://hooks.slack.com')
      .post('/services/T00/B00/XXX', (body: Record<string, unknown>) => {
        expect(body).toHaveProperty('blocks');
        const blocks = body.blocks as Array<{ type: string }>;
        expect(blocks.length).toBe(4);
        expect(blocks[0].type).toBe('header');
        expect(blocks[1].type).toBe('section');
        expect(blocks[2].type).toBe('section');
        expect(blocks[3].type).toBe('context');
        return true;
      })
      .reply(200, 'ok');

    await sendSlackNotification(
      'https://hooks.slack.com/services/T00/B00/XXX',
      [mockCoreEvent]
    );

    expect(scope.isDone()).toBe(true);
  });

  it('sends a combined message with 5 blocks for both wrapper and core events', async () => {
    const scope = nock('https://hooks.slack.com')
      .post('/services/T00/B00/XXX', (body: Record<string, unknown>) => {
        expect(body).toHaveProperty('blocks');
        const blocks = body.blocks as Array<{ type: string; text?: unknown; fields?: unknown }>;
        expect(blocks.length).toBe(5);
        expect(blocks[0].type).toBe('header');
        expect(blocks[1].type).toBe('section'); // version + timestamp fields
        expect(blocks[2].type).toBe('section'); // core changes
        expect(blocks[3].type).toBe('section'); // wrapper changes
        expect(blocks[4].type).toBe('context');

        // Verify version field contains both SHAs
        const fields = (blocks[1] as { fields: Array<{ text: string }> }).fields;
        const versionField = fields[0].text;
        expect(versionField).toContain('newsha1');
        expect(versionField).toContain('newwrap1');
        expect(versionField).toContain('ydin');
        expect(versionField).toContain('Kuntaimplementaatio');

        // Verify both changes sections
        const coreChanges = (blocks[2] as { text: { text: string } }).text.text;
        expect(coreChanges).toContain('Muutokset (ydin)');
        expect(coreChanges).toContain('#123');

        const wrapperChanges = (blocks[3] as { text: { text: string } }).text.text;
        expect(wrapperChanges).toContain('Muutokset (Kuntaimplementaatio)');
        expect(wrapperChanges).toContain('#456');

        return true;
      })
      .reply(200, 'ok');

    await sendSlackNotification(
      'https://hooks.slack.com/services/T00/B00/XXX',
      [mockCoreEvent, mockWrapperEvent]
    );

    expect(scope.isDone()).toBe(true);
  });

  it('shows single SHA in version field for single repo change', async () => {
    const scope = nock('https://hooks.slack.com')
      .post('/services/T00/B00/XXX', (body: Record<string, unknown>) => {
        const blocks = body.blocks as Array<{ fields?: Array<{ text: string }> }>;
        const versionField = blocks[1].fields![0].text;
        expect(versionField).toContain('newsha1');
        expect(versionField).not.toContain('ydin');
        expect(versionField).not.toContain('Kuntaimplementaatio');
        return true;
      })
      .reply(200, 'ok');

    await sendSlackNotification(
      'https://hooks.slack.com/services/T00/B00/XXX',
      [mockCoreEvent]
    );

    expect(scope.isDone()).toBe(true);
  });

  it('displays timestamp in Finnish Helsinki format', async () => {
    const scope = nock('https://hooks.slack.com')
      .post('/services/T00/B00/XXX', (body: Record<string, unknown>) => {
        const blocks = body.blocks as Array<{ fields?: Array<{ text: string }> }>;
        const timestampField = blocks[1].fields![1].text;
        // 2026-03-06T07:28:00Z = pe 6.3. klo 09.28 in Helsinki (EET, UTC+2)
        expect(timestampField).toContain('pe 6.3. klo 09.28');
        return true;
      })
      .reply(200, 'ok');

    await sendSlackNotification(
      'https://hooks.slack.com/services/T00/B00/XXX',
      [mockCoreEvent]
    );

    expect(scope.isDone()).toBe(true);
  });

  it('filters bot PRs from the message', async () => {
    const eventWithBotPR: DeploymentEvent = {
      ...mockCoreEvent,
      includedPRs: [
        ...mockCoreEvent.includedPRs,
        {
          number: 2037,
          title: 'Bump evaka from bf2c392 to 9a4e61b',
          author: 'dependabot[bot]',
          authorName: null,
          mergedAt: '2026-03-05T08:00:00Z',
          repository: 'espoon-voltti/evaka',
          repoType: 'core',
          isBot: true,
      isHidden: true,
          url: 'https://github.com/espoon-voltti/evaka/pull/2037',
          labels: [],
        },
      ],
    };

    const scope = nock('https://hooks.slack.com')
      .post('/services/T00/B00/XXX', (body: Record<string, unknown>) => {
        const blocks = body.blocks as Array<{ text?: { text: string } }>;
        const changesText = blocks[2].text!.text;
        expect(changesText).toContain('#123');
        expect(changesText).not.toContain('#2037');
        expect(changesText).not.toContain('dependabot');
        return true;
      })
      .reply(200, 'ok');

    await sendSlackNotification(
      'https://hooks.slack.com/services/T00/B00/XXX',
      [eventWithBotPR]
    );

    expect(scope.isDone()).toBe(true);
  });

  it('shows fallback text when all PRs are bot-authored', async () => {
    const allBotEvent: DeploymentEvent = {
      ...mockCoreEvent,
      includedPRs: [
        {
          number: 2037,
          title: 'Bump evaka from bf2c392 to 9a4e61b',
          author: 'dependabot[bot]',
          authorName: null,
          mergedAt: '2026-03-05T08:00:00Z',
          repository: 'espoon-voltti/evaka',
          repoType: 'core',
          isBot: true,
      isHidden: true,
          url: 'https://github.com/espoon-voltti/evaka/pull/2037',
          labels: [],
        },
        {
          number: 2038,
          title: 'Update dependency foo to v2',
          author: 'renovate[bot]',
          authorName: null,
          mergedAt: '2026-03-05T09:00:00Z',
          repository: 'espoon-voltti/evaka',
          repoType: 'core',
          isBot: true,
      isHidden: true,
          url: 'https://github.com/espoon-voltti/evaka/pull/2038',
          labels: [],
        },
      ],
    };

    const scope = nock('https://hooks.slack.com')
      .post('/services/T00/B00/XXX', (body: Record<string, unknown>) => {
        const blocks = body.blocks as Array<{ text?: { text: string } }>;
        const changesText = blocks[2].text!.text;
        expect(changesText).toContain('Ei merkittäviä muutoksia');
        expect(changesText).not.toContain('dependabot');
        expect(changesText).not.toContain('renovate');
        return true;
      })
      .reply(200, 'ok');

    await sendSlackNotification(
      'https://hooks.slack.com/services/T00/B00/XXX',
      [allBotEvent]
    );

    expect(scope.isDone()).toBe(true);
  });

  it('includes label tags in PR lines for PRs with labels', async () => {
    const eventWithLabels: DeploymentEvent = {
      ...mockCoreEvent,
      includedPRs: [
        {
          number: 123,
          title: 'Fix login redirect',
          author: 'dev2',
          authorName: 'Developer Two',
          mergedAt: '2026-03-01T14:00:00Z',
          repository: 'espoon-voltti/evaka',
          repoType: 'core',
          isBot: false,
      isHidden: false,
          url: 'https://github.com/espoon-voltti/evaka/pull/123',
          labels: ['bug'],
        },
      ],
    };

    const scope = nock('https://hooks.slack.com')
      .post('/services/T00/B00/XXX', (body: Record<string, unknown>) => {
        const blocks = body.blocks as Array<{ text?: { text: string } }>;
        const changesText = blocks[2].text!.text;
        expect(changesText).toContain('[Korjaus]');
        expect(changesText).toContain('#123');
        expect(changesText).toContain('Fix login redirect');
        return true;
      })
      .reply(200, 'ok');

    await sendSlackNotification(
      'https://hooks.slack.com/services/T00/B00/XXX',
      [eventWithLabels]
    );

    expect(scope.isDone()).toBe(true);
  });

  it('includes multiple label tags for PRs with multiple labels', async () => {
    const eventWithMultiLabels: DeploymentEvent = {
      ...mockCoreEvent,
      includedPRs: [
        {
          number: 124,
          title: 'Update UI validation',
          author: 'dev2',
          authorName: 'Developer Two',
          mergedAt: '2026-03-01T14:00:00Z',
          repository: 'espoon-voltti/evaka',
          repoType: 'core',
          isBot: false,
      isHidden: false,
          url: 'https://github.com/espoon-voltti/evaka/pull/124',
          labels: ['bug', 'frontend'],
        },
      ],
    };

    const scope = nock('https://hooks.slack.com')
      .post('/services/T00/B00/XXX', (body: Record<string, unknown>) => {
        const blocks = body.blocks as Array<{ text?: { text: string } }>;
        const changesText = blocks[2].text!.text;
        expect(changesText).toContain('[Korjaus] [Käyttöliittymä]');
        return true;
      })
      .reply(200, 'ok');

    await sendSlackNotification(
      'https://hooks.slack.com/services/T00/B00/XXX',
      [eventWithMultiLabels]
    );

    expect(scope.isDone()).toBe(true);
  });

  it('shows no tags for PRs without labels', async () => {
    const scope = nock('https://hooks.slack.com')
      .post('/services/T00/B00/XXX', (body: Record<string, unknown>) => {
        const blocks = body.blocks as Array<{ text?: { text: string } }>;
        const changesText = blocks[2].text!.text;
        // Should have PR number and title but no brackets
        expect(changesText).toContain('#123');
        expect(changesText).toContain('Add feature X');
        expect(changesText).not.toMatch(/\[.*\]/);
        return true;
      })
      .reply(200, 'ok');

    await sendSlackNotification(
      'https://hooks.slack.com/services/T00/B00/XXX',
      [mockCoreEvent]
    );

    expect(scope.isDone()).toBe(true);
  });

  it('displays all PRs when count is between 10 and 50', async () => {
    const manyPRs = Array.from({ length: 17 }, (_, i) => ({
      number: 100 + i,
      title: `PR number ${100 + i}`,
      author: 'dev',
      authorName: `Developer ${i}`,
      mergedAt: '2026-03-01T14:00:00Z',
      repository: 'espoon-voltti/evaka',
      repoType: 'core' as const,
      isBot: false,
      isHidden: false,
      url: `https://github.com/espoon-voltti/evaka/pull/${100 + i}`,
      labels: [],
    }));

    const eventWith17PRs: DeploymentEvent = {
      ...mockCoreEvent,
      includedPRs: manyPRs,
    };

    const scope = nock('https://hooks.slack.com')
      .post('/services/T00/B00/XXX', (body: Record<string, unknown>) => {
        const blocks = body.blocks as Array<{ text?: { text: string } }>;
        const changesText = blocks[2].text!.text;
        // All 17 PRs should be listed
        for (let i = 0; i < 17; i++) {
          expect(changesText).toContain(`#${100 + i}`);
        }
        return true;
      })
      .reply(200, 'ok');

    await sendSlackNotification(
      'https://hooks.slack.com/services/T00/B00/XXX',
      [eventWith17PRs]
    );

    expect(scope.isDone()).toBe(true);
  });

  it('ignores unmapped labels in PR lines', async () => {
    const eventWithUnmappedLabels: DeploymentEvent = {
      ...mockCoreEvent,
      includedPRs: [
        {
          number: 125,
          title: 'Some change',
          author: 'dev2',
          authorName: 'Developer Two',
          mergedAt: '2026-03-01T14:00:00Z',
          repository: 'espoon-voltti/evaka',
          repoType: 'core',
          isBot: false,
      isHidden: false,
          url: 'https://github.com/espoon-voltti/evaka/pull/125',
          labels: ['wontfix', 'custom-label'],
        },
      ],
    };

    const scope = nock('https://hooks.slack.com')
      .post('/services/T00/B00/XXX', (body: Record<string, unknown>) => {
        const blocks = body.blocks as Array<{ text?: { text: string } }>;
        const changesText = blocks[2].text!.text;
        expect(changesText).toContain('#125');
        expect(changesText).not.toMatch(/\[.*\]/);
        return true;
      })
      .reply(200, 'ok');

    await sendSlackNotification(
      'https://hooks.slack.com/services/T00/B00/XXX',
      [eventWithUnmappedLabels]
    );

    expect(scope.isDone()).toBe(true);
  });

  it('shows overflow link when more than 50 PRs exist', async () => {
    const manyPRs = Array.from({ length: 55 }, (_, i) => ({
      number: 200 + i,
      title: `PR number ${200 + i}`,
      author: 'dev',
      authorName: `Developer ${i}`,
      mergedAt: '2026-03-01T14:00:00Z',
      repository: 'espoon-voltti/evaka',
      repoType: 'core' as const,
      isBot: false,
      isHidden: false,
      url: `https://github.com/espoon-voltti/evaka/pull/${200 + i}`,
      labels: [],
    }));

    const overflowEvent: DeploymentEvent = {
      ...mockCoreEvent,
      cityGroupId: 'tampere-region',
      environmentId: 'tampere-prod',
      includedPRs: manyPRs,
    };

    const scope = nock('https://hooks.slack.com')
      .post('/services/T00/B00/XXX', (body: Record<string, unknown>) => {
        const blocks = body.blocks as Array<{ text?: { text: string } }>;
        const changesText = blocks[2].text!.text;
        // First 50 PRs should be listed
        for (let i = 0; i < 50; i++) {
          expect(changesText).toContain(`#${200 + i}`);
        }
        // PRs beyond 50 should NOT be listed
        expect(changesText).not.toContain('#250');
        expect(changesText).not.toContain('#254');
        // Overflow link with correct count and history URL
        expect(changesText).toContain('5 muuta muutosta');
        expect(changesText).toContain(
          'https://espoon-voltti.github.io/evaka-update-tracker/#/city/tampere-region/history'
        );
        return true;
      })
      .reply(200, 'ok');

    await sendSlackNotification(
      'https://hooks.slack.com/services/T00/B00/XXX',
      [overflowEvent]
    );

    expect(scope.isDone()).toBe(true);
  });

  it('shows no overflow link when exactly 50 PRs exist', async () => {
    const exactlyFiftyPRs = Array.from({ length: 50 }, (_, i) => ({
      number: 300 + i,
      title: `PR number ${300 + i}`,
      author: 'dev',
      authorName: `Developer ${i}`,
      mergedAt: '2026-03-01T14:00:00Z',
      repository: 'espoon-voltti/evaka',
      repoType: 'core' as const,
      isBot: false,
      isHidden: false,
      url: `https://github.com/espoon-voltti/evaka/pull/${300 + i}`,
      labels: [],
    }));

    const fiftyEvent: DeploymentEvent = {
      ...mockCoreEvent,
      includedPRs: exactlyFiftyPRs,
    };

    const scope = nock('https://hooks.slack.com')
      .post('/services/T00/B00/XXX', (body: Record<string, unknown>) => {
        const blocks = body.blocks as Array<{ text?: { text: string } }>;
        const changesText = blocks[2].text!.text;
        // All 50 PRs should be listed
        for (let i = 0; i < 50; i++) {
          expect(changesText).toContain(`#${300 + i}`);
        }
        // No overflow link
        expect(changesText).not.toContain('muuta muutosta');
        return true;
      })
      .reply(200, 'ok');

    await sendSlackNotification(
      'https://hooks.slack.com/services/T00/B00/XXX',
      [fiftyEvent]
    );

    expect(scope.isDone()).toBe(true);
  });

  it('retries on 429 status', async () => {
    const scope = nock('https://hooks.slack.com')
      .post('/services/T00/B00/XXX')
      .reply(429, 'rate limited')
      .post('/services/T00/B00/XXX')
      .reply(200, 'ok');

    await sendSlackNotification(
      'https://hooks.slack.com/services/T00/B00/XXX',
      [mockCoreEvent]
    );

    expect(scope.isDone()).toBe(true);
  });

  it('skips when webhook URL is empty', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    await sendSlackNotification('', [mockCoreEvent]);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('SKIP'));
    consoleSpy.mockRestore();
  });

  it('skips in DRY_RUN mode', async () => {
    process.env.DRY_RUN = 'true';
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    await sendSlackNotification(
      'https://hooks.slack.com/services/T00/B00/XXX',
      [mockCoreEvent]
    );
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('DRY RUN'));
    consoleSpy.mockRestore();
  });

  it('logs warning on 404 (webhook disabled)', async () => {
    nock('https://hooks.slack.com')
      .post('/services/T00/B00/XXX')
      .times(4) // initial + 3 retries
      .reply(404, 'not found');

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    await sendSlackNotification(
      'https://hooks.slack.com/services/T00/B00/XXX',
      [mockCoreEvent]
    );
    warnSpy.mockRestore();
  });
});

describe('per-city Slack channel routing', () => {
  const ouluEvent: DeploymentEvent = {
    ...mockCoreEvent,
    id: '2026-03-06T07:28:00Z_oulu-prod_core',
    environmentId: 'oulu-prod',
    cityGroupId: 'oulu',
  };

  const tampereEvent: DeploymentEvent = {
    ...mockCoreEvent,
    id: '2026-03-06T07:28:00Z_tampere-prod_wrapper',
    environmentId: 'tampere-prod',
    cityGroupId: 'tampere-region',
    repoType: 'wrapper',
  };

  const ouluStagingEvent: DeploymentEvent = {
    ...mockCoreEvent,
    id: '2026-03-06T07:28:00Z_oulu-staging_core',
    environmentId: 'oulu-staging',
    cityGroupId: 'oulu',
  };

  it('routes notifications to different webhooks per city group', async () => {
    process.env.SLACK_WEBHOOK_URL_ESPOO = 'https://hooks.slack.com/services/T00/ESPOO/XXX';
    process.env.SLACK_WEBHOOK_URL_OULU = 'https://hooks.slack.com/services/T00/OULU/XXX';

    const espooScope = nock('https://hooks.slack.com')
      .post('/services/T00/ESPOO/XXX')
      .reply(200, 'ok');
    const ouluScope = nock('https://hooks.slack.com')
      .post('/services/T00/OULU/XXX')
      .reply(200, 'ok');

    const espooUrl = resolveWebhookUrl('espoo');
    const ouluUrl = resolveWebhookUrl('oulu');

    await sendSlackNotification(espooUrl, [mockCoreEvent]);
    await sendSlackNotification(ouluUrl, [ouluEvent]);

    expect(espooScope.isDone()).toBe(true);
    expect(ouluScope.isDone()).toBe(true);
  });

  it('sends all notifications to default webhook when no per-city vars are set', async () => {
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/T00/DEFAULT/XXX';

    const defaultScope = nock('https://hooks.slack.com')
      .post('/services/T00/DEFAULT/XXX')
      .times(2)
      .reply(200, 'ok');

    const espooUrl = resolveWebhookUrl('espoo');
    const tampereUrl = resolveWebhookUrl('tampere-region');

    await sendSlackNotification(espooUrl, [mockCoreEvent]);
    await sendSlackNotification(tampereUrl, [tampereEvent]);

    expect(defaultScope.isDone()).toBe(true);
  });

  it('uses per-city webhook for configured city and default for unconfigured city', async () => {
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/T00/DEFAULT/XXX';
    process.env.SLACK_WEBHOOK_URL_ESPOO = 'https://hooks.slack.com/services/T00/ESPOO/XXX';

    const espooScope = nock('https://hooks.slack.com')
      .post('/services/T00/ESPOO/XXX')
      .reply(200, 'ok');
    const defaultScope = nock('https://hooks.slack.com')
      .post('/services/T00/DEFAULT/XXX')
      .reply(200, 'ok');

    const espooUrl = resolveWebhookUrl('espoo');
    const ouluUrl = resolveWebhookUrl('oulu');

    await sendSlackNotification(espooUrl, [mockCoreEvent]);
    await sendSlackNotification(ouluUrl, [ouluEvent]);

    expect(espooScope.isDone()).toBe(true);
    expect(defaultScope.isDone()).toBe(true);
  });

  it('routes staging events to the same per-city webhook as production', async () => {
    process.env.SLACK_WEBHOOK_URL_OULU = 'https://hooks.slack.com/services/T00/OULU/XXX';

    const ouluScope = nock('https://hooks.slack.com')
      .post('/services/T00/OULU/XXX')
      .times(2)
      .reply(200, 'ok');

    const prodUrl = resolveWebhookUrl('oulu');
    const stagingUrl = resolveWebhookUrl('oulu');

    await sendSlackNotification(prodUrl, [ouluEvent]);
    await sendSlackNotification(stagingUrl, [ouluStagingEvent]);

    expect(ouluScope.isDone()).toBe(true);
  });
});

describe('staging notification context', () => {
  // T004: plural form (N > 1)
  it('shows plural comparison count for staging with 5 PRs ahead of production', async () => {
    const stagingContext: StagingContext = { inStagingCount: 5, productionAvailable: true };

    const scope = nock('https://hooks.slack.com')
      .post('/services/T00/B00/XXX', (body: Record<string, unknown>) => {
        const blocks = body.blocks as Array<{ type: string; elements?: Array<{ text: string }> }>;
        const contextBlock = blocks[blocks.length - 1];
        expect(contextBlock.type).toBe('context');
        const texts = contextBlock.elements!.map((e) => e.text).join(' ');
        expect(texts).toContain('+5 muutosta verrattuna tuotantoon');
        return true;
      })
      .reply(200, 'ok');

    await sendSlackNotification(
      'https://hooks.slack.com/services/T00/B00/XXX',
      [mockStagingEvent],
      undefined,
      stagingContext
    );

    expect(scope.isDone()).toBe(true);
  });

  // T005: singular form (N = 1)
  it('shows singular comparison count for staging with 1 PR ahead of production', async () => {
    const stagingContext: StagingContext = { inStagingCount: 1, productionAvailable: true };

    const scope = nock('https://hooks.slack.com')
      .post('/services/T00/B00/XXX', (body: Record<string, unknown>) => {
        const blocks = body.blocks as Array<{ type: string; elements?: Array<{ text: string }> }>;
        const contextBlock = blocks[blocks.length - 1];
        const texts = contextBlock.elements!.map((e) => e.text).join(' ');
        expect(texts).toContain('+1 muutos verrattuna tuotantoon');
        return true;
      })
      .reply(200, 'ok');

    await sendSlackNotification(
      'https://hooks.slack.com/services/T00/B00/XXX',
      [mockStagingEvent],
      undefined,
      stagingContext
    );

    expect(scope.isDone()).toBe(true);
  });

  // T006: zero case (in sync)
  it('shows in-sync message when staging has 0 additional PRs', async () => {
    const stagingContext: StagingContext = { inStagingCount: 0, productionAvailable: true };

    const scope = nock('https://hooks.slack.com')
      .post('/services/T00/B00/XXX', (body: Record<string, unknown>) => {
        const blocks = body.blocks as Array<{ type: string; elements?: Array<{ text: string }> }>;
        const contextBlock = blocks[blocks.length - 1];
        const texts = contextBlock.elements!.map((e) => e.text).join(' ');
        expect(texts).toContain('Sama versio kuin tuotannossa');
        return true;
      })
      .reply(200, 'ok');

    await sendSlackNotification(
      'https://hooks.slack.com/services/T00/B00/XXX',
      [mockStagingEvent],
      undefined,
      stagingContext
    );

    expect(scope.isDone()).toBe(true);
  });

  // T007: production unavailable — omit comparison
  it('omits comparison text when production data is unavailable', async () => {
    const stagingContext: StagingContext = { inStagingCount: 0, productionAvailable: false };

    const scope = nock('https://hooks.slack.com')
      .post('/services/T00/B00/XXX', (body: Record<string, unknown>) => {
        const blocks = body.blocks as Array<{ type: string; elements?: Array<{ text: string }> }>;
        const contextBlock = blocks[blocks.length - 1];
        expect(contextBlock.elements!.length).toBe(1); // only the dashboard link
        const texts = contextBlock.elements!.map((e) => e.text).join(' ');
        expect(texts).not.toContain('muutos');
        expect(texts).not.toContain('Sama versio');
        return true;
      })
      .reply(200, 'ok');

    await sendSlackNotification(
      'https://hooks.slack.com/services/T00/B00/XXX',
      [mockStagingEvent],
      undefined,
      stagingContext
    );

    expect(scope.isDone()).toBe(true);
  });

  // T008: production notification — no comparison (FR-006)
  it('has no comparison text in production notifications', async () => {
    const scope = nock('https://hooks.slack.com')
      .post('/services/T00/B00/XXX', (body: Record<string, unknown>) => {
        const blocks = body.blocks as Array<{ type: string; elements?: Array<{ text: string }> }>;
        const contextBlock = blocks[blocks.length - 1];
        expect(contextBlock.elements!.length).toBe(1); // only the dashboard link
        const texts = contextBlock.elements!.map((e) => e.text).join(' ');
        expect(texts).not.toContain('muutos');
        expect(texts).not.toContain('Sama versio');
        expect(texts).toContain('Ympäristöjen tiedot');
        return true;
      })
      .reply(200, 'ok');

    await sendSlackNotification(
      'https://hooks.slack.com/services/T00/B00/XXX',
      [mockCoreEvent] // production event, no stagingContext
    );

    expect(scope.isDone()).toBe(true);
  });

  // T010: descriptive link text for staging
  it('uses descriptive city-name link text for staging notifications', async () => {
    const stagingContext: StagingContext = { inStagingCount: 3, productionAvailable: true };

    const scope = nock('https://hooks.slack.com')
      .post('/services/T00/B00/XXX', (body: Record<string, unknown>) => {
        const blocks = body.blocks as Array<{ type: string; elements?: Array<{ text: string }> }>;
        const contextBlock = blocks[blocks.length - 1];
        const linkElement = contextBlock.elements![contextBlock.elements!.length - 1];
        expect(linkElement.text).toContain('Katso Espoo ympäristöjen tilanne');
        expect(linkElement.text).not.toContain('Ympäristöjen tiedot');
        return true;
      })
      .reply(200, 'ok');

    await sendSlackNotification(
      'https://hooks.slack.com/services/T00/B00/XXX',
      [mockStagingEvent],
      undefined,
      stagingContext
    );

    expect(scope.isDone()).toBe(true);
  });

  // T011: production keeps generic link text (FR-006)
  it('keeps generic link text for production notifications', async () => {
    const scope = nock('https://hooks.slack.com')
      .post('/services/T00/B00/XXX', (body: Record<string, unknown>) => {
        const blocks = body.blocks as Array<{ type: string; elements?: Array<{ text: string }> }>;
        const contextBlock = blocks[blocks.length - 1];
        const linkElement = contextBlock.elements![0];
        expect(linkElement.text).toContain('Ympäristöjen tiedot');
        expect(linkElement.text).not.toContain('Katso');
        return true;
      })
      .reply(200, 'ok');

    await sendSlackNotification(
      'https://hooks.slack.com/services/T00/B00/XXX',
      [mockCoreEvent] // production event
    );

    expect(scope.isDone()).toBe(true);
  });
});
