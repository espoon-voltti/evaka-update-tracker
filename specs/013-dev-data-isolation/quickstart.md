# Quickstart: Dev Data Isolation

## What Changed

The data pipeline now writes to `.data/` (gitignored) by default when run locally, instead of `data/` (tracked). CI behavior is unchanged.

## For Local Development

**No changes needed.** Just run the pipeline as before:

```bash
npm start
```

Data is written to `.data/` instead of `data/`. The site symlink is updated automatically so `site/index.html` loads your local data.

## To Force Writing to Tracked `data/`

Set the `DATA_DIR` environment variable:

```bash
DATA_DIR=data npm start
```

Or add to your `.env`:

```
DATA_DIR=data
```

## Resolution Order

1. `DATA_DIR` env var (highest priority — use any path you want)
2. CI detected (`CI=true`) → writes to `data/`
3. Default local → writes to `.data/`

## Files Affected

| File | Change |
|------|--------|
| `src/index.ts` | DATA_DIR default logic: `.data/` locally, `data/` in CI |
| `.gitignore` | Added `.data/` and `site/data` |
| `site/data` | Symlink now gitignored; updated dynamically by pipeline |
| `.env.example` | Added `DATA_DIR` documentation |
