import { parseStagingInstances, mergeStagingEnvironments } from '../../src/config/staging';
import { CityGroup } from '../../src/types';

describe('parseStagingInstances', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('returns empty array when env value is undefined', () => {
    expect(parseStagingInstances(undefined)).toEqual([]);
  });

  it('returns empty array when env value is empty string', () => {
    expect(parseStagingInstances('')).toEqual([]);
  });

  it('returns empty array when env value is whitespace', () => {
    expect(parseStagingInstances('   ')).toEqual([]);
  });

  it('returns empty array and warns on invalid JSON', () => {
    expect(parseStagingInstances('not json')).toEqual([]);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('invalid JSON'),
      expect.any(String)
    );
  });

  it('returns empty array and warns when JSON is not an array', () => {
    expect(parseStagingInstances('{"key": "value"}')).toEqual([]);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('expected a JSON array'),
      'object'
    );
  });

  it('parses valid staging instances JSON', () => {
    const input = JSON.stringify([
      {
        cityGroupId: 'espoo',
        envId: 'espoo-staging',
        instances: [{ name: 'Espoo Staging', domain: 'staging.example.evaka.test' }],
      },
    ]);

    const result = parseStagingInstances(input);
    expect(result).toHaveLength(1);
    expect(result[0].cityGroupId).toBe('espoo');
    expect(result[0].envId).toBe('espoo-staging');
    expect(result[0].instances).toHaveLength(1);
    expect(result[0].instances[0].domain).toBe('staging.example.evaka.test');
  });

  it('parses instances with authEnvPrefix', () => {
    const input = JSON.stringify([
      {
        cityGroupId: 'oulu',
        envId: 'oulu-staging',
        instances: [
          { name: 'Oulu Staging', domain: 'staging.example.oulu.test', authEnvPrefix: 'OULU_STAGING' },
        ],
      },
    ]);

    const result = parseStagingInstances(input);
    expect(result).toHaveLength(1);
    expect(result[0].instances[0].authEnvPrefix).toBe('OULU_STAGING');
  });

  it('skips entries with missing required fields', () => {
    const input = JSON.stringify([
      { cityGroupId: 'espoo' }, // missing envId and instances
      { cityGroupId: 'oulu', envId: 'oulu-staging', instances: [] }, // empty instances
    ]);

    const result = parseStagingInstances(input);
    expect(result).toHaveLength(0);
    expect(warnSpy).toHaveBeenCalledTimes(2);
  });

  it('skips instances with empty domain', () => {
    const input = JSON.stringify([
      {
        cityGroupId: 'espoo',
        envId: 'espoo-staging',
        instances: [{ name: 'Bad', domain: '' }],
      },
    ]);

    const result = parseStagingInstances(input);
    expect(result).toHaveLength(0);
    expect(warnSpy).toHaveBeenCalled();
  });

  it('parses multiple entries', () => {
    const input = JSON.stringify([
      {
        cityGroupId: 'espoo',
        envId: 'espoo-staging',
        instances: [{ name: 'Espoo Staging', domain: 'staging.example.espoo.test' }],
      },
      {
        cityGroupId: 'turku',
        envId: 'turku-staging',
        instances: [{ name: 'Turku Staging', domain: 'staging.example.turku.test' }],
      },
    ]);

    const result = parseStagingInstances(input);
    expect(result).toHaveLength(2);
    expect(result[0].cityGroupId).toBe('espoo');
    expect(result[1].cityGroupId).toBe('turku');
  });
});

