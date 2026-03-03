# Data Model: Finnish Translation Mapping

This feature does not introduce new data entities. Instead, it defines a complete mapping of English display strings to Finnish translations. Internal data model values (`repoType`, `environmentId`, route hashes, etc.) remain unchanged.

## Translation Mapping: Dashboard UI

### index.html

| Location | English | Finnish |
|----------|---------|---------|
| `<html lang>` | `en` | `fi` |
| `<title>` | `eVaka Deployment Tracker` | `eVaka-käyttöönottojen seuranta` |
| `<h1>` | `eVaka Deployment Tracker` | `eVaka-käyttöönottojen seuranta` |
| Loading div | `Loading deployment data...` | `Ladataan käyttöönottotietoja...` |
| Footer | `Data refreshed every 5 minutes.` | `Tiedot päivitetään 5 minuutin välein.` |

### app.js

| Location | English | Finnish |
|----------|---------|---------|
| Timestamp prefix | `Last updated:` | `Päivitetty:` |
| Error message | `Failed to load deployment data. The data may not have been generated yet.` | `Käyttöönottotietojen lataaminen epäonnistui. Tietoja ei ehkä ole vielä luotu.` |
| Loading state | `Loading...` | `Ladataan...` |
| Not found | `City not found` | `Kuntaa ei löytynyt` |
| Date locale | `en-GB` | `fi` |

### overview.js

| Location | English | Finnish |
|----------|---------|---------|
| Empty state | `No deployment data available` | `Käyttöönottotietoja ei saatavilla` |
| Env label | `Production` | `Tuotanto` |
| Env label | `Staging` | `Testaus` |
| Warning | `Version mismatch detected across instances` | `Versioero havaittu instanssien välillä` |
| Section header | `Core — In Production` | `Ydin — Tuotannossa` |
| Section header | `Wrapper — In Production` | `Kuntaimplementaatio — Tuotannossa` |

### city-tabs.js

| Location | English | Finnish |
|----------|---------|---------|
| Tab label | `Overview` | `Yleiskatsaus` |

### city-detail.js

| Location | English | Finnish |
|----------|---------|---------|
| Env label | `Production` | `Tuotanto` |
| Env label | `Staging / Test` | `Testaus / Testi` |
| Warning | `Version mismatch detected` | `Versioero havaittu` |
| Button | `Show dependency updates` | `Näytä riippuvuuspäivitykset` |
| Section | `Recent Production Commits` | `Viimeisimmät tuotantocommitit` |
| Section | `Changes in Staging` | `Muutokset testauksessa` |
| Section | `Awaiting Deployment` | `Odottaa käyttöönottoa` |
| Link | `Deployment History` | `Käyttöönottohistoria` |

### status-badge.js

| Location | English | Finnish |
|----------|---------|---------|
| Status | `No data` | `Ei tietoja` |
| Status | `ok` | `ok` |
| Status | `unavailable` | `ei saatavilla` |
| Status | `auth error` | `tunnistautumisvirhe` |
| Date locale | `en-GB` | `fi` |

### pr-list.js

| Location | English | Finnish |
|----------|---------|---------|
| Empty state | `No recent PRs` | `Ei viimeaikaisia PR:iä` |
| Empty filtered | `No recent human PRs` | `Ei viimeaikaisia manuaalisia PR:iä` |
| Label | `bot` | `botti` |
| Status | `merged` | `yhdistetty` |
| Status | `staging` | `testauksessa` |
| Status | `production` | `tuotannossa` |
| Date locale | `en-GB` | `fi` |

### history-view.js

| Location | English | Finnish |
|----------|---------|---------|
| Navigation | `Back to {city}` | `Takaisin: {city}` |
| Page title | `{city} — Deployment History` | `{city} — Käyttöönottohistoria` |
| Empty state | `No deployment events recorded yet` | `Käyttöönottotapahtumia ei ole vielä tallennettu` |
| Env label | `Production` | `Tuotanto` |
| Env label | `Staging` | `Testaus` |
| Placeholder | `initial` | `ensimmäinen` |
| Collapsible | `{n} PR(s) included` | `{n} PR sisältyy` |
| Empty PRs | `No PR details available` | `PR-tietoja ei saatavilla` |
| Date locale | `en-GB` | `fi` |

## Translation Mapping: Slack Messages (src/api/slack.ts)

| Location | English | Finnish |
|----------|---------|---------|
| Env label | `Production deployed` | `Tuotantoon asennettu` |
| Env label | `Staging updated` | `Testaus päivitetty` |
| Section header | `Changes ({repoType}):` | `Muutokset ({repoTypeDisplay}):` |
| Fallback | `No PR details available for this {repoType} update` | `PR-tietoja ei saatavilla tälle {repoTypeDisplay}-päivitykselle` |
| Field | `Version:` | `Versio:` |
| Field | `Detected:` | `Havaittu:` |
| Link | `View dashboard` | `Näytä hallintapaneeli` |

### repoType Display Mapping (Slack only)

| Internal Value | Display Value |
|----------------|---------------|
| `core` | `ydin` |
| `wrapper` | `Kuntaimplementaatio` |

## No Data Model Changes

- `repoType` field values (`"core"`, `"wrapper"`) remain unchanged in config, data files, and TypeScript types
- Route hashes (`#/city/espoo`, `#/city/tampere-region`, etc.) remain unchanged
- Environment type values (`"production"`, `"staging"`) remain unchanged in data structures
- City group IDs and names remain unchanged
- All JSON data file formats remain unchanged
