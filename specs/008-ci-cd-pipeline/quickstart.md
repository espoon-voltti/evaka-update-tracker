# Quickstart: CI/CD Pipeline

**Feature**: 008-ci-cd-pipeline
**Date**: 2026-03-03

## What This Feature Does

Adds a GitHub Actions workflow that automatically runs lint, type checks, unit tests, and E2E tests whenever code is pushed to any branch or a pull request is opened/updated.

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `.github/workflows/ci.yml` | CREATE | CI workflow definition |
| `package.json` | MODIFY | Add `typecheck` script |

## Implementation Steps

### 1. Add typecheck script to package.json

Add `"typecheck": "tsc --noEmit"` to the `scripts` object in `package.json`.

### 2. Create `.github/workflows/ci.yml`

Create the workflow file with:
- Triggers: `push` (all branches) + `pull_request` (opened, synchronize, reopened)
- Concurrency: cancel in-progress runs per branch
- Steps in order: checkout → setup node 20 → npm ci → lint → typecheck → test → install playwright chromium → test:e2e

### 3. Verify

Push the branch and confirm:
- The workflow triggers on the push
- All steps pass (lint, typecheck, unit tests, E2E tests)
- Opening a PR shows the check status

## Key Decisions

- **Single job, not parallel jobs**: Avoids duplicate setup overhead; entire suite runs fast enough in sequence.
- **Fail-fast ordering**: Lint and type checks run first (fast feedback) before slower tests.
- **Chromium only**: Playwright config only uses Chromium, so only that browser is installed in CI.
- **No secrets needed**: Tests use nock mocking and local fixtures, no environment variables required.
