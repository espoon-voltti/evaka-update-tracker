import { countNonVisibleStagingCommits } from '../../site/js/utils.js';

const city = {
  id: 'tampere-region',
  environments: [
    { id: 'tampere-prod', type: 'production' },
    { id: 'tampere-test', type: 'staging' },
  ],
};

const cityNoStaging = {
  id: 'static',
  environments: [{ id: 'static-prod', type: 'production' }],
};

function stagingEvent(overrides = {}) {
  return {
    cityGroupId: 'tampere-region',
    environmentId: 'tampere-test',
    detectedAt: '2026-05-19T05:00:00Z',
    newCommit: { sha: 'abc1234', date: '2026-05-19T04:30:00Z' },
    includedPRs: [],
    ...overrides,
  };
}

describe('countNonVisibleStagingCommits', () => {
  it('returns 0 when the city has no staging environment', () => {
    expect(countNonVisibleStagingCommits([stagingEvent()], cityNoStaging)).toBe(0);
  });

  it('returns 0 when the most recent change is a visible PR', () => {
    const events = [
      stagingEvent({
        includedPRs: [
          { number: 9101, mergedAt: '2026-05-18T11:39:35Z', isHidden: false },
        ],
      }),
    ];
    expect(countNonVisibleStagingCommits(events, city)).toBe(0);
  });

  it('counts an isolated city-irrelevant deploy recorded as an event with no PRs', () => {
    const events = [
      stagingEvent({
        detectedAt: '2026-05-20T04:00:00Z',
        newCommit: { sha: 'fe12061', date: '2026-05-18T13:31:42Z' },
        includedPRs: [],
      }),
      stagingEvent({
        detectedAt: '2026-05-19T04:00:00Z',
        newCommit: { sha: '017e9cd', date: '2026-05-18T11:00:00Z' },
        includedPRs: [
          { number: 9101, mergedAt: '2026-05-18T11:39:35Z', isHidden: false },
        ],
      }),
    ];
    expect(countNonVisibleStagingCommits(events, city)).toBe(1);
  });

  it('counts a hidden PR bundled into the same event as a visible PR (the tampere bug)', () => {
    const events = [
      stagingEvent({
        newCommit: { sha: 'fe12061', date: '2026-05-18T13:31:42Z' },
        includedPRs: [
          { number: 9101, mergedAt: '2026-05-18T11:39:35Z', isHidden: false },
          { number: 9072, mergedAt: '2026-05-18T13:31:42Z', isHidden: true },
        ],
      }),
    ];
    expect(countNonVisibleStagingCommits(events, city)).toBe(1);
  });

  it('does not count a hidden PR that is older than the newest visible PR', () => {
    const events = [
      stagingEvent({
        includedPRs: [
          { number: 1, mergedAt: '2026-05-18T13:00:00Z', isHidden: false },
          { number: 2, mergedAt: '2026-05-18T10:00:00Z', isHidden: true },
        ],
      }),
    ];
    expect(countNonVisibleStagingCommits(events, city)).toBe(0);
  });

  it('counts every trailing hidden change before the last visible one', () => {
    const events = [
      stagingEvent({
        includedPRs: [
          { number: 1, mergedAt: '2026-05-18T10:00:00Z', isHidden: false },
          { number: 2, mergedAt: '2026-05-18T12:00:00Z', isHidden: true },
          { number: 3, mergedAt: '2026-05-18T13:00:00Z', isHidden: true },
        ],
      }),
    ];
    expect(countNonVisibleStagingCommits(events, city)).toBe(2);
  });

  it('ignores events from other cities', () => {
    const events = [
      stagingEvent({
        cityGroupId: 'oulu',
        environmentId: 'oulu-staging',
        newCommit: { sha: 'other', date: '2026-05-21T00:00:00Z' },
        includedPRs: [],
      }),
      stagingEvent({
        includedPRs: [
          { number: 9101, mergedAt: '2026-05-18T11:39:35Z', isHidden: false },
        ],
      }),
    ];
    expect(countNonVisibleStagingCommits(events, city)).toBe(0);
  });

  it('ignores branch-deployment events even when their commit date is newer', () => {
    const events = [
      stagingEvent({
        detectedAt: '2026-03-27T08:00:00Z',
        isDefaultBranch: false,
        newCommit: { sha: 'branch1', date: '2026-03-27T07:00:00Z' },
        includedPRs: [],
      }),
      stagingEvent({
        detectedAt: '2026-03-02T10:00:00Z',
        includedPRs: [
          { number: 8629, mergedAt: '2026-03-02T13:41:42Z', isHidden: false },
        ],
      }),
    ];
    expect(countNonVisibleStagingCommits(events, city)).toBe(0);
  });

  it('ignores production events', () => {
    const events = [
      stagingEvent({
        environmentId: 'tampere-prod',
        newCommit: { sha: 'prodnoise', date: '2026-05-21T00:00:00Z' },
        includedPRs: [],
      }),
      stagingEvent({
        includedPRs: [
          { number: 9101, mergedAt: '2026-05-18T11:39:35Z', isHidden: false },
        ],
      }),
    ];
    expect(countNonVisibleStagingCommits(events, city)).toBe(0);
  });
});
