// Sample data files for testing

import { CurrentData, HistoryData, PreviousData } from '../../src/types';

export const sampleCurrentData: CurrentData = {
  generatedAt: '2026-03-02T12:00:00Z',
  cityGroups: [
    {
      id: 'espoo',
      name: 'Espoo',
      environments: [
        {
          id: 'espoo-prod',
          type: 'production',
          version: {
            instanceDomain: 'espoonvarhaiskasvatus.fi',
            checkedAt: '2026-03-02T12:00:00Z',
            status: 'ok',
            wrapperCommit: null,
            coreCommit: {
              sha: 'abc123def456789012345678901234567890abcd',
              shortSha: 'abc123d',
              message: 'Add new feature X',
              date: '2026-03-01T15:30:00Z',
              author: 'developer1',
            },
          },
          versionMismatch: false,
          mismatchDetails: [],
        },
        {
          id: 'espoo-staging',
          type: 'staging',
          version: {
            instanceDomain: 'staging.example.evaka.test',
            checkedAt: '2026-03-02T12:00:00Z',
            status: 'ok',
            wrapperCommit: null,
            coreCommit: {
              sha: 'def789012345678901234567890abcdef01234567',
              shortSha: 'def7890',
              message: 'Fix authentication bug',
              date: '2026-03-02T10:00:00Z',
              author: 'developer2',
            },
          },
          versionMismatch: false,
          mismatchDetails: [],
        },
      ],
      prTracks: {
        wrapper: null,
        core: {
          repository: 'espoon-voltti/evaka',
          deployed: [
            {
              number: 8504,
              title: 'Add new feature X',
              author: 'developer1',
              mergedAt: '2026-03-01T14:00:00Z',
              repository: 'espoon-voltti/evaka',
              repoType: 'core',
              isBot: false,
              url: 'https://github.com/espoon-voltti/evaka/pull/8504',
            },
          ],
          inStaging: [
            {
              number: 8510,
              title: 'Fix authentication bug',
              author: 'developer2',
              mergedAt: '2026-03-02T09:00:00Z',
              repository: 'espoon-voltti/evaka',
              repoType: 'core',
              isBot: false,
              url: 'https://github.com/espoon-voltti/evaka/pull/8510',
            },
          ],
          pendingDeployment: [],
        },
      },
    },
  ],
};

export const sampleHistoryData: HistoryData = {
  events: [
    {
      id: '2026-03-02T12:00:00Z_espoo-prod_core',
      environmentId: 'espoo-prod',
      cityGroupId: 'espoo',
      detectedAt: '2026-03-02T12:00:00Z',
      previousCommit: {
        sha: 'oldsha',
        shortSha: 'oldsha1',
        message: 'Previous deploy',
        date: '2026-02-28T10:00:00Z',
        author: 'developer2',
      },
      newCommit: {
        sha: 'abc123def456789012345678901234567890abcd',
        shortSha: 'abc123d',
        message: 'Add new feature X',
        date: '2026-03-01T15:30:00Z',
        author: 'developer1',
      },
      includedPRs: [
        {
          number: 8504,
          title: 'Add new feature X',
          author: 'developer1',
          mergedAt: '2026-03-01T14:00:00Z',
          repository: 'espoon-voltti/evaka',
          repoType: 'core',
          isBot: false,
          url: 'https://github.com/espoon-voltti/evaka/pull/8504',
        },
      ],
      repoType: 'core',
    },
  ],
};

export const samplePreviousData: PreviousData = {
  checkedAt: '2026-03-02T11:55:00Z',
  versions: {
    'espoo-prod': {
      wrapperSha: null,
      coreSha: 'abc123def456789012345678901234567890abcd',
    },
    'espoo-staging': {
      wrapperSha: null,
      coreSha: 'def789012345678901234567890abcdef01234567',
    },
    'tampere-prod': {
      wrapperSha: 'wrapper123456789012345678901234567890abcd',
      coreSha: 'core456789012345678901234567890abcdef0123',
    },
  },
};
