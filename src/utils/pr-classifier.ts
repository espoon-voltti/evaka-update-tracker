const BOT_AUTHORS = [
  'dependabot[bot]',
  'dependabot',
  'renovate[bot]',
  'renovate',
];

const BOT_MESSAGE_PATTERNS = [
  /^bump \S+ from \S+ to \S+/i,
  /^update dependency/i,
  /^chore\(deps\)/i,
  /^build\(deps\)/i,
];

export function isBotPR(author: string, commitMessage: string): boolean {
  if (BOT_AUTHORS.includes(author.toLowerCase())) {
    return true;
  }
  return BOT_MESSAGE_PATTERNS.some((pattern) => pattern.test(commitMessage));
}
