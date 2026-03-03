import { resolveWebhookUrl, cityGroupIdToEnvVar } from '../../src/config/slack-routing';

const ENV_VARS_TO_CLEAN = [
  'SLACK_WEBHOOK_URL',
  'SLACK_WEBHOOK_URL_ESPOO',
  'SLACK_WEBHOOK_URL_TAMPERE_REGION',
  'SLACK_WEBHOOK_URL_OULU',
  'SLACK_WEBHOOK_URL_TURKU',
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

describe('cityGroupIdToEnvVar', () => {
  it('converts simple city group ID', () => {
    expect(cityGroupIdToEnvVar('espoo')).toBe('SLACK_WEBHOOK_URL_ESPOO');
  });

  it('converts hyphenated city group ID', () => {
    expect(cityGroupIdToEnvVar('tampere-region')).toBe('SLACK_WEBHOOK_URL_TAMPERE_REGION');
  });

  it('converts all four city group IDs correctly', () => {
    expect(cityGroupIdToEnvVar('espoo')).toBe('SLACK_WEBHOOK_URL_ESPOO');
    expect(cityGroupIdToEnvVar('tampere-region')).toBe('SLACK_WEBHOOK_URL_TAMPERE_REGION');
    expect(cityGroupIdToEnvVar('oulu')).toBe('SLACK_WEBHOOK_URL_OULU');
    expect(cityGroupIdToEnvVar('turku')).toBe('SLACK_WEBHOOK_URL_TURKU');
  });
});

describe('resolveWebhookUrl', () => {
  it('returns per-city URL when set', () => {
    process.env.SLACK_WEBHOOK_URL_ESPOO = 'https://hooks.slack.com/espoo';
    expect(resolveWebhookUrl('espoo')).toBe('https://hooks.slack.com/espoo');
  });

  it('returns per-city URL for hyphenated city group ID', () => {
    process.env.SLACK_WEBHOOK_URL_TAMPERE_REGION = 'https://hooks.slack.com/tampere';
    expect(resolveWebhookUrl('tampere-region')).toBe('https://hooks.slack.com/tampere');
  });

  it('falls back to default when per-city var is not set', () => {
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/default';
    expect(resolveWebhookUrl('espoo')).toBe('https://hooks.slack.com/default');
  });

  it('returns empty string when neither var is set', () => {
    expect(resolveWebhookUrl('espoo')).toBe('');
  });

  it('per-city var takes precedence over default', () => {
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/default';
    process.env.SLACK_WEBHOOK_URL_OULU = 'https://hooks.slack.com/oulu';
    expect(resolveWebhookUrl('oulu')).toBe('https://hooks.slack.com/oulu');
  });
});
