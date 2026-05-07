import { SLACK_LABEL_MAP, formatLabelTags } from '../../src/config/label-map';

describe('SLACK_LABEL_MAP', () => {
  it('contains all 11 expected label mappings', () => {
    expect(Object.keys(SLACK_LABEL_MAP)).toHaveLength(11);
  });

  it('maps bugfix to Korjaus', () => {
    expect(SLACK_LABEL_MAP['bugfix']).toBe('Korjaus');
  });

  it('maps tech to Tekninen', () => {
    expect(SLACK_LABEL_MAP['tech']).toBe('Tekninen');
  });

  it('maps enhancement to Parannus', () => {
    expect(SLACK_LABEL_MAP['enhancement']).toBe('Parannus');
  });
});

describe('formatLabelTags', () => {
  it('formats a single mapped label', () => {
    expect(formatLabelTags(['bugfix'])).toBe('[Korjaus]');
  });

  it('formats multiple mapped labels with space separation', () => {
    expect(formatLabelTags(['bugfix', 'frontend'])).toBe('[Korjaus] [Käyttöliittymä]');
  });

  it('returns empty string for empty array', () => {
    expect(formatLabelTags([])).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(formatLabelTags(undefined)).toBe('');
  });

  it('ignores unmapped labels', () => {
    expect(formatLabelTags(['wontfix', 'bugfix'])).toBe('[Korjaus]');
  });

  it('returns empty string when all labels are unmapped', () => {
    expect(formatLabelTags(['wontfix', 'custom-label'])).toBe('');
  });

  it('formats all 11 mapped labels', () => {
    const allLabels = Object.keys(SLACK_LABEL_MAP);
    const result = formatLabelTags(allLabels);
    for (const text of Object.values(SLACK_LABEL_MAP)) {
      expect(result).toContain(`[${text}]`);
    }
  });
});
