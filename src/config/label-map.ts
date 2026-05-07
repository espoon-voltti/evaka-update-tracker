/**
 * GitHub label → Finnish display name mapping for Slack messages.
 * Must stay in sync with LABEL_MAP in site/js/components/pr-list.js
 * (enforced by tests/cross-check/label-map-sync.test.ts).
 */
export const SLACK_LABEL_MAP: Record<string, string> = {
  bugfix: 'Korjaus',
  enhancement: 'Parannus',
  tech: 'Tekninen',
  breaking: 'Päivitystoimia',
  dependencies: 'Riippuvuus',
  frontend: 'Käyttöliittymä',
  java: 'Java',
  javascript: 'JavaScript',
  service: 'Palvelu',
  submodules: 'Alimoduuli',
  apigw: 'API-yhdyskäytävä',
};

/**
 * Formats PR labels as bracketed Finnish tags for Slack messages.
 * Returns e.g. "[Korjaus] [Tekninen]" or empty string if no mapped labels.
 */
export function formatLabelTags(labels: string[] | undefined): string {
  if (!labels || labels.length === 0) return '';
  return labels
    .map((name) => SLACK_LABEL_MAP[name])
    .filter(Boolean)
    .map((text) => `[${text}]`)
    .join(' ');
}
