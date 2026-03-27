import { collectFeatureFlags, mergeFeatureFlagFallback } from '../../src/services/feature-flag-collector';
import { FeatureFlagCityConfig } from '../../src/config/feature-flag-cities';
import { FeatureFlagData } from '../../src/types';
import * as github from '../../src/api/github';

jest.mock('../../src/api/github');

const mockGetFileContent = github.getFileContent as jest.MockedFunction<
  typeof github.getFileContent
>;

const espooFrontend = `
const features: Features = {
  default: { environmentLabel: 'Test', citizenShiftCareAbsence: true },
  prod: {
    environmentLabel: null,
    citizenShiftCareAbsence: true,
    assistanceActionOther: false,
    daycareApplication: { dailyTimes: true, serviceNeedOption: false }
  }
}
`;

const espooBackend = `
@Bean
fun featureConfig(): FeatureConfig = FeatureConfig(
    valueDecisionCapacityFactorEnabled = false,
    citizenReservationThresholdHours = 150,
    freeAbsenceGivesADailyRefund = true,
    alwaysUseDaycareFinanceDecisionHandler = false,
    paymentNumberSeriesStart = 1,
    unplannedAbsencesAreContractSurplusDays = false,
    maxContractDaySurplusThreshold = null,
    useContractDaysAsDailyFeeDivisor = true,
    requestedStartUpperLimit = 14,
    postOffice = "ESPOO",
    municipalMessageAccountName = "Espoo",
    serviceWorkerMessageAccountName = "Test",
    financeMessageAccountName = "Test",
    applyPlacementUnitFromDecision = false,
    preferredStartRelativeApplicationDueDate = false,
    fiveYearsOldDaycareEnabled = true,
    archiveMetadataOrganization = "Test",
    archiveMetadataConfigs = { type, year -> null },
)
`;

const tampereFrontend = `
const prod: FeatureFlags = {
  environmentLabel: null,
  citizenShiftCareAbsence: false,
  assistanceActionOther: true,
  daycareApplication: { dailyTimes: false, serviceNeedOption: true }
}

const features: Features = { default: prod, staging: prod, prod }
`;

const tampereBackend = `
@Bean
fun featureConfig(): FeatureConfig = FeatureConfig(
    valueDecisionCapacityFactorEnabled = true,
    citizenReservationThresholdHours = 144,
    freeAbsenceGivesADailyRefund = false,
    alwaysUseDaycareFinanceDecisionHandler = true,
    paymentNumberSeriesStart = 1,
    unplannedAbsencesAreContractSurplusDays = true,
    maxContractDaySurplusThreshold = null,
    useContractDaysAsDailyFeeDivisor = true,
    requestedStartUpperLimit = 14,
    postOffice = "TAMPERE",
    municipalMessageAccountName = "Tampere",
    serviceWorkerMessageAccountName = "Test",
    financeMessageAccountName = "Test",
    applyPlacementUnitFromDecision = true,
    preferredStartRelativeApplicationDueDate = true,
    fiveYearsOldDaycareEnabled = false,
    archiveMetadataOrganization = "Test",
    archiveMetadataConfigs = { type, year -> null },
)
`;

const cities: FeatureFlagCityConfig[] = [
  {
    id: 'espoo',
    name: 'Espoo',
    cityGroupId: 'espoo',
    repository: { owner: 'espoon-voltti', name: 'evaka' },
    frontendPath: 'frontend/espoo/featureFlags.tsx',
    backendPath: 'service/EspooConfig.kt',
  },
  {
    id: 'tampere',
    name: 'Tampere',
    cityGroupId: 'tampere-region',
    repository: { owner: 'Tampere', name: 'trevaka' },
    frontendPath: 'frontend/tampere/featureFlags.tsx',
    backendPath: 'service/TampereConfig.kt',
  },
];

