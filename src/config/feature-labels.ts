/**
 * Finnish labels for feature flags and backend config fields.
 * Derived from JSDoc comments in types.d.ts and FeatureConfig.kt.
 */
export const FEATURE_LABELS: Record<string, string> = {
  // Frontend flags (from BaseFeatureFlags in types.d.ts)
  citizenShiftCareAbsence: 'Vuorohoidon poissaolot kansalaisille',
  assistanceActionOther: 'Tukitoimi: muu',
  'daycareApplication.dailyTimes': 'Päivähoitohakemus: päivittäiset ajat',
  'daycareApplication.serviceNeedOption': 'Päivähoitohakemus: palveluntarpeen valinta',
  'preschoolApplication.connectedDaycarePreferredStartDate':
    'Esiopetushakemus: liittyvän päivähoidon aloituspäivä',
  'preschoolApplication.serviceNeedOption': 'Esiopetushakemus: palveluntarpeen valinta',
  decisionDraftMultipleUnits: 'Sijoitushahmotelma: erilliset yksiköt',
  preschool: 'Esiopetuksen tuki',
  preparatory: 'Valmistava opetus',
  urgencyAttachments: 'Kiireellisyyden liitteet',
  financeDecisionHandlerSelect: 'Talouspäätöksen käsittelijän valinta',
  feeDecisionPreschoolClubFilter: 'Maksupäätökset: esiopetuskerhon suodatus',
  placementGuarantee: 'Paikkavakuus',
  intermittentShiftCare: 'Ajoittainen vuorohoito',
  citizenAttendanceSummary: 'Kansalaisen läsnäoloyhteenveto',
  noAbsenceType: 'Ei poissaolotyyppiä mobiilissa',
  voucherUnitPayments: 'Palvelusetelimaksatus',
  voucherValueSeparation: 'Palveluseteliarvojen erittely',
  extendedPreschoolTerm: 'Laajennettu esiopetuskausi',
  hideClubApplication: 'Piilota kerhohakemus',
  discussionReservations: 'Keskusteluvaraukset',
  jamixIntegration: 'Jamix-ruokatilausintegraatio',
  aromiIntegration: 'Aromi-ruokatilausintegraatio',
  nekkuIntegration: 'Nekku-ruokatilausintegraatio',
  forceUnpublishDocumentTemplate: 'Asiakirjamallien pakkojulkaisun peruminen',
  invoiceDisplayAccountNumber: 'Tilinumero laskun tiedoissa',
  serviceApplications: 'Palveluntarvemuutokset',
  absenceApplications: 'Poissaolohakemukset',
  titaniaErrorsReport: 'Titania-virheraportit',
  multiSelectDeparture: 'Monen lapsen lähtökirjaus',
  requireAttachments: 'Liitteiden pakollisuus',
  'archiveIntegration.decisions': 'Arkistointi: päätökset',
  'archiveIntegration.childDocuments': 'Arkistointi: lapsiasiakirjat',
  'archiveIntegration.feeDecisions': 'Arkistointi: maksupäätökset',
  'archiveIntegration.voucherValueDecisions': 'Arkistointi: arvopäätökset',
  citizenChildDocumentTypes: 'Kansalaisen lapsiasiakirjatyypit',
  decisionChildDocumentTypes: 'Päätösasiakirjatyypit',
  showCitizenApplicationPreschoolTerms: 'Esiopetuskauden tiedot hakemuksella',
  missingQuestionnaireAnswerMarkerEnabled: 'Puuttuvan kyselyvastauksen merkintä',
  showMetadataToCitizen: 'Metatiedot kansalaiselle',
  placementDesktop: 'Sijoituksen työpöytänäkymä',

  // Backend config (from FeatureConfig.kt)
  valueDecisionCapacityFactorEnabled: 'Kapasiteettikerroin arvopäätöksissä',
  citizenReservationThresholdHours: 'Varausten lukitusraja (tuntia)',
  freeAbsenceGivesADailyRefund: 'Vapaan poissaolon päiväkorvaus',
  alwaysUseDaycareFinanceDecisionHandler: 'Käytä aina yksikön talouskäsittelijää',
  paymentNumberSeriesStart: 'Maksatusnumeroinnin aloitus',
  unplannedAbsencesAreContractSurplusDays: 'Suunnittelemattomat poissaolot sopimuspäivinä',
  maxContractDaySurplusThreshold: 'Sopimuspäivien ylitysraja',
  useContractDaysAsDailyFeeDivisor: 'Sopimuspäivät päivähinta-jakajana',
  requestedStartUpperLimit: 'Aloituspäivän siirtorajat (päivää)',
  applyPlacementUnitFromDecision: 'Sijoitusyksikkö päätöksestä',
  preferredStartRelativeApplicationDueDate: 'Eräpäivä suhteessa toivottuun aloitukseen',
  fiveYearsOldDaycareEnabled: '5-vuotiaiden päivähoitosijoitukset',
  temporaryDaycarePartDayAbsenceGivesADailyRefund: 'Tilapäisen osapäiväisen poissaolokorvaus',
  freeJulyStartOnSeptember: 'Maksuton heinäkuu syyskuun aloituksella',
  daycarePlacementPlanEndMonthDay: 'Sijoitussuunnitelman päättymispäivä',
  placementToolApplicationStatus: 'Sijoitustyökalun hakemusten tila',
  holidayQuestionnaireType: 'Lomakyselyn tyyppi',
  minimumInvoiceAmount: 'Laskun vähimmäissumma (senttejä)',
  skipGuardianPreschoolDecisionApproval: 'Ohita esiopetuspäätöksen huoltajan hyväksyntä',
};

/**
 * Get Finnish label for a flag key. Falls back to the raw key.
 */
export function getLabel(key: string): string {
  return FEATURE_LABELS[key] ?? key;
}
