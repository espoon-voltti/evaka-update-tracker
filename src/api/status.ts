import axios from 'axios';
import { BasicAuth, VersionSnapshot } from '../types.js';
import { withRetry, RETRY_STATUS_PROBE } from '../utils/retry.js';

export async function fetchVersion(
  domain: string,
  auth?: BasicAuth | null
): Promise<VersionSnapshot> {
  const checkedAt = new Date().toISOString();
  const url = `https://${domain}/api/citizen/auth/status`;

  try {
    const response = await withRetry(
      () =>
        axios.get<{ apiVersion: string }>(url, {
          timeout: 10000,
          ...(auth && auth.username
            ? { auth: { username: auth.username, password: auth.password } }
            : {}),
        }),
      RETRY_STATUS_PROBE
    );

    const sha = response.data.apiVersion;
    if (!sha || typeof sha !== 'string') {
      return {
        instanceDomain: domain,
        checkedAt,
        status: 'unavailable',
        wrapperCommit: null,
        coreCommit: null,
      };
    }

    return {
      instanceDomain: domain,
      checkedAt,
      status: 'ok',
      wrapperCommit: null, // resolved later by version-resolver
      coreCommit: null, // resolved later by version-resolver
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 401 || status === 403) {
        return {
          instanceDomain: domain,
          checkedAt,
          status: 'auth-error',
          wrapperCommit: null,
          coreCommit: null,
        };
      }
    }
    console.error(`[${domain}] status probe failed:`, error);
    return {
      instanceDomain: domain,
      checkedAt,
      status: 'unavailable',
      wrapperCommit: null,
      coreCommit: null,
    };
  }
}

export async function fetchDeployedSha(
  domain: string,
  auth?: BasicAuth | null
): Promise<{ sha: string | null; status: VersionSnapshot['status'] }> {
  const url = `https://${domain}/api/citizen/auth/status`;
  try {
    const response = await withRetry(
      () =>
        axios.get<{ apiVersion: string }>(url, {
          timeout: 10000,
          ...(auth && auth.username
            ? { auth: { username: auth.username, password: auth.password } }
            : {}),
        }),
      RETRY_STATUS_PROBE
    );

    const sha = response.data.apiVersion;
    if (!sha || typeof sha !== 'string') {
      return { sha: null, status: 'unavailable' };
    }
    return { sha, status: 'ok' };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 401 || status === 403) {
        return { sha: null, status: 'auth-error' };
      }
    }
    console.error(`[${domain}] status probe failed:`, error);
    return { sha: null, status: 'unavailable' };
  }
}