describe('collectFeatureFlags', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('collects flags from multiple cities', async () => {
    mockGetFileContent
      .mockResolvedValueOnce(espooFrontend) // espoo frontend
      .mockResolvedValueOnce(espooBackend) // espoo backend
      .mockResolvedValueOnce(tampereFrontend) // tampere frontend
      .mockResolvedValueOnce(tampereBackend); // tampere backend

    const result = await collectFeatureFlags(cities);

    expect(result.cities).toHaveLength(2);
    expect(result.cities[0]).toEqual({
      id: 'espoo',
      name: 'Espoo',
      cityGroupId: 'espoo',
      error: null,
    });
    expect(result.cities[1]).toEqual({
      id: 'tampere',
      name: 'Tampere',
      cityGroupId: 'tampere-region',
      error: null,
    });

    expect(result.categories).toHaveLength(2);
    expect(result.categories[0].id).toBe('frontend');
    expect(result.categories[1].id).toBe('backend');

    // Check a frontend flag
    const frontendFlags = result.categories[0].flags;
    const shiftCare = frontendFlags.find(
      (f) => f.key === 'citizenShiftCareAbsence'
    );
    expect(shiftCare).toBeDefined();
    expect(shiftCare!.values.espoo).toBe(true);
    expect(shiftCare!.values.tampere).toBe(false);

    // Check nested flag
    const dailyTimes = frontendFlags.find(
      (f) => f.key === 'daycareApplication.dailyTimes'
    );
    expect(dailyTimes).toBeDefined();
    expect(dailyTimes!.values.espoo).toBe(true);
    expect(dailyTimes!.values.tampere).toBe(false);

    // Check backend flag
    const backendFlags = result.categories[1].flags;
    const capacityFactor = backendFlags.find(
      (f) => f.key === 'valueDecisionCapacityFactorEnabled'
    );
    expect(capacityFactor).toBeDefined();
    expect(capacityFactor!.values.espoo).toBe(false);
    expect(capacityFactor!.values.tampere).toBe(true);
  });

  it('handles per-city errors gracefully', async () => {
    mockGetFileContent
      .mockResolvedValueOnce(espooFrontend) // espoo frontend
      .mockResolvedValueOnce(espooBackend) // espoo backend
      .mockRejectedValueOnce(new Error('HTTP 404')); // tampere frontend fails

    const result = await collectFeatureFlags(cities);

    expect(result.cities[0].error).toBe(null);
    expect(result.cities[1].error).toBe('HTTP 404');

    // Espoo should still have flags
    const frontendFlags = result.categories[0].flags;
    const shiftCare = frontendFlags.find(
      (f) => f.key === 'citizenShiftCareAbsence'
    );
    expect(shiftCare!.values.espoo).toBe(true);
    // Tampere should have null since it failed
    expect(shiftCare!.values.tampere).toBe(null);
  });

  it('applies labels to flags', async () => {
    mockGetFileContent
      .mockResolvedValueOnce(espooFrontend)
      .mockResolvedValueOnce(espooBackend)
      .mockResolvedValueOnce(tampereFrontend)
      .mockResolvedValueOnce(tampereBackend);

    const result = await collectFeatureFlags(cities);

    const frontendFlags = result.categories[0].flags;
    const shiftCare = frontendFlags.find(
      (f) => f.key === 'citizenShiftCareAbsence'
    );
    expect(shiftCare!.label).toBe('Vuorohoidon poissaolot kuntalaisille');

    const backendFlags = result.categories[1].flags;
    const threshold = backendFlags.find(
      (f) => f.key === 'citizenReservationThresholdHours'
    );
    expect(threshold!.label).toBe('Varausten lukitusraja (tuntia)');
  });

  it('includes generatedAt timestamp', async () => {
    mockGetFileContent
      .mockResolvedValueOnce(espooFrontend)
      .mockResolvedValueOnce(espooBackend)
      .mockResolvedValueOnce(tampereFrontend)
      .mockResolvedValueOnce(tampereBackend);

    const result = await collectFeatureFlags(cities);
    expect(result.generatedAt).toBeDefined();
    expect(new Date(result.generatedAt).getTime()).not.toBeNaN();
  });
});

describe('mergeFeatureFlagFallback', () => {
  it('restores previous flag values for errored cities', () => {
    const current: FeatureFlagData = {
      generatedAt: '2026-03-27T12:00:00Z',
      cities: [
        { id: 'espoo', name: 'Espoo', cityGroupId: 'espoo', error: 'HTTP 404' },
        { id: 'tampere', name: 'Tampere', cityGroupId: 'tampere-region', error: null },
      ],
      categories: [
        {
          id: 'frontend',
          label: 'Frontend',
          flags: [
            { key: 'flagA', label: 'Flag A', type: 'boolean', values: { espoo: null, tampere: true } },
          ],
        },
      ],
    };

    const previous: FeatureFlagData = {
      generatedAt: '2026-03-15T10:00:00Z',
      cities: [
        { id: 'espoo', name: 'Espoo', cityGroupId: 'espoo', error: null },
        { id: 'tampere', name: 'Tampere', cityGroupId: 'tampere-region', error: null },
      ],
      categories: [
        {
          id: 'frontend',
          label: 'Frontend',
          flags: [
            { key: 'flagA', label: 'Flag A', type: 'boolean', values: { espoo: false, tampere: true } },
          ],
        },
      ],
    };

    mergeFeatureFlagFallback(current, previous);

    expect(current.categories[0].flags[0].values.espoo).toBe(false);
    expect(current.categories[0].flags[0].values.tampere).toBe(true);
    expect(current.errorFallbackDate).toBe('2026-03-15T10:00:00Z');
  });

  it('does nothing when no cities have errors', () => {
    const current: FeatureFlagData = {
      generatedAt: '2026-03-27T12:00:00Z',
      cities: [
        { id: 'espoo', name: 'Espoo', cityGroupId: 'espoo', error: null },
      ],
      categories: [
        {
          id: 'frontend',
          label: 'Frontend',
          flags: [
            { key: 'flagA', label: 'Flag A', type: 'boolean', values: { espoo: true } },
          ],
        },
      ],
    };

    const previous: FeatureFlagData = {
      generatedAt: '2026-03-15T10:00:00Z',
      cities: [
        { id: 'espoo', name: 'Espoo', cityGroupId: 'espoo', error: null },
      ],
      categories: [
        {
          id: 'frontend',
          label: 'Frontend',
          flags: [
            { key: 'flagA', label: 'Flag A', type: 'boolean', values: { espoo: false } },
          ],
        },
      ],
    };

    mergeFeatureFlagFallback(current, previous);

    expect(current.categories[0].flags[0].values.espoo).toBe(true);
    expect(current.errorFallbackDate).toBeUndefined();
  });
});
