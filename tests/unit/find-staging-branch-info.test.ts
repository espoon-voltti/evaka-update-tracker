import { findStagingBranchInfo } from '../../site/js/utils.js';

const cityWithStaging = {
  id: 'espoo',
  environments: [
    { id: 'espoo-prod', type: 'production' },
    { id: 'espoo-staging', type: 'staging' },
  ],
};

const cityNoStaging = {
  id: 'static',
  environments: [{ id: 'static-prod', type: 'production' }],
};

function makeEvent(overrides = {}) {
  return {
    cityGroupId: 'espoo',
    environmentId: 'espoo-staging',
    detectedAt: '2026-03-01T10:00:00Z',
    isDefaultBranch: true,
    branch: null,
    ...overrides,
  };
}

describe('findStagingBranchInfo', () => {
  it('returns null when the city has no staging environments', () => {
    const events = [makeEvent({ environmentId: 'static-prod', cityGroupId: 'static' })];
    expect(findStagingBranchInfo(events, cityNoStaging)).toBeNull();
  });

  it('returns null when no events match the city', () => {
    const events = [makeEvent({ cityGroupId: 'tampere' })];
    expect(findStagingBranchInfo(events, cityWithStaging)).toBeNull();
  });

  it('returns null when no events match a staging environment', () => {
    const events = [makeEvent({ environmentId: 'espoo-prod' })];
    expect(findStagingBranchInfo(events, cityWithStaging)).toBeNull();
  });

  it('returns null when the latest staging event is on the default branch', () => {
    const events = [makeEvent({ isDefaultBranch: true })];
    expect(findStagingBranchInfo(events, cityWithStaging)).toBeNull();
  });

  it('returns null when isDefaultBranch is undefined (legacy events without the field)', () => {
    const events = [makeEvent({ isDefaultBranch: undefined })];
    expect(findStagingBranchInfo(events, cityWithStaging)).toBeNull();
  });

  it('returns isBranch=true with branch name for a branch deployment', () => {
    const events = [
      makeEvent({ isDefaultBranch: false, branch: 'feature/test-branch' }),
    ];
    expect(findStagingBranchInfo(events, cityWithStaging)).toEqual({
      isBranch: true,
      branchName: 'feature/test-branch',
    });
  });

  it('returns isBranch=true with null branchName when the event has no branch field', () => {
    const events = [makeEvent({ isDefaultBranch: false, branch: null })];
    expect(findStagingBranchInfo(events, cityWithStaging)).toEqual({
      isBranch: true,
      branchName: null,
    });
  });

  it('picks the most-recent staging event when multiple exist', () => {
    const events = [
      makeEvent({ detectedAt: '2026-03-01T10:00:00Z', isDefaultBranch: true }),
      makeEvent({
        detectedAt: '2026-03-02T10:00:00Z',
        isDefaultBranch: false,
        branch: 'feature/newer',
      }),
      makeEvent({
        detectedAt: '2026-02-28T10:00:00Z',
        isDefaultBranch: false,
        branch: 'feature/older',
      }),
    ];
    expect(findStagingBranchInfo(events, cityWithStaging)).toEqual({
      isBranch: true,
      branchName: 'feature/newer',
    });
  });

  it('ignores events from other cities even if newer', () => {
    const events = [
      makeEvent({
        cityGroupId: 'tampere',
        detectedAt: '2026-03-05T10:00:00Z',
        isDefaultBranch: false,
        branch: 'feature/wrong-city',
      }),
      makeEvent({
        detectedAt: '2026-03-01T10:00:00Z',
        isDefaultBranch: true,
      }),
    ];
    expect(findStagingBranchInfo(events, cityWithStaging)).toBeNull();
  });

  it('ignores production events even if newer', () => {
    const events = [
      makeEvent({
        environmentId: 'espoo-prod',
        detectedAt: '2026-03-05T10:00:00Z',
        isDefaultBranch: false,
        branch: 'feature/prod-noise',
      }),
      makeEvent({
        detectedAt: '2026-03-01T10:00:00Z',
        isDefaultBranch: true,
      }),
    ];
    expect(findStagingBranchInfo(events, cityWithStaging)).toBeNull();
  });
});
