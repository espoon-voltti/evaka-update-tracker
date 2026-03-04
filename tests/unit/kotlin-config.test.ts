import { parseKotlinFeatureConfig } from '../../src/services/parsers/kotlin-config';

describe('parseKotlinFeatureConfig', () => {
  const espooConfig = `
@Bean
fun featureConfig(): FeatureConfig =
    FeatureConfig(
        valueDecisionCapacityFactorEnabled = false,
        citizenReservationThresholdHours = 150,
        freeAbsenceGivesADailyRefund = true,
        alwaysUseDaycareFinanceDecisionHandler = false, // Doesn't affect Espoo
        paymentNumberSeriesStart = 1, // Payments are not yet in use in Espoo
        unplannedAbsencesAreContractSurplusDays = false, // Doesn't affect Espoo
        maxContractDaySurplusThreshold = null, // Doesn't affect Espoo
        useContractDaysAsDailyFeeDivisor = true,
        requestedStartUpperLimit = 14,
        postOffice = "ESPOO",
        municipalMessageAccountName = "Espoon kaupunki",
        serviceWorkerMessageAccountName = "Palveluohjaus",
        financeMessageAccountName = "Asiakasmaksut",
        applyPlacementUnitFromDecision = false,
        preferredStartRelativeApplicationDueDate = false,
        fiveYearsOldDaycareEnabled = true,
        freeJulyStartOnSeptember = true,
        archiveMetadataOrganization = "Espoon kaupunki",
        archiveMetadataConfigs = { type, year ->
            when (type) {
                ArchiveProcessType.APPLICATION_DAYCARE -> {
                    ArchiveProcessConfig(
                        processDefinitionNumber = "12.06.01",
                        archiveDurationMonths = 10 * 12,
                    )
                }
                ArchiveProcessType.FEE_DECISION -> {
                    ArchiveProcessConfig(
                        processDefinitionNumber = "12.06.07",
                        archiveDurationMonths = 10 * 12,
                    )
                }
            }
        },
        holidayQuestionnaireType = QuestionnaireType.FIXED_PERIOD,
    )
`;

  it('parses boolean values', () => {
    const result = parseKotlinFeatureConfig(espooConfig);
    expect(result.valueDecisionCapacityFactorEnabled).toBe(false);
    expect(result.freeAbsenceGivesADailyRefund).toBe(true);
    expect(result.alwaysUseDaycareFinanceDecisionHandler).toBe(false);
    expect(result.unplannedAbsencesAreContractSurplusDays).toBe(false);
    expect(result.useContractDaysAsDailyFeeDivisor).toBe(true);
    expect(result.applyPlacementUnitFromDecision).toBe(false);
    expect(result.preferredStartRelativeApplicationDueDate).toBe(false);
    expect(result.fiveYearsOldDaycareEnabled).toBe(true);
  });

  it('parses number values', () => {
    const result = parseKotlinFeatureConfig(espooConfig);
    expect(result.citizenReservationThresholdHours).toBe(150);
    expect(result.requestedStartUpperLimit).toBe(14);
    expect(result.paymentNumberSeriesStart).toBe(1);
  });

  it('parses null values', () => {
    const result = parseKotlinFeatureConfig(espooConfig);
    expect(result.maxContractDaySurplusThreshold).toBe(null);
  });

  it('parses enum references as name extraction', () => {
    const result = parseKotlinFeatureConfig(espooConfig);
    expect(result.holidayQuestionnaireType).toBe('FIXED_PERIOD');
  });

  it('skips lambda fields (archiveMetadataConfigs)', () => {
    const result = parseKotlinFeatureConfig(espooConfig);
    expect(result).not.toHaveProperty('archiveMetadataConfigs');
  });

  it('excludes operational strings per FR-009', () => {
    const result = parseKotlinFeatureConfig(espooConfig);
    expect(result).not.toHaveProperty('postOffice');
    expect(result).not.toHaveProperty('municipalMessageAccountName');
    expect(result).not.toHaveProperty('serviceWorkerMessageAccountName');
    expect(result).not.toHaveProperty('financeMessageAccountName');
    expect(result).not.toHaveProperty('archiveMetadataOrganization');
  });

  it('applies default values for unset fields', () => {
    const result = parseKotlinFeatureConfig(espooConfig);
    // freeJulyStartOnSeptember is explicitly set to true, so it should be true
    expect(result.freeJulyStartOnSeptember).toBe(true);
    // These should use defaults since not in the Espoo config
    // daycarePlacementPlanEndMonthDay is not set, so default '07-31'
    expect(result.daycarePlacementPlanEndMonthDay).toBe('07-31');
    // minimumInvoiceAmount not set, default 0
    expect(result.minimumInvoiceAmount).toBe(0);
    // skipGuardianPreschoolDecisionApproval not set, default false
    expect(result.skipGuardianPreschoolDecisionApproval).toBe(false);
  });

  it('ignores inline comments', () => {
    const result = parseKotlinFeatureConfig(espooConfig);
    // Fields with comments should still parse correctly
    expect(result.alwaysUseDaycareFinanceDecisionHandler).toBe(false);
    expect(result.unplannedAbsencesAreContractSurplusDays).toBe(false);
    expect(result.maxContractDaySurplusThreshold).toBe(null);
  });

  describe('Tampere-style config with MonthDay and ApplicationStatus', () => {
    const tampereConfig = `
@Bean
fun featureConfig(): FeatureConfig = FeatureConfig(
    valueDecisionCapacityFactorEnabled = true,
    citizenReservationThresholdHours = 6 * 24, // Tue 00:00
    freeAbsenceGivesADailyRefund = false,
    alwaysUseDaycareFinanceDecisionHandler = true,
    paymentNumberSeriesStart = 1,
    unplannedAbsencesAreContractSurplusDays = true,
    maxContractDaySurplusThreshold = null,
    useContractDaysAsDailyFeeDivisor = true,
    requestedStartUpperLimit = 14,
    postOffice = "TAMPERE",
    municipalMessageAccountName = "Tampereen kaupunki",
    serviceWorkerMessageAccountName = "Asiakaspalvelu",
    financeMessageAccountName = "Asiakasmaksut",
    applyPlacementUnitFromDecision = true,
    preferredStartRelativeApplicationDueDate = true,
    fiveYearsOldDaycareEnabled = false,
    temporaryDaycarePartDayAbsenceGivesADailyRefund = false,
    archiveMetadataOrganization = "Tampereen kaupunki",
    archiveMetadataConfigs = { type, year -> null },
    daycarePlacementPlanEndMonthDay = MonthDay.of(8, 15),
    placementToolApplicationStatus = ApplicationStatus.WAITING_DECISION,
)
`;

    it('parses numeric expressions', () => {
      const result = parseKotlinFeatureConfig(tampereConfig);
      expect(result.citizenReservationThresholdHours).toBe(144);
    });

    it('parses MonthDay.of() to MM-DD format', () => {
      const result = parseKotlinFeatureConfig(tampereConfig);
      expect(result.daycarePlacementPlanEndMonthDay).toBe('08-15');
    });

    it('parses enum reference', () => {
      const result = parseKotlinFeatureConfig(tampereConfig);
      expect(result.placementToolApplicationStatus).toBe('WAITING_DECISION');
    });

    it('parses explicitly set defaults', () => {
      const result = parseKotlinFeatureConfig(tampereConfig);
      expect(result.temporaryDaycarePartDayAbsenceGivesADailyRefund).toBe(false);
    });
  });

  describe('Nokia-style config with complex expressions', () => {
    const nokiaConfig = `
@Bean
fun featureConfig() = FeatureConfig(
    valueDecisionCapacityFactorEnabled = true,
    citizenReservationThresholdHours = 7 * 24 - 9, // Mon 09:00
    freeAbsenceGivesADailyRefund = true,
    alwaysUseDaycareFinanceDecisionHandler = true,
    paymentNumberSeriesStart = null,
    unplannedAbsencesAreContractSurplusDays = true,
    maxContractDaySurplusThreshold = null,
    useContractDaysAsDailyFeeDivisor = true,
    requestedStartUpperLimit = 14,
    postOffice = "NOKIA",
    municipalMessageAccountName = "Nokian kaupunki",
    serviceWorkerMessageAccountName = "Asiakaspalvelu",
    financeMessageAccountName = "Asiakasmaksut",
    applyPlacementUnitFromDecision = true,
    preferredStartRelativeApplicationDueDate = true,
    fiveYearsOldDaycareEnabled = false,
    archiveMetadataOrganization = "Nokian kaupunki",
    archiveMetadataConfigs = { type, year ->
        when (type) {
            ArchiveProcessType.APPLICATION_DAYCARE ->
                ArchiveProcessConfig(
                    processDefinitionNumber = "04.01.00.11",
                    archiveDurationMonths = 10 * 12,
                )
            ArchiveProcessType.APPLICATION_CLUB -> null
            ArchiveProcessType.FEE_DECISION -> ArchiveProcessConfig(
                processDefinitionNumber = "04.01.00.12",
                archiveDurationMonths = 15 * 12,
            )
        }
    },
    daycarePlacementPlanEndMonthDay = MonthDay.of(8, 15),
    placementToolApplicationStatus = ApplicationStatus.WAITING_DECISION,
)
`;

    it('evaluates arithmetic expressions', () => {
      const result = parseKotlinFeatureConfig(nokiaConfig);
      expect(result.citizenReservationThresholdHours).toBe(159);
    });

    it('handles null payment start', () => {
      const result = parseKotlinFeatureConfig(nokiaConfig);
      expect(result.paymentNumberSeriesStart).toBe(null);
    });
  });

  it('throws when FeatureConfig constructor is not found', () => {
    const source = '@Bean fun someOtherConfig() = OtherConfig()';
    expect(() => parseKotlinFeatureConfig(source)).toThrow(
      'Could not find FeatureConfig constructor call'
    );
  });
});
