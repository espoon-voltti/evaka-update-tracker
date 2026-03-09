# Research: Update Finnish Feature Labels

## Decision Summary

Based on comparing `src/config/feature-labels.ts` against evaka's i18n files and wiki documentation, the following label changes are needed.

### Source Files Referenced

- **Employee i18n**: `/Volumes/Evaka/evaka/frontend/src/lib-customizations/defaults/employee/i18n/fi.tsx`
- **Citizen i18n**: `/Volumes/Evaka/evaka/frontend/src/lib-customizations/defaults/citizen/i18n/fi.tsx`
- **Components i18n**: `/Volumes/Evaka/evaka/frontend/src/lib-customizations/defaults/components/i18n/fi.tsx`
- **Mobile i18n**: `/Volumes/Evaka/evaka/frontend/src/lib-customizations/defaults/employee-mobile-frontend/i18n/fi.ts`
- **Wiki**: `/Volumes/Evaka/evaka.wiki/`

---

## Labels That Need Changes

### 1. "kansalainen" → "kuntalainen" (4 labels)

**Decision**: Replace all forms of "kansalainen" with "kuntalainen"
**Rationale**: evaka defines `CITIZEN: 'kuntalainen'` in components/i18n/fi.tsx:40 and employee/i18n/fi.tsx:258. The term "kuntalainen" (municipal resident) is used consistently throughout the UI.

| Key | Current | Proposed |
|-----|---------|----------|
| citizenShiftCareAbsence | Vuorohoidon poissaolot kansalaisille | Vuorohoidon poissaolot kuntalaisille |
| citizenAttendanceSummary | Kansalaisen läsnäoloyhteenveto | Kuntalaisen läsnäoloyhteenveto |
| citizenChildDocumentTypes | Kansalaisen lapsiasiakirjatyypit | Kuntalaisen lapsiasiakirjatyypit |
| showMetadataToCitizen | Metatiedot kansalaiselle | Metatiedot kuntalaiselle |

### 2. "päivittäiset ajat" → "päivittäinen varhaiskasvatusaika" (1 label)

**Decision**: Use evaka's actual term for daily daycare time
**Rationale**: evaka employee i18n uses "Päivittäinen varhaiskasvatusaika" (fi.tsx:764, 788) and citizen i18n uses the same (fi.tsx:941). The current label "päivittäiset ajat" is a generic paraphrase.

| Key | Current | Proposed |
|-----|---------|----------|
| daycareApplication.dailyTimes | Päivähoitohakemus: päivittäiset ajat | Päivähoitohakemus: päivittäinen varhaiskasvatusaika |

### 3. "liittyvän päivähoidon" → "liittyvän varhaiskasvatuksen" (1 label)

**Decision**: Use "varhaiskasvatus" instead of "päivähoito" for connected daycare
**Rationale**: evaka consistently uses "liittyvä varhaiskasvatus" (employee i18n fi.tsx:3009-3021). "Varhaiskasvatus" (early childhood education) is the modern official Finnish term.

| Key | Current | Proposed |
|-----|---------|----------|
| preschoolApplication.connectedDaycarePreferredStartDate | Esiopetushakemus: liittyvän päivähoidon aloituspäivä | Esiopetushakemus: liittyvän varhaiskasvatuksen aloituspäivä |

### 4. "Paikkavakuus" → "Varhaiskasvatuspaikkatakuu" (1 label)

**Decision**: Use evaka's actual term for placement guarantee
**Rationale**: evaka employee i18n uses "Varhaiskasvatuspaikkatakuu" (fi.tsx:1250, 4075). "Paikkavakuus" is not found in evaka's translations.

| Key | Current | Proposed |
|-----|---------|----------|
| placementGuarantee | Paikkavakuus | Varhaiskasvatuspaikkatakuu |

### 5. "Asiakirjamallien" → "Asiakirjapohjien" (1 label)

**Decision**: Use "asiakirjapohja" instead of "asiakirjamalli"
**Rationale**: evaka employee i18n uses "asiakirjapohja" throughout (fi.tsx:4941 "Uusi asiakirjapohja", fi.tsx:30 "Asiakirjapohjat"). "Asiakirjamalli" is not used in evaka.

