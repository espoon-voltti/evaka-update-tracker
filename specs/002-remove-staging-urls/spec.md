# Feature Specification: Remove Staging/Testing URLs from Codebase

**Feature Branch**: `002-remove-staging-urls`
**Created**: 2026-03-02
**Status**: Draft
**Input**: User description: "Our staging / testing environment URLs should not be mentioned in the codebase as they are semi-private. We don't want any unnecessary bot traffic into those instances. Review the currently prepared commit and remove any explicit mentions of them. The fact that they exist is not a secret, but we should avoid having direct links to them."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Remove Direct Staging URL Links from Source Code (Priority: P1)

As a project maintainer, I want all direct links to staging and testing environment domains removed from the codebase so that search engines, bots, and automated scanners cannot discover and generate traffic against those semi-private instances.

**Why this priority**: This is the core ask — staging/testing environments are semi-private and direct URLs in a public repository expose them to unwanted bot traffic. Removing them from source code (the primary configuration) addresses the highest-risk exposure.

**Independent Test**: Can be verified by searching the codebase for known staging/test domain patterns (e.g., `staging.`, `test-`, staging-specific subdomains) and confirming zero direct URL matches in application source files.

**Acceptance Scenarios**:

1. **Given** the codebase contains source files with staging/test domain URLs, **When** the changes are applied, **Then** no source file contains a direct, fully-qualified staging or testing URL
2. **Given** the system still needs to monitor staging/test instances, **When** staging URLs are removed from hardcoded configuration, **Then** the system provides an alternative mechanism (e.g., environment-based configuration) to supply those URLs at runtime
3. **Given** a developer searches the repository for staging domain patterns, **When** they search for known staging/test URL patterns, **Then** no direct URLs are found in committed source code

---

### User Story 2 - Remove Staging URLs from Documentation and Specs (Priority: P2)

As a project maintainer, I want staging/testing URLs removed from documentation files (README, spec files, quickstart guides) so that these semi-private addresses are not discoverable via the repository's documentation.

**Why this priority**: Documentation files are often the first thing visitors see and are easily indexed. While lower risk than source code (they don't enable direct programmatic access), they still expose staging URLs to crawlers.

**Independent Test**: Can be verified by searching all markdown and documentation files for staging/test domain patterns and confirming zero matches.

**Acceptance Scenarios**:

1. **Given** the README contains a table listing staging domains alongside production domains, **When** the changes are applied, **Then** the README no longer contains direct staging/test URLs while still documenting that staging environments exist
2. **Given** spec files reference staging URLs in examples or instance listings, **When** the changes are applied, **Then** spec files describe staging environments generically without direct URLs

---

### User Story 3 - Remove Staging URLs from Test Fixtures (Priority: P2)

As a project maintainer, I want staging URLs removed from test fixture data so that even test files do not contain real staging domain names that could be scraped from the repository.

**Why this priority**: Test fixtures containing real staging URLs create unnecessary exposure. Tests should use synthetic/placeholder domains instead.

**Independent Test**: Can be verified by searching test directories for staging/test domain patterns and confirming only synthetic placeholder domains are used.

**Acceptance Scenarios**:

1. **Given** test fixtures contain real staging domain names, **When** the changes are applied, **Then** test fixtures use placeholder or synthetic domain names that do not resolve to real staging instances
2. **Given** tests validate behavior against staging-like instances (e.g., basic auth handling), **When** staging URLs are replaced with placeholders, **Then** the tests still pass and correctly validate the same behaviors

---

### Edge Cases

- What happens when new staging environments are added in the future? The configuration approach must make it easy to add new instances without hardcoding URLs in source.
- How should the system handle references to staging environments that are needed for context (e.g., "this instance requires authentication") without including the actual URL?
- What about staging credential references (e.g., environment variable names for Oulu staging auth)? Environment variable *names* are acceptable since they don't expose the actual URLs.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The codebase MUST NOT contain any direct, fully-qualified URLs pointing to staging or testing environment domains
- **FR-002**: The system MUST continue to support monitoring of staging/test instances through runtime configuration (e.g., environment variables or external config files) rather than hardcoded URLs
- **FR-003**: Documentation MUST NOT include direct links to staging/test domains, but MAY reference that staging environments exist generically
- **FR-004**: Test fixtures MUST use placeholder or synthetic domain names instead of real staging/test domains
- **FR-005**: The system MUST preserve all existing functionality for production instance monitoring without any changes
- **FR-006**: References to staging environment *characteristics* (e.g., "requires authentication", environment variable names) MAY remain, as long as no direct URL is included

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero direct staging/test URLs found when searching the committed codebase for known staging domain patterns
- **SC-002**: All existing tests pass after staging URLs are replaced with placeholders
- **SC-003**: Production instance monitoring continues to function identically after changes
- **SC-004**: 100% of previously hardcoded staging URLs are either removed or moved to runtime configuration

## Assumptions

- Production URLs are acceptable to keep in the codebase (only staging/test URLs need removal)
- The *existence* of staging environments is not secret — only the direct URLs should be removed
- Environment variable *names* (e.g., `OULU_STAGING_USER`) are acceptable to keep since they don't reveal the actual URLs
- Placeholder domains used in tests should be clearly synthetic (e.g., `staging.example.com` or `test.example.evaka.fi`) to avoid confusion with real instances
- The `.env.example` file may reference that staging credentials exist but should not contain the staging URL itself
