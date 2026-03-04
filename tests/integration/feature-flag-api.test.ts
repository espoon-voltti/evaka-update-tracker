import nock from 'nock';
import { initGitHubClient, getFileContent } from '../../src/api/github.js';

const GITHUB_API = 'https://api.github.com';
const OWNER = 'espoon-voltti';
const REPO = 'evaka';
const FILE_PATH = 'frontend/src/lib-customizations/espoo/featureFlags.tsx';
const TEST_TOKEN = 'ghp_test_token_123';

beforeAll(() => {
  initGitHubClient(TEST_TOKEN);
});

afterEach(() => {
  nock.cleanAll();
});

describe('getFileContent', () => {
  const fileContent = 'const prod: FeatureFlags = { citizenShiftCareAbsence: true }';
  const base64Content = Buffer.from(fileContent).toString('base64');

  it('fetches and decodes base64 file content', async () => {
    const scope = nock(GITHUB_API)
      .get(`/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`)
      .reply(200, {
        content: base64Content,
        encoding: 'base64',
      });

    const result = await getFileContent(OWNER, REPO, FILE_PATH);
    expect(result).toBe(fileContent);
    scope.done();
  });

  it('fetches content at specific ref', async () => {
    const ref = 'abc123';
    const scope = nock(GITHUB_API)
      .get(`/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`)
      .query({ ref })
      .reply(200, {
        content: base64Content,
        encoding: 'base64',
      });

    const result = await getFileContent(OWNER, REPO, FILE_PATH, ref);
    expect(result).toBe(fileContent);
    scope.done();
  });

  it('handles 404 errors', async () => {
    nock(GITHUB_API)
      .get(`/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`)
      .times(4) // withRetry retries 3 times
      .reply(404, { message: 'Not Found' });

    await expect(getFileContent(OWNER, REPO, FILE_PATH)).rejects.toThrow();
  });

  it('handles 500 errors with retry', async () => {
    const scope = nock(GITHUB_API)
      .get(`/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`)
      .reply(500, { message: 'Internal Server Error' })
      .get(`/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`)
      .reply(200, {
        content: base64Content,
        encoding: 'base64',
      });

    const result = await getFileContent(OWNER, REPO, FILE_PATH);
    expect(result).toBe(fileContent);
    scope.done();
  });

  it('uses ETag caching (304 response)', async () => {
    const etag = '"abc123"';

    // First request returns data with ETag
    nock(GITHUB_API)
      .get(`/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`)
      .reply(200, { content: base64Content, encoding: 'base64' }, { etag });

    const result1 = await getFileContent(OWNER, REPO, FILE_PATH);
    expect(result1).toBe(fileContent);

    // Second request returns 304 (cached)
    nock(GITHUB_API)
      .get(`/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`)
      .matchHeader('If-None-Match', etag)
      .reply(304);

    const result2 = await getFileContent(OWNER, REPO, FILE_PATH);
    expect(result2).toBe(fileContent);
  });
});
