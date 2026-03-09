# Data Model: Improve Slack Announcements

## Unchanged Types

### DeploymentEvent (no changes)

The `DeploymentEvent` interface in `src/types.ts` remains unchanged. Events continue to be one per repo type change.

```typescript
interface DeploymentEvent {
  id: string;
  environmentId: string;
  cityGroupId: string;
  detectedAt: string;           // ISO 8601
  previousCommit: CommitInfo | null;
  newCommit: CommitInfo;
  includedPRs: PullRequest[];   // includes isBot flag
  repoType: 'core' | 'wrapper';
}
```

### PullRequest (no changes)

The `isBot` field already exists and is set during PR collection.

```typescript
interface PullRequest {
  number: number;
  title: string;
  author: string;
  mergedAt: string;
  repository: string;
  repoType: 'core' | 'wrapper';
  isBot: boolean;               // ← used for filtering in Slack messages
  url: string;
  labels: string[];
}
```

## New Concepts (no new types needed)

### Event Grouping (runtime only)

Events are grouped by `environmentId` using a `Map<string, DeploymentEvent[]>` at notification time in `index.ts`. This is a runtime grouping, not a persisted data structure.

### Finnish DateTime Formatting (utility function)

A pure function `formatFinnishDateTime(isoString: string): string` converts ISO 8601 timestamps to Finnish format in Helsinki timezone:

- Input: `"2026-03-06T07:28:00Z"`
- Output: `"pe 6.3. klo 09.28"`

Components:
- Finnish weekday abbreviation (ma, ti, ke, to, pe, la, su)
- Day.month. (no leading zeros)
- "klo" separator
- HH.MM (24-hour, zero-padded, period separator)
