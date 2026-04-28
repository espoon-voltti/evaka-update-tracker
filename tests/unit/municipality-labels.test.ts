import {
  getMunicipalityCityGroups,
  prBelongsToCity,
  getMunicipalityNames,
} from '../../src/utils/municipality-labels';

describe('getMunicipalityCityGroups', () => {
  it('returns null for a PR with no labels', () => {
    expect(getMunicipalityCityGroups([])).toBeNull();
  });

  it('returns null for a PR with no municipality labels', () => {
    expect(getMunicipalityCityGroups(['bug', 'enhancement'])).toBeNull();
  });

  it('returns city group for turku label', () => {
    expect(getMunicipalityCityGroups(['turku'])).toEqual(['turku']);
  });

  it('returns city group for espoo label', () => {
    expect(getMunicipalityCityGroups(['espoo'])).toEqual(['espoo']);
  });

  it('returns city group for oulu label', () => {
    expect(getMunicipalityCityGroups(['oulu'])).toEqual(['oulu']);
  });

  it('returns tampere-region for seutu label', () => {
    expect(getMunicipalityCityGroups(['seutu'])).toEqual(['tampere-region']);
  });

  it('returns multiple city groups for multiple municipality labels', () => {
    const result = getMunicipalityCityGroups(['turku', 'oulu']);
    expect(result).toEqual(expect.arrayContaining(['turku', 'oulu']));
    expect(result).toHaveLength(2);
  });

  it('ignores non-municipality labels mixed in', () => {
    expect(getMunicipalityCityGroups(['bug', 'turku', 'enhancement'])).toEqual(['turku']);
  });
});

describe('prBelongsToCity', () => {
  it('returns true for a shared PR (no labels) in any city', () => {
    expect(prBelongsToCity([], 'turku')).toBe(true);
    expect(prBelongsToCity([], 'espoo')).toBe(true);
    expect(prBelongsToCity([], 'oulu')).toBe(true);
    expect(prBelongsToCity([], 'tampere-region')).toBe(true);
  });

  it('returns true for a PR with only non-municipality labels in any city', () => {
    expect(prBelongsToCity(['bug', 'enhancement'], 'turku')).toBe(true);
    expect(prBelongsToCity(['bug', 'enhancement'], 'espoo')).toBe(true);
  });

  it('returns true for a turku PR in turku city group', () => {
    expect(prBelongsToCity(['turku'], 'turku')).toBe(true);
  });

  it('returns false for a turku PR in espoo city group', () => {
    expect(prBelongsToCity(['turku'], 'espoo')).toBe(false);
  });

  it('returns false for a turku PR in oulu city group', () => {
    expect(prBelongsToCity(['turku'], 'oulu')).toBe(false);
  });

  it('returns false for a turku PR in tampere-region city group', () => {
    expect(prBelongsToCity(['turku'], 'tampere-region')).toBe(false);
  });

  it('returns true for a seutu PR in tampere-region city group', () => {
    expect(prBelongsToCity(['seutu'], 'tampere-region')).toBe(true);
  });

  it('returns false for a seutu PR in turku city group', () => {
    expect(prBelongsToCity(['seutu'], 'turku')).toBe(false);
  });

  it('returns true for a multi-label PR in one of the matching cities', () => {
    expect(prBelongsToCity(['turku', 'oulu'], 'turku')).toBe(true);
    expect(prBelongsToCity(['turku', 'oulu'], 'oulu')).toBe(true);
  });

  it('returns false for a multi-label PR in a non-matching city', () => {
    expect(prBelongsToCity(['turku', 'oulu'], 'espoo')).toBe(false);
    expect(prBelongsToCity(['turku', 'oulu'], 'tampere-region')).toBe(false);
  });
});

describe('getMunicipalityNames', () => {
  it('returns empty array for no labels', () => {
    expect(getMunicipalityNames([])).toEqual([]);
  });

  it('returns empty array for non-municipality labels', () => {
    expect(getMunicipalityNames(['bug', 'enhancement'])).toEqual([]);
  });

  it('returns display name for turku', () => {
    expect(getMunicipalityNames(['turku'])).toEqual(['Turku']);
  });

  it('returns display name for espoo', () => {
    expect(getMunicipalityNames(['espoo'])).toEqual(['Espoo']);
  });

  it('returns display name for oulu', () => {
    expect(getMunicipalityNames(['oulu'])).toEqual(['Oulu']);
  });

  it('returns display name for seutu', () => {
    expect(getMunicipalityNames(['seutu'])).toEqual(['Tampereen seutu']);
  });

  it('returns multiple display names for multiple municipality labels', () => {
    expect(getMunicipalityNames(['turku', 'oulu'])).toEqual(['Turku', 'Oulu']);
  });

  it('ignores non-municipality labels', () => {
    expect(getMunicipalityNames(['bug', 'turku'])).toEqual(['Turku']);
  });
});
