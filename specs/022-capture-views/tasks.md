# Tasks: Capture Views Tool

**Input**: Design documents from `/specs/022-capture-views/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md

**Tests**: Unit tests for slack-to-markdown converter as specified in plan.md.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Export private Slack formatter, create converter utility, add npm script

- [x] T001 Export `buildSlackMessage` function from `src/api/slack.ts` (currently private — add `export` keyword)
- [x] T002 [P] Create `src/utils/slack-to-markdown.ts` with two exported functions: `blockKitToMarkdown(blocks: Block[]): string` to convert Slack Block Kit JSON to standard Markdown, and `slackMrkdwnToMarkdown(text: string): string` to convert Slack mrkdwn syntax (`<url|text>` → `[text](url)`, `*bold*` → `**bold**`, `_italic_` → `*italic*`) to standard Markdown
- [x] T003 [P] Create `tests/unit/slack-to-markdown.test.ts` with unit tests for both converter functions: test Block Kit header/section/context blocks, test mrkdwn link/bold/italic conversion, test em dash preservation, test multi-line PR lists
- [x] T004 Add `"capture-views": "npx tsx scripts/capture-views.ts"` to scripts section in `package.json`

**Checkpoint**: Slack formatter exported, converter utility tested, npm script registered

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create the main capture script skeleton with view registry and shared infrastructure

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Create `scripts/capture-views.ts` with: argument parsing (`--filter`, `--output-dir`), main entry point that calls `generateTestData()`, reads `current.json` to discover city IDs, builds the ViewRegistry (fixed routes + per-city routes + Slack message views per data-model.md), and orchestrates capture. Reuse imports from `tests/e2e/helpers/generate-test-data.ts` and `tests/e2e/helpers/server.ts`. Follow the pattern in `scripts/screenshot.ts`.
- [x] T006 Create `docs/snapshots/` output directory (empty `.gitkeep` file)

**Checkpoint**: Script runs, builds view registry, but capture functions are stubs

---

## Phase 3: User Story 1 - Batch Capture All Dashboard Views (Priority: P1) 🎯 MVP

**Goal**: `npm run capture-views` generates Markdown snapshots of all dashboard views and Slack messages

**Independent Test**: Run `npm run capture-views` and verify Markdown files are created in `docs/snapshots/` for overview, features, city detail, city history, Slack deployment, and Slack change announcements

### Implementation for User Story 1

- [x] T007 [US1] Implement browser view capture in `scripts/capture-views.ts`: for each browser-type ViewDefinition, navigate Playwright to `{baseUrl}/{route}`, wait for `waitFor` selector, then call `page.evaluate()` with a DOM-walking function that converts the rendered DOM to structured Markdown (h1-h6 → `#`-`######`, `<table>` → Markdown table, `<ul>/<li>` → `- item`, `<details>/<summary>` → heading + content, text nodes → text). Log progress for each view.
- [x] T008 [US1] Implement Slack deployment snapshot capture in `scripts/capture-views.ts`: for each city in the view registry, construct a representative `DeploymentEvent` with test data (using patterns from `tests/e2e/fixtures/mock-api-responses.ts`), call exported `buildSlackMessage()`, then convert the Block Kit output to Markdown using `blockKitToMarkdown()` from `src/utils/slack-to-markdown.ts`
- [x] T009 [US1] Implement Slack change announcement snapshot capture in `scripts/capture-views.ts`: for core and wrapper repo types, construct representative `PullRequest[]` test data, call `buildChangeAnnouncement()` from `src/services/change-announcer.ts`, then convert the mrkdwn output to Markdown using `slackMrkdwnToMarkdown()` from `src/utils/slack-to-markdown.ts`
- [x] T010 [US1] Implement file writing in `scripts/capture-views.ts`: write each CaptureResult's markdown content to `{outputDir}/{name}.md`, creating the output directory if it doesn't exist. Handle errors per-view (log warning, continue, exit non-zero at end if any failed). Ensure deterministic output (strip any timestamps from generated-at elements).

**Checkpoint**: `npm run capture-views` produces all expected snapshot files with meaningful content

---

## Phase 4: User Story 2 - Selective View Capture (Priority: P2)

**Goal**: `--filter` argument captures only matching views

**Independent Test**: Run `npm run capture-views -- --filter overview` and verify only `overview.md` is generated

