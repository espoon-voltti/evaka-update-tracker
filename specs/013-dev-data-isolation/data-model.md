# Data Model: Dev Data Isolation

## Entities

### Data Directory Resolution

The data directory is determined at pipeline startup using a priority chain:

| Priority | Condition | Resolved Path | Tracked by Git |
|----------|-----------|---------------|----------------|
| 1 (highest) | `DATA_DIR` env var is set | Value of `DATA_DIR` | Depends on path |
| 2 | Running in CI (`CI=true`) | `data/` | Yes |
| 3 (default) | Running locally (no CI, no DATA_DIR) | `.data/` | No |

### File Structure (unchanged)

Both `data/` and `.data/` contain the same files with identical JSON schemas:

```
{data-dir}/
├── current.json        # Current deployment status per city
├── history.json        # Historical deployment events
├── previous.json       # Previous run state for change detection
└── feature-flags.json  # Feature flags across eVaka cities
```

No changes to file schemas or data formats.

### Site Symlink

```
site/data → ../{resolved-data-dir}
```

- Updated by the pipeline after resolving the data directory.
- The symlink is already gitignored implicitly (it points to `../data` which is tracked, but the symlink target change is the only modification).
- **Change needed**: The symlink itself should be gitignored so that target changes don't create diffs. Currently it's tracked.

### State Transitions

```
Pipeline Start
  ├─ DATA_DIR set? → use DATA_DIR (explicit override)
  ├─ CI=true? → use data/ (tracked, CI behavior)
  └─ else → use .data/ (untracked, local dev)
      └─ mkdir -p .data/ (create if missing)
```
