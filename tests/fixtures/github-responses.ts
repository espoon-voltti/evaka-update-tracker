// Sample GitHub API responses for testing

export const sampleCommitResponse = {
  sha: 'abc123def456789012345678901234567890abcd',
  commit: {
    message: 'Merge pull request #8504 from dev/feature-x\n\nAdd new feature X',
    author: { date: '2026-03-01T15:30:00Z', name: 'Developer One' },
  },
  author: { login: 'developer1' },
};

export const sampleSubmoduleResponse = {
  type: 'submodule',
  sha: 'core456def789012345678901234567890abcdef',
  name: 'evaka',
  path: 'evaka',
  submodule_git_url: 'https://github.com/espoon-voltti/evaka.git',
};

export const sampleCompareResponse = {
  commits: [
    {
      sha: 'commit1sha',
      commit: {
        message: 'Merge pull request #8504 from dev/feature-x',
        author: { date: '2026-03-01T14:00:00Z', name: 'Developer One' },
      },
      author: { login: 'developer1' },
    },
    {
      sha: 'commit2sha',
      commit: {
        message: 'Fix login issue (#8503)',
        author: { date: '2026-03-01T12:00:00Z', name: 'Developer Two' },
      },
      author: { login: 'developer2' },
    },
    {
      sha: 'commit3sha',
      commit: {
        message: 'Bump evaka from 1.0 to 1.1',
        author: { date: '2026-03-01T10:00:00Z', name: 'dependabot[bot]' },
      },
      author: { login: 'dependabot[bot]' },
    },
  ],
};

export const samplePRResponse = {
  number: 8504,
  title: 'Add new feature X',
  user: { login: 'developer1' },
  merged_at: '2026-03-01T14:00:00Z',
  html_url: 'https://github.com/espoon-voltti/evaka/pull/8504',
  state: 'closed',
};

export const sampleStatusResponse = {
  apiVersion: 'abc123def456789012345678901234567890abcd',
};