### Implementation for User Story 2

- [x] T011 [US2] Implement `--filter` logic in `scripts/capture-views.ts`: filter the ViewRegistry by name substring match against the `--filter` argument value. If no views match, exit with error listing all available view names. The filter applies to both browser views and Slack views (e.g., `--filter slack` matches all Slack snapshots).

**Checkpoint**: `--filter` works for any view name pattern including partial matches

---

## Phase 5: User Story 3 - CI Freshness Check (Priority: P2)

**Goal**: CI detects stale snapshots and fails the build

**Independent Test**: Modify a frontend component, run `npm run capture-views`, verify `git diff --exit-code docs/snapshots/` fails

### Implementation for User Story 3

- [x] T012 [US3] Add a `check-snapshots` CI step to `.github/workflows/monitor.yml`: run `npm run capture-views` then `git diff --exit-code docs/snapshots/` with a clear failure message identifying which snapshot files are stale. Place this after the existing test/lint steps.

**Checkpoint**: CI fails when committed snapshots don't match regenerated output

---

## Phase 6: User Story 4 - Custom Output Directory (Priority: P3)

**Goal**: `--output-dir` argument specifies where snapshots are saved

**Independent Test**: Run `npm run capture-views -- --output-dir ./tmp-snapshots` and verify files appear there

### Implementation for User Story 4

- [x] T013 [US4] Implement `--output-dir` logic in `scripts/capture-views.ts`: use the provided directory instead of the default `docs/snapshots/`. Create the directory if it doesn't exist. This should already be wired from T005 argument parsing — verify it works end-to-end.

**Checkpoint**: Custom output directory works, default still uses `docs/snapshots/`

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Generate initial committed snapshots, validate everything works

- [x] T014 Run `npm run capture-views` to generate the initial set of committed snapshots in `docs/snapshots/`
- [x] T015 Run `npm test` and `npm run lint` to verify no regressions from the changes (exported function, new utility, new tests)
- [x] T016 Verify all snapshot files are present and contain meaningful structured Markdown content (not empty or plain text)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on T001, T002 (exported function + converter utility)
- **User Story 1 (Phase 3)**: Depends on Phase 2 completion
- **User Story 2 (Phase 4)**: Depends on Phase 3 (needs working capture to filter)
- **User Story 3 (Phase 5)**: Depends on Phase 3 (needs working capture for CI)
- **User Story 4 (Phase 6)**: Depends on Phase 3 (needs working capture for custom dir)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Depends on Setup + Foundational — core MVP
- **User Story 2 (P2)**: Depends on US1 (filtering requires a working registry)
- **User Story 3 (P2)**: Depends on US1 (CI check requires working capture)
- **User Story 4 (P3)**: Depends on US1 (custom dir requires working capture)

### Within Each User Story

- T007 (browser capture) and T008/T009 (Slack capture) can be parallelized within US1
- T010 (file writing) depends on T007, T008, T009

### Parallel Opportunities

- T002 and T003 can run in parallel (converter + tests)
- T001 and T002/T003 can run in parallel (different files)
- T008 and T009 can run in parallel within US1 (independent Slack message types)

---

## Parallel Example: Phase 1

```bash
# These can all run in parallel (different files):
Task T001: "Export buildSlackMessage from src/api/slack.ts"
Task T002: "Create src/utils/slack-to-markdown.ts"
Task T003: "Create tests/unit/slack-to-markdown.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (export function, create converter, add npm script)
2. Complete Phase 2: Foundational (script skeleton with view registry)
3. Complete Phase 3: User Story 1 (full batch capture)
4. **STOP and VALIDATE**: Run `npm run capture-views` and verify all snapshots
5. Commit generated snapshots

### Incremental Delivery

1. Setup + Foundational → Infrastructure ready
2. Add User Story 1 → Full capture works → Commit snapshots (MVP!)
3. Add User Story 2 → `--filter` works → Faster dev workflow
4. Add User Story 3 → CI freshness check → Automated validation
5. Add User Story 4 → `--output-dir` works → Flexible workflows

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Follow `scripts/screenshot.ts` pattern for infrastructure reuse
- Ensure deterministic output: strip timestamps, use fixed test data
- The `buildSlackMessage` export (T001) is a one-line change (add `export` keyword)
- Commit after each phase checkpoint
