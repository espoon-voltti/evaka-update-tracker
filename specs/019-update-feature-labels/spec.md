# Feature Specification: Update Finnish Feature Labels

**Feature Branch**: `019-update-feature-labels`
**Created**: 2026-03-09
**Status**: Draft
**Input**: Update Finnish labels in feature-labels.ts to match terminology used in the evaka UI and documentation

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Correct "kansalainen" to "kuntalainen" (Priority: P1)

A user viewing the deployment tracker sees feature flag labels that refer to "kansalainen" (national citizen), but the evaka application consistently uses "kuntalainen" (municipal resident). The labels should match evaka's own terminology so users recognize the features.

**Why this priority**: This is a clear factual error — evaka defines `CITIZEN: 'kuntalainen'` in its i18n configuration. Using "kansalainen" is misleading and inconsistent.

**Independent Test**: Verify that all labels containing "kansalainen/kansalaiselle/kansalaisille" are updated to use "kuntalainen/kuntalaiselle/kuntalaisille", and that these match the evaka UI's `CITIZEN` translation.

**Acceptance Scenarios**:

1. **Given** a feature label containing "kansalainen", **When** the label is displayed, **Then** it uses "kuntalainen" instead
2. **Given** the full set of labels, **When** compared to evaka's i18n files, **Then** no label uses "kansalainen" where evaka uses "kuntalainen"

---

### User Story 2 - Align labels with evaka UI terminology (Priority: P2)

A user viewing feature flag descriptions sees labels that don't match the actual Finnish terms used in evaka's employee or citizen UI. Labels should use the same wording found in evaka's i18n translation files so users can connect tracker labels to actual UI elements.

**Why this priority**: Consistent terminology reduces confusion and helps users identify which features correspond to what they see in the evaka application.

**Independent Test**: Compare each label against evaka's Finnish i18n files and wiki documentation. Verify that labels use the same nouns and phrasing where a clear match exists.

**Acceptance Scenarios**:

1. **Given** a label like "Päivähoitohakemus: päivittäiset ajat", **When** compared to evaka's employee i18n, **Then** it matches the term "Päivittäinen läsnäoloaika" used there
2. **Given** a label like "Kiireellisyyden liitteet", **When** compared to evaka's employee i18n, **Then** it matches evaka's phrasing for urgent application attachments
3. **Given** labels for discussion-related features, **When** compared to evaka's UI, **Then** they use the same Finnish terms (e.g., "Keskusteluaikavaraukset" if that is what evaka uses)

---

### Edge Cases

- If a feature flag has no corresponding Finnish term in evaka's i18n files or wiki, keep the existing label unchanged
- If evaka uses multiple different Finnish terms for the same concept in different contexts, prefer the term from the most user-facing context (citizen UI > employee UI > backend comments)
- Labels for backend-only config options (FeatureConfig.kt) may not have direct UI translations — keep descriptive Finnish labels that accurately describe the setting's purpose

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: All labels containing "kansalainen" (or its inflected forms) MUST be updated to use "kuntalainen" (with matching inflection), consistent with evaka's `CITIZEN: 'kuntalainen'` i18n definition
- **FR-002**: Labels MUST be compared against evaka's Finnish i18n translation files (employee, citizen, and component translations) and updated where a clear, better-matching term exists
- **FR-003**: Labels MUST be compared against evaka wiki documentation and updated where the wiki uses different Finnish terminology for the same feature
- **FR-004**: Labels that already match evaka's terminology MUST be preserved unchanged
- **FR-005**: Labels for features with no corresponding evaka UI translation MUST retain their current descriptive Finnish text
- **FR-006**: The `getLabel()` fallback function MUST continue to work unchanged — only the label values in the `FEATURE_LABELS` record are updated

### Key Entities

- **Feature Label**: A key-value pair mapping a feature flag or config key to its Finnish description. Keys are stable identifiers; only values (Finnish text) change.
- **Source of Truth**: evaka's i18n translation files and wiki documentation, used as the reference for correct Finnish terminology

## Assumptions

- evaka's i18n files at the current HEAD of the repository represent the correct, up-to-date Finnish terminology
- The "kuntalainen" vs "kansalainen" distinction applies to all citizen-facing feature labels
- Labels should be concise (short phrases, not full sentences) to fit in the tracker UI
- Backend config labels that have no UI equivalent should remain descriptive but don't need to match any specific source

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero labels in feature-labels.ts use "kansalainen" where evaka uses "kuntalainen"
- **SC-002**: All labels that have a direct counterpart in evaka's Finnish i18n files use matching terminology
- **SC-003**: All existing tests continue to pass after label updates (labels are display-only, no logic changes)
- **SC-004**: The total number of label entries remains the same (no labels added or removed)
