# Contract: Frontend URL Routing

Hash-based routing scheme for the static dashboard. All routes use `window.location.hash`.

## Routes

| Hash                              | View                          | Description                          |
| --------------------------------- | ----------------------------- | ------------------------------------ |
| `#/`                              | Overview                      | All city groups, current status      |
| `#/city/{id}`                     | City detail                   | Single city group, full PR lists     |
| `#/city/{id}/history`             | City deployment history       | Deployment events for this city      |

## City IDs

| ID                | City Group       |
| ----------------- | ---------------- |
| `espoo`           | Espoo            |
| `tampere-region`  | Tampere region   |
| `oulu`            | Oulu             |
| `turku`           | Turku            |

## Query Parameters (appended to hash)

| Parameter    | Values           | Default | Description                              |
| ------------ | ---------------- | ------- | ---------------------------------------- |
| `showBots`   | `true` / `false` | `false` | Include dependency update PRs in listing |

Example: `#/city/espoo?showBots=true`

## Behavior

- Unknown routes fall back to `#/` (overview)
- City tabs in the UI navigate to `#/city/{id}`
- Back/forward browser navigation works via `hashchange` event
- Page load with a hash goes directly to the correct view (deep-bookmarking)
- Filters (`showBots`) persist in the URL so bookmarked links include filter state
