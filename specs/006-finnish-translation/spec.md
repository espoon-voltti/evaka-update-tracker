# Feature Specification: Finnish Translation

**Feature Branch**: `006-finnish-translation`
**Created**: 2026-03-03
**Status**: Draft
**Input**: User description: "translate the UI and README into Finnish language. Käytä termiä 'Kuntaimplementaatio' kun puhutaan wrapper repositorystä"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Finnish-speaking user views the dashboard (Priority: P1)

A Finnish-speaking user visits the eVaka Deployment Tracker dashboard and sees all user interface text in Finnish, making the tool immediately understandable without requiring English proficiency.

**Why this priority**: The dashboard is the primary user-facing artifact. Finnish users are the main audience since eVaka is a Finnish municipal early childhood education system. Translating the UI provides immediate, visible value.

**Independent Test**: Can be fully tested by opening the dashboard in a browser and verifying all visible text elements are in Finnish.

**Acceptance Scenarios**:

1. **Given** a user opens the dashboard, **When** the page loads, **Then** the page title, header, loading message, and footer text are displayed in Finnish
2. **Given** a user views the overview page, **When** deployment data is loaded, **Then** all labels (section headers, status badges, environment names) appear in Finnish
3. **Given** a user navigates to a city detail page, **When** the city detail view renders, **Then** all section titles, tab labels, button text, and status indicators are in Finnish
4. **Given** a user views the deployment history, **When** the history page loads, **Then** all history-related labels and messages are in Finnish
5. **Given** data fails to load, **When** an error state is shown, **Then** error messages appear in Finnish
6. **Given** a wrapper city is displayed, **When** the term for the wrapper repository appears, **Then** the Finnish term "Kuntaimplementaatio" is used instead of "wrapper"

---

### User Story 2 - Finnish-speaking developer reads the README (Priority: P2)

A Finnish-speaking developer or stakeholder reads the project README and finds all documentation in Finnish, making it easy to understand the project's purpose, setup instructions, and architecture.

**Why this priority**: The README is the entry point for new contributors and stakeholders. Translating it ensures Finnish-speaking team members can onboard without language barriers.

**Independent Test**: Can be tested by reading the README.md file and verifying all content is in Finnish with correct terminology.

**Acceptance Scenarios**:

1. **Given** a developer opens README.md, **When** they read the document, **Then** all headings, descriptions, and instructions are in Finnish
2. **Given** the README mentions wrapper repositories, **When** referring to city-specific wrapper repos (trevaka, evakaoulu, evakaturku), **Then** the term "Kuntaimplementaatio" is used consistently
3. **Given** technical terms appear in the README, **When** the term is a proper noun, command, variable name, file path, or URL, **Then** these remain in their original English/technical form (e.g., `npm install`, `GH_TOKEN`, `GitHub Actions`, city names, repository names)

---

### User Story 3 - Finnish-speaking team receives Slack notifications (Priority: P2)

A Finnish-speaking team member receives Slack deployment notifications in Finnish, consistent with the dashboard language.

**Why this priority**: Slack notifications are a primary communication channel for deployment events. Translating them ensures a consistent Finnish-language experience across all user-facing surfaces.

**Independent Test**: Can be tested by triggering a deployment notification (or dry-run) and verifying the Slack message content is in Finnish.

**Acceptance Scenarios**:

1. **Given** a production deployment is detected, **When** a Slack notification is sent, **Then** the message header, field labels ("Versio:", "Havaittu:"), and link text ("Näytä hallintapaneeli") are in Finnish
2. **Given** a Slack notification includes change details, **When** the repo type is "wrapper", **Then** it displays as "Kuntaimplementaatio" in the message
3. **Given** a Slack notification includes change details, **When** the repo type is "core", **Then** it displays as "ydin" in the message
4. **Given** no PR details are available, **When** the fallback message is shown, **Then** it appears in Finnish

---

### Edge Cases

