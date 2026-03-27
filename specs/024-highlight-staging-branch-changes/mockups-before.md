# Before Mockups: Highlight Staging Branch Changes

Captured: 2026-03-27 (manual mockups based on current code)

## Slack: Staging Notification (current)

When a non-main branch is deployed to staging, the message currently looks identical to a normal staging update — misleading:

```
🧪 Espoo — Staging / testaus päivitetty
────────────────────────────────────────
Versio:                    Havaittu:
`438b2c8`                  ke 26.3. klo 14.30

Muutokset (ydin):
• #4521 [Parannus] Add new calendar view — Developer One
• #4519 [Korjaus] Fix date parsing — Developer Two
• #4517 Update unit tests — Developer Three

+3 muutosta verrattuna tuotantoon
Katso Espoo ympäristöjen tilanne
```

**Problem**: The PRs listed above may have nothing to do with the feature branch being tested. They are PRs between the previous commit and the new commit, which spans across branches and produces misleading results.

## Slack: Normal Staging Notification (current - no change needed)

```
🧪 Espoo — Staging / testaus päivitetty
────────────────────────────────────────
Versio:                    Havaittu:
`438b2c8`                  ke 26.3. klo 14.30

Muutokset (ydin):
• #4521 [Parannus] Add new calendar view — Developer One

+1 muutos verrattuna tuotantoon
Katso Espoo ympäristöjen tilanne
```

## GH Pages: History View (current)

```
Espoo — Muutoshistoria
← Espoo
[Näytä riippuvuuspäivitykset]

Tuotanto
┌──────────────────────────────────────────────┐
│ ke 26.3. klo 10.24                           │
│                                              │
│ Ydin                                         │
│ #4520 Add calendar view — Dev One    maa 26  │
│ #4518 Fix parsing — Dev Two          maa 25  │
│                                              │
│ Kuntaimplementaatio                          │
│ #891 Update config — Dev Three       maa 26  │
└──────────────────────────────────────────────┘

Testaus
┌──────────────────────────────────────────────┐
│ ke 26.3. klo 14.30                           │
│                                              │
│ Ydin                                         │
│ #4521 Add feature — Dev One          maa 26  │
└──────────────────────────────────────────────┘
```

**Missing**: No commit IDs shown. No indication when a staging entry is from a non-main branch.
