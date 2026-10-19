## Operatiiviset mittarit
[Espoo](#/metrics?range=24h&city=espoo) [Oulu](#/metrics?range=24h&city=oulu) [Turku](#/metrics?range=24h&city=turku)
Haettu ti 6.10. klo 15.00
### Kuormitus ja virheet
#### Palvelun 5xx-virheiden osuus
Osuus palvelun (service) vastauksista, joiden tilakoodi on 5xx.
[Palvelun 5xx-virheiden osuus, 24 h: koko jakson osuus 0,07 %, puuttuvia jaksoja 156]
#### Palvelun vasteaika (ms)
Mediaani (p50) ja 95. persentiili (p95) palvelun käsittelemien pyyntöjen vasteajoista. Logaritminen asteikko.
- Mediaani (p50)
- 95. persentiili (p95)
[Palvelun vasteaika, 24 h: koko jakson p50 45 ms, p95 425 ms, puuttuvia jaksoja 156]
#### Palvelun virherivit
ERROR-tason rivit palvelun sovelluslokissa.
[Palvelun virherivit, 24 h: rivejä 58, puuttuvia jaksoja 156]
#### API-yhdyskäytävän vasteaika, p95 (ms)
95. persentiili API-yhdyskäytävän (apigw) vasteajoista sovelluksittain. Logaritminen asteikko.
- Kuntalaiset
- Henkilökunta
- Mobiili
- Muut
[API-yhdyskäytävän vasteaika p95, 24 h: koko jakson p95: kuntalaiset 902 ms, henkilökunta 913 ms, mobiili 1556 ms, muut 393 ms, puuttuvia jaksoja 156]
#### API-yhdyskäytävän virhevastaukset
API-yhdyskäytävän vastaukset tilakoodin mukaan, kaikki sovellukset yhteensä.
- 5xx (palvelinvirhe)
- 401 (ei kirjautunut)
- 429 (liikaa pyyntöjä)
[API-yhdyskäytävän virhevastaukset, 24 h: 5xx 40, 401 498, 429 18, puuttuvia jaksoja 156]
#### Välityspalvelimen 502- ja 504-vastaukset
Pyynnöt, joihin välityspalvelin (proxy) ei saanut taustapalvelulta vastausta (502) tai ei saanut sitä ajoissa (504).
- 502 Bad Gateway
- 504 Gateway Timeout
[Välityspalvelimen 502- ja 504-vastaukset, 24 h: 502 0, 504 0, puuttuvia jaksoja 156]
### Kirjautumiset
#### Kuntalaisten kirjautumiset
Onnistuneet kirjautumiset kuntalaisen sovellukseen.
- Vahva tunnistautuminen
- Heikko tunnistautuminen
[Kuntalaisten kirjautumiset, 24 h: vahva 612, heikko 144, puuttuvia jaksoja 156]
#### Henkilökunnan kirjautumiset
Onnistuneet kirjautumiset tavan mukaan.
- AD
- Suomi.fi
- PIN-koodi
[Henkilökunnan kirjautumiset, 24 h: AD 134, Suomi.fi 9, PIN 63, puuttuvia jaksoja 156]
#### Epäonnistuneet kirjautumiset
API-yhdyskäytävän kirjaamat epäonnistuneet kirjautumiset tavan mukaan.
- AD
- Suomi.fi
- Heikko
- Pääsyavain
[Epäonnistuneet kirjautumiset, 24 h: AD 4, Suomi.fi 4, heikko 27, pääsyavain 2, puuttuvia jaksoja 156]
#### Heikon tunnistautumisen epäonnistumiset (arvio)
Arvio: heikon tunnistautumisen ja pääsyavaimen kirjautumisyritykset, joista ei seurannut kirjautumista.
[Heikon tunnistautumisen epäonnistumiset, arvio, 24 h: epäonnistumisia 27, puuttuvia jaksoja 156]
#### Kirjautumisten nopeusrajoitus
Heikon tunnistautumisen kirjautumispyynnöt (käyttäjätunnus ja salasana), jotka API-yhdyskäytävä hylkäsi nopeusrajoituksen takia.
[Kirjautumisten nopeusrajoitus, 24 h: pyyntöjä 6, puuttuvia jaksoja 156]
### Taustatyöt
#### Epäonnistuneet taustatyöt
Taustatöiden epäonnistuneet ajot: uusi yritys tulossa tai yritykset loppuneet.
- Uusi yritys tulossa
- Epäonnistui pysyvästi
[Epäonnistuneet taustatyöt, 24 h: uusitaan 44, pysyvästi 0, puuttuvia jaksoja 156]
#### Eniten epäonnistuneet taustatyöt
Tyypit, joiden ajoja epäonnistui eniten valitulla aikavälillä, enintään 5. Pysyvästi: ajot, joita ei enää yritetä uudelleen.
| Tyyppi | Epäonnistui | Pysyvästi |
| --- | --- | --- |
| SendMessageNotificationEmail | 16 | 0 |
| VardaUpdateChild | 9 | 0 |
| SendPushNotification | 8 | 0 |
| SendPendingDecisionEmail | 7 | 0 |
| DvvModificationsRefresh | 2 | 0 |
### Integraatiot
#### Integraatioiden virheet
Epäonnistuneet lähetykset ja kyselyt ulkoisiin järjestelmiin.
- Sähköposti
- Web push
- Varda
- DVV
[Integraatioiden virheet, 24 h: sähköposti 2, web push 3, Varda 0, DVV 1, puuttuvia jaksoja 156]
#### VTJ-kyselyt
Väestötietojärjestelmän kyselyt: vastaus saatu tai kysely epäonnistui.
- Vastaus saatu
- Virhe
[VTJ-kyselyt, 24 h: ok 354, virhe 3, puuttuvia jaksoja 156]
### Käyttö
#### Lähetetyt viestit
Uudet viestit lähettäjän mukaan ja vastaukset viestiketjuihin.
- Henkilökunta
- Kuntalaiset
- Vastaukset
[Lähetetyt viestit, 24 h: henkilökunta 137, kuntalaiset 79, vastaukset 198, puuttuvia jaksoja 156]
#### Pääsyavainten rekisteröinnit
Kuntalaisten uudet pääsyavaimet.
[Pääsyavainten rekisteröinnit, 24 h: rekisteröintejä 1, puuttuvia jaksoja 156]
#### Push-ilmoitusten tilaukset
Kuntalaisten uudet tilaukset ja henkilökunnan mobiilisovelluksen tilausten tallennukset. Mobiilisovellus tallentaa tilauksensa uudelleen aina käynnistyessään, joten sen määrä ei kerro uusista tilauksista.
- Kuntalaiset, uudet
- Mobiili, tallennukset
[Push-ilmoitusten tilaukset, 24 h: kuntalaiset 10, mobiili 4, puuttuvia jaksoja 156]
### Tietokanta
#### Tietokannan suoritinkuorma (RDS CPU)
Tietokantapalvelimen suoritinkäyttö prosentteina.
- Vaihteluväli
- Keskiarvo
[Tietokannan suoritinkuorma, 24 h: suurin 45,0 %, puuttuvia jaksoja 156]
Ei asetettu: Tampereen seutu.