- What happens when a technical term has no natural Finnish equivalent? — Keep the English term and integrate it naturally into Finnish sentence structure.
- How are city names handled? — City names (Espoo, Tampere, Oulu, Turku) remain unchanged as they are proper nouns already in Finnish.
- How are code snippets, commands, and variable names handled? — These remain in English as they are technical identifiers that must match the actual code.
- How is "core" eVaka distinguished from wrapper/kuntaimplementaatio in Finnish? — Use "ydin" or "ydin-eVaka" for core eVaka references, and "Kuntaimplementaatio" for wrapper repositories.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: All user-visible text in the dashboard UI (site/index.html and site/js/ components) MUST be displayed in Finnish
- **FR-002**: The term "wrapper" MUST be translated as "Kuntaimplementaatio" wherever it appears in user-facing text (UI, README, and Slack notifications)
- **FR-003**: The README.md MUST be fully translated into Finnish while preserving all technical terms, commands, file paths, URLs, and code snippets in their original form
- **FR-004**: Environment labels MUST use Finnish translations: "Tuotanto" for Production, "Testaus" for Staging
- **FR-005**: Status indicators MUST use Finnish translations: "ok" (unchanged), "ei saatavilla" for unavailable, "tunnistautumisvirhe" for auth error, "ei tietoja" for no data
- **FR-006**: Navigation and section labels MUST use Finnish translations: "Yleiskatsaus" for Overview, "Käyttöönottohistoria" for Deployment History
- **FR-007**: Proper nouns (city names, repository names, eVaka product name, GitHub) MUST remain unchanged
- **FR-008**: Code blocks, shell commands, environment variable names, and file paths in the README MUST remain in English
- **FR-009**: The HTML `lang` attribute MUST be set to `fi` to indicate Finnish language content
- **FR-010**: The page title (`<title>` tag) MUST be translated to Finnish
- **FR-011**: Slack notification messages MUST be translated to Finnish, including message headers ("Tuotantoon asennettu" / "Testaus päivitetty"), field labels ("Versio:", "Havaittu:"), link text ("Näytä hallintapaneeli"), and fallback messages
- **FR-012**: Dynamic repo type values in Slack messages MUST display in Finnish: "core" → "ydin", "wrapper" → "Kuntaimplementaatio"
- **FR-013**: Console log messages and debug output MUST remain in English as they are developer-facing

### Key Entities

- **UI Text Strings**: ~43 user-facing strings across 1 HTML file and 7 JavaScript component files that require translation
- **README Content**: Full project documentation including headings, descriptions, setup instructions, and architecture overview
- **Slack Message Strings**: ~6 user-facing strings in the Slack notification builder (message headers, field labels, link text, fallback text) plus dynamic repoType display values

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of user-visible text in the dashboard displays in Finnish when the page loads
- **SC-002**: The term "Kuntaimplementaatio" appears in all places where "wrapper" was previously used in user-facing content
- **SC-003**: All README.md prose content is in Finnish while all technical artifacts (commands, paths, variables, URLs) remain functional and unchanged
- **SC-004**: No English text remains in user-facing UI elements (excluding proper nouns and technical terms)
- **SC-005**: The dashboard remains fully functional after translation — all navigation, data loading, and interactive features work identically to the English version
- **SC-006**: Slack deployment notifications display entirely in Finnish, with "ydin" and "Kuntaimplementaatio" for repo type labels

## Assumptions

- The translation is a full replacement, not a multilingual/i18n system. The UI and README will be Finnish-only after this change.
- No internationalization framework is needed — strings are translated in-place directly in the source files.
- The data fetcher backend (TypeScript in `src/`) does not need translation except for Slack notification messages which are user-facing.
- Console log and debug messages in the backend remain in English as they are developer-facing.
- Git commit messages and GitHub Actions workflow files remain in English.

## Clarifications

### Session 2026-03-03

- Q: Are Slack notification messages in scope? → A: Yes, Slack messages must be translated to Finnish along with the UI and README.
- Q: Should dynamic repoType values ("core"/"wrapper") in Slack messages also display in Finnish? → A: Yes, translate to "ydin" and "Kuntaimplementaatio" respectively.
