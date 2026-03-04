# Research: Dev Data Isolation

## R1: CI Detection Strategy

**Decision**: Use the `CI` environment variable to distinguish CI from local environments.

**Rationale**: GitHub Actions automatically sets `CI=true` on all runners. This is the standard, universally recognized signal — no custom env vars needed. The existing codebase already uses env vars (`DRY_RUN`, `DATA_DIR`) for runtime configuration, so this fits the pattern. No changes to the GitHub Actions workflow are required.

**Alternatives considered**:
- `GITHUB_ACTIONS` env var: More specific but less portable if CI platform changes.
- Custom env var (e.g., `PRODUCTION_RUN=true`): Requires workflow changes; unnecessary given `CI` already works.

## R2: Local Data Directory Location

**Decision**: Use `.data/` (dot-prefixed) in the project root as the default local data directory.

**Rationale**:
- Dot-prefix is conventional for tool/generated files not meant for direct user editing (`.vscode/`, `.claude/`, `.env`).
- Mirrors the existing `data/` structure — same filenames, same JSON format.
- Easy to add to `.gitignore` alongside existing dot-prefixed entries.
- Short name, easy to type when overriding or inspecting.

**Alternatives considered**:
- `data-local/`: Descriptive but non-conventional. Harder to distinguish visually from `data/` in listings.
- `tmp/data/`: Implies disposability; developers may hesitate to rely on it.
- `~/.evaka-tracker/data/`: Out-of-repo; loses the "contained in one place" benefit.

## R3: Site Symlink Strategy for Development

**Decision**: Replace the static `site/data → ../data` symlink with a smarter approach in the site deployer. For local browsing during development, the symlink should point to `.data/` when it exists, falling back to `data/`.

**Rationale**: The symlink exists solely for local development (opening `site/index.html` directly or via a simple HTTP server). In CI, the deploy step copies data files into `dist/data/`, so the symlink is irrelevant. Updating the symlink target ensures developers see their local data when previewing. The `deploySite()` function already receives `dataDir` as a parameter, so it will copy from whichever directory the pipeline used.

**Alternatives considered**:
- Keep symlink pointing to `data/` always, serve `.data/` only through a dev server: Adds complexity (new dev server setup) for no benefit.
- Remove symlink entirely, always use `deploySite()` even locally: Forces developers to run the full build pipeline just to preview, which is unnecessarily heavy.

## R4: Existing DATA_DIR Override Behavior

**Decision**: Preserve the existing `DATA_DIR` environment variable as the highest-priority override. The resolution order becomes: `DATA_DIR` env var > CI detection (`data/` in CI, `.data/` locally).

**Rationale**: The codebase already supports `DATA_DIR` (line 28 of `src/index.ts`). Developers who set `DATA_DIR=data` in their `.env` file can force the old behavior. This is a clean escape hatch that requires no new mechanism.

**Alternatives considered**:
- New env var `LOCAL_DATA_DIR`: Adds a separate knob for the same thing; unnecessary when `DATA_DIR` already serves this purpose.

## R5: E2E Test Data Isolation (Existing Pattern)

**Decision**: No changes needed. E2E tests already use a fully isolated `tests/e2e/test-data/` directory with `process.env.DATA_DIR = TEST_DATA_DIR`. This pattern is unaffected by the new default.

**Rationale**: The E2E test setup explicitly sets `DATA_DIR`, which takes priority over the CI-detection default. The new logic won't interfere.
