# Mockups: Slack Deployment Notification — Before & After

## Slack Deployment Message: Large deployment (>10 PRs)

### Before (max 10 PRs, silent truncation)

```
🚀 Tampere Region — Tuotanto päivitetty
─────────────────────────────────────────
Versio:                         Havaittu:
Kuntaimplementaatio: 7c80ab8,   ke 25.3. klo 14.10
ydin: 5070b6f

Muutokset (ydin):
• #8639 [Parannus] Muutetaan palvelusetelikertoimen desimaalien määrä neljään — jsarkiniemi
• #8752 [Tekninen] Muutetaan DVV muutosrajapinta käyttämään vanhaa autentikointia — Olli-Heikki Inkinen
• #8711 [Tekninen] Päivitä s3-downloader versioon 1.5.1 — Ilja Pyykkönen
• #8751 [Korjaus] Ei lisätä päämiestä lapselle hakemukselta — Petri Lehtinen
• #8720 [Tekninen] Jätetään ajamatta tilaus, kun ryhmälle ei löydy yhtään Nekku asiakasta — Olli-Heikki Inkinen
• #8723 [Tekninen] Muutetaan DVV muutosrajapinta käyttämään Basic Authia — Olli-Heikki Inkinen
• #8750 [Riippuvuus] [Käyttöliittymä] Vite 8 — Petri Lehtinen
• #8749 [Riippuvuus] [Palvelu] Update Spring Boot to v4.0.4 — Petri Lehtinen
• #8712 [Tekninen] Siirretään Turku-koodi ytimeen — Petri Lehtinen
• #8715 [Parannus] Lisätään kuntalaiselle ohjeteksti vastaamisesta talouden viestiketjuihin — Olli-Heikki Inkinen
                               ⬆️ 7 PRs silently omitted

Muutokset (Kuntaimplementaatio):
• #2056 Read-only filesystems for containers — Ilja Pyykkönen
• #2058 Päivitetään postgres-volumen polku — Samuli Toivonen
• #2057 allow sfi admins on test envs — Joosa Kurvinen

Ympäristöjen tiedot
```

### After (max 50 PRs, all shown)

```
🚀 Tampere Region — Tuotanto päivitetty
─────────────────────────────────────────
Versio:                         Havaittu:
Kuntaimplementaatio: 7c80ab8,   ke 25.3. klo 14.10
ydin: 5070b6f

Muutokset (ydin):
• #8639 [Parannus] Muutetaan palvelusetelikertoimen desimaalien määrä neljään — jsarkiniemi
• #8752 [Tekninen] Muutetaan DVV muutosrajapinta käyttämään vanhaa autentikointia — Olli-Heikki Inkinen
• #8711 [Tekninen] Päivitä s3-downloader versioon 1.5.1 — Ilja Pyykkönen
• #8751 [Korjaus] Ei lisätä päämiestä lapselle hakemukselta — Petri Lehtinen
• #8720 [Tekninen] Jätetään ajamatta tilaus, kun ryhmälle ei löydy yhtään Nekku asiakasta — Olli-Heikki Inkinen
• #8723 [Tekninen] Muutetaan DVV muutosrajapinta käyttämään Basic Authia — Olli-Heikki Inkinen
• #8750 [Riippuvuus] [Käyttöliittymä] Vite 8 — Petri Lehtinen
• #8749 [Riippuvuus] [Palvelu] Update Spring Boot to v4.0.4 — Petri Lehtinen
• #8712 [Tekninen] Siirretään Turku-koodi ytimeen — Petri Lehtinen
• #8715 [Parannus] Lisätään kuntalaiselle ohjeteksti vastaamisesta talouden viestiketjuihin — Olli-Heikki Inkinen
• #8700 [Parannus] Näytetään vuorohoitoryhmä henkilökunnan mobiilissa — Olli-Heikki Inkinen      ← NEW (was truncated)
• #8699 [Parannus] Työntekijöiden viestiliitteet saavat olla video/audio-tiedostoja — Joosa Kurvinen  ← NEW
• #8698 [Tekninen] Virhelokitus tausta-ajon epäonnistumisesta — Samuli Toivonen                   ← NEW
• #8697 [Parannus] Espoon sv-tekstikorjaus — Petri Lehtinen                                       ← NEW
• #8696 [Tekninen] Sandbox-siivous — Petri Lehtinen                                               ← NEW
• #8695 [Parannus] Vain AD-kirjautunut käyttäjä voidaan asettaa pääkäyttäjäksi — Joosa Kurvinen   ← NEW
• #8694 [Parannus] Karttahaku toimii myös hakemalla muun kuin ensimmäisen sanan alusta — Joosa Kurvinen ← NEW

Muutokset (Kuntaimplementaatio):
• #2056 Read-only filesystems for containers — Ilja Pyykkönen
• #2058 Päivitetään postgres-volumen polku — Samuli Toivonen
• #2057 allow sfi admins on test envs — Joosa Kurvinen

Ympäristöjen tiedot
```

## Slack Deployment Message: Overflow (>50 PRs)

### Before (not possible — hard limit at 10)

N/A — the old limit was 10, so this scenario was never handled.

### After (shows first 50 + overflow link)

```
🚀 Tampere Region — Tuotanto päivitetty
─────────────────────────────────────────
Versio:                         Havaittu:
ydin: abc1234                   ke 25.3. klo 14.10

Muutokset (ydin):
• #8700 PR title 1 — Author
• #8701 PR title 2 — Author
... (50 PRs listed)
• #8749 PR title 50 — Author
...ja 5 muuta muutosta              ← links to history page

Ympäristöjen tiedot
```

## Unchanged Scenarios

The following scenarios remain identical before and after:

- **Normal deployment (<50 PRs)**: All PRs listed, no overflow
- **All-bot deployment**: Shows "Ei merkittavia muutoksia"
- **No PR data**: Shows "PR-tietoja ei saatavilla"
