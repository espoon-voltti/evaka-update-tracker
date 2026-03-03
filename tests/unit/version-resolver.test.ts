import { resolveEnvironment } from '../../src/services/version-resolver';
import { fetchDeployedSha } from '../../src/api/status';
import { getCommit, getSubmoduleRef } from '../../src/api/github';
import { CityGroup, Environment, CommitInfo } from '../../src/types';

jest.mock('../../src/api/status');
jest.mock('../../src/api/github');

const mockedFetchDeployedSha = fetchDeployedSha as jest.MockedFunction<typeof fetchDeployedSha>;
const mockedGetCommit = getCommit as jest.MockedFunction<typeof getCommit>;
const mockedGetSubmoduleRef = getSubmoduleRef as jest.MockedFunction<typeof getSubmoduleRef>;

function makeCommitInfo(sha: string, overrides?: Partial<CommitInfo>): CommitInfo {
  return {
    sha,
    shortSha: sha.slice(0, 7),
    message: `commit ${sha.slice(0, 7)}`,
    date: '2026-03-01T12:00:00Z',
    author: 'testuser',
    ...overrides,
  };
}

describe('version-resolver', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('resolveEnvironment', () => {
    const wrapperCityGroup: CityGroup = {
      id: 'tampere-region',
      name: 'Tampere region',
      repositories: [
        {
          owner: 'Tampere',
          name: 'trevaka',
          type: 'wrapper',
          submodulePath: 'evaka',
          defaultBranch: 'main',
        },
        {
          owner: 'espoon-voltti',
          name: 'evaka',
          type: 'core',
          submodulePath: null,
          defaultBranch: 'master',
        },
      ],
      environments: [],
    };

    const singleInstanceEnv: Environment = {
      id: 'tampere-prod',
      type: 'production',
      instances: [
        { name: 'Tampere', domain: 'varhaiskasvatus.tampere.fi', auth: null },
      ],
    };

    it('should fetch version and resolve submodule for wrapper repos', async () => {
      const wrapperSha = 'aabbccdd11223344556677889900aabbccddeeff';
      const coreSha = '1122334455667788990011223344556677889900';

      mockedFetchDeployedSha.mockResolvedValue({ sha: wrapperSha, status: 'ok' });
      mockedGetCommit
        .mockResolvedValueOnce(makeCommitInfo(wrapperSha))
        .mockResolvedValueOnce(makeCommitInfo(coreSha));
      mockedGetSubmoduleRef.mockResolvedValue(coreSha);

      const result = await resolveEnvironment(wrapperCityGroup, singleInstanceEnv);

      expect(result.environmentId).toBe('tampere-prod');
      expect(result.type).toBe('production');
      expect(result.versions).toHaveLength(1);
      expect(result.versions[0].status).toBe('ok');
      expect(result.versions[0].wrapperCommit?.sha).toBe(wrapperSha);
      expect(result.versions[0].coreCommit?.sha).toBe(coreSha);
      expect(result.versionMismatch).toBe(false);

      expect(mockedFetchDeployedSha).toHaveBeenCalledWith('varhaiskasvatus.tampere.fi', null);
      expect(mockedGetCommit).toHaveBeenCalledWith('Tampere', 'trevaka', wrapperSha);
      expect(mockedGetSubmoduleRef).toHaveBeenCalledWith('Tampere', 'trevaka', 'evaka', wrapperSha);
      expect(mockedGetCommit).toHaveBeenCalledWith('espoon-voltti', 'evaka', coreSha);
    });

    it('should resolve core-only city (Espoo) without submodule', async () => {
      const espooCityGroup: CityGroup = {
        id: 'espoo',
        name: 'Espoo',
        repositories: [
          {
            owner: 'espoon-voltti',
            name: 'evaka',
            type: 'core',
            submodulePath: null,
            defaultBranch: 'master',
          },
        ],
        environments: [],
      };

      const espooEnv: Environment = {
        id: 'espoo-prod',
        type: 'production',
        instances: [
          { name: 'Espoo', domain: 'espoonvarhaiskasvatus.fi', auth: null },
        ],
      };

      const coreSha = 'ff00ff00ff00ff00ff00ff00ff00ff00ff00ff00';
      mockedFetchDeployedSha.mockResolvedValue({ sha: coreSha, status: 'ok' });
      mockedGetCommit.mockResolvedValue(makeCommitInfo(coreSha));

      const result = await resolveEnvironment(espooCityGroup, espooEnv);

      expect(result.versions).toHaveLength(1);
      expect(result.versions[0].status).toBe('ok');
      expect(result.versions[0].wrapperCommit).toBeNull();
      expect(result.versions[0].coreCommit?.sha).toBe(coreSha);
      expect(mockedGetSubmoduleRef).not.toHaveBeenCalled();
      expect(mockedGetCommit).toHaveBeenCalledTimes(1);
      expect(mockedGetCommit).toHaveBeenCalledWith('espoon-voltti', 'evaka', coreSha);
    });

    it('should handle unavailable instance (fetchDeployedSha returns null)', async () => {
      mockedFetchDeployedSha.mockResolvedValue({ sha: null, status: 'unavailable' });

      const result = await resolveEnvironment(wrapperCityGroup, singleInstanceEnv);

      expect(result.versions).toHaveLength(1);
      expect(result.versions[0].status).toBe('unavailable');
      expect(result.versions[0].wrapperCommit).toBeNull();
      expect(result.versions[0].coreCommit).toBeNull();
      expect(mockedGetCommit).not.toHaveBeenCalled();
      expect(mockedGetSubmoduleRef).not.toHaveBeenCalled();
    });

    it('should handle auth-error status', async () => {
      mockedFetchDeployedSha.mockResolvedValue({ sha: null, status: 'auth-error' });

      const result = await resolveEnvironment(wrapperCityGroup, singleInstanceEnv);

      expect(result.versions).toHaveLength(1);
      expect(result.versions[0].status).toBe('auth-error');
      expect(result.versions[0].wrapperCommit).toBeNull();
      expect(result.versions[0].coreCommit).toBeNull();
    });

    it('should detect version mismatch when multiple instances have different SHAs', async () => {
      const multiInstanceEnv: Environment = {
        id: 'tampere-prod',
        type: 'production',
        instances: [
          { name: 'Tampere', domain: 'varhaiskasvatus.tampere.fi', auth: null },
          { name: 'Kangasala', domain: 'evaka.kangasala.fi', auth: null },
        ],
      };

      const wrapperSha1 = 'aaaa000000000000000000000000000000000000';
      const wrapperSha2 = 'bbbb000000000000000000000000000000000000';
      const coreSha1 = 'cccc000000000000000000000000000000000000';
      const coreSha2 = 'dddd000000000000000000000000000000000000';

      mockedFetchDeployedSha
        .mockResolvedValueOnce({ sha: wrapperSha1, status: 'ok' })
        .mockResolvedValueOnce({ sha: wrapperSha2, status: 'ok' });

      mockedGetCommit
        .mockResolvedValueOnce(makeCommitInfo(wrapperSha1))
        .mockResolvedValueOnce(makeCommitInfo(coreSha1))
        .mockResolvedValueOnce(makeCommitInfo(wrapperSha2))
        .mockResolvedValueOnce(makeCommitInfo(coreSha2));

      mockedGetSubmoduleRef
        .mockResolvedValueOnce(coreSha1)
        .mockResolvedValueOnce(coreSha2);

      const result = await resolveEnvironment(wrapperCityGroup, multiInstanceEnv);

      expect(result.versions).toHaveLength(2);
      expect(result.versionMismatch).toBe(true);
      expect(result.versions[0].wrapperCommit?.sha).toBe(wrapperSha1);
      expect(result.versions[1].wrapperCommit?.sha).toBe(wrapperSha2);
    });
  });
});
