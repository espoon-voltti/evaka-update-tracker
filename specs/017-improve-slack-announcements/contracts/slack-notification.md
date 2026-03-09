# Contract: Slack Notification Message

## Combined Message Format

The Slack notification uses Block Kit format. When both wrapper and core change in the same environment, a single message is sent.

### Block Structure

**Single repo change (wrapper OR core):**
```
[header]     → "🚀 Espoo — Tuotanto päivitetty"
[section]    → Version: SHA link | Havaittu: pe 6.3. klo 09.28
[section]    → *Muutokset (ydin):* PR list
[context]    → Dashboard link
```

**Both repos change:**
```
[header]     → "🚀 Espoo — Tuotanto päivitetty"
[section]    → Versio: Ydin: sha1, Kuntaimpl.: sha2 | Havaittu: pe 6.3. klo 09.28
[section]    → *Muutokset (ydin):* PR list (human PRs only)
[section]    → *Muutokset (Kuntaimplementaatio):* PR list (human PRs only)
[context]    → Dashboard link
```

### PR List Format

Each human-authored PR is displayed as:
```
• <https://github.com/org/repo/pull/123|#123> PR title — _author_
```

When all PRs in a section are bot-authored:
```
*Muutokset (ydin):*
Ei merkittäviä muutoksia
```

Bot PRs (dependabot, renovate) are silently excluded. No count of hidden PRs is shown.

### Version Field

- Single repo: `<commit_url|shortSha>`
- Both repos: `Ydin: <core_url|shortSha>, Kuntaimpl.: <wrapper_url|shortSha>`

### Timestamp Format

Finnish web UI format in Europe/Helsinki timezone:
- Pattern: `{weekday} {day}.{month}. klo {HH}.{MM}`
- Example: `pe 6.3. klo 09.28`
- Weekday abbreviations: ma, ti, ke, to, pe, la, su
- No leading zeros on day/month
- 24-hour time with leading zero, period separator

### Webhook Routing (unchanged)

- Per-city: `SLACK_WEBHOOK_URL_{CITY_ID}`
- Fallback: `SLACK_WEBHOOK_URL`
- No URL: notification skipped
