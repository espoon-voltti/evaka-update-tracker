# Quickstart: Capture Views Tool

## Usage

### Capture all views (default)
```bash
npm run capture-views
```
Generates Markdown snapshots for all dashboard views and Slack messages, saves to `docs/snapshots/`.

### Capture specific views
```bash
npm run capture-views -- --filter overview
npm run capture-views -- --filter city-tampere-region
npm run capture-views -- --filter slack-deployment
```

### Custom output directory
```bash
npm run capture-views -- --output-dir ./my-snapshots
```

## Integration with Existing Tools

### Relationship to `npm run screenshot`
Both tools share the same infrastructure:
1. `generateTestData()` — produces test JSON files via nock-mocked pipeline
2. `startServer()` — serves `site/` and test data on localhost
3. Playwright — navigates to hash routes

The screenshot tool captures a PNG image of one route. The capture-views tool extracts Markdown text from all routes.

### CI Freshness Check
After implementation, CI runs:
```bash
npm run capture-views
git diff --exit-code docs/snapshots/
```
If any snapshot differs from the committed version, the build fails.

## Expected Output Files

Given test data with cities: espoo, tampere-region, oulu, turku

```text
docs/snapshots/
├── overview.md                              # Dashboard overview grid
├── features.md                              # Feature flags matrix
├── city-espoo.md                            # Espoo city detail
├── city-espoo-history.md                    # Espoo deployment history
├── city-tampere-region.md                   # Tampere region detail
├── city-tampere-region-history.md           # Tampere region history
├── city-oulu.md                             # Oulu city detail
├── city-oulu-history.md                     # Oulu deployment history
├── city-turku.md                            # Turku city detail
├── city-turku-history.md                    # Turku deployment history
├── slack-deployment-espoo.md                # Deployment notification (Espoo)
├── slack-deployment-tampere-region.md       # Deployment notification (Tampere)
├── slack-deployment-oulu.md                 # Deployment notification (Oulu)
├── slack-deployment-turku.md                # Deployment notification (Turku)
├── slack-change-announcement-core.md        # Change announcement (core repo)
└── slack-change-announcement-wrapper.md     # Change announcement (wrapper repo)
```
