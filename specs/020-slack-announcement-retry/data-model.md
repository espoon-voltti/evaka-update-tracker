# Data Model: Slack Announcement Retry

## Entities

### PullRequest (existing — no changes)

Already has `mergedAt: string` field (ISO 8601 timestamp from GitHub API).

### RepoHeadsData (existing — behavioral change only)

```
RepoHeadsData {
  checkedAt: string          // ISO 8601 timestamp of last check
  repos: {
    [repoKey: string]: {     // e.g., "espoon-voltti/evaka"
      sha: string            // Last successfully-announced HEAD SHA
      branch: string         // Default branch name
    }
  }
}
```

**Behavioral change**: The `sha` field now represents the last HEAD for which announcements were successfully delivered (or where no announcement was needed), rather than the last observed HEAD regardless of delivery status.

### No new entities required

The retry mechanism is implicit — the gap between stored HEAD and current HEAD serves as the "queue". No separate queue data structure is needed.
