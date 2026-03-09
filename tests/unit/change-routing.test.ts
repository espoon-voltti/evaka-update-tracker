import { resolveChangeWebhookUrl } from '../../src/config/change-routing';

const ENV_VARS_TO_CLEAN = [
  'SLACK_CHANGE_WEBHOOK_CORE',
  'SLACK_CHANGE_WEBHOOK_ESPOO',
  'SLACK_CHANGE_WEBHOOK_TAMPERE_REGION',
  'SLACK_CHANGE_WEBHOOK_OULU',
  'SLACK_CHANGE_WEBHOOK_TURKU',
];

const savedEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of ENV_VARS_TO_CLEAN) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of ENV_VARS_TO_CLEAN) {
    if (savedEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = savedEnv[key];
    }
  }
});

describe('resolveChangeWebhookUrl', () => {
  it('returns SLACK_CHANGE_WEBHOOK_CORE for core repo type', () => {
    process.env.SLACK_CHANGE_WEBHOOK_CORE = 'https://hooks.slack.com/core';
    expect(resolveChangeWebhookUrl('core')).toBe('https://hooks.slack.com/core');
  });

  it('returns empty string when SLACK_CHANGE_WEBHOOK_CORE is not set', () => {
    expect(resolveChangeWebhookUrl('core')).toBe('');
  });

  it('ignores cityGroupId for core repo type', () => {
    process.env.SLACK_CHANGE_WEBHOOK_CORE = 'https://hooks.slack.com/core';
    expect(resolveChangeWebhookUrl('core', 'tampere-region')).toBe('https://hooks.slack.com/core');
  });

  it('returns per-city webhook for wrapper repo type', () => {
    process.env.SLACK_CHANGE_WEBHOOK_TAMPERE_REGION = 'https://hooks.slack.com/tampere';
    expect(resolveChangeWebhookUrl('wrapper', 'tampere-region')).toBe('https://hooks.slack.com/tampere');
  });

  it('converts dashes to underscores and uppercases city ID', () => {
    process.env.SLACK_CHANGE_WEBHOOK_TAMPERE_REGION = 'https://hooks.slack.com/tampere';
    expect(resolveChangeWebhookUrl('wrapper', 'tampere-region')).toBe('https://hooks.slack.com/tampere');
  });

  it('returns empty string when wrapper webhook is not configured', () => {
    expect(resolveChangeWebhookUrl('wrapper', 'oulu')).toBe('');
  });

  it('returns empty string when wrapper has no cityGroupId', () => {
    expect(resolveChangeWebhookUrl('wrapper')).toBe('');
    expect(resolveChangeWebhookUrl('wrapper', null)).toBe('');
  });

  it('resolves all four city group webhooks correctly', () => {
    process.env.SLACK_CHANGE_WEBHOOK_CORE = 'https://hooks.slack.com/core';
    process.env.SLACK_CHANGE_WEBHOOK_TAMPERE_REGION = 'https://hooks.slack.com/tampere';
    process.env.SLACK_CHANGE_WEBHOOK_OULU = 'https://hooks.slack.com/oulu';
    process.env.SLACK_CHANGE_WEBHOOK_TURKU = 'https://hooks.slack.com/turku';

    expect(resolveChangeWebhookUrl('core')).toBe('https://hooks.slack.com/core');
    expect(resolveChangeWebhookUrl('wrapper', 'tampere-region')).toBe('https://hooks.slack.com/tampere');
    expect(resolveChangeWebhookUrl('wrapper', 'oulu')).toBe('https://hooks.slack.com/oulu');
    expect(resolveChangeWebhookUrl('wrapper', 'turku')).toBe('https://hooks.slack.com/turku');
  });
});
