# Data Model: Update Finnish Feature Labels

## Entities

### Feature Label Entry

A key-value pair in the `FEATURE_LABELS` record.

- **key** (string): Feature flag or config identifier (e.g., `citizenAttendanceSummary`). Immutable — not changed by this feature.
- **value** (string): Finnish descriptive label displayed in the tracker UI. This is what gets updated.

### Change Set

8 label values are modified. No keys are added, removed, or renamed.

| # | Key | Old Value | New Value |
|---|-----|-----------|-----------|
| 1 | citizenShiftCareAbsence | Vuorohoidon poissaolot kansalaisille | Vuorohoidon poissaolot kuntalaisille |
| 2 | citizenAttendanceSummary | Kansalaisen läsnäoloyhteenveto | Kuntalaisen läsnäoloyhteenveto |
| 3 | citizenChildDocumentTypes | Kansalaisen lapsiasiakirjatyypit | Kuntalaisen lapsiasiakirjatyypit |
| 4 | showMetadataToCitizen | Metatiedot kansalaiselle | Metatiedot kuntalaiselle |
| 5 | daycareApplication.dailyTimes | Päivähoitohakemus: päivittäiset ajat | Päivähoitohakemus: päivittäinen varhaiskasvatusaika |
| 6 | preschoolApplication.connectedDaycarePreferredStartDate | Esiopetushakemus: liittyvän päivähoidon aloituspäivä | Esiopetushakemus: liittyvän varhaiskasvatuksen aloituspäivä |
| 7 | placementGuarantee | Paikkavakuus | Varhaiskasvatuspaikkatakuu |
| 8 | forceUnpublishDocumentTemplate | Asiakirjamallien pakkojulkaisun peruminen | Asiakirjapohjien pakkojulkaisun peruminen |

## Relationships

- `FEATURE_LABELS` is consumed by `getLabel(key)` which returns the Finnish label or falls back to the raw key.
- Labels are displayed in the frontend tracker UI and in Slack notifications.
- No database, no API contracts, no external system dependencies.
