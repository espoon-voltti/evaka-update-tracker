import nock from 'nock';
import { fetchVersion, fetchDeployedSha } from '../../src/api/status.js';


const DOMAIN = 'espoo.evaka.fi';
const BASE_URL = `https://${DOMAIN}`;
const STATUS_PATH = '/api/citizen/auth/status';

afterEach(() => {
  nock.cleanAll();
});

describe('fetchVersion', () => {
  it('returns ok status on successful version fetch', async () => {
    const scope = nock(BASE_URL)
      .get(STATUS_PATH)
      .reply(200, { apiVersion: 'sha123abc456def' });

    const result = await fetchVersion(DOMAIN);

    expect(result.instanceDomain).toBe(DOMAIN);
    expect(result.status).toBe('ok');
    expect(result.checkedAt).toBeDefined();
    expect(typeof result.checkedAt).toBe('string');
    scope.done();
  });

  it('sends basic auth header for authenticated instances', async () => {
    const auth = { username: 'admin', password: 'secret' };

    const scope = nock(BASE_URL)
      .get(STATUS_PATH)
      .basicAuth({ user: 'admin', pass: 'secret' })
      .reply(200, { apiVersion: 'sha789def012abc' });

    const result = await fetchVersion(DOMAIN, auth);

    expect(result.status).toBe('ok');
    scope.done();
  });

  it('returns unavailable status on network/timeout error', async () => {
    // Must provide intercepts for initial attempt + 2 retries (maxRetries: 2)
    const scope = nock(BASE_URL)
      .get(STATUS_PATH)
      .times(3)
      .replyWithError('ETIMEDOUT');

    const result = await fetchVersion(DOMAIN);

    expect(result.status).toBe('unavailable');
    expect(result.instanceDomain).toBe(DOMAIN);
    expect(result.wrapperCommit).toBeNull();
    expect(result.coreCommit).toBeNull();
    scope.done();
  });

  it('returns auth-error status on HTTP 401', async () => {
    // Initial attempt + 2 retries
    const scope = nock(BASE_URL)
      .get(STATUS_PATH)
      .times(3)
      .reply(401, { error: 'Unauthorized' });

    const result = await fetchVersion(DOMAIN);

    expect(result.status).toBe('auth-error');
    expect(result.instanceDomain).toBe(DOMAIN);
    scope.done();
  });

  it('returns auth-error status on HTTP 403', async () => {
    const scope = nock(BASE_URL)
      .get(STATUS_PATH)
      .times(3)
      .reply(403, { error: 'Forbidden' });

    const result = await fetchVersion(DOMAIN);

    expect(result.status).toBe('auth-error');
    scope.done();
  });

  it('returns unavailable status on non-JSON response', async () => {
    const scope = nock(BASE_URL)
      .get(STATUS_PATH)
      .reply(200, '<html>Not JSON</html>', {
        'Content-Type': 'text/html',
      });

    const result = await fetchVersion(DOMAIN);

    // axios with no explicit responseType will still parse the body as a string.
    // The apiVersion field will be undefined/missing, so it should be unavailable.
    expect(result.status).toBe('unavailable');
    scope.done();
  });

  it('returns unavailable status when apiVersion field is missing', async () => {
    const scope = nock(BASE_URL)
      .get(STATUS_PATH)
      .reply(200, { someOtherField: 'value' });

    const result = await fetchVersion(DOMAIN);

    expect(result.status).toBe('unavailable');
    expect(result.wrapperCommit).toBeNull();
    expect(result.coreCommit).toBeNull();
    scope.done();
  });
});

describe('fetchDeployedSha', () => {
  it('returns sha and ok status on successful fetch', async () => {
    const expectedSha = 'abc123def456789';
    const scope = nock(BASE_URL)
      .get(STATUS_PATH)
      .reply(200, { apiVersion: expectedSha });

    const result = await fetchDeployedSha(DOMAIN);

    expect(result.sha).toBe(expectedSha);
    expect(result.status).toBe('ok');
    scope.done();
  });

  it('sends basic auth header for authenticated instances', async () => {
    const auth = { username: 'user', password: 'pass' };

    const scope = nock(BASE_URL)
      .get(STATUS_PATH)
      .basicAuth({ user: 'user', pass: 'pass' })
      .reply(200, { apiVersion: 'sha_with_auth' });

    const result = await fetchDeployedSha(DOMAIN, auth);

    expect(result.sha).toBe('sha_with_auth');
    expect(result.status).toBe('ok');
    scope.done();
  });

  it('returns null sha and unavailable status on network error', async () => {
    const scope = nock(BASE_URL)
      .get(STATUS_PATH)
      .times(3)
      .replyWithError('ECONNREFUSED');

    const result = await fetchDeployedSha(DOMAIN);

    expect(result.sha).toBeNull();
    expect(result.status).toBe('unavailable');
    scope.done();
  });

  it('returns null sha and auth-error status on 401', async () => {
    const scope = nock(BASE_URL)
      .get(STATUS_PATH)
      .times(3)
      .reply(401);

    const result = await fetchDeployedSha(DOMAIN);

    expect(result.sha).toBeNull();
    expect(result.status).toBe('auth-error');
    scope.done();
  });

  it('returns null sha and unavailable status when apiVersion is missing', async () => {
    const scope = nock(BASE_URL)
      .get(STATUS_PATH)
      .reply(200, { version: '1.0' });

    const result = await fetchDeployedSha(DOMAIN);

    expect(result.sha).toBeNull();
    expect(result.status).toBe('unavailable');
    scope.done();
  });
});
