## Operatiiviset mittarit
[Espoo](#/metrics?range=24h&city=espoo) [Oulu](#/metrics?range=24h&city=oulu) [Turku](#/metrics?range=24h&city=turku)
Haettu ti 6.10. klo 15.00
### Kuormitus ja virheet
#### Palvelun 5xx-virheiden osuus
Osuus palvelun (service) vastauksista, joiden tilakoodi on 5xx.
[Palvelun 5xx-virheiden osuus, 24 h: koko jakson osuus 0,07 %, puuttuvia jaksoja 0]
#### Palvelun vasteaika (ms)
Mediaani (p50) ja 95. persentiili (p95) palvelun käsittelemien pyyntöjen vasteajoista. Logaritminen asteikko.
- Mediaani (p50)
- 95. persentiili (p95)
[Palvelun vasteaika, 24 h: koko jakson p50 46 ms, p95 435 ms, puuttuvia jaksoja 0]
#### Palvelun virherivit
ERROR-tason rivit palvelun sovelluslokissa.
[Palvelun virherivit, 24 h: rivejä 175, puuttuvia jaksoja 0]
#### API-yhdyskäytävän vasteaika, p95 (ms)
95. persentiili API-yhdyskäytävän (apigw) vasteajoista sovelluksittain. Logaritminen asteikko.
Ei tietoa
#### API-yhdyskäytävän virhevastaukset
API-yhdyskäytävän vastaukset tilakoodin mukaan, kaikki sovellukset yhteensä.
Ei tietoa
#### Välityspalvelimen 502- ja 504-vastaukset
Pyynnöt, joihin välityspalvelin (proxy) ei saanut taustapalvelulta vastausta (502) tai ei saanut sitä ajoissa (504).
Ei tietoa
### Kirjautumiset
#### Kuntalaisten kirjautumiset
Onnistuneet kirjautumiset kuntalaisen sovellukseen.
- Vahva tunnistautuminen
- Heikko tunnistautuminen
[Kuntalaisten kirjautumiset, 24 h: vahva 1800, heikko 432, puuttuvia jaksoja 0]
#### Henkilökunnan kirjautumiset
Onnistuneet kirjautumiset tavan mukaan.
- AD
- Suomi.fi
- PIN-koodi
[Henkilökunnan kirjautumiset, 24 h: AD 388, Suomi.fi 21, PIN 194, puuttuvia jaksoja 0]
#### Epäonnistuneet kirjautumiset
API-yhdyskäytävän kirjaamat epäonnistuneet kirjautumiset tavan mukaan.
Ei tietoa
#### Heikon tunnistautumisen epäonnistumiset (arvio)
Arvio: heikon tunnistautumisen ja pääsyavaimen kirjautumisyritykset, joista ei seurannut kirjautumista.
[Heikon tunnistautumisen epäonnistumiset, arvio, 24 h: epäonnistumisia 66, puuttuvia jaksoja 0]
#### Kirjautumisten nopeusrajoitus
Heikon tunnistautumisen kirjautumispyynnöt (käyttäjätunnus ja salasana), jotka API-yhdyskäytävä hylkäsi nopeusrajoituksen takia.
Ei tietoa
### Taustatyöt
#### Epäonnistuneet taustatyöt
Taustatöiden epäonnistuneet ajot: uusi yritys tulossa tai yritykset loppuneet.
- Uusi yritys tulossa
- Epäonnistui pysyvästi
[Epäonnistuneet taustatyöt, 24 h: uusitaan 93, pysyvästi 7, puuttuvia jaksoja 0]
#### Eniten epäonnistuneet taustatyöt
Tyypit, joiden ajoja epäonnistui eniten valitulla aikavälillä, enintään 5. Pysyvästi: ajot, joita ei enää yritetä uudelleen.
| Tyyppi | Epäonnistui | Pysyvästi |
| --- | --- | --- |
| SendPushNotification | 33 | 1 |
| SendMessageNotificationEmail | 26 | 2 |
| VardaUpdateChild | 17 | 3 |
| SendPendingDecisionEmail | 15 | 0 |
| GenerateFinanceDecision | 5 | 0 |
### Integraatiot
#### Integraatioiden virheet
Epäonnistuneet lähetykset ja kyselyt ulkoisiin järjestelmiin.
- Sähköposti
- Web push
- Varda
- DVV
[Integraatioiden virheet, 24 h: sähköposti 7, web push 18, Varda 29, DVV 1, puuttuvia jaksoja 0]
#### VTJ-kyselyt
Väestötietojärjestelmän kyselyt: vastaus saatu tai kysely epäonnistui.
- Vastaus saatu
- Virhe
[VTJ-kyselyt, 24 h: ok 1021, virhe 6, puuttuvia jaksoja 0]
### Käyttö
#### Lähetetyt viestit
Uudet viestit lähettäjän mukaan ja vastaukset viestiketjuihin.
- Henkilökunta
- Kuntalaiset
- Vastaukset
[Lähetetyt viestit, 24 h: henkilökunta 389, kuntalaiset 240, vastaukset 550, puuttuvia jaksoja 0]
#### Pääsyavainten rekisteröinnit
Kuntalaisten uudet pääsyavaimet.
[Pääsyavainten rekisteröinnit, 24 h: rekisteröintejä 7, puuttuvia jaksoja 0]
#### Push-ilmoitusten tilaukset
Kuntalaisten uudet tilaukset ja henkilökunnan mobiilisovelluksen tilausten tallennukset. Mobiilisovellus tallentaa tilauksensa uudelleen aina käynnistyessään, joten sen määrä ei kerro uusista tilauksista.
- Kuntalaiset, uudet
- Mobiili, tallennukset
[Push-ilmoitusten tilaukset, 24 h: kuntalaiset 21, mobiili 6, puuttuvia jaksoja 0]
### Tietokanta
#### Tietokannan suoritinkuorma (RDS CPU)
Tietokantapalvelimen suoritinkäyttö prosentteina.
- Vaihteluväli
- Keskiarvo
[Tietokannan suoritinkuorma, 24 h: suurin 45,0 %, puuttuvia jaksoja 0]
Ei asetettu: Tampereen seutu.
