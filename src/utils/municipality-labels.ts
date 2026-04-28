const MUNICIPALITY_LABEL_TO_CITY_GROUP: Record<string, string> = {
  turku: 'turku',
  espoo: 'espoo',
  oulu: 'oulu',
  seutu: 'tampere-region',
};

const MUNICIPALITY_LABEL_NAMES: Record<string, string> = {
  turku: 'Turku',
  espoo: 'Espoo',
  oulu: 'Oulu',
  seutu: 'Tampereen seutu',
};

export function getMunicipalityCityGroups(labels: string[]): string[] | null {
  const groups = labels
    .map((l) => MUNICIPALITY_LABEL_TO_CITY_GROUP[l])
    .filter((g): g is string => g !== undefined);
  return groups.length > 0 ? groups : null;
}

export function prBelongsToCity(labels: string[], cityGroupId: string): boolean {
  const groups = getMunicipalityCityGroups(labels);
  return groups === null || groups.includes(cityGroupId);
}

export function getMunicipalityNames(labels: string[]): string[] {
  return labels
    .map((l) => MUNICIPALITY_LABEL_NAMES[l])
    .filter((n): n is string => n !== undefined);
}