| Key | Current | Proposed |
|-----|---------|----------|
| forceUnpublishDocumentTemplate | Asiakirjamallien pakkojulkaisun peruminen | Asiakirjapohjien pakkojulkaisun peruminen |

---

## Labels Confirmed as Correct (No Change Needed)

These labels already match evaka's terminology:

| Key | Current Label | Verification |
|-----|---------------|--------------|
| assistanceActionOther | Tukitoimi: muu | employee i18n fi.tsx:919 "Muu tukitoimi" |
| daycareApplication.serviceNeedOption | Päivähoitohakemus: palveluntarpeen valinta | employee i18n uses "palveluntarve" — "valinta" is our clarifying suffix, acceptable |
| preschoolApplication.serviceNeedOption | Esiopetushakemus: palveluntarpeen valinta | Same pattern as above |
| decisionDraftMultipleUnits | Sijoitushahmotelma: erilliset yksiköt | employee i18n fi.tsx:404 "Sijoitushahmotelmat" |
| preschool | Esiopetuksen tuki | employee i18n fi.tsx:868 |
| preparatory | Valmistava opetus | employee i18n fi.tsx:536 |
| intermittentShiftCare | Ajoittainen vuorohoito | No better match found; wiki mentions "tilapäinen vuorohoito" but in a different context |
| noAbsenceType | Ei poissaolotyyppiä mobiilissa | Descriptive, no direct i18n match |
| voucherUnitPayments | Palvelusetelimaksatus | No direct i18n match, descriptive label is fine |
| voucherValueSeparation | Palveluseteliarvojen erittely | Matches usage in reports |
| extendedPreschoolTerm | Laajennettu esiopetuskausi | Correct term |
| hideClubApplication | Piilota kerhohakemus | Descriptive, acceptable |
| discussionReservations | Keskusteluvaraukset | Close to evaka's "keskusteluaika" pattern |
| jamixIntegration | Jamix-ruokatilausintegraatio | Matches wiki exactly |
| aromiIntegration | Aromi-ruokatilausintegraatio | Matches wiki exactly |
| nekkuIntegration | Nekku-ruokatilausintegraatio | Matches wiki exactly |
| invoiceDisplayAccountNumber | Tilinumero laskun tiedoissa | Descriptive, acceptable |
| serviceApplications | Palveluntarvemuutokset | Matches employee i18n pattern |
| absenceApplications | Poissaolohakemukset | Matches employee i18n |
| titaniaErrorsReport | Titania-virheraportit | Close to employee i18n "Titania-virheet" |
| multiSelectDeparture | Monen lapsen lähtökirjaus | Descriptive, acceptable |
| requireAttachments | Liitteiden pakollisuus | Descriptive, acceptable |
| archiveIntegration.decisions | Arkistointi: päätökset | Acceptable pattern |
| archiveIntegration.childDocuments | Arkistointi: lapsiasiakirjat | Acceptable pattern |
| archiveIntegration.feeDecisions | Arkistointi: maksupäätökset | Acceptable pattern |
| archiveIntegration.voucherValueDecisions | Arkistointi: arvopäätökset | Acceptable pattern |
| decisionChildDocumentTypes | Päätösasiakirjatyypit | Acceptable compound |
| showCitizenApplicationPreschoolTerms | Esiopetuskauden tiedot hakemuksella | No "kansalainen" used, fine |
| missingQuestionnaireAnswerMarkerEnabled | Puuttuvan kyselyvastauksen merkintä | Descriptive, acceptable |
| placementDesktop | Sijoituksen työpöytänäkymä | Descriptive, acceptable |
| financeDecisionHandlerSelect | Talouspäätöksen käsittelijän valinta | Descriptive, acceptable |
| feeDecisionPreschoolClubFilter | Maksupäätökset: esiopetuskerhon suodatus | Descriptive, acceptable |
| urgencyAttachments | Kiireellisyyden liitteet | Close to evaka's "kiireellinen" usage |
| All backend config labels | (various) | No Finnish i18n counterparts in evaka; current descriptive labels are appropriate |

## Alternatives Considered

- **Full rewrite of all labels**: Rejected. Many labels are already good descriptive Finnish and don't have exact i18n counterparts. Only change labels where evaka has a clearly different/better term.
- **Using wiki descriptions verbatim**: Rejected. Wiki descriptions are often full sentences, not suitable as short labels. We extract the key terms instead.
