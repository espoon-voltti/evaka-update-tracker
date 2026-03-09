# Tasks: Update Finnish Feature Labels

**Input**: Design documents from `/specs/019-update-feature-labels/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Not requested. Existing tests cover `getLabel()` function; no new test tasks needed.

**Organization**: Tasks grouped by user story priority.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: User Story 1 — Fix "kansalainen" → "kuntalainen" (Priority: P1) MVP

**Goal**: Replace all forms of "kansalainen" with "kuntalainen" in feature labels to match evaka's `CITIZEN: 'kuntalainen'` i18n definition.

**Independent Test**: Run `npm test && npm run lint`. Verify no label in `src/config/feature-labels.ts` contains "kansalainen" (any inflected form).

### Implementation

- [x] T001 [US1] Update `citizenShiftCareAbsence` label from "Vuorohoidon poissaolot kansalaisille" to "Vuorohoidon poissaolot kuntalaisille" in `src/config/feature-labels.ts`
- [x] T002 [US1] Update `citizenAttendanceSummary` label from "Kansalaisen läsnäoloyhteenveto" to "Kuntalaisen läsnäoloyhteenveto" in `src/config/feature-labels.ts`
- [x] T003 [US1] Update `citizenChildDocumentTypes` label from "Kansalaisen lapsiasiakirjatyypit" to "Kuntalaisen lapsiasiakirjatyypit" in `src/config/feature-labels.ts`
- [x] T004 [US1] Update `showMetadataToCitizen` label from "Metatiedot kansalaiselle" to "Metatiedot kuntalaiselle" in `src/config/feature-labels.ts`

**Checkpoint**: All "kansalainen" references eliminated. Run `npm test && npm run lint` to verify.

---

## Phase 2: User Story 2 — Align labels with evaka UI terminology (Priority: P2)

**Goal**: Update labels that use different Finnish terms than what evaka's i18n files actually contain.

**Independent Test**: Compare updated labels against evaka i18n source strings listed in `research.md`. Run `npm test && npm run lint`.

### Implementation

- [x] T005 [US2] Update `daycareApplication.dailyTimes` label from "Päivähoitohakemus: päivittäiset ajat" to "Päivähoitohakemus: päivittäinen varhaiskasvatusaika" in `src/config/feature-labels.ts`
- [x] T006 [US2] Update `preschoolApplication.connectedDaycarePreferredStartDate` label from "Esiopetushakemus: liittyvän päivähoidon aloituspäivä" to "Esiopetushakemus: liittyvän varhaiskasvatuksen aloituspäivä" in `src/config/feature-labels.ts`
- [x] T007 [US2] Update `placementGuarantee` label from "Paikkavakuus" to "Varhaiskasvatuspaikkatakuu" in `src/config/feature-labels.ts`
- [x] T008 [US2] Update `forceUnpublishDocumentTemplate` label from "Asiakirjamallien pakkojulkaisun peruminen" to "Asiakirjapohjien pakkojulkaisun peruminen" in `src/config/feature-labels.ts`

**Checkpoint**: All terminology aligned with evaka UI. Run `npm test && npm run lint` to verify.

---

## Phase 3: Polish & Verification

**Purpose**: Final validation that all changes are correct and nothing is broken.

- [x] T009 Run `npm test && npm run lint` to confirm all checks pass
- [x] T010 Verify total label count in `FEATURE_LABELS` is unchanged (should remain at 60 entries)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (US1)**: No dependencies — can start immediately
- **Phase 2 (US2)**: No dependencies on Phase 1 — can run in parallel
- **Phase 3 (Polish)**: Depends on Phase 1 and Phase 2 completion

### Parallel Opportunities

- T001–T004 (US1) all edit the same file but different lines — execute sequentially within US1
- T005–T008 (US2) all edit the same file but different lines — execute sequentially within US2
- US1 and US2 can be done in either order since they touch different label entries
- In practice, all 8 edits are to the same file, so sequential execution is simplest

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Apply T001–T004 (fix "kansalainen" → "kuntalainen")
2. Run `npm test && npm run lint`
3. This alone delivers the most impactful correction

### Full Delivery

1. Apply T001–T004 (US1: kuntalainen fix)
2. Apply T005–T008 (US2: terminology alignment)
3. Run T009–T010 (verification)
4. Commit all changes

---

## Notes

- All 8 tasks modify the same file: `src/config/feature-labels.ts`
- Only string values change — no keys, no logic, no imports
- No new files created, no files deleted
- Existing `getLabel()` function remains unchanged
