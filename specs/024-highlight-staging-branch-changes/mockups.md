# Before/After Mockups: Highlight Staging Branch Changes

## Slack: Staging Notification — Branch Deployment

### Before

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

**Problem**: PRs listed are misleading — they are between previous and new commit across branches, not actual changes in the deployed branch.

### After

```
🔀 Espoo — Staging / haaran testaus
────────────────────────────────────────
Versio:                    Havaittu:
`438b2c8`                  ke 26.3. klo 14.30
(haara: feature/my-change)

ydin:
Haaran testaus — PR-muutokset eivät ole vertailukelpoisia

Haaraa testataan staging-ympäristössä
Katso Espoo ympäristöjen tilanne
```

**Changes**: Different emoji (🔀), different heading ("haaran testaus"), branch name shown in version field, PR list replaced with branch deployment context, staging context shows branch testing message instead of misleading comparison.

---

## Slack: Normal Staging Notification (unchanged)

### Before & After (no change)

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

---

## GH Pages: History View

### Before

```
┌──────────────────────────────────────────────┐
│ ke 26.3. klo 14.30                           │
│                                              │
│ Ydin                                         │
│ #4521 Add feature — Dev One          maa 26  │
└──────────────────────────────────────────────┘
```

### After — Normal deployment

```
┌──────────────────────────────────────────────┐
│ ke 26.3. klo 14.30  438b2c8                  │
│                                              │
│ Ydin                                         │
│ #4521 Add feature — Dev One          maa 26  │
└──────────────────────────────────────────────┘
```

**Changes**: Short commit SHA shown as clickable link next to timestamp.

### After — Branch deployment

```
┌──────────────────────────────────────────────┐
│ ke 26.3. klo 14.30  bbb1111                  │
│                     [feature/test-branch]     │
│                                              │
│ PR-tietoja ei saatavilla                     │
└──────────────────────────────────────────────┘
```

**Changes**: Branch badge (orange) shown with branch name. Commit link shown.

### After — Multi-repo with commit links

```
┌──────────────────────────────────────────────┐
│ ke 26.3. klo 10.24                           │
│ ydin: 438b2c8, Kuntaimplementaatio: fb8cd9a  │
│                                              │
│ Ydin                                         │
│ #4520 Add calendar view — Dev One    maa 26  │
│                                              │
│ Kuntaimplementaatio                          │
│ #891 Update config — Dev Three       maa 26  │
└──────────────────────────────────────────────┘
```

**Changes**: Both repo commit SHAs shown with type labels.