describe('mergeStagingEnvironments', () => {
  let warnSpy: jest.SpyInstance;

  const baseCityGroups: CityGroup[] = [
    {
      id: 'espoo',
      name: 'Espoo',
      repositories: [
        { owner: 'espoon-voltti', name: 'evaka', type: 'core', submodulePath: null, defaultBranch: 'master' },
      ],
      environments: [
        {
          id: 'espoo-prod',
          type: 'production',
          instances: [{ name: 'Espoo', domain: 'espoonvarhaiskasvatus.fi', auth: null }],
        },
      ],
    },
    {
      id: 'oulu',
      name: 'Oulu',
      repositories: [
        { owner: 'Oulunkaupunki', name: 'evakaoulu', type: 'wrapper', submodulePath: 'evaka', defaultBranch: 'main' },
        { owner: 'espoon-voltti', name: 'evaka', type: 'core', submodulePath: null, defaultBranch: 'master' },
      ],
      environments: [
        {
          id: 'oulu-prod',
          type: 'production',
          instances: [{ name: 'Oulu', domain: 'varhaiskasvatus.ouka.fi', auth: null }],
        },
      ],
    },
  ];

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('returns city groups unchanged when no staging environments', () => {
    const result = mergeStagingEnvironments(baseCityGroups, []);
    expect(result).toBe(baseCityGroups); // same reference
  });

  it('appends staging environment to matching city group', () => {
    const staging = [
      {
        cityGroupId: 'espoo',
        envId: 'espoo-staging',
        instances: [{ name: 'Espoo Staging', domain: 'staging.example.espoo.test' }],
      },
    ];

    const result = mergeStagingEnvironments(baseCityGroups, staging);
    const espoo = result.find((cg) => cg.id === 'espoo')!;
    expect(espoo.environments).toHaveLength(2);
    expect(espoo.environments[1].id).toBe('espoo-staging');
    expect(espoo.environments[1].type).toBe('staging');
    expect(espoo.environments[1].instances[0].domain).toBe('staging.example.espoo.test');
    expect(espoo.environments[1].instances[0].auth).toBeNull();
  });

  it('does not mutate original city groups', () => {
    const staging = [
      {
        cityGroupId: 'espoo',
        envId: 'espoo-staging',
        instances: [{ name: 'Espoo Staging', domain: 'staging.example.espoo.test' }],
      },
    ];

    const result = mergeStagingEnvironments(baseCityGroups, staging);
    expect(baseCityGroups[0].environments).toHaveLength(1); // unchanged
    expect(result[0].environments).toHaveLength(2);
  });

  it('resolves authEnvPrefix to BasicAuth from environment variables', () => {
    process.env.TEST_AUTH_USER = 'testuser';
    process.env.TEST_AUTH_PASS = 'testpass';

    try {
      const staging = [
        {
          cityGroupId: 'oulu',
          envId: 'oulu-staging',
          instances: [
            { name: 'Oulu Staging', domain: 'staging.example.oulu.test', authEnvPrefix: 'TEST_AUTH' },
          ],
        },
      ];

      const result = mergeStagingEnvironments(baseCityGroups, staging);
      const oulu = result.find((cg) => cg.id === 'oulu')!;
      const stagingEnv = oulu.environments[1];
      expect(stagingEnv.instances[0].auth).toEqual({ username: 'testuser', password: 'testpass' });
    } finally {
      delete process.env.TEST_AUTH_USER;
      delete process.env.TEST_AUTH_PASS;
    }
  });

  it('sets auth to null when authEnvPrefix credentials are missing', () => {
    const staging = [
      {
        cityGroupId: 'oulu',
        envId: 'oulu-staging',
        instances: [
          { name: 'Oulu Staging', domain: 'staging.example.oulu.test', authEnvPrefix: 'NONEXISTENT' },
        ],
      },
    ];

    const result = mergeStagingEnvironments(baseCityGroups, staging);
    const oulu = result.find((cg) => cg.id === 'oulu')!;
    expect(oulu.environments[1].instances[0].auth).toBeNull();
  });

  it('warns and skips unknown cityGroupId', () => {
    const staging = [
      {
        cityGroupId: 'unknown-city',
        envId: 'unknown-staging',
        instances: [{ name: 'Unknown', domain: 'staging.example.unknown.test' }],
      },
    ];

    const result = mergeStagingEnvironments(baseCityGroups, staging);
    expect(result[0].environments).toHaveLength(1); // espoo unchanged
    expect(result[1].environments).toHaveLength(1); // oulu unchanged
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('unknown cityGroupId "unknown-city"')
    );
  });

  it('handles multiple staging environments for different city groups', () => {
    const staging = [
      {
        cityGroupId: 'espoo',
        envId: 'espoo-staging',
        instances: [{ name: 'Espoo Staging', domain: 'staging.example.espoo.test' }],
      },
      {
        cityGroupId: 'oulu',
        envId: 'oulu-staging',
        instances: [{ name: 'Oulu Staging', domain: 'staging.example.oulu.test' }],
      },
    ];

    const result = mergeStagingEnvironments(baseCityGroups, staging);
    expect(result.find((cg) => cg.id === 'espoo')!.environments).toHaveLength(2);
    expect(result.find((cg) => cg.id === 'oulu')!.environments).toHaveLength(2);
  });
});
