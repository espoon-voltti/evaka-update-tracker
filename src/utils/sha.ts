/** Length of a short Git SHA used in logs and UI labels. */
export const SHORT_SHA_LENGTH = 7;

/** Truncate a full Git SHA to the conventional 7-character short form. */
export function toShortSha(sha: string): string {
  return sha.slice(0, SHORT_SHA_LENGTH);
}
