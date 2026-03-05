# Data Model: Auto-Refresh Site Data

## Entities

### RefreshState

Tracks the current state of the auto-refresh polling mechanism.

| Field | Type | Description |
|-------|------|-------------|
| isRunning | boolean | Whether the polling loop is active |
| intervalId | number/null | Timer identifier for the setInterval |
| inProgress | boolean | Whether a refresh check is currently in flight (prevents overlaps) |
| cachedDataTexts | Map<string, string> | Raw JSON text of each data file from the last successful fetch, keyed by file path |
| siteVersion | string/null | Last known site version identifier (from site-version.txt) |

### DataFile

Represents a fetchable data file the site consumes.

| Field | Type | Description |
|-------|------|-------------|
| path | string | Relative URL path (e.g., `data/current.json`) |
| lastText | string/null | Raw response text from last fetch |

### SiteVersion

A simple text file containing a build identifier.

| Field | Type | Description |
|-------|------|-------------|
| value | string | Build timestamp or git SHA |

## Relationships

- **RefreshState** manages multiple **DataFile** entries (one per data file the current view needs)
- **RefreshState** tracks one **SiteVersion** for code change detection
- The router determines which **DataFile** entries are relevant for the current view

## State Transitions

```
IDLE → CHECKING → (no change) → IDLE
IDLE → CHECKING → (data changed) → RE-RENDERING → IDLE
IDLE → CHECKING → (code changed) → PAGE RELOAD
IDLE → CHECKING → (network error) → IDLE (silent skip)
CHECKING → (next interval fires) → SKIPPED (overlap prevention)
```
